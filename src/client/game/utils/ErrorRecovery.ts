import * as Phaser from 'phaser';
import { ValidationUtils } from './ValidationUtils';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error, context: string) => boolean;
  recover: (scene: Phaser.Scene, error: Error, context: string) => Promise<boolean>;
  priority: number; // Higher number = higher priority
}

export interface RecoveryResult {
  success: boolean;
  strategy?: string;
  message: string;
  fallbackRequired: boolean;
}

export class ErrorRecovery {
  private scene: Phaser.Scene;
  private strategies: RecoveryStrategy[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private maxRecoveryAttempts: number = 3;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeStrategies();
  }

  /**
   * Initialize recovery strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      this.createGameStateRecoveryStrategy(),
      this.createRenderingRecoveryStrategy(),
      this.createInputRecoveryStrategy(),
      this.createMemoryRecoveryStrategy(),
      this.createUIRecoveryStrategy(),
      this.createGenericRecoveryStrategy()
    ].sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
  }

  /**
   * Attempt to recover from an error
   */
  public async attemptRecovery(error: Error, context: string): Promise<RecoveryResult> {
    const errorKey = `${error.message}-${context}`;
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    // Check if we've exceeded max attempts
    if (attempts >= this.maxRecoveryAttempts) {
      return {
        success: false,
        message: `Max recovery attempts (${this.maxRecoveryAttempts}) exceeded for error: ${error.message}`,
        fallbackRequired: true
      };
    }

    // Increment attempt count
    this.recoveryAttempts.set(errorKey, attempts + 1);

    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error, context)) {
        try {
          console.log(`🔧 Attempting recovery with strategy: ${strategy.name}`);
          
          const success = await strategy.recover(this.scene, error, context);
          
          if (success) {
            // Reset attempt count on successful recovery
            this.recoveryAttempts.delete(errorKey);
            
            return {
              success: true,
              strategy: strategy.name,
              message: `Successfully recovered using ${strategy.name}`,
              fallbackRequired: false
            };
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        }
      }
    }

    return {
      success: false,
      message: `No recovery strategy could handle error: ${error.message}`,
      fallbackRequired: attempts >= this.maxRecoveryAttempts - 1
    };
  }

  /**
   * Game state recovery strategy
   */
  private createGameStateRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'GameStateRecovery',
      priority: 10,
      canRecover: (error: Error, context: string) => {
        return context.toLowerCase().includes('gamestate') ||
               context.toLowerCase().includes('piece') ||
               context.toLowerCase().includes('board') ||
               error.message.includes('state');
      },
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          // Try to get game state manager
          const gameStateManager = (scene as any).gameStateManager;
          if (!gameStateManager) return false;

          // Get current state and validate it
          const currentState = gameStateManager.getState();
          const validation = ValidationUtils.validateGameState(currentState);

          if (!validation.isValid) {
            console.log('🔧 Game state is corrupted, attempting to fix...');
            
            // Try to fix the state
            const fixedState = this.fixGameState(currentState);
            const fixedValidation = ValidationUtils.validateGameState(fixedState);
            
            if (fixedValidation.isValid) {
              // Reset to fixed state
              gameStateManager.resetState();
              gameStateManager.updateState(fixedState);
              console.log('✅ Game state recovered successfully');
              return true;
            } else {
              // Complete reset as last resort
              console.log('🔧 Performing complete game state reset...');
              gameStateManager.resetState();
              return true;
            }
          }

          return true;
        } catch (recoveryError) {
          console.error('Game state recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * Rendering recovery strategy
   */
  private createRenderingRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'RenderingRecovery',
      priority: 8,
      canRecover: (error: Error, context: string) => {
        return context.toLowerCase().includes('render') ||
               context.toLowerCase().includes('graphics') ||
               context.toLowerCase().includes('texture') ||
               error.message.includes('WebGL') ||
               error.message.includes('canvas');
      },
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          console.log('🔧 Attempting rendering recovery...');

          // Clear all graphics objects that might be corrupted
          scene.children.list.forEach(child => {
            if (child instanceof Phaser.GameObjects.Graphics) {
              try {
                child.clear();
              } catch (clearError) {
                // If clearing fails, destroy the object
                child.destroy();
              }
            }
          });

          // Stop all tweens that might be affecting rendering
          scene.tweens.killAll();

          // Reset camera
          scene.cameras.main.setPosition(0, 0);
          scene.cameras.main.setZoom(1);

          // Force garbage collection if available
          if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
          }

          // Try to refresh renderers
          if ((scene as any).pieceRenderer) {
            (scene as any).pieceRenderer.updateConfig({});
          }

          if ((scene as any).boardRenderer) {
            (scene as any).boardRenderer.updateConfig({});
          }

          console.log('✅ Rendering recovery completed');
          return true;
        } catch (recoveryError) {
          console.error('Rendering recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * Input recovery strategy
   */
  private createInputRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'InputRecovery',
      priority: 6,
      canRecover: (error: Error, context: string) => {
        return context.toLowerCase().includes('input') ||
               context.toLowerCase().includes('touch') ||
               context.toLowerCase().includes('keyboard') ||
               error.message.includes('pointer');
      },
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          console.log('🔧 Attempting input recovery...');

          // Reset input manager
          if ((scene as any).inputManager) {
            (scene as any).inputManager.reset();
          }

          // Clear all input events
          scene.input.removeAllListeners();

          // Reset pointer state
          scene.input.activePointer.reset();

          // Re-enable input
          scene.input.enabled = true;

          console.log('✅ Input recovery completed');
          return true;
        } catch (recoveryError) {
          console.error('Input recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * Memory recovery strategy
   */
  private createMemoryRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'MemoryRecovery',
      priority: 7,
      canRecover: (error: Error, context: string) => {
        return error.message.includes('memory') ||
               error.message.includes('heap') ||
               context.toLowerCase().includes('memory');
      },
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          console.log('🔧 Attempting memory recovery...');

          // Stop all effects to free memory
          if ((scene as any).effectsManager) {
            (scene as any).effectsManager.stopAllEffects();
          }

          // Clear object pools
          if ((scene as any).poolManager) {
            (scene as any).poolManager.releaseAll();
            (scene as any).poolManager.cleanupAll();
          }

          // Destroy unused textures
          this.cleanupTextures(scene);

          // Force garbage collection
          if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
          }

          // Reduce quality settings
          if ((scene as any).frameRateOptimizer) {
            (scene as any).frameRateOptimizer.emergencyOptimize();
          }

          console.log('✅ Memory recovery completed');
          return true;
        } catch (recoveryError) {
          console.error('Memory recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * UI recovery strategy
   */
  private createUIRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'UIRecovery',
      priority: 5,
      canRecover: (error: Error, context: string) => {
        return context.toLowerCase().includes('ui') ||
               context.toLowerCase().includes('modal') ||
               context.toLowerCase().includes('button');
      },
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          console.log('🔧 Attempting UI recovery...');

          // Close all modals
          if ((scene as any).uiManager) {
            (scene as any).uiManager.closeAllModals();
          }

          // Reset UI state
          if ((scene as any).gameOverUI) {
            (scene as any).gameOverUI.hide();
          }

          if ((scene as any).leaderboardUI) {
            (scene as any).leaderboardUI.hide();
          }

          // Refresh layout
          if ((scene as any).layoutAdapter) {
            (scene as any).layoutAdapter.recalculateLayout();
          }

          console.log('✅ UI recovery completed');
          return true;
        } catch (recoveryError) {
          console.error('UI recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * Generic recovery strategy (fallback)
   */
  private createGenericRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'GenericRecovery',
      priority: 1,
      canRecover: () => true, // Can handle any error as last resort
      recover: async (scene: Phaser.Scene, error: Error, context: string) => {
        try {
          console.log('🔧 Attempting generic recovery...');

          // Stop all animations and tweens
          scene.tweens.killAll();
          scene.anims.pauseAll();

          // Clear timers
          scene.time.removeAllEvents();

          // Reset scene state
          scene.physics?.world?.resume();

          // Clear any stuck input states
          if (scene.input) {
            scene.input.keyboard?.resetKeys();
          }

          console.log('✅ Generic recovery completed');
          return true;
        } catch (recoveryError) {
          console.error('Generic recovery failed:', recoveryError);
          return false;
        }
      }
    };
  }

  /**
   * Fix corrupted game state
   */
  private fixGameState(state: any): any {
    const fixedState = ValidationUtils.safeClone(state) || {};

    // Fix board
    if (!state.board || !Array.isArray(state.board)) {
      fixedState.board = Array(20).fill(null).map(() => Array(10).fill(0));
    } else {
      // Ensure board has correct dimensions
      fixedState.board = state.board.slice(0, 20);
      for (let y = 0; y < 20; y++) {
        if (!fixedState.board[y] || !Array.isArray(fixedState.board[y])) {
          fixedState.board[y] = Array(10).fill(0);
        } else {
          fixedState.board[y] = fixedState.board[y].slice(0, 10);
          // Pad with zeros if too short
          while (fixedState.board[y].length < 10) {
            fixedState.board[y].push(0);
          }
          // Fix invalid values
          for (let x = 0; x < 10; x++) {
            if (typeof fixedState.board[y][x] !== 'number' || fixedState.board[y][x] < 0) {
              fixedState.board[y][x] = 0;
            }
          }
        }
      }
    }

    // Fix numeric properties
    fixedState.score = ValidationUtils.clampNumber(state.score, 0, 99999999, 0);
    fixedState.level = ValidationUtils.clampNumber(state.level, 1, 100, 1);
    fixedState.lines = ValidationUtils.clampNumber(state.lines, 0, 9999, 0);
    fixedState.dropTime = ValidationUtils.clampNumber(state.dropTime, 100, 2000, 1000);
    fixedState.lastDrop = ValidationUtils.clampNumber(state.lastDrop, 0, Date.now(), 0);

    // Fix boolean properties
    fixedState.isGameOver = Boolean(state.isGameOver);

    // Remove invalid pieces
    if (state.currentPiece && !ValidationUtils.validateGamePiece(state.currentPiece).isValid) {
      fixedState.currentPiece = null;
    }

    if (state.nextPiece && !ValidationUtils.validateGamePiece(state.nextPiece).isValid) {
      fixedState.nextPiece = null;
    }

    return fixedState;
  }

  /**
   * Clean up unused textures
   */
  private cleanupTextures(scene: Phaser.Scene): void {
    const usedTextures = new Set<string>();
    
    // Collect used textures
    scene.children.list.forEach(child => {
      if ('texture' in child && child.texture) {
        usedTextures.add((child.texture as Phaser.Textures.Texture).key);
      }
    });

    // Remove unused textures (be conservative)
    let removedCount = 0;
    scene.textures.list.forEach((texture, key) => {
      if (!usedTextures.has(key) && 
          !key.startsWith('__') && // Don't remove system textures
          key !== 'default' &&
          removedCount < 10) { // Limit removals to prevent issues
        try {
          scene.textures.remove(key);
          removedCount++;
        } catch (removeError) {
          // Ignore removal errors
        }
      }
    });

    if (removedCount > 0) {
      console.log(`🗑️ Cleaned up ${removedCount} unused textures`);
    }
  }

  /**
   * Add custom recovery strategy
   */
  public addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStats(): {
    totalAttempts: number;
    activeAttempts: Map<string, number>;
    strategies: string[];
  } {
    let totalAttempts = 0;
    this.recoveryAttempts.forEach(count => totalAttempts += count);

    return {
      totalAttempts,
      activeAttempts: new Map(this.recoveryAttempts),
      strategies: this.strategies.map(s => s.name)
    };
  }

  /**
   * Reset recovery attempt counters
   */
  public resetRecoveryAttempts(): void {
    this.recoveryAttempts.clear();
  }

  /**
   * Check if error is recoverable
   */
  public isRecoverable(error: Error, context: string): boolean {
    return this.strategies.some(strategy => strategy.canRecover(error, context));
  }
}