import * as Phaser from 'phaser';

export interface GameInfoData {
  score: number;
  level: number;
  lines: number;
  nextPiece?: string;
  nextPieceShape?: number[][];
  nextPieceColor?: number;
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
  private nextPiecePreview: Phaser.GameObjects.Container;
  private previewBlockSize: number = 8; // Size of each block in preview (smaller than game blocks)
  private currentPreviewData: { shape?: number[][]; color?: number } = {}; // Store current preview data

  constructor(scene: Phaser.Scene, config?: Partial<MobileGameInfoConfig>) {
    this.scene = scene;
    
    // Default configuration optimized for mobile - reduced width for better board spacing
    this.config = {
      width: 100, // Reduced from 120 to give more space to game board
      height: 120, // Increased from 100 to accommodate next piece preview
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
    this.createNextPiecePreview();
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

  private createNextPiecePreview(): void {
    // Create container for next piece preview
    this.nextPiecePreview = this.scene.add.container(0, 0);
    this.nextPiecePreview.setVisible(false); // Hidden until next piece is available
    this.container.add(this.nextPiecePreview);
  }

  private renderNextPiecePreview(shape: number[][], color: number): void {
    // Clear existing preview blocks
    this.nextPiecePreview.removeAll(true);
    
    if (!shape || shape.length === 0) {
      this.nextPiecePreview.setVisible(false);
      return;
    }

    // Calculate preview dimensions
    const shapeWidth = shape[0]?.length || 0;
    const shapeHeight = shape.length;
    const previewWidth = shapeWidth * this.previewBlockSize;
    const previewHeight = shapeHeight * this.previewBlockSize;
    
    // Center the preview below "NEXT:" text
    // Container coordinates: (0,0) is center, negative Y is up, positive Y is down
    const { width, height, compact } = this.config;
    const halfHeight = height / 2;
    const previewX = 0; // Center horizontally (container is already positioned)
    // Position below "NEXT:" text - "NEXT:" is at startY + lineHeight * 3, so preview goes below that
    const previewY = compact ? 42 : 50; // Position below "NEXT:" text, relative to container center
    
    // Create a small background box for the preview
    const previewBg = this.scene.add.graphics();
    previewBg.fillStyle(0x000000, 0.5);
    previewBg.fillRoundedRect(
      previewX - previewWidth / 2 - 4,
      previewY - previewHeight / 2 - 4,
      previewWidth + 8,
      previewHeight + 8,
      2
    );
    previewBg.lineStyle(1, this.config.borderColor, 0.5);
    previewBg.strokeRoundedRect(
      previewX - previewWidth / 2 - 4,
      previewY - previewHeight / 2 - 4,
      previewWidth + 8,
      previewHeight + 8,
      2
    );
    this.nextPiecePreview.add(previewBg);
    
    // Render each block of the piece
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          const blockX = previewX - previewWidth / 2 + px * this.previewBlockSize;
          const blockY = previewY - previewHeight / 2 + py * this.previewBlockSize;
          
          // Create mini block with wood texture
          const block = this.scene.add.graphics();
          
          // Main wood color
          block.fillStyle(color, 1);
          block.fillRect(blockX, blockY, this.previewBlockSize - 1, this.previewBlockSize - 1);
          
          // Wood grain effect
          const colorObj = Phaser.Display.Color.IntegerToColor(color);
          const lighterColor = Phaser.Display.Color.GetColor32(
            Math.min(255, colorObj.red + 30),
            Math.min(255, colorObj.green + 30),
            Math.min(255, colorObj.blue + 30),
            255
          );
          block.lineStyle(0.5, lighterColor, 0.7);
          
          // Draw wood grain lines
          for (let i = 0; i < 2; i++) {
            const lineY = blockY + (i + 1) * (this.previewBlockSize / 3);
            block.moveTo(blockX, lineY);
            block.lineTo(blockX + this.previewBlockSize - 1, lineY);
          }
          block.strokePath();
          
          // Add border
          block.lineStyle(0.5, 0x000000, 0.5);
          block.strokeRect(blockX, blockY, this.previewBlockSize - 1, this.previewBlockSize - 1);
          
          this.nextPiecePreview.add(block);
        }
      }
    }
    
    this.nextPiecePreview.setVisible(true);
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
    
    if (this.nextPieceText) {
      if (data.nextPiece) {
        this.nextPieceText.setText(`NEXT:`);
      } else {
        this.nextPieceText.setText(`NEXT: -`);
      }
    }
    
    // Update next piece preview
    if (data.nextPieceShape && data.nextPieceColor !== undefined) {
      this.currentPreviewData = { shape: data.nextPieceShape, color: data.nextPieceColor };
      this.renderNextPiecePreview(data.nextPieceShape, data.nextPieceColor);
    } else {
      this.currentPreviewData = {};
      this.nextPiecePreview.setVisible(false);
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
    
    // Recreate preview if it exists
    if (this.nextPiecePreview && this.nextPiecePreview.visible) {
      // Store current piece data before recreating
      const currentData = this.getCurrentPieceData();
      this.nextPiecePreview.removeAll(true);
      if (currentData.shape && currentData.color !== undefined) {
        this.renderNextPiecePreview(currentData.shape, currentData.color);
      }
    }
  }

  private getCurrentPieceData(): { shape?: number[][]; color?: number } {
    return this.currentPreviewData;
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