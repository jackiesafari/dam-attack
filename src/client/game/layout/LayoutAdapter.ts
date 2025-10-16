import * as Phaser from 'phaser';
import { ResponsiveLayoutManager, LayoutConfig } from './ResponsiveLayoutManager';
import { ThemeManager } from '../themes/ThemeManager';
import { PieceRenderer } from '../rendering/PieceRenderer';
import { BoardRenderer } from '../rendering/BoardRenderer';
import { EffectsManager } from '../effects/EffectsManager';
import { UIManager } from '../managers/UIManager';

export interface AdaptedComponents {
  pieceRenderer: PieceRenderer;
  boardRenderer: BoardRenderer;
  effectsManager: EffectsManager;
  uiManager: UIManager;
}

export class LayoutAdapter {
  private scene: Phaser.Scene;
  private layoutManager: ResponsiveLayoutManager;
  private themeManager: ThemeManager;
  private components: AdaptedComponents;
  private gameContainer: Phaser.GameObjects.Container;
  private uiContainer: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    layoutManager: ResponsiveLayoutManager,
    themeManager: ThemeManager,
    components: AdaptedComponents
  ) {
    this.scene = scene;
    this.layoutManager = layoutManager;
    this.themeManager = themeManager;
    this.components = components;

    this.initializeContainers();
    this.setupLayoutListener();
    this.applyInitialLayout();
  }

  /**
   * Initialize main containers
   */
  private initializeContainers(): void {
    // Main game container
    this.gameContainer = this.scene.add.container(0, 0);
    this.gameContainer.setName('game-container');

    // UI container (separate from game for different scaling)
    this.uiContainer = this.scene.add.container(0, 0);
    this.uiContainer.setName('ui-container');

    // Set proper depths
    this.gameContainer.setDepth(100);
    this.uiContainer.setDepth(200);
  }

  /**
   * Setup layout change listener
   */
  private setupLayoutListener(): void {
    this.layoutManager.addLayoutListener('layout-adapter', (layout: LayoutConfig) => {
      this.adaptToLayout(layout);
    });
  }

  /**
   * Apply initial layout
   */
  private applyInitialLayout(): void {
    const layout = this.layoutManager.getCurrentLayout();
    this.adaptToLayout(layout);
  }

  /**
   * Adapt all components to new layout
   */
  private adaptToLayout(layout: LayoutConfig): void {
    console.log('Adapting to new layout:', layout);

    // Update game board position and size
    this.adaptGameBoard(layout);

    // Update piece renderer configuration
    this.adaptPieceRenderer(layout);

    // Update board renderer configuration
    this.adaptBoardRenderer(layout);

    // Update effects manager
    this.adaptEffectsManager(layout);

    // Update UI manager
    this.adaptUIManager(layout);

    // Update theme manager for responsive elements
    this.adaptThemeManager(layout);

    // Apply layout to HTML elements
    this.applyHTMLLayout(layout);

    // Emit layout change event for other systems
    this.scene.events.emit('layout-changed', layout);
  }

  /**
   * Adapt game board positioning
   */
  private adaptGameBoard(layout: LayoutConfig): void {
    // Position the main game container
    this.gameContainer.setPosition(
      layout.gameBoard.x - layout.gameBoard.width / 2,
      layout.gameBoard.y - layout.gameBoard.height / 2
    );

    // Add board renderer to game container if not already added
    const boardContainer = this.components.boardRenderer.getContainer();
    if (!this.gameContainer.list.includes(boardContainer)) {
      this.gameContainer.add(boardContainer);
    }

    // Add effects container to game container
    const effectsContainer = this.components.effectsManager.getContainer();
    if (!this.gameContainer.list.includes(effectsContainer)) {
      this.gameContainer.add(effectsContainer);
    }
  }

  /**
   * Adapt piece renderer to layout
   */
  private adaptPieceRenderer(layout: LayoutConfig): void {
    this.components.pieceRenderer.updateConfig({
      blockSize: layout.gameBoard.blockSize,
      showShadows: !this.layoutManager.isMobile(), // Disable shadows on mobile for performance
      animationSpeed: this.layoutManager.isMobile() ? 0.8 : 1.0, // Slightly faster animations on mobile
      enableParticles: !this.layoutManager.isMobile() || this.layoutManager.isLandscape() // Reduce particles on mobile portrait
    });
  }

  /**
   * Adapt board renderer to layout
   */
  private adaptBoardRenderer(layout: LayoutConfig): void {
    this.components.boardRenderer.updateConfig({
      width: 10, // Standard Tetris width
      height: 20, // Standard Tetris height
      blockSize: layout.gameBoard.blockSize,
      showGrid: !this.layoutManager.isMobile() || layout.gameBoard.blockSize > 24, // Hide grid on small mobile screens
      showWaterBackground: this.themeManager.getCurrentTheme().name === 'retro-dam' && !this.layoutManager.isMobile(),
      enableAnimations: true
    });
  }

  /**
   * Adapt effects manager to layout
   */
  private adaptEffectsManager(layout: LayoutConfig): void {
    // Position effects container to match game board
    const effectsContainer = this.components.effectsManager.getContainer();
    effectsContainer.setPosition(0, 0); // Relative to game container

    // Start ambient effects if appropriate
    if (this.themeManager.getCurrentTheme().name === 'retro-dam' && this.layoutManager.isDesktop()) {
      this.components.effectsManager.createAmbientWaterEffects(
        10, // board width
        20, // board height
        layout.gameBoard.blockSize
      );
    }
  }

  /**
   * Adapt UI manager to layout
   */
  private adaptUIManager(layout: LayoutConfig): void {
    this.components.uiManager.updateConfig({
      width: this.scene.scale.width,
      height: this.scene.scale.height,
      isMobile: this.layoutManager.isMobile()
    });
  }

  /**
   * Adapt theme manager for responsive elements
   */
  private adaptThemeManager(layout: LayoutConfig): void {
    // Apply theme to canvas with current layout
    const canvas = this.scene.game.canvas;
    if (canvas) {
      this.themeManager.applyCanvasTheme(canvas);
    }
  }

  /**
   * Apply layout to HTML elements
   */
  private applyHTMLLayout(layout: LayoutConfig): void {
    // Apply to document body or game container
    const gameElement = document.getElementById('game-container') || document.body;
    this.layoutManager.applyToHTMLElement(gameElement);

    // Update CSS custom properties for responsive design
    const root = document.documentElement;
    root.style.setProperty('--current-device', this.layoutManager.getDeviceType());
    root.style.setProperty('--current-orientation', this.layoutManager.getOrientation());
    root.style.setProperty('--is-mobile', this.layoutManager.isMobile() ? '1' : '0');
    root.style.setProperty('--is-portrait', this.layoutManager.isPortrait() ? '1' : '0');

    // Safe area insets for devices with notches
    const safeArea = this.layoutManager.getSafeAreaInsets();
    root.style.setProperty('--safe-area-top', `${safeArea.top}px`);
    root.style.setProperty('--safe-area-right', `${safeArea.right}px`);
    root.style.setProperty('--safe-area-bottom', `${safeArea.bottom}px`);
    root.style.setProperty('--safe-area-left', `${safeArea.left}px`);
  }

  /**
   * Create responsive UI elements
   */
  public createResponsiveUI(): void {
    const layout = this.layoutManager.getCurrentLayout();
    
    // Create header UI
    this.createHeaderUI(layout);
    
    // Create sidebar UI (tablet/desktop)
    if (layout.ui.sidebarWidth > 0) {
      this.createSidebarUI(layout);
    }
    
    // Create mobile controls (mobile/tablet portrait)
    if (layout.controls.buttonSize > 0) {
      this.createMobileControlsUI(layout);
    }
  }

  /**
   * Create header UI elements
   */
  private createHeaderUI(layout: LayoutConfig): void {
    const headerContainer = this.scene.add.container(0, 0);
    headerContainer.setName('header-ui');

    // Background
    const headerBg = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    headerBg.fillStyle(this.themeManager.hexToNumber(theme.colors.surface));
    headerBg.fillRect(0, 0, this.scene.scale.width, layout.ui.headerHeight);
    headerContainer.add(headerBg);

    // Title
    const title = this.scene.add.text(
      this.scene.scale.width / 2,
      layout.ui.headerHeight / 2,
      'DAM ATTACK',
      {
        fontFamily: theme.fonts.display,
        fontSize: layout.text.titleSize,
        color: theme.colors.neon.cyan,
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);
    headerContainer.add(title);

    // Add to UI container
    this.uiContainer.add(headerContainer);
  }

  /**
   * Create sidebar UI elements
   */
  private createSidebarUI(layout: LayoutConfig): void {
    const sidebarContainer = this.scene.add.container(0, layout.ui.headerHeight);
    sidebarContainer.setName('sidebar-ui');

    // Background
    const sidebarBg = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    sidebarBg.fillStyle(this.themeManager.hexToNumber(theme.colors.background));
    sidebarBg.fillRect(0, 0, layout.ui.sidebarWidth, this.scene.scale.height - layout.ui.headerHeight);
    sidebarContainer.add(sidebarBg);

    // Score display
    const scoreText = this.scene.add.text(
      layout.ui.sidebarWidth / 2,
      50,
      'Score: 0',
      {
        fontFamily: theme.fonts.primary,
        fontSize: layout.text.bodySize,
        color: theme.colors.text
      }
    ).setOrigin(0.5);
    sidebarContainer.add(scoreText);

    // Level display
    const levelText = this.scene.add.text(
      layout.ui.sidebarWidth / 2,
      90,
      'Level: 1',
      {
        fontFamily: theme.fonts.primary,
        fontSize: layout.text.bodySize,
        color: theme.colors.text
      }
    ).setOrigin(0.5);
    sidebarContainer.add(levelText);

    // Lines display
    const linesText = this.scene.add.text(
      layout.ui.sidebarWidth / 2,
      130,
      'Lines: 0',
      {
        fontFamily: theme.fonts.primary,
        fontSize: layout.text.bodySize,
        color: theme.colors.text
      }
    ).setOrigin(0.5);
    sidebarContainer.add(linesText);

    // Add to UI container
    this.uiContainer.add(sidebarContainer);
  }

  /**
   * Create mobile controls UI - positioned on sides to avoid blocking game area
   */
  private createMobileControlsUI(layout: LayoutConfig): void {
    const controlsContainer = this.scene.add.container(0, 0);
    controlsContainer.setName('mobile-controls');

    const buttonSize = layout.controls.buttonSize;
    const spacing = layout.controls.buttonSpacing;
    const sideMargin = 20; // Distance from screen edge
    
    // Position controls in lower half to avoid blocking game area
    const controlsY = this.scene.scale.height - 200;

    // Left side controls (movement)
    const leftButtons = [
      { key: 'left', symbol: '←', x: sideMargin, y: controlsY },
      { key: 'down', symbol: '⬇', x: sideMargin, y: controlsY + buttonSize + spacing }
    ];

    // Right side controls (rotation and drop)
    const rightButtons = [
      { key: 'right', symbol: '→', x: this.scene.scale.width - sideMargin - buttonSize, y: controlsY },
      { key: 'rotate', symbol: '🔄', x: this.scene.scale.width - sideMargin - buttonSize, y: controlsY + buttonSize + spacing },
      { key: 'drop', symbol: '⚡', x: this.scene.scale.width - sideMargin - buttonSize, y: controlsY + (buttonSize + spacing) * 2 }
    ];

    const allButtons = [...leftButtons, ...rightButtons];

    allButtons.forEach(btn => {
      const button = this.components.uiManager.createButton({
        text: btn.symbol,
        x: btn.x + buttonSize / 2,
        y: btn.y,
        width: buttonSize,
        height: buttonSize,
        onClick: () => {
          this.scene.events.emit('mobile-input', btn.key);
        }
      });
      controlsContainer.add(button);
    });

    // Add to UI container
    this.uiContainer.add(controlsContainer);
  }

  /**
   * Get game container for external access
   */
  public getGameContainer(): Phaser.GameObjects.Container {
    return this.gameContainer;
  }

  /**
   * Get UI container for external access
   */
  public getUIContainer(): Phaser.GameObjects.Container {
    return this.uiContainer;
  }

  /**
   * Get current layout configuration
   */
  public getCurrentLayout(): LayoutConfig {
    return this.layoutManager.getCurrentLayout();
  }

  /**
   * Force layout recalculation
   */
  public recalculateLayout(): void {
    this.layoutManager.recalculateLayout();
  }

  /**
   * Update specific UI element positions
   */
  public updateUIElement(name: string, position: { x?: number; y?: number; }): void {
    const element = this.uiContainer.getByName(name);
    if (element && element instanceof Phaser.GameObjects.Container) {
      if (position.x !== undefined) element.x = position.x;
      if (position.y !== undefined) element.y = position.y;
    }
  }

  /**
   * Show/hide UI elements based on device type
   */
  public toggleUIElements(): void {
    const isMobile = this.layoutManager.isMobile();
    
    // Hide/show sidebar
    const sidebar = this.uiContainer.getByName('sidebar-ui');
    if (sidebar) {
      sidebar.setVisible(!isMobile);
    }
    
    // Hide/show mobile controls
    const mobileControls = this.uiContainer.getByName('mobile-controls');
    if (mobileControls) {
      mobileControls.setVisible(isMobile || this.layoutManager.isTablet() && this.layoutManager.isPortrait());
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.layoutManager.removeLayoutListener('layout-adapter');
    this.gameContainer.destroy();
    this.uiContainer.destroy();
  }
}