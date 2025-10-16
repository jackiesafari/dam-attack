export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

// Leaderboard types
export type LeaderboardEntry = {
  username: string;
  score: number;
  level: number;
  lines: number;
  timestamp: number; // Date when score was achieved
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
};

export type SubmitScoreRequest = {
  score: number;
  level: number;
  lines: number;
};

export type RedditUserResponse = {
  username: string;
  authenticated: boolean;
  bestScore?: number;
  currentRank?: number;
};

export type SubmitScoreResponse = {
  type: 'submitScore';
  success: boolean;
  rank?: number; // Player's rank if they made it to top 10
  message?: string;
};
