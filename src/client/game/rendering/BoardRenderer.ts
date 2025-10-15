import * as Phaser from 'phaser';
import { ThemeManager } from '../themes/ThemeManager';
import { TextureGenerator } from '../themes/TextureGenerator';
import { VisualComponents } from '../themes/VisualComponents';

export interface BoardRenderConfig {
  width: number;
  height: number;
  blockSize: number;
  showGrid: boolean;
  showWaterBackground: boolean;
  enableAnimations: boolean;
}

export class BoardRenderer {
  private scene: Phaser.Scene;
  private themeManager: ThemeManager;
  private textureGenerator: TextureGenerator;
  private visualComponents: VisualComponents;
  private config: BoardRenderConfig;
  
  private boardContainer: Phaser.GameObjects.Container;
  private backgroundContainer: Phaser.GameObjects.Container;
  private gridContainer: Phaser.GameObjects.Container;
  private placedPiecesContainer: Phaser.GameObjects.Container;
  private effectsContainer: Phaser.GameObjects.Container;
  
  private board: number[][];
  private lineClearAnimations: Phaser.Tweens.Tween[] = [];

  constructor(
    scene: Phaser.Scene, 
    themeManager: ThemeManager, 
    config: BoardRenderConfig
  ) {
    this.scene = scene;
    this.themeManager = themeManager;
    this.textureGenerator = new TextureGenerator(scene, themeManager);
    this.visualComponents = new VisualComponents(scene, themeManager);
    this.config = config;
    
    this.board = Array(config.height).fill(null).map(() => Array(config.width).fill(0));
    
    this.initializeContainers();
    this.createBackground();
    this.createGrid();
  }

  /**
   * Initialize all container layers
   */
  private initializeContainers(): void {
    // Main board container
    this.boardContainer = this.scene.add.container(0, 0);
    
    // Background layer (water, textures)
    this.backgroundContainer = this.scene.add.container(0, 0);
    this.boardContainer.add(this.backgroundContainer);
    
    // Grid layer
    this.gridContainer = this.scene.add.container(0, 0);
    this.boardContainer.add(this.gridContainer);
    
    // Placed pieces layer
    this.placedPiecesContainer = this.scene.add.container(0, 0);
    this.boardContainer.add(this.placedPiecesContainer);
    
    // Effects layer (particles, animations)
    this.effectsContainer = this.scene.add.container(0, 0);
    this.boardContainer.add(this.effectsContainer);
    
    // Set proper depth ordering
    this.backgroundContainer.setDepth(0);
    this.gridContainer.setDepth(1);
    this.placedPiecesContainer.setDepth(2);
    this.effectsContainer.setDepth(3);
  }

  /**
   * Create the board background with water and dam theme
   */
  private createBackground(): void {
    const theme = this.themeManager.getCurrentTheme();
    const totalWidth = this.config.width * this.config.blockSize;
    const totalHeight = this.config.height * this.config.blockSize;

    // Clear existing background
    this.backgroundContainer.removeAll(true);

    if (this.config.showWaterBackground && theme.name === 'retro-dam') {
      // Create water background at the bottom
      const waterHeight = totalHeight * 0.3;
      const water = this.visualComponents.createWaterBackground(
        0,
        totalHeight - waterHeight,
        totalWidth,
        waterHeight
      );
      this.backgroundContainer.add(water);

      // Create riverbank/shore above water
      const shore = this.scene.add.graphics();
      shore.fillStyle(this.themeManager.hexToNumber(theme.colors.wood[2]));
      shore.fillRect(0, totalHeight - waterHeight - 20, totalWidth, 20);
      
      // Add shore texture
      shore.lineStyle(1, this.themeManager.hexToNumber(theme.colors.wood[1]), 0.6);
      for (let x = 0; x < totalWidth; x += 10) {
        shore.moveTo(x, totalHeight - waterHeight - 20);
        shore.lineTo(x + 5, totalHeight - waterHeight - 15);
      }
      shore.strokePath();
      
      this.backgroundContainer.add(shore);

      // Add some decorative logs floating in water
      this.addFloatingLogs(totalWidth, totalHeight, waterHeight);
    } else {
      // Simple dark background
      const bg = this.scene.add.graphics();
      bg.fillStyle(this.themeManager.hexToNumber(theme.colors.background));
      bg.fillRect(0, 0, totalWidth, totalHeight);
      this.backgroundContainer.add(bg);
    }

    // Add subtle texture overlay
    this.addBackgroundTexture(totalWidth, totalHeight);
  }

  /**
   * Add floating logs decoration in water
   */
  private addFloatingLogs(totalWidth: number, totalHeight: number, waterHeight: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    for (let i = 0; i < 3; i++) {
      const log = this.scene.add.graphics();
      const logColor = this.themeManager.getRandomWoodColor();
      
      log.fillStyle(this.themeManager.hexToNumber(logColor));
      log.fillRoundedRect(0, 0, 40, 8, 4);
      
      // Add wood grain
      log.lineStyle(1, this.themeManager.hexToNumber(this.darkenColor(logColor, 0.2)), 0.5);
      log.moveTo(2, 4);
      log.lineTo(38, 4);
      log.strokePath();
      
      // Position randomly in water area
      log.setPosition(
        Math.random() * (totalWidth - 40),
        totalHeight - waterHeight + Math.random() * (waterHeight - 20)
      );
      
      // Add gentle floating animation
      this.scene.tweens.add({
        targets: log,
        y: log.y + 3,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      this.backgroundContainer.add(log);
    }
  }

  /**
   * Add subtle background texture
   */
  private addBackgroundTexture(width: number, height: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    if (theme.name === 'retro-dam') {
      // Add retro grid pattern
      const grid = this.scene.add.graphics();
      grid.lineStyle(1, this.themeManager.hexToNumber(theme.colors.textSecondary), 0.05);
      
      // Vertical lines
      for (let x = 0; x < width; x += 20) {
        grid.moveTo(x, 0);
        grid.lineTo(x, height);
      }
      
      // Horizontal lines
      for (let y = 0; y < height; y += 20) {
        grid.moveTo(0, y);
        grid.lineTo(width, y);
      }
      
      grid.strokePath();
      this.backgroundContainer.add(grid);
    }
  }

  /**
   * Create the game grid
   */
  private createGrid(): void {
    this.gridContainer.removeAll(true);
    
    if (!this.config.showGrid) return;

    const theme = this.themeManager.getCurrentTheme();
    const grid = this.scene.add.graphics();
    
    grid.lineStyle(1, this.themeManager.hexToNumber(theme.colors.textSecondary), 0.2);
    
    // Vertical grid lines
    for (let x = 0; x <= this.config.width; x++) {
      const lineX = x * this.config.blockSize;
      grid.moveTo(lineX, 0);
      grid.lineTo(lineX, this.config.height * this.config.blockSize);
    }
    
    // Horizontal grid lines
    for (let y = 0; y <= this.config.height; y++) {
      const lineY = y * this.config.blockSize;
      grid.moveTo(0, lineY);
      grid.lineTo(this.config.width * this.config.blockSize, lineY);
    }
    
    grid.strokePath();
    this.gridContainer.add(grid);
  }

  /**
   * Update the board state and render placed pieces
   */
  public updateBoard(newBoard: number[][]): void {
    this.board = newBoard.map(row => [...row]);
    this.renderPlacedPieces();
  }

  /**
   * Render all placed pieces on the board
   */
  private renderPlacedPieces(): void {
    this.placedPiecesContainer.removeAll(true);
    
    for (let y = 0; y < this.board.length; y++) {
      for (let x = 0; x < this.board[y].length; x++) {
        const cellValue = this.board[y][x];
        if (cellValue > 0) {
          const block = this.createPlacedBlock(x, y, cellValue);
          this.placedPiecesContainer.add(block);
        }
      }
    }
  }

  /**
   * Create a placed block with log styling
   */
  private createPlacedBlock(gridX: number, gridY: number, pieceType: number): Phaser.GameObjects.Container {
    const blockContainer = this.scene.add.container(
      gridX * this.config.blockSize,
      gridY * this.config.blockSize
    );
    
    const theme = this.themeManager.getCurrentTheme();
    
    // Determine piece type and colors based on cell value
    const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
    const typeIndex = (pieceType - 1) % pieceTypes.length;
    const pieceTypeKey = pieceTypes[typeIndex] as keyof typeof theme.pieces;
    const pieceColors = theme.pieces[pieceTypeKey].colors;
    
    // Create log block
    const logBlock = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(pieceColors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(pieceColors[0], 0.1));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(pieceColors[0], 0.1));
    
    // Wood gradient
    logBlock.fillGradientStyle(lightColor, lightColor, baseColor, darkColor);
    logBlock.fillRoundedRect(1, 1, this.config.blockSize - 2, this.config.blockSize - 2, 3);
    
    // Wood grain
    this.addWoodGrain(logBlock, pieceColors[0]);
    
    // Border
    logBlock.lineStyle(1, darkColor, 0.8);
    logBlock.strokeRoundedRect(0, 0, this.config.blockSize, this.config.blockSize, 3);
    
    blockContainer.add(logBlock);
    
    // Add leaves for S and Z pieces
    if (typeIndex === 3 || typeIndex === 4) { // S or Z
      const leaves = this.createSmallLeaves();
      blockContainer.add(leaves);
    }
    
    return blockContainer;
  }

  /**
   * Add wood grain to a block
   */
  private addWoodGrain(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.15));
    
    graphics.lineStyle(0.5, grainColor, 0.4);
    
    // Add 2-3 grain lines
    for (let i = 0; i < 2; i++) {
      const y = 6 + (this.config.blockSize - 12) * (i / 1);
      graphics.moveTo(3, y);
      
      for (let x = 3; x < this.config.blockSize - 3; x += 2) {
        const waveY = y + Math.sin((x / this.config.blockSize) * Math.PI * 1.5) * 0.5;
        graphics.lineTo(x, waveY);
      }
    }
    
    graphics.strokePath();
  }

  /**
   * Create small leaves for branch blocks
   */
  private createSmallLeaves(): Phaser.GameObjects.Graphics {
    const leaves = this.scene.add.graphics();
    const leafColors = this.themeManager.getCurrentTheme().colors.leaves;
    
    // Add 2-3 small leaves
    for (let i = 0; i < 2; i++) {
      const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      leaves.fillStyle(this.themeManager.hexToNumber(leafColor));
      
      const leafX = 4 + Math.random() * (this.config.blockSize - 8);
      const leafY = 4 + Math.random() * (this.config.blockSize - 8);
      
      leaves.fillEllipse(leafX, leafY, 2, 3);
    }
    
    return leaves;
  }

  /**
   * Animate line clear with wood breaking effect
   */
  public animateLineClear(
    lines: number[],
    onComplete?: () => void
  ): void {
    if (!this.config.enableAnimations) {
      if (onComplete) onComplete();
      return;
    }

    // Stop any existing line clear animations
    this.lineClearAnimations.forEach(tween => tween.stop());
    this.lineClearAnimations = [];

    const theme = this.themeManager.getCurrentTheme();
    let completedAnimations = 0;
    const totalAnimations = lines.length;

    lines.forEach((lineY, index) => {
      // Create line highlight effect
      const lineHighlight = this.scene.add.graphics();
      lineHighlight.fillStyle(this.themeManager.hexToNumber(theme.colors.neon.yellow), 0.8);
      lineHighlight.fillRect(
        0,
        lineY * this.config.blockSize,
        this.config.width * this.config.blockSize,
        this.config.blockSize
      );
      this.effectsContainer.add(lineHighlight);

      // Create wood breaking particles
      this.createLineBreakParticles(lineY);

      // Animate line flash and removal
      const tween = this.scene.tweens.add({
        targets: lineHighlight,
        alpha: { from: 0.8, to: 0 },
        scaleY: { from: 1, to: 0 },
        duration: 400,
        delay: index * 100,
        ease: 'Power2.easeOut',
        onComplete: () => {
          lineHighlight.destroy();
          completedAnimations++;
          
          if (completedAnimations === totalAnimations) {
            // All line animations complete
            this.lineClearAnimations = [];
            if (onComplete) onComplete();
          }
        }
      });

      this.lineClearAnimations.push(tween);
    });

    // Screen shake effect for dramatic impact
    this.scene.cameras.main.shake(150, 0.01);
  }

  /**
   * Create wood breaking particles for line clear
   */
  private createLineBreakParticles(lineY: number): void {
    const theme = this.themeManager.getCurrentTheme();
    
    // Create wood chips and sawdust particles
    for (let x = 0; x < this.config.width; x++) {
      for (let i = 0; i < 3; i++) {
        const particle = this.scene.add.graphics();
        const chipColor = this.themeManager.getRandomWoodColor();
        
        particle.fillStyle(this.themeManager.hexToNumber(chipColor));
        particle.fillEllipse(0, 0, 2 + Math.random() * 2, 1 + Math.random());
        
        const startX = x * this.config.blockSize + Math.random() * this.config.blockSize;
        const startY = lineY * this.config.blockSize + Math.random() * this.config.blockSize;
        
        particle.setPosition(startX, startY);
        this.effectsContainer.add(particle);

        // Animate particle flying away
        this.scene.tweens.add({
          targets: particle,
          x: startX + (Math.random() - 0.5) * 100,
          y: startY + (Math.random() - 0.5) * 60 - 30,
          alpha: { from: 1, to: 0 },
          scaleX: { from: 1, to: 0.3 },
          scaleY: { from: 1, to: 0.3 },
          rotation: Math.random() * Math.PI * 2,
          duration: 800 + Math.random() * 400,
          ease: 'Power2.easeOut',
          onComplete: () => {
            particle.destroy();
          }
        });
      }
    }

    // Add some leaf particles for variety
    for (let i = 0; i < 5; i++) {
      const leaf = this.scene.add.graphics();
      const leafColor = this.themeManager.getRandomLeafColor();
      
      leaf.fillStyle(this.themeManager.hexToNumber(leafColor));
      leaf.fillEllipse(0, 0, 3, 4);
      
      const startX = Math.random() * (this.config.width * this.config.blockSize);
      const startY = lineY * this.config.blockSize + Math.random() * this.config.blockSize;
      
      leaf.setPosition(startX, startY);
      this.effectsContainer.add(leaf);

      // Animate leaf floating away
      this.scene.tweens.add({
        targets: leaf,
        x: startX + (Math.random() - 0.5) * 80,
        y: startY - 40 - Math.random() * 40,
        alpha: { from: 1, to: 0 },
        rotation: Math.random() * Math.PI,
        duration: 1200 + Math.random() * 600,
        ease: 'Power1.easeOut',
        onComplete: () => {
          leaf.destroy();
        }
      });
    }
  }

  /**
   * Get the main board container
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.boardContainer;
  }

  /**
   * Update render configuration
   */
  public updateConfig(newConfig: Partial<BoardRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate elements that depend on config
    this.createBackground();
    this.createGrid();
    this.renderPlacedPieces();
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
    this.lineClearAnimations.forEach(tween => tween.stop());
    this.lineClearAnimations = [];
    
    // Destroy containers
    this.boardContainer.destroy();
    
    // Clear texture cache
    this.textureGenerator.clearCache();
  }
}