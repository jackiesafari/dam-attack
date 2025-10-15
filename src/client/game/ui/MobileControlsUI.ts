import * as Phaser from 'phaser';
import { InputAction } from '../managers/InputManager';

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
  layout: 'horizontal' | 'gamepad';
}

export type ButtonPressCallback = (action: InputAction) => void;

export class MobileControlsUI {
  private scene: Phaser.Scene;
  private config: MobileControlsConfig;
  private container: Phaser.GameObjects.Container | null = null;
  private buttons: Map<InputAction, MobileButton> = new Map();
  private onButtonPress?: ButtonPressCallback;

  constructor(scene: Phaser.Scene, config?: Partial<MobileControlsConfig>) {
    this.scene = scene;
    
    // Default configuration
    this.config = {
      buttonSize: 70,
      buttonSpacing: 15,
      bottomMargin: 60,
      hapticFeedback: true,
      visualFeedback: true,
      layout: 'horizontal',
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
    } else {
      this.createGamepadLayout(width);
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

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.container) return;
    
    // Update container position
    this.container.y = gameSize.height - this.config.bottomMargin;
    
    // Recreate layout with new dimensions
    this.buttons.clear();
    this.container.removeAll(true);
    
    if (this.config.layout === 'horizontal') {
      this.createHorizontalLayout(gameSize.width);
    } else {
      this.createGamepadLayout(gameSize.width);
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

  public destroy(): void {
    this.scene.scale.off('resize', this.handleResize);
    
    this.buttons.forEach(button => {
      button.destroy();
    });
    this.buttons.clear();
    
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
    const radius = this.config.size / 2;
    
    // Create button background
    this.background = this.scene.add.graphics();
    this.drawButtonBackground(false);
    this.container.add(this.background);
    
    // Create press effect (initially hidden)
    this.pressEffect = this.scene.add.graphics();
    this.pressEffect.setVisible(false);
    this.container.add(this.pressEffect);
    
    // Create icon
    this.icon = this.scene.add.text(0, 0, this.config.symbol, {
      fontFamily: 'Arial Black',
      fontSize: `${this.config.size * 0.4}px`,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.container.add(this.icon);
  }

  private drawButtonBackground(pressed: boolean): void {
    const radius = this.config.size / 2;
    const color = pressed ? 
      Phaser.Display.Color.GetColor32(
        Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(this.config.color),
          Phaser.Display.Color.ValueToColor(0x000000),
          100,
          30
        )
      ) : this.config.color;
    
    this.background.clear();
    
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

  private setupInteraction(): void {
    const hitArea = new Phaser.Geom.Circle(0, 0, this.config.size / 2 + 10); // Larger hit area
    this.container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    
    // Touch/click events
    this.container.on('pointerdown', this.handlePointerDown.bind(this));
    this.container.on('pointerup', this.handlePointerUp.bind(this));
    this.container.on('pointerout', this.handlePointerOut.bind(this));
    this.container.on('pointerover', this.handlePointerOver.bind(this));
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPressed) return;
    
    this.isPressed = true;
    
    // Visual feedback
    if (this.controlsConfig.visualFeedback) {
      this.showPressEffect();
      this.drawButtonBackground(true);
      this.icon.setScale(0.9);
    }
    
    // Haptic feedback
    if (this.controlsConfig.hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (error) {
        // Haptic feedback not supported
      }
    }
    
    // Trigger action
    this.onPress(this.config.action);
  }

  private handlePointerUp(): void {
    if (!this.isPressed) return;
    
    this.isPressed = false;
    
    // Reset visual state
    if (this.controlsConfig.visualFeedback) {
      this.hidePressEffect();
      this.drawButtonBackground(false);
      this.icon.setScale(1.0);
    }
  }

  private handlePointerOut(): void {
    if (this.isPressed) {
      this.handlePointerUp();
    }
  }

  private handlePointerOver(): void {
    if (!this.isPressed && this.controlsConfig.visualFeedback) {
      // Subtle hover effect
      this.container.setScale(1.05);
    }
  }

  private showPressEffect(): void {
    const radius = this.config.size / 2;
    
    // Create ripple effect
    this.pressEffect.clear();
    this.pressEffect.fillStyle(0xFFFFFF, 0.5);
    this.pressEffect.fillCircle(0, 0, radius * 0.3);
    this.pressEffect.setVisible(true);
    
    // Animate ripple
    this.pressAnimation = this.scene.tweens.add({
      targets: this.pressEffect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.pressEffect.setVisible(false);
        this.pressEffect.setScale(1);
        this.pressEffect.setAlpha(1);
      }
    });
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

  public destroy(): void {
    if (this.pressAnimation) {
      this.pressAnimation.destroy();
    }
    this.container.destroy();
  }
}