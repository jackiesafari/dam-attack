import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MobileFirstLayoutSystem } from '../managers/MobileFirstLayoutSystem';

// Mock Phaser
const mockScene = {
  add: {
    container: vi.fn(() => ({
      setPosition: vi.fn(),
      setVisible: vi.fn(),
      destroy: vi.fn(),
      add: vi.fn()
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn(() => ({
        setAlpha: vi.fn()
      })),
      setFontSize: vi.fn(),
      setColor: vi.fn(),
      setY: vi.fn(),
      setText: vi.fn(),
      setVisible: vi.fn(),
      destroy: vi.fn()
    })),
    graphics: vi.fn(() => ({
      clear: vi.fn(),
      fillStyle: vi.fn(),
      fillRoundedRect: vi.fn(),
      lineStyle: vi.fn(),
      strokeRoundedRect: vi.fn()
    }))
  },
  scale: {
    on: vi.fn(),
    off: vi.fn(),
    width: 800,
    height: 600,
    gameSize: { width: 800, height: 600 }
  },
  time: {
    delayedCall: vi.fn()
  },
  tweens: {
    add: vi.fn()
  }
} as any;

describe('MobileFirstLayoutSystem', () => {
  let layoutSystem: MobileFirstLayoutSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    layoutSystem = new MobileFirstLayoutSystem(mockScene, {
      enableResponsiveLayout: true,
      enableMobileOptimizations: true,
      enableNeonStyling: true,
      debugMode: false
    });
  });

  it('should initialize with default configuration', () => {
    expect(layoutSystem).toBeDefined();
  });

  it('should detect mobile device correctly', () => {
    const deviceInfo = layoutSystem.getDeviceInfo();
    expect(deviceInfo).toHaveProperty('type');
    expect(deviceInfo).toHaveProperty('isPortrait');
    expect(deviceInfo).toHaveProperty('isTouchDevice');
    expect(deviceInfo).toHaveProperty('screenSize');
  });

  it('should update layout for different screen sizes', () => {
    // Test mobile portrait
    layoutSystem.updateLayout(375, 667);
    let layout = layoutSystem.getCurrentLayout();
    expect(layout).toBeDefined();
    expect(layout?.gameBoard).toBeDefined();
    expect(layout?.leftControls).toBeDefined();
    expect(layout?.rightControls).toBeDefined();

    // Test mobile landscape
    layoutSystem.updateLayout(667, 375);
    layout = layoutSystem.getCurrentLayout();
    expect(layout).toBeDefined();

    // Test desktop
    layoutSystem.updateLayout(1920, 1080);
    layout = layoutSystem.getCurrentLayout();
    expect(layout).toBeDefined();
  });

  it('should update game info correctly', () => {
    const gameInfo = {
      score: 1000,
      level: 5,
      lines: 25,
      nextPiece: 'log'
    };

    // Should not throw error
    expect(() => {
      layoutSystem.updateGameInfo(gameInfo);
    }).not.toThrow();
  });

  it('should handle score animations', () => {
    expect(() => {
      layoutSystem.animateScoreIncrease();
    }).not.toThrow();
  });

  it('should handle level up animations', () => {
    expect(() => {
      layoutSystem.animateLevelUp();
    }).not.toThrow();
  });

  it('should provide recommended control layout', () => {
    const recommendation = layoutSystem.getRecommendedControlLayout();
    expect(['horizontal', 'gamepad', 'enhanced']).toContain(recommendation);
  });

  it('should clean up resources on destroy', () => {
    expect(() => {
      layoutSystem.destroy();
    }).not.toThrow();
  });
});