"""Data-driven feature: AI Renovation Budget & Completion Predictor (IDP Success Predictor).

Pipeline (matches Section 9 of the report):
  3. Data collection   -> 150 simulated historical IDP records  (ml/data/idp_history_raw.csv + idp_history.db)
  4. Data cleaning     -> drop illogical rows, impute missing values, remove duplicates
  5. Data labelling    -> 1 = on budget AND on time, 0 = over budget OR delayed
  6. Feature eng.      -> one-hot (category, style, region), log/ratio numeric features, standardisation
  7. Model training    -> 80/20 stratified split, GridSearchCV (5-fold) for Logistic Regression and Random Forest
  8. Evaluation        -> precision, recall, F1, accuracy, ROC-AUC, confusion matrix on the held-out 20 %
  9. Deployment        -> export the chosen model to ml/feasibility_model.json (pure-Python inference in predictor.py)

Run:  python ml/train_feasibility_model.py      (needs numpy, pandas, scikit-learn, matplotlib — dev only)
"""
from __future__ import annotations

import json
import sqlite3
from datetime import date
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
SEED = 314
CATEGORIES = ["Residential", "Commercial", "Hospitality"]
STYLES = ["Japandi", "Industrial", "Modern", "Minimalist", "Scandinavian", "Contemporary"]
REGIONS = ["Central", "East", "West", "North", "North-East"]
STYLE_COMPLEXITY = {"Minimalist": -0.35, "Scandinavian": -0.2, "Modern": 0.0, "Japandi": 0.15, "Contemporary": 0.2, "Industrial": 0.45}
CATEGORY_RISK = {"Residential": -0.25, "Commercial": 0.15, "Hospitality": 0.45}
REGION_RISK = {"Central": 0.25, "East": -0.05, "West": 0.0, "North": -0.1, "North-East": -0.1}
NUMERIC_BOUNDS = {"floorArea": (300, 10000), "budget": (10000, 2000000), "durationWeeks": (2, 104)}


# ----------------------------------------------------------------------------- 3. collection
def simulate(n=150, rng=None):
    """Simulated historical projects. Outcomes follow a latent 'pressure' score built from domain
    heuristics (budget per sq ft, schedule tightness, style/category complexity, CBD access) + noise."""
    rng = rng or np.random.default_rng(SEED)
    rows = []
    for i in range(n):
        cat = rng.choice(CATEGORIES, p=[0.6, 0.25, 0.15])
        style = rng.choice(STYLES)
        region = rng.choice(REGIONS, p=[0.3, 0.2, 0.2, 0.15, 0.15])
        area = float(np.clip(rng.lognormal(7.0 if cat == "Residential" else 7.6, 0.35), 350, 9000))
        psf = rng.normal({"Residential": 70, "Commercial": 95, "Hospitality": 120}[cat], 22)
        budget = float(np.clip(area * psf, 12000, 1_500_000))
        weeks = float(np.clip(area / 1000 * rng.normal(8, 2.2) + 3, 3, 60))
        need_psf = {"Residential": 62, "Commercial": 85, "Hospitality": 108}[cat]
        need_weeks = area / 1000 * 7.5 + 3
        pressure = (1.6 * (need_psf - budget / area) / need_psf + 1.4 * (need_weeks - weeks) / need_weeks
                    + STYLE_COMPLEXITY[style] + CATEGORY_RISK[cat] + REGION_RISK[region] + rng.normal(0, 0.42))
        overrun = max(0.0, 0.08 + 0.22 * pressure + rng.normal(0, 0.05))
        delay = max(0.0, 0.06 + 0.25 * pressure + rng.normal(0, 0.06))
        rows.append({"projectId": f"H{i + 1:03d}", "category": cat, "style": style, "region": region,
                     "floorArea": round(area), "budget": round(budget, -2), "durationWeeks": round(weeks),
                     "actualCost": round(budget * (1 + overrun - 0.04), -2), "actualWeeks": round(weeks * (1 + delay - 0.03)),
                     "completedOn": str(date(2021, 1, 1).fromordinal(date(2021, 1, 1).toordinal() + int(rng.integers(0, 1700))))})
    df = pd.DataFrame(rows)
    # Inject realistic data-quality problems so the cleaning step has real work to do.
    bad = rng.choice(n, 12, replace=False)
    df.loc[bad[:3], "budget"] = -df.loc[bad[:3], "budget"]          # negative budgets (typing errors)
    df.loc[bad[3:6], "durationWeeks"] = 0                             # zero timelines
    df.loc[bad[6:9], "style"] = None                                  # missing style
    df.loc[bad[9:11], "region"] = None                                # missing region
    df.loc[bad[11], "floorArea"] = 0                                  # impossible floor area
    dupes = df.sample(4, random_state=SEED)                           # duplicate exports
    return pd.concat([df, dupes], ignore_index=True)


# ----------------------------------------------------------------------------- 4. cleaning
def clean(raw: pd.DataFrame):
    log = {"raw_rows": len(raw)}
    df = raw.drop_duplicates(subset=["projectId"]).copy()
    log["duplicates_removed"] = len(raw) - len(df)
    illogical = (df["budget"] <= 0) | (df["durationWeeks"] <= 0) | (df["floorArea"] <= 0) | (df["actualCost"] <= 0)
    log["illogical_removed"] = int(illogical.sum())
    df = df[~illogical].copy()
    log["style_imputed"] = int(df["style"].isna().sum())
    log["region_imputed"] = int(df["region"].isna().sum())
    df["style"] = df["style"].fillna(df["style"].mode()[0])
    df["region"] = df["region"].fillna(df["region"].mode()[0])
    for col, (lo, hi) in NUMERIC_BOUNDS.items():
        df[col] = df[col].clip(lo, hi)
    log["clean_rows"] = len(df)
    return df.reset_index(drop=True), log


# ----------------------------------------------------------------------------- 5. labelling
def label(df: pd.DataFrame):
    df = df.copy()
    df["onBudget"] = df["actualCost"] <= df["budget"] * 1.05          # 5 % tolerance
    df["onTime"] = df["actualWeeks"] <= df["durationWeeks"] * 1.10    # 10 % tolerance
    df["success"] = (df["onBudget"] & df["onTime"]).astype(int)
    return df


# ----------------------------------------------------------------------------- 6. features
NUMERIC_SPEC = [
    {"name": "floorArea", "log": True},
    {"name": "budget", "log": True},
    {"name": "durationWeeks", "log": False},
    {"name": "budgetPerSqft", "ratio": ["budget", "floorArea"], "log": True},
    {"name": "weeksPer1000Sqft", "ratio": ["durationWeeks", "floorArea"], "scale": 1000, "log": False},
]


def numeric_raw(df):
    out = {}
    for f in NUMERIC_SPEC:
        v = df[f["ratio"][0]] / df[f["ratio"][1]] * f.get("scale", 1) if "ratio" in f else df[f["name"]]
        out[f["name"]] = np.log1p(v) if f["log"] else v
    return pd.DataFrame(out)


def features(df, stats=None):
    onehot = pd.concat([pd.get_dummies(pd.Categorical(df[c], categories=levels), prefix=c).astype(float)
                        for c, levels in (("category", CATEGORIES), ("style", STYLES), ("region", REGIONS))], axis=1)
    num = numeric_raw(df)
    if stats is None:
        stats = {c: (float(num[c].mean()), float(num[c].std(ddof=0))) for c in num}
    num = pd.DataFrame({c: (num[c] - stats[c][0]) / stats[c][1] for c in num})
    X = pd.concat([onehot.reset_index(drop=True), num.reset_index(drop=True)], axis=1)
    return X, stats


# ----------------------------------------------------------------------------- 7-9.
def main():
    DATA.mkdir(exist_ok=True)
    raw = simulate()
    raw.to_csv(DATA / "idp_history_raw.csv", index=False)
    with sqlite3.connect(DATA / "idp_history.db") as con:
        raw.to_sql("idp_history_raw", con, if_exists="replace", index=False)
    df, cleaning = clean(raw)
    df = label(df)
    df.to_csv(DATA / "idp_history_clean.csv", index=False)
    with sqlite3.connect(DATA / "idp_history.db") as con:
        df.to_sql("idp_history_clean", con, if_exists="replace", index=False)

    train_df, test_df = train_test_split(df, test_size=0.2, stratify=df["success"], random_state=42)
    X_train, stats = features(train_df)
    X_test, _ = features(test_df, stats)
    y_train, y_test = train_df["success"].values, test_df["success"].values
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    lr = GridSearchCV(LogisticRegression(max_iter=2000), {"C": [0.03, 0.1, 0.3, 1, 3, 10], "class_weight": [None, "balanced"]}, scoring="f1", cv=cv).fit(X_train, y_train)
    rf = GridSearchCV(RandomForestClassifier(random_state=42),
                      {"n_estimators": [100, 200, 400], "max_depth": [3, 5, 8, None], "min_samples_leaf": [1, 3, 5], "class_weight": [None, "balanced"]},
                      scoring="f1", cv=cv).fit(X_train, y_train)

    def evaluate(model):
        p = model.predict_proba(X_test)[:, 1]
        yhat = (p >= 0.5).astype(int)
        return {"precision": precision_score(y_test, yhat), "recall": recall_score(y_test, yhat), "f1": f1_score(y_test, yhat),
                "atRiskPrecision": precision_score(y_test, yhat, pos_label=0), "atRiskRecall": recall_score(y_test, yhat, pos_label=0),
                "macroF1": f1_score(y_test, yhat, average="macro"),
                "accuracy": accuracy_score(y_test, yhat), "rocAuc": roc_auc_score(y_test, p),
                "confusion": confusion_matrix(y_test, yhat).tolist(), "cvF1": float(model.best_score_),
                "best": {k: (v if v is not None else "None") for k, v in model.best_params_.items()}}

    results = {"LogisticRegression": evaluate(lr), "RandomForest": evaluate(rf)}
    majority = int(round(y_train.mean()))
    base = np.full_like(y_test, majority)
    results["MajorityBaseline"] = {"precision": precision_score(y_test, base, zero_division=0), "recall": recall_score(y_test, base, zero_division=0),
                                   "f1": f1_score(y_test, base, zero_division=0), "macroF1": f1_score(y_test, base, average="macro", zero_division=0),
                                   "accuracy": accuracy_score(y_test, base), "confusion": confusion_matrix(y_test, base, labels=[0, 1]).tolist()}
    chosen = "LogisticRegression"
    if results["RandomForest"]["f1"] - results["LogisticRegression"]["f1"] > 0.05:
        chosen = "RandomForest (exported as LR fallback not used)"
    best_lr = lr.best_estimator_
    feature_names = list(X_train.columns)
    model = {
        "version": "idp-feasibility-lr-1.0",
        "trainedOn": str(date.today()), "rows": int(len(df)), "threshold": 0.5,
        "categorical": [{"name": "category", "levels": CATEGORIES}, {"name": "style", "levels": STYLES}, {"name": "region", "levels": REGIONS}],
        "numeric": [], "featureNames": [], "intercept": float(best_lr.intercept_[0]), "coefficients": [float(c) for c in best_lr.coef_[0]],
    }
    pretty = {"floorArea": "floor area", "budget": "budget", "durationWeeks": "planned duration",
              "budgetPerSqft": "budget per sq ft", "weeksPer1000Sqft": "weeks per 1,000 sq ft"}
    for f in NUMERIC_SPEC:
        entry = {"name": f["name"], "mean": stats[f["name"]][0], "std": stats[f["name"]][1], "log": f["log"]}
        if "ratio" in f:
            entry.update(ratio=f["ratio"], scale=f.get("scale", 1))
        else:
            entry.update(min=NUMERIC_BOUNDS[f["name"]][0], max=NUMERIC_BOUNDS[f["name"]][1])
        model["numeric"].append(entry)
    model["featureNames"] = [n.replace("category_", "category ").replace("style_", "style ").replace("region_", "region ")
                             if not n in pretty else pretty[n] for n in feature_names]
    (HERE / "feasibility_model.json").write_text(json.dumps(model, indent=1))

    # Charts for the report
    cm = np.array(results["LogisticRegression"]["confusion"])
    fig, ax = plt.subplots(figsize=(3.6, 3.2), dpi=150)
    ax.imshow(cm, cmap="Greens")
    for (i, j), v in np.ndenumerate(cm):
        ax.text(j, i, str(v), ha="center", va="center", fontsize=14, color="black")
    ax.set_xticks([0, 1], ["Pred 0\n(at risk)", "Pred 1\n(on track)"]); ax.set_yticks([0, 1], ["Actual 0", "Actual 1"])
    ax.set_title("Logistic Regression — test set (n=%d)" % len(y_test), fontsize=9)
    fig.tight_layout(); fig.savefig(DATA / "confusion_matrix.png"); plt.close(fig)
    coefs = sorted(zip(model["featureNames"], model["coefficients"]), key=lambda kv: abs(kv[1]), reverse=True)[:10]
    fig, ax = plt.subplots(figsize=(5.4, 3.2), dpi=150)
    ax.barh([c[0] for c in coefs][::-1], [c[1] for c in coefs][::-1], color=["#5f6b52" if c[1] > 0 else "#9b4b42" for c in coefs][::-1])
    ax.axvline(0, color="#999", lw=0.8); ax.set_xlabel("standardised coefficient (+ raises success odds)", fontsize=8)
    ax.tick_params(labelsize=7); ax.set_title("Top 10 features", fontsize=9)
    fig.tight_layout(); fig.savefig(DATA / "feature_weights.png"); plt.close(fig)

    summary = {"cleaning": cleaning, "classBalance": {"success": int(df["success"].sum()), "fail": int((1 - df["success"]).sum())},
               "split": {"train": int(len(train_df)), "test": int(len(test_df))}, "results": results, "chosen": chosen,
               "topFeatures": coefs}
    (DATA / "training_summary.json").write_text(json.dumps(summary, indent=1, default=float))
    print(json.dumps(summary, indent=1, default=float))


if __name__ == "__main__":
    main()
