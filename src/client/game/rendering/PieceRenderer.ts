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
    // Skip TextureGenerator to avoid framebuffer issues
    // this.textureGenerator = new TextureGenerator(scene, themeManager);
    
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
    // Skip texture generation to avoid framebuffer issues
    // this.textureGenerator.generatePieceTextures(this.config.blockSize);
    
    // Listen for theme changes
    this.scene.events.on('theme-changed', () => {
      // Skip texture regeneration
      // this.textureGenerator.clearCache();
      // this.textureGenerator.generatePieceTextures(this.config.blockSize);
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
   * Create a single log block with authentic wood styling
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
    
    // Create different wood block types based on piece
    switch (pieceType) {
      case PieceType.I:
        this.createLogPiece(blockContainer, pieceColors);
        break;
      case PieceType.O:
        this.createStumpPiece(blockContainer, pieceColors);
        break;
      case PieceType.T:
        this.createBranchPiece(blockContainer, pieceColors);
        break;
      case PieceType.S:
      case PieceType.Z:
        this.createLeafyBranchPiece(blockContainer, pieceColors);
        break;
      case PieceType.L:
      case PieceType.J:
        this.createBentBranchPiece(blockContainer, pieceColors);
        break;
      default:
        this.createGenericWoodPiece(blockContainer, pieceColors);
    }

    // Apply tint if specified
    if (tint !== undefined) {
      blockContainer.list.forEach((child: any) => {
        if (child.setTint) child.setTint(tint);
      });
    }

    // Add subtle glow effect for retro theme
    if (theme.name === 'retro-dam') {
      this.addRetroGlow(blockContainer, pieceColors[0]);
    }

    return blockContainer;
  }

  /**
   * Create I-piece: Long horizontal log
   */
  private createLogPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.2));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.2));
    const barkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.4));

    // Main log body with cylindrical appearance
    graphics.fillGradientStyle(lightColor, lightColor, baseColor, darkColor);
    graphics.fillRoundedRect(1, 4, this.config.blockSize - 2, this.config.blockSize - 8, 6);

    // Add bark texture on top and bottom
    graphics.fillStyle(barkColor);
    graphics.fillRoundedRect(1, 1, this.config.blockSize - 2, 4, 2);
    graphics.fillRoundedRect(1, this.config.blockSize - 5, this.config.blockSize - 2, 4, 2);

    // Add wood grain lines
    this.addHorizontalWoodGrain(graphics, colors[0]);
    
    // Add log end rings (tree rings)
    this.addLogEndRings(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Create O-piece: Tree stump cross-section
   */
  private createStumpPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.15));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.15));
    const barkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.3));

    // Main stump body
    graphics.fillGradientStyle(lightColor, baseColor, baseColor, darkColor);
    graphics.fillRoundedRect(2, 2, this.config.blockSize - 4, this.config.blockSize - 4, 4);

    // Add bark border
    graphics.lineStyle(2, barkColor, 0.9);
    graphics.strokeRoundedRect(1, 1, this.config.blockSize - 2, this.config.blockSize - 2, 4);

    // Add concentric tree rings
    this.addTreeRings(graphics, colors[0]);
    
    // Add radial wood grain
    this.addRadialWoodGrain(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Create T-piece: Branch with side shoots
   */
  private createBranchPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.2));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.2));

    // Main branch body
    graphics.fillGradientStyle(lightColor, baseColor, baseColor, darkColor);
    graphics.fillRoundedRect(3, 3, this.config.blockSize - 6, this.config.blockSize - 6, 3);

    // Add small branch nubs
    this.addBranchNubs(graphics, colors[0]);
    
    // Add bark texture
    this.addBarkTexture(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Create S/Z-piece: Leafy branch
   */
  private createLeafyBranchPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.15));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.15));

    // Thinner branch for leafy pieces
    graphics.fillGradientStyle(lightColor, baseColor, baseColor, darkColor);
    graphics.fillRoundedRect(4, 4, this.config.blockSize - 8, this.config.blockSize - 8, 2);

    // Add leaves cluster
    const leaves = this.createEnhancedLeafCluster();
    container.add(leaves);

    // Add small twigs
    this.addSmallTwigs(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Create L/J-piece: Bent branch
   */
  private createBentBranchPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.18));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.18));

    // Create L-shaped branch
    graphics.fillGradientStyle(lightColor, baseColor, baseColor, darkColor);
    graphics.fillRoundedRect(2, 2, this.config.blockSize - 4, this.config.blockSize - 4, 4);

    // Add wood knots at the bend
    this.addWoodKnots(graphics, colors[0]);
    
    // Add directional wood grain
    this.addDirectionalWoodGrain(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Create generic wood piece
   */
  private createGenericWoodPiece(container: Phaser.GameObjects.Container, colors: string[]): void {
    const graphics = this.scene.add.graphics();
    const baseColor = this.themeManager.hexToNumber(colors[0]);
    const lightColor = this.themeManager.hexToNumber(this.lightenColor(colors[0], 0.15));
    const darkColor = this.themeManager.hexToNumber(this.darkenColor(colors[0], 0.15));

    graphics.fillGradientStyle(lightColor, lightColor, baseColor, darkColor);
    graphics.fillRoundedRect(2, 2, this.config.blockSize - 4, this.config.blockSize - 4, 4);

    this.addGenericWoodGrain(graphics, colors[0]);

    container.add(graphics);
  }

  /**
   * Add horizontal wood grain for logs
   */
  private addHorizontalWoodGrain(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.15));
    
    graphics.lineStyle(1, grainColor, 0.4);
    
    // Multiple horizontal grain lines with slight waves
    for (let i = 0; i < 4; i++) {
      const y = 6 + (this.config.blockSize - 12) * (i / 3);
      graphics.moveTo(3, y);
      
      for (let x = 3; x < this.config.blockSize - 3; x += 2) {
        const waveY = y + Math.sin((x / this.config.blockSize) * Math.PI * 3) * 0.8;
        graphics.lineTo(x, waveY);
      }
    }
    
    graphics.strokePath();
  }

  /**
   * Add tree rings for stump pieces
   */
  private addTreeRings(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const ringColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2));
    
    graphics.lineStyle(1, ringColor, 0.6);
    
    const centerX = this.config.blockSize / 2;
    const centerY = this.config.blockSize / 2;
    
    // Draw concentric rings with slight irregularity
    for (let i = 1; i <= 3; i++) {
      const baseRadius = (this.config.blockSize / 8) * i;
      
      graphics.beginPath();
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
        const irregularity = Math.sin(angle * 8) * 0.5 + Math.cos(angle * 12) * 0.3;
        const radius = baseRadius + irregularity;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (angle === 0) {
          graphics.moveTo(x, y);
        } else {
          graphics.lineTo(x, y);
        }
      }
      graphics.closePath();
      graphics.strokePath();
    }
  }

  /**
   * Add radial wood grain for stumps
   */
  private addRadialWoodGrain(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.1));
    
    graphics.lineStyle(0.5, grainColor, 0.3);
    
    const centerX = this.config.blockSize / 2;
    const centerY = this.config.blockSize / 2;
    
    // Draw radial lines from center
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const startRadius = 3;
      const endRadius = this.config.blockSize / 2 - 3;
      
      graphics.moveTo(
        centerX + Math.cos(angle) * startRadius,
        centerY + Math.sin(angle) * startRadius
      );
      graphics.lineTo(
        centerX + Math.cos(angle) * endRadius,
        centerY + Math.sin(angle) * endRadius
      );
    }
    
    graphics.strokePath();
  }

  /**
   * Add branch nubs for T-pieces
   */
  private addBranchNubs(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const nubColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.1));
    
    graphics.fillStyle(nubColor);
    
    // Add small circular nubs where branches would grow
    const positions = [
      { x: 8, y: 6 },
      { x: this.config.blockSize - 8, y: 6 },
      { x: this.config.blockSize / 2, y: this.config.blockSize - 6 }
    ];
    
    positions.forEach(pos => {
      graphics.fillCircle(pos.x, pos.y, 1.5);
    });
  }

  /**
   * Add bark texture
   */
  private addBarkTexture(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const barkColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.3));
    
    graphics.lineStyle(1, barkColor, 0.5);
    
    // Add irregular bark lines
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.random() * (this.config.blockSize - 8);
      const y = 4 + Math.random() * (this.config.blockSize - 8);
      const length = 3 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      
      graphics.moveTo(x, y);
      graphics.lineTo(
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );
    }
    
    graphics.strokePath();
  }

  /**
   * Add small twigs for leafy branches
   */
  private addSmallTwigs(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const twigColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2));
    
    graphics.lineStyle(1, twigColor, 0.7);
    
    // Add 2-3 small twigs
    for (let i = 0; i < 3; i++) {
      const startX = 6 + Math.random() * (this.config.blockSize - 12);
      const startY = 6 + Math.random() * (this.config.blockSize - 12);
      const angle = Math.random() * Math.PI * 2;
      const length = 4 + Math.random() * 3;
      
      graphics.moveTo(startX, startY);
      graphics.lineTo(
        startX + Math.cos(angle) * length,
        startY + Math.sin(angle) * length
      );
    }
    
    graphics.strokePath();
  }

  /**
   * Add wood knots for bent branches
   */
  private addWoodKnots(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const knotColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.25));
    
    graphics.fillStyle(knotColor);
    
    // Add 1-2 wood knots
    for (let i = 0; i < 2; i++) {
      const x = 8 + Math.random() * (this.config.blockSize - 16);
      const y = 8 + Math.random() * (this.config.blockSize - 16);
      const size = 1.5 + Math.random() * 1;
      
      graphics.fillEllipse(x, y, size * 2, size);
      
      // Add knot ring
      graphics.lineStyle(0.5, this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.4)), 0.8);
      graphics.strokeEllipse(x, y, size * 2, size);
    }
  }

  /**
   * Add directional wood grain
   */
  private addDirectionalWoodGrain(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.12));
    
    graphics.lineStyle(0.8, grainColor, 0.4);
    
    // Add curved grain lines following the L-shape
    for (let i = 0; i < 3; i++) {
      const startX = 4;
      const startY = 6 + i * 4;
      
      // Horizontal part
      graphics.moveTo(startX, startY);
      for (let x = startX; x < this.config.blockSize / 2; x += 2) {
        const y = startY + Math.sin((x / this.config.blockSize) * Math.PI) * 0.5;
        graphics.lineTo(x, y);
      }
      
      // Vertical part
      const cornerX = this.config.blockSize / 2;
      const cornerY = startY;
      graphics.moveTo(cornerX, cornerY);
      for (let y = cornerY; y < this.config.blockSize - 4; y += 2) {
        const x = cornerX + Math.sin((y / this.config.blockSize) * Math.PI) * 0.5;
        graphics.lineTo(x, y);
      }
    }
    
    graphics.strokePath();
  }

  /**
   * Add generic wood grain
   */
  private addGenericWoodGrain(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const grainColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.1));
    
    graphics.lineStyle(1, grainColor, 0.3);
    
    // Simple wavy grain lines
    for (let i = 0; i < 3; i++) {
      const y = 8 + (this.config.blockSize - 16) * (i / 2);
      graphics.moveTo(4, y);
      
      for (let x = 4; x < this.config.blockSize - 4; x += 2) {
        const waveY = y + Math.sin((x / this.config.blockSize) * Math.PI * 2) * 0.5;
        graphics.lineTo(x, waveY);
      }
    }
    
    graphics.strokePath();

    // Add small knot
    graphics.fillStyle(this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.2)));
    const knotX = 8 + Math.random() * (this.config.blockSize - 16);
    const knotY = 8 + Math.random() * (this.config.blockSize - 16);
    graphics.fillCircle(knotX, knotY, 1.5);
  }

  /**
   * Create enhanced leaf cluster for branch pieces
   */
  private createEnhancedLeafCluster(): Phaser.GameObjects.Container {
    const leafContainer = this.scene.add.container(0, 0);
    const leafColors = this.themeManager.getCurrentTheme().colors.leaves;

    // Add 4-6 leaves with more variety
    for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i++) {
      const leaf = this.scene.add.graphics();
      const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
      const darkLeafColor = this.darkenColor(leafColor, 0.3);
      
      const leafX = 4 + Math.random() * (this.config.blockSize - 8);
      const leafY = 4 + Math.random() * (this.config.blockSize - 8);
      const leafSize = 2 + Math.random() * 2;
      const rotation = Math.random() * Math.PI * 2;
      
      // Create more realistic leaf shape
      leaf.fillStyle(this.themeManager.hexToNumber(leafColor));
      
      // Draw teardrop/oval leaf shape
      leaf.beginPath();
      leaf.moveTo(leafX, leafY - leafSize);
      leaf.quadraticCurveTo(leafX + leafSize, leafY, leafX, leafY + leafSize);
      leaf.quadraticCurveTo(leafX - leafSize, leafY, leafX, leafY - leafSize);
      leaf.closePath();
      leaf.fillPath();
      
      // Add leaf vein
      leaf.lineStyle(0.5, this.themeManager.hexToNumber(darkLeafColor), 0.9);
      leaf.moveTo(leafX, leafY - leafSize * 0.8);
      leaf.lineTo(leafX, leafY + leafSize * 0.8);
      
      // Add side veins
      for (let j = 0; j < 2; j++) {
        const veinY = leafY - leafSize * 0.3 + (j * leafSize * 0.6);
        leaf.moveTo(leafX, veinY);
        leaf.lineTo(leafX - leafSize * 0.4, veinY + leafSize * 0.2);
        leaf.moveTo(leafX, veinY);
        leaf.lineTo(leafX + leafSize * 0.4, veinY + leafSize * 0.2);
      }
      
      leaf.strokePath();
      
      // Rotate leaf for natural look
      leaf.setRotation(rotation);
      
      leafContainer.add(leaf);
    }

    // Add small berries or buds occasionally
    if (Math.random() < 0.3) {
      const berry = this.scene.add.graphics();
      berry.fillStyle(0x8B0000); // Dark red berry
      const berryX = 6 + Math.random() * (this.config.blockSize - 12);
      const berryY = 6 + Math.random() * (this.config.blockSize - 12);
      berry.fillCircle(berryX, berryY, 1);
      leafContainer.add(berry);
    }

    return leafContainer;
  }

  /**
   * Create leaf cluster for branch pieces (legacy method)
   */
  private createLeafCluster(): Phaser.GameObjects.Container {
    return this.createEnhancedLeafCluster();
  }

  /**
   * Add log end rings for I-pieces
   */
  private addLogEndRings(graphics: Phaser.GameObjects.Graphics, baseColor: string): void {
    const ringColor = this.themeManager.hexToNumber(this.darkenColor(baseColor, 0.25));
    const lightRingColor = this.themeManager.hexToNumber(this.lightenColor(baseColor, 0.1));
    
    // Add rings on the left and right ends of horizontal logs
    const leftX = 4;
    const rightX = this.config.blockSize - 4;
    const centerY = this.config.blockSize / 2;
    
    [leftX, rightX].forEach(x => {
      // Draw tree rings
      graphics.lineStyle(1, ringColor, 0.6);
      
      for (let i = 1; i <= 3; i++) {
        const radius = 2 + i * 1.5;
        graphics.strokeCircle(x, centerY, radius);
      }
      
      // Add center dot (heartwood)
      graphics.fillStyle(ringColor);
      graphics.fillCircle(x, centerY, 1);
      
      // Add radial cracks
      graphics.lineStyle(0.5, ringColor, 0.4);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
        const startRadius = 1.5;
        const endRadius = 6;
        graphics.moveTo(
          x + Math.cos(angle) * startRadius,
          centerY + Math.sin(angle) * startRadius
        );
        graphics.lineTo(
          x + Math.cos(angle) * endRadius,
          centerY + Math.sin(angle) * endRadius
        );
      }
      graphics.strokePath();
    });
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
    
    // Skip texture cache clearing
    // this.textureGenerator.clearCache();
  }
}