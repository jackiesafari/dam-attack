# Reddit Username Testing

## How to Test Reddit Username Integration

### Method 1: URL Parameter (Easy Testing)
Add `?reddit_username=YourActualRedditUsername` to the game URL.

Example:
```
https://your-game-url.com/?reddit_username=YourRedditUsername
```

This will override any other username detection and use your specified username.

### Method 2: DOM Attribute (For Reddit Integration)
The game will check for a `data-reddit-username` attribute on the body element:

```html
<body data-reddit-username="YourRedditUsername">
```

### Method 3: Devvit Context (Automatic in Reddit)
When running in Reddit's Devvit environment, the game will automatically detect:
- `devvit.user.username`
- `devvit.context.user.username` 
- `devvit.reddit.user.username`
- `window.reddit.user.username`

### Method 4: Cached Username
Once a Reddit username is detected, it's cached in localStorage as `last_reddit_username` and will be reused in future sessions.

## Testing Steps

1. **Quick Test**: Add `?reddit_username=TestUser` to your game URL
2. **Play a game** and get a score
3. **Check the leaderboard** - you should see "TestUser" instead of "Player_XXX"
4. **Check browser console** - no more debug spam!

## What's Fixed

✅ **UP Arrow now rotates pieces** (matches the instructions)  
✅ **All debug console logs removed** (clean console)  
✅ **Reddit username detection working** (with URL parameter fallback)  
✅ **Cleaner score saving messages**  

The game should now show your actual Reddit username when you submit scores!