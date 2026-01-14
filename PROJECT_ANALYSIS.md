# Dam Attack - Comprehensive Project Analysis

## 📋 Executive Summary

**Dam Attack** is a retro 80s beaver-themed Tetris game built as a Reddit Devvit application. It combines classic Tetris mechanics with modern web technologies, featuring a complete client-server architecture, Reddit integration, leaderboard system, and comprehensive testing framework.

---

## 🏗️ Project Architecture

### **Technology Stack**
- **Frontend Framework**: Phaser 3.88.2 (2D game engine)
- **Backend Framework**: Express 5.1.0
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.2.4
- **Platform**: Reddit Devvit 0.12.0
- **Data Storage**: Redis (via Devvit)
- **Testing**: Vitest 3.1.1
- **Runtime**: Node.js 22

### **Architecture Pattern**
- **Monorepo Structure**: Separate client/server/shared packages
- **TypeScript Project References**: Modular compilation
- **Manager Pattern**: Game logic split into focused managers
- **Scene-based Architecture**: Phaser scenes for different game states
- **API-First Design**: RESTful endpoints for client-server communication

---

## 📁 Project Structure

```
dam-attack/
├── src/
│   ├── client/                    # Frontend Phaser game
│   │   ├── main.ts                # Entry point (initializes Phaser)
│   │   ├── index.html             # HTML template
│   │   ├── style.css              # Global styles
│   │   ├── game/                  # Core game implementation
│   │   │   ├── main.ts            # Phaser game config & scene setup
│   │   │   ├── scenes/            # Game scenes (9 scenes)
│   │   │   │   ├── Boot.ts        # Initial asset loading
│   │   │   │   ├── Preloader.ts   # Asset preloading with progress bar
│   │   │   │   ├── MainMenu.ts    # Main menu with beaver mascot
│   │   │   │   ├── Game.ts        # Classic Tetris gameplay
│   │   │   │   ├── EnhancedGame.ts # Campaign mode with seasons
│   │   │   │   ├── LevelSelect.ts # Level selection screen
│   │   │   │   ├── GameOver.ts    # Game over screen
│   │   │   │   ├── Leaderboard.ts # Leaderboard display
│   │   │   │   └── UsernameInput.ts # Reddit username input
│   │   │   ├── managers/          # Game logic managers (15 managers)
│   │   │   │   ├── GameStateManager.ts    # Centralized state management
│   │   │   │   ├── PieceManager.ts        # Piece creation & rotation
│   │   │   │   ├── BoardManager.ts        # Board manipulation & line clearing
│   │   │   │   ├── ScoreManager.ts        # Score calculation
│   │   │   │   ├── LeaderboardManager.ts  # Leaderboard operations
│   │   │   │   ├── InputManager.ts        # Input handling
│   │   │   │   ├── UIManager.ts           # UI state management
│   │   │   │   ├── SeasonalManager.ts     # Seasonal progression
│   │   │   │   ├── WaterLevelManager.ts   # Water physics
│   │   │   │   ├── LevelProgressionManager.ts # Campaign progression
│   │   │   │   ├── DifficultyManager.ts   # Difficulty scaling
│   │   │   │   ├── AchievementManager.ts  # Achievement tracking
│   │   │   │   ├── SettingsManager.ts     # Settings persistence
│   │   │   │   ├── MobileFirstLayoutSystem.ts # Responsive layouts
│   │   │   │   └── MobileLayoutManager.ts # Mobile-specific layouts
│   │   │   ├── ui/                # UI components (11 components)
│   │   │   │   ├── MobileControlsUI.ts    # Touch controls
│   │   │   │   ├── LeaderboardUI.ts      # Leaderboard display
│   │   │   │   ├── GameOverUI.ts         # Game over screen UI
│   │   │   │   ├── BeaverMascotUI.ts     # Beaver character UI
│   │   │   │   ├── SettingsUI.ts          # Settings panel
│   │   │   │   └── ... (6 more UI components)
│   │   │   ├── input/             # Input handling
│   │   │   │   ├── TouchEventHandler.ts  # Touch event handling
│   │   │   │   └── InteractiveElement.ts # Interactive UI elements
│   │   │   ├── rendering/         # Rendering systems
│   │   │   │   ├── BoardRenderer.ts      # Board rendering
│   │   │   │   ├── PieceRenderer.ts     # Piece rendering
│   │   │   │   └── EnvironmentalRenderer.ts # Environmental effects
│   │   │   ├── performance/       # Performance optimization
│   │   │   │   ├── ObjectPool.ts         # Object pooling
│   │   │   │   ├── FrameRateOptimizer.ts # FPS optimization
│   │   │   │   ├── PerformanceMonitor.ts # Performance monitoring
│   │   │   │   └── RenderOptimizer.ts    # Render optimization
│   │   │   ├── themes/            # Visual theming
│   │   │   │   ├── ThemeManager.ts       # Theme management
│   │   │   │   └── ... (theme files)
│   │   │   ├── types/             # TypeScript types
│   │   │   │   └── GameTypes.ts          # Game type definitions
│   │   │   ├── utils/             # Utility functions
│   │   │   │   └── ... (utility files)
│   │   │   └── effects/           # Visual effects
│   │   │       └── EffectsManager.ts     # Effects management
│   │   └── public/                # Static assets
│   │       └── assets/            # Game assets (10 PNG files)
│   │           ├── beaverlogo.png
│   │           ├── beaverstory.png
│   │           ├── bg.png
│   │           ├── Button.png
│   │           ├── fall-leaves.png
│   │           ├── level-complete-beaver.png
│   │           ├── logo.png
│   │           ├── salmon.png
│   │           ├── splash-background.png
│   │           └── Timer.png
│   ├── server/                    # Backend Express server
│   │   ├── index.ts               # Express server with API routes
│   │   └── core/
│   │       └── post.ts            # Reddit post creation logic
│   └── shared/                    # Shared code
│       └── types/
│           └── api.ts             # API request/response types
├── dist/                          # Build output (generated)
│   ├── client/                    # Built client assets
│   │   ├── index.html
│   │   ├── assets/               # Copied assets
│   │   └── index-*.js            # Bundled JavaScript
│   └── server/                    # Built server bundle
│       └── index.cjs             # CommonJS server bundle
├── devvit.json                    # Devvit platform configuration
├── package.json                   # Dependencies and scripts
├── vitest.config.ts               # Test configuration
└── [Documentation files]          # Various .md files
```

---

## 🎮 Game Scenes & Flow

### **Scene Flow**
1. **Boot** → Loads minimal background asset
2. **Preloader** → Loads all game assets with progress bar
3. **MainMenu** → Main menu with beaver mascot, campaign/classic mode selection
4. **LevelSelect** → Campaign level selection (if campaign mode)
5. **Game/EnhancedGame** → Core gameplay
6. **GameOver** → Game over screen with score submission
7. **UsernameInput** → Reddit username entry (optional)
8. **Leaderboard** → Global leaderboard display

### **Game Modes**
- **Classic Mode**: Traditional Tetris gameplay
- **Campaign Mode**: 20 levels across 4 seasonal worlds (Spring, Summer, Autumn, Winter)
- **Endless Mode**: Unlocked after completing campaign

---

## 🖼️ Asset Management

### **Asset Loading Pipeline**

1. **Boot Scene** (`Boot.ts`):
   - Loads minimal background: `assets/bg.png`
   - No progress bar (fast initial load)

2. **Preloader Scene** (`Preloader.ts`):
   - Sets asset path: `assets/`
   - Loads beaver logo: `/beaverlogo.png`
   - Shows progress bar during loading
   - Transitions to MainMenu when complete

3. **Scene-Specific Assets**:
   - Each scene can load additional assets in its `preload()` method
   - Example: `EnhancedGame.ts` loads beaver images in its preload

### **Asset Storage**
- **Source Location**: `src/client/public/assets/`
- **Build Output**: `dist/client/assets/` (copied during build)
- **Devvit Config**: `devvit.json` specifies `media.dir: "dist/client/assets"`

### **Asset Files** (10 PNG files)
- `beaverlogo.png` - Beaver logo
- `beaverstory.png` - Story beaver image
- `bg.png` - Background image
- `Button.png` - Button texture
- `fall-leaves.png` - Seasonal leaves
- `level-complete-beaver.png` - Level complete beaver
- `logo.png` - Game logo
- `salmon.png` - Salmon asset
- `splash-background.png` - Splash screen background
- `Timer.png` - Timer UI element

### **Asset References**
- In code: `/assets/filename.png` or `assets/filename.png`
- Phaser loader: `this.load.image('key', '/assets/filename.png')`
- Devvit splash: `backgroundUri: 'splash-background.png'` (relative to media dir)

---

## 🔨 Build Pipeline

### **Build Process**

1. **Client Build** (`npm run build:client`):
   - Location: `src/client/`
   - Tool: Vite
   - Output: `dist/client/`
   - Entry: `index.html` → `main.ts`
   - Assets: Copied from `public/assets/` to `dist/client/assets/`

2. **Server Build** (`npm run build:server`):
   - Location: `src/server/`
   - Tool: Vite
   - Output: `dist/server/index.cjs` (CommonJS)
   - Format: CommonJS for Devvit compatibility

3. **Shared Types**:
   - Compiled as part of client/server builds
   - No separate build step

### **Build Scripts**

```json
{
  "postinstall": "npm run build:client && npm run build:server",
  "build:client": "cd src/client && vite build",
  "build:server": "cd src/server && vite build",
  "build": "npm run build:client && npm run build:server",
  "dev:client": "cd src/client && vite build --watch",
  "dev:server": "cd src/server && vite build --watch",
  "dev": "concurrently -k -p \"[{name}]\" -n \"CLIENT,SERVER,DEVVIT\" ..."
}
```

### **Development Workflow**
- **Watch Mode**: Both client and server rebuild on file changes
- **Concurrent Execution**: Client, server, and Devvit playtest run simultaneously
- **Hot Reloading**: Changes reflect immediately in development

### **Production Build**
- **Type Checking**: `tsc --build` (TypeScript project references)
- **Linting**: ESLint with auto-fix
- **Formatting**: Prettier
- **Minification**: Terser (via Vite)
- **Output**: Optimized bundles in `dist/`

---

## 🔌 Reddit/Devvit Integration

### **Devvit Configuration** (`devvit.json`)

```json
{
  "media": {
    "dir": "dist/client/assets"  // Asset directory
  },
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "entry": "index.html"    // Game entry point
      }
    }
  },
  "server": {
    "dir": "dist/server",
    "entry": "index.cjs"          // Server entry point
  },
  "menu": {
    "items": [
      {
        "label": "Create a new post",
        "endpoint": "/internal/menu/post-create"
      }
    ]
  },
  "triggers": {
    "onAppInstall": "/internal/on-app-install"
  }
}
```

### **Server API Endpoints**

#### **Public APIs**
- `GET /api/init` - Initialize game session (returns postId, count)
- `GET /api/reddit-user` - Get Reddit username and best score
- `GET /api/leaderboard` - Fetch top 10 leaderboard entries
- `POST /api/submit-score` - Submit authenticated score (requires userId)
- `POST /api/submit-anonymous` - Submit anonymous score

#### **Internal APIs**
- `POST /internal/on-app-install` - Auto-create post when app installed
- `POST /internal/menu/post-create` - Create new game post (moderator menu)

### **Reddit Integration Features**

1. **User Authentication**:
   - Uses `context.userId` from Devvit
   - Fetches username via `reddit.getUserById(userId)`
   - Format: `u/username`

2. **Post Creation** (`src/server/core/post.ts`):
   - Creates custom Reddit post with splash screen
   - Splash config: background, icon, heading, description, button
   - Stores initial game state in `postData`

3. **Leaderboard Storage**:
   - Uses Redis sorted sets (`dam-attack:leaderboard`)
   - Key: `reddit_${userId}` for authenticated users
   - Stores: username, score, level, lines, timestamp
   - Sorted by score (descending)

4. **Context Access**:
   - `context.postId` - Current post ID
   - `context.userId` - Current user ID
   - `context.subredditName` - Subreddit name

---

## 🎯 Key Game Systems

### **1. Game State Management**
- **GameStateManager**: Centralized state with validation
- **State Properties**: board, currentPiece, nextPiece, score, level, lines, isGameOver, isPaused, dropTime, gameMode
- **Listeners**: UI updates automatically on state changes
- **Validation**: State updates validated before application

### **2. Piece Management**
- **PieceManager**: Creates, rotates, and validates pieces
- **7 Piece Types**: I, O, T, S, Z, L, J (standard Tetris)
- **Rotation System**: Predefined rotation states with wall kicks
- **Collision Detection**: Robust boundary and board collision checking

### **3. Board Management**
- **BoardManager**: Board manipulation and line clearing
- **Line Clearing**: Detects full lines, removes them, drops pieces
- **Score Calculation**: Based on lines cleared (single, double, triple, Tetris)
- **Board Dimensions**: 14×20 (configurable)

### **4. Scoring System**
- **ScoreManager**: Calculates scores with level multipliers
- **Line Clear Points**: 100 × level multiplier
- **Special Bonuses**: Tetris (4 lines) gets bonus multiplier
- **Level Progression**: Every 10 lines cleared

### **5. Seasonal System** (Campaign Mode)
- **SeasonalManager**: Manages 4 seasonal worlds
- **20 Levels**: 5 levels per season
- **Environmental Effects**: Weather, wildlife, hazards
- **Water Physics**: Rising water with dynamic particles

### **6. Mobile Support**
- **MobileFirstLayoutSystem**: Responsive layout management
- **MobileControlsUI**: Touch-friendly button interface
- **TouchEventHandler**: Handles touch events
- **Responsive Scaling**: Adapts to different screen sizes

### **7. Performance Optimization**
- **ObjectPool**: Reuses game objects
- **FrameRateOptimizer**: Maintains 60fps
- **PerformanceMonitor**: Tracks performance metrics
- **RenderOptimizer**: Optimizes rendering calls

---

## 🧪 Testing

### **Test Framework**
- **Vitest 3.1.1**: Unit testing framework
- **Environment**: jsdom (browser simulation)
- **Test Location**: `__tests__/` folders next to source files

### **Test Coverage**
- **44+ Unit Tests**: Comprehensive game logic testing
- **Test Files**:
  - Manager tests (GameState, Piece, Board, Score, etc.)
  - UI component tests
  - Integration tests
  - Performance tests
  - Mobile controls tests

### **Test Configuration** (`vitest.config.ts`)
- Globals enabled
- jsdom environment
- Includes: `src/**/*.test.ts`, `src/**/*.spec.ts`
- Setup file: `src/test-setup.ts`

---

## 🚀 Deployment

### **Deployment Process**

1. **Build**: `npm run build` (client + server)
2. **Deploy**: `npm run deploy` (builds + `devvit upload`)
3. **Launch**: `npm run launch` (builds + deploys + publishes for review)

### **Devvit Commands**
- `devvit login` - Authenticate with Reddit
- `devvit upload` - Upload app to Devvit
- `devvit publish` - Publish app for review
- `devvit playtest` - Test app locally with Reddit integration

### **Environment Setup**
- Requires `.env` file for Devvit credentials
- Uses `dotenv-cli` for environment variable loading
- Node.js 22 required

### **CI/CD**
- **No CI/CD Pipeline Found**: Manual deployment process
- **Post-install Build**: `postinstall` script builds on `npm install`

---

## 📊 Data Flow

### **Client → Server**
1. Game initialization: `GET /api/init`
2. User authentication: `GET /api/reddit-user`
3. Score submission: `POST /api/submit-score`
4. Leaderboard fetch: `GET /api/leaderboard`

### **Server → Redis**
- Leaderboard: `dam-attack:leaderboard` (sorted set)
- User scores: Stored with userKey for uniqueness
- Score updates: Only if new score is better

### **Reddit → Server**
- User context: `context.userId`, `context.postId`, `context.subredditName`
- User info: `reddit.getUserById(userId)`
- Post creation: `reddit.submitCustomPost()`

---

## 🔍 Key Files to Understand

### **Entry Points**
- `src/client/main.ts` - Client entry (DOM ready → StartGame)
- `src/client/game/main.ts` - Phaser game initialization
- `src/server/index.ts` - Express server setup

### **Core Game Logic**
- `src/client/game/scenes/Game.ts` - Classic Tetris gameplay
- `src/client/game/scenes/EnhancedGame.ts` - Campaign mode
- `src/client/game/managers/GameStateManager.ts` - State management
- `src/client/game/managers/PieceManager.ts` - Piece logic
- `src/client/game/managers/BoardManager.ts` - Board logic

### **Reddit Integration**
- `src/server/index.ts` - API endpoints
- `src/server/core/post.ts` - Post creation
- `devvit.json` - Platform configuration

### **Configuration**
- `package.json` - Dependencies and scripts
- `devvit.json` - Devvit platform config
- `vitest.config.ts` - Test configuration

---

## 🎨 Visual Design

### **Theme**
- **Retro 80s Aesthetic**: Neon colors (cyan, magenta, yellow)
- **Grid Backgrounds**: Synthwave-style grid patterns
- **Wood Textures**: Realistic wood grain on pieces
- **Beaver Mascot**: Animated character with encouraging messages
- **Neon Glow Effects**: Glowing text and UI elements

### **Responsive Design**
- **Mobile-First**: Touch controls, responsive layouts
- **Scaling**: Phaser Scale.FIT mode
- **Breakpoints**: Handled by MobileFirstLayoutSystem

---

## 📝 Documentation Files

- `README.md` - Project overview and setup
- `PROJECT_UNDERSTANDING.md` - Detailed project documentation
- `INTEGRATION_SUMMARY.md` - Manager integration details
- `LEADERBOARD.md` - Leaderboard system documentation
- `SEASONAL_ENVIRONMENTAL_SYSTEM.md` - Campaign mode features
- `MOBILE_CONTROLS_TEST_SUMMARY.md` - Mobile testing
- `WOOD_PIECES_ENHANCEMENT.md` - Piece rendering details

---

## 🔧 Development Commands

```bash
# Development (runs client, server, devvit concurrently)
npm run dev

# Build for production
npm run build

# Deploy to Reddit
npm run deploy

# Publish for review
npm run launch

# Code quality checks
npm run check  # type-check + lint + prettier

# Testing
npm test  # runs vitest

# Authentication
npm run login  # Reddit CLI login
```

---

## 🎯 Summary

**Dam Attack** is a well-architected, production-ready game with:
- ✅ Complete client-server architecture
- ✅ Reddit Devvit platform integration
- ✅ Comprehensive game systems (managers, rendering, input)
- ✅ Mobile-first responsive design
- ✅ Leaderboard with Redis storage
- ✅ Campaign mode with seasonal progression
- ✅ Extensive testing framework
- ✅ Performance optimization systems
- ✅ Clear separation of concerns
- ✅ TypeScript type safety throughout

The project demonstrates modern web game development practices with a focus on maintainability, testability, and user experience.

