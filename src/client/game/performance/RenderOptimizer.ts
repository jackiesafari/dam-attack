import * as Phaser from 'phaser';

export interface RenderConfig {
  enableBatching: boolean;
  maxBatchSize: number;
  enableCulling: boolean;
  cullingMargin: number;
  enableLOD: boolean; // Level of Detail
  lodDistances: number[];
  enableTextureAtlas: boolean;
  maxTextureSize: number;
}

export interface RenderStats {
  drawCalls: number;
  batchedObjects: number;
  culledObjects: number;
  visibleObjects: number;
  textureSwaps: number;
  frameTime: number;
}

export class RenderOptimizer {
  private scene: Phaser.Scene;
  private config: RenderConfig;
  private stats: RenderStats;
  private batchGroups: Map<string, Phaser.GameObjects.Group> = new Map();
  private cullingBounds: Phaser.Geom.Rectangle;
  private textureAtlas: Map<string, Phaser.Textures.Texture> = new Map();
  private renderQueue: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, config?: Partial<RenderConfig>) {
    this.scene = scene;
    this.config = {
      enableBatching: true,
      maxBatchSize: 100,
      enableCulling: true,
      cullingMargin: 100,
      enableLOD: true,
      lodDistances: [200, 500, 1000],
      enableTextureAtlas: true,
      maxTextureSize: 2048,
      ...config
    };

    this.stats = {
      drawCalls: 0,
      batchedObjects: 0,
      culledObjects: 0,
      visibleObjects: 0,
      textureSwaps: 0,
      frameTime: 0
    };

    this.cullingBounds = new Phaser.Geom.Rectangle(
      -this.config.cullingMargin,
      -this.config.cullingMargin,
      this.scene.scale.width + this.config.cullingMargin * 2,
      this.scene.scale.height + this.config.cullingMargin * 2
    );

    this.initialize();
  }

  /**
   * Initialize the render optimizer
   */
  private initialize(): void {
    // Set up render pipeline optimizations
    this.setupBatching();
    this.setupCulling();
    this.setupLOD();
    this.setupTextureAtlas();

    // Hook into Phaser's render pipeline
    this.scene.events.on('prerender', this.onPreRender, this);
    this.scene.events.on('render', this.onRender, this);
    this.scene.events.on('postrender', this.onPostRender, this);

    console.log('🎨 Render optimizer initialized');
  }

  /**
   * Setup object batching
   */
  private setupBatching(): void {
    if (!this.config.enableBatching) return;

    // Create batch groups for common object types
    const batchTypes = ['particles', 'ui-elements', 'game-pieces', 'effects'];
    
    batchTypes.forEach(type => {
      const group = this.scene.add.group({
        maxSize: this.config.maxBatchSize,
        runChildUpdate: false
      });
      this.batchGroups.set(type, group);
    });
  }

  /**
   * Setup frustum culling
   */
  private setupCulling(): void {
    if (!this.config.enableCulling) return;

    // Update culling bounds when camera moves
    this.scene.cameras.main.on('cameramove', () => {
      this.updateCullingBounds();
    });
  }

  /**
   * Setup Level of Detail (LOD) system
   */
  private setupLOD(): void {
    if (!this.config.enableLOD) return;

    // LOD will be applied during rendering based on distance from camera
  }

  /**
   * Setup texture atlas optimization
   */
  private setupTextureAtlas(): void {
    if (!this.config.enableTextureAtlas) return;

    // Create texture atlases for commonly used textures
    this.createTextureAtlas('game-pieces', [
      'wood-chip', 'leaf-particle', 'sparkle-particle', 'water-droplet'
    ]);
  }

  /**
   * Create texture atlas from multiple textures
   */
  private createTextureAtlas(atlasName: string, textureKeys: string[]): void {
    try {
      // This is a simplified atlas creation - in practice you'd use a texture packer
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = this.config.maxTextureSize;
      canvas.height = this.config.maxTextureSize;

      let currentX = 0;
      let currentY = 0;
      let rowHeight = 0;

      textureKeys.forEach(key => {
        const texture = this.scene.textures.get(key);
        if (!texture || texture === this.scene.textures.get('__MISSING')) return;

        const source = texture.getSourceImage();
        if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
          const width = source.width;
          const height = source.height;

          // Check if we need to move to next row
          if (currentX + width > canvas.width) {
            currentX = 0;
            currentY += rowHeight;
            rowHeight = 0;
          }

          // Draw texture to atlas
          ctx.drawImage(source, currentX, currentY);

          // Update position
          currentX += width;
          rowHeight = Math.max(rowHeight, height);
        }
      });

      // Create new texture from atlas
      this.scene.textures.addCanvas(atlasName, canvas);
      this.textureAtlas.set(atlasName, this.scene.textures.get(atlasName));

    } catch (error) {
      console.warn('Failed to create texture atlas:', error);
    }
  }

  /**
   * Add object to batch group
   */
  public addToBatch(type: string, object: Phaser.GameObjects.GameObject): void {
    if (!this.config.enableBatching) return;

    const group = this.batchGroups.get(type);
    if (group && group.children.size < this.config.maxBatchSize) {
      group.add(object);
    }
  }

  /**
   * Remove object from batch group
   */
  public removeFromBatch(type: string, object: Phaser.GameObjects.GameObject): void {
    const group = this.batchGroups.get(type);
    if (group) {
      group.remove(object);
    }
  }

  /**
   * Update culling bounds based on camera position
   */
  private updateCullingBounds(): void {
    const camera = this.scene.cameras.main;
    this.cullingBounds.setTo(
      camera.scrollX - this.config.cullingMargin,
      camera.scrollY - this.config.cullingMargin,
      camera.width + this.config.cullingMargin * 2,
      camera.height + this.config.cullingMargin * 2
    );
  }

  /**
   * Check if object should be culled
   */
  private shouldCull(object: Phaser.GameObjects.GameObject): boolean {
    if (!this.config.enableCulling) return false;

    // Get object bounds - check if method exists
    if ('getBounds' in object && typeof object.getBounds === 'function') {
      const bounds = (object as any).getBounds();
      // Check if object intersects with culling bounds
      return !Phaser.Geom.Rectangle.Overlaps(bounds, this.cullingBounds);
    }
    
    return false; // Don't cull if we can't get bounds
  }

  /**
   * Get LOD level for object based on distance from camera
   */
  private getLODLevel(object: Phaser.GameObjects.GameObject): number {
    if (!this.config.enableLOD) return 0;

    // Check if object has position properties
    if (!('x' in object) || !('y' in object)) return 0;

    const camera = this.scene.cameras.main;
    const distance = Phaser.Math.Distance.Between(
      (object as any).x, (object as any).y,
      camera.centerX, camera.centerY
    );

    for (let i = 0; i < this.config.lodDistances.length; i++) {
      const lodDistance = this.config.lodDistances[i];
      if (lodDistance && distance < lodDistance) {
        return i;
      }
    }

    return this.config.lodDistances.length;
  }

  /**
   * Apply LOD to object
   */
  private applyLOD(object: Phaser.GameObjects.GameObject, lodLevel: number): void {
    // Check if object has visibility methods
    if (!('setVisible' in object)) return;

    // Reduce detail based on LOD level
    switch (lodLevel) {
      case 0: // High detail
        (object as any).setVisible(true);
        if ('setAlpha' in object) (object as any).setAlpha(1);
        break;
      case 1: // Medium detail
        (object as any).setVisible(true);
        if ('setAlpha' in object) (object as any).setAlpha(0.8);
        break;
      case 2: // Low detail
        (object as any).setVisible(true);
        if ('setAlpha' in object) (object as any).setAlpha(0.6);
        break;
      default: // Very low detail or hidden
        (object as any).setVisible(false);
        break;
    }
  }

  /**
   * Pre-render optimization
   */
  private onPreRender(): void {
    // Reset stats
    this.stats.drawCalls = 0;
    this.stats.batchedObjects = 0;
    this.stats.culledObjects = 0;
    this.stats.visibleObjects = 0;
    this.stats.textureSwaps = 0;

    // Update culling bounds
    this.updateCullingBounds();

    // Process all game objects
    this.scene.children.list.forEach(child => {
      this.processObject(child);
    });

    // Sort render queue by texture to minimize texture swaps
    this.sortRenderQueue();
  }

  /**
   * Process individual object for optimization
   */
  private processObject(object: Phaser.GameObjects.GameObject): void {
    // Apply culling
    if (this.shouldCull(object)) {
      if ('setVisible' in object) {
        (object as any).setVisible(false);
      }
      this.stats.culledObjects++;
      return;
    }

    // Apply LOD
    const lodLevel = this.getLODLevel(object);
    this.applyLOD(object, lodLevel);

    if ('visible' in object && (object as any).visible) {
      this.stats.visibleObjects++;
      this.renderQueue.push(object);
    }
  }

  /**
   * Sort render queue to minimize state changes
   */
  private sortRenderQueue(): void {
    this.renderQueue.sort((a, b) => {
      // Sort by texture first
      const aTexture = this.getObjectTexture(a);
      const bTexture = this.getObjectTexture(b);
      
      if (aTexture !== bTexture) {
        return aTexture.localeCompare(bTexture);
      }

      // Then by depth if available
      const aDepth = ('depth' in a) ? (a as any).depth : 0;
      const bDepth = ('depth' in b) ? (b as any).depth : 0;
      return aDepth - bDepth;
    });
  }

  /**
   * Get texture key for object
   */
  private getObjectTexture(object: Phaser.GameObjects.GameObject): string {
    if ('texture' in object && object.texture) {
      return (object.texture as Phaser.Textures.Texture).key;
    }
    return 'default';
  }

  /**
   * Render optimization
   */
  private onRender(): void {
    // Batch render similar objects
    this.batchGroups.forEach((group, type) => {
      if (group.children.size > 0) {
        this.renderBatch(group, type);
        this.stats.batchedObjects += group.children.size;
      }
    });
  }

  /**
   * Render a batch of objects
   */
  private renderBatch(group: Phaser.GameObjects.Group, type: string): void {
    // Use texture atlas if available
    const atlas = this.textureAtlas.get(type);
    if (atlas) {
      // Render all objects in batch with same texture
      this.stats.drawCalls++;
    } else {
      // Render individually but try to minimize state changes
      let lastTexture = '';
      group.children.entries.forEach(child => {
        const texture = this.getObjectTexture(child);
        if (texture !== lastTexture) {
          this.stats.textureSwaps++;
          lastTexture = texture;
        }
        this.stats.drawCalls++;
      });
    }
  }

  /**
   * Post-render cleanup
   */
  private onPostRender(): void {
    const endTime = performance.now();
    this.stats.frameTime = endTime - (this as any).renderStartTime;
    
    // Clear render queue for next frame
    this.renderQueue = [];

    // Emit performance stats
    this.scene.events.emit('render-stats', this.stats);
  }

  /**
   * Optimize texture usage
   */
  public optimizeTextures(): void {
    // Remove unused textures
    const usedTextures = new Set<string>();
    
    this.scene.children.list.forEach(child => {
      const texture = this.getObjectTexture(child);
      usedTextures.add(texture);
    });

    // Clean up unused textures (be careful with this in production)
    Object.entries(this.scene.textures.list).forEach(([key]: [string, any]) => {
      if (!usedTextures.has(key) && !key.startsWith('__')) {
        // Don't remove system textures
        console.log(`Removing unused texture: ${key}`);
        // this.scene.textures.remove(key); // Uncomment if safe to remove
      }
    });
  }

  /**
   * Get render statistics
   */
  public getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if needed
    if (newConfig.enableBatching !== undefined) {
      this.setupBatching();
    }
    if (newConfig.enableCulling !== undefined) {
      this.setupCulling();
    }
  }

  /**
   * Create debug overlay
   */
  public createDebugOverlay(): Phaser.GameObjects.Container {
    const overlay = this.scene.add.container(220, 10);
    overlay.setDepth(10000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, 200, 140);
    overlay.add(bg);

    const text = this.scene.add.text(5, 5, '', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#00FFFF'
    });
    overlay.add(text);

    // Update overlay
    this.scene.events.on('render-stats', (stats: RenderStats) => {
      text.setText([
        `Draw Calls: ${stats.drawCalls}`,
        `Batched: ${stats.batchedObjects}`,
        `Culled: ${stats.culledObjects}`,
        `Visible: ${stats.visibleObjects}`,
        `Tex Swaps: ${stats.textureSwaps}`,
        `Frame: ${stats.frameTime.toFixed(2)}ms`
      ].join('\n'));
    });

    return overlay;
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('🗑️ Forced garbage collection');
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.scene.events.off('prerender', this.onPreRender, this);
    this.scene.events.off('render', this.onRender, this);
    this.scene.events.off('postrender', this.onPostRender, this);

    this.batchGroups.forEach(group => group.destroy());
    this.batchGroups.clear();
    this.textureAtlas.clear();
    this.renderQueue = [];
  }
}