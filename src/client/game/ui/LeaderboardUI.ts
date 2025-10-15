import * as Phaser from 'phaser';
import { UIManager } from '../managers/UIManager';
import { ScoreManager, LeaderboardOptions } from '../managers/ScoreManager';
import { ScoreEntry } from '../types/GameTypes';

export interface LeaderboardConfig {
  title?: string;
  maxEntries?: number;
  showPagination?: boolean;
  showPlayerStats?: boolean;
  showRefreshButton?: boolean;
  entriesPerPage?: number;
}

export interface LeaderboardCallbacks {
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

export class LeaderboardUI {
  private scene: Phaser.Scene;
  private uiManager: UIManager;
  private scoreManager: ScoreManager;
  private modal: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private currentPage: number = 0;
  private config: Required<LeaderboardConfig>;
  private callbacks: LeaderboardCallbacks | null = null;
  private scores: ScoreEntry[] = [];
  private isLoading: boolean = false;

  constructor(scene: Phaser.Scene, uiManager: UIManager, scoreManager: ScoreManager) {
    this.scene = scene;
    this.uiManager = uiManager;
    this.scoreManager = scoreManager;
    
    // Default configuration
    this.config = {
      title: '🏆 Leaderboard',
      maxEntries: 50,
      showPagination: true,
      showPlayerStats: true,
      showRefreshButton: true,
      entriesPerPage: 10
    };
  }

  /**
   * Show the leaderboard with animation
   */
  public async show(config: Partial<LeaderboardConfig> = {}, callbacks: LeaderboardCallbacks): Promise<void> {
    if (this.isVisible) {
      this.hide();
    }

    // Update configuration
    this.config = { ...this.config, ...config };
    this.callbacks = callbacks;
    this.currentPage = 0;
    this.isVisible = true;

    // Load scores
    await this.loadScores();

    // Create the modal
    this.modal = this.createLeaderboardModal();
    
    // Animate in
    this.modal.setAlpha(0);
    this.modal.setScale(0.9);
    
    this.scene.tweens.add({
      targets: this.modal,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
  }

  /**
   * Hide the leaderboard with animation
   */
  public hide(): void {
    if (!this.isVisible || !this.modal) return;

    this.isVisible = false;

    this.scene.tweens.add({
      targets: this.modal,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 250,
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
   * Refresh the leaderboard data
   */
  public async refresh(): Promise<void> {
    if (!this.isVisible) return;

    this.isLoading = true;
    await this.loadScores();
    
    if (this.modal) {
      this.updateLeaderboardContent();
    }
    
    this.isLoading = false;
  }

  /**
   * Check if the leaderboard is currently visible
   */
  public get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Load scores from the score manager
   */
  private async loadScores(): Promise<void> {
    try {
      const options: LeaderboardOptions = {
        limit: this.config.maxEntries,
        sortBy: 'score',
        sortOrder: 'desc'
      };

      this.scores = await this.scoreManager.getLeaderboard(options);
    } catch (error) {
      console.error('Failed to load leaderboard scores:', error);
      this.scores = [];
    }
  }

  /**
   * Create the leaderboard modal
   */
  private createLeaderboardModal(): Phaser.GameObjects.Container {
    const { width, height } = this.scene.scale;
    const isMobile = width < 768;

    const modalWidth = Math.min(500, width - 40);
    const modalHeight = Math.min(600, height - 40);

    const modal = this.uiManager.createModal({
      x: width / 2,
      y: height / 2,
      width: modalWidth,
      height: modalHeight,
      backgroundColor: 0x1a1a2e,
      borderColor: 0xFFD700,
      borderWidth: 3,
      cornerRadius: 15
    });

    // Title
    const title = this.scene.add.text(0, -modalHeight/2 + 40, this.config.title, {
      fontFamily: 'Arial Black',
      fontSize: isMobile ? '22px' : '26px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    modal.add(title);

    // Content container (will be updated dynamically)
    const contentContainer = this.scene.add.container(0, -50);
    contentContainer.setData('contentContainer', true);
    modal.add(contentContainer);

    // Bottom buttons container
    const bottomContainer = this.scene.add.container(0, modalHeight/2 - 50);
    modal.add(bottomContainer);

    // Refresh button (if enabled)
    if (this.config.showRefreshButton) {
      const refreshButton = this.createActionButton({
        text: '🔄 Refresh',
        x: -80,
        y: 0,
        width: 100,
        backgroundColor: 0x4CAF50,
        onClick: async () => {
          await this.handleRefresh();
        }
      });
      bottomContainer.add(refreshButton);
    }

    // Close button
    const closeButton = this.createActionButton({
      text: 'Close',
      x: this.config.showRefreshButton ? 80 : 0,
      y: 0,
      width: 100,
      backgroundColor: 0x666666,
      onClick: () => {
        this.hide();
        this.callbacks!.onClose();
      }
    });
    bottomContainer.add(closeButton);

    // Close button (X) in top-right corner
    const xCloseButton = this.scene.add.text(
      modalWidth/2 - 25, 
      -modalHeight/2 + 25, 
      '✕', 
      {
        fontFamily: 'Arial Black',
        fontSize: '18px',
        color: '#FF4444',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 }
      }
    ).setOrigin(0.5);

    const closeHitArea = isMobile 
      ? new Phaser.Geom.Rectangle(-20, -20, 40, 40)
      : new Phaser.Geom.Rectangle(-15, -15, 30, 30);
    
    xCloseButton.setInteractive(closeHitArea, Phaser.Geom.Rectangle.Contains);
    xCloseButton.on('pointerdown', () => {
      this.hide();
      this.callbacks!.onClose();
    });

    modal.add(xCloseButton);

    // Initial content update
    this.updateLeaderboardContent();

    return modal;
  }

  /**
   * Update the leaderboard content (scores, pagination, etc.)
   */
  private updateLeaderboardContent(): void {
    if (!this.modal) return;

    // Find and clear existing content
    const contentContainer = this.modal.list.find(child => 
      child.getData && child.getData('contentContainer')
    ) as Phaser.GameObjects.Container;

    if (!contentContainer) return;

    contentContainer.removeAll(true);

    const { width } = this.scene.scale;
    const isMobile = width < 768;

    // Show loading state
    if (this.isLoading) {
      const loadingText = this.scene.add.text(0, 0, '⏳ Loading...', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFFFFF'
      }).setOrigin(0.5);
      contentContainer.add(loadingText);
      return;
    }

    // Player stats (if enabled)
    if (this.config.showPlayerStats) {
      const stats = this.scoreManager.getPlayerStats();
      const statsContainer = this.createPlayerStatsDisplay(stats, isMobile);
      statsContainer.setPosition(0, -150);
      contentContainer.add(statsContainer);
    }

    // Scores list
    const scoresContainer = this.createScoresDisplay(isMobile);
    scoresContainer.setPosition(0, this.config.showPlayerStats ? -50 : -100);
    contentContainer.add(scoresContainer);

    // Pagination (if enabled and needed)
    if (this.config.showPagination && this.scores.length > this.config.entriesPerPage) {
      const paginationContainer = this.createPaginationControls(isMobile);
      paginationContainer.setPosition(0, 150);
      contentContainer.add(paginationContainer);
    }
  }

  /**
   * Create player statistics display
   */
  private createPlayerStatsDisplay(stats: any, isMobile: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Stats background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0f3460, 0.8);
    bg.fillRoundedRect(-180, -30, 360, 60, 8);
    bg.lineStyle(1, 0x4CAF50, 0.5);
    bg.strokeRoundedRect(-180, -30, 360, 60, 8);
    container.add(bg);

    // Stats text
    const fontSize = isMobile ? '12px' : '14px';
    const personalBest = stats.personalBest ? stats.personalBest.score.toLocaleString() : 'None';
    
    const statsText = this.scene.add.text(0, -10, 
      `Games: ${stats.totalGames} | Best: ${personalBest} | Avg: ${stats.averageScore.toLocaleString()}`, 
      {
        fontFamily: 'Arial',
        fontSize: fontSize,
        color: '#FFFFFF',
        align: 'center'
      }
    ).setOrigin(0.5);
    container.add(statsText);

    const detailsText = this.scene.add.text(0, 10, 
      `Total Lines: ${stats.totalLines} | Avg Level: ${stats.averageLevel}`, 
      {
        fontFamily: 'Arial',
        fontSize: fontSize,
        color: '#CCCCCC',
        align: 'center'
      }
    ).setOrigin(0.5);
    container.add(detailsText);

    return container;
  }

  /**
   * Create scores display with current page
   */
  private createScoresDisplay(isMobile: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    if (this.scores.length === 0) {
      const noScoresText = this.scene.add.text(0, 0, 
        'No scores yet!\nBe the first to play!', 
        {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#FFFFFF',
          align: 'center'
        }
      ).setOrigin(0.5);
      container.add(noScoresText);
      return container;
    }

    // Calculate pagination
    const startIndex = this.currentPage * this.config.entriesPerPage;
    const endIndex = Math.min(startIndex + this.config.entriesPerPage, this.scores.length);
    const pageScores = this.scores.slice(startIndex, endIndex);

    // Header
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x2c3e50, 0.8);
    headerBg.fillRect(-200, -20, 400, 25);
    container.add(headerBg);

    const headerText = this.scene.add.text(0, -7, 'Rank    Player    Score    Date', {
      fontFamily: 'Arial Black',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FFD700'
    }).setOrigin(0.5);
    container.add(headerText);

    // Score entries
    pageScores.forEach((entry, index) => {
      const globalRank = startIndex + index + 1;
      const y = 10 + (index * 30);
      
      const scoreEntry = this.createScoreEntry(entry, globalRank, y, isMobile);
      container.add(scoreEntry);
    });

    return container;
  }

  /**
   * Create a single score entry display
   */
  private createScoreEntry(entry: ScoreEntry, rank: number, y: number, isMobile: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);

    // Entry background (alternating colors)
    const bgColor = rank % 2 === 0 ? 0x34495e : 0x2c3e50;
    const bg = this.scene.add.graphics();
    bg.fillStyle(bgColor, 0.6);
    bg.fillRect(-200, -12, 400, 24);
    
    // Highlight top 3
    if (rank <= 3) {
      const highlightColor = rank === 1 ? 0xFFD700 : rank === 2 ? 0xC0C0C0 : 0xCD7F32;
      bg.lineStyle(2, highlightColor, 0.8);
      bg.strokeRect(-200, -12, 400, 24);
    }
    
    container.add(bg);

    const fontSize = isMobile ? '11px' : '13px';
    const textColor = rank <= 3 ? '#FFD700' : '#FFFFFF';

    // Rank with medal for top 3
    const rankText = rank <= 3 ? 
      `${['🥇', '🥈', '🥉'][rank - 1]} ${rank}` : 
      rank.toString();
    
    const rankDisplay = this.scene.add.text(-170, 0, rankText, {
      fontFamily: 'Arial Black',
      fontSize: fontSize,
      color: textColor
    }).setOrigin(0, 0.5);
    container.add(rankDisplay);

    // Player name
    const playerName = entry.username || 'Anonymous';
    const nameDisplay = this.scene.add.text(-100, 0, 
      playerName.length > 12 ? playerName.substring(0, 12) + '...' : playerName, 
      {
        fontFamily: 'Arial',
        fontSize: fontSize,
        color: '#FFFFFF'
      }
    ).setOrigin(0, 0.5);
    container.add(nameDisplay);

    // Score
    const scoreDisplay = this.scene.add.text(20, 0, entry.score.toLocaleString(), {
      fontFamily: 'Arial Black',
      fontSize: fontSize,
      color: textColor
    }).setOrigin(0, 0.5);
    container.add(scoreDisplay);

    // Date
    const date = new Date(entry.timestamp);
    const dateStr = isMobile ? 
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
      date.toLocaleDateString();
    
    const dateDisplay = this.scene.add.text(150, 0, dateStr, {
      fontFamily: 'Arial',
      fontSize: fontSize,
      color: '#CCCCCC'
    }).setOrigin(0, 0.5);
    container.add(dateDisplay);

    return container;
  }

  /**
   * Create pagination controls
   */
  private createPaginationControls(isMobile: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    const totalPages = Math.ceil(this.scores.length / this.config.entriesPerPage);
    
    if (totalPages <= 1) return container;

    // Previous button
    if (this.currentPage > 0) {
      const prevButton = this.createActionButton({
        text: '◀ Prev',
        x: -80,
        y: 0,
        width: 70,
        backgroundColor: 0x3498db,
        onClick: () => {
          this.currentPage--;
          this.updateLeaderboardContent();
        }
      });
      container.add(prevButton);
    }

    // Page indicator
    const pageText = this.scene.add.text(0, 0, 
      `Page ${this.currentPage + 1} of ${totalPages}`, 
      {
        fontFamily: 'Arial',
        fontSize: isMobile ? '12px' : '14px',
        color: '#FFFFFF'
      }
    ).setOrigin(0.5);
    container.add(pageText);

    // Next button
    if (this.currentPage < totalPages - 1) {
      const nextButton = this.createActionButton({
        text: 'Next ▶',
        x: 80,
        y: 0,
        width: 70,
        backgroundColor: 0x3498db,
        onClick: () => {
          this.currentPage++;
          this.updateLeaderboardContent();
        }
      });
      container.add(nextButton);
    }

    return container;
  }

  /**
   * Create an action button with consistent styling
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
    const height = 30;
    
    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(config.backgroundColor);
    bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 6);
    bg.lineStyle(1, 0xFFFFFF, 0.3);
    bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 6);
    button.add(bg);
    
    // Button text
    const text = this.scene.add.text(0, 0, config.text, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    button.add(text);
    
    // Interactive area
    button.setInteractive(
      new Phaser.Geom.Rectangle(-config.width/2, -height/2, config.width, height), 
      Phaser.Geom.Rectangle.Contains
    );
    
    // Hover effects
    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.lightenColor(config.backgroundColor, 0.2));
      bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 6);
      bg.lineStyle(1, 0xFFFFFF, 0.5);
      bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 6);
      button.setScale(1.05);
    });
    
    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(config.backgroundColor);
      bg.fillRoundedRect(-config.width/2, -height/2, config.width, height, 6);
      bg.lineStyle(1, 0xFFFFFF, 0.3);
      bg.strokeRoundedRect(-config.width/2, -height/2, config.width, height, 6);
      button.setScale(1.0);
    });
    
    button.on('pointerdown', () => {
      button.setScale(0.95);
      config.onClick();
    });
    
    button.on('pointerup', () => {
      button.setScale(1.05);
    });
    
    return button;
  }

  /**
   * Handle refresh button click
   */
  private async handleRefresh(): Promise<void> {
    if (this.callbacks?.onRefresh) {
      await this.callbacks.onRefresh();
    }
    await this.refresh();
    this.uiManager.showToast('Leaderboard refreshed!', 2000);
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
    this.callbacks = null;
    this.scores = [];
  }
}