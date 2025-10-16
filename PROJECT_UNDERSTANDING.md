# Dam Attack - Project Understanding Document

## Project Overview

**Dam Attack** is a retro 80s beaver-themed Tetris game built with Devvit (Reddit's developer platform) and developed with AI assistance. The game features a beaver character that helps players build the ultimate dam by stacking wooden pieces (logs, branches, twigs) in classic Tetris gameplay.

## Architecture & Technology Stack

### Core Technologies
- **Devvit**: Reddit's developer platform for building apps
- **Phaser 3.88.2**: 2D game engine for the client-side game
- **TypeScript**: Type-safe development
- **Vite**: Build tool and development server
- **Express**: Backend server framework
- **Redis**: Data persistence and leaderboard storage
- **Node.js**: Runtime environment

### Project Structure
```
dam-attack/
├── src/
│   ├── client/          # Frontend game (Phaser-based)
│   │   ├── game/        # Game logic and scenes
│   │   │   ├── scenes/  # Phaser scenes (MainMenu, Game, GameOver, etc.)
│   │   │   ├── managers/ # Game state management
│   │   │   ├── types/   # TypeScript type definitions
│   │   │   └── utils/   # Utility functions
│   │   ├── main.ts      # Client entry point
│   │   └── index.html   # HTML template
│   ├── server/          # Backend API (Express)
│   │   ├── core/        # Core server functionality
│   │   └── index.ts     # Server entry point
│   └── shared/          # Shared types and utilities
│       └── types/       # API type definitions
├── dist/                # Built/compiled files
├── devvit.json         # Devvit configuration
└── package.json        # Dependencies and scripts
```

## Game Features

### Core Gameplay
- **Classic Tetris Mechanics**: 7 standard piece types (I, O, T, S, Z, L, J)
- **Beaver Theme**: Wooden pieces representing logs, branches, and twigs
- **Progressive Difficulty**: Speed increases every 10 lines cleared
- **Score System**: Points for line clears with level multipliers
- **Mobile Support**: Touch controls for mobile devices

### Visual Design
- **Retro 80s Aesthetic**: Neon colors (cyan, magenta, yellow)
- **Grid Backgrounds**: Synthwave-style grid patterns
- **Wood Textures**: Realistic wood grain effects on pieces
- **Beaver Character**: Animated mascot with encouraging messages
- **Neon Glow Effects**: Glowing text and UI elements

### User Interface
- **Main Menu**: Retro-styled with animated beaver
- **Game Scene**: Classic Tetris gameplay with beaver companion
- **Game Over**: Victory screen with dam visualization
- **Leaderboard**: Global high scores with Reddit integration
- **Mobile Controls**: Touch-friendly button interface

## Technical Implementation

### Game Architecture

#### Scene Management
The game uses Phaser's scene system with the following scenes:
- **Boot**: Initial loading and setup
- **Preloader**: Asset loading
- **MainMenu**: Main menu with beaver mascot
- **Game**: Core Tetris gameplay
- **GameOver**: Victory screen with score submission
- **Leaderboard**: High score display
- **UsernameInput**: Reddit username input (if needed)

#### Game State Management
- **GameStateManager**: Centralized state management with validation
- **PieceManager**: Piece creation, rotation, and collision detection
- **BoardManager**: Board manipulation and line clearing
- **ScoreManager**: Score calculation and level progression
- **LeaderboardManager**: Score submission and retrieval

#### Input System
- **Keyboard Controls**: Arrow keys for movement, space for hard drop
- **Mobile Controls**: Touch buttons for mobile devices
- **Responsive Design**: Adapts to different screen sizes

### Backend API

#### Endpoints
- `GET /api/init`: Initialize game session
- `GET /api/reddit-user`: Get Reddit username
- `GET /api/leaderboard`: Fetch leaderboard data
- `POST /api/submit-score`: Submit authenticated score
- `POST /api/submit-anonymous`: Submit anonymous score
- `POST /internal/on-app-install`: App installation handler
- `POST /internal/menu/post-create`: Create new game post

#### Data Storage
- **Redis**: Used for leaderboard storage with sorted sets
- **Reddit Integration**: User authentication and post creation
- **Score Tracking**: Tracks score, level, lines, and timestamp

### Reddit Integration

#### Devvit Features
- **Post Creation**: Automatically creates game posts in subreddits
- **User Authentication**: Reddit user login and identification
- **Menu Integration**: Subreddit menu items for moderators
- **App Installation**: Automatic setup when app is installed

#### User Experience
- **Seamless Integration**: Game runs within Reddit posts
- **Social Features**: Leaderboard with Reddit usernames
- **Moderator Tools**: Easy post creation for subreddit moderators

## Development Workflow

### Build System
- **Vite**: Fast development server and build tool
- **TypeScript**: Type checking and compilation
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting

### Scripts
- `npm run dev`: Start development server
- `npm run build`: Build client and server
- `npm run deploy`: Deploy to Devvit
- `npm run launch`: Publish app for review
- `npm run check`: Type check, lint, and format

### Testing
- **Vitest**: Unit testing framework
- **Comprehensive Coverage**: 44+ unit tests for game logic
- **Integration Tests**: End-to-end game flow testing
- **Mobile Testing**: Touch control verification

## Key Features & Mechanics

### Game Pieces
- **I-piece (Log)**: Long straight logs
- **O-piece (Bundle)**: Square branch bundles
- **T-piece (Branch)**: T-shaped branches
- **S/Z-pieces (Twigs)**: Curved twigs
- **L/J-pieces (Branches)**: L-shaped branches

### Scoring System
- **Line Clears**: 100 points × level multiplier
- **Level Progression**: Every 10 lines cleared
- **Speed Increase**: Drop interval decreases with level
- **Bonus Scoring**: Higher levels provide more points

### Beaver Companion
- **Encouraging Messages**: Motivational feedback
- **Celebration Animations**: Special reactions for achievements
- **Idle Animation**: Gentle side-to-side movement
- **Tetris Reactions**: Special celebration for 4-line clears

### Mobile Support
- **Touch Controls**: 5-button interface (left, right, rotate, down, drop)
- **Responsive Design**: Adapts to different screen sizes
- **Haptic Feedback**: Vibration on button press
- **Optimized Layout**: Mobile-friendly UI scaling

## Performance & Optimization

### Rendering
- **Efficient Graphics**: Optimized block rendering
- **Object Pooling**: Reused game objects
- **Frame Rate Optimization**: Smooth 60fps gameplay
- **Memory Management**: Proper cleanup and disposal

### Network
- **API Optimization**: Efficient score submission
- **Caching**: Leaderboard data caching
- **Error Handling**: Graceful failure recovery
- **Offline Support**: Local game state persistence

## Deployment & Distribution

### Devvit Platform
- **Reddit Integration**: Runs within Reddit posts
- **Automatic Deployment**: CI/CD with Devvit CLI
- **Subreddit Distribution**: Available to Reddit communities
- **User Management**: Reddit user authentication

### Development Environment
- **Local Development**: Full local testing environment
- **Hot Reloading**: Real-time development updates
- **Debug Tools**: Comprehensive debugging support
- **Cross-Platform**: Works on desktop and mobile

## Future Enhancements

### Planned Features
- **Audio System**: Sound effects and background music
- **Power-ups**: Special beaver abilities
- **Multiplayer**: Competitive multiplayer modes
- **Customization**: Theme and beaver customization
- **Achievements**: Unlockable rewards and badges

### Technical Improvements
- **Performance Optimization**: Further rendering improvements
- **Accessibility**: Enhanced accessibility features
- **Analytics**: Gameplay analytics and insights
- **Localization**: Multi-language support

## Development Notes

### Code Quality
- **TypeScript**: Full type safety throughout
- **Modular Design**: Clean separation of concerns
- **Error Handling**: Comprehensive error management
- **Documentation**: Well-documented codebase

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end game flow
- **Performance Tests**: Frame rate and memory testing
- **Cross-Platform Tests**: Desktop and mobile verification

### Maintenance
- **Regular Updates**: Keep dependencies current
- **Bug Fixes**: Prompt issue resolution
- **Feature Requests**: Community-driven development
- **Performance Monitoring**: Continuous optimization

## Conclusion

Dam Attack represents a successful integration of modern web technologies with classic game mechanics, enhanced by Reddit's social platform. The project demonstrates effective use of AI-assisted development, comprehensive testing, and user-centered design principles. The modular architecture and robust testing framework provide a solid foundation for future enhancements and community engagement.

The game successfully combines nostalgic Tetris gameplay with contemporary web development practices, creating an engaging experience that leverages Reddit's social features while maintaining the timeless appeal of classic puzzle gaming.

