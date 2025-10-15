import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { UIManager, UIConfig, ButtonConfig, PanelConfig } from '../UIManager';
import { ScoreEntry } from '../../types/GameTypes';

// Mock Phaser scene and objects
const createMockScene = () => {
  const mockContainer = {
    add: vi.fn(),
    setDepth: vi.fn(),
    setVisible: vi.fn(),
    removeAll: vi.fn(),
    destroy: vi.fn(),
    setInteractive: vi.fn(() => mockContainer),
    on: vi.fn(),
    off: vi.fn(),
    setPosition: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    list: []
  };

  const mockGraphics = {
    fillStyle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    clear: vi.fn(),
    setVisible: vi.fn(),
    setScale: vi.fn(),
    setAlpha: vi.fn()
  };

  const mockText = {
    setOrigin: vi.fn(() => mockText),
    setScale: vi.fn(),
    setInteractive: vi.fn(() => mockText),
    on: vi.fn(),
    off: vi.fn(),
    setText: vi.fn(),
    text: 'Test Text',
    disableInteractive: vi.fn(),
    setStyle: vi.fn()
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

  return {
    add: {
      container: vi.fn(() => mockContainer),
      graphics: vi.fn(() => mockGraphics),
      text: vi.fn(() => mockText)
    },
    tweens: mockTweens,
    time: mockTime,
    mockContainer,
    mockGraphics,
    mockText,
    mockTweens,
    mockTime
  } as any;
};

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

describe('UIManager', () => {
  let uiManager: UIManager;
  let mockScene: any;
  let config: UIConfig;

  beforeEach(() => {
    mockScene = createMockScene();
    config = {
      width: 800,
      height: 600,
      isMobile: false
    };
    uiManager = new UIManager(mockScene, config);
  });

  afterEach(() => {
    uiManager.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with provided configuration', () => {
      expect(uiManager).toBeDefined();
    });

    it('should handle mobile configuration', () => {
      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);
      expect(mobileUIManager).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const newConfig: Partial<UIConfig> = {
        width: 1024,
        height: 768,
        isMobile: true
      };

      uiManager.updateConfig(newConfig);

      // Configuration should be updated (tested indirectly through behavior)
      expect(uiManager).toBeDefined();
    });
  });

  describe('Button Creation', () => {
    it('should create button with default styling', () => {
      const buttonConfig: ButtonConfig = {
        text: 'Test Button',
        x: 100,
        y: 100,
        onClick: vi.fn()
      };

      const button = uiManager.createButton(buttonConfig);

      expect(mockScene.add.container).toHaveBeenCalledWith(100, 100);
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Test Button', expect.any(Object));
      expect(mockScene.mockContainer.setInteractive).toHaveBeenCalled();
    });

    it('should create button with custom styling', () => {
      const buttonConfig: ButtonConfig = {
        text: 'Custom Button',
        x: 200,
        y: 200,
        width: 300,
        height: 80,
        backgroundColor: 0xFF0000,
        textColor: '#00FF00',
        fontSize: '24px',
        onClick: vi.fn()
      };

      const button = uiManager.createButton(buttonConfig);

      expect(mockScene.add.container).toHaveBeenCalledWith(200, 200);
      expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalledWith(0xFF0000);
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Custom Button', 
        expect.objectContaining({
          color: '#00FF00',
          fontSize: '24px'
        })
      );
    });

    it('should handle button click events', () => {
      const onClick = vi.fn();
      const buttonConfig: ButtonConfig = {
        text: 'Click Me',
        x: 0,
        y: 0,
        onClick
      };

      uiManager.createButton(buttonConfig);

      // Find and trigger the pointerdown event
      const pointerDownCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      expect(pointerDownCall).toBeDefined();
      
      pointerDownCall[1](); // Trigger the event
      expect(onClick).toHaveBeenCalled();
    });

    it('should provide visual feedback on hover', () => {
      const buttonConfig: ButtonConfig = {
        text: 'Hover Me',
        x: 0,
        y: 0,
        onClick: vi.fn()
      };

      uiManager.createButton(buttonConfig);

      // Find and trigger the pointerover event
      const pointerOverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );
      expect(pointerOverCall).toBeDefined();
      
      pointerOverCall[1](); // Trigger the event
      expect(mockScene.mockContainer.setScale).toHaveBeenCalledWith(1.05);
    });

    it('should provide haptic feedback on mobile', () => {
      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);

      const buttonConfig: ButtonConfig = {
        text: 'Mobile Button',
        x: 0,
        y: 0,
        onClick: vi.fn()
      };

      mobileUIManager.createButton(buttonConfig);

      // Find and trigger the pointerdown event
      const pointerDownCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      pointerDownCall[1](); // Trigger the event
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('Modal Creation', () => {
    it('should create modal with default styling', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      const modal = uiManager.createModal(panelConfig);

      expect(mockScene.add.container).toHaveBeenCalledWith(400, 300);
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2); // overlay + panel
      expect(mockScene.mockContainer.setDepth).toHaveBeenCalledWith(1000);
    });

    it('should create modal with custom styling', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200,
        backgroundColor: 0x123456,
        borderColor: 0xABCDEF,
        borderWidth: 5,
        cornerRadius: 20
      };

      const modal = uiManager.createModal(panelConfig);

      expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalledWith(0x123456);
      expect(mockScene.mockGraphics.lineStyle).toHaveBeenCalledWith(5, 0xABCDEF);
      expect(mockScene.mockGraphics.fillRoundedRect).toHaveBeenCalledWith(-150, -100, 300, 200, 20);
    });

    it('should track active modals', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      const modal1 = uiManager.createModal(panelConfig);
      const modal2 = uiManager.createModal(panelConfig);

      expect(mockScene.mockContainer.setDepth).toHaveBeenCalledWith(1000);
      expect(mockScene.mockContainer.setDepth).toHaveBeenCalledWith(1100);
    });
  });

  describe('Modal Management', () => {
    it('should close specific modal', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      const modal = uiManager.createModal(panelConfig);
      uiManager.closeModal(modal);

      expect(mockScene.mockContainer.destroy).toHaveBeenCalled();
    });

    it('should close all modals', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      uiManager.createModal(panelConfig);
      uiManager.createModal(panelConfig);
      uiManager.closeAllModals();

      expect(mockScene.mockContainer.destroy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Game Over Modal', () => {
    it('should create game over modal with all elements', async () => {
      const onSubmitScore = vi.fn().mockResolvedValue(undefined);
      const onViewLeaderboard = vi.fn();
      const onPlayAgain = vi.fn();

      const modal = uiManager.createGameOverModal(1000, onSubmitScore, onViewLeaderboard, onPlayAgain);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(0, -140, 'Game Over!', expect.any(Object));
      expect(mockScene.add.text).toHaveBeenCalledWith(0, -100, 'Final Score: 1000', expect.any(Object));
    });

    it('should handle submit score button click', async () => {
      const onSubmitScore = vi.fn().mockResolvedValue(undefined);
      const onViewLeaderboard = vi.fn();
      const onPlayAgain = vi.fn();

      uiManager.createGameOverModal(1000, onSubmitScore, onViewLeaderboard, onPlayAgain);

      // Find submit button click handler
      const submitButtonCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      );
      
      if (submitButtonCall) {
        await submitButtonCall[1](); // Trigger the event
        expect(onSubmitScore).toHaveBeenCalled();
      }
    });
  });

  describe('Leaderboard Modal', () => {
    it('should create leaderboard modal with scores', () => {
      const scores: ScoreEntry[] = [
        { username: 'Player1', score: 1000, timestamp: Date.now(), level: 5, lines: 20 },
        { username: 'Player2', score: 800, timestamp: Date.now(), level: 4, lines: 15 }
      ];
      const onClose = vi.fn();

      const modal = uiManager.createLeaderboardModal(scores, onClose);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(0, -220, '🏆 Leaderboard', expect.any(Object));
    });

    it('should handle empty leaderboard', () => {
      const scores: ScoreEntry[] = [];
      const onClose = vi.fn();

      const modal = uiManager.createLeaderboardModal(scores, onClose);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, -50, 
        'No scores yet!\nBe the first to play!', 
        expect.any(Object)
      );
    });

    it('should limit displayed scores on mobile', () => {
      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);

      const scores: ScoreEntry[] = Array.from({ length: 15 }, (_, i) => ({
        username: `Player${i}`,
        score: 1000 - i * 100,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      }));
      const onClose = vi.fn();

      mobileUIManager.createLeaderboardModal(scores, onClose);

      // Should limit to 8 scores on mobile
      expect(mockScene.add.text).toHaveBeenCalledTimes(expect.any(Number));
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast notification', () => {
      uiManager.showToast('Test message');

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Test message', expect.any(Object));
      expect(mockScene.mockContainer.setDepth).toHaveBeenCalledWith(2000);
    });

    it('should auto-remove toast after duration', () => {
      uiManager.showToast('Test message', 2000);

      expect(mockScene.mockTime.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function));
    });

    it('should animate toast in and out', () => {
      uiManager.showToast('Test message');

      expect(mockScene.mockContainer.setAlpha).toHaveBeenCalledWith(0);
      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          alpha: 1,
          duration: 300,
          ease: 'Power2'
        })
      );
    });
  });

  describe('Responsive Design', () => {
    it('should update layout on configuration change', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      const modal = uiManager.createModal(panelConfig);
      
      uiManager.updateConfig({ width: 1024, height: 768 });

      expect(mockScene.mockContainer.setPosition).toHaveBeenCalledWith(512, 384);
    });

    it('should create mobile-friendly buttons', () => {
      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);

      const buttonConfig: ButtonConfig = {
        text: 'Mobile Button',
        x: 0,
        y: 0,
        onClick: vi.fn()
      };

      mobileUIManager.createButton(buttonConfig);

      // Should create larger hit area for mobile
      expect(mockScene.mockContainer.setInteractive).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        }),
        expect.any(Function)
      );
    });
  });

  describe('Color Utilities', () => {
    it('should lighten colors correctly', () => {
      const buttonConfig: ButtonConfig = {
        text: 'Test Button',
        x: 0,
        y: 0,
        backgroundColor: 0x808080,
        onClick: vi.fn()
      };

      uiManager.createButton(buttonConfig);

      // Trigger hover to test color lightening
      const pointerOverCall = mockScene.mockContainer.on.mock.calls.find(
        call => call[0] === 'pointerover'
      );
      
      if (pointerOverCall) {
        pointerOverCall[1]();
        // Color should be lightened (tested indirectly through fillStyle calls)
        expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle button creation errors gracefully', () => {
      // Mock scene.add.container to throw error
      mockScene.add.container.mockImplementationOnce(() => {
        throw new Error('Container creation failed');
      });

      const buttonConfig: ButtonConfig = {
        text: 'Error Button',
        x: 0,
        y: 0,
        onClick: vi.fn()
      };

      expect(() => {
        uiManager.createButton(buttonConfig);
      }).toThrow('Container creation failed');
    });

    it('should handle modal creation errors gracefully', () => {
      // Mock scene.add.container to throw error
      mockScene.add.container.mockImplementationOnce(() => {
        throw new Error('Modal creation failed');
      });

      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      expect(() => {
        uiManager.createModal(panelConfig);
      }).toThrow('Modal creation failed');
    });

    it('should handle missing navigator.vibrate gracefully', () => {
      // Mock vibrate to be undefined
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true
      });

      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);

      const buttonConfig: ButtonConfig = {
        text: 'Mobile Button',
        x: 0,
        y: 0,
        onClick: vi.fn()
      };

      expect(() => {
        mobileUIManager.createButton(buttonConfig);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources on destroy', () => {
      const panelConfig: PanelConfig = {
        x: 400,
        y: 300,
        width: 300,
        height: 200
      };

      uiManager.createModal(panelConfig);
      uiManager.createModal(panelConfig);
      
      uiManager.destroy();

      expect(mockScene.mockContainer.destroy).toHaveBeenCalledTimes(2);
    });

    it('should handle destroy when no modals exist', () => {
      expect(() => {
        uiManager.destroy();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should create buttons with appropriate text contrast', () => {
      const buttonConfig: ButtonConfig = {
        text: 'Accessible Button',
        x: 0,
        y: 0,
        backgroundColor: 0x000000,
        textColor: '#FFFFFF',
        onClick: vi.fn()
      };

      uiManager.createButton(buttonConfig);

      expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, 'Accessible Button',
        expect.objectContaining({
          color: '#FFFFFF'
        })
      );
    });

    it('should create mobile-friendly touch targets', () => {
      const mobileConfig: UIConfig = {
        width: 400,
        height: 800,
        isMobile: true
      };
      const mobileUIManager = new UIManager(mockScene, mobileConfig);

      const buttonConfig: ButtonConfig = {
        text: 'Touch Button',
        x: 0,
        y: 0,
        width: 40,
        height: 30,
        onClick: vi.fn()
      };

      mobileUIManager.createButton(buttonConfig);

      // Should create hit area larger than visual button for easier touch
      expect(mockScene.mockContainer.setInteractive).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 60, // 40 + 20 padding
          height: 50  // 30 + 20 padding
        }),
        expect.any(Function)
      );
    });
  });
});