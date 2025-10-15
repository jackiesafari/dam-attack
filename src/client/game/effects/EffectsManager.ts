import * as Phaser from 'phaser';
import { ThemeManager } from '../themes/ThemeManager';

export interface ParticleConfig {
  count: number;
  lifespan: number;
  speed: { min: number; max: number; };
  scale: { start: number; end: number; };
  alpha: { start: number; end: number; };
  color: string[];
  gravity?: number;
  bounce?: number;
}

export interface ScreenEffectConfig {
  intensity: number;
  duration: number;
  color?: string;
  easing?: string;
}

export interface CelebrationConfig {
  type: 'tetris' | 'line-clear' | 'level-up' | 'high-score';
  intensity: 'low' | 'medium' | 'high';
  duration?: number;
}

export class EffectsManager {
  private scene: Phaser.Scene;
  private themeManager: ThemeManager;
  private effectsContainer: Phaser.GameObjects.Container;
  private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private activeEffects: Map<string, Phaser.Tweens.Tween[]> = new Map();

  constructor(scene: Phaser.Scene, themeManager: ThemeManager) {
    this.scene = scene;
    this.themeManager = themeManager;
    
    // Create main effects container
    this.effectsContainer = this.scene.add.container(0, 0);
    this.effectsContainer.setDepth(1000); // High depth for effects
    
    this.initializeParticleTextures();
  }

  /**
   * Initialize particle textures for effects
   */
  private initializeParticleTextures(): void {
    // Create wood chip texture
    this.createWoodChipTexture();
    
    // Create leaf texture
    this.createLeafTexture();
    
    // Create sparkle texture
    this.createSparkleTexture();
    
    // Create water droplet texture
    this.createWaterDropletTexture();
  }

  /**
   * Create wood chip particle texture
   */
  private createWoodChipTexture(): void {
    const graphics = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    
    graphics.fillStyle(this.themeManager.hexToNumber(theme.colors.wood[0]));
    graphics.fillEllipse(4, 3, 8, 6);
    
    graphics.generateTexture('wood-chip', 8, 6);
    graphics.destroy();
  }

  /**
   * Create leaf particle texture
   */
  private createLeafTexture(): void {
    const graphics = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    
    graphics.fillStyle(this.themeManager.hexToNumber(theme.colors.leaves[0]));
    graphics.fillEllipse(3, 4, 6, 8);
    
    // Add leaf vein
    graphics.lineStyle(1, this.themeManager.hexToNumber(this.darkenColor(theme.colors.leaves[0], 0.3)));
    graphics.moveTo(3, 1);
    graphics.lineTo(3, 7);
    graphics.strokePath();
    
    graphics.generateTexture('leaf-particle', 6, 8);
    graphics.destroy();
  }

  /**
   * Create sparkle particle texture
   */
  private createSparkleTexture(): void {
    const graphics = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    
    graphics.fillStyle(this.themeManager.hexToNumber(theme.colors.neon.yellow));
    graphics.fillStar(4, 4, 4, 2, 4);
    
    graphics.generateTexture('sparkle-particle', 8, 8);
    graphics.destroy();
  }

  /**
   * Create water droplet particle texture
   */
  private createWaterDropletTexture(): void {
    const graphics = this.scene.add.graphics();
    const theme = this.themeManager.getCurrentTheme();
    
    graphics.fillStyle(this.themeManager.hexToNumber(theme.colors.water));
    graphics.fillCircle(3, 3, 3);
    
    // Add highlight
    graphics.fillStyle(this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.4)));
    graphics.fillCircle(2, 2, 1);
    
    graphics.generateTexture('water-droplet', 6, 6);
    graphics.destroy();
  }

  /**
   * Create wood impact particles when pieces are placed
   */
  public createWoodImpactEffect(x: number, y: number): void {
    const config: ParticleConfig = {
      count: 8,
      lifespan: 800,
      speed: { min: 20, max: 60 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 1, end: 0 },
      color: this.themeManager.getCurrentTheme().colors.wood,
      gravity: 100,
      bounce: 0.3
    };

    this.createParticleEffect('wood-chip', x, y, config, 'wood-impact');
  }

  /**
   * Create line clear celebration effect
   */
  public createLineClearEffect(
    lines: number[], 
    boardWidth: number, 
    blockSize: number,
    isTeris: boolean = false
  ): void {
    const theme = this.themeManager.getCurrentTheme();
    
    lines.forEach((lineY, index) => {
      const y = lineY * blockSize + blockSize / 2;
      
      // Wood breaking particles across the line
      for (let x = 0; x < boardWidth; x++) {
        const particleX = x * blockSize + blockSize / 2;
        
        const config: ParticleConfig = {
          count: isTeris ? 6 : 4,
          lifespan: 1000,
          speed: { min: 30, max: 80 },
          scale: { start: 1, end: 0.3 },
          alpha: { start: 1, end: 0 },
          color: theme.colors.wood,
          gravity: 80
        };

        setTimeout(() => {
          this.createParticleEffect('wood-chip', particleX, y, config, `line-clear-${lineY}-${x}`);
        }, index * 100);
      }
      
      // Add leaf particles for variety
      if (Math.random() > 0.5) {
        const leafConfig: ParticleConfig = {
          count: 3,
          lifespan: 1500,
          speed: { min: 10, max: 40 },
          scale: { start: 0.8, end: 0.4 },
          alpha: { start: 0.8, end: 0 },
          color: theme.colors.leaves,
          gravity: 20
        };

        setTimeout(() => {
          this.createParticleEffect('leaf-particle', 
            Math.random() * boardWidth * blockSize, 
            y, 
            leafConfig, 
            `leaf-clear-${lineY}`
          );
        }, index * 150);
      }
    });

    // Special Tetris celebration
    if (isTeris) {
      this.createTetrisCelebration(boardWidth * blockSize / 2, lines[0] * blockSize);
    }
  }

  /**
   * Create special Tetris celebration effect
   */
  private createTetrisCelebration(centerX: number, centerY: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Sparkle explosion
    const sparkleConfig: ParticleConfig = {
      count: 20,
      lifespan: 2000,
      speed: { min: 50, max: 120 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      color: [theme.colors.neon.yellow, theme.colors.neon.cyan, theme.colors.neon.magenta],
      gravity: 0
    };

    this.createParticleEffect('sparkle-particle', centerX, centerY, sparkleConfig, 'tetris-celebration');

    // Screen flash effect
    this.createScreenFlash({
      intensity: 0.3,
      duration: 200,
      color: theme.colors.neon.yellow
    });

    // Screen shake
    this.createScreenShake({
      intensity: 0.02,
      duration: 300
    });
  }

  /**
   * Create level up celebration
   */
  public createLevelUpCelebration(centerX: number, centerY: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Upward sparkle burst
    const config: ParticleConfig = {
      count: 15,
      lifespan: 1500,
      speed: { min: 40, max: 80 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
      color: [theme.colors.neon.cyan, theme.colors.accent],
      gravity: -20 // Negative gravity for upward movement
    };

    this.createParticleEffect('sparkle-particle', centerX, centerY, config, 'level-up');

    // Gentle screen pulse
    this.createScreenPulse({
      intensity: 0.1,
      duration: 500,
      color: theme.colors.neon.cyan
    });
  }

  /**
   * Create piece rotation effect
   */
  public createRotationEffect(x: number, y: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Small wood dust particles
    const config: ParticleConfig = {
      count: 4,
      lifespan: 400,
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      color: theme.colors.wood.slice(0, 2),
      gravity: 50
    };

    this.createParticleEffect('wood-chip', x, y, config, `rotation-${Date.now()}`);
  }

  /**
   * Create water splash effect (for dam theme)
   */
  public createWaterSplashEffect(x: number, y: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    const config: ParticleConfig = {
      count: 10,
      lifespan: 600,
      speed: { min: 20, max: 50 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      color: [theme.colors.water],
      gravity: 150,
      bounce: 0.4
    };

    this.createParticleEffect('water-droplet', x, y, config, `splash-${Date.now()}`);
  }

  /**
   * Create generic particle effect
   */
  private createParticleEffect(
    texture: string,
    x: number,
    y: number,
    config: ParticleConfig,
    effectId: string
  ): void {
    // Create particle emitter
    const emitter = this.scene.add.particles(x, y, texture, {
      lifespan: config.lifespan,
      speed: config.speed,
      scale: config.scale,
      alpha: config.alpha,
      quantity: config.count,
      gravityY: config.gravity || 0,
      bounce: config.bounce || 0,
      tint: config.color.map(color => this.themeManager.hexToNumber(color)),
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Circle(0, 0, 10)
      }
    });

    // Add to effects container
    this.effectsContainer.add(emitter);

    // Store emitter reference
    this.particleEmitters.set(effectId, emitter);

    // Auto-cleanup after effect duration
    this.scene.time.delayedCall(config.lifespan + 100, () => {
      this.stopParticleEffect(effectId);
    });
  }

  /**
   * Stop a specific particle effect
   */
  public stopParticleEffect(effectId: string): void {
    const emitter = this.particleEmitters.get(effectId);
    if (emitter) {
      emitter.destroy();
      this.particleEmitters.delete(effectId);
    }
  }

  /**
   * Create screen shake effect
   */
  public createScreenShake(config: ScreenEffectConfig): void {
    this.scene.cameras.main.shake(config.duration, config.intensity);
  }

  /**
   * Create screen flash effect
   */
  public createScreenFlash(config: ScreenEffectConfig): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(this.themeManager.hexToNumber(config.color || '#FFFFFF'));
    flash.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    flash.setAlpha(config.intensity);
    flash.setDepth(2000); // Very high depth
    
    this.effectsContainer.add(flash);

    // Fade out flash
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: config.duration,
      ease: config.easing || 'Power2.easeOut',
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  /**
   * Create screen pulse effect
   */
  public createScreenPulse(config: ScreenEffectConfig): void {
    const pulse = this.scene.add.graphics();
    pulse.fillStyle(this.themeManager.hexToNumber(config.color || '#FFFFFF'));
    pulse.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    pulse.setAlpha(0);
    pulse.setDepth(1999);
    
    this.effectsContainer.add(pulse);

    // Pulse animation
    this.scene.tweens.add({
      targets: pulse,
      alpha: config.intensity,
      duration: config.duration / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: () => {
        pulse.destroy();
      }
    });
  }

  /**
   * Create celebration effect based on type
   */
  public createCelebration(config: CelebrationConfig, x: number, y: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    switch (config.type) {
      case 'tetris':
        this.createTetrisCelebration(x, y);
        break;
        
      case 'line-clear':
        // Simple line clear celebration
        const sparkleConfig: ParticleConfig = {
          count: 8,
          lifespan: 1000,
          speed: { min: 30, max: 60 },
          scale: { start: 0.8, end: 0.2 },
          alpha: { start: 1, end: 0 },
          color: [theme.colors.accent, theme.colors.neon.yellow],
          gravity: 0
        };
        this.createParticleEffect('sparkle-particle', x, y, sparkleConfig, `celebration-${Date.now()}`);
        break;
        
      case 'level-up':
        this.createLevelUpCelebration(x, y);
        break;
        
      case 'high-score':
        // Epic high score celebration
        const epicConfig: ParticleConfig = {
          count: 30,
          lifespan: 3000,
          speed: { min: 60, max: 150 },
          scale: { start: 1.5, end: 0 },
          alpha: { start: 1, end: 0 },
          color: Object.values(theme.colors.neon),
          gravity: -10
        };
        this.createParticleEffect('sparkle-particle', x, y, epicConfig, 'high-score-celebration');
        
        // Multiple screen effects
        this.createScreenFlash({ intensity: 0.4, duration: 300, color: theme.colors.neon.magenta });
        this.createScreenShake({ intensity: 0.03, duration: 500 });
        break;
    }
  }

  /**
   * Create ambient water effects for dam theme
   */
  public createAmbientWaterEffects(boardWidth: number, boardHeight: number, blockSize: number): void {
    if (this.themeManager.getCurrentTheme().name !== 'retro-dam') return;

    const waterY = boardHeight * blockSize * 0.8; // Water level
    
    // Periodic water bubbles
    this.scene.time.addEvent({
      delay: 2000 + Math.random() * 3000,
      callback: () => {
        const bubbleX = Math.random() * boardWidth * blockSize;
        this.createWaterSplashEffect(bubbleX, waterY);
      },
      loop: true
    });
  }

  /**
   * Get effects container for external positioning
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.effectsContainer;
  }

  /**
   * Stop all active effects
   */
  public stopAllEffects(): void {
    // Stop all particle emitters
    this.particleEmitters.forEach(emitter => emitter.destroy());
    this.particleEmitters.clear();
    
    // Stop all tweens
    this.activeEffects.forEach(tweens => {
      tweens.forEach(tween => tween.stop());
    });
    this.activeEffects.clear();
    
    // Clear effects container
    this.effectsContainer.removeAll(true);
  }

  /**
   * Utility: Darken color
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0)).toString(16).slice(1);
  }

  /**
   * Utility: Lighten color
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R : 255) * 0x10000 +
      (G < 255 ? G : 255) * 0x100 + (B < 255 ? B : 255)).toString(16).slice(1);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopAllEffects();
    this.effectsContainer.destroy();
  }
}