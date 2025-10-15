import * as Phaser from 'phaser';

export interface ErrorReport {
  error: Error;
  context: string;
  timestamp: number;
  gameState?: any;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  maxErrorHistory: number;
  enableRecovery: boolean;
  reportingEndpoint?: string;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class ErrorHandler extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: ErrorHandlerConfig;
  private errorHistory: ErrorReport[] = [];
  private errorCounts: Map<string, number> = new Map();
  private isRecovering: boolean = false;

  constructor(scene: Phaser.Scene, config?: Partial<ErrorHandlerConfig>) {
    super();
    
    this.scene = scene;
    this.config = {
      enableLogging: true,
      enableReporting: false,
      maxErrorHistory: 50,
      enableRecovery: true,
      ...config
    };
  }

  /**
   * Setup global error handlers
   */
  public setupGlobalHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'window.error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'unhandledrejection'
      );
    });

    // Handle Phaser-specific errors
    this.scene.game.events.on('error', (error: Error) => {
      this.handleError(error, 'phaser.error');
    });

    console.log('🛡️ Global error handlers setup complete');
  }

  /**
   * Handle an error with context and recovery
   */
  public handleError(
    error: Error, 
    context: string, 
    additionalData?: any
  ): void {
    try {
      const severity = this.determineSeverity(error, context);
      const errorReport = this.createErrorReport(error, context, additionalData);
      
      // Log the error
      if (this.config.enableLogging) {
        this.logError(errorReport, severity);
      }
      
      // Store in history
      this.addToHistory(errorReport);
      
      // Track error frequency
      this.trackErrorFrequency(error.message);
      
      // Report to external service if configured
      if (this.config.enableReporting && this.config.reportingEndpoint) {
        this.reportError(errorReport);
      }
      
      // Attempt recovery based on severity
      if (this.config.enableRecovery) {
        this.attemptRecovery(error, context, severity);
      }
      
      // Emit error event
      this.emit('error', { error, context, severity, report: errorReport });
      
      // Emit critical error event for severe issues
      if (severity === 'critical') {
        this.emit('critical-error', error);
      }
      
    } catch (handlerError) {
      // Fallback logging if error handler itself fails
      console.error('Error in error handler:', handlerError);
      console.error('Original error:', error);
    }
  }

  /**
   * Create detailed error report
   */
  private createErrorReport(
    error: Error, 
    context: string, 
    additionalData?: any
  ): ErrorReport {
    return {
      error,
      context,
      timestamp: Date.now(),
      gameState: this.captureGameState(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: error.stack,
      ...additionalData
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, context: string): ErrorSeverity {
    const errorMessage = error.message.toLowerCase();
    const errorContext = context.toLowerCase();
    
    // Critical errors that break core functionality
    if (
      errorContext.includes('gamestate') ||
      errorContext.includes('scene.create') ||
      errorContext.includes('scene.init') ||
      errorMessage.includes('cannot read property') ||
      errorMessage.includes('is not a function') ||
      errorMessage.includes('memory')
    ) {
      return 'critical';
    }
    
    // High severity errors that affect gameplay
    if (
      errorContext.includes('piece') ||
      errorContext.includes('board') ||
      errorContext.includes('input') ||
      errorMessage.includes('collision') ||
      errorMessage.includes('render')
    ) {
      return 'high';
    }
    
    // Medium severity errors that affect user experience
    if (
      errorContext.includes('ui') ||
      errorContext.includes('animation') ||
      errorContext.includes('effect') ||
      errorMessage.includes('texture') ||
      errorMessage.includes('audio')
    ) {
      return 'medium';
    }
    
    // Low severity errors (cosmetic issues)
    return 'low';
  }

  /**
   * Log error with appropriate formatting
   */
  private logError(report: ErrorReport, severity: ErrorSeverity): void {
    const emoji = {
      low: '⚠️',
      medium: '🔶',
      high: '🔴',
      critical: '💥'
    }[severity];
    
    const style = {
      low: 'color: orange',
      medium: 'color: #ff6b35',
      high: 'color: red',
      critical: 'color: red; font-weight: bold; background: yellow'
    }[severity];
    
    console.group(`${emoji} ${severity.toUpperCase()} ERROR in ${report.context}`);
    console.log('%c' + report.error.message, style);
    
    if (report.error.stack) {
      console.log('Stack trace:', report.error.stack);
    }
    
    if (report.gameState) {
      console.log('Game state:', report.gameState);
    }
    
    console.log('Timestamp:', new Date(report.timestamp).toISOString());
    console.groupEnd();
  }

  /**
   * Capture current game state for debugging
   */
  private captureGameState(): any {
    try {
      // Try to get game state from various managers
      const gameState: any = {
        scene: this.scene.scene.key,
        isActive: this.scene.scene.isActive(),
        cameras: {
          main: {
            x: this.scene.cameras.main.scrollX,
            y: this.scene.cameras.main.scrollY,
            zoom: this.scene.cameras.main.zoom
          }
        },
        scale: {
          width: this.scene.scale.width,
          height: this.scene.scale.height
        },
        time: this.scene.time.now
      };
      
      // Try to capture additional game-specific state
      if ((this.scene as any).gameStateManager) {
        gameState.gameManager = (this.scene as any).gameStateManager.getState();
      }
      
      if ((this.scene as any).layoutManager) {
        gameState.layout = (this.scene as any).layoutManager.getCurrentLayout();
      }
      
      return gameState;
    } catch (captureError) {
      return { error: 'Failed to capture game state', reason: String(captureError) };
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(report: ErrorReport): void {
    this.errorHistory.push(report);
    
    // Limit history size
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Track error frequency to detect patterns
   */
  private trackErrorFrequency(errorMessage: string): void {
    const count = this.errorCounts.get(errorMessage) || 0;
    this.errorCounts.set(errorMessage, count + 1);
    
    // Warn about frequent errors
    if (count > 5) {
      console.warn(`🔄 Frequent error detected (${count} times):`, errorMessage);
      this.emit('frequent-error', { message: errorMessage, count });
    }
  }

  /**
   * Report error to external service
   */
  private async reportError(report: ErrorReport): Promise<void> {
    if (!this.config.reportingEndpoint) return;
    
    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...report,
          error: {
            message: report.error.message,
            stack: report.error.stack,
            name: report.error.name
          }
        })
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }

  /**
   * Attempt to recover from errors
   */
  private attemptRecovery(
    _error: Error, 
    _context: string, 
    severity: ErrorSeverity
  ): void {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    
    try {
      switch (severity) {
        case 'low':
          // For low severity errors, just log and continue
          break;
          
        case 'medium':
          // For medium errors, try to refresh UI components
          this.recoverUI();
          break;
          
        case 'high':
          // For high errors, try to reset game systems
          this.recoverGameSystems();
          break;
          
        case 'critical':
          // For critical errors, restart the scene
          this.recoverCritical();
          break;
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
    } finally {
      // Reset recovery flag after a delay
      setTimeout(() => {
        this.isRecovering = false;
      }, 1000);
    }
  }

  /**
   * Recover UI components
   */
  private recoverUI(): void {
    try {
      // Try to refresh UI managers
      if ((this.scene as any).uiManager) {
        console.log('🔄 Attempting UI recovery...');
        // UI recovery logic would go here
      }
    } catch (error) {
      console.warn('UI recovery failed:', error);
    }
  }

  /**
   * Recover game systems
   */
  private recoverGameSystems(): void {
    try {
      console.log('🔄 Attempting game systems recovery...');
      
      // Try to reset managers that might be in bad state
      if ((this.scene as any).effectsManager) {
        (this.scene as any).effectsManager.stopAllEffects();
      }
      
      // Clear any stuck animations
      this.scene.tweens.killAll();
      
      // Reset input state
      if ((this.scene as any).inputManager) {
        // Input manager recovery logic
      }
      
    } catch (error) {
      console.warn('Game systems recovery failed:', error);
    }
  }

  /**
   * Recover from critical errors
   */
  private recoverCritical(): void {
    try {
      console.log('🔄 Attempting critical recovery - restarting scene...');
      
      // Save current state before restart
      this.saveRecoveryState();
      
      // Restart the scene after a short delay
      setTimeout(() => {
        this.scene.scene.restart();
      }, 1000);
      
    } catch (error) {
      console.error('Critical recovery failed:', error);
      // Last resort - reload the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  /**
   * Save state for recovery
   */
  private saveRecoveryState(): void {
    try {
      const recoveryData = {
        timestamp: Date.now(),
        gameState: this.captureGameState(),
        errorHistory: this.errorHistory.slice(-5) // Last 5 errors
      };
      
      localStorage.setItem('game-recovery-state', JSON.stringify(recoveryData));
    } catch (error) {
      console.warn('Failed to save recovery state:', error);
    }
  }

  /**
   * Load recovery state
   */
  public loadRecoveryState(): any {
    try {
      const recoveryData = localStorage.getItem('game-recovery-state');
      if (recoveryData) {
        const parsed = JSON.parse(recoveryData);
        
        // Only use recent recovery data (within last 5 minutes)
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load recovery state:', error);
    }
    
    return null;
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByContext: Map<string, number>;
    errorsByMessage: Map<string, number>;
    recentErrors: ErrorReport[];
  } {
    const errorsByContext = new Map<string, number>();
    
    this.errorHistory.forEach(report => {
      const count = errorsByContext.get(report.context) || 0;
      errorsByContext.set(report.context, count + 1);
    });
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByContext,
      errorsByMessage: new Map(this.errorCounts),
      recentErrors: this.errorHistory.slice(-10)
    };
  }

  /**
   * Clear error history
   */
  public clearHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    localStorage.removeItem('game-recovery-state');
  }

  /**
   * Create error reporting UI for debugging
   */
  public createDebugPanel(): Phaser.GameObjects.Container {
    const panel = this.scene.add.container(10, 150);
    panel.setDepth(10001);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, 300, 200);
    bg.lineStyle(2, 0xFF0000);
    bg.strokeRect(0, 0, 300, 200);
    panel.add(bg);
    
    const title = this.scene.add.text(5, 5, 'Error Monitor', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FF0000',
      fontStyle: 'bold'
    });
    panel.add(title);
    
    const errorText = this.scene.add.text(5, 25, '', {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#FFFFFF',
      wordWrap: { width: 290 }
    });
    panel.add(errorText);
    
    // Update panel with recent errors
    const updatePanel = () => {
      const stats = this.getErrorStats();
      const recentErrors = stats.recentErrors.slice(-5);
      
      const text = [
        `Total Errors: ${stats.totalErrors}`,
        `Recent Errors:`,
        ...recentErrors.map(report => 
          `${new Date(report.timestamp).toLocaleTimeString()}: ${report.context} - ${report.error.message.substring(0, 50)}...`
        )
      ].join('\n');
      
      errorText.setText(text);
    };
    
    // Update every 2 seconds
    this.scene.time.addEvent({
      delay: 2000,
      callback: updatePanel,
      loop: true
    });
    
    updatePanel();
    
    return panel;
  }

  /**
   * Clean up resources
   */
  public override destroy(): void {
    this.removeAllListeners();
    this.errorHistory = [];
    this.errorCounts.clear();
  }
}