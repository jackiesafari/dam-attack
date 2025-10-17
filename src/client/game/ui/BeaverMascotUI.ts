import * as Phaser from 'phaser';

export interface BeaverMascotConfig {
  size: number;
  neonStyle: boolean;
  animationEnabled: boolean;
  position: { x: number; y: number };
}

export class BeaverMascotUI {
  private scene: Phaser.Scene;
  private config: BeaverMascotConfig;
  private container: Phaser.GameObjects.Container;
  private beaverSprite: Phaser.GameObjects.Image | null = null;
  private beaverText: Phaser.GameObjects.Text | null = null;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;
  private idleAnimation: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: BeaverMascotConfig) {
    this.scene = scene;
    this.config = config;
    this.container = scene.add.container(config.position.x, config.position.y);
  }

  public create(): void {
    this.createBeaverDisplay();
    
    if (this.config.animationEnabled) {
      this.startIdleAnimation();
    }
  }

  private createBeaverDisplay(): void {
    // Try to load beaver image first, fallback to text representation
    if (this.scene.textures.exists('beaverlogo')) {
      this.createBeaverSprite();
    } else {
      this.createBeaverText();
    }
    
    if (this.config.neonStyle) {
      this.createNeonGlow();
    }
  }

  private createBeaverSprite(): void {
    this.beaverSprite = this.scene.add.image(0, 0, 'beaverlogo');
    
    // Scale to fit the specified size
    const scale = this.config.size / Math.max(this.beaverSprite.width, this.beaverSprite.height);
    this.beaverSprite.setScale(scale);
    
    // Apply retro filter effect if neon style is enabled
    if (this.config.neonStyle) {
      this.beaverSprite.setTint(0x00FFFF); // Neon cyan tint
    }
    
    this.container.add(this.beaverSprite);
  }

  private createBeaverText(): void {
    // Fallback to emoji/text representation
    const beaverEmoji = '🦫';
    
    this.beaverText = this.scene.add.text(0, 0, beaverEmoji, {
      fontFamily: 'Arial',
      fontSize: `${this.config.size * 0.8}px`,
      color: this.config.neonStyle ? '#00FFFF' : '#8B4513',
      stroke: this.config.neonStyle ? '#000000' : '#654321',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    this.container.add(this.beaverText);
  }

  private createNeonGlow(): void {
    this.glowEffect = this.scene.add.graphics();
    
    // Create neon glow effect around beaver
    const glowRadius = this.config.size / 2 + 10;
    
    // Outer glow
    this.glowEffect.fillStyle(0x00FFFF, 0.1);
    this.glowEffect.fillCircle(0, 0, glowRadius + 8);
    
    // Inner glow
    this.glowEffect.fillStyle(0x00FFFF, 0.2);
    this.glowEffect.fillCircle(0, 0, glowRadius + 4);
    
    // Core glow
    this.glowEffect.fillStyle(0x00FFFF, 0.3);
    this.glowEffect.fillCircle(0, 0, glowRadius);
    
    // Add glow behind beaver
    this.container.add(this.glowEffect);
    
    // Move beaver to front
    if (this.beaverSprite) {
      this.container.bringToTop(this.beaverSprite);
    }
    if (this.beaverText) {
      this.container.bringToTop(this.beaverText);
    }
  }

  private startIdleAnimation(): void {
    // Gentle floating animation for the beaver
    this.idleAnimation = this.scene.tweens.add({
      targets: this.container,
      y: this.config.position.y - 5,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Add subtle rotation if neon style is enabled
    if (this.config.neonStyle) {
      this.scene.tweens.add({
        targets: this.container,
        rotation: 0.1,
        duration: 3000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
    
    // Pulsing glow effect for neon style
    if (this.config.neonStyle && this.glowEffect) {
      this.scene.tweens.add({
        targets: this.glowEffect,
        alpha: 0.5,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
  }

  public playCheerAnimation(): void {
    // Play a celebration animation when player does well
    if (this.idleAnimation) {
      this.idleAnimation.pause();
    }
    
    const cheerTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.2,
      scaleY: 1.2,
      rotation: 0.2,
      duration: 200,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Return to idle animation
        this.container.setScale(1);
        this.container.setRotation(0);
        if (this.idleAnimation) {
          this.idleAnimation.resume();
        }
      }
    });
  }

  public playWorryAnimation(): void {
    // Play a worried animation when player is struggling
    if (this.idleAnimation) {
      this.idleAnimation.pause();
    }
    
    const worryTween = this.scene.tweens.add({
      targets: this.container,
      x: this.config.position.x - 3,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        // Return to original position and idle animation
        this.container.setPosition(this.config.position.x, this.config.position.y);
        if (this.idleAnimation) {
          this.idleAnimation.resume();
        }
      }
    });
  }

  public updatePosition(x: number, y: number): void {
    this.config.position = { x, y };
    this.container.setPosition(x, y);
    
    // Update idle animation target if it exists
    if (this.idleAnimation) {
      this.idleAnimation.updateTo('y', y - 5, true);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public destroy(): void {
    if (this.idleAnimation) {
      this.idleAnimation.destroy();
      this.idleAnimation = null;
    }
    
    this.container.destroy();
  }
}