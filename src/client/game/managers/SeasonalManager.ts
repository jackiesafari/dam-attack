import * as Phaser from 'phaser';
import { 
  Season, 
  World, 
  SeasonalLevel, 
  EnvironmentalState,
  EnvironmentalHazard,
  WildlifeElement,
  SeasonalMechanic,
  HazardType,
  WildlifeType,
  WildlifeBehavior,
  WildlifeInteraction,
  MechanicType,
  TimeOfDay,
  AmbientLighting,
  StoryElement,
  StoryType,
  Character,
  Emotion,
  AnimationType
} from '../types/EnvironmentalTypes';

export class SeasonalManager {
  private scene: Phaser.Scene;
  private environmentalState: EnvironmentalState;
  private seasonalLevels: Map<number, SeasonalLevel> = new Map();
  private storyElements: Map<number, StoryElement[]> = new Map();
  private listeners: ((state: EnvironmentalState) => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeSeasonalLevels();
    this.initializeStoryElements();
    this.environmentalState = this.createInitialState();
  }

  private initializeSeasonalLevels(): void {
    // SPRING THAW (Levels 1-5) - Tutorial and gentle introduction
    this.seasonalLevels.set(1, {
      world: World.SPRING_THAW,
      levelNumber: 1,
      globalLevel: 1,
      season: Season.SPRING,
      name: "First Thaw",
      description: "The ice begins to melt, and you must start building your first dam",
      targetLines: 10,
      waterRiseRate: 0.0006, // Moderate speed - 0.06% per second (1667 seconds = ~2.8 minutes to fill)
      gracePeriod: 30000, // 30 seconds grace period
      baseDropTime: 1200, // Reverted to original speed
      environmentalHazards: [],
      wildlife: [
        {
          type: WildlifeType.BIRD,
          spawnRate: 0.3,
          behavior: WildlifeBehavior.FLYING_ACROSS,
          visualEffect: 'spring_bird',
          soundEffect: 'bird_chirp'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.GROWTH_BONUS,
          description: "Spring growth gives bonus points for completed lines",
          effect: {
            intensity: 1.2,
            gameplayModifier: { scoreMultiplier: 1.2 }
          }
        }
      ],
      ambientSounds: ['spring_stream', 'bird_songs', 'gentle_wind']
    });

    this.seasonalLevels.set(2, {
      world: World.SPRING_THAW,
      levelNumber: 2,
      globalLevel: 2,
      season: Season.SPRING,
      name: "Cherry Blossom Falls",
      description: "Pink petals drift down as the water rises faster",
      targetLines: 15,
      waterRiseRate: 0.0007, // Slightly faster - 0.07% per second (1429 seconds = ~2.4 minutes to fill)
      gracePeriod: 25000, // 25 seconds grace period
      baseDropTime: 1100, // Reverted to original speed
      environmentalHazards: [
        {
          type: HazardType.SPRING_FLOOD,
          frequency: 0.2,
          duration: 5000,
          intensity: 0.3,
          description: "Spring melt causes sudden water surges"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.BUTTERFLY,
          spawnRate: 0.5,
          behavior: WildlifeBehavior.FLOATING,
          visualEffect: 'cherry_petals',
          soundEffect: 'gentle_flutter'
        },
        {
          type: WildlifeType.FROG,
          spawnRate: 0.2,
          behavior: WildlifeBehavior.JUMPING,
          visualEffect: 'spring_frog',
          soundEffect: 'frog_croak'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.SEASONAL_PIECES,
          description: "Fresh spring wood is lighter and more buoyant",
          effect: {
            intensity: 0.8,
            gameplayModifier: { dropSpeedMultiplier: 0.9 }
          }
        }
      ],
      ambientSounds: ['spring_stream', 'bird_songs', 'rustling_leaves']
    });

    this.seasonalLevels.set(3, {
      world: World.SPRING_THAW,
      levelNumber: 3,
      globalLevel: 3,
      season: Season.SPRING,
      name: "Beaver's First Helper",
      description: "A friendly beaver appears to help with your dam construction",
      targetLines: 20,
      waterRiseRate: 0.0008, // Faster - 0.08% per second (1250 seconds = ~2.1 minutes to fill)
      gracePeriod: 20000, // 20 seconds grace period
      baseDropTime: 1000, // Reverted to original speed
      environmentalHazards: [],
      wildlife: [
        {
          type: WildlifeType.BEAVER,
          spawnRate: 0.1,
          behavior: WildlifeBehavior.BUILDING,
          visualEffect: 'helpful_beaver',
          soundEffect: 'beaver_chatter',
          interactionType: WildlifeInteraction.BONUS_POINTS
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.GROWTH_BONUS,
          description: "Beaver assistance provides construction bonuses",
          effect: {
            intensity: 1.5,
            gameplayModifier: { scoreMultiplier: 1.3 }
          }
        }
      ],
      ambientSounds: ['spring_stream', 'beaver_sounds', 'construction_noises']
    });

    this.seasonalLevels.set(4, {
      world: World.SPRING_THAW,
      levelNumber: 4,
      globalLevel: 4,
      season: Season.SPRING,
      name: "Morning Mist",
      description: "Gentle mist rises from the warming water",
      targetLines: 25,
      waterRiseRate: 0.4, // Still manageable - 0.4% per second
      gracePeriod: 15000, // 15 seconds grace period
      baseDropTime: 950,
      environmentalHazards: [
        {
          type: HazardType.WIND_GUST,
          frequency: 0.3,
          duration: 3000,
          intensity: 0.2,
          description: "Spring breezes gently push pieces sideways"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.DRAGONFLY,
          spawnRate: 0.4,
          behavior: WildlifeBehavior.FLYING_ACROSS,
          visualEffect: 'morning_dragonfly',
          soundEffect: 'dragonfly_buzz'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.WATER_PHYSICS,
          description: "Mist creates slight buoyancy effects",
          effect: {
            intensity: 0.5,
            gameplayModifier: { dropSpeedMultiplier: 0.95 }
          }
        }
      ],
      ambientSounds: ['spring_stream', 'morning_mist', 'distant_birds']
    });

    this.seasonalLevels.set(5, {
      world: World.SPRING_THAW,
      levelNumber: 5,
      globalLevel: 5,
      season: Season.SPRING,
      name: "Spring's End",
      description: "The season transitions as summer approaches",
      targetLines: 30,
      waterRiseRate: 0.5, // Moderate increase - 0.5% per second
      gracePeriod: 10000, // 10 seconds grace period
      baseDropTime: 900,
      environmentalHazards: [
        {
          type: HazardType.SPRING_FLOOD,
          frequency: 0.4,
          duration: 7000,
          intensity: 0.5,
          description: "Final spring melt creates challenging conditions"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.FISH,
          spawnRate: 0.3,
          behavior: WildlifeBehavior.SWIMMING,
          visualEffect: 'spring_fish',
          soundEffect: 'water_splash'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.SEASONAL_PIECES,
          description: "Wood begins to dry and harden for summer",
          effect: {
            intensity: 1.0,
            gameplayModifier: { dropSpeedMultiplier: 1.0 }
          }
        }
      ],
      ambientSounds: ['rushing_water', 'spring_finale', 'nature_symphony']
    });

    // SUMMER FLOW (Levels 6-10) - Medium difficulty with power-ups
    this.seasonalLevels.set(6, {
      world: World.SUMMER_FLOW,
      levelNumber: 1,
      globalLevel: 6,
      season: Season.SUMMER,
      name: "Summer's Arrival",
      description: "Warm sunshine and steady water flow challenge your building skills",
      targetLines: 35,
      waterRiseRate: 1.5,
      baseDropTime: 850,
      environmentalHazards: [
        {
          type: HazardType.SUMMER_DROUGHT,
          frequency: 0.2,
          duration: 10000,
          intensity: 0.3,
          description: "Occasional dry spells slow water rise"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.DRAGONFLY,
          spawnRate: 0.6,
          behavior: WildlifeBehavior.FLYING_ACROSS,
          visualEffect: 'summer_dragonfly',
          soundEffect: 'dragonfly_buzz',
          interactionType: WildlifeInteraction.SLOW_TIME
        },
        {
          type: WildlifeType.FISH,
          spawnRate: 0.4,
          behavior: WildlifeBehavior.SWIMMING,
          visualEffect: 'summer_fish',
          soundEffect: 'water_splash'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.SUMMER_HEAT,
          description: "Summer heat makes pieces fall slightly faster",
          effect: {
            intensity: 1.1,
            gameplayModifier: { dropSpeedMultiplier: 1.05 }
          }
        }
      ],
      ambientSounds: ['summer_stream', 'cicadas', 'warm_breeze']
    });

    // Continue with remaining summer levels...
    this.seasonalLevels.set(7, {
      world: World.SUMMER_FLOW,
      levelNumber: 2,
      globalLevel: 7,
      season: Season.SUMMER,
      name: "Dragonfly Dance",
      description: "Dragonflies perform aerial acrobatics above the water",
      targetLines: 40,
      waterRiseRate: 1.7,
      baseDropTime: 800,
      environmentalHazards: [],
      wildlife: [
        {
          type: WildlifeType.DRAGONFLY,
          spawnRate: 1.0,
          behavior: WildlifeBehavior.FLYING_ACROSS,
          visualEffect: 'dragonfly_swarm',
          soundEffect: 'dragonfly_chorus',
          interactionType: WildlifeInteraction.EXTRA_PREVIEW
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.NATURE_BOOST,
          description: "Dragonflies provide preview bonuses",
          effect: {
            intensity: 1.0,
            gameplayModifier: { scoreMultiplier: 1.1 }
          }
        }
      ],
      ambientSounds: ['summer_stream', 'dragonfly_symphony', 'gentle_waves']
    });

    // AUTUMN RUSH (Levels 11-15) - Fast-paced with seasonal effects
    this.seasonalLevels.set(11, {
      world: World.AUTUMN_RUSH,
      levelNumber: 1,
      globalLevel: 11,
      season: Season.AUTUMN,
      name: "Autumn's Arrival",
      description: "Leaves begin to fall as the water flows faster",
      targetLines: 60,
      waterRiseRate: 2.5,
      baseDropTime: 650,
      environmentalHazards: [
        {
          type: HazardType.FALLING_LEAVES,
          frequency: 0.5,
          duration: 4000,
          intensity: 0.4,
          description: "Falling leaves briefly obscure the next piece preview"
        },
        {
          type: HazardType.WIND_GUST,
          frequency: 0.4,
          duration: 2000,
          intensity: 0.3,
          description: "Autumn winds push pieces sideways"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.BIRD,
          spawnRate: 0.8,
          behavior: WildlifeBehavior.FLYING_ACROSS,
          visualEffect: 'migrating_birds',
          soundEffect: 'bird_migration'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.AUTUMN_COLORS,
          description: "Pieces change to beautiful autumn colors",
          effect: {
            intensity: 1.0,
            gameplayModifier: { pieceColorChange: true, scoreMultiplier: 1.15 }
          }
        }
      ],
      ambientSounds: ['autumn_wind', 'rustling_leaves', 'distant_geese']
    });

    // WINTER FREEZE (Levels 16-20) - Maximum difficulty with ice mechanics
    this.seasonalLevels.set(16, {
      world: World.WINTER_FREEZE,
      levelNumber: 1,
      globalLevel: 16,
      season: Season.WINTER,
      name: "First Frost",
      description: "Ice begins to form as winter arrives",
      targetLines: 80,
      waterRiseRate: 2.0, // Slower due to ice
      baseDropTime: 500,
      environmentalHazards: [
        {
          type: HazardType.ICE_SLIPPERY,
          frequency: 0.6,
          duration: 2000,
          intensity: 0.5,
          description: "Ice makes controls slippery for 2 seconds after placement"
        },
        {
          type: HazardType.SNOW_STORM,
          frequency: 0.3,
          duration: 8000,
          intensity: 0.4,
          description: "Snow reduces visibility"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.SNOWFLAKE,
          spawnRate: 2.0,
          behavior: WildlifeBehavior.FLOATING,
          visualEffect: 'winter_snow',
          soundEffect: 'wind_howl'
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.ICE_MECHANICS,
          description: "Ice pieces have delayed controls",
          effect: {
            intensity: 0.7,
            gameplayModifier: { controlDelayMs: 200 }
          }
        },
        {
          type: MechanicType.WINTER_FREEZE,
          description: "Occasional freeze events pause pieces briefly",
          effect: {
            intensity: 0.3,
            gameplayModifier: { temporaryFreeze: true }
          }
        }
      ],
      ambientSounds: ['winter_wind', 'ice_cracking', 'snow_falling']
    });

    // Add remaining levels (8-10, 12-15, 17-20) with similar detailed configurations...
    // For brevity, I'll add a few more key levels:

    this.seasonalLevels.set(20, {
      world: World.WINTER_FREEZE,
      levelNumber: 5,
      globalLevel: 20,
      season: Season.WINTER,
      name: "Eternal Winter",
      description: "The ultimate test - survive the harshest winter conditions",
      targetLines: 100,
      waterRiseRate: 3.0,
      baseDropTime: 300,
      environmentalHazards: [
        {
          type: HazardType.ICE_SLIPPERY,
          frequency: 0.8,
          duration: 3000,
          intensity: 0.8,
          description: "Maximum ice effects"
        },
        {
          type: HazardType.SNOW_STORM,
          frequency: 0.6,
          duration: 12000,
          intensity: 0.7,
          description: "Severe blizzard conditions"
        },
        {
          type: HazardType.LIGHTNING,
          frequency: 0.2,
          duration: 500,
          intensity: 0.9,
          description: "Winter lightning causes sudden speed bursts"
        }
      ],
      wildlife: [
        {
          type: WildlifeType.BEAVER,
          spawnRate: 0.05,
          behavior: WildlifeBehavior.BUILDING,
          visualEffect: 'winter_beaver_hero',
          soundEffect: 'heroic_beaver',
          interactionType: WildlifeInteraction.CLEAR_LINE
        }
      ],
      specialMechanics: [
        {
          type: MechanicType.THAW_EVENT,
          description: "Sudden thaw events cause dramatic water level changes",
          effect: {
            intensity: 1.0,
            gameplayModifier: { waterRiseMultiplier: 2.0 }
          },
          triggerCondition: {
            type: 'random',
            value: 30000, // Every 30 seconds on average
            probability: 0.3
          }
        }
      ],
      ambientSounds: ['blizzard', 'ice_storm', 'heroic_music']
    });
  }

  private initializeStoryElements(): void {
    // Level 1 - Game Introduction
    this.storyElements.set(1, [
      {
        type: StoryType.INTRO,
        triggerLevel: 1,
        content: {
          title: "Welcome to Dam Attack",
          text: "The spring thaw has begun! Help our beaver friend build the ultimate dam to protect the forest from rising waters.",
          characterDialogue: [
            {
              character: Character.BEAVER,
              text: "Welcome, friend! I need your help building the strongest dam this forest has ever seen!",
              emotion: Emotion.EXCITED
            }
          ]
        },
        presentation: {
          displayDuration: 5000,
          animationType: AnimationType.FADE_IN,
          backgroundEffect: 'spring_morning',
          musicChange: 'intro_theme',
          pauseGameplay: true
        }
      }
    ]);

    // Level 6 - Summer Transition
    this.storyElements.set(6, [
      {
        type: StoryType.SEASONAL_TRANSITION,
        triggerLevel: 6,
        content: {
          title: "Summer's Warmth",
          text: "The warm summer sun brings new challenges and helpful wildlife friends!",
          characterDialogue: [
            {
              character: Character.BEAVER,
              text: "Look! The dragonflies want to help us. They're excellent at spotting the best building spots!",
              emotion: Emotion.HAPPY
            }
          ],
          environmentalChange: {
            newSeason: Season.SUMMER,
            wildlifeSpawn: [WildlifeType.DRAGONFLY, WildlifeType.FISH]
          }
        },
        presentation: {
          displayDuration: 4000,
          animationType: AnimationType.SLIDE_UP,
          backgroundEffect: 'summer_transition',
          musicChange: 'summer_theme',
          pauseGameplay: true
        }
      }
    ]);

    // Level 11 - Autumn Challenge
    this.storyElements.set(11, [
      {
        type: StoryType.SEASONAL_TRANSITION,
        triggerLevel: 11,
        content: {
          title: "Autumn's Challenge",
          text: "The leaves are falling and the water flows faster. Stay focused as nature prepares for winter!",
          characterDialogue: [
            {
              character: Character.FOREST_SPIRIT,
              text: "The autumn winds carry both beauty and challenge. Let the falling leaves guide your building rhythm.",
              emotion: Emotion.WISE
            }
          ]
        },
        presentation: {
          displayDuration: 4000,
          animationType: AnimationType.PARTICLE_REVEAL,
          backgroundEffect: 'autumn_leaves',
          musicChange: 'autumn_theme',
          pauseGameplay: true
        }
      }
    ]);

    // Level 16 - Winter Arrives
    this.storyElements.set(16, [
      {
        type: StoryType.SEASONAL_TRANSITION,
        triggerLevel: 16,
        content: {
          title: "Winter's Grip",
          text: "Ice and snow bring the ultimate test. Your dam must withstand winter's fury!",
          characterDialogue: [
            {
              character: Character.WATER_GUARDIAN,
              text: "The ice makes everything slippery, but also slows the water's rise. Use winter's power wisely.",
              emotion: Emotion.DETERMINED
            }
          ]
        },
        presentation: {
          displayDuration: 5000,
          animationType: AnimationType.ZOOM_IN,
          backgroundEffect: 'winter_storm',
          musicChange: 'winter_theme',
          pauseGameplay: true
        }
      }
    ]);
  }

  private createInitialState(): EnvironmentalState {
    const firstLevel = this.seasonalLevels.get(1)!;
    
    return {
      currentSeason: firstLevel.season,
      currentWorld: firstLevel.world,
      currentLevel: firstLevel,
      waterLevel: {
        currentLevel: 0,
        riseRate: firstLevel.waterRiseRate,
        maxLevel: 1.0,
        visualHeight: 0,
        transparency: 0.7,
        waveAnimation: {
          amplitude: 2,
          frequency: 0.5,
          speed: 1.0,
          offset: 0
        },
        particles: []
      },
      activeHazards: [],
      activeWildlife: [],
      weatherConditions: [],
      timeOfDay: TimeOfDay.MORNING,
      ambientLighting: {
        baseColor: '#FFE4B5', // Spring morning light
        intensity: 0.8,
        shadowLength: 0.3,
        shadowOpacity: 0.2,
        glowEffects: []
      }
    };
  }

  public getCurrentLevel(): SeasonalLevel {
    return this.environmentalState.currentLevel;
  }

  public getCurrentGracePeriod(): number {
    return this.environmentalState.currentLevel.gracePeriod || 30000; // Default 30 seconds
  }

  public getCurrentWaterRiseRate(): number {
    return this.environmentalState.currentLevel.waterRiseRate || 0.0006; // Default moderate speed
  }

  public getEnvironmentalState(): EnvironmentalState {
    return { ...this.environmentalState };
  }

  public setLevel(levelNumber: number): boolean {
    const level = this.seasonalLevels.get(levelNumber);
    if (!level) {
      console.warn(`Level ${levelNumber} not found`);
      return false;
    }

    this.environmentalState.currentLevel = level;
    this.environmentalState.currentSeason = level.season;
    this.environmentalState.currentWorld = level.world;
    this.environmentalState.waterLevel.riseRate = level.waterRiseRate;
    
    // Update ambient lighting based on season
    this.updateAmbientLighting(level.season);
    
    // Trigger story elements if they exist
    this.triggerStoryElements(levelNumber);
    
    // Notify listeners
    this.notifyListeners();
    
    return true;
  }

  private updateAmbientLighting(season: Season): void {
    switch (season) {
      case Season.SPRING:
        this.environmentalState.ambientLighting = {
          baseColor: '#FFE4B5', // Moccasin - warm spring light
          intensity: 0.8,
          shadowLength: 0.3,
          shadowOpacity: 0.2,
          glowEffects: [
            { color: '#98FB98', intensity: 0.3, radius: 20 } // Pale green glow
          ]
        };
        break;
      case Season.SUMMER:
        this.environmentalState.ambientLighting = {
          baseColor: '#FFD700', // Gold - bright summer sun
          intensity: 1.0,
          shadowLength: 0.2,
          shadowOpacity: 0.4,
          glowEffects: [
            { color: '#00BFFF', intensity: 0.4, radius: 15 } // Deep sky blue water reflection
          ]
        };
        break;
      case Season.AUTUMN:
        this.environmentalState.ambientLighting = {
          baseColor: '#DEB887', // Burlywood - autumn warmth
          intensity: 0.7,
          shadowLength: 0.4,
          shadowOpacity: 0.3,
          glowEffects: [
            { color: '#FF6347', intensity: 0.5, radius: 25, pulseDuration: 3000 } // Tomato - autumn leaves glow
          ]
        };
        break;
      case Season.WINTER:
        this.environmentalState.ambientLighting = {
          baseColor: '#E6E6FA', // Lavender - cold winter light
          intensity: 0.6,
          shadowLength: 0.5,
          shadowOpacity: 0.5,
          glowEffects: [
            { color: '#87CEEB', intensity: 0.6, radius: 30 } // Sky blue - ice reflection
          ]
        };
        break;
    }
  }

  private triggerStoryElements(levelNumber: number): void {
    const storyElements = this.storyElements.get(levelNumber);
    if (storyElements) {
      storyElements.forEach(element => {
        this.scene.events.emit('story-element-triggered', element);
      });
    }
  }

  public updateWaterLevel(deltaTime: number): void {
    const waterLevel = this.environmentalState.waterLevel;
    const riseAmount = (waterLevel.riseRate * deltaTime) / 1000; // Convert to seconds
    
    waterLevel.currentLevel = Math.min(waterLevel.maxLevel, waterLevel.currentLevel + riseAmount);
    waterLevel.visualHeight = waterLevel.currentLevel * 600; // Assuming 600px game height
    
    // Update wave animation
    waterLevel.waveAnimation.offset += (waterLevel.waveAnimation.speed * deltaTime) / 1000;
    
    // Check for game over condition
    if (waterLevel.currentLevel >= waterLevel.maxLevel) {
      this.scene.events.emit('water-level-critical');
    }
    
    this.notifyListeners();
  }

  public lowerWaterLevel(amount: number): void {
    this.environmentalState.waterLevel.currentLevel = Math.max(0, 
      this.environmentalState.waterLevel.currentLevel - amount);
    this.notifyListeners();
  }

  public spawnHazard(hazardType: HazardType, duration?: number): void {
    const levelHazards = this.environmentalState.currentLevel.environmentalHazards;
    const hazardTemplate = levelHazards.find(h => h.type === hazardType);
    
    if (hazardTemplate) {
      const activeHazard = {
        hazard: hazardTemplate,
        startTime: Date.now(),
        endTime: Date.now() + (duration || hazardTemplate.duration),
        currentIntensity: hazardTemplate.intensity
      };
      
      this.environmentalState.activeHazards.push(activeHazard);
      this.scene.events.emit('hazard-spawned', activeHazard);
      this.notifyListeners();
    }
  }

  public updateHazards(): void {
    const currentTime = Date.now();
    
    // Remove expired hazards
    this.environmentalState.activeHazards = this.environmentalState.activeHazards.filter(hazard => {
      if (currentTime > hazard.endTime) {
        this.scene.events.emit('hazard-ended', hazard);
        return false;
      }
      return true;
    });
    
    // Randomly spawn new hazards based on level configuration
    this.environmentalState.currentLevel.environmentalHazards.forEach(hazard => {
      if (Math.random() < hazard.frequency * 0.001) { // Adjust frequency
        this.spawnHazard(hazard.type);
      }
    });
  }

  public spawnWildlife(wildlifeType: WildlifeType): void {
    const levelWildlife = this.environmentalState.currentLevel.wildlife;
    const wildlifeTemplate = levelWildlife.find(w => w.type === wildlifeType);
    
    if (wildlifeTemplate) {
      const activeWildlife = {
        wildlife: wildlifeTemplate,
        x: Math.random() * 800, // Game width
        y: Math.random() * 600, // Game height
        velocityX: (Math.random() - 0.5) * 100,
        velocityY: (Math.random() - 0.5) * 50,
        spawnTime: Date.now(),
        lifespan: 10000 + Math.random() * 20000, // 10-30 seconds
        animationFrame: 0
      };
      
      this.environmentalState.activeWildlife.push(activeWildlife);
      this.scene.events.emit('wildlife-spawned', activeWildlife);
      this.notifyListeners();
    }
  }

  public updateWildlife(deltaTime: number): void {
    const currentTime = Date.now();
    
    // Update existing wildlife
    this.environmentalState.activeWildlife.forEach(wildlife => {
      wildlife.x += (wildlife.velocityX * deltaTime) / 1000;
      wildlife.y += (wildlife.velocityY * deltaTime) / 1000;
      wildlife.animationFrame += deltaTime / 100; // Animation speed
      
      // Boundary checking and behavior updates
      if (wildlife.x < -50 || wildlife.x > 850 || wildlife.y < -50 || wildlife.y > 650) {
        wildlife.lifespan = 0; // Mark for removal
      }
    });
    
    // Remove expired wildlife
    this.environmentalState.activeWildlife = this.environmentalState.activeWildlife.filter(wildlife => {
      const age = currentTime - wildlife.spawnTime;
      if (age > wildlife.lifespan) {
        this.scene.events.emit('wildlife-despawned', wildlife);
        return false;
      }
      return true;
    });
    
    // Spawn new wildlife based on spawn rates
    this.environmentalState.currentLevel.wildlife.forEach(wildlife => {
      const spawnChance = (wildlife.spawnRate * deltaTime) / 60000; // Per minute to per frame
      if (Math.random() < spawnChance) {
        this.spawnWildlife(wildlife.type);
      }
    });
  }

  public getSeasonalPieceModifiers(): any {
    const mechanics = this.environmentalState.currentLevel.specialMechanics;
    const modifiers: any = {};
    
    mechanics.forEach(mechanic => {
      Object.assign(modifiers, mechanic.effect.gameplayModifier);
    });
    
    return modifiers;
  }

  public isHazardActive(hazardType: HazardType): boolean {
    return this.environmentalState.activeHazards.some(h => h.hazard.type === hazardType);
  }

  public getActiveHazardIntensity(hazardType: HazardType): number {
    const hazard = this.environmentalState.activeHazards.find(h => h.hazard.type === hazardType);
    return hazard ? hazard.currentIntensity : 0;
  }

  public addStateListener(listener: (state: EnvironmentalState) => void): void {
    this.listeners.push(listener);
  }

  public removeStateListener(listener: (state: EnvironmentalState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.environmentalState);
      } catch (error) {
        console.error('Error in environmental state listener:', error);
      }
    });
  }

  public update(deltaTime: number): void {
    // REMOVED: this.updateWaterLevel(deltaTime); // This was causing double water rise!
    this.updateHazards();
    this.updateWildlife(deltaTime);
  }

  public reset(): void {
    this.environmentalState = this.createInitialState();
    this.notifyListeners();
  }

  public getAllLevels(): SeasonalLevel[] {
    return Array.from(this.seasonalLevels.values());
  }

  public getLevelsByWorld(world: World): SeasonalLevel[] {
    return Array.from(this.seasonalLevels.values()).filter(level => level.world === world);
  }

  public getNextLevel(): SeasonalLevel | null {
    const currentGlobalLevel = this.environmentalState.currentLevel.globalLevel;
    return this.seasonalLevels.get(currentGlobalLevel + 1) || null;
  }

  public getPreviousLevel(): SeasonalLevel | null {
    const currentGlobalLevel = this.environmentalState.currentLevel.globalLevel;
    return this.seasonalLevels.get(currentGlobalLevel - 1) || null;
  }
}