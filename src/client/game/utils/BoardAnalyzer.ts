/**
 * BoardAnalyzer - Utility for analyzing board state
 * Used for telemetry collection (holes, overhangs, density, stack height)
 */

export interface BoardAnalysis {
  stackHeight: number;        // Height of highest occupied row (0-1 normalized)
  holesCount: number;         // Number of holes (empty cells with filled cells above)
  overhangsCount: number;     // Number of overhangs (cells with no support below)
  boardDensity: number;       // Percentage of board filled (0-1)
  maxColumnHeight: number;    // Maximum column height
  averageColumnHeight: number; // Average column height
}

/**
 * Analyze board state for telemetry
 */
export class BoardAnalyzer {
  /**
   * Analyze board and return metrics
   */
  public static analyzeBoard(board: number[][], boardHeight: number): BoardAnalysis {
    const width = board[0]?.length || 0;
    const height = board.length || 0;
    
    // Find highest occupied row (from top, 0-indexed)
    let highestRow = height;
    for (let y = 0; y < height; y++) {
      if (board[y]?.some(cell => cell !== 0)) {
        highestRow = y;
        break;
      }
    }
    
    // Stack height normalized (0-1, where 1 is top of board)
    const stackHeight = highestRow < height ? (height - highestRow) / height : 0;
    
    // Column heights
    const columnHeights: number[] = [];
    for (let x = 0; x < width; x++) {
      let colHeight = 0;
      for (let y = height - 1; y >= 0; y--) {
        if (board[y]?.[x] !== 0) {
          colHeight = height - y;
          break;
        }
      }
      columnHeights.push(colHeight);
    }
    
    const maxColumnHeight = Math.max(...columnHeights, 0);
    const averageColumnHeight = columnHeights.length > 0
      ? columnHeights.reduce((a, b) => a + b, 0) / columnHeights.length
      : 0;
    
    // Count holes (empty cells with filled cells above them)
    let holesCount = 0;
    for (let x = 0; x < width; x++) {
      let foundBlock = false;
      for (let y = height - 1; y >= 0; y--) {
        const cell = board[y]?.[x];
        if (cell !== 0) {
          foundBlock = true;
        } else if (foundBlock && cell === 0) {
          // Empty cell with a block above it = hole
          holesCount++;
        }
      }
    }
    
    // Count overhangs (cells with no support directly below)
    // An overhang is a filled cell with an empty cell directly below it
    let overhangsCount = 0;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - 1; y++) {
        const currentCell = board[y]?.[x];
        const cellBelow = board[y + 1]?.[x];
        if (currentCell !== 0 && cellBelow === 0) {
          // Check if there's any support to the left or right
          const hasLeftSupport = x > 0 && board[y]?.[x - 1] !== 0;
          const hasRightSupport = x < width - 1 && board[y]?.[x + 1] !== 0;
          // Only count as overhang if no direct support below and no side support
          if (!hasLeftSupport && !hasRightSupport) {
            overhangsCount++;
          }
        }
      }
    }
    
    // Board density (percentage of cells filled)
    let filledCells = 0;
    const totalCells = width * height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (board[y]?.[x] !== 0) {
          filledCells++;
        }
      }
    }
    const boardDensity = totalCells > 0 ? filledCells / totalCells : 0;
    
    return {
      stackHeight,
      holesCount,
      overhangsCount,
      boardDensity,
      maxColumnHeight,
      averageColumnHeight
    };
  }
  
  /**
   * Get stack height as a normalized value (0-1)
   */
  public static getStackHeight(board: number[][], boardHeight: number): number {
    const analysis = this.analyzeBoard(board, boardHeight);
    return analysis.stackHeight;
  }
  
  /**
   * Count holes in the board
   */
  public static countHoles(board: number[][], boardHeight: number): number {
    const analysis = this.analyzeBoard(board, boardHeight);
    return analysis.holesCount;
  }
}
