import { Achievement } from '../types/GameTypes';

export interface NotificationConfig {
  duration: number;
  fadeInTime: number;
  fadeOutTime: number;
  maxNotifications: number;
  spacing: number;
}

export class AchievementNotificationUI {
  private scene: Phaser.Scene;
  private notifications: Phaser.GameObjects.Container[] = [];
  private config: NotificationConfig;

  constructor(scene: Phaser.Scene, config?: Partial<NotificationConfig>) {
    this.scene = scene;
    this.config = {
      duration: 4000,
      fadeInTime: 500,
      fadeOutTime: 500,
      maxNotifications: 3,
      spacing: 120,
      ...config
    };
  }

  /**
   * Show achievement unlock notification
   */
  public showAchievementUnlock(achievement: Achievement): void {
    // Remove oldest notification if we're at the limit
    if (this.notifications.length >= this.config.maxNotifications) {
      this.removeNotification(this.notifications[0]);
    }

    const notification = this.createNotification(achievement);
    this.notifications.push(notification);
    this.positionNotifications();
    this.animateIn(notification);

    // Auto-remove after duration
    this.scene.time.delayedCall(this.config.duration, () => {
      this.removeNotification(notification);
    });
  }

  /**
   * Create notification container
   */
  private createNotification(achievement: Achievement): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    
    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.lineStyle(2, this.getRarityColor(achievement.rarity), 1);
    bg.fillRoundedRect(-200, -40, 400, 80, 10);
    bg.strokeRoundedRect(-200, -40, 400, 80, 10);
    container.add(bg);

    // Achievement icon
    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(this.getRarityColor(achievement.rarity), 0.3);
    iconBg.fillCircle(-150, 0, 25);
    container.add(iconBg);

    const iconText = this.scene.add.text(-150, 0, achievement.icon, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(iconText);

    // Achievement unlocked text
    const unlockedText = this.scene.add.text(-110, -15, 'ACHIEVEMENT UNLOCKED!', {
      fontSize: '12px',
      color: this.getRarityColorHex(achievement.rarity),
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(unlockedText);

    // Achievement name
    const nameText = this.scene.add.text(-110, 5, achievement.name, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(nameText);

    // Achievement description
    const descText = this.scene.add.text(-110, 20, achievement.description, {
      fontSize: '11px',
      color: '#cccccc',
      wordWrap: { width: 280 }
    }).setOrigin(0, 0.5);
    container.add(descText);

    // Points reward
    if (achievement.reward?.points) {
      const pointsText = this.scene.add.text(180, 0, `+${achievement.reward.points}`, {
        fontSize: '14px',
        color: '#ffdd44',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      container.add(pointsText);
    }

    // Rarity indicator
    const rarityText = this.scene.add.text(180, -20, achievement.rarity.toUpperCase(), {
      fontSize: '10px',
      color: this.getRarityColorHex(achievement.rarity),
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    container.add(rarityText);

    // Position at top right of screen initially (off-screen)
    const camera = this.scene.cameras.main;
    container.setPosition(camera.width + 200, 60);
    container.setDepth(1000);

    return container;
  }

  /**
   * Get color for achievement rarity
   */
  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'common': return 0x9e9e9e;
      case 'uncommon': return 0x4caf50;
      case 'rare': return 0x2196f3;
      case 'epic': return 0x9c27b0;
      case 'legendary': return 0xff9800;
      default: return 0xffffff;
    }
  }

  /**
   * Get hex color string for achievement rarity
   */
  private getRarityColorHex(rarity: string): string {
    switch (rarity) {
      case 'common': return '#9e9e9e';
      case 'uncommon': return '#4caf50';
      case 'rare': return '#2196f3';
      case 'epic': return '#9c27b0';
      case 'legendary': return '#ff9800';
      default: return '#ffffff';
    }
  }

  /**
   * Animate notification in from right side
   */
  private animateIn(notification: Phaser.GameObjects.Container): void {
    const camera = this.scene.cameras.main;
    const targetX = camera.width - 220;

    this.scene.tweens.add({
      targets: notification,
      x: targetX,
      duration: this.config.fadeInTime,
      ease: 'Back.easeOut'
    });

    // Add subtle bounce effect
    this.scene.tweens.add({
      targets: notification,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Remove notification with animation
   */
  private removeNotification(notification: Phaser.GameObjects.Container): void {
    const index = this.notifications.indexOf(notification);
    if (index === -1) return;

    this.notifications.splice(index, 1);

    // Animate out
    const camera = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: notification,
      x: camera.width + 200,
      alpha: 0,
      duration: this.config.fadeOutTime,
      ease: 'Back.easeIn',
      onComplete: () => {
        notification.destroy();
        this.positionNotifications();
      }
    });
  }

  /**
   * Reposition all notifications
   */
  private positionNotifications(): void {
    this.notifications.forEach((notification, index) => {
      const targetY = 60 + (index * this.config.spacing);
      
      this.scene.tweens.add({
        targets: notification,
        y: targetY,
        duration: 300,
        ease: 'Sine.easeOut'
      });
    });
  }

  /**
   * Clear all notifications
   */
  public clearAll(): void {
    this.notifications.forEach(notification => {
      notification.destroy();
    });
    this.notifications = [];
  }

  /**
   * Show celebration effect for special achievements
   */
  public showCelebration(achievement: Achievement): void {
    if (achievement.rarity === 'epic' || achievement.rarity === 'legendary') {
      this.createParticleEffect(achievement);
    }
  }

  /**
   * Create particle effect for special achievements
   */
  private createParticleEffect(achievement: Achievement): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;

    // Create particle emitter
    const particles = this.scene.add.particles(centerX, centerY, 'particle', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      tint: this.getRarityColor(achievement.rarity)
    });

    // Remove particles after effect
    this.scene.time.delayedCall(2000, () => {
      particles.destroy();
    });

    // Screen flash for legendary achievements
    if (achievement.rarity === 'legendary') {
      const flash = this.scene.add.graphics();
      flash.fillStyle(0xffffff, 0.3);
      flash.fillRect(0, 0, camera.width, camera.height);
      flash.setDepth(999);

      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy()
      });
    }
  }

  /**
   * Update notification positions on screen resize
   */
  public updateLayout(): void {
    this.positionNotifications();
  }

  /**
   * Destroy all notifications and cleanup
   */
  public destroy(): void {
    this.clearAll();
  }
}