import { Scene } from 'phaser';
import * as Phaser from 'phaser';

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
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private nextPieceText!: Phaser.GameObjects.Text;
  private isGameOver: boolean = false;
  private isMobileDevice: boolean = false;
  private mobileControls: Phaser.GameObjects.Container | null = null;
  
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
  private beaver!: Phaser.GameObjects.Graphics;
  private beaverMessages: string[] = [
    "Great job building!",
    "Keep stacking those logs!",
    "The dam looks amazing!",
    "You're a natural builder!",
    "Fantastic work!",
    "Dam good job!",
    "Building like a pro!"
  ];
  private messageText!: Phaser.GameObjects.Text;
  
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

    // Initialize game board
    this.initializeBoard();
    
    // Create retro 80s background
    this.createBackground();
    
    // Create beaver character
    this.createBeaver();
    
    // Create header with neon styling
    this.createHeader();
    
    // Create score display
    this.createScoreDisplay();
    
    // Create game board visual
    this.createBoardVisual();
    
    // Create input handlers
    this.createInputHandlers();
    
    // Start the game
    this.spawnNewPiece();
    this.lastTime = this.time.now;
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
    // Create clean pixel art beaver without background issues
    this.beaver = this.add.graphics() as any;
    this.drawSmallBeaver(100, 300);
    
    // Beaver message
    this.messageText = this.add.text(50, 380, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFF00',
      stroke: '#FF00FF',
      strokeThickness: 1,
      wordWrap: { width: 180 }
    });
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
    if (this.scoreText) this.scoreText.setText(`SCORE: ${this.gameState.score}`);
    if (this.levelText) this.levelText.setText(`LEVEL: ${this.gameState.level}`);
    if (this.linesText) this.linesText.setText(`LINES: ${this.gameState.lines}`);
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

  private createInputHandlers() {
    // Keyboard input
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
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
          case 'ArrowUp':
            event.preventDefault();
            this.rotatePiece();
            break;
          case 'Space':
            event.preventDefault();
            this.hardDrop();
            break;
        }
      });
    }

    // Create mobile controls if needed
    if (this.isMobileDevice) {
      this.createMobileControls();
    }
  }

  private createMobileControls() {
    const { width, height } = this.scale;
    
    this.mobileControls = this.add.container(0, height - 60);
    
    const buttonSize = 70;
    const buttonSpacing = 15;
    const totalWidth = (buttonSize * 5) + (buttonSpacing * 4);
    const startX = (width - totalWidth) / 2;
    
    const buttons = [
      { key: 'left', symbol: '←', x: startX },
      { key: 'right', symbol: '→', x: startX + buttonSize + buttonSpacing },
      { key: 'rotate', symbol: '↻', x: startX + (buttonSize + buttonSpacing) * 2 },
      { key: 'down', symbol: '↓', x: startX + (buttonSize + buttonSpacing) * 3 },
      { key: 'drop', symbol: '⬇', x: startX + (buttonSize + buttonSpacing) * 4 }
    ];
    
    buttons.forEach(btn => {
      const button = this.createMobileButton(btn.symbol, btn.x, 0);
      this.mobileControls!.add(button);
      
      button.on('pointerdown', () => {
        this.handleMobileInput(btn.key);
      });
    });
  }

  private createMobileButton(symbol: string, x: number, y: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Simple button background
    const bg = this.add.graphics();
    bg.fillStyle(0x8B4513, 0.9);
    bg.fillRoundedRect(-35, -35, 70, 70, 10);
    bg.lineStyle(3, 0xFFFFFF, 0.8);
    bg.strokeRoundedRect(-35, -35, 70, 70, 10);
    button.add(bg);
    
    // Button text
    const text = this.add.text(0, 0, symbol, {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    button.add(text);
    
    // Touch area
    button.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 80, 80), Phaser.Geom.Rectangle.Contains);
    
    // Visual feedback
    button.on('pointerdown', () => {
      button.setScale(0.9);
      if (navigator.vibrate) navigator.vibrate([10]);
    });
    
    button.on('pointerup', () => {
      button.setScale(1.0);
    });
    
    return button;
  }

  private handleMobileInput(action: string) {
    if (this.isGameOver) return;
    
    switch (action) {
      case 'left':
        this.movePiece(-1, 0);
        break;
      case 'right':
        this.movePiece(1, 0);
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
    
    this.clearLines();
    this.spawnNewPiece();
    this.showBeaverEncouragement();
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
      this.gameState.lines += linesCleared;
      this.gameState.score += linesCleared * 100 * this.gameState.level;
      
      // Level up every 10 lines
      const newLevel = Math.floor(this.gameState.lines / 10) + 1;
      if (newLevel > this.gameState.level) {
        this.gameState.level = newLevel;
        this.dropInterval = Math.max(100, 800 - (this.gameState.level - 1) * 50);
      }
      
      this.updateScoreDisplay();
    }
  }

  private showBeaverEncouragement() {
    const message = this.beaverMessages[Math.floor(Math.random() * this.beaverMessages.length)];
    this.messageText.setText(message);
    
    // Animate beaver
    this.tweens.add({
      targets: this.beaver,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Clear message after 2 seconds
    this.time.delayedCall(2000, () => {
      this.messageText.setText('');
    });
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
    this.messageText.setText('Game Over! The dam is complete!');
    
    // Show game over screen after delay
    this.time.delayedCall(2000, () => {
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

  private drawSmallBeaver(x: number, y: number): void {
    if (!this.beaver) return;
    
    this.beaver.clear();
    
    // Small pixel art beaver for sidebar
    const pixelSize = 2;
    
    const drawPixel = (px: number, py: number, color: number) => {
      this.beaver.fillStyle(color);
      this.beaver.fillRect(x + px * pixelSize, y + py * pixelSize, pixelSize, pixelSize);
    };
    
    // Simple small beaver
    // Hat
    drawPixel(-4, -6, 0xFF8C00); drawPixel(-3, -6, 0xFF8C00); drawPixel(-2, -6, 0xFF8C00);
    drawPixel(-1, -6, 0xFF8C00); drawPixel(0, -6, 0xFF8C00); drawPixel(1, -6, 0xFF8C00);
    drawPixel(2, -6, 0xFF8C00); drawPixel(3, -6, 0xFF8C00);
    
    // Head
    drawPixel(-3, -4, 0x8B4513); drawPixel(-2, -4, 0x8B4513); drawPixel(-1, -4, 0x8B4513);
    drawPixel(0, -4, 0x8B4513); drawPixel(1, -4, 0x8B4513); drawPixel(2, -4, 0x8B4513);
    
    // Eyes
    drawPixel(-2, -3, 0x000000); drawPixel(1, -3, 0x000000);
    
    // Teeth
    drawPixel(-1, -1, 0x87CEEB); drawPixel(0, -1, 0x87CEEB);
    
    // Body
    drawPixel(-2, 1, 0x8B4513); drawPixel(-1, 1, 0x8B4513); drawPixel(0, 1, 0x8B4513); drawPixel(1, 1, 0x8B4513);
    
    // Tail
    drawPixel(-4, 2, 0x8B4513); drawPixel(-3, 2, 0x8B4513);
  }

  shutdown() {
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }
}