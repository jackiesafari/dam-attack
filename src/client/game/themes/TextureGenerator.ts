import * as Phaser from 'phaser';
import { ThemeManager } from './ThemeManager';

export class TextureGenerator {
  private scene: Phaser.Scene;
  private themeManager: ThemeManager;
  private textureCache: Map<string, string> = new Map();

  constructor(scene: Phaser.Scene, themeManager: ThemeManager) {
    this.scene = scene;
    this.themeManager = themeManager;
  }

  /**
   * Generate all piece textures for the current theme
   */
  public generatePieceTextures(blockSize: number = 32): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Generate textures for each piece type
    Object.keys(theme.pieces).forEach(pieceType => {
      this.generateLogTexture(pieceType, blockSize);
    });

    // Generate additional textures
    this.generateWaterTexture(blockSize);
    this.generateBoardTexture(blockSize);
    this.generateParticleTextures(blockSize);
  }

  /**
   * Generate log texture for a specific piece type
   */
  public generateLogTexture(pieceType: string, size: number): string {
    const cacheKey = `log-${pieceType}-${size}`;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const theme = this.themeManager.getCurrentTheme();
    const pieceColors = theme.pieces[pieceType as keyof typeof theme.pieces].colors;
    const hasLeaves = pieceType === 'S' || pieceType === 'Z'; // Branch pieces have leaves

    // Create render texture
    const rt = this.scene.add.renderTexture(0, 0, size, size);
    
    // Draw log base
    const graphics = this.scene.add.graphics();
    
    // Main log color with gradient effect
    const baseColor = this.themeManager.hexToNumber(pieceColors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(pieceColors[0], 0.2));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(pieceColors[0], 0.2));
    
    // Create wood texture
    graphics.fillGradientStyle(lightColor, lightColor, baseColor, darkColor);
    graphics.fillRoundedRect(2, 2, size - 4, size - 4, 4);
    
    // Add wood grain details
    this.addWoodGrainDetails(graphics, size, pieceColors[0]);
    
    // Add bark texture on edges
    this.addBarkTexture(graphics, size, this.darkenColor(pieceColors[0], 0.3));
    
    // Add leaves for branch pieces
    if (hasLeaves) {
      this.addLeafDetails(graphics, size);
    }
    
    // Add log end rings for certain orientations
    if (pieceType === 'I') {
      this.addLogEndRings(graphics, size, pieceColors[0]);
    }
    
    // Render to texture
    rt.draw(graphics, size / 2, size / 2);
    
    // Clean up
    graphics.destroy();
    
    // Generate texture key
    const textureKey = `piece-${pieceType}-${size}`;
    rt.saveTexture(textureKey);
    
    // Cache and return
    this.textureCache.set(cacheKey, textureKey);
    return textureKey;
  }

  /**
   * Generate water texture for background
   */
  public generateWaterTexture(size: number): string {
    const cacheKey = `water-${size}`;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const theme = this.themeManager.getCurrentTheme();
    const rt = this.scene.add.renderTexture(0, 0, size * 4, size);
    const graphics = this.scene.add.graphics();
    
    // Base water color
    const waterColor = this.themeManager.hexToNumber(theme.colors.water);
    const lightWater = this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.1));
    const darkWater = this.themeManager.hexToNumber(this.darkenColor(theme.colors.water, 0.1));
    
    // Create animated water pattern
    graphics.fillGradientStyle(lightWater, lightWater, waterColor, darkWater);
    graphics.fillRect(0, 0, size * 4, size);
    
    // Add wave patterns
    graphics.lineStyle(1, lightWater, 0.6);
    for (let i = 0; i < 4; i++) {
      const waveY = (size / 4) * i + size / 8;
      graphics.moveTo(0, waveY);
      
      for (let x = 0; x < size * 4; x += 4) {
        const waveHeight = Math.sin((x / (size * 4)) * Math.PI * 8) * 2;
        graphics.lineTo(x, waveY + waveHeight);
      }
    }
    graphics.strokePath();
    
    rt.draw(graphics, size * 2, size / 2);
    graphics.destroy();
    
    const textureKey = 'water-texture';
    rt.saveTexture(textureKey);
    
    this.textureCache.set(cacheKey, textureKey);
    return textureKey;
  }

  /**
   * Generate board background texture
   */
  public generateBoardTexture(blockSize: number, boardWidth: number, boardHeight: number): string {
    const cacheKey = `board-${blockSize}-${boardWidth}-${boardHeight}`;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const theme = this.themeManager.getCurrentTheme();
    const width = boardWidth * blockSize;
    const height = boardHeight * blockSize;
    
    const rt = this.scene.add.renderTexture(0, 0, width, height);
    const graphics = this.scene.add.graphics();
    
    // Dark background
    graphics.fillStyle(this.themeManager.hexToNumber(theme.colors.background));
    graphics.fillRect(0, 0, width, height);
    
    // Grid lines
    graphics.lineStyle(1, this.themeManager.hexToNumber(theme.colors.textSecondary), 0.1);
    
    // Vertical lines
    for (let x = 0; x <= boardWidth; x++) {
      graphics.moveTo(x * blockSize, 0);
      graphics.lineTo(x * blockSize, height);
    }
    
    // Horizontal lines
    for (let y = 0; y <= boardHeight; y++) {
      graphics.moveTo(0, y * blockSize);
      graphics.lineTo(width, y * blockSize);
    }
    
    graphics.strokePath();
    
    rt.draw(graphics, width / 2, height / 2);
    graphics.destroy();
    
    const textureKey = 'board-background';
    rt.saveTexture(textureKey);
    
    this.textureCache.set(cacheKey, textureKey);
    return textureKey;
  }

  /**
   * Generate particle textures for effects
   */
  public generateParticleTextures(size: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Wood chip particles
    this.generateWoodChipTexture(size / 4);
    
    // Leaf particles
    this.generateLeafParticleTexture(size / 6);
    
    // Sparkle particles
    this.generateSparkleTexture(size / 8);
    
    // Water droplet particles
    this.generateWaterDropletTexture(size / 6);
  }

  /**
   * Add wood grain details to graphics
   */
  private addWoodGrainDetails(graphics: Phaser.GameObjects.Graphics, size: number, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.15));
    
    graphics.lineStyle(1, grainColor, 0.4);
    
    // Horizontal grain lines
    for (let i = 0; i < 4; i++) {
      const y = 6 + (size - 12) * (i / 3);
      const startX = 4 + Math.random() * 4;
      const endX = size - 4 - Math.random() * 4;
      
      graphics.moveTo(startX, y);
      
      // Create wavy grain line
      for (let x = startX; x < endX; x += 2) {
        const waveY = y + Math.sin((x / size) * Math.PI * 3) * 0.5;
        graphics.lineTo(x, waveY);
      }
    }
    
    graphics.strokePath();
    
    // Add knots and imperfections
    graphics.fillStyle(this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.3)));
    
    // Random knots
    for (let i = 0; i < 2; i++) {
      const knotX = 8 + Math.random() * (size - 16);
      const knotY = 8 + Math.random() * (size - 16);
      const knotSize = 2 + Math.random() * 3;
      
      graphics.fillCircle(knotX, knotY, knotSize);
    }
  }

  /**
   * Add bark texture to edges
   */
  private addBarkTexture(graphics: Phaser.GameObjects.Graphics, size: number, barkColor: string): void {
    const color = this.themeManager.hexToNumber(barkColor);
    
    graphics.lineStyle(2, color, 0.8);
    graphics.strokeRoundedRect(1, 1, size - 2, size - 2, 3);
    
    // Add bark roughness
    graphics.lineStyle(1, color, 0.6);
    
    // Top edge roughness
    for (let x = 4; x < size - 4; x += 3) {
      const roughness = Math.random() * 2;
      graphics.moveTo(x, 2);
      graphics.lineTo(x, 2 + roughness);
    }
    
    // Bottom edge roughness
    for (let x = 4; x < size - 4; x += 3) {
      const roughness = Math.random() * 2;
      graphics.moveTo(x, size - 2);
      graphics.lineTo(x, size - 2 - roughness);
    }
    
    graphics.strokePath();
  }

  /**
   * Add leaf details for branch pieces
   */
  private addLeafDetails(graphics: Phaser.GameObjects.Graphics, size: number): void {
    const theme = this.themeManager.getCurrentTheme();
    const leafColors = theme.colors.leaves;
    
    // Add small leaf clusters
    for (let i = 0; i < 4; i++) {
      const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      graphics.fillStyle(this.themeManager.hexToNumber(leafColor));
      
      const leafX = 6 + Math.random() * (size - 12);
      const leafY = 6 + Math.random() * (size - 12);
      
      // Draw small leaf shape
      graphics.fillEllipse(leafX, leafY, 4, 6);
      
      // Add leaf stem
      graphics.lineStyle(1, this.themeManager.hexToNumber(this.darkenColor(leafColor, 0.3)), 0.8);
      graphics.moveTo(leafX, leafY + 2);
      graphics.lineTo(leafX, leafY + 4);
      graphics.strokePath();
    }
  }

  /**
   * Add log end rings for I-pieces
   */
  private addLogEndRings(graphics: Phaser.GameObjects.Graphics, size: number, baseColor: string): void {
    const ringColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2));
    
    graphics.lineStyle(1, ringColor, 0.6);
    
    // Draw concentric rings
    const centerX = size / 2;
    const centerY = size / 2;
    
    for (let i = 1; i <= 3; i++) {
      const radius = (size / 8) * i;
      graphics.strokeCircle(centerX, centerY, radius);
    }
  }

  /**
   * Generate wood chip particle texture
   */
  private generateWoodChipTexture(size: number): string {
    const rt = this.scene.add.renderTexture(0, 0, size, size);
    const graphics = this.scene.add.graphics();
    
    const theme = this.themeManager.getCurrentTheme();
    const woodColor = this.themeManager.hexToNumber(theme.colors.wood[0]);
    
    graphics.fillStyle(woodColor);
    graphics.fillEllipse(size / 2, size / 2, size * 0.8, size * 0.6);
    
    rt.draw(graphics, size / 2, size / 2);
    graphics.destroy();
    
    const textureKey = 'wood-chip-particle';
    rt.saveTexture(textureKey);
    
    return textureKey;
  }

  /**
   * Generate leaf particle texture
   */
  private generateLeafParticleTexture(size: number): string {
    const rt = this.scene.add.renderTexture(0, 0, size, size);
    const graphics = this.scene.add.graphics();
    
    const theme = this.themeManager.getCurrentTheme();
    const leafColor = this.themeManager.hexToNumber(theme.colors.leaves[0]);
    
    graphics.fillStyle(leafColor);
    graphics.fillEllipse(size / 2, size / 2, size * 0.6, size * 0.9);
    
    rt.draw(graphics, size / 2, size / 2);
    graphics.destroy();
    
    const textureKey = 'leaf-particle';
    rt.saveTexture(textureKey);
    
    return textureKey;
  }

  /**
   * Generate sparkle particle texture
   */
  private generateSparkleTexture(size: number): string {
    const rt = this.scene.add.renderTexture(0, 0, size, size);
    const graphics = this.scene.add.graphics();
    
    const theme = this.themeManager.getCurrentTheme();
    const sparkleColor = this.themeManager.hexToNumber(theme.colors.neon.yellow);
    
    graphics.fillStyle(sparkleColor);
    graphics.fillStar(size / 2, size / 2, 4, size / 4, size / 2);
    
    rt.draw(graphics, size / 2, size / 2);
    graphics.destroy();
    
    const textureKey = 'sparkle-particle';
    rt.saveTexture(textureKey);
    
    return textureKey;
  }

  /**
   * Generate water droplet particle texture
   */
  private generateWaterDropletTexture(size: number): string {
    const rt = this.scene.add.renderTexture(0, 0, size, size);
    const graphics = this.scene.add.graphics();
    
    const theme = this.themeManager.getCurrentTheme();
    const waterColor = this.themeManager.hexToNumber(theme.colors.water);
    
    graphics.fillStyle(waterColor);
    graphics.fillCircle(size / 2, size / 2, size / 2);
    
    // Add highlight
    graphics.fillStyle(this.themeManager.hexToNumber(this.lightenColor(theme.colors.water, 0.3)));
    graphics.fillCircle(size / 2 - size / 6, size / 2 - size / 6, size / 6);
    
    rt.draw(graphics, size / 2, size / 2);
    graphics.destroy();
    
    const textureKey = 'water-droplet-particle';
    rt.saveTexture(textureKey);
    
    return textureKey;
  }

  /**
   * Lighten a hex color
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
   * Darken a hex color
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
   * Clear texture cache
   */
  public clearCache(): void {
    this.textureCache.clear();
  }

  /**
   * Get cached texture key
   */
  public getCachedTexture(cacheKey: string): string | undefined {
    return this.textureCache.get(cacheKey);
  }
}