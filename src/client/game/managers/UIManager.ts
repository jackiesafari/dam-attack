import * as Phaser from 'phaser';
import { ScoreEntry } from '../types/GameTypes';

export interface UIConfig {
  width: number;
  height: number;
  isMobile: boolean;
}

export interface ButtonConfig {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  backgroundColor?: number;
  textColor?: string;
  fontSize?: string;
  onClick: () => void;
}

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  cornerRadius?: number;
}

export class UIManager {
  private scene: Phaser.Scene;
  private config: UIConfig;
  private activeModals: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene, config: UIConfig) {
    this.scene = scene;
    this.config = config;
  }

  /**
   * Update the UI configuration for responsive design
   */
  public updateConfig(config: Partial<UIConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateLayout();
  }

  /**
   * Create a reusable button component
   */
  public createButton(config: ButtonConfig): Phaser.GameObjects.Container {
    const button = this.scene.add.container(config.x, config.y);
    
    // Default styling
    const width = config.width || 200;
    const height = config.height || 50;
    const backgroundColor = config.backgroundColor || 0x8B4513;
    const textColor = config.textColor || '#FFFFFF';
    const fontSize = config.fontSize || '18px';
    
    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(backgroundColor);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
    bg.lineStyle(3, 0xFFD700);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    button.add(bg);
    
    // Button text
    const text = this.scene.add.text(0, 0, config.text, {
      fontFamily: 'Arial Black',
      fontSize: fontSize,
      color: textColor
    }).setOrigin(0.5);
    button.add(text);
    
    // Make interactive with proper hit area for mobile
    const hitArea = this.config.isMobile 
      ? new Phaser.Geom.Rectangle(-width/2 - 10, -height/2 - 10, width + 20, height + 20)
      : new Phaser.Geom.Rectangle(-width/2, -height/2, width, height);
    
    button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    
    // Visual feedback
    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.lightenColor(backgroundColor, 0.2));
      bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
      bg.lineStyle(3, 0xFFD700);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
      button.setScale(1.05);
    });
    
    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(backgroundColor);
      bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
      bg.lineStyle(3, 0xFFD700);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
      button.setScale(1.0);
    });
    
    button.on('pointerdown', () => {
      button.setScale(0.95);
      if (navigator.vibrate && this.config.isMobile) {
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
   * Create a modal panel with background overlay
   */
  public createModal(config: PanelConfig): Phaser.GameObjects.Container {
    const modal = this.scene.add.container(config.x, config.y);
    
    // Background overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-this.config.width/2, -this.config.height/2, this.config.width, this.config.height);
    modal.add(overlay);
    
    // Panel background
    const panel = this.scene.add.graphics();
    const bgColor = config.backgroundColor || 0x2F2F2F;
    const borderColor = config.borderColor || 0xFFD700;
    const borderWidth = config.borderWidth || 3;
    const cornerRadius = config.cornerRadius || 15;
    
    panel.fillStyle(bgColor);
    panel.fillRoundedRect(-config.width/2, -config.height/2, config.width, config.height, cornerRadius);
    panel.lineStyle(borderWidth, borderColor);
    panel.strokeRoundedRect(-config.width/2, -config.height/2, config.width, config.height, cornerRadius);
    modal.add(panel);
    
    // Set high depth to appear on top
    modal.setDepth(1000 + this.activeModals.length * 100);
    
    // Track active modals
    this.activeModals.push(modal);
    
    return modal;
  }

  /**
   * Close a modal and remove it from tracking
   */
  public closeModal(modal: Phaser.GameObjects.Container): void {
    const index = this.activeModals.indexOf(modal);
    if (index > -1) {
      this.activeModals.splice(index, 1);
    }
    modal.destroy();
  }

  /**
   * Close all active modals
   */
  public closeAllModals(): void {
    this.activeModals.forEach(modal => modal.destroy());
    this.activeModals = [];
  }

  /**
   * Create a game over modal
   */
  public createGameOverModal(score: number, onSubmitScore: () => Promise<void>, onViewLeaderboard: () => void, onPlayAgain: () => void): Phaser.GameObjects.Container {
    const modal = this.createModal({
      x: this.config.width / 2,
      y: this.config.height / 2,
      width: Math.min(400, this.config.width - 40),
      height: Math.min(350, this.config.height - 40)
    });
    
    // Title
    const title = this.scene.add.text(0, -140, 'Game Over!', {
      fontFamily: 'Arial Black',
      fontSize: this.config.isMobile ? '24px' : '28px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    modal.add(title);
    
    // Score display
    const scoreText = this.scene.add.text(0, -100, `Final Score: ${score}`, {
      fontFamily: 'Arial',
      fontSize: this.config.isMobile ? '16px' : '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    modal.add(scoreText);
    
    // Submit Score button
    const submitButton = this.createButton({
      text: '📊 Submit Score',
      x: 0,
      y: -50,
      width: this.config.isMobile ? 180 : 200,
      backgroundColor: 0x8B4513,
      onClick: async () => {
        submitButton.disableInteractive();
        await onSubmitScore();
        this.closeModal(modal);
        onViewLeaderboard();
      }
    });
    modal.add(submitButton);
    
    // View Leaderboard button
    const leaderboardButton = this.createButton({
      text: '🏆 View Leaderboard',
      x: 0,
      y: 0,
      width: this.config.isMobile ? 180 : 200,
      backgroundColor: 0x2F4F2F,
      onClick: () => {
        this.closeModal(modal);
        onViewLeaderboard();
      }
    });
    modal.add(leaderboardButton);
    
    // Play Again button
    const playAgainButton = this.createButton({
      text: '🔄 Play Again',
      x: 0,
      y: 50,
      width: this.config.isMobile ? 180 : 200,
      backgroundColor: 0xFF8C00,
      onClick: () => {
        this.closeModal(modal);
        onPlayAgain();
      }
    });
    modal.add(playAgainButton);
    
    // Close button
    const closeButton = this.scene.add.text(
      (Math.min(400, this.config.width - 40) / 2) - 20, 
      -(Math.min(350, this.config.height - 40) / 2) + 20, 
      '✕', 
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FF0000',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5);
    
    const closeHitArea = this.config.isMobile 
      ? new Phaser.Geom.Rectangle(-25, -25, 50, 50)
      : new Phaser.Geom.Rectangle(-15, -15, 30, 30);
    
    closeButton.setInteractive(closeHitArea, Phaser.Geom.Rectangle.Contains);
    closeButton.on('pointerdown', () => {
      this.closeModal(modal);
    });
    
    modal.add(closeButton);
    
    return modal;
  }

  /**
   * Create a leaderboard modal
   */
  public createLeaderboardModal(scores: ScoreEntry[], onClose: () => void): Phaser.GameObjects.Container {
    const modal = this.createModal({
      x: this.config.width / 2,
      y: this.config.height / 2,
      width: Math.min(450, this.config.width - 40),
      height: Math.min(500, this.config.height - 40)
    });
    
    // Title
    const title = this.scene.add.text(0, -220, '🏆 Leaderboard', {
      fontFamily: 'Arial Black',
      fontSize: this.config.isMobile ? '28px' : '26px', // Increased mobile title from 22px to 28px
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    modal.add(title);
    
    // Scores list
    const maxScores = this.config.isMobile ? 8 : 10;
    const displayScores = scores.slice(0, maxScores);
    
    displayScores.forEach((entry, index) => {
      const y = -180 + (index * 35);
      const rank = index + 1;
      
      // Rank and score
      const scoreText = this.scene.add.text(-180, y, 
        `${rank}. ${entry.username || 'Anonymous'} - ${entry.score}`, 
        {
          fontFamily: 'Arial',
          fontSize: this.config.isMobile ? '18px' : '16px', // Increased mobile font from 14px to 18px
          color: rank <= 3 ? '#FFD700' : '#FFFFFF'
        }
      );
      modal.add(scoreText);
      
      // Date
      const date = new Date(entry.timestamp).toLocaleDateString();
      const dateText = this.scene.add.text(150, y, date, {
        fontFamily: 'Arial',
        fontSize: this.config.isMobile ? '16px' : '14px', // Increased mobile font from 12px to 16px
        color: '#CCCCCC'
      });
      modal.add(dateText);
    });
    
    // No scores message
    if (displayScores.length === 0) {
      const noScoresText = this.scene.add.text(0, -50, 'No scores yet!\nBe the first to play!', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFFFFF',
        align: 'center'
      }).setOrigin(0.5);
      modal.add(noScoresText);
    }
    
    // Close button
    const closeButton = this.createButton({
      text: 'Close',
      x: 0,
      y: 200,
      width: 120,
      backgroundColor: 0x666666,
      onClick: () => {
        this.closeModal(modal);
        onClose();
      }
    });
    modal.add(closeButton);
    
    return modal;
  }

  /**
   * Show a toast notification
   */
  public showToast(message: string, duration: number = 3000): void {
    const toast = this.scene.add.container(this.config.width / 2, 100);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-150, -25, 300, 50, 10);
    toast.add(bg);
    
    // Text
    const text = this.scene.add.text(0, 0, message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);
    toast.add(text);
    
    // Set high depth
    toast.setDepth(2000);
    
    // Fade in
    toast.setAlpha(0);
    this.scene.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
    
    // Auto-remove after duration
    this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: toast,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => toast.destroy()
      });
    });
  }

  /**
   * Update layout for responsive design
   */
  private updateLayout(): void {
    // Update positions of active modals
    this.activeModals.forEach(modal => {
      modal.setPosition(this.config.width / 2, this.config.height / 2);
    });
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
    this.closeAllModals();
  }
}