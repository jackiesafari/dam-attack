import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
  private background: GameObjects.Graphics | null = null;
  private beaver: GameObjects.Image | null = null;
  private title: GameObjects.Text | null = null;
  private subtitle: GameObjects.Text | null = null;
  private campaignButton: GameObjects.Container | null = null;
  private classicButton: GameObjects.Container | null = null;
  private instructionsPanel: GameObjects.Graphics | null = null;
  private instructionsText: GameObjects.Text | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    // Clean initialization
    this.background = null;
    this.beaver = null;
    this.title = null;
    this.subtitle = null;
    this.campaignButton = null;
    this.classicButton = null;
    this.instructionsPanel = null;
    this.instructionsText = null;
  }

  create() {
    console.log('MainMenu create() called');
    
    // Set dark retro background
    this.cameras.main.setBackgroundColor(0x0A0A0F);

    // Create all elements in order
    this.createBackground();
    this.createTitle();
    this.createBeaver();
    this.createButtons();
    this.createInstructions();
    this.setupKeyboard();
    this.setupGlobalClickTest();

    // Handle resize
    this.scale.on('resize', () => {
      this.refreshLayout();
    });

    console.log('MainMenu setup complete');
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

    // Adjust title position for fullscreen
    const titleY = height >= 900 ? height * 0.12 : height * 0.15;

    // Main title
    this.title = this.add.text(width / 2, titleY, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(48),
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
    const subtitleY = height >= 900 ? height * 0.18 : height * 0.22;
    this.subtitle = this.add.text(width / 2, subtitleY, 'BUILD THE ULTIMATE DAM!', {
      fontFamily: 'Arial Bold',
      fontSize: this.getResponsiveFontSize(18),
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    console.log('Title created at:', width / 2, height * 0.15);
  }

  private createBeaver(): void {
    const { width, height } = this.scale;

    // Create neon frame for beaver
    const frameX = width / 2;
    const frameY = height >= 900 ? height * 0.35 : height * 0.38;
    const frameSize = this.getResponsiveSize(160);

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
      this.beaver.setScale(this.getResponsiveScale(0.3));
      this.beaver.setDepth(11);
      console.log('Beaver created at:', frameX, frameY);
    } catch (error) {
      console.log('Error loading beaver image, creating fallback');
      // Fallback to graphics beaver
      const beaverGraphics = this.add.graphics();
      beaverGraphics.fillStyle(0xA0522D);
      beaverGraphics.fillCircle(frameX, frameY, frameSize / 4);
      beaverGraphics.setDepth(11);
    }
  }

  private createButtons(): void {
    const { width, height } = this.scale;
    console.log('Creating buttons for screen size:', width, 'x', height);

    // Campaign Mode Button - adjust for fullscreen
    const campaignY = height >= 900 ? height * 0.52 : height * 0.58;
    this.campaignButton = this.add.container(width / 2, campaignY);

    const buttonWidth = this.getResponsiveSize(280);
    const buttonHeight = this.getResponsiveSize(60);

    console.log('Campaign button size:', buttonWidth, 'x', buttonHeight);

    const campaignBg = this.add.graphics();
    campaignBg.fillStyle(0x1A0A2E, 0.9);
    campaignBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
    campaignBg.lineStyle(3, 0x00FFFF, 1);
    campaignBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);

    const campaignText = this.add.text(0, 0, '🌊 DAM QUEST', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(20),
      color: '#00FFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.campaignButton.add([campaignBg, campaignText]);
    this.campaignButton.setSize(buttonWidth, buttonHeight);
    this.campaignButton.setInteractive();
    
    // Add a larger invisible hit area for better clicking
    const campaignHitArea = this.add.graphics();
    campaignHitArea.fillStyle(0x000000, 0.01); // Nearly invisible
    campaignHitArea.fillRect(-buttonWidth/2 - 10, -buttonHeight/2 - 10, buttonWidth + 20, buttonHeight + 20);
    this.campaignButton.add(campaignHitArea);

    // Campaign button events
    this.campaignButton.on('pointerover', () => {
      console.log('Campaign button hover detected and styled');
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

    // Multiple event types for better compatibility
    this.campaignButton.on('pointerdown', () => {
      console.log('Campaign button clicked (pointerdown)!');
      this.startCampaignMode();
    });

    this.campaignButton.on('pointerup', () => {
      console.log('Campaign button released (pointerup)!');
    });

    this.campaignButton.on('pointertap', () => {
      console.log('Campaign button tapped (pointertap)!');
      this.startCampaignMode();
    });

    // Classic Mode Button - adjust for fullscreen
    const classicY = height >= 900 ? height * 0.60 : height * 0.68;
    this.classicButton = this.add.container(width / 2, classicY);

    const classicWidth = this.getResponsiveSize(240);
    const classicHeight = this.getResponsiveSize(50);

    console.log('Classic button size:', classicWidth, 'x', classicHeight);

    const classicBg = this.add.graphics();
    classicBg.fillStyle(0x1A0A2E, 0.7);
    classicBg.fillRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);
    classicBg.lineStyle(2, 0xFFD700, 1);
    classicBg.strokeRoundedRect(-classicWidth/2, -classicHeight/2, classicWidth, classicHeight, 10);

    const classicText = this.add.text(0, 0, '⚡ CLASSIC MODE', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(16),
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.classicButton.add([classicBg, classicText]);
    this.classicButton.setSize(classicWidth, classicHeight);
    this.classicButton.setInteractive();
    
    // Add a larger invisible hit area for better clicking
    const classicHitArea = this.add.graphics();
    classicHitArea.fillStyle(0x000000, 0.01); // Nearly invisible
    classicHitArea.fillRect(-classicWidth/2 - 10, -classicHeight/2 - 10, classicWidth + 20, classicHeight + 20);
    this.classicButton.add(classicHitArea);

    // Classic button events
    this.classicButton.on('pointerover', () => {
      console.log('Classic button hover');
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

    // Multiple event types for better compatibility
    this.classicButton.on('pointerdown', () => {
      console.log('Classic button clicked (pointerdown)!');
      this.startClassicMode();
    });

    this.classicButton.on('pointerup', () => {
      console.log('Classic button released (pointerup)!');
    });

    this.classicButton.on('pointertap', () => {
      console.log('Classic button tapped (pointertap)!');
      this.startClassicMode();
    });

    console.log('Buttons created successfully');
  }

  private createInstructions(): void {
    const { width, height } = this.scale;

    // Instructions panel
    const panelWidth = Math.min(width * 0.9, 600);
    const panelHeight = this.getResponsiveSize(120);
    const panelX = (width - panelWidth) / 2;
    const panelY = height >= 900 ? height * 0.75 : height * 0.8;

    // Panel background
    this.instructionsPanel = this.add.graphics();
    this.instructionsPanel.fillStyle(0x000000, 0.8);
    this.instructionsPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.instructionsPanel.lineStyle(2, 0xFFFFFF);
    this.instructionsPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

    // Instructions title
    this.add.text(width / 2, panelY + panelHeight * 0.25, 'HOW TO PLAY', {
      fontFamily: 'Arial Black',
      fontSize: this.getResponsiveFontSize(24),
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    // Controls text
    this.instructionsText = this.add.text(width / 2, panelY + panelHeight * 0.65, 
      'SPACE: Dam Quest • C: Classic • L: Leaderboard\n← → ↓: Move • ↑: Rotate • SPACE: Fast Drop', {
      fontFamily: 'Arial',
      fontSize: this.getResponsiveFontSize(14),
      color: '#FFFF00',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    }).setOrigin(0.5);

    console.log('Instructions created');
  }

  private setupKeyboard(): void {
    console.log('Setting up keyboard input');
    
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      console.log('Key pressed:', event.code);
      
      switch (event.code) {
        case 'Space':
          console.log('Space key - Starting Campaign Mode');
          this.startCampaignMode();
          break;
        case 'KeyC':
          console.log('C key - Starting Classic Mode');
          this.startClassicMode();
          break;
        case 'KeyL':
          console.log('L key - Opening Leaderboard');
          this.scene.start('Leaderboard');
          break;
      }
    });
  }

  private setupGlobalClickTest(): void {
    // Global click detection for debugging
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('Global click detected at:', pointer.x, pointer.y);
    });
  }

  private startCampaignMode(): void {
    console.log('Attempting to start Enhanced Campaign Mode');
    try {
      // Start the enhanced seasonal game
      console.log('Starting EnhancedGame with seasonal features');
      this.scene.start('EnhancedGame', { level: 1, mode: 'campaign' });
    } catch (error) {
      console.error('Error starting EnhancedGame, falling back to regular game:', error);
      // Fallback to regular game if there's an issue
      this.scene.start('Game');
    }
  }

  private startClassicMode(): void {
    console.log('Attempting to start Classic Mode');
    try {
      this.scene.start('Game');
    } catch (error) {
      console.error('Error starting Game:', error);
    }
  }

  private getResponsiveSize(baseSize: number): number {
    const { width, height } = this.scale;
    
    // For very large screens (fullscreen), scale up appropriately
    if (width >= 1400 || height >= 900) {
      return Math.floor(baseSize * 1.3); // Large fullscreen
    } else if (width >= 800) {
      return baseSize; // Desktop
    } else if (width >= 600) {
      return Math.floor(baseSize * 0.85); // Tablet
    } else {
      return Math.floor(baseSize * 0.7); // Mobile
    }
  }

  private getResponsiveScale(baseScale: number): number {
    const { width } = this.scale;
    
    if (width >= 800) {
      return baseScale; // Desktop
    } else if (width >= 600) {
      return baseScale * 0.85; // Tablet
    } else {
      return baseScale * 0.7; // Mobile
    }
  }

  private getResponsiveFontSize(baseSize: number): string {
    const size = this.getResponsiveSize(baseSize);
    return `${size}px`;
  }

  private refreshLayout(): void {
    console.log('Refreshing layout');
    
    // Destroy all existing elements
    if (this.background) this.background.destroy();
    if (this.title) this.title.destroy();
    if (this.subtitle) this.subtitle.destroy();
    if (this.beaver) this.beaver.destroy();
    if (this.campaignButton) this.campaignButton.destroy();
    if (this.classicButton) this.classicButton.destroy();
    if (this.instructionsPanel) this.instructionsPanel.destroy();
    if (this.instructionsText) this.instructionsText.destroy();

    // Recreate everything
    this.createBackground();
    this.createTitle();
    this.createBeaver();
    this.createButtons();
    this.createInstructions();
  }
}
