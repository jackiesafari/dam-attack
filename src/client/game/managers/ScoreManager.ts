import { ScoreEntry } from '../types/GameTypes';

export interface ScoreCalculationData {
  linesCleared: number;
  level: number;
  dropBonus?: number;
  softDropDistance?: number;
  hardDropDistance?: number;
  isTetris?: boolean;
  scoreMultiplier?: number;
  levelBonus?: number;
}

export interface ScoreFormulas {
  singleLine: number;
  doubleLine: number;
  tripleLine: number;
  tetris: number;
  softDrop: number;
  hardDrop: number;
  levelMultiplier: number;
}

export interface LeaderboardOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'score' | 'timestamp';
  sortOrder?: 'asc' | 'desc';
}

export class ScoreManager {
  private readonly LOCAL_STORAGE_KEY = 'dam-attack-scores';
  private readonly MAX_LOCAL_SCORES = 100;
  private scoreFormulas: ScoreFormulas;
  private devvitEnabled: boolean = false;

  constructor(scoreFormulas?: Partial<ScoreFormulas>) {
    this.scoreFormulas = {
      singleLine: 100,
      doubleLine: 300,
      tripleLine: 500,
      tetris: 800,
      softDrop: 1,
      hardDrop: 2,
      levelMultiplier: 1,
      ...scoreFormulas
    };

    // Check if we're running in Devvit environment
    this.devvitEnabled = this.checkDevvitEnvironment();
  }

  /**
   * Calculate score based on game actions
   */
  public calculateScore(data: ScoreCalculationData): number {
    let score = 0;

    // Line clear scoring
    if (data.linesCleared > 0) {
      let baseScore = 0;
      
      switch (data.linesCleared) {
        case 1:
          baseScore = this.scoreFormulas.singleLine;
          break;
        case 2:
          baseScore = this.scoreFormulas.doubleLine;
          break;
        case 3:
          baseScore = this.scoreFormulas.tripleLine;
          break;
        case 4:
          baseScore = this.scoreFormulas.tetris;
          break;
        default:
          // For more than 4 lines (shouldn't happen in standard Tetris)
          baseScore = this.scoreFormulas.tetris * Math.floor(data.linesCleared / 4);
          break;
      }

      // Apply level multiplier
      score += baseScore * (data.level * this.scoreFormulas.levelMultiplier);

      // Apply difficulty score multiplier if provided
      if (data.scoreMultiplier && data.scoreMultiplier > 1) {
        score *= data.scoreMultiplier;
      }

      // Bonus for Tetris (4 lines at once)
      if (data.linesCleared === 4 || data.isTetris) {
        score += baseScore * 0.5; // 50% bonus for Tetris
      }
    }

    // Drop bonuses
    if (data.softDropDistance) {
      score += data.softDropDistance * this.scoreFormulas.softDrop;
    }

    if (data.hardDropDistance) {
      score += data.hardDropDistance * this.scoreFormulas.hardDrop;
    }

    // General drop bonus
    if (data.dropBonus) {
      score += data.dropBonus;
    }

    // Level completion bonus
    if (data.levelBonus) {
      score += data.levelBonus;
    }

    return Math.floor(score);
  }

  /**
   * Save a score entry to both local storage and Devvit (if available)
   */
  public async saveScore(entry: ScoreEntry): Promise<boolean> {
    try {
      // Always save to local storage first
      const localSuccess = this.saveToLocalStorage(entry);
      
      // Try to save to Devvit if available
      let devvitSuccess = true;
      if (this.devvitEnabled) {
        try {
          devvitSuccess = await this.saveToDevvit(entry);
        } catch (error) {
          console.warn('Failed to save to Devvit, but local save succeeded:', error);
          devvitSuccess = false;
        }
      }

      return localSuccess && (this.devvitEnabled ? devvitSuccess : true);
    } catch (error) {
      console.error('Failed to save score:', error);
      return false;
    }
  }

  /**
   * Get leaderboard scores from both local and Devvit sources
   */
  public async getLeaderboard(options: LeaderboardOptions = {}): Promise<ScoreEntry[]> {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'score',
      sortOrder = 'desc'
    } = options;

    try {
      let scores: ScoreEntry[] = [];

      // Get local scores
      const localScores = this.getLocalScores();
      scores = [...localScores];

      // Get Devvit scores if available
      if (this.devvitEnabled) {
        try {
          const devvitScores = await this.getDevvitScores();
          
          // Merge scores, avoiding duplicates based on timestamp and score
          const mergedScores = this.mergeScores(scores, devvitScores);
          scores = mergedScores;
        } catch (error) {
          console.warn('Failed to fetch Devvit scores, using local only:', error);
        }
      }

      // Sort scores
      scores.sort((a, b) => {
        const aValue = sortBy === 'score' ? a.score : a.timestamp;
        const bValue = sortBy === 'score' ? b.score : b.timestamp;
        
        if (sortOrder === 'desc') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });

      // Apply pagination
      return scores.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get the player's personal best score
   */
  public getPersonalBest(): ScoreEntry | null {
    try {
      const scores = this.getLocalScores();
      if (scores.length === 0) return null;

      return scores.reduce((best, current) => 
        current.score > best.score ? current : best
      );
    } catch (error) {
      console.error('Failed to get personal best:', error);
      return null;
    }
  }

  /**
   * Get total number of games played locally
   */
  public getTotalGamesPlayed(): number {
    try {
      const scores = this.getLocalScores();
      return scores.length;
    } catch (error) {
      console.error('Failed to get total games played:', error);
      return 0;
    }
  }

  /**
   * Get player statistics
   */
  public getPlayerStats(): {
    totalGames: number;
    personalBest: ScoreEntry | null;
    averageScore: number;
    totalLines: number;
    averageLevel: number;
  } {
    try {
      const scores = this.getLocalScores();
      
      if (scores.length === 0) {
        return {
          totalGames: 0,
          personalBest: null,
          averageScore: 0,
          totalLines: 0,
          averageLevel: 0
        };
      }

      const totalScore = scores.reduce((sum, entry) => sum + entry.score, 0);
      const totalLines = scores.reduce((sum, entry) => sum + entry.lines, 0);
      const totalLevels = scores.reduce((sum, entry) => sum + entry.level, 0);

      return {
        totalGames: scores.length,
        personalBest: this.getPersonalBest(),
        averageScore: Math.floor(totalScore / scores.length),
        totalLines,
        averageLevel: Math.floor(totalLevels / scores.length)
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      return {
        totalGames: 0,
        personalBest: null,
        averageScore: 0,
        totalLines: 0,
        averageLevel: 0
      };
    }
  }

  /**
   * Clear all local scores (for testing or reset purposes)
   */
  public clearLocalScores(): boolean {
    try {
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear local scores:', error);
      return false;
    }
  }

  /**
   * Save score to local storage
   */
  private saveToLocalStorage(entry: ScoreEntry): boolean {
    try {
      const scores = this.getLocalScores();
      scores.push(entry);

      // Keep only the top scores to prevent unlimited growth
      scores.sort((a, b) => b.score - a.score);
      const trimmedScores = scores.slice(0, this.MAX_LOCAL_SCORES);

      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(trimmedScores));
      return true;
    } catch (error) {
      console.error('Failed to save to local storage:', error);
      return false;
    }
  }

  /**
   * Get scores from local storage
   */
  private getLocalScores(): ScoreEntry[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!stored) return [];

      const scores = JSON.parse(stored);
      
      // Validate score entries
      return scores.filter((entry: any) => 
        entry && 
        typeof entry.score === 'number' && 
        typeof entry.timestamp === 'number' &&
        entry.score >= 0
      );
    } catch (error) {
      console.error('Failed to get local scores:', error);
      return [];
    }
  }

  /**
   * Check if we're running in a Devvit environment
   */
  private checkDevvitEnvironment(): boolean {
    // Check for Devvit-specific globals or APIs
    return typeof window !== 'undefined' && 
           (window as any).devvit !== undefined;
  }

  /**
   * Save score to Devvit backend
   */
  private async saveToDevvit(entry: ScoreEntry): Promise<boolean> {
    try {
      // This would be the actual Devvit API call
      // For now, we'll simulate the API call
      if ((window as any).devvit && (window as any).devvit.saveScore) {
        const result = await (window as any).devvit.saveScore(entry);
        return result.success === true;
      }
      
      // Fallback: simulate successful save for development
      console.log('Devvit save simulated for:', entry);
      return true;
    } catch (error) {
      console.error('Failed to save to Devvit:', error);
      return false;
    }
  }

  /**
   * Get scores from Devvit backend
   */
  private async getDevvitScores(): Promise<ScoreEntry[]> {
    try {
      // This would be the actual Devvit API call
      if ((window as any).devvit && (window as any).devvit.getScores) {
        const result = await (window as any).devvit.getScores();
        return result.scores || [];
      }
      
      // Fallback: return empty array for development
      return [];
    } catch (error) {
      console.error('Failed to get Devvit scores:', error);
      return [];
    }
  }

  /**
   * Merge local and Devvit scores, removing duplicates
   */
  private mergeScores(localScores: ScoreEntry[], devvitScores: ScoreEntry[]): ScoreEntry[] {
    const merged = [...localScores];
    
    // Add Devvit scores that don't already exist locally
    devvitScores.forEach(devvitScore => {
      const isDuplicate = localScores.some(localScore => 
        localScore.timestamp === devvitScore.timestamp && 
        localScore.score === devvitScore.score
      );
      
      if (!isDuplicate) {
        merged.push(devvitScore);
      }
    });
    
    return merged;
  }

  /**
   * Update score formulas (for game balancing)
   */
  public updateScoreFormulas(newFormulas: Partial<ScoreFormulas>): void {
    this.scoreFormulas = { ...this.scoreFormulas, ...newFormulas };
  }

  /**
   * Get current score formulas
   */
  public getScoreFormulas(): Readonly<ScoreFormulas> {
    return { ...this.scoreFormulas };
  }
}