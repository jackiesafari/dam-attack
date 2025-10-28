import { SeasonalManager } from './SeasonalManager';
import { WaterLevelManager } from './WaterLevelManager';
import { GameStateManager } from './GameStateManager';
import { 
  SeasonalLevel, 
  World, 
  Season,
  PowerUp,
  PowerUpType,
  StoryElement 
} from '../types/EnvironmentalTypes';

export interface LevelProgress {
  currentLevel: number;
  currentWorld: World;
  linesCleared: number;
  targetLines: number;
  timeElapsed: number;
  score: number;
  isCompleted: boolean;
  stars: number; // 1-3 star rating
  unlocked: boolean;
}

export interface WorldProgress {
  world: World;
  levelsCompleted: number;
  totalLevels: number;
  isUnlocked: boolean;
  bestScore: number;
  totalStars: number;
}

export class LevelProgressionManager {
  private seasonalManager: SeasonalManager;
  private waterLevelManager: WaterLevelManager;
  private gameStateManager: GameStateManager;
  private scene: Phaser.Scene;
  
  private levelProgress: Map<number, LevelProgress> = new Map();
  private worldProgress: Map<World, WorldProgress> = new Map();
  private unlockedPowerUps: Set<PowerUpType> = new Set();
  private currentGameMode: 'campaign' | 'endless' = 'campaign';
  
  private listeners: ((progress: LevelProgress) => void)[] = [];

  constructor(
    scene: Phaser.Scene,
    seasonalManager: SeasonalManager,
    waterLevelManager: WaterLevelManager,
    gameStateManager: GameStateManager
  ) {
    this.scene = scene;
    this.seasonalManager = seasonalManager;
    this.waterLevelManager = waterLevelManager;
    this.gameStateManager = gameStateManager;
    
    this.initializeProgression();
    this.setupEventListeners();
  }

  private initializeProgression(): void {
    // Initialize level progress for all 20 levels
    for (let i = 1; i <= 20; i++) {
      const level = this.seasonalManager.getAllLevels().find(l => l.globalLevel === i);
      if (level) {
        this.levelProgress.set(i, {
          currentLevel: i,
          currentWorld: level.world,
          linesCleared: 0,
          targetLines: level.targetLines,
          timeElapsed: 0,
          score: 0,
          isCompleted: false,
          stars: 0,
          unlocked: i === 1 // Only level 1 starts unlocked
        });
      }
    }

    // Initialize world progress
    const worlds = [World.SPRING_THAW, World.SUMMER_FLOW, World.AUTUMN_RUSH, World.WINTER_FREEZE];
    worlds.forEach((world, index) => {
      this.worldProgress.set(world, {
        world,
        levelsCompleted: 0,
        totalLevels: 5,
        isUnlocked: index === 0, // Only Spring Thaw starts unlocked
        bestScore: 0,
        totalStars: 0
      });
    });

    // Load saved progress from localStorage
    this.loadProgress();
  }

  private setupEventListeners(): void {
    // Listen for game state changes
    this.gameStateManager.addStateListener((state) => {
      if (this.currentGameMode === 'campaign') {
        this.updateCurrentLevelProgress(state.lines, state.score, state.timeElapsed);
      }
    });

    // Listen for water level critical (game over)
    this.scene.events.on('water-level-critical', () => {
      this.handleLevelFailure();
    });

    // Listen for line clears
    this.scene.events.on('lines-cleared', (linesCleared: number) => {
      this.handleLinesCleared(linesCleared);
    });
  }

  public startLevel(levelNumber: number): boolean {
    const progress = this.levelProgress.get(levelNumber);
    if (!progress || !progress.unlocked) {
      console.warn(`Level ${levelNumber} is not unlocked`);
      return false;
    }

    // Set the seasonal level
    if (!this.seasonalManager.setLevel(levelNumber)) {
      return false;
    }

    // Reset level progress for new attempt
    progress.linesCleared = 0;
    progress.timeElapsed = 0;
    progress.score = 0;
    progress.isCompleted = false;

    // Reset water level
    this.waterLevelManager.reset();
    
    // Set water rise rate based on level
    const seasonalLevel = this.seasonalManager.getCurrentLevel();
    this.waterLevelManager.setRiseRate(seasonalLevel.waterRiseRate);

    // Notify listeners
    this.notifyListeners(progress);

    // Trigger level start story elements
    this.scene.events.emit('level-started', levelNumber, seasonalLevel);

    return true;
  }

  private updateCurrentLevelProgress(lines: number, score: number, timeElapsed: number): void {
    const currentLevel = this.seasonalManager.getCurrentLevel();
    const progress = this.levelProgress.get(currentLevel.globalLevel);
    
    if (progress) {
      progress.linesCleared = lines;
      progress.score = score;
      progress.timeElapsed = timeElapsed;
      
      // Check if level is completed
      if (lines >= progress.targetLines && !progress.isCompleted) {
        this.completeLevel(currentLevel.globalLevel);
      }
      
      this.notifyListeners(progress);
    }
  }

  private handleLinesCleared(linesCleared: number): void {
    const currentLevel = this.seasonalManager.getCurrentLevel();
    
    // Create waterfall effect for cleared lines
    const gameWidth = 800;
    const clearX = gameWidth / 2;
    
    // Create multiple waterfalls for multiple lines
    for (let i = 0; i < linesCleared; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        this.scene.events.emit('create-waterfall', clearX + (i - linesCleared/2) * 50, 100);
      });
    }

    // Lower water level as reward for clearing lines
    const waterReduction = linesCleared * 0.02; // 2% per line
    this.waterLevelManager.lowerWater(waterReduction);

    // Check for power-up spawning (summer levels and beyond)
    if (currentLevel.globalLevel >= 6 && Math.random() < 0.1 * linesCleared) {
      this.spawnPowerUp();
    }
  }

  private completeLevel(levelNumber: number): void {
    const progress = this.levelProgress.get(levelNumber);
    if (!progress) return;

    progress.isCompleted = true;
    
    // Calculate star rating based on performance
    progress.stars = this.calculateStarRating(progress);
    
    // Update world progress
    this.updateWorldProgress(progress.currentWorld, progress.score, progress.stars);
    
    // Unlock next level
    this.unlockNextLevel(levelNumber);
    
    // Save progress
    this.saveProgress();
    
    // Trigger completion events
    this.scene.events.emit('level-completed', {
      level: levelNumber,
      stars: progress.stars,
      score: progress.score,
      timeElapsed: progress.timeElapsed
    });

    // Check for world completion
    this.checkWorldCompletion(progress.currentWorld);
    
    this.notifyListeners(progress);
  }

  private calculateStarRating(progress: LevelProgress): number {
    const currentLevel = this.seasonalManager.getAllLevels()
      .find(l => l.globalLevel === progress.currentLevel);
    
    if (!currentLevel) return 1;

    let stars = 1; // Base completion star
    
    // Second star: Complete with time bonus
    const targetTime = 300000; // 5 minutes base target
    if (progress.timeElapsed < targetTime) {
      stars = 2;
    }
    
    // Third star: Exceptional performance
    const excellentTime = targetTime * 0.7; // Complete in 70% of target time
    const excellentLines = currentLevel.targetLines * 1.5; // Clear 50% more lines
    
    if (progress.timeElapsed < excellentTime || progress.linesCleared >= excellentLines) {
      stars = 3;
    }
    
    return stars;
  }

  private updateWorldProgress(world: World, score: number, stars: number): void {
    const worldProg = this.worldProgress.get(world);
    if (!worldProg) return;

    worldProg.levelsCompleted++;
    worldProg.bestScore = Math.max(worldProg.bestScore, score);
    worldProg.totalStars += stars;
  }

  private unlockNextLevel(completedLevel: number): void {
    const nextLevel = completedLevel + 1;
    const nextProgress = this.levelProgress.get(nextLevel);
    
    if (nextProgress) {
      nextProgress.unlocked = true;
      
      // Check if we're entering a new world
      const currentWorld = this.levelProgress.get(completedLevel)?.currentWorld;
      const nextWorld = nextProgress.currentWorld;
      
      if (currentWorld !== nextWorld) {
        this.unlockWorld(nextWorld);
      }
    }
  }

  private unlockWorld(world: World): void {
    const worldProg = this.worldProgress.get(world);
    if (worldProg) {
      worldProg.isUnlocked = true;
      
      // Unlock new power-ups for new worlds
      this.unlockWorldPowerUps(world);
      
      this.scene.events.emit('world-unlocked', world);
    }
  }

  private unlockWorldPowerUps(world: World): void {
    switch (world) {
      case World.SUMMER_FLOW:
        this.unlockedPowerUps.add(PowerUpType.BEAVER_HELPER);
        this.unlockedPowerUps.add(PowerUpType.TIME_SLOW);
        break;
      case World.AUTUMN_RUSH:
        this.unlockedPowerUps.add(PowerUpType.CLEAR_VISION);
        this.unlockedPowerUps.add(PowerUpType.NATURE_BOOST);
        break;
      case World.WINTER_FREEZE:
        this.unlockedPowerUps.add(PowerUpType.SUPER_GRIP);
        this.unlockedPowerUps.add(PowerUpType.WATER_PUMP);
        break;
    }
  }

  private checkWorldCompletion(world: World): void {
    const worldProg = this.worldProgress.get(world);
    if (!worldProg) return;

    if (worldProg.levelsCompleted >= worldProg.totalLevels) {
      this.scene.events.emit('world-completed', {
        world,
        totalStars: worldProg.totalStars,
        bestScore: worldProg.bestScore
      });
      
      // Special rewards for world completion
      this.grantWorldCompletionRewards(world);
    }
  }

  private grantWorldCompletionRewards(world: World): void {
    // Grant special power-ups or bonuses for completing worlds
    switch (world) {
      case World.SPRING_THAW:
        this.scene.events.emit('achievement-unlocked', 'spring_master');
        break;
      case World.SUMMER_FLOW:
        this.scene.events.emit('achievement-unlocked', 'summer_champion');
        break;
      case World.AUTUMN_RUSH:
        this.scene.events.emit('achievement-unlocked', 'autumn_survivor');
        break;
      case World.WINTER_FREEZE:
        this.scene.events.emit('achievement-unlocked', 'winter_legend');
        // Unlock endless mode
        this.scene.events.emit('endless-mode-unlocked');
        break;
    }
  }

  private handleLevelFailure(): void {
    const currentLevel = this.seasonalManager.getCurrentLevel();
    
    this.scene.events.emit('level-failed', {
      level: currentLevel.globalLevel,
      reason: 'water_overflow',
      progress: this.levelProgress.get(currentLevel.globalLevel)
    });
  }

  private spawnPowerUp(): void {
    const availablePowerUps = Array.from(this.unlockedPowerUps);
    if (availablePowerUps.length === 0) return;

    const randomPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
    
    this.scene.events.emit('power-up-spawned', {
      type: randomPowerUp,
      x: 200 + Math.random() * 400, // Random X position in play area
      y: 100 + Math.random() * 200  // Random Y position in upper area
    });
  }

  public startEndlessMode(): void {
    this.currentGameMode = 'endless';
    
    // Set to a high-difficulty configuration
    this.seasonalManager.setLevel(20); // Start at winter difficulty
    this.waterLevelManager.reset();
    this.waterLevelManager.setRiseRate(1.0); // Progressive increase
    
    this.scene.events.emit('endless-mode-started');
  }

  public getCurrentProgress(): LevelProgress | null {
    const currentLevel = this.seasonalManager.getCurrentLevel();
    return this.levelProgress.get(currentLevel.globalLevel) || null;
  }

  public getWorldProgress(world: World): WorldProgress | null {
    return this.worldProgress.get(world) || null;
  }

  public getAllWorldProgress(): WorldProgress[] {
    return Array.from(this.worldProgress.values());
  }

  public isLevelUnlocked(levelNumber: number): boolean {
    const progress = this.levelProgress.get(levelNumber);
    return progress ? progress.unlocked : false;
  }

  public isWorldUnlocked(world: World): boolean {
    const worldProg = this.worldProgress.get(world);
    return worldProg ? worldProg.isUnlocked : false;
  }

  public getUnlockedPowerUps(): PowerUpType[] {
    return Array.from(this.unlockedPowerUps);
  }

  public getTotalStars(): number {
    return Array.from(this.levelProgress.values())
      .reduce((total, progress) => total + progress.stars, 0);
  }

  public getCompletionPercentage(): number {
    const totalLevels = this.levelProgress.size;
    const completedLevels = Array.from(this.levelProgress.values())
      .filter(p => p.isCompleted).length;
    
    return totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;
  }

  private saveProgress(): void {
    const saveData = {
      levelProgress: Array.from(this.levelProgress.entries()),
      worldProgress: Array.from(this.worldProgress.entries()),
      unlockedPowerUps: Array.from(this.unlockedPowerUps),
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('dam_attack_progress', JSON.stringify(saveData));
    } catch (error) {
      console.warn('Failed to save progress:', error);
    }
  }

  private loadProgress(): void {
    try {
      const savedData = localStorage.getItem('dam_attack_progress');
      if (!savedData) return;

      const data = JSON.parse(savedData);
      
      // Load level progress
      if (data.levelProgress) {
        data.levelProgress.forEach(([level, progress]: [number, LevelProgress]) => {
          this.levelProgress.set(level, progress);
        });
      }
      
      // Load world progress
      if (data.worldProgress) {
        data.worldProgress.forEach(([world, progress]: [World, WorldProgress]) => {
          this.worldProgress.set(world, progress);
        });
      }
      
      // Load unlocked power-ups
      if (data.unlockedPowerUps) {
        this.unlockedPowerUps = new Set(data.unlockedPowerUps);
      }
      
    } catch (error) {
      console.warn('Failed to load progress:', error);
    }
  }

  public resetProgress(): void {
    this.initializeProgression();
    this.saveProgress();
    this.scene.events.emit('progress-reset');
  }

  public addProgressListener(listener: (progress: LevelProgress) => void): void {
    this.listeners.push(listener);
  }

  public removeProgressListener(listener: (progress: LevelProgress) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(progress: LevelProgress): void {
    this.listeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    });
  }

  public destroy(): void {
    this.listeners = [];
    this.saveProgress();
  }
}