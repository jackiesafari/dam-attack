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
  layout: 'horizontal' | 'gamepad' | 'enhanced' | 'wood-dpad';
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
    } else if (this.config.layout === 'wood-dpad') {
      this.createWoodDPadLayout(width, height);
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

  private createWoodDPadLayout(screenWidth: number, screenHeight: number): void {
    const buttonSize = 50;
    const dPadSpacing = buttonSize * 1.05; // Much more spacing (1.05 = buttons don't overlap at all)
    const dPadSize = (buttonSize * 0.5 + dPadSpacing) * 2; // Overall D-Pad size based on spacing
    
    // Position controls on RIGHT SIDE of screen, BELOW the water timer
    // Get water timer position from the scene
    const scene = this.scene as any;
    const isMobile = screenWidth < 600;
    const isFullscreen = screenWidth > 1200;
    
    // Match timer positioning logic from EnhancedGame
    let timerX: number;
    let timerY: number;
    let timerRadius: number;
    
    if (isMobile) {
      timerX = screenWidth - 50;
      timerY = 180;
      timerRadius = 25;
    } else if (isFullscreen) {
      timerX = screenWidth - 100;
      timerY = 150;
      timerRadius = 40;
    } else {
      timerX = screenWidth - 70;
      timerY = 180;
      timerRadius = 32;
    }
    
    // Position D-Pad below the water timer, on the right side
    // Move down by 80-100px and left by 20-30px as requested
    const padding = 20;
    const dPadAbsX = timerX - 25; // Move left by 25px (decrease X)
    const dPadAbsY = timerY + timerRadius + 115; // Move down by 115px (slightly more spacing for less clutter)
    
    // Ensure controls stay within canvas bounds
    const minX = dPadSize * 0.5 + padding; // Left boundary
    const maxX = screenWidth - dPadSize * 0.5 - padding; // Right boundary
    const minY = dPadSize * 0.5 + padding; // Top boundary
    const maxY = screenHeight - this.config.bottomMargin - dPadSize * 0.5 - padding; // Bottom boundary (accounting for container offset)
    
    // Clamp positions to stay within bounds
    const clampedX = Math.max(minX, Math.min(dPadAbsX, maxX));
    const clampedY = Math.max(minY, Math.min(dPadAbsY, maxY + (screenHeight - this.config.bottomMargin))); // Account for relative positioning
    
    // Container is positioned at (0, screenHeight - bottomMargin), so convert absolute to relative
    const dPadContainerX = clampedX;
    const dPadContainerY = clampedY - (screenHeight - this.config.bottomMargin);
    const dPadCenterX = 0;
    const dPadCenterY = 0;
    
    // Create modern D-Pad container
    const dPadContainer = this.scene.add.container(dPadContainerX, dPadContainerY);
    this.createModernDPadBackground(dPadContainer, dPadSize);
    this.container!.add(dPadContainer);
    
    // Create modern D-Pad buttons in cross pattern with MORE SPACING: Rotate (top), Left, Right, Down
    const dPadButtonConfigs: Array<{action: InputAction, symbol: string, offsetX: number, offsetY: number}> = [
      { action: InputAction.ROTATE, symbol: '↻', offsetX: 0, offsetY: -dPadSpacing },      // Top
      { action: InputAction.MOVE_LEFT, symbol: '←', offsetX: -dPadSpacing, offsetY: 0 },   // Left
      { action: InputAction.MOVE_RIGHT, symbol: '→', offsetX: dPadSpacing, offsetY: 0 },  // Right
      { action: InputAction.SOFT_DROP, symbol: '↓', offsetX: 0, offsetY: dPadSpacing }    // Bottom
    ];
    
    dPadButtonConfigs.forEach(btnConfig => {
      const buttonConfig: MobileButtonConfig = {
        action: btnConfig.action,
        symbol: btnConfig.symbol,
        color: 0x66D9EF, // Cyan for modern theme
        size: buttonSize,
        position: { 
          x: dPadCenterX + btnConfig.offsetX, 
          y: dPadCenterY + btnConfig.offsetY 
        }
      };
      
      const button = this.createMobileButton(buttonConfig, false, false); // Modern theme, not wood
      this.buttons.set(buttonConfig.action, button);
      dPadContainer.add(button.container);
    });
    
    // Create "MOVE" label below D-Pad (optional, smaller)
    const moveLabel = this.scene.add.text(
      dPadCenterX, 
      dPadCenterY + dPadSize * 0.5 + 12, 
      'MOVE', 
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
    dPadContainer.add(moveLabel);
    
    // Create Drop button DIRECTLY BELOW D-Pad center (perfectly aligned)
    const dropButtonAbsX = clampedX; // Same X as clamped D-Pad center
    const dropButtonAbsY = clampedY + dPadSize * 0.5 + 25 + buttonSize * 0.5; // Directly below D-Pad with spacing
    
    // Ensure drop button stays within bounds
    const dropButtonMinY = buttonSize * 0.5 + padding;
    const dropButtonMaxY = screenHeight - this.config.bottomMargin - buttonSize * 0.5 - padding;
    const dropButtonClampedY = Math.max(dropButtonMinY, Math.min(dropButtonAbsY, dropButtonMaxY + (screenHeight - this.config.bottomMargin)));
    
    // Convert to relative positioning
    const dropButtonX = dropButtonAbsX;
    const dropButtonY = dropButtonClampedY - (screenHeight - this.config.bottomMargin);
    
    const dropButtonConfig: MobileButtonConfig = {
      action: InputAction.HARD_DROP,
      symbol: '↓',
      color: 0x66D9EF,
      size: buttonSize,
      position: { x: dropButtonX, y: dropButtonY }
    };
    
    const dropButton = this.createMobileButton(dropButtonConfig, false, true); // Modern theme, drop button
    this.buttons.set(dropButtonConfig.action, dropButton);
    this.container!.add(dropButton.container);
    
    // Create "DROP" label below drop button (centered with button)
    const dropLabel = this.scene.add.text(
      dropButtonX,
      dropButtonY + buttonSize * 0.5 + 12,
      'DROP',
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
    this.container!.add(dropLabel);
  }

  private createModernDPadBackground(container: Phaser.GameObjects.Container, dPadSize: number): void {
    const graphics = this.scene.add.graphics();
    const radius = dPadSize / 2;
    
    // Outer metallic ring with beveled 3D effect
    // Base metallic color
    const metallicBase = 0x888888; // Silver grey
    const metallicLight = 0xCCCCCC; // Light highlight
    const metallicDark = 0x555555; // Dark shadow
    
    // Outer ring (thick, metallic)
    graphics.fillStyle(metallicDark, 1.0);
    graphics.fillCircle(0, 0, radius);
    
    graphics.fillStyle(metallicBase, 1.0);
    graphics.fillCircle(0, 0, radius - 3);
    
    // Metallic highlight (top-left)
    graphics.fillStyle(metallicLight, 0.8);
    graphics.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.4);
    
    // Inner dark teal circle (deep cyan)
    const innerRadius = radius - 12; // Thickness of ring
    const tealColor = 0x1A4A5C; // Dark teal/cyan
    graphics.fillStyle(tealColor, 1.0);
    graphics.fillCircle(0, 0, innerRadius);
    
    // Subtle gradient effect (lighter on top-left)
    graphics.fillStyle(0x2C6B80, 0.4); // Lighter teal
    graphics.fillCircle(-innerRadius * 0.3, -innerRadius * 0.3, innerRadius * 0.6);
    
    // Cyan glow around outer ring
    graphics.lineStyle(2, 0x66D9EF, 0.6); // Bright cyan glow
    graphics.strokeCircle(0, 0, radius + 2);
    
    // Inner highlight ring
    graphics.lineStyle(1, 0x4DFFFF, 0.4);
    graphics.strokeCircle(0, 0, innerRadius - 2);
    
    // Subtle digital/data effect (small horizontal dashes)
    graphics.fillStyle(0x66D9EF, 0.5);
    const dashY = -innerRadius * 0.4;
    const dashWidth = 8;
    const dashHeight = 2;
    const dashSpacing = 3;
    for (let i = 0; i < 3; i++) {
      const dashX = -innerRadius * 0.3 + (i * (dashWidth + dashSpacing));
      graphics.fillRect(dashX, dashY, dashWidth, dashHeight);
    }
    
    container.add(graphics);
  }

  private createWoodDPadBackground(container: Phaser.GameObjects.Container, buttonSize: number, spacing: number): void {
    const graphics = this.scene.add.graphics();
    
    // Calculate D-Pad container size (spacing * 2 + buttonSize for each dimension)
    const containerWidth = spacing * 2 + buttonSize;
    const containerHeight = spacing * 2 + buttonSize;
    const halfWidth = containerWidth / 2;
    const halfHeight = containerHeight / 2;
    const borderRadius = 15;
    
    // Wood background (dark brown, semi-transparent)
    const woodBaseColor = 0x4A3728; // Dark wood brown
    graphics.fillStyle(woodBaseColor, 0.85);
    graphics.fillRoundedRect(-halfWidth, -halfHeight, containerWidth, containerHeight, borderRadius);
    
    // Subtle wood grain texture (horizontal lines)
    graphics.lineStyle(1, 0x2E2419, 0.2);
    const grainLines = 4;
    for (let i = 1; i < grainLines; i++) {
      const y = -halfHeight + (containerHeight / grainLines) * i;
      graphics.moveTo(-halfWidth + 5, y);
      graphics.lineTo(halfWidth - 5, y);
    }
    graphics.strokePath();
    
    // Cyan border outline (3px)
    graphics.lineStyle(3, 0x66D9EF, 1.0);
    graphics.strokeRoundedRect(-halfWidth, -halfHeight, containerWidth, containerHeight, borderRadius);
    
    // Inner border for depth
    graphics.lineStyle(1, 0x66D9EF, 0.6);
    graphics.strokeRoundedRect(-halfWidth + 2, -halfHeight + 2, containerWidth - 4, containerHeight - 4, borderRadius - 2);
    
    // Subtle beaver watermark (tiny paw print in corners - very low opacity)
    const pawSize = 8;
    const cornerOffset = 10;
    const pawOpacity = 0.05;
    
    // Top-left corner
    graphics.fillStyle(0xDAA520, pawOpacity);
    graphics.fillCircle(-halfWidth + cornerOffset, -halfHeight + cornerOffset, pawSize);
    
    // Top-right corner
    graphics.fillCircle(halfWidth - cornerOffset, -halfHeight + cornerOffset, pawSize);
    
    // Bottom-left corner
    graphics.fillCircle(-halfWidth + cornerOffset, halfHeight - cornerOffset, pawSize);
    
    // Bottom-right corner
    graphics.fillCircle(halfWidth - cornerOffset, halfHeight - cornerOffset, pawSize);
    
    container.add(graphics);
  }

  private createMobileButton(config: MobileButtonConfig, useWoodTheme: boolean = false, isDropButton: boolean = false): MobileButton {
    return new MobileButton(
      this.scene,
      config,
      this.config,
      (action: InputAction) => {
        if (this.onButtonPress) {
          this.onButtonPress(action);
        }
      },
      useWoodTheme,
      isDropButton
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
    } else if (this.config.layout === 'wood-dpad') {
      this.createWoodDPadLayout(gameSize.width, gameSize.height);
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
  private useWoodTheme: boolean = false;
  private isDropButton: boolean = false;
  
  private background: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private pressEffect: Phaser.GameObjects.Graphics;
  
  private isPressed: boolean = false;
  private pressAnimation?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    config: MobileButtonConfig,
    controlsConfig: MobileControlsConfig,
    onPress: (action: InputAction) => void,
    useWoodTheme: boolean = false,
    isDropButton: boolean = false
  ) {
    this.scene = scene;
    this.config = config;
    this.controlsConfig = controlsConfig;
    this.onPress = onPress;
    this.useWoodTheme = useWoodTheme;
    this.isDropButton = isDropButton;
    
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
    let iconColor: string;
    if (this.useWoodTheme) {
      iconColor = '#66D9EF'; // Cyan for wood theme
    } else if (this.controlsConfig.neonStyle) {
      iconColor = `#${this.config.color.toString(16).padStart(6, '0')}`;
    } else {
      iconColor = '#FFFFFF'; // White for modern theme (will stand out on dark buttons)
    }
    
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
    
    if (this.useWoodTheme) {
      // Wood theme button styling
      const borderRadius = 12;
      
      // Base wood color (light wood when not pressed, darker when pressed)
      const woodBaseColor = pressed ? 0xD2B48C : 0xE0C896; // Darker wood when pressed
      const woodDarkColor = 0xBC9A6A;
      const woodLightColor = 0xF5DEB3;
      const cyanGlow = pressed ? 0x4DFFFF : 0x66D9EF; // Brighter cyan when pressed
      
      // Shadow/depth effect (bottom-right)
      this.background.fillStyle(woodDarkColor, 0.8);
      this.background.fillRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size - 4, borderRadius);
      
      // Main button body with wood color
      this.background.fillStyle(woodBaseColor, 1.0);
      this.background.fillRoundedRect(-halfSize, -halfSize, size, size, borderRadius);
      
      // Wood grain texture (horizontal lines)
      if (size > 30) {
        this.background.lineStyle(1, woodDarkColor, 0.3);
        const grainLines = 3;
        for (let i = 1; i < grainLines; i++) {
          const lineY = -halfSize + (size / grainLines) * i;
          this.background.moveTo(-halfSize + 3, lineY);
          this.background.lineTo(halfSize - 3, lineY);
        }
        this.background.strokePath();
      }
      
      // Stronger highlights for 3D effect (top-left)
      this.background.fillStyle(woodLightColor, 0.8);
      this.background.fillRect(-halfSize, -halfSize, size, 4); // Top - 4px thick
      this.background.fillRect(-halfSize, -halfSize, 4, size); // Left - 4px thick
      
      // Stronger shadows for depth (bottom-right)
      this.background.fillStyle(woodDarkColor, 0.7);
      this.background.fillRect(halfSize - 4, -halfSize + 2, 4, size - 2); // Right - 4px
      this.background.fillRect(-halfSize + 2, halfSize - 4, size - 2, 4); // Bottom - 4px
      
      // Cyan border/glow effect
      // Outer soft glow
      this.background.lineStyle(3, cyanGlow, 0.3);
      this.background.strokeRoundedRect(-halfSize - 1, -halfSize - 1, size + 2, size + 2, borderRadius + 1);
      
      // Main border
      this.background.lineStyle(2, cyanGlow, 0.6);
      this.background.strokeRoundedRect(-halfSize, -halfSize, size, size, borderRadius);
      
      // Inner accent
      this.background.lineStyle(1, cyanGlow, 0.4);
      this.background.strokeRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size - 4, borderRadius - 2);
      
      // Subtle corner highlights for elevated appearance
      this.background.fillStyle(cyanGlow, 0.15);
      this.background.fillRect(-halfSize + 1, -halfSize + 1, 2, 2); // Top-left corner
      this.background.fillRect(halfSize - 3, -halfSize + 1, 2, 2); // Top-right corner
      
      // Drop button gets golden accent
      if (this.isDropButton && pressed) {
        this.background.fillStyle(0xDAA520, 0.2); // Golden beaver accent
        this.background.fillRoundedRect(-halfSize + 3, -halfSize + 3, size - 6, size - 6, borderRadius - 3);
      }
    } else if (this.controlsConfig.neonStyle) {
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
      // Modern sleek button design (circular, minimalist)
      const radius = halfSize;
      const borderRadius = 10;
      
      // Modern button: dark background with subtle transparency
      const buttonDark = pressed ? 0x1A1A2E : 0x2A2A4E; // Dark blue-grey, darker when pressed
      const buttonMid = 0x36365A;
      const cyanGlow = pressed ? 0x4DFFFF : 0x66D9EF;
      
      // Subtle outer glow when not pressed
      if (!pressed) {
        this.background.fillStyle(cyanGlow, 0.15);
        this.background.fillCircle(0, 0, radius + 3);
      }
      
      // Main button body (rounded square for modern look)
      this.background.fillStyle(buttonDark, 0.9);
      this.background.fillRoundedRect(-halfSize, -halfSize, size, size, borderRadius);
      
      // Subtle gradient highlight (top-left)
      if (!pressed) {
        this.background.fillStyle(buttonMid, 0.4);
        this.background.fillRoundedRect(-halfSize, -halfSize, size * 0.6, size * 0.6, borderRadius);
      }
      
      // Cyan border (thin, sleek)
      this.background.lineStyle(2, cyanGlow, pressed ? 0.8 : 0.6);
      this.background.strokeRoundedRect(-halfSize, -halfSize, size, size, borderRadius);
      
      // Inner accent ring
      this.background.lineStyle(1, cyanGlow, 0.3);
      this.background.strokeRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size - 4, borderRadius - 2);
      
      // Drop button gets slightly different treatment
      if (this.isDropButton) {
        // Slightly brighter when pressed
        if (pressed) {
          this.background.fillStyle(0x4DFFFF, 0.2);
          this.background.fillRoundedRect(-halfSize + 3, -halfSize + 3, size - 6, size - 6, borderRadius - 3);
        }
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
    
    // Use rectangles for modern and neon styles, circles only for old fallback
    if (this.controlsConfig.neonStyle || !this.useWoodTheme) {
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