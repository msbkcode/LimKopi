// Control: PredictFeasibilityC — AI Renovation Budget & Completion Predictor (Taiga #53)
import { Prediction } from '../entities/Prediction.js';

export class PredictFeasibilityC {
  constructor(entity = Prediction) {
    this.entity = entity;
    this.error = '';
  }

  async PredictFeasibility(category, style, region, floorArea, budget, durationWeeks) {
    const numbers = [floorArea, budget, durationWeeks].map(Number);
    if (!category || !style || !region || numbers.some((n) => !Number.isFinite(n) || n <= 0)) {
      this.error = 'Category, style, region, floor area, budget and duration are required.';
      return null;
    }
    const result = await this.entity.PredictFeasibility(category, style, region, ...numbers);
    this.error = result ? '' : this.entity.lastError;
    return result;
  }
}
