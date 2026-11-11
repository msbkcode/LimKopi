// Entity: Prediction — result of the AI Renovation Budget & Completion Predictor.
import { api } from '../api.js';
import { EntityBase } from './EntityBase.js';

export class Prediction extends EntityBase {
  static async PredictFeasibility(category, style, region, floorArea, budget, durationWeeks) {
    return this.attempt(async () => api('/api/idps/predict-feasibility', {
      method: 'POST', body: { category, style, region, floorArea, budget, durationWeeks },
    }), null);
  }
}
