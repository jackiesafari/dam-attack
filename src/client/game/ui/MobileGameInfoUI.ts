import * as Phaser from 'phaser';

export interface GameInfoData {
  score: number;
  level: number;
  lines: number;
  nextPiece?: string;
}

export interface MobileGameInfoConfig {
  width: number;
  height: number;
  backgroundColor: number;
  borderColor: number;
  textColor: string;
  fontSize: string;
  compact: boolean;
  neonStyle: boolean;
}

export class MobileGameInfoUI {
  private scene: Phaser.Scene;
  private config: MobileGameInfoConfig;
  private container: Phaser.GameObjects.Container;
  
  private scoreText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private linesText: Phaser.GameObjects.Text;
  private nextPieceText: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config?: Partial<MobileGameInfoConfig>) {
    this.scene = scene;
    
    // Default configuration optimized for mobile
    this.config = {
      width: 120,
      height: 100,
      backgroundColor: 0x000000,
      borderColor: 0x00FFFF,
      textColor: '#00FFFF',
      fontSize: '14px',
      compact: true,
      neonStyle: true,
      ...config
    };
    
    this.container = this.scene.add.container(0, 0);
    this.createUI();
  }

  private createUI(): void {
    this.createBackground();
    this.createTexts();
  }

  private createBackground(): void {
    this.background = this.scene.add.graphics();
    this.drawBackground();
    this.container.add(this.background);
  }

  private drawBackground(): void {
    const { width, height, backgroundColor, borderColor, neonStyle } = this.config;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    this.background.clear();
    
    if (neonStyle) {
      // Neon-styled background with glow effect
      // Outer glow
      this.background.fillStyle(borderColor, 0.2);
      this.background.fillRoundedRect(-halfWidth - 2, -halfHeight - 2, width + 4, height + 4, 6);
      
      // Main background
      this.background.fillStyle(backgroundColor, 0.9);
      this.background.fillRoundedRect(-halfWidth, -halfHeight, width, height, 4);
      
      // Neon border
      this.background.lineStyle(2, borderColor, 1.0);
      this.background.strokeRoundedRect(-halfWidth, -halfHeight, width, height, 4);
      
      // Inner highlight
      this.background.lineStyle(1, 0xFFFFFF, 0.3);
      this.background.strokeRoundedRect(-halfWidth + 2, -halfHeight + 2, width - 4, height - 4, 2);
    } else {
      // Simple background
      this.background.fillStyle(backgroundColor, 0.8);
      this.background.fillRoundedRect(-halfWidth, -halfHeight, width, height, 4);
      this.background.lineStyle(2, borderColor, 0.8);
      this.background.strokeRoundedRect(-halfWidth, -halfHeight, width, height, 4);
    }
  }

  private createTexts(): void {
    const { width, height, textColor, fontSize, compact } = this.config;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Bold',
      fontSize: fontSize,
      color: textColor,
      stroke: '#000000',
      strokeThickness: 1
    };
    
    if (compact) {
      // Compact layout for mobile
      const lineHeight = 16;
      const startY = -halfHeight + 12;
      
      this.scoreText = this.scene.add.text(-halfWidth + 8, startY, 'SCORE: 0', textStyle);
      this.levelText = this.scene.add.text(-halfWidth + 8, startY + lineHeight, 'LVL: 1', textStyle);
      this.linesText = this.scene.add.text(-halfWidth + 8, startY + lineHeight * 2, 'LINES: 0', textStyle);
      this.nextPieceText = this.scene.add.text(-halfWidth + 8, startY + lineHeight * 3, 'NEXT: -', textStyle);
    } else {
      // Standard layout for larger screens
      const lineHeight = 20;
      const startY = -halfHeight + 15;
      
      this.scoreText = this.scene.add.text(-halfWidth + 10, startY, 'SCORE: 0', textStyle);
      this.levelText = this.scene.add.text(-halfWidth + 10, startY + lineHeight, 'LEVEL: 1', textStyle);
      this.linesText = this.scene.add.text(-halfWidth + 10, startY + lineHeight * 2, 'LINES: 0', textStyle);
      this.nextPieceText = this.scene.add.text(-halfWidth + 10, startY + lineHeight * 3, 'NEXT: -', textStyle);
    }
    
    this.container.add([this.scoreText, this.levelText, this.linesText, this.nextPieceText]);
  }

  /**
   * Update game information display
   */
  public updateGameInfo(data: GameInfoData): void {
    if (this.scoreText) {
      this.scoreText.setText(this.config.compact ? `SCORE: ${this.formatNumber(data.score)}` : `SCORE: ${data.score}`);
    }
    
    if (this.levelText) {
      this.levelText.setText(this.config.compact ? `LVL: ${data.level}` : `LEVEL: ${data.level}`);
    }
    
    if (this.linesText) {
      this.linesText.setText(`LINES: ${data.lines}`);
    }
    
    if (this.nextPieceText && data.nextPiece) {
      this.nextPieceText.setText(`NEXT: ${data.nextPiece}`);
    }
  }

  /**
   * Format large numbers for compact display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Update configuration and redraw
   */
  public updateConfig(newConfig: Partial<MobileGameInfoConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.drawBackground();
    
    // Recreate texts with new config
    this.container.remove([this.scoreText, this.levelText, this.linesText, this.nextPieceText]);
    this.scoreText.destroy();
    this.levelText.destroy();
    this.linesText.destroy();
    this.nextPieceText.destroy();
    
    this.createTexts();
  }

  /**
   * Set visibility of the game info panel
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Get the container for positioning
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Animate score increase for visual feedback
   */
  public animateScoreIncrease(): void {
    if (this.scoreText) {
      // Brief scale animation for score feedback
      this.scene.tweens.add({
        targets: this.scoreText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        ease: 'Power2',
        yoyo: true
      });
      
      // Color flash for neon effect
      if (this.config.neonStyle) {
        const originalColor = this.scoreText.style.color;
        this.scoreText.setColor('#FFFF00'); // Flash yellow
        this.scene.time.delayedCall(200, () => {
          this.scoreText.setColor(originalColor);
        });
      }
    }
  }

  /**
   * Animate level up for visual feedback
   */
  public animateLevelUp(): void {
    if (this.levelText) {
      // Pulse animation for level up
      this.scene.tweens.add({
        targets: this.levelText,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0.7,
        duration: 300,
        ease: 'Power2',
        yoyo: true,
        repeat: 1
      });
      
      // Color flash
      if (this.config.neonStyle) {
        const originalColor = this.levelText.style.color;
        this.levelText.setColor('#FF00FF'); // Flash magenta
        this.scene.time.delayedCall(600, () => {
          this.levelText.setColor(originalColor);
        });
      }
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.container.destroy();
  }
}