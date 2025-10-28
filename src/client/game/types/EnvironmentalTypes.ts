export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer', 
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

export enum World {
  SPRING_THAW = 'spring_thaw',
  SUMMER_FLOW = 'summer_flow', 
  AUTUMN_RUSH = 'autumn_rush',
  WINTER_FREEZE = 'winter_freeze'
}

export interface SeasonalLevel {
  world: World;
  levelNumber: number; // 1-5 within world
  globalLevel: number; // 1-20 overall
  season: Season;
  name: string;
  description: string;
  targetLines: number;
  waterRiseRate: number;
  gracePeriod?: number; // Grace period in milliseconds before water starts rising
  baseDropTime: number;
  environmentalHazards: EnvironmentalHazard[];
  wildlife: WildlifeElement[];
  specialMechanics: SeasonalMechanic[];
  backgroundMusic?: string;
  ambientSounds: string[];
}

export interface EnvironmentalHazard {
  type: HazardType;
  frequency: number; // 0-1, how often it occurs
  duration: number; // milliseconds
  intensity: number; // 0-1, how severe the effect
  description: string;
}

export enum HazardType {
  FALLING_LEAVES = 'falling_leaves', // Obscures preview briefly
  ICE_SLIPPERY = 'ice_slippery', // Controls delayed after placement
  RAPIDS_SURGE = 'rapids_surge', // Sudden water level spike
  SNOW_STORM = 'snow_storm', // Reduced visibility
  SPRING_FLOOD = 'spring_flood', // Faster water rise
  SUMMER_DROUGHT = 'summer_drought', // Slower water rise
  WIND_GUST = 'wind_gust', // Pieces drift slightly
  LIGHTNING = 'lightning' // Brief screen flash, faster drop
}

export interface WildlifeElement {
  type: WildlifeType;
  spawnRate: number; // per minute
  behavior: WildlifeBehavior;
  visualEffect: string;
  soundEffect?: string;
  interactionType?: WildlifeInteraction;
}

export enum WildlifeType {
  DRAGONFLY = 'dragonfly',
  FISH = 'fish',
  BIRD = 'bird',
  BUTTERFLY = 'butterfly',
  BEAVER = 'beaver',
  FROG = 'frog',
  FIREFLY = 'firefly',
  SNOWFLAKE = 'snowflake'
}

export enum WildlifeBehavior {
  FLYING_ACROSS = 'flying_across',
  SWIMMING = 'swimming',
  JUMPING = 'jumping',
  FLOATING = 'floating',
  BUILDING = 'building', // Beaver helping with dam
  GLOWING = 'glowing'
}

export enum WildlifeInteraction {
  NONE = 'none',
  BONUS_POINTS = 'bonus_points',
  SLOW_TIME = 'slow_time',
  CLEAR_LINE = 'clear_line',
  EXTRA_PREVIEW = 'extra_preview'
}

export interface SeasonalMechanic {
  type: MechanicType;
  description: string;
  effect: MechanicEffect;
  triggerCondition?: TriggerCondition;
}

export enum MechanicType {
  SEASONAL_PIECES = 'seasonal_pieces', // Different wood types
  WATER_PHYSICS = 'water_physics', // Buoyancy effects
  ICE_MECHANICS = 'ice_mechanics', // Slippery controls
  GROWTH_BONUS = 'growth_bonus', // Spring growth effects
  AUTUMN_COLORS = 'autumn_colors', // Color-changing pieces
  WINTER_FREEZE = 'winter_freeze', // Temporary piece freezing
  SUMMER_HEAT = 'summer_heat', // Faster piece movement
  THAW_EVENT = 'thaw_event' // Sudden water level changes
}

export interface MechanicEffect {
  duration?: number;
  intensity: number;
  visualEffect?: string;
  soundEffect?: string;
  gameplayModifier: GameplayModifier;
}

export interface GameplayModifier {
  dropSpeedMultiplier?: number;
  controlDelayMs?: number;
  waterRiseMultiplier?: number;
  scoreMultiplier?: number;
  previewObscured?: boolean;
  pieceColorChange?: boolean;
  temporaryFreeze?: boolean;
}

export interface TriggerCondition {
  type: 'time' | 'lines' | 'score' | 'random';
  value: number;
  probability?: number;
}

export interface WaterLevel {
  currentLevel: number; // 0-1, where 1 is game over
  riseRate: number; // units per second
  maxLevel: number;
  visualHeight: number; // pixels from bottom
  transparency: number; // 0-1 for semi-transparent effect
  waveAnimation: WaveAnimation;
  particles: WaterParticle[];
}

export interface WaveAnimation {
  amplitude: number;
  frequency: number;
  speed: number;
  offset: number;
}

export interface WaterParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  opacity: number;
  type: 'bubble' | 'splash' | 'droplet' | 'mist';
}

export interface EnvironmentalState {
  currentSeason: Season;
  currentWorld: World;
  currentLevel: SeasonalLevel;
  waterLevel: WaterLevel;
  activeHazards: ActiveHazard[];
  activeWildlife: ActiveWildlife[];
  weatherConditions: WeatherCondition[];
  timeOfDay: TimeOfDay;
  ambientLighting: AmbientLighting;
}

export interface ActiveHazard {
  hazard: EnvironmentalHazard;
  startTime: number;
  endTime: number;
  currentIntensity: number;
}

export interface ActiveWildlife {
  wildlife: WildlifeElement;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  spawnTime: number;
  lifespan: number;
  animationFrame: number;
}

export interface WeatherCondition {
  type: WeatherType;
  intensity: number;
  duration: number;
  startTime: number;
  particles: WeatherParticle[];
}

export enum WeatherType {
  CLEAR = 'clear',
  RAIN = 'rain',
  SNOW = 'snow',
  FOG = 'fog',
  WIND = 'wind',
  STORM = 'storm'
}

export interface WeatherParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

export enum TimeOfDay {
  DAWN = 'dawn',
  MORNING = 'morning',
  NOON = 'noon',
  AFTERNOON = 'afternoon',
  DUSK = 'dusk',
  NIGHT = 'night'
}

export interface AmbientLighting {
  baseColor: string;
  intensity: number;
  shadowLength: number;
  shadowOpacity: number;
  glowEffects: GlowEffect[];
}

export interface GlowEffect {
  color: string;
  intensity: number;
  radius: number;
  pulseDuration?: number;
}

// Enhanced piece types for seasonal variations
export interface SeasonalPiece {
  basePiece: import('./GameTypes').GamePiece;
  seasonalProperties: SeasonalPieceProperties;
}

export interface SeasonalPieceProperties {
  season: Season;
  woodType: WoodType;
  moisture: number; // Affects buoyancy
  temperature: number; // Affects brittleness/flexibility
  age: number; // Affects appearance
  specialEffects: PieceEffect[];
}

export enum WoodType {
  FRESH_SPRING = 'fresh_spring', // Light green, flexible
  SUMMER_OAK = 'summer_oak', // Dark brown, sturdy
  AUTUMN_MAPLE = 'autumn_maple', // Red/orange, colorful
  WINTER_PINE = 'winter_pine', // Dark green, with snow
  BIRCH = 'birch', // White bark
  WILLOW = 'willow', // Flexible, drooping
  CEDAR = 'cedar', // Aromatic, insect-resistant
  DRIFTWOOD = 'driftwood' // Weathered, smooth
}

export interface PieceEffect {
  type: PieceEffectType;
  duration: number;
  intensity: number;
  visualEffect?: string;
}

export enum PieceEffectType {
  BUOYANCY = 'buoyancy', // Floats on water
  FREEZE = 'freeze', // Temporarily immobile
  GROWTH = 'growth', // Expands over time
  DECAY = 'decay', // Shrinks over time
  GLOW = 'glow', // Emits light
  MAGNETISM = 'magnetism', // Attracts other pieces
  PHASE = 'phase' // Can pass through other pieces briefly
}

// Power-ups and special items
export interface PowerUp {
  type: PowerUpType;
  rarity: PowerUpRarity;
  duration: number;
  effect: PowerUpEffect;
  visualEffect: string;
  soundEffect: string;
  description: string;
}

export enum PowerUpType {
  BEAVER_HELPER = 'beaver_helper', // Automatically places pieces optimally
  WATER_PUMP = 'water_pump', // Lowers water level temporarily
  TIME_SLOW = 'time_slow', // Slows piece falling
  CLEAR_VISION = 'clear_vision', // Removes weather effects
  SUPER_GRIP = 'super_grip', // Prevents slippery ice effects
  NATURE_BOOST = 'nature_boost', // Bonus points for environmental combos
  SEASONAL_SHIFT = 'seasonal_shift', // Changes season temporarily
  WILDLIFE_FRIEND = 'wildlife_friend' // Wildlife provides bonuses
}

export enum PowerUpRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon', 
  RARE = 'rare',
  LEGENDARY = 'legendary'
}

export interface PowerUpEffect {
  scoreMultiplier?: number;
  dropSpeedMultiplier?: number;
  waterLevelChange?: number;
  clearWeather?: boolean;
  autoPlace?: boolean;
  bonusLines?: number;
  temporaryInvincibility?: boolean;
}

// Environmental storytelling elements
export interface StoryElement {
  type: StoryType;
  triggerLevel: number;
  content: StoryContent;
  presentation: StoryPresentation;
}

export enum StoryType {
  INTRO = 'intro',
  LEVEL_START = 'level_start',
  MILESTONE = 'milestone',
  SEASONAL_TRANSITION = 'seasonal_transition',
  ENDING = 'ending',
  EASTER_EGG = 'easter_egg'
}

export interface StoryContent {
  title: string;
  text: string;
  characterDialogue?: CharacterDialogue[];
  environmentalChange?: EnvironmentalChange;
}

export interface CharacterDialogue {
  character: Character;
  text: string;
  emotion: Emotion;
  voiceEffect?: string;
}

export enum Character {
  BEAVER = 'beaver',
  NARRATOR = 'narrator',
  FOREST_SPIRIT = 'forest_spirit',
  WATER_GUARDIAN = 'water_guardian'
}

export enum Emotion {
  HAPPY = 'happy',
  CONCERNED = 'concerned',
  EXCITED = 'excited',
  DETERMINED = 'determined',
  WISE = 'wise',
  PLAYFUL = 'playful'
}

export interface EnvironmentalChange {
  newSeason?: Season;
  weatherChange?: WeatherType;
  wildlifeSpawn?: WildlifeType[];
  waterLevelChange?: number;
  lightingChange?: AmbientLighting;
}

export interface StoryPresentation {
  displayDuration: number;
  animationType: AnimationType;
  backgroundEffect?: string;
  musicChange?: string;
  pauseGameplay: boolean;
}

export enum AnimationType {
  FADE_IN = 'fade_in',
  SLIDE_UP = 'slide_up',
  TYPEWRITER = 'typewriter',
  ZOOM_IN = 'zoom_in',
  PARTICLE_REVEAL = 'particle_reveal'
}