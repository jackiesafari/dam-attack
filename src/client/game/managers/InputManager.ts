import * as Phaser from 'phaser';

export enum InputAction {
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  ROTATE = 'ROTATE',
  SOFT_DROP = 'SOFT_DROP',
  HARD_DROP = 'HARD_DROP',
  PAUSE = 'PAUSE'
}

export interface InputConfig {
  moveLeft: string[];
  moveRight: string[];
  rotate: string[];
  softDrop: string[];
  hardDrop: string[];
  pause: string[];
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'hold';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  duration: number;
}

export interface InputSettings {
  keyboardEnabled: boolean;
  touchEnabled: boolean;
  gesturesEnabled: boolean;
  hapticFeedback: boolean;
  repeatDelay: number;
  repeatRate: number;
}

export type InputCallback = (action: InputAction, data?: any) => void;

export class InputManager {
  private scene: Phaser.Scene;
  private config: InputConfig;
  private settings: InputSettings;
  private callbacks: Map<InputAction, InputCallback[]> = new Map();
  
  // Keyboard handling
  private keyboardKeys: Map<string, Phaser.Input.Keyboard.Key> = new Map();
  private keyRepeatTimers: Map<string, number> = new Map();
  
  // Touch handling
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private isHolding: boolean = false;
  private holdTimer?: Phaser.Time.TimerEvent;
  
  // Gesture recognition
  private gestureThreshold = {
    swipeDistance: 50,
    holdDuration: 500,
    tapMaxDuration: 200
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Default configuration
    this.config = {
      moveLeft: ['ArrowLeft', 'KeyA'],
      moveRight: ['ArrowRight', 'KeyD'],
      rotate: ['ArrowUp', 'KeyW', 'Space'],
      softDrop: ['ArrowDown', 'KeyS'],
      hardDrop: ['Space'],
      pause: ['KeyP', 'Escape']
    };
    
    // Default settings
    this.settings = {
      keyboardEnabled: true,
      touchEnabled: this.detectMobileDevice(),
      gesturesEnabled: true,
      hapticFeedback: true,
      repeatDelay: 150,
      repeatRate: 50
    };
    
    this.initializeInputCallbacks();
    this.setupKeyboardControls();
    
    if (this.settings.touchEnabled) {
      this.setupTouchControls();
    }
  }

  private initializeInputCallbacks(): void {
    // Initialize callback arrays for each action
    Object.values(InputAction).forEach(action => {
      this.callbacks.set(action, []);
    });
  }

  private detectMobileDevice(): boolean {
    return this.scene.sys.game.device.os.android || 
           this.scene.sys.game.device.os.iOS ||
           'ontouchstart' in window;
  }

  public setupKeyboardControls(): void {
    if (!this.settings.keyboardEnabled || !this.scene.input.keyboard) {
      return;
    }

    // Clear existing keys
    this.keyboardKeys.clear();
    
    // Register all configured keys
    const allKeys = new Set<string>();
    Object.values(this.config).forEach(keys => {
      keys.forEach(key => allKeys.add(key));
    });

    allKeys.forEach(keyCode => {
      const key = this.scene.input.keyboard!.addKey(keyCode);
      this.keyboardKeys.set(keyCode, key);
    });

    // Set up keyboard event handlers
    this.scene.input.keyboard.on('keydown', this.handleKeyDown.bind(this));
    this.scene.input.keyboard.on('keyup', this.handleKeyUp.bind(this));
  }

  public setupTouchControls(): void {
    if (!this.settings.touchEnabled) {
      return;
    }

    // Set up touch event handlers
    this.scene.input.on('pointerdown', this.handleTouchStart.bind(this));
    this.scene.input.on('pointermove', this.handleTouchMove.bind(this));
    this.scene.input.on('pointerup', this.handleTouchEnd.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = this.getActionFromKey(event.code);
    if (!action) return;

    // Prevent default for game keys
    event.preventDefault();
    
    // Handle key repeat
    if (!this.keyRepeatTimers.has(event.code)) {
      // First press
      this.triggerAction(action);
      
      // Set up repeat timer for movement keys
      if (this.isMovementAction(action)) {
        const repeatTimer = this.scene.time.addEvent({
          delay: this.settings.repeatDelay,
          callback: () => {
            this.triggerAction(action);
          },
          repeat: -1
        });
        
        this.keyRepeatTimers.set(event.code, repeatTimer.elapsed);
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Clear repeat timer
    if (this.keyRepeatTimers.has(event.code)) {
      this.keyRepeatTimers.delete(event.code);
    }
  }

  private handleTouchStart(pointer: Phaser.Input.Pointer): void {
    if (!this.settings.touchEnabled) return;

    this.touchStartTime = this.scene.time.now;
    this.touchStartPos = { x: pointer.x, y: pointer.y };
    this.isHolding = false;

    // Set up hold detection
    if (this.settings.gesturesEnabled) {
      this.holdTimer = this.scene.time.delayedCall(
        this.gestureThreshold.holdDuration,
        () => {
          this.isHolding = true;
          this.handleGesture({
            type: 'hold',
            startX: this.touchStartPos.x,
            startY: this.touchStartPos.y,
            duration: this.gestureThreshold.holdDuration
          });
        }
      );
    }

    // Provide haptic feedback
    this.triggerHapticFeedback(10);
  }

  private handleTouchMove(pointer: Phaser.Input.Pointer): void {
    if (!this.settings.touchEnabled || !pointer.isDown) return;

    // Cancel hold detection if moved too much
    const distance = Phaser.Math.Distance.Between(
      this.touchStartPos.x, this.touchStartPos.y,
      pointer.x, pointer.y
    );

    if (distance > 20 && this.holdTimer) {
      this.holdTimer.destroy();
      this.holdTimer = undefined;
    }
  }

  private handleTouchEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.settings.touchEnabled) return;

    const duration = this.scene.time.now - this.touchStartTime;
    const distance = Phaser.Math.Distance.Between(
      this.touchStartPos.x, this.touchStartPos.y,
      pointer.x, pointer.y
    );

    // Clean up hold timer
    if (this.holdTimer) {
      this.holdTimer.destroy();
      this.holdTimer = undefined;
    }

    if (this.isHolding) {
      // Hold gesture already handled
      return;
    }

    if (this.settings.gesturesEnabled) {
      if (duration <= this.gestureThreshold.tapMaxDuration && distance < 20) {
        // Tap gesture
        this.handleGesture({
          type: 'tap',
          startX: this.touchStartPos.x,
          startY: this.touchStartPos.y,
          duration
        });
      } else if (distance >= this.gestureThreshold.swipeDistance) {
        // Swipe gesture
        this.handleGesture({
          type: 'swipe',
          startX: this.touchStartPos.x,
          startY: this.touchStartPos.y,
          endX: pointer.x,
          endY: pointer.y,
          duration
        });
      }
    }
  }

  private handleGesture(gesture: TouchGesture): void {
    switch (gesture.type) {
      case 'tap':
        // Default tap action is rotate
        this.triggerAction(InputAction.ROTATE);
        break;
        
      case 'swipe':
        if (gesture.endX !== undefined && gesture.endY !== undefined) {
          const deltaX = gesture.endX - gesture.startX;
          const deltaY = gesture.endY - gesture.startY;
          
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
              this.triggerAction(InputAction.MOVE_RIGHT);
            } else {
              this.triggerAction(InputAction.MOVE_LEFT);
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              this.triggerAction(InputAction.SOFT_DROP);
            } else {
              this.triggerAction(InputAction.HARD_DROP);
            }
          }
        }
        break;
        
      case 'hold':
        // Hold gesture triggers hard drop
        this.triggerAction(InputAction.HARD_DROP);
        break;
    }
  }

  private getActionFromKey(keyCode: string): InputAction | null {
    for (const [action, keys] of Object.entries(this.config)) {
      if (keys.includes(keyCode)) {
        switch (action) {
          case 'moveLeft': return InputAction.MOVE_LEFT;
          case 'moveRight': return InputAction.MOVE_RIGHT;
          case 'rotate': return InputAction.ROTATE;
          case 'softDrop': return InputAction.SOFT_DROP;
          case 'hardDrop': return InputAction.HARD_DROP;
          case 'pause': return InputAction.PAUSE;
        }
      }
    }
    return null;
  }

  private isMovementAction(action: InputAction): boolean {
    return action === InputAction.MOVE_LEFT || 
           action === InputAction.MOVE_RIGHT || 
           action === InputAction.SOFT_DROP;
  }

  private triggerAction(action: InputAction, data?: any): void {
    const actionCallbacks = this.callbacks.get(action);
    if (actionCallbacks) {
      actionCallbacks.forEach(callback => {
        try {
          callback(action, data);
        } catch (error) {
          console.error(`Error in input callback for ${action}:`, error);
        }
      });
    }
  }

  private triggerHapticFeedback(duration: number = 10): void {
    if (this.settings.hapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        // Haptic feedback not supported or failed
        console.debug('Haptic feedback not available:', error);
      }
    }
  }

  // Public API methods
  public onInput(action: InputAction, callback: InputCallback): void {
    const actionCallbacks = this.callbacks.get(action);
    if (actionCallbacks) {
      actionCallbacks.push(callback);
    }
  }

  public offInput(action: InputAction, callback: InputCallback): void {
    const actionCallbacks = this.callbacks.get(action);
    if (actionCallbacks) {
      const index = actionCallbacks.indexOf(callback);
      if (index !== -1) {
        actionCallbacks.splice(index, 1);
      }
    }
  }

  public updateConfig(newConfig: Partial<InputConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize keyboard controls with new config
    if (this.settings.keyboardEnabled) {
      this.setupKeyboardControls();
    }
  }

  public updateSettings(newSettings: Partial<InputSettings>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    
    // Reinitialize controls if needed
    if (oldSettings.keyboardEnabled !== this.settings.keyboardEnabled) {
      if (this.settings.keyboardEnabled) {
        this.setupKeyboardControls();
      } else {
        this.keyboardKeys.clear();
      }
    }
    
    if (oldSettings.touchEnabled !== this.settings.touchEnabled) {
      if (this.settings.touchEnabled) {
        this.setupTouchControls();
      }
    }
  }

  public getConfig(): Readonly<InputConfig> {
    return { ...this.config };
  }

  public getSettings(): Readonly<InputSettings> {
    return { ...this.settings };
  }

  public isKeyPressed(keyCode: string): boolean {
    const key = this.keyboardKeys.get(keyCode);
    return key ? key.isDown : false;
  }

  public destroy(): void {
    // Clear all timers
    this.keyRepeatTimers.clear();
    
    if (this.holdTimer) {
      this.holdTimer.destroy();
    }
    
    // Clear callbacks
    this.callbacks.clear();
    
    // Remove event listeners
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown);
      this.scene.input.keyboard.off('keyup', this.handleKeyUp);
    }
    
    this.scene.input.off('pointerdown', this.handleTouchStart);
    this.scene.input.off('pointermove', this.handleTouchMove);
    this.scene.input.off('pointerup', this.handleTouchEnd);
  }
}