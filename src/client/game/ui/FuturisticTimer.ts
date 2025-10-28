import * as Phaser from 'phaser';

export interface TimerConfig {
  x: number;
  y: number;
  radius: number;
  maxTime: number;
  color: number;
  backgroundColor: number;
  borderColor: number;
  glowColor: number;
  showLabel?: boolean;
  labelText?: string;
}

export class FuturisticTimer extends Phaser.GameObjects.Container {
  private config: TimerConfig;
  private currentTime: number = 0;
  private maxTime: number = 0;
  private isActive: boolean = false;
  
  // Graphics objects
  private backgroundCircle!: Phaser.GameObjects.Graphics;
  private progressArc!: Phaser.GameObjects.Graphics;
  private borderCircle!: Phaser.GameObjects.Graphics;
  private glowEffect!: Phaser.GameObjects.Graphics;
  
  // Text objects
  private timeText!: Phaser.GameObjects.Text;
  private labelText!: Phaser.GameObjects.Text;
  private waterRisesText!: Phaser.GameObjects.Text;
  
  // Animation properties
  private pulseScale: number = 1.0;
  private glowIntensity: number = 1.0;
  private particleSystem: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, config: TimerConfig) {
    super(scene, config.x, config.y);
    this.config = config;
    this.maxTime = config.maxTime;
    this.currentTime = config.maxTime;
    
    this.createTimerElements();
    this.createParticleEffects();
    this.setDepth(150); // Above other UI elements
    
    scene.add.existing(this);
  }

  private createTimerElements(): void {
    const { radius, backgroundColor, borderColor, glowColor } = this.config;
    
    // Background circle
    this.backgroundCircle = this.scene.add.graphics();
    this.backgroundCircle.fillStyle(backgroundColor, 0.8);
    this.backgroundCircle.fillCircle(0, 0, radius);
    this.add(this.backgroundCircle);
    
    // Progress arc (starts full and decreases)
    this.progressArc = this.scene.add.graphics();
    this.add(this.progressArc);
    
    // Border circle
    this.borderCircle = this.scene.add.graphics();
    this.borderCircle.lineStyle(3, borderColor, 1.0);
    this.borderCircle.strokeCircle(0, 0, radius);
    this.add(this.borderCircle);
    
    // Glow effect
    this.glowEffect = this.scene.add.graphics();
    this.add(this.glowEffect);
    
    // Time text (large digital font)
    this.timeText = this.scene.add.text(0, -10, this.formatTime(this.currentTime), {
      fontSize: '32px',
      fontFamily: 'Courier New, monospace',
      color: '#FF6600',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center'
    });
    this.timeText.setOrigin(0.5, 0.5);
    this.add(this.timeText);
    
    // Label text
    this.labelText = this.scene.add.text(0, 15, 'SECONDS', {
      fontSize: '12px',
      fontFamily: 'Courier New, monospace',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 1,
      align: 'center'
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.add(this.labelText);
    
    // "Water rises in" text above the timer
    if (this.config.showLabel !== false) {
      this.waterRisesText = this.scene.add.text(0, -radius - 25, this.config.labelText || 'WATER RISES IN', {
        fontSize: '14px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#00FFFF',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center'
      });
      this.waterRisesText.setOrigin(0.5, 0.5);
      this.add(this.waterRisesText);
    }
    
    this.updateTimer();
  }

  private createParticleEffects(): void {
    const { radius, glowColor } = this.config;
    
    // Create particle system for glowing effects
    this.particleSystem = this.scene.add.particles(0, 0, 'timer_particle', {
      scale: { start: 0.1, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 1000,
      frequency: 200,
      emitZone: { 
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, radius - 5),
        quantity: 1
      }
    });
    
    this.particleSystem.setDepth(151);
    this.add(this.particleSystem);
  }

  private formatTime(timeMs: number): string {
    const seconds = Math.ceil(timeMs / 1000);
    return seconds.toString().padStart(2, '0');
  }

  private updateTimer(): void {
    const { radius, color, glowColor } = this.config;
    const progress = this.currentTime / this.maxTime;
    const angle = progress * Math.PI * 2;
    
    // Clear previous drawings
    this.progressArc.clear();
    this.glowEffect.clear();
    
    // Draw progress arc (starts from top, goes clockwise)
    this.progressArc.lineStyle(8, color, 1.0);
    this.progressArc.beginPath();
    this.progressArc.arc(0, 0, radius - 8, -Math.PI / 2, -Math.PI / 2 + angle, false);
    this.progressArc.strokePath();
    
    // Draw glow effect
    this.glowEffect.lineStyle(12, glowColor, this.glowIntensity * 0.3);
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, radius - 8, -Math.PI / 2, -Math.PI / 2 + angle, false);
    this.glowEffect.strokePath();
    
    // Update text
    this.timeText.setText(this.formatTime(this.currentTime));
    
    // Update colors based on urgency
    if (this.currentTime <= 5000) { // Last 5 seconds
      this.timeText.setColor('#FF0000');
      this.progressArc.lineStyle(8, 0xFF0000, 1.0);
      this.glowEffect.lineStyle(12, 0xFF0000, this.glowIntensity * 0.5);
    } else if (this.currentTime <= 10000) { // Last 10 seconds
      this.timeText.setColor('#FF8800');
      this.progressArc.lineStyle(8, 0xFF8800, 1.0);
      this.glowEffect.lineStyle(12, 0xFF8800, this.glowIntensity * 0.4);
    } else {
      this.timeText.setColor('#FF6600');
      this.progressArc.lineStyle(8, color, 1.0);
      this.glowEffect.lineStyle(12, glowColor, this.glowIntensity * 0.3);
    }
    
    // Redraw with new colors
    this.progressArc.beginPath();
    this.progressArc.arc(0, 0, radius - 8, -Math.PI / 2, -Math.PI / 2 + angle, false);
    this.progressArc.strokePath();
    
    this.glowEffect.beginPath();
    this.glowEffect.arc(0, 0, radius - 8, -Math.PI / 2, -Math.PI / 2 + angle, false);
    this.glowEffect.strokePath();
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;
    
    this.currentTime = Math.max(0, this.currentTime - deltaTime);
    this.updateTimer();
    
    // Pulse animation
    this.pulseScale = 1.0 + Math.sin(Date.now() * 0.005) * 0.05;
    this.setScale(this.pulseScale);
    
    // Glow intensity animation
    this.glowIntensity = 1.0 + Math.sin(Date.now() * 0.008) * 0.3;
    
    // Update particle effects
    if (this.particleSystem) {
      this.particleSystem.setVisible(this.currentTime > 0);
    }
    
    if (this.currentTime <= 0) {
      this.stop();
    }
  }

  public start(maxTimeMs: number): void {
    this.maxTime = maxTimeMs;
    this.currentTime = maxTimeMs;
    this.isActive = true;
    this.setVisible(true);
    this.updateTimer();
  }

  public stop(): void {
    this.isActive = false;
    this.setVisible(false);
    if (this.particleSystem) {
      this.particleSystem.setVisible(false);
    }
    
    // Emit event when timer reaches zero
    this.scene.events.emit('water-timer-expired');
  }

  public pause(): void {
    this.isActive = false;
  }

  public resume(): void {
    this.isActive = true;
  }

  public getRemainingTime(): number {
    return this.currentTime;
  }

  public isRunning(): boolean {
    return this.isActive && this.currentTime > 0;
  }

  public destroy(): void {
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    super.destroy();
  }
}
