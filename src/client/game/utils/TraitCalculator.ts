import { PlayerTraits, LevelTelemetrySummary } from '../types/TelemetryTypes';

/**
 * TraitCalculator - Phase 1: Basic Trait Calculation
 * 
 * Calculates player traits from level telemetry summaries.
 * For Phase 1, we implement per-level trait calculation (offline).
 * 
 * Formulas based on CAMPAIGN_ML_PLANNING.md Part 2.3
 */
export class TraitCalculator {
  /**
   * Calculate traits from a level summary
   * Returns traits on 0-1 scale (clamped)
   */
  public static calculateTraitsFromLevel(summary: LevelTelemetrySummary, boardHeight: number = 20): PlayerTraits {
    return {
      risk_taking: this.calculateRiskTaking(summary, boardHeight),
      recovery: this.calculateRecovery(summary),
      precision: this.calculatePrecision(summary),
      pattern_mastery: this.calculatePatternMastery(summary),
      speed_tolerance: this.calculateSpeedTolerance(summary), // Simplified for Phase 1
      planning_ahead: this.calculatePlanningAhead(summary),
      piece_efficiency: this.calculatePieceEfficiency(summary),
      adaptation: this.calculateAdaptation(summary) // Simplified for Phase 1
    };
  }

  /**
   * Risk Taking: average(maxStackHeight / boardHeight) over last N pieces
   * High = frequently lets stack get high
   * Low = always keeps stack low
   */
  private static calculateRiskTaking(summary: LevelTelemetrySummary, boardHeight: number): number {
    if (summary.piecesPlaced === 0) return 0.5; // Neutral if no data
    
    // Use average stack height normalized to board height
    // averageStackHeight is already normalized (0-1), so we use it directly
    const normalizedAverage = summary.averageStackHeight;
    return this.clamp(normalizedAverage, 0, 1);
  }

  /**
   * Precision: 1 - (holesCreated / piecesPlaced)
   * High = few holes, clean board
   * Low = many holes, messy board
   */
  private static calculatePrecision(summary: LevelTelemetrySummary): number {
    if (summary.piecesPlaced === 0) return 0.5; // Neutral if no data
    
    // Calculate holes per piece ratio
    const holesPerPiece = summary.holesCreated / summary.piecesPlaced;
    
    // Precision = 1 - holesPerPiece (clamped)
    // Assume worst case is 0.5 holes per piece (very messy)
    const normalized = 1 - Math.min(holesPerPiece / 0.5, 1);
    return this.clamp(normalized, 0, 1);
  }

  /**
   * Recovery: successfulRecoveries / nearDeathEvents
   * High = escapes danger frequently
   * Low = dies when stack gets high
   */
  private static calculateRecovery(summary: LevelTelemetrySummary): number {
    if (summary.nearDeathEvents === 0) {
      // If no near-death events, recovery is neutral (no danger encountered)
      return 0.5;
    }
    
    // Recovery rate
    const recoveryRate = summary.successfulRecoveries / summary.nearDeathEvents;
    return this.clamp(recoveryRate, 0, 1);
  }

  /**
   * Pattern Mastery: (doubleClears + tripleClears * 2 + tetrisClears * 3) / totalClears
   * High = frequently clears 2-4 lines
   * Low = mostly single line clears
   */
  private static calculatePatternMastery(summary: LevelTelemetrySummary): number {
    const totalClears = summary.singleClears + summary.doubleClears + 
                       summary.tripleClears + summary.tetrisClears;
    
    if (totalClears === 0) return 0.5; // Neutral if no clears
    
    // Weighted score: single=0, double=1, triple=2, tetris=3
    const weightedScore = 
      summary.doubleClears * 1 +
      summary.tripleClears * 2 +
      summary.tetrisClears * 3;
    
    // Normalize: max possible score is totalClears * 3 (all tetris)
    const maxScore = totalClears * 3;
    const normalized = maxScore > 0 ? weightedScore / maxScore : 0;
    
    return this.clamp(normalized, 0, 1);
  }

  /**
   * Speed Tolerance: 1 - (errorRateIncrease / speedIncrease)
   * High = maintains performance as speed increases
   * Low = errors increase significantly with speed
   * 
   * For Phase 1: Simplified - use a placeholder based on precision under pressure
   * (We don't track speed changes yet, so we'll use precision as a proxy)
   */
  private static calculateSpeedTolerance(summary: LevelTelemetrySummary): number {
    // Phase 1: Use precision as a proxy for speed tolerance
    // Players who maintain precision likely have good speed tolerance
    // This will be improved in later phases when we track speed changes
    const precision = this.calculatePrecision(summary);
    
    // Also consider recovery - players who recover well likely adapt to speed
    const recovery = this.calculateRecovery(summary);
    
    // Average of precision and recovery as a proxy
    return (precision + recovery) / 2;
  }

  /**
   * Planning Ahead: plannedClears / totalClears
   * High = sets up multi-line clears
   * Low = reactive, single-line focus
   */
  private static calculatePlanningAhead(summary: LevelTelemetrySummary): number {
    const totalClears = summary.singleClears + summary.doubleClears + 
                       summary.tripleClears + summary.tetrisClears;
    
    if (totalClears === 0) return 0.5; // Neutral if no clears
    
    const plannedRate = summary.plannedClears / totalClears;
    return this.clamp(plannedRate, 0, 1);
  }

  /**
   * Piece Efficiency: linesCleared / piecesPlaced
   * High = optimal piece usage
   * Low = inefficient placement
   */
  private static calculatePieceEfficiency(summary: LevelTelemetrySummary): number {
    if (summary.piecesPlaced === 0) return 0.5; // Neutral if no pieces
    
    // Lines cleared per piece
    const linesPerPiece = summary.linesCleared / summary.piecesPlaced;
    
    // Normalize: Theoretical max is ~0.4 lines per piece (perfect play)
    // Average player might get ~0.1-0.2
    const normalized = Math.min(linesPerPiece / 0.4, 1);
    return this.clamp(normalized, 0, 1);
  }

  /**
   * Adaptation: 1 - (repeatedMistakes / totalMistakes)
   * High = learns from errors
   * Low = repeats same mistakes
   * 
   * For Phase 1: Simplified - use a placeholder
   * (We don't track repeated mistakes yet, so we'll use precision improvement as a proxy)
   */
  private static calculateAdaptation(summary: LevelTelemetrySummary): number {
    // Phase 1: Use precision and recovery as proxies
    // Players who maintain precision and recover well likely adapt
    // This will be improved in later phases when we track mistake patterns
    const precision = this.calculatePrecision(summary);
    const recovery = this.calculateRecovery(summary);
    
    // Average as a proxy for adaptation
    return (precision + recovery) / 2;
  }

  /**
   * Clamp value between 0 and 1
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate aggregated traits from multiple level summaries
   * Used for session-level or persistent profile traits
   */
  public static aggregateTraits(summaries: LevelTelemetrySummary[], boardHeight: number = 20): PlayerTraits {
    if (summaries.length === 0) {
      return this.getDefaultTraits();
    }

    // Calculate traits for each level
    const levelTraits = summaries.map(summary => 
      this.calculateTraitsFromLevel(summary, boardHeight)
    );

    // Average all traits
    const aggregated: PlayerTraits = {
      risk_taking: this.average(levelTraits.map(t => t.risk_taking)),
      recovery: this.average(levelTraits.map(t => t.recovery)),
      precision: this.average(levelTraits.map(t => t.precision)),
      pattern_mastery: this.average(levelTraits.map(t => t.pattern_mastery)),
      speed_tolerance: this.average(levelTraits.map(t => t.speed_tolerance)),
      planning_ahead: this.average(levelTraits.map(t => t.planning_ahead)),
      piece_efficiency: this.average(levelTraits.map(t => t.piece_efficiency)),
      adaptation: this.average(levelTraits.map(t => t.adaptation))
    };

    return aggregated;
  }

  /**
   * Get default/neutral traits (all 0.5)
   */
  public static getDefaultTraits(): PlayerTraits {
    return {
      risk_taking: 0.5,
      recovery: 0.5,
      precision: 0.5,
      pattern_mastery: 0.5,
      speed_tolerance: 0.5,
      planning_ahead: 0.5,
      piece_efficiency: 0.5,
      adaptation: 0.5
    };
  }

  /**
   * Calculate average of numbers
   */
  private static average(values: number[]): number {
    if (values.length === 0) return 0.5;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
}
