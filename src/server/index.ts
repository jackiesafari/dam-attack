import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, LeaderboardResponse, SubmitScoreResponse, LeaderboardEntry } from '../shared/types/api';
import { redis, reddit, createServer, context } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// Get Reddit username and current best score from Devvit context
router.get('/api/reddit-user', async (_req, res): Promise<void> => {
  try {
    const { userId } = context;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated'
      });
      return;
    }

    // Get user info from Reddit API
    const user = await reddit.getUserById(userId);

    // Check if user has a score on the leaderboard
    const leaderboardKey = 'dam-attack:leaderboard';
    const userKey = `reddit_${userId}`;
    let bestScore = 0;
    let currentRank = null;

    try {
      const allScores = await redis.zRange(leaderboardKey, 0, -1);

      // Sort by score in descending order (same as leaderboard display)
      const sortedScores = allScores.sort((a, b) => b.score - a.score);

      // Find user's best score and rank
      for (let i = 0; i < sortedScores.length; i++) {
        const entry = sortedScores[i];
        if (!entry) continue;

        try {
          const userData = JSON.parse(entry.member);
          if (userData.userKey === userKey) {
            bestScore = Math.max(bestScore, entry.score);
            currentRank = i + 1; // 1-based ranking
          }
        } catch (parseError) {
          continue;
        }
      }
    } catch (redisError) {
      console.warn('Error checking user score:', redisError);
    }

    res.json({
      username: `u/${user?.username || 'Unknown'}`,
      authenticated: true,
      bestScore: Math.floor(bestScore),
      currentRank
    });
  } catch (error) {
    console.error('Error getting Reddit user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user info'
    });
  }
});

// Leaderboard API endpoints using Redis sorted sets
router.get('/api/leaderboard', async (_req, res): Promise<void> => {
  try {
    const leaderboardKey = 'dam-attack:leaderboard';

    // Get all scores from Redis sorted set
    const entries = await redis.zRange(leaderboardKey, 0, -1);

    // Sort by score in descending order (highest first) and take top 10
    const sortedEntries = entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const leaderboard: LeaderboardEntry[] = [];

    // Parse each entry
    for (const entry of sortedEntries) {
      try {
        // Parse the JSON string stored in Redis
        const userData = JSON.parse(entry.member);
        leaderboard.push({
          username: userData.username || 'Unknown Player',
          score: Math.floor(entry.score),
          level: userData.level || 1,
          lines: userData.lines || 0,
          timestamp: userData.timestamp || Date.now()
        });
      } catch (parseError) {
        console.error('Failed to parse entry:', entry.member, parseError);
        // Skip invalid entries
        continue;
      }
    }

    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leaderboard'
    });
  }
});

router.post('/api/submit-score', async (req, res): Promise<void> => {
  try {
    console.log('Score submission request received:', req.body);
    console.log('Devvit context:', { userId: context.userId, postId: context.postId });
    
    const { score, level, lines } = req.body;
    const { userId } = context;

    if (typeof score !== 'number' || typeof level !== 'number' || typeof lines !== 'number') {
      res.status(400).json({
        type: 'submitScore',
        success: false,
        message: 'Invalid score data provided'
      });
      return;
    }

    let username = 'Anonymous Player';
    let isRedditUser = false;

    // Try to get Reddit username with better error handling
    if (userId) {
      try {
        const user = await reddit.getUserById(userId);
        username = `u/${user?.username || 'Unknown'}`; // Add u/ prefix for Reddit usernames
        isRedditUser = true;
        console.log(`Reddit user ${username} submitting score: ${score}`);
      } catch (authError) {
        console.warn('Reddit authentication failed:', authError);
        console.warn('userId available but getUserById failed:', userId);
        // Still try to use a consistent fallback based on userId
        username = `Player_${userId.slice(-8)}`;
      }
    } else {
      console.warn('No userId in context, using anonymous submission');
      console.warn('Context:', { userId: context.userId, postId: context.postId });
    }

    const leaderboardKey = 'dam-attack:leaderboard';

    // Create unique member identifier for this user
    // Use userId for Reddit users, or fallback to username for anonymous
    const userKey = isRedditUser ? `reddit_${userId}` : `anon_${username}`;

    // Check if user already has a score by getting all scores and searching
    const existingScores = await redis.zRange(leaderboardKey, 0, -1);
    let existingScore = 0;
    let existingEntry = null;

    // Find existing score for this user
    for (const entry of existingScores) {
      try {
        const userData = JSON.parse(entry.member);
        if (userData.userKey === userKey) {
          existingScore = entry.score;
          existingEntry = entry.member;
          break;
        }
      } catch (parseError) {
        // Skip invalid entries
        continue;
      }
    }

    // Only update if this is a better score
    if (score > existingScore) {
      // Remove old entry if it exists
      if (existingEntry) {
        await redis.zRem(leaderboardKey, [existingEntry]);
      }

      // Create new member data with user key for uniqueness
      const memberData = JSON.stringify({
        username,
        level,
        lines,
        timestamp: Date.now(),
        userKey,
        isRedditUser
      });

      // Add new score to sorted set
      await redis.zAdd(leaderboardKey, { member: memberData, score });

      console.log(`Score updated for ${username}: ${existingScore} -> ${score}`);
    } else {
      console.log(`Score not updated for ${username}: ${score} <= ${existingScore}`);
    }

    // Get user's current rank (1-based) - sort by score first like the leaderboard
    const currentScores = await redis.zRange(leaderboardKey, 0, -1);
    let userRank = null;

    // Sort by score in descending order (same as leaderboard display)
    const sortedScores = currentScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < sortedScores.length; i++) {
      const entry = sortedScores[i];
      if (!entry) continue;
      try {
        const userData = JSON.parse(entry.member);
        if (userData.userKey === userKey) {
          userRank = i + 1; // 1-based ranking
          break;
        }
      } catch (parseError) {
        continue;
      }
    }

    // Get total number of players
    const totalPlayers = await redis.zCard(leaderboardKey);

    let message = 'Score submitted successfully!';
    if (userRank !== null) {
      if (userRank <= 10) {
        message = `Congratulations ${username}! You ranked #${userRank} out of ${totalPlayers} players!`;
      } else {
        message = `${username}, you ranked #${userRank} out of ${totalPlayers} players!`;
      }
    }

    const response: SubmitScoreResponse = {
      type: 'submitScore',
      success: true,
      rank: userRank || 0,
      message
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      type: 'submitScore',
      success: false,
      message: 'Failed to submit score. Please try again.'
    });
  }
});

router.post('/api/submit-anonymous', async (req, res): Promise<void> => {
  try {
    console.log('Anonymous score submission request received:', req.body);
    const { score, level, lines } = req.body;

    if (typeof score !== 'number' || typeof level !== 'number' || typeof lines !== 'number') {
      res.status(400).json({
        type: 'submitScore',
        success: false,
        message: 'Invalid score data provided'
      });
      return;
    }

    const leaderboardKey = 'dam-attack:leaderboard';

    // Create unique anonymous ID that persists across sessions
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userKey = anonymousId;

    // Create anonymous member data
    const memberData = JSON.stringify({
      username: 'Anonymous',
      level,
      lines,
      timestamp: Date.now(),
      isAnonymous: true,
      userKey,
      isRedditUser: false
    });

    // Add score to sorted set (each anonymous submission is unique)
    await redis.zAdd(leaderboardKey, { member: memberData, score });

    // Get rank for this anonymous submission by manually calculating (sorted by score)
    const allScores = await redis.zRange(leaderboardKey, 0, -1);
    let userRank = null;

    // Sort by score in descending order (same as leaderboard display)
    const sortedScores = allScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < sortedScores.length; i++) {
      const entry = sortedScores[i];
      if (!entry) continue;
      if (entry.member === memberData) {
        userRank = i + 1; // 1-based ranking
        break;
      }
    }

    // Get total number of players
    const totalPlayers = await redis.zCard(leaderboardKey);

    let message = 'Score submitted anonymously!';
    if (userRank !== null) {
      if (userRank <= 10) {
        message = `Anonymous score ranked #${userRank} out of ${totalPlayers} players!`;
      } else {
        message = `Anonymous score ranked #${userRank} out of ${totalPlayers} players!`;
      }
    }

    const response: SubmitScoreResponse = {
      type: 'submitScore',
      success: true,
      rank: userRank || 0,
      message
    };

    res.json(response);
  } catch (error) {
    console.error('Error submitting anonymous score:', error);
    res.status(500).json({
      type: 'submitScore',
      success: false,
      message: 'Failed to submit score. Please try again.'
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
