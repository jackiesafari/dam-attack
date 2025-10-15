import * as Phaser from 'phaser';

export interface FrameRateConfig {
  targetFPS: number;
  minFPS: number;
  adaptiveQuality: boolean;
  qualityLevels: QualityLevel[];
  monitoringInterval: number;
  stabilizationFrames: number;
}

export interface QualityLevel {
  name: string;
  particleMultiplier: number;
  effectsEnabled: boolean;
  shadowsEnabled: boolean;
  animationSpeed: number;
  lodBias: number;
  maxObjects: number;
}

export interface FrameRateStats {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  qualityLevel: string;
  adaptationsCount: number;
}

export class FrameRateOptimizer extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private config: FrameRateConfig;
  private stats: FrameRateStats;
  private frameHistory: number[] = [];
  private currentQualityIndex: number = 0;
  private adaptationCooldown: number = 0;
  private monitoringTimer?: Phaser.Time.TimerEvent;
  private isOptimizing: boolean = false;

  constructor(scene: Phaser.Scene, config?: Partial<FrameRateConfig>) {
    super();
    
    this.scene = scene;
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      adaptiveQuality: true,
      qualityLevels: this.getDefaultQualityLevels(),
      monitoringInterval: 1000, // 1 second
      stabilizationFrames: 60, // 1 second at 60fps
      ...config
    };

    this.stats = {
      currentFPS: 60,
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      frameDrops: 0,
      qualityLevel: this.config.qualityLevels[0]?.name || 'Ultra',
      adaptationsCount: 0
    };

    this.initialize();
  }

  /**
   * Get default quality levels
   */
  private getDefaultQualityLevels(): QualityLevel[] {
    return [
      {
        name: 'Ultra',
        particleMultiplier: 1.0,
        effectsEnabled: true,
        shadowsEnabled: true,
        animationSpeed: 1.0,
        lodBias: 1.0,
        maxObjects: 1000
      },
      {
        name: 'High',
        particleMultiplier: 0.8,
        effectsEnabled: true,
        shadowsEnabled: true,
        animationSpeed: 1.0,
        lodBias: 0.8,
        maxObjects: 800
      },
      {
        name: 'Medium',
        particleMultiplier: 0.6,
        effectsEnabled: true,
        shadowsEnabled: false,
        animationSpeed: 0.8,
        lodBias: 0.6,
        maxObjects: 600
      },
      {
        name: 'Low',
        particleMultiplier: 0.4,
        effectsEnabled: false,
        shadowsEnabled: false,
        animationSpeed: 0.6,
        lodBias: 0.4,
        maxObjects: 400
      },
      {
        name: 'Potato',
        particleMultiplier: 0.2,
        effectsEnabled: false,
        shadowsEnabled: false,
        animationSpeed: 0.4,
        lodBias: 0.2,
        maxObjects: 200
      }
    ];
  }

  /**
   * Initialize the frame rate optimizer
   */
  private initialize(): void {
    // Start with highest quality
    this.currentQualityIndex = 0;
    const initialQuality = this.config.qualityLevels[0];
    if (initialQuality) {
      this.applyQualityLevel(initialQuality);
      this.stats.qualityLevel = initialQuality.name;
    }

    // Set up monitoring
    this.startMonitoring();

    console.log('🎯 Frame rate optimizer initialized');
  }

  /**
   * Start frame rate monitoring
   */
  private startMonitoring(): void {
    this.monitoringTimer = this.scene.time.addEvent({
      delay: this.config.monitoringInterval,
      callback: () => this.analyzePerformance(),
      loop: true
    });

    // Hook into game loop for frame tracking
    this.scene.events.on('postupdate', this.trackFrame, this);
  }

  /**
   * Track individual frame performance
   */
  private trackFrame(): void {
    const currentFPS = this.scene.game.loop.actualFps;
    
    this.stats.currentFPS = currentFPS;
    this.frameHistory.push(currentFPS);

    // Keep only recent frames
    if (this.frameHistory.length > this.config.stabilizationFrames) {
      this.frameHistory.shift();
    }

    // Track frame drops
    if (currentFPS < this.config.minFPS) {
      this.stats.frameDrops++;
    }
  }

  /**
   * Analyze performance and adapt quality if needed
   */
  private analyzePerformance(): void {
    if (this.frameHistory.length < 10) return; // Need some data first

    // Calculate statistics
    this.calculateStats();

    // Check if adaptation is needed
    if (this.config.adaptiveQuality && !this.isOptimizing) {
      this.checkForAdaptation();
    }

    // Emit stats event
    this.emit('performance-stats', this.stats);
  }

  /**
   * Calculate frame rate statistics
   */
  private calculateStats(): void {
    if (this.frameHistory.length === 0) return;

    this.stats.averageFPS = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    this.stats.minFPS = Math.min(...this.frameHistory);
    this.stats.maxFPS = Math.max(...this.frameHistory);
  }

  /**
   * Check if quality adaptation is needed
   */
  private checkForAdaptation(): void {
    const now = Date.now();
    
    // Cooldown to prevent rapid changes
    if (now - this.adaptationCooldown < 5000) return;

    const avgFPS = this.stats.averageFPS;
    const targetFPS = this.config.targetFPS;
    const minFPS = this.config.minFPS;

    // Performance is too low - reduce quality
    if (avgFPS < minFPS && this.currentQualityIndex < this.config.qualityLevels.length - 1) {
      this.adaptQuality('down');
    }
    // Performance is good - try to increase quality
    else if (avgFPS > targetFPS * 0.9 && this.currentQualityIndex > 0) {
      // Only increase if we've been stable for a while
      const recentFrames = this.frameHistory.slice(-30); // Last 30 frames
      const recentAvg = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;
      
      if (recentAvg > targetFPS * 0.95) {
        this.adaptQuality('up');
      }
    }
  }

  /**
   * Adapt quality level
   */
  private adaptQuality(direction: 'up' | 'down'): void {
    const oldIndex = this.currentQualityIndex;
    
    if (direction === 'down' && this.currentQualityIndex < this.config.qualityLevels.length - 1) {
      this.currentQualityIndex++;
    } else if (direction === 'up' && this.currentQualityIndex > 0) {
      this.currentQualityIndex--;
    } else {
      return; // No change possible
    }

    const newQuality = this.config.qualityLevels[this.currentQualityIndex];
    const oldQuality = this.config.qualityLevels[oldIndex];

    if (!newQuality || !oldQuality) return;

    console.log(`🎯 Quality adapted: ${oldQuality.name} → ${newQuality.name} (${direction})`);

    this.applyQualityLevel(newQuality);
    this.stats.adaptationsCount++;
    this.adaptationCooldown = Date.now();

    // Emit quality change event
    this.emit('quality-changed', {
      from: oldQuality.name,
      to: newQuality.name,
      direction,
      reason: direction === 'down' ? 'performance' : 'optimization'
    });
  }

  /**
   * Apply quality level settings
   */
  private applyQualityLevel(quality: QualityLevel): void {
    this.stats.qualityLevel = quality.name;

    // Apply settings to various systems
    this.emit('quality-settings', {
      particleMultiplier: quality.particleMultiplier,
      effectsEnabled: quality.effectsEnabled,
      shadowsEnabled: quality.shadowsEnabled,
      animationSpeed: quality.animationSpeed,
      lodBias: quality.lodBias,
      maxObjects: quality.maxObjects
    });

    // Apply to scene-specific systems if they exist
    this.applyToGameSystems(quality);
  }

  /**
   * Apply quality settings to game systems
   */
  private applyToGameSystems(quality: QualityLevel): void {
    // Apply to effects manager
    if ((this.scene as any).effectsManager) {
      // Reduce particle counts based on quality
      // This would need to be implemented in the effects manager
    }

    // Apply to piece renderer
    if ((this.scene as any).pieceRenderer) {
      const pieceRenderer = (this.scene as any).pieceRenderer;
      pieceRenderer.updateConfig({
        showShadows: quality.shadowsEnabled,
        animationSpeed: quality.animationSpeed,
        enableParticles: quality.effectsEnabled
      });
    }

    // Apply to board renderer
    if ((this.scene as any).boardRenderer) {
      const boardRenderer = (this.scene as any).boardRenderer;
      boardRenderer.updateConfig({
        enableAnimations: quality.effectsEnabled,
        showWaterBackground: quality.effectsEnabled && quality.name !== 'Potato'
      });
    }

    // Apply to theme manager
    if ((this.scene as any).themeManager) {
      // Could adjust theme complexity based on quality
    }
  }

  /**
   * Force quality level
   */
  public setQualityLevel(levelName: string): boolean {
    const index = this.config.qualityLevels.findIndex(q => q.name === levelName);
    if (index === -1) return false;

    this.currentQualityIndex = index;
    const quality = this.config.qualityLevels[index];
    if (quality) {
      this.applyQualityLevel(quality);
    }
    
    console.log(`🎯 Quality manually set to: ${levelName}`);
    return true;
  }

  /**
   * Get current quality level
   */
  public getCurrentQuality(): QualityLevel | undefined {
    return this.config.qualityLevels[this.currentQualityIndex];
  }

  /**
   * Get available quality levels
   */
  public getQualityLevels(): QualityLevel[] {
    return [...this.config.qualityLevels];
  }

  /**
   * Enable/disable adaptive quality
   */
  public setAdaptiveQuality(enabled: boolean): void {
    this.config.adaptiveQuality = enabled;
    console.log(`🎯 Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Optimize for specific device type
   */
  public optimizeForDevice(deviceType: 'mobile' | 'tablet' | 'desktop'): void {
    let targetQuality: string;

    switch (deviceType) {
      case 'mobile':
        targetQuality = 'Low';
        this.config.targetFPS = 30;
        this.config.minFPS = 20;
        break;
      case 'tablet':
        targetQuality = 'Medium';
        this.config.targetFPS = 45;
        this.config.minFPS = 25;
        break;
      case 'desktop':
        targetQuality = 'High';
        this.config.targetFPS = 60;
        this.config.minFPS = 30;
        break;
    }

    this.setQualityLevel(targetQuality);
    console.log(`🎯 Optimized for ${deviceType}: ${targetQuality} quality, ${this.config.targetFPS} FPS target`);
  }

  /**
   * Perform emergency optimization
   */
  public emergencyOptimize(): void {
    if (this.isOptimizing) return;

    this.isOptimizing = true;
    console.log('🚨 Emergency optimization triggered');

    // Drop to lowest quality immediately
    this.currentQualityIndex = this.config.qualityLevels.length - 1;
    const lowestQuality = this.config.qualityLevels[this.currentQualityIndex];
    if (lowestQuality) {
      this.applyQualityLevel(lowestQuality);
    }

    // Disable adaptive quality temporarily
    const wasAdaptive = this.config.adaptiveQuality;
    this.config.adaptiveQuality = false;

    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }

    // Clear frame history to start fresh
    this.frameHistory = [];
    this.stats.frameDrops = 0;

    // Re-enable adaptive quality after stabilization
    this.scene.time.delayedCall(10000, () => {
      this.config.adaptiveQuality = wasAdaptive;
      this.isOptimizing = false;
      console.log('🎯 Emergency optimization complete');
    });

    this.emit('emergency-optimization');
  }

  /**
   * Get performance statistics
   */
  public getStats(): FrameRateStats {
    return { ...this.stats };
  }

  /**
   * Create debug overlay
   */
  public createDebugOverlay(): Phaser.GameObjects.Container {
    const overlay = this.scene.add.container(430, 10);
    overlay.setDepth(10000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, 180, 120);
    overlay.add(bg);

    const text = this.scene.add.text(5, 5, '', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#FFFF00'
    });
    overlay.add(text);

    // Update overlay
    this.on('performance-stats', (stats: FrameRateStats) => {
      text.setText([
        `FPS: ${stats.currentFPS.toFixed(1)}`,
        `Avg: ${stats.averageFPS.toFixed(1)}`,
        `Min: ${stats.minFPS.toFixed(1)}`,
        `Drops: ${stats.frameDrops}`,
        `Quality: ${stats.qualityLevel}`,
        `Adapt: ${stats.adaptationsCount}`
      ].join('\n'));
    });

    return overlay;
  }

  /**
   * Create quality control UI
   */
  public createQualityControlUI(): Phaser.GameObjects.Container {
    const ui = this.scene.add.container(10, 400);
    ui.setDepth(10000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, 200, 150);
    bg.lineStyle(2, 0xFFFF00);
    bg.strokeRect(0, 0, 200, 150);
    ui.add(bg);

    const title = this.scene.add.text(5, 5, 'Quality Control', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFF00',
      fontStyle: 'bold'
    });
    ui.add(title);

    // Quality level buttons
    this.config.qualityLevels.forEach((quality, index) => {
      const button = this.scene.add.text(10, 25 + index * 20, quality.name, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FFFFFF',
        backgroundColor: index === this.currentQualityIndex ? '#444444' : '#222222',
        padding: { x: 5, y: 2 }
      });

      button.setInteractive();
      button.on('pointerdown', () => {
        this.setQualityLevel(quality.name);
        // Update button colors
        this.updateQualityButtons(ui, index);
      });

      ui.add(button);
    });

    // Adaptive toggle
    const adaptiveToggle = this.scene.add.text(10, 130, 
      `Adaptive: ${this.config.adaptiveQuality ? 'ON' : 'OFF'}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: this.config.adaptiveQuality ? '#00FF00' : '#FF0000',
      backgroundColor: '#333333',
      padding: { x: 5, y: 2 }
    });

    adaptiveToggle.setInteractive();
    adaptiveToggle.on('pointerdown', () => {
      this.setAdaptiveQuality(!this.config.adaptiveQuality);
      adaptiveToggle.setText(`Adaptive: ${this.config.adaptiveQuality ? 'ON' : 'OFF'}`);
      adaptiveToggle.setColor(this.config.adaptiveQuality ? '#00FF00' : '#FF0000');
    });

    ui.add(adaptiveToggle);

    return ui;
  }

  /**
   * Update quality button colors
   */
  private updateQualityButtons(ui: Phaser.GameObjects.Container, selectedIndex: number): void {
    ui.list.forEach((child, index) => {
      if (index >= 2 && index < 2 + this.config.qualityLevels.length) {
        const button = child as Phaser.GameObjects.Text;
        const buttonIndex = index - 2;
        button.setBackgroundColor(buttonIndex === selectedIndex ? '#444444' : '#222222');
      }
    });
  }

  /**
   * Clean up resources
   */
  public override destroy(): void {
    if (this.monitoringTimer) {
      this.monitoringTimer.destroy();
    }

    this.scene.events.off('postupdate', this.trackFrame, this);
    this.removeAllListeners();
    this.frameHistory = [];
  }
}