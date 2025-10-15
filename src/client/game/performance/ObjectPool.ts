import * as Phaser from 'phaser';

export interface PoolableObject {
  reset(): void;
  destroy(): void;
  active: boolean;
}

export interface PoolConfig {
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  enableAutoCleanup: boolean;
  cleanupInterval: number;
}

export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private config: PoolConfig;
  private cleanupTimer?: Phaser.Time.TimerEvent;
  private scene: Phaser.Scene | undefined;

  constructor(
    factory: () => T,
    config: Partial<PoolConfig> = {},
    scene?: Phaser.Scene
  ) {
    this.factory = factory;
    this.scene = scene;
    this.config = {
      initialSize: 10,
      maxSize: 100,
      growthFactor: 1.5,
      enableAutoCleanup: true,
      cleanupInterval: 30000, // 30 seconds
      ...config
    };

    this.initialize();
    this.setupAutoCleanup();
  }

  /**
   * Initialize the pool with initial objects
   */
  private initialize(): void {
    for (let i = 0; i < this.config.initialSize; i++) {
      const obj = this.factory();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  /**
   * Setup automatic cleanup
   */
  private setupAutoCleanup(): void {
    if (this.config.enableAutoCleanup && this.scene) {
      this.cleanupTimer = this.scene.time.addEvent({
        delay: this.config.cleanupInterval,
        callback: () => this.cleanup(),
        loop: true
      });
    }
  }

  /**
   * Get an object from the pool
   */
  public get(): T {
    let obj: T;

    // Try to get from pool
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      // Create new object if pool is empty and under max size
      if (this.getTotalSize() < this.config.maxSize) {
        obj = this.factory();
      } else {
        // Pool is at max capacity, reuse oldest active object
        const oldestActive = this.getOldestActive();
        if (oldestActive) {
          this.release(oldestActive);
          obj = oldestActive;
        } else {
          // Fallback: create new object anyway
          obj = this.factory();
        }
      }
    }

    obj.active = true;
    this.active.add(obj);
    return obj;
  }

  /**
   * Release an object back to the pool
   */
  public release(obj: T): void {
    if (!this.active.has(obj)) return;

    obj.active = false;
    obj.reset();
    this.active.delete(obj);
    
    // Only add back to pool if under max size
    if (this.pool.length < this.config.maxSize) {
      this.pool.push(obj);
    } else {
      // Destroy excess objects
      obj.destroy();
    }
  }

  /**
   * Release all active objects
   */
  public releaseAll(): void {
    const activeObjects = Array.from(this.active);
    activeObjects.forEach(obj => this.release(obj));
  }

  /**
   * Get oldest active object (for forced reuse)
   */
  private getOldestActive(): T | null {
    // This is a simple implementation - in practice you might want to track creation time
    return this.active.values().next().value || null;
  }

  /**
   * Cleanup unused objects from pool
   */
  public cleanup(): void {
    const targetSize = Math.max(
      this.config.initialSize,
      Math.floor(this.active.size * this.config.growthFactor)
    );

    while (this.pool.length > targetSize) {
      const obj = this.pool.pop();
      if (obj) {
        obj.destroy();
      }
    }
  }

  /**
   * Grow the pool by adding more objects
   */
  public grow(count?: number): void {
    const growthCount = count || Math.floor(this.pool.length * (this.config.growthFactor - 1));
    const maxGrowth = this.config.maxSize - this.getTotalSize();
    const actualGrowth = Math.min(growthCount, maxGrowth);

    for (let i = 0; i < actualGrowth; i++) {
      const obj = this.factory();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    poolSize: number;
    activeCount: number;
    totalSize: number;
    maxSize: number;
    utilizationRate: number;
  } {
    const totalSize = this.getTotalSize();
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      totalSize,
      maxSize: this.config.maxSize,
      utilizationRate: totalSize > 0 ? this.active.size / totalSize : 0
    };
  }

  /**
   * Get total size (pool + active)
   */
  private getTotalSize(): number {
    return this.pool.length + this.active.size;
  }

  /**
   * Destroy the pool and all objects
   */
  public destroy(): void {
    // Destroy all pooled objects
    this.pool.forEach(obj => obj.destroy());
    this.pool = [];

    // Destroy all active objects
    this.active.forEach(obj => obj.destroy());
    this.active.clear();

    // Clean up timer
    if (this.cleanupTimer) {
      this.cleanupTimer.destroy();
    }
  }
}

/**
 * Pool manager for managing multiple object pools
 */
export class PoolManager {
  private pools: Map<string, ObjectPool<any>> = new Map();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a new pool
   */
  public createPool<T extends PoolableObject>(
    name: string,
    factory: () => T,
    config?: Partial<PoolConfig>
  ): ObjectPool<T> {
    const pool = new ObjectPool(factory, config, this.scene);
    this.pools.set(name, pool);
    return pool;
  }

  /**
   * Get a pool by name
   */
  public getPool<T extends PoolableObject>(name: string): ObjectPool<T> | null {
    return this.pools.get(name) || null;
  }

  /**
   * Get object from named pool
   */
  public get<T extends PoolableObject>(poolName: string): T | null {
    const pool = this.getPool<T>(poolName);
    return pool ? pool.get() : null;
  }

  /**
   * Release object to named pool
   */
  public release<T extends PoolableObject>(poolName: string, obj: T): void {
    const pool = this.getPool<T>(poolName);
    if (pool) {
      pool.release(obj);
    }
  }

  /**
   * Get statistics for all pools
   */
  public getAllStats(): Map<string, any> {
    const stats = new Map();
    this.pools.forEach((pool, name) => {
      stats.set(name, pool.getStats());
    });
    return stats;
  }

  /**
   * Cleanup all pools
   */
  public cleanupAll(): void {
    this.pools.forEach(pool => pool.cleanup());
  }

  /**
   * Release all objects from all pools
   */
  public releaseAll(): void {
    this.pools.forEach(pool => pool.releaseAll());
  }

  /**
   * Destroy all pools
   */
  public destroy(): void {
    this.pools.forEach(pool => pool.destroy());
    this.pools.clear();
  }
}

/**
 * Poolable particle class
 */
export class PoolableParticle implements PoolableObject {
  public active: boolean = false;
  private graphics: Phaser.GameObjects.Graphics;
  private tween: Phaser.Tweens.Tween | undefined;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  public reset(): void {
    this.graphics.clear();
    this.graphics.setPosition(0, 0);
    this.graphics.setAlpha(1);
    this.graphics.setScale(1);
    this.graphics.setRotation(0);
    this.graphics.setVisible(false);
    
    if (this.tween) {
      this.tween.stop();
      this.tween = undefined;
    }
  }

  public setup(x: number, y: number, color: number, size: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(color);
    this.graphics.fillCircle(0, 0, size);
    this.graphics.setPosition(x, y);
    this.graphics.setVisible(true);
  }

  public animate(
    scene: Phaser.Scene,
    targetX: number,
    targetY: number,
    duration: number,
    onComplete?: () => void
  ): void {
    this.tween = scene.tweens.add({
      targets: this.graphics,
      x: targetX,
      y: targetY,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  public getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  public destroy(): void {
    if (this.tween) {
      this.tween.stop();
    }
    this.graphics.destroy();
  }
}

/**
 * Poolable text object
 */
export class PoolableText implements PoolableObject {
  public active: boolean = false;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    this.text.setVisible(false);
  }

  public reset(): void {
    this.text.setText('');
    this.text.setPosition(0, 0);
    this.text.setAlpha(1);
    this.text.setScale(1);
    this.text.setRotation(0);
    this.text.setVisible(false);
    this.text.setStyle({
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF'
    });
  }

  public setup(
    x: number,
    y: number,
    text: string,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): void {
    this.text.setText(text);
    this.text.setPosition(x, y);
    this.text.setVisible(true);
    
    if (style) {
      this.text.setStyle(style);
    }
  }

  public getText(): Phaser.GameObjects.Text {
    return this.text;
  }

  public destroy(): void {
    this.text.destroy();
  }
}