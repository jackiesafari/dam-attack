import { LeaderboardEntry, LeaderboardResponse, SubmitScoreRequest, SubmitScoreResponse, RedditUserResponse } from '../../../shared/types/api';

export class LeaderboardManager {
  private static instance: LeaderboardManager;
  private cachedUsername: string | null = null;
  private cachedUserData: RedditUserResponse | null = null;
  private cachedLeaderboard: LeaderboardEntry[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager();
    }
    return LeaderboardManager.instance;
  }

  public async submitScore(score: number, level: number, lines: number, anonymous: boolean = false): Promise<SubmitScoreResponse> {
    const endpoint = anonymous ? '/api/submit-anonymous' : '/api/submit-score';
    console.log(`Submitting score: ${score} (level: ${level}, lines: ${lines}, anonymous: ${anonymous})`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score, level, lines } as SubmitScoreRequest),
      });

      console.log(`Score submission response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const result: SubmitScoreResponse = await response.json();
      console.log('Score submission result:', result);
      
      // Add the submitted score to cache immediately for better UX
      if (result.success) {
        const userData = await this.getRedditUserData();
        const username = userData?.username || (anonymous ? 'Anonymous' : 'Anonymous Player');
        
        const newEntry: LeaderboardEntry = {
          username,
          score: Math.floor(score),
          level,
          lines,
          timestamp: Date.now()
        };
        
        this.addScoreToCache(newEntry);
      }
      
      // Clear cache to force refresh (only for non-anonymous submissions)
      if (!anonymous) {
        this.cachedUserData = null; // Clear user data cache to refresh best score
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting score:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to submit score. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
      }
      
      return {
        type: 'submitScore',
        success: false,
        message: errorMessage
      };
    }
  }

  public async getLeaderboard(forceRefresh: boolean = false): Promise<LeaderboardEntry[]> {
    const now = Date.now();
    
    // Return cached data if it's still fresh and not forcing refresh
    if (!forceRefresh && this.cachedLeaderboard.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedLeaderboard;
    }

    try {
      console.log('Fetching leaderboard from API...');
      const response = await fetch('/api/leaderboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LeaderboardResponse = await response.json();
      console.log('Leaderboard fetched successfully:', result.entries.length, 'entries');
      
      // Update cache
      this.cachedLeaderboard = result.entries;
      this.lastFetch = now;
      
      return result.entries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      
      // If we have cached data, return it even if it's stale
      if (this.cachedLeaderboard.length > 0) {
        console.log('Returning cached leaderboard data due to API error');
        return this.cachedLeaderboard;
      }
      
      // If no cached data and API fails, return empty array
      console.log('No cached data available, returning empty leaderboard');
      return [];
    }
  }

  public async getRedditUserData(): Promise<RedditUserResponse | null> {
    // Return cached user data if available
    if (this.cachedUserData) {
      return this.cachedUserData;
    }

    try {
      const response = await fetch('/api/reddit-user');
      
      if (!response.ok) {
        // User might not be authenticated
        console.log('Reddit user not authenticated');
        return null;
      }

      const result: RedditUserResponse = await response.json();
      
      if (result.authenticated && result.username) {
        this.cachedUserData = result;
        this.cachedUsername = result.username;
        console.log(`Reddit user authenticated: ${result.username}, best score: ${result.bestScore || 0}, rank: ${result.currentRank || 'N/A'}`);
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting Reddit user data:', error);
      return null;
    }
  }

  public async getRedditUsername(): Promise<string | null> {
    const userData = await this.getRedditUserData();
    return userData?.username || null;
  }

  public async getUserRank(username: string): Promise<number> {
    const leaderboard = await this.getLeaderboard();
    const index = leaderboard.findIndex(entry => entry.username === username);
    return index >= 0 ? index + 1 : -1;
  }

  public async getUserBestScore(username: string): Promise<LeaderboardEntry | null> {
    const leaderboard = await this.getLeaderboard();
    return leaderboard.find(entry => entry.username === username) || null;
  }

  public clearCache(): void {
    this.cachedUsername = null;
    this.cachedUserData = null;
    this.cachedLeaderboard = [];
    this.lastFetch = 0;
  }

  public addScoreToCache(entry: LeaderboardEntry): void {
    // Add the new score to cache and sort by score descending
    this.cachedLeaderboard.push(entry);
    this.cachedLeaderboard.sort((a, b) => b.score - a.score);
    this.lastFetch = Date.now();
    console.log('Added score to cache:', entry);
  }

  // Legacy methods for backward compatibility (now async)
  public async addScore(username: string, score: number, level: number, lines: number): Promise<boolean> {
    const result = await this.submitScore(score, level, lines);
    return result.success && (result.rank || 0) <= 10;
  }

  public setRedditUsername(username: string): void {
    this.cachedUsername = username.trim();
  }
}