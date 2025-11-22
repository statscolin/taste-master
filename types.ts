
export interface Recipe {
  sweetness: number;
  sourness: number;
  bitterness: number;
}

export interface TurnResult {
  recipe: Recipe;
  score: number;
  turn: number;
}

export interface ObjectiveParams {
  peaks: {
    x: number; // Sweet
    y: number; // Sour
    z: number; // Bitter
    height: number;
    sigma: number;
  }[];
  noise: number;
}

export interface BotConfig {
  name: string;
  kappa: number;       // Exploration factor
  lengthScale: number; // Smoothness assumption
  sigmaF: number;      // Signal variance (amplitude)
  noiseVariance: number; // Assumed observation noise
}

export enum GameState {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  PROCESSING = 'PROCESSING',
  GAME_OVER = 'GAME_OVER'
}

export type PlayerType = 'HUMAN' | 'BOT';
