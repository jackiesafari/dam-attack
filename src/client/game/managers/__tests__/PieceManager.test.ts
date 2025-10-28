import { describe, it, expect, beforeEach } from 'vitest';
import { PieceManager } from '../PieceManager';
import { GamePiece, PieceType } from '../../types/GameTypes';

describe('PieceManager', () => {
  let pieceManager: PieceManager;

  beforeEach(() => {
    pieceManager = new PieceManager();
  });

  describe('piece creation', () => {
    it('should create random pieces', () => {
      const piece = pieceManager.createRandomPiece();
      
      expect(piece).toBeDefined();
      expect(piece.shape).toBeDefined();
      expect(piece.color).toBeDefined();
      expect(piece.x).toBe(0);
      expect(piece.y).toBe(0);
    });

    it('should create specific piece types', () => {
      const iPiece = pieceManager.createPiece(PieceType.I, 5, 10);
      
      expect(iPiece.type).toBe(PieceType.I);
      expect(iPiece.x).toBe(5);
      expect(iPiece.y).toBe(10);
      expect(iPiece.color).toBe(0x00FFFF);
      expect(iPiece.shape).toEqual([[1, 1, 1, 1]]);
    });

    it('should throw error for unknown piece type', () => {
      expect(() => {
        pieceManager.createPiece('UNKNOWN' as PieceType);
      }).toThrow('Unknown piece type: UNKNOWN');
    });
  });

  describe('piece rotation', () => {
    it('should rotate I-piece correctly', () => {
      const iPiece = pieceManager.createPiece(PieceType.I);
      const rotated = pieceManager.rotatePiece(iPiece);
      
      expect(rotated).toBeDefined();
      expect(rotated!.shape).toEqual([[1], [1], [1], [1]]);
    });

    it('should rotate T-piece correctly', () => {
      const tPiece = pieceManager.createPiece(PieceType.T);
      const rotated = pieceManager.rotatePiece(tPiece);
      
      expect(rotated).toBeDefined();
      expect(rotated!.shape).toEqual([[1, 0], [1, 1], [1, 0]]);
    });

    it('should rotate counter-clockwise', () => {
      const tPiece = pieceManager.createPiece(PieceType.T);
      const rotated = pieceManager.rotatePiece(tPiece, false);
      
      expect(rotated).toBeDefined();
      expect(rotated!.shape).toEqual([[0, 1], [1, 1], [0, 1]]);
    });

    it('should handle O-piece rotation (no change)', () => {
      const oPiece = pieceManager.createPiece(PieceType.O);
      const rotated = pieceManager.rotatePiece(oPiece);
      
      expect(rotated).toBeDefined();
      expect(rotated!.shape).toEqual([[1, 1], [1, 1]]);
    });

    it('should handle pieces without type using matrix rotation', () => {
      const customPiece: GamePiece = {
        shape: [[1, 0], [1, 1]],
        x: 0,
        y: 0,
        color: 0xFF0000
      };

      const rotated = pieceManager.rotatePiece(customPiece);
      
      expect(rotated).toBeDefined();
      expect(rotated!.shape).toEqual([[1, 1], [1, 0]]);
    });
  });

  describe('piece movement', () => {
    it('should move piece correctly', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, 10);
      const moved = pieceManager.movePiece(piece, 2, -1);
      
      expect(moved.x).toBe(7);
      expect(moved.y).toBe(9);
      expect(moved.shape).toEqual(piece.shape); // Shape should remain unchanged
    });
  });

  describe('collision detection', () => {
    let board: number[][];

    beforeEach(() => {
      board = Array(20).fill(null).map(() => Array(14).fill(0));
    });

    it('should detect no collision in empty space', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, 5);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(false);
    });

    it('should detect left boundary collision', () => {
      const piece = pieceManager.createPiece(PieceType.T, -1, 5);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(true);
    });

    it('should detect right boundary collision', () => {
      const piece = pieceManager.createPiece(PieceType.T, 13, 5);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(true);
    });

    it('should detect bottom boundary collision', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, 19);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(true);
    });

    it('should detect collision with placed pieces', () => {
      board[10][5] = 0xFF0000; // Place a block
      const piece = pieceManager.createPiece(PieceType.T, 4, 9);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(true);
    });

    it('should check collision with offset', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, 5);
      const hasCollision = pieceManager.checkCollision(piece, board, -10, 0);
      
      expect(hasCollision).toBe(true); // Would go out of left boundary
    });

    it('should allow piece above board top', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, -1);
      const hasCollision = pieceManager.checkCollision(piece, board);
      
      expect(hasCollision).toBe(false);
    });
  });

  describe('piece placement', () => {
    let board: number[][];

    beforeEach(() => {
      board = Array(20).fill(null).map(() => Array(14).fill(0));
    });

    it('should place piece on board correctly', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, 10);
      const newBoard = pieceManager.placePiece(piece, board);
      
      // Check that T-piece is placed correctly
      expect(newBoard[10][6]).toBe(piece.color); // Top center
      expect(newBoard[11][5]).toBe(piece.color); // Bottom left
      expect(newBoard[11][6]).toBe(piece.color); // Bottom center
      expect(newBoard[11][7]).toBe(piece.color); // Bottom right
      
      // Original board should be unchanged
      expect(board[10][6]).toBe(0);
    });

    it('should not place piece blocks above board', () => {
      const piece = pieceManager.createPiece(PieceType.T, 5, -1);
      const newBoard = pieceManager.placePiece(piece, board);
      
      // Only the bottom row of the T should be placed
      expect(newBoard[0][5]).toBe(piece.color);
      expect(newBoard[0][6]).toBe(piece.color);
      expect(newBoard[0][7]).toBe(piece.color);
    });
  });

  describe('wall kick functionality', () => {
    let board: number[][];

    beforeEach(() => {
      board = Array(20).fill(null).map(() => Array(14).fill(0));
    });

    it('should perform wall kick when rotation would cause collision', () => {
      const piece = pieceManager.createPiece(PieceType.I, 0, 5);
      const rotated = pieceManager.rotatePiece(piece);
      
      if (rotated) {
        const wallKicked = pieceManager.tryWallKick(piece, board, rotated);
        expect(wallKicked).toBeDefined();
      }
    });

    it('should return null if wall kick is not possible', () => {
      // Create a scenario where wall kick is impossible
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          board[y][x] = 0xFF0000;
        }
      }
      
      const piece = pieceManager.createPiece(PieceType.I, 0, 0);
      const rotated = pieceManager.rotatePiece(piece);
      
      if (rotated) {
        const wallKicked = pieceManager.tryWallKick(piece, board, rotated);
        expect(wallKicked).toBeNull();
      }
    });
  });

  describe('piece validation', () => {
    it('should validate correct piece', () => {
      const piece = pieceManager.createPiece(PieceType.T);
      expect(pieceManager.isPieceValid(piece)).toBe(true);
    });

    it('should reject invalid piece', () => {
      const invalidPiece = {
        shape: "not an array",
        x: "not a number",
        y: 0,
        color: 0xFF0000
      } as any;

      expect(pieceManager.isPieceValid(invalidPiece)).toBe(false);
    });
  });

  describe('piece dimensions', () => {
    it('should calculate piece width correctly', () => {
      const iPiece = pieceManager.createPiece(PieceType.I);
      const tPiece = pieceManager.createPiece(PieceType.T);
      
      expect(pieceManager.getPieceWidth(iPiece)).toBe(4);
      expect(pieceManager.getPieceWidth(tPiece)).toBe(3);
    });

    it('should calculate piece height correctly', () => {
      const iPiece = pieceManager.createPiece(PieceType.I);
      const tPiece = pieceManager.createPiece(PieceType.T);
      
      expect(pieceManager.getPieceHeight(iPiece)).toBe(1);
      expect(pieceManager.getPieceHeight(tPiece)).toBe(2);
    });

    it('should handle empty piece', () => {
      const emptyPiece: GamePiece = {
        shape: [],
        x: 0,
        y: 0,
        color: 0
      };
      
      expect(pieceManager.getPieceWidth(emptyPiece)).toBe(0);
      expect(pieceManager.getPieceHeight(emptyPiece)).toBe(0);
    });
  });
});