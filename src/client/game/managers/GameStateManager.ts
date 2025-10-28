import { GamePiece, GameMode } from '../types/GameTypes';

export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPiece: GamePiece | null;
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
  dropTime: number;
  lastDrop: number;
  gameMode: GameMode | null;
  timeElapsed: number;
  scoreMultiplier: number;
}

export type StateListener = (state: Readonly<GameState>) => void;

export class GameStateManager {
  private state: GameState;
  private listeners: StateListener[] = [];

  constructor(boardWidth: number = 14, boardHeight: number = 20) {
    this.state = this.createInitialState(boardWidth, boardHeight);
  }

  private createInitialState(boardWidth: number, boardHeight: number): GameState {
    return {
      board: Array(boardHeight).fill(null).map(() => Array(boardWidth).fill(0)),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
      dropTime: 1000,
      lastDrop: 0,
      gameMode: null,
      timeElapsed: 0,
      scoreMultiplier: 1.0
    };
  }

  public getState(): Readonly<GameState> {
    return { ...this.state };
  }

  public updateState(updates: Partial<GameState>): void {
    const previousState = { ...this.state };
    
    // Apply updates with validation
    Object.keys(updates).forEach(key => {
      const typedKey = key as keyof GameState;
      const value = updates[typedKey];
      
      if (this.validateStateUpdate(typedKey, value)) {
        (this.state as any)[typedKey] = value;
      } else {
        console.warn(`Invalid state update for ${key}:`, value);
      }
    });

    // Notify listeners if state actually changed
    if (this.hasStateChanged(previousState, this.state)) {
      this.notifyListeners();
    }
  }

  public resetState(boardWidth: number = 10, boardHeight: number = 20): void {
    this.state = this.createInitialState(boardWidth, boardHeight);
    this.notifyListeners();
  }

  public validateState(): boolean {
    try {
      // Validate board structure
      if (!Array.isArray(this.state.board) || this.state.board.length === 0) {
        return false;
      }

      const boardHeight = this.state.board.length;
      const boardWidth = this.state.board[0]?.length || 0;

      if (boardWidth === 0) {
        return false;
      }

      // Check all rows have same width
      for (const row of this.state.board) {
        if (!Array.isArray(row) || row.length !== boardWidth) {
          return false;
        }
      }

      // Validate numeric values
      if (this.state.score < 0 || this.state.level < 1 || this.state.lines < 0) {
        return false;
      }

      if (this.state.dropTime <= 0 || this.state.lastDrop < 0) {
        return false;
      }

      if (this.state.timeElapsed < 0 || this.state.scoreMultiplier <= 0) {
        return false;
      }

      // Validate pieces if they exist
      if (this.state.currentPiece && !this.validatePiece(this.state.currentPiece)) {
        return false;
      }

      if (this.state.nextPiece && !this.validatePiece(this.state.nextPiece)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('State validation error:', error);
      return false;
    }
  }

  public addStateListener(listener: StateListener): void {
    this.listeners.push(listener);
  }

  public removeStateListener(listener: StateListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public clearStateListeners(): void {
    this.listeners = [];
  }

  private validateStateUpdate(key: keyof GameState, value: any): boolean {
    switch (key) {
      case 'board':
        return Array.isArray(value) && value.every(row => Array.isArray(row));
      case 'currentPiece':
      case 'nextPiece':
        return value === null || this.validatePiece(value);
      case 'score':
      case 'lines':
        return typeof value === 'number' && value >= 0;
      case 'level':
        return typeof value === 'number' && value >= 1;
      case 'dropTime':
        return typeof value === 'number' && value > 0;
      case 'lastDrop':
      case 'timeElapsed':
        return typeof value === 'number' && value >= 0;
      case 'scoreMultiplier':
        return typeof value === 'number' && value > 0;
      case 'isGameOver':
      case 'isPaused':
        return typeof value === 'boolean';
      case 'gameMode':
        return value === null || (typeof value === 'object' && value.id && value.name);
      default:
        return false;
    }
  }

  private validatePiece(piece: any): boolean {
    return (
      piece &&
      typeof piece === 'object' &&
      Array.isArray(piece.shape) &&
      piece.shape.length > 0 &&
      piece.shape.every((row: any) => Array.isArray(row)) &&
      typeof piece.x === 'number' &&
      typeof piece.y === 'number' &&
      typeof piece.color === 'number'
    );
  }

  private hasStateChanged(oldState: GameState, newState: GameState): boolean {
    // Simple shallow comparison for most properties
    const simpleProps: (keyof GameState)[] = [
      'score', 'level', 'lines', 'isGameOver', 'isPaused', 'dropTime', 'lastDrop', 'timeElapsed', 'scoreMultiplier'
    ];

    for (const prop of simpleProps) {
      if (oldState[prop] !== newState[prop]) {
        return true;
      }
    }

    // Deep comparison for pieces
    if (!this.arePiecesEqual(oldState.currentPiece, newState.currentPiece)) {
      return true;
    }

    if (!this.arePiecesEqual(oldState.nextPiece, newState.nextPiece)) {
      return true;
    }

    // Board comparison (reference check is sufficient for our use case)
    if (oldState.board !== newState.board) {
      return true;
    }

    return false;
  }

  private arePiecesEqual(piece1: GamePiece | null, piece2: GamePiece | null): boolean {
    if (piece1 === null && piece2 === null) return true;
    if (piece1 === null || piece2 === null) return false;

    return (
      piece1.x === piece2.x &&
      piece1.y === piece2.y &&
      piece1.color === piece2.color &&
      JSON.stringify(piece1.shape) === JSON.stringify(piece2.shape)
    );
  }

  private notifyListeners(): void {
    const readonlyState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(readonlyState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
}