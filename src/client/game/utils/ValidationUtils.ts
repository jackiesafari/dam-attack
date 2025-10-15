import { GamePiece, PieceType, ScoreEntry } from '../types/GameTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule<T> {
  name: string;
  validate: (value: T) => ValidationResult;
  severity: 'error' | 'warning';
}

export class ValidationUtils {
  /**
   * Validate game piece structure
   */
  public static validateGamePiece(piece: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if piece exists
    if (!piece) {
      result.errors.push('Piece is null or undefined');
      result.isValid = false;
      return result;
    }

    // Check required properties
    if (!piece.shape || !Array.isArray(piece.shape)) {
      result.errors.push('Piece shape is missing or not an array');
      result.isValid = false;
    } else {
      // Validate shape structure
      if (piece.shape.length === 0) {
        result.errors.push('Piece shape is empty');
        result.isValid = false;
      } else {
        // Check if all rows have the same length
        const firstRowLength = piece.shape[0]?.length || 0;
        for (let i = 1; i < piece.shape.length; i++) {
          if (!Array.isArray(piece.shape[i])) {
            result.errors.push(`Piece shape row ${i} is not an array`);
            result.isValid = false;
          } else if (piece.shape[i].length !== firstRowLength) {
            result.errors.push(`Piece shape row ${i} has inconsistent length`);
            result.isValid = false;
          }
        }

        // Check for valid values (0 or 1)
        for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
            const cell = piece.shape[y][x];
            if (cell !== 0 && cell !== 1) {
              result.errors.push(`Invalid cell value at [${y}][${x}]: ${cell}`);
              result.isValid = false;
            }
          }
        }
      }
    }

    // Check coordinates
    if (typeof piece.x !== 'number' || !Number.isInteger(piece.x)) {
      result.errors.push('Piece x coordinate is not a valid integer');
      result.isValid = false;
    }

    if (typeof piece.y !== 'number' || !Number.isInteger(piece.y)) {
      result.errors.push('Piece y coordinate is not a valid integer');
      result.isValid = false;
    }

    // Check color
    if (typeof piece.color !== 'number' || piece.color < 0) {
      result.errors.push('Piece color is not a valid number');
      result.isValid = false;
    }

    // Check optional type
    if (piece.type && !Object.values(PieceType).includes(piece.type)) {
      result.warnings.push(`Unknown piece type: ${piece.type}`);
    }

    return result;
  }

  /**
   * Validate game board structure
   */
  public static validateGameBoard(board: any, expectedWidth: number, expectedHeight: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if board exists
    if (!board || !Array.isArray(board)) {
      result.errors.push('Board is not an array');
      result.isValid = false;
      return result;
    }

    // Check board height
    if (board.length !== expectedHeight) {
      result.errors.push(`Board height ${board.length} does not match expected ${expectedHeight}`);
      result.isValid = false;
    }

    // Check each row
    for (let y = 0; y < board.length; y++) {
      const row = board[y];
      
      if (!Array.isArray(row)) {
        result.errors.push(`Board row ${y} is not an array`);
        result.isValid = false;
        continue;
      }

      if (row.length !== expectedWidth) {
        result.errors.push(`Board row ${y} width ${row.length} does not match expected ${expectedWidth}`);
        result.isValid = false;
      }

      // Check cell values
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0) {
          result.errors.push(`Invalid cell value at [${y}][${x}]: ${cell}`);
          result.isValid = false;
        }
      }
    }

    return result;
  }

  /**
   * Validate score entry
   */
  public static validateScoreEntry(entry: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!entry) {
      result.errors.push('Score entry is null or undefined');
      result.isValid = false;
      return result;
    }

    // Check username
    if (!entry.username || typeof entry.username !== 'string') {
      result.errors.push('Username is missing or not a string');
      result.isValid = false;
    } else if (entry.username.length > 50) {
      result.warnings.push('Username is very long (>50 characters)');
    }

    // Check score
    if (typeof entry.score !== 'number' || !Number.isInteger(entry.score) || entry.score < 0) {
      result.errors.push('Score is not a valid positive integer');
      result.isValid = false;
    } else if (entry.score > 10000000) {
      result.warnings.push('Score is unusually high');
    }

    // Check timestamp
    if (typeof entry.timestamp !== 'number' || entry.timestamp <= 0) {
      result.errors.push('Timestamp is not a valid number');
      result.isValid = false;
    } else {
      const now = Date.now();
      if (entry.timestamp > now + 60000) { // 1 minute in future
        result.warnings.push('Timestamp is in the future');
      } else if (entry.timestamp < now - 365 * 24 * 60 * 60 * 1000) { // 1 year ago
        result.warnings.push('Timestamp is very old');
      }
    }

    // Check level
    if (typeof entry.level !== 'number' || !Number.isInteger(entry.level) || entry.level < 1) {
      result.errors.push('Level is not a valid positive integer');
      result.isValid = false;
    } else if (entry.level > 100) {
      result.warnings.push('Level is unusually high');
    }

    // Check lines
    if (typeof entry.lines !== 'number' || !Number.isInteger(entry.lines) || entry.lines < 0) {
      result.errors.push('Lines is not a valid non-negative integer');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate game state
   */
  public static validateGameState(state: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!state) {
      result.errors.push('Game state is null or undefined');
      result.isValid = false;
      return result;
    }

    // Validate board
    if (state.board) {
      const boardValidation = this.validateGameBoard(state.board, 10, 20);
      result.errors.push(...boardValidation.errors);
      result.warnings.push(...boardValidation.warnings);
      if (!boardValidation.isValid) {
        result.isValid = false;
      }
    }

    // Validate current piece
    if (state.currentPiece) {
      const pieceValidation = this.validateGamePiece(state.currentPiece);
      result.errors.push(...pieceValidation.errors.map(e => `Current piece: ${e}`));
      result.warnings.push(...pieceValidation.warnings.map(w => `Current piece: ${w}`));
      if (!pieceValidation.isValid) {
        result.isValid = false;
      }
    }

    // Validate next piece
    if (state.nextPiece) {
      const nextPieceValidation = this.validateGamePiece(state.nextPiece);
      result.errors.push(...nextPieceValidation.errors.map(e => `Next piece: ${e}`));
      result.warnings.push(...nextPieceValidation.warnings.map(w => `Next piece: ${w}`));
      if (!nextPieceValidation.isValid) {
        result.isValid = false;
      }
    }

    // Validate numeric properties
    const numericProps = ['score', 'level', 'lines', 'dropTime', 'lastDrop'];
    numericProps.forEach(prop => {
      if (state[prop] !== undefined) {
        if (typeof state[prop] !== 'number' || state[prop] < 0) {
          result.errors.push(`${prop} is not a valid non-negative number`);
          result.isValid = false;
        }
      }
    });

    // Validate boolean properties
    if (state.isGameOver !== undefined && typeof state.isGameOver !== 'boolean') {
      result.errors.push('isGameOver is not a boolean');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate configuration object
   */
  public static validateConfig(config: any, requiredFields: string[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!config || typeof config !== 'object') {
      result.errors.push('Config is not an object');
      result.isValid = false;
      return result;
    }

    // Check required fields
    requiredFields.forEach(field => {
      if (!(field in config)) {
        result.errors.push(`Required field '${field}' is missing`);
        result.isValid = false;
      }
    });

    return result;
  }

  /**
   * Sanitize user input
   */
  public static sanitizeString(input: string, maxLength: number = 100): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[^\w\s\-_.]/g, ''); // Keep only alphanumeric, spaces, hyphens, underscores, dots
  }

  /**
   * Validate and clamp numeric value
   */
  public static clampNumber(value: any, min: number, max: number, defaultValue: number): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Deep clone object safely
   */
  public static safeClone<T>(obj: T): T | null {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to clone object:', error);
      return null;
    }
  }

  /**
   * Check if object has circular references
   */
  public static hasCircularReference(obj: any): boolean {
    try {
      JSON.stringify(obj);
      return false;
    } catch (error) {
      return error instanceof TypeError && error.message.includes('circular');
    }
  }

  /**
   * Validate array bounds
   */
  public static validateArrayBounds(array: any[], index: number): boolean {
    return Array.isArray(array) && index >= 0 && index < array.length;
  }

  /**
   * Validate 2D array bounds
   */
  public static validate2DArrayBounds(array: any[][], x: number, y: number): boolean {
    return Array.isArray(array) && 
           y >= 0 && y < array.length &&
           Array.isArray(array[y]) &&
           x >= 0 && x < array[y].length;
  }

  /**
   * Create validation rule
   */
  public static createRule<T>(
    name: string,
    validator: (value: T) => boolean,
    errorMessage: string,
    severity: 'error' | 'warning' = 'error'
  ): ValidationRule<T> {
    return {
      name,
      severity,
      validate: (value: T) => ({
        isValid: validator(value),
        errors: validator(value) ? [] : [errorMessage],
        warnings: []
      })
    };
  }

  /**
   * Run multiple validation rules
   */
  public static runValidationRules<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    rules.forEach(rule => {
      const ruleResult = rule.validate(value);
      
      if (rule.severity === 'error') {
        result.errors.push(...ruleResult.errors);
        if (!ruleResult.isValid) {
          result.isValid = false;
        }
      } else {
        result.warnings.push(...ruleResult.errors); // Treat as warnings
      }
      
      result.warnings.push(...ruleResult.warnings);
    });

    return result;
  }

  /**
   * Validate performance metrics
   */
  public static validatePerformanceMetrics(metrics: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!metrics) {
      result.errors.push('Performance metrics is null or undefined');
      result.isValid = false;
      return result;
    }

    // Check FPS
    if (typeof metrics.fps !== 'number' || metrics.fps < 0) {
      result.errors.push('FPS is not a valid non-negative number');
      result.isValid = false;
    } else if (metrics.fps < 10) {
      result.warnings.push('FPS is critically low');
    } else if (metrics.fps < 30) {
      result.warnings.push('FPS is below recommended threshold');
    }

    // Check frame time
    if (typeof metrics.frameTime !== 'number' || metrics.frameTime < 0) {
      result.errors.push('Frame time is not a valid non-negative number');
      result.isValid = false;
    } else if (metrics.frameTime > 33) { // > 30 FPS
      result.warnings.push('Frame time is high (low FPS)');
    }

    // Check memory usage
    if (typeof metrics.memoryUsage !== 'number' || metrics.memoryUsage < 0) {
      result.errors.push('Memory usage is not a valid non-negative number');
      result.isValid = false;
    } else if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      result.warnings.push('Memory usage is high');
    }

    return result;
  }
}