
import { ObjectiveParams, Recipe, TurnResult, BotConfig } from '../types';

// --- Matrix Helper Functions for GP ---
type Matrix = number[][];

const zeros = (rows: number, cols: number): Matrix => 
  Array(rows).fill(0).map(() => Array(cols).fill(0));

const identity = (n: number): Matrix => 
  Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)));

const multiply = (A: Matrix, B: Matrix): Matrix => {
  const rA = A.length;
  const cA = A[0].length;
  const rB = B.length;
  const cB = B[0].length;
  if (cA !== rB) throw new Error("Matrix mismatch");
  
  const result = zeros(rA, cB);
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cB; j++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

const invert = (M: Matrix): Matrix => {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...identity(n)[i]]);
  
  for (let i = 0; i < n; i++) {
    let pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) pivot = 1e-10;

    for (let j = 0; j < 2 * n; j++) A[i][j] /= pivot;
    
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) A[k][j] -= factor * A[i][j];
      }
    }
  }
  
  return A.map(row => row.slice(n));
};

// --- The Hidden Function ---

export const generateObjectiveFunction = (): ObjectiveParams => {
  const numPeaks = 2 + Math.floor(Math.random() * 3); 
  const peaks = [];
  for (let i = 0; i < numPeaks; i++) {
    peaks.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
      height: 60 + Math.random() * 40,
      sigma: 8 + Math.random() * 12, 
    });
  }
  
  // Fixed noise magnitude (Uniform distribution range scalar)
  return { peaks, noise: 10 };
};

export const evaluateRecipe = (recipe: Recipe, params: ObjectiveParams, addNoise: boolean = true): number => {
  let score = 0;
  
  for (const peak of params.peaks) {
    const distSq = 
      Math.pow(recipe.sweetness - peak.x, 2) + 
      Math.pow(recipe.sourness - peak.y, 2) + 
      Math.pow(recipe.bitterness - peak.z, 2);
    
    score += peak.height * Math.exp(-distSq / (2 * Math.pow(peak.sigma, 2)));
  }

  if (addNoise) {
    // Simple Uniform Noise: (Math.random() - 0.5) * noise
    // Range: [-5, +5] if noise is 10
    score += (Math.random() - 0.5) * params.noise;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
};

// --- Bayesian Optimization Logic ---

export class BayesianOptimizer {
  private history: TurnResult[] = [];
  private config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  update(history: TurnResult[]) {
    this.history = history;
  }

  // Kernel Function (RBF) - Now uses instance config
  private kernel(r1: Recipe, r2: Recipe): number {
    const l = this.config.lengthScale;
    const sigmaF = this.config.sigmaF;
    
    const distSq = 
      Math.pow(r1.sweetness - r2.sweetness, 2) + 
      Math.pow(r1.sourness - r2.sourness, 2) + 
      Math.pow(r1.bitterness - r2.bitterness, 2);
      
    return (sigmaF ** 2) * Math.exp(-distSq / (2 * (l ** 2)));
  }

  predict(target: Recipe): { mean: number, std: number } {
    const X = this.history.map(h => h.recipe);
    const Y = this.history.map(h => [h.score]);
    const n = X.length;

    if (n === 0) return { mean: 50, std: 50 }; 

    const K = zeros(n, n);
    const noiseVar = this.config.noiseVariance;

    for(let i=0; i<n; i++) {
      for(let j=0; j<n; j++) {
        K[i][j] = this.kernel(X[i], X[j]);
        if (i === j) K[i][j] += noiseVar;
      }
    }

    const K_star = zeros(n, 1);
    for(let i=0; i<n; i++) {
      K_star[i][0] = this.kernel(X[i], target);
    }

    const K_star_star = this.kernel(target, target);

    try {
      const K_inv = invert(K);
      const K_inv_Y = multiply(K_inv, Y);
      
      let mean = 0;
      for(let i=0; i<n; i++) {
        mean += K_star[i][0] * K_inv_Y[i][0];
      }

      const K_inv_K_star = multiply(K_inv, K_star);
      let varianceReduction = 0;
      for(let i=0; i<n; i++) {
        varianceReduction += K_star[i][0] * K_inv_K_star[i][0];
      }
      
      const variance = Math.max(0, K_star_star - varianceReduction);
      return { mean, std: Math.sqrt(variance) };

    } catch (e) {
      return { mean: 50, std: 50 };
    }
  }

  recommendNext(): Recipe {
    const numCandidates = 1000;
    let bestScore = -Infinity;
    let bestRecipe: Recipe = { sweetness: 50, sourness: 50, bitterness: 50 };

    const kappa = this.config.kappa;

    for (let i = 0; i < numCandidates; i++) {
      const candidate: Recipe = {
        sweetness: Math.random() * 100,
        sourness: Math.random() * 100,
        bitterness: Math.random() * 100
      };

      const { mean, std } = this.predict(candidate);
      const ucb = mean + kappa * std;

      if (ucb > bestScore) {
        bestScore = ucb;
        bestRecipe = candidate;
      }
    }
    return bestRecipe;
  }
}
