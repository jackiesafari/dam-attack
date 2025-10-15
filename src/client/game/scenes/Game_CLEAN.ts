import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { LeaderboardEntry } from '../../../shared/types/api';

// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const PIECE_COLORS = [0x8B4513, 0xFF6347, 0x32CD32, 0x4169E1, 0x9370DB, 0xFFD700, 0xFF69B4];

// Tetris pieces
const PIECES = [
  { shape: [[1, 1, 1, 1]], color: 0x00FFFF }, // I
  { shape: [[1, 1], [1, 1]], color: 0xFFFF00 }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: 0x800080 }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: 0x00FF00 }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: 0xFF0000 }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: 0xFFA500 }, // L
  { shape: [[0, 0, 1], [1, 1, 1]], color: 0x0000FF }  // J
];

interface GameState {
  board: number[][];
  currentPiece: any;
  nextPiece: any;
  score: number;
  level: number;
  lines: number;
  dropTime: number;
  lastDrop: number;
}

interface LayoutConfig {
  gameBoardX: number;
  gameBoardY: number;
  gameBoardWidth: number;
  gameBoardHeight: number;
  blockSize: number;
  headerHeight: number;
}

export default class Game extends Scene {
  private gameState!: GameState;
  private graphics!: Phaser.GameObjects.Graphics;
  private gameOverText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private layoutConfig!: LayoutConfig;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: any;
  private isGameOver: boolean = false;
  private dropTimer: number = 0;
  private moveTimer: number = 0;
  private moveInterval: number = 150;
  private isMobileDevice: boolean = false;
  private mobileControls: Phaser.GameObjects.Container | null = null;
  private mobileButtons: {
    left?: Phaser.GameObjects.Container;
    right?: Phaser.GameObjects.Container;
    rotate?: Phaser.GameObjects.Container;
    down?: Phaser.GameObjects.Container;
    drop?: Phaser.GameObjects.Container;
  } = {};
  private visualConsole: Phaser.GameObjects.Text | null = null;
  private consoleLogs: string[] = [];

  constructor() {
    super('Game');
  }

  create() {
    // Set background
    this.cameras.main.setBackgroundColor(0xF5DEB3);

    // Setup mobile debugging
    this.setupMobileDebugging();

    // Calculate responsive layout
    const { width, height } = this.scale;
    this.layoutConfig = this.calculateLayout(width, height);

    // Detect mobile device
    this.isMobileDevice = this.detectMobileDevice();

    // Initialize game state
    this.gameState = {
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      level: 1,
      lines: 0,
      dropTime: 1000,
      lastDrop: 0
    };

    // Create UI
    this.createUI();
    this.createGameBoard();
    this.createInputHandlers();

    // Create mobile controls if needed
    if (this.isMobileDevice) {
      this.createMobileControls();
    }

    // Start the game
    this.spawnPiece();
    this.spawnPiece();
  }

  private setupMobileDebugging() {
    console.log('🔍 Setting up mobile debugging...');
    this.createVisualConsole();
    console.log('✅ Visual console created for mobile debugging');
    console.log('📱 Ready to test touch events on mobile device');
  }

  private createVisualConsole() {
    const { width, height } = this.scale;
    
    // Create console background
    const consoleBg = this.add.graphics();
    consoleBg.fillStyle(0x000000, 0.8);
    consoleBg.fillRect(10, 10, width - 20, 150);
    consoleBg.lineStyle(2, 0x00FF00);
    consoleBg.strokeRect(10, 10, width - 20, 150);
    
    // Create console text
    this.visualConsole = this.add.text(15, 15, '', {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#00FF00',
      wordWrap: { width: width - 30 }
    });
    
    // Override console.log for mobile
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.consoleLogs.push(message);
      if (this.consoleLogs.length > 20) {
        this.consoleLogs.shift();
      }
      this.updateVisualConsole();
    };
    
    // Add close button
    const closeButton = this.add.text(width - 25, 15, '✕', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FF0000'
    }).setInteractive();
    
    closeButton.on('pointerdown', () => {
      consoleBg.destroy();
      this.visualConsole?.destroy();
      closeButton.destroy();
      this.visualConsole = null;
    });
  }

  private updateVisualConsole() {
    if (this.visualConsole) {
      this.visualConsole.setText(this.consoleLogs.join('\n'));
    }
  }

  private calculateLayout(width: number, height: number): LayoutConfig {
    const headerSpace = 80;
    const margin = 20;
    const availableHeight = height - headerSpace - margin * 2;
    const blockSize = Math.min(width / BOARD_WIDTH, availableHeight / BOARD_HEIGHT);
    const gameBoardWidth = blockSize * BOARD_WIDTH;
    const gameBoardHeight = blockSize * BOARD_HEIGHT;
    
    return {
      gameBoardX: width / 2,
      gameBoardY: headerSpace + gameBoardHeight / 2,
      gameBoardWidth,
      gameBoardHeight,
      blockSize,
      headerHeight: headerSpace
    };
  }

  private detectMobileDevice(): boolean {
    const { width } = this.scale;
    const isTouchDevice = this.sys.game.device.input.touch;
    const isMobileOS = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    
    // Show mobile controls ONLY for actual mobile OS devices
    return isMobileOS;
  }

  private createUI() {
    const { width, height } = this.layoutConfig;
    
    // Create graphics for drawing
    this.graphics = this.add.graphics();
    
    // Create header with title and instructions
    this.createHeader();
    
    // Create game over text (hidden initially)
    this.gameOverText = this.add.text(width / 2, height / 2, 'Game Over!', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FF0000',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);
    
    // Create score display
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#000000'
    });
    
    this.levelText = this.add.text(20, 40, 'Level: 1', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#000000'
    });
    
    this.linesText = this.add.text(20, 60, 'Lines: 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#000000'
    });
  }

  private createHeader() {
    const { width } = this.scale;
    
    // Title
    const title = this.add.text(width / 2, 20, 'BEAVER DAM BUILDER', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#8B4513',
      stroke: '#FFFFFF',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Instructions
    const instructions = this.add.text(width / 2, 50, 
      this.isMobileDevice 
        ? 'Use buttons below to play • Tap to rotate'
        : 'Arrow keys: move • Space: rotate • Down: drop',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#8B4513',
        stroke: '#FFFFFF',
        strokeThickness: 1
      }
    ).setOrigin(0.5);
  }

  private createGameBoard() {
    // Game board is drawn in the render method
  }

  private createInputHandlers() {
    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('SPACE');
    
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.isGameOver) return;
      
      switch (event.code) {
        case 'ArrowLeft':
          this.movePiece(-1, 0);
          break;
        case 'ArrowRight':
          this.movePiece(1, 0);
          break;
        case 'ArrowDown':
          this.movePiece(0, 1);
          break;
        case 'Space':
          event.preventDefault();
          this.rotatePiece();
          break;
      }
    });
  }

  private createMobileControls() {
    const { width, height } = this.scale;
    
    this.mobileControls = this.add.container(0, height - 50);
    
    const buttonSize = 60;
    const buttonSpacing = 10;
    const totalWidth = (buttonSize * 5) + (buttonSpacing * 4);
    const startX = (width - totalWidth) / 2;
    
    const buttons = [
      { key: 'left', symbol: '←', x: startX },
      { key: 'right', symbol: '→', x: startX + buttonSize + buttonSpacing },
      { key: 'rotate', symbol: '🔄', x: startX + (buttonSize + buttonSpacing) * 2 },
      { key: 'down', symbol: '⬇', x: startX + (buttonSize + buttonSpacing) * 3 },
      { key: 'drop', symbol: '⚡', x: startX + (buttonSize + buttonSpacing) * 4 }
    ];
    
    buttons.forEach(btn => {
      const button = this.createMobileButton(btn.symbol, btn.x, 0);
      this.mobileButtons[btn.key as keyof typeof this.mobileButtons] = button;
      this.mobileControls!.add(button);
      
      button.on('pointerdown', () => {
        this.handleMobileInput(btn.key);
      });
    });
  }

  private createMobileButton(symbol: string, x: number, y: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x8B4513);
    bg.fillRoundedRect(-30, -30, 60, 60, 10);
    bg.lineStyle(3, 0xFFD700);
    bg.strokeRoundedRect(-30, -30, 60, 60, 10);
    button.add(bg);
    
    // Button text
    const text = this.add.text(0, 0, symbol, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    button.add(text);
    
    // Make interactive
    button.setInteractive(new Phaser.Geom.Rectangle(-30, -30, 60, 60), Phaser.Geom.Rectangle.Contains);
    
    // Visual feedback
    button.on('pointerdown', () => {
      button.setScale(0.9);
      if (navigator.vibrate) navigator.vibrate(10);
    });
    
    button.on('pointerup', () => {
      button.setScale(1.0);
    });
    
    button.on('pointerout', () => {
      button.setScale(1.0);
    });
    
    return button;
  }

  private handleMobileInput(action: string) {
    if (this.isGameOver) return;
    
    const now = this.time.now;
    
    switch (action) {
      case 'left':
        if (now - this.moveTimer > this.moveInterval) {
          this.movePiece(-1, 0);
          this.moveTimer = now;
        }
        break;
      case 'right':
        if (now - this.moveTimer > this.moveInterval) {
          this.movePiece(1, 0);
          this.moveTimer = now;
        }
        break;
      case 'down':
        this.movePiece(0, 1);
        break;
      case 'rotate':
        this.rotatePiece();
        break;
      case 'drop':
        this.hardDrop();
        break;
    }
  }

  private spawnPiece() {
    const pieceIndex = Math.floor(Math.random() * PIECES.length);
    const pieceTemplate = PIECES[pieceIndex];
    
    const piece = {
      shape: pieceTemplate.shape.map(row => [...row]),
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(pieceTemplate.shape[0].length / 2),
      y: 0,
      color: pieceTemplate.color
    };
    
    if (this.gameState.currentPiece) {
      this.gameState.currentPiece = this.gameState.nextPiece;
    }
    this.gameState.nextPiece = piece;
    
    if (!this.gameState.currentPiece) {
      this.gameState.currentPiece = piece;
    }
    
    // Check for game over
    if (this.checkCollision(this.gameState.currentPiece, 0, 0)) {
      this.gameOver();
    }
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.gameState.currentPiece) return false;
    
    if (!this.checkCollision(this.gameState.currentPiece, dx, dy)) {
      this.gameState.currentPiece.x += dx;
      this.gameState.currentPiece.y += dy;
      return true;
    }
    return false;
  }

  private rotatePiece(): boolean {
    if (!this.gameState.currentPiece) return false;
    
    const rotated = this.rotateMatrix(this.gameState.currentPiece.shape);
    const originalShape = this.gameState.currentPiece.shape;
    
    this.gameState.currentPiece.shape = rotated;
    
    if (this.checkCollision(this.gameState.currentPiece, 0, 0)) {
      // Try wall kicks
      if (!this.movePiece(-1, 0) && !this.movePiece(1, 0)) {
        this.gameState.currentPiece.shape = originalShape;
        return false;
      }
    }
    
    return true;
  }

  private rotateMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = matrix[i][j];
      }
    }
    
    return rotated;
  }

  private checkCollision(piece: any, dx: number, dy: number): boolean {
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;
          
          if (boardX < 0 || boardX >= BOARD_WIDTH || 
              boardY >= BOARD_HEIGHT || 
              (boardY >= 0 && this.gameState.board[boardY] && this.gameState.board[boardY][boardX])) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  private hardDrop() {
    while (this.movePiece(0, 1)) {
      this.gameState.score += 2;
    }
  }

  private placePiece(piece: any) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            this.gameState.board[boardY][boardX] = piece.color;
          }
        }
      }
    }
    
    this.clearLines();
    this.spawnPiece();
  }

  private clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.gameState.board[y].every(cell => cell !== 0)) {
        this.gameState.board.splice(y, 1);
        this.gameState.board.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++; // Check the same line again
      }
    }
    
    if (linesCleared > 0) {
      this.gameState.lines += linesCleared;
      this.gameState.score += linesCleared * 100 * this.gameState.level;
      this.gameState.level = Math.floor(this.gameState.lines / 10) + 1;
      this.gameState.dropTime = Math.max(100, 1000 - (this.gameState.level - 1) * 100);
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.gameOverText.setVisible(true);
    
    if (this.isMobileDevice) {
      this.createMobileGameOverUI();
    }
  }

  private createMobileGameOverUI() {
    console.log('📱📱📱 === CREATING MOBILE GAME OVER UI === 📱📱📱');
    
    // Add global touch event logger
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('🌍 GLOBAL TOUCH DETECTED at:', pointer.x, pointer.y);
    });
    
    const { width, height } = this.scale;
    console.log('Screen size:', width, 'x', height);
    
    // Create game over panel
    const gameOverPanel = this.add.container(width / 2, height / 2);
    console.log('Game over panel created at:', width/2, height/2);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-200, -150, 400, 300, 15);
    bg.lineStyle(3, 0xFFD700);
    bg.strokeRoundedRect(-200, -150, 400, 300, 15);
    gameOverPanel.add(bg);
    
    // Title
    const title = this.add.text(0, -120, 'Game Over!', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    gameOverPanel.add(title);
    
    // Score display
    const scoreDisplay = this.add.text(0, -80, `Score: ${this.gameState.score}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    gameOverPanel.add(scoreDisplay);
    
    // Submit score button with TOUCH FIX
    console.log('🔵 Creating submit button...');
    const submitButton = this.add.text(0, -30, '📊 Submit Score', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#8B4513',
      padding: { x: 25, y: 12 }
    }).setOrigin(0.5);
    console.log('🔵 Submit button created at:', submitButton.x, submitButton.y);
    console.log('🔵 Submit button size:', submitButton.width, 'x', submitButton.height);
    
    // CRITICAL FIX: Set explicit hit area for touch events
    const hitWidth = submitButton.width;
    const hitHeight = submitButton.height;
    submitButton.setInteractive(
      new Phaser.Geom.Rectangle(-hitWidth/2, -hitHeight/2, hitWidth, hitHeight),
      Phaser.Geom.Rectangle.Contains
    );
    console.log('🔵 Submit button interactive hit area set:', hitWidth, 'x', hitHeight);
    console.log('🔵 Submit button input enabled:', submitButton.input?.enabled);
    
    // Add event listeners
    submitButton.on('pointerover', () => {
      console.log('👆👆👆 POINTER OVER SUBMIT BUTTON 👆👆👆');
      submitButton.setStyle({ backgroundColor: '#A0522D' });
      submitButton.setScale(1.05);
    });
    
    submitButton.on('pointerout', () => {
      console.log('👆 Submit button - POINTER OUT');
      submitButton.setStyle({ backgroundColor: '#8B4513' });
      submitButton.setScale(1.0);
    });
    
    submitButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      console.log('🔴🔴🔴 === SUBMIT BUTTON CLICKED === 🔴🔴🔴');
      console.log('SUCCESS! Touch event fired!');
      console.log('Button click timestamp:', new Date().toISOString());
      console.log('Pointer position:', pointer.x, pointer.y);
      console.log('About to call submitScoreMobile()...');
      
      // Visual feedback
      submitButton.setStyle({ backgroundColor: '#654321' });
      submitButton.setScale(0.95);
      
      // Call the minimal submit method
      this.submitScoreMobile();
      
      // Close panel after a delay
      this.time.delayedCall(500, () => {
        console.log('Destroying game over panel...');
        gameOverPanel.destroy();
      });
    });
    
    submitButton.on('pointerup', () => {
      console.log('👆 Submit button - POINTER UP');
    });
    
    console.log('🔵 All event listeners added to submit button');
    gameOverPanel.add(submitButton);
    console.log('🔵 Submit button added to panel');
    
    // View leaderboard button with TOUCH FIX
    const leaderboardButton = this.add.text(0, 20, '🏆 View Leaderboard', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#2F4F2F',
      padding: { x: 25, y: 12 }
    }).setOrigin(0.5);
    
    // Set explicit hit area for touch
    const lbHitWidth = leaderboardButton.width;
    const lbHitHeight = leaderboardButton.height;
    leaderboardButton.setInteractive(
      new Phaser.Geom.Rectangle(-lbHitWidth/2, -lbHitHeight/2, lbHitWidth, lbHitHeight),
      Phaser.Geom.Rectangle.Contains
    );
    console.log('🔵 Leaderboard button interactive, size:', lbHitWidth, 'x', lbHitHeight);
    
    leaderboardButton.on('pointerover', () => {
      console.log('👆 POINTER OVER LEADERBOARD BUTTON');
      leaderboardButton.setStyle({ backgroundColor: '#3A5F3A' });
      leaderboardButton.setScale(1.05);
    });
    
    leaderboardButton.on('pointerout', () => {
      leaderboardButton.setStyle({ backgroundColor: '#2F4F2F' });
      leaderboardButton.setScale(1.0);
    });
    
    leaderboardButton.on('pointerdown', () => {
      console.log('🟢🟢🟢 LEADERBOARD BUTTON CLICKED 🟢🟢🟢');
      leaderboardButton.disableInteractive();
      leaderboardButton.setStyle({ backgroundColor: '#1A3F1A' });
      gameOverPanel.destroy();
    });
    gameOverPanel.add(leaderboardButton);
    
    // Play again button with TOUCH FIX
    const playAgainButton = this.add.text(0, 70, '🔄 Play Again', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#FF8C00',
      padding: { x: 25, y: 12 }
    }).setOrigin(0.5);
    
    // Set explicit hit area for touch
    const paHitWidth = playAgainButton.width;
    const paHitHeight = playAgainButton.height;
    playAgainButton.setInteractive(
      new Phaser.Geom.Rectangle(-paHitWidth/2, -paHitHeight/2, paHitWidth, paHitHeight),
      Phaser.Geom.Rectangle.Contains
    );
    console.log('🔵 Play Again button interactive, size:', paHitWidth, 'x', paHitHeight);
    
    playAgainButton.on('pointerover', () => {
      console.log('👆 POINTER OVER PLAY AGAIN BUTTON');
      playAgainButton.setStyle({ backgroundColor: '#FFA500' });
      playAgainButton.setScale(1.05);
    });
    
    playAgainButton.on('pointerout', () => {
      playAgainButton.setStyle({ backgroundColor: '#FF8C00' });
      playAgainButton.setScale(1.0);
    });
    
    playAgainButton.on('pointerdown', () => {
      console.log('🟡🟡🟡 PLAY AGAIN BUTTON CLICKED 🟡🟡🟡');
      playAgainButton.disableInteractive();
      playAgainButton.setStyle({ backgroundColor: '#CC7000' });
      this.scene.restart();
    });
    gameOverPanel.add(playAgainButton);
    
    // Close button with TOUCH FIX
    const closeButton = this.add.text(180, -120, '✕', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FF0000',
      backgroundColor: '#000000',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5);
    
    // Set explicit hit area for touch - make it bigger for easier tapping
    const closeHitWidth = Math.max(closeButton.width, 50);
    const closeHitHeight = Math.max(closeButton.height, 50);
    closeButton.setInteractive(
      new Phaser.Geom.Rectangle(-closeHitWidth/2, -closeHitHeight/2, closeHitWidth, closeHitHeight),
      Phaser.Geom.Rectangle.Contains
    );
    console.log('🔵 Close button interactive, size:', closeHitWidth, 'x', closeHitHeight);
    
    closeButton.on('pointerover', () => {
      console.log('👆 POINTER OVER CLOSE BUTTON');
      closeButton.setStyle({ backgroundColor: '#330000' });
      closeButton.setScale(1.1);
    });
    
    closeButton.on('pointerout', () => {
      closeButton.setStyle({ backgroundColor: '#000000' });
      closeButton.setScale(1.0);
    });
    
    closeButton.on('pointerdown', () => {
      console.log('❌❌❌ CLOSE BUTTON CLICKED ❌❌❌');
      closeButton.disableInteractive();
      gameOverPanel.destroy();
    });
    gameOverPanel.add(closeButton);
    
    // Make sure the panel is on top
    gameOverPanel.setDepth(2000);
    
    console.log('🟢🟢🟢 Mobile Game Over UI Created Successfully 🟢🟢🟢');
    console.log('Panel depth:', gameOverPanel.depth);
    console.log('Panel position:', gameOverPanel.x, gameOverPanel.y);
    console.log('Submit button interactive:', submitButton.input?.enabled);
  }

  private submitScoreMobile() {
    console.log('🎯🎯🎯 SUBMIT SCORE BUTTON CLICKED! 🎯🎯🎯');
    console.log('Current score:', this.gameState.score);
    console.log('Button is working! Touch events are functioning correctly.');
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    
    // Auto-drop pieces
    if (time - this.gameState.lastDrop > this.gameState.dropTime) {
      if (!this.movePiece(0, 1)) {
        this.placePiece(this.gameState.currentPiece);
      }
      this.gameState.lastDrop = time;
    }
    
    // Update UI
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    this.levelText.setText(`Level: ${this.gameState.level}`);
    this.linesText.setText(`Lines: ${this.gameState.lines}`);
    
    // Render game board
    this.render();
  }

  private render() {
    this.graphics.clear();

    // Use layout configuration for consistent positioning
    const config = this.layoutConfig;
    const gameBoardX = config.gameBoardX - config.gameBoardWidth / 2;
    const gameBoardY = config.gameBoardY - config.gameBoardHeight / 2;

    // Draw game board
    this.graphics.lineStyle(4, 0x8B4513);
    this.graphics.fillStyle(0x87CEEB);
    this.graphics.fillRoundedRect(gameBoardX, gameBoardY, config.gameBoardWidth, config.gameBoardHeight, 10);
    this.graphics.strokeRoundedRect(gameBoardX, gameBoardY, config.gameBoardWidth, config.gameBoardHeight, 10);
    
    // Draw grid lines
    this.graphics.lineStyle(1, 0x4169E1, 0.3);
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      this.graphics.moveTo(gameBoardX + x * config.blockSize, gameBoardY);
      this.graphics.lineTo(gameBoardX + x * config.blockSize, gameBoardY + config.gameBoardHeight);
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      this.graphics.moveTo(gameBoardX, gameBoardY + y * config.blockSize);
      this.graphics.lineTo(gameBoardX + config.gameBoardWidth, gameBoardY + y * config.blockSize);
    }
    this.graphics.strokePath();

    // Draw placed pieces
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const boardRow = this.gameState.board[y];
      if (!boardRow) continue;
      
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cellValue = boardRow[x];
        if (cellValue) {
          this.drawLogBlock(
            gameBoardX + x * config.blockSize + 2,
            gameBoardY + y * config.blockSize + 2,
            config.blockSize - 4,
            cellValue
          );
        }
      }
    }

    // Draw current piece
    if (this.gameState.currentPiece) {
      const piece = this.gameState.currentPiece;
      
      for (let y = 0; y < piece.shape.length; y++) {
        const row = piece.shape[y];
        if (!row) continue;
        
        for (let x = 0; x < row.length; x++) {
          if (row[x]) {
            const blockX = gameBoardX + (piece.x + x) * config.blockSize + 2;
            const blockY = gameBoardY + (piece.y + y) * config.blockSize + 2;
            this.drawLogBlock(blockX, blockY, config.blockSize - 4, piece.color);
          }
        }
      }
    }
  }

  private drawLogBlock(x: number, y: number, size: number, color: number) {
    // Main log body
    this.graphics.fillStyle(color);
    this.graphics.fillEllipse(x + size/2, y + size/2, size * 0.9, size * 0.7);
    
    // Add wood grain texture lines
    this.graphics.lineStyle(1, color - 0x202020, 0.6);
    for (let i = 1; i < 4; i++) {
      const grainY = y + (size * i / 4);
      this.graphics.moveTo(x + 4, grainY);
      this.graphics.lineTo(x + size - 4, grainY);
    }
    this.graphics.strokePath();
    
    // Add bark texture
    this.graphics.lineStyle(2, color - 0x404040, 0.4);
    this.graphics.moveTo(x + size/2, y);
    this.graphics.lineTo(x + size/2, y + size);
    this.graphics.strokePath();
  }

  shutdown() {
    // Clean up mobile controls
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }
}

