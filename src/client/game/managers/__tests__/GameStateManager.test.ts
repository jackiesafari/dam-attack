import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, GameState, StateListener } from '../GameStateManager';
import { GamePiece, PieceType } from '../../types/GameTypes';

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;

  beforeEach(() => {
    gameStateManager = new GameStateManager();
  });

  describe('initialization', () => {
    it('should create initial state with correct default values', () => {
      const state = gameStateManager.getState();
      
      expect(state.board).toHaveLength(20);
      expect(state.board[0]).toHaveLength(10);
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lines).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.dropTime).toBe(1000);
      expect(state.lastDrop).toBe(0);
      expect(state.currentPiece).toBeNull();
      expect(state.nextPiece).toBeNull();
    });

    it('should create board with custom dimensions', () => {
      const customManager = new GameStateManager(8, 15);
      const state = customManager.getState();
      
      expect(state.board).toHaveLength(15);
      expect(state.board[0]).toHaveLength(8);
    });
  });

  describe('state updates', () => {
    it('should update valid state properties', () => {
      gameStateManager.updateState({ score: 100, level: 2 });
      const state = gameStateManager.getState();
      
      expect(state.score).toBe(100);
      expect(state.level).toBe(2);
    });

    it('should reject invalid state updates', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      gameStateManager.updateState({ score: -10, level: 0 });
      const state = gameStateManager.getState();
      
      expect(state.score).toBe(0); // Should remain unchanged
      expect(state.level).toBe(1); // Should remain unchanged
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });

    it('should update piece state correctly', () => {
      const testPiece: GamePiece = {
        shape: [[1, 1], [1, 1]],
        x: 5,
        y: 0,
        color: 0xFFFF00,
        type: PieceType.O
      };

      gameStateManager.updateState({ currentPiece: testPiece });
      const state = gameStateManager.getState();
      
      expect(state.currentPiece).toEqual(testPiece);
    });
  });

  describe('state validation', () => {
    it('should validate correct state', () => {
      expect(gameStateManager.validateState()).toBe(true);
    });

    it('should detect invalid board structure', () => {
      // Manually corrupt the state for testing
      (gameStateManager as any).state.board = [];
      expect(gameStateManager.validateState()).toBe(false);
    });

    it('should detect invalid numeric values', () => {
      (gameStateManager as any).state.score = -1;
      expect(gameStateManager.validateState()).toBe(false);
    });

    it('should validate pieces correctly', () => {
      const validPiece: GamePiece = {
        shape: [[1]],
        x: 0,
        y: 0,
        color: 0xFF0000
      };

      const invalidPiece = {
        shape: "not an array",
        x: 0,
        y: 0,
        color: 0xFF0000
      };

      gameStateManager.updateState({ currentPiece: validPiece });
      expect(gameStateManager.validateState()).toBe(true);

      (gameStateManager as any).state.currentPiece = invalidPiece;
      expect(gameStateManager.validateState()).toBe(false);
    });
  });

  describe('state listeners', () => {
    it('should notify listeners on state change', () => {
      let notificationCount = 0;
      let lastState: GameState | null = null;

      const listener: StateListener = (state) => {
        notificationCount++;
        lastState = state;
      };

      gameStateManager.addStateListener(listener);
      gameStateManager.updateState({ score: 100 });

      expect(notificationCount).toBe(1);
      expect(lastState?.score).toBe(100);
    });

    it('should not notify listeners if state does not change', () => {
      let notificationCount = 0;

      const listener: StateListener = () => {
        notificationCount++;
      };

      gameStateManager.addStateListener(listener);
      gameStateManager.updateState({ score: 0 }); // Same as initial value

      expect(notificationCount).toBe(0);
    });

    it('should remove listeners correctly', () => {
      let notificationCount = 0;

      const listener: StateListener = () => {
        notificationCount++;
      };

      gameStateManager.addStateListener(listener);
      gameStateManager.removeStateListener(listener);
      gameStateManager.updateState({ score: 100 });

      expect(notificationCount).toBe(0);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener: StateListener = () => {
        throw new Error('Test error');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      gameStateManager.addStateListener(errorListener);
      gameStateManager.updateState({ score: 100 });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('state reset', () => {
    it('should reset state to initial values', () => {
      gameStateManager.updateState({ 
        score: 1000, 
        level: 5, 
        lines: 20, 
        isGameOver: true 
      });

      gameStateManager.resetState();
      const state = gameStateManager.getState();

      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lines).toBe(0);
      expect(state.isGameOver).toBe(false);
    });

    it('should notify listeners on reset', () => {
      let notificationCount = 0;

      const listener: StateListener = () => {
        notificationCount++;
      };

      gameStateManager.addStateListener(listener);
      gameStateManager.resetState();

      expect(notificationCount).toBe(1);
    });
  });
});