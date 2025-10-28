import * as Phaser from 'phaser';
import { 
  Season, 
  EnvironmentalState, 
  ActiveWildlife, 
  ActiveHazard,
  WeatherCondition,
  WeatherType,
  WildlifeType,
  HazardType,
  TimeOfDay
} from '../types/EnvironmentalTypes';

export class EnvironmentalRenderer {
  private scene: Phaser.Scene;
  private backgroundContainer: Phaser.GameObjects.Container;
  private foregroundContainer: Phaser.GameObjects.Container;
  private particleContainer: Phaser.GameObjects.Container;
  private wildlifeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private weatherParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private backgroundElements: Phaser.GameObjects.GameObject[] = [];
  private currentSeason: Season = Season.SPRING;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create layered containers for proper depth sorting
    this.backgroundContainer = scene.add.container(0, 0);
    this.backgroundContainer.setDepth(-10);
    
    this.particleContainer = scene.add.container(0, 0);
    this.particleContainer.setDepth(5);
    
    this.foregroundContainer = scene.add.container(0, 0);
    this.foregroundContainer.setDepth(10);
    
    this.initializeSeasonalBackgrounds();
  }

  private initializeSeasonalBackgrounds(): void {
    // Create seasonal background elements that will be shown/hidden
    this.createSpringBackground();
    this.createSummerBackground();
    this.createAutumnBackground();
    this.createWinterBackground();
  }

  private createSpringBackground(): void {
    // Spring sky gradient
    const springSky = this.scene.add.graphics();
    springSky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x98FB98, 0xF0FFF0);
    springSky.fillRect(0, 0, 800, 600);
    springSky.setVisible(false);
    springSky.setData('season', Season.SPRING);
    this.backgroundContainer.add(springSky);
    this.backgroundElements.push(springSky);

    // Cherry blossom trees
    const cherryTree = this.scene.add.graphics();
    cherryTree.fillStyle(0x8B4513); // Brown trunk
    cherryTree.fillRect(50, 400, 20, 200);
    cherryTree.fillRect(750, 350, 25, 250);
    
    // Cherry blossoms
    cherryTree.fillStyle(0xFFB6C1); // Light pink
    for (let i = 0; i < 20; i++) {
      const x = 30 + Math.random() * 60;
      const y = 350 + Math.random() * 100;
      cherryTree.fillCircle(x, y, 3 + Math.random() * 2);
    }
    
    cherryTree.setVisible(false);
    cherryTree.setData('season', Season.SPRING);
    this.backgroundContainer.add(cherryTree);
    this.backgroundElements.push(cherryTree);
  }

  private createSummerBackground(): void {
    // Summer sky - bright blue
    const summerSky = this.scene.add.graphics();
    summerSky.fillGradientStyle(0x00BFFF, 0x00BFFF, 0x87CEEB, 0x87CEEB);
    summerSky.fillRect(0, 0, 800, 600);
    summerSky.setVisible(false);
    summerSky.setData('season', Season.SUMMER);
    this.backgroundContainer.add(summerSky);
    this.backgroundElements.push(summerSky);

    // Lush green trees
    const summerTrees = this.scene.add.graphics();
    summerTrees.fillStyle(0x8B4513); // Brown trunks
    summerTrees.fillRect(40, 380, 30, 220);
    summerTrees.fillRect(730, 360, 35, 240);
    
    // Dense green foliage
    summerTrees.fillStyle(0x228B22); // Forest green
    summerTrees.fillCircle(55, 380, 40);
    summerTrees.fillCircle(747, 360, 45);
    
    // Sun
    summerTrees.fillStyle(0xFFD700); // Gold
    summerTrees.fillCircle(700, 80, 30);
    
    summerTrees.setVisible(false);
    summerTrees.setData('season', Season.SUMMER);
    this.backgroundContainer.add(summerTrees);
    this.backgroundElements.push(summerTrees);
  }

  private createAutumnBackground(): void {
    // Autumn sky - warm orange tones
    const autumnSky = this.scene.add.graphics();
    autumnSky.fillGradientStyle(0xFFA500, 0xFFA500, 0xFFE4B5, 0xFFE4B5);
    autumnSky.fillRect(0, 0, 800, 600);
    autumnSky.setVisible(false);
    autumnSky.setData('season', Season.AUTUMN);
    this.backgroundContainer.add(autumnSky);
    this.backgroundElements.push(autumnSky);

    // Autumn trees with colorful leaves
    const autumnTrees = this.scene.add.graphics();
    autumnTrees.fillStyle(0x8B4513); // Brown trunks
    autumnTrees.fillRect(35, 370, 35, 230);
    autumnTrees.fillRect(720, 350, 40, 250);
    
    // Colorful autumn foliage
    const autumnColors = [0xFF6347, 0xFFA500, 0xFFD700, 0xDC143C];
    autumnColors.forEach((color, index) => {
      autumnTrees.fillStyle(color);
      autumnTrees.fillCircle(52 + index * 8, 370 + index * 5, 35);
      autumnTrees.fillCircle(740 + index * 6, 350 + index * 4, 38);
    });
    
    autumnTrees.setVisible(false);
    autumnTrees.setData('season', Season.AUTUMN);
    this.backgroundContainer.add(autumnTrees);
    this.backgroundElements.push(autumnTrees);
  }

  private createWinterBackground(): void {
    // Winter sky - pale and cold
    const winterSky = this.scene.add.graphics();
    winterSky.fillGradientStyle(0xE6E6FA, 0xE6E6FA, 0xF0F8FF, 0xF0F8FF);
    winterSky.fillRect(0, 0, 800, 600);
    winterSky.setVisible(false);
    winterSky.setData('season', Season.WINTER);
    this.backgroundContainer.add(winterSky);
    this.backgroundElements.push(winterSky);

    // Bare winter trees with snow
    const winterTrees = this.scene.add.graphics();
    winterTrees.fillStyle(0x696969); // Dark gray trunks
    winterTrees.fillRect(30, 360, 40, 240);
    winterTrees.fillRect(710, 340, 45, 260);
    
    // Bare branches
    winterTrees.lineStyle(3, 0x696969);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      winterTrees.moveTo(50, 360);
      winterTrees.lineTo(50 + Math.cos(angle) * 25, 360 + Math.sin(angle) * 25);
    }
    
    // Snow on branches
    winterTrees.fillStyle(0xFFFFFF);
    winterTrees.fillEllipse(50, 350, 60, 20);
    winterTrees.fillEllipse(732, 330, 65, 22);
    
    winterTrees.setVisible(false);
    winterTrees.setData('season', Season.WINTER);
    this.backgroundContainer.add(winterTrees);
    this.backgroundElements.push(winterTrees);
  }

  public updateEnvironmentalState(state: EnvironmentalState): void {
    // Update season if changed
    if (state.currentSeason !== this.currentSeason) {
      this.transitionToSeason(state.currentSeason);
      this.currentSeason = state.currentSeason;
    }

    // Update wildlife
    this.updateWildlifeRendering(state.activeWildlife);
    
    // Update hazard effects
    this.updateHazardRendering(state.activeHazards);
    
    // Update weather
    this.updateWeatherRendering(state.weatherConditions);
    
    // Update ambient lighting
    this.updateAmbientLighting(state.ambientLighting);
  }

  private transitionToSeason(newSeason: Season): void {
    // Hide all seasonal backgrounds
    this.backgroundElements.forEach(element => {
      element.setVisible(false);
    });
    
    // Show elements for new season
    this.backgroundElements.forEach(element => {
      if (element.getData('season') === newSeason) {
        element.setVisible(true);
      }
    });
    
    // Create transition effect
    this.createSeasonTransitionEffect(newSeason);
  }

  private createSeasonTransitionEffect(season: Season): void {
    const transitionOverlay = this.scene.add.graphics();
    transitionOverlay.setDepth(20); // Above everything
    
    let transitionColor: number;
    switch (season) {
      case Season.SPRING: transitionColor = 0x98FB98; break;
      case Season.SUMMER: transitionColor = 0xFFD700; break;
      case Season.AUTUMN: transitionColor = 0xFFA500; break;
      case Season.WINTER: transitionColor = 0xE6E6FA; break;
    }
    
    transitionOverlay.fillStyle(transitionColor, 0.8);
    transitionOverlay.fillRect(0, 0, 800, 600);
    
    // Fade out transition
    this.scene.tweens.add({
      targets: transitionOverlay,
      alpha: 0,
      duration: 2000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        transitionOverlay.destroy();
      }
    });
  }

  private updateWildlifeRendering(activeWildlife: ActiveWildlife[]): void {
    // Remove sprites for wildlife that no longer exists
    const activeIds = new Set(activeWildlife.map((_, index) => `wildlife_${index}`));
    this.wildlifeSprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.wildlifeSprites.delete(id);
      }
    });

    // Update or create sprites for active wildlife
    activeWildlife.forEach((wildlife, index) => {
      const id = `wildlife_${index}`;
      let sprite = this.wildlifeSprites.get(id);
      
      if (!sprite) {
        sprite = this.createWildlifeSprite(wildlife);
        this.wildlifeSprites.set(id, sprite);
        this.foregroundContainer.add(sprite);
      }
      
      // Update sprite position and animation
      sprite.setPosition(wildlife.x, wildlife.y);
      this.updateWildlifeAnimation(sprite, wildlife);
    });
  }

  private createWildlifeSprite(wildlife: ActiveWildlife): Phaser.GameObjects.Sprite {
    let texture: string;
    let tint: number = 0xFFFFFF;
    
    switch (wildlife.wildlife.type) {
      case WildlifeType.DRAGONFLY:
        texture = 'dragonfly';
        tint = 0x00CED1; // Dark turquoise
        break;
      case WildlifeType.FISH:
        texture = 'fish';
        tint = 0x4169E1; // Royal blue
        break;
      case WildlifeType.BIRD:
        texture = 'bird';
        tint = 0x8B4513; // Saddle brown
        break;
      case WildlifeType.BUTTERFLY:
        texture = 'butterfly';
        tint = 0xFF69B4; // Hot pink
        break;
      case WildlifeType.BEAVER:
        texture = 'beaver';
        tint = 0xA0522D; // Sienna
        break;
      case WildlifeType.FROG:
        texture = 'frog';
        tint = 0x228B22; // Forest green
        break;
      default:
        texture = 'generic_wildlife';
    }
    
    // Create simple colored circle as placeholder (replace with actual sprites later)
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(tint);
    graphics.fillCircle(0, 0, 8);
    
    // Convert to sprite-like object
    const sprite = this.scene.add.sprite(0, 0, null);
    sprite.setTexture(graphics.generateTexture('wildlife_' + wildlife.wildlife.type));
    graphics.destroy();
    
    return sprite;
  }

  private updateWildlifeAnimation(sprite: Phaser.GameObjects.Sprite, wildlife: ActiveWildlife): void {
    // Simple animation based on wildlife type and behavior
    const time = wildlife.animationFrame;
    
    switch (wildlife.wildlife.behavior) {
      case WildlifeBehavior.FLYING_ACROSS:
        sprite.setRotation(Math.sin(time * 0.1) * 0.2);
        sprite.setScale(1 + Math.sin(time * 0.05) * 0.1);
        break;
      case WildlifeBehavior.SWIMMING:
        sprite.y += Math.sin(time * 0.08) * 0.5;
        break;
      case WildlifeBehavior.FLOATING:
        sprite.y += Math.sin(time * 0.03) * 1;
        sprite.setRotation(Math.sin(time * 0.02) * 0.1);
        break;
      case WildlifeBehavior.JUMPING:
        if (Math.floor(time / 100) % 60 < 10) { // Jump every 6 seconds for 1 second
          sprite.y -= Math.sin((time % 100) * 0.3) * 10;
        }
        break;
    }
  }

  private updateHazardRendering(activeHazards: ActiveHazard[]): void {
    activeHazards.forEach(hazard => {
      switch (hazard.hazard.type) {
        case HazardType.FALLING_LEAVES:
          this.renderFallingLeaves(hazard.currentIntensity);
          break;
        case HazardType.SNOW_STORM:
          this.renderSnowStorm(hazard.currentIntensity);
          break;
        case HazardType.LIGHTNING:
          this.renderLightning();
          break;
        case HazardType.WIND_GUST:
          this.renderWindEffect(hazard.currentIntensity);
          break;
      }
    });
  }

  private renderFallingLeaves(intensity: number): void {
    // Create falling leaf particles
    const leafEmitter = this.scene.add.particles(0, -20, null, {
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.8, end: 0.2 },
      lifespan: 3000,
      frequency: 50 / intensity,
      gravityY: 30,
      speedX: { min: -20, max: 20 },
      speedY: { min: 10, max: 30 },
      emitZone: { type: 'edge', source: new Phaser.Geom.Rectangle(0, 0, 800, 1), quantity: 1 }
    });
    
    // Create leaf texture
    const leafGraphics = this.scene.add.graphics();
    leafGraphics.fillStyle(0xFF6347); // Tomato color
    leafGraphics.fillEllipse(0, 0, 6, 4);
    leafEmitter.setTexture(leafGraphics.generateTexture('leaf'));
    leafGraphics.destroy();
    
    this.weatherParticles.push(leafEmitter);
    
    // Auto-cleanup after hazard duration
    this.scene.time.delayedCall(4000, () => {
      leafEmitter.destroy();
      const index = this.weatherParticles.indexOf(leafEmitter);
      if (index > -1) this.weatherParticles.splice(index, 1);
    });
  }

  private renderSnowStorm(intensity: number): void {
    const snowEmitter = this.scene.add.particles(0, -20, null, {
      scale: { start: 0.2, end: 0.4 },
      alpha: { start: 0.9, end: 0.3 },
      lifespan: 4000,
      frequency: 30 / intensity,
      gravityY: 20,
      speedX: { min: -30 * intensity, max: 30 * intensity },
      speedY: { min: 5, max: 25 },
      emitZone: { type: 'edge', source: new Phaser.Geom.Rectangle(0, 0, 800, 1), quantity: 2 }
    });
    
    // Create snowflake texture
    const snowGraphics = this.scene.add.graphics();
    snowGraphics.fillStyle(0xFFFFFF);
    snowGraphics.fillCircle(0, 0, 2);
    snowEmitter.setTexture(snowGraphics.generateTexture('snowflake'));
    snowGraphics.destroy();
    
    this.weatherParticles.push(snowEmitter);
  }

  private renderLightning(): void {
    // Create lightning flash effect
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFFFFF, 0.8);
    flash.fillRect(0, 0, 800, 600);
    flash.setDepth(15);
    
    // Quick flash and fade
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy()
    });
  }

  private renderWindEffect(intensity: number): void {
    // Create wind particle streaks
    const windEmitter = this.scene.add.particles(0, 0, null, {
      scale: { start: 0.1, end: 0.05 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 1000,
      frequency: 20,
      speedX: { min: 100 * intensity, max: 200 * intensity },
      speedY: { min: -10, max: 10 },
      emitZone: { 
        type: 'edge', 
        source: new Phaser.Geom.Rectangle(-20, 100, 1, 400), 
        quantity: 1 
      }
    });
    
    // Create wind streak texture
    const windGraphics = this.scene.add.graphics();
    windGraphics.fillStyle(0xE6E6FA, 0.5);
    windGraphics.fillEllipse(0, 0, 8, 2);
    windEmitter.setTexture(windGraphics.generateTexture('wind_streak'));
    windGraphics.destroy();
    
    this.weatherParticles.push(windEmitter);
  }

  private updateWeatherRendering(weatherConditions: WeatherCondition[]): void {
    // Handle weather-specific rendering
    weatherConditions.forEach(condition => {
      switch (condition.type) {
        case WeatherType.RAIN:
          this.renderRain(condition.intensity);
          break;
        case WeatherType.FOG:
          this.renderFog(condition.intensity);
          break;
      }
    });
  }

  private renderRain(intensity: number): void {
    const rainEmitter = this.scene.add.particles(0, -20, null, {
      scale: { start: 0.1, end: 0.05 },
      alpha: { start: 0.8, end: 0.4 },
      lifespan: 1500,
      frequency: 10 / intensity,
      gravityY: 200,
      speedX: { min: -10, max: 10 },
      speedY: { min: 100, max: 200 },
      emitZone: { type: 'edge', source: new Phaser.Geom.Rectangle(0, 0, 800, 1), quantity: 3 }
    });
    
    // Create raindrop texture
    const rainGraphics = this.scene.add.graphics();
    rainGraphics.fillStyle(0x4169E1);
    rainGraphics.fillEllipse(0, 0, 2, 8);
    rainEmitter.setTexture(rainGraphics.generateTexture('raindrop'));
    rainGraphics.destroy();
    
    this.weatherParticles.push(rainEmitter);
  }

  private renderFog(intensity: number): void {
    const fogOverlay = this.scene.add.graphics();
    fogOverlay.fillStyle(0xF5F5F5, 0.3 * intensity);
    fogOverlay.fillRect(0, 0, 800, 600);
    fogOverlay.setDepth(8);
    
    // Slowly animate fog density
    this.scene.tweens.add({
      targets: fogOverlay,
      alpha: { from: 0.3 * intensity, to: 0.1 * intensity },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private updateAmbientLighting(lighting: any): void {
    // Apply ambient lighting effects to the scene
    this.scene.cameras.main.setTint(
      Phaser.Display.Color.HexStringToColor(lighting.baseColor).color
    );
  }

  public createRiverbankWalls(): void {
    // Create rocky riverbank walls on the sides
    const leftWall = this.scene.add.graphics();
    const rightWall = this.scene.add.graphics();
    
    // Left wall
    leftWall.fillGradientStyle(0x696969, 0x2F4F4F, 0x2F4F4F, 0x696969);
    leftWall.fillRect(0, 0, 50, 600);
    
    // Add rock texture
    for (let i = 0; i < 20; i++) {
      leftWall.fillStyle(0x808080, 0.6);
      leftWall.fillCircle(
        Math.random() * 50,
        Math.random() * 600,
        2 + Math.random() * 4
      );
    }
    
    // Right wall
    rightWall.fillGradientStyle(0x696969, 0x2F4F4F, 0x2F4F4F, 0x696969);
    rightWall.fillRect(750, 0, 50, 600);
    
    // Add rock texture
    for (let i = 0; i < 20; i++) {
      rightWall.fillStyle(0x808080, 0.6);
      rightWall.fillCircle(
        750 + Math.random() * 50,
        Math.random() * 600,
        2 + Math.random() * 4
      );
    }
    
    leftWall.setDepth(-8);
    rightWall.setDepth(-8);
    
    this.backgroundContainer.add(leftWall);
    this.backgroundContainer.add(rightWall);
  }

  public createWaterfall(x: number, height: number): void {
    // Create waterfall effect when lines are cleared
    const waterfallEmitter = this.scene.add.particles(x, 0, null, {
      scale: { start: 0.2, end: 0.1 },
      alpha: { start: 0.8, end: 0.3 },
      lifespan: 2000,
      frequency: 20,
      gravityY: 150,
      speedX: { min: -5, max: 5 },
      speedY: { min: 50, max: 100 },
      emitZone: { 
        type: 'edge', 
        source: new Phaser.Geom.Rectangle(x - 10, 0, 20, 1), 
        quantity: 2 
      }
    });
    
    // Create water droplet texture
    const dropletGraphics = this.scene.add.graphics();
    dropletGraphics.fillStyle(0x4169E1);
    dropletGraphics.fillCircle(0, 0, 3);
    waterfallEmitter.setTexture(dropletGraphics.generateTexture('water_droplet'));
    dropletGraphics.destroy();
    
    // Auto-cleanup after effect
    this.scene.time.delayedCall(3000, () => {
      waterfallEmitter.destroy();
    });
  }

  public destroy(): void {
    this.backgroundContainer.destroy();
    this.foregroundContainer.destroy();
    this.particleContainer.destroy();
    
    this.weatherParticles.forEach(emitter => emitter.destroy());
    this.weatherParticles = [];
    
    this.wildlifeSprites.forEach(sprite => sprite.destroy());
    this.wildlifeSprites.clear();
  }
}