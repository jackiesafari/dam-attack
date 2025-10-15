import * as Phaser from 'phaser';

export interface LayoutBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface LayoutConfig {
  gameBoard: {
    x: number;
    y: number;
    width: number;
    height: number;
    blockSize: number;
  };
  ui: {
    headerHeight: number;
    sidebarWidth: number;
    bottomMargin: number;
    padding: number;
  };
  controls: {
    buttonSize: number;
    buttonSpacing: number;
    bottomOffset: number;
  };
  text: {
    titleSize: string;
    bodySize: string;
    smallSize: string;
  };
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export class ResponsiveLayoutManager {
  private scene: Phaser.Scene;
  private currentLayout: LayoutConfig;
  private deviceType: DeviceType;
  private orientation: Orientation;
  private breakpoints: LayoutBreakpoints;
  private listeners: Map<string, (layout: LayoutConfig) => void> = new Map();

  constructor(scene: Phaser.Scene, breakpoints?: Partial<LayoutBreakpoints>) {
    this.scene = scene;
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
      ...breakpoints
    };

    this.deviceType = this.detectDeviceType();
    this.orientation = this.detectOrientation();
    this.currentLayout = this.calculateLayout();

    this.setupEventListeners();
  }

  /**
   * Detect device type based on screen width
   */
  private detectDeviceType(): DeviceType {
    const width = this.scene.scale.width;
    
    if (width < this.breakpoints.mobile) {
      return 'mobile';
    } else if (width < this.breakpoints.tablet) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Detect screen orientation
   */
  private detectOrientation(): Orientation {
    return this.scene.scale.width > this.scene.scale.height ? 'landscape' : 'portrait';
  }

  /**
   * Calculate layout configuration based on current screen size
   */
  private calculateLayout(): LayoutConfig {
    const { width, height } = this.scene.scale;
    const isPortrait = this.orientation === 'portrait';
    const isMobile = this.deviceType === 'mobile';
    
    // Base configuration
    let config: LayoutConfig;

    if (isMobile) {
      config = this.getMobileLayout(width, height, isPortrait);
    } else if (this.deviceType === 'tablet') {
      config = this.getTabletLayout(width, height, isPortrait);
    } else {
      config = this.getDesktopLayout(width, height);
    }

    return config;
  }

  /**
   * Get mobile layout configuration
   */
  private getMobileLayout(width: number, height: number, isPortrait: boolean): LayoutConfig {
    const padding = 10;
    const headerHeight = isPortrait ? 80 : 60;
    const controlsHeight = 80;
    const bottomMargin = controlsHeight + 10;

    // Calculate game board size
    const availableWidth = width - (padding * 2);
    const availableHeight = height - headerHeight - bottomMargin - (padding * 2);
    
    // Standard Tetris board is 10x20, but we need to fit the screen
    const boardAspectRatio = 10 / 20;
    let boardWidth, boardHeight, blockSize;

    if (isPortrait) {
      // Portrait: fit width, calculate height
      boardWidth = availableWidth;
      boardHeight = boardWidth / boardAspectRatio;
      
      // If too tall, fit height instead
      if (boardHeight > availableHeight) {
        boardHeight = availableHeight;
        boardWidth = boardHeight * boardAspectRatio;
      }
    } else {
      // Landscape: fit height, calculate width
      boardHeight = availableHeight;
      boardWidth = boardHeight * boardAspectRatio;
      
      // If too wide, fit width instead
      if (boardWidth > availableWidth * 0.7) { // Leave space for UI
        boardWidth = availableWidth * 0.7;
        boardHeight = boardWidth / boardAspectRatio;
      }
    }

    blockSize = Math.floor(boardWidth / 10); // 10 blocks wide
    boardWidth = blockSize * 10; // Ensure exact fit
    boardHeight = blockSize * 20; // 20 blocks tall

    return {
      gameBoard: {
        x: width / 2,
        y: headerHeight + (availableHeight - boardHeight) / 2 + boardHeight / 2,
        width: boardWidth,
        height: boardHeight,
        blockSize: blockSize
      },
      ui: {
        headerHeight: headerHeight,
        sidebarWidth: 0, // No sidebar on mobile
        bottomMargin: bottomMargin,
        padding: padding
      },
      controls: {
        buttonSize: isPortrait ? 60 : 50,
        buttonSpacing: 8,
        bottomOffset: 10
      },
      text: {
        titleSize: isPortrait ? '24px' : '20px',
        bodySize: '16px',
        smallSize: '12px'
      }
    };
  }

  /**
   * Get tablet layout configuration
   */
  private getTabletLayout(width: number, height: number, isPortrait: boolean): LayoutConfig {
    const padding = 20;
    const headerHeight = 100;
    const sidebarWidth = isPortrait ? 0 : 200;
    const controlsHeight = isPortrait ? 80 : 0; // No mobile controls in landscape
    const bottomMargin = controlsHeight + 20;

    // Calculate game board size
    const availableWidth = width - sidebarWidth - (padding * 2);
    const availableHeight = height - headerHeight - bottomMargin - (padding * 2);
    
    const boardAspectRatio = 10 / 20;
    let boardWidth = Math.min(availableWidth * 0.8, availableHeight * boardAspectRatio);
    let boardHeight = boardWidth / boardAspectRatio;
    
    // Ensure it fits
    if (boardHeight > availableHeight) {
      boardHeight = availableHeight;
      boardWidth = boardHeight * boardAspectRatio;
    }

    const blockSize = Math.floor(boardWidth / 10);
    boardWidth = blockSize * 10;
    boardHeight = blockSize * 20;

    return {
      gameBoard: {
        x: sidebarWidth + (availableWidth - boardWidth) / 2 + boardWidth / 2,
        y: headerHeight + (availableHeight - boardHeight) / 2 + boardHeight / 2,
        width: boardWidth,
        height: boardHeight,
        blockSize: blockSize
      },
      ui: {
        headerHeight: headerHeight,
        sidebarWidth: sidebarWidth,
        bottomMargin: bottomMargin,
        padding: padding
      },
      controls: {
        buttonSize: isPortrait ? 65 : 0,
        buttonSpacing: 10,
        bottomOffset: 15
      },
      text: {
        titleSize: '28px',
        bodySize: '18px',
        smallSize: '14px'
      }
    };
  }

  /**
   * Get desktop layout configuration
   */
  private getDesktopLayout(width: number, height: number): LayoutConfig {
    const padding = 30;
    const headerHeight = 120;
    const sidebarWidth = 250;
    const bottomMargin = 30;

    // Calculate game board size
    const availableWidth = width - sidebarWidth - (padding * 2);
    const availableHeight = height - headerHeight - bottomMargin - (padding * 2);
    
    // Optimal block size for desktop
    const optimalBlockSize = 32;
    const boardWidth = optimalBlockSize * 10;
    const boardHeight = optimalBlockSize * 20;

    // Center the board in available space
    const boardX = sidebarWidth + (availableWidth - boardWidth) / 2 + boardWidth / 2;
    const boardY = headerHeight + (availableHeight - boardHeight) / 2 + boardHeight / 2;

    return {
      gameBoard: {
        x: boardX,
        y: boardY,
        width: boardWidth,
        height: boardHeight,
        blockSize: optimalBlockSize
      },
      ui: {
        headerHeight: headerHeight,
        sidebarWidth: sidebarWidth,
        bottomMargin: bottomMargin,
        padding: padding
      },
      controls: {
        buttonSize: 0, // No mobile controls on desktop
        buttonSpacing: 0,
        bottomOffset: 0
      },
      text: {
        titleSize: '32px',
        bodySize: '20px',
        smallSize: '16px'
      }
    };
  }

  /**
   * Setup event listeners for resize and orientation change
   */
  private setupEventListeners(): void {
    // Listen for scale manager resize events
    this.scene.scale.on('resize', this.handleResize, this);
    
    // Listen for orientation change (mobile/tablet)
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', this.handleOrientationChange.bind(this));
    }
    
    // Fallback for older browsers
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
  }

  /**
   * Handle Phaser scale resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.updateLayout(width, height);
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    // Small delay to ensure dimensions are updated
    setTimeout(() => {
      this.updateLayout(this.scene.scale.width, this.scene.scale.height);
    }, 100);
  }

  /**
   * Handle window resize (fallback)
   */
  private handleWindowResize(): void {
    // Debounce resize events
    clearTimeout((this as any).resizeTimeout);
    (this as any).resizeTimeout = setTimeout(() => {
      this.updateLayout(this.scene.scale.width, this.scene.scale.height);
    }, 250);
  }

  /**
   * Update layout when screen size changes
   */
  private updateLayout(width: number, height: number): void {
    const oldDeviceType = this.deviceType;
    const oldOrientation = this.orientation;

    this.deviceType = this.detectDeviceType();
    this.orientation = this.detectOrientation();

    // Only recalculate if device type or orientation changed significantly
    const deviceChanged = oldDeviceType !== this.deviceType;
    const orientationChanged = oldOrientation !== this.orientation;
    const significantResize = Math.abs(width - this.currentLayout.gameBoard.width) > 50;

    if (deviceChanged || orientationChanged || significantResize) {
      this.currentLayout = this.calculateLayout();
      this.notifyLayoutChange();
    }
  }

  /**
   * Notify all listeners of layout change
   */
  private notifyLayoutChange(): void {
    this.listeners.forEach(callback => {
      callback(this.currentLayout);
    });
  }

  /**
   * Add layout change listener
   */
  public addLayoutListener(id: string, callback: (layout: LayoutConfig) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove layout change listener
   */
  public removeLayoutListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Get current layout configuration
   */
  public getCurrentLayout(): LayoutConfig {
    return { ...this.currentLayout };
  }

  /**
   * Get current device type
   */
  public getDeviceType(): DeviceType {
    return this.deviceType;
  }

  /**
   * Get current orientation
   */
  public getOrientation(): Orientation {
    return this.orientation;
  }

  /**
   * Check if device is mobile
   */
  public isMobile(): boolean {
    return this.deviceType === 'mobile';
  }

  /**
   * Check if device is tablet
   */
  public isTablet(): boolean {
    return this.deviceType === 'tablet';
  }

  /**
   * Check if device is desktop
   */
  public isDesktop(): boolean {
    return this.deviceType === 'desktop';
  }

  /**
   * Check if orientation is portrait
   */
  public isPortrait(): boolean {
    return this.orientation === 'portrait';
  }

  /**
   * Check if orientation is landscape
   */
  public isLandscape(): boolean {
    return this.orientation === 'landscape';
  }

  /**
   * Get safe area insets (for devices with notches, etc.)
   */
  public getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number; } {
    // Try to get CSS environment variables for safe area
    const getEnvValue = (variable: string): number => {
      if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding', `env(${variable})`)) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(`env(${variable})`);
        return parseInt(value) || 0;
      }
      return 0;
    };

    return {
      top: getEnvValue('safe-area-inset-top'),
      right: getEnvValue('safe-area-inset-right'),
      bottom: getEnvValue('safe-area-inset-bottom'),
      left: getEnvValue('safe-area-inset-left')
    };
  }

  /**
   * Apply layout to HTML elements
   */
  public applyToHTMLElement(element: HTMLElement): void {
    const layout = this.currentLayout;
    
    element.style.setProperty('--game-board-width', `${layout.gameBoard.width}px`);
    element.style.setProperty('--game-board-height', `${layout.gameBoard.height}px`);
    element.style.setProperty('--block-size', `${layout.gameBoard.blockSize}px`);
    element.style.setProperty('--header-height', `${layout.ui.headerHeight}px`);
    element.style.setProperty('--sidebar-width', `${layout.ui.sidebarWidth}px`);
    element.style.setProperty('--padding', `${layout.ui.padding}px`);
    element.style.setProperty('--button-size', `${layout.controls.buttonSize}px`);
    element.style.setProperty('--title-size', layout.text.titleSize);
    element.style.setProperty('--body-size', layout.text.bodySize);
    element.style.setProperty('--small-size', layout.text.smallSize);
    
    // Add device type classes
    element.classList.remove('mobile', 'tablet', 'desktop', 'portrait', 'landscape');
    element.classList.add(this.deviceType, this.orientation);
  }

  /**
   * Get optimal font size for current device
   */
  public getFontSize(type: 'title' | 'body' | 'small'): string {
    return this.currentLayout.text[`${type}Size`];
  }

  /**
   * Get touch target size (minimum 44px for accessibility)
   */
  public getTouchTargetSize(): number {
    const baseSize = this.currentLayout.controls.buttonSize;
    return Math.max(baseSize, 44); // Ensure minimum touch target size
  }

  /**
   * Force layout recalculation
   */
  public recalculateLayout(): void {
    this.currentLayout = this.calculateLayout();
    this.notifyLayoutChange();
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.scene.scale.off('resize', this.handleResize, this);
    
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.removeEventListener('change', this.handleOrientationChange.bind(this));
    }
    
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.removeEventListener('resize', this.handleWindowResize.bind(this));
    
    this.listeners.clear();
  }
}