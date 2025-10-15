import * as Phaser from 'phaser';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}

export interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
  duration: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface TapGesture {
  x: number;
  y: number;
  duration: number;
  tapCount: number;
}

export interface HoldGesture {
  x: number;
  y: number;
  duration: number;
}

export interface TouchEventConfig {
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  tapMaxDuration: number;
  tapMaxDistance: number;
  holdMinDuration: number;
  doubleTapMaxDelay: number;
  hitAreaPadding: number;
}

export type TouchEventCallback = {
  onSwipe?: (gesture: SwipeGesture) => void;
  onTap?: (gesture: TapGesture) => void;
  onHold?: (gesture: HoldGesture) => void;
  onTouchStart?: (point: TouchPoint) => void;
  onTouchMove?: (point: TouchPoint) => void;
  onTouchEnd?: (point: TouchPoint) => void;
};

export class TouchEventHandler {
  private scene: Phaser.Scene;
  private config: TouchEventConfig;
  private callbacks: TouchEventCallback = {};
  
  private activeTouches: Map<number, TouchPoint> = new Map();
  private holdTimers: Map<number, Phaser.Time.TimerEvent> = new Map();
  private lastTapTime: number = 0;
  private lastTapPosition: { x: number; y: number } = { x: 0, y: 0 };
  private tapCount: number = 0;
  
  private isEnabled: boolean = true;
  private debugMode: boolean = false;

  constructor(scene: Phaser.Scene, config?: Partial<TouchEventConfig>) {
    this.scene = scene;
    
    // Default configuration
    this.config = {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      tapMaxDuration: 300,
      tapMaxDistance: 20,
      holdMinDuration: 500,
      doubleTapMaxDelay: 300,
      hitAreaPadding: 10,
      ...config
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use more reliable pointer events instead of touch events
    this.scene.input.on('pointerdown', this.handlePointerDown.bind(this));
    this.scene.input.on('pointermove', this.handlePointerMove.bind(this));
    this.scene.input.on('pointerup', this.handlePointerUp.bind(this));
    this.scene.input.on('pointercancel', this.handlePointerCancel.bind(this));
    
    // Handle multiple pointers
    this.scene.input.on('pointerdownoutside', this.handlePointerDown.bind(this));
    this.scene.input.on('pointermoveoutside', this.handlePointerMove.bind(this));
    this.scene.input.on('pointerupoutside', this.handlePointerUp.bind(this));
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    
    const touchPoint: TouchPoint = {
      id: pointer.id,
      x: pointer.x,
      y: pointer.y,
      startX: pointer.x,
      startY: pointer.y,
      startTime: this.scene.time.now,
      lastX: pointer.x,
      lastY: pointer.y,
      lastTime: this.scene.time.now
    };
    
    this.activeTouches.set(pointer.id, touchPoint);
    
    // Set up hold detection
    const holdTimer = this.scene.time.delayedCall(
      this.config.holdMinDuration,
      () => {
        const touch = this.activeTouches.get(pointer.id);
        if (touch) {
          this.triggerHoldGesture(touch);
        }
      }
    );
    this.holdTimers.set(pointer.id, holdTimer);
    
    // Trigger touch start callback
    if (this.callbacks.onTouchStart) {
      this.callbacks.onTouchStart(touchPoint);
    }
    
    if (this.debugMode) {
      console.log('Touch start:', touchPoint);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    
    const touchPoint = this.activeTouches.get(pointer.id);
    if (!touchPoint) return;
    
    // Update touch point
    touchPoint.lastX = touchPoint.x;
    touchPoint.lastY = touchPoint.y;
    touchPoint.lastTime = touchPoint.lastTime;
    touchPoint.x = pointer.x;
    touchPoint.y = pointer.y;
    touchPoint.lastTime = this.scene.time.now;
    
    // Check if movement exceeds tap threshold
    const distance = this.getDistance(touchPoint.startX, touchPoint.startY, pointer.x, pointer.y);
    if (distance > this.config.tapMaxDistance) {
      // Cancel hold timer if movement is too much
      const holdTimer = this.holdTimers.get(pointer.id);
      if (holdTimer) {
        holdTimer.destroy();
        this.holdTimers.delete(pointer.id);
      }
    }
    
    // Trigger touch move callback
    if (this.callbacks.onTouchMove) {
      this.callbacks.onTouchMove(touchPoint);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    
    const touchPoint = this.activeTouches.get(pointer.id);
    if (!touchPoint) return;
    
    const duration = this.scene.time.now - touchPoint.startTime;
    const distance = this.getDistance(touchPoint.startX, touchPoint.startY, pointer.x, pointer.y);
    
    // Clean up hold timer
    const holdTimer = this.holdTimers.get(pointer.id);
    if (holdTimer) {
      holdTimer.destroy();
      this.holdTimers.delete(pointer.id);
    }
    
    // Determine gesture type
    if (duration <= this.config.tapMaxDuration && distance <= this.config.tapMaxDistance) {
      this.handleTapGesture(touchPoint, duration);
    } else if (distance >= this.config.swipeThreshold) {
      this.handleSwipeGesture(touchPoint, duration, distance);
    }
    
    // Trigger touch end callback
    if (this.callbacks.onTouchEnd) {
      this.callbacks.onTouchEnd(touchPoint);
    }
    
    // Clean up
    this.activeTouches.delete(pointer.id);
    
    if (this.debugMode) {
      console.log('Touch end:', { duration, distance, gesture: this.getGestureType(duration, distance) });
    }
  }

  private handlePointerCancel(pointer: Phaser.Input.Pointer): void {
    // Clean up cancelled touch
    const holdTimer = this.holdTimers.get(pointer.id);
    if (holdTimer) {
      holdTimer.destroy();
      this.holdTimers.delete(pointer.id);
    }
    
    this.activeTouches.delete(pointer.id);
  }

  private handleTapGesture(touchPoint: TouchPoint, duration: number): void {
    const now = this.scene.time.now;
    const timeSinceLastTap = now - this.lastTapTime;
    const distanceFromLastTap = this.getDistance(
      touchPoint.x, touchPoint.y,
      this.lastTapPosition.x, this.lastTapPosition.y
    );
    
    // Check for double tap
    if (timeSinceLastTap <= this.config.doubleTapMaxDelay && 
        distanceFromLastTap <= this.config.tapMaxDistance) {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }
    
    this.lastTapTime = now;
    this.lastTapPosition = { x: touchPoint.x, y: touchPoint.y };
    
    // Trigger tap callback
    if (this.callbacks.onTap) {
      this.callbacks.onTap({
        x: touchPoint.x,
        y: touchPoint.y,
        duration,
        tapCount: this.tapCount
      });
    }
    
    // Reset tap count after delay
    this.scene.time.delayedCall(this.config.doubleTapMaxDelay, () => {
      this.tapCount = 0;
    });
  }

  private handleSwipeGesture(touchPoint: TouchPoint, duration: number, distance: number): void {
    const deltaX = touchPoint.x - touchPoint.startX;
    const deltaY = touchPoint.y - touchPoint.startY;
    const velocity = distance / duration;
    
    // Only trigger swipe if velocity is high enough
    if (velocity < this.config.swipeVelocityThreshold) {
      return;
    }
    
    // Determine swipe direction
    let direction: 'up' | 'down' | 'left' | 'right';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    // Trigger swipe callback
    if (this.callbacks.onSwipe) {
      this.callbacks.onSwipe({
        direction,
        distance,
        velocity,
        duration,
        startPoint: { x: touchPoint.startX, y: touchPoint.startY },
        endPoint: { x: touchPoint.x, y: touchPoint.y }
      });
    }
  }

  private triggerHoldGesture(touchPoint: TouchPoint): void {
    const duration = this.scene.time.now - touchPoint.startTime;
    
    if (this.callbacks.onHold) {
      this.callbacks.onHold({
        x: touchPoint.x,
        y: touchPoint.y,
        duration
      });
    }
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  private getGestureType(duration: number, distance: number): string {
    if (duration <= this.config.tapMaxDuration && distance <= this.config.tapMaxDistance) {
      return 'tap';
    } else if (distance >= this.config.swipeThreshold) {
      return 'swipe';
    } else if (duration >= this.config.holdMinDuration) {
      return 'hold';
    }
    return 'unknown';
  }

  // Public API methods
  public setCallbacks(callbacks: TouchEventCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public updateConfig(newConfig: Partial<TouchEventConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      // Clean up active touches
      this.activeTouches.clear();
      this.holdTimers.forEach(timer => timer.destroy());
      this.holdTimers.clear();
    }
  }

  public setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }

  public getActiveTouchCount(): number {
    return this.activeTouches.size;
  }

  public isPointInHitArea(x: number, y: number, targetX: number, targetY: number, targetWidth: number, targetHeight: number): boolean {
    const padding = this.config.hitAreaPadding;
    return x >= targetX - padding &&
           x <= targetX + targetWidth + padding &&
           y >= targetY - padding &&
           y <= targetY + targetHeight + padding;
  }

  public createHitArea(x: number, y: number, width: number, height: number): Phaser.Geom.Rectangle {
    const padding = this.config.hitAreaPadding;
    return new Phaser.Geom.Rectangle(
      x - padding,
      y - padding,
      width + padding * 2,
      height + padding * 2
    );
  }

  public destroy(): void {
    // Clean up all timers
    this.holdTimers.forEach(timer => timer.destroy());
    this.holdTimers.clear();
    
    // Clear active touches
    this.activeTouches.clear();
    
    // Remove event listeners
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointercancel', this.handlePointerCancel);
    this.scene.input.off('pointerdownoutside', this.handlePointerDown);
    this.scene.input.off('pointermoveoutside', this.handlePointerMove);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
    
    // Clear callbacks
    this.callbacks = {};
  }
}