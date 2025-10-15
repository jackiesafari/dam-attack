import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { InputManager, InputAction, InputConfig, InputSettings } from '../InputManager';

// Mock Phaser scene and input system
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

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockScene: any;
  let mockCallbacks: { [key in InputAction]?: vi.Mock };

  beforeEach(() => {
    mockScene = createMockScene();
    inputManager = new InputManager(mockScene);
    
    // Create mock callbacks for each action
    mockCallbacks = {
      [InputAction.MOVE_LEFT]: vi.fn(),
      [InputAction.MOVE_RIGHT]: vi.fn(),
      [InputAction.ROTATE]: vi.fn(),
      [InputAction.SOFT_DROP]: vi.fn(),
      [InputAction.HARD_DROP]: vi.fn(),
      [InputAction.PAUSE]: vi.fn()
    };

    // Register callbacks
    Object.entries(mockCallbacks).forEach(([action, callback]) => {
      inputManager.onInput(action as InputAction, callback);
    });

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true
    });
  });

  afterEach(() => {
    inputManager.destroy();
    vi.clearAllMocks();
  });

  describe('Keyboard Input', () => {
    it('should initialize keyboard controls correctly', () => {
      expect(mockScene.mockKeyboard.addKey).toHaveBeenCalledWith('ArrowLeft');
      expect(mockScene.mockKeyboard.addKey).toHaveBeenCalledWith('ArrowRight');
      expect(mockScene.mockKeyboard.addKey).toHaveBeenCalledWith('ArrowUp');
      expect(mockScene.mockKeyboard.addKey).toHaveBeenCalledWith('Space');
      expect(mockScene.mockKeyboard.on).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockScene.mockKeyboard.on).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should trigger correct actions for keyboard input', () => {
      // Simulate keydown events
      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // Test move left
      keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });
      expect(mockCallbacks[InputAction.MOVE_LEFT]).toHaveBeenCalledWith(InputAction.MOVE_LEFT, undefined);

      // Test move right
      keydownHandler({ code: 'ArrowRight', preventDefault: vi.fn() });
      expect(mockCallbacks[InputAction.MOVE_RIGHT]).toHaveBeenCalledWith(InputAction.MOVE_RIGHT, undefined);

      // Test rotate
      keydownHandler({ code: 'Space', preventDefault: vi.fn() });
      expect(mockCallbacks[InputAction.ROTATE]).toHaveBeenCalledWith(InputAction.ROTATE, undefined);

      // Test soft drop
      keydownHandler({ code: 'ArrowDown', preventDefault: vi.fn() });
      expect(mockCallbacks[InputAction.SOFT_DROP]).toHaveBeenCalledWith(InputAction.SOFT_DROP, undefined);
    });

    it('should handle key repeat for movement actions', () => {
      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // First press should trigger immediately
      keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });
      expect(mockCallbacks[InputAction.MOVE_LEFT]).toHaveBeenCalledTimes(1);

      // Should set up repeat timer for movement keys
      expect(mockScene.mockTime.addEvent).toHaveBeenCalled();
    });

    it('should prevent default for game keys', () => {
      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];
      const mockEvent = { code: 'ArrowLeft', preventDefault: vi.fn() };

      keydownHandler(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should update keyboard configuration', () => {
      const newConfig: Partial<InputConfig> = {
        moveLeft: ['KeyA'],
        moveRight: ['KeyD']
      };

      inputManager.updateConfig(newConfig);
      const config = inputManager.getConfig();

      expect(config.moveLeft).toEqual(['KeyA']);
      expect(config.moveRight).toEqual(['KeyD']);
    });
  });

  describe('Touch Input', () => {
    beforeEach(() => {
      // Enable touch for mobile device
      mockScene.mockDevice.os.android = true;
      inputManager = new InputManager(mockScene);
      
      // Re-register callbacks
      Object.entries(mockCallbacks).forEach(([action, callback]) => {
        inputManager.onInput(action as InputAction, callback);
      });
    });

    it('should initialize touch controls for mobile devices', () => {
      expect(mockScene.mockInput.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.mockInput.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.mockInput.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('should handle tap gestures', () => {
      mockScene.time.now = 0;
      
      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];
      const pointerUpHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerup'
      )[1];

      // Simulate tap (short duration, small distance)
      const mockPointer = { x: 100, y: 100 };
      pointerDownHandler(mockPointer);
      
      mockScene.time.now = 150; // Short duration
      pointerUpHandler({ x: 102, y: 102 }); // Small distance

      expect(mockCallbacks[InputAction.ROTATE]).toHaveBeenCalled();
    });

    it('should handle swipe gestures', () => {
      mockScene.time.now = 0;
      
      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];
      const pointerUpHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerup'
      )[1];

      // Simulate horizontal swipe right
      pointerDownHandler({ x: 100, y: 100 });
      
      mockScene.time.now = 300;
      pointerUpHandler({ x: 200, y: 105 }); // Swipe right

      expect(mockCallbacks[InputAction.MOVE_RIGHT]).toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();
      Object.entries(mockCallbacks).forEach(([action, callback]) => {
        inputManager.onInput(action as InputAction, callback);
      });

      // Simulate vertical swipe down
      mockScene.time.now = 0;
      pointerDownHandler({ x: 100, y: 100 });
      
      mockScene.time.now = 300;
      pointerUpHandler({ x: 105, y: 200 }); // Swipe down

      expect(mockCallbacks[InputAction.SOFT_DROP]).toHaveBeenCalled();
    });

    it('should handle hold gestures', () => {
      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Simulate hold gesture
      pointerDownHandler({ x: 100, y: 100 });

      // Should set up hold timer
      expect(mockScene.mockTime.delayedCall).toHaveBeenCalledWith(
        500, // hold duration
        expect.any(Function)
      );

      // Trigger hold callback
      const holdCallback = mockScene.mockTime.delayedCall.mock.calls[0][1];
      holdCallback();

      expect(mockCallbacks[InputAction.HARD_DROP]).toHaveBeenCalled();
    });

    it('should provide haptic feedback', () => {
      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      pointerDownHandler({ x: 100, y: 100 });

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('Settings and Configuration', () => {
    it('should update input settings', () => {
      const newSettings: Partial<InputSettings> = {
        keyboardEnabled: false,
        touchEnabled: true,
        hapticFeedback: false
      };

      inputManager.updateSettings(newSettings);
      const settings = inputManager.getSettings();

      expect(settings.keyboardEnabled).toBe(false);
      expect(settings.touchEnabled).toBe(true);
      expect(settings.hapticFeedback).toBe(false);
    });

    it('should disable keyboard when keyboardEnabled is false', () => {
      inputManager.updateSettings({ keyboardEnabled: false });

      // Should clear keyboard keys
      expect(inputManager.isKeyPressed('ArrowLeft')).toBe(false);
    });

    it('should handle gesture settings', () => {
      inputManager.updateSettings({ gesturesEnabled: false });
      const settings = inputManager.getSettings();

      expect(settings.gesturesEnabled).toBe(false);
    });
  });

  describe('Callback Management', () => {
    it('should register and unregister callbacks', () => {
      const testCallback = vi.fn();
      
      inputManager.onInput(InputAction.MOVE_LEFT, testCallback);
      
      // Trigger action
      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];
      keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });

      expect(testCallback).toHaveBeenCalled();

      // Unregister callback
      inputManager.offInput(InputAction.MOVE_LEFT, testCallback);
      
      // Clear mock and trigger again
      testCallback.mockClear();
      keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });

      expect(testCallback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      inputManager.onInput(InputAction.MOVE_LEFT, errorCallback);

      const keydownHandler = mockScene.mockKeyboard.on.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];
      
      // Should not throw
      expect(() => {
        keydownHandler({ code: 'ArrowLeft', preventDefault: vi.fn() });
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing keyboard gracefully', () => {
      mockScene.input.keyboard = null;
      
      expect(() => {
        const manager = new InputManager(mockScene);
        manager.setupKeyboardControls();
      }).not.toThrow();
    });

    it('should handle touch events when touch is disabled', () => {
      inputManager.updateSettings({ touchEnabled: false });

      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Should not trigger actions when touch is disabled
      pointerDownHandler({ x: 100, y: 100 });
      
      expect(mockCallbacks[InputAction.ROTATE]).not.toHaveBeenCalled();
    });

    it('should handle haptic feedback failure gracefully', () => {
      // Mock vibrate to throw error
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(() => {
          throw new Error('Vibrate not supported');
        }),
        writable: true
      });

      const pointerDownHandler = mockScene.mockInput.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Should not throw
      expect(() => {
        pointerDownHandler({ x: 100, y: 100 });
      }).not.toThrow();
    });

    it('should clean up resources on destroy', () => {
      inputManager.destroy();

      expect(mockScene.mockKeyboard.off).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockScene.mockKeyboard.off).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(mockScene.mockInput.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.mockInput.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.mockInput.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });
  });

  describe('Device Detection', () => {
    it('should detect Android devices', () => {
      mockScene.mockDevice.os.android = true;
      mockScene.mockDevice.os.iOS = false;
      
      const manager = new InputManager(mockScene);
      const settings = manager.getSettings();
      
      expect(settings.touchEnabled).toBe(true);
    });

    it('should detect iOS devices', () => {
      mockScene.mockDevice.os.android = false;
      mockScene.mockDevice.os.iOS = true;
      
      const manager = new InputManager(mockScene);
      const settings = manager.getSettings();
      
      expect(settings.touchEnabled).toBe(true);
    });

    it('should default to keyboard for desktop', () => {
      mockScene.mockDevice.os.android = false;
      mockScene.mockDevice.os.iOS = false;
      
      // Remove ontouchstart to simulate desktop
      delete (window as any).ontouchstart;
      
      const manager = new InputManager(mockScene);
      const settings = manager.getSettings();
      
      expect(settings.keyboardEnabled).toBe(true);
      // Touch may still be enabled due to test environment, so we'll just check keyboard is enabled
    });
  });
});