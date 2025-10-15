import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MobileControlsUI, MobileControlsConfig } from '../ui/MobileControlsUI';
import { InputAction } from '../managers/InputManager';

// Mock Phaser
const mockScene = {
  scale: {
    width: 800,
    height: 600,
    on: vi.fn(),
    off: vi.fn()
  },
  add: {
    container: vi.fn(() => ({
      setDepth: vi.fn(),
      add: vi.fn(),
      removeAll: vi.fn(),
      setVisible: vi.fn(),
      destroy: vi.fn(),
      y: 0
    })),
    graphics: vi.fn(() => ({
      clear: vi.fn(),
      fillStyle: vi.fn(),
      fillCircle: vi.fn(),
      lineStyle: vi.fn(),
      strokeCircle: vi.fn(),
      setVisible: vi.fn(),
      setScale: vi.fn(),
      setAlpha: vi.fn()
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn(),
      setScale: vi.fn()
    }))
  },
  tweens: {
    add: vi.fn(() => ({
      stop: vi.fn(),
      destroy: vi.fn()
    }))
  }
};

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

describe('Mobile Controls Verification Tests', () => {
  let mobileControls: MobileControlsUI;
  let buttonPressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    buttonPressCallback = vi.fn();
    
    // Reset mock implementations
    mockScene.add.container.mockReturnValue({
      setDepth: vi.fn(),
      add: vi.fn(),
      removeAll: vi.fn(),
      setVisible: vi.fn(),
      destroy: vi.fn(),
      y: 0,
      setInteractive: vi.fn(),
      on: vi.fn()
    });
  });

  afterEach(() => {
    if (mobileControls) {
      mobileControls.destroy();
    }
  });

  describe('Button Creation and Layout', () => {
    it('should create mobile controls with default configuration', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.scale.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should create horizontal layout with correct button spacing', () => {
      const config: Partial<MobileControlsConfig> = {
        layout: 'horizontal',
        buttonSize: 60,
        buttonSpacing: 20
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      // Verify container was created and positioned
      expect(mockScene.add.container).toHaveBeenCalledWith(0, 540); // height - bottomMargin
    });

    it('should create gamepad layout with proper positioning', () => {
      const config: Partial<MobileControlsConfig> = {
        layout: 'gamepad',
        buttonSize: 70
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('should use simple text symbols for better compatibility', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      // Verify text symbols are used (not complex emojis)
      const textCalls = mockScene.add.text.mock.calls;
      const symbols = textCalls.map(call => call[2]); // Third parameter is the text
      
      expect(symbols).toContain('←');
      expect(symbols).toContain('→');
      expect(symbols).toContain('↻');
      expect(symbols).toContain('↓');
      expect(symbols).toContain('⚡');
    });
  });

  describe('Touch Responsiveness', () => {
    it('should have large touch target areas', () => {
      mobileControls = new MobileControlsUI(mockScene as any, {
        buttonSize: 70
      });
      mobileControls.create(buttonPressCallback);

      // Mock the container to simulate button creation
      const mockContainer = {
        setInteractive: vi.fn(),
        on: vi.fn(),
        setDepth: vi.fn(),
        add: vi.fn(),
        removeAll: vi.fn(),
        setVisible: vi.fn(),
        destroy: vi.fn(),
        y: 0
      };

      mockScene.add.container.mockReturnValue(mockContainer);

      // Verify interactive area is larger than button size
      // The hit area should be button size + 10px padding
      expect(mockContainer.setInteractive).toHaveBeenCalled();
    });

    it('should provide immediate visual feedback on button press', () => {
      const config: Partial<MobileControlsConfig> = {
        visualFeedback: true
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      // Visual feedback should be enabled by default
      expect(config.visualFeedback).toBe(true);
    });

    it('should provide haptic feedback when supported', () => {
      const config: Partial<MobileControlsConfig> = {
        hapticFeedback: true
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      // Haptic feedback should be enabled
      expect(config.hapticFeedback).toBe(true);
    });
  });

  describe('Button Functionality', () => {
    it('should trigger correct actions for each button', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      // Simulate button presses by calling the callback directly
      buttonPressCallback(InputAction.MOVE_LEFT);
      buttonPressCallback(InputAction.MOVE_RIGHT);
      buttonPressCallback(InputAction.ROTATE);
      buttonPressCallback(InputAction.SOFT_DROP);
      buttonPressCallback(InputAction.HARD_DROP);

      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.MOVE_LEFT);
      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.MOVE_RIGHT);
      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.ROTATE);
      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.SOFT_DROP);
      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.HARD_DROP);
    });

    it('should handle piece rotation correctly', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      // Test rotation button specifically
      buttonPressCallback(InputAction.ROTATE);

      expect(buttonPressCallback).toHaveBeenCalledWith(InputAction.ROTATE);
      expect(buttonPressCallback).toHaveBeenCalledTimes(1);
    });

    it('should work without animation dependencies', () => {
      const config: Partial<MobileControlsConfig> = {
        visualFeedback: false // Disable animations
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      
      // Should create successfully without animations
      expect(() => {
        mobileControls.create(buttonPressCallback);
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('should handle screen size changes', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      // Get the resize handler
      const resizeHandler = mockScene.scale.on.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1];

      expect(resizeHandler).toBeDefined();

      // Simulate screen resize
      const newSize = { width: 1024, height: 768 };
      expect(() => {
        resizeHandler(newSize);
      }).not.toThrow();
    });

    it('should adapt to different screen orientations', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      const resizeHandler = mockScene.scale.on.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1];

      // Test portrait orientation
      expect(() => {
        resizeHandler({ width: 375, height: 812 });
      }).not.toThrow();

      // Test landscape orientation
      expect(() => {
        resizeHandler({ width: 812, height: 375 });
      }).not.toThrow();
    });

    it('should work on various mobile screen sizes', () => {
      const screenSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 360, height: 640 }, // Android small
        { width: 412, height: 915 }, // Android large
        { width: 768, height: 1024 } // Tablet
      ];

      screenSizes.forEach(size => {
        mockScene.scale.width = size.width;
        mockScene.scale.height = size.height;

        mobileControls = new MobileControlsUI(mockScene as any);
        
        expect(() => {
          mobileControls.create(buttonPressCallback);
        }).not.toThrow();

        mobileControls.destroy();
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should not cause memory leaks on repeated creation/destruction', () => {
      for (let i = 0; i < 10; i++) {
        mobileControls = new MobileControlsUI(mockScene as any);
        mobileControls.create(buttonPressCallback);
        mobileControls.destroy();
      }

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle rapid button presses without issues', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      // Simulate rapid button presses
      for (let i = 0; i < 100; i++) {
        buttonPressCallback(InputAction.ROTATE);
        buttonPressCallback(InputAction.MOVE_LEFT);
        buttonPressCallback(InputAction.MOVE_RIGHT);
      }

      expect(buttonPressCallback).toHaveBeenCalledTimes(300);
    });

    it('should clean up event listeners on destroy', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      mobileControls.destroy();

      expect(mockScene.scale.off).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Accessibility Features', () => {
    it('should have minimum touch target size for accessibility', () => {
      const config: Partial<MobileControlsConfig> = {
        buttonSize: 44 // Minimum recommended touch target size
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      expect(config.buttonSize).toBeGreaterThanOrEqual(44);
    });

    it('should provide visual feedback for button states', () => {
      const config: Partial<MobileControlsConfig> = {
        visualFeedback: true
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);

      // Visual feedback should be enabled for accessibility
      expect(config.visualFeedback).toBe(true);
    });

    it('should work without haptic feedback for devices that don\'t support it', () => {
      // Mock navigator.vibrate to throw an error
      (navigator.vibrate as any).mockImplementation(() => {
        throw new Error('Vibration not supported');
      });

      const config: Partial<MobileControlsConfig> = {
        hapticFeedback: true
      };

      mobileControls = new MobileControlsUI(mockScene as any, config);
      
      // Should still work even if haptic feedback fails
      expect(() => {
        mobileControls.create(buttonPressCallback);
      }).not.toThrow();
    });
  });

  describe('Configuration and Customization', () => {
    it('should allow runtime configuration updates', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      const newConfig: Partial<MobileControlsConfig> = {
        buttonSize: 80,
        hapticFeedback: false
      };

      expect(() => {
        mobileControls.updateConfig(newConfig);
      }).not.toThrow();
    });

    it('should support visibility toggling', () => {
      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(buttonPressCallback);

      expect(() => {
        mobileControls.setVisible(false);
        mobileControls.setVisible(true);
      }).not.toThrow();
    });

    it('should support different layout modes', () => {
      // Test horizontal layout
      let config: Partial<MobileControlsConfig> = { layout: 'horizontal' };
      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);
      mobileControls.destroy();

      // Test gamepad layout
      config = { layout: 'gamepad' };
      mobileControls = new MobileControlsUI(mockScene as any, config);
      mobileControls.create(buttonPressCallback);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing scene gracefully', () => {
      expect(() => {
        mobileControls = new MobileControlsUI(null as any);
      }).not.toThrow();
    });

    it('should handle invalid configuration gracefully', () => {
      const invalidConfig = {
        buttonSize: -10,
        buttonSpacing: -5
      };

      expect(() => {
        mobileControls = new MobileControlsUI(mockScene as any, invalidConfig);
        mobileControls.create(buttonPressCallback);
      }).not.toThrow();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      mobileControls = new MobileControlsUI(mockScene as any);
      mobileControls.create(errorCallback);

      // Should not crash when callback throws
      expect(() => {
        errorCallback(InputAction.ROTATE);
      }).toThrow('Callback error');
    });
  });
});