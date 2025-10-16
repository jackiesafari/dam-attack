# 🏆 Dam Attack Leaderboard System

## Overview
Dam Attack now features a competitive leaderboard system that allows Reddit users to compete with each other based on their dam-building skills!

## Features

### 🦫 **Enhanced Beaver Companion**
- **More frequent encouragement**: Beaver now cheers you on every 5 pieces placed
- **Timed support**: If no activity for 15 seconds, beaver offers encouragement
- **Smart messaging**: No spam - messages are spaced appropriately
- **Celebration animations**: Different reactions for line clears vs. Tetris achievements

### 🎯 **Leaderboard System**
- **Top 10 Rankings**: Shows the best dam builders
- **Multiple Metrics**: Ranked by Score, Level, and Lines cleared
- **Reddit Integration**: Enter your Reddit username to compete
- **Persistent Storage**: Scores saved locally in browser
- **Real-time Updates**: Leaderboard updates immediately after each game

### 🎮 **Game Flow**
1. **Play the game** - Build your beaver's dam with Tetris-style gameplay
2. **Game Over** - When the board fills up, you'll see the "Dam Complete" screen
3. **Username Entry** - Enter your Reddit username (optional)
4. **Leaderboard Submission** - Your score gets added if it's good enough
5. **Celebration** - Beaver celebrates your achievement with special messages

### 🏅 **Scoring System**
- **Points**: Lines cleared × 100 × current level
- **Ranking**: Sorted by total score, then level, then lines cleared
- **Special Recognition**: 
  - 🥇 Gold for 1st place
  - 🥈 Silver for 2nd place  
  - 🥉 Bronze for 3rd place
  - 👑 Crown icon for the champion

### 🎨 **Visual Features**
- **Retro 80s Aesthetic**: Neon colors and grid backgrounds
- **Animated Beaver**: Beautiful beaver character with dynamic animations
- **Celebration Effects**: Sparkles, bouncing, and special effects
- **Responsive Design**: Works on desktop and mobile devices

## How to Access

### From Main Menu
- Click the **"LEADERBOARD"** button
- Press **L** key for quick access

### From Game Over Screen
- Click **"View Leaderboard"** after completing a game
- See your rank and compare with other players

## Reddit Integration

### Username Format
- Enter your Reddit username with or without the "u/" prefix
- Examples: `username` or `u/username`
- Minimum 3 characters required

### Privacy
- Usernames are stored locally in your browser
- No external Reddit API calls are made
- Your Reddit account is not accessed or modified

### Competition
- Compete with other Reddit users who play the game
- See how your dam-building skills stack up
- Challenge friends to beat your score!

## Technical Details

### Data Storage
- Leaderboard data is stored in browser localStorage
- No server-side database required
- Data persists between browser sessions

### Score Validation
- Scores are validated client-side
- Duplicate entries are handled intelligently
- Only top 10 scores are maintained

### Browser Compatibility
- Works in all modern browsers
- Requires localStorage support
- Mobile-friendly responsive design

## Tips for High Scores

1. **Focus on Tetrises**: Clearing 4 lines at once gives bonus points
2. **Level Up**: Higher levels multiply your score
3. **Speed Building**: Faster placement allows more pieces
4. **Listen to the Beaver**: The encouragement helps maintain focus!

## Future Enhancements

Potential future features could include:
- Online leaderboard with real Reddit API integration
- Daily/weekly challenges
- Achievement system
- Social sharing of scores
- Tournament modes

---

**Happy Dam Building!** 🦫🏗️

*May your logs be straight and your dams be strong!*