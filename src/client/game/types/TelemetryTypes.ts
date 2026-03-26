import { PieceType } from './GameTypes';
import { HazardType } from './EnvironmentalTypes';

/**
 * Telemetry Event Types - Phase 1: Foundation
 * Defines all event types tracked for player behavior analysis
 */
export type TelemetryEventType =
  | 'piece_placed'
  | 'line_cleared'
  | 'hole_created'
  | 'stack_height_change'
  | 'near_death'
  | 'recovery'
  | 'misdrop'
  | 'pattern_setup'
  | 'level_start'
  | 'level_end'
  | 'death'
  | 'powerup_used'
  | 'hazard_encountered';

/**
 * Line Clear Types
 */
export type ClearType = 'single' | 'double' | 'triple' | 'tetris';

/**
 * Telemetry Event Data Structure
 * Captures detailed information about each game event
 */
export interface TelemetryEventData {
  // Piece events
  pieceType?: PieceType;
  placementX?: number;
  placementY?: number;
  rotationAttempts?: number;
  
  // Board state
  stackHeight?: number;
  holesCount?: number;
  overhangsCount?: number;
  boardDensity?: number; // % of board filled (0-1)
  
  // Line clear events
  linesCleared?: number; // 1, 2, 3, or 4
  clearType?: ClearType;
  wasPlanned?: boolean; // Did they set this up?
  
  // Danger events
  dangerLevel?: number; // 0-1, how close to death
  recoveryTime?: number; // ms to recover from danger
  
  // Context
  level?: number;
  waterLevel?: number; // 0-1, current water level
  timeElapsed?: number; // ms since level start
  activeHazards?: HazardType[];
}

/**
 * Complete Telemetry Event
 */
export interface TelemetryEvent {
  timestamp: number;
  eventType: TelemetryEventType;
  data: TelemetryEventData;
}

/**
 * Player Traits Interface
 * 8 core traits tracked on 0-1 scale
 */
export interface PlayerTraits {
  // Risk Management
  risk_taking: number;        // 0 = always keeps stack low, 1 = lets it get high
  recovery: number;           // 0 = dies when stack high, 1 = escapes danger
  
  // Skill Metrics
  precision: number;          // 0 = many holes, 1 = clean placements
  pattern_mastery: number;    // 0 = single lines, 1 = frequent 2-4 line clears
  speed_tolerance: number;    // 0 = struggles with speed, 1 = thrives under pressure
  
  // Behavioral Patterns
  planning_ahead: number;     // 0 = reactive, 1 = sets up future clears
  piece_efficiency: number;   // 0 = wastes pieces, 1 = optimal placement
  adaptation: number;         // 0 = repeats mistakes, 1 = learns from errors
}

/**
 * Level Telemetry Summary
 * Aggregated data for a single level
 */
export interface LevelTelemetrySummary {
  level: number;
  piecesPlaced: number;
  linesCleared: number;
  holesCreated: number;
  maxStackHeight: number;
  averageStackHeight: number;
  nearDeathEvents: number;
  successfulRecoveries: number;
  singleClears: number;
  doubleClears: number;
  tripleClears: number;
  tetrisClears: number;
  plannedClears: number;
  timeElapsed: number;
  deaths: number;
  traits: PlayerTraits;
}

/**
 * Session Telemetry Data
 * All events and summaries for current session
 */
export interface SessionTelemetryData {
  sessionId: string;
  startTime: number;
  events: TelemetryEvent[];
  levelSummaries: Map<number, LevelTelemetrySummary>;
  currentLevel: number;
}

/**
 * Persistent Player Profile
 * Stored in localStorage, aggregated across sessions
 */
export interface PlayerProfile {
  profileId: string;
  createdAt: number;
  lastUpdated: number;
  totalSessions: number;
  totalLevelsCompleted: number;
  aggregatedTraits: PlayerTraits;
  recentLevelSummaries: LevelTelemetrySummary[]; // Last 10 levels
  sessionHistory: string[]; // Session IDs (last 10)
}
