"""Pure-Python inference for the Renovation Budget & Completion Predictor (IDP Success Predictor).

The model is trained offline in ml/train_feasibility_model.py (scikit-learn) and exported to
ml/feasibility_model.json. Inference here needs only the standard library, so server.py keeps
its zero-dependency deployment.
"""
from __future__ import annotations

import json
import math
from pathlib import Path


class FeasibilityPredictor:
    def __init__(self, model_path: Path):
        self.path = Path(model_path)
        self.model = json.loads(self.path.read_text()) if self.path.exists() else None
        self.version = self.model["version"] if self.model else "unavailable"

    def _vector(self, data: dict):
        m = self.model
        inputs, vec = {}, []
        for feat in m["categorical"]:
            name, levels = feat["name"], feat["levels"]
            value = str(data.get(name) or "").strip()
            match = next((lv for lv in levels if lv.lower() == value.lower()), None)
            if match is None:
                raise ValueError(f"{name} must be one of: {', '.join(levels)}.")
            inputs[name] = match
            vec.extend(1.0 if lv == match else 0.0 for lv in levels)
        raw = {}
        for feat in m["numeric"]:                       # 1st pass: validate the user-supplied numbers
            if "ratio" in feat:
                continue
            name, lo, hi = feat["name"], feat["min"], feat["max"]
            try:
                value = float(data.get(name))
            except (TypeError, ValueError):
                raise ValueError(f"{name} must be a number.")
            if math.isnan(value) or not (lo <= value <= hi):
                raise ValueError(f"{name} must be between {lo:g} and {hi:g}.")
            inputs[name] = raw[name] = value
        for feat in m["numeric"]:                       # 2nd pass: derived ratios, log, standardise
            if "ratio" in feat:
                num, den = feat["ratio"]
                value = raw[num] / raw[den] * feat.get("scale", 1)
            else:
                value = raw[feat["name"]]
            value = math.log1p(value) if feat.get("log") else value
            vec.append((value - feat["mean"]) / feat["std"])
        return inputs, vec

    def predict(self, data: dict) -> dict:
        if not self.model:
            raise ValueError("The prediction model is not available on this server.")
        inputs, x = self._vector(data)
        m = self.model
        z = m["intercept"] + sum(w * v for w, v in zip(m["coefficients"], x))
        p = 1.0 / (1.0 + math.exp(-z))
        contributions = sorted(
            ((name, w * v) for name, w, v in zip(m["featureNames"], m["coefficients"], x) if v != 0.0),
            key=lambda kv: abs(kv[1]), reverse=True)[:3]
        label = int(p >= m["threshold"])
        return {
            "probability": round(p, 4),
            "riskScore": round((1 - p) * 100, 1),
            "label": label,
            "verdict": "Likely on budget and on time" if label else "At risk of overrun or delay",
            "topFactors": [{"feature": n, "effect": "raises" if c > 0 else "lowers", "weight": round(c, 3)}
                           for n, c in contributions],
            "modelVersion": m["version"],
            "inputs": inputs,
        }
