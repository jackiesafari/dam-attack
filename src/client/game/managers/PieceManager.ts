import { GamePiece, PieceType, PieceDefinition } from '../types/GameTypes';

export class PieceManager {
  private readonly pieceDefinitions: Record<PieceType, PieceDefinition>;

  constructor() {
    this.pieceDefinitions = this.initializePieceDefinitions();
  }

  private initializePieceDefinitions(): Record<PieceType, PieceDefinition> {
    return {
      [PieceType.I]: {
        shape: [[1, 1, 1, 1]],
        color: 0x8B4513, // Saddle brown - thick log
        rotationStates: [
          [[1, 1, 1, 1]],
          [[1], [1], [1], [1]],
          [[1, 1, 1, 1]],
          [[1], [1], [1], [1]]
        ]
      },
      [PieceType.O]: {
        shape: [[1, 1], [1, 1]],
        color: 0xCD853F, // Peru - tree stump cross-section
        rotationStates: [
          [[1, 1], [1, 1]],
          [[1, 1], [1, 1]],
          [[1, 1], [1, 1]],
          [[1, 1], [1, 1]]
        ]
      },
      [PieceType.T]: {
        shape: [[0, 1, 0], [1, 1, 1]],
        color: 0xDEB887, // Burlywood - main branch with shoots
        rotationStates: [
          [[0, 1, 0], [1, 1, 1]],
          [[1, 0], [1, 1], [1, 0]],
          [[1, 1, 1], [0, 1, 0]],
          [[0, 1], [1, 1], [0, 1]]
        ]
      },
      [PieceType.S]: {
        shape: [[0, 1, 1], [1, 1, 0]],
        color: 0x228B22, // Forest green - leafy branch
        rotationStates: [
          [[0, 1, 1], [1, 1, 0]],
          [[1, 0], [1, 1], [0, 1]],
          [[0, 1, 1], [1, 1, 0]],
          [[1, 0], [1, 1], [0, 1]]
        ]
      },
      [PieceType.Z]: {
        shape: [[1, 1, 0], [0, 1, 1]],
        color: 0x90EE90, // Light green - young leafy branch
        rotationStates: [
          [[1, 1, 0], [0, 1, 1]],
          [[0, 1], [1, 1], [1, 0]],
          [[1, 1, 0], [0, 1, 1]],
          [[0, 1], [1, 1], [1, 0]]
        ]
      },
      [PieceType.L]: {
        shape: [[1, 0, 0], [1, 1, 1]],
        color: 0xDAA520, // Goldenrod - bent branch
        rotationStates: [
          [[1, 0, 0], [1, 1, 1]],
          [[1, 1], [1, 0], [1, 0]],
          [[1, 1, 1], [0, 0, 1]],
          [[0, 1], [0, 1], [1, 1]]
        ]
      },
      [PieceType.J]: {
        shape: [[0, 0, 1], [1, 1, 1]],
        color: 0xA0522D, // Sienna - curved branch with bark
        rotationStates: [
          [[0, 0, 1], [1, 1, 1]],
          [[1, 0], [1, 0], [1, 1]],
          [[1, 1, 1], [1, 0, 0]],
          [[1, 1], [0, 1], [0, 1]]
        ]
      }
    };
  }

  public createRandomPiece(): GamePiece {
    const pieceTypes = Object.values(PieceType);
    const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)] as PieceType;
    return this.createPiece(randomType);
  }

  public createPiece(type: PieceType, x: number = 0, y: number = 0): GamePiece {
    const definition = this.pieceDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown piece type: ${type}`);
    }

    return {
      shape: definition.shape.map(row => [...row]), // Deep copy
      x,
      y,
      color: definition.color,
      type
    };
  }

  public rotatePiece(piece: GamePiece, clockwise: boolean = true): GamePiece | null {
    if (!piece.type) {
      // Fallback to matrix rotation for pieces without type
      return this.rotatePieceMatrix(piece, clockwise);
    }

    const definition = this.pieceDefinitions[piece.type];
    if (!definition) {
      return this.rotatePieceMatrix(piece, clockwise);
    }

    // Find current rotation state
    const currentStateIndex = this.findCurrentRotationState(piece, definition);
    if (currentStateIndex === -1) {
      return this.rotatePieceMatrix(piece, clockwise);
    }

    // Calculate next rotation state
    const nextStateIndex = clockwise 
      ? (currentStateIndex + 1) % 4
      : (currentStateIndex + 3) % 4;

    const nextShape = definition.rotationStates[nextStateIndex];
    if (!nextShape) {
      return this.rotatePieceMatrix(piece, clockwise);
    }
    
    return {
      ...piece,
      shape: nextShape.map(row => [...row]) // Deep copy
    };
  }

  public movePiece(piece: GamePiece, dx: number, dy: number): GamePiece {
    return {
      ...piece,
      x: piece.x + dx,
      y: piece.y + dy
    };
  }

  public checkCollision(
    piece: GamePiece, 
    board: number[][], 
    dx: number = 0, 
    dy: number = 0
  ): boolean {
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    const boardHeight = board.length;
    const boardWidth = board[0]?.length || 0;

    // Check each block of the piece
    for (let y = 0; y < piece.shape.length; y++) {
      const row = piece.shape[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        if (row[x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          // Check boundaries
          if (boardX < 0 || boardX >= boardWidth || boardY >= boardHeight) {
            return true;
          }

          // Check collision with placed pieces (only if within board bounds)
          if (boardY >= 0 && board[boardY] && board[boardY][boardX]) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public placePiece(piece: GamePiece, board: number[][]): number[][] {
    // Create a deep copy of the board
    const newBoard = board.map(row => [...row]);

    // Place the piece on the board
    for (let y = 0; y < piece.shape.length; y++) {
      const row = piece.shape[y];
      if (!row) continue;

      for (let x = 0; x < row.length; x++) {
        if (row[x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;

          // Only place if within bounds and above the board top
          if (boardY >= 0 && boardY < newBoard.length && 
              boardX >= 0 && boardX < (newBoard[0]?.length || 0) && 
              newBoard[boardY]) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }

    return newBoard;
  }

  public tryWallKick(
    piece: GamePiece, 
    board: number[][], 
    rotatedPiece: GamePiece
  ): GamePiece | null {
    // Standard SRS (Super Rotation System) wall kick offsets
    const wallKickOffsets = this.getWallKickOffsets(piece.type || PieceType.T);

    for (const [dx, dy] of wallKickOffsets) {
      const testPiece = {
        ...rotatedPiece,
        x: rotatedPiece.x + dx,
        y: rotatedPiece.y + dy
      };

      if (!this.checkCollision(testPiece, board)) {
        return testPiece;
      }
    }

    return null;
  }

  public getPieceWidth(piece: GamePiece): number {
    if (!piece.shape || piece.shape.length === 0) return 0;
    return Math.max(...piece.shape.map(row => row?.length || 0));
  }

  public getPieceHeight(piece: GamePiece): number {
    return piece.shape?.length || 0;
  }

  public isPieceValid(piece: GamePiece): boolean {
    return (
      piece &&
      Array.isArray(piece.shape) &&
      piece.shape.length > 0 &&
      piece.shape.every(row => Array.isArray(row)) &&
      typeof piece.x === 'number' &&
      typeof piece.y === 'number' &&
      typeof piece.color === 'number'
    );
  }

  private rotatePieceMatrix(piece: GamePiece, clockwise: boolean = true): GamePiece | null {
    const matrix = piece.shape;
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;

    if (rows === 0 || cols === 0) {
      return null;
    }

    let rotated: number[][];

    if (clockwise) {
      rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
      for (let i = 0; i < rows; i++) {
        const row = matrix[i];
        if (!row) continue;
        for (let j = 0; j < cols; j++) {
          if (row[j] !== undefined && rotated[j]) {
            rotated[j]![rows - 1 - i] = row[j]!;
          }
        }
      }
    } else {
      rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
      for (let i = 0; i < rows; i++) {
        const row = matrix[i];
        if (!row) continue;
        for (let j = 0; j < cols; j++) {
          if (row[j] !== undefined && rotated[cols - 1 - j]) {
            rotated[cols - 1 - j]![i] = row[j]!;
          }
        }
      }
    }

    return {
      ...piece,
      shape: rotated
    };
  }

  private findCurrentRotationState(piece: GamePiece, definition: PieceDefinition): number {
    const shapeString = JSON.stringify(piece.shape);
    
    for (let i = 0; i < definition.rotationStates.length; i++) {
      if (JSON.stringify(definition.rotationStates[i]) === shapeString) {
        return i;
      }
    }
    
    return -1;
  }

  private getWallKickOffsets(pieceType: PieceType): [number, number][] {
    // Standard wall kick offsets for most pieces
    const standardOffsets: [number, number][] = [
      [0, 0],   // No offset (try original position)
      [-1, 0],  // Left
      [1, 0],   // Right
      [0, -1],  // Up
      [-1, -1], // Left-up
      [1, -1]   // Right-up
    ];

    // I-piece has special wall kick rules
    if (pieceType === PieceType.I) {
      return [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2]
      ];
    }

    return standardOffsets;
  }
}