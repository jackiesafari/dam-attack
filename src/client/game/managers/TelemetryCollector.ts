import { 
  TelemetryEvent, 
  TelemetryEventType, 
  TelemetryEventData,
  LevelTelemetrySummary,
  SessionTelemetryData,
  PlayerProfile
} from '../types/TelemetryTypes';
import { TraitCalculator } from '../utils/TraitCalculator';

/**
 * TelemetryCollector - Phase 1: Foundation
 * 
 * Collects and stores telemetry events for player behavior analysis.
 * This is the foundation for the ML/DDA system.
 * 
 * Responsibilities:
 * - Collect events from game actions
 * - Store events in-memory (current session)
 * - Persist to localStorage (player profile)
 * - Provide event summaries for analysis
 */
export class TelemetryCollector {
  private sessionData: SessionTelemetryData;
  private readonly STORAGE_KEY = 'dam-attack:player-profile';
  private readonly MAX_EVENTS_IN_MEMORY = 10000; // Prevent memory issues
  private readonly MAX_LEVEL_SUMMARIES = 100; // Keep last 100 levels
  
  // Event listeners
  private listeners: ((event: TelemetryEvent) => void)[] = [];

  constructor() {
    this.sessionData = this.createNewSession();
    this.loadPlayerProfile();
  }

  /**
   * Create a new telemetry session
   */
  private createNewSession(): SessionTelemetryData {
    return {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      events: [],
      levelSummaries: new Map(),
      currentLevel: 1
    };
  }

  /**
   * Record a telemetry event
   */
  public recordEvent(eventType: TelemetryEventType, data: TelemetryEventData): void {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      eventType,
      data: {
        ...data,
        timeElapsed: Date.now() - this.sessionData.startTime
      }
    };

    // Add to in-memory storage
    this.sessionData.events.push(event);

    // Prevent memory overflow (keep most recent events)
    if (this.sessionData.events.length > this.MAX_EVENTS_IN_MEMORY) {
      const removeCount = this.MAX_EVENTS_IN_MEMORY - Math.floor(this.MAX_EVENTS_IN_MEMORY * 0.9);
      this.sessionData.events.splice(0, removeCount);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(event));

    // Auto-save periodically (every 50 events)
    if (this.sessionData.events.length % 50 === 0) {
      this.saveSessionData();
    }
  }

  /**
   * Get all events for current session
   */
  public getSessionEvents(): TelemetryEvent[] {
    return [...this.sessionData.events];
  }

  /**
   * Get events filtered by type
   */
  public getEventsByType(eventType: TelemetryEventType): TelemetryEvent[] {
    return this.sessionData.events.filter(e => e.eventType === eventType);
  }

  /**
   * Get events for current level
   */
  public getLevelEvents(level: number): TelemetryEvent[] {
    return this.sessionData.events.filter(e => e.data.level === level);
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionData.sessionId;
  }

  /**
   * Get current level
   */
  public getCurrentLevel(): number {
    return this.sessionData.currentLevel;
  }

  /**
   * Set current level (called when level changes)
   */
  public setCurrentLevel(level: number): void {
    this.sessionData.currentLevel = level;
  }

  /**
   * Get level summary (creates if doesn't exist)
   */
  public getLevelSummary(level: number): LevelTelemetrySummary {
    if (!this.sessionData.levelSummaries.has(level)) {
      this.sessionData.levelSummaries.set(level, this.createEmptyLevelSummary(level));
    }
    return this.sessionData.levelSummaries.get(level)!;
  }

  /**
   * Create empty level summary
   */
  private createEmptyLevelSummary(level: number): LevelTelemetrySummary {
    return {
      level,
      piecesPlaced: 0,
      linesCleared: 0,
      holesCreated: 0,
      maxStackHeight: 0,
      averageStackHeight: 0,
      nearDeathEvents: 0,
      successfulRecoveries: 0,
      singleClears: 0,
      doubleClears: 0,
      tripleClears: 0,
      tetrisClears: 0,
      plannedClears: 0,
      timeElapsed: 0,
      deaths: 0,
      traits: this.createDefaultTraits()
    };
  }

  /**
   * Create default traits (all 0.5 = neutral)
   */
  private createDefaultTraits(): import('../types/TelemetryTypes').PlayerTraits {
    return TraitCalculator.getDefaultTraits();
  }

  /**
   * Calculate traits for a level summary
   * Called when level ends to update traits
   */
  public calculateLevelTraits(level: number, boardHeight: number = 20): void {
    const summary = this.getLevelSummary(level);
    summary.traits = TraitCalculator.calculateTraitsFromLevel(summary, boardHeight);
  }

  /**
   * Update level summary with new event
   */
  public updateLevelSummary(level: number, event: TelemetryEvent): void {
    const summary = this.getLevelSummary(level);
    
    switch (event.eventType) {
      case 'piece_placed':
        summary.piecesPlaced++;
        if (event.data.stackHeight !== undefined) {
          summary.maxStackHeight = Math.max(summary.maxStackHeight, event.data.stackHeight);
          // Update average (simplified - could be more sophisticated)
          const total = summary.piecesPlaced;
          summary.averageStackHeight = 
            (summary.averageStackHeight * (total - 1) + event.data.stackHeight) / total;
        }
        break;
      case 'line_cleared':
        summary.linesCleared += event.data.linesCleared || 0;
        if (event.data.clearType) {
          switch (event.data.clearType) {
            case 'single':
              summary.singleClears++;
              break;
            case 'double':
              summary.doubleClears++;
              break;
            case 'triple':
              summary.tripleClears++;
              break;
            case 'tetris':
              summary.tetrisClears++;
              break;
          }
        }
        if (event.data.wasPlanned) {
          summary.plannedClears++;
        }
        break;
      case 'hole_created':
        summary.holesCreated++;
        break;
      case 'near_death':
        summary.nearDeathEvents++;
        break;
      case 'recovery':
        summary.successfulRecoveries++;
        break;
      case 'death':
        summary.deaths++;
        break;
    }

    // Update time elapsed
    if (event.data.timeElapsed) {
      summary.timeElapsed = event.data.timeElapsed;
    }
  }

  /**
   * Save session data to localStorage
   */
  public saveSessionData(): void {
    try {
      const profile = this.loadPlayerProfile();
      
      // Update profile with session data
      profile.lastUpdated = Date.now();
      profile.totalSessions++;
      
      // Add session ID to history (keep last 10)
      if (!profile.sessionHistory.includes(this.sessionData.sessionId)) {
        profile.sessionHistory.push(this.sessionData.sessionId);
        if (profile.sessionHistory.length > 10) {
          profile.sessionHistory.shift();
        }
      }
      
      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.warn('Failed to save telemetry data:', error);
    }
  }

  /**
   * Load player profile from localStorage
   */
  public loadPlayerProfile(): PlayerProfile {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load player profile:', error);
    }

    // Create new profile
    const profile: PlayerProfile = {
      profileId: `profile-${Date.now()}`,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      totalSessions: 0,
      totalLevelsCompleted: 0,
      aggregatedTraits: this.createDefaultTraits(),
      recentLevelSummaries: [],
      sessionHistory: []
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.warn('Failed to save new player profile:', error);
    }

    return profile;
  }

  /**
   * Clear all telemetry data (for testing/debugging)
   */
  public clearAllData(): void {
    this.sessionData = this.createNewSession();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear telemetry data:', error);
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: (event: TelemetryEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: TelemetryEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Get session statistics (for debugging)
   */
  public getSessionStats(): {
    sessionId: string;
    eventCount: number;
    levelCount: number;
    duration: number;
  } {
    return {
      sessionId: this.sessionData.sessionId,
      eventCount: this.sessionData.events.length,
      levelCount: this.sessionData.levelSummaries.size,
      duration: Date.now() - this.sessionData.startTime
    };
  }
}
