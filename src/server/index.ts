import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, LeaderboardResponse, SubmitScoreRequest, SubmitScoreResponse, LeaderboardEntry } from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
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

// Leaderboard API endpoints
router.get('/api/leaderboard', async (_req, res): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const leaderboardKey = `leaderboard:${today}`;
    
    // Get today's leaderboard from Redis
    const leaderboardData = await redis.get(leaderboardKey);
    let entries: LeaderboardEntry[] = [];
    
    if (leaderboardData) {
      entries = JSON.parse(leaderboardData);
    }
    
    // Sort by score (highest first) and limit to top 10
    entries.sort((a, b) => b.score - a.score);
    entries = entries.slice(0, 10);
    
    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries: entries
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
    const { username, score, level, lines } = req.body as SubmitScoreRequest;
    
    if (!username || typeof score !== 'number' || typeof level !== 'number' || typeof lines !== 'number') {
      res.status(400).json({
        type: 'submitScore',
        success: false,
        message: 'Invalid score data provided'
      });
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const leaderboardKey = `leaderboard:${today}`;
    
    // Get current leaderboard
    const leaderboardData = await redis.get(leaderboardKey);
    let entries: LeaderboardEntry[] = leaderboardData ? JSON.parse(leaderboardData) : [];
    
    // Add new score
    const newEntry: LeaderboardEntry = {
      username: username.trim(),
      score,
      level,
      lines,
      timestamp: Date.now()
    };
    
    entries.push(newEntry);
    
    // Sort by score and keep top 10
    entries.sort((a, b) => b.score - a.score);
    entries = entries.slice(0, 10);
    
    // Save back to Redis
    await redis.set(leaderboardKey, JSON.stringify(entries));
    
    // Find player's rank
    const rank = entries.findIndex(entry => 
      entry.username === newEntry.username && 
      entry.score === newEntry.score && 
      entry.timestamp === newEntry.timestamp
    ) + 1;
    
    const response: SubmitScoreResponse = {
      type: 'submitScore',
      success: true,
      rank: rank,
      message: rank <= 10 ? `Congratulations! You ranked #${rank}!` : 'Score saved!'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({
      type: 'submitScore',
      success: false,
      message: 'Failed to submit score'
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
