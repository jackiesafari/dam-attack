import { describe, it, expect, beforeEach } from 'vitest';
import { BoardManager } from '../BoardManager';
import { GamePiece, PieceType } from '../../types/GameTypes';

describe('BoardManager', () => {
  let boardManager: BoardManager;

  beforeEach(() => {
    boardManager = new BoardManager();
  });

  describe('board creation', () => {
    it('should create empty board with default dimensions', () => {
      const board = boardManager.createEmptyBoard();
      
      expect(board).toHaveLength(20);
      expect(board[0]).toHaveLength(10);
      expect(board.every(row => row.every(cell => cell === 0))).toBe(true);
    });

    it('should create board with custom dimensions', () => {
      const customManager = new BoardManager(8, 15);
      const board = customManager.createEmptyBoard();
      
      expect(board).toHaveLength(15);
      expect(board[0]).toHaveLength(8);
    });
  });

  describe('line clearing', () => {
    let board: number[][];

    beforeEach(() => {
      board = boardManager.createEmptyBoard();
    });

    it('should clear single full line', () => {
      board[19] = Array(10).fill(0xFF0000);
      
      const result = boardManager.clearLines(board);
      
      expect(result.clearedLines).toBe(1);
      expect(result.clearedLineIndices).toEqual([19]);
      expect(result.newBoard[19].every(cell => cell === 0)).toBe(true);
    });

    it('should clear multiple full lines', () => {
      board[18] = Array(10).fill(0xFF0000);
      board[19] = Array(10).fill(0x00FF00);
      
      const result = boardManager.clearLines(board);
      
      expect(result.clearedLines).toBe(2);
      expect(result.clearedLineIndices).toEqual([18, 19]);
    });
  });
});