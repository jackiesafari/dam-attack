import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementManager, AchievementCategory, AchievementRarity } from '../AchievementManager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AchievementManager', () => {
  let achievementManager: AchievementManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    achievementManager = new AchievementManager();
  });

  describe('initialization', () => {
    it('should initialize with default game stats', () => {
      const stats = achievementManager.getGameStats();
      
      expect(stats.totalScore).toBe(0);
      expect(stats.totalLines).toBe(0);
      expect(stats.totalGames).toBe(0);
      expect(stats.maxLevel).toBe(0);
      expect(stats.tetrisCount).toBe(0);
    });

    it('should load achievements with default progress', () => {
      const achievements = achievementManager.getAllAchievements();
      
      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements.every(a => !a.unlocked)).toBe(true);
      expect(achievements.every(a => a.progress === 0)).toBe(true);
    });

    it('should have achievements in different categories', () => {
      const achievements = achievementManager.getAllAchievements();
      
      const categories = new Set(achievements.map(a => a.category));
      expect(categories.has(AchievementCategory.SCORING)).toBe(true);
      expect(categories.has(AchievementCategory.LINES)).toBe(true);
      expect(categories.has(AchievementCategory.SURVIVAL)).toBe(true);
      expect(categories.has(AchievementCategory.SKILL)).toBe(true);
      expect(categories.has(AchievementCategory.SPECIAL)).toBe(true);
    });
  });

  describe('achievement unlocking', () => {
    it('should unlock first score achievement', () => {
      const unlockedAchievements = achievementManager.updateStats({
        totalScore: 1000
      });
      
      expect(unlockedAchievements.length).toBe(1);
      expect(unlockedAchievements[0].id).toBe('first_score');
      expect(unlockedAchievements[0].unlocked).toBe(true);
    });

    it('should unlock multiple achievements at once', () => {
      const unlockedAchievements = achievementManager.updateStats({
        totalScore: 10000,
        totalLines: 1,
        maxLevel: 5
      });
      
      expect(unlockedAchievements.length).toBeGreaterThan(1);
      
      const achievementIds = unlockedAchievements.map(a => a.id);
      expect(achievementIds).toContain('first_score');
      expect(achievementIds).toContain('first_line');
      expect(achievementIds).toContain('level_5');
    });

    it('should not unlock same achievement twice', () => {
      // First unlock
      const firstUnlock = achievementManager.updateStats({
        totalScore: 1000
      });
      expect(firstUnlock.length).toBe(1);
      
      // Second update with same stats
      const secondUnlock = achievementManager.updateStats({
        totalScore: 1000
      });
      expect(secondUnlock.length).toBe(0);
    });

    it('should track progress for partially completed achievements', () => {
      achievementManager.updateStats({
        totalLines: 50
      });
      
      const achievement = achievementManager.getAchievement('lines_100');
      expect(achievement?.progress).toBe(50);
      expect(achievement?.unlocked).toBe(false);
    });
  });

  describe('manual achievement triggering', () => {
    it('should manually trigger achievement', () => {
      const success = achievementManager.triggerAchievement('secret_beaver');
      
      expect(success).toBe(true);
      
      const achievement = achievementManager.getAchievement('secret_beaver');
      expect(achievement?.unlocked).toBe(true);
      expect(achievement?.unlockedAt).toBeDefined();
    });

    it('should not trigger already unlocked achievement', () => {
      achievementManager.triggerAchievement('secret_beaver');
      const success = achievementManager.triggerAchievement('secret_beaver');
      
      expect(success).toBe(false);
    });

    it('should not trigger non-existent achievement', () => {
      const success = achievementManager.triggerAchievement('non-existent');
      
      expect(success).toBe(false);
    });
  });

  describe('achievement filtering', () => {
    beforeEach(() => {
      // Unlock some achievements for testing
      achievementManager.updateStats({
        totalScore: 1000,
        totalLines: 1,
        maxLevel: 5
      });
    });

    it('should get achievements by category', () => {
      const scoringAchievements = achievementManager.getAchievementsByCategory(AchievementCategory.SCORING);
      
      expect(scoringAchievements.every(a => a.category === AchievementCategory.SCORING)).toBe(true);
      expect(scoringAchievements.length).toBeGreaterThan(0);
    });

    it('should get only unlocked achievements', () => {
      const unlockedAchievements = achievementManager.getUnlockedAchievements();
      
      expect(unlockedAchievements.every(a => a.unlocked)).toBe(true);
      expect(unlockedAchievements.length).toBeGreaterThan(0);
    });

    it('should hide hidden achievements until unlocked', () => {
      const allAchievements = achievementManager.getAllAchievements();
      const hiddenAchievements = allAchievements.filter(a => a.hidden);
      
      expect(hiddenAchievements.length).toBe(0); // Should not show hidden achievements
    });

    it('should show hidden achievements once unlocked', () => {
      achievementManager.triggerAchievement('secret_beaver');
      
      const allAchievements = achievementManager.getAllAchievements();
      const secretBeaver = allAchievements.find(a => a.id === 'secret_beaver');
      
      expect(secretBeaver).toBeDefined();
      expect(secretBeaver?.hidden).toBe(true);
      expect(secretBeaver?.unlocked).toBe(true);
    });
  });

  describe('progress tracking', () => {
    it('should calculate overall progress', () => {
      achievementManager.updateStats({
        totalScore: 1000,
        totalLines: 1
      });
      
      const progress = achievementManager.getOverallProgress();
      
      expect(progress.unlocked).toBeGreaterThan(0);
      expect(progress.total).toBeGreaterThan(progress.unlocked);
      expect(progress.percentage).toBeGreaterThan(0);
      expect(progress.percentage).toBeLessThanOrEqual(100);
      expect(progress.points).toBeGreaterThan(0);
    });

    it('should track different achievement rarities', () => {
      // Unlock a hidden legendary achievement to make it visible
      achievementManager.triggerAchievement('secret_beaver');
      
      const achievements = achievementManager.getAllAchievements();
      
      const rarities = new Set(achievements.map(a => a.rarity));
      expect(rarities.has(AchievementRarity.COMMON)).toBe(true);
      expect(rarities.has(AchievementRarity.UNCOMMON)).toBe(true);
      expect(rarities.has(AchievementRarity.RARE)).toBe(true);
      expect(rarities.has(AchievementRarity.EPIC)).toBe(true);
      expect(rarities.has(AchievementRarity.LEGENDARY)).toBe(true);
    });
  });

  describe('achievement listeners', () => {
    it('should notify listeners when achievement is unlocked', () => {
      const listener = vi.fn();
      achievementManager.addAchievementListener(listener);
      
      achievementManager.updateStats({
        totalScore: 1000
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'first_score',
          unlocked: true
        })
      );
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      achievementManager.addAchievementListener(listener);
      achievementManager.removeAchievementListener(listener);
      
      achievementManager.updateStats({
        totalScore: 1000
      });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('should save progress to localStorage', () => {
      achievementManager.updateStats({
        totalScore: 1000
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dam-attack-achievements',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dam-attack-stats',
        expect.any(String)
      );
    });

    it('should load progress from localStorage', () => {
      const mockAchievementData = JSON.stringify([
        {
          achievementId: 'first_score',
          progress: 1000,
          unlocked: true,
          unlockedAt: Date.now()
        }
      ]);
      
      const mockStatsData = JSON.stringify({
        totalScore: 1000,
        totalLines: 0,
        totalGames: 1
      });
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'dam-attack-achievements') return mockAchievementData;
        if (key === 'dam-attack-stats') return mockStatsData;
        return null;
      });
      
      const newManager = new AchievementManager();
      const achievement = newManager.getAchievement('first_score');
      const stats = newManager.getGameStats();
      
      expect(achievement?.unlocked).toBe(true);
      expect(stats.totalScore).toBe(1000);
    });
  });

  describe('statistics', () => {
    it('should track various game statistics', () => {
      achievementManager.updateStats({
        totalScore: 5000,
        totalLines: 25,
        totalGames: 3,
        maxLevel: 8,
        tetrisCount: 2,
        perfectClears: 1,
        maxCombo: 5
      });
      
      const stats = achievementManager.getGameStats();
      
      expect(stats.totalScore).toBe(5000);
      expect(stats.totalLines).toBe(25);
      expect(stats.totalGames).toBe(3);
      expect(stats.maxLevel).toBe(8);
      expect(stats.tetrisCount).toBe(2);
      expect(stats.perfectClears).toBe(1);
      expect(stats.maxCombo).toBe(5);
    });

    it('should handle incremental stat updates', () => {
      achievementManager.updateStats({ totalScore: 1000 });
      achievementManager.updateStats({ totalScore: 2000 });
      
      const stats = achievementManager.getGameStats();
      expect(stats.totalScore).toBe(2000);
    });
  });

  describe('reset functionality', () => {
    it('should reset all achievements and stats', () => {
      achievementManager.updateStats({
        totalScore: 1000,
        totalLines: 10
      });
      
      achievementManager.resetAll();
      
      const stats = achievementManager.getGameStats();
      const achievements = achievementManager.getUnlockedAchievements();
      
      expect(stats.totalScore).toBe(0);
      expect(stats.totalLines).toBe(0);
      expect(achievements.length).toBe(0);
    });
  });

  describe('special achievements', () => {
    it('should have tetris-related achievements', () => {
      const tetrisAchievement = achievementManager.getAchievement('first_tetris');
      
      expect(tetrisAchievement).toBeDefined();
      expect(tetrisAchievement?.requirement.type).toBe('tetris');
    });

    it('should unlock tetris achievement', () => {
      const unlockedAchievements = achievementManager.updateStats({
        tetrisCount: 1
      });
      
      expect(unlockedAchievements.some(a => a.id === 'first_tetris')).toBe(true);
    });

    it('should have perfect clear achievement', () => {
      const perfectClearAchievement = achievementManager.getAchievement('perfect_clear');
      
      expect(perfectClearAchievement).toBeDefined();
      expect(perfectClearAchievement?.rarity).toBe(AchievementRarity.EPIC);
    });
  });
});