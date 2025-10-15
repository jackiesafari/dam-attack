import * as Phaser from 'phaser';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  activeObjects: number;
  particleCount: number;
}

export interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
}

export interface FrameData {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PerformanceMonitor extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private isMonitoring: boolean = false;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private frameHistory: number[] = [];
  private memoryHistory: number[] = [];
  private activeFrames: Map<string, FrameData> = new Map();
  private frameStats: Map<string, { total: number; count: number; avg: number }> = new Map();
  
  // Performance tracking
  private lastUpdateTime: number = 0;
  private frameCount: number = 0;
  private totalFrameTime: number = 0;
  private warningCooldown: number = 0;
  
  // Object pooling tracking
  private objectPools: Map<string, number> = new Map();
  
  constructor(scene: Phaser.Scene, thresholds?: Partial<PerformanceThresholds>) {
    super();
    
    this.scene = scene;
    this.thresholds = {
      minFPS: 30,
      maxFrameTime: 33, // ~30 FPS
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxDrawCalls: 1000,
      ...thresholds
    };
    
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      drawCalls: 0,
      activeObjects: 0,
      particleCount: 0
    };
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastUpdateTime = performance.now();
    
    console.log('🔍 Performance monitoring started');
    
    // Set up memory monitoring if available
    if ('memory' in performance) {
      this.setupMemoryMonitoring();
    }
    
    // Monitor Phaser renderer stats
    this.setupRendererMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('🔍 Performance monitoring stopped');
  }

  /**
   * Update performance metrics
   */
  public update(_delta: number): void {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastUpdateTime;
    
    // Update FPS calculation
    this.frameCount++;
    this.totalFrameTime += frameTime;
    
    // Calculate FPS every second
    if (this.totalFrameTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / this.totalFrameTime);
      this.frameCount = 0;
      this.totalFrameTime = 0;
    }
    
    // Update frame time
    this.metrics.frameTime = frameTime;
    this.frameHistory.push(frameTime);
    
    // Keep only last 60 frames for history
    if (this.frameHistory.length > 60) {
      this.frameHistory.shift();
    }
    
    // Update memory usage
    this.updateMemoryUsage();
    
    // Update object counts
    this.updateObjectCounts();
    
    // Check for performance issues
    this.checkPerformanceThresholds();
    
    this.lastUpdateTime = currentTime;
  }

  /**
   * Start timing a frame operation
   */
  public startFrame(name: string): void {
    if (!this.isMonitoring) return;
    
    this.activeFrames.set(name, {
      name,
      startTime: performance.now()
    });
  }

  /**
   * End timing a frame operation
   */
  public endFrame(name: string): void {
    if (!this.isMonitoring) return;
    
    const frameData = this.activeFrames.get(name);
    if (!frameData) return;
    
    const endTime = performance.now();
    const duration = endTime - frameData.startTime;
    
    frameData.endTime = endTime;
    frameData.duration = duration;
    
    // Update frame statistics
    const stats = this.frameStats.get(name) || { total: 0, count: 0, avg: 0 };
    stats.total += duration;
    stats.count++;
    stats.avg = stats.total / stats.count;
    this.frameStats.set(name, stats);
    
    this.activeFrames.delete(name);
    
    // Warn about slow frames
    if (duration > 16.67) { // Slower than 60 FPS
      this.emit('slow-frame', { name, duration });
    }
  }

  /**
   * Track object pool usage
   */
  public trackObjectPool(poolName: string, activeCount: number): void {
    this.objectPools.set(poolName, activeCount);
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get frame statistics
   */
  public getFrameStats(): Map<string, { total: number; count: number; avg: number }> {
    return new Map(this.frameStats);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    fps: { current: number; avg: number; min: number; max: number };
    frameTime: { current: number; avg: number; max: number };
    memory: { current: number; peak: number };
    objects: { active: number; pools: Map<string, number> };
  } {
    const frameTimeAvg = this.frameHistory.length > 0 
      ? this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length 
      : 0;
    
    const frameTimeMax = this.frameHistory.length > 0 
      ? Math.max(...this.frameHistory) 
      : 0;
    
    const memoryPeak = this.memoryHistory.length > 0 
      ? Math.max(...this.memoryHistory) 
      : 0;
    
    return {
      fps: {
        current: this.metrics.fps,
        avg: Math.round(1000 / frameTimeAvg),
        min: Math.min(...this.frameHistory.map(ft => Math.round(1000 / ft))),
        max: Math.max(...this.frameHistory.map(ft => Math.round(1000 / ft)))
      },
      frameTime: {
        current: this.metrics.frameTime,
        avg: frameTimeAvg,
        max: frameTimeMax
      },
      memory: {
        current: this.metrics.memoryUsage,
        peak: memoryPeak
      },
      objects: {
        active: this.metrics.activeObjects,
        pools: new Map(this.objectPools)
      }
    };
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        setInterval(() => {
          this.metrics.memoryUsage = memory.usedJSHeapSize;
          this.memoryHistory.push(memory.usedJSHeapSize);
          
          // Keep only last 100 memory samples
          if (this.memoryHistory.length > 100) {
            this.memoryHistory.shift();
          }
        }, 1000);
      }
    }
  }

  /**
   * Setup renderer monitoring
   */
  private setupRendererMonitoring(): void {
    // Monitor Phaser renderer if available
    const renderer = this.scene.renderer;
    if (renderer && 'drawCalls' in renderer) {
      // WebGL renderer has draw call tracking
      setInterval(() => {
        this.metrics.drawCalls = (renderer as any).drawCalls || 0;
      }, 100);
    }
  }

  /**
   * Update memory usage
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      }
    }
  }

  /**
   * Update object counts
   */
  private updateObjectCounts(): void {
    // Count active game objects
    let activeObjects = 0;
    let particleCount = 0;
    
    // Count objects in scene
    this.scene.children.list.forEach(child => {
      activeObjects++;
      
      // Count particles
      if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) {
        particleCount += child.getAliveParticleCount();
      }
    });
    
    this.metrics.activeObjects = activeObjects;
    this.metrics.particleCount = particleCount;
  }

  /**
   * Check performance thresholds and emit warnings
   */
  private checkPerformanceThresholds(): void {
    const currentTime = performance.now();
    
    // Cooldown to prevent spam
    if (currentTime - this.warningCooldown < 5000) return;
    
    const issues: string[] = [];
    
    // Check FPS
    if (this.metrics.fps < this.thresholds.minFPS) {
      issues.push(`Low FPS: ${this.metrics.fps} (min: ${this.thresholds.minFPS})`);
    }
    
    // Check frame time
    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      issues.push(`High frame time: ${this.metrics.frameTime.toFixed(2)}ms (max: ${this.thresholds.maxFrameTime}ms)`);
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push(`High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB (max: ${(this.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    // Check draw calls
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      issues.push(`High draw calls: ${this.metrics.drawCalls} (max: ${this.thresholds.maxDrawCalls})`);
    }
    
    if (issues.length > 0) {
      this.warningCooldown = currentTime;
      this.emit('performance-warning', {
        issues,
        metrics: this.getMetrics(),
        timestamp: currentTime
      });
    }
  }

  /**
   * Log performance report
   */
  public logPerformanceReport(): void {
    const summary = this.getPerformanceSummary();
    
    console.group('🔍 Performance Report');
    console.log('FPS:', summary.fps);
    console.log('Frame Time:', summary.frameTime);
    console.log('Memory:', summary.memory);
    console.log('Objects:', summary.objects);
    
    if (this.frameStats.size > 0) {
      console.log('Frame Operations:');
      this.frameStats.forEach((stats, name) => {
        console.log(`  ${name}: avg ${stats.avg.toFixed(2)}ms (${stats.count} calls)`);
      });
    }
    
    console.groupEnd();
  }

  /**
   * Optimize performance based on current metrics
   */
  public optimizePerformance(): void {
    const metrics = this.getMetrics();
    
    // Suggest optimizations based on metrics
    if (metrics.fps < 30) {
      this.emit('optimization-suggestion', {
        type: 'reduce-particles',
        reason: 'Low FPS detected',
        suggestion: 'Reduce particle count and effects'
      });
    }
    
    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      this.emit('optimization-suggestion', {
        type: 'garbage-collection',
        reason: 'High memory usage',
        suggestion: 'Trigger garbage collection and cleanup unused objects'
      });
    }
    
    if (metrics.activeObjects > 500) {
      this.emit('optimization-suggestion', {
        type: 'object-pooling',
        reason: 'High object count',
        suggestion: 'Implement object pooling for frequently created objects'
      });
    }
  }

  /**
   * Create performance overlay for debugging
   */
  public createDebugOverlay(): Phaser.GameObjects.Container {
    const overlay = this.scene.add.container(10, 10);
    overlay.setDepth(10000);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, 200, 120);
    overlay.add(bg);
    
    const text = this.scene.add.text(5, 5, '', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#00FF00'
    });
    overlay.add(text);
    
    // Update overlay every frame
    this.scene.events.on('postupdate', () => {
      const metrics = this.getMetrics();
      text.setText([
        `FPS: ${metrics.fps}`,
        `Frame: ${metrics.frameTime.toFixed(2)}ms`,
        `Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        `Objects: ${metrics.activeObjects}`,
        `Particles: ${metrics.particleCount}`,
        `Draw Calls: ${metrics.drawCalls}`
      ].join('\n'));
    });
    
    return overlay;
  }

  /**
   * Clean up resources
   */
  public override destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.activeFrames.clear();
    this.frameStats.clear();
    this.objectPools.clear();
    this.frameHistory = [];
    this.memoryHistory = [];
  }
}