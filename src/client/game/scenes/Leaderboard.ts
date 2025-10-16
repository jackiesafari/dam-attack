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
          fontSize: '16px',
          color: '#FFFF00',
          stroke: '#FF00FF',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        this.leaderboardEntries.push(noDataText);
        this.isLoading = false;
        return;
      }

      // Header
      const headerY = 120;
      const headerText = this.add.text(width / 2, headerY, 'RANK  REDDIT USER          SCORE    LEVEL  LINES', {
        fontFamily: 'Courier New',
        fontSize: '18px', // Increased from 14px for better mobile readability
        color: '#00FFFF',
        stroke: '#FF00FF',
        strokeThickness: 1,
        align: 'center'
      }).setOrigin(0.5);
      
      this.leaderboardEntries.push(headerText);

      // Leaderboard entries
      leaderboard.forEach((entry, index) => {
        const y = headerY + 40 + (index * 30);
        const rank = (index + 1).toString().padStart(2, ' ');
        let displayName;
        if (entry.username === 'Anonymous') {
          displayName = 'Anonymous';
        } else if (entry.username.startsWith('Player_')) {
          displayName = entry.username; // Show Player_123456 as is
        } else {
          displayName = `u/${entry.username}`; // Reddit users get u/ prefix
        }
        const username = displayName.substring(0, 17).padEnd(17, ' ');
        const score = entry.score.toString().padStart(8, ' ');
        const level = entry.level.toString().padStart(5, ' ');
        const lines = entry.lines.toString().padStart(5, ' ');
        
        const entryText = `${rank}    ${username}  ${score}    ${level}    ${lines}`;
        
        const color = index === 0 ? '#FFD700' : // Gold for 1st
                     index === 1 ? '#C0C0C0' : // Silver for 2nd  
                     index === 2 ? '#CD7F32' : // Bronze for 3rd
                     '#FFFFFF'; // White for others

        const textObj = this.add.text(width / 2, y, entryText, {
          fontFamily: 'Courier New',
          fontSize: '16px', // Increased from 12px for better mobile readability
          color: color,
          stroke: '#000000',
          strokeThickness: 1,
          align: 'center'
        }).setOrigin(0.5);
        
        this.leaderboardEntries.push(textObj);

        // Add crown for first place
        if (index === 0) {
          const crown = this.add.text(width / 2 - 220, y, '👑', {
            fontSize: '16px'
          }).setOrigin(0.5);
          this.leaderboardEntries.push(crown);
        }
      });

      // Add last updated timestamp
      const lastUpdated = this.add.text(width / 2, headerY + 40 + (leaderboard.length * 30) + 20, 
        `Last updated: ${new Date().toLocaleTimeString()}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888',
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
        fontSize: '14px',
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