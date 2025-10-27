import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LeaderboardManager } from '../managers/LeaderboardManager';
import { LeaderboardEntry } from '../../../shared/types/api';

export class Leaderboard extends Scene {
  private leaderboardManager: LeaderboardManager;
  private backButton!: Phaser.GameObjects.Text;
  private refreshButton!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private loadingText!: Phaser.GameObjects.Text;
  private leaderboardEntries: Phaser.GameObjects.Text[] = [];
  private isLoading: boolean = false;

  constructor() {
    super('Leaderboard');
    this.leaderboardManager = LeaderboardManager.getInstance();
  }

  async create() {
    const { width, height } = this.scale;

    // Set camera background
    this.cameras.main.setBackgroundColor(0x0A0A0F);

    // Create retro grid background
    this.createRetroBackground();

    // Title
    this.titleText = this.add.text(width / 2, 60, 'DAM BUILDERS LEADERBOARD', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    // Add glow effect
    this.add.text(width / 2, 60, 'DAM BUILDERS LEADERBOARD', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#FFFFFF',
      stroke: '#00FFFF',
      strokeThickness: 8
    }).setOrigin(0.5).setAlpha(0.3);

    // Loading text
    this.loadingText = this.add.text(width / 2, 200, 'Loading leaderboard...', {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);

    // Display leaderboard
    await this.displayLeaderboard();

    // Refresh button
    this.refreshButton = this.add.text(width / 2 - 100, height - 50, 'Refresh', {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.refreshButton.setInteractive();
    this.refreshButton.on('pointerdown', () => this.refreshLeaderboard());
    this.refreshButton.on('pointerover', () => this.refreshButton.setScale(1.1));
    this.refreshButton.on('pointerout', () => this.refreshButton.setScale(1.0));

    // Back button
    this.backButton = this.add.text(width / 2 + 100, height - 50, 'Back to Menu', {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.backButton.setInteractive();
    this.backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });

    this.backButton.on('pointerover', () => {
      this.backButton.setScale(1.1);
    });

    this.backButton.on('pointerout', () => {
      this.backButton.setScale(1.0);
    });

    // Keyboard support
    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.start('MainMenu');
    });

    this.input.keyboard?.once('keydown-R', () => {
      this.refreshLeaderboard();
    });

    // Update layout on resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });
  }

  private createRetroBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    
    // Retro 80s grid
    bg.lineStyle(1, 0x00FFFF, 0.2);
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
  }

  private async displayLeaderboard() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const { width } = this.scale;
    
    // Mobile detection
    const isMobile = this.scale.width < 768 || this.scale.height < 600 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // Clear existing entries
    this.leaderboardEntries.forEach(entry => entry.destroy());
    this.leaderboardEntries = [];

    try {
      const leaderboard = await this.leaderboardManager.getLeaderboard(true); // Force refresh
      
      // Hide loading text
      if (this.loadingText) {
        this.loadingText.setVisible(false);
      }

      if (leaderboard.length === 0) {
        const noDataText = this.add.text(width / 2, 200, 'No scores available yet!\n\nYour score was submitted successfully!\nTry refreshing or check back later.', {
          fontFamily: 'Arial Bold',
          fontSize: isMobile ? '18px' : '16px',
          color: '#FFFF00',
          stroke: '#FF00FF',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        this.leaderboardEntries.push(noDataText);
        this.isLoading = false;
        return;
      }

      // Column configuration with proper spacing and widths
      const columnConfig = {
        RANK: { width: isMobile ? 60 : 80, x: 0 },
        USER: { width: isMobile ? 180 : 220, x: 0 },  // Adequate width for usernames
        SCORE: { width: isMobile ? 80 : 100, x: 0 },
        LEVEL: { width: isMobile ? 70 : 80, x: 0 },   // Proper width for LEVEL
        LINES: { width: isMobile ? 70 : 80, x: 0 }    // Proper width for LINES
      };
      
      // Add spacing between columns
      const columnSpacing = isMobile ? 15 : 20;
      
      // Calculate column positions with proper spacing
      const totalTableWidth = columnConfig.RANK.width + columnConfig.USER.width + columnConfig.SCORE.width + columnConfig.LEVEL.width + columnConfig.LINES.width + (columnSpacing * 4);
      const tableStartX = width / 2 - totalTableWidth / 2;
      
      columnConfig.RANK.x = tableStartX + columnConfig.RANK.width / 2;
      columnConfig.USER.x = tableStartX + columnConfig.RANK.width + columnSpacing + columnConfig.USER.width / 2;
      columnConfig.SCORE.x = tableStartX + columnConfig.RANK.width + columnSpacing + columnConfig.USER.width + columnSpacing + columnConfig.SCORE.width / 2;
      columnConfig.LEVEL.x = tableStartX + columnConfig.RANK.width + columnSpacing + columnConfig.USER.width + columnSpacing + columnConfig.SCORE.width + columnSpacing + columnConfig.LEVEL.width / 2;
      columnConfig.LINES.x = tableStartX + columnConfig.RANK.width + columnSpacing + columnConfig.USER.width + columnSpacing + columnConfig.SCORE.width + columnSpacing + columnConfig.LEVEL.width + columnSpacing + columnConfig.LINES.width / 2;

      // Header with mobile-responsive font size
      const headerY = 120;
      const headerFontSize = isMobile ? '18px' : '16px';
      
      // Create individual header texts for each column
      const rankHeader = this.add.text(columnConfig.RANK.x, headerY, 'RANK', {
        fontFamily: 'Courier New',
        fontSize: headerFontSize,
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      const userHeader = this.add.text(columnConfig.USER.x, headerY, 'REDDIT USER', {
        fontFamily: 'Courier New',
        fontSize: headerFontSize,
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      const scoreHeader = this.add.text(columnConfig.SCORE.x, headerY, 'SCORE', {
        fontFamily: 'Courier New',
        fontSize: headerFontSize,
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      const levelHeader = this.add.text(columnConfig.LEVEL.x, headerY, 'LEVEL', {
        fontFamily: 'Courier New',
        fontSize: headerFontSize,
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      const linesHeader = this.add.text(columnConfig.LINES.x, headerY, 'LINES', {
        fontFamily: 'Courier New',
        fontSize: headerFontSize,
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      this.leaderboardEntries.push(rankHeader, userHeader, scoreHeader, levelHeader, linesHeader);

      // Leaderboard entries with proper font size and spacing
      const entryFontSize = isMobile ? '18px' : '16px';  // Restored to 16-18px as requested
      const rowSpacing = isMobile ? 35 : 30;
      const cellPadding = isMobile ? 12 : 15;
      
      leaderboard.forEach((entry, index) => {
        const y = headerY + 40 + (index * rowSpacing);
        const rank = (index + 1).toString();
        
        let displayName;
        if (entry.username === 'Anonymous') {
          displayName = 'Anonymous';
        } else if (entry.username.startsWith('Player_')) {
          displayName = entry.username;
        } else {
          displayName = `u/${entry.username}`;
        }
        
        // Truncate long usernames to fit column width - adjusted for new column width
        const maxUsernameLength = isMobile ? 16 : 20;  // Adjusted for new column widths
        const username = displayName.length > maxUsernameLength ? 
          displayName.substring(0, maxUsernameLength) + '...' : 
          displayName;
        
        const color = index === 0 ? '#FFD700' : // Gold for 1st
                     index === 1 ? '#C0C0C0' : // Silver for 2nd  
                     index === 2 ? '#CD7F32' : // Bronze for 3rd
                     '#FFFFFF'; // White for others

        // Create individual text elements for each column
        const rankText = this.add.text(columnConfig.RANK.x, y, rank, {
          fontFamily: 'Courier New',
          fontSize: entryFontSize,
          color: color,
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        const userText = this.add.text(columnConfig.USER.x, y, username, {
          fontFamily: 'Courier New',
          fontSize: entryFontSize,
          color: '#FFFFFF',
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        const scoreText = this.add.text(columnConfig.SCORE.x, y, entry.score.toString(), {
          fontFamily: 'Courier New',
          fontSize: entryFontSize,
          color: color,
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        const levelText = this.add.text(columnConfig.LEVEL.x, y, entry.level.toString(), {
          fontFamily: 'Courier New',
          fontSize: entryFontSize,
          color: color,
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        const linesText = this.add.text(columnConfig.LINES.x, y, entry.lines.toString(), {
          fontFamily: 'Courier New',
          fontSize: entryFontSize,
          color: color,
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        this.leaderboardEntries.push(rankText, userText, scoreText, levelText, linesText);

        // Add crown for first place
        if (index === 0) {
          const crown = this.add.text(columnConfig.RANK.x - 25, y, '👑', {
            fontSize: entryFontSize
          }).setOrigin(0.5);
          this.leaderboardEntries.push(crown);
        }
      });

      // Add last updated timestamp with mobile-responsive font size
      const lastUpdated = this.add.text(width / 2, headerY + 40 + (leaderboard.length * rowSpacing) + 20, 
        `Last updated: ${new Date().toLocaleTimeString()}`, {
        fontFamily: 'Courier New',
        fontSize: isMobile ? '14px' : '12px',
        color: '#888888',
        stroke: '#000000',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      this.leaderboardEntries.push(lastUpdated);

    } catch (error) {
      console.error('Error displaying leaderboard:', error);
      
      // Hide loading text
      if (this.loadingText) {
        this.loadingText.setVisible(false);
      }

      const errorText = this.add.text(width / 2, 200, 'Failed to load leaderboard.\n\nYour score was submitted successfully!\nPress R to retry or refresh the page.', {
        fontFamily: 'Arial Bold',
        fontSize: isMobile ? '18px' : '14px',
        color: '#FF0000',
        stroke: '#FFFFFF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      this.leaderboardEntries.push(errorText);
    }

    this.isLoading = false;
  }

  private async refreshLeaderboard() {
    if (this.isLoading) return;

    // Show loading indicator
    this.loadingText.setVisible(true);
    this.loadingText.setText('Refreshing...');

    await this.displayLeaderboard();
  }

  private updateLayout(width: number, height: number) {
    if (this.titleText) {
      this.titleText.setPosition(width / 2, 60);
    }
    
    if (this.refreshButton) {
      this.refreshButton.setPosition(width / 2 - 100, height - 50);
    }
    
    if (this.backButton) {
      this.backButton.setPosition(width / 2 + 100, height - 50);
    }
    
    if (this.loadingText) {
      this.loadingText.setPosition(width / 2, 200);
    }
    
    // Redisplay leaderboard with new layout
    this.displayLeaderboard();
  }
}