import { describe, it, expect, beforeEach } from 'vitest';
import { SeasonalManager } from "../managers/SeasonalManager";
import { WaterLevelManager } from "../managers/WaterLevelManager";

// Mock Phaser Scene
const mockScene = {
  add: {
    graphics: () => ({
      setDepth: () => {},
      clear: () => {},
      fillStyle: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fillPath: () => {},
      lineStyle: () => {},
      strokePath: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      fillCircle: () => {},
      fillEllipse: () => {}
    }),
    particles: () => ({
      setDepth: () => {},
      destroy: () => {}
    })
  },
  events: {
    emit: () => {}
  },
  time: {
    delayedCall: () => {}
  }
} as any;

describe('Environmental System Integration Tests', () => {
  let seasonalManager: SeasonalManager;
  let waterLevelManager: WaterLevelManager;

  beforeEach(() => {
    seasonalManager = new SeasonalManager(mockScene);
    waterLevelManager = new WaterLevelManager(mockScene, 800, 600);
  });

  describe('SeasonalManager Integration', () => {
    it('should initialize with spring thaw level', () => {
      const currentLevel = seasonalManager.getCurrentLevel();
      expect(currentLevel.season).toBe('spring');
      expect(currentLevel.world).toBe('spring_thaw');
      expect(currentLevel.name).toBe('First Thaw');
    });

    it('should provide seasonal modifiers', () => {
      const modifiers = seasonalManager.getSeasonalPieceModifiers();
      expect(modifiers).toBeDefined();
      expect(typeof modifiers).toBe('object');
    });

    it('should update environmental state', () => {
      const initialState = seasonalManager.getEnvironmentalState();
      expect(initialState.currentSeason).toBe('spring');
      expect(initialState.waterLevel).toBeDefined();
      expect(initialState.waterLevel.riseRate).toBeGreaterThan(0);
    });

    it('should set different levels correctly', () => {
      const success = seasonalManager.setLevel(6); // Summer level
      expect(success).toBe(true);
      
      const currentLevel = seasonalManager.getCurrentLevel();
      expect(currentLevel.season).toBe('summer');
      expect(currentLevel.world).toBe('summer_flow');
    });
  });

  describe('WaterLevelManager Integration', () => {
    it('should initialize with zero water level', () => {
      const waterLevel = waterLevelManager.getCurrentLevel();
      expect(waterLevel).toBe(0);
    });

    it('should update water level over time', () => {
      const initialLevel = waterLevelManager.getCurrentLevel();
      waterLevelManager.update(1000); // 1 second
      const newLevel = waterLevelManager.getCurrentLevel();
      expect(newLevel).toBeGreaterThan(initialLevel);
    });

    it('should lower water level when called', () => {
      waterLevelManager.raiseWater(0.5); // Raise to 50%
      waterLevelManager.lowerWater(0.2); // Lower by 20%
      const waterLevel = waterLevelManager.getCurrentLevel();
      expect(waterLevel).toBeCloseTo(0.3, 1);
    });

    it('should create splash effects', () => {
      // This should not throw an error
      expect(() => {
        waterLevelManager.createSplash(400, 300, 1.0);
      }).not.toThrow();
    });

    it('should set rise rate correctly', () => {
      waterLevelManager.setRiseRate(2.0);
      const initialLevel = waterLevelManager.getCurrentLevel();
      waterLevelManager.update(500); // 0.5 seconds to avoid hitting max level
      const newLevel = waterLevelManager.getCurrentLevel();
      // Should rise by 1.0 in 0.5 seconds with rate of 2.0
      expect(newLevel - initialLevel).toBeCloseTo(1.0, 1);
    });
  });

  describe('Integration Between Managers', () => {
    it('should coordinate water rise rate with seasonal level', () => {
      // Set to summer level (higher difficulty)
      seasonalManager.setLevel(6);
      const summerLevel = seasonalManager.getCurrentLevel();
      
      // Water level manager should use seasonal rise rate
      waterLevelManager.setRiseRate(summerLevel.waterRiseRate);
      expect(summerLevel.waterRiseRate).toBeGreaterThan(1.0);
    });

    it('should provide consistent environmental state', () => {
      const environmentalState = seasonalManager.getEnvironmentalState();
      const waterLevel = waterLevelManager.getCurrentLevel();
      
      expect(environmentalState.waterLevel.currentLevel).toBeDefined();
      expect(environmentalState.currentSeason).toBe('spring');
      expect(environmentalState.currentLevel.waterRiseRate).toBeGreaterThan(0);
    });

    it('should handle level transitions correctly', () => {
      // Start at level 1 (spring)
      seasonalManager.setLevel(1);
      let currentLevel = seasonalManager.getCurrentLevel();
      expect(currentLevel.season).toBe('spring');
      
      // Move to level 6 (summer)
      seasonalManager.setLevel(6);
      currentLevel = seasonalManager.getCurrentLevel();
      expect(currentLevel.season).toBe('summer');
      expect(currentLevel.waterRiseRate).toBeGreaterThan(1.0);
    });
  });

  describe('Game Over Conditions', () => {
    it('should detect water level game over', () => {
      waterLevelManager.raiseWater(1.0); // Raise to 100%
      const waterLevel = waterLevelManager.getCurrentLevel();
      expect(waterLevel).toBeGreaterThanOrEqual(1.0);
    });

    it('should reset water level correctly', () => {
      waterLevelManager.raiseWater(0.5);
      waterLevelManager.reset();
      const waterLevel = waterLevelManager.getCurrentLevel();
      expect(waterLevel).toBe(0);
    });
  });
});
