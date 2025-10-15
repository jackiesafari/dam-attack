import * as Phaser from 'phaser';
import { GamePiece, PieceType } from '../types/GameTypes';
import { ThemeManager } from '../themes/ThemeManager';
import { TextureGenerator } from '../themes/TextureGenerator';

export interface RenderConfig {
  blockSize: number;
  showGrid: boolean;
  showShadows: boolean;
  animationSpeed: number;
  enableParticles: boolean;
}

export interface PieceRenderData {
  piece: GamePiece;
  x: number;
  y: number;
  alpha: number;
  scale: number;
  rotation: number;
  tint?: number;
}

export class PieceRenderer {
  private scene: Phaser.Scene;
  private themeManager: ThemeManager;
  private textureGenerator: TextureGenerator;
  private config: RenderConfig;
  private pieceContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private animationTweens: Map<string, Phaser.Tweens.Tween> = new Map();

  constructor(scene: Phaser.Scene, themeManager: ThemeManager, config: Partial<RenderConfig> = {}) {
    this.scene = scene;
    this.themeManager = themeManager;
    this.textureGenerator = new TextureGenerator(scene, themeManager);
    
    this.config = {
      blockSize: 32,
      showGrid: true,
      showShadows: true,
      animationSpeed: 1.0,
      enableParticles: true,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the renderer
   */
  private initialize(): void {
    // Generate textures for current theme
    this.textureGenerator.generatePieceTextures(this.config.blockSize);
    
    // Listen for theme changes
    this.scene.events.on('theme-changed', () => {
      this.textureGenerator.clearCache();
      this.textureGenerator.generatePieceTextures(this.config.blockSize);
      this.refreshAllPieces();
    });
  }

  /**
   * Render a game piece with log styling
   */
  public renderPiece(
    pieceData: PieceRenderData,
    containerId: string = 'default'
  ): Phaser.GameObjects.Container {
    // Get or create container for this piece
    let container = this.pieceContainers.get(containerId);
    if (!container) {
      container = this.scene.add.container(0, 0);
      this.pieceContainers.set(containerId, container);
    } else {
      container.removeAll(true);
    }

    const { piece, x, y, alpha, scale, rotation, tint } = pieceData;
    const theme = this.themeManager.getCurrentTheme();
    
    // Set container properties
    container.setPosition(x, y);
    container.setAlpha(alpha);
    container.setScale(scale);
    container.setRotation(rotation);

    // Render each block of the piece
    piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          const blockX = colIndex * this.config.blockSize;
          const blockY = rowIndex * this.config.blockSize;
          
          const block = this.createLogBlock(
            blockX,
            blockY,
            piece.type || PieceType.I,
            tint
          );
          
          container.add(block);
        }
      });
    });

    // Add shadow if enabled
    if (this.config.showShadows) {
      this.addPieceShadow(container, piece);
    }

    return container;
  }

  /**
   * Create a single log block with theme styling
   */
  private createLogBlock(
    x: number,
    y: number,
    pieceType: PieceType,
    tint?: number
  ): Phaser.GameObjects.Container {
    const blockContainer = this.scene.add.container(x, y);
    const theme = this.themeManager.getCurrentTheme();
    const pieceColors = this.themeManager.getPieceColors(pieceType);
    const hasLeaves = pieceType === PieceType.S || pieceType === PieceType.Z;

    // Main log body
    const logBody = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(pieceColors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(pieceColors[0], 0.15));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(pieceColors[0], 0.15));

    // Create wood gradient
    logBody.fillGradientStyle(lightColor, lightColor, baseColor, darkColor);
    logBody.fillRoundedRect(2, 2, this.config.blockSize - 4, this.config.blockSize - 4, 4);

    // Add wood grain texture
    this.addWoodGrainToBlock(logBody, pieceColors[0]);

    // Add bark border
    logBody.lineStyle(2, darkColor, 0.8);
    logBody.strokeRoundedRect(1, 1, this.config.blockSize - 2, this.config.blockSize - 2, 4);

    // Apply tint if specified
    if (tint !== undefined) {
      logBody.setTint(tint);
    }

    blockContainer.add(logBody);

    // Add leaves for branch pieces
    if (hasLeaves) {
      const leaves = this.createLeafCluster();
      blockContainer.add(leaves);
    }

    // Add log end rings for I-pieces (horizontal logs)
    if (pieceType === PieceType.I) {
      const rings = this.createLogEndRings(pieceColors[0]);
      blockContainer.add(rings);
    }

    // Add subtle glow effect for retro theme
    if (theme.name === 'retro-dam') {
      this.addRetroGlow(blockContainer, pieceColors[0]);
    }

    return blockContainer;
  }

  /**
   * Add wood grain texture to a block
   */
  private addWoodGrainToBlock(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.1));
    
    graphics.lineStyle(1, grainColor, 0.3);
    
    // Horizontal grain lines
    for (let i = 0; i < 3; i++) {
      const y = 8 + (this.config.blockSize - 16) * (i / 2);
      graphics.moveTo(4, y);
      
      // Create wavy grain line
      for (let x = 4; x < this.config.blockSize - 4; x += 2) {
        const waveY = y + Math.sin((x / this.config.blockSize) * Math.PI * 2) * 0.5;
        graphics.lineTo(x, waveY);
      }
    }
    
    graphics.strokePath();

    // Add small knots
    graphics.fillStyle(this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2)));
    const knotX = 8 + Math.random() * (this.config.blockSize - 16);
    const knotY = 8 + Math.random() * (this.config.blockSize - 16);
    graphics.fillCircle(knotX, knotY, 1.5);
  }

  /**
   * Create leaf cluster for branch pieces
   */
  private createLeafCluster(): Phaser.GameObjects.Container {
    const leafContainer = this.scene.add.container(0, 0);
    const leafColors = this.themeManager.getCurrentTheme().colors.leaves;

    // Add 3-4 small leaves
    for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
      const leaf = this.scene.add.graphics();
      const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      
      leaf.fillStyle(this.themeManager.hexToNumber(leafColor));
      
      const leafX = 6 + Math.random() * (this.config.blockSize - 12);
      const leafY = 6 + Math.random() * (this.config.blockSize - 12);
      
      // Draw leaf shape
      leaf.fillEllipse(leafX, leafY, 3, 5);
      
      // Add leaf vein
      leaf.lineStyle(0.5, this.themeManager.hexToNumber(this.darkenColor(leafColor, 0.2)), 0.8);
      leaf.moveTo(leafX, leafY - 2);
      leaf.lineTo(leafX, leafY + 2);
      leaf.strokePath();
      
      leafContainer.add(leaf);
    }

    return leafContainer;
  }

  /**
   * Create log end rings for I-pieces
   */
  private createLogEndRings(baseColor: string): Phaser.GameObjects.Graphics {
    const rings = this.scene.add.graphics();
    const ringColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2));
    
    rings.lineStyle(1, ringColor, 0.5);
    
    const centerX = this.config.blockSize / 2;
    const centerY = this.config.blockSize / 2;
    
    // Draw concentric rings
    for (let i = 1; i <= 2; i++) {
      const radius = (this.config.blockSize / 6) * i;
      rings.strokeCircle(centerX, centerY, radius);
    }

    return rings;
  }

  /**
   * Add retro glow effect
   */
  private addRetroGlow(container: Phaser.GameObjects.Container, baseColor: string): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Create subtle glow outline
    const glow = this.scene.add.graphics();
    glow.lineStyle(1, this.themeManager.hexToNumber(theme.colors.neon.cyan), 0.3);
    glow.strokeRoundedRect(0, 0, this.config.blockSize, this.config.blockSize, 4);
    
    container.add(glow);
  }

  /**
   * Add shadow to piece
   */
  private addPieceShadow(container: Phaser.GameObjects.Container, piece: GamePiece): void {
    const shadowContainer = this.scene.add.container(3, 3);
    shadowContainer.setAlpha(0.3);
    shadowContainer.setDepth(-1);

    piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          const shadowBlock = this.scene.add.graphics();
          shadowBlock.fillStyle(0x000000);
          shadowBlock.fillRoundedRect(
            colIndex * this.config.blockSize,
            rowIndex * this.config.blockSize,
            this.config.blockSize - 2,
            this.config.blockSize - 2,
            4
          );
          shadowContainer.add(shadowBlock);
        }
      });
    });

    container.add(shadowContainer);
  }

  /**
   * Animate piece placement with wood impact effect
   */
  public animatePiecePlacement(
    containerId: string,
    onComplete?: () => void
  ): void {
    const container = this.pieceContainers.get(containerId);
    if (!container) return;

    // Stop any existing animation
    const existingTween = this.animationTweens.get(containerId);
    if (existingTween) {
      existingTween.stop();
    }

    // Create placement animation
    const originalY = container.y;
    container.setY(originalY - 20);

    const tween = this.scene.tweens.add({
      targets: container,
      y: originalY,
      scaleX: { from: 1.1, to: 1.0 },
      scaleY: { from: 0.9, to: 1.0 },
      duration: 200 * this.config.animationSpeed,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.animationTweens.delete(containerId);
        
        // Add wood impact particles
        if (this.config.enableParticles) {
          this.createWoodImpactParticles(container.x, container.y);
        }
        
        if (onComplete) onComplete();
      }
    });

    this.animationTweens.set(containerId, tween);
  }

  /**
   * Animate piece movement
   */
  public animatePieceMovement(
    containerId: string,
    targetX: number,
    targetY: number,
    duration: number = 100
  ): void {
    const container = this.pieceContainers.get(containerId);
    if (!container) return;

    // Stop any existing animation
    const existingTween = this.animationTweens.get(containerId);
    if (existingTween) {
      existingTween.stop();
    }

    const tween = this.scene.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      duration: duration * this.config.animationSpeed,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.animationTweens.delete(containerId);
      }
    });

    this.animationTweens.set(containerId, tween);
  }

  /**
   * Animate piece rotation with wood creaking effect
   */
  public animatePieceRotation(
    containerId: string,
    targetRotation: number,
    onComplete?: () => void
  ): void {
    const container = this.pieceContainers.get(containerId);
    if (!container) return;

    const tween = this.scene.tweens.add({
      targets: container,
      rotation: targetRotation,
      duration: 150 * this.config.animationSpeed,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Create wood impact particles
   */
  private createWoodImpactParticles(x: number, y: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Create wood chip particles
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.graphics();
      const chipColor = this.themeManager.getRandomWoodColor();
      
      particle.fillStyle(this.themeManager.hexToNumber(chipColor));
      particle.fillEllipse(0, 0, 3, 2);
      particle.setPosition(
        x + (Math.random() - 0.5) * this.config.blockSize,
        y + (Math.random() - 0.5) * this.config.blockSize
      );

      // Animate particle
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 40,
        y: particle.y + (Math.random() - 0.5) * 40,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 1, to: 0.5 },
        scaleY: { from: 1, to: 0.5 },
        duration: 800,
        ease: 'Power2.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  /**
   * Update render configuration
   */
  public updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Regenerate textures if block size changed
    if (newConfig.blockSize) {
      this.textureGenerator.generatePieceTextures(this.config.blockSize);
      this.refreshAllPieces();
    }
  }

  /**
   * Refresh all rendered pieces
   */
  private refreshAllPieces(): void {
    // This would be called when theme changes
    // Implementation depends on how pieces are tracked in the game
    this.scene.events.emit('pieces-refresh-needed');
  }

  /**
   * Get piece container
   */
  public getPieceContainer(containerId: string): Phaser.GameObjects.Container | undefined {
    return this.pieceContainers.get(containerId);
  }

  /**
   * Remove piece container
   */
  public removePieceContainer(containerId: string): void {
    const container = this.pieceContainers.get(containerId);
    if (container) {
      // Stop any animations
      const tween = this.animationTweens.get(containerId);
      if (tween) {
        tween.stop();
        this.animationTweens.delete(containerId);
      }
      
      container.destroy();
      this.pieceContainers.delete(containerId);
    }
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
   * Clean up resources
   */
  public destroy(): void {
    // Stop all animations
    this.animationTweens.forEach(tween => tween.stop());
    this.animationTweens.clear();
    
    // Destroy all containers
    this.pieceContainers.forEach(container => container.destroy());
    this.pieceContainers.clear();
    
    // Clear texture cache
    this.textureGenerator.clearCache();
  }
}