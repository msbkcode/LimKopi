// Boundary: PredictFeasibilityForm — AI Renovation Budget & Completion Predictor (Taiga #53)
import { PredictFeasibilityC } from '../controllers/PredictFeasibilityC.js';

export class PredictFeasibilityForm {
  constructor(view, control = new PredictFeasibilityC()) {
    this.view = view;
    this.control = control;
  }

  async OnPredict(category, style, region, floorArea, budget, durationWeeks) {
    const result = await this.control.PredictFeasibility(category, style, region, floorArea, budget, durationWeeks);
    if (result) this.DisplayPrediction(result);
    else this.DisplayError();
    return result;
  }

  DisplayPrediction(result) { this.view.prediction(result); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
