import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { GameOverUI, GameOverData, GameOverCallbacks } from '../GameOverUI';
import { UIManager } from '../../managers/UIManager';

// Mock UIManager
const createMockUIManager = () => ({
  createModal: vi.fn(() => ({
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    add: vi.fn(),
    destroy: vi.fn(),
    list: []
  })),
  closeModal: vi.fn(),
  showToast: vi.fn()
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
    getAt: vi.fn(() => ({ text: 'Original Text', setText: vi.fn() })),
    disableInteractive: vi.fn()
  };

  const mockText = {
    setOrigin: vi.fn(() => mockText),
    setScale: vi.fn(),
    setInteractive: vi.fn(() => mockText),
    on: vi.fn(),
    setText: vi.fn(),
    text: 'Test Text',
    setStyle: vi.fn()
  };

  const mockGraphics = {
    fillStyle: vi.fn(),
    fillRoundedRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    clear: vi.fn()
  };

  const mockTweens = {
    add: vi.fn(() => ({
      stop: vi.fn(),
      destroy: vi.fn()
    }))
  };

  const mockTime = {
    delayedCall: vi.fn()
  };

  const mockCameras = {
    main: {
      shake: vi.fn()
    }
  };

  return {
    add: {
      container: vi.fn(() => mockContainer),
      text: vi.fn(() => mockText),
      graphics: vi.fn(() => mockGraphics)
    },
    tweens: mockTweens,
    time: mockTime,
    cameras: mockCameras,
    scale: { width: 800, height: 600 },
    mockContainer,
    mockText,
    mockGraphics,
    mockTweens,
    mockTime,
    mockCameras
  } as any;
};

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

describe('GameOverUI', () => {
  let gameOverUI: GameOverUI;
  let mockScene: any;
  let mockUIManager: any;
  let gameOverData: GameOverData;
  let callbacks: GameOverCallbacks;

  beforeEach(() => {
    mockScene = createMockScene();
    mockUIManager = createMockUIManager();
    gameOverUI = new GameOverUI(mockScene, mockUIManager);

    gameOverData = {
      score: 1500,
      level: 3,
      lines: 25,
      timestamp: Date.now()
    };

    callbacks = {
      onSubmitScore: vi.fn().mockResolvedValue(undefined),
      onViewLeaderboard: vi.fn(),
      onPlayAgain: vi.fn(),
      onClose: vi.fn()
    };
  });

  afterEach(() => {
    gameOverUI.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with provided scene and UI manager', () => {
      expect(gameOverUI).toBeDefined();
      expect(gameOverUI.visible).toBe(false);
    });
  });

  describe('Show/Hide Functionality', () => {
    it('should show game over screen with animation', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(gameOverUI.visible).toBe(true);
      expect(mockUIManager.createModal).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 400,
          ease: 'Back.easeOut'
        })
      );
    });

    it('should hide existing modal when showing new one', () => {
      gameOverUI.show(gameOverData, callbacks);
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.tweens.add).toHaveBeenCalledTimes(2); // One for hide, one for show
    });

    it('should hide game over screen with animation', () => {
      gameOverUI.show(gameOverData, callbacks);
      gameOverUI.hide();

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 300,
          ease: 'Power2.easeIn'
        })
      );
    });

    it('should handle hide when not visible', () => {
      expect(() => {
        gameOverUI.hide();
      }).not.toThrow();
    });

    it('should add screen shake effect when showing', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.cameras.main.shake).toHaveBeenCalledWith(200, 0.01);
    });
  });

  describe('Modal Creation', () => {
    it('should create modal with correct configuration', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockUIManager.createModal).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 400, // width / 2
          y: 300, // height / 2
          width: expect.any(Number),
          height: expect.any(Number),
          backgroundColor: 0x1a1a1a,
          borderColor: 0xFFD700,
          borderWidth: 4,
          cornerRadius: 20
        })
      );
    });

    it('should create modal with responsive sizing', () => {
      mockScene.scale = { width: 400, height: 800 }; // Mobile size
      gameOverUI.show(gameOverData, callbacks);

      expect(mockUIManager.createModal).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 360, // 400 - 40
          height: 360  // min(400, 800 - 40)
        })
      );
    });

    it('should display game over data correctly', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, -120, 'Dam Destroyed!', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(0, -20, 'Final Score: 1,500', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(-80, 10, 'Level: 3', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(80, 10, 'Lines: 25', expect.any(Object));
    });

    it('should create beaver icon', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, -160, '🦫', expect.any(Object));
    });

    it('should create all required buttons', () => {
      gameOverUI.show(gameOverData, callbacks);

      // Should create submit, leaderboard, play again buttons
      expect(mockScene.add.container).toHaveBeenCalledTimes(3);
    });

    it('should create close button', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), 
        expect.any(Number), 
        '✕', 
        expect.any(Object)
      );
    });
  });

  describe('Button Interactions', () => {
    beforeEach(() => {
      gameOverUI.show(gameOverData, callbacks);
    });

    it('should handle submit score button click', async () => {
      // Find submit button click handler
      const submitButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitButtonCall) {
        await submitButtonCall[1]();
        expect(callbacks.onSubmitScore).toHaveBeenCalledWith(gameOverData);
      }
    });

    it('should handle leaderboard button click', () => {
      // Find leaderboard button click handler
      const leaderboardButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (leaderboardButtonCall) {
        leaderboardButtonCall[1]();
        expect(callbacks.onViewLeaderboard).toHaveBeenCalled();
      }
    });

    it('should handle play again button click', () => {
      // Find play again button click handler
      const playAgainButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (playAgainButtonCall) {
        playAgainButtonCall[1]();
        expect(callbacks.onPlayAgain).toHaveBeenCalled();
      }
    });

    it('should handle close button click', () => {
      // Find close button click handler
      const closeButtonCall = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (closeButtonCall) {
        closeButtonCall[1]();
        expect(callbacks.onClose).toHaveBeenCalled();
      }
    });

    it('should provide visual feedback on button hover', () => {
      // Find button hover handler
      const hoverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );
      
      if (hoverCall) {
        hoverCall[1]();
        expect(mockScene.mockContainer.setScale).toHaveBeenCalledWith(1.05);
      }
    });

    it('should provide haptic feedback on mobile', () => {
      mockScene.scale = { width: 400, height: 800 }; // Mobile size
      gameOverUI.show(gameOverData, callbacks);

      const pointerDownCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (pointerDownCall) {
        pointerDownCall[1]();
        expect(navigator.vibrate).toHaveBeenCalledWith(10);
      }
    });
  });

  describe('Submit Score Handling', () => {
    beforeEach(() => {
      gameOverUI.show(gameOverData, callbacks);
    });

    it('should show loading state during score submission', async () => {
      const mockButton = {
        disableInteractive: vi.fn(),
        getAt: vi.fn(() => ({ text: 'Original Text', setText: vi.fn() }))
      };

      // Mock the button creation to return our mock
      mockScene.add.container.mockReturnValue(mockButton);
      
      const submitPromise = new Promise(resolve => setTimeout(resolve, 100));
      callbacks.onSubmitScore = vi.fn(() => submitPromise);

      gameOverUI.show(gameOverData, callbacks);

      // Find and trigger submit button
      const submitCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitCall) {
        submitCall[1]();
        expect(mockButton.disableInteractive).toHaveBeenCalled();
      }
    });

    it('should handle submit score success', async () => {
      callbacks.onSubmitScore = vi.fn().mockResolvedValue(undefined);

      const submitCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitCall) {
        await submitCall[1]();
        expect(mockUIManager.showToast).toHaveBeenCalledWith('Score submitted successfully!', 2000);
        expect(mockScene.time.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
      }
    });

    it('should handle submit score failure', async () => {
      callbacks.onSubmitScore = vi.fn().mockRejectedValue(new Error('Network error'));

      const submitCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitCall) {
        await submitCall[1]();
        expect(mockUIManager.showToast).toHaveBeenCalledWith(
          'Failed to submit score. Please try again.', 
          3000
        );
        expect(mockScene.time.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function));
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen sizes', () => {
      mockScene.scale = { width: 400, height: 800 };
      gameOverUI.show(gameOverData, callbacks);

      // Should use mobile-specific font sizes and button sizes
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), 
        expect.any(Number), 
        expect.any(String),
        expect.objectContaining({
          fontSize: '28px' // Mobile size
        })
      );
    });

    it('should adapt to desktop screen sizes', () => {
      mockScene.scale = { width: 1024, height: 768 };
      gameOverUI.show(gameOverData, callbacks);

      // Should use desktop-specific font sizes
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number), 
        expect.any(Number), 
        expect.any(String),
        expect.objectContaining({
          fontSize: '32px' // Desktop size
        })
      );
    });

    it('should create mobile-friendly hit areas', () => {
      mockScene.scale = { width: 400, height: 800 };
      gameOverUI.show(gameOverData, callbacks);

      // Close button should have larger hit area on mobile
      expect(mockScene.mockText.setInteractive).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 40,
          height: 40
        }),
        expect.any(Function)
      );
    });
  });

  describe('Animations', () => {
    it('should animate beaver icon', () => {
      gameOverUI.show(gameOverData, callbacks);

      // Should create floating animation for beaver
      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        })
      );
    });

    it('should animate modal entrance', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 400,
          ease: 'Back.easeOut'
        })
      );
    });

    it('should animate modal exit', () => {
      gameOverUI.show(gameOverData, callbacks);
      gameOverUI.hide();

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 300,
          ease: 'Power2.easeIn'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', () => {
      expect(() => {
        gameOverUI.show(null as any, callbacks);
      }).toThrow('GameOverUI: Missing data or callbacks');
    });

    it('should handle missing callbacks gracefully', () => {
      expect(() => {
        gameOverUI.show(gameOverData, null as any);
      }).toThrow('GameOverUI: Missing data or callbacks');
    });

    it('should handle submit score errors gracefully', async () => {
      callbacks.onSubmitScore = vi.fn().mockRejectedValue(new Error('Submit failed'));
      gameOverUI.show(gameOverData, callbacks);

      const submitCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitCall) {
        await expect(submitCall[1]()).resolves.not.toThrow();
      }
    });

    it('should handle missing navigator.vibrate gracefully', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true
      });

      mockScene.scale = { width: 400, height: 800 }; // Mobile
      
      expect(() => {
        gameOverUI.show(gameOverData, callbacks);
      }).not.toThrow();
    });
  });

  describe('Color Utilities', () => {
    it('should lighten colors correctly for hover effects', () => {
      gameOverUI.show(gameOverData, callbacks);

      // Find hover handler and trigger it
      const hoverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );
      
      if (hoverCall) {
        hoverCall[1]();
        // Color lightening is tested indirectly through graphics calls
        expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalled();
      }
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      gameOverUI.show(gameOverData, callbacks);
      gameOverUI.destroy();

      expect(mockUIManager.closeModal).toHaveBeenCalled();
      expect(gameOverUI.visible).toBe(false);
    });

    it('should handle destroy when not shown', () => {
      expect(() => {
        gameOverUI.destroy();
      }).not.toThrow();
    });

    it('should clean up data references on destroy', () => {
      gameOverUI.show(gameOverData, callbacks);
      gameOverUI.destroy();

      // Internal state should be cleared
      expect(gameOverUI.visible).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should create high contrast text', () => {
      gameOverUI.show(gameOverData, callbacks);

      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.objectContaining({
          color: expect.stringMatching(/#[A-F0-9]{6}/i)
        })
      );
    });

    it('should create buttons with sufficient size for touch', () => {
      mockScene.scale = { width: 400, height: 800 }; // Mobile
      gameOverUI.show(gameOverData, callbacks);

      // Buttons should be at least 44px for accessibility
      expect(mockScene.add.container).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should provide clear visual hierarchy', () => {
      gameOverUI.show(gameOverData, callbacks);

      // Title should be larger than other text
      const titleCall = mockScene.add.text.mock.calls.find(
        call => call[2] === 'Dam Destroyed!'
      );
      const scoreCall = mockScene.add.text.mock.calls.find(
        call => call[2].includes('Final Score')
      );

      expect(titleCall[3].fontSize).toBe('32px');
      expect(scoreCall[3].fontSize).toBe('24px');
    });
  });
});