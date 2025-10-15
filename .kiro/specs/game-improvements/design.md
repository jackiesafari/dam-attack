# Design Document

## Overview

This design document outlines the technical approach to fix the critical issues affecting the Dam Attack game's stability and user experience. The design focuses on eliminating UI freezing during view transitions, fixing Reddit username integration, and improving overall interface reliability.

## Architecture

### Critical Issue Resolution Strategy

The design focuses on three main problem areas:

1. **Resize Handler Issues** - Remove problematic event listeners causing UI freezing
2. **Devvit Integration** - Fix username retrieval and API communication
3. **UI Stability** - Implement lightweight, reliable interface components

### Problem Analysis

#### UI Freezing Root Cause
The current resize handler in `Game.ts` (lines 807-840) uses:
- Complex debouncing with setTimeout
- Heavy layout recalculation on every resize
- Expensive DOM operations during transitions
- Memory leaks from uncleared event listeners

#### Reddit Username Integration Issues
The `getRedditUsername()` function has multiple fallback attempts but:
- Devvit API detection is unreliable
- No clear error reporting for debugging
- Caching mechanism may be stale
- URL parameter testing is not working consistently

#### UI Disaster Areas
- Broken beaver logo loading (incorrect path)
- Complex animations causing performance issues
- Overlapping header elements
- Mobile controls with poor touch responsiveness

## Components and Interfaces

### 1. Resize Handler Replacement

**Purpose**: Replace the problematic resize handler with a lightweight solution.

**Current Problem**:
```typescript
// PROBLEMATIC CODE (causes freezing)
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Heavy layout recalculation
    const newLayout = this.calculateLayout(width, height);
    // Expensive DOM operations
    this.layoutConfig = newLayout;
    // Force redraw
    this.render();
  }, 250);
};
this.scale.on('resize', handleResize);
```

**Solution Design**:
```typescript
// LIGHTWEIGHT REPLACEMENT
class SimpleLayoutManager {
  private lastWidth: number = 0;
  private lastHeight: number = 0;
  
  public handleResize(width: number, height: number): void {
    // Only update if significant change (>10px)
    if (Math.abs(width - this.lastWidth) > 10 || 
        Math.abs(height - this.lastHeight) > 10) {
      this.updateBasicLayout(width, height);
      this.lastWidth = width;
      this.lastHeight = height;
    }
  }
  
  private updateBasicLayout(width: number, height: number): void {
    // Minimal, essential layout updates only
    // No complex calculations or DOM manipulation
  }
}
```

### 2. Reddit Username Integration Fix

**Purpose**: Reliable username detection with proper error handling and debugging.

**Current Problem**:
```typescript
// UNRELIABLE DETECTION
private async getRedditUsername(devvit: any, fallback: string): Promise<string> {
  // Multiple fallback attempts but poor error reporting
  // No clear indication of what's failing
  // Caching issues
}
```

**Solution Design**:
```typescript
class DevvitUserManager {
  private cachedUsername: string | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  public async getUsername(fallback: string = 'Player'): Promise<string> {
    console.log('🔍 Starting username detection...');
    
    // 1. Check cache first
    if (this.isCacheValid()) {
      console.log('✅ Using cached username:', this.cachedUsername);
      return this.cachedUsername!;
    }
    
    // 2. Try URL parameter (for testing)
    const urlUsername = this.getUrlUsername();
    if (urlUsername) {
      console.log('✅ Using URL username:', urlUsername);
      return this.cacheAndReturn(urlUsername);
    }
    
    // 3. Try Devvit API with detailed logging
    const devvitUsername = await this.tryDevvitAPI();
    if (devvitUsername) {
      console.log('✅ Using Devvit username:', devvitUsername);
      return this.cacheAndReturn(devvitUsername);
    }
    
    // 4. Use fallback
    console.log('⚠️ Using fallback username:', fallback);
    return fallback;
  }
  
  private async tryDevvitAPI(): Promise<string | null> {
    try {
      const devvit = this.detectDevvitAPI();
      if (!devvit) {
        console.log('❌ No Devvit API detected');
        return null;
      }
      
      console.log('🔍 Devvit API found, attempting username retrieval...');
      // Detailed API attempts with logging
      
    } catch (error) {
      console.error('❌ Devvit API error:', error);
      return null;
    }
  }
}
```

### 3. UI Stability Improvements

**Purpose**: Fix broken UI elements and improve reliability.

**Current Problems**:
- Beaver logo not loading (wrong path: `'beaverlogo.png'` should be `'/beaverlogo.png'`)
- Complex animations causing performance issues
- Overlapping header elements
- Mobile controls with poor responsiveness

**Solution Design**:
```typescript
class StableUIManager {
  public createSimpleHeader(): void {
    // Remove complex animations and beaver logos
    // Use simple, reliable text-based header
    const title = this.add.text(width / 2, 25, 'BEAVER DAM BUILDER', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#8B4513',
      stroke: '#FFFFFF',
      strokeThickness: 2
    }).setOrigin(0.5);
  }
  
  public createReliableMobileControls(): void {
    // Simplified mobile buttons without complex animations
    const buttons = [
      { key: 'left', symbol: '←', action: () => this.movePiece(-1, 0) },
      { key: 'right', symbol: '→', action: () => this.movePiece(1, 0) },
      { key: 'rotate', symbol: '↻', action: () => this.rotatePiece() },
      { key: 'down', symbol: '↓', action: () => this.movePiece(0, 1) }
    ];
    
    // Larger touch targets, immediate feedback
    buttons.forEach(btn => {
      const button = this.createTouchButton(btn);
      button.on('pointerdown', btn.action);
    });
  }
  
  public removeProblematicAnimations(): void {
    // Remove swimming beaver animations
    // Remove complex water effects
    // Remove resize-dependent animations
    // Keep only essential, lightweight effects
  }
}
```

### 4. InputManager

**Purpose**: Unified input handling for keyboard, touch, and mobile controls.

```typescript
interface InputConfig {
  moveLeft: string[];
  moveRight: string[];
  rotate: string[];
  softDrop: string[];
  hardDrop: string[];
}

class InputManager {
  private keyboardEnabled: boolean;
  private touchEnabled: boolean;
  private config: InputConfig;
  
  public setupKeyboardControls(): void
  public setupTouchControls(): void
  public handleInput(action: InputAction): void
  public enableHapticFeedback(): void
}
```

### 5. UIManager

**Purpose**: Manage all user interface components with responsive design.

```typescript
class UIManager {
  private mobileControls: Phaser.GameObjects.Container | null;
  private gameOverPanel: Phaser.GameObjects.Container | null;
  private leaderboardPanel: Phaser.GameObjects.Container | null;
  
  public createMobileControls(): void
  public createGameOverUI(): void
  public createLeaderboardUI(): void
  public updateLayout(width: number, height: number): void
  public showToast(message: string): void
}
```

### 6. AudioManager

**Purpose**: Handle all audio playback with user preferences.

```typescript
interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  enabled: boolean;
}

class AudioManager {
  private settings: AudioSettings;
  private sounds: Map<string, Phaser.Sound.BaseSound>;
  
  public loadSounds(): void
  public playSound(key: string, volume?: number): void
  public playMusic(key: string, loop?: boolean): void
  public updateSettings(settings: Partial<AudioSettings>): void
}
```

### 7. ScoreManager

**Purpose**: Handle scoring, leaderboards, and data persistence.

```typescript
interface ScoreEntry {
  username: string;
  score: number;
  timestamp: number;
  level: number;
  lines: number;
}

class ScoreManager {
  public calculateScore(linesCleared: number, level: number, dropBonus: number): number
  public saveScore(entry: ScoreEntry): Promise<boolean>
  public getLeaderboard(limit?: number): Promise<ScoreEntry[]>
  public getPersonalBest(): ScoreEntry | null
}
```

## Data Models

### Game Piece Types

```typescript
enum PieceType {
  I = 'I', // Line piece
  O = 'O', // Square piece  
  T = 'T', // T-piece
  S = 'S', // S-piece
  Z = 'Z', // Z-piece
  L = 'L', // L-piece
  J = 'J'  // J-piece
}

const PIECE_DEFINITIONS: Record<PieceType, {
  shape: number[][];
  color: number;
  rotationStates: number[][][];
}> = {
  [PieceType.I]: {
    shape: [[1, 1, 1, 1]],
    color: 0x00FFFF,
    rotationStates: [/* 4 rotation states */]
  },
  // ... other pieces
};
```

### Game Configuration

```typescript
interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  initialDropTime: number;
  levelSpeedIncrease: number;
  linesPerLevel: number;
  scoring: {
    singleLine: number;
    doubleLine: number;
    tripleLine: number;
    tetris: number;
    softDrop: number;
    hardDrop: number;
  };
}
```

## Error Handling

### Critical Issue Prevention

1. **Resize Event Safety**: Prevent event listener memory leaks and infinite loops
2. **API Failure Handling**: Graceful degradation when Devvit API is unavailable
3. **UI Stability**: Fallback to simple, working UI when complex elements fail

```typescript
class CriticalErrorHandler {
  public static handleResizeError(error: Error): void {
    console.error('Resize handler error:', error);
    // Remove all resize listeners and use static layout
    this.fallbackToStaticLayout();
  }
  
  public static handleDevvitError(error: Error): void {
    console.error('Devvit API error:', error);
    // Use local fallback for username and scoring
    this.enableOfflineMode();
  }
  
  public static handleUIError(error: Error): void {
    console.error('UI rendering error:', error);
    // Remove complex UI elements and use basic interface
    this.fallbackToBasicUI();
  }
}
```

### Recovery Strategies

- **Resize Handler Failure**: Remove all resize listeners, use fixed layout
- **Username Retrieval Failure**: Use cached username or generate random fallback
- **UI Animation Failure**: Remove animations, use static elements
- **Touch Control Failure**: Fall back to keyboard-only controls

## Testing Strategy

### Unit Testing Focus Areas

1. **Game Logic**: Piece movement, rotation, collision detection
2. **Board Operations**: Line clearing, piece placement
3. **Score Calculation**: Accurate scoring for all scenarios
4. **State Management**: State transitions and validation
5. **Input Handling**: All input methods and edge cases

### Integration Testing

1. **Scene Transitions**: Proper cleanup and state transfer
2. **Mobile Controls**: Touch input reliability
3. **Leaderboard System**: Score submission and retrieval
4. **Audio Integration**: Sound playback coordination
5. **Responsive Design**: Layout adaptation across screen sizes

### Manual Testing Scenarios

1. **Mobile Device Testing**: Various screen sizes and orientations
2. **Performance Testing**: Extended gameplay sessions
3. **Edge Case Testing**: Rapid inputs, network interruptions
4. **Accessibility Testing**: Color contrast, touch target sizes
5. **Cross-Platform Testing**: Different browsers and devices

## Implementation Phases

### Phase 1: Emergency UI Stability (CRITICAL)
- Remove problematic resize handler causing freezing
- Fix beaver logo loading path
- Remove complex animations causing performance issues
- Implement simple, reliable layout system

### Phase 2: Reddit Username Integration (CRITICAL)
- Debug and fix Devvit API detection
- Implement comprehensive logging for username retrieval
- Add reliable fallback mechanisms
- Test username display in game interface

### Phase 3: Mobile Controls Reliability (HIGH PRIORITY)
- Simplify mobile control buttons
- Improve touch responsiveness
- Remove animation-dependent controls
- Test across different mobile devices

### Phase 4: Performance Optimization (MEDIUM PRIORITY)
- Remove resource-heavy animations
- Optimize rendering performance
- Clean up event listeners and memory leaks
- Implement efficient layout updates

### Phase 5: UI Polish (LOW PRIORITY)
- Add back simple, lightweight animations
- Improve visual design without performance impact
- Enhance user feedback systems
- Add accessibility improvements

## Technical Considerations

### Performance Optimization

1. **Object Pooling**: Reuse game objects to reduce garbage collection
2. **Efficient Rendering**: Minimize draw calls and use sprite batching
3. **Memory Management**: Proper cleanup of event listeners and resources
4. **Frame Rate Stability**: Consistent 60fps gameplay

### Mobile Optimization

1. **Touch Responsiveness**: Sub-100ms input latency
2. **Battery Efficiency**: Optimize rendering and reduce CPU usage
3. **Network Efficiency**: Minimize API calls and implement caching
4. **Storage Management**: Efficient local data storage

### Accessibility Features

1. **Color Blind Support**: High contrast mode and alternative color schemes
2. **Touch Accessibility**: Large touch targets (minimum 44px)
3. **Screen Reader Support**: Proper ARIA labels where applicable
4. **Keyboard Navigation**: Full keyboard accessibility

This design provides a comprehensive roadmap for transforming the Dam Attack game into a polished, professional gaming experience while maintaining the fun beaver theme and Tetris-style gameplay.