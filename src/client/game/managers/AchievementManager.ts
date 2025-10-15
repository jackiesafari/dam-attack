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

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: number;
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

export class AchievementManager {
  private readonly STORAGE_KEY = 'dam-attack-achievements';
  private readonly STATS_KEY = 'dam-attack-stats';
  
  private achievements: Map<string, Achievement> = new Map();
  private gameStats: GameStats;
  private listeners: ((achievement: Achievement) => void)[] = [];

  constructor() {
    this.gameStats = this.loadGameStats();
    this.initializeAchievements();
    this.loadProgress();
  }

  /**
   * Initialize all available achievements
   */
  private initializeAchievements(): void {
    const achievementDefinitions: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress' | 'maxProgress'>[] = [
      // Scoring Achievements
      {
        id: 'first_score',
        name: 'First Steps',
        description: 'Score your first 1,000 points',
        category: AchievementCategory.SCORING,
        rarity: AchievementRarity.COMMON,
        icon: '🎯',
        requirement: { type: 'score', value: 1000 },
        reward: { points: 10 },
        hidden: false
      },
      {
        id: 'score_10k',
        name: 'Rising Star',
        description: 'Score 10,000 points in a single game',
        category: AchievementCategory.SCORING,
        rarity: AchievementRarity.UNCOMMON,
        icon: '⭐',
        requirement: { type: 'single_game_score', value: 10000 },
        reward: { points: 25 },
        hidden: false
      },
      {
        id: 'score_50k',
        name: 'High Scorer',
        description: 'Score 50,000 points in a single game',
        category: AchievementCategory.SCORING,
        rarity: AchievementRarity.RARE,
        icon: '🏆',
        requirement: { type: 'single_game_score', value: 50000 },
        reward: { points: 50, title: 'High Scorer' },
        hidden: false
      },
      {
        id: 'score_100k',
        name: 'Score Master',
        description: 'Score 100,000 points in a single game',
        category: AchievementCategory.SCORING,
        rarity: AchievementRarity.EPIC,
        icon: '👑',
        requirement: { type: 'single_game_score', value: 100000 },
        reward: { points: 100, title: 'Score Master' },
        hidden: false
      },

      // Lines Achievements
      {
        id: 'first_line',
        name: 'Line Clearer',
        description: 'Clear your first line',
        category: AchievementCategory.LINES,
        rarity: AchievementRarity.COMMON,
        icon: '📏',
        requirement: { type: 'lines', value: 1 },
        reward: { points: 5 },
        hidden: false
      },
      {
        id: 'lines_100',
        name: 'Century',
        description: 'Clear 100 lines total',
        category: AchievementCategory.LINES,
        rarity: AchievementRarity.UNCOMMON,
        icon: '💯',
        requirement: { type: 'total_lines', value: 100 },
        reward: { points: 20 },
        hidden: false
      },
      {
        id: 'lines_1000',
        name: 'Line Master',
        description: 'Clear 1,000 lines total',
        category: AchievementCategory.LINES,
        rarity: AchievementRarity.RARE,
        icon: '🎖️',
        requirement: { type: 'total_lines', value: 1000 },
        reward: { points: 75, title: 'Line Master' },
        hidden: false
      },

      // Survival Achievements
      {
        id: 'level_5',
        name: 'Getting Started',
        description: 'Reach level 5',
        category: AchievementCategory.SURVIVAL,
        rarity: AchievementRarity.COMMON,
        icon: '🌱',
        requirement: { type: 'level', value: 5 },
        reward: { points: 15 },
        hidden: false
      },
      {
        id: 'level_10',
        name: 'Steady Progress',
        description: 'Reach level 10',
        category: AchievementCategory.SURVIVAL,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🌿',
        requirement: { type: 'level', value: 10 },
        reward: { points: 30 },
        hidden: false
      },
      {
        id: 'level_20',
        name: 'Speed Demon',
        description: 'Reach level 20',
        category: AchievementCategory.SURVIVAL,
        rarity: AchievementRarity.EPIC,
        icon: '🔥',
        requirement: { type: 'level', value: 20 },
        reward: { points: 100, title: 'Speed Demon' },
        hidden: false
      },

      // Skill Achievements
      {
        id: 'first_tetris',
        name: 'Tetris!',
        description: 'Clear 4 lines at once',
        category: AchievementCategory.SKILL,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🎪',
        requirement: { type: 'tetris', value: 1 },
        reward: { points: 25 },
        hidden: false
      },
      {
        id: 'tetris_master',
        name: 'Tetris Master',
        description: 'Clear 50 Tetrises total',
        category: AchievementCategory.SKILL,
        rarity: AchievementRarity.RARE,
        icon: '🎭',
        requirement: { type: 'total_tetris', value: 50 },
        reward: { points: 75, title: 'Tetris Master' },
        hidden: false
      },
      {
        id: 'perfect_clear',
        name: 'Perfect Clear',
        description: 'Clear the entire board',
        category: AchievementCategory.SKILL,
        rarity: AchievementRarity.EPIC,
        icon: '✨',
        requirement: { type: 'perfect_clear', value: 1 },
        reward: { points: 100 },
        hidden: false
      },
      {
        id: 'combo_master',
        name: 'Combo Master',
        description: 'Achieve a 10x combo',
        category: AchievementCategory.SKILL,
        rarity: AchievementRarity.RARE,
        icon: '🔗',
        requirement: { type: 'combo', value: 10 },
        reward: { points: 60, title: 'Combo Master' },
        hidden: false
      },

      // Special Achievements
      {
        id: 'dedicated_player',
        name: 'Dedicated Player',
        description: 'Play 100 games',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.UNCOMMON,
        icon: '🎮',
        requirement: { type: 'total_games', value: 100 },
        reward: { points: 40 },
        hidden: false
      },
      {
        id: 'sprint_champion',
        name: 'Sprint Champion',
        description: 'Complete 40-line sprint in under 2 minutes',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.EPIC,
        icon: '🏃',
        requirement: { type: 'sprint_time', value: 120000, condition: 'less_than' },
        reward: { points: 150, title: 'Sprint Champion' },
        hidden: false
      },
      {
        id: 'time_attack_hero',
        name: 'Time Attack Hero',
        description: 'Score 25,000+ points in Time Attack mode',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.RARE,
        icon: '⏰',
        requirement: { type: 'time_attack_score', value: 25000 },
        reward: { points: 80, title: 'Time Attack Hero' },
        hidden: false
      },

      // Hidden Achievements
      {
        id: 'secret_beaver',
        name: 'Secret of the Beaver',
        description: 'Discover the hidden beaver easter egg',
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.LEGENDARY,
        icon: '🦫',
        requirement: { type: 'easter_egg', value: 1, condition: 'beaver' },
        reward: { points: 200, title: 'Beaver Whisperer' },
        hidden: true
      },
      {
        id: 'no_mistakes',
        name: 'Perfectionist',
        description: 'Complete a game without any misdrops',
        category: AchievementCategory.SKILL,
        rarity: AchievementRarity.LEGENDARY,
        icon: '💎',
        requirement: { type: 'perfect_game', value: 1 },
        reward: { points: 250, title: 'Perfectionist' },
        hidden: true
      }
    ];

    // Initialize achievements with default progress
    achievementDefinitions.forEach(def => {
      const achievement: Achievement = {
        ...def,
        unlocked: false,
        progress: 0,
        maxProgress: def.requirement.value
      };
      this.achievements.set(def.id, achievement);
    });
  }

  /**
   * Update game statistics and check for achievement progress
   */
  public updateStats(updates: Partial<GameStats>): Achievement[] {
    const previousStats = { ...this.gameStats };
    this.gameStats = { ...this.gameStats, ...updates };
    
    this.saveGameStats();
    
    return this.checkAchievements(previousStats);
  }

  /**
   * Check all achievements for progress updates
   */
  private checkAchievements(previousStats: GameStats): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    this.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      const newProgress = this.calculateProgress(achievement, this.gameStats);
      const wasUnlocked = newProgress >= achievement.maxProgress;

      if (newProgress !== achievement.progress) {
        achievement.progress = newProgress;
        
        if (wasUnlocked && !achievement.unlocked) {
          achievement.unlocked = true;
          achievement.unlockedAt = Date.now();
          newlyUnlocked.push(achievement);
          this.notifyAchievementUnlocked(achievement);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      this.saveProgress();
    }

    return newlyUnlocked;
  }

  /**
   * Calculate progress for a specific achievement
   */
  private calculateProgress(achievement: Achievement, stats: GameStats): number {
    const req = achievement.requirement;

    switch (req.type) {
      case 'score':
      case 'single_game_score':
        return Math.min(stats.totalScore, req.value);
      
      case 'lines':
      case 'total_lines':
        return Math.min(stats.totalLines, req.value);
      
      case 'level':
        return Math.min(stats.maxLevel, req.value);
      
      case 'tetris':
      case 'total_tetris':
        return Math.min(stats.tetrisCount, req.value);
      
      case 'perfect_clear':
        return Math.min(stats.perfectClears, req.value);
      
      case 'combo':
        return Math.min(stats.maxCombo, req.value);
      
      case 'total_games':
        return Math.min(stats.totalGames, req.value);
      
      case 'sprint_time':
        if (req.condition === 'less_than') {
          return stats.fastestSprint > 0 && stats.fastestSprint <= req.value ? req.value : 0;
        }
        return Math.min(stats.fastestSprint, req.value);
      
      case 'time_attack_score':
        return Math.min(stats.highestScoreInTimeAttack, req.value);
      
      case 'easter_egg':
      case 'perfect_game':
        // These are binary achievements - either unlocked or not
        return 0; // Will be manually triggered
      
      default:
        return 0;
    }
  }

  /**
   * Manually trigger an achievement (for special conditions)
   */
  public triggerAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) {
      return false;
    }

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    achievement.progress = achievement.maxProgress;
    
    this.saveProgress();
    this.notifyAchievementUnlocked(achievement);
    
    return true;
  }

  /**
   * Get all achievements
   */
  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
      .filter(achievement => !achievement.hidden || achievement.unlocked)
      .sort((a, b) => {
        // Sort by unlocked status, then by rarity, then by name
        if (a.unlocked !== b.unlocked) {
          return a.unlocked ? -1 : 1;
        }
        
        const rarityOrder = {
          [AchievementRarity.COMMON]: 1,
          [AchievementRarity.UNCOMMON]: 2,
          [AchievementRarity.RARE]: 3,
          [AchievementRarity.EPIC]: 4,
          [AchievementRarity.LEGENDARY]: 5
        };
        
        if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        }
        
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.getAllAchievements().filter(achievement => 
      achievement.category === category
    );
  }

  /**
   * Get unlocked achievements
   */
  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(achievement => 
      achievement.unlocked
    );
  }

  /**
   * Get achievement progress percentage
   */
  public getOverallProgress(): {
    unlocked: number;
    total: number;
    percentage: number;
    points: number;
  } {
    const allAchievements = Array.from(this.achievements.values());
    const unlockedAchievements = allAchievements.filter(a => a.unlocked);
    const totalPoints = unlockedAchievements.reduce((sum, a) => 
      sum + (a.reward?.points || 0), 0
    );

    return {
      unlocked: unlockedAchievements.length,
      total: allAchievements.length,
      percentage: Math.round((unlockedAchievements.length / allAchievements.length) * 100),
      points: totalPoints
    };
  }

  /**
   * Get current game statistics
   */
  public getGameStats(): Readonly<GameStats> {
    return { ...this.gameStats };
  }

  /**
   * Add achievement unlock listener
   */
  public addAchievementListener(listener: (achievement: Achievement) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove achievement unlock listener
   */
  public removeAchievementListener(listener: (achievement: Achievement) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of achievement unlock
   */
  private notifyAchievementUnlocked(achievement: Achievement): void {
    this.listeners.forEach(listener => {
      try {
        listener(achievement);
      } catch (error) {
        console.error('Error in achievement listener:', error);
      }
    });
  }

  /**
   * Load game statistics from storage
   */
  private loadGameStats(): GameStats {
    try {
      const stored = localStorage.getItem(this.STATS_KEY);
      if (stored) {
        return { ...this.getDefaultStats(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load game stats:', error);
    }
    
    return this.getDefaultStats();
  }

  /**
   * Save game statistics to storage
   */
  private saveGameStats(): void {
    try {
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.gameStats));
    } catch (error) {
      console.error('Failed to save game stats:', error);
    }
  }

  /**
   * Load achievement progress from storage
   */
  private loadProgress(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const progress: AchievementProgress[] = JSON.parse(stored);
        
        progress.forEach(p => {
          const achievement = this.achievements.get(p.achievementId);
          if (achievement) {
            achievement.progress = p.progress;
            achievement.unlocked = p.unlocked;
            achievement.unlockedAt = p.unlockedAt;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load achievement progress:', error);
    }
  }

  /**
   * Save achievement progress to storage
   */
  private saveProgress(): void {
    try {
      const progress: AchievementProgress[] = Array.from(this.achievements.values())
        .map(achievement => ({
          achievementId: achievement.id,
          progress: achievement.progress,
          unlocked: achievement.unlocked,
          unlockedAt: achievement.unlockedAt
        }));
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save achievement progress:', error);
    }
  }

  /**
   * Get default game statistics
   */
  private getDefaultStats(): GameStats {
    return {
      totalScore: 0,
      totalLines: 0,
      totalGames: 0,
      maxLevel: 0,
      longestSurvival: 0,
      tetrisCount: 0,
      perfectClears: 0,
      consecutiveTetrises: 0,
      maxCombo: 0,
      fastestSprint: 0,
      highestScoreInTimeAttack: 0
    };
  }

  /**
   * Reset all achievements and statistics (for testing)
   */
  public resetAll(): void {
    this.gameStats = this.getDefaultStats();
    this.achievements.forEach(achievement => {
      achievement.unlocked = false;
      achievement.progress = 0;
      achievement.unlockedAt = undefined;
    });
    
    this.saveGameStats();
    this.saveProgress();
  }

  /**
   * Get achievement by ID
   */
  public getAchievement(id: string): Achievement | null {
    return this.achievements.get(id) || null;
  }
}