import * as Phaser from 'phaser';
import { UIManager, UIConfig } from '../managers/UIManager';

export interface GameOverData {
  score: number;
  level: number;
  lines: number;
  timestamp: number;
}

export interface GameOverCallbacks {
  onSubmitScore: (data: GameOverData) => Promise<void>;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
  onClose?: () => void;
}

export class GameOverUI {
  private scene: Phaser.Scene;
  private uiManager: UIManager;
  private modal: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private gameOverData: GameOverData | null = null;
  private callbacks: GameOverCallbacks | null = null;

  constructor(scene: Phaser.Scene, uiManager: UIManager) {
    this.scene = scene;
    this.uiManager = uiManager;
  }

  /**
   * Show the game over screen with animation
   */
  public show(data: GameOverData, callbacks: GameOverCallbacks): void {
    if (this.isVisible) {
      this.hide();
    }

    this.gameOverData = data;
    this.callbacks = callbacks;
    this.isVisible = true;

    // Create the modal
    this.modal = this.createGameOverModal();
    
    // Animate in
    this.modal.setAlpha(0);
    this.modal.setScale(0.8);
    
    this.scene.tweens.add({
      targets: this.modal,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    // Add screen shake effect for dramatic impact
    this.scene.cameras.main.shake(200, 0.01);
  }

  /**
   * Hide the game over screen with animation
   */
  public hide(): void {
    if (!this.isVisible || !this.modal) return;

    this.isVisible = false;

    this.scene.tweens.add({
      targets: this.modal,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        if (this.modal) {
          this.uiManager.closeModal(this.modal);
          this.modal = null;
        }
      }
    });
  }

  /**
   * Check if the game over screen is currently visible
   */
  public get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Create the game over modal with all UI elements
   */
  private createGameOverModal(): Phaser.GameObjects.Container {
    if (!this.gameOverData || !this.callbacks) {
      throw new Error('GameOverUI: Missing data or callbacks');
    }

    const { width, height } = this.scene.scale;
    const isMobile = width < 768;

    const modal = this.uiManager.createModal({
      x: width / 2,
      y: height / 2,
      width: Math.min(450, width - 40),
      height: Math.min(400, height - 40),
      backgroundColor: 0x1a1a1a,
      borderColor: 0xFFD700,
      borderWidth: 4,
      cornerRadius: 20
    });

    // Beaver emoji or icon for theme
    const beaverIcon = this.scene.add.text(0, -160, '🦫', {
      fontSize: '48px'
    }).setOrigin(0.5);
    modal.add(beaverIcon);

    // Game Over title with dramatic styling
    const title = this.scene.add.text(0, -120, 'Dam Destroyed!', {
      fontFamily: 'Arial Black',
      fontSize: isMobile ? '28px' : '32px',
      color: '#FF4444',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    }).setOrigin(0.5);
    modal.add(title);

    // Stats container
    const statsContainer = this.scene.add.container(0, -60);
    modal.add(statsContainer);

    // Score display with emphasis
    const scoreText = this.scene.add.text(0, -20, `Final Score: ${this.gameOverData.score.toLocaleString()}`, {
      fontFamily: 'Arial Black',
      fontSize: isMobile ? '20px' : '24px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    statsContainer.add(scoreText);

    // Additional stats
    const levelText = this.scene.add.text(-80, 10, `Level: ${this.gameOverData.level}`, {
      fontFamily: 'Arial',
      fontSize: isMobile ? '14px' : '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    statsContainer.add(levelText);

    const linesText = this.scene.add.text(80, 10, `Lines: ${this.gameOverData.lines}`, {
      fontFamily: 'Arial',
      fontSize: isMobile ? '14px' : '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    statsContainer.add(linesText);

    // Buttons container
    const buttonsContainer = this.scene.add.container(0, 40);
    modal.add(buttonsContainer);

    // Submit Score button with loading state support
    const submitButton = this.createActionButton({
      text: '📊 Submit Score',
      x: 0,
      y: -30,
      width: isMobile ? 200 : 220,
      backgroundColor: 0x4CAF50,
      onClick: async () => {
        await this.handleSubmitScore(submitButton);
      }
    });
    buttonsContainer.add(submitButton);

    // View Leaderboard button
    const leaderboardButton = this.createActionButton({
      text: '🏆 Leaderboard',
      x: -110,
      y: 20,
      width: isMobile ? 90 : 100,
      backgroundColor: 0x2196F3,
      onClick: () => {
        this.hide();
        this.callbacks!.onViewLeaderboard();
      }
    });
    buttonsContainer.add(leaderboardButton);

    // Play Again button
    const playAgainButton = this.createActionButton({
      text: '🔄 Play Again',
      x: 110,
      y: 20,
      width: isMobile ? 90 : 100,
      backgroundColor: 0xFF9800,
      onClick: () => {
        this.hide();
        this.callbacks!.onPlayAgain();
      }
    });
    buttonsContainer.add(playAgainButton);

    // Close button (X) in top-right corner
    const modalWidth = Math.min(450, width - 40);
    const modalHeight = Math.min(400, height - 40);
    const closeButton = this.scene.add.text(
      modalWidth/2 - 25, 
      -modalHeight/2 + 25, 
      '✕', 
      {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#FF4444',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5);

    // Make close button interactive with larger hit area for mobile
    const closeHitArea = isMobile 
      ? new Phaser.Geom.Rectangle(-20, -20, 40, 40)
      : new Phaser.Geom.Rectangle(-15, -15, 30, 30);
    
    closeButton.setInteractive(closeHitArea, Phaser.Geom.Rectangle.Contains);
    
    closeButton.on('pointerover', () => {
      closeButton.setScale(1.1);
      closeButton.setStyle({ backgroundColor: '#330000' });
    });
    
    closeButton.on('pointerout', () => {
      closeButton.setScale(1.0);
      closeButton.setStyle({ backgroundColor: '#000000' });
    });
    
    closeButton.on('pointerdown', () => {
      closeButton.setScale(0.9);
      this.hide();
      if (this.callbacks?.onClose) {
        this.callbacks.onClose();
      }
    });

    modal.add(closeButton);

    // Add floating animation to the beaver icon
    this.scene.tweens.add({
      targets: beaverIcon,
      y: beaverIcon.y - 10,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    return modal;
  }

  /**
   * Create an action button with consistent styling and behavior
   */
  private createActionButton(config: {
    text: string;
    x: number;
    y: number;
    width: number;
    backgroundColor: number;
    onClick: () => void;
  }): Phaser.GameObjects.Container {
    const button = this.scene.add.container(config.x, config.y);
    const height = 40;
    
    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(config.backgroundColor);
    bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 8);
    bg.lineStyle(2, 0xFFFFFF, 0.3);
    bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 8);
    button.add(bg);
    
    // Button text
    const text = this.scene.add.text(0, 0, config.text, {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    button.add(text);
    
    // Interactive area with mobile-friendly padding
    const { width } = this.scene.scale;
    const isMobile = width < 768;
    const hitPadding = isMobile ? 10 : 5;
    
    button.setInteractive(
      new Phaser.Geom.Rectangle(
        -config.width/2 - hitPadding, 
        -height/2 - hitPadding, 
        config.width + hitPadding * 2, 
        height + hitPadding * 2
      ), 
      Phaser.Geom.Rectangle.Contains
    );
    
    // Hover effects
    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.lightenColor(config.backgroundColor, 0.2));
      bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 8);
      bg.lineStyle(2, 0xFFFFFF, 0.5);
      bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 8);
      button.setScale(1.05);
    });
    
    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(config.backgroundColor);
      bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 8);
      bg.lineStyle(2, 0xFFFFFF, 0.3);
      bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 8);
      button.setScale(1.0);
    });
    
    button.on('pointerdown', () => {
      button.setScale(0.95);
      // Haptic feedback for mobile
      if (navigator.vibrate && isMobile) {
        navigator.vibrate(10);
      }
      config.onClick();
    });
    
    button.on('pointerup', () => {
      button.setScale(1.05);
    });
    
    return button;
  }

  /**
   * Handle submit score with loading state and error handling
   */
  private async handleSubmitScore(button: Phaser.GameObjects.Container): Promise<void> {
    if (!this.gameOverData || !this.callbacks) return;

    // Disable button and show loading state
    button.disableInteractive();
    const text = button.getAt(1) as Phaser.GameObjects.Text;
    const originalText = text.text;
    text.setText('⏳ Submitting...');

    try {
      await this.callbacks.onSubmitScore(this.gameOverData);
      
      // Show success feedback
      text.setText('✅ Submitted!');
      this.uiManager.showToast('Score submitted successfully!', 2000);
      
      // Auto-close and show leaderboard after brief delay
      this.scene.time.delayedCall(1000, () => {
        this.hide();
        this.callbacks!.onViewLeaderboard();
      });
      
    } catch (error) {
      console.error('Failed to submit score:', error);
      
      // Show error feedback
      text.setText('❌ Failed');
      this.uiManager.showToast('Failed to submit score. Please try again.', 3000);
      
      // Re-enable button after delay
      this.scene.time.delayedCall(2000, () => {
        text.setText(originalText);
        button.setInteractive();
      });
    }
  }

  /**
   * Utility function to lighten a color
   */
  private lightenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
    const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
    const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
    
    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.modal) {
      this.uiManager.closeModal(this.modal);
      this.modal = null;
    }
    this.isVisible = false;
    this.gameOverData = null;
    this.callbacks = null;
  }
}