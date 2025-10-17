import * as Phaser from 'phaser';

export interface ResponsiveHeaderConfig {
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  titleColor: string;
  subtitleColor: string;
  titleFontSize: string;
  subtitleFontSize: string;
  neonStyle: boolean;
  compact: boolean;
}

export class ResponsiveHeaderUI {
  private scene: Phaser.Scene;
  private config: ResponsiveHeaderConfig;
  private container: Phaser.GameObjects.Container;
  
  private titleText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private glowEffect: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<ResponsiveHeaderConfig>) {
    this.scene = scene;
    
    // Default configuration
    this.config = {
      width: 800,
      height: 80,
      title: 'DAM ATTACK',
      subtitle: 'Build the beaver\'s dam!',
      titleColor: '#00FFFF',
      subtitleColor: '#FFFF00',
      titleFontSize: '32px',
      subtitleFontSize: '14px',
      neonStyle: true,
      compact: false,
      ...config
    };
    
    this.container = this.scene.add.container(0, 0);
    this.createHeader();
  }

  private createHeader(): void {
    this.createTitle();
    if (this.config.subtitle && !this.config.compact) {
      this.createSubtitle();
    }
  }

  private createTitle(): void {
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Black',
      fontSize: this.config.titleFontSize,
      color: this.config.titleColor,
      stroke: this.config.neonStyle ? '#FF00FF' : '#000000',
      strokeThickness: this.config.neonStyle ? 4 : 2
    };
    
    this.titleText = this.scene.add.text(0, this.config.compact ? 0 : -10, this.config.title, titleStyle);
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);
    
    // Add neon glow effect
    if (this.config.neonStyle) {
      this.glowEffect = this.scene.add.text(0, this.config.compact ? 0 : -10, this.config.title, {
        fontFamily: 'Arial Black',
        fontSize: this.config.titleFontSize,
        color: '#FFFFFF',
        stroke: '#00FFFF',
        strokeThickness: 8
      });
      this.glowEffect.setOrigin(0.5);
      this.glowEffect.setAlpha(0.3);
      this.container.add(this.glowEffect);
      
      // Move title to front
      this.container.bringToTop(this.titleText);
    }
  }

  private createSubtitle(): void {
    if (!this.config.subtitle) return;
    
    const subtitleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Bold',
      fontSize: this.config.subtitleFontSize,
      color: this.config.subtitleColor,
      stroke: this.config.neonStyle ? '#FF00FF' : '#000000',
      strokeThickness: this.config.neonStyle ? 1 : 1
    };
    
    this.subtitleText = this.scene.add.text(0, 25, this.config.subtitle, subtitleStyle);
    this.subtitleText.setOrigin(0.5);
    this.container.add(this.subtitleText);
  }

  /**
   * Update header configuration for different screen sizes
   */
  public updateForScreenSize(screenWidth: number, screenHeight: number): void {
    const isMobile = screenWidth < 768;
    const isSmallMobile = screenWidth < 480;
    
    // Adjust font sizes based on screen size
    let titleFontSize: string;
    let subtitleFontSize: string;
    
    if (isSmallMobile) {
      titleFontSize = '24px';
      subtitleFontSize = '12px';
      this.config.compact = true;
    } else if (isMobile) {
      titleFontSize = '28px';
      subtitleFontSize = '13px';
      this.config.compact = false;
    } else {
      titleFontSize = '32px';
      subtitleFontSize = '14px';
      this.config.compact = false;
    }
    
    // Update title font size
    if (this.titleText) {
      this.titleText.setFontSize(titleFontSize);
      if (this.glowEffect) {
        this.glowEffect.setFontSize(titleFontSize);
      }
    }
    
    // Update subtitle
    if (this.subtitleText) {
      if (this.config.compact) {
        // Hide subtitle on very small screens
        this.subtitleText.setVisible(false);
      } else {
        this.subtitleText.setVisible(true);
        this.subtitleText.setFontSize(subtitleFontSize);
        
        // Adjust subtitle text for mobile
        if (isMobile) {
          this.subtitleText.setText('Build the dam!');
        } else {
          this.subtitleText.setText(this.config.subtitle || '');
        }
      }
    }
    
    // Adjust positioning for compact mode
    if (this.config.compact) {
      this.titleText.setY(0);
      if (this.glowEffect) {
        this.glowEffect.setY(0);
      }
    } else {
      this.titleText.setY(-10);
      if (this.glowEffect) {
        this.glowEffect.setY(-10);
      }
    }
  }

  /**
   * Play title animation for game events
   */
  public playTitleFlash(): void {
    if (this.titleText) {
      // Flash animation for game events
      this.scene.tweens.add({
        targets: this.titleText,
        alpha: 0.5,
        duration: 200,
        ease: 'Power2',
        yoyo: true,
        repeat: 1
      });
      
      if (this.glowEffect) {
        this.scene.tweens.add({
          targets: this.glowEffect,
          alpha: 0.6,
          duration: 200,
          ease: 'Power2',
          yoyo: true,
          repeat: 1
        });
      }
    }
  }

  /**
   * Set visibility of the header
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Get the container for positioning
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Update header configuration
   */
  public updateConfig(newConfig: Partial<ResponsiveHeaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate header with new config
    this.container.removeAll(true);
    this.createHeader();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.container.destroy();
  }
}