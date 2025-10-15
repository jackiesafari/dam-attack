import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
  background: GameObjects.Graphics | null = null;
  beaver: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  subtitle: GameObjects.Text | null = null;
  controlsText: GameObjects.Text | null = null;
  startButton: GameObjects.Container | null = null;
  speechBubble: GameObjects.Container | null = null;
  floatingLogs: GameObjects.Container[] = [];
  particles: GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.beaver = null;
    this.title = null;
    this.subtitle = null;
    this.controlsText = null;
    this.startButton = null;
    this.speechBubble = null;
    this.floatingLogs = [];
    this.particles = null;
  }

  create() {
    // Set dark retro background
    this.cameras.main.setBackgroundColor(0x0A0A0F);

    this.createModernBackground();
    this.createModernTitle();
    this.createProminentBeaver();
    this.createModernButton();
    this.createInstructions();

    // Use throttled resize to prevent freezing
    let resizeTimeout: NodeJS.Timeout;
    this.scale.on('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.refreshLayout(), 100);
    });

    // Remove global click handler - let the button handle clicks
    // this.input.once('pointerdown', () => {
    //   this.scene.start('Game');
    // });

    // Add keyboard support
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('Game');
    });
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    // Update all elements to new screen size
    this.updateModernBackground(width, height);
    this.updateModernTitle(width, height);
    this.updateProminentBeaver(width, height);
    this.updateModernButton(width, height);
    this.updateInstructions(width, height);
  }

  private createModernBackground(): void {
    this.background = this.add.graphics();
    this.updateModernBackground(this.scale.width, this.scale.height);
  }

  private updateModernBackground(width: number, height: number): void {
    if (!this.background) return;

    this.background.clear();

    // Retro 80s gradient background
    const colors = [0x0A0A0F, 0x1A0A2E, 0x2A0F5F, 0x0A0A0F];
    const steps = colors.length;

    for (let i = 0; i < steps; i++) {
      this.background.fillStyle(colors[i], 1);
      this.background.fillRect(0, (height / steps) * i, width, (height / steps) + 1);
    }

    // Create retro 80s grid effect
    this.background.lineStyle(1, 0x00FFFF, 0.4);
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
    this.background.fillStyle(0xFF00FF, 0.8);
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      this.background.fillCircle(x, y, size);
    }

    // Add neon geometric shapes
    this.background.fillStyle(0x00FFFF, 0.3);
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 20 + 10;
      this.background.fillRect(x, y, size, size);
    }
  }

  private createModernTitle(): void {
    const { width, height } = this.scale;

    // Retro 80s neon title
    this.title = this.add.text(width / 2, height * 0.15, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: '56px',
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
    }).setOrigin(0.5);

    // Add glow effect to title
    this.add.text(width / 2, height * 0.15, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: '56px',
      color: '#FFFFFF',
      stroke: '#00FFFF',
      strokeThickness: 10,
      align: 'center'
    }).setOrigin(0.5).setAlpha(0.3);

    // Subtitle with neon styling
    this.subtitle = this.add.text(width / 2, height * 0.22, 'BUILD THE ULTIMATE DAM!', {
      fontFamily: 'Arial Bold',
      fontSize: '18px',
      color: '#FFFF00',
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
    }).setOrigin(0.5);

    this.updateModernTitle(width, height);
  }

  private updateModernTitle(width: number, height: number): void {
    if (!this.title || !this.subtitle) return;

    // Better responsive scaling for titles
    const baseScale = Math.min(width / 800, height / 600);
    const titleScale = Math.max(0.7, Math.min(1.3, baseScale)); // Min 70%, Max 130%
    const subtitleScale = Math.max(0.6, Math.min(1.1, baseScale)); // Min 60%, Max 110%

    this.title.setPosition(width / 2, height * 0.15);
    this.title.setScale(titleScale);

    this.subtitle.setPosition(width / 2, height * 0.22);
    this.subtitle.setScale(subtitleScale);
  }

  private createProminentBeaver(): void {
    const { width, height } = this.scale;

    // Create neon frame for beaver
    const frameX = width / 2;
    const frameY = height * 0.45;
    const frameSize = 200;

    // Create frame graphics
    const frame = this.add.graphics();
    frame.setDepth(10); // Put frame above background

    // Outer frame (neon cyan)
    frame.lineStyle(4, 0x00FFFF);
    frame.strokeRect(frameX - frameSize / 2, frameY - frameSize / 2, frameSize, frameSize);

    // Middle frame (neon magenta glow)
    frame.lineStyle(3, 0xFF00FF);
    frame.strokeRect(frameX - frameSize / 2 + 6, frameY - frameSize / 2 + 6, frameSize - 12, frameSize - 12);

    // Inner frame (white glow)
    frame.lineStyle(2, 0xFFFFFF, 0.5);
    frame.strokeRect(frameX - frameSize / 2 + 12, frameY - frameSize / 2 + 12, frameSize - 24, frameSize - 24);

    // Add the beaver image in the center
    try {
      this.beaver = this.add.image(frameX, frameY, 'beaverlogo');
      this.beaver.setOrigin(0.5, 0.5); // Ensure origin is centered
      this.beaver.setScale(0.4);
      this.beaver.setDepth(11); // Put beaver above frame

      console.log('Beaver positioned at:', frameX, frameY);

    } catch (error) {
      console.log('Error loading beaver image:', error);
      // Fallback to text if image fails
      this.add.text(frameX, frameY, 'IMAGE\nERROR', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#FF0000',
        align: 'center'
      }).setOrigin(0.5).setDepth(11);
    }

    this.updateProminentBeaver(width, height);
  }



  private updateProminentBeaver(width: number, height: number): void {
    if (!this.beaver) return;

    // Update beaver position for responsive design
    const frameX = width / 2;
    const frameY = height * 0.45;
    this.beaver.setPosition(frameX, frameY);
  }

  private createModernButton(): void {
    const { width, height } = this.scale;

    this.startButton = this.add.container(width / 2, height * 0.65);

    // Modern button background
    const buttonBg = this.add.graphics();

    // Button with modern styling
    buttonBg.fillStyle(0xFFFFFF);
    buttonBg.fillRoundedRect(-80, -25, 160, 50, 15);

    // Black border
    buttonBg.lineStyle(4, 0x000000);
    buttonBg.strokeRoundedRect(-80, -25, 160, 50, 15);

    // Yellow inner glow
    buttonBg.lineStyle(2, 0xFFD700);
    buttonBg.strokeRoundedRect(-78, -23, 156, 46, 13);

    // Beaver tail icon
    const tailIcon = this.add.graphics();
    tailIcon.fillStyle(0xFFD700);
    tailIcon.fillEllipse(-60, 0, 15, 8);
    tailIcon.fillStyle(0x8B4513);
    tailIcon.fillEllipse(-60, 0, 12, 6);

    // Button text
    const buttonText = this.add.text(0, 0, 'GO!', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#000000',
      stroke: '#FFFFFF',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.startButton.add([buttonBg, tailIcon, buttonText]);

    // Make button interactive with better touch handling
    this.startButton.setInteractive(new Phaser.Geom.Rectangle(-80, -25, 160, 50), Phaser.Geom.Rectangle.Contains);

    // Add visual feedback and better event handling
    this.startButton.on('pointerdown', () => {
      console.log('GO button pressed - starting game');
      this.startButton!.setScale(this.startButton!.scaleX * 0.95, this.startButton!.scaleY * 0.95);
      this.scene.start('Game');
    });

    this.startButton.on('pointerup', () => {
      if (this.startButton) {
        this.startButton.setScale(1, 1);
      }
    });

    this.startButton.on('pointerout', () => {
      if (this.startButton) {
        this.startButton.setScale(1, 1);
      }
    });

    // Modern button animation
    this.tweens.add({
      targets: this.startButton,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.updateModernButton(width, height);
  }

  private updateModernButton(width: number, height: number): void {
    if (!this.startButton) return;

    // Better responsive scaling for button
    const baseScale = Math.min(width / 800, height / 600);
    const buttonScale = Math.max(0.7, Math.min(1.2, baseScale)); // Min 70%, Max 120%
    this.startButton.setPosition(width / 2, height * 0.65);
    this.startButton.setScale(buttonScale);
  }


  private createInstructions(): void {
    const { width, height } = this.scale;

    // Much larger, simpler instructions panel
    const panelWidth = Math.min(width * 0.9, 700);
    const panelHeight = Math.min(height * 0.25, 200);
    const panelX = (width - panelWidth) / 2;
    const panelY = height * 0.72;

    // Simple, high-contrast panel
    const instructionsPanel = this.add.graphics();
    instructionsPanel.fillStyle(0x000000, 0.95); // Almost black for maximum contrast
    instructionsPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    // Bright border for visibility
    instructionsPanel.lineStyle(4, 0xFFFFFF);
    instructionsPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    // Much larger, more readable fonts
    const titleFontSize = Math.max(32, Math.min(48, width / 20));
    const bodyFontSize = Math.max(24, Math.min(32, width / 25));

    // Clear, readable title
    this.controlsText = this.add.text(width / 2, panelY + panelHeight * 0.25, 'HOW TO PLAY', {
      fontFamily: 'Arial Black',
      fontSize: `${titleFontSize}px`,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    // Simple, clear instructions
    this.subtitle = this.add.text(width / 2, panelY + panelHeight * 0.65, '← → ↓: Move • ↑: Rotate • SPACE: Fast Drop', {
      fontFamily: 'Arial Bold',
      fontSize: `${bodyFontSize}px`,
      color: '#FFFF00', // Bright yellow for maximum visibility
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);

    // Leaderboard instruction
    const leaderboardText = this.add.text(width / 2, panelY + panelHeight * 0.85, 'Press L for Leaderboard', {
      fontFamily: 'Arial',
      fontSize: `${Math.max(18, bodyFontSize * 0.75)}px`,
      color: '#00FFFF', // Bright cyan
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);

    this.updateInstructions(width, height);
  }

  private updateInstructions(width: number, height: number): void {
    if (!this.controlsText || !this.subtitle) return;

    // Match the new panel dimensions
    const panelHeight = Math.min(height * 0.25, 200);
    const panelY = height * 0.72;

    // Match the new font sizes
    const titleFontSize = Math.max(32, Math.min(48, width / 20));
    const bodyFontSize = Math.max(24, Math.min(32, width / 25));

    // Update positions and sizes
    this.controlsText.setPosition(width / 2, panelY + panelHeight * 0.25);
    this.controlsText.setStyle({
      fontSize: `${titleFontSize}px`,
      strokeThickness: 4
    });

    this.subtitle.setPosition(width / 2, panelY + panelHeight * 0.65);
    this.subtitle.setStyle({
      fontSize: `${bodyFontSize}px`,
      strokeThickness: 3
    });
  }


}