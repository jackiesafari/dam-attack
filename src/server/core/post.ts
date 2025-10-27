import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'dam-attack',
      backgroundUri: 'splash-background.png',
      appIconUri: 'app-icon.png',
      heading: 'Welcome to DAM ATTACK!',
      description: 'Help the beaver build its dam! Challenge yourself to get on the leaderboard.',
      buttonLabel: 'Start Building!'
    },
    subredditName: subredditName,
    title: 'dam-attack',
    postData: {
      gameState: 'initial',
      score: 0,
      level: 1
    }
  });
};
