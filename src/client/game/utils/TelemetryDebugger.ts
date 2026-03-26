import { TelemetryCollector } from '../managers/TelemetryCollector';
import { PlayerTraits } from '../types/TelemetryTypes';

/**
 * TelemetryDebugger - Development utility for inspecting telemetry data
 * 
 * Usage in browser console:
 *   window.telemetryDebugger = new TelemetryDebugger(telemetryCollector);
 *   window.telemetryDebugger.printSessionStats();
 *   window.telemetryDebugger.printLevelSummary(1);
 *   window.telemetryDebugger.printTraits(1);
 */
export class TelemetryDebugger {
  private collector: TelemetryCollector;

  constructor(collector: TelemetryCollector) {
    this.collector = collector;
  }

  /**
   * Print session statistics
   */
  public printSessionStats(): void {
    const stats = this.collector.getSessionStats();
    console.log('📊 Telemetry Session Stats:', stats);
    
    const events = this.collector.getSessionEvents();
    console.log(`📝 Total Events: ${events.length}`);
    
    // Count events by type
    const eventCounts = new Map<string, number>();
    events.forEach(event => {
      const count = eventCounts.get(event.eventType) || 0;
      eventCounts.set(event.eventType, count + 1);
    });
    
    console.log('📈 Events by Type:');
    eventCounts.forEach((count, type) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  /**
   * Print level summary
   */
  public printLevelSummary(level: number): void {
    const summary = this.collector.getLevelSummary(level);
    console.log(`📋 Level ${level} Summary:`, {
      piecesPlaced: summary.piecesPlaced,
      linesCleared: summary.linesCleared,
      holesCreated: summary.holesCreated,
      maxStackHeight: summary.maxStackHeight.toFixed(3),
      averageStackHeight: summary.averageStackHeight.toFixed(3),
      nearDeathEvents: summary.nearDeathEvents,
      successfulRecoveries: summary.successfulRecoveries,
      singleClears: summary.singleClears,
      doubleClears: summary.doubleClears,
      tripleClears: summary.tripleClears,
      tetrisClears: summary.tetrisClears,
      plannedClears: summary.plannedClears,
      timeElapsed: `${(summary.timeElapsed / 1000).toFixed(1)}s`,
      deaths: summary.deaths
    });
  }

  /**
   * Print calculated traits for a level
   */
  public printTraits(level: number): void {
    const summary = this.collector.getLevelSummary(level);
    console.log(`🎯 Level ${level} Traits:`, this.formatTraits(summary.traits));
  }

  /**
   * Print all level summaries
   */
  public printAllLevels(): void {
    const stats = this.collector.getSessionStats();
    console.log(`📚 All Level Summaries (${stats.levelCount} levels):`);
    
    // Get all events to find which levels exist
    const events = this.collector.getSessionEvents();
    const levels = new Set<number>();
    events.forEach(event => {
      if (event.data.level !== undefined) {
        levels.add(event.data.level);
      }
    });
    
    levels.forEach(level => {
      this.printLevelSummary(level);
      this.printTraits(level);
      console.log('---');
    });
  }

  /**
   * Print player profile
   */
  public printProfile(): void {
    const profile = this.collector.loadPlayerProfile();
    console.log('👤 Player Profile:', {
      profileId: profile.profileId,
      createdAt: new Date(profile.createdAt).toISOString(),
      lastUpdated: new Date(profile.lastUpdated).toISOString(),
      totalSessions: profile.totalSessions,
      totalLevelsCompleted: profile.totalLevelsCompleted,
      recentLevelSummaries: profile.recentLevelSummaries.length,
      sessionHistory: profile.sessionHistory.length
    });
    
    console.log('📊 Aggregated Traits:', this.formatTraits(profile.aggregatedTraits));
  }

  /**
   * Format traits for display
   */
  private formatTraits(traits: PlayerTraits): Record<string, string> {
    return {
      'Risk Taking': `${(traits.risk_taking * 100).toFixed(1)}%`,
      'Recovery': `${(traits.recovery * 100).toFixed(1)}%`,
      'Precision': `${(traits.precision * 100).toFixed(1)}%`,
      'Pattern Mastery': `${(traits.pattern_mastery * 100).toFixed(1)}%`,
      'Speed Tolerance': `${(traits.speed_tolerance * 100).toFixed(1)}%`,
      'Planning Ahead': `${(traits.planning_ahead * 100).toFixed(1)}%`,
      'Piece Efficiency': `${(traits.piece_efficiency * 100).toFixed(1)}%`,
      'Adaptation': `${(traits.adaptation * 100).toFixed(1)}%`
    };
  }

  /**
   * Export raw data for analysis
   */
  public exportData(): {
    sessionStats: { sessionId: string; eventCount: number; levelCount: number; duration: number };
    profile: ReturnType<TelemetryCollector['loadPlayerProfile']>;
    events: ReturnType<TelemetryCollector['getSessionEvents']>;
  } {
    return {
      sessionStats: this.collector.getSessionStats(),
      profile: this.collector.loadPlayerProfile(),
      events: this.collector.getSessionEvents()
    };
  }

  /**
   * Clear all telemetry data (for testing)
   */
  public clearAll(): void {
    if (confirm('Are you sure you want to clear all telemetry data?')) {
      this.collector.clearAllData();
      console.log('🗑️ All telemetry data cleared');
    }
  }
}
