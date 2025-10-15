import * as Phaser from 'phaser';
import { ThemeManager } from './ThemeManager';

export interface ComponentStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  fontSize?: string;
  fontFamily?: string;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  gradient?: {
    colors: string[];
    direction: 'horizontal' | 'vertical' | 'radial';
  };
}

export class VisualComponents {
  private scene: Phaser.Scene;
  private themeManager: ThemeManager;

  constructor(scene: Phaser.Scene, themeManager: ThemeManager) {
    this.scene = scene;
    this.themeManager = themeManager;
  }

  /**
   * Create a themed button with retro styling
   */
  public createThemedButton(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    text: string,
    onClick?: () => void,
    style?: Partial<ComponentStyle>
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    const theme = this.themeManager.getCurrentTheme();
    
    // Merge default style with custom style
    const buttonStyle: ComponentStyle = {
      backgroundColor: theme.ui.button.background,
      borderColor: theme.ui.button.border,
      borderWidth: 3,
      borderRadius: theme.ui.button.borderRadius,
      textColor: theme.ui.button.text,
      fontSize: '16px',
      fontFamily: theme.fonts.primary,
      shadow: {
        color: 'rgba(0, 0, 0, 0.5)',
        blur: 4,
        offsetX: 2,
        offsetY: 2
      },
      ...style
    };

    // Create button background with gradient effect
    const bg = this.scene.add.graphics();
    this.drawStyledRectangle(bg, -width/2, -height/2, width, height, buttonStyle);
    button.add(bg);

    // Create button text with retro font
    const buttonText = this.scene.add.text(0, 0, text, {
      fontFamily: buttonStyle.fontFamily,
      fontSize: buttonStyle.fontSize,
      color: buttonStyle.textColor,
      stroke: '#000000',
      strokeThickness: 2,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 2,
        fill: true
      }
    }).setOrigin(0.5);
    button.add(buttonText);

    // Add interactive behavior
    if (onClick) {
      button.setInteractive(
        new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
        Phaser.Geom.Rectangle.Contains
      );

      // Hover effects
      button.on('pointerover', () => {
        bg.clear();
        const hoverStyle = {
          ...buttonStyle,
          backgroundColor: theme.ui.button.backgroundHover
        };
        this.drawStyledRectangle(bg, -width/2, -height/2, width, height, hoverStyle);
        button.setScale(1.05);
        
        // Add glow effect for retro theme
        if (theme.name === 'retro-dam') {
          bg.lineStyle(2, this.themeManager.hexToNumber(theme.colors.neon.cyan), 0.8);
          bg.strokeRoundedRect(-width/2, -height/2, width, height, buttonStyle.borderRadius || 0);
        }
      });

      button.on('pointerout', () => {
        bg.clear();
        this.drawStyledRectangle(bg, -width/2, -height/2, width, height, buttonStyle);
        button.setScale(1.0);
      });

      button.on('pointerdown', () => {
        button.setScale(0.95);
        bg.clear();
        const activeStyle = {
          ...buttonStyle,
          backgroundColor: theme.ui.button.backgroundActive
        };
        this.drawStyledRectangle(bg, -width/2, -height/2, width, height, activeStyle);
        onClick();
      });

      button.on('pointerup', () => {
        button.setScale(1.05);
      });
    }

    return button;
  }

  /**
   * Create a themed panel with wood texture styling
   */
  public createThemedPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    style?: Partial<ComponentStyle>
  ): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(x, y);
    const theme = this.themeManager.getCurrentTheme();

    const panelStyle: ComponentStyle = {
      backgroundColor: theme.ui.panel.background,
      borderColor: theme.ui.panel.border,
      borderWidth: 2,
      borderRadius: theme.ui.panel.borderRadius,
      ...style
    };

    const bg = this.scene.add.graphics();
    this.drawStyledRectangle(bg, -width/2, -height/2, width, height, panelStyle);
    
    // Add wood grain effect for retro theme
    if (theme.name === 'retro-dam') {
      this.addWoodGrainEffect(bg, -width/2, -height/2, width, height);
    }
    
    panel.add(bg);
    return panel;
  }

  /**
   * Create neon text with glow effect
   */
  public createNeonText(
    x: number,
    y: number,
    text: string,
    fontSize: string = '24px',
    color?: string
  ): Phaser.GameObjects.Text {
    const theme = this.themeManager.getCurrentTheme();
    const neonColor = color || theme.colors.neon.cyan;

    return this.scene.add.text(x, y, text, {
      fontFamily: theme.fonts.display,
      fontSize: fontSize,
      color: neonColor,
      stroke: neonColor,
      strokeThickness: 1,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: neonColor,
        blur: 10,
        fill: false
      }
    }).setOrigin(0.5);
  }

  /**
   * Create retro title text with multiple glow layers
   */
  public createRetroTitle(
    x: number,
    y: number,
    text: string,
    fontSize: string = '48px'
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const theme = this.themeManager.getCurrentTheme();

    // Create multiple text layers for glow effect
    const glowLayers = [
      { color: theme.colors.neon.magenta, blur: 20, alpha: 0.3 },
      { color: theme.colors.neon.cyan, blur: 15, alpha: 0.5 },
      { color: theme.colors.neon.cyan, blur: 10, alpha: 0.7 },
      { color: '#FFFFFF', blur: 0, alpha: 1.0 }
    ];

    glowLayers.forEach((layer, index) => {
      const textObj = this.scene.add.text(0, 0, text, {
        fontFamily: theme.fonts.display,
        fontSize: fontSize,
        color: layer.color,
        stroke: index === glowLayers.length - 1 ? '#000000' : layer.color,
        strokeThickness: index === glowLayers.length - 1 ? 3 : 0,
        shadow: layer.blur > 0 ? {
          offsetX: 0,
          offsetY: 0,
          color: layer.color,
          blur: layer.blur,
          fill: false
        } : undefined
      }).setOrigin(0.5).setAlpha(layer.alpha);

      container.add(textObj);
    });

    return container;
  }

  /**
   * Create a log-styled piece block
   */
  public createLogBlock(
    x: number,
    y: number,
    size: number,
    woodColor: string,
    hasLeaves: boolean = false
  ): Phaser.GameObjects.Container {
    const block = this.scene.add.container(x, y);
    const theme = this.themeManager.getCurrentTheme();

    // Main log body
    const logBody = this.scene.add.graphics();
    logBody.fillStyle(this.themeManager.hexToNumber(woodColor));
    logBody.fillRoundedRect(-size/2, -size/2, size, size, 4);
    
    // Wood grain lines
    logBody.lineStyle(1, this.themeManager.hexToNumber(this.darkenColor(woodColor, 0.2)), 0.6);
    for (let i = 0; i < 3; i++) {
      const y = -size/2 + (size / 4) * (i + 1);
      logBody.moveTo(-size/2 + 4, y);
      logBody.lineTo(size/2 - 4, y);
    }
    logBody.strokePath();

    // Log end rings
    logBody.lineStyle(2, this.themeManager.hexToNumber(this.darkenColor(woodColor, 0.3)), 0.8);
    logBody.strokeRoundedRect(-size/2, -size/2, size, size, 4);
    
    block.add(logBody);

    // Add leaves if specified
    if (hasLeaves) {
      const leafColor = this.themeManager.getRandomLeafColor();
      const leaves = this.scene.add.graphics();
      leaves.fillStyle(this.themeManager.hexToNumber(leafColor));
      
      // Create small leaf clusters
      for (let i = 0; i < 3; i++) {
        const leafX = (Math.random() - 0.5) * size * 0.6;
        const leafY = (Math.random() - 0.5) * size * 0.6;
        leaves.fillCircle(leafX, leafY, 3);
      }
      
      block.add(leaves);
    }

    return block;
  }

  /**
   * Create water effect background
   */
  public createWaterBackground(
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Graphics {
    const water = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    
    // Base water color
    water.fillGradientStyle(
      this.themeManager.hexToNumber(theme.colors.water),
      this.themeManager.hexToNumber(theme.colors.water),
      this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.2)),
      this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.2))
    );
    water.fillRect(x, y, width, height);

    // Add wave lines
    water.lineStyle(2, this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.3)), 0.6);
    for (let i = 0; i < Math.floor(height / 20); i++) {
      const waveY = y + i * 20;
      water.moveTo(x, waveY);
      for (let j = 0; j < width; j += 10) {
        const waveHeight = Math.sin((j / width) * Math.PI * 4) * 3;
        water.lineTo(x + j, waveY + waveHeight);
      }
    }
    water.strokePath();

    return water;
  }

  /**
   * Draw a styled rectangle with theme properties
   */
  private drawStyledRectangle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    style: ComponentStyle
  ): void {
    graphics.clear();

    // Fill background
    if (style.backgroundColor) {
      if (style.gradient) {
        this.applyGradient(graphics, x, y, width, height, style.gradient);
      } else {
        graphics.fillStyle(this.themeManager.hexToNumber(style.backgroundColor));
      }
      graphics.fillRoundedRect(x, y, width, height, style.borderRadius || 0);
    }

    // Draw border
    if (style.borderColor && style.borderWidth) {
      graphics.lineStyle(style.borderWidth, this.themeManager.hexToNumber(style.borderColor));
      graphics.strokeRoundedRect(x, y, width, height, style.borderRadius || 0);
    }
  }

  /**
   * Apply gradient effect to graphics
   */
  private applyGradient(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    gradient: { colors: string[]; direction: 'horizontal' | 'vertical' | 'radial' }
  ): void {
    if (gradient.colors.length < 2) return;

    const color1 = this.themeManager.hexToNumber(gradient.colors[0]);
    const color2 = this.themeManager.hexToNumber(gradient.colors[1]);

    switch (gradient.direction) {
      case 'horizontal':
        graphics.fillGradientStyle(color1, color2, color1, color2);
        break;
      case 'vertical':
        graphics.fillGradientStyle(color1, color1, color2, color2);
        break;
      case 'radial':
        // Phaser doesn't have built-in radial gradients, so we'll simulate with concentric rectangles
        const steps = 10;
        for (let i = 0; i < steps; i++) {
          const ratio = i / steps;
          const blendedColor = this.blendColors(gradient.colors[0], gradient.colors[1], ratio);
          graphics.fillStyle(this.themeManager.hexToNumber(blendedColor));
          const size = (1 - ratio) * Math.min(width, height);
          graphics.fillRoundedRect(
            x + (width - size) / 2,
            y + (height - size) / 2,
            size,
            size,
            size * 0.1
          );
        }
        return;
    }
  }

  /**
   * Add wood grain texture effect
   */
  private addWoodGrainEffect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Add subtle wood grain lines
    graphics.lineStyle(1, this.themeManager.hexToNumber(theme.colors.wood[1]), 0.3);
    
    for (let i = 0; i < Math.floor(height / 8); i++) {
      const lineY = y + i * 8 + Math.random() * 4;
      graphics.moveTo(x + 5, lineY);
      
      // Create wavy grain lines
      for (let j = 0; j < width - 10; j += 5) {
        const waveOffset = Math.sin((j / width) * Math.PI * 2) * 2;
        graphics.lineTo(x + 5 + j, lineY + waveOffset);
      }
    }
    graphics.strokePath();
  }

  /**
   * Darken a hex color by a percentage
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Blend two hex colors
   */
  private blendColors(color1: string, color2: string, ratio: number): string {
    const hex1 = parseInt(color1.replace('#', ''), 16);
    const hex2 = parseInt(color2.replace('#', ''), 16);
    
    const r1 = (hex1 >> 16) & 255;
    const g1 = (hex1 >> 8) & 255;
    const b1 = hex1 & 255;
    
    const r2 = (hex2 >> 16) & 255;
    const g2 = (hex2 >> 8) & 255;
    const b2 = hex2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}