import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LeaderboardManager } from '../managers/LeaderboardManager';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  victoryText: Phaser.GameObjects.Text;
  damCompleteText: Phaser.GameObjects.Text;
  finalScore: Phaser.GameObjects.Text;
  
  // Dam visualization
  damContainer: Phaser.GameObjects.Container | null = null;
  celebratingBeaver: Phaser.GameObjects.Container | null = null;
  
  // Action buttons
  submitScoreButton: Phaser.GameObjects.Container | null = null;
  viewLeaderboardButton: Phaser.GameObjects.Container | null = null;
  playAgainButton: Phaser.GameObjects.Container | null = null;
  submitAnonymousButton: Phaser.GameObjects.Container | null = null;
  
  // State
  private gameData: any;
  private leaderboardManager: LeaderboardManager;
  private redditUsername: string | null = null;
  private isSubmitting: boolean = false;

  constructor() {
    super('GameOver');
    this.leaderboardManager = LeaderboardManager.getInstance();
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

  private createDamVisualization() {
    const { width, height } = this.scale;
    
    this.damContainer = this.add.container(width / 2, height * 0.4);
    
    // Create dam structure
    const damGraphics = this.add.graphics();
    
    // Dam logs (brown wooden planks)
    damGraphics.fillStyle(0x8B4513);
    for (let i = 0; i < 8; i++) {
      damGraphics.fillRect(-120 + (i * 30), -40, 25, 80);
    }
    
    // Dam supports (darker wood)
    damGraphics.fillStyle(0x654321);
    damGraphics.fillRect(-130, -50, 10, 100);
    damGraphics.fillRect(120, -50, 10, 100);
    
    // Water on both sides (animated)
    const leftWater = this.add.graphics();
    leftWater.fillStyle(0x4169E1, 0.8);
    leftWater.fillRect(-200, -20, 60, 60);
    
    const rightWater = this.add.graphics();
    rightWater.fillStyle(0x4169E1, 0.8);
    rightWater.fillRect(140, -20, 60, 60);
    
    // Celebrating beaver on top of dam
    this.celebratingBeaver = this.add.container(0, -60);
    
    try {
      const beaver = this.add.image(0, 0, 'beaverlogo');
      beaver.setScale(0.3);
      this.celebratingBeaver.add(beaver);
    } catch (error) {
      // Fallback pixel art beaver
      const beaverGraphics = this.add.graphics();
      beaverGraphics.fillStyle(0x8B4513);
      beaverGraphics.fillRect(-10, -10, 20, 20);
      this.celebratingBeaver.add(beaverGraphics);
    }
    
    this.damContainer.add([damGraphics, leftWater, rightWater, this.celebratingBeaver]);
    
    // Animate the celebrating beaver
    this.tweens.add({
      targets: this.celebratingBeaver,
      y: -70,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Animate water
    this.tweens.add({
      targets: [leftWater, rightWater],
      alpha: { from: 0.8, to: 0.6 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createActionButtons() {
    const { width, height } = this.scale;
    
    // Button container at bottom
    const buttonY = height * 0.8;
    const buttonSpacing = width / 4.5; // Adjust spacing for 4 buttons
    const startX = width * 0.1;
    
    console.log('Reddit username detected:', this.redditUsername);
    
    // Submit Score Button - Always show for now (for testing)
    // In production, this should check: if (this.redditUsername)
    this.submitScoreButton = this.createButton(
      startX,
      buttonY,
      '🏆\nSUBMIT\nSCORE',
      '#FFD700',
      '#001122',
      () => this.submitScore(false)
    );
    
    // View Leaderboard Button
    this.viewLeaderboardButton = this.createButton(
      startX + buttonSpacing,
      buttonY,
      '📋\nVIEW\nLEADERBOARD',
      '#00FFFF',
      '#001122',
      () => this.scene.start('Leaderboard')
    );
    
    // Play Again Button
    this.playAgainButton = this.createButton(
      startX + buttonSpacing * 2,
      buttonY,
      '▶️\nPLAY\nAGAIN',
      '#FF69B4',
      '#001122',
      () => this.scene.start('Game')
    );
    
    // Submit Anonymously Button
    this.submitAnonymousButton = this.createButton(
      startX + buttonSpacing * 3,
      buttonY,
      '👤\nSUBMIT\nANONYMOUSLY',
      '#FFFF00',
      '#001122',
      () => this.submitScore(true)
    );
  }

  private createButton(x: number, y: number, text: string, textColor: string, bgColor: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(bgColor).color);
    bg.fillRoundedRect(-50, -30, 100, 60, 10);
    
    // Button border
    bg.lineStyle(3, Phaser.Display.Color.HexStringToColor(textColor).color);
    bg.strokeRoundedRect(-50, -30, 100, 60, 10);
    
    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial Bold',
      fontSize: '12px',
      color: textColor,
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    
    button.add([bg, buttonText]);
    
    // Make interactive
    button.setInteractive(new Phaser.Geom.Rectangle(-50, -30, 100, 60), Phaser.Geom.Rectangle.Contains);
    
    button.on('pointerdown', () => {
      button.setScale(0.95);
      callback();
    });
    
    button.on('pointerup', () => {
      button.setScale(1.0);
    });
    
    button.on('pointerover', () => {
      button.setScale(1.1);
    });
    
    button.on('pointerout', () => {
      button.setScale(1.0);
    });
    
    return button;
  }

  private async submitScore(anonymous: boolean) {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    
    try {
      // Always use the leaderboard manager for both anonymous and authenticated submissions
      const result = await this.leaderboardManager.submitScore(
        this.gameData.score,
        this.gameData.level,
        this.gameData.lines,
        anonymous
      );
      
      // Show result message
      this.showSubmissionResult(result, anonymous);
      
    } catch (error) {
      console.error('Error submitting score:', error);
      this.showSubmissionResult({
        type: 'submitScore',
        success: false,
        message: 'Failed to submit score'
      }, anonymous);
    }
    
    this.isSubmitting = false;
  }

  private showSubmissionResult(result: any, anonymous: boolean) {
    // Create result popup
    const popup = this.add.container(this.scale.width / 2, this.scale.height / 2);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-150, -50, 300, 100, 10);
    bg.lineStyle(3, result.success ? 0x00FF00 : 0xFF0000);
    bg.strokeRoundedRect(-150, -50, 300, 100, 10);
    
    let message = result.message || (result.success ? 'Score submitted!' : 'Submission failed');
    if (result.success && result.rank && !anonymous) {
      message = `Rank #${result.rank}!\n${message}`;
    }
    
    const text = this.add.text(0, 0, message, {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: result.success ? '#00FF00' : '#FF0000',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    
    popup.add([bg, text]);
    
    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      popup.destroy();
    });
  }

  init(data: any) {
    this.gameData = data || { score: 0, level: 1, lines: 0 };
  }

  async create() {
    // Configure camera with retro dark background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x0A0A0F);

    // Create retro grid background
    this.createRetroBackground();

    // Get Reddit username automatically
    try {
      this.redditUsername = await this.leaderboardManager.getRedditUsername();
      console.log('Reddit username result:', this.redditUsername);
    } catch (error) {
      console.error('Error getting Reddit username:', error);
      this.redditUsername = null;
    }

    // Victory text
    this.victoryText = this.add.text(0, 0, 'VICTORY!', {
      fontFamily: 'Arial Black',
      fontSize: '64px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 8,
      align: 'center',
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#FF00FF',
        blur: 15,
        fill: true
      }
    }).setOrigin(0.5);

    // Dam complete text
    this.damCompleteText = this.add.text(0, 0, 'YOUR DAM IS COMPLETE!', {
      fontFamily: 'Arial Bold',
      fontSize: '24px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    // Create dam visualization
    this.createDamVisualization();

    // Score display
    this.finalScore = this.add.text(0, 0, `SCORE: ${this.gameData.score}`, {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center'
    }).setOrigin(0.5);

    // Create action buttons
    this.createActionButtons();

    // Initial layout
    this.updateLayout(this.scale.width, this.scale.height);

    // Update layout on resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });

    // Add keyboard shortcuts
    this.input.keyboard?.on('keydown-L', () => {
      this.scene.start('Leaderboard');
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('Game');
    });
  }



  private updateLayout(width: number, height: number): void {
    // Resize camera viewport
    this.cameras.resize(width, height);

    // Compute scale factor
    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    // Position victory text
    if (this.victoryText) {
      this.victoryText.setPosition(width / 2, height * 0.1);
      this.victoryText.setScale(scaleFactor);
    }

    // Position dam complete text
    if (this.damCompleteText) {
      this.damCompleteText.setPosition(width / 2, height * 0.18);
      this.damCompleteText.setScale(scaleFactor);
    }

    // Position dam visualization
    if (this.damContainer) {
      this.damContainer.setPosition(width / 2, height * 0.4);
      this.damContainer.setScale(scaleFactor);
    }

    // Position score
    if (this.finalScore) {
      this.finalScore.setPosition(width / 2, height * 0.65);
      this.finalScore.setScale(scaleFactor);
    }

    // Reposition buttons
    const buttonY = height * 0.8;
    const buttonSpacing = width / 4.5; // Adjust for 4 buttons
    const startX = width * 0.1;
    
    if (this.submitScoreButton) {
      this.submitScoreButton.setPosition(startX, buttonY);
      this.submitScoreButton.setScale(scaleFactor);
    }
    
    if (this.viewLeaderboardButton) {
      this.viewLeaderboardButton.setPosition(startX + buttonSpacing, buttonY);
      this.viewLeaderboardButton.setScale(scaleFactor);
    }
    
    if (this.playAgainButton) {
      this.playAgainButton.setPosition(startX + buttonSpacing * 2, buttonY);
      this.playAgainButton.setScale(scaleFactor);
    }
    
    if (this.submitAnonymousButton) {
      this.submitAnonymousButton.setPosition(startX + buttonSpacing * 3, buttonY);
      this.submitAnonymousButton.setScale(scaleFactor);
    }
  }
}