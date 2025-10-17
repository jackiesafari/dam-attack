import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { MobileFirstLayoutSystem } from '../managers/MobileFirstLayoutSystem';
import { MobileControlsUI } from '../ui/MobileControlsUI';
import { InputAction } from '../managers/InputManager';

// Tetris piece shapes (tetrominos) as wood logs and branches
const PIECES = {
  I: { // Long log
    shape: [[1, 1, 1, 1]],
    color: 0x8B4513,
    name: 'log'
  },
  O: { // Square branch bundle
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 0xA0522D,
    name: 'bundle'
  },
  T: { // T-shaped branch
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 0x654321,
    name: 'branch'
  },
  S: { // S-shaped twig
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 0x8FBC8F,
    name: 'twig'
  },
  Z: { // Z-shaped twig
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 0x9ACD32,
    name: 'twig'
  },
  J: { // J-shaped branch
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 0xD2691E,
    name: 'branch'
  },
  L: { // L-shaped branch
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 0xCD853F,
    name: 'branch'
  }
};

type Piece = {
  shape: number[][];
  color: number;
  name: string;
};

export class Game extends Scene {
  // Legacy UI elements (will be replaced by layout system)
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private nextPieceText!: Phaser.GameObjects.Text;
  
  // Mobile-first layout system
  private layoutSystem!: MobileFirstLayoutSystem;
  private mobileControlsUI: MobileControlsUI | null = null;
  
  // Game state
  private isGameOver: boolean = false;
  private isMobileDevice: boolean = false;
  private mobileControls: Phaser.GameObjects.Container | null = null;
  private professionalBeaverDisplay: Phaser.GameObjects.Container | null = null;
  
  // Game board
  private board: number[][] = [];
  private readonly boardWidth = 10;
  private readonly boardHeight = 20;
  private readonly cellSize = 25;
  private readonly boardX = 300;
  private readonly boardY = 100;
  
  // Current piece
  private currentPiece: Piece | null = null;
  private currentX = 0;
  private currentY = 0;
  private nextPiece: Piece | null = null;
  
  // Game timing
  private dropTimer = 0;
  private dropInterval = 800; // milliseconds
  private lastTime = 0;
  
  // Beaver character
  private beaver!: Phaser.GameObjects.Image;
  private beaverContainer!: Phaser.GameObjects.Container;
  private beaverAnimation!: Phaser.Tweens.Tween;
  private beaverMessages: string[] = [
    "Great job building!",
    "Keep stacking those logs!",
    "The dam looks amazing!",
    "You're a natural builder!",
    "Fantastic work!",
    "Dam good job!",
    "Building like a pro!"
  ];
  private encouragementMessages: string[] = [
    "You're doing great!",
    "Keep going, builder!",
    "I believe in you!",
    "Every piece counts!",
    "You've got this!",
    "Nice placement!",
    "Building skills improving!",
    "Don't give up!",
    "The dam needs you!",
    "Perfect spot for that log!",
    "You're getting better!",
    "Keep those logs coming!",
    "I'm cheering for you!",
    "Great effort!",
    "You're learning fast!"
  ];
  private messageText!: Phaser.GameObjects.Text;
  private lastEncouragementTime: number = 0;
  private piecesPlaced: number = 0;
  
  private gameState = {
    score: 0,
    level: 1,
    lines: 0
  };

  constructor() {
    super('Game');
  }

  create() {
    // Detect mobile device
    this.isMobileDevice = this.sys.game.device.os.android || 
                         this.sys.game.device.os.iOS ||
                         'ontouchstart' in window;

    // Initialize mobile-first layout system
    this.initializeLayoutSystem();

    // Initialize game board
    this.initializeBoard();
    
    // Create retro 80s background
    this.createBackground();
    
    // Create beaver character
    this.createBeaver();
    
    // Create game board visual
    this.createBoardVisual();
    
    // Create mobile-first input handlers
    this.createMobileFirstInputHandlers();
    
    // Apply initial layout
    this.applyMobileFirstLayout();
    
    // Start the game
    this.spawnNewPiece();
    this.lastTime = this.time.now;
    this.lastEncouragementTime = this.time.now;
    
    // Initial welcome message from beaver
    this.time.delayedCall(1000, () => {
      this.showRandomEncouragement("Welcome, builder! Let's build an amazing dam together!");
    });
  }

  private initializeLayoutSystem(): void {
    // Create mobile-first layout system
    this.layoutSystem = new MobileFirstLayoutSystem(this, {
      enableResponsiveLayout: true,
      enableMobileOptimizations: true,
      enableNeonStyling: true,
      debugMode: false
    });
    
    // Initialize with current game state
    this.layoutSystem.updateGameInfo({
      score: this.gameState.score,
      level: this.gameState.level,
      lines: this.gameState.lines,
      nextPiece: this.nextPiece?.name || 'log'
    });
  }

  private initializeBoard() {
    this.board = [];
    for (let y = 0; y < this.boardHeight; y++) {
      this.board[y] = [];
      for (let x = 0; x < this.boardWidth; x++) {
        this.board[y][x] = 0;
      }
    }
  }

  private createBackground() {
    // Set camera background color
    this.cameras.main.setBackgroundColor(0x0A0A0F);
    
    // Retro 80s grid background
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00FFFF, 0.3);
    
    // Draw grid
    for (let x = 0; x <= this.scale.width; x += 40) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.scale.height);
    }
    for (let y = 0; y <= this.scale.height; y += 40) {
      graphics.moveTo(0, y);
      graphics.lineTo(this.scale.width, y);
    }
    graphics.strokePath();
    
    // Add some neon glow effects
    const glowGraphics = this.add.graphics();
    glowGraphics.lineStyle(3, 0xFF00FF, 0.1);
    glowGraphics.strokeRect(this.boardX - 5, this.boardY - 5, 
                           this.boardWidth * this.cellSize + 10, 
                           this.boardHeight * this.cellSize + 10);
  }

  private createBeaver() {
    // D-Pad layout constants (matching createDirectMobileControls)
    const dPadCenterX = 145;
    const dPadCenterY = 450;
    const dPadOffset = 90;
    
    // Beaver positioned even higher above D-Pad with maximum dialogue space
    this.beaverContainer = this.add.container(dPadCenterX, 150); // Moved up to y=150 for maximum dialogue space
    this.beaverContainer.setDepth(5); // Lower depth than mobile controls
    
    // Create neon frame for beaver (similar to main menu)
    const frameSize = 120;
    const frame = this.add.graphics();
    
    // Outer neon glow
    frame.lineStyle(4, 0x00FFFF, 0.8);
    frame.strokeRoundedRect(-frameSize/2, -frameSize/2, frameSize, frameSize, 8);
    
    // Inner bright line
    frame.lineStyle(2, 0xFFFFFF, 1);
    frame.strokeRoundedRect(-frameSize/2 + 6, -frameSize/2 + 6, frameSize - 12, frameSize - 12, 6);
    
    this.beaverContainer.add(frame);
    
    // Add the beaver image
    try {
      this.beaver = this.add.image(0, 0, 'beaverlogo');
      this.beaver.setOrigin(0.5, 0.5);
      this.beaver.setScale(0.25); // Smaller than main menu but still prominent
      this.beaverContainer.add(this.beaver);
      
      // Start idle animation - gentle side-to-side movement
      this.startBeaverIdleAnimation();
      
    } catch (error) {
      console.log('Error loading beaver image:', error);
      // Fallback to enhanced pixel art if image fails
      this.createPixelArtBeaver();
    }
    
    // Message text below beaver, above D-Pad with proper spacing and depth
    const messageY = 230; // 80px below beaver center (150 + 80) to avoid overlap
    this.messageText = this.add.text(dPadCenterX, messageY, '', {
      fontFamily: 'Arial Bold',
      fontSize: '12px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1,
      wordWrap: { width: 200 },
      align: 'center'
    }).setOrigin(0.5, 0);
    
    // Set higher depth to ensure text renders in front of beaver
    this.messageText.setDepth(10);
  }

  private createHeader() {
    const { width } = this.scale;
    
    // Retro 80s neon title
    this.add.text(width / 2, 30, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Add glow effect
    this.add.text(width / 2, 30, 'DAM ATTACK', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#00FFFF',
      strokeThickness: 8
    }).setOrigin(0.5).setAlpha(0.3);
    
    // Instructions with neon styling
    this.add.text(width / 2, 65, 
      this.isMobileDevice 
        ? 'Build the dam with logs and branches!'
        : '← → ↓: Move • ↑: Rotate • SPACE: Fast Drop • Build the beaver\'s dam!',
      {
        fontFamily: 'Arial Bold',
        fontSize: '14px',
        color: '#FFFF00',
        stroke: '#FF00FF',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
  }

  private createScoreDisplay() {
    const screenWidth = this.scale.width;
    
    // Neon-styled score display
    this.scoreText = this.add.text(screenWidth - 20, 100, 'SCORE: 0', {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(1, 0);
    
    this.levelText = this.add.text(screenWidth - 20, 125, 'LEVEL: 1', {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(1, 0);
    
    this.linesText = this.add.text(screenWidth - 20, 150, 'LINES: 0', {
      fontFamily: 'Arial Bold',
      fontSize: '16px',
      color: '#00FFFF',
      stroke: '#FF00FF',
      strokeThickness: 2
    }).setOrigin(1, 0);
    
    this.nextPieceText = this.add.text(screenWidth - 20, 175, 'NEXT: log', {
      fontFamily: 'Arial Bold',
      fontSize: '14px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1
    }).setOrigin(1, 0);
  }

  private updateScoreDisplay() {
    // Update legacy display (for backward compatibility)
    if (this.scoreText) this.scoreText.setText(`SCORE: ${this.gameState.score}`);
    if (this.levelText) this.levelText.setText(`LEVEL: ${this.gameState.level}`);
    if (this.linesText) this.linesText.setText(`LINES: ${this.gameState.lines}`);
    
    // Update mobile-first layout system
    if (this.layoutSystem) {
      this.layoutSystem.updateGameInfo({
        score: this.gameState.score,
        level: this.gameState.level,
        lines: this.gameState.lines,
        nextPiece: this.nextPiece?.name || 'log'
      });
    }
  }

  private createBoardVisual() {
    // Draw board border with neon effect
    const border = this.add.graphics();
    border.lineStyle(3, 0x00FFFF, 1);
    border.strokeRect(this.boardX - 2, this.boardY - 2, 
                     this.boardWidth * this.cellSize + 4, 
                     this.boardHeight * this.cellSize + 4);
    
    // Add inner glow
    border.lineStyle(1, 0xFFFFFF, 0.5);
    border.strokeRect(this.boardX - 1, this.boardY - 1, 
                     this.boardWidth * this.cellSize + 2, 
                     this.boardHeight * this.cellSize + 2);
  }

  // Old input handler method removed - using createMobileFirstInputHandlers() instead

  private createMobileFirstInputHandlers(): void {
    // Keyboard input (unchanged)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (this.isGameOver) return;
        
        switch (event.code) {
          case 'ArrowLeft':
            this.handleGameAction(InputAction.MOVE_LEFT);
            break;
          case 'ArrowRight':
            this.handleGameAction(InputAction.MOVE_RIGHT);
            break;
          case 'ArrowDown':
            this.handleGameAction(InputAction.SOFT_DROP);
            break;
          case 'ArrowUp':
            event.preventDefault();
            this.handleGameAction(InputAction.ROTATE);
            break;
          case 'Space':
            event.preventDefault();
            this.handleGameAction(InputAction.HARD_DROP);
            break;
        }
      });
    }

    // ALWAYS create enhanced mobile controls for better UX
    // (works on both mobile and desktop)
    this.createEnhancedMobileControls();
  }

  private createEnhancedMobileControls(): void {
    console.log('🎮 Creating DIRECT mobile controls...');
    
    // Create controls directly without complex systems
    this.createDirectMobileControls();
    
    console.log('✅ Direct mobile controls created successfully');
  }

  private createDirectMobileControls(): void {
    const { width, height } = this.scale;
    
    // Create container for all controls with proper depth management
    const controlsContainer = this.add.container(0, 0);
    controlsContainer.setDepth(2000); // Higher than beaver (1500)
    
    const buttonSize = 90; // Slightly larger for better touch
    const margin = 25;
    
    // D-Pad layout constants
    const dPadCenterX = 145;  // X position for D-Pad center (moved further right for comfortable margin)
    const dPadCenterY = 450;  // Y position for D-Pad center (middle of screen)
    const dPadOffset = 90;    // Distance from center to each button
    
    // Calculate positions for professional layout
    const rightX = width - margin - buttonSize / 2;
    
    // Movement buttons in D-Pad cross pattern
    const movementButtons = [
      // Right arrow - TOP position
      { x: dPadCenterX, y: dPadCenterY - dPadOffset, symbol: '→', action: InputAction.MOVE_RIGHT, type: 'movement' },
      
      // Left arrow - LEFT position  
      { x: dPadCenterX - dPadOffset, y: dPadCenterY, symbol: '←', action: InputAction.MOVE_LEFT, type: 'movement' },
      
      // Down arrow - BOTTOM position
      { x: dPadCenterX, y: dPadCenterY + dPadOffset, symbol: '↓', action: InputAction.SOFT_DROP, type: 'movement' }
    ];
    
    // Right column - action controls with consistent spacing
    const centerY = height / 2;
    const mobileSpacing = 30;
    const buttonSpacing = buttonSize + mobileSpacing * 2;
    
    const rightButtons = [
      // Rotate button positioned to match left side spacing
      { x: rightX, y: centerY + mobileSpacing * 2, symbol: '↻', action: InputAction.ROTATE, type: 'action' },
      // Hard drop with same spacing interval as left side
      { x: rightX, y: centerY + mobileSpacing * 2 + buttonSpacing, symbol: '⬇', action: InputAction.HARD_DROP, type: 'action' }
    ];
    
    // Create professional-looking buttons
    [...movementButtons, ...rightButtons].forEach(btn => {
      const button = this.createProfessionalButton(btn.x, btn.y, btn.symbol, btn.action, btn.type, buttonSize);
      controlsContainer.add(button);
    });
    
    // Skip separate beaver display - use main beaver with messages instead
    
    // Store reference for cleanup
    this.mobileControls = controlsContainer;
    
    console.log('✅ Created professional mobile controls with enhanced beaver display');
  }

  private createProfessionalButton(x: number, y: number, symbol: string, action: InputAction, type: string, size: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Color scheme based on type
    const colors = {
      movement: { primary: 0x00FFFF, secondary: 0x0088CC, glow: 0x00DDFF },
      action: { primary: 0xFF00FF, secondary: 0xCC0088, glow: 0xFF00DD }
    };
    const colorScheme = colors[type] || colors.movement;
    
    // Multi-layer professional button design
    const bg = this.add.graphics();
    
    // Outer glow (subtle)
    bg.fillStyle(colorScheme.glow, 0.15);
    bg.fillRoundedRect(-size/2 - 4, -size/2 - 4, size + 8, size + 8, 12);
    
    // Main button background with gradient effect
    bg.fillStyle(0x0A0A0F, 0.95); // Dark background
    bg.fillRoundedRect(-size/2, -size/2, size, size, 8);
    
    // Inner dark area for depth
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-size/2 + 4, -size/2 + 4, size - 8, size - 8, 6);
    
    // Primary neon border (thick)
    bg.lineStyle(3, colorScheme.primary, 1.0);
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 8);
    
    // Secondary inner border for depth
    bg.lineStyle(1, colorScheme.secondary, 0.8);
    bg.strokeRoundedRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4, 6);
    
    // Highlight line for 3D effect
    bg.lineStyle(1, 0xFFFFFF, 0.4);
    bg.strokeRoundedRect(-size/2 + 1, -size/2 + 1, size - 2, size * 0.3, 4);
    
    button.add(bg);
    
    // Professional icon/symbol with better styling
    const iconStyle = {
      fontFamily: 'Arial Black',
      fontSize: `${size * 0.45}px`,
      color: `#${colorScheme.primary.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    };
    
    const icon = this.add.text(0, 0, symbol, iconStyle).setOrigin(0.5);
    button.add(icon);
    
    // Enhanced interaction with professional feedback
    button.setInteractive(new Phaser.Geom.Rectangle(-size/2 - 5, -size/2 - 5, size + 10, size + 10), Phaser.Geom.Rectangle.Contains);
    
    button.on('pointerdown', () => {
      // Smooth press animation
      this.tweens.add({
        targets: button,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        ease: 'Power2'
      });
      
      // Icon glow effect
      this.tweens.add({
        targets: icon,
        alpha: 1.5,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Back.easeOut'
      });
      
      // Enhanced haptic feedback
      if (navigator.vibrate) {
        const patterns = {
          movement: [15],
          action: [25, 10, 15]
        };
        navigator.vibrate(patterns[type] || [20]);
      }
      
      // Execute action
      this.handleGameAction(action);
    });
    
    button.on('pointerup', () => {
      // Smooth release with overshoot
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 120,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: button,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 80,
            ease: 'Power2'
          });
        }
      });
      
      // Reset icon
      this.tweens.add({
        targets: icon,
        alpha: 1.0,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: 'Power2'
      });
    });
    
    button.on('pointerout', () => {
      // Reset if pointer leaves
      button.setScale(1.0);
      icon.setAlpha(1.0);
      icon.setScale(1.0);
    });
    
    return button;
  }

  // Removed separate beaver display - using main beaver with messages instead

  private handleGameAction(action: InputAction): void {
    if (this.isGameOver) return;
    
    switch (action) {
      case InputAction.MOVE_LEFT:
        this.movePiece(-1, 0);
        break;
      case InputAction.MOVE_RIGHT:
        this.movePiece(1, 0);
        break;
      case InputAction.SOFT_DROP:
        this.movePiece(0, 1);
        break;
      case InputAction.ROTATE:
        this.rotatePiece();
        break;
      case InputAction.HARD_DROP:
        this.hardDrop();
        break;
    }
  }

  private applyMobileFirstLayout(): void {
    console.log('📱 Applying mobile-first layout...');
    
    // Ensure mobile controls are visible
    if (this.mobileControls) {
      this.mobileControls.setVisible(true);
      console.log('✅ Direct mobile controls set to visible');
    }
    
    console.log('✅ Mobile-first layout applied');
  }

  private createGameBoardContainer(): Phaser.GameObjects.Container {
    // Create a container for the game board if it doesn't exist
    const boardContainer = this.add.container(this.boardX, this.boardY);
    
    // Add the board visual elements to the container
    // This is a simplified version - in a full implementation,
    // you would move all board-related graphics to this container
    
    return boardContainer;
  }

  // Old mobile controls methods removed - using enhanced mobile controls instead

  private spawnNewPiece() {
    const pieceKeys = Object.keys(PIECES) as (keyof typeof PIECES)[];
    if (pieceKeys.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * pieceKeys.length);
    const randomKey = pieceKeys[randomIndex];
    
    if (!this.nextPiece && randomKey) {
      this.currentPiece = { ...PIECES[randomKey] };
      const nextIndex = Math.floor(Math.random() * pieceKeys.length);
      const nextKey = pieceKeys[nextIndex];
      if (nextKey) {
        this.nextPiece = { ...PIECES[nextKey] };
      }
    } else {
      this.currentPiece = this.nextPiece;
      const nextIndex = Math.floor(Math.random() * pieceKeys.length);
      const nextKey = pieceKeys[nextIndex];
      if (nextKey) {
        this.nextPiece = { ...PIECES[nextKey] };
      }
    }
    
    this.currentX = Math.floor(this.boardWidth / 2) - 1;
    this.currentY = 0;
    
    // Check for game over
    if (this.currentPiece && this.checkCollision(this.currentPiece.shape, this.currentX, this.currentY)) {
      this.gameOver();
      return;
    }
    
    this.updateNextPieceDisplay();
  }

  private updateNextPieceDisplay() {
    if (this.nextPiece && this.nextPieceText) {
      this.nextPieceText.setText(`NEXT: ${this.nextPiece.name}`);
    }
  }

  private checkCollision(shape: number[][], x: number, y: number): boolean {
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          const newX = x + px;
          const newY = y + py;
          
          if (newX < 0 || newX >= this.boardWidth || 
              newY >= this.boardHeight || 
              (newY >= 0 && this.board[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private placePiece() {
    if (!this.currentPiece) return;
    
    for (let py = 0; py < this.currentPiece.shape.length; py++) {
      for (let px = 0; px < this.currentPiece.shape[py].length; px++) {
        if (this.currentPiece.shape[py][px]) {
          const boardX = this.currentX + px;
          const boardY = this.currentY + py;
          if (boardY >= 0) {
            this.board[boardY][boardX] = this.currentPiece.color;
          }
        }
      }
    }
    
    this.piecesPlaced++;
    this.clearLines();
    this.spawnNewPiece();
    
    // Show encouragement for pieces placed (not just line clears)
    if (this.piecesPlaced % 5 === 0) {
      this.showRandomEncouragement();
    }
  }

  private clearLines() {
    let linesCleared = 0;
    
    for (let y = this.boardHeight - 1; y >= 0; y--) {
      let fullLine = true;
      for (let x = 0; x < this.boardWidth; x++) {
        if (!this.board[y][x]) {
          fullLine = false;
          break;
        }
      }
      
      if (fullLine) {
        this.board.splice(y, 1);
        this.board.unshift(new Array(this.boardWidth).fill(0));
        linesCleared++;
        y++; // Check the same line again
      }
    }
    
    if (linesCleared > 0) {
      const oldLevel = this.gameState.level;
      
      this.gameState.lines += linesCleared;
      this.gameState.score += linesCleared * 100 * this.gameState.level;
      
      // Level up every 10 lines
      const newLevel = Math.floor(this.gameState.lines / 10) + 1;
      if (newLevel > this.gameState.level) {
        this.gameState.level = newLevel;
        this.dropInterval = Math.max(100, 800 - (this.gameState.level - 1) * 50);
      }
      
      this.updateScoreDisplay();
      
      // Animate score increase in mobile-first layout
      if (this.layoutSystem) {
        this.layoutSystem.animateScoreIncrease();
        
        // Animate level up if level changed
        if (newLevel > oldLevel) {
          this.layoutSystem.animateLevelUp();
        }
      }
      
      // Trigger beaver cheer animation for mobile controls
      if (this.mobileControlsUI) {
        if (linesCleared >= 4) {
          this.mobileControlsUI.playBeaverCheer();
        } else if (linesCleared >= 2) {
          this.mobileControlsUI.playBeaverCheer();
        }
      }
      
      // Beaver reactions based on lines cleared
      if (linesCleared >= 4) {
        this.beaverReactToTetris();
      } else {
        this.showBeaverEncouragement();
      }
    }
  }

  private showBeaverEncouragement() {
    const message = this.beaverMessages[Math.floor(Math.random() * this.beaverMessages.length)];
    this.messageText.setText(message);
    
    // Stop idle animation temporarily
    if (this.beaverAnimation) {
      this.beaverAnimation.pause();
    }
    
    // Excited celebration animation
    this.tweens.add({
      targets: this.beaverContainer,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      repeat: 2,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Resume idle animation
        if (this.beaverAnimation) {
          this.beaverAnimation.resume();
        }
      }
    });
    
    // Bounce animation
    this.tweens.add({
      targets: this.beaverContainer,
      y: '-=15',
      duration: 200,
      yoyo: true,
      ease: 'Bounce.easeOut'
    });
    
    // Clear message after 3 seconds
    this.time.delayedCall(3000, () => {
      this.messageText.setText('');
    });
  }

  private beaverReactToTetris() {
    // Special reaction for clearing multiple lines (Tetris)
    this.messageText.setText('TETRIS! Amazing dam building!');
    
    // Stop idle animation
    if (this.beaverAnimation) {
      this.beaverAnimation.pause();
    }
    
    // Super excited animation
    this.tweens.add({
      targets: this.beaverContainer,
      angle: 360,
      duration: 800,
      ease: 'Power2.easeInOut'
    });
    
    this.tweens.add({
      targets: this.beaverContainer,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      repeat: 3,
      ease: 'Elastic.easeOut',
      onComplete: () => {
        // Resume idle animation
        if (this.beaverAnimation) {
          this.beaverAnimation.resume();
        }
      }
    });
    
    // Clear message after 4 seconds
    this.time.delayedCall(4000, () => {
      this.messageText.setText('');
    });
  }

  private showRandomEncouragement(customMessage?: string): void {
    const currentTime = this.time.now;
    
    // Don't spam messages - at least 3 seconds between encouragements
    if (currentTime - this.lastEncouragementTime < 3000 && !customMessage) {
      return;
    }
    
    this.lastEncouragementTime = currentTime;
    
    const message = customMessage || this.encouragementMessages[Math.floor(Math.random() * this.encouragementMessages.length)];
    this.messageText.setText(message);
    
    // Gentle encouraging animation (less dramatic than line clear celebration)
    if (this.beaverAnimation) {
      this.beaverAnimation.pause();
    }
    
    this.tweens.add({
      targets: this.beaverContainer,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.beaverAnimation) {
          this.beaverAnimation.resume();
        }
      }
    });
    
    // Clear message after 2.5 seconds
    this.time.delayedCall(2500, () => {
      this.messageText.setText('');
    });
  }

  private checkForTimedEncouragement(): void {
    const currentTime = this.time.now;
    
    // Show encouragement every 15 seconds if no other messages
    if (currentTime - this.lastEncouragementTime > 15000 && this.messageText.text === '') {
      this.showRandomEncouragement();
    }
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;
    
    const newX = this.currentX + dx;
    const newY = this.currentY + dy;
    
    if (!this.checkCollision(this.currentPiece.shape, newX, newY)) {
      this.currentX = newX;
      this.currentY = newY;
      return true;
    }
    
    // If moving down and collision, place the piece
    if (dy > 0) {
      this.placePiece();
    }
    
    return false;
  }

  private rotatePiece(): boolean {
    if (!this.currentPiece) return false;
    
    const rotated = this.rotateMatrix(this.currentPiece.shape);
    
    if (!this.checkCollision(rotated, this.currentX, this.currentY)) {
      this.currentPiece.shape = rotated;
      return true;
    }
    
    return false;
  }

  private rotateMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = [];
    
    for (let i = 0; i < cols; i++) {
      rotated[i] = [];
      for (let j = 0; j < rows; j++) {
        rotated[i][j] = matrix[rows - 1 - j][i];
      }
    }
    
    return rotated;
  }

  private hardDrop() {
    if (!this.currentPiece) return;
    
    while (this.movePiece(0, 1)) {
      // Keep dropping until collision
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.messageText.setText('Victory! Your dam is complete!');
    
    console.log('Game Over triggered with score:', this.gameState.score);
    
    // Go directly to GameOver scene with score submission options
    this.time.delayedCall(2000, () => {
      console.log('Starting GameOver scene...');
      this.scene.start('GameOver', { 
        score: this.gameState.score,
        level: this.gameState.level,
        lines: this.gameState.lines
      });
    });
  }

  override update(time: number) {
    if (this.isGameOver || !this.currentPiece) return;
    
    // Handle automatic piece dropping
    this.dropTimer += time - this.lastTime;
    this.lastTime = time;
    
    if (this.dropTimer >= this.dropInterval) {
      this.movePiece(0, 1);
      this.dropTimer = 0;
    }
    
    // Render the game
    this.renderGame();
    
    // Check for timed encouragement
    this.checkForTimedEncouragement();
  }

  private renderGame() {
    // Clear previous render
    this.children.getChildren().forEach(child => {
      if (child.getData && child.getData('gameBlock')) {
        child.destroy();
      }
    });
    
    // Render placed pieces
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        if (this.board[y][x]) {
          this.renderBlock(x, y, this.board[y][x]);
        }
      }
    }
    
    // Render current piece
    if (this.currentPiece) {
      for (let py = 0; py < this.currentPiece.shape.length; py++) {
        for (let px = 0; px < this.currentPiece.shape[py].length; px++) {
          if (this.currentPiece.shape[py][px]) {
            const x = this.currentX + px;
            const y = this.currentY + py;
            if (y >= 0) {
              this.renderBlock(x, y, this.currentPiece.color, true);
            }
          }
        }
      }
    }
  }

  private renderBlock(x: number, y: number, color: number, isCurrent = false) {
    const pixelX = this.boardX + x * this.cellSize;
    const pixelY = this.boardY + y * this.cellSize;
    
    // Create wood texture effect
    const block = this.add.graphics();
    block.setData('gameBlock', true);
    
    // Main wood color
    block.fillStyle(color, 1);
    block.fillRect(pixelX, pixelY, this.cellSize - 1, this.cellSize - 1);
    
    // Wood grain effect - create lighter color for grain
    const colorObj = Phaser.Display.Color.IntegerToColor(color);
    const lighterColor = Phaser.Display.Color.GetColor32(
      Math.min(255, colorObj.red + 30),
      Math.min(255, colorObj.green + 30), 
      Math.min(255, colorObj.blue + 30),
      255
    );
    block.lineStyle(1, lighterColor, 0.7);
    
    // Draw wood grain lines
    for (let i = 0; i < 3; i++) {
      const lineY = pixelY + (i + 1) * (this.cellSize / 4);
      block.moveTo(pixelX, lineY);
      block.lineTo(pixelX + this.cellSize - 1, lineY);
    }
    block.strokePath();
    
    // Add highlight for current piece
    if (isCurrent) {
      block.lineStyle(2, 0xFFFFFF, 0.8);
      block.strokeRect(pixelX, pixelY, this.cellSize - 1, this.cellSize - 1);
    }
    
    // Add border
    block.lineStyle(1, 0x000000, 0.5);
    block.strokeRect(pixelX, pixelY, this.cellSize - 1, this.cellSize - 1);
  }

  private startBeaverIdleAnimation(): void {
    // Gentle side-to-side cheering animation
    this.beaverAnimation = this.tweens.add({
      targets: this.beaverContainer,
      x: '+=8',
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private createPixelArtBeaver(): void {
    // Enhanced pixel art beaver as fallback
    const beaverGraphics = this.add.graphics();
    const pixelSize = 3; // Larger pixels for better visibility
    
    const drawPixel = (px: number, py: number, color: number) => {
      beaverGraphics.fillStyle(color);
      beaverGraphics.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
    };
    
    // Enhanced beaver design
    // Construction hat
    for (let x = -6; x <= 6; x++) {
      drawPixel(x, -8, 0xFF8C00);
    }
    for (let x = -5; x <= 5; x++) {
      drawPixel(x, -7, 0xFF8C00);
    }
    
    // Head
    for (let y = -6; y <= -2; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.abs(x) <= 4 - Math.abs(y + 4)) {
          drawPixel(x, y, 0x8B4513);
        }
      }
    }
    
    // Eyes
    drawPixel(-2, -4, 0x000000);
    drawPixel(2, -4, 0x000000);
    drawPixel(-2, -5, 0xFFFFFF);
    drawPixel(2, -5, 0xFFFFFF);
    
    // Nose
    drawPixel(0, -3, 0x000000);
    
    // Teeth
    drawPixel(-1, -1, 0xFFFFFF);
    drawPixel(0, -1, 0xFFFFFF);
    drawPixel(1, -1, 0xFFFFFF);
    
    // Body
    for (let y = 0; y <= 4; y++) {
      for (let x = -3; x <= 3; x++) {
        drawPixel(x, y, 0x8B4513);
      }
    }
    
    // Arms (pointing/cheering)
    drawPixel(-4, 1, 0x8B4513);
    drawPixel(-5, 0, 0x8B4513);
    drawPixel(4, 1, 0x8B4513);
    drawPixel(5, 0, 0x8B4513);
    
    // Tail
    for (let x = -6; x <= -4; x++) {
      for (let y = 2; y <= 4; y++) {
        drawPixel(x, y, 0x654321);
      }
    }
    
    this.beaverContainer.add(beaverGraphics);
    this.startBeaverIdleAnimation();
  }

  shutdown() {
    // Clean up mobile-first layout system
    if (this.layoutSystem) {
      this.layoutSystem.destroy();
    }
    
    // Clean up enhanced mobile controls
    if (this.mobileControlsUI) {
      this.mobileControlsUI.destroy();
      this.mobileControlsUI = null;
    }
    
    // Clean up legacy mobile controls
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
    
    if (this.beaverAnimation) {
      this.beaverAnimation.destroy();
    }
    
    if (this.beaverContainer) {
      this.beaverContainer.destroy();
    }
  }
}