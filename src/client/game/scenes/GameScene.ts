import { Scene } from 'phaser';
import * as Phaser from 'phaser';

// Import all our new systems
import { GameStateManager, GameState } from '../managers/GameStateManager';
import { PieceManager } from '../managers/PieceManager';
import { BoardManager } from '../managers/BoardManager';
import { InputManager } from '../managers/InputManager';
import { UIManager } from '../managers/UIManager';
import { ScoreManager } from '../managers/ScoreManager';

import { ThemeManager } from '../themes/ThemeManager';
import { PieceRenderer } from '../rendering/PieceRenderer';
import { BoardRenderer } from '../rendering/BoardRenderer';
import { EffectsManager } from '../effects/EffectsManager';
import { ResponsiveLayoutManager } from '../layout/ResponsiveLayoutManager';
import { LayoutAdapter } from '../layout/LayoutAdapter';

import { GameOverUI } from '../ui/GameOverUI';
import { LeaderboardUI } from '../ui/LeaderboardUI';

import { GamePiece } from '../types/GameTypes';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { ErrorHandler } from '../utils/ErrorHandler';

// Game constants
const BOARD_WIDTH = 14;
const BOARD_HEIGHT = 20;
const INITIAL_DROP_TIME = 1000;
const LEVEL_SPEED_INCREASE = 100;

export class GameScene extends Scene {
  // Core game managers
  private gameStateManager!: GameStateManager;
  private pieceManager!: PieceManager;
  private boardManager!: BoardManager;
  private inputManager!: InputManager;
  private scoreManager!: ScoreManager;

  // Visual systems
  private themeManager!: ThemeManager;
  private pieceRenderer!: PieceRenderer;
  private boardRenderer!: BoardRenderer;
  private effectsManager!: EffectsManager;
  
  // Layout and UI
  private layoutManager!: ResponsiveLayoutManager;
  private layoutAdapter!: LayoutAdapter;
  private uiManager!: UIManager;
  private gameOverUI!: GameOverUI;
  private leaderboardUI!: LeaderboardUI;

  // Performance and error handling
  private performanceMonitor!: PerformanceMonitor;
  private errorHandler!: ErrorHandler;

  // Game state
  private isGameActive: boolean = false;
  private isPaused: boolean = false;
  private gameLoopTimer?: Phaser.Time.TimerEvent;

  // UI elements
  private scoreDisplay?: Phaser.GameObjects.Text;
  private levelDisplay?: Phaser.GameObjects.Text;
  private linesDisplay?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Initialize the game scene
   */
  public init(): void {
    try {
      this.initializeErrorHandling();
      this.initializePerformanceMonitoring();
      this.initializeManagers();
      this.initializeVisualSystems();
      this.initializeLayoutSystem();
      this.initializeUI();
      this.setupEventListeners();
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.init');
    }
  }

  /**
   * Create the game scene
   */
  public create(): void {
    try {
      this.performanceMonitor.startFrame('scene-create');
      
      // Apply initial theme
      this.themeManager.setTheme('retro-dam');
      
      // Create responsive layout
      this.layoutAdapter.createResponsiveUI();
      
      // Initialize game state
      this.resetGame();
      
      // Start the game
      this.startGame();
      
      this.performanceMonitor.endFrame('scene-create');
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.create');
    }
  }

  /**
   * Update game loop
   */
  public override update(time: number, delta: number): void {
    try {
      this.performanceMonitor.startFrame('game-update');
      
      if (!this.isGameActive || this.isPaused) {
        this.performanceMonitor.endFrame('game-update');
        return;
      }

      // Update input (if method exists)
      if (this.inputManager && typeof this.inputManager.update === 'function') {
        this.inputManager.update(delta);
      }
      
      // Update game logic
      this.updateGameLogic(time, delta);
      
      // Update performance monitoring
      this.performanceMonitor.update(delta);
      
      this.performanceMonitor.endFrame('game-update');
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.update');
    }
  }

  /**
   * Initialize error handling system
   */
  private initializeErrorHandling(): void {
    this.errorHandler = new ErrorHandler(this);
    
    // Set up global error handlers
    this.errorHandler.setupGlobalHandlers();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    this.performanceMonitor = new PerformanceMonitor(this);
    this.performanceMonitor.startMonitoring();
  }

  /**
   * Initialize core game managers
   */
  private initializeManagers(): void {
    this.gameStateManager = new GameStateManager(BOARD_WIDTH, BOARD_HEIGHT);
    this.pieceManager = new PieceManager();
    this.boardManager = new BoardManager(BOARD_WIDTH, BOARD_HEIGHT);
    this.scoreManager = new ScoreManager();
    
    // Set up state change listener
    this.gameStateManager.addStateListener(this.onGameStateChange.bind(this));
  }

  /**
   * Initialize visual systems
   */
  private initializeVisualSystems(): void {
    this.themeManager = new ThemeManager(this);
    this.pieceRenderer = new PieceRenderer(this, this.themeManager);
    this.boardRenderer = new BoardRenderer(this, this.themeManager, {
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      blockSize: 32, // Will be updated by layout system
      showGrid: true,
      showWaterBackground: true,
      enableAnimations: true
    });
    this.effectsManager = new EffectsManager(this, this.themeManager);
  }

  /**
   * Initialize layout system
   */
  private initializeLayoutSystem(): void {
    this.layoutManager = new ResponsiveLayoutManager(this);
    this.uiManager = new UIManager(this, {
      width: this.scale.width,
      height: this.scale.height,
      isMobile: this.layoutManager.isMobile()
    });

    this.layoutAdapter = new LayoutAdapter(this, this.layoutManager, this.themeManager, {
      pieceRenderer: this.pieceRenderer,
      boardRenderer: this.boardRenderer,
      effectsManager: this.effectsManager,
      uiManager: this.uiManager
    });
  }

  /**
   * Initialize UI systems
   */
  private initializeUI(): void {
    this.gameOverUI = new GameOverUI(this, this.uiManager);
    this.leaderboardUI = new LeaderboardUI(this, this.uiManager, this.scoreManager);
    
    // Initialize input manager after UI is set up
    this.inputManager = new InputManager(this);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Input events (if methods exist)
    if (this.inputManager && typeof this.inputManager.on === 'function') {
      this.inputManager.on('move-left', () => this.movePiece(-1, 0));
      this.inputManager.on('move-right', () => this.movePiece(1, 0));
      this.inputManager.on('move-down', () => this.movePiece(0, 1));
      this.inputManager.on('rotate', () => this.rotatePiece());
      this.inputManager.on('hard-drop', () => this.hardDrop());
      this.inputManager.on('pause', () => this.togglePause());
    }

    // Mobile input events
    this.events.on('mobile-input', (action: string) => {
      this.handleMobileInput(action);
    });

    // Layout change events
    this.events.on('layout-changed', () => {
      this.handleLayoutChange();
    });

    // Theme change events
    this.events.on('theme-changed', () => {
      this.handleThemeChange();
    });

    // Performance events
    this.performanceMonitor.on('performance-warning', (data: any) => {
      console.warn('Performance warning:', data);
    });

    // Error events
    this.errorHandler.on('critical-error', (error: Error) => {
      this.handleCriticalError(error);
    });
  }

  /**
   * Handle game state changes
   */
  private onGameStateChange(state: Readonly<GameState>): void {
    try {
      // Update UI displays
      this.updateScoreDisplay(state.score);
      this.updateLevelDisplay(state.level);
      this.updateLinesDisplay(state.lines);

      // Update board renderer
      this.boardRenderer.updateBoard(state.board);

      // Check for line clears (check if property exists)
      if ((state as any).linesCleared && (state as any).linesCleared.length > 0) {
        this.handleLineClears((state as any).linesCleared, (state as any).linesCleared.length === 4);
      }

      // Check for level up (check if property exists)
      if ((state as any).levelChanged) {
        this.handleLevelUp(state.level);
      }

      // Check for game over
      if (state.isGameOver && this.isGameActive) {
        this.handleGameOver(state);
      }

      // Render current piece
      if (state.currentPiece) {
        this.renderCurrentPiece(state.currentPiece);
      }

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.onGameStateChange');
    }
  }

  /**
   * Update game logic
   */
  private updateGameLogic(time: number, delta: number): void {
    const state = this.gameStateManager.getState();
    
    // Auto-drop pieces based on level
    if (time - state.lastDrop > state.dropTime) {
      if (!this.movePiece(0, 1)) {
        // Piece couldn't move down, place it
        this.placePiece();
      }
    }
  }

  /**
   * Move current piece
   */
  private movePiece(dx: number, dy: number): boolean {
    try {
      const state = this.gameStateManager.getState();
      if (!state.currentPiece || !this.isGameActive) return false;

      const movedPiece = this.pieceManager.movePiece(state.currentPiece, dx, dy);
      
      if (!this.pieceManager.checkCollision(movedPiece, state.board)) {
        this.gameStateManager.updateState({ 
          currentPiece: movedPiece,
          lastDrop: dy > 0 ? this.time.now : state.lastDrop
        });
        
        // Add movement effects
        if (dx !== 0) {
          this.effectsManager.createRotationEffect(
            movedPiece.x * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize,
            movedPiece.y * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize
          );
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.movePiece');
      return false;
    }
  }

  /**
   * Rotate current piece
   */
  private rotatePiece(): boolean {
    try {
      const state = this.gameStateManager.getState();
      if (!state.currentPiece || !this.isGameActive) return false;

      const rotatedPiece = this.pieceManager.rotatePiece(state.currentPiece);
      if (!rotatedPiece) return false;

      if (!this.pieceManager.checkCollision(rotatedPiece, state.board)) {
        this.gameStateManager.updateState({ currentPiece: rotatedPiece });
        
        // Add rotation effects
        this.effectsManager.createRotationEffect(
          rotatedPiece.x * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize,
          rotatedPiece.y * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize
        );
        
        return true;
      }

      // Try wall kick
      const wallKickedPiece = this.pieceManager.tryWallKick(state.currentPiece, state.board, rotatedPiece);
      if (wallKickedPiece) {
        this.gameStateManager.updateState({ currentPiece: wallKickedPiece });
        return true;
      }

      return false;
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.rotatePiece');
      return false;
    }
  }

  /**
   * Hard drop current piece
   */
  private hardDrop(): void {
    try {
      const state = this.gameStateManager.getState();
      if (!state.currentPiece || !this.isGameActive) return;

      const dropY = this.boardManager.findDropPosition(state.currentPiece, state.board);
      const dropDistance = dropY - state.currentPiece.y;
      
      if (dropDistance > 0) {
        const droppedPiece = this.pieceManager.movePiece(state.currentPiece, 0, dropDistance);
        const hardDropScore = this.scoreManager.calculateScore({
          linesCleared: 0,
          level: state.level,
          hardDropDistance: dropDistance
        });

        this.gameStateManager.updateState({
          currentPiece: droppedPiece,
          score: state.score + hardDropScore
        });

        // Place the piece immediately
        this.placePiece();
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.hardDrop');
    }
  }

  /**
   * Place current piece on the board
   */
  private placePiece(): void {
    try {
      const state = this.gameStateManager.getState();
      if (!state.currentPiece) return;

      // Add piece to board
      const newBoard = this.boardManager.addPieceToBoard(state.currentPiece, state.board);
      
      // Clear completed lines
      const lineClearResult = this.boardManager.clearLines(newBoard);
      
      // Calculate score
      const lineScore = this.scoreManager.calculateScore({
        linesCleared: lineClearResult.clearedLines,
        level: state.level,
        isTetris: lineClearResult.clearedLines === 4
      });

      // Update game state
      const newLines = state.lines + lineClearResult.clearedLines;
      const newLevel = Math.floor(newLines / 10) + 1;
      const newDropTime = Math.max(100, INITIAL_DROP_TIME - (newLevel - 1) * LEVEL_SPEED_INCREASE);

      this.gameStateManager.updateState({
        board: lineClearResult.newBoard,
        currentPiece: null,
        score: state.score + lineScore,
        lines: newLines,
        level: newLevel,
        dropTime: newDropTime,
        // linesCleared: lineClearResult.clearedLines > 0 ? lineClearResult.clearedLineIndices : undefined, // Commented out - not in GameState interface
        levelChanged: newLevel > state.level
      });

      // Add placement effects
      this.effectsManager.createWoodImpactEffect(
        state.currentPiece.x * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize,
        state.currentPiece.y * this.layoutAdapter.getCurrentLayout().gameBoard.blockSize
      );

      // Spawn next piece
      this.spawnNextPiece();

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.placePiece');
    }
  }

  /**
   * Spawn next piece
   */
  private spawnNextPiece(): void {
    try {
      const state = this.gameStateManager.getState();
      const newPiece = this.pieceManager.createRandomPiece();
      
      // Position at top center
      const centeredX = Math.floor(BOARD_WIDTH / 2) - Math.floor(this.pieceManager.getPieceWidth(newPiece) / 2);
      const positionedPiece = this.pieceManager.movePiece(newPiece, centeredX, 0);

      // Check for game over
      if (this.pieceManager.checkCollision(positionedPiece, state.board)) {
        this.gameStateManager.updateState({ 
          isGameOver: true,
          currentPiece: positionedPiece
        });
        return;
      }

      this.gameStateManager.updateState({
        currentPiece: positionedPiece,
        nextPiece: this.pieceManager.createRandomPiece(),
        lastDrop: this.time.now
      });

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.spawnNextPiece');
    }
  }

  /**
   * Render current piece
   */
  private renderCurrentPiece(piece: GamePiece): void {
    try {
      const layout = this.layoutAdapter.getCurrentLayout();
      
      this.pieceRenderer.renderPiece({
        piece,
        x: piece.x * layout.gameBoard.blockSize,
        y: piece.y * layout.gameBoard.blockSize,
        alpha: 1,
        scale: 1,
        rotation: 0
      }, 'current-piece');

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.renderCurrentPiece');
    }
  }

  /**
   * Handle line clears
   */
  private handleLineClears(clearedLines: number[], isTetris: boolean): void {
    try {
      const layout = this.layoutAdapter.getCurrentLayout();
      
      // Create line clear effects
      this.effectsManager.createLineClearEffect(
        clearedLines,
        BOARD_WIDTH,
        layout.gameBoard.blockSize,
        isTetris
      );

      // Animate board line clear
      this.boardRenderer.animateLineClear(clearedLines, () => {
        // Animation complete
      });

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.handleLineClears');
    }
  }

  /**
   * Handle level up
   */
  private handleLevelUp(newLevel: number): void {
    try {
      const layout = this.layoutAdapter.getCurrentLayout();
      
      this.effectsManager.createLevelUpCelebration(
        layout.gameBoard.width / 2,
        layout.gameBoard.height / 2
      );

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.handleLevelUp');
    }
  }

  /**
   * Handle game over
   */
  private handleGameOver(state: GameState): void {
    try {
      this.isGameActive = false;
      
      // Stop game loop
      if (this.gameLoopTimer) {
        this.gameLoopTimer.destroy();
      }

      // Show game over UI
      this.gameOverUI.show({
        score: state.score,
        level: state.level,
        lines: state.lines,
        timestamp: Date.now()
      }, {
        onSubmitScore: async (data) => {
          await this.scoreManager.saveScore({
            username: 'Player', // TODO: Get from user input
            score: data.score,
            timestamp: data.timestamp,
            level: data.level,
            lines: data.lines
          });
        },
        onViewLeaderboard: () => {
          this.showLeaderboard();
        },
        onPlayAgain: () => {
          this.restartGame();
        },
        onClose: () => {
          // Game over UI closed
        }
      });

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.handleGameOver');
    }
  }

  /**
   * Handle mobile input
   */
  private handleMobileInput(action: string): void {
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

  /**
   * Handle layout changes
   */
  private handleLayoutChange(): void {
    try {
      // Update UI positions
      this.updateUIPositions();
      
      // Refresh rendering systems
      this.pieceRenderer.updateConfig({
        blockSize: this.layoutAdapter.getCurrentLayout().gameBoard.blockSize
      });

    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.handleLayoutChange');
    }
  }

  /**
   * Handle theme changes
   */
  private handleThemeChange(): void {
    try {
      // Refresh all visual elements
      this.boardRenderer.updateConfig({});
      
    } catch (error) {
      this.errorHandler.handleError(error as Error, 'GameScene.handleThemeChange');
    }
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(error: Error): void {
    console.error('Critical error in game scene:', error);
    
    // Try to save game state
    try {
      const state = this.gameStateManager.getState();
      localStorage.setItem('game-crash-state', JSON.stringify(state));
    } catch (saveError) {
      console.error('Failed to save crash state:', saveError);
    }
    
    // Show error message to user
    this.uiManager.showToast('A critical error occurred. The game will restart.', 5000);
    
    // Restart scene after delay
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }

  /**
   * Update UI displays
   */
  private updateScoreDisplay(score: number): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.setText(`Score: ${score.toLocaleString()}`);
    }
  }

  private updateLevelDisplay(level: number): void {
    if (this.levelDisplay) {
      this.levelDisplay.setText(`Level: ${level}`);
    }
  }

  private updateLinesDisplay(lines: number): void {
    if (this.linesDisplay) {
      this.linesDisplay.setText(`Lines: ${lines}`);
    }
  }

  /**
   * Update UI positions after layout change
   */
  private updateUIPositions(): void {
    // UI positions are handled by the layout adapter
    this.layoutAdapter.toggleUIElements();
  }

  /**
   * Show leaderboard
   */
  private showLeaderboard(): void {
    this.leaderboardUI.show({}, {
      onClose: () => {
        // Leaderboard closed
      },
      onRefresh: async () => {
        // Refresh leaderboard data
      }
    });
  }

  /**
   * Toggle pause state
   */
  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.uiManager.showToast('Game Paused', 1000);
    }
  }

  /**
   * Start the game
   */
  private startGame(): void {
    this.isGameActive = true;
    this.isPaused = false;
    this.spawnNextPiece();
  }

  /**
   * Reset game to initial state
   */
  private resetGame(): void {
    this.gameStateManager.resetState();
    this.isGameActive = false;
    this.isPaused = false;
    
    if (this.gameLoopTimer) {
      this.gameLoopTimer.destroy();
    }
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    this.resetGame();
    this.startGame();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    try {
      // Stop monitoring
      this.performanceMonitor?.stopMonitoring();
      
      // Clean up managers
      this.inputManager?.destroy();
      this.effectsManager?.destroy();
      this.pieceRenderer?.destroy();
      this.boardRenderer?.destroy();
      this.layoutAdapter?.destroy();
      this.layoutManager?.destroy();
      this.themeManager?.destroy();
      this.uiManager?.destroy();
      this.gameOverUI?.destroy();
      this.leaderboardUI?.destroy();
      
      // Clean up timers
      if (this.gameLoopTimer) {
        this.gameLoopTimer.destroy();
      }
      
      // super.destroy(); // Not available in Phaser Scene
    } catch (error) {
      console.error('Error during scene cleanup:', error);
    }
  }
}