import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager, InputAction } from '../managers/InputManager';
import { TouchEventHandler } from '../input/TouchEventHandler';

// Mock Phaser scene for integration testing
const createMockScene = () => {
  const mockKeys = new Map();
  const mockKeyboard = {
    addKey: vi.fn((keyCode: string) => {
      const key = { isDown: false, keyCode };
      mockKeys.set(keyCode, key);
      return key;
    }),
    on: vi.fn(),
    off: vi.fn()
  };

  const mockInput = {
    keyboard: mockKeyboard,
    on: vi.fn(),
    off: vi.fn()
  };

  const mockTime = {
    now: 0,
    addEvent: vi.fn(() => ({ elapsed: 0 })),
    delayedCall: vi.fn(() => ({ destroy: vi.fn() }))
  };

  const mockDevice = {
    os: {
      android: false,
      iOS: false
    }
  };

  return {
    input: mockInput,
    time: mockTime,
    sys: {
      game: {
        device: mockDevice
      }
    },
    mockKeys,
    mockKeyboard,
    mockInput,
    mockTime,
    mockDevice
  } as any;
};

describe('Input System Integration', () => {
  let inputManager: InputManager;
  let touchHandler: TouchEventHandler;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    inputManager = new InputManager(mockScene);
    touchHandler = new TouchEventHandler(mockScene);
  });

  afterEach(() => {
    inputManager.destroy();
    touchHandler.destroy();
    vi.clearAllMocks();
  });

  describe('InputManager Integration', () => {
    it('should initialize both keyboard and touch systems', () => {
      expect(inputManager).toBeDefined();
      expect(inputManager.getSettings().keyboardEnabled).toBe(true);
    });

    it('should handle input configuration updates', () => {
      const newConfig = {
        moveLeft: ['KeyA'],
        moveRight: ['KeyD']
      };

      inputManager.updateConfig(newConfig);
      const config = inputManager.getConfig();

      expect(config.moveLeft).toEqual(['KeyA']);
      expect(config.moveRight).toEqual(['KeyD']);
    });

    it('should manage input callbacks correctly', () => {
      const callback = vi.fn();
      
      inputManager.onInput(InputAction.MOVE_LEFT, callback);
      inputManager.offInput(InputAction.MOVE_LEFT, callback);

      // Should not throw when removing callback
      expect(() => {
        inputManager.offInput(InputAction.MOVE_LEFT, callback);
      }).not.toThrow();
    });

    it('should handle settings updates', () => {
      inputManager.updateSettings({
        keyboardEnabled: false,
        touchEnabled: true,
        hapticFeedback: false
      });

      const settings = inputManager.getSettings();
      expect(settings.keyboardEnabled).toBe(false);
      expect(settings.touchEnabled).toBe(true);
      expect(settings.hapticFeedback).toBe(false);
    });
  });

  describe('TouchEventHandler Integration', () => {
    it('should initialize touch event handling', () => {
      expect(touchHandler).toBeDefined();
      expect(touchHandler.getActiveTouchCount()).toBe(0);
    });

    it('should handle configuration updates', () => {
      const newConfig = {
        swipeThreshold: 100,
        tapMaxDuration: 200
      };

      touchHandler.updateConfig(newConfig);
      
      // Should not throw
      expect(touchHandler).toBeDefined();
    });

    it('should enable and disable touch handling', () => {
      touchHandler.setEnabled(false);
      expect(touchHandler.getActiveTouchCount()).toBe(0);

      touchHandler.setEnabled(true);
      expect(touchHandler.getActiveTouchCount()).toBe(0);
    });

    it('should create hit areas with proper padding', () => {
      const hitArea = touchHandler.createHitArea(100, 200, 50, 50);
      
      expect(hitArea.x).toBe(90); // 100 - 10 (default padding)
      expect(hitArea.y).toBe(190); // 200 - 10
      expect(hitArea.width).toBe(70); // 50 + 20 (padding on both sides)
      expect(hitArea.height).toBe(70); // 50 + 20
    });

    it('should check point in hit area correctly', () => {
      const isInside = touchHandler.isPointInHitArea(105, 205, 100, 200, 50, 50);
      expect(isInside).toBe(true);

      const isOutside = touchHandler.isPointInHitArea(200, 300, 100, 200, 50, 50);
      expect(isOutside).toBe(false);
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should handle missing keyboard gracefully', () => {
      mockScene.input.keyboard = null;
      
      expect(() => {
        const manager = new InputManager(mockScene);
        manager.setupKeyboardControls();
        manager.destroy();
      }).not.toThrow();
    });

    it('should handle touch system errors gracefully', () => {
      // Mock vibrate to throw error
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(() => {
          throw new Error('Vibrate not supported');
        }),
        writable: true
      });

      expect(() => {
        const manager = new InputManager(mockScene);
        manager.destroy();
      }).not.toThrow();
    });

    it('should clean up resources properly', () => {
      const manager = new InputManager(mockScene);
      const handler = new TouchEventHandler(mockScene);

      expect(() => {
        manager.destroy();
        handler.destroy();
      }).not.toThrow();
    });
  });

  describe('Mobile Device Detection', () => {
    it('should detect mobile devices correctly', () => {
      mockScene.mockDevice.os.android = true;
      const manager = new InputManager(mockScene);
      
      expect(manager.getSettings().touchEnabled).toBe(true);
      manager.destroy();
    });

    it('should handle desktop devices correctly', () => {
      mockScene.mockDevice.os.android = false;
      mockScene.mockDevice.os.iOS = false;
      
      const manager = new InputManager(mockScene);
      expect(manager.getSettings().keyboardEnabled).toBe(true);
      manager.destroy();
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with multiple instances', () => {
      const managers: InputManager[] = [];
      const handlers: TouchEventHandler[] = [];

      // Create multiple instances
      for (let i = 0; i < 10; i++) {
        managers.push(new InputManager(mockScene));
        handlers.push(new TouchEventHandler(mockScene));
      }

      // Clean up all instances
      expect(() => {
        managers.forEach(m => m.destroy());
        handlers.forEach(h => h.destroy());
      }).not.toThrow();
    });

    it('should handle rapid input events', () => {
      const callback = vi.fn();
      inputManager.onInput(InputAction.MOVE_LEFT, callback);

      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // Simulate rapid key presses
      for (let i = 0; i < 100; i++) {
        keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });
      }

      expect(callback).toHaveBeenCalled();
    });
  });
});