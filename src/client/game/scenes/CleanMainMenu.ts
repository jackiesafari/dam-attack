import { Scene, GameObjects } from 'phaser';

export class CleanMainMenu extends Scene {
  private background: GameObjects.Graphics | null = null;
  private beaver: GameObjects.Image | null = null;
  private title: GameObjects.Text | null = null;
  private subtitle: GameObjects.Text | null = null;
  private campaignButton: GameObjects.Container | null = null;
  private classicButton: GameObjects.Container | null = null;
  private instructionsText: GameObjects.Text | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    // Clean slate
    this.background = null;
    this.beaver = null;
    this.title = null;
    this.subtitle = null;
    this.campaignButton = null;
    this.classicButton = null;
    this.instructionsText = null;
  }

  create() {
    // Set dark retro background
    this.cameras.main.setBackgroundColor(0x0A0A0F);

    // Create all elements
    this.createBackground();
    this.createTitle();
    this.createBeaver();
    this.createButtons();
    this.createInstructions();
    this.setupInput();

    // Handle resize
    this.scale.on('resize', () => {
      this.refreshLayout();
    });
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    
    this.background = this.add.graphics();
    
    // Retro 80s gradient background
    const colors = [0x0A0A0F, 0x1A0A2E, 0x2A0F5F, 0x0A0A0F];
    const steps = colors.length;

    for (let i = 0; i < steps; i++) {
      this.background.fillStyle(colors[i] || 0x000000, 1);
      this.background.fillRect(0, (height / steps) * i, width, Math.ceil(height / steps) + 1);
    }

    // Create retro 80s grid effect
    this.background.lineStyle(1, 0x00FFFF, 0.3);
    const gridSize = 40;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.background.moveTo(x, 0);
      this.background.lineTo(x, height);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.background.moveTo(0, y);
      this.background.lineTo(width, y);
    }
    this.background.strokePath();

    // Add neon glow particles
    this.background.fillStyle(0xFF00FF, 0.6);
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      this.background.fillCircle(x, y, size);
    }
  }

  private createTitle(): void {
    const { width, height } = this.scale;

    // Main title
    this.title = this.add.text(width / 2, height * 0.15, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(48, 32, 24),
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 4,
      align: 'center',
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#FF00FF',
        blur: 8,
        fill: true
      }
    }).setOrigin(0.5);

    // Subtitle
    this.subtitle = this.add.text(width / 2, height * 0.22, 'BUILD THE ULTIMATE DAM!', {
      fontFamily: 'Arial Bold',
      fontSize: this.getResponsiveFontSize(18, 14, 12),
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
  }

  private createBeaver(): void {
    const { width, height } = this.scale;

    // Create neon frame for beaver
    const frameX = width / 2;
    const frameY = height * 0.38;
    const frameSize = this.getResponsiveSize(160, 120, 100);

    // Create frame graphics
    const frame = this.add.graphics();
    frame.setDepth(10);

    // Outer frame (neon cyan)
    frame.lineStyle(3, 0x00FFFF);
    frame.strokeRect(frameX - frameSize / 2, frameY - frameSize / 2, frameSize, frameSize);

    // Middle frame (neon magenta glow)
    frame.lineStyle(2, 0xFF00FF);
    frame.strokeRect(frameX - frameSize / 2 + 4, frameY - frameSize / 2 + 4, frameSize - 8, frameSize - 8);

    // Add the beaver image in the center
    try {
      this.beaver = this.add.image(frameX, frameY, 'beaverlogo');
      this.beaver.setOrigin(0.5, 0.5);
      this.beaver.setScale(this.getResponsiveSize(0.3, 0.25, 0.2));
      this.beaver.setDepth(11);
    } catch (error) {
      console.log('Error loading beaver image:', error);
      // Fallback to graphics beaver
      const beaverGraphics = this.add.graphics();
      beaverGraphics.fillStyle(0xA0522D);
      beaverGraphics.fillCircle(frameX, frameY, frameSize / 4);
      beaverGraphics.setDepth(11);
    }
  }

  private createButtons(): void {
    const { width, height } = this.scale;

    // Campaign Mode Button
    this.campaignButton = this.add.container(width / 2, height * 0.58);

    const campaignBg = this.add.graphics();
    const buttonWidth = this.getResponsiveSize(280, 240, 200);
    const buttonHeight = this.getResponsiveSize(60, 50, 40);

    campaignBg.fillStyle(0x1A0A2E, 0.9);
    campaignBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
    campaignBg.lineStyle(3, 0x00FFFF, 1);
    campaignBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);

    const campaignText = this.add.text(0, 0, '🌊 CAMPAIGN MODE', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(20, 16, 14),
      color: '#00FFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.campaignButton.add([campaignBg, campaignText]);
    this.campaignButton.setSize(buttonWidth, buttonHeight);
    this.campaignButton.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);

    // Campaign button events
    this.campaignButton.on('pointerover', () => {
      campaignBg.clear();
      campaignBg.fillStyle(0x2A0F5F, 0.9);
      campaignBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
      campaignBg.lineStyle(4, 0xFF00FF, 1);
      campaignBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
      campaignText.setColor('#FF00FF');
      this.campaignButton?.setScale(1.05);
    });

    this.campaignButton.on('pointerout', () => {
      campaignBg.clear();
      campaignBg.fillStyle(0x1A0A2E, 0.9);
      campaignBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
      campaignBg.lineStyle(3, 0x00FFFF, 1);
      campaignBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
      campaignText.setColor('#00FFFF');
      this.campaignButton?.setScale(1.0);
    });

    this.campaignButton.on('pointerdown', () => {
      console.log('Campaign button clicked - Starting Enhanced Game');
      try {
        this.scene.start('EnhancedGame', { level: 1, mode: 'campaign' });
      } catch (error) {
        console.error('Error starting EnhancedGame:', error);
        // Fallback to regular game
        this.scene.start('Game');
      }
    });

    // Classic Mode Button
    this.classicButton = this.add.container(width / 2, height * 0.68);

    const classicBg = this.add.graphics();
    const classicWidth = this.getResponsiveSize(240, 200, 180);
    const classicHeight = this.getResponsiveSize(50, 40, 35);

    classicBg.fillStyle(0x1A0A2E, 0.7);
    classicBg.fillRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
    classicBg.lineStyle(2, 0xFFD700, 1);
    classicBg.strokeRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);

    const classicText = this.add.text(0, 0, '⚡ CLASSIC MODE', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(16, 14, 12),
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.classicButton.add([classicBg, classicText]);
    this.classicButton.setSize(classicWidth, classicHeight);
    this.classicButton.setInteractive(new Phaser.Geom.Rectangle(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight), Phaser.Geom.Rectangle.Contains);

    // Classic button events
    this.classicButton.on('pointerover', () => {
      classicBg.clear();
      classicBg.fillStyle(0x2A0F5F, 0.8);
      classicBg.fillRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
      classicBg.lineStyle(3, 0xFFD700, 1);
      classicBg.strokeRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
      classicText.setColor('#FFFFFF');
      this.classicButton?.setScale(1.05);
    });

    this.classicButton.on('pointerout', () => {
      classicBg.clear();
      classicBg.fillStyle(0x1A0A2E, 0.7);
      classicBg.fillRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
      classicBg.lineStyle(2, 0xFFD700, 1);
      classicBg.strokeRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
      classicText.setColor('#FFD700');
      this.classicButton?.setScale(1.0);
    });

    this.classicButton.on('pointerdown', () => {
      console.log('Classic button clicked - Starting Game');
      try {
        this.scene.start('Game');
      } catch (error) {
        console.error('Error starting Game:', error);
      }
    });
  }

  private createInstructions(): void {
    const { width, height } = this.scale;

    // Instructions panel
    const panelWidth = Math.min(width * 0.9, 600);
    const panelHeight = this.getResponsiveSize(120, 100, 80);
    const panelX = (width - panelWidth) / 2;
    const panelY = height * 0.8;

    // Panel background
    const instructionsPanel = this.add.graphics();
    instructionsPanel.fillStyle(0x000000, 0.8);
    instructionsPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    instructionsPanel.lineStyle(2, 0xFFFFFF);
    instructionsPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

    // Instructions title
    this.add.text(width / 2, panelY + panelHeight * 0.25, 'HOW TO PLAY', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(24, 20, 16),
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    // Controls text
    this.instructionsText = this.add.text(width / 2, panelY + panelHeight * 0.65, 
      'SPACE: Campaign • C: Classic • L: Leaderboard\n← → ↓: Move • ↑: Rotate • SPACE: Fast Drop', {
      fontFamily: 'Arial',
      fontSize: this.getResponsiveFontSize(14, 12, 10),
      color: '#FFFF00',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);
  }

  private setupInput(): void {
    // Keyboard shortcuts - using createCursorKeys for better compatibility
    const cursors = this.input.keyboard?.createCursorKeys();
    
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      console.log('Key pressed:', event.code);
      
      switch (event.code) {
        case 'Space':
          console.log('Space pressed - Starting Campaign Mode');
          this.scene.start('EnhancedGame', { level: 1, mode: 'campaign' });
          break;
        case 'KeyC':
          console.log('C pressed - Starting Classic Mode');
          this.scene.start('Game');
          break;
        case 'KeyL':
          console.log('L pressed - Starting Leaderboard');
          this.scene.start('Leaderboard');
          break;
      }
    });
  }

  private getResponsiveSize(desktop: number, tablet: number, mobile: number): number {
    const { width } = this.scale;
    
    if (width >= 800) {
      return desktop;
    } else if (width >= 600) {
      return tablet;
    } else {
      return mobile;
    }
  }

  private getResponsiveFontSize(desktop: number, tablet: number, mobile: number): string {
    const size = this.getResponsiveSize(desktop, tablet, mobile);
    return `${size}px`;
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Update background
    if (this.background) {
      this.background.destroy();
      this.createBackground();
    }

    // Update title positions
    if (this.title) {
      this.title.setPosition(width / 2, height * 0.15);
      this.title.setFontSize(this.getResponsiveSize(48, 32, 24));
    }

    if (this.subtitle) {
      this.subtitle.setPosition(width / 2, height * 0.22);
      this.subtitle.setFontSize(this.getResponsiveSize(18, 14, 12));
    }

    // Update beaver position
    if (this.beaver) {
      this.beaver.setPosition(width / 2, height * 0.38);
      this.beaver.setScale(this.getResponsiveSize(0.3, 0.25, 0.2));
    }

    // Update button positions
    if (this.campaignButton) {
      this.campaignButton.setPosition(width / 2, height * 0.58);
    }

    if (this.classicButton) {
      this.classicButton.setPosition(width / 2, height * 0.68);
    }

    // Recreate instructions with new size
    if (this.instructionsText) {
      this.instructionsText.destroy();
      this.createInstructions();
    }
  }
}