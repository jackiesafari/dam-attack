import * as Phaser from 'phaser';

export interface InteractiveConfig {
  hitAreaPadding: number;
  visualFeedback: boolean;
  hapticFeedback: boolean;
  preventEventBubbling: boolean;
  debugHitArea: boolean;
}

export interface InteractiveCallbacks {
  onPointerDown?: (pointer: Phaser.Input.Pointer, element: InteractiveElement) => void;
  onPointerUp?: (pointer: Phaser.Input.Pointer, element: InteractiveElement) => void;
  onPointerOver?: (pointer: Phaser.Input.Pointer, element: InteractiveElement) => void;
  onPointerOut?: (pointer: Phaser.Input.Pointer, element: InteractiveElement) => void;
  onPointerMove?: (pointer: Phaser.Input.Pointer, element: InteractiveElement) => void;
}

export class InteractiveElement {
  private gameObject: Phaser.GameObjects.GameObject;
  private scene: Phaser.Scene;
  private config: InteractiveConfig;
  private callbacks: InteractiveCallbacks = {};
  
  private originalHitArea?: Phaser.Geom.Rectangle | Phaser.Geom.Circle;
  private enhancedHitArea?: Phaser.Geom.Rectangle | Phaser.Geom.Circle;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  
  private isPressed: boolean = false;
  private isHovered: boolean = false;
  private originalScale: { x: number; y: number } = { x: 1, y: 1 };
  private originalAlpha: number = 1;

  constructor(
    gameObject: Phaser.GameObjects.GameObject,
    config?: Partial<InteractiveConfig>
  ) {
    this.gameObject = gameObject;
    this.scene = gameObject.scene;
    
    // Default configuration
    this.config = {
      hitAreaPadding: 15,
      visualFeedback: true,
      hapticFeedback: true,
      preventEventBubbling: true,
      debugHitArea: false,
      ...config
    };
    
    this.setupInteractivity();
  }

  private setupInteractivity(): void {
    // Store original properties for feedback effects
    if ('scaleX' in this.gameObject && 'scaleY' in this.gameObject) {
      this.originalScale = {
        x: (this.gameObject as any).scaleX,
        y: (this.gameObject as any).scaleY
      };
    }
    
    if ('alpha' in this.gameObject) {
      this.originalAlpha = (this.gameObject as any).alpha;
    }
    
    // Create enhanced hit area
    this.createEnhancedHitArea();
    
    // Set up event listeners
    this.gameObject.on('pointerdown', this.handlePointerDown.bind(this));
    this.gameObject.on('pointerup', this.handlePointerUp.bind(this));
    this.gameObject.on('pointerover', this.handlePointerOver.bind(this));
    this.gameObject.on('pointerout', this.handlePointerOut.bind(this));
    this.gameObject.on('pointermove', this.handlePointerMove.bind(this));
    
    // Handle pointer events outside the game object
    this.gameObject.on('pointerupoutside', this.handlePointerUp.bind(this));
  }

  private createEnhancedHitArea(): void {
    // Get the bounds of the game object
    let bounds: Phaser.Geom.Rectangle;
    
    if ('getBounds' in this.gameObject) {
      bounds = (this.gameObject as any).getBounds();
    } else if ('width' in this.gameObject && 'height' in this.gameObject) {
      const obj = this.gameObject as any;
      bounds = new Phaser.Geom.Rectangle(
        obj.x - obj.width * obj.originX,
        obj.y - obj.height * obj.originY,
        obj.width,
        obj.height
      );
    } else {
      // Fallback to a default size
      bounds = new Phaser.Geom.Rectangle(-25, -25, 50, 50);
    }
    
    // Create enhanced hit area with padding
    const padding = this.config.hitAreaPadding;
    this.enhancedHitArea = new Phaser.Geom.Rectangle(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
    
    // Apply the enhanced hit area
    this.gameObject.setInteractive(this.enhancedHitArea, Phaser.Geom.Rectangle.Contains);
    
    // Create debug visualization if enabled
    if (this.config.debugHitArea) {
      this.createDebugVisualization();
    }
  }

  private createDebugVisualization(): void {
    if (!this.enhancedHitArea) return;
    
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(10000); // Ensure it's on top
    
    // Draw the enhanced hit area
    this.debugGraphics.lineStyle(2, 0xFF0000, 0.8);
    if (this.enhancedHitArea instanceof Phaser.Geom.Rectangle) {
      this.debugGraphics.strokeRectShape(this.enhancedHitArea);
    } else if (this.enhancedHitArea instanceof Phaser.Geom.Circle) {
      this.debugGraphics.strokeCircleShape(this.enhancedHitArea);
    }
    
    // Draw the original bounds
    this.debugGraphics.lineStyle(1, 0x00FF00, 0.6);
    if ('getBounds' in this.gameObject) {
      const bounds = (this.gameObject as any).getBounds();
      this.debugGraphics.strokeRectShape(bounds);
    }
    
    // Auto-remove debug graphics after 5 seconds
    this.scene.time.delayedCall(5000, () => {
      if (this.debugGraphics) {
        this.debugGraphics.destroy();
        this.debugGraphics = undefined;
      }
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.config.preventEventBubbling) {
      pointer.event.stopPropagation();
    }
    
    this.isPressed = true;
    
    // Visual feedback
    if (this.config.visualFeedback) {
      this.applyPressedState();
    }
    
    // Haptic feedback
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (error) {
        // Haptic feedback not supported
      }
    }
    
    // Trigger callback
    if (this.callbacks.onPointerDown) {
      this.callbacks.onPointerDown(pointer, this);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.config.preventEventBubbling) {
      pointer.event.stopPropagation();
    }
    
    const wasPressed = this.isPressed;
    this.isPressed = false;
    
    // Reset visual state
    if (this.config.visualFeedback) {
      this.resetVisualState();
    }
    
    // Trigger callback
    if (this.callbacks.onPointerUp && wasPressed) {
      this.callbacks.onPointerUp(pointer, this);
    }
  }

  private handlePointerOver(pointer: Phaser.Input.Pointer): void {
    this.isHovered = true;
    
    // Visual feedback for hover
    if (this.config.visualFeedback && !this.isPressed) {
      this.applyHoverState();
    }
    
    // Trigger callback
    if (this.callbacks.onPointerOver) {
      this.callbacks.onPointerOver(pointer, this);
    }
  }

  private handlePointerOut(pointer: Phaser.Input.Pointer): void {
    this.isHovered = false;
    
    // Reset visual state if not pressed
    if (this.config.visualFeedback && !this.isPressed) {
      this.resetVisualState();
    }
    
    // If was pressed, reset pressed state
    if (this.isPressed) {
      this.isPressed = false;
      if (this.config.visualFeedback) {
        this.resetVisualState();
      }
    }
    
    // Trigger callback
    if (this.callbacks.onPointerOut) {
      this.callbacks.onPointerOut(pointer, this);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    // Trigger callback
    if (this.callbacks.onPointerMove) {
      this.callbacks.onPointerMove(pointer, this);
    }
  }

  private applyPressedState(): void {
    if ('setScale' in this.gameObject) {
      (this.gameObject as any).setScale(
        this.originalScale.x * 0.95,
        this.originalScale.y * 0.95
      );
    }
    
    if ('setAlpha' in this.gameObject) {
      (this.gameObject as any).setAlpha(this.originalAlpha * 0.8);
    }
  }

  private applyHoverState(): void {
    if ('setScale' in this.gameObject) {
      (this.gameObject as any).setScale(
        this.originalScale.x * 1.05,
        this.originalScale.y * 1.05
      );
    }
    
    if ('setAlpha' in this.gameObject) {
      (this.gameObject as any).setAlpha(this.originalAlpha * 1.1);
    }
  }

  private resetVisualState(): void {
    if ('setScale' in this.gameObject) {
      (this.gameObject as any).setScale(this.originalScale.x, this.originalScale.y);
    }
    
    if ('setAlpha' in this.gameObject) {
      (this.gameObject as any).setAlpha(this.originalAlpha);
    }
  }

  // Public API methods
  public setCallbacks(callbacks: InteractiveCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public updateConfig(newConfig: Partial<InteractiveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate hit area if padding changed
    if (newConfig.hitAreaPadding !== undefined) {
      this.createEnhancedHitArea();
    }
    
    // Update debug visualization
    if (newConfig.debugHitArea !== undefined) {
      if (this.debugGraphics) {
        this.debugGraphics.destroy();
        this.debugGraphics = undefined;
      }
      
      if (this.config.debugHitArea) {
        this.createDebugVisualization();
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (enabled) {
      this.gameObject.setInteractive(this.enhancedHitArea, Phaser.Geom.Rectangle.Contains);
    } else {
      this.gameObject.disableInteractive();
      this.resetVisualState();
      this.isPressed = false;
      this.isHovered = false;
    }
  }

  public getGameObject(): Phaser.GameObjects.GameObject {
    return this.gameObject;
  }

  public isCurrentlyPressed(): boolean {
    return this.isPressed;
  }

  public isCurrentlyHovered(): boolean {
    return this.isHovered;
  }

  public getHitArea(): Phaser.Geom.Rectangle | Phaser.Geom.Circle | undefined {
    return this.enhancedHitArea;
  }

  public destroy(): void {
    // Clean up debug graphics
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
    
    // Remove event listeners
    this.gameObject.off('pointerdown', this.handlePointerDown);
    this.gameObject.off('pointerup', this.handlePointerUp);
    this.gameObject.off('pointerover', this.handlePointerOver);
    this.gameObject.off('pointerout', this.handlePointerOut);
    this.gameObject.off('pointermove', this.handlePointerMove);
    this.gameObject.off('pointerupoutside', this.handlePointerUp);
    
    // Disable interactivity
    this.gameObject.disableInteractive();
    
    // Clear callbacks
    this.callbacks = {};
  }
}