import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LeaderboardManager } from '../managers/LeaderboardManager';

export class UsernameInput extends Scene {
  private leaderboardManager: LeaderboardManager;
  private gameData: any;
  private inputElement!: HTMLInputElement;
  private submitButton!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;

  constructor() {
    super('UsernameInput');
    this.leaderboardManager = LeaderboardManager.getInstance();
  }

  init(data: any) {
    this.gameData = data || { score: 0, level: 1, lines: 0 };
  }

  async create() {
    const { width, height } = this.scale;

    // Set camera background
    this.cameras.main.setBackgroundColor(0x0A0A0F);

    // Create retro grid background
    this.createRetroBackground();

    // Try to get Reddit username automatically
    const redditUsername = await this.leaderboardManager.getRedditUsername();
    
    if (redditUsername) {
      // User is authenticated with Reddit, auto-submit score
      this.autoSubmitWithRedditUser(redditUsername);
      return;
    }

    // Show manual input form for non-authenticated users
    this.createManualInputForm();
  }

  private async autoSubmitWithRedditUser(username: string) {
    const { width, height } = this.scale;

    // Show submitting message
    this.add.text(width / 2, height * 0.3, 'SUBMITTING SCORE...', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.4, `Reddit User: u/${username}`, {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.5, `Score: ${this.gameData.score}`, {
      fontFamily: 'Arial Bold',
      fontSize: '20px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    try {
      const result = await this.leaderboardManager.submitScore(
        this.gameData.score,
        this.gameData.level,
        this.gameData.lines
      );

      // Pass result to GameOver scene
      this.gameData.username = username;
      this.gameData.submitResult = result;
      this.scene.start('GameOver', this.gameData);
    } catch (error) {
      console.error('Error auto-submitting score:', error);
      // Fall back to manual input
      this.createManualInputForm();
    }
  }

  private createManualInputForm() {
    const { width, height } = this.scale;

    // Title
    this.titleText = this.add.text(width / 2, height * 0.2, 'ENTER REDDIT USERNAME', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    // Instructions
    this.instructionText = this.add.text(width / 2, height * 0.3, 
      'Enter your Reddit username to compete\non the leaderboard with other Redditors!', {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);

    // Score display
    this.add.text(width / 2, height * 0.45, `Your Score: ${this.gameData.score}`, {
      fontFamily: 'Arial Bold',
      fontSize: '20px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    // Create HTML input element
    this.createUsernameInput();

    // Submit button
    this.submitButton = this.add.text(width / 2, height * 0.7, 'Submit Score', {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#00FF00',
      stroke: '#FF00FF',
      strokeThickness: 2,
      backgroundColor: '#003300',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.submitButton.setInteractive();
    this.submitButton.on('pointerdown', () => this.submitScore());
    this.submitButton.on('pointerover', () => this.submitButton.setScale(1.1));
    this.submitButton.on('pointerout', () => this.submitButton.setScale(1.0));

    // Skip button
    this.skipButton = this.add.text(width / 2, height * 0.8, 'Skip (Anonymous)', {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1
    }).setOrigin(0.5);

    this.skipButton.setInteractive();
    this.skipButton.on('pointerdown', () => this.skipToGameOver());
    this.skipButton.on('pointerover', () => this.skipButton.setScale(1.1));
    this.skipButton.on('pointerout', () => this.skipButton.setScale(1.0));

    // Keyboard support
    this.input.keyboard?.on('keydown-ENTER', () => this.submitScore());
    this.input.keyboard?.on('keydown-ESC', () => this.skipToGameOver());

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

  private createUsernameInput() {
    const { width, height } = this.scale;
    
    // Create HTML input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Enter Reddit username (u/username)';
    this.inputElement.maxLength = 20;
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.left = '50%';
    this.inputElement.style.top = '55%';
    this.inputElement.style.transform = 'translate(-50%, -50%)';
    this.inputElement.style.width = '300px';
    this.inputElement.style.height = '40px';
    this.inputElement.style.fontSize = '16px';
    this.inputElement.style.padding = '8px';
    this.inputElement.style.border = '2px solid #00FFFF';
    this.inputElement.style.borderRadius = '5px';
    this.inputElement.style.backgroundColor = '#001122';
    this.inputElement.style.color = '#FFFFFF';
    this.inputElement.style.textAlign = 'center';
    this.inputElement.style.fontFamily = 'Arial, sans-serif';

    document.body.appendChild(this.inputElement);
    this.inputElement.focus();

    // Handle Enter key in input
    this.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.submitScore();
      }
    });
  }

  private async submitScore() {
    const username = this.inputElement.value.trim();
    
    if (!username) {
      this.showError('Please enter a username!');
      return;
    }

    // Clean up username (remove u/ prefix if present)
    const cleanUsername = username.replace(/^u\//, '');
    
    if (cleanUsername.length < 3) {
      this.showError('Username must be at least 3 characters!');
      return;
    }

    // Disable input and show loading
    this.inputElement.disabled = true;
    this.submitButton.setText('Submitting...');
    this.submitButton.setStyle({ color: '#888888' });

    try {
      // Note: For manual input, we can't actually submit to the authenticated endpoint
      // This is a fallback for when Reddit authentication isn't available
      // In a real Devvit app, users should always be authenticated
      
      this.showError('Manual username entry not supported in Devvit apps.\nUsers must be authenticated through Reddit.');
      
      // Clean up and skip to game over
      setTimeout(() => {
        this.cleanup();
        this.gameData.username = cleanUsername;
        this.gameData.submitResult = {
          type: 'submitScore',
          success: false,
          message: 'Authentication required for leaderboard'
        };
        this.scene.start('GameOver', this.gameData);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting score:', error);
      this.showError('Failed to submit score. Please try again.');
      
      // Re-enable input
      this.inputElement.disabled = false;
      this.submitButton.setText('Submit Score');
      this.submitButton.setStyle({ color: '#00FF00' });
    }
  }

  private skipToGameOver() {
    this.cleanup();
    this.scene.start('GameOver', this.gameData);
  }

  private showError(message: string) {
    // Flash the input border red
    this.inputElement.style.borderColor = '#FF0000';
    setTimeout(() => {
      this.inputElement.style.borderColor = '#00FFFF';
    }, 1000);

    // Show error message briefly
    const errorText = this.add.text(this.scale.width / 2, this.scale.height * 0.65, message, {
      fontFamily: 'Arial Bold',
      fontSize: '14px',
      color: '#FF0000',
      stroke: '#FFFFFF',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      errorText.destroy();
    });
  }

  private cleanup() {
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement);
    }
  }

  private updateLayout(width: number, height: number) {
    if (this.titleText) {
      this.titleText.setPosition(width / 2, height * 0.2);
    }
    
    if (this.instructionText) {
      this.instructionText.setPosition(width / 2, height * 0.3);
    }
    
    if (this.submitButton) {
      this.submitButton.setPosition(width / 2, height * 0.7);
    }
    
    if (this.skipButton) {
      this.skipButton.setPosition(width / 2, height * 0.8);
    }

    // Update input position
    if (this.inputElement) {
      this.inputElement.style.left = '50%';
      this.inputElement.style.top = '55%';
    }
  }

  shutdown() {
    this.cleanup();
  }
}