import { GamePiece } from '../types/GameTypes';

export interface LineClearResult {
  clearedLines: number;
  newBoard: number[][];
  clearedLineIndices: number[];
}

export class BoardManager {
  private readonly boardWidth: number;
  private readonly boardHeight: number;

  constructor(boardWidth: number = 10, boardHeight: number = 20) {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
  }

  public createEmptyBoard(): number[][] {
    return Array(this.boardHeight)
      .fill(null)
      .map(() => Array(this.boardWidth).fill(0));
  }

  public clearLines(board: number[][]): LineClearResult {
    const clearedLineIndices: number[] = [];
    const newBoard: number[][] = [];

    // Identify full lines from bottom to top
    for (let y = this.boardHeight - 1; y >= 0; y--) {
      const row = board[y];
      if (row && this.isLineFull(row)) {
        clearedLineIndices.push(y);
      } else {
        newBoard.unshift(row ? [...row] : Array(this.boardWidth).fill(0));
      }
    }

    // Add empty lines at the top for each cleared line
    const linesCleared = clearedLineIndices.length;
    for (let i = 0; i < linesCleared; i++) {
      newBoard.unshift(Array(this.boardWidth).fill(0));
    }

    // Ensure board maintains correct height
    while (newBoard.length < this.boardHeight) {
      newBoard.unshift(Array(this.boardWidth).fill(0));
    }
    while (newBoard.length > this.boardHeight) {
      newBoard.shift();
    }

    return {
      clearedLines: linesCleared,
      newBoard,
      clearedLineIndices: clearedLineIndices.reverse() // Return in top-to-bottom order
    };
  }

  public isLineFull(line: number[]): boolean {
    if (!Array.isArray(line) || line.length !== this.boardWidth) {
      return false;
    }
    return line.every(cell => cell !== 0);
  }

  public isLineEmpty(line: number[]): boolean {
    if (!Array.isArray(line) || line.length !== this.boardWidth) {
      return false;
    }
    return line.every(cell => cell === 0);
  }

  public addPieceToBoard(piece: GamePiece, board: number[][]): number[][] {
    // Create a deep copy of the board
    const newBoard = board.map(row => [...row]);

    // Add the piece to the board
    for (let y = 0; y < piece.shape.length; y++) {
      const row = piece.shape[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        if (row[x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;

          // Only place if within bounds
          if (this.isValidPosition(boardX, boardY)) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }

    return newBoard;
  }

  public getBoardHeight(): number {
    return this.boardHeight;
  }

  public getBoardWidth(): number {
    return this.boardWidth;
  }

  public isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight;
  }

  public isPositionOccupied(board: number[][], x: number, y: number): boolean {
    if (!this.isValidPosition(x, y)) {
      return true; // Out of bounds is considered occupied
    }
    return board[y] && board[y][x] !== 0;
  }

  public validateBoard(board: number[][]): boolean {
    try {
      // Check if board is an array
      if (!Array.isArray(board)) {
        return false;
      }

      // Check board dimensions
      if (board.length !== this.boardHeight) {
        return false;
      }

      // Check each row
      for (let y = 0; y < this.boardHeight; y++) {
        const row = board[y];
        
        // Check if row is an array
        if (!Array.isArray(row)) {
          return false;
        }

        // Check row width
        if (row.length !== this.boardWidth) {
          return false;
        }

        // Check each cell is a valid number
        for (let x = 0; x < this.boardWidth; x++) {
          const cell = row[x];
          if (typeof cell !== 'number' || cell < 0) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Board validation error:', error);
      return false;
    }
  }

  public getHighestOccupiedRow(board: number[][]): number {
    for (let y = 0; y < this.boardHeight; y++) {
      const row = board[y];
      if (row && row.some(cell => cell !== 0)) {
        return y;
      }
    }
    return this.boardHeight; // No occupied rows
  }

  public countOccupiedCells(board: number[][]): number {
    let count = 0;
    for (let y = 0; y < this.boardHeight; y++) {
      const row = board[y];
      if (row) {
        count += row.filter(cell => cell !== 0).length;
      }
    }
    return count;
  }

  public getColumnHeight(board: number[][], column: number): number {
    if (column < 0 || column >= this.boardWidth) {
      return 0;
    }

    for (let y = 0; y < this.boardHeight; y++) {
      const row = board[y];
      if (row && row[column] !== 0) {
        return this.boardHeight - y;
      }
    }
    return 0;
  }

  public findDropPosition(piece: GamePiece, board: number[][]): number {
    let dropY = piece.y;
    
    // Keep moving down until collision
    while (!this.checkPieceCollision(piece, board, 0, dropY - piece.y + 1)) {
      dropY++;
    }
    
    return dropY;
  }

  public checkPieceCollision(
    piece: GamePiece, 
    board: number[][], 
    dx: number = 0, 
    dy: number = 0
  ): boolean {
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    for (let y = 0; y < piece.shape.length; y++) {
      const row = piece.shape[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        if (row[x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          // Check boundaries
          if (boardX < 0 || boardX >= this.boardWidth || boardY >= this.boardHeight) {
            return true;
          }

          // Check collision with placed pieces (only if within board bounds)
          if (boardY >= 0 && this.isPositionOccupied(board, boardX, boardY)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public canPieceFit(piece: GamePiece, board: number[][], x: number, y: number): boolean {
    const testPiece = { ...piece, x, y };
    return !this.checkPieceCollision(testPiece, board);
  }

  public clearBoard(): number[][] {
    return this.createEmptyBoard();
  }

  public copyBoard(board: number[][]): number[][] {
    return board.map(row => [...row]);
  }

  public getBoardSnapshot(board: number[][]): string {
    return JSON.stringify(board);
  }

  public restoreBoardFromSnapshot(snapshot: string): number[][] | null {
    try {
      const board = JSON.parse(snapshot);
      if (this.validateBoard(board)) {
        return board;
      }
    } catch (error) {
      console.error('Failed to restore board from snapshot:', error);
    }
    return null;
  }
}