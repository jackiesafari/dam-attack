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

export class DifficultyManager {
  private settings: DifficultySettings;
  private currentLevel: number = 1;
  private totalLines: number = 0;
  private currentMode: GameMode;
  private difficultyLevels: Map<number, DifficultyLevel> = new Map();

  // Predefined game modes
  private readonly GAME_MODES: GameMode[] = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional Tetris gameplay with progressive difficulty',
      startingLevel: 1,
      maxLevel: 20
    },
    {
      id: 'sprint',
      name: 'Sprint',
      description: 'Clear 40 lines as fast as possible',
      startingLevel: 1,
      specialRules: {
        targetLines: 40,
        ghostPieces: true
      }
    },
    {
      id: 'marathon',
      name: 'Marathon',
      description: 'Survive as long as possible with increasing speed',
      startingLevel: 1,
      maxLevel: 30
    },
    {
      id: 'time-attack',
      name: 'Time Attack',
      description: 'Score as many points as possible in 3 minutes',
      startingLevel: 5,
      specialRules: {
        timeLimit: 180000, // 3 minutes in milliseconds
        holdPiece: true
      }
    },
    {
      id: 'challenge',
      name: 'Challenge',
      description: 'Start at high speed for experienced players',
      startingLevel: 10,
      maxLevel: 25
    }
  ];

  constructor(settings?: Partial<DifficultySettings>) {
    this.settings = {
      baseDropTime: 1000,
      speedIncreaseRate: 0.8,
      linesPerLevel: 10,
      maxLevel: 20,
      scoreMultiplierBase: 1.0,
      scoreMultiplierIncrease: 0.1,
      ...settings
    };

    // Set default mode
    this.currentMode = this.GAME_MODES[0]; // Classic mode
    this.generateDifficultyLevels();
  }

  /**
   * Generate difficulty levels based on settings
   */
  private generateDifficultyLevels(): void {
    this.difficultyLevels.clear();

    for (let level = 1; level <= this.settings.maxLevel; level++) {
      const dropTime = this.calculateDropTime(level);
      const scoreMultiplier = this.calculateScoreMultiplier(level);
      const linesRequired = level * this.settings.linesPerLevel;

      const difficultyLevel: DifficultyLevel = {
        level,
        dropTime,
        scoreMultiplier,
        linesRequired,
        name: this.getLevelName(level),
        description: this.getLevelDescription(level)
      };

      this.difficultyLevels.set(level, difficultyLevel);
    }
  }

  /**
   * Calculate drop time for a given level
   */
  private calculateDropTime(level: number): number {
    const baseTime = this.settings.baseDropTime;
    const reduction = Math.pow(this.settings.speedIncreaseRate, level - 1);
    const minTime = 50; // Minimum drop time in milliseconds
    
    return Math.max(minTime, Math.floor(baseTime * reduction));
  }

  /**
   * Calculate score multiplier for a given level
   */
  private calculateScoreMultiplier(level: number): number {
    return this.settings.scoreMultiplierBase + 
           (level - 1) * this.settings.scoreMultiplierIncrease;
  }

  /**
   * Get level name based on level number
   */
  private getLevelName(level: number): string {
    if (level <= 3) return 'Beginner';
    if (level <= 6) return 'Easy';
    if (level <= 10) return 'Normal';
    if (level <= 15) return 'Hard';
    if (level <= 20) return 'Expert';
    return 'Master';
  }

  /**
   * Get level description based on level number
   */
  private getLevelDescription(level: number): string {
    if (level <= 3) return 'Take your time and learn the basics';
    if (level <= 6) return 'Pieces fall at a comfortable pace';
    if (level <= 10) return 'Standard difficulty for most players';
    if (level <= 15) return 'Fast-paced gameplay for experienced players';
    if (level <= 20) return 'Very challenging, requires quick reflexes';
    return 'Maximum difficulty for Tetris masters';
  }

  /**
   * Update difficulty based on lines cleared
   */
  public updateDifficulty(linesCleared: number): {
    levelChanged: boolean;
    newLevel: number;
    newDropTime: number;
    scoreMultiplier: number;
  } {
    this.totalLines += linesCleared;
    const newLevel = this.calculateCurrentLevel();
    const levelChanged = newLevel !== this.currentLevel;

    if (levelChanged) {
      this.currentLevel = newLevel;
    }

    const difficulty = this.getCurrentDifficulty();

    return {
      levelChanged,
      newLevel: this.currentLevel,
      newDropTime: difficulty.dropTime,
      scoreMultiplier: difficulty.scoreMultiplier
    };
  }

  /**
   * Calculate current level based on total lines cleared
   */
  private calculateCurrentLevel(): number {
    const calculatedLevel = Math.floor(this.totalLines / this.settings.linesPerLevel) + 
                           this.currentMode.startingLevel;
    
    const maxLevel = this.currentMode.maxLevel || this.settings.maxLevel;
    return Math.min(calculatedLevel, maxLevel);
  }

  /**
   * Get current difficulty level
   */
  public getCurrentDifficulty(): DifficultyLevel {
    const difficulty = this.difficultyLevels.get(this.currentLevel);
    if (!difficulty) {
      // Fallback to level 1 if not found
      return this.difficultyLevels.get(1)!;
    }
    return difficulty;
  }

  /**
   * Get all available game modes
   */
  public getGameModes(): GameMode[] {
    return [...this.GAME_MODES];
  }

  /**
   * Set current game mode
   */
  public setGameMode(modeId: string): boolean {
    const mode = this.GAME_MODES.find(m => m.id === modeId);
    if (!mode) {
      return false;
    }

    this.currentMode = mode;
    this.reset();
    return true;
  }

  /**
   * Get current game mode
   */
  public getCurrentMode(): GameMode {
    return { ...this.currentMode };
  }

  /**
   * Reset difficulty to starting values
   */
  public reset(): void {
    this.currentLevel = this.currentMode.startingLevel;
    this.totalLines = 0;
  }

  /**
   * Get difficulty level by number
   */
  public getDifficultyLevel(level: number): DifficultyLevel | null {
    return this.difficultyLevels.get(level) || null;
  }

  /**
   * Get all difficulty levels
   */
  public getAllDifficultyLevels(): DifficultyLevel[] {
    return Array.from(this.difficultyLevels.values());
  }

  /**
   * Check if game mode objective is completed
   */
  public checkModeObjective(gameStats: {
    lines: number;
    score: number;
    timeElapsed: number;
  }): {
    completed: boolean;
    objective: string;
    progress: number;
  } {
    const mode = this.currentMode;
    
    if (mode.specialRules?.targetLines) {
      return {
        completed: gameStats.lines >= mode.specialRules.targetLines,
        objective: `Clear ${mode.specialRules.targetLines} lines`,
        progress: Math.min(1, gameStats.lines / mode.specialRules.targetLines)
      };
    }

    if (mode.specialRules?.targetScore) {
      return {
        completed: gameStats.score >= mode.specialRules.targetScore,
        objective: `Reach ${mode.specialRules.targetScore.toLocaleString()} points`,
        progress: Math.min(1, gameStats.score / mode.specialRules.targetScore)
      };
    }

    if (mode.specialRules?.timeLimit) {
      const timeRemaining = mode.specialRules.timeLimit - gameStats.timeElapsed;
      return {
        completed: timeRemaining <= 0,
        objective: `Survive for ${Math.floor(mode.specialRules.timeLimit / 1000)} seconds`,
        progress: Math.min(1, gameStats.timeElapsed / mode.specialRules.timeLimit)
      };
    }

    // Default objective for endless modes
    return {
      completed: false,
      objective: 'Survive as long as possible',
      progress: Math.min(1, gameStats.lines / 100) // Progress based on lines cleared
    };
  }

  /**
   * Get bonus score for level completion or special achievements
   */
  public calculateLevelBonus(linesCleared: number, isLevelUp: boolean): number {
    if (!isLevelUp) return 0;

    const difficulty = this.getCurrentDifficulty();
    const baseBonus = 1000;
    const levelMultiplier = difficulty.level * 0.5;
    const lineMultiplier = linesCleared * 10;

    return Math.floor(baseBonus * levelMultiplier + lineMultiplier);
  }

  /**
   * Update difficulty settings
   */
  public updateSettings(newSettings: Partial<DifficultySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.generateDifficultyLevels();
  }

  /**
   * Get current difficulty settings
   */
  public getSettings(): Readonly<DifficultySettings> {
    return { ...this.settings };
  }

  /**
   * Get current level number
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get total lines cleared
   */
  public getTotalLines(): number {
    return this.totalLines;
  }

  /**
   * Set level directly (for testing or special modes)
   */
  public setLevel(level: number): boolean {
    if (level < 1 || level > this.settings.maxLevel) {
      return false;
    }

    this.currentLevel = level;
    this.totalLines = (level - this.currentMode.startingLevel) * this.settings.linesPerLevel;
    return true;
  }

  /**
   * Get lines needed for next level
   */
  public getLinesUntilNextLevel(): number {
    const nextLevelLines = this.currentLevel * this.settings.linesPerLevel;
    return Math.max(0, nextLevelLines - this.totalLines);
  }

  /**
   * Check if mode has special rules enabled
   */
  public hasSpecialRule(rule: keyof NonNullable<GameMode['specialRules']>): boolean {
    return this.currentMode.specialRules?.[rule] !== undefined;
  }

  /**
   * Get special rule value
   */
  public getSpecialRuleValue<T extends keyof NonNullable<GameMode['specialRules']>>(
    rule: T
  ): NonNullable<GameMode['specialRules']>[T] | undefined {
    return this.currentMode.specialRules?.[rule];
  }
}