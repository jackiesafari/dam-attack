import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { World, Season } from '../types/EnvironmentalTypes';

interface LevelData {
  level: number;
  world: World;
  season: Season;
  name: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  bestScore: number;
}

export class LevelSelect extends Scene {
  private worldContainers: Map<World, Phaser.GameObjects.Container> = new Map();
  private levelButtons: Map<number, Phaser.GameObjects.Container> = new Map();
  private currentWorld: World = World.SPRING_THAW;
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  
  // UI Elements
  private titleText!: Phaser.GameObjects.Text;
  private worldTitleText!: Phaser.GameObjects.Text;
  private backButton!: Phaser.GameObjects.Text;
  private endlessModeButton!: Phaser.GameObjects.Text;
  
  // World navigation
  private worldButtons: Map<World, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super('LevelSelect');
  }

  create() {
    this.createBackground();
    this.createUI();
    this.createWorldNavigation();
    this.createLevelGrid();
    this.loadProgressData();
    this.showWorld(World.SPRING_THAW);
  }

  private createBackground(): void {
    // Seasonal background that changes based on selected world
    this.backgroundGraphics = this.add.graphics();
    this.updateBackgroundForWorld(World.SPRING_THAW);
  }

  private updateBackgroundForWorld(world: World): void {
    this.backgroundGraphics.clear();
    
    switch (world) {
      case World.SPRING_THAW:
        // Spring gradient
        this.backgroundGraphics.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x98FB98, 0xF0FFF0);
        this.backgroundGraphics.fillRect(0, 0, 800, 600);
        
        // Cherry blossoms
        for (let i = 0; i < 15; i++) {
          this.backgroundGraphics.fillStyle(0xFFB6C1, 0.7);
          this.backgroundGraphics.fillCircle(
            Math.random() * 800,
            Math.random() * 600,
            3 + Math.random() * 2
          );
        }
        break;
        
      case World.SUMMER_FLOW:
        // Summer gradient
        this.backgroundGraphics.fillGradientStyle(0x00BFFF, 0x00BFFF, 0x87CEEB, 0x87CEEB);
        this.backgroundGraphics.fillRect(0, 0, 800, 600);
        
        // Sun
        this.backgroundGraphics.fillStyle(0xFFD700);
        this.backgroundGraphics.fillCircle(700, 80, 40);
        break;
        
      case World.AUTUMN_RUSH:
        // Autumn gradient
        this.backgroundGraphics.fillGradientStyle(0xFFA500, 0xFFA500, 0xFFE4B5, 0xFFE4B5);
        this.backgroundGraphics.fillRect(0, 0, 800, 600);
        
        // Falling leaves
        const autumnColors = [0xFF6347, 0xFFA500, 0xFFD700, 0xDC143C];
        for (let i = 0; i < 20; i++) {
          this.backgroundGraphics.fillStyle(autumnColors[Math.floor(Math.random() * autumnColors.length)]);
          this.backgroundGraphics.fillEllipse(
            Math.random() * 800,
            Math.random() * 600,
            4, 6
          );
        }
        break;
        
      case World.WINTER_FREEZE:
        // Winter gradient
        this.backgroundGraphics.fillGradientStyle(0xE6E6FA, 0xE6E6FA, 0xF0F8FF, 0xF0F8FF);
        this.backgroundGraphics.fillRect(0, 0, 800, 600);
        
        // Snowflakes
        for (let i = 0; i < 25; i++) {
          this.backgroundGraphics.fillStyle(0xFFFFFF, 0.8);
          this.backgroundGraphics.fillCircle(
            Math.random() * 800,
            Math.random() * 600,
            2 + Math.random() * 2
          );
        }
        break;
    }
  }

  private createUI(): void {
    // Title
    this.titleText = this.add.text(400, 50, 'Dam Attack - Campaign', {
      fontSize: '36px',
      color: '#FFD700',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // World title
    this.worldTitleText = this.add.text(400, 100, '', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Back button
    this.backButton = this.add.text(50, 50, '← Back', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black'
    }).setInteractive();
    
    this.backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
    
    this.backButton.on('pointerover', () => {
      this.backButton.setColor('#FFD700');
    });
    
    this.backButton.on('pointerout', () => {
      this.backButton.setColor('#FFFFFF');
    });

    // Endless mode button (unlocked after completing winter)
    this.endlessModeButton = this.add.text(400, 550, 'Endless Mode: Eternal Dam', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setInteractive();
    
    this.endlessModeButton.on('pointerdown', () => {
      if (this.isEndlessModeUnlocked()) {
        this.scene.start('EnhancedGame', { mode: 'endless' });
      }
    });
  }

  private createWorldNavigation(): void {
    const worlds = [
      { world: World.SPRING_THAW, name: 'Spring Thaw 🌸', color: '#98FB98' },
      { world: World.SUMMER_FLOW, name: 'Summer Flow ☀️', color: '#FFD700' },
      { world: World.AUTUMN_RUSH, name: 'Autumn Rush 🍂', color: '#FFA500' },
      { world: World.WINTER_FREEZE, name: 'Winter Freeze ❄️', color: '#E6E6FA' }
    ];

    worlds.forEach((worldData, index) => {
      const x = 100 + index * 150;
      const y = 150;
      
      const worldContainer = this.add.container(x, y);
      
      // World button background
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x2d2d2d, 0.8);
      buttonBg.fillRoundedRect(-60, -25, 120, 50, 10);
      buttonBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(worldData.color).color);
      buttonBg.strokeRoundedRect(-60, -25, 120, 50, 10);
      
      // World name
      const worldText = this.add.text(0, 0, worldData.name, {
        fontSize: '14px',
        color: worldData.color,
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);
      
      worldContainer.add([buttonBg, worldText]);
      
      // Make interactive
      worldContainer.setSize(120, 50);
      worldContainer.setInteractive();
      
      worldContainer.on('pointerdown', () => {
        if (this.isWorldUnlocked(worldData.world)) {
          this.showWorld(worldData.world);
        }
      });
      
      worldContainer.on('pointerover', () => {
        if (this.isWorldUnlocked(worldData.world)) {
          buttonBg.clear();
          buttonBg.fillStyle(0x4d4d4d, 0.9);
          buttonBg.fillRoundedRect(-60, -25, 120, 50, 10);
          buttonBg.lineStyle(3, Phaser.Display.Color.HexStringToColor(worldData.color).color);
          buttonBg.strokeRoundedRect(-60, -25, 120, 50, 10);
        }
      });
      
      worldContainer.on('pointerout', () => {
        buttonBg.clear();
        buttonBg.fillStyle(0x2d2d2d, 0.8);
        buttonBg.fillRoundedRect(-60, -25, 120, 50, 10);
        buttonBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(worldData.color).color);
        buttonBg.strokeRoundedRect(-60, -25, 120, 50, 10);
      });
      
      this.worldButtons.set(worldData.world, worldContainer);
    });
  }

  private createLevelGrid(): void {
    // Create level buttons for each world (5 levels per world)
    for (let world = 0; world < 4; world++) {
      const worldEnum = [World.SPRING_THAW, World.SUMMER_FLOW, World.AUTUMN_RUSH, World.WINTER_FREEZE][world];
      const worldContainer = this.add.container(0, 0);
      worldContainer.setVisible(false);
      
      for (let level = 1; level <= 5; level++) {
        const globalLevel = world * 5 + level;
        const levelButton = this.createLevelButton(globalLevel, worldEnum, level);
        worldContainer.add(levelButton);
      }
      
      this.worldContainers.set(worldEnum, worldContainer);
    }
  }

  private createLevelButton(globalLevel: number, world: World, levelInWorld: number): Phaser.GameObjects.Container {
    const col = (levelInWorld - 1) % 5;
    const row = Math.floor((levelInWorld - 1) / 5);
    const x = 200 + col * 120;
    const y = 250 + row * 100;
    
    const levelContainer = this.add.container(x, y);
    
    // Level button background
    const buttonBg = this.add.graphics();
    const isUnlocked = this.isLevelUnlocked(globalLevel);
    const isCompleted = this.isLevelCompleted(globalLevel);
    
    if (isCompleted) {
      buttonBg.fillStyle(0x228B22, 0.8); // Green for completed
    } else if (isUnlocked) {
      buttonBg.fillStyle(0x4169E1, 0.8); // Blue for available
    } else {
      buttonBg.fillStyle(0x696969, 0.5); // Gray for locked
    }
    
    buttonBg.fillRoundedRect(-40, -40, 80, 80, 10);
    buttonBg.lineStyle(2, 0xFFFFFF);
    buttonBg.strokeRoundedRect(-40, -40, 80, 80, 10);
    
    // Level number
    const levelText = this.add.text(0, -10, globalLevel.toString(), {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    
    // Stars (if completed)
    const stars = this.getLevelStars(globalLevel);
    const starText = this.add.text(0, 15, '⭐'.repeat(stars), {
      fontSize: '12px',
      color: '#FFD700'
    }).setOrigin(0.5);
    
    // Lock icon (if locked)
    let lockIcon: Phaser.GameObjects.Text | null = null;
    if (!isUnlocked) {
      lockIcon = this.add.text(0, 0, '🔒', {
        fontSize: '20px'
      }).setOrigin(0.5);
    }
    
    levelContainer.add([buttonBg, levelText, starText]);
    if (lockIcon) levelContainer.add(lockIcon);
    
    // Make interactive if unlocked
    if (isUnlocked) {
      levelContainer.setSize(80, 80);
      levelContainer.setInteractive();
      
      levelContainer.on('pointerdown', () => {
        this.startLevel(globalLevel);
      });
      
      levelContainer.on('pointerover', () => {
        buttonBg.clear();
        if (isCompleted) {
          buttonBg.fillStyle(0x32CD32, 0.9); // Brighter green
        } else {
          buttonBg.fillStyle(0x6495ED, 0.9); // Brighter blue
        }
        buttonBg.fillRoundedRect(-40, -40, 80, 80, 10);
        buttonBg.lineStyle(3, 0xFFD700);
        buttonBg.strokeRoundedRect(-40, -40, 80, 80, 10);
        
        // Show level info tooltip
        this.showLevelTooltip(globalLevel, x, y);
      });
      
      levelContainer.on('pointerout', () => {
        buttonBg.clear();
        if (isCompleted) {
          buttonBg.fillStyle(0x228B22, 0.8);
        } else {
          buttonBg.fillStyle(0x4169E1, 0.8);
        }
        buttonBg.fillRoundedRect(-40, -40, 80, 80, 10);
        buttonBg.lineStyle(2, 0xFFFFFF);
        buttonBg.strokeRoundedRect(-40, -40, 80, 80, 10);
        
        this.hideLevelTooltip();
      });
    }
    
    this.levelButtons.set(globalLevel, levelContainer);
    return levelContainer;
  }

  private showWorld(world: World): void {
    this.currentWorld = world;
    
    // Hide all world containers
    this.worldContainers.forEach(container => container.setVisible(false));
    
    // Show selected world
    const worldContainer = this.worldContainers.get(world);
    if (worldContainer) {
      worldContainer.setVisible(true);
    }
    
    // Update background
    this.updateBackgroundForWorld(world);
    
    // Update world title
    const worldNames = {
      [World.SPRING_THAW]: 'Spring Thaw - Levels 1-5',
      [World.SUMMER_FLOW]: 'Summer Flow - Levels 6-10',
      [World.AUTUMN_RUSH]: 'Autumn Rush - Levels 11-15',
      [World.WINTER_FREEZE]: 'Winter Freeze - Levels 16-20'
    };
    
    this.worldTitleText.setText(worldNames[world]);
    
    // Update world button highlights
    this.worldButtons.forEach((button, buttonWorld) => {
      const graphics = button.list[0] as Phaser.GameObjects.Graphics;
      graphics.clear();
      
      if (buttonWorld === world) {
        // Highlight selected world
        graphics.fillStyle(0x4d4d4d, 0.9);
        graphics.fillRoundedRect(-60, -25, 120, 50, 10);
        graphics.lineStyle(3, 0xFFD700);
        graphics.strokeRoundedRect(-60, -25, 120, 50, 10);
      } else {
        // Normal state
        graphics.fillStyle(0x2d2d2d, 0.8);
        graphics.fillRoundedRect(-60, -25, 120, 50, 10);
        const worldColors = {
          [World.SPRING_THAW]: 0x98FB98,
          [World.SUMMER_FLOW]: 0xFFD700,
          [World.AUTUMN_RUSH]: 0xFFA500,
          [World.WINTER_FREEZE]: 0xE6E6FA
        };
        graphics.lineStyle(2, worldColors[buttonWorld]);
        graphics.strokeRoundedRect(-60, -25, 120, 50, 10);
      }
    });
  }

  private showLevelTooltip(level: number, x: number, y: number): void {
    // Create tooltip with level information
    const tooltip = this.add.container(x, y - 60);
    
    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x000000, 0.9);
    tooltipBg.fillRoundedRect(-80, -30, 160, 60, 8);
    tooltipBg.lineStyle(2, 0xFFD700);
    tooltipBg.strokeRoundedRect(-80, -30, 160, 60, 8);
    
    const levelName = this.getLevelName(level);
    const bestScore = this.getLevelBestScore(level);
    
    const tooltipText = this.add.text(0, 0, 
      `${levelName}\nBest: ${bestScore.toLocaleString()}`, {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      align: 'center'
    }).setOrigin(0.5);
    
    tooltip.add([tooltipBg, tooltipText]);
    tooltip.setData('isTooltip', true);
  }

  private hideLevelTooltip(): void {
    // Remove any existing tooltips
    this.children.list.forEach(child => {
      if (child.getData && child.getData('isTooltip')) {
        child.destroy();
      }
    });
  }

  private startLevel(level: number): void {
    this.scene.start('EnhancedGame', { level: level, mode: 'campaign' });
  }

  // Mock data methods (replace with actual save system)
  private isWorldUnlocked(world: World): boolean {
    // Spring is always unlocked, others unlock when previous world is completed
    const worldOrder = [World.SPRING_THAW, World.SUMMER_FLOW, World.AUTUMN_RUSH, World.WINTER_FREEZE];
    const worldIndex = worldOrder.indexOf(world);
    
    if (worldIndex === 0) return true;
    
    // Check if previous world is completed
    const previousWorld = worldOrder[worldIndex - 1];
    return this.isWorldCompleted(previousWorld);
  }

  private isWorldCompleted(world: World): boolean {
    // Check if all levels in world are completed
    const worldStartLevel = this.getWorldStartLevel(world);
    for (let i = 0; i < 5; i++) {
      if (!this.isLevelCompleted(worldStartLevel + i)) {
        return false;
      }
    }
    return true;
  }

  private getWorldStartLevel(world: World): number {
    const worldOrder = [World.SPRING_THAW, World.SUMMER_FLOW, World.AUTUMN_RUSH, World.WINTER_FREEZE];
    return worldOrder.indexOf(world) * 5 + 1;
  }

  private isLevelUnlocked(level: number): boolean {
    // Level 1 is always unlocked, others unlock when previous level is completed
    if (level === 1) return true;
    return this.isLevelCompleted(level - 1);
  }

  private isLevelCompleted(level: number): boolean {
    // Mock implementation - replace with actual save data
    const savedProgress = localStorage.getItem('dam_attack_progress');
    if (!savedProgress) return false;
    
    try {
      const progress = JSON.parse(savedProgress);
      const levelProgress = progress.levelProgress?.find(([l]: [number, any]) => l === level);
      return levelProgress?.[1]?.isCompleted || false;
    } catch {
      return false;
    }
  }

  private getLevelStars(level: number): number {
    // Mock implementation
    const savedProgress = localStorage.getItem('dam_attack_progress');
    if (!savedProgress) return 0;
    
    try {
      const progress = JSON.parse(savedProgress);
      const levelProgress = progress.levelProgress?.find(([l]: [number, any]) => l === level);
      return levelProgress?.[1]?.stars || 0;
    } catch {
      return 0;
    }
  }

  private getLevelBestScore(level: number): number {
    // Mock implementation
    const savedProgress = localStorage.getItem('dam_attack_progress');
    if (!savedProgress) return 0;
    
    try {
      const progress = JSON.parse(savedProgress);
      const levelProgress = progress.levelProgress?.find(([l]: [number, any]) => l === level);
      return levelProgress?.[1]?.score || 0;
    } catch {
      return 0;
    }
  }

  private getLevelName(level: number): string {
    const levelNames = [
      'First Thaw', 'Cherry Blossom Falls', 'Beaver\'s Helper', 'Morning Mist', 'Spring\'s End',
      'Summer\'s Arrival', 'Dragonfly Dance', 'Sunny Rapids', 'Heat Wave', 'Summer Storm',
      'Autumn\'s Call', 'Falling Leaves', 'Harvest Moon', 'Windy Heights', 'Last Light',
      'First Frost', 'Ice Formation', 'Blizzard Challenge', 'Frozen Rapids', 'Eternal Winter'
    ];
    
    return levelNames[level - 1] || `Level ${level}`;
  }

  private isEndlessModeUnlocked(): boolean {
    return this.isWorldCompleted(World.WINTER_FREEZE);
  }

  private loadProgressData(): void {
    // Update endless mode button based on unlock status
    if (this.isEndlessModeUnlocked()) {
      this.endlessModeButton.setColor('#00FF00');
      this.endlessModeButton.setText('🌊 Endless Mode: Eternal Dam - UNLOCKED');
    } else {
      this.endlessModeButton.setColor('#888888');
      this.endlessModeButton.setText('🔒 Endless Mode: Complete Winter Freeze to unlock');
    }
  }
}