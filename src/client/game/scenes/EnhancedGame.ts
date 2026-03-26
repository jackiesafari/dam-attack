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
import { TelemetryCollector } from '../managers/TelemetryCollector';
import { BoardAnalyzer } from '../utils/BoardAnalyzer';

interface CampaignStoryBeat {
  chapterTitle: string;
  levelLabel: string;
  title: string;
  text: string;
  buttonLabel: string;
}

interface CampaignCompletionBeat {
  banner: string;
  title: string;
  summary: string;
  celebration: string;
  nextHint: string;
  buttonLabel: string;
}

interface IntroModalLayout {
  signWidth: number;
  signHeight: number;
  chapterY: number;
  titleY: number;
  subtitleY: number;
  storyCardY: number;
  storyCardHeight: number;
  buttonY: number;
  modalScale: number;
  storyTextStyle: Phaser.Types.GameObjects.Text.TextStyle;
}

export class EnhancedGame extends Scene {
  // Core managers
  private gameStateManager!: GameStateManager;
  private pieceManager!: PieceManager;
  private boardManager!: BoardManager;
  private seasonalManager!: SeasonalManager;
  private waterLevelManager!: WaterLevelManager;
  private levelProgressionManager!: LevelProgressionManager;
  private themeManager!: ThemeManager;
  private telemetryCollector!: TelemetryCollector;
  
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
  private hasShownWelcome: boolean = false;
  
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
  private showEnvironmentalText: boolean = false;
  private displayedScore: number = 0;
  private scoreTween: Phaser.Tweens.Tween | null = null;
  private scoreTarget: number = 0;
  private nextPieceTitleText?: Phaser.GameObjects.Text;
  private nextPieceAreaWidth: number = 0;
  private nextPieceAreaHeight: number = 0;
  
  // Beaver character and messaging
  private beaverContainer!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private messageBubbleGraphics!: Phaser.GameObjects.Graphics;
  private storyText!: Phaser.GameObjects.Text;
  
  // OPTIMIZED: Proper timing system
  private lastTime: number = 0;
  private dropCounter: number = 0;
  private dropInterval: number = 500; // Base 500ms drop interval (faster gameplay)
  
  // NEW: Seasonal effect properties
  private seasonalDropSpeedMultiplier: number = 1.0;
  private inputDelayMs: number = 0;
  private seasonalScoreMultiplier: number = 1.0;
  
  // Enhanced scoring system
  private gameStartTime: number = 0;
  private lastSurvivalBonus: number = 0;
  private survivalBonusInterval: number = 30000; // 30 seconds
  
  // Telemetry tracking
  private piecesPlacedCount: number = 0;
  private lastBoardAnalysisPieceCount: number = 0;
  private lastStackHeight: number = 0;
  private nearDeathState: boolean = false;
  
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
  
  // UI state guards to prevent duplicate overlays / mis-clicks
  private isShowingLevelComplete: boolean = false;
  private isShowingLevelIntro: boolean = false;
  private overlayBackground: Phaser.GameObjects.Container | null = null;

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
    this.hasShownWelcome = false;
    this.isShowingLevelComplete = false;
    this.isShowingLevelIntro = false;
    this.overlayBackground = null;
  }

  preload() {
    // Load the beaver images
    this.load.image('beaverstory', '/assets/beaverstory.png');
    this.load.image('beaverlogo', '/assets/beaverlogo.png');
    // Level complete beaver (for wooden sign)
    this.load.image('levelCompleteBeaver', '/assets/level-complete-beaver.png');
    this.load.image('chapter1Signage', '/assets/chapter1-signage.png');
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
    
    // Level progression manager
    this.levelProgressionManager = new LevelProgressionManager(
      this,
      this.seasonalManager,
      this.waterLevelManager,
      this.gameStateManager
    );
    this.levelProgressionManager.startLevel(this.currentLevel);
    
    // Initialize grace period from seasonal manager
    const gracePeriod = this.seasonalManager.getCurrentGracePeriod();
    this.waterLevelManager.setGracePeriod(gracePeriod);
    
    // Initialize water rise rate from seasonal manager
    const initialRiseRate = this.seasonalManager.getCurrentWaterRiseRate();
    this.waterLevelManager.setRiseRate(initialRiseRate);
    
    // Telemetry collector (Phase 1: Foundation)
    this.telemetryCollector = new TelemetryCollector();
    this.telemetryCollector.setCurrentLevel(this.currentLevel);
    
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
    
    // Mobile controls if needed - using wood D-Pad theme
    const deviceInfo = this.layoutSystem.getDeviceInfo();
    if (deviceInfo.type === 'mobile' || deviceInfo.isTouchDevice) {
      this.mobileControlsUI = new MobileControlsUI(this, {
        buttonSize: 55, // Touch-friendly size
        buttonSpacing: 15,
        bottomMargin: 60, // Space from bottom
        hapticFeedback: true,
        visualFeedback: true,
        layout: 'wood-dpad', // Use our new wood D-Pad layout
        neonStyle: false // Use wood theme instead
      });
      this.mobileControlsUI.create((action: InputAction) => {
        this.handleInput(action);
      });
      
      // Hide controls initially - will show when gameplay starts
      this.mobileControlsUI.setVisible(false);
    }
  }

  private createNeonScoreUI(): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    
    // REDESIGNED: Simplified score box (match inspiration layout)
    const panelWidth = isMobile ? 160 : 190;
    const panelHeight = isMobile ? 120 : 140;
    const panelX = isMobile ? 8 : 14;
    const panelY = isMobile ? 8 : 14;
    
    // Main panel background (gradient)
    const scorePanel = this.add.graphics();
    scorePanel.fillGradientStyle(0x0A1628, 0x0A1628, 0x1A2847, 0x1A2847, 0.98);
    scorePanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    scorePanel.lineStyle(2, 0x00FFFF, 0.6);
    scorePanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
    
    // Subtle animated glow
    const scoreGlow = this.add.graphics();
    scoreGlow.lineStyle(3, 0x66D9EF, 0.25);
    scoreGlow.strokeRoundedRect(panelX - 2, panelY - 2, panelWidth + 4, panelHeight + 4, 10);
    this.tweens.add({
      targets: scoreGlow,
      alpha: 0.6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // REDESIGNED: Better font sizes and spacing for readability
    const labelFontSize = isMobile ? '11px' : '13px';
    const scoreValueSize = isMobile ? '24px' : '30px';
    const statValueSize = isMobile ? '15px' : '17px';
    const tertiaryFontSize = isMobile ? '10px' : '11px';
    
    // Layout: SCORE label, big number, then LEVEL / LINES row
    const paddingTop = 18;
    const titleY = panelY + paddingTop;
    const scoreY = titleY + (isMobile ? 18 : 22);
    const statsRowY = scoreY + (isMobile ? 24 : 28);
    const statColumnOffset = isMobile ? 34 : 40;
    
    const scoreLabel = this.add.text(panelX + panelWidth/2, titleY, 'SCORE', {
      fontSize: labelFontSize,
      color: '#F5F7FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    this.scoreText = this.add.text(panelX + panelWidth/2, scoreY, '000000', {
      fontSize: scoreValueSize,
      color: '#EAF6FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    const levelLabel = this.add.text(panelX + panelWidth/2 - statColumnOffset, statsRowY, 'LEVEL', {
      fontSize: labelFontSize,
      color: '#F5F7FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    const linesLabel = this.add.text(panelX + panelWidth/2 + statColumnOffset, statsRowY, 'LINES', {
      fontSize: labelFontSize,
      color: '#F5F7FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    this.levelText = this.add.text(panelX + panelWidth/2 - statColumnOffset, statsRowY + (isMobile ? 12 : 14), '01', {
      fontSize: statValueSize,
      color: '#EAF6FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    this.linesText = this.add.text(panelX + panelWidth/2 + statColumnOffset, statsRowY + (isMobile ? 12 : 14), '000', {
      fontSize: statValueSize,
      color: '#EAF6FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    // Dividers to separate sections
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x4DFFFF, 0.4);
    divider.moveTo(panelX + 14, scoreY + (isMobile ? 14 : 16));
    divider.lineTo(panelX + panelWidth - 14, scoreY + (isMobile ? 14 : 16));
    divider.strokePath();
    divider.lineStyle(1, 0x4DFFFF, 0.35);
    divider.moveTo(panelX + panelWidth/2, statsRowY - 6);
    divider.lineTo(panelX + panelWidth/2, statsRowY + (isMobile ? 20 : 22));
    divider.strokePath();
    
    // TERTIARY INFO - moved below panel to keep the box uncluttered
    const metaStartY = panelY + panelHeight + (isMobile ? 10 : 12);
    this.waterLevelText = this.add.text(panelX + panelWidth/2, metaStartY, 'WATER: 00%', {
      fontSize: tertiaryFontSize,
      color: '#4169E1',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    
    this.seasonText = this.add.text(panelX + panelWidth/2, metaStartY + (isMobile ? 12 : 14), 'SPRING', {
      fontSize: tertiaryFontSize,
      color: '#98FB98',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      align: 'center'
    }).setOrigin(0.5);
    
    // Hide environmental text in Campaign for now (simplified UI)
    this.waterLevelText.setVisible(this.showEnvironmentalText);
    this.seasonText.setVisible(this.showEnvironmentalText);
    
    // REDESIGNED: Compact next piece preview
    const nextPieceWidth = Math.round((isMobile ? 80 : 100) * 1.35);
    const nextPieceHeight = Math.round((isMobile ? 60 : 75) * 1.35);
    const nextPieceX = width - nextPieceWidth - (isMobile ? 8 : 16);
    const nextPieceY = panelY;
    
    // Store next piece position for rendering (centered in the panel)
    this.nextPieceAreaWidth = nextPieceWidth - (isMobile ? 20 : 24);
    this.nextPieceAreaHeight = nextPieceHeight - (isMobile ? 32 : 36);
    this.nextPieceX = nextPieceX + (nextPieceWidth - this.nextPieceAreaWidth) / 2;
    this.nextPieceY = nextPieceY + (nextPieceHeight - this.nextPieceAreaHeight) / 2 + (isMobile ? 4 : 6);
    
    // Next piece panel (gradient + glow)
    const nextPiecePanel = this.add.graphics();
    nextPiecePanel.fillGradientStyle(0x0A1628, 0x0A1628, 0x1A2847, 0x1A2847, 0.98);
    nextPiecePanel.fillRoundedRect(nextPieceX, nextPieceY, nextPieceWidth, nextPieceHeight, 8);
    nextPiecePanel.lineStyle(2, 0x00FFFF, 0.6);
    nextPiecePanel.strokeRoundedRect(nextPieceX, nextPieceY, nextPieceWidth, nextPieceHeight, 8);
    
    const nextPieceGlow = this.add.graphics();
    nextPieceGlow.lineStyle(3, 0x66D9EF, 0.25);
    nextPieceGlow.strokeRoundedRect(nextPieceX - 2, nextPieceY - 2, nextPieceWidth + 4, nextPieceHeight + 4, 10);
    this.tweens.add({
      targets: nextPieceGlow,
      alpha: 0.6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // REDESIGNED: Better next piece title
    this.nextPieceTitleText = this.add.text(nextPieceX + nextPieceWidth/2, nextPieceY + (isMobile ? 14 : 16), 'NEXT', {
      fontSize: isMobile ? '16px' : '19px',
      color: '#F5F7FF',
      fontFamily: '"Barlow Condensed", "Arial", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: this.nextPieceTitleText,
      scale: 1.05,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.uiContainer.add([
      scorePanel,
      scoreGlow,
      scoreLabel,
      this.scoreText,
      levelLabel,
      linesLabel,
      this.levelText,
      this.linesText,
      divider,
      this.waterLevelText,
      this.seasonText,
      nextPiecePanel,
      nextPieceGlow,
      this.nextPieceTitleText
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
    console.log('📖 Starting game');

    if (this.gameMode === 'campaign') {
      this.showLevelIntro(this.currentLevel);
      return;
    }

    this.resumeGameplay();
  }

  private resumeGameplay(): void {
    // This is called after story dismissal - preserve current game state
    console.log('🔄 Resuming gameplay - preserving current state');
    this.lastTime = 0;
    this.syncCurrentLevelState();
    
    const currentState = this.gameStateManager.getState();
    console.log('📊 Current state:', {
      score: currentState.score,
      level: currentState.level,
      lines: currentState.lines,
      hasBoard: !!currentState.board,
      hasCurrentPiece: !!currentState.currentPiece
    });
    
    // Check if game needs to be initialized (first time starting)
    // A game hasn't started if: board exists but is empty (all zeros), no pieces placed, score is 0
    const boardIsEmpty = currentState.board && currentState.board.length > 0 && 
      currentState.board.every(row => row.every(cell => cell === 0));
    const gameNotStarted = boardIsEmpty && 
      currentState.score === 0 && 
      currentState.lines === 0 && 
      !currentState.currentPiece;
    
    if (gameNotStarted) {
      console.log('🎯 First time starting - initializing gameplay');
      this.startActualGameplay();
      return;
    }

    const isNewLevelStart = this.telemetryCollector.getCurrentLevel() !== this.currentLevel;
    
    // TELEMETRY: Record level start if resuming (for level transitions)
    // Only record if we haven't already started this level
    if (isNewLevelStart) {
      this.telemetryCollector.setCurrentLevel(this.currentLevel);
      this.telemetryCollector.recordEvent('level_start', {
        level: this.currentLevel,
        waterLevel: this.waterLevelManager.getCurrentLevel(),
        timeElapsed: Date.now() - this.gameStartTime
      });
      
      // Reset telemetry tracking for new level
      this.piecesPlacedCount = 0;
      this.lastBoardAnalysisPieceCount = 0;
      this.lastStackHeight = 0;
      this.nearDeathState = false;

      const gracePeriod = this.seasonalManager.getCurrentGracePeriod();
      this.futuristicTimer.start(gracePeriod);
    }
    
    // Only spawn a new piece if we don't have one
    if (!currentState.currentPiece) {
      console.log('🎲 No current piece - spawning new one');
      this.spawnNewPiece();
    } else {
      console.log('✅ Current piece exists - continuing gameplay');
    }
    
    // Resume game timing
    this.lastUpdateTime = this.time.now;
    
    // Show welcome message if we haven't shown it yet (fallback)
    if (this.gameMode === 'campaign' && !this.hasShownWelcome && this.messageText && this.messageBubbleGraphics) {
      this.hasShownWelcome = true;
      this.time.delayedCall(1000, () => {
        this.showBeaverMessage("Welcome! Let's build a dam!");
      });
      // Start encouragement timer after welcome message
      this.time.delayedCall(6000, () => {
        this.startEncouragementTimer();
      });
    }
    
    console.log('🎮 Gameplay resumed successfully!');
  }

  private startActualGameplay(): void {
    // This is called ONLY for initial game start - resets everything
    console.log('🎯 Starting actual gameplay (INITIAL START)...');
    this.lastTime = 0;
    
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
      level: this.currentLevel,
      score: 0,
      lines: 0,
      timeElapsed: 0
    });
    
    console.log('✅ Game state initialized with board:', emptyBoard.length, 'x', emptyBoard[0].length);
    
    // Spawn first piece
    console.log('🎲 Spawning first piece...');
    this.spawnNewPiece();
    
    // Start game loop
    console.log('⏰ Setting up game timing');
    this.lastUpdateTime = this.time.now;
    
    // Show welcome message after a short delay (ensure message system is ready)
    this.time.delayedCall(1500, () => {
      if (this.messageText && this.messageBubbleGraphics) {
        this.showBeaverMessage("Welcome! Let's build a dam!");
      } else {
        console.warn('⚠️ Message system not initialized, retrying welcome message...');
        // Retry after a bit more time if not ready
        this.time.delayedCall(500, () => {
          if (this.messageText && this.messageBubbleGraphics) {
            this.showBeaverMessage("Welcome! Let's build a dam!");
          }
        });
      }
    });
    
    // Start periodic encouragement messages (after welcome message has time to show)
    // Welcome message shows at 1.5s, stays for 4s, so start encouragement timer after 6s
    this.time.delayedCall(6000, () => {
      this.startEncouragementTimer();
    });
    
    // Start the water timer (match grace period duration)
    this.futuristicTimer.start(this.seasonalManager.getCurrentGracePeriod());
    
    // Show mobile controls when gameplay actually starts
    if (this.mobileControlsUI) {
      this.mobileControlsUI.setVisible(true);
    }
    
    // TELEMETRY: Record level start event
    this.telemetryCollector.setCurrentLevel(this.currentLevel);
    this.telemetryCollector.recordEvent('level_start', {
      level: this.currentLevel,
      waterLevel: this.waterLevelManager.getCurrentLevel(),
      timeElapsed: 0
    });
    
    // Reset telemetry tracking for new level
    this.piecesPlacedCount = 0;
    this.lastBoardAnalysisPieceCount = 0;
    this.lastStackHeight = 0;
    this.nearDeathState = false;
    
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

  private syncCurrentLevelState(): void {
    if (!this.gameStateManager) {
      return;
    }

    const state = this.gameStateManager.getState();
    if (state.level !== this.currentLevel) {
      this.gameStateManager.updateState({ level: this.currentLevel });
    }
  }

  private getCampaignStoryBeat(levelNumber: number): CampaignStoryBeat {
    const beaverName = 'Maple';
    const storyByLevel: Record<number, CampaignStoryBeat> = {
      1: {
        chapterTitle: 'Chapter 1: First Twigs',
        levelLabel: 'Spring Thaw',
        title: `${beaverName} Finds a Brave New Builder`,
        text: `${beaverName} the beaver has spotted the first spring melt. With the creek waking up, she asks for your help placing the very first logs so every burrow downstream stays cozy and dry.`,
        buttonLabel: "Let's go!"
      },
      2: {
        chapterTitle: 'Chapter 2: Petals on the Water',
        levelLabel: 'Cherry Blossom Falls',
        title: 'A Stronger Start',
        text: `Cherry blossoms drift past the half-built dam, and ${beaverName} beams with pride. The foundation is holding, but the current is quicker now, so each careful stack helps the whole forest breathe easier.`,
        buttonLabel: 'Continue'
      },
      3: {
        chapterTitle: 'Chapter 3: Busy Paws',
        levelLabel: "Beaver's First Helper",
        title: `${beaverName} Makes a Friend`,
        text: `Word spreads through the meadow that a kind builder is helping ${beaverName}. Another young beaver paddles over with extra twigs, and together you turn a simple barrier into a real home for the riverbank.`,
        buttonLabel: 'Continue'
      },
      4: {
        chapterTitle: 'Chapter 4: Misty Morning',
        levelLabel: 'Morning Mist',
        title: 'Trust in the Team',
        text: `Soft mist curls over the water while birds sing from the reeds. ${beaverName} has started trusting your timing completely, and every neat placement makes the dam feel steadier and warmer.`,
        buttonLabel: 'Continue'
      },
      5: {
        chapterTitle: 'Chapter 5: Spring Finale',
        levelLabel: "Spring's End",
        title: 'The Forest Takes Notice',
        text: `By the end of spring, frogs, fish, and songbirds gather nearby to watch. ${beaverName} knows the dam is no longer just a project. It is becoming a promise to protect everyone through the seasons ahead.`,
        buttonLabel: 'Continue'
      },
      6: {
        chapterTitle: 'Chapter 6: Summer Sun',
        levelLabel: "Summer's Arrival",
        title: 'Warm Days, Quick Water',
        text: `Summer sunlight glitters on the creek, and the flow grows more confident. ${beaverName} wipes her brow, grins, and says this is when careful builders become true guardians of the stream.`,
        buttonLabel: 'Continue'
      },
      7: {
        chapterTitle: 'Chapter 7: Dragonfly Parade',
        levelLabel: 'Dragonfly Dance',
        title: 'A Little Celebration',
        text: `Dragonflies weave bright loops over the water as if cheering you on. Even while the pace picks up, ${beaverName} keeps the mood light, reminding everyone that hard work can still feel joyful.`,
        buttonLabel: 'Continue'
      },
      8: {
        chapterTitle: 'Chapter 8: Sunlit Rhythm',
        levelLabel: 'Summer Midstream',
        title: 'Building by Instinct',
        text: `The team falls into a happy rhythm: splash, stack, smile, repeat. ${beaverName} can already picture little paws scampering safely across the dam when the river runs wild again.`,
        buttonLabel: 'Continue'
      },
      9: {
        chapterTitle: 'Chapter 9: Ripples of Courage',
        levelLabel: 'Golden Current',
        title: 'Steady Under Pressure',
        text: `The creek presses harder now, but so does your confidence. ${beaverName} notices how calmly you shape each opening into strength, and she says the dam is beginning to feel brave.`,
        buttonLabel: 'Continue'
      },
      10: {
        chapterTitle: 'Chapter 10: Summer Promise',
        levelLabel: 'High Sun Crossing',
        title: 'Ready for What Comes Next',
        text: `At the end of summer, the dam stretches proudly from bank to bank. The animals share berries and clover nearby, while ${beaverName} quietly wonders if it can stay strong when autumn winds arrive.`,
        buttonLabel: 'Continue'
      },
      11: {
        chapterTitle: 'Chapter 11: Falling Leaves',
        levelLabel: "Autumn's Arrival",
        title: 'A New Test Begins',
        text: `Leaves tumble across the water in russet spirals as autumn sweeps in. ${beaverName} checks every corner of the dam, grateful that you are here for the season that asks the most of builders.`,
        buttonLabel: 'Continue'
      },
      12: {
        chapterTitle: 'Chapter 12: Rustling Banks',
        levelLabel: 'Harvest Run',
        title: 'Holding Fast',
        text: `Squirrels stash acorns along the shore while the river hurries past. ${beaverName} keeps everyone focused and kind, turning nervous energy into teamwork one sturdy layer at a time.`,
        buttonLabel: 'Continue'
      },
      13: {
        chapterTitle: 'Chapter 13: Bright Courage',
        levelLabel: 'Amber Rapids',
        title: 'The Dam Gets Its Heart',
        text: `By now the dam does more than block water. It shelters minnows, steadies nests, and quiets the banks at night. ${beaverName} says your careful building has given the whole place a heart.`,
        buttonLabel: 'Continue'
      },
      14: {
        chapterTitle: 'Chapter 14: Windy Workday',
        levelLabel: 'Whistling Bend',
        title: 'Calm in the Gusts',
        text: `Autumn gusts tug at every loose branch, but you keep building with patient hands. ${beaverName} laughs between the windblown leaves and calls you the calmest builder in the valley.`,
        buttonLabel: 'Continue'
      },
      15: {
        chapterTitle: 'Chapter 15: Last Leaf',
        levelLabel: 'Autumn Finale',
        title: 'Almost There',
        text: `The last leaves drift down and settle against the dam like tiny thank-you notes. ${beaverName} knows winter will be tough, yet the forest now believes this dam just might weather anything.`,
        buttonLabel: 'Continue'
      },
      16: {
        chapterTitle: 'Chapter 16: First Frost',
        levelLabel: 'Winter Freeze',
        title: 'Cold Air, Warm Hearts',
        text: `Frost gathers along the banks and the world turns quiet and silver. ${beaverName} speaks softly so no one worries: the cold may be sharp, but shared effort can still make the river feel safe.`,
        buttonLabel: 'Continue'
      },
      17: {
        chapterTitle: 'Chapter 17: Snowy Vigil',
        levelLabel: 'Crystal Drifts',
        title: 'Guardians of the Creek',
        text: `Snowflakes settle on every log you place, sparkling like little lanterns. The animals huddle close, and ${beaverName} keeps watch with you, proud of how the dam stands through the storm.`,
        buttonLabel: 'Continue'
      },
      18: {
        chapterTitle: 'Chapter 18: Ice and Patience',
        levelLabel: 'Frozen Channel',
        title: 'Strength in Small Moves',
        text: `Winter teaches a slower kind of courage. ${beaverName} reminds everyone that even tiny, careful placements matter when the cold tries to rush your thinking.`,
        buttonLabel: 'Continue'
      },
      19: {
        chapterTitle: 'Chapter 19: Lanterns in the Snow',
        levelLabel: 'Moonlit Freeze',
        title: 'The Whole Forest Helps',
        text: `Fireflies from warmer hollows, owls from the pine line, and rabbits from the brush all gather near. No one can move the logs for you, but their quiet faith makes ${beaverName} smile wider than ever.`,
        buttonLabel: 'Continue'
      },
      20: {
        chapterTitle: 'Chapter 20: Safe at Last',
        levelLabel: 'Eternal Winter',
        title: 'The Dam Holds',
        text: `The harshest water finally meets the dam and cannot break it. ${beaverName} lets out a happy splash, and the whole forest celebrates together as birds sing, tails slap the water, and every cozy home stays safe through the night.`,
        buttonLabel: "Let's go!"
      }
    };

    return storyByLevel[levelNumber] || {
      chapterTitle: `Chapter ${levelNumber}`,
      levelLabel: `Level ${levelNumber}`,
      title: `${beaverName} Keeps Building`,
      text: `${beaverName} takes a breath, checks the river, and smiles. Another stretch of water lies ahead, and every careful stack brings the dam one step closer to keeping the forest safe.`,
      buttonLabel: 'Continue'
    };
  }

  private getCampaignCompletionBeat(levelNumber: number, isFinalLevel: boolean): CampaignCompletionBeat {
    const completionByLevel: Record<number, CampaignCompletionBeat> = {
      1: {
        banner: 'Chapter One Complete',
        title: 'The First Wall Holds',
        summary: 'Maple pats the fresh timber with a proud grin. The creek has been nudged into a calmer path, and the first homes downstream already feel safer.',
        celebration: 'Birdsong skips across the water while cherry petals drift over your newly finished foundation.',
        nextHint: 'Next, the current quickens at Cherry Blossom Falls.',
        buttonLabel: 'See Level 2'
      },
      2: {
        banner: 'A Stronger Dam',
        title: 'Petals and Progress',
        summary: 'The half-built dam now looks intentional, sturdy, and full of heart. Maple can see where the future lodge path will rest.',
        celebration: 'The riverbank glows with blossom pink as the forest settles into a relieved, happy hush.',
        nextHint: 'A new helper is paddling in for the next chapter.',
        buttonLabel: 'Meet the Helper'
      },
      3: {
        banner: 'Busy Paws Rewarded',
        title: 'Teamwork Takes Root',
        summary: 'With extra paws and steady stacking, the dam begins to feel like a shared promise instead of a hopeful experiment.',
        celebration: 'Tiny ripples sparkle where the young beavers splash and celebrate your work.',
        nextHint: 'Morning mist rolls in on the next stretch of water.',
        buttonLabel: 'Into the Mist'
      },
      4: {
        banner: 'Morning Mist Cleared',
        title: 'Confidence on the Water',
        summary: 'Even through the haze, your placements kept the structure strong. Maple now trusts the dam to answer each new ripple with calm strength.',
        celebration: 'Dragonflies skim the waterline like little lanterns marking the path ahead.',
        nextHint: 'One final spring push stands between you and summer.',
        buttonLabel: 'Finish Spring'
      },
      5: {
        banner: 'Spring Protected',
        title: 'The Forest Notices',
        summary: 'By the close of spring, the dam stands as a real shelter. Maple watches animals gather nearby and realizes the whole valley is rooting for you now.',
        celebration: 'Frogs croak, fish circle below, and every branch in the air seems to clap in approval.',
        nextHint: 'Summer arrives with brighter skies and faster water.',
        buttonLabel: 'Welcome Summer'
      }
    };

    if (isFinalLevel) {
      return {
        banner: 'Final Chapter',
        title: 'The Dam Is Safe',
        summary: 'Maple and the forest made it through every season. The dam stands firm, the water is guided gently aside, and every burrow, nest, and den stays warm and dry.',
        celebration: 'Beavers slap the water in applause while birds, rabbits, and frogs gather for one joyful riverside celebration.',
        nextHint: 'Your story is complete, and the valley will remember this winter as the season the dam held.',
        buttonLabel: 'Celebrate'
      };
    }

    return completionByLevel[levelNumber] || {
      banner: `Level ${levelNumber} Cleared`,
      title: 'Another Chapter Secured',
      summary: 'Maple checks the dam, nods happily, and calls this stretch of river safe for another day.',
      celebration: 'The forest responds with quiet, grateful celebration around the shoreline.',
      nextHint: 'A fresh challenge waits just upstream.',
      buttonLabel: 'Continue Story'
    };
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
    
    // TELEMETRY: Analyze board before line clearing
    const boardAnalysis = BoardAnalyzer.analyzeBoard(newBoard, 20);
    
    // TELEMETRY: Record piece placement event
    this.piecesPlacedCount++;
    this.telemetryCollector.recordEvent('piece_placed', {
      pieceType: state.currentPiece.type,
      placementX: state.currentPiece.x,
      placementY: state.currentPiece.y,
      stackHeight: boardAnalysis.stackHeight,
      holesCount: boardAnalysis.holesCount,
      overhangsCount: boardAnalysis.overhangsCount,
      boardDensity: boardAnalysis.boardDensity,
      level: this.currentLevel,
      waterLevel: this.waterLevelManager.getCurrentLevel()
    });
    
    // Update level summary
    this.telemetryCollector.updateLevelSummary(this.currentLevel, {
      timestamp: Date.now(),
      eventType: 'piece_placed',
      data: {
        pieceType: state.currentPiece.type,
        stackHeight: boardAnalysis.stackHeight,
        holesCount: boardAnalysis.holesCount,
        level: this.currentLevel
      }
    });
    
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
      
      // TELEMETRY: Record line clear event
      const clearType = linesCleared === 1 ? 'single' : 
                       linesCleared === 2 ? 'double' : 
                       linesCleared === 3 ? 'triple' : 'tetris';
      
      // Analyze board after clearing to check if it was planned (simplified heuristic)
      const clearedBoardAnalysis = BoardAnalyzer.analyzeBoard(clearedBoard, 20);
      const wasPlanned = linesCleared >= 2; // Assume multi-line clears are planned
      
      this.telemetryCollector.recordEvent('line_cleared', {
        linesCleared,
        clearType,
        wasPlanned,
        level: this.currentLevel,
        waterLevel: this.waterLevelManager.getCurrentLevel(),
        stackHeight: clearedBoardAnalysis.stackHeight
      });
      
      // Update level summary
      this.telemetryCollector.updateLevelSummary(this.currentLevel, {
        timestamp: Date.now(),
        eventType: 'line_cleared',
        data: {
          linesCleared,
          clearType,
          wasPlanned,
          level: this.currentLevel
        }
      });
      
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
      
      // Check if level is completed (target lines reached)
      const currentSeasonalLevel = this.seasonalManager.getCurrentLevel();
      if (currentSeasonalLevel && newLines >= currentSeasonalLevel.targetLines) {
        const completedLevel = currentSeasonalLevel.globalLevel || this.currentLevel;
        console.log(`🎯 Level ${completedLevel} completed! Cleared ${newLines} lines (target: ${currentSeasonalLevel.targetLines})`);
        this.events.emit('level-completed', {
          level: completedLevel,
          lines: newLines,
          score: updatedState.score,
          timeElapsed: Date.now() - this.gameStartTime
        });
        
        // TELEMETRY: Record level end (completion)
        const finalAnalysis = BoardAnalyzer.analyzeBoard(clearedBoard, 20);
        this.telemetryCollector.recordEvent('level_end', {
          level: this.currentLevel,
          waterLevel: this.waterLevelManager.getCurrentLevel(),
          timeElapsed: Date.now() - this.gameStartTime,
          stackHeight: finalAnalysis.stackHeight
        });
        
        // Calculate traits for this level
        this.telemetryCollector.calculateLevelTraits(this.currentLevel, 20);
        
        // Save session data on level completion
        this.telemetryCollector.saveSessionData();
      }
      
      console.log('Water reduced by:', waterReduction, 'Current water level:', this.waterLevelManager.getCurrentLevel());
    }
    
    // TELEMETRY: Board analysis every 10 pieces
    if (this.piecesPlacedCount % 10 === 0 && this.piecesPlacedCount > this.lastBoardAnalysisPieceCount) {
      const finalAnalysis = BoardAnalyzer.analyzeBoard(clearedBoard, 20);
      this.telemetryCollector.recordEvent('stack_height_change', {
        stackHeight: finalAnalysis.stackHeight,
        holesCount: finalAnalysis.holesCount,
        overhangsCount: finalAnalysis.overhangsCount,
        boardDensity: finalAnalysis.boardDensity,
        level: this.currentLevel,
        waterLevel: this.waterLevelManager.getCurrentLevel()
      });
      this.lastBoardAnalysisPieceCount = this.piecesPlacedCount;
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
    
    // Level progression manager doesn't need update calls - it handles events
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
    
    // TELEMETRY: Record death event
    const state = this.gameStateManager.getState();
    const finalAnalysis = state.board ? BoardAnalyzer.analyzeBoard(state.board, 20) : null;
    
    this.telemetryCollector.recordEvent('death', {
      level: this.currentLevel,
      waterLevel: this.waterLevelManager.getCurrentLevel(),
      stackHeight: finalAnalysis?.stackHeight,
      timeElapsed: Date.now() - this.gameStartTime
    });
    
    // TELEMETRY: Record level end (failure)
    this.telemetryCollector.recordEvent('level_end', {
      level: this.currentLevel,
      waterLevel: this.waterLevelManager.getCurrentLevel(),
      timeElapsed: Date.now() - this.gameStartTime
    });
    
    // Update level summary
    this.telemetryCollector.updateLevelSummary(this.currentLevel, {
      timestamp: Date.now(),
      eventType: 'death',
      data: {
        level: this.currentLevel,
        reason
      }
    });
    
    // Calculate traits for this level
    this.telemetryCollector.calculateLevelTraits(this.currentLevel, 20);
    
    // Save session data
    this.telemetryCollector.saveSessionData();
    
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
    
    // Submit score button (opens leaderboard screen)
    const submitButton = this.add.text(width / 2, height / 2 + 130, '🏆 Submit Score', {
      fontSize: '20px',
      color: '#F5F7FF',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    submitButton.setDepth(201);
    submitButton.setInteractive();
    
    submitButton.on('pointerdown', () => {
      const state = this.gameStateManager.getState();
      this.scene.start('GameOver', {
        score: state.score,
        level: this.currentLevel,
        lines: state.lines,
        reason: reason
      });
    });
    
    submitButton.on('pointerover', () => {
      submitButton.setColor('#FFD700');
    });
    
    submitButton.on('pointerout', () => {
      submitButton.setColor('#F5F7FF');
    });
    
    // Restart button
    const restartButton = this.add.text(width / 2, height / 2 + 175, '🔄 Try Again', {
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
    // Hide/show controls based on game state
    if (this.mobileControlsUI) {
      const shouldShowControls = !this.isGameOver && !this.isPaused && this.gameStateManager.getState().currentPiece !== null;
      this.mobileControlsUI.setVisible(shouldShowControls);
    }
    
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
      
      // TELEMETRY: Danger detection (check stack height every 10 frames)
      const state = this.gameStateManager.getState();
      if (state.board && state.board.length > 0) {
        const analysis = BoardAnalyzer.analyzeBoard(state.board, 20);
        const dangerThreshold = 0.7; // 70% of board height
        
        // Check for near-death state
        if (analysis.stackHeight > dangerThreshold && !this.nearDeathState) {
          this.nearDeathState = true;
          this.telemetryCollector.recordEvent('near_death', {
            dangerLevel: analysis.stackHeight,
            level: this.currentLevel,
            waterLevel: this.waterLevelManager.getCurrentLevel(),
            stackHeight: analysis.stackHeight
          });
          
          // Update level summary
          this.telemetryCollector.updateLevelSummary(this.currentLevel, {
            timestamp: Date.now(),
            eventType: 'near_death',
            data: {
              dangerLevel: analysis.stackHeight,
              level: this.currentLevel
            }
          });
        } else if (analysis.stackHeight <= 0.5 && this.nearDeathState) {
          // Recovery from danger
          this.nearDeathState = false;
          this.telemetryCollector.recordEvent('recovery', {
            level: this.currentLevel,
            waterLevel: this.waterLevelManager.getCurrentLevel(),
            stackHeight: analysis.stackHeight
          });
          
          // Update level summary
          this.telemetryCollector.updateLevelSummary(this.currentLevel, {
            timestamp: Date.now(),
            eventType: 'recovery',
            data: {
              level: this.currentLevel
            }
          });
        }
        
        this.lastStackHeight = analysis.stackHeight;
      }
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
    
    // Calculate drop interval based on level (faster ramp: -80ms per level)
    const levelDropInterval = Math.max(200, this.dropInterval - (state.level * 80));
    
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
          
          // Show mobile controls again when story is dismissed
          if (this.mobileControlsUI) {
            this.mobileControlsUI.setVisible(true);
          }
          
          // Resume gameplay (will call startActualGameplay if first time)
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
    
    // Hide mobile controls when story screen is shown
    if (this.mobileControlsUI) {
      this.mobileControlsUI.setVisible(false);
    }
    
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
    const displayedLevel = this.gameMode === 'campaign'
      ? this.currentLevel
      : (state.level || this.currentLevel);
    const formattedLevel = displayedLevel.toString().padStart(2, '0');
    const formattedLines = state.lines.toString().padStart(3, '0');
    
    if (state.score !== this.scoreTarget) {
      this.scoreTarget = state.score;
      if (this.scoreTween) {
        this.scoreTween.stop();
      }
      
      const startValue = this.displayedScore;
      const endValue = this.scoreTarget;
      this.scoreText.setColor('#FFD700');
      this.time.delayedCall(160, () => {
        this.scoreText.setColor('#EAF6FF');
      });
      
      this.scoreTween = this.tweens.addCounter({
        from: startValue,
        to: endValue,
        duration: 280,
        ease: 'Sine.easeOut',
        onUpdate: (tween) => {
          const value = Math.round(tween.getValue());
          this.displayedScore = value;
          const animScore = value.toString().padStart(6, '0');
          this.scoreText.setText(animScore);
        },
        onComplete: () => {
          this.displayedScore = endValue;
          this.scoreText.setText(formattedScore);
          this.scoreTween = null;
        }
      });
    } else if (!this.scoreTween && this.displayedScore !== this.scoreTarget) {
      // Safety: sync display if a tween isn't running but values are out of sync
      this.displayedScore = this.scoreTarget;
      this.scoreText.setText(formattedScore);
    } else {
      this.scoreText.setText(formattedScore);
    }
    
    this.levelText.setText(formattedLevel);
    this.linesText.setText(formattedLines);
  }

  private updateSeasonalUI(envState: EnvironmentalState): void {
    if (!this.showEnvironmentalText) {
      if (this.seasonText) {
        this.seasonText.setVisible(false);
      }
      return;
    }

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
    if (!this.showEnvironmentalText) {
      if (this.waterLevelText) {
        this.waterLevelText.setVisible(false);
      }
      return;
    }

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
    if (this.isShowingLevelComplete || this.isShowingLevelIntro) {
      return; // Guard against duplicate triggers
    }
    this.isShowingLevelComplete = true;
    this.isPaused = true;
    const { width, height } = this.scale;
    const isMobile = width < 600;
    
    // Create environmental background
    this.createLevelCompleteBackground();
    
    // Create container for the entire completion screen
    const completionContainer = this.add.container(width / 2, height / 2);
    completionContainer.setDepth(300);
    
    // Input blocker to consume clicks while overlay is open
    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    blocker.setInteractive();
    blocker.setDepth(0);
    completionContainer.add(blocker);
    
    // Wood sign dimensions (suspended wooden sign) - smaller to show more background
    const signWidth = isMobile ? width - 120 : 500;
    const signHeight = isMobile ? 350 : 400;
    const halfWidth = signWidth / 2;
    const halfHeight = signHeight / 2;
    
    // Create suspended wooden sign with ropes
    const signContainer = this.add.container(0, 0);
    signContainer.setDepth(1);
    
    // Ropes from top
    const ropeGraphics = this.add.graphics();
    ropeGraphics.lineStyle(4, 0x8B4513, 0.8);
    ropeGraphics.moveTo(-halfWidth + 30, -halfHeight - 20);
    ropeGraphics.lineTo(-halfWidth + 30, -halfHeight);
    ropeGraphics.moveTo(halfWidth - 30, -halfHeight - 20);
    ropeGraphics.lineTo(halfWidth - 30, -halfHeight);
    ropeGraphics.strokePath();
    signContainer.add(ropeGraphics);
    
    // Main wooden sign background with enhanced texture
    const woodSign = this.add.graphics();
    
    // Wood colors
    const woodBaseColor = 0x4A3728;
    const woodLightColor = 0x6B4E37;
    const woodDarkColor = 0x2E2419;
    const woodGrainColor = 0x3D2F1F;
    const woodAccentColor = 0x8B4513;
    const cyanAccent = 0x66D9EF;
    
    // Outer shadow for suspended effect
    woodSign.fillStyle(0x000000, 0.4);
    woodSign.fillRoundedRect(-halfWidth + 8, -halfHeight + 8, signWidth, signHeight, 15);
    
    // Main wood sign
    woodSign.fillStyle(woodBaseColor, 0.95);
    woodSign.fillRoundedRect(-halfWidth, -halfHeight, signWidth, signHeight, 15);
    
    // Enhanced wood grain texture (multiple layers for detailed wood)
    woodSign.lineStyle(1, woodGrainColor, 0.5);
    const grainLines = 16;
    for (let i = 1; i < grainLines; i++) {
      const y = -halfHeight + (signHeight / grainLines) * i;
      // Wavy grain lines for more realistic wood
      const waveOffset = Math.sin(i * 0.8) * 3;
      woodSign.moveTo(-halfWidth + 15 + waveOffset, y);
      woodSign.lineTo(halfWidth - 15 + waveOffset, y);
    }
    woodSign.strokePath();
    
    // Vertical grain lines for more realistic wood
    woodSign.lineStyle(0.5, woodGrainColor, 0.3);
    for (let i = 1; i < 10; i++) {
      const x = -halfWidth + (signWidth / 10) * i;
      const waveOffset = Math.sin(i * 0.5) * 2;
      woodSign.moveTo(x + waveOffset, -halfHeight + 15);
      woodSign.lineTo(x + waveOffset, halfHeight - 15);
    }
    woodSign.strokePath();
    
    // Knots and imperfections for realistic wood
    woodSign.fillStyle(woodDarkColor, 0.4);
    woodSign.fillCircle(-halfWidth + 40, -halfHeight + 60, 8);
    woodSign.fillCircle(halfWidth - 30, halfHeight - 80, 6);
    woodSign.fillCircle(-halfWidth + 60, halfHeight - 40, 5);
    
    // Wood rings around knots
    woodSign.lineStyle(1, woodGrainColor, 0.6);
    woodSign.strokeCircle(-halfWidth + 40, -halfHeight + 60, 8);
    woodSign.strokeCircle(halfWidth - 30, halfHeight - 80, 6);
    woodSign.strokeCircle(-halfWidth + 60, halfHeight - 40, 5);
    
    // Additional wood texture details
    woodSign.lineStyle(0.3, woodLightColor, 0.2);
    for (let i = 0; i < 20; i++) {
      const x = -halfWidth + Math.random() * signWidth;
      const y = -halfHeight + Math.random() * signHeight;
      const length = 5 + Math.random() * 10;
      woodSign.moveTo(x, y);
      woodSign.lineTo(x + length, y);
    }
    woodSign.strokePath();
    
    // 3D depth effect - enhanced highlights
    woodSign.fillStyle(woodLightColor, 0.7);
    woodSign.fillRect(-halfWidth, -halfHeight, signWidth, 8);
    woodSign.fillRect(-halfWidth, -halfHeight, 8, signHeight);
    
    // 3D depth effect - enhanced shadows
    woodSign.fillStyle(woodDarkColor, 0.8);
    woodSign.fillRect(halfWidth - 8, -halfHeight + 4, 8, signHeight - 4);
    woodSign.fillRect(-halfWidth + 4, halfHeight - 8, signWidth - 4, 8);
    
    // Carved border details
    woodSign.lineStyle(2, woodAccentColor, 0.9);
    woodSign.strokeRoundedRect(-halfWidth, -halfHeight, signWidth, signHeight, 15);
    
    // Inner carved border
    woodSign.lineStyle(1, woodDarkColor, 0.9);
    woodSign.strokeRoundedRect(-halfWidth + 12, -halfHeight + 12, signWidth - 24, signHeight - 24, 10);
    
    // Inner highlight for carved effect
    woodSign.lineStyle(1, woodLightColor, 0.6);
    woodSign.strokeRoundedRect(-halfWidth + 15, -halfHeight + 15, signWidth - 30, signHeight - 30, 8);
    
    signContainer.add(woodSign);
    
    // Add decorative vines and cherry blossoms
    this.addDecorativeElements(signContainer, halfWidth, halfHeight);
    
    completionContainer.add(signContainer);
    
    const currentSeasonalLevel = this.seasonalManager.getCurrentLevel();
    const completionLevel = data?.level || currentSeasonalLevel?.globalLevel || this.currentLevel;
    const isFinalCampaignLevel = this.gameMode === 'campaign' && completionLevel >= 20;
    const completionBeat = this.getCampaignCompletionBeat(completionLevel, isFinalCampaignLevel);
    const completionTitle = isFinalCampaignLevel
      ? 'THE DAM IS SAFE'
      : `LEVEL ${completionLevel} COMPLETE`;

    // Engraved title text (carved/inset effect) - positioned on the smaller sign
    const titleShadow = this.add.text(0, -halfHeight + 74, completionTitle, {
      fontSize: isMobile ? '24px' : '32px',
      color: '#2E2419',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    titleShadow.setPosition(titleShadow.x + 2, titleShadow.y + 2);
    completionContainer.add(titleShadow);
    
    const titleText = this.add.text(0, -halfHeight + 64, completionTitle, {
      fontSize: isMobile ? '24px' : '32px',
      color: '#DAA520', // Golden engraved text
      fontFamily: 'Arial Black',
      align: 'center',
      stroke: '#654321',
      strokeThickness: 2
    }).setOrigin(0.5);
    completionContainer.add(titleText);
    
    const subtitleText = this.add.text(0, -halfHeight + (isMobile ? 98 : 110), completionBeat.title, {
      fontSize: isMobile ? '18px' : '24px',
      color: '#DDF1B8',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: signWidth - 100 }
    }).setOrigin(0.5);
    completionContainer.add(subtitleText);

    // Stars display (properly spaced, no overlap) - centered between subtitle and story panel
    const starY = -halfHeight + (isMobile ? 110 : 132);
    const starSize = isMobile ? '28px' : '36px';
    const starSpacing = isMobile ? 45 : 60;
    const starsEarned = data.stars || 1;
    const animatedStars: Phaser.GameObjects.Text[] = [];
    
    for (let i = 0; i < 3; i++) {
      const starX = -starSpacing + (i * starSpacing);
      const starChar = i < starsEarned ? '★' : '☆';
      const starColor = i < starsEarned ? '#FFD700' : '#654321';
      
      // Star shadow
      const starShadow = this.add.text(starX + 1, starY + 1, starChar, {
        fontSize: starSize,
        color: '#000000',
        fontFamily: 'Arial',
        align: 'center'
      }).setOrigin(0.5);
      completionContainer.add(starShadow);
      
      // Star
      const star = this.add.text(starX, starY, starChar, {
        fontSize: starSize,
        color: starColor,
        fontFamily: 'Arial',
        align: 'center'
      }).setOrigin(0.5);
      star.setScale(i < starsEarned ? 0.2 : 1);
      star.setAlpha(i < starsEarned ? 0.3 : 1);
      completionContainer.add(star);
      animatedStars.push(star);
    }
    
    const summaryCardY = starY + (isMobile ? 24 : 26);
    const summaryCardWidth = signWidth - (isMobile ? 60 : 90);
    const summaryPaddingTop = isMobile ? 20 : 22;
    const summaryPaddingBottom = isMobile ? 18 : 20;
    const summaryBlockGap = isMobile ? 12 : 14;
    const summaryText = this.add.text(0, 0, completionBeat.summary, {
      fontSize: isMobile ? '13px' : '16px',
      color: '#FFF6E4',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      align: 'center',
      wordWrap: { width: summaryCardWidth - 34 },
      lineSpacing: 3
    }).setOrigin(0.5);

    const celebrationText = this.add.text(0, 0, completionBeat.celebration, {
      fontSize: isMobile ? '12px' : '14px',
      color: '#F6D99A',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'italic',
      align: 'center',
      wordWrap: { width: summaryCardWidth - 40 },
      lineSpacing: 2
    }).setOrigin(0.5);

    const nextHintText = this.add.text(0, 0, completionBeat.nextHint, {
      fontSize: isMobile ? '12px' : '14px',
      color: '#CFEED8',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: summaryCardWidth - 40 }
    }).setOrigin(0.5);

    const summaryTextHeight = summaryText.height;
    const celebrationTextHeight = celebrationText.height;
    const nextHintHeight = nextHintText.height;
    const summaryCardHeight =
      summaryPaddingTop +
      summaryTextHeight +
      summaryBlockGap +
      celebrationTextHeight +
      summaryBlockGap +
      nextHintHeight +
      summaryPaddingBottom;

    const summaryCard = this.add.graphics();
    summaryCard.fillStyle(0x16253b, 0.78);
    summaryCard.lineStyle(2, 0x84d3d8, 0.48);
    summaryCard.fillRoundedRect(-summaryCardWidth / 2, summaryCardY, summaryCardWidth, summaryCardHeight, 16);
    summaryCard.strokeRoundedRect(-summaryCardWidth / 2, summaryCardY, summaryCardWidth, summaryCardHeight, 16);
    completionContainer.add(summaryCard);

    let textCursorY = summaryCardY + summaryPaddingTop;
    summaryText.setY(textCursorY + summaryTextHeight / 2);
    completionContainer.add(summaryText);

    textCursorY += summaryTextHeight + summaryBlockGap;
    celebrationText.setY(textCursorY + celebrationTextHeight / 2);
    completionContainer.add(celebrationText);

    textCursorY += celebrationTextHeight + summaryBlockGap;
    nextHintText.setY(textCursorY + nextHintHeight / 2);
    completionContainer.add(nextHintText);

    animatedStars.forEach((star, index) => {
      if (index >= starsEarned) {
        return;
      }

      this.tweens.add({
        targets: star,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 220,
        delay: 180 + index * 140,
        ease: 'Back.easeOut'
      });
    });

    // Stats section with engraved style - positioned on the smaller sign
    const statsY = halfHeight - (isMobile ? 34 : 40);
    const statColumnOffset = isMobile ? 88 : 108;
    
    // Score
    const scoreShadow = this.add.text(-statColumnOffset, statsY, `SCORE\n${data.score.toLocaleString()}`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#2E2419',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    scoreShadow.setPosition(scoreShadow.x + 1, scoreShadow.y + 1);
    completionContainer.add(scoreShadow);
    
    const scoreText = this.add.text(-statColumnOffset, statsY, `SCORE\n${data.score.toLocaleString()}`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#F5DEB3', // Light wood text
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    completionContainer.add(scoreText);
    
    // Time
    const timeSeconds = Math.round(data.timeElapsed / 1000);
    const timeShadow = this.add.text(0, statsY, `TIME\n${timeSeconds}s`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#2E2419',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    timeShadow.setPosition(timeShadow.x + 1, timeShadow.y + 1);
    completionContainer.add(timeShadow);
    
    const timeText = this.add.text(0, statsY, `TIME\n${timeSeconds}s`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#F5DEB3',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    completionContainer.add(timeText);

    const starsShadow = this.add.text(statColumnOffset, statsY, `STARS\n${starsEarned}/3`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#2E2419',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    starsShadow.setPosition(starsShadow.x + 1, starsShadow.y + 1);
    completionContainer.add(starsShadow);

    const starsText = this.add.text(statColumnOffset, statsY, `STARS\n${starsEarned}/3`, {
      fontSize: isMobile ? '14px' : '18px',
      color: '#F5DEB3',
      fontFamily: 'Arial Black',
      align: 'center'
    }).setOrigin(0.5);
    completionContainer.add(starsText);
    
    // Wooden Continue button - positioned on the smaller sign
    const buttonY = isMobile ? 0 : 10; // we'll center content vertically; button sits near center-bottom
    const buttonWidth = isMobile ? 160 : 180;
    const buttonHeight = isMobile ? 40 : 45;
    const buttonContainer = this.add.container(0, buttonY);
    buttonContainer.setDepth(2);
    
    const buttonBg = this.add.graphics();
    const buttonRadius = 12;
    
    const drawCompletionButton = (hovered: boolean) => {
      const topColor = hovered ? 0xF7D0DF : 0xEEC2D2;
      const bottomColor = hovered ? 0xDFA4B8 : 0xCC8FA6;
      const borderColor = hovered ? 0xFFF2F7 : 0xF8DCE7;
      const grainColor = hovered ? 0xC28A7D : 0xB97E72;

      buttonBg.clear();

      // Button shadow
      buttonBg.fillStyle(0x000000, 0.26);
      buttonBg.fillRoundedRect(-buttonWidth/2 + 4, -buttonHeight/2 + 4, buttonWidth, buttonHeight, buttonRadius);

      // Cherry blossom wood body
      buttonBg.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 0.98);
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);

      // Wood grain / petal streaks
      buttonBg.lineStyle(1, grainColor, 0.28);
      for (let i = 1; i < 4; i++) {
        const lineY = -buttonHeight/2 + (buttonHeight / 4) * i;
        buttonBg.moveTo(-buttonWidth/2 + 10, lineY);
        buttonBg.lineTo(buttonWidth/2 - 10, lineY + (i % 2 === 0 ? 1 : -1));
      }
      buttonBg.strokePath();

      // Soft highlights
      buttonBg.fillStyle(0xFFF5F8, 0.7);
      buttonBg.fillRect(-buttonWidth/2 + 2, -buttonHeight/2 + 2, buttonWidth - 4, 4);
      buttonBg.fillRect(-buttonWidth/2 + 2, -buttonHeight/2 + 2, 4, buttonHeight - 4);

      // Lower shadow
      buttonBg.fillStyle(0xB8798E, 0.45);
      buttonBg.fillRect(buttonWidth/2 - 5, -buttonHeight/2 + 5, 3, buttonHeight - 10);
      buttonBg.fillRect(-buttonWidth/2 + 5, buttonHeight/2 - 5, buttonWidth - 10, 3);

      // Border
      buttonBg.lineStyle(3, borderColor, hovered ? 1 : 0.92);
      buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    };

    drawCompletionButton(false);
    
    buttonContainer.add(buttonBg);
    
    const buttonLabel = completionBeat.buttonLabel;
    const buttonText = this.add.text(0, 0, buttonLabel, {
      fontSize: isMobile ? '18px' : '22px',
      color: '#4D2332',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    buttonContainer.add(buttonText);
    completionContainer.add(buttonContainer);
    
    // Position content vertically centered: compute offsets
    const contentTopPadding = isMobile ? 20 : 24;
    const titleY = -halfHeight + contentTopPadding + (isMobile ? 20 : 24);
    titleShadow.setY(titleY);
    titleText.setY(titleY);
    subtitleText.setY(titleY + (isMobile ? 34 : 42));
    buttonContainer.setY(halfHeight + (isMobile ? 28 : 32));

    // Add entrance animation for polish
    completionContainer.setAlpha(0);
    completionContainer.setScale(0.8);
    this.tweens.add({
      targets: completionContainer,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    // Add subtle swaying animation to the suspended sign
    this.tweens.add({
      targets: signContainer,
      rotation: 0.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Button interactivity
    buttonContainer.setSize(buttonWidth, buttonHeight);
    buttonContainer.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    
    // Helper function to redraw button
    const redrawButton = (hovered: boolean) => {
      drawCompletionButton(hovered);
    };
    
    // Remove scale-based hover to avoid hit-area mismatch
    buttonContainer.on('pointerover', () => {
      redrawButton(true);
    });
    
    buttonContainer.on('pointerout', () => {
      redrawButton(false);
    });

    // Shared handler so both the button and background clicks can advance quickly
    const goToNextLevel = () => {
      // Prevent multiple activations
      if (!this.isShowingLevelComplete) {
        return;
      }
      
      this.isShowingLevelComplete = false;
      buttonContainer.disableInteractive();
      
      completionContainer.destroy();
      
      // Remove background overlay if any before intro
      if (this.overlayBackground) {
        this.overlayBackground.destroy(true);
        this.overlayBackground = null;
      }
      
      if (isFinalCampaignLevel) {
        this.isPaused = false;
        this.isShowingLevelIntro = false;
        this.scene.start('LevelSelect');
      } else {
        const nextLevel = this.currentLevel + 1;
        this.currentLevel = nextLevel;
        this.syncCurrentLevelState();
        this.updateGameUI(this.gameStateManager.getState());
        this.showLevelIntro(nextLevel);
      }
    };
    
    // Primary click target: the Continue button
    buttonContainer.once('pointerdown', goToNextLevel);
    
    // Also allow clicking anywhere on the completion overlay background
    blocker.on('pointerdown', goToNextLevel);

    // Add beaver as a decorative corner accent so it never overlaps the story text
    const beaverMaxWidth = isMobile ? 180 : 226;
    const beaver = this.addBeaverCharacter(completionContainer, 0, 0, beaverMaxWidth);
    const beaverInsetX = isMobile ? 18 : 24;
    const beaverOverlapY = isMobile ? 14 : 18;
    beaver.x = halfWidth - beaverInsetX;
    beaver.y = halfHeight + beaverOverlapY;
    beaver.setDepth(1);
    beaver.setRotation(-0.04);
    beaver.setScale(beaver.scaleX * 0.98, beaver.scaleY * 0.98);
    // Subtle idle animation AFTER final position is set
    const bob = (isMobile ? 1 : 1.5);
    this.tweens.add({
      targets: beaver,
      y: beaver.y - bob,
      rotation: -0.055,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createLevelCompleteBackground(): void {
    const { width, height } = this.scale;
    
    // Destroy any existing background first
    if (this.overlayBackground) {
      this.overlayBackground.destroy(true);
      this.overlayBackground = null;
    }
    
    // Create cherry blossom forest background
    const backgroundContainer = this.add.container(0, 0);
    backgroundContainer.setDepth(250);
    this.overlayBackground = backgroundContainer;
    
    // Sky gradient
    const skyGraphics = this.add.graphics();
    skyGraphics.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F6FF, 0xE0F6FF, 1);
    skyGraphics.fillRect(0, 0, width, height);
    backgroundContainer.add(skyGraphics);
    
    // Cherry blossom trees (simplified)
    const treeGraphics = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      const x = (width / 8) * i + Math.random() * 50;
      const treeHeight = 200 + Math.random() * 100;
      const treeY = height - treeHeight;
      
      // Tree trunk
      treeGraphics.fillStyle(0x8B4513, 0.8);
      treeGraphics.fillRect(x - 8, treeY + treeHeight * 0.6, 16, treeHeight * 0.4);
      
      // Cherry blossom canopy
      treeGraphics.fillStyle(0xFFB6C1, 0.7);
      treeGraphics.fillCircle(x, treeY + treeHeight * 0.3, treeHeight * 0.3);
      treeGraphics.fillCircle(x - 20, treeY + treeHeight * 0.4, treeHeight * 0.2);
      treeGraphics.fillCircle(x + 20, treeY + treeHeight * 0.4, treeHeight * 0.2);
    }
    backgroundContainer.add(treeGraphics);
    
    // Falling cherry blossom petals
    for (let i = 0; i < 20; i++) {
      const petal = this.add.graphics();
      petal.fillStyle(0xFFB6C1, 0.8);
      petal.fillCircle(0, 0, 3);
      
      const startX = Math.random() * width;
      const startY = -10;
      const endY = height + 10;
      
      petal.setPosition(startX, startY);
      
      this.tweens.add({
        targets: petal,
        y: endY,
        x: startX + (Math.random() - 0.5) * 100,
        duration: 3000 + Math.random() * 2000,
        ease: 'Linear',
        repeat: -1,
        delay: Math.random() * 2000
      });
      
      backgroundContainer.add(petal);
    }
    
    // Sunlight rays
    const raysGraphics = this.add.graphics();
    raysGraphics.fillStyle(0xFFFF99, 0.3);
    for (let i = 0; i < 5; i++) {
      const rayX = width * 0.8 + i * 20;
      raysGraphics.fillRect(rayX, 0, 3, height);
    }
    backgroundContainer.add(raysGraphics);
  }

  private addDecorativeElements(signContainer: Phaser.GameObjects.Container, halfWidth: number, halfHeight: number): void {
    const decorations = this.add.graphics();
    
    // Vines wrapping around the sign
    decorations.lineStyle(3, 0x228B22, 0.8);
    
    // Left side vine
    decorations.moveTo(-halfWidth + 5, -halfHeight + 50);
    decorations.lineTo(-halfWidth + 5, -halfHeight + 100);
    decorations.lineTo(-halfWidth + 15, -halfHeight + 120);
    decorations.lineTo(-halfWidth + 5, -halfHeight + 140);
    decorations.lineTo(-halfWidth + 5, halfHeight - 50);
    decorations.strokePath();
    
    // Right side vine
    decorations.moveTo(halfWidth - 5, -halfHeight + 50);
    decorations.lineTo(halfWidth - 5, -halfHeight + 100);
    decorations.lineTo(halfWidth - 15, -halfHeight + 120);
    decorations.lineTo(halfWidth - 5, -halfHeight + 140);
    decorations.lineTo(halfWidth - 5, halfHeight - 50);
    decorations.strokePath();
    
    // Cherry blossoms on vines
    decorations.fillStyle(0xFFB6C1, 0.9);
    decorations.fillCircle(-halfWidth + 5, -halfHeight + 80, 4);
    decorations.fillCircle(-halfWidth + 15, -halfHeight + 120, 4);
    decorations.fillCircle(halfWidth - 5, -halfHeight + 80, 4);
    decorations.fillCircle(halfWidth - 15, -halfHeight + 120, 4);
    
    // Carved details (beaver teeth marks)
    decorations.fillStyle(0x2E2419, 0.6);
    for (let i = 0; i < 6; i++) {
      const x = -halfWidth + 20 + i * 30;
      decorations.fillRect(x, halfHeight - 15, 8, 3);
      decorations.fillRect(x + 2, halfHeight - 12, 4, 2);
    }
    
    signContainer.add(decorations);
  }

  private addBeaverCharacter(
    targetContainer: Phaser.GameObjects.Container,
    x: number,
    y: number,
    maxWidth: number
  ): Phaser.GameObjects.Image {
    const beaver = this.add.image(x, y, 'levelCompleteBeaver').setOrigin(0.5, 1);
    const scale = Math.min(1, maxWidth / beaver.width);
    beaver.setScale(scale);
    targetContainer.add(beaver);
    return beaver;
  }

  private showLevelIntro(levelNumber: number): void {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    const storyBeat = this.getCampaignStoryBeat(levelNumber);
    console.log('intro-modal-v2', { levelNumber, isMobile });
    this.isPaused = true;
    this.isShowingLevelIntro = true;
    const root = this.add.container(width / 2, height / 2);
    root.setDepth(350);

    const layout = this.measureIntroModalLayout(storyBeat, width, height, isMobile, levelNumber);

    // Soft background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(-width / 2, -height / 2, width, height);
    root.add(bg);

    // Block clicks to the game; panel is added after so the button stays on top
    const clickBlocker = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    clickBlocker.setInteractive();
    root.add(clickBlocker);

    const panel = this.add.container(0, 0);
    panel.setScale(layout.modalScale);

    if (levelNumber === 1 && this.textures.exists('chapter1Signage')) {
      const art = this.add.image(0, 0, 'chapter1Signage').setOrigin(0.5);
      const s = Math.min(layout.signWidth / art.width, layout.signHeight / art.height);
      art.setScale(s);
      art.setAlpha(0.42);
      panel.add(art);
    }

    const sign = this.add.graphics();
    sign.fillGradientStyle(0x4A3728, 0x4A3728, 0x73543b, 0x73543b, 0.97);
    sign.fillRoundedRect(-layout.signWidth / 2, -layout.signHeight / 2, layout.signWidth, layout.signHeight, 14);
    sign.lineStyle(2, 0x8B4513, 1);
    sign.strokeRoundedRect(-layout.signWidth / 2, -layout.signHeight / 2, layout.signWidth, layout.signHeight, 14);
    panel.add(sign);

    const chapter = this.add.text(0, layout.chapterY, storyBeat.chapterTitle, {
      fontSize: isMobile ? '16px' : '18px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      color: '#F7D9A0',
      align: 'center'
    }).setOrigin(0.5);
    panel.add(chapter);

    const title = this.add.text(0, layout.titleY, `LEVEL ${levelNumber} · ${storyBeat.levelLabel}`, {
      fontSize: isMobile ? '22px' : '28px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      color: '#FFE7A8',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5);
    panel.add(title);

    const subtitle = this.add.text(0, layout.subtitleY, storyBeat.title, {
      fontSize: isMobile ? '18px' : '22px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      color: '#BFE8B4',
      align: 'center',
      wordWrap: { width: layout.signWidth - 70 }
    }).setOrigin(0.5);
    panel.add(subtitle);

    const storyCard = this.add.graphics();
    storyCard.fillStyle(0x1f2f1e, 0.45);
    storyCard.lineStyle(2, 0xcfe9c7, 0.55);
    storyCard.fillRoundedRect(-layout.signWidth / 2 + 30, layout.storyCardY, layout.signWidth - 60, layout.storyCardHeight, 12);
    storyCard.strokeRoundedRect(-layout.signWidth / 2 + 30, layout.storyCardY, layout.signWidth - 60, layout.storyCardHeight, 12);
    panel.add(storyCard);

    const story = this.add.text(
      0,
      layout.storyCardY + layout.storyCardHeight / 2,
      storyBeat.text,
      layout.storyTextStyle
    ).setOrigin(0.5);
    panel.add(story);

    const startButton = this.createIntroCtaButton(0, layout.buttonY, storyBeat.buttonLabel, isMobile);
    panel.add(startButton.container);

    root.add(panel);

    let introAccepted = false;
    let handleIntroContinue: () => void;
    const onKey = (ev: KeyboardEvent): void => {
      if (introAccepted) {
        return;
      }
      if (ev.code !== 'Space' && ev.code !== 'Enter') {
        return;
      }
      ev.preventDefault();
      handleIntroContinue();
    };
    this.input.keyboard?.on('keydown', onKey);

    handleIntroContinue = (): void => {
      if (introAccepted) {
        return;
      }
      introAccepted = true;
      this.input.keyboard?.off('keydown', onKey);

      startButton.setPressedState();
      startButton.hitTarget.disableInteractive();
      if (this.overlayBackground) {
        this.overlayBackground.destroy(true);
        this.overlayBackground = null;
      }
      const started = this.levelProgressionManager?.startLevel(levelNumber);
      if (started) {
        this.currentLevel = levelNumber;
        this.syncCurrentLevelState();
        this.updateGameUI(this.gameStateManager.getState());
        root.destroy(true);
        this.isPaused = false;
        this.isShowingLevelIntro = false;
        this.resumeGameplay();
      } else {
        root.destroy(true);
        this.isPaused = false;
        this.isShowingLevelIntro = false;
        this.scene.start('EnhancedGame', { level: levelNumber, mode: 'campaign' });
      }
    };

    const hit = startButton.hitTarget;
    hit.on('pointerover', () => {
      if (!introAccepted) {
        startButton.setHoverState();
      }
    });
    hit.on('pointerout', () => {
      if (!introAccepted) {
        startButton.setIdleState();
      }
    });
    hit.on('pointerdown', () => {
      if (!introAccepted) {
        startButton.setPressedState();
      }
    });
    hit.once('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      handleIntroContinue();
    });
  }

  private measureIntroModalLayout(
    storyBeat: CampaignStoryBeat,
    viewportWidth: number,
    viewportHeight: number,
    isMobile: boolean,
    levelNumber: number
  ): IntroModalLayout {
    const signWidth = isMobile ? viewportWidth - 80 : 560;
    const storyTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: isMobile ? '15px' : '18px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      color: '#FFF8E7',
      align: 'center',
      wordWrap: { width: signWidth - 90 },
      lineSpacing: 4
    };
    const storyMeasure = this.add.text(0, 0, storyBeat.text, storyTextStyle).setOrigin(0.5);
    storyMeasure.setVisible(false);

    const subtitleMeasure = this.add.text(0, 0, storyBeat.title, {
      fontSize: isMobile ? '18px' : '22px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      color: '#BFE8B4',
      align: 'center',
      wordWrap: { width: signWidth - 70 }
    }).setOrigin(0.5);
    subtitleMeasure.setVisible(false);
    const subtitleHeight = Math.ceil(subtitleMeasure.height);
    subtitleMeasure.destroy();

    const chapterFontHeight = isMobile ? 18 : 22;
    const titleFontHeight = isMobile ? 30 : 38;
    const buttonHeight = isMobile ? 48 : 56;
    const topPadding = isMobile ? 28 : 34;
    const chapterToTitleGap = isMobile ? 24 : 26;
    const titleToSubtitleGap = isMobile ? 26 : 30;
    const subtitleToCardGap = isMobile ? 24 : 28;
    const storyCardPadding = isMobile ? 16 : 20;
    const cardToButtonGap = isMobile ? 22 : 24;
    const buttonBottomPadding = isMobile ? 24 : 28;
    const storyTextHeight = Math.ceil(storyMeasure.height);
    const storyCardHeight = Math.max(isMobile ? 104 : 120, storyTextHeight + storyCardPadding * 2);

    const signHeight =
      topPadding +
      chapterFontHeight +
      chapterToTitleGap +
      titleFontHeight +
      titleToSubtitleGap +
      subtitleHeight +
      subtitleToCardGap +
      storyCardHeight +
      cardToButtonGap +
      buttonHeight +
      buttonBottomPadding;

    const maxModalHeight = viewportHeight * 0.9;
    const modalScale = Math.max(0.52, Math.min(1, maxModalHeight / signHeight));

    const signTop = -signHeight / 2;
    const chapterY = signTop + topPadding + chapterFontHeight / 2;
    const titleY = chapterY + chapterFontHeight / 2 + chapterToTitleGap + titleFontHeight / 2;
    const subtitleY = titleY + titleFontHeight / 2 + titleToSubtitleGap + subtitleHeight / 2;
    const storyCardY = subtitleY + subtitleHeight / 2 + subtitleToCardGap;
    const buttonY = storyCardY + storyCardHeight + cardToButtonGap + buttonHeight / 2;

    console.log('intro-modal-v2-layout', {
      levelNumber,
      signHeight,
      storyTextHeight,
      storyCardHeight,
      subtitleHeight,
      buttonY,
      modalScale
    });

    storyMeasure.destroy();

    return {
      signWidth,
      signHeight,
      chapterY,
      titleY,
      subtitleY,
      storyCardY,
      storyCardHeight,
      buttonY,
      modalScale,
      storyTextStyle
    };
  }

  /**
   * Campaign intro CTA: warm parchment fill + cyan accent ring (matches reference art).
   * Uses a topmost transparent Rectangle for hit testing — Container.setInteractive + scaled
   * parents often misalign hit areas (clicks only registering on one side).
   */
  private createIntroCtaButton(x: number, y: number, label: string, isMobile: boolean): {
    container: Phaser.GameObjects.Container;
    hitTarget: Phaser.GameObjects.Rectangle;
    setIdleState: () => void;
    setHoverState: () => void;
    setPressedState: () => void;
  } {
    const buttonWidth = isMobile ? 200 : 248;
    const buttonHeight = isMobile ? 48 : 56;
    const container = this.add.container(x, y);
    const shadow = this.add.graphics();
    const background = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontSize: isMobile ? '18px' : '22px',
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontStyle: 'bold',
      color: '#2a241c'
    }).setOrigin(0.5);

    const draw = (tone: 'idle' | 'hover' | 'pressed'): void => {
      const palette =
        tone === 'pressed'
          ? { fill: 0xc9b89a, border: 0x14b8a6, scale: 0.97 }
          : tone === 'hover'
            ? { fill: 0xf2e6d4, border: 0x22d3ee, scale: 1.02 }
            : { fill: 0xe8d4b8, border: 0x22d3ee, scale: 1 };

      shadow.clear();
      shadow.fillStyle(0x0d0805, 0.22);
      shadow.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2 + 4, buttonWidth, buttonHeight, 20);

      background.clear();
      background.fillStyle(palette.fill, 1);
      background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 20);
      background.lineStyle(3, palette.border, 1);
      background.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 20);

      text.setScale(palette.scale);
    };

    const padX = 48;
    const padY = 28;
    const hitTarget = this.add.rectangle(0, 0, buttonWidth + padX, buttonHeight + padY, 0x000000, 0);
    hitTarget.setInteractive();

    container.add([shadow, background, text, hitTarget]);
    draw('idle');

    return {
      container,
      hitTarget,
      setIdleState: () => draw('idle'),
      setHoverState: () => draw('hover'),
      setPressedState: () => draw('pressed')
    };
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
    
    if (lines === 5) {
      title = "Building Momentum!";
      storyText = "Great start! You're getting the hang of this. The dam foundation is taking shape nicely. Keep stacking those wooden pieces - you're doing amazing!";
    } else if (lines === 10) {
      title = "Dam Foundation Complete!";
      storyText = "Excellent progress! The dam foundation is solid. The beaver community is impressed with your building skills. Keep up the great work!";
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
  private ghostGraphics!: Phaser.GameObjects.Graphics; // Ghost piece
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
      
      this.ghostGraphics = this.add.graphics();
      this.ghostGraphics.setDepth(10.5); // Between board and active piece
      this.gameContainer.add(this.ghostGraphics);
      
      this.pieceGraphics = this.add.graphics();
      this.pieceGraphics.setDepth(11); // Above ghost piece
      this.gameContainer.add(this.pieceGraphics);
      
      this.uiGraphics = this.add.graphics();
      this.uiGraphics.setDepth(10);
      this.uiContainer.add(this.uiGraphics);
      
      console.log('✅ Graphics layers initialized:', {
        boardGraphics: !!this.boardGraphics,
        ghostGraphics: !!this.ghostGraphics,
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
    
    // Update game UI (score, level, lines)
    this.updateGameUI(state);
    
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
    if (this.ghostGraphics && this.ghostGraphics.active) {
      this.ghostGraphics.clear();
    }
    this.pieceGraphics.clear();
    if (state.currentPiece) {
      const piece = state.currentPiece;
      
      // Ghost piece (landing position)
      const ghostPiece = this.getGhostPiece(piece, state.board);
      if (ghostPiece && this.ghostGraphics) {
        for (let y = 0; y < ghostPiece.shape.length; y++) {
          for (let x = 0; x < ghostPiece.shape[y].length; x++) {
            if (ghostPiece.shape[y][x] !== 0) {
              this.drawGhostBlock(
                this.ghostGraphics,
                boardX + (ghostPiece.x + x) * blockSize,
                boardY + (ghostPiece.y + y) * blockSize,
                blockSize
              );
            }
          }
        }
      }
      
      // Active falling piece
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
    if (this.showEnvironmentalText && !this.waterLevelText) {
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
    if (this.showEnvironmentalText && this.waterLevelText) {
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
    } else if (this.waterLevelText) {
      this.waterLevelText.setVisible(false);
    }
    
    // Create or update season display
    if (this.showEnvironmentalText && !this.seasonText) {
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
    if (this.showEnvironmentalText && this.seasonText) {
      const seasonEmoji = this.getSeasonEmoji(currentLevel.season);
      this.seasonText.setText(`${seasonEmoji} ${currentLevel.name} - ${currentLevel.season.toUpperCase()}`);
      
      // Update season text color based on season
      this.seasonText.setColor(this.getSeasonColor(currentLevel.season));
    } else if (this.seasonText) {
      this.seasonText.setVisible(false);
    }
    
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
    const piece = state.nextPiece;
    
    const cols = piece.shape[0].length;
    const rows = piece.shape.length;
    const areaWidth = this.nextPieceAreaWidth || (isMobile ? 80 : 90);
    const areaHeight = this.nextPieceAreaHeight || (isMobile ? 40 : 50);
    
    // Scale preview blocks to fill the box while still fitting all shapes
    const minBlockSize = isMobile ? 12 : 14;
    const maxBlockSize = isMobile ? 16 : 20;
    const fitBlockSize = Math.floor(Math.min(areaWidth / cols, areaHeight / rows));
    const previewBlockSize = Math.max(minBlockSize, Math.min(maxBlockSize, fitBlockSize));
    
    // Calculate centering offset
    const pieceWidth = cols * previewBlockSize;
    const pieceHeight = rows * previewBlockSize;
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
    const bevelSize = Math.min(4, Math.max(3, Math.floor(size * 0.15)));
    
    // Subtle shadow underneath falling pieces (4px offset, 60% opacity)
    if (type === 'falling') {
      graphics.fillStyle(0x000000, 0.6);
      graphics.fillRect(x + 4, y + 4, size, size);
    }
    
    // Main block body
    graphics.fillStyle(baseColor);
    graphics.fillRect(x + padding, y + padding, innerSize, innerSize);
    
    // Gradient fill overlay (top 20% lighter, bottom 20% darker)
    const topShade = Math.max(2, Math.floor(innerSize * 0.2));
    const bottomShade = Math.max(2, Math.floor(innerSize * 0.2));
    graphics.fillStyle(0xC8956A, 0.9); // lighter top
    graphics.fillRect(x + padding, y + padding, innerSize, topShade);
    graphics.fillStyle(0x8B6239, 0.9); // darker bottom
    graphics.fillRect(x + padding, y + padding + innerSize - bottomShade, innerSize, bottomShade);
    
    // Beveled edges: highlight top/left, shadow bottom/right
    graphics.fillStyle(0xC8956A, 0.9);
    graphics.fillRect(x + padding, y + padding, innerSize, bevelSize); // Top bevel
    graphics.fillRect(x + padding, y + padding, bevelSize, innerSize); // Left bevel
    
    graphics.fillStyle(0x8B6239, 0.9);
    graphics.fillRect(x + padding + innerSize - bevelSize, y + padding, bevelSize, innerSize); // Right bevel
    graphics.fillRect(x + padding, y + padding + innerSize - bevelSize, innerSize, bevelSize); // Bottom bevel
    
    // Specular highlight (2x2 px white dot at 60% opacity)
    graphics.fillStyle(0xFFFFFF, 0.6);
    graphics.fillRect(x + padding + 2, y + padding + 2, 2, 2);
    
    // Texture overlay (wood grain / stone) at 30% opacity
    if (size > 15) {
      graphics.lineStyle(1, 0x8B6B45, 0.3);
      const grainLines = type === 'preview' ? 2 : 3;
      for (let i = 0; i < grainLines; i++) {
        const lineY = y + padding + (innerSize / (grainLines + 1)) * (i + 1);
        graphics.moveTo(x + padding + 2, lineY);
        graphics.lineTo(x + size - padding - 2, lineY + (i % 2 === 0 ? 1 : -1));
      }
      graphics.strokePath();
    }
    
    // Border definition (1px dark outline)
    graphics.lineStyle(1, 0x5C3D1F, 1);
    graphics.strokeRect(x + padding, y + padding, innerSize, innerSize);
    
    // Subtle glow retained for preview pieces only
    if (type === 'preview') {
      graphics.lineStyle(1, glowColor, 0.35);
      graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
  }

  private getGhostPiece(piece: GamePiece, board: number[][]): GamePiece | null {
    let testPiece = { ...piece };
    let dropDistance = 0;
    
    while (!this.pieceManager.checkCollision(testPiece, board)) {
      dropDistance++;
      testPiece = this.pieceManager.movePiece(testPiece, 0, 1);
    }
    
    if (dropDistance <= 1) {
      return piece;
    }
    
    return this.pieceManager.movePiece(piece, 0, dropDistance - 1);
  }

  private drawGhostBlock(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    graphics.fillStyle(0xFFFFFF, 0.25);
    graphics.fillRect(x + 1, y + 1, size - 2, size - 2);
    graphics.lineStyle(1, 0xFFFFFF, 0.8);
    graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
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
    const isFullscreen = width > 1200;
    
    // Position message bubble above the beaver (adjusted for new beaver position)
    // Ensure bubble doesn't go off screen - position it more to the right and higher
    const bubbleX = isMobile ? 150 : isFullscreen ? 220 : 200; // Slightly larger for fullscreen
    const bubbleY = height - (isMobile ? 300 : isFullscreen ? 340 : 320); // Adjusted for each view
    
    // Responsive bubble sizing for different screen sizes
    const bubbleWidth = isMobile ? 160 : isFullscreen ? 200 : 180; // Larger for fullscreen
    const bubbleHeight = isMobile ? 60 : isFullscreen ? 80 : 70; // Taller for fullscreen to fit message
    
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
      fontSize: isMobile ? '14px' : isFullscreen ? '18px' : '16px', // Responsive font sizing
      color: '#FFFFFF', // Pure white for maximum visibility
      fontFamily: 'Arial Black',
      align: 'center',
      wordWrap: { width: bubbleWidth - 30 }, // Responsive word wrap for different screen sizes
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
  }

}
