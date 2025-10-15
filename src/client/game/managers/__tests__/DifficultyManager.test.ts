import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../DifficultyManager';

describe('DifficultyManager', () => {
  let difficultyManager: DifficultyManager;

  beforeEach(() => {
    difficultyManager = new DifficultyManager();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const settings = difficultyManager.getSettings();
      
      expect(settings.baseDropTime).toBe(1000);
      expect(settings.speedIncreaseRate).toBe(0.8);
      expect(settings.linesPerLevel).toBe(10);
      expect(settings.maxLevel).toBe(20);
    });

    it('should start with classic game mode', () => {
      const currentMode = difficultyManager.getCurrentMode();
      
      expect(currentMode.id).toBe('classic');
      expect(currentMode.name).toBe('Classic');
      expect(currentMode.startingLevel).toBe(1);
    });

    it('should start at level 1', () => {
      expect(difficultyManager.getCurrentLevel()).toBe(1);
      expect(difficultyManager.getTotalLines()).toBe(0);
    });
  });

  describe('difficulty progression', () => {
    it('should increase level when enough lines are cleared', () => {
      const result = difficultyManager.updateDifficulty(10);
      
      expect(result.levelChanged).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(difficultyManager.getCurrentLevel()).toBe(2);
      expect(difficultyManager.getTotalLines()).toBe(10);
    });

    it('should not change level if insufficient lines cleared', () => {
      const result = difficultyManager.updateDifficulty(5);
      
      expect(result.levelChanged).toBe(false);
      expect(result.newLevel).toBe(1);
      expect(difficultyManager.getCurrentLevel()).toBe(1);
      expect(difficultyManager.getTotalLines()).toBe(5);
    });

    it('should calculate correct drop time for each level', () => {
      const level1 = difficultyManager.getCurrentDifficulty();
      expect(level1.dropTime).toBe(1000);

      difficultyManager.updateDifficulty(10); // Level 2
      const level2 = difficultyManager.getCurrentDifficulty();
      expect(level2.dropTime).toBe(800); // 1000 * 0.8

      difficultyManager.updateDifficulty(10); // Level 3
      const level3 = difficultyManager.getCurrentDifficulty();
      expect(level3.dropTime).toBe(640); // 1000 * 0.8^2
    });

    it('should calculate correct score multiplier for each level', () => {
      const level1 = difficultyManager.getCurrentDifficulty();
      expect(level1.scoreMultiplier).toBe(1.0);

      difficultyManager.updateDifficulty(10); // Level 2
      const level2 = difficultyManager.getCurrentDifficulty();
      expect(level2.scoreMultiplier).toBe(1.1);

      difficultyManager.updateDifficulty(10); // Level 3
      const level3 = difficultyManager.getCurrentDifficulty();
      expect(level3.scoreMultiplier).toBe(1.2);
    });

    it('should respect maximum level', () => {
      // Clear enough lines to exceed max level
      difficultyManager.updateDifficulty(250); // Should be level 26, but max is 20
      
      expect(difficultyManager.getCurrentLevel()).toBe(20);
    });
  });

  describe('game modes', () => {
    it('should provide list of available game modes', () => {
      const modes = difficultyManager.getGameModes();
      
      expect(modes.length).toBeGreaterThan(0);
      expect(modes.some(mode => mode.id === 'classic')).toBe(true);
      expect(modes.some(mode => mode.id === 'sprint')).toBe(true);
      expect(modes.some(mode => mode.id === 'marathon')).toBe(true);
    });

    it('should switch to different game mode', () => {
      const success = difficultyManager.setGameMode('sprint');
      
      expect(success).toBe(true);
      
      const currentMode = difficultyManager.getCurrentMode();
      expect(currentMode.id).toBe('sprint');
      expect(currentMode.name).toBe('Sprint');
    });

    it('should reject invalid game mode', () => {
      const success = difficultyManager.setGameMode('invalid-mode');
      
      expect(success).toBe(false);
      
      const currentMode = difficultyManager.getCurrentMode();
      expect(currentMode.id).toBe('classic'); // Should remain unchanged
    });

    it('should reset when switching modes', () => {
      difficultyManager.updateDifficulty(20); // Advance to level 3
      expect(difficultyManager.getCurrentLevel()).toBe(3);
      
      difficultyManager.setGameMode('sprint');
      
      expect(difficultyManager.getCurrentLevel()).toBe(1);
      expect(difficultyManager.getTotalLines()).toBe(0);
    });
  });

  describe('mode objectives', () => {
    it('should track sprint mode objective', () => {
      difficultyManager.setGameMode('sprint');
      
      const objective = difficultyManager.checkModeObjective({
        lines: 20,
        score: 5000,
        timeElapsed: 60000
      });
      
      expect(objective.completed).toBe(false);
      expect(objective.objective).toContain('40 lines');
      expect(objective.progress).toBe(0.5); // 20/40
    });

    it('should complete sprint mode objective', () => {
      difficultyManager.setGameMode('sprint');
      
      const objective = difficultyManager.checkModeObjective({
        lines: 40,
        score: 10000,
        timeElapsed: 120000
      });
      
      expect(objective.completed).toBe(true);
      expect(objective.progress).toBe(1.0);
    });

    it('should track time attack mode objective', () => {
      difficultyManager.setGameMode('time-attack');
      
      const objective = difficultyManager.checkModeObjective({
        lines: 30,
        score: 15000,
        timeElapsed: 90000 // 1.5 minutes
      });
      
      expect(objective.completed).toBe(false);
      expect(objective.objective).toContain('180 seconds');
      expect(objective.progress).toBe(0.5); // 90/180
    });
  });

  describe('level bonuses', () => {
    it('should calculate level bonus for level up', () => {
      difficultyManager.updateDifficulty(10); // Level 2
      
      const bonus = difficultyManager.calculateLevelBonus(4, true);
      
      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBe(1000 * 2 * 0.5 + 4 * 10); // Base formula
    });

    it('should not give bonus if not level up', () => {
      const bonus = difficultyManager.calculateLevelBonus(4, false);
      
      expect(bonus).toBe(0);
    });
  });

  describe('special rules', () => {
    it('should check for special rules in game modes', () => {
      difficultyManager.setGameMode('sprint');
      
      expect(difficultyManager.hasSpecialRule('targetLines')).toBe(true);
      expect(difficultyManager.hasSpecialRule('ghostPieces')).toBe(true);
      expect(difficultyManager.hasSpecialRule('timeLimit')).toBe(false);
    });

    it('should get special rule values', () => {
      difficultyManager.setGameMode('sprint');
      
      expect(difficultyManager.getSpecialRuleValue('targetLines')).toBe(40);
      expect(difficultyManager.getSpecialRuleValue('ghostPieces')).toBe(true);
    });
  });

  describe('lines until next level', () => {
    it('should calculate lines needed for next level', () => {
      expect(difficultyManager.getLinesUntilNextLevel()).toBe(10);
      
      difficultyManager.updateDifficulty(5);
      expect(difficultyManager.getLinesUntilNextLevel()).toBe(5);
      
      difficultyManager.updateDifficulty(5);
      expect(difficultyManager.getLinesUntilNextLevel()).toBe(10);
    });
  });

  describe('manual level setting', () => {
    it('should allow setting level directly', () => {
      const success = difficultyManager.setLevel(5);
      
      expect(success).toBe(true);
      expect(difficultyManager.getCurrentLevel()).toBe(5);
    });

    it('should reject invalid level', () => {
      const success = difficultyManager.setLevel(25); // Above max level
      
      expect(success).toBe(false);
      expect(difficultyManager.getCurrentLevel()).toBe(1); // Should remain unchanged
    });
  });

  describe('settings updates', () => {
    it('should update settings and regenerate levels', () => {
      difficultyManager.updateSettings({
        baseDropTime: 500,
        maxLevel: 15
      });
      
      const settings = difficultyManager.getSettings();
      expect(settings.baseDropTime).toBe(500);
      expect(settings.maxLevel).toBe(15);
      
      const level1 = difficultyManager.getCurrentDifficulty();
      expect(level1.dropTime).toBe(500); // Should use new base time
    });
  });

  describe('difficulty level names', () => {
    it('should provide appropriate names for different levels', () => {
      const level1 = difficultyManager.getDifficultyLevel(1);
      expect(level1?.name).toBe('Beginner');
      
      const level5 = difficultyManager.getDifficultyLevel(5);
      expect(level5?.name).toBe('Easy');
      
      const level10 = difficultyManager.getDifficultyLevel(10);
      expect(level10?.name).toBe('Normal');
      
      const level15 = difficultyManager.getDifficultyLevel(15);
      expect(level15?.name).toBe('Hard');
      
      const level20 = difficultyManager.getDifficultyLevel(20);
      expect(level20?.name).toBe('Expert');
    });
  });
});