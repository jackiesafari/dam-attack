import * as Phaser from 'phaser';
import { MobileLayoutManager, LayoutConfig } from './MobileLayoutManager';
import { MobileGameInfoUI, GameInfoData } from '../ui/MobileGameInfoUI';
import { ResponsiveHeaderUI } from '../ui/ResponsiveHeaderUI';
import { MobileControlsUI } from '../ui/MobileControlsUI';

export interface LayoutSystemConfig {
  enableResponsiveLayout: boolean;
  enableMobileOptimizations: boolean;
  enableNeonStyling: boolean;
  debugMode: boolean;
}

export interface GameElements {
  gameBoard?: Phaser.GameObjects.Container;
  mobileControls?: MobileControlsUI;
  beaverDisplay?: Phaser.GameObjects.Container;
}

export class MobileFirstLayoutSystem {
  private scene: Phaser.Scene;
  private config: LayoutSystemConfig;
  private layoutManager: MobileLayoutManager;
  
  // UI Components
  private gameInfoUI: MobileGameInfoUI;
  private headerUI: ResponsiveHeaderUI;
  private currentLayout: LayoutConfig | null = null;
  
  // Layout containers
  private gameInfoContainer: Phaser.GameObjects.Container;
  private headerContainer: Phaser.GameObjects.Container;
  
  // Screen tracking
  private lastScreenWidth: number = 0;
  private lastScreenHeight: number = 0;
  private resizeDebounceTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<LayoutSystemConfig>) {
    this.scene = scene;
    
    this.config = {
      enableResponsiveLayout: true,
      enableMobileOptimizations: true,
      enableNeonStyling: true,
      debugMode: false,
      ...config
    };
    
    this.layoutManager = new MobileLayoutManager(scene);
    this.initializeUI();
    this.setupResizeHandling();
  }

  private initializeUI(): void {
    // Create responsive header
    this.headerUI = new ResponsiveHeaderUI(this.scene, {
      title: 'DAM ATTACK',
      subtitle: 'Build the beaver\'s dam!',
      neonStyle: this.config.enableNeonStyling
    });
    this.headerContainer = this.headerUI.getContainer();
    
    // Create mobile-optimized game info display
    this.gameInfoUI = new MobileGameInfoUI(this.scene, {
      neonStyle: this.config.enableNeonStyling,
      compact: true
    });
    this.gameInfoContainer = this.gameInfoUI.getContainer();
  }

  private setupResizeHandling(): void {
    // Listen for scale manager resize events
    this.scene.scale.on('resize', this.handleResize, this);
    
    // Initial layout calculation
    this.handleResize(this.scene.scale.gameSize);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    
    // Debounce resize events to prevent excessive recalculation
    if (this.resizeDebounceTimer) {
      this.resizeDebounceTimer.destroy();
    }
    
    this.resizeDebounceTimer = this.scene.time.delayedCall(100, () => {
      this.updateLayout(width, height);
    });
  }

  /**
   * Update layout for new screen dimensions
   */
  public updateLayout(screenWidth: number, screenHeight: number): void {
    if (!this.config.enableResponsiveLayout) return;
    
    // Skip if dimensions haven't changed significantly
    if (Math.abs(screenWidth - this.lastScreenWidth) < 10 && 
        Math.abs(screenHeight - this.lastScreenHeight) < 10) {
      return;
    }
    
    this.lastScreenWidth = screenWidth;
    this.lastScreenHeight = screenHeight;
    
    // Calculate optimal layout
    this.currentLayout = this.layoutManager.calculateOptimalLayout(screenWidth, screenHeight);
    
    // Update UI components for screen size
    this.updateUIForScreenSize(screenWidth, screenHeight);
    
    // Apply layout to positioned elements
    this.applyCurrentLayout();
    
    if (this.config.debugMode) {
      console.log('Layout updated for screen size:', screenWidth, 'x', screenHeight);
      console.log('Device type:', this.layoutManager.getDeviceType(screenWidth, screenHeight));
      console.log('Layout config:', this.currentLayout);
    }
  }

  private updateUIForScreenSize(screenWidth: number, screenHeight: number): void {
    const deviceType = this.layoutManager.getDeviceType(screenWidth, screenHeight);
    const isMobile = deviceType === 'mobile';
    const isPortrait = this.layoutManager.isPortraitOrientation(screenWidth, screenHeight);
    
    // Update header for screen size
    this.headerUI.updateForScreenSize(screenWidth, screenHeight);
    
    // Update game info UI configuration
    const gameInfoConfig = this.getGameInfoConfigForDevice(deviceType, isPortrait);
    this.gameInfoUI.updateConfig(gameInfoConfig);
    
    if (this.config.debugMode) {
      console.log('UI updated for device type:', deviceType, 'portrait:', isPortrait);
    }
  }

  private getGameInfoConfigForDevice(deviceType: string, isPortrait: boolean) {
    switch (deviceType) {
      case 'mobile':
        return {
          width: isPortrait ? 100 : 120,
          height: isPortrait ? 80 : 90,
          fontSize: '12px',
          compact: true
        };
      case 'tablet':
        return {
          width: 140,
          height: 100,
          fontSize: '14px',
          compact: false
        };
      default: // desktop
        return {
          width: 160,
          height: 120,
          fontSize: '16px',
          compact: false
        };
    }
  }

  private applyCurrentLayout(): void {
    if (!this.currentLayout) return;
    
    // Position header
    this.headerContainer.setPosition(
      this.currentLayout.header.x,
      this.currentLayout.header.y
    );
    
    // Position game info
    this.gameInfoContainer.setPosition(
      this.currentLayout.scorePanel.x,
      this.currentLayout.scorePanel.y
    );
  }

  /**
   * Apply layout to external game elements
   */
  public applyLayoutToGameElements(gameElements: GameElements): void {
    if (!this.currentLayout) return;
    
    this.layoutManager.applyLayout(this.currentLayout, {
      gameBoard: gameElements.gameBoard,
      mobileControls: gameElements.mobileControls ? gameElements.mobileControls.getContainer() : undefined,
      beaverDisplay: gameElements.beaverDisplay,
      header: this.headerContainer,
      scorePanel: this.gameInfoContainer
    });
  }

  /**
   * Update game information display
   */
  public updateGameInfo(data: GameInfoData): void {
    this.gameInfoUI.updateGameInfo(data);
  }

  /**
   * Animate score increase
   */
  public animateScoreIncrease(): void {
    this.gameInfoUI.animateScoreIncrease();
  }

  /**
   * Animate level up
   */
  public animateLevelUp(): void {
    this.gameInfoUI.animateLevelUp();
    this.headerUI.playTitleFlash();
  }

  /**
   * Get current layout configuration
   */
  public getCurrentLayout(): LayoutConfig | null {
    return this.currentLayout;
  }

  /**
   * Get device information
   */
  public getDeviceInfo(): {
    type: 'mobile' | 'tablet' | 'desktop';
    isPortrait: boolean;
    isTouchDevice: boolean;
    screenSize: { width: number; height: number };
  } {
    return {
      type: this.layoutManager.getDeviceType(this.lastScreenWidth, this.lastScreenHeight),
      isPortrait: this.layoutManager.isPortraitOrientation(this.lastScreenWidth, this.lastScreenHeight),
      isTouchDevice: this.layoutManager.isTouchDevice(),
      screenSize: { width: this.lastScreenWidth, height: this.lastScreenHeight }
    };
  }

  /**
   * Enable or disable mobile optimizations
   */
  public setMobileOptimizations(enabled: boolean): void {
    this.config.enableMobileOptimizations = enabled;
    
    if (enabled) {
      this.updateLayout(this.lastScreenWidth, this.lastScreenHeight);
    }
  }

  /**
   * Enable or disable neon styling
   */
  public setNeonStyling(enabled: boolean): void {
    this.config.enableNeonStyling = enabled;
    
    // Update UI components
    this.headerUI.updateConfig({ neonStyle: enabled });
    this.gameInfoUI.updateConfig({ neonStyle: enabled });
  }

  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled;
  }

  /**
   * Get recommended control layout for current screen
   */
  public getRecommendedControlLayout(): 'horizontal' | 'gamepad' | 'enhanced' {
    return this.layoutManager.getRecommendedControlLayout(
      this.lastScreenWidth, 
      this.lastScreenHeight
    );
  }

  /**
   * Force layout recalculation
   */
  public forceLayoutUpdate(): void {
    this.updateLayout(this.scene.scale.width, this.scene.scale.height);
  }

  /**
   * Get UI components for external access
   */
  public getUIComponents(): {
    gameInfo: MobileGameInfoUI;
    header: ResponsiveHeaderUI;
    layoutManager: MobileLayoutManager;
  } {
    return {
      gameInfo: this.gameInfoUI,
      header: this.headerUI,
      layoutManager: this.layoutManager
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    // Remove event listeners
    this.scene.scale.off('resize', this.handleResize, this);
    
    // Clean up timers
    if (this.resizeDebounceTimer) {
      this.resizeDebounceTimer.destroy();
    }
    
    // Destroy UI components
    this.gameInfoUI.destroy();
    this.headerUI.destroy();
  }
}