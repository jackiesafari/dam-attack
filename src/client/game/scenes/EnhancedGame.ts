import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { MobileFirstLayoutSystem } from '../managers/MobileFirstLayoutSystem';
import { MobileControlsUI } from '../ui/MobileControlsUI';
import { FuturisticTimer } from '../ui/FuturisticTimer';
import { InputAction } from '../managers/InputManager';
import { GameStateManager } from '../managers/GameStateManager';
import { PieceManager } from '../managers/PieceManager';
import { BoardManager } from '../managers/BoardManager';
import { SeasonalManager } from '../managers/SeasonalManager';
import { WaterLevelManager } from '../managers/WaterLevelManager';
import { LevelProgressionManager } from '../managers/LevelProgressionManager';
import { EnvironmentalRenderer } from '../rendering/EnvironmentalRenderer';
import { PieceRenderer } from '../rendering/PieceRenderer';
import { ThemeManager } from '../themes/ThemeManager';
import { 
  EnvironmentalState, 
  HazardType, 
  PowerUpType,
  StoryElement,
  StoryType,
  Character,
  Emotion,
  AnimationType
} from '../types/EnvironmentalTypes';
import { GamePiece, PieceType } from '../types/GameTypes';

export class EnhancedGame extends Scene {
  // Core managers
  private gameStateManager!: GameStateManager;
  private pieceManager!: PieceManager;
  private boardManager!: BoardManager;
  private seasonalManager!: SeasonalManager;
  private waterLevelManager!: WaterLevelManager;
  private levelProgressionManager!: LevelProgressionManager;
  private themeManager!: ThemeManager;
  
  // Rendering systems
  private environmentalRenderer!: EnvironmentalRenderer;
  private pieceRenderer!: PieceRenderer;
  
  // UI systems
  private layoutSystem!: MobileFirstLayoutSystem;
  private mobileControlsUI: MobileControlsUI | null = null;
  
  // Game state
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private currentLevel: number = 1;
  private gameMode: 'campaign' | 'endless' = 'campaign';
  
  // Visual elements
  private gameContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;
  private storyContainer!: Phaser.GameObjects.Container;
  
  // UI Text elements
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private waterLevelText!: Phaser.GameObjects.Text;
  private seasonText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private futuristicTimer!: FuturisticTimer;
  
  // Beaver character and messaging
  private beaverContainer!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private messageBubbleGraphics!: Phaser.GameObjects.Graphics;
  private storyText!: Phaser.GameObjects.Text;
  
  // OPTIMIZED: Proper timing system
  private lastTime: number = 0;
  private dropCounter: number = 0;
  private dropInterval: number = 1000; // Base 1 second drop interval
  
  // NEW: Seasonal effect properties
  private seasonalDropSpeedMultiplier: number = 1.0;
  private inputDelayMs: number = 0;
  private seasonalScoreMultiplier: number = 1.0;
  
  // Enhanced scoring system
  private gameStartTime: number = 0;
  private lastSurvivalBonus: number = 0;
  private survivalBonusInterval: number = 30000; // 30 seconds
  
  // Debug frame counter
  private frameCount: number = 0;
  
  // Power-ups and effects
  private activePowerUps: Map<PowerUpType, number> = new Map();
  private effectsContainer!: Phaser.GameObjects.Container;
  
  // Board positioning (set dynamically)
  private boardX: number = 0;
  private boardY: number = 0;
  private blockSize: number = 28;
  
  // Next piece preview positioning
  private nextPieceX: number = 0;
  private nextPieceY: number = 0;

  constructor() {
    super('EnhancedGame');
  }

  init(data: { level?: number; mode?: 'campaign' | 'endless' } = {}) {
    this.currentLevel = data.level || 1;
    this.gameMode = data.mode || 'campaign';
    this.isGameOver = false;
    this.isPaused = false;
    this.lastUpdateTime = 0;
    this.dropTimer = 0;
    this.activePowerUps.clear();
  }

  preload() {
    // Load the beaver images
    this.load.image('beaverstory', '/assets/beaverstory.png');
    this.load.image('beaverlogo', '/assets/beaverlogo.png');
  }

  create() {
    console.log('🎮 EnhancedGame create() called');
    
    // Initialize core managers
    this.initializeManagers();
    console.log('✅ Managers initialized');
    
    // Initialize enhanced scoring system
    this.gameStartTime = Date.now();
    this.lastSurvivalBonus = 0;
    
    // Create visual containers
    this.createContainers();
    console.log('✅ Containers created');
    
    // Initialize rendering systems
    this.initializeRenderers();
    console.log('✅ Renderers initialized');
    
    // Create simple particle texture for timer effects
    this.createTimerParticleTexture();
    
    // Create UI elements
    this.createUI();
    console.log('✅ UI created');
    
    // Setup input handling
    this.setupInput();
    console.log('✅ Input setup complete');
    
    // Setup event listeners
    this.setupEventListeners();
    console.log('✅ Event listeners setup complete');
    
    // Start the game
    console.log('🚀 Starting game...');
    this.startGame();
  }

  private initializeManagers(): void {
    // Core game managers
    this.gameStateManager = new GameStateManager(14, 20);
    this.pieceManager = new PieceManager();
    this.boardManager = new BoardManager(14, 20);
    this.themeManager = new ThemeManager(this);
    
    // Environmental systems (simplified)
    this.seasonalManager = new SeasonalManager(this);
    this.waterLevelManager = new WaterLevelManager(this, 800, 600);
    
    // Initialize grace period from seasonal manager
    const gracePeriod = this.seasonalManager.getCurrentGracePeriod();
    this.waterLevelManager.setGracePeriod(gracePeriod);
    
    // Initialize water rise rate from seasonal manager
    const initialRiseRate = this.seasonalManager.getCurrentWaterRiseRate();
    this.waterLevelManager.setRiseRate(initialRiseRate);
    
    // Layout system with minimal UI
    this.layoutSystem = new MobileFirstLayoutSystem(this, {
      enableResponsiveLayout: false,
      enableMobileOptimizations: true,
      enableNeonStyling: false,
      debugMode: false
    });
  }

  private createTimerParticleTexture(): void {
    // Create a simple white circle texture for timer particle effects
    const graphics = this.add.graphics();
    graphics.fillStyle(0xFFFFFF, 1.0);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('timer_particle', 8, 8);
    graphics.destroy();
  }

  private createContainers(): void {
    // Main game container
    this.gameContainer = this.add.container(0, 0);
    this.gameContainer.setDepth(0);
    
    // UI container
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setDepth(100);
    
    // Story/dialogue container
    this.storyContainer = this.add.container(0, 0);
    this.storyContainer.setDepth(200);
    
    // Effects container
    this.effectsContainer = this.add.container(0, 0);
    this.effectsContainer.setDepth(50);
  }

  private initializeRenderers(): void {
    // Simplified renderers to avoid texture and graphics issues
    this.environmentalRenderer = new EnvironmentalRenderer(this);
    
    // Basic piece renderer
    this.pieceRenderer = new PieceRenderer(this, this.themeManager, {
      blockSize: 30,
      showGrid: true,
      showShadows: false,
      animationSpeed: 1.0,
      enableParticles: false
    });
  }

  private createUI(): void {
    const { width, height } = this.scale;
    
    // Create beautiful neon-style UI inspired by the reference
    this.createNeonScoreUI();
    
    // Create futuristic timer (positioned to avoid scoreboard overlap)
    this.createFuturisticTimer();
    
    // Create game board area
    this.createGameBoard();
    
    // Initialize graphics objects for efficient rendering
    this.initializeGraphics();
    
    // Beaver character and messages
    this.createBeaverUI();
    
    // Mobile controls if needed
    const deviceInfo = this.layoutSystem.getDeviceInfo();
    if (deviceInfo.type === 'mobile' || deviceInfo.isTouchDevice) {
      this.mobileControlsUI = new MobileControlsUI(this, this.layoutSystem);
    }
  }

  private createNeonScoreUI(): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    
    // REDESIGNED: Proper visual hierarchy - stats get priority
    const panelWidth = isMobile ? 160 : 190;
    const panelHeight = isMobile ? 100 : 120;
    const panelX = isMobile ? 5 : 15;
    const panelY = isMobile ? 5 : 15;
    
    // Main panel background
    const scorePanel = this.add.graphics();
    scorePanel.fillStyle(0x0a1428, 0.95);
    scorePanel.lineStyle(2, 0x00FFFF, 0.8);
    scorePanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 6);
    scorePanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 6);
    
    // Inner accent border
    scorePanel.lineStyle(1, 0x4DFFFF, 0.6);
    scorePanel.strokeRoundedRect(panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12, 4);
    
    // REDESIGNED: Minimal title section - much smaller
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x1a2040, 0.6); // More subtle background
    titleBg.fillRoundedRect(panelX + 8, panelY + 8, panelWidth - 16, 16, 3); // Much smaller height
    
    // REDESIGNED: Smaller, less prominent title
    const titleText = this.add.text(panelX + panelWidth/2, panelY + 16, 'DAM ATTACK', {
      fontSize: isMobile ? '8px' : '10px', // Much smaller font
      color: '#FFD700',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    // REDESIGNED: Stats section with proper spacing and hierarchy
    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x0f1a2e, 0.9);
    statsBg.fillRoundedRect(panelX + 8, panelY + 28, panelWidth - 16, panelHeight - 36, 3);
    
    // REDESIGNED: Better font sizes and spacing for readability
    const primaryFontSize = isMobile ? '11px' : '13px'; // Larger for primary stats
    const secondaryFontSize = isMobile ? '9px' : '11px'; // Medium for secondary stats
    const tertiaryFontSize = isMobile ? '8px' : '10px'; // Smaller for tertiary info
    
    // REDESIGNED: Proper spacing system - more breathing room
    const lineSpacing = 16; // Increased from 12px
    const startY = panelY + 40; // Better starting position
    
    // PRIMARY STATS (Most Important) - Larger, more prominent
    this.scoreText = this.add.text(panelX + panelWidth/2, startY, 'SCORE: 000000', {
      fontSize: primaryFontSize,
      color: '#00FF88',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    this.levelText = this.add.text(panelX + panelWidth/2, startY + lineSpacing, 'LEVEL: 01', {
      fontSize: primaryFontSize,
      color: '#00FFFF',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    // SECONDARY STATS - Medium prominence
    this.linesText = this.add.text(panelX + panelWidth/2, startY + lineSpacing * 2, 'LINES: 000', {
      fontSize: secondaryFontSize,
      color: '#FFD700',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    // TERTIARY INFO - Smaller, less prominent
    this.waterLevelText = this.add.text(panelX + panelWidth/2, startY + lineSpacing * 3, 'WATER: 00%', {
      fontSize: tertiaryFontSize,
      color: '#4169E1',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    
    this.seasonText = this.add.text(panelX + panelWidth/2, startY + lineSpacing * 4, 'SPRING', {
      fontSize: tertiaryFontSize,
      color: '#98FB98',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    
    // REDESIGNED: Compact next piece preview
    const nextPieceWidth = isMobile ? 80 : 100;
    const nextPieceHeight = isMobile ? 60 : 75;
    const nextPieceX = width - nextPieceWidth - (isMobile ? 5 : 15);
    const nextPieceY = panelY;
    
    // Store next piece position for rendering
    this.nextPieceX = nextPieceX + 8;
    this.nextPieceY = nextPieceY + 25;
    
    // Next piece panel
    const nextPiecePanel = this.add.graphics();
    nextPiecePanel.lineStyle(3, 0x00FFFF, 0.3);
    nextPiecePanel.strokeRoundedRect(nextPieceX - 2, nextPieceY - 2, nextPieceWidth + 4, nextPieceHeight + 4, 6);
    
    nextPiecePanel.fillStyle(0x0a1428, 0.95);
    nextPiecePanel.lineStyle(2, 0x00FFFF, 0.8);
    nextPiecePanel.fillRoundedRect(nextPieceX, nextPieceY, nextPieceWidth, nextPieceHeight, 4);
    nextPiecePanel.strokeRoundedRect(nextPieceX, nextPieceY, nextPieceWidth, nextPieceHeight, 4);
    
    // REDESIGNED: Better next piece title
    const nextPieceTitle = this.add.text(nextPieceX + nextPieceWidth/2, nextPieceY + 8, 'NEXT', {
      fontSize: isMobile ? '10px' : '12px',
      color: '#FFFF00',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    this.uiContainer.add([
      scorePanel,
      titleBg,
      titleText,
      statsBg,
      this.scoreText,
      this.levelText,
      this.linesText,
      this.waterLevelText,
      this.seasonText,
      nextPiecePanel,
      nextPieceTitle
    ]);
  }

  private createFuturisticTimer(): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    const isFullscreen = width > 1200;
    
    // Responsive positioning to avoid NEXT BLOCK overlap - moved much further down and right
    let timerX: number;
    let timerY: number;
    let timerRadius: number;
    let fontSize: string;
    
    if (isMobile) {
      // Mobile: Position much lower to avoid NEXT BLOCK
      timerX = width - 50;
      timerY = 180; // Much lower
      timerRadius = 25;
      fontSize = '10px';
    } else if (isFullscreen) {
      // Fullscreen: More space, can position further right
      timerX = width - 100;
      timerY = 150;
      timerRadius = 40;
      fontSize = '14px';
    } else {
      // Desktop: Move much lower and further right for 800x600 screens
      timerX = width - 70;
      timerY = 180; // Even lower to ensure no overlap with NEXT BLOCK (which ends at Y=105)
      timerRadius = 32;
      fontSize = '12px';
    }
    
    // Create the futuristic timer
    this.futuristicTimer = new FuturisticTimer(this, {
      x: timerX,
      y: timerY,
      radius: timerRadius,
      maxTime: 30000, // 30 seconds default
      color: 0x00FFFF, // Cyan
      backgroundColor: 0x0a1428, // Dark blue
      borderColor: 0x4DFFFF, // Light cyan
      glowColor: 0x00FFFF, // Cyan glow
      showLabel: true,
      labelText: 'WATER RISES IN'
    });
    
    // Initially hidden
    this.futuristicTimer.setVisible(false);
  }

  private createBeaverUI(): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    
    // Move beaver more to the right and higher to show full beaver including tail
    const beaverX = isMobile ? 70 : 120; // Moved further right
    const beaverY = height - (isMobile ? 180 : 200); // Keep high position
    
    this.beaverContainer = this.add.container(beaverX, beaverY);
    
    // Create a smaller, simpler version of the detailed beaver
    this.createSimpleBeaver(this.beaverContainer);
    
    // Create message bubble for encouraging words
    this.createBeaverMessageSystem();
    
    this.gameContainer.add(this.beaverContainer);
  }

  private setupInput(): void {
    // Keyboard controls
    const cursors = this.input.keyboard?.createCursorKeys();
    const wasd = this.input.keyboard?.addKeys('W,S,A,D,SPACE,UP,DOWN,LEFT,RIGHT');
    
    // Input handling
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isGameOver || this.isPaused) return;
      
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.handleInput(InputAction.MOVE_LEFT);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.handleInput(InputAction.MOVE_RIGHT);
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.handleInput(InputAction.SOFT_DROP);
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyZ':
        case 'KeyX':
          this.handleInput(InputAction.ROTATE);
          break;
        case 'Space':
          this.handleInput(InputAction.HARD_DROP);
          break;
        case 'KeyP':
          this.togglePause();
          break;
      }
    });
    
    // Mobile controls
    if (this.mobileControlsUI) {
      this.mobileControlsUI.onInput = (action: InputAction) => {
        this.handleInput(action);
      };
    }
  }

  private setupEventListeners(): void {
    // Simplified event listeners - remove problematic ones for now
    
    // Level progression events
    this.events.on('level-completed', (data: any) => {
      this.handleLevelCompletion(data);
    });
    
    this.events.on('level-failed', (data: any) => {
      this.handleLevelFailure(data);
    });
    
    // Listen for window resize to reposition timer
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(): void {
    // Reposition timer on window resize
    if (this.futuristicTimer) {
      const { width, height } = this.scale;
      const isMobile = width < 600;
      const isFullscreen = width > 1200;
      
      let timerX: number;
      let timerY: number;
      
      if (isMobile) {
        timerX = width - 50;
        timerY = 180;
      } else if (isFullscreen) {
        timerX = width - 100;
        timerY = 150;
      } else {
        timerX = width - 70;
        timerY = 180;
      }
      
      this.futuristicTimer.setPosition(timerX, timerY);
    }
  }

  private startGame(): void {
    console.log('📖 Starting game - showing opening story');
    // Show opening story element
    this.showOpeningStory();
  }

  private resumeGameplay(): void {
    // This is called after story dismissal - preserve current game state
    console.log('🔄 Resuming gameplay - preserving current state');
    
    const currentState = this.gameStateManager.getState();
    console.log('📊 Current state:', {
      score: currentState.score,
      level: currentState.level,
      lines: currentState.lines,
      hasBoard: !!currentState.board,
      hasCurrentPiece: !!currentState.currentPiece
    });
    
    // Only spawn a new piece if we don't have one
    if (!currentState.currentPiece) {
      console.log('🎲 No current piece - spawning new one');
      this.spawnNewPiece();
    } else {
      console.log('✅ Current piece exists - continuing gameplay');
    }
    
    // Resume game timing
    this.lastUpdateTime = this.time.now;
    
    console.log('🎮 Gameplay resumed successfully!');
  }

  private startActualGameplay(): void {
    // This is called ONLY for initial game start - resets everything
    console.log('🎯 Starting actual gameplay (INITIAL START)...');
    
    // Initialize game state with proper board
    console.log('🏗️ Creating empty board');
    const emptyBoard = this.boardManager.createEmptyBoard();
    console.log('📊 Board created:', emptyBoard.length, 'x', emptyBoard[0].length);
    
    console.log('🔄 Updating game state');
    this.gameStateManager.updateState({
      board: emptyBoard,
      currentPiece: null,
      nextPiece: null,
      isGameOver: false,
      isPaused: false,
      level: 1,
      score: 0,
      lines: 0
    });
    
    console.log('✅ Game state initialized with board:', emptyBoard.length, 'x', emptyBoard[0].length);
    
    // Spawn first piece
    console.log('🎲 Spawning first piece...');
    this.spawnNewPiece();
    
    // Start game loop
    console.log('⏰ Setting up game timing');
    this.lastUpdateTime = this.time.now;
    
    // Show welcome message after a short delay
    this.time.delayedCall(1500, () => {
      this.showBeaverMessage("Welcome! Let's build a dam together!");
    });
    
    // Start periodic encouragement messages
    this.startEncouragementTimer();
    
    // Start the water timer (match grace period duration)
    this.futuristicTimer.start(30000); // 30 seconds to match grace period
    
    console.log('🎮 Actual gameplay setup complete!');
  }

  private startEncouragementTimer(): void {
    // Show random encouragement every 15-25 seconds
    const nextEncouragement = 15000 + Math.random() * 10000;
    
    this.time.delayedCall(nextEncouragement, () => {
      if (!this.isGameOver && !this.isPaused) {
        this.showBeaverMessage(this.getRandomEncouragementMessage());
        this.startEncouragementTimer(); // Schedule next one
      }
    });
  }

  private showOpeningStory(): void {
    console.log('📚 Creating opening story element');
    const openingStory: StoryElement = {
      type: StoryType.LEVEL_START,
      triggerLevel: this.currentLevel,
      content: {
        title: "The Great Dam: A New Beginning",
        text: "The spring thaw has begun! Help our beaver friend build the ultimate dam to protect the forest from rising waters. Stack wooden pieces with precision, battling water levels and the ever-changing seasons. From the gentle Spring Thaw..."
      },
      presentation: {
        displayDuration: 0, // Manual dismiss
        pauseGameplay: true,
        animationType: AnimationType.FADE_IN
      }
    };
    
    console.log('🎭 Displaying story element');
    this.displayStoryElement(openingStory);
  }

  private handleInput(action: InputAction): void {
    const state = this.gameStateManager.getState();
    if (!state.currentPiece) return;
    
    let newPiece: GamePiece | null = null;
    
    switch (action) {
      case InputAction.MOVE_LEFT:
        newPiece = this.pieceManager.movePiece(state.currentPiece, -1, 0);
        break;
      case InputAction.MOVE_RIGHT:
        newPiece = this.pieceManager.movePiece(state.currentPiece, 1, 0);
        break;
      case InputAction.SOFT_DROP:
        newPiece = this.pieceManager.movePiece(state.currentPiece, 0, 1);
        // Add soft drop efficiency bonus
        const softDropBonus = 1; // 1 point per soft drop
        this.gameStateManager.updateState({
          score: state.score + softDropBonus
        });
        break;
      case InputAction.ROTATE:
        newPiece = this.pieceManager.rotatePiece(state.currentPiece);
        break;
      case InputAction.HARD_DROP:
        this.hardDropPiece();
        return;
    }
    
    // Check if move is valid
    if (newPiece && !this.pieceManager.checkCollision(newPiece, state.board)) {
      this.gameStateManager.updateState({ currentPiece: newPiece });
    }
  }

  private spawnNewPiece(): void {
    console.log('🎲 spawnNewPiece() called');
    try {
      const state = this.gameStateManager.getState();
      console.log('📊 Current state:', { 
        hasBoard: !!state.board, 
        boardSize: state.board ? `${state.board.length}x${state.board[0]?.length}` : 'none',
        hasCurrentPiece: !!state.currentPiece,
        hasNextPiece: !!state.nextPiece
      });
      
      // Ensure board exists and is valid
      if (!state.board || state.board.length === 0) {
        console.error('❌ Invalid board state');
        return;
      }
      
      // Use next piece or create new one
      console.log('🎯 Creating new piece...');
      let newPiece = state.nextPiece || this.pieceManager.createRandomPiece();
      
      // Ensure piece was created successfully
      if (!newPiece) {
        console.error('❌ Failed to create piece');
        return;
      }
      
      console.log('✅ Piece created:', newPiece.type);
      
      // Position piece at top center
      newPiece.x = Math.floor(state.board[0].length / 2) - 1;
      newPiece.y = 0;
      console.log('📍 Positioned piece at:', newPiece.x, newPiece.y);
      
      // Check if spawn position is valid
      if (this.pieceManager.checkCollision(newPiece, state.board)) {
        console.log('💀 Game over - spawn position blocked');
        this.handleGameOver('spawn_blocked');
        return;
      }
      
      // Create next piece
      console.log('🔮 Creating next piece...');
      const nextPiece = this.pieceManager.createRandomPiece();
      
      // Update state with error handling
      console.log('🔄 Updating game state with new pieces');
      this.gameStateManager.updateState({
        currentPiece: newPiece,
        nextPiece: nextPiece
      });
      
      console.log('✅ Piece spawned successfully:', newPiece.type);
    } catch (error) {
      console.error('❌ Error spawning piece:', error);
    }
  }

  private hardDropPiece(): void {
    const state = this.gameStateManager.getState();
    if (!state.currentPiece) return;
    
    let dropDistance = 0;
    let testPiece = { ...state.currentPiece };
    
    // Find lowest valid position
    while (!this.pieceManager.checkCollision(testPiece, state.board)) {
      dropDistance++;
      testPiece = this.pieceManager.movePiece(testPiece, 0, 1);
    }
    
    // Move to final position
    const finalPiece = this.pieceManager.movePiece(state.currentPiece, 0, dropDistance - 1);
    this.gameStateManager.updateState({ currentPiece: finalPiece });
    
    // Add hard drop efficiency bonus
    const hardDropBonus = dropDistance * 2; // 2 points per row dropped
    this.gameStateManager.updateState({
      score: state.score + hardDropBonus
    });
    
    console.log(`Hard Drop Bonus: +${hardDropBonus} points!`);
    
    // Place piece immediately
    this.placePiece();
  }

  private placePiece(): void {
    const state = this.gameStateManager.getState();
    if (!state.currentPiece) return;
    
    console.log('Placing piece. Current board valid:', !!state.board);
    
    // Place piece on board
    const newBoard = this.pieceManager.placePiece(state.currentPiece, state.board);
    console.log('New board after placing piece:', !!newBoard);
    
    // Check for line clears with error handling
    let clearedBoard = newBoard;
    let linesCleared = 0;
    
    console.log('Board before line clearing - bottom 5 rows:');
    for (let i = Math.max(0, newBoard.length - 5); i < newBoard.length; i++) {
      console.log(`Row ${i}:`, newBoard[i]);
    }
    
    try {
      if (this.boardManager && this.boardManager.clearLines) {
        const result = this.boardManager.clearLines(newBoard);
        if (result && result.newBoard) {
          clearedBoard = result.newBoard;
          linesCleared = result.clearedLines || 0;
          console.log('BoardManager cleared lines:', linesCleared);
        }
      } else {
        console.warn('BoardManager not available, using simple line clearing');
        // Simple line clearing fallback
        const result = this.simpleLineClear(newBoard);
        clearedBoard = result.board;
        linesCleared = result.linesCleared;
      }
    } catch (error) {
      console.error('Error in line clearing:', error);
      // Use the board as-is if line clearing fails
      clearedBoard = newBoard;
      linesCleared = 0;
    }
    
    console.log('Final board after line clearing:', !!clearedBoard);
    console.log('Lines cleared result:', linesCleared);
    
    // Update score
    const points = this.calculateScore(linesCleared);
    const newScore = state.score + points;
    const newLines = state.lines + linesCleared;
    
    // Create placement effects
    this.createPlacementEffects(state.currentPiece);
    
    // Update game state
    this.gameStateManager.updateState({
      board: clearedBoard,
      currentPiece: null,
      score: newScore,
      lines: newLines
    });
    
    // FIXED: Mark board as dirty so it gets redrawn
    this.boardDirty = true;
    
    // Update UI with new score and lines
    const updatedState = this.gameStateManager.getState();
    this.updateGameUI(updatedState);
    
    // Trigger line clear events
    if (linesCleared > 0) {
      console.log('Lines cleared:', linesCleared);
      
      // NEW: Lower water level when lines are cleared
      // Each cleared line reduces water level by 10% (main defense!)
      const waterReduction = linesCleared * 0.1; // 10% per line cleared
      this.waterLevelManager.lowerWater(waterReduction);
      
      // Create celebration splash effect
      this.waterLevelManager.createSplash(400, 300, linesCleared * 0.5);
      
      const message = this.getBeaverMessage(linesCleared);
      console.log('Beaver message:', message);
      this.events.emit('lines-cleared', linesCleared);
      this.showBeaverMessage(message);
      
      // Show story elements at milestones (check if we've reached or passed the milestone)
      if (newLines >= 10 && state.lines < 10) {
        this.showMilestoneStory(10);
      } else if (newLines >= 25 && state.lines < 25) {
        this.showMilestoneStory(25);
      }
      
      console.log('Water reduced by:', waterReduction, 'Current water level:', this.waterLevelManager.getCurrentLevel());
    }
    
    // Spawn next piece
    this.spawnNewPiece();
  }


  private simpleLineClear(board: number[][]): { board: number[][], linesCleared: number } {
    const newBoard = board.map(row => [...row]);
    let linesCleared = 0;
    
    console.log('Checking for line clears...');
    console.log('Board dimensions:', newBoard.length, 'x', newBoard[0]?.length);
    
    // Check each row from bottom to top
    for (let y = newBoard.length - 1; y >= 0; y--) {
      const row = newBoard[y];
      const nonZeroCells = row.filter(cell => cell !== 0).length;
      const isFull = row.every(cell => cell !== 0);
      
      console.log(`Row ${y}:`, row.slice(0, 5), '...', `Non-zero cells: ${nonZeroCells}/${row.length}`, 'Full:', isFull);
      
      // Check if row is full
      if (isFull) {
        console.log(`Clearing full row ${y}`);
        // Remove the full row
        newBoard.splice(y, 1);
        // Add empty row at top
        newBoard.unshift(Array(newBoard[0]?.length || 10).fill(0));
        linesCleared++;
        y++; // Check the same row again since we shifted everything down
      }
    }
    
    console.log('Lines cleared:', linesCleared);
    return { board: newBoard, linesCleared };
  }

  private calculateScore(linesCleared: number): number {
    // Enhanced line clear scoring - much more rewarding!
    const enhancedBasePoints = [0, 200, 600, 1200, 2000]; // Doubled base points
    const levelMultiplier = this.gameStateManager.getState().level;
    
    let score = (enhancedBasePoints[linesCleared] || 0) * levelMultiplier;
    
    // Apply seasonal score multiplier
    score *= this.seasonalScoreMultiplier;
    
    // Water level risk/reward bonus - higher water = more points!
    const waterLevel = this.waterLevelManager.getCurrentLevel();
    let waterBonus = 0;
    if (waterLevel > 0.25) waterBonus += 50;  // 26-50% water
    if (waterLevel > 0.50) waterBonus += 100; // 51-75% water  
    if (waterLevel > 0.75) waterBonus += 200; // 76-90% water
    if (waterLevel > 0.90) waterBonus += 500; // 91-99% water (danger zone!)
    
    score += waterBonus * linesCleared; // Bonus per line cleared
    
    // Tetris bonus (4 lines at once)
    if (linesCleared === 4) {
      score += 1000; // Massive Tetris bonus!
    }
    
    return Math.floor(score);
  }

  private createPlacementEffects(piece: GamePiece): void {
    // Create water splash effect when piece is placed
    const waterHeight = this.waterLevelManager.getVisualHeight();
    const pieceBottomY = piece.y + (piece.shape.length * this.blockSize);
    
    // If piece is near or touching water, create splash
    if (pieceBottomY >= (600 - waterHeight - 20)) {
      const splashX = piece.x + (piece.shape[0].length * this.blockSize / 2);
      const splashY = 600 - waterHeight;
      this.waterLevelManager.createSplash(splashX, splashY, 1.0);
    }
    
    // Apply seasonal placement effects
    this.applySeasonalPlacementEffects(piece);
  }

  /**
   * Create visual effect for survival bonus
   */
  private createSurvivalBonusEffect(bonus: number): void {
    // Create floating text effect for survival bonus
    const text = this.add.text(400, 200, `+${bonus} SURVIVAL BONUS!`, {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00FF00',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    });
    text.setOrigin(0.5, 0.5);
    
    // Animate the text
    this.tweens.add({
      targets: text,
      y: 150,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  /**
   * Apply seasonal effects when placing pieces
   */
  private applySeasonalPlacementEffects(piece: GamePiece): void {
    const environmentalState = this.seasonalManager.getEnvironmentalState();
    
    // Check for active hazards that affect placement
    environmentalState.activeHazards.forEach(hazard => {
      switch (hazard.hazard.type) {
        case HazardType.ICE_SLIPPERY:
          // Add input delay after placement
          this.addInputDelay(hazard.currentIntensity * 500);
          break;
        case HazardType.WIND_GUST:
          // Slight piece drift effect
          this.createWindDriftEffect(piece, hazard.currentIntensity);
          break;
      }
    });
  }

  /**
   * Add temporary input delay (for ice mechanics)
   */
  private addInputDelay(delayMs: number): void {
    this.inputDelayMs = Math.max(this.inputDelayMs, delayMs);
  }

  /**
   * Create wind drift effect for placed pieces
   */
  private createWindDriftEffect(piece: GamePiece, intensity: number): void {
    // Create particle effect showing wind direction
    const driftX = (Math.random() - 0.5) * intensity * 50;
    const driftY = -Math.random() * intensity * 20;
    
    // Add visual wind particles
    this.createWindParticles(piece.x, piece.y, driftX, driftY, intensity);
  }

  /**
   * Create wind particle effects
   */
  private createWindParticles(x: number, y: number, driftX: number, driftY: number, intensity: number): void {
    // Simple wind particle effect using graphics
    const graphics = this.add.graphics();
    graphics.setDepth(10);
    
    for (let i = 0; i < 5 * intensity; i++) {
      const particleX = x + (Math.random() - 0.5) * 40;
      const particleY = y + (Math.random() - 0.5) * 20;
      
      graphics.fillStyle(0xFFFFFF, 0.6);
      graphics.fillCircle(particleX, particleY, 1 + Math.random() * 2);
    }
    
    // Remove particles after animation
    this.time.delayedCall(1000, () => {
      graphics.destroy();
    });
  }

  /**
   * Update all environmental systems (seasonal, water, wildlife, hazards)
   */
  private updateEnvironmentalSystems(delta: number): void {
    // Update seasonal manager (handles hazards, wildlife, story elements)
    this.seasonalManager.update(delta);
    
    // Update water level manager (handles water physics and rendering)
    this.waterLevelManager.update(delta);
    
    // Update level progression manager (handles level transitions and progress)
    if (this.levelProgressionManager) {
      this.levelProgressionManager.update(delta);
    }
  }

  /**
   * Apply seasonal effects to gameplay mechanics
   */
  private applySeasonalEffects(delta: number): void {
    const modifiers = this.seasonalManager.getSeasonalPieceModifiers();
    
    // Apply drop speed changes
    if (modifiers.dropSpeedMultiplier) {
      // Store the multiplier for use in piece dropping
      this.seasonalDropSpeedMultiplier = modifiers.dropSpeedMultiplier;
    }
    
    // Apply control delays for ice mechanics
    if (modifiers.controlDelayMs) {
      this.inputDelayMs = modifiers.controlDelayMs;
    }
    
    // Apply score multipliers
    if (modifiers.scoreMultiplier) {
      this.seasonalScoreMultiplier = modifiers.scoreMultiplier;
    }
    
    // Apply water rise rate changes
    if (modifiers.waterRiseMultiplier) {
      const currentRiseRate = this.seasonalManager.getCurrentWaterRiseRate();
      this.waterLevelManager.setRiseRate(currentRiseRate * modifiers.waterRiseMultiplier);
    }
    
    // Update input delay timer
    if (this.inputDelayMs > 0) {
      this.inputDelayMs -= delta;
      if (this.inputDelayMs < 0) {
        this.inputDelayMs = 0;
      }
    }
  }

  /**
   * Check if water level has reached game over condition
   */
  private checkWaterLevelGameOver(): void {
    const waterLevel = this.waterLevelManager.getCurrentLevel();
    if (waterLevel >= 1.0) {
      this.triggerGameOver('water_level');
    }
  }

  /**
   * Update survival bonuses - reward players for staying alive
   */
  private updateSurvivalBonuses(): void {
    const currentTime = Date.now();
    const gameTime = currentTime - this.gameStartTime;
    
    // Check if enough time has passed for a survival bonus
    if (gameTime - this.lastSurvivalBonus >= this.survivalBonusInterval) {
      this.lastSurvivalBonus = gameTime;
      
      // Calculate survival bonus based on time survived
      let survivalBonus = 0;
      const minutesSurvived = Math.floor(gameTime / 60000);
      
      if (minutesSurvived >= 1) survivalBonus += 100;  // 1 minute
      if (minutesSurvived >= 2) survivalBonus += 250;  // 2 minutes  
      if (minutesSurvived >= 5) survivalBonus += 500;   // 5 minutes
      if (minutesSurvived >= 10) survivalBonus += 1000; // 10 minutes
      
      if (survivalBonus > 0) {
        // Add bonus to score
        const state = this.gameStateManager.getState();
        this.gameStateManager.updateState({
          score: state.score + survivalBonus
        });
        
        // Show survival bonus message
        console.log(`Survival Bonus: +${survivalBonus} points! (${minutesSurvived} minutes)`);
        
        // Create visual effect for survival bonus
        this.createSurvivalBonusEffect(survivalBonus);
      }
    }
  }

  /**
   * Trigger game over with specific reason
   */
  private triggerGameOver(reason: 'water_level' | 'board_full' | 'time_up'): void {
    this.isGameOver = true;
    
    // Create splash effect at water surface
    if (reason === 'water_level') {
      const waterHeight = this.waterLevelManager.getVisualHeight();
      this.waterLevelManager.createSplash(400, 600 - waterHeight, 2.0);
    }
    
    // Emit game over event
    this.events.emit('game-over', reason);
    
    // Show game over UI after a brief delay
    this.time.delayedCall(1000, () => {
      this.showGameOverScreen(reason);
    });
  }

  /**
   * Show game over screen with reason-specific message
   */
  private showGameOverScreen(reason: 'water_level' | 'board_full' | 'time_up'): void {
    const { width, height } = this.scale;
    
    // Create game over overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(200);
    
    // Game over text
    const gameOverText = this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontSize: '48px',
      color: '#FF4444',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    gameOverText.setDepth(201);
    
    // Reason-specific message
    let reasonMessage = '';
    switch (reason) {
      case 'water_level':
        reasonMessage = '🌊 The water has risen too high!\nYour dam couldn\'t hold back the flood.';
        break;
      case 'board_full':
        reasonMessage = '🏗️ The board is full!\nNo more room to build your dam.';
        break;
      case 'time_up':
        reasonMessage = '⏰ Time\'s up!\nThe seasonal changes were too fast.';
        break;
    }
    
    const reasonText = this.add.text(width / 2, height / 2 + 20, reasonMessage, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    reasonText.setDepth(201);
    
    // Final score
    const finalScore = this.gameStateManager.getState().score;
    const scoreText = this.add.text(width / 2, height / 2 + 80, `Final Score: ${finalScore}`, {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    scoreText.setDepth(201);
    
    // Restart button
    const restartButton = this.add.text(width / 2, height / 2 + 140, '🔄 Try Again', {
      fontSize: '20px',
      color: '#00FFFF',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    restartButton.setDepth(201);
    restartButton.setInteractive();
    
    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
    
    restartButton.on('pointerover', () => {
      restartButton.setColor('#FFFFFF');
    });
    
    restartButton.on('pointerout', () => {
      restartButton.setColor('#00FFFF');
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver || this.isPaused) {
      return;
    }
    
    // OPTIMIZED: Initialize timing on first frame
    if (this.lastTime === 0) {
      this.lastTime = time;
    }
    
    // OPTIMIZED: Calculate proper delta time
    const frameDelta = time - this.lastTime;
    this.lastTime = time;
    
    // DEBUG: Log every 60 frames for performance monitoring
    this.frameCount++;
    // REMOVED: Debug logging for performance
    // if (this.frameCount % 60 === 0) {
    //   console.log(`🔄 MAIN UPDATE: Frame ${this.frameCount}, delta=${frameDelta.toFixed(2)}, time=${time}`);
    // }
    
    // OPTIMIZED: Core game logic only
    this.updatePieceDrop(frameDelta);
    
    // OPTIMIZED: Reduce environmental updates (every 3rd frame)
    if (this.frameCount % 3 === 0) {
      this.updateEnvironmentalSystems(frameDelta);
      this.applySeasonalEffects(frameDelta);
      this.updateSurvivalBonuses();
    }
    
    // OPTIMIZED: Check game over conditions less frequently
    if (this.frameCount % 10 === 0) {
      this.checkWaterLevelGameOver();
    }
    
    // Update timer
    if (this.futuristicTimer) {
      this.futuristicTimer.update(frameDelta);
    }
    
    // FIXED: Render every frame for smooth movement
    try {
      this.renderGameState();
    } catch (error) {
      console.error('Error in renderGameState:', error);
    }
  }

  private updatePieceDrop(delta: number): void {
    const state = this.gameStateManager.getState();
    if (!state.currentPiece) {
      return;
    }
    
    // OPTIMIZED: Simple, efficient timing system
    this.dropCounter += delta;
    
    // Calculate drop interval based on level (simplified)
    const levelDropInterval = Math.max(200, this.dropInterval - (state.level * 50));
    
    if (this.dropCounter >= levelDropInterval) {
      this.dropCounter = 0;
      
      // Move piece down
      const newPiece = this.pieceManager.movePiece(state.currentPiece, 0, 1);
      
      // Check collision
      if (this.pieceManager.checkCollision(newPiece, state.board)) {
        // Piece can't move down, place it
        this.placePiece();
      } else {
        // Update piece position
        this.gameStateManager.updateState({ currentPiece: newPiece });
      }
    }
  }

  // REMOVED: updatePowerUps method to reduce performance overhead

  private updateEnvironmentalEffects(): void {
    // Simplified environmental effects - remove complex hazard system for now
  }

  private handleHazardEffect(hazard: any): void {
    switch (hazard.hazard.type) {
      case HazardType.LIGHTNING:
        // Temporarily increase drop speed
        this.time.delayedCall(500, () => {
          // Speed boost effect
        });
        break;
      case HazardType.WIND_GUST:
        // Slightly push current piece
        const state = this.gameStateManager.getState();
        if (state.currentPiece) {
          const direction = Math.random() < 0.5 ? -1 : 1;
          const pushedPiece = this.pieceManager.movePiece(state.currentPiece, direction, 0);
          if (!this.pieceManager.checkCollision(pushedPiece, state.board)) {
            this.gameStateManager.updateState({ currentPiece: pushedPiece });
          }
        }
        break;
    }
  }

  private spawnPowerUpVisual(powerUp: any): void {
    // Create visual power-up that player can collect
    const powerUpSprite = this.add.graphics();
    powerUpSprite.fillStyle(0xFFD700); // Gold color
    powerUpSprite.fillStar(powerUp.x, powerUp.y, 5, 10, 20);
    
    // Make it interactive
    powerUpSprite.setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);
    powerUpSprite.on('pointerdown', () => {
      this.collectPowerUp(powerUp.type);
      powerUpSprite.destroy();
    });
    
    // Auto-expire after 10 seconds
    this.time.delayedCall(10000, () => {
      if (powerUpSprite.active) {
        powerUpSprite.destroy();
      }
    });
  }

  private collectPowerUp(type: PowerUpType): void {
    const duration = 15000; // 15 seconds
    this.activePowerUps.set(type, duration);
    
    switch (type) {
      case PowerUpType.WATER_PUMP:
        this.waterLevelManager.lowerWater(0.2); // Lower by 20%
        break;
      case PowerUpType.BEAVER_HELPER:
        // Auto-place next few pieces optimally
        break;
      case PowerUpType.CLEAR_VISION:
        // Remove weather effects temporarily
        break;
    }
    
    this.showBeaverMessage(`Power-up activated: ${type}!`);
  }

  private displayStoryElement(element: StoryElement): void {
    if (element.presentation.pauseGameplay) {
      this.isPaused = true;
    }
    
    this.createBeautifulStoryDisplay(element);
  }

  private createBeautifulStoryDisplay(element: StoryElement): void {
    const { width, height } = this.scale;
    
    // Pause gameplay if specified
    if (element.presentation.pauseGameplay) {
      this.isPaused = true;
    }
    
    // Create story container
    const storyContainer = this.add.container(width / 2, height / 2);
    storyContainer.setDepth(300);
    
    // Responsive panel sizing
    const isMobile = width < 600;
    const panelWidth = Math.min(isMobile ? width - 20 : 700, width - 40);
    const panelHeight = Math.min(isMobile ? height - 20 : 500, height - 40);
    
    // Outer glow effect
    const outerGlow = this.add.graphics();
    outerGlow.lineStyle(8, 0x00FFFF, 0.3);
    outerGlow.strokeRoundedRect(-panelWidth/2 - 10, -panelHeight/2 - 10, panelWidth + 20, panelHeight + 20, 20);
    
    // Main panel background
    const mainPanel = this.add.graphics();
    mainPanel.fillStyle(0x1a1a2e, 0.95);
    mainPanel.lineStyle(4, 0x00FFFF, 0.8);
    mainPanel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
    mainPanel.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
    
    // Inner accent border
    const innerBorder = this.add.graphics();
    innerBorder.lineStyle(2, 0x4DFFFF, 0.6);
    innerBorder.strokeRoundedRect(-panelWidth/2 + 10, -panelHeight/2 + 10, panelWidth - 20, panelHeight - 20, 10);
    
    // Header section with level info
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0f3460, 0.8);
    headerBg.fillRoundedRect(-panelWidth/2 + 20, -panelHeight/2 + 20, panelWidth - 40, 50, 8);
    
    // Level title (responsive font size)
    const levelTitle = this.add.text(0, -panelHeight/2 + 45, `LEVEL ${this.currentLevel}: SPRING THAW`, {
      fontSize: isMobile ? '18px' : '22px',
      color: '#00FFFF',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    
    // Progress bar background
    const progressBarWidth = Math.min(300, panelWidth - 100);
    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x2a2a4a, 0.8);
    progressBg.fillRoundedRect(-progressBarWidth/2, -panelHeight/2 + 60, progressBarWidth, 8, 4);
    
    // Progress bar fill (simulate progress)
    const progress = Math.min(1, this.currentLevel / 20);
    const progressFill = this.add.graphics();
    progressFill.fillStyle(0x00FF88, 0.9);
    progressFill.fillRoundedRect(-progressBarWidth/2, -panelHeight/2 + 60, progressBarWidth * progress, 8, 4);
    
    // Character illustration area (positioned better to not overlap header)
    const charYPosition = isMobile ? -20 : -40;
    const charContainer = this.add.container(0, charYPosition);
    
    // Create detailed beaver character
    this.createDetailedBeaver(charContainer);
    
    // Decorative elements (spring theme)
    this.addSpringDecorations(storyContainer, panelWidth, panelHeight);
    
    // Story title (positioned above text area)
    const titleYPosition = panelHeight/2 - (isMobile ? 140 : 160);
    const titleText = this.add.text(0, titleYPosition, element.content.title, {
      fontSize: isMobile ? '16px' : '18px',
      color: '#FFD700',
      fontFamily: 'Arial Black',
      align: 'center',
      wordWrap: { width: panelWidth - 60 }
    }).setOrigin(0.5);
    
    // Story text area (positioned below title with proper spacing)
    const textAreaHeight = isMobile ? 100 : 120;
    const textYPosition = panelHeight/2 - textAreaHeight + 20;
    
    const textBg = this.add.graphics();
    textBg.fillStyle(0x0a1428, 0.9);
    textBg.lineStyle(2, 0x4DFFFF, 0.4);
    textBg.fillRoundedRect(-panelWidth/2 + 30, textYPosition - 20, panelWidth - 60, textAreaHeight, 8);
    textBg.strokeRoundedRect(-panelWidth/2 + 30, textYPosition - 20, panelWidth - 60, textAreaHeight, 8);
    
    // Main story text (positioned properly within text area)
    const storyText = this.add.text(0, textYPosition + 20, element.content.text, {
      fontSize: isMobile ? '14px' : '16px',
      color: '#E0E0E0',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: panelWidth - 80 },
      lineSpacing: 2
    }).setOrigin(0.5);
    
    // Continue button (positioned at bottom)
    const continueBtn = this.createStyledButton(0, panelHeight/2 - 35, 'Continue', () => {
      console.log('🔘 Continue button clicked - dismissing story');
      // Animate out
      this.tweens.add({
        targets: storyContainer,
        alpha: 0,
        scale: 0.8,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          console.log('🎬 Story animation complete - destroying container');
          storyContainer.destroy();
          this.isPaused = false;
          console.log('🎮 Resuming gameplay after story');
          // Resume gameplay without resetting the game state
          this.resumeGameplay();
        }
      });
    });
    
    // Add all elements to container
    storyContainer.add([
      outerGlow,
      mainPanel,
      innerBorder,
      headerBg,
      levelTitle,
      progressBg,
      progressFill,
      charContainer,
      textBg,
      titleText,
      storyText,
      continueBtn
    ]);
    
    // Animate in
    storyContainer.setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: storyContainer,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
    
    // Auto-close after duration if specified (only if displayDuration > 0)
    if (element.presentation.displayDuration > 0) {
      this.time.delayedCall(element.presentation.displayDuration, () => {
        if (storyContainer.active) {
          continueBtn.emit('pointerdown');
        }
      });
    }
  }

  private addSpringDecorations(container: Phaser.GameObjects.Container, panelWidth: number, panelHeight: number): void {
    // Fewer, smaller cherry blossom petals positioned to not interfere with text
    for (let i = 0; i < 4; i++) {
      const petal = this.add.graphics();
      petal.fillStyle(0xFFB6C1, 0.5);
      petal.fillCircle(0, 0, 2);
      
      // Position petals in corners and edges, away from center content
      const x = (Math.random() - 0.5) * (panelWidth - 200);
      const y = (Math.random() - 0.5) * (panelHeight - 200);
      petal.setPosition(x, y);
      
      // Gentle floating animation
      this.tweens.add({
        targets: petal,
        y: y - 15,
        duration: 4000 + Math.random() * 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      container.add(petal);
    }
    
    // Smaller trees/bushes in bottom corners only
    const leftTree = this.add.graphics();
    leftTree.fillStyle(0x228B22, 0.4);
    leftTree.fillCircle(-panelWidth/2 + 30, panelHeight/2 - 40, 15);
    leftTree.fillStyle(0x8B4513, 0.6);
    leftTree.fillRect(-panelWidth/2 + 27, panelHeight/2 - 30, 4, 15);
    
    const rightTree = this.add.graphics();
    rightTree.fillStyle(0x228B22, 0.4);
    rightTree.fillCircle(panelWidth/2 - 30, panelHeight/2 - 40, 15);
    rightTree.fillStyle(0x8B4513, 0.6);
    rightTree.fillRect(panelWidth/2 - 32, panelHeight/2 - 30, 4, 15);
    
    container.add([leftTree, rightTree]);
  }

  private createStyledButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const buttonContainer = this.add.container(x, y);
    
    // Button background
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x00AA88, 0.9);
    buttonBg.lineStyle(2, 0x00FFAA, 0.8);
    buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
    buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    
    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    
    buttonContainer.add([buttonBg, buttonText]);
    
    // Make interactive
    buttonContainer.setSize(120, 30);
    buttonContainer.setInteractive();
    
    // Hover effects
    buttonContainer.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x00CCAA, 1.0);
      buttonBg.lineStyle(2, 0x00FFAA, 1.0);
      buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
      buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    });
    
    buttonContainer.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x00AA88, 0.9);
      buttonBg.lineStyle(2, 0x00FFAA, 0.8);
      buttonBg.fillRoundedRect(-60, -15, 120, 30, 15);
      buttonBg.strokeRoundedRect(-60, -15, 120, 30, 15);
    });
    
    buttonContainer.on('pointerdown', callback);
    
    return buttonContainer;
  }

  private showBeaverMessage(message: string): void {
    console.log('showBeaverMessage called with:', message);
    console.log('messageText exists:', !!this.messageText);
    console.log('messageBubbleGraphics exists:', !!this.messageBubbleGraphics);
    
    if (!this.messageText || !this.messageBubbleGraphics) {
      console.log('Missing message components, returning early');
      console.log('messageText:', this.messageText);
      console.log('messageBubbleGraphics:', this.messageBubbleGraphics);
      return;
    }
    
    this.messageText.setText(message);
    this.messageBubbleGraphics.setVisible(true); // Show the container (which contains both bubble and text)
    
    // Ensure text color is white and visible
    this.messageText.setColor('#FFFFFF');
    this.messageText.setAlpha(1);
    this.messageText.setVisible(true); // Explicitly set text visibility
    this.messageBubbleGraphics.setAlpha(1);
    
    // Debug text properties BEFORE animation
    console.log('Message set and made visible:', message);
    console.log('Text content:', this.messageText.text);
    console.log('Text position:', this.messageText.x, this.messageText.y);
    console.log('Text visible:', this.messageText.visible);
    console.log('Text alpha BEFORE animation:', this.messageText.alpha);
    console.log('Text depth:', this.messageText.depth);
    console.log('Text color:', this.messageText.style.color);
    console.log('Text stroke color:', this.messageText.style.stroke);
    console.log('Bubble position:', this.messageBubbleGraphics.x, this.messageBubbleGraphics.y);
    console.log('Bubble visible:', this.messageBubbleGraphics.visible);
    console.log('Bubble alpha BEFORE animation:', this.messageBubbleGraphics.alpha);
    console.log('Bubble depth:', this.messageBubbleGraphics.depth);
    console.log('Screen dimensions:', this.scale.width, this.scale.height);
    
    // Animate message bubble appearing
    this.messageBubbleGraphics.setAlpha(0);
    
    this.tweens.add({
      targets: this.messageBubbleGraphics,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Ensure container remains visible after animation
        this.messageBubbleGraphics.setAlpha(1);
        this.messageText.setAlpha(1);
        this.messageText.setVisible(true); // Ensure text remains visible after animation
        
        // Debug logging after animation completes
        console.log('Animation completed - Container alpha:', this.messageBubbleGraphics.alpha);
        console.log('Animation completed - Container visible:', this.messageBubbleGraphics.visible);
        console.log('Animation completed - Text alpha:', this.messageText.alpha);
        console.log('Animation completed - Text visible:', this.messageText.visible);
      }
    });
    
    // Animate beaver excitement
    this.tweens.add({
      targets: this.beaverContainer,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Hide message after 4 seconds with fade out
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: this.messageBubbleGraphics,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          this.messageBubbleGraphics.setVisible(false);
        }
      });
    });
  }

  private getBeaverMessage(linesCleared: number): string {
    const singleLineMessages = [
      "Nice work, builder!",
      "Great job stacking!",
      "The dam grows stronger!",
      "Perfect log placement!",
      "You're a natural!",
      "Keep it up, friend!",
      "Solid construction!",
      "The forest is proud!"
    ];
    
    const multiLineMessages = [
      "Excellent! Multiple lines!",
      "Fantastic clearing!",
      "The dam is taking shape!",
      "Outstanding work!",
      "You're on fire!",
      "Incredible building skills!"
    ];
    
    const tetrisMessages = [
      "AMAZING! TETRIS! The dam is legendary!",
      "INCREDIBLE! Four lines! Master builder!",
      "SPECTACULAR! The ultimate dam section!",
      "PHENOMENAL! Tetris mastery!"
    ];
    
    if (linesCleared >= 4) {
      return tetrisMessages[Math.floor(Math.random() * tetrisMessages.length)];
    } else if (linesCleared >= 2) {
      return multiLineMessages[Math.floor(Math.random() * multiLineMessages.length)];
    } else if (linesCleared === 1) {
      return singleLineMessages[Math.floor(Math.random() * singleLineMessages.length)];
    }
    
    return "Keep building!";
  }

  private getRandomEncouragementMessage(): string {
    const encouragements = [
      "You've got this!",
      "Building like a pro!",
      "The forest believes in you!",
      "Dam construction expert!",
      "Stack those logs!",
      "Protect the forest!",
      "Every piece matters!",
      "Building the future!"
    ];
    
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }

  private updateGameUI(state: any): void {
    // Format numbers with leading zeros like in the reference
    const formattedScore = state.score.toString().padStart(6, '0');
    const formattedLevel = state.level.toString().padStart(2, '0');
    const formattedLines = state.lines.toString().padStart(3, '0');
    
    this.scoreText.setText(`SCORE: ${formattedScore}`);
    this.levelText.setText(`LEVEL: ${formattedLevel}`);
    this.linesText.setText(`LINES: ${formattedLines}`);
  }

  private updateSeasonalUI(envState: EnvironmentalState): void {
    const seasonNames = {
      spring: 'Spring 🌸',
      summer: 'Summer ☀️',
      autumn: 'Autumn 🍂',
      winter: 'Winter ❄️'
    };
    
    this.seasonText.setText(seasonNames[envState.currentSeason] || envState.currentSeason);
    
    // Update season-specific UI colors
    const seasonColors = {
      spring: '#98FB98',
      summer: '#FFD700',
      autumn: '#FFA500',
      winter: '#E6E6FA'
    };
    
    this.seasonText.setColor(seasonColors[envState.currentSeason] || '#FFFFFF');
  }

  private updateWaterLevelUI(level: number): void {
    const percentage = Math.round(level * 100);
    this.waterLevelText.setText(`Water: ${percentage}%`);
    
    // Change color based on danger level
    if (percentage > 80) {
      this.waterLevelText.setColor('#FF0000'); // Red - danger
    } else if (percentage > 60) {
      this.waterLevelText.setColor('#FFA500'); // Orange - warning
    } else {
      this.waterLevelText.setColor('#4169E1'); // Blue - safe
    }
  }

  private handleLevelCompletion(data: any): void {
    this.isPaused = true;
    
    // Show completion screen
    const completionPanel = this.add.graphics();
    completionPanel.fillStyle(0x000000, 0.9);
    completionPanel.fillRect(150, 200, 500, 200);
    completionPanel.setDepth(300);
    
    const completionText = this.add.text(400, 250, 'Level Complete!', {
      fontSize: '32px',
      color: '#FFD700',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(301);
    
    const statsText = this.add.text(400, 300, 
      `Stars: ${'⭐'.repeat(data.stars)}\nScore: ${data.score.toLocaleString()}\nTime: ${Math.round(data.timeElapsed/1000)}s`, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5).setDepth(301);
    
    // Continue button
    const continueButton = this.add.text(400, 360, 'Continue', {
      fontSize: '20px',
      color: '#00FF00',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(301);
    
    continueButton.setInteractive();
    continueButton.on('pointerdown', () => {
      // Go to next level or level select
      this.scene.start('LevelSelect');
    });
  }

  private handleLevelFailure(data: any): void {
    this.handleGameOver(data.reason);
  }

  private handleGameOver(reason: string): void {
    this.isGameOver = true;
    
    const state = this.gameStateManager.getState();
    
    // Show game over screen
    this.scene.start('GameOver', {
      score: state.score,
      level: this.currentLevel,
      lines: state.lines,
      reason: reason
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      // Show pause overlay
      const pauseOverlay = this.add.graphics();
      pauseOverlay.fillStyle(0x000000, 0.7);
      pauseOverlay.fillRect(0, 0, 800, 600);
      pauseOverlay.setDepth(200);
      
      const pauseText = this.add.text(400, 300, 'PAUSED\nPress P to continue', {
        fontSize: '32px',
        color: '#FFFFFF',
        fontFamily: 'Arial Black',
        align: 'center'
      }).setOrigin(0.5).setDepth(201);
    }
  }

  private showMilestoneStory(lines: number): void {
    let storyText = "";
    let title = "";
    
    if (lines === 10) {
      title = "Dam Foundation Complete!";
      storyText = "Excellent progress! The dam foundation is taking shape. The beaver community is impressed with your building skills. Keep stacking those wooden pieces!";
    } else if (lines === 25) {
      title = "Legendary Builder!";
      storyText = "Amazing work! Your dam is becoming legendary. The forest animals gather to watch your masterful construction. The water levels are rising - can you keep up?";
    }
    
    const milestoneStory: StoryElement = {
      type: StoryType.MILESTONE,
      triggerLevel: this.currentLevel,
      content: {
        title: title,
        text: storyText
      },
      presentation: {
        displayDuration: 0, // No auto-dismiss - wait for user to click Continue
        pauseGameplay: true, // Pause gameplay for important milestones
        animationType: AnimationType.FADE_IN
      }
    };
    
    this.displayStoryElement(milestoneStory);
  }

  private createDetailedBeaver(container: Phaser.GameObjects.Container): void {
    // Use the custom beaver image
    const beaverImage = this.add.image(0, 0, 'beaverstory');
    
    // Responsive scaling based on screen size
    const { width } = this.scale;
    const isMobile = width < 600;
    const baseScale = isMobile ? 0.4 : 0.5;
    
    beaverImage.setScale(baseScale);
    
    // Add subtle breathing animation
    this.tweens.add({
      targets: beaverImage,
      scaleX: baseScale + 0.02,
      scaleY: baseScale - 0.02,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    container.add(beaverImage);
  }

  private createSimpleBeaver(container: Phaser.GameObjects.Container): void {
    // Use the beaverlogo for gameplay UI
    const beaverImage = this.add.image(0, 0, 'beaverlogo');
    
    // Scale it smaller so it doesn't interfere with gameplay
    beaverImage.setScale(0.4);
    
    container.add(beaverImage);
  }

  private createGameBoard(): void {
    const { width, height } = this.scale;
    
    // Calculate available space more aggressively for larger board
    const isMobile = width < 600;
    
    // Reserve space for UI panels (score panel is ~270px wide, next piece ~120px)
    const reservedWidth = isMobile ? 60 : 420; // Much less reserved space
    const reservedHeight = isMobile ? 80 : 120;
    
    // Calculate maximum possible block size
    const availableWidth = width - reservedWidth;
    const availableHeight = height - reservedHeight;
    
    // Calculate block size to use maximum available space
    // Increased board width from 12 to 14 for even wider playing field
    const maxBlockSizeByWidth = Math.floor(availableWidth / 14);
    const maxBlockSizeByHeight = Math.floor(availableHeight / 20);
    
    // Use the smaller of the two to ensure board fits
    let blockSize = Math.min(maxBlockSizeByWidth, maxBlockSizeByHeight);
    
    // Set minimum and maximum sizes
    blockSize = Math.max(blockSize, isMobile ? 18 : 25); // Minimum size
    blockSize = Math.min(blockSize, isMobile ? 35 : 50); // Maximum size for playability
    
    const boardWidth = 14 * blockSize;
    const boardHeight = 20 * blockSize;
    
    // Center the board horizontally
    const boardX = (width - boardWidth) / 2;
    const boardY = isMobile ? 40 : 60;
    
    console.log(`Board sizing: ${width}x${height} screen, ${blockSize}px blocks, ${boardWidth}x${boardHeight} board`);
    
    // Store board dimensions for rendering
    this.boardX = boardX;
    this.boardY = boardY;
    this.blockSize = blockSize;
    
    // Board background
    const boardBg = this.add.graphics();
    boardBg.fillStyle(0x1a1a2e, 0.8);
    boardBg.fillRect(boardX, boardY, boardWidth, boardHeight);
    
    // Board border
    const boardBorder = this.add.graphics();
    boardBorder.lineStyle(3, 0x00FFFF, 0.8);
    boardBorder.strokeRect(boardX - 3, boardY - 3, boardWidth + 6, boardHeight + 6);
    
    // Grid lines
    const gridLines = this.add.graphics();
    gridLines.lineStyle(1, 0x333366, 0.3);
    
    // Vertical lines (updated for 14 columns)
    for (let x = 1; x < 14; x++) {
      gridLines.lineBetween(
        boardX + x * blockSize, boardY,
        boardX + x * blockSize, boardY + boardHeight
      );
    }
    
    // Horizontal lines
    for (let y = 1; y < 20; y++) {
      gridLines.lineBetween(
        boardX, boardY + y * blockSize,
        boardX + boardWidth, boardY + y * blockSize
      );
    }
    
    this.gameContainer.add([boardBg, boardBorder, gridLines]);
  }

  // FIXED: Separate graphics layers for efficient rendering
  private boardGraphics!: Phaser.GameObjects.Graphics; // Static placed blocks
  private pieceGraphics!: Phaser.GameObjects.Graphics; // Moving piece only
  private uiGraphics!: Phaser.GameObjects.Graphics; // UI elements
  private boardDirty: boolean = true; // Flag to know when to redraw board

  private initializeGraphics(): void {
    try {
      // SAFETY: Check if containers exist before adding graphics
      if (!this.gameContainer || !this.uiContainer) {
        console.error('Containers not initialized:', {
          gameContainer: !!this.gameContainer,
          uiContainer: !!this.uiContainer
        });
        return;
      }
      
      // FIXED: Create separate graphics layers for efficient rendering
      this.boardGraphics = this.add.graphics();
      this.boardGraphics.setDepth(10);
      this.gameContainer.add(this.boardGraphics);
      
      this.pieceGraphics = this.add.graphics();
      this.pieceGraphics.setDepth(11); // Above board
      this.gameContainer.add(this.pieceGraphics);
      
      this.uiGraphics = this.add.graphics();
      this.uiGraphics.setDepth(10);
      this.uiContainer.add(this.uiGraphics);
      
      console.log('✅ Graphics layers initialized:', {
        boardGraphics: !!this.boardGraphics,
        pieceGraphics: !!this.pieceGraphics,
        uiGraphics: !!this.uiGraphics
      });
    } catch (error) {
      console.error('Error initializing graphics:', error);
    }
  }

  private clearAllPieceGraphics(): void {
    // SAFETY: Only clear if graphics objects exist
    if (this.pieceGraphics && this.pieceGraphics.active) {
      this.pieceGraphics.clear();
    }
    if (this.uiGraphics && this.uiGraphics.active) {
      this.uiGraphics.clear();
    }
  }

  private renderGameState(): void {
    // SAFETY: Don't render if core systems aren't ready
    if (!this.gameStateManager || !this.gameContainer || !this.uiContainer) {
      return;
    }
    
    const state = this.gameStateManager.getState();
    
    // SAFETY: Ensure graphics objects are initialized
    if (!this.boardGraphics || !this.pieceGraphics || !this.uiGraphics) {
      console.warn('Graphics objects not initialized, initializing now...');
      this.initializeGraphics();
    }
    
    // Check if state is valid
    if (!state.board || !Array.isArray(state.board)) {
      console.error('Invalid board state:', state.board);
      return;
    }
    
    // Update UI with environmental information
    this.updateEnvironmentalUI();
    
    // Use dynamic board positioning
    const boardX = this.boardX;
    const boardY = this.boardY;
    const blockSize = this.blockSize;
    
    // FIXED: Only redraw the static board when it changes (pieces placed)
    if (this.boardDirty) {
      this.boardGraphics.clear();
      for (let y = 0; y < state.board.length; y++) {
        for (let x = 0; x < state.board[y].length; x++) {
          if (state.board[y][x] !== 0) {
            this.drawWoodBlock(
              this.boardGraphics,
              boardX + x * blockSize,
              boardY + y * blockSize,
              blockSize,
              'placed'
            );
          }
        }
      }
      this.boardDirty = false;
    }
    
    // FIXED: Always redraw the falling piece (clear and redraw)
    this.pieceGraphics.clear();
    if (state.currentPiece) {
      const piece = state.currentPiece;
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x] !== 0) {
            this.drawWoodBlock(
              this.pieceGraphics,
              boardX + (piece.x + x) * blockSize,
              boardY + (piece.y + y) * blockSize,
              blockSize,
              'falling'
            );
          }
        }
      }
    }
    
    // Render next piece preview
    this.renderNextPiecePreview(state);
  }

  /**
   * Update UI with environmental information (water level, season, etc.)
   */
  private updateEnvironmentalUI(): void {
    const waterLevel = this.waterLevelManager.getCurrentLevel();
    const environmentalState = this.seasonalManager.getEnvironmentalState();
    const currentLevel = environmentalState.currentLevel;
    const gracePeriodRemaining = this.waterLevelManager.getGracePeriodRemaining();
    const isGracePeriodActive = this.waterLevelManager.isGracePeriodActive();
    
    // Create or update water level display
    if (!this.waterLevelText) {
      this.waterLevelText = this.add.text(50, 50, '', {
        fontSize: '16px',
        color: '#00FFFF',
        fontFamily: 'Arial Black',
        stroke: '#000000',
        strokeThickness: 2
      });
      this.waterLevelText.setDepth(100);
    }
    
    // Update water level text
    const waterPercentage = Math.floor(waterLevel * 100);
    this.waterLevelText.setText(`🌊 Water Level: ${waterPercentage}%`);
    
    // Change color based on danger level
    if (waterPercentage > 80) {
      this.waterLevelText.setColor('#FF4444'); // Red for danger
    } else if (waterPercentage > 60) {
      this.waterLevelText.setColor('#FFAA00'); // Orange for warning
    } else {
      this.waterLevelText.setColor('#00FFFF'); // Cyan for normal
    }
    
    // Create or update season display
    if (!this.seasonText) {
      this.seasonText = this.add.text(50, 80, '', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: 'Arial Black',
        stroke: '#000000',
        strokeThickness: 2
      });
      this.seasonText.setDepth(100);
    }
    
    // Update season text with emoji
    const seasonEmoji = this.getSeasonEmoji(currentLevel.season);
    this.seasonText.setText(`${seasonEmoji} ${currentLevel.name} - ${currentLevel.season.toUpperCase()}`);
    
    // Update season text color based on season
    this.seasonText.setColor(this.getSeasonColor(currentLevel.season));
    
    // Update futuristic timer
    if (isGracePeriodActive && gracePeriodRemaining > 0) {
      if (!this.futuristicTimer.isRunning()) {
        this.futuristicTimer.start(gracePeriodRemaining);
      }
      this.futuristicTimer.setVisible(true);
    } else {
      this.futuristicTimer.stop();
    }
  }

  /**
   * Get emoji for season
   */
  private getSeasonEmoji(season: string): string {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      default: return '🌿';
    }
  }

  /**
   * Get color for season
   */
  private getSeasonColor(season: string): string {
    switch (season) {
      case 'spring': return '#98FB98'; // Light green
      case 'summer': return '#FFD700'; // Gold
      case 'autumn': return '#FF6347'; // Tomato
      case 'winter': return '#87CEEB'; // Sky blue
      default: return '#FFFFFF';
    }
  }

  private renderNextPiecePreview(state: any): void {
    if (!state.nextPiece) return;
    
    // Clear the UI graphics to prevent outdated preview blocks from accumulating
    this.uiGraphics.clear();
    
    const { width } = this.scale;
    const isMobile = width < 600;
    const previewBlockSize = isMobile ? 12 : 15; // Smaller blocks for preview
    
    const piece = state.nextPiece;
    
    // Calculate centering offset
    const pieceWidth = piece.shape[0].length * previewBlockSize;
    const pieceHeight = piece.shape.length * previewBlockSize;
    const areaWidth = isMobile ? 80 : 90;
    const areaHeight = isMobile ? 40 : 50;
    const offsetX = (areaWidth - pieceWidth) / 2;
    const offsetY = (areaHeight - pieceHeight) / 2;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          this.drawWoodBlock(
            this.uiGraphics,
            this.nextPieceX + offsetX + x * previewBlockSize,
            this.nextPieceY + offsetY + y * previewBlockSize,
            previewBlockSize,
            'preview'
          );
        }
      }
    }
  }

  private drawWoodBlock(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number, type: 'placed' | 'falling' | 'preview'): void {
    if (!graphics || !graphics.active) return;
    
    let baseColor, lightColor, darkColor, glowColor;
    
    switch (type) {
      case 'falling':
        baseColor = 0xDEB887;  // Burlywood
        lightColor = 0xF5DEB3; // Wheat
        darkColor = 0xCD853F;  // Peru
        glowColor = 0x2C8E99;  // Darker cyan for softer appearance
        break;
      case 'preview':
        baseColor = 0xE0C896;  // Light wood color from your image
        lightColor = 0xF5DEB3;
        darkColor = 0xBC9A6A;
        glowColor = 0x66D9EF;  // Cyan border color from your image
        break;
      default: // placed
        baseColor = 0xA0522D;  // Sienna
        lightColor = 0xCD853F; // Peru
        darkColor = 0x8B4513;  // SaddleBrown
        glowColor = 0x00CED1;  // Dark turquoise
        break;
    }
    
    const padding = 2;
    const innerSize = size - padding * 2;
    
    // Shadow/depth effect (bottom-right)
    graphics.fillStyle(darkColor, 0.8);
    graphics.fillRect(x + padding + 2, y + padding + 2, innerSize, innerSize);
    
    // Main block body with gradient effect
    graphics.fillStyle(baseColor);
    graphics.fillRect(x + padding, y + padding, innerSize, innerSize);
    
    // Stronger highlights for 3D effect
    graphics.fillStyle(lightColor, 0.8);
    graphics.fillRect(x + padding, y + padding, innerSize, 4); // Top - 4px thick
    graphics.fillRect(x + padding, y + padding, 4, innerSize); // Left - 4px thick
    
    // Stronger shadows for depth
    graphics.fillStyle(darkColor, 0.7);
    graphics.fillRect(x + size - padding - 4, y + padding + 2, 4, innerSize - 2); // Right - 4px
    graphics.fillRect(x + padding + 2, y + size - padding - 4, innerSize - 2, 4); // Bottom - 4px
    
    // Wood grain texture (subtle lines)
    if (size > 15) {
      graphics.lineStyle(1, darkColor, 0.3);
      const grainLines = type === 'preview' ? 2 : 3;
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + padding + (innerSize / (grainLines + 1)) * (i + 1);
        graphics.lineBetween(x + padding + 2, lineY, x + size - padding - 2, lineY);
      }
    }
    
    // Outer glow/border
    if (type === 'falling') {
      // Enhanced falling piece with softer glow
      graphics.lineStyle(3, glowColor, 0.3); // Outer soft glow
      graphics.strokeRect(x, y, size, size);
      
      graphics.lineStyle(2, glowColor, 0.6); // Main border
      graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
      
      graphics.lineStyle(1, glowColor, 0.4); // Inner accent
      graphics.strokeRect(x + padding + 1, y + padding + 1, innerSize - 2, innerSize - 2);
      
      // Subtle corner highlights for elevated appearance
      graphics.fillStyle(glowColor, 0.15);
      graphics.fillRect(x + 1, y + 1, 2, 2); // Top-left corner
      graphics.fillRect(x + size - 3, y + 1, 2, 2); // Top-right corner
    } else if (type === 'preview') {
      // Subtle glow for preview pieces
      graphics.lineStyle(2, glowColor, 0.5);
      graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
      
      graphics.lineStyle(1, glowColor, 0.3);
      graphics.strokeRect(x + padding, y + padding, innerSize, innerSize);
    } else {
      // Subtle border for placed blocks
      graphics.lineStyle(1, glowColor, 0.3);
      graphics.strokeRect(x + padding, y + padding, innerSize, innerSize);
    }
  }

  private createWoodBlock(x: number, y: number, size: number, type: 'placed' | 'falling' | 'preview'): void {
    const block = this.add.graphics();
    
    // OPTIMIZED: Tag graphics object for efficient clearing
    block.setData('isWoodBlock', true);
    block.setData('isGameGraphics', true);
    
    // Tag by type for specific clearing
    switch (type) {
      case 'falling':
        block.setData('isCurrentPiece', true);
        break;
      case 'preview':
        block.setData('isNextPiece', true);
        break;
      default: // placed
        block.setData('isPlacedPiece', true);
        break;
    }
    
    // Base wood color
    let baseColor, highlightColor, shadowColor;
    
    switch (type) {
      case 'falling':
        baseColor = 0xD2B48C;
        highlightColor = 0xF5DEB3;
        shadowColor = 0xBC9A6A;
        break;
      case 'preview':
        baseColor = 0xDEB887;
        highlightColor = 0xF5DEB3;
        shadowColor = 0xCD853F;
        break;
      default: // placed
        baseColor = 0x8B4513;
        highlightColor = 0xA0522D;
        shadowColor = 0x654321;
        break;
    }
    
    // Main block
    block.fillStyle(baseColor);
    block.fillRect(x + 1, y + 1, size - 2, size - 2);
    
    // Wood grain lines (fewer for smaller preview blocks)
    if (size > 20) {
      block.lineStyle(1, shadowColor, 0.6);
      for (let i = 0; i < 3; i++) {
        const lineY = y + 4 + i * (size / 4);
        block.lineBetween(x + 2, lineY, x + size - 2, lineY);
      }
    }
    
    // Highlight edge
    block.lineStyle(1, highlightColor, 0.8);
    block.lineBetween(x + 1, y + 1, x + size - 1, y + 1); // Top
    block.lineBetween(x + 1, y + 1, x + 1, y + size - 1); // Left
    
    // Shadow edge
    block.lineStyle(1, shadowColor, 0.8);
    block.lineBetween(x + size - 1, y + 1, x + size - 1, y + size - 1); // Right
    block.lineBetween(x + 1, y + size - 1, x + size - 1, y + size - 1); // Bottom
    
    // Special effects based on type
    if (type === 'falling') {
      block.lineStyle(1, 0x00FFFF, 0.4);
      block.strokeRect(x, y, size, size);
    } else if (type === 'preview') {
      block.lineStyle(1, 0x4DFFFF, 0.3);
      block.strokeRect(x, y, size, size);
    }
    
    // OPTIMIZED: Add to appropriate container based on type
    if (type === 'preview') {
      this.uiContainer.add(block);
    } else {
      this.gameContainer.add(block);
    }
  }

  destroy(): void {
    // Clean up managers and renderers
    this.seasonalManager?.destroy?.();
    this.waterLevelManager?.destroy?.();
    this.environmentalRenderer?.destroy?.();
    this.pieceRenderer?.destroy?.();
    this.levelProgressionManager?.destroy?.();
    
    super.destroy();
  }

  private createBeaverMessageSystem(): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    
    // Position message bubble above the beaver (adjusted for new beaver position)
    // Ensure bubble doesn't go off screen - position it more to the right and higher
    const bubbleX = isMobile ? 150 : 200; // Moved even further right to prevent cutoff
    const bubbleY = height - (isMobile ? 300 : 320); // Higher above the beaver to prevent overlap
    
    // OPTIMIZED: Much more compact bubble for welcome message
    const bubbleWidth = isMobile ? 160 : 180; // Reduced from 200/250
    const bubbleHeight = isMobile ? 60 : 70; // Reduced from 100/120
    
    // Create a container to hold both bubble and text together
    const messageContainer = this.add.container(bubbleX, bubbleY);
    
    const messageBubble = this.add.graphics();
    messageBubble.fillStyle(0x1a2040, 0.95);
    messageBubble.lineStyle(3, 0x00FFFF, 0.9);
    messageBubble.fillRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12);
    messageBubble.strokeRoundedRect(-bubbleWidth/2, -bubbleHeight/2, bubbleWidth, bubbleHeight, 12);
    
    // Inner glow effect
    messageBubble.lineStyle(1, 0x4DFFFF, 0.6);
    messageBubble.strokeRoundedRect(-bubbleWidth/2 + 5, -bubbleHeight/2 + 5, bubbleWidth - 10, bubbleHeight - 10, 8);
    
    // OPTIMIZED: Smaller speech bubble tail to match compact bubble
    const tailX = 25; // Reduced from 30
    const tailY = bubbleHeight/2;
    messageBubble.fillStyle(0x1a2040, 0.95);
    messageBubble.fillTriangle(tailX, tailY, tailX + 12, tailY + 15, tailX + 24, tailY); // Smaller tail
    messageBubble.lineStyle(2, 0x00FFFF, 0.9); // Thinner border
    messageBubble.strokeTriangle(tailX, tailY, tailX + 12, tailY + 15, tailX + 24, tailY);
    
    // Message text positioned relative to the container (centered in bubble)
    this.messageText = this.add.text(0, 0, 'Ready to build!', {
      fontSize: isMobile ? '14px' : '16px', // Much smaller font to fit better in bubble
      color: '#FFFFFF', // Pure white for maximum visibility
      fontFamily: 'Arial Black',
      align: 'center',
      wordWrap: { width: bubbleWidth - 30 }, // Optimized padding for compact bubble
      stroke: '#000000', // Black stroke for contrast
      strokeThickness: 2, // Thinner stroke for cleaner look
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 6,
        fill: true
      }
    }).setOrigin(0.5, 0.5);
    
    // Add both bubble and text to the container
    messageContainer.add([messageBubble, this.messageText]);
    
    // Make sure text is always visible for debugging
    this.messageText.setDepth(1000); // High depth to ensure it's on top
    this.messageText.setColor('#FFFFFF'); // Explicitly set white color
    this.messageText.setVisible(true); // Ensure text is visible
    this.messageText.setAlpha(1); // Ensure text is fully opaque
    
    // Initially hide the message system (but keep text visible for when it shows)
    messageContainer.setVisible(false);
    
    // Store references for showing/hiding
    this.messageBubbleGraphics = messageContainer; // Store the container instead of just graphics
    
    this.uiContainer.add(messageContainer);
  }}
