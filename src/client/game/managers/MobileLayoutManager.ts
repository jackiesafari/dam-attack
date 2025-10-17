import * as Phaser from 'phaser';

export interface LayoutConfig {
  gameBoard: { x: number; y: number; width: number; height: number };
  leftControls: { x: number; y: number; width: number };
  rightControls: { x: number; y: number; width: number };
  header: { x: number; y: number; width: number; height: number };
  scorePanel: { x: number; y: number; width: number; height: number };
  beaverArea: { x: number; y: number; width: number; height: number };
  nextPieceArea: { x: number; y: number; width: number; height: number };
  gameInfo: { x: number; y: number; width: number; height: number };
}

export interface MobileLayoutOptions {
  controlWidth: number;
  headerHeight: number;
  padding: number;
  minGameBoardWidth: number;
  minGameBoardHeight: number;
  beaverAreaHeight: number;
}

export class MobileLayoutManager {
  private scene: Phaser.Scene;
  private currentLayout: LayoutConfig | null = null;
  private options: MobileLayoutOptions;

  constructor(scene: Phaser.Scene, options?: Partial<MobileLayoutOptions>) {
    this.scene = scene;
    
    // Default layout options optimized for mobile-first design
    this.options = {
      controlWidth: 100,
      headerHeight: 80,
      padding: 20,
      minGameBoardWidth: 250,
      minGameBoardHeight: 400,
      beaverAreaHeight: 80,
      ...options
    };
  }

  /**
   * Calculate optimal layout for mobile-first design
   * Maximizes game board while ensuring controls are accessible
   */
  public calculateOptimalLayout(screenWidth: number, screenHeight: number): LayoutConfig {
    const { controlWidth, headerHeight, padding, minGameBoardWidth, minGameBoardHeight, beaverAreaHeight } = this.options;
    const isMobile = this.isMobileSize(screenWidth, screenHeight);
    const isPortrait = screenHeight > screenWidth;
    
    let layout: LayoutConfig;
    
    if (isMobile && isPortrait) {
      layout = this.calculateMobilePortraitLayout(screenWidth, screenHeight);
    } else if (isMobile && !isPortrait) {
      layout = this.calculateMobileLandscapeLayout(screenWidth, screenHeight);
    } else {
      layout = this.calculateDesktopLayout(screenWidth, screenHeight);
    }
    
    this.currentLayout = layout;
    return layout;
  }

  /**
   * Calculate layout optimized for mobile portrait orientation
   * Prioritizes game board visibility and thumb-friendly control placement
   */
  private calculateMobilePortraitLayout(screenWidth: number, screenHeight: number): LayoutConfig {
    const { controlWidth, headerHeight, padding } = this.options;
    
    // Mobile portrait: maximize game board, controls on sides
    const availableWidth = screenWidth - (controlWidth * 2) - (padding * 3);
    const availableHeight = screenHeight - headerHeight - (padding * 3);
    
    // Game board takes center space, optimized for mobile viewing
    const boardWidth = Math.min(availableWidth, screenWidth * 0.6);
    const boardHeight = Math.min(availableHeight * 0.75, boardWidth * 2); // Maintain aspect ratio
    const boardX = screenWidth / 2;
    const boardY = headerHeight + padding + (boardHeight / 2);
    
    // Controls positioned for thumb reach
    const leftControlsX = controlWidth / 2 + padding;
    const rightControlsX = screenWidth - (controlWidth / 2) - padding;
    const controlsY = boardY + (boardHeight / 4); // Lower for better thumb access
    
    // Header compact for mobile
    const headerX = screenWidth / 2;
    const headerY = headerHeight / 2;
    
    // Score panel positioned above game board on mobile
    const scorePanelWidth = Math.min(120, screenWidth * 0.25);
    const scorePanelHeight = 80;
    const scorePanelX = screenWidth - scorePanelWidth / 2 - padding;
    const scorePanelY = headerHeight + scorePanelHeight / 2 + padding / 2;
    
    // Next piece area on left side, above controls
    const nextPieceWidth = controlWidth * 0.8;
    const nextPieceHeight = 60;
    const nextPieceX = leftControlsX;
    const nextPieceY = controlsY - 120;
    
    // Game info (level, lines) positioned efficiently
    const gameInfoWidth = scorePanelWidth;
    const gameInfoHeight = 60;
    const gameInfoX = scorePanelX;
    const gameInfoY = scorePanelY + scorePanelHeight / 2 + gameInfoHeight / 2 + padding / 2;
    
    // Beaver area in left control column, optimally positioned
    const beaverX = leftControlsX;
    const beaverY = controlsY - 60;
    const beaverWidth = controlWidth;
    
    return {
      gameBoard: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
      leftControls: { x: leftControlsX, y: controlsY, width: controlWidth },
      rightControls: { x: rightControlsX, y: controlsY, width: controlWidth },
      header: { x: headerX, y: headerY, width: screenWidth, height: headerHeight },
      scorePanel: { x: scorePanelX, y: scorePanelY, width: scorePanelWidth, height: scorePanelHeight },
      beaverArea: { x: beaverX, y: beaverY, width: beaverWidth, height: this.options.beaverAreaHeight },
      nextPieceArea: { x: nextPieceX, y: nextPieceY, width: nextPieceWidth, height: nextPieceHeight },
      gameInfo: { x: gameInfoX, y: gameInfoY, width: gameInfoWidth, height: gameInfoHeight }
    };
  }

  /**
   * Calculate layout optimized for mobile landscape orientation
   * Adapts to wider screen while maintaining mobile-friendly controls
   */
  private calculateMobileLandscapeLayout(screenWidth: number, screenHeight: number): LayoutConfig {
    const { controlWidth, headerHeight, padding } = this.options;
    
    // Mobile landscape: wider layout, controls still accessible
    const availableWidth = screenWidth - (controlWidth * 2) - (padding * 3);
    const availableHeight = screenHeight - headerHeight - (padding * 2);
    
    // Game board optimized for landscape viewing
    const boardWidth = Math.min(availableWidth, availableHeight * 0.5);
    const boardHeight = Math.min(availableHeight, boardWidth * 2);
    const boardX = screenWidth / 2;
    const boardY = headerHeight + (availableHeight / 2) + padding;
    
    // Controls positioned for landscape thumb reach
    const leftControlsX = controlWidth / 2 + padding;
    const rightControlsX = screenWidth - (controlWidth / 2) - padding;
    const controlsY = boardY;
    
    // Header spans full width
    const headerX = screenWidth / 2;
    const headerY = headerHeight / 2;
    
    // Score panel in upper right, larger for landscape
    const scorePanelWidth = 140;
    const scorePanelHeight = 90;
    const scorePanelX = screenWidth - scorePanelWidth / 2 - padding;
    const scorePanelY = headerHeight + scorePanelHeight / 2 + padding;
    
    // Next piece area positioned efficiently for landscape
    const nextPieceWidth = controlWidth;
    const nextPieceHeight = 70;
    const nextPieceX = leftControlsX;
    const nextPieceY = controlsY - 100;
    
    // Game info positioned below score panel
    const gameInfoWidth = scorePanelWidth;
    const gameInfoHeight = 70;
    const gameInfoX = scorePanelX;
    const gameInfoY = scorePanelY + scorePanelHeight / 2 + gameInfoHeight / 2 + padding;
    
    // Beaver area in left control column
    const beaverX = leftControlsX;
    const beaverY = controlsY - 50;
    const beaverWidth = controlWidth;
    
    return {
      gameBoard: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
      leftControls: { x: leftControlsX, y: controlsY, width: controlWidth },
      rightControls: { x: rightControlsX, y: controlsY, width: controlWidth },
      header: { x: headerX, y: headerY, width: screenWidth, height: headerHeight },
      scorePanel: { x: scorePanelX, y: scorePanelY, width: scorePanelWidth, height: scorePanelHeight },
      beaverArea: { x: beaverX, y: beaverY, width: beaverWidth, height: this.options.beaverAreaHeight },
      nextPieceArea: { x: nextPieceX, y: nextPieceY, width: nextPieceWidth, height: nextPieceHeight },
      gameInfo: { x: gameInfoX, y: gameInfoY, width: gameInfoWidth, height: gameInfoHeight }
    };
  }

  /**
   * Calculate layout optimized for desktop/tablet
   * Provides more space for all elements while maintaining good proportions
   */
  private calculateDesktopLayout(screenWidth: number, screenHeight: number): LayoutConfig {
    const { controlWidth, headerHeight, padding } = this.options;
    
    // Desktop: more generous spacing and larger elements
    const availableWidth = screenWidth - (controlWidth * 2) - (padding * 3);
    const availableHeight = screenHeight - headerHeight - (padding * 2);
    
    // Game board can be larger on desktop
    const boardWidth = Math.min(availableWidth, 300);
    const boardHeight = Math.min(availableHeight, 600);
    const boardX = screenWidth / 2;
    const boardY = headerHeight + (boardHeight / 2) + padding;
    
    // Controls positioned with more space
    const leftControlsX = controlWidth / 2 + padding;
    const rightControlsX = screenWidth - (controlWidth / 2) - padding;
    const controlsY = boardY;
    
    // Header with full styling
    const headerX = screenWidth / 2;
    const headerY = headerHeight / 2;
    
    // Score panel with desktop sizing
    const scorePanelWidth = 160;
    const scorePanelHeight = 120;
    const scorePanelX = screenWidth - scorePanelWidth / 2 - padding;
    const scorePanelY = headerHeight + scorePanelHeight / 2 + padding;
    
    // Next piece area with desktop proportions
    const nextPieceWidth = controlWidth * 1.2;
    const nextPieceHeight = 100;
    const nextPieceX = leftControlsX;
    const nextPieceY = controlsY - 140;
    
    // Game info with desktop spacing
    const gameInfoWidth = scorePanelWidth;
    const gameInfoHeight = 100;
    const gameInfoX = scorePanelX;
    const gameInfoY = scorePanelY + scorePanelHeight / 2 + gameInfoHeight / 2 + padding;
    
    // Beaver area with desktop proportions
    const beaverX = leftControlsX;
    const beaverY = controlsY - 80;
    const beaverWidth = controlWidth;
    
    return {
      gameBoard: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
      leftControls: { x: leftControlsX, y: controlsY, width: controlWidth },
      rightControls: { x: rightControlsX, y: controlsY, width: controlWidth },
      header: { x: headerX, y: headerY, width: screenWidth, height: headerHeight },
      scorePanel: { x: scorePanelX, y: scorePanelY, width: scorePanelWidth, height: scorePanelHeight },
      beaverArea: { x: beaverX, y: beaverY, width: beaverWidth, height: this.options.beaverAreaHeight },
      nextPieceArea: { x: nextPieceX, y: nextPieceY, width: nextPieceWidth, height: nextPieceHeight },
      gameInfo: { x: gameInfoX, y: gameInfoY, width: gameInfoWidth, height: gameInfoHeight }
    };
  }

  /**
   * Apply calculated layout to game elements
   */
  public applyLayout(layout: LayoutConfig, gameElements: {
    gameBoard?: Phaser.GameObjects.Container;
    mobileControls?: Phaser.GameObjects.Container;
    header?: Phaser.GameObjects.Container;
    scorePanel?: Phaser.GameObjects.Container;
    beaverDisplay?: Phaser.GameObjects.Container;
    nextPieceArea?: Phaser.GameObjects.Container;
    gameInfo?: Phaser.GameObjects.Container;
  }): void {
    // Position game board
    if (gameElements.gameBoard) {
      this.positionGameBoard(gameElements.gameBoard, layout.gameBoard);
    }
    
    // Position mobile controls (handled by MobileControlsUI)
    if (gameElements.mobileControls) {
      this.positionMobileControls(gameElements.mobileControls, layout);
    }
    
    // Position header
    if (gameElements.header) {
      this.positionHeader(gameElements.header, layout.header);
    }
    
    // Position score panel
    if (gameElements.scorePanel) {
      this.positionScorePanel(gameElements.scorePanel, layout.scorePanel);
    }
    
    // Position beaver display
    if (gameElements.beaverDisplay) {
      this.positionBeaverDisplay(gameElements.beaverDisplay, layout.beaverArea);
    }
    
    // Position next piece area
    if (gameElements.nextPieceArea) {
      this.positionNextPieceArea(gameElements.nextPieceArea, layout.nextPieceArea);
    }
    
    // Position game info
    if (gameElements.gameInfo) {
      this.positionGameInfo(gameElements.gameInfo, layout.gameInfo);
    }
  }

  private positionGameBoard(gameBoard: Phaser.GameObjects.Container, config: LayoutConfig['gameBoard']): void {
    gameBoard.setPosition(config.x, config.y);
    
    // Scale game board to fit available space while maintaining aspect ratio
    const scaleX = config.width / gameBoard.getBounds().width;
    const scaleY = config.height / gameBoard.getBounds().height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
    
    gameBoard.setScale(scale);
  }

  private positionMobileControls(mobileControls: Phaser.GameObjects.Container, layout: LayoutConfig): void {
    // Mobile controls positioning is handled by MobileControlsUI
    // This method can be used for additional positioning logic if needed
  }

  private positionHeader(header: Phaser.GameObjects.Container, config: LayoutConfig['header']): void {
    header.setPosition(config.x, config.y);
  }

  private positionScorePanel(scorePanel: Phaser.GameObjects.Container, config: LayoutConfig['scorePanel']): void {
    scorePanel.setPosition(config.x, config.y);
  }

  private positionBeaverDisplay(beaverDisplay: Phaser.GameObjects.Container, config: LayoutConfig['beaverArea']): void {
    beaverDisplay.setPosition(config.x, config.y);
  }

  private positionNextPieceArea(nextPieceArea: Phaser.GameObjects.Container, config: LayoutConfig['nextPieceArea']): void {
    nextPieceArea.setPosition(config.x, config.y);
  }

  private positionGameInfo(gameInfo: Phaser.GameObjects.Container, config: LayoutConfig['gameInfo']): void {
    gameInfo.setPosition(config.x, config.y);
  }

  /**
   * Get current layout configuration
   */
  public getCurrentLayout(): LayoutConfig | null {
    return this.currentLayout;
  }

  /**
   * Check if current screen size is mobile
   */
  public isMobileSize(width: number, height: number): boolean {
    return width < 768 || height < 600 || this.isTouchDevice();
  }

  /**
   * Check if device supports touch (mobile/tablet indicator)
   */
  public isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Check if current orientation is portrait
   */
  public isPortraitOrientation(width: number, height: number): boolean {
    return height > width;
  }

  /**
   * Get device type based on screen dimensions and capabilities
   */
  public getDeviceType(width: number, height: number): 'mobile' | 'tablet' | 'desktop' {
    if (this.isTouchDevice()) {
      if (Math.min(width, height) < 600) {
        return 'mobile';
      } else {
        return 'tablet';
      }
    }
    return 'desktop';
  }

  /**
   * Get recommended control layout based on screen size
   */
  public getRecommendedControlLayout(width: number, height: number): 'horizontal' | 'gamepad' | 'enhanced' {
    if (this.isMobileSize(width, height)) {
      return 'enhanced'; // Use enhanced layout for mobile
    } else if (width < 1024) {
      return 'gamepad'; // Use gamepad layout for tablets
    } else {
      return 'horizontal'; // Use horizontal layout for desktop
    }
  }

  /**
   * Update layout options
   */
  public updateOptions(newOptions: Partial<MobileLayoutOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Handle screen resize with debouncing
   */
  public handleResize(width: number, height: number, gameElements: any): void {
    const newLayout = this.calculateOptimalLayout(width, height);
    this.applyLayout(newLayout, gameElements);
  }
}