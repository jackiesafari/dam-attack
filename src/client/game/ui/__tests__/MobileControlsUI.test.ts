import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { MobileControlsUI, MobileControlsConfig } from '../MobileControlsUI';
import { InputAction } from '../../managers/InputManager';

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
    y: 0
  };

  const mockGraphics = {
    fillStyle: vi.fn(),
    fillRoundedRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
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
    off: vi.fn()
  };

  const mockTweens = {
    add: vi.fn(() => ({
      stop: vi.fn(),
      destroy: vi.fn()
    }))
  };

  const mockScale = {
    width: 800,
    height: 600,
    on: vi.fn(),
    off: vi.fn()
  };

  return {
    add: {
      container: vi.fn(() => mockContainer),
      graphics: vi.fn(() => mockGraphics),
      text: vi.fn(() => mockText)
    },
    tweens: mockTweens,
    scale: mockScale,
    mockContainer,
    mockGraphics,
    mockText,
    mockTweens,
    mockScale
  } as any;
};

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

describe('MobileControlsUI', () => {
  let mobileControls: MobileControlsUI;
  let mockScene: any;
  let mockButtonPressCallback: vi.Mock;

  beforeEach(() => {
    mockScene = createMockScene();
    mobileControls = new MobileControlsUI(mockScene);
    mockButtonPressCallback = vi.fn();
  });

  afterEach(() => {
    mobileControls.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with default configuration', () => {
      expect(mobileControls).toBeDefined();
    });

    it('should create with custom configuration', () => {
      const customConfig: Partial<MobileControlsConfig> = {
        buttonSize: 80,
        buttonSpacing: 20,
        bottomMargin: 80,
        layout: 'gamepad'
      };

      const customControls = new MobileControlsUI(mockScene, customConfig);
      expect(customControls).toBeDefined();
    });
  });

  describe('Control Creation', () => {
    it('should create horizontal layout by default', () => {
      mobileControls.create(mockButtonPressCallback);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.mockContainer.setDepth).toHaveBeenCalledWith(1000);
    });

    it('should create gamepad layout when specified', () => {
      const gamepadControls = new MobileControlsUI(mockScene, { layout: 'gamepad' });
      gamepadControls.create(mockButtonPressCallback);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should position container at bottom of screen', () => {
      mobileControls.create(mockButtonPressCallback);

      const expectedY = mockScene.scale.height - 60; // default bottomMargin
      expect(mockScene.mockContainer.y).toBe(expectedY);
    });

    it('should create all required buttons', () => {
      mobileControls.create(mockButtonPressCallback);

      // Should create graphics and text for each button
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(10); // 2 graphics per button (bg + effect) * 5 buttons
      expect(mockScene.add.text).toHaveBeenCalledTimes(5); // 1 text per button
    });
  });

  describe('Button Interaction', () => {
    beforeEach(() => {
      mobileControls.create(mockButtonPressCallback);
    });

    it('should trigger callback when button is pressed', () => {
      // Get the first button's pointerdown handler
      const buttonOnCalls = mockScene.mockText.on.mock.calls.filter(
        call => call[0] === 'pointerdown'
      );
      
      expect(buttonOnCalls.length).toBeGreaterThan(0);
      
      // Simulate button press
      const pointerDownHandler = buttonOnCalls[0][1];
      pointerDownHandler();

      expect(mockButtonPressCallback).toHaveBeenCalled();
    });

    it('should provide visual feedback on button press', () => {
      // Get button pointerdown handler
      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      pointerDownHandler();

      expect(mockScene.mockText.setScale).toHaveBeenCalledWith(0.9);
    });

    it('should provide haptic feedback on button press', () => {
      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      pointerDownHandler();

      expect(navigator.vibrate).toHaveBeenCalledWith(15);
    });

    it('should reset visual state on button release', () => {
      const pointerUpHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerup'
      )[1];

      pointerUpHandler();

      expect(mockScene.mockText.setScale).toHaveBeenCalledWith(1.0);
    });

    it('should handle hover effects', () => {
      const pointerOverHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerover'
      )[1];

      pointerOverHandler();

      expect(mockScene.mockText.setScale).toHaveBeenCalledWith(1.05);
    });
  });

  describe('Button Actions', () => {
    beforeEach(() => {
      mobileControls.create(mockButtonPressCallback);
    });

    it('should trigger correct actions for each button type', () => {
      // This test would need to be more specific about which button is which
      // For now, we'll test that the callback is called with an InputAction
      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      pointerDownHandler();

      expect(mockButtonPressCallback).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('Visual Effects', () => {
    beforeEach(() => {
      mobileControls.create(mockButtonPressCallback);
    });

    it('should create press effect animation', () => {
      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      pointerDownHandler();

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 200,
          ease: 'Power2'
        })
      );
    });

    it('should handle button background drawing', () => {
      // Button background should be drawn during creation
      expect(mockScene.mockGraphics.fillStyle).toHaveBeenCalled();
      expect(mockScene.mockGraphics.fillCircle).toHaveBeenCalled();
      expect(mockScene.mockGraphics.lineStyle).toHaveBeenCalled();
      expect(mockScene.mockGraphics.strokeCircle).toHaveBeenCalled();
    });
  });

  describe('Layout Management', () => {
    it('should handle screen resize', () => {
      mobileControls.create(mockButtonPressCallback);

      // Simulate resize event
      const resizeHandler = mockScene.mockScale.on.mock.calls.find(
        call => call[0] === 'resize'
      )[1];

      const newSize = { width: 1024, height: 768 };
      resizeHandler(newSize);

      // Should update container position
      expect(mockScene.mockContainer.y).toBe(newSize.height - 60);
      
      // Should recreate layout
      expect(mockScene.mockContainer.removeAll).toHaveBeenCalledWith(true);
    });

    it('should calculate button positions correctly for horizontal layout', () => {
      mobileControls.create(mockButtonPressCallback);

      // Buttons should be created with proper spacing
      // This is tested indirectly through the container.add calls
      expect(mockScene.mockContainer.add).toHaveBeenCalledTimes(5); // 5 buttons
    });

    it('should calculate button positions correctly for gamepad layout', () => {
      const gamepadControls = new MobileControlsUI(mockScene, { layout: 'gamepad' });
      gamepadControls.create(mockButtonPressCallback);

      // Should still create all buttons
      expect(mockScene.mockContainer.add).toHaveBeenCalledTimes(5);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      mobileControls.create(mockButtonPressCallback);
    });

    it('should update configuration', () => {
      const newConfig: Partial<MobileControlsConfig> = {
        buttonSize: 80,
        visualFeedback: false,
        hapticFeedback: false
      };

      mobileControls.updateConfig(newConfig);

      // Configuration should be updated (tested indirectly through behavior)
      expect(mobileControls).toBeDefined();
    });

    it('should disable haptic feedback when configured', () => {
      mobileControls.updateConfig({ hapticFeedback: false });

      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Clear previous vibrate calls
      vi.clearAllMocks();
      
      pointerDownHandler();

      expect(navigator.vibrate).not.toHaveBeenCalled();
    });

    it('should disable visual feedback when configured', () => {
      mobileControls.updateConfig({ visualFeedback: false });

      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Clear previous scale calls
      vi.clearAllMocks();
      
      pointerDownHandler();

      expect(mockScene.mockText.setScale).not.toHaveBeenCalled();
    });
  });

  describe('Visibility Control', () => {
    beforeEach(() => {
      mobileControls.create(mockButtonPressCallback);
    });

    it('should show controls', () => {
      mobileControls.setVisible(true);
      expect(mockScene.mockContainer.setVisible).toHaveBeenCalledWith(true);
    });

    it('should hide controls', () => {
      mobileControls.setVisible(false);
      expect(mockScene.mockContainer.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing navigator.vibrate gracefully', () => {
      // Mock vibrate to throw error
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn(() => {
          throw new Error('Vibrate not supported');
        }),
        writable: true
      });

      mobileControls.create(mockButtonPressCallback);

      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Should not throw
      expect(() => {
        pointerDownHandler();
      }).not.toThrow();
    });

    it('should handle button callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      mobileControls.create(errorCallback);

      const pointerDownHandler = mockScene.mockText.on.mock.calls.find(
        call => call[0] === 'pointerdown'
      )[1];

      // Should not throw
      expect(() => {
        pointerDownHandler();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      mobileControls.create(mockButtonPressCallback);
      mobileControls.destroy();

      expect(mockScene.mockScale.off).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockScene.mockContainer.destroy).toHaveBeenCalled();
    });

    it('should handle destroy when not created', () => {
      // Should not throw when destroying before creation
      expect(() => {
        mobileControls.destroy();
      }).not.toThrow();
    });
  });

  describe('Button Size and Hit Areas', () => {
    it('should create buttons with correct size', () => {
      const customSize = 80;
      const customControls = new MobileControlsUI(mockScene, { buttonSize: customSize });
      customControls.create(mockButtonPressCallback);

      // Button graphics should be created with correct size
      expect(mockScene.mockGraphics.fillCircle).toHaveBeenCalledWith(0, 0, customSize / 2);
    });

    it('should create interactive areas larger than visual buttons', () => {
      mobileControls.create(mockButtonPressCallback);

      // Interactive area should be set with padding for easier touch
      expect(mockScene.mockText.setInteractive).toHaveBeenCalled();
    });
  });
});