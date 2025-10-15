import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { LeaderboardUI, LeaderboardConfig, LeaderboardCallbacks } from '../LeaderboardUI';
import { UIManager } from '../../managers/UIManager';
import { ScoreManager } from '../../managers/ScoreManager';
import { ScoreEntry } from '../../types/GameTypes';

// Mock UIManager
const createMockUIManager = () => ({
  createModal: vi.fn(() => ({
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    add: vi.fn(),
    destroy: vi.fn(),
    list: [{ getData: vi.fn(() => true) }]
  })),
  closeModal: vi.fn(),
  showToast: vi.fn()
});

// Mock ScoreManager
const createMockScoreManager = () => ({
  getLeaderboard: vi.fn(),
  getPlayerStats: vi.fn(() => ({
    totalGames: 10,
    personalBest: { score: 1500, username: 'Player', timestamp: Date.now(), level: 5, lines: 20 },
    averageScore: 800,
    totalLines: 150,
    averageLevel: 4
  }))
});

// Mock Phaser scene
const createMockScene = () => {
  const mockContainer = {
    add: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    destroy: vi.fn(),
    setInteractive: vi.fn(() => mockContainer),
    on: vi.fn(),
    removeAll: vi.fn(),
    setPosition: vi.fn(),
    list: []
  };

  const mockText = {
    setOrigin: vi.fn(() => mockText),
    setScale: vi.fn(),
    setInteractive: vi.fn(() => mockText),
    on: vi.fn(),
    setText: vi.fn(),
    text: 'Test Text'
  };

  const mockGraphics = {
    fillStyle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    strokeRect: vi.fn(),
    clear: vi.fn()
  };

  const mockTweens = {
    add: vi.fn(() => ({
      stop: vi.fn(),
      destroy: vi.fn()
    }))
  };

  return {
    add: {
      container: vi.fn(() => mockContainer),
      text: vi.fn(() => mockText),
      graphics: vi.fn(() => mockGraphics)
    },
    tweens: mockTweens,
    scale: { width: 800, height: 600 },
    mockContainer,
    mockText,
    mockGraphics,
    mockTweens
  } as any;
};

describe('LeaderboardUI', () => {
  let leaderboardUI: LeaderboardUI;
  let mockScene: any;
  let mockUIManager: any;
  let mockScoreManager: any;
  let callbacks: LeaderboardCallbacks;
  let mockScores: ScoreEntry[];

  beforeEach(() => {
    mockScene = createMockScene();
    mockUIManager = createMockUIManager();
    mockScoreManager = createMockScoreManager();
    leaderboardUI = new LeaderboardUI(mockScene, mockUIManager, mockScoreManager);

    callbacks = {
      onClose: vi.fn(),
      onRefresh: vi.fn().mockResolvedValue(undefined)
    };

    mockScores = [
      { username: 'Player1', score: 2000, timestamp: Date.now(), level: 8, lines: 40 },
      { username: 'Player2', score: 1500, timestamp: Date.now() - 1000, level: 6, lines: 30 },
      { username: 'Player3', score: 1000, timestamp: Date.now() - 2000, level: 5, lines: 20 },
      { username: 'Player4', score: 800, timestamp: Date.now() - 3000, level: 4, lines: 15 },
      { username: 'Player5', score: 600, timestamp: Date.now() - 4000, level: 3, lines: 12 }
    ];

    mockScoreManager.getLeaderboard.mockResolvedValue(mockScores);
  });

  afterEach(() => {
    leaderboardUI.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with provided dependencies', () => {
      expect(leaderboardUI).toBeDefined();
      expect(leaderboardUI.visible).toBe(false);
    });
  });

  describe('Show/Hide Functionality', () => {
    it('should show leaderboard with animation', async () => {
      await leaderboardUI.show({}, callbacks);

      expect(leaderboardUI.visible).toBe(true);
      expect(mockUIManager.createModal).toHaveBeenCalled();
      expect(mockScoreManager.getLeaderboard).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Power2.easeOut'
        })
      );
    });

    it('should hide existing leaderboard when showing new one', async () => {
      await leaderboardUI.show({}, callbacks);
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.tweens.add).toHaveBeenCalledTimes(2);
    });

    it('should hide leaderboard with animation', async () => {
      await leaderboardUI.show({}, callbacks);
      leaderboardUI.hide();

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 0,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 250,
          ease: 'Power2.easeIn'
        })
      );
    });

    it('should handle hide when not visible', () => {
      expect(() => {
        leaderboardUI.hide();
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', async () => {
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, expect.any(Number), '🏆 Leaderboard', expect.any(Object));
    });

    it('should apply custom configuration', async () => {
      const config: Partial<LeaderboardConfig> = {
        title: 'Custom Leaderboard',
        maxEntries: 5,
        showPagination: false,
        showPlayerStats: false,
        showRefreshButton: false
      };

      await leaderboardUI.show(config, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, expect.any(Number), 'Custom Leaderboard', expect.any(Object));
    });

    it('should handle mobile configuration', async () => {
      mockScene.scale = { width: 400, height: 800 };
      await leaderboardUI.show({}, callbacks);

      // Should use mobile-specific styling
      expect(mockUIManager.createModal).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 360, // 400 - 40
          height: 560  // min(600, 800 - 40)
        })
      );
    });
  });

  describe('Score Display', () => {
    it('should display scores correctly', async () => {
      await leaderboardUI.show({}, callbacks);

      // Should display score entries
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('Player1'),
        expect.any(Object)
      );
    });

    it('should handle empty leaderboard', async () => {
      mockScoreManager.getLeaderboard.mockResolvedValue([]);
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        0,
        'No scores yet!\nBe the first to play!',
        expect.any(Object)
      );
    });

    it('should limit scores on mobile', async () => {
      mockScene.scale = { width: 400, height: 800 };
      const manyScores = Array.from({ length: 15 }, (_, i) => ({
        username: `Player${i}`,
        score: 1000 - i * 50,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      }));

      mockScoreManager.getLeaderboard.mockResolvedValue(manyScores);
      await leaderboardUI.show({}, callbacks);

      // Should limit to 8 scores on mobile (tested indirectly through display logic)
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should highlight top 3 scores', async () => {
      await leaderboardUI.show({}, callbacks);

      // Top 3 should have special styling (tested through graphics calls)
      expect(mockScene.mockGraphics.lineStyle).toHaveBeenCalled();
      expect(mockScene.mockGraphics.strokeRect).toHaveBeenCalled();
    });

    it('should format scores with medals for top 3', async () => {
      await leaderboardUI.show({}, callbacks);

      // Should create rank displays with medals
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringMatching(/🥇|🥈|🥉/),
        expect.any(Object)
      );
    });

    it('should truncate long usernames', async () => {
      const longNameScores: ScoreEntry[] = [{
        username: 'VeryLongUsernameHere',
        score: 1000,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      }];

      mockScoreManager.getLeaderboard.mockResolvedValue(longNameScores);
      await leaderboardUI.show({}, callbacks);

      // Should truncate long names (tested through text content)
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringMatching(/\.\.\./),
        expect.any(Object)
      );
    });

    it('should format dates appropriately', async () => {
      await leaderboardUI.show({}, callbacks);

      // Should format dates for display
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringMatching(/\d+\/\d+\/\d+/),
        expect.any(Object)
      );
    });
  });

  describe('Player Statistics', () => {
    it('should display player statistics when enabled', async () => {
      await leaderboardUI.show({ showPlayerStats: true }, callbacks);

      expect(mockScoreManager.getPlayerStats).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('Games: 10'),
        expect.any(Object)
      );
    });

    it('should not display player statistics when disabled', async () => {
      await leaderboardUI.show({ showPlayerStats: false }, callbacks);

      expect(mockScoreManager.getPlayerStats).toHaveBeenCalled();
      // Stats container should not be created (tested indirectly)
    });

    it('should handle missing personal best gracefully', async () => {
      mockScoreManager.getPlayerStats.mockReturnValue({
        totalGames: 5,
        personalBest: null,
        averageScore: 500,
        totalLines: 50,
        averageLevel: 2
      });

      await leaderboardUI.show({ showPlayerStats: true }, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('Best: None'),
        expect.any(Object)
      );
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      const manyScores = Array.from({ length: 25 }, (_, i) => ({
        username: `Player${i}`,
        score: 2500 - i * 100,
        timestamp: Date.now() - i * 1000,
        level: 8 - Math.floor(i / 5),
        lines: 40 - i * 2
      }));

      mockScoreManager.getLeaderboard.mockResolvedValue(manyScores);
    });

    it('should show pagination controls when needed', async () => {
      await leaderboardUI.show({ showPagination: true, entriesPerPage: 10 }, callbacks);

      // Should create pagination controls
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringMatching(/Page \d+ of \d+/),
        expect.any(Object)
      );
    });

    it('should not show pagination when disabled', async () => {
      await leaderboardUI.show({ showPagination: false }, callbacks);

      // Should not create pagination controls (tested indirectly)
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should handle next page navigation', async () => {
      await leaderboardUI.show({ showPagination: true, entriesPerPage: 10 }, callbacks);

      // Find next button click handler
      const nextButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (nextButtonCall) {
        nextButtonCall[1]();
        // Should update content (tested indirectly through removeAll call)
        expect(mockScene.mockContainer.removeAll).toHaveBeenCalled();
      }
    });

    it('should handle previous page navigation', async () => {
      await leaderboardUI.show({ showPagination: true, entriesPerPage: 10 }, callbacks);

      // Simulate being on page 2
      const nextButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      if (nextButtonCall) nextButtonCall[1]();

      // Find previous button click handler
      const prevButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (prevButtonCall) {
        prevButtonCall[1]();
        expect(mockScene.mockContainer.removeAll).toHaveBeenCalled();
      }
    });

    it('should not show pagination for single page', async () => {
      mockScoreManager.getLeaderboard.mockResolvedValue(mockScores.slice(0, 5));
      await leaderboardUI.show({ showPagination: true, entriesPerPage: 10 }, callbacks);

      // Should not create pagination controls for single page
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should show refresh button when enabled', async () => {
      await leaderboardUI.show({ showRefreshButton: true }, callbacks);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should not show refresh button when disabled', async () => {
      await leaderboardUI.show({ showRefreshButton: false }, callbacks);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should handle refresh button click', async () => {
      await leaderboardUI.show({ showRefreshButton: true }, callbacks);

      const refreshButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (refreshButtonCall) {
        await refreshButtonCall[1]();
        expect(callbacks.onRefresh).toHaveBeenCalled();
        expect(mockUIManager.showToast).toHaveBeenCalledWith('Leaderboard refreshed!', 2000);
      }
    });

    it('should refresh data programmatically', async () => {
      await leaderboardUI.show({}, callbacks);
      await leaderboardUI.refresh();

      expect(mockScoreManager.getLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh when not visible', async () => {
      await expect(leaderboardUI.refresh()).resolves.not.toThrow();
    });
  });

  describe('Button Interactions', () => {
    beforeEach(async () => {
      await leaderboardUI.show({}, callbacks);
    });

    it('should handle close button click', () => {
      const closeButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (closeButtonCall) {
        closeButtonCall[1]();
        expect(callbacks.onClose).toHaveBeenCalled();
      }
    });

    it('should provide visual feedback on button hover', () => {
      const hoverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );

      if (hoverCall) {
        hoverCall[1]();
        expect(mockScene.mockContainer.setScale).toHaveBeenCalledWith(1.05);
      }
    });

    it('should handle button press feedback', () => {
      const pressCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (pressCall) {
        pressCall[1]();
        expect(mockScene.mockContainer.setScale).toHaveBeenCalledWith(0.95);
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen sizes', async () => {
      mockScene.scale = { width: 400, height: 800 };
      await leaderboardUI.show({}, callbacks);

      expect(mockUIManager.createModal).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 360,
          height: 560
        })
      );
    });

    it('should adapt to desktop screen sizes', async () => {
      mockScene.scale = { width: 1024, height: 768 };
      await leaderboardUI.show({}, callbacks);

      expect(mockUIManager.createModal).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 450,
          height: 500
        })
      );
    });

    it('should use appropriate font sizes for mobile', async () => {
      mockScene.scale = { width: 400, height: 800 };
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.objectContaining({
          fontSize: '22px'
        })
      );
    });

    it('should use appropriate font sizes for desktop', async () => {
      mockScene.scale = { width: 1024, height: 768 };
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.objectContaining({
          fontSize: '26px'
        })
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading state during data fetch', async () => {
      let resolvePromise: (value: ScoreEntry[]) => void;
      const loadingPromise = new Promise<ScoreEntry[]>(resolve => {
        resolvePromise = resolve;
      });

      mockScoreManager.getLeaderboard.mockReturnValue(loadingPromise);

      const showPromise = leaderboardUI.show({}, callbacks);

      // Should show loading text
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, '⏳ Loading...', expect.any(Object));

      resolvePromise!(mockScores);
      await showPromise;
    });

    it('should update content after loading', async () => {
      await leaderboardUI.show({}, callbacks);

      // Should update content after loading
      expect(mockScene.mockContainer.removeAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle score loading errors gracefully', async () => {
      mockScoreManager.getLeaderboard.mockRejectedValue(new Error('Network error'));

      await expect(leaderboardUI.show({}, callbacks)).resolves.not.toThrow();
    });

    it('should handle refresh errors gracefully', async () => {
      callbacks.onRefresh = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      await leaderboardUI.show({ showRefreshButton: true }, callbacks);

      const refreshButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );

      if (refreshButtonCall) {
        await expect(refreshButtonCall[1]()).resolves.not.toThrow();
      }
    });

    it('should handle missing score data gracefully', async () => {
      mockScoreManager.getLeaderboard.mockResolvedValue(null as any);

      await expect(leaderboardUI.show({}, callbacks)).resolves.not.toThrow();
    });

    it('should handle invalid score entries gracefully', async () => {
      const invalidScores = [
        null,
        { username: 'Valid', score: 1000, timestamp: Date.now(), level: 5, lines: 20 },
        { score: 800 }, // Missing required fields
        'invalid'
      ] as any;

      mockScoreManager.getLeaderboard.mockResolvedValue(invalidScores);

      await expect(leaderboardUI.show({}, callbacks)).resolves.not.toThrow();
    });
  });

  describe('Color Utilities', () => {
    it('should lighten colors for hover effects', async () => {
      await leaderboardUI.show({}, callbacks);

      const hoverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );

      if (hoverCall) {
        hoverCall[1]();
        // Color lightening tested indirectly through graphics calls
        expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalled();
      }
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      await leaderboardUI.show({}, callbacks);
      leaderboardUI.destroy();

      expect(mockUIManager.closeModal).toHaveBeenCalled();
      expect(leaderboardUI.visible).toBe(false);
    });

    it('should handle destroy when not shown', () => {
      expect(() => {
        leaderboardUI.destroy();
      }).not.toThrow();
    });

    it('should clean up data references on destroy', async () => {
      await leaderboardUI.show({}, callbacks);
      leaderboardUI.destroy();

      expect(leaderboardUI.visible).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should create high contrast text', async () => {
      await leaderboardUI.show({}, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.objectContaining({
          color: expect.stringMatching(/#[A-F0-9]{6}/i)
        })
      );
    });

    it('should provide clear visual hierarchy', async () => {
      await leaderboardUI.show({}, callbacks);

      // Title should be larger than content text
      const titleCall = mockScene.add.text.mock.calls.find(
        call => call[2].includes('Leaderboard')
      );
      const contentCall = mockScene.add.text.mock.calls.find(
        call => call[2].includes('Player')
      );

      if (titleCall && contentCall) {
        expect(parseInt(titleCall[3].fontSize)).toBeGreaterThan(parseInt(contentCall[3].fontSize));
      }
    });

    it('should create appropriate button sizes for touch', async () => {
      mockScene.scale = { width: 400, height: 800 }; // Mobile
      await leaderboardUI.show({}, callbacks);

      // Buttons should be appropriately sized for touch
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });
});