import * as Phaser from 'phaser';
import { WaterLevel, WaterParticle } from '../types/EnvironmentalTypes';

export class WaterLevelManager {
  private scene: Phaser.Scene;
  private waterLevel: WaterLevel;
  private waterGraphics: Phaser.GameObjects.Graphics;
  private particleSystem: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private gameHeight: number;
  private gameWidth: number;
  private listeners: ((level: number, isGameOver: boolean) => void)[] = [];
  
  // Grace period system
  private gracePeriodMs: number = 30000; // 30 seconds default (matches timer)
  private gracePeriodActive: boolean = true;
  private gracePeriodStartTime: number = 0;
  private gracePeriodElapsed: number = 0;

  constructor(scene: Phaser.Scene, gameWidth: number = 800, gameHeight: number = 600) {
    this.scene = scene;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    
    this.waterLevel = {
      currentLevel: 0,
      riseRate: 1.0,
      maxLevel: 1.0,
      visualHeight: 0,
      transparency: 0.7,
      waveAnimation: {
        amplitude: 3,
        frequency: 0.8,
        speed: 1.5,
        offset: 0
      },
      particles: []
    };

    // Initialize grace period
    this.gracePeriodStartTime = Date.now();
    this.gracePeriodElapsed = 0;

    this.waterGraphics = scene.add.graphics();
    this.waterGraphics.setDepth(-5); // Behind game pieces
    this.initializeParticleSystem();
    
    // Listen for timer expiration to end grace period
    this.scene.events.on('water-timer-expired', () => {
      this.endGracePeriod();
    });
  }

  private initializeParticleSystem(): void {
    // Create water particle effects (bubbles, splashes, etc.)
    this.particleSystem = this.scene.add.particles(0, 0, 'water_particle', {
      scale: { start: 0.1, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 2000,
      frequency: 100,
      emitZone: { 
        type: 'edge',
        source: new Phaser.Geom.Rectangle(0, this.gameHeight - 50, this.gameWidth, 50),
        quantity: 1
      }
    });
    
    this.particleSystem.setDepth(-3);
  }

  public endGracePeriod(): void {
    if (this.gracePeriodActive) {
      this.gracePeriodActive = false;
      console.log('Grace period ended by timer - water will now start rising');
    }
  }

  public update(deltaTime: number): void {
    // Update grace period
    this.gracePeriodElapsed += deltaTime;
    
    // Check if grace period has ended (fallback for time-based expiration)
    if (this.gracePeriodActive && this.gracePeriodElapsed >= this.gracePeriodMs) {
      this.gracePeriodActive = false;
      console.log('Grace period ended by time - water will now start rising');
    }
    
    // Only update water level if grace period has ended
    if (!this.gracePeriodActive) {
      // DEBUG: Log every frame for first 5 seconds after grace period
      const timeSinceGraceEnded = this.gracePeriodElapsed - this.gracePeriodMs;
      if (timeSinceGraceEnded >= 0 && timeSinceGraceEnded <= 5000) {
        console.log(`FRAME DEBUG: deltaTime=${deltaTime}, riseRate=${this.waterLevel.riseRate}, riseAmount=${(this.waterLevel.riseRate * deltaTime) / 1000}, waterBefore=${this.waterLevel.currentLevel}`);
      }
      
      // Update water level
      const riseAmount = (this.waterLevel.riseRate * deltaTime) / 1000;
      this.waterLevel.currentLevel = Math.min(this.waterLevel.maxLevel, 
        this.waterLevel.currentLevel + riseAmount);
      
      // DEBUG: Log every frame for first 5 seconds after grace period
      if (timeSinceGraceEnded >= 0 && timeSinceGraceEnded <= 5000) {
        console.log(`FRAME DEBUG: waterAfter=${this.waterLevel.currentLevel}, waterPercent=${(this.waterLevel.currentLevel * 100).toFixed(2)}%`);
      }
      
      // Debug logging every 5 seconds
      if (Math.floor(this.gracePeriodElapsed / 5000) !== Math.floor((this.gracePeriodElapsed - deltaTime) / 5000)) {
        console.log(`Water Level: ${(this.waterLevel.currentLevel * 100).toFixed(2)}% | Rise Rate: ${this.waterLevel.riseRate}`);
      }
    }
    
    // Update visual height
    this.waterLevel.visualHeight = this.waterLevel.currentLevel * this.gameHeight;
    
    // Update wave animation
    this.waterLevel.waveAnimation.offset += (this.waterLevel.waveAnimation.speed * deltaTime) / 1000;
    
    // Update particles
    this.updateWaterParticles(deltaTime);
    
    // Render water
    this.renderWater();
    
    // Check for game over
    const isGameOver = this.waterLevel.currentLevel >= this.waterLevel.maxLevel;
    this.notifyListeners(this.waterLevel.currentLevel, isGameOver);
  }

  private updateWaterParticles(deltaTime: number): void {
    // Update existing particles
    this.waterLevel.particles.forEach((particle, index) => {
      particle.x += particle.velocityX * deltaTime / 1000;
      particle.y += particle.velocityY * deltaTime / 1000;
      particle.opacity -= deltaTime / 2000; // Fade over 2 seconds
      
      // Remove dead particles
      if (particle.opacity <= 0) {
        this.waterLevel.particles.splice(index, 1);
      }
    });
    
    // Spawn new particles near water surface
    if (Math.random() < 0.3) {
      this.spawnWaterParticle();
    }
  }

  private spawnWaterParticle(): void {
    const surfaceY = this.gameHeight - this.waterLevel.visualHeight;
    
    const particle: WaterParticle = {
      x: Math.random() * this.gameWidth,
      y: surfaceY + (Math.random() - 0.5) * 20,
      velocityX: (Math.random() - 0.5) * 30,
      velocityY: -Math.random() * 20,
      size: 2 + Math.random() * 4,
      opacity: 0.8,
      type: Math.random() < 0.7 ? 'bubble' : 'splash'
    };
    
    this.waterLevel.particles.push(particle);
  }

  private renderWater(): void {
    this.waterGraphics.clear();
    
    if (this.waterLevel.visualHeight <= 0) return;
    
    const surfaceY = this.gameHeight - this.waterLevel.visualHeight;
    
    // Draw water with solid color (simplified for now)
    this.waterGraphics.fillStyle(0x40A4DF, 0.6); // Light blue with transparency
    this.waterGraphics.beginPath();
    
    // Start from left edge
    this.waterGraphics.moveTo(0, this.gameHeight);
    this.waterGraphics.lineTo(0, surfaceY);
    
    // Draw wavy surface
    for (let x = 0; x <= this.gameWidth; x += 5) {
      const waveHeight = Math.sin(
        (x / this.gameWidth) * Math.PI * 2 * this.waterLevel.waveAnimation.frequency + 
        this.waterLevel.waveAnimation.offset
      ) * this.waterLevel.waveAnimation.amplitude;
      
      this.waterGraphics.lineTo(x, surfaceY + waveHeight);
    }
    
    // Complete the shape
    this.waterGraphics.lineTo(this.gameWidth, this.gameHeight);
    this.waterGraphics.closePath();
    this.waterGraphics.fillPath();
    
    // Add water surface reflection effect
    this.renderWaterReflection(surfaceY);
    
    // Render water particles
    this.renderWaterParticles();
  }

  private renderWaterReflection(surfaceY: number): void {
    // Add subtle white highlight on water surface
    this.waterGraphics.lineStyle(2, 0xFFFFFF, 0.3);
    this.waterGraphics.beginPath();
    
    for (let x = 0; x <= this.gameWidth; x += 10) {
      const waveHeight = Math.sin(
        (x / this.gameWidth) * Math.PI * 2 * this.waterLevel.waveAnimation.frequency + 
        this.waterLevel.waveAnimation.offset
      ) * this.waterLevel.waveAnimation.amplitude;
      
      if (x === 0) {
        this.waterGraphics.moveTo(x, surfaceY + waveHeight);
      } else {
        this.waterGraphics.lineTo(x, surfaceY + waveHeight);
      }
    }
    
    this.waterGraphics.strokePath();
  }

  private renderWaterParticles(): void {
    this.waterLevel.particles.forEach(particle => {
      const alpha = particle.opacity * this.waterLevel.transparency;
      
      if (particle.type === 'bubble') {
        this.waterGraphics.fillStyle(0x87CEEB, alpha);
        this.waterGraphics.fillCircle(particle.x, particle.y, particle.size);
      } else if (particle.type === 'splash') {
        this.waterGraphics.fillStyle(0xFFFFFF, alpha * 0.8);
        this.waterGraphics.fillEllipse(particle.x, particle.y, particle.size * 2, particle.size);
      }
    });
  }

  public setRiseRate(rate: number): void {
    this.waterLevel.riseRate = rate;
  }

  public getCurrentLevel(): number {
    return this.waterLevel.currentLevel;
  }

  public getVisualHeight(): number {
    return this.waterLevel.visualHeight;
  }

  public lowerWater(amount: number): void {
    this.waterLevel.currentLevel = Math.max(0, this.waterLevel.currentLevel - amount);
    this.waterLevel.visualHeight = this.waterLevel.currentLevel * this.gameHeight;
  }

  public raiseWater(amount: number): void {
    this.waterLevel.currentLevel = Math.min(this.waterLevel.maxLevel, 
      this.waterLevel.currentLevel + amount);
    this.waterLevel.visualHeight = this.waterLevel.currentLevel * this.gameHeight;
  }

  public createSplash(x: number, y: number, intensity: number = 1.0): void {
    // Create splash particles at specific location
    for (let i = 0; i < 5 * intensity; i++) {
      const particle: WaterParticle = {
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        velocityX: (Math.random() - 0.5) * 60 * intensity,
        velocityY: -Math.random() * 40 * intensity,
        size: 1 + Math.random() * 3,
        opacity: 0.9,
        type: 'splash'
      };
      
      this.waterLevel.particles.push(particle);
    }
  }

  public addStateListener(listener: (level: number, isGameOver: boolean) => void): void {
    this.listeners.push(listener);
  }

  public removeStateListener(listener: (level: number, isGameOver: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(level: number, isGameOver: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(level, isGameOver);
      } catch (error) {
        console.error('Error in water level listener:', error);
      }
    });
  }

  public reset(): void {
    this.waterLevel.currentLevel = 0;
    this.waterLevel.visualHeight = 0;
    this.waterLevel.particles = [];
    this.waterGraphics.clear();
    
    // Reset grace period
    this.gracePeriodActive = true;
    this.gracePeriodStartTime = Date.now();
    this.gracePeriodElapsed = 0;
  }

  // Grace period management methods
  public setGracePeriod(gracePeriodMs: number): void {
    this.gracePeriodMs = gracePeriodMs;
  }

  public getGracePeriodRemaining(): number {
    if (!this.gracePeriodActive) return 0;
    return Math.max(0, this.gracePeriodMs - this.gracePeriodElapsed);
  }

  public isGracePeriodActive(): boolean {
    return this.gracePeriodActive;
  }

  public getGracePeriodElapsed(): number {
    return this.gracePeriodElapsed;
  }

  public destroy(): void {
    this.waterGraphics.destroy();
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    this.listeners = [];
  }
}