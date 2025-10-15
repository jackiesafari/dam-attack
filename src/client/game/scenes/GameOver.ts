import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;
  finalScore: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  linesText: Phaser.GameObjects.Text;
  beaver: Phaser.GameObjects.Graphics;
  restartText: Phaser.GameObjects.Text;
  
  private gameData: any;

  constructor() {
    super('GameOver');
  }

  private createRetroBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    
    // Retro 80s grid
    bg.lineStyle(1, 0x00FFFF, 0.3);
    const gridSize = 40;
    
    for (let x = 0; x <= width; x += gridSize) {
      bg.moveTo(x, 0);
      bg.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      bg.moveTo(0, y);
      bg.lineTo(width, y);
    }
    bg.strokePath();
    
    // Add some neon particles
    bg.fillStyle(0xFF00FF, 0.6);
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      bg.fillCircle(x, y, 2);
    }
  }

  init(data: any) {
    this.gameData = data || { score: 0, level: 1, lines: 0 };
  }

  create() {
    // Configure camera with retro dark background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x0A0A0F);

    // Create retro grid background
    this.createRetroBackground();

    // Game Over text with neon styling
    this.gameover_text = this.add
      .text(0, 0, 'DAM COMPLETE!', {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 6,
        align: 'center',
        shadow: {
          offsetX: 4,
          offsetY: 4,
          color: '#FF00FF',
          blur: 12,
          fill: true
        }
      })
      .setOrigin(0.5);

    // Add glow effect to game over text
    this.add.text(0, 0, 'DAM COMPLETE!', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#FFFFFF',
      stroke: '#00FFFF',
      strokeThickness: 10,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.3);

    // Final score with neon styling
    this.finalScore = this.add
      .text(0, 0, `SCORE: ${this.gameData.score}`, {
        fontFamily: 'Arial Bold',
        fontSize: '32px',
        color: '#FFFF00',
        stroke: '#FF00FF',
        strokeThickness: 3,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#FF00FF',
          blur: 8,
          fill: true
        }
      })
      .setOrigin(0.5);

    // Level and lines completed
    this.levelText = this.add
      .text(0, 0, `LEVEL: ${this.gameData.level}`, {
        fontFamily: 'Arial Bold',
        fontSize: '24px',
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 2,
        align: 'center'
      })
      .setOrigin(0.5);

    this.linesText = this.add
      .text(0, 0, `LINES: ${this.gameData.lines}`, {
        fontFamily: 'Arial Bold',
        fontSize: '24px',
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 2,
        align: 'center'
      })
      .setOrigin(0.5);

    // Happy beaver celebrating - clean pixel art
    this.beaver = this.add.graphics() as any;
    this.drawCelebrationBeaver(0, 0);
    
    // Add celebration sparkles around the beaver
    this.add.rectangle(-40, -40, 4, 4, 0xFFFF00); // Left sparkle
    this.add.rectangle(40, -40, 4, 4, 0xFFFF00); // Right sparkle
    this.add.rectangle(0, -50, 4, 4, 0xFFFF00); // Top sparkle
    this.add.rectangle(-30, 30, 4, 4, 0x00FFFF); // Bottom left sparkle
    this.add.rectangle(30, 30, 4, 4, 0x00FFFF); // Bottom right sparkle

    // Restart instruction with neon styling
    this.restartText = this.add
      .text(0, 0, 'Click anywhere to build another dam!', {
        fontFamily: 'Arial Bold',
        fontSize: '20px',
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 2,
        align: 'center',
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#FF00FF',
          blur: 6,
          fill: true
        }
      })
      .setOrigin(0.5);

    // Initial responsive layout
    this.updateLayout(this.scale.width, this.scale.height);

    // Update layout on canvas resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    // Return to Main Menu on tap / click
    this.input.once('pointerdown', () => {
      this.scene.start('MainMenu');
    });

    // Add keyboard support
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('MainMenu');
    });

    // Add floating animation to restart text
    this.tweens.add({
      targets: this.restartText,
      alpha: { from: 1, to: 0.5 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }

  private drawCelebrationBeaver(x: number, y: number): void {
    if (!this.beaver) return;
    
    this.beaver.clear();
    
    // Medium-sized celebrating beaver
    const pixelSize = 2.5;
    
    const drawPixel = (px: number, py: number, color: number) => {
      this.beaver.fillStyle(color);
      this.beaver.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
    };
    
    // Hat
    drawPixel(-5, -8, 0xFF8C00); drawPixel(-4, -8, 0xFF8C00); drawPixel(-3, -8, 0xFF8C00);
    drawPixel(-2, -8, 0xFF8C00); drawPixel(-1, -8, 0xFF8C00); drawPixel(0, -8, 0xFF8C00);
    drawPixel(1, -8, 0xFF8C00); drawPixel(2, -8, 0xFF8C00); drawPixel(3, -8, 0xFF8C00);
    drawPixel(4, -8, 0xFF8C00);
    
    // Head
    drawPixel(-4, -6, 0x8B4513); drawPixel(-3, -6, 0x8B4513); drawPixel(-2, -6, 0x8B4513);
    drawPixel(-1, -6, 0x8B4513); drawPixel(0, -6, 0x8B4513); drawPixel(1, -6, 0x8B4513);
    drawPixel(2, -6, 0x8B4513); drawPixel(3, -6, 0x8B4513);
    
    // Eyes (happy)
    drawPixel(-3, -4, 0x000000); drawPixel(-2, -4, 0x000000);
    drawPixel(1, -4, 0x000000); drawPixel(2, -4, 0x000000);
    
    // Nose
    drawPixel(-1, -3, 0x000000); drawPixel(0, -3, 0x000000);
    
    // Happy mouth/teeth
    drawPixel(-2, -1, 0x87CEEB); drawPixel(-1, -1, 0x87CEEB);
    drawPixel(0, -1, 0x87CEEB); drawPixel(1, -1, 0x87CEEB);
    
    // Body
    drawPixel(-3, 1, 0x8B4513); drawPixel(-2, 1, 0x8B4513); drawPixel(-1, 1, 0x8B4513);
    drawPixel(0, 1, 0x8B4513); drawPixel(1, 1, 0x8B4513); drawPixel(2, 1, 0x8B4513);
    
    // Tail
    drawPixel(-5, 2, 0x8B4513); drawPixel(-4, 2, 0x8B4513); drawPixel(-3, 2, 0x8B4513);
    
    // Log in paws
    drawPixel(4, 0, 0x8B4513); drawPixel(5, 0, 0x8B4513); drawPixel(6, 0, 0x8B4513);
  }

  private updateLayout(width: number, height: number): void {
    // Resize camera viewport
    this.cameras.resize(width, height);

    // Stretch background to fill entire screen
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Compute scale factor
    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    // Position elements
    if (this.gameover_text) {
      this.gameover_text.setPosition(width / 2, height * 0.25);
      this.gameover_text.setScale(scaleFactor);
    }

    if (this.finalScore) {
      this.finalScore.setPosition(width / 2, height * 0.4);
      this.finalScore.setScale(scaleFactor);
    }

    if (this.levelText) {
      this.levelText.setPosition(width / 2 - 80, height * 0.5);
      this.levelText.setScale(scaleFactor);
    }

    if (this.linesText) {
      this.linesText.setPosition(width / 2 + 80, height * 0.5);
      this.linesText.setScale(scaleFactor);
    }

    if (this.beaver) {
      // Redraw beaver at new position
      this.drawCelebrationBeaver(width / 2, height * 0.65);
    }

    if (this.restartText) {
      this.restartText.setPosition(width / 2, height * 0.8);
      this.restartText.setScale(scaleFactor);
    }
  }
}