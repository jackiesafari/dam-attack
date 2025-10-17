import * as Phaser from 'phaser';
import { InputAction } from '../managers/InputManager';
import { BeaverMascotUI, BeaverMascotConfig } from './BeaverMascotUI';

export interface MobileButtonConfig {
  action: InputAction;
  symbol: string;
  color: number;
  size: number;
  position: { x: number; y: number };
}

export interface MobileControlsConfig {
  buttonSize: number;
  buttonSpacing: number;
  bottomMargin: number;
  hapticFeedback: boolean;
  visualFeedback: boolean;
  layout: 'horizontal' | 'gamepad' | 'enhanced';
  neonStyle: boolean;
}

export type ButtonPressCallback = (action: InputAction) => void;

export class MobileControlsUI {
  private scene: Phaser.Scene;
  private config: MobileControlsConfig;
  private container: Phaser.GameObjects.Container | null = null;
  private buttons: Map<InputAction, MobileButton> = new Map();
  private onButtonPress?: ButtonPressCallback;
  private beaverMascot: BeaverMascotUI | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<MobileControlsConfig>) {
    this.scene = scene;
    
    // Default configuration with enhanced styling
    this.config = {
      buttonSize: 80, // Larger buttons as specified
      buttonSpacing: 20,
      bottomMargin: 60,
      hapticFeedback: true,
      visualFeedback: true,
      layout: 'enhanced',
      neonStyle: true,
      ...config
    };
  }

  public create(onButtonPress: ButtonPressCallback): void {
    this.onButtonPress = onButtonPress;
    
    const { width, height } = this.scene.scale;
    
    // Create container for all mobile controls
    this.container = this.scene.add.container(0, height - this.config.bottomMargin);
    this.container.setDepth(1000); // Ensure controls are on top
    
    if (this.config.layout === 'horizontal') {
      this.createHorizontalLayout(width);
    } else if (this.config.layout === 'gamepad') {
      this.createGamepadLayout(width);
    } else {
      this.createEnhancedLayout(width, height);
    }
    
    // Handle screen resize
    this.scene.scale.on('resize', this.handleResize.bind(this));
  }

  private createHorizontalLayout(screenWidth: number): void {
    const buttonConfigs: MobileButtonConfig[] = [
      {
        action: InputAction.MOVE_LEFT,
        symbol: '←',
        color: 0x4A90E2,
        size: this.config.buttonSize,
        position: { x: 0, y: 0 }
      },
      {
        action: InputAction.MOVE_RIGHT,
        symbol: '→',
        color: 0x4A90E2,
        size: this.config.buttonSize,
        position: { x: 0, y: 0 }
      },
      {
        action: InputAction.ROTATE,
        symbol: '↻',
        color: 0x7ED321,
        size: this.config.buttonSize,
        position: { x: 0, y: 0 }
      },
      {
        action: InputAction.SOFT_DROP,
        symbol: '↓',
        color: 0xF5A623,
        size: this.config.buttonSize,
        position: { x: 0, y: 0 }
      },
      {
        action: InputAction.HARD_DROP,
        symbol: '⚡',
        color: 0xD0021B,
        size: this.config.buttonSize,
        position: { x: 0, y: 0 }
      }
    ];

    // Calculate positions
    const totalWidth = (this.config.buttonSize * buttonConfigs.length) + 
                      (this.config.buttonSpacing * (buttonConfigs.length - 1));
    const startX = (screenWidth - totalWidth) / 2;

    buttonConfigs.forEach((config, index) => {
      config.position.x = startX + (index * (this.config.buttonSize + this.config.buttonSpacing));
      config.position.y = 0;
      
      const button = this.createMobileButton(config);
      this.buttons.set(config.action, button);
      this.container!.add(button.container);
    });
  }

  private createGamepadLayout(screenWidth: number): void {
    const buttonConfigs: MobileButtonConfig[] = [
      // Left side - movement
      {
        action: InputAction.MOVE_LEFT,
        symbol: '←',
        color: 0x4A90E2,
        size: this.config.buttonSize,
        position: { x: 60, y: 0 }
      },
      {
        action: InputAction.MOVE_RIGHT,
        symbol: '→',
        color: 0x4A90E2,
        size: this.config.buttonSize,
        position: { x: 180, y: 0 }
      },
      {
        action: InputAction.SOFT_DROP,
        symbol: '↓',
        color: 0xF5A623,
        size: this.config.buttonSize,
        position: { x: 120, y: 40 }
      },
      
      // Right side - actions
      {
        action: InputAction.ROTATE,
        symbol: '↻',
        color: 0x7ED321,
        size: this.config.buttonSize,
        position: { x: screenWidth - 120, y: 0 }
      },
      {
        action: InputAction.HARD_DROP,
        symbol: '⚡',
        color: 0xD0021B,
        size: this.config.buttonSize,
        position: { x: screenWidth - 60, y: 40 }
      }
    ];

    buttonConfigs.forEach(config => {
      const button = this.createMobileButton(config);
      this.buttons.set(config.action, button);
      this.container!.add(button.container);
    });
  }

  private createEnhancedLayout(screenWidth: number, screenHeight: number): void {
    // Enhanced layout with strategic positioning around game board
    // Position controls in columns as specified in requirements
    const controlWidth = 100;
    const padding = 20;
    const leftColumnX = controlWidth / 2 + padding - screenWidth / 2; // Relative to container center
    const rightColumnX = screenWidth - controlWidth / 2 - padding - screenWidth / 2; // Relative to container center
    
    // Position controls vertically centered relative to container
    const buttonSpacing = this.config.buttonSize + this.config.buttonSpacing;
    const totalControlsHeight = buttonSpacing * 3; // 4 buttons with spacing
    const controlsStartY = -totalControlsHeight / 2;

    const buttonConfigs: MobileButtonConfig[] = [
      // Left column - movement controls (right arrow, beaver space, left arrow, down arrow)
      {
        action: InputAction.MOVE_RIGHT,
        symbol: '→',
        color: 0x00FFFF, // Neon cyan
        size: this.config.buttonSize,
        position: { x: leftColumnX, y: controlsStartY }
      },
      // Beaver mascot space will be at controlsStartY + buttonSpacing (handled separately)
      {
        action: InputAction.MOVE_LEFT,
        symbol: '←',
        color: 0x00FFFF, // Neon cyan
        size: this.config.buttonSize,
        position: { x: leftColumnX, y: controlsStartY + buttonSpacing * 2 }
      },
      {
        action: InputAction.SOFT_DROP,
        symbol: '↓',
        color: 0x00FFFF, // Neon cyan
        size: this.config.buttonSize,
        position: { x: leftColumnX, y: controlsStartY + buttonSpacing * 3 }
      },
      
      // Right column - action controls
      {
        action: InputAction.ROTATE,
        symbol: '↻',
        color: 0xFF00FF, // Neon magenta
        size: this.config.buttonSize,
        position: { x: rightColumnX, y: controlsStartY }
      },
      {
        action: InputAction.HARD_DROP,
        symbol: '⬇',
        color: 0xFF00FF, // Neon magenta
        size: this.config.buttonSize,
        position: { x: rightColumnX, y: controlsStartY + buttonSpacing }
      }
    ];

    buttonConfigs.forEach(config => {
      const button = this.createMobileButton(config);
      this.buttons.set(config.action, button);
      this.container!.add(button.container);
    });
    
    // Create beaver mascot for enhanced layout
    this.createBeaverMascot(screenWidth, screenHeight);
  }

  private createMobileButton(config: MobileButtonConfig): MobileButton {
    return new MobileButton(
      this.scene,
      config,
      this.config,
      (action: InputAction) => {
        if (this.onButtonPress) {
          this.onButtonPress(action);
        }
      }
    );
  }

  private createBeaverMascot(screenWidth: number, screenHeight: number): void {
    if (this.config.layout !== 'enhanced') return;
    
    const beaverPosition = this.getBeaverPosition(screenWidth, screenHeight);
    
    const beaverConfig: BeaverMascotConfig = {
      size: this.config.buttonSize * 0.8, // Slightly smaller than buttons
      neonStyle: this.config.neonStyle,
      animationEnabled: true,
      position: beaverPosition
    };
    
    this.beaverMascot = new BeaverMascotUI(this.scene, beaverConfig);
    this.beaverMascot.create();
    
    // Add beaver to controls container
    if (this.container) {
      this.container.add(this.beaverMascot.getContainer());
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.container) return;
    
    // Update container position
    this.container.y = gameSize.height - this.config.bottomMargin;
    
    // Clean up existing elements
    this.buttons.clear();
    if (this.beaverMascot) {
      this.beaverMascot.destroy();
      this.beaverMascot = null;
    }
    this.container.removeAll(true);
    
    // Recreate layout with new dimensions
    if (this.config.layout === 'horizontal') {
      this.createHorizontalLayout(gameSize.width);
    } else if (this.config.layout === 'gamepad') {
      this.createGamepadLayout(gameSize.width);
    } else {
      this.createEnhancedLayout(gameSize.width, gameSize.height);
    }
  }

  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }

  public updateConfig(newConfig: Partial<MobileControlsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update existing buttons
    this.buttons.forEach(button => {
      button.updateConfig(this.config);
    });
  }

  /**
   * Trigger beaver cheer animation when player does well
   */
  public playBeaverCheer(): void {
    if (this.beaverMascot) {
      this.beaverMascot.playCheerAnimation();
    }
  }

  /**
   * Trigger beaver worry animation when player is struggling
   */
  public playBeaverWorry(): void {
    if (this.beaverMascot) {
      this.beaverMascot.playWorryAnimation();
    }
  }

  /**
   * Get reference to beaver mascot for external control
   */
  public getBeaverMascot(): BeaverMascotUI | null {
    return this.beaverMascot;
  }

  /**
   * Get the position where the beaver mascot should be displayed
   * Returns position relative to the controls container
   */
  public getBeaverPosition(screenWidth: number, screenHeight: number): { x: number; y: number } {
    if (this.config.layout === 'enhanced') {
      const controlWidth = 100;
      const padding = 20;
      const leftColumnX = controlWidth / 2 + padding - screenWidth / 2;
      const buttonSpacing = this.config.buttonSize + this.config.buttonSpacing;
      const totalControlsHeight = buttonSpacing * 3;
      const controlsStartY = -totalControlsHeight / 2;
      
      return {
        x: leftColumnX,
        y: controlsStartY + buttonSpacing // Between right arrow and left arrow
      };
    }
    
    // Default position for other layouts
    return { x: 0, y: 0 };
  }

  /**
   * Get the container for external positioning
   */
  public getContainer(): Phaser.GameObjects.Container | null {
    return this.container;
  }

  public destroy(): void {
    this.scene.scale.off('resize', this.handleResize);
    
    this.buttons.forEach(button => {
      button.destroy();
    });
    this.buttons.clear();
    
    // Clean up beaver mascot
    if (this.beaverMascot) {
      this.beaverMascot.destroy();
      this.beaverMascot = null;
    }
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}

class MobileButton {
  public container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private config: MobileButtonConfig;
  private controlsConfig: MobileControlsConfig;
  private onPress: (action: InputAction) => void;
  
  private background: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private pressEffect: Phaser.GameObjects.Graphics;
  
  private isPressed: boolean = false;
  private pressAnimation?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    config: MobileButtonConfig,
    controlsConfig: MobileControlsConfig,
    onPress: (action: InputAction) => void
  ) {
    this.scene = scene;
    this.config = config;
    this.controlsConfig = controlsConfig;
    this.onPress = onPress;
    
    this.container = scene.add.container(config.position.x, config.position.y);
    
    this.createButton();
    this.setupInteraction();
  }

  private createButton(): void {
    // Create button background
    this.background = this.scene.add.graphics();
    this.drawButtonBackground(false);
    this.container.add(this.background);
    
    // Create press effect (initially hidden)
    this.pressEffect = this.scene.add.graphics();
    this.pressEffect.setVisible(false);
    this.container.add(this.pressEffect);
    
    // Create icon with enhanced styling
    const iconColor = this.controlsConfig.neonStyle ? 
      `#${this.config.color.toString(16).padStart(6, '0')}` : '#FFFFFF';
    
    this.icon = this.scene.add.text(0, 0, this.config.symbol, {
      fontFamily: 'Arial Black',
      fontSize: `${this.config.size * 0.45}px`,
      color: iconColor,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.container.add(this.icon);
  }

  private drawButtonBackground(pressed: boolean): void {
    const size = this.config.size;
    const halfSize = size / 2;
    
    this.background.clear();
    
    if (this.controlsConfig.neonStyle) {
      // Enhanced neon square design
      const baseColor = pressed ? 0x000000 : 0x111111;
      const borderColor = this.config.color;
      const glowColor = this.config.color;
      
      // Outer glow effect
      if (!pressed) {
        this.background.fillStyle(glowColor, 0.2);
        this.background.fillRoundedRect(-halfSize - 4, -halfSize - 4, size + 8, size + 8, 8);
      }
      
      // Main button background
      this.background.fillStyle(baseColor, pressed ? 0.8 : 0.9);
      this.background.fillRoundedRect(-halfSize, -halfSize, size, size, 8);
      
      // Neon border (double border for enhanced effect)
      this.background.lineStyle(3, borderColor, 1.0);
      this.background.strokeRoundedRect(-halfSize, -halfSize, size, size, 8);
      
      // Inner border for depth
      this.background.lineStyle(1, borderColor, 0.6);
      this.background.strokeRoundedRect(-halfSize + 3, -halfSize + 3, size - 6, size - 6, 5);
      
      // Inner highlight for 3D effect
      if (!pressed) {
        this.background.fillStyle(0xFFFFFF, 0.1);
        this.background.fillRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size * 0.3, 3);
      }
    } else {
      // Fallback to circular design for non-neon style
      const radius = halfSize;
      const color = pressed ? 
        Phaser.Display.Color.GetColor32(50, 50, 50, 255) : this.config.color;
      
      // Outer glow effect
      if (!pressed) {
        this.background.fillStyle(this.config.color, 0.3);
        this.background.fillCircle(0, 0, radius + 4);
      }
      
      // Main button
      this.background.fillStyle(color);
      this.background.fillCircle(0, 0, radius);
      
      // Border
      this.background.lineStyle(3, 0xFFFFFF, 0.8);
      this.background.strokeCircle(0, 0, radius);
      
      // Inner highlight
      if (!pressed) {
        this.background.fillStyle(0xFFFFFF, 0.2);
        this.background.fillCircle(0, -radius * 0.3, radius * 0.6);
      }
    }
  }

  private setupInteraction(): void {
    // Ensure touch targets meet accessibility guidelines (minimum 44px)
    const minTouchSize = 44;
    const hitAreaSize = Math.max(this.config.size + 20, minTouchSize);
    const halfHitSize = hitAreaSize / 2;
    
    let hitArea: Phaser.Geom.Rectangle | Phaser.Geom.Circle;
    let containsFunction: Phaser.Types.Input.HitAreaCallback;
    
    if (this.controlsConfig.neonStyle) {
      hitArea = new Phaser.Geom.Rectangle(-halfHitSize, -halfHitSize, hitAreaSize, hitAreaSize);
      containsFunction = Phaser.Geom.Rectangle.Contains;
    } else {
      hitArea = new Phaser.Geom.Circle(0, 0, halfHitSize);
      containsFunction = Phaser.Geom.Circle.Contains;
    }
    
    this.container.setInteractive(hitArea, containsFunction);
    
    // Enhanced touch/click events with better responsiveness
    this.container.on('pointerdown', this.handlePointerDown.bind(this));
    this.container.on('pointerup', this.handlePointerUp.bind(this));
    this.container.on('pointerout', this.handlePointerOut.bind(this));
    this.container.on('pointerover', this.handlePointerOver.bind(this));
    this.container.on('pointermove', this.handlePointerMove.bind(this));
    
    // Prevent context menu on long press for mobile
    this.container.on('pointerdown', (pointer: Phaser.Input.Pointer, event: any) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPressed) return;
    
    this.isPressed = true;
    
    // Immediate visual feedback for responsiveness
    if (this.controlsConfig.visualFeedback) {
      // Instant visual changes for immediate feedback
      this.container.setScale(0.95);
      this.icon.setScale(0.9);
      this.container.setAlpha(0.9);
      
      // Show press effect immediately
      this.showPressEffect();
      this.drawButtonBackground(true);
      
      // Enhanced button press animation with bounce
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 0.9,
        scaleY: 0.9,
        rotation: 0.05,
        duration: 80,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          // Return to pressed state after bounce
          this.container.setScale(0.95);
        }
      });
      
      // Icon pulse animation
      this.scene.tweens.add({
        targets: this.icon,
        scaleX: 0.85,
        scaleY: 0.85,
        duration: 60,
        ease: 'Back.easeOut',
        yoyo: true
      });
    }
    
    // Enhanced haptic feedback with action-specific patterns
    if (this.controlsConfig.hapticFeedback && this.isHapticSupported()) {
      this.triggerHapticFeedback(this.config.action);
    }
    
    // Trigger action immediately for responsiveness
    this.onPress(this.config.action);
  }

  private handlePointerUp(): void {
    if (!this.isPressed) return;
    
    this.isPressed = false;
    
    // Enhanced reset animation with spring effect
    if (this.controlsConfig.visualFeedback) {
      this.hidePressEffect();
      this.drawButtonBackground(false);
      
      // Smooth return to normal state with overshoot for satisfying feel
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.05,
        scaleY: 1.05,
        alpha: 1.0,
        rotation: 0,
        duration: 120,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Settle to normal size
          this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 80,
            ease: 'Power2'
          });
        }
      });
      
      // Icon return animation
      this.scene.tweens.add({
        targets: this.icon,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.icon,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 60,
            ease: 'Power2'
          });
        }
      });
    }
  }

  private handlePointerOut(): void {
    if (this.isPressed) {
      this.handlePointerUp();
    }
  }

  private handlePointerOver(): void {
    if (!this.isPressed && this.controlsConfig.visualFeedback) {
      // Subtle hover effect with smooth transition
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power2'
      });
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    // Enhanced touch tracking for better responsiveness
    if (this.isPressed) {
      // Check if pointer is still within button bounds
      const bounds = this.container.getBounds();
      const isWithinBounds = bounds.contains(pointer.worldX, pointer.worldY);
      
      if (!isWithinBounds) {
        // Pointer moved outside button while pressed
        this.handlePointerOut();
      }
    }
  }

  private showPressEffect(): void {
    const size = this.config.size;
    const halfSize = size / 2;
    
    // Create enhanced ripple effect with multiple layers
    this.pressEffect.clear();
    
    if (this.controlsConfig.neonStyle) {
      // Multi-layer neon ripple effect
      // Outer ripple
      this.pressEffect.fillStyle(this.config.color, 0.3);
      this.pressEffect.fillRoundedRect(-halfSize * 0.4, -halfSize * 0.4, size * 0.8, size * 0.8, 6);
      
      // Inner ripple
      this.pressEffect.fillStyle(this.config.color, 0.6);
      this.pressEffect.fillRoundedRect(-halfSize * 0.2, -halfSize * 0.2, size * 0.4, size * 0.4, 3);
      
      // Core flash
      this.pressEffect.fillStyle(0xFFFFFF, 0.8);
      this.pressEffect.fillRoundedRect(-halfSize * 0.1, -halfSize * 0.1, size * 0.2, size * 0.2, 2);
    } else {
      // Enhanced circular ripple with multiple rings
      this.pressEffect.fillStyle(0xFFFFFF, 0.4);
      this.pressEffect.fillCircle(0, 0, halfSize * 0.4);
      this.pressEffect.fillStyle(0xFFFFFF, 0.6);
      this.pressEffect.fillCircle(0, 0, halfSize * 0.2);
    }
    
    this.pressEffect.setVisible(true);
    
    // Enhanced ripple animation with staggered effects
    this.pressAnimation = this.scene.tweens.add({
      targets: this.pressEffect,
      scaleX: 3.0,
      scaleY: 3.0,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.pressEffect.setVisible(false);
        this.pressEffect.setScale(1);
        this.pressEffect.setAlpha(1);
      }
    });
    
    // Add secondary ripple for enhanced effect
    if (this.controlsConfig.neonStyle) {
      this.scene.tweens.add({
        targets: this.pressEffect,
        rotation: 0.1,
        duration: 150,
        ease: 'Power2',
        yoyo: true
      });
    }
  }

  private hidePressEffect(): void {
    if (this.pressAnimation) {
      this.pressAnimation.stop();
    }
    this.pressEffect.setVisible(false);
    this.container.setScale(1.0);
  }

  public updateConfig(controlsConfig: MobileControlsConfig): void {
    this.controlsConfig = controlsConfig;
  }

  private isHapticSupported(): boolean {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }

  private triggerHapticFeedback(action: InputAction): void {
    if (!this.isHapticSupported()) return;
    
    try {
      // Different vibration patterns for different actions
      let pattern: number | number[];
      
      switch (action) {
        case InputAction.MOVE_LEFT:
        case InputAction.MOVE_RIGHT:
          pattern = [15]; // Short, light vibration for movement
          break;
        case InputAction.ROTATE:
          pattern = [25, 10, 25]; // Double pulse for rotation
          break;
        case InputAction.SOFT_DROP:
          pattern = [20]; // Medium vibration for soft drop
          break;
        case InputAction.HARD_DROP:
          pattern = [50, 20, 30]; // Strong pattern for hard drop
          break;
        default:
          pattern = [20]; // Default pattern
      }
      
      navigator.vibrate(pattern);
    } catch (error) {
      // Haptic feedback failed, continue silently
      console.debug('Haptic feedback not available:', error);
    }
  }

  public destroy(): void {
    if (this.pressAnimation) {
      this.pressAnimation.destroy();
    }
    this.container.destroy();
  }
}