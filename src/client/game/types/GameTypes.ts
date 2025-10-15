export enum PieceType {
  I = 'I', // Line piece
  O = 'O', // Square piece  
  T = 'T', // T-piece
  S = 'S', // S-piece
  Z = 'Z', // Z-piece
  L = 'L', // L-piece
  J = 'J'  // J-piece
}

export interface GamePiece {
  shape: number[][];
  x: number;
  y: number;
  color: number;
  type?: PieceType;
}

export interface PieceDefinition {
  shape: number[][];
  color: number;
  rotationStates: number[][][];
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  initialDropTime: number;
  levelSpeedIncrease: number;
  linesPerLevel: number;
  scoring: {
    singleLine: number;
    doubleLine: number;
    tripleLine: number;
    tetris: number;
    softDrop: number;
    hardDrop: number;
  };
}

export interface ScoreEntry {
  username: string;
  score: number;
  timestamp: number;
  level: number;
  lines: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export enum GameError {
  STATE_CORRUPTION = 'STATE_CORRUPTION',
  INVALID_PIECE = 'INVALID_PIECE',
  BOARD_OVERFLOW = 'BOARD_OVERFLOW',
  COLLISION_ERROR = 'COLLISION_ERROR'
}

export enum RecoveryAction {
  RESET_STATE = 'RESET_STATE',
  SPAWN_NEW_PIECE = 'SPAWN_NEW_PIECE',
  CLEAR_BOARD = 'CLEAR_BOARD',
  CONTINUE = 'CONTINUE'
}

// Difficulty and Game Mode Types
export interface DifficultyLevel {
  level: number;
  dropTime: number;
  scoreMultiplier: number;
  linesRequired: number;
  name: string;
  description: string;
}

export interface GameMode {
  id: string;
  name: string;
  description: string;
  startingLevel: number;
  maxLevel?: number;
  specialRules?: {
    timeLimit?: number;
    targetLines?: number;
    targetScore?: number;
    ghostPieces?: boolean;
    holdPiece?: boolean;
  };
}

export interface DifficultySettings {
  baseDropTime: number;
  speedIncreaseRate: number;
  linesPerLevel: number;
  maxLevel: number;
  scoreMultiplierBase: number;
  scoreMultiplierIncrease: number;
}

// Achievement System Types
export enum AchievementCategory {
  SCORING = 'scoring',
  LINES = 'lines',
  SURVIVAL = 'survival',
  SKILL = 'skill',
  SPECIAL = 'special'
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  requirement: {
    type: string;
    value: number;
    condition?: string;
  };
  reward?: {
    points: number;
    title?: string;
    unlocks?: string[];
  };
  hidden: boolean;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

export interface GameStats {
  totalScore: number;
  totalLines: number;
  totalGames: number;
  maxLevel: number;
  longestSurvival: number;
  tetrisCount: number;
  perfectClears: number;
  consecutiveTetrises: number;
  maxCombo: number;
  fastestSprint: number;
  highestScoreInTimeAttack: number;
}