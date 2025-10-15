import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScoreManager, ScoreCalculationData, ScoreFormulas, LeaderboardOptions } from '../ScoreManager';
import { ScoreEntry } from '../../types/GameTypes';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Devvit environment
const mockDevvit = {
  saveScore: vi.fn(),
  getScores: vi.fn()
};

Object.defineProperty(window, 'devvit', {
  value: mockDevvit,
  writable: true
});

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create with default score formulas', () => {
      expect(scoreManager).toBeDefined();
      
      const formulas = scoreManager.getScoreFormulas();
      expect(formulas.singleLine).toBe(100);
      expect(formulas.doubleLine).toBe(300);
      expect(formulas.tripleLine).toBe(500);
      expect(formulas.tetris).toBe(800);
    });

    it('should create with custom score formulas', () => {
      const customFormulas: Partial<ScoreFormulas> = {
        singleLine: 150,
        tetris: 1000,
        levelMultiplier: 2
      };

      const customScoreManager = new ScoreManager(customFormulas);
      const formulas = customScoreManager.getScoreFormulas();
      
      expect(formulas.singleLine).toBe(150);
      expect(formulas.tetris).toBe(1000);
      expect(formulas.levelMultiplier).toBe(2);
      expect(formulas.doubleLine).toBe(300); // Should keep default
    });

    it('should detect Devvit environment', () => {
      expect(scoreManager).toBeDefined();
      // Devvit detection is tested indirectly through save/load behavior
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score for single line clear', () => {
      const data: ScoreCalculationData = {
        linesCleared: 1,
        level: 1
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(100); // 100 * 1 * 1
    });

    it('should calculate score for double line clear', () => {
      const data: ScoreCalculationData = {
        linesCleared: 2,
        level: 2
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(600); // 300 * 2 * 1
    });

    it('should calculate score for triple line clear', () => {
      const data: ScoreCalculationData = {
        linesCleared: 3,
        level: 3
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(1500); // 500 * 3 * 1
    });

    it('should calculate score for Tetris (4 lines)', () => {
      const data: ScoreCalculationData = {
        linesCleared: 4,
        level: 2
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(2400); // (800 * 2 * 1) + (800 * 0.5) = 1600 + 400
    });

    it('should apply level multiplier correctly', () => {
      const data: ScoreCalculationData = {
        linesCleared: 1,
        level: 5
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(500); // 100 * 5 * 1
    });

    it('should add Tetris bonus', () => {
      const data: ScoreCalculationData = {
        linesCleared: 4,
        level: 1,
        isTetris: true
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(1200); // (800 * 1 * 1) + (800 * 0.5) = 800 + 400
    });

    it('should calculate soft drop bonus', () => {
      const data: ScoreCalculationData = {
        linesCleared: 0,
        level: 1,
        softDropDistance: 5
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(5); // 5 * 1
    });

    it('should calculate hard drop bonus', () => {
      const data: ScoreCalculationData = {
        linesCleared: 0,
        level: 1,
        hardDropDistance: 10
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(20); // 10 * 2
    });

    it('should handle general drop bonus', () => {
      const data: ScoreCalculationData = {
        linesCleared: 0,
        level: 1,
        dropBonus: 50
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(50);
    });

    it('should combine multiple score sources', () => {
      const data: ScoreCalculationData = {
        linesCleared: 2,
        level: 3,
        softDropDistance: 3,
        hardDropDistance: 5,
        dropBonus: 25
      };

      const score = scoreManager.calculateScore(data);
      // (300 * 3 * 1) + (3 * 1) + (5 * 2) + 25 = 900 + 3 + 10 + 25 = 938
      expect(score).toBe(938);
    });

    it('should handle more than 4 lines cleared', () => {
      const data: ScoreCalculationData = {
        linesCleared: 8,
        level: 1
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(1600); // 800 * 2 (8/4 = 2 Tetrises)
    });

    it('should return integer scores', () => {
      const data: ScoreCalculationData = {
        linesCleared: 1,
        level: 1,
        softDropDistance: 3.7 // Fractional input
      };

      const score = scoreManager.calculateScore(data);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('Local Storage Operations', () => {
    it('should save score to local storage', async () => {
      const entry: ScoreEntry = {
        username: 'TestPlayer',
        score: 1000,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      };

      localStorageMock.getItem.mockReturnValue('[]');
      
      const result = await scoreManager.saveScore(entry);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dam-attack-scores',
        expect.stringContaining('"score":1000')
      );
    });

    it('should retrieve scores from local storage', async () => {
      const mockScores: ScoreEntry[] = [
        { username: 'Player1', score: 1000, timestamp: Date.now(), level: 5, lines: 20 },
        { username: 'Player2', score: 800, timestamp: Date.now(), level: 4, lines: 15 }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScores));
      
      const scores = await scoreManager.getLeaderboard();
      
      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(1000);
      expect(scores[1].score).toBe(800);
    });

    it('should handle empty local storage', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const scores = await scoreManager.getLeaderboard();
      
      expect(scores).toEqual([]);
    });

    it('should handle corrupted local storage data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const scores = await scoreManager.getLeaderboard();
      
      expect(scores).toEqual([]);
    });

    it('should limit stored scores to maximum', async () => {
      const existingScores = Array.from({ length: 100 }, (_, i) => ({
        username: `Player${i}`,
        score: 1000 - i,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingScores));

      const newEntry: ScoreEntry = {
        username: 'NewPlayer',
        score: 1500,
        timestamp: Date.now(),
        level: 6,
        lines: 25
      };

      await scoreManager.saveScore(newEntry);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(100); // Should not exceed maximum
      expect(savedData[0].score).toBe(1500); // New high score should be first
    });

    it('should filter invalid score entries', async () => {
      const mixedData = [
        { username: 'Valid', score: 1000, timestamp: Date.now(), level: 5, lines: 20 },
        { username: 'Invalid1', score: -100, timestamp: Date.now(), level: 5, lines: 20 }, // Negative score
        { username: 'Invalid2', score: 'not a number', timestamp: Date.now(), level: 5, lines: 20 }, // Invalid score type
        null, // Null entry
        { username: 'Valid2', score: 800, timestamp: Date.now(), level: 4, lines: 15 }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mixedData));
      
      const scores = await scoreManager.getLeaderboard();
      
      expect(scores).toHaveLength(2);
      expect(scores[0].username).toBe('Valid');
      expect(scores[1].username).toBe('Valid2');
    });
  });

  describe('Devvit Integration', () => {
    it('should save score to Devvit when available', async () => {
      mockDevvit.saveScore.mockResolvedValue({ success: true });
      localStorageMock.getItem.mockReturnValue('[]');

      const entry: ScoreEntry = {
        username: 'DevvitPlayer',
        score: 1200,
        timestamp: Date.now(),
        level: 6,
        lines: 24
      };

      const result = await scoreManager.saveScore(entry);

      expect(result).toBe(true);
      expect(mockDevvit.saveScore).toHaveBeenCalledWith(entry);
    });

    it('should handle Devvit save failure gracefully', async () => {
      mockDevvit.saveScore.mockRejectedValue(new Error('Network error'));
      localStorageMock.getItem.mockReturnValue('[]');

      const entry: ScoreEntry = {
        username: 'Player',
        score: 1000,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      };

      const result = await scoreManager.saveScore(entry);

      expect(result).toBe(true); // Should still succeed with local save
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should retrieve scores from Devvit when available', async () => {
      const devvitScores: ScoreEntry[] = [
        { username: 'DevvitPlayer1', score: 1500, timestamp: Date.now(), level: 7, lines: 30 }
      ];
      const localScores: ScoreEntry[] = [
        { username: 'LocalPlayer1', score: 1000, timestamp: Date.now(), level: 5, lines: 20 }
      ];

      mockDevvit.getScores.mockResolvedValue({ scores: devvitScores });
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localScores));

      const scores = await scoreManager.getLeaderboard();

      expect(scores).toHaveLength(2);
      expect(scores[0].score).toBe(1500); // Devvit score should be first (higher)
      expect(scores[1].score).toBe(1000); // Local score should be second
    });

    it('should handle Devvit fetch failure gracefully', async () => {
      mockDevvit.getScores.mockRejectedValue(new Error('Network error'));
      const localScores: ScoreEntry[] = [
        { username: 'LocalPlayer', score: 1000, timestamp: Date.now(), level: 5, lines: 20 }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localScores));

      const scores = await scoreManager.getLeaderboard();

      expect(scores).toHaveLength(1);
      expect(scores[0].username).toBe('LocalPlayer');
    });

    it('should merge scores and remove duplicates', async () => {
      const timestamp = Date.now();
      const duplicateScore: ScoreEntry = {
        username: 'Player',
        score: 1000,
        timestamp,
        level: 5,
        lines: 20
      };

      mockDevvit.getScores.mockResolvedValue({ scores: [duplicateScore] });
      localStorageMock.getItem.mockReturnValue(JSON.stringify([duplicateScore]));

      const scores = await scoreManager.getLeaderboard();

      expect(scores).toHaveLength(1); // Duplicate should be removed
    });
  });

  describe('Leaderboard Options', () => {
    beforeEach(() => {
      const mockScores: ScoreEntry[] = Array.from({ length: 20 }, (_, i) => ({
        username: `Player${i}`,
        score: 2000 - i * 100,
        timestamp: Date.now() - i * 1000,
        level: 5,
        lines: 20
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScores));
    });

    it('should limit results based on limit option', async () => {
      const options: LeaderboardOptions = { limit: 5 };
      const scores = await scoreManager.getLeaderboard(options);

      expect(scores).toHaveLength(5);
    });

    it('should apply offset for pagination', async () => {
      const options: LeaderboardOptions = { limit: 5, offset: 10 };
      const scores = await scoreManager.getLeaderboard(options);

      expect(scores).toHaveLength(5);
      expect(scores[0].score).toBe(1000); // Should be the 11th highest score
    });

    it('should sort by score in descending order by default', async () => {
      const scores = await scoreManager.getLeaderboard();

      expect(scores[0].score).toBeGreaterThan(scores[1].score);
      expect(scores[1].score).toBeGreaterThan(scores[2].score);
    });

    it('should sort by score in ascending order when specified', async () => {
      const options: LeaderboardOptions = { sortOrder: 'asc' };
      const scores = await scoreManager.getLeaderboard(options);

      expect(scores[0].score).toBeLessThan(scores[1].score);
      expect(scores[1].score).toBeLessThan(scores[2].score);
    });

    it('should sort by timestamp when specified', async () => {
      const options: LeaderboardOptions = { sortBy: 'timestamp', sortOrder: 'desc' };
      const scores = await scoreManager.getLeaderboard(options);

      expect(scores[0].timestamp).toBeGreaterThan(scores[1].timestamp);
    });
  });

  describe('Player Statistics', () => {
    it('should get personal best score', () => {
      const mockScores: ScoreEntry[] = [
        { username: 'Player', score: 800, timestamp: Date.now(), level: 4, lines: 15 },
        { username: 'Player', score: 1200, timestamp: Date.now(), level: 6, lines: 25 },
        { username: 'Player', score: 1000, timestamp: Date.now(), level: 5, lines: 20 }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScores));

      const personalBest = scoreManager.getPersonalBest();

      expect(personalBest).not.toBeNull();
      expect(personalBest!.score).toBe(1200);
    });

    it('should return null for personal best when no scores exist', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const personalBest = scoreManager.getPersonalBest();

      expect(personalBest).toBeNull();
    });

    it('should get total games played', () => {
      const mockScores: ScoreEntry[] = Array.from({ length: 15 }, (_, i) => ({
        username: 'Player',
        score: 1000 + i,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScores));

      const totalGames = scoreManager.getTotalGamesPlayed();

      expect(totalGames).toBe(15);
    });

    it('should get comprehensive player statistics', () => {
      const mockScores: ScoreEntry[] = [
        { username: 'Player', score: 1000, timestamp: Date.now(), level: 5, lines: 20 },
        { username: 'Player', score: 1200, timestamp: Date.now(), level: 6, lines: 25 },
        { username: 'Player', score: 800, timestamp: Date.now(), level: 4, lines: 15 }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockScores));

      const stats = scoreManager.getPlayerStats();

      expect(stats.totalGames).toBe(3);
      expect(stats.personalBest!.score).toBe(1200);
      expect(stats.averageScore).toBe(1000); // (1000 + 1200 + 800) / 3
      expect(stats.totalLines).toBe(60); // 20 + 25 + 15
      expect(stats.averageLevel).toBe(5); // (5 + 6 + 4) / 3
    });

    it('should handle empty statistics gracefully', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const stats = scoreManager.getPlayerStats();

      expect(stats.totalGames).toBe(0);
      expect(stats.personalBest).toBeNull();
      expect(stats.averageScore).toBe(0);
      expect(stats.totalLines).toBe(0);
      expect(stats.averageLevel).toBe(0);
    });
  });

  describe('Score Formula Management', () => {
    it('should update score formulas', () => {
      const newFormulas: Partial<ScoreFormulas> = {
        singleLine: 150,
        tetris: 1000
      };

      scoreManager.updateScoreFormulas(newFormulas);

      const formulas = scoreManager.getScoreFormulas();
      expect(formulas.singleLine).toBe(150);
      expect(formulas.tetris).toBe(1000);
      expect(formulas.doubleLine).toBe(300); // Should remain unchanged
    });

    it('should apply updated formulas to score calculation', () => {
      scoreManager.updateScoreFormulas({ singleLine: 200 });

      const data: ScoreCalculationData = {
        linesCleared: 1,
        level: 1
      };

      const score = scoreManager.calculateScore(data);
      expect(score).toBe(200); // Updated formula applied
    });
  });

  describe('Data Management', () => {
    it('should clear local scores', () => {
      const result = scoreManager.clearLocalScores();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dam-attack-scores');
    });

    it('should handle clear local scores error', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = scoreManager.clearLocalScores();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const scores = await scoreManager.getLeaderboard();
      expect(scores).toEqual([]);
    });

    it('should handle save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const entry: ScoreEntry = {
        username: 'Player',
        score: 1000,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      };

      const result = await scoreManager.saveScore(entry);
      expect(result).toBe(false);
    });

    it('should handle personal best calculation errors', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const personalBest = scoreManager.getPersonalBest();
      expect(personalBest).toBeNull();
    });

    it('should handle player stats calculation errors', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const stats = scoreManager.getPlayerStats();
      expect(stats.totalGames).toBe(0);
      expect(stats.personalBest).toBeNull();
    });
  });

  describe('Environment Detection', () => {
    it('should work without Devvit environment', () => {
      // Remove Devvit from window
      delete (window as any).devvit;

      const nonDevvitScoreManager = new ScoreManager();
      expect(nonDevvitScoreManager).toBeDefined();
    });

    it('should handle missing Devvit methods gracefully', async () => {
      (window as any).devvit = {}; // Devvit object without methods

      const entry: ScoreEntry = {
        username: 'Player',
        score: 1000,
        timestamp: Date.now(),
        level: 5,
        lines: 20
      };

      localStorageMock.getItem.mockReturnValue('[]');

      const result = await scoreManager.saveScore(entry);
      expect(result).toBe(true); // Should succeed with local storage only
    });
  });
});