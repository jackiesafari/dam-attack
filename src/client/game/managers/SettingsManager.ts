export interface GameSettings {
  // Audio Settings
  audio: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    enabled: boolean;
  };
  
  // Visual Settings
  visual: {
    theme: string;
    showGhost: boolean;
    showGrid: boolean;
    particleEffects: boolean;
    screenShake: boolean;
    animations: boolean;
    backgroundAnimation: boolean;
  };
  
  // Gameplay Settings
  gameplay: {
    autoRepeat: boolean;
    autoRepeatDelay: number;
    softDropSpeed: number;
    lockDelay: number;
    showNextPieces: number;
    holdPiece: boolean;
    instantDrop: boolean;
  };
  
  // Control Settings
  controls: {
    keyboard: {
      moveLeft: string[];
      moveRight: string[];
      softDrop: string[];
      hardDrop: string[];
      rotateLeft: string[];
      rotateRight: string[];
      hold: string[];
      pause: string[];
    };
    touch: {
      enabled: boolean;
      hapticFeedback: boolean;
      buttonSize: number;
      buttonOpacity: number;
      swipeGestures: boolean;
    };
  };
  
  // Accessibility Settings
  accessibility: {
    colorBlindMode: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  
  // Performance Settings
  performance: {
    targetFPS: number;
    vsync: boolean;
    particleLimit: number;
    backgroundQuality: 'low' | 'medium' | 'high';
  };
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: {
    background: number;
    board: number;
    grid: number;
    pieces: number[];
    ui: {
      primary: number;
      secondary: number;
      accent: number;
      text: number;
      textSecondary: number;
    };
  };
  preview?: string;
}

export type SettingsCategory = keyof GameSettings;
export type SettingChangeListener = (category: SettingsCategory, key: string, value: any) => void;

export class SettingsManager {
  private readonly STORAGE_KEY = 'dam-attack-settings';
  private settings: GameSettings;
  private listeners: SettingChangeListener[] = [];
  private themes: Map<string, ThemeDefinition> = new Map();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeThemes();
    this.loadSettings();
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): GameSettings {
    return {
      audio: {
        masterVolume: 0.7,
        sfxVolume: 0.8,
        musicVolume: 0.6,
        enabled: true
      },
      visual: {
        theme: 'classic',
        showGhost: true,
        showGrid: true,
        particleEffects: true,
        screenShake: true,
        animations: true,
        backgroundAnimation: true
      },
      gameplay: {
        autoRepeat: true,
        autoRepeatDelay: 150,
        softDropSpeed: 50,
        lockDelay: 500,
        showNextPieces: 3,
        holdPiece: true,
        instantDrop: false
      },
      controls: {
        keyboard: {
          moveLeft: ['ArrowLeft', 'KeyA'],
          moveRight: ['ArrowRight', 'KeyD'],
          softDrop: ['ArrowDown', 'KeyS'],
          hardDrop: ['Space'],
          rotateLeft: ['KeyZ', 'KeyQ'],
          rotateRight: ['ArrowUp', 'KeyW', 'KeyX'],
          hold: ['KeyC', 'Shift'],
          pause: ['KeyP', 'Escape']
        },
        touch: {
          enabled: true,
          hapticFeedback: true,
          buttonSize: 1.0,
          buttonOpacity: 0.7,
          swipeGestures: true
        }
      },
      accessibility: {
        colorBlindMode: false,
        highContrast: false,
        reducedMotion: false,
        largeText: false,
        screenReader: false
      },
      performance: {
        targetFPS: 60,
        vsync: true,
        particleLimit: 100,
        backgroundQuality: 'high'
      }
    };
  }

  /**
   * Initialize available themes
   */
  private initializeThemes(): void {
    const themeDefinitions: ThemeDefinition[] = [
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional Tetris colors',
        colors: {
          background: 0x000000,
          board: 0x111111,
          grid: 0x333333,
          pieces: [0x00FFFF, 0xFFFF00, 0xFF00FF, 0x00FF00, 0xFF0000, 0x0000FF, 0xFFA500],
          ui: {
            primary: 0x4CAF50,
            secondary: 0x2196F3,
            accent: 0xFFEB3B,
            text: 0xFFFFFF,
            textSecondary: 0xCCCCCC
          }
        }
      },
      {
        id: 'dark',
        name: 'Dark Mode',
        description: 'Easy on the eyes',
        colors: {
          background: 0x0D1117,
          board: 0x161B22,
          grid: 0x30363D,
          pieces: [0x58A6FF, 0xF85149, 0xA5A5A5, 0x7EE787, 0xFFA657, 0xF2CC60, 0xFF7B72],
          ui: {
            primary: 0x238636,
            secondary: 0x1F6FEB,
            accent: 0xE3B341,
            text: 0xF0F6FC,
            textSecondary: 0x8B949E
          }
        }
      },
      {
        id: 'neon',
        name: 'Neon',
        description: 'Bright and vibrant',
        colors: {
          background: 0x0A0A0A,
          board: 0x1A1A1A,
          grid: 0x444444,
          pieces: [0x00FFFF, 0xFF00FF, 0xFFFF00, 0x00FF00, 0xFF0080, 0x8000FF, 0xFF8000],
          ui: {
            primary: 0xFF00FF,
            secondary: 0x00FFFF,
            accent: 0xFFFF00,
            text: 0xFFFFFF,
            textSecondary: 0xCCCCCC
          }
        }
      },
      {
        id: 'pastel',
        name: 'Pastel',
        description: 'Soft and gentle colors',
        colors: {
          background: 0xF5F5F5,
          board: 0xFFFFFF,
          grid: 0xE0E0E0,
          pieces: [0xFFB3BA, 0xFFDFBA, 0xFFFFBA, 0xBAFFC9, 0xBAE1FF, 0xD4BAFF, 0xFFBAE8],
          ui: {
            primary: 0x81C784,
            secondary: 0x64B5F6,
            accent: 0xFFB74D,
            text: 0x333333,
            textSecondary: 0x666666
          }
        }
      },
      {
        id: 'beaver',
        name: 'Beaver Theme',
        description: 'Dam Attack special theme',
        colors: {
          background: 0x2E1A0A,
          board: 0x4A2C17,
          grid: 0x6B3E23,
          pieces: [0x8B4513, 0xD2691E, 0xCD853F, 0xDEB887, 0xF4A460, 0xDAA520, 0xB8860B],
          ui: {
            primary: 0x8B4513,
            secondary: 0xD2691E,
            accent: 0xDAA520,
            text: 0xFFFFFF,
            textSecondary: 0xDEB887
          }
        }
      }
    ];

    themeDefinitions.forEach(theme => {
      this.themes.set(theme.id, theme);
    });
  }

  /**
   * Get current settings
   */
  public getSettings(): Readonly<GameSettings> {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Get setting value by category and key
   */
  public getSetting<T extends SettingsCategory>(
    category: T, 
    key: keyof GameSettings[T]
  ): GameSettings[T][keyof GameSettings[T]] {
    return this.settings[category][key];
  }

  /**
   * Update a setting value
   */
  public setSetting<T extends SettingsCategory>(
    category: T,
    key: keyof GameSettings[T],
    value: GameSettings[T][keyof GameSettings[T]]
  ): void {
    const oldValue = this.settings[category][key];
    
    if (oldValue !== value) {
      (this.settings[category] as any)[key] = value;
      this.saveSettings();
      this.notifyListeners(category, key as string, value);
    }
  }

  /**
   * Update multiple settings at once
   */
  public updateSettings(updates: Partial<GameSettings>): void {
    let hasChanges = false;

    Object.keys(updates).forEach(categoryKey => {
      const category = categoryKey as SettingsCategory;
      const categoryUpdates = updates[category];
      
      if (categoryUpdates) {
        Object.keys(categoryUpdates).forEach(key => {
          const oldValue = (this.settings[category] as any)[key];
          const newValue = (categoryUpdates as any)[key];
          
          if (oldValue !== newValue) {
            (this.settings[category] as any)[key] = newValue;
            hasChanges = true;
            this.notifyListeners(category, key, newValue);
          }
        });
      }
    });

    if (hasChanges) {
      this.saveSettings();
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    
    // Notify all listeners of reset
    Object.keys(this.settings).forEach(categoryKey => {
      const category = categoryKey as SettingsCategory;
      Object.keys(this.settings[category]).forEach(key => {
        this.notifyListeners(category, key, (this.settings[category] as any)[key]);
      });
    });
  }

  /**
   * Reset specific category to defaults
   */
  public resetCategory(category: SettingsCategory): void {
    const defaultSettings = this.getDefaultSettings();
    const oldCategory = { ...this.settings[category] };
    
    this.settings[category] = defaultSettings[category];
    this.saveSettings();
    
    // Notify listeners of changes
    Object.keys(this.settings[category]).forEach(key => {
      const newValue = (this.settings[category] as any)[key];
      const oldValue = (oldCategory as any)[key];
      
      if (oldValue !== newValue) {
        this.notifyListeners(category, key, newValue);
      }
    });
  }

  /**
   * Get available themes
   */
  public getThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by ID
   */
  public getTheme(id: string): ThemeDefinition | null {
    return this.themes.get(id) || null;
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): ThemeDefinition | null {
    return this.getTheme(this.settings.visual.theme);
  }

  /**
   * Set current theme
   */
  public setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      return false;
    }

    this.setSetting('visual', 'theme', themeId);
    return true;
  }

  /**
   * Add custom theme
   */
  public addCustomTheme(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  /**
   * Validate settings object
   */
  public validateSettings(settings: any): boolean {
    try {
      // Basic structure validation
      const requiredCategories: SettingsCategory[] = [
        'audio', 'visual', 'gameplay', 'controls', 'accessibility', 'performance'
      ];
      
      for (const category of requiredCategories) {
        if (!settings[category] || typeof settings[category] !== 'object') {
          return false;
        }
      }

      // Validate audio settings types and ranges
      if (typeof settings.audio.enabled !== 'boolean') return false;
      if (typeof settings.audio.masterVolume !== 'number' || settings.audio.masterVolume < 0 || settings.audio.masterVolume > 1) return false;
      if (typeof settings.audio.sfxVolume !== 'number' || settings.audio.sfxVolume < 0 || settings.audio.sfxVolume > 1) return false;
      if (typeof settings.audio.musicVolume !== 'number' || settings.audio.musicVolume < 0 || settings.audio.musicVolume > 1) return false;
      
      // Validate gameplay settings
      if (typeof settings.gameplay.autoRepeat !== 'boolean') return false;
      if (typeof settings.gameplay.autoRepeatDelay !== 'number' || settings.gameplay.autoRepeatDelay < 50 || settings.gameplay.autoRepeatDelay > 1000) return false;
      if (typeof settings.gameplay.softDropSpeed !== 'number' || settings.gameplay.softDropSpeed < 10 || settings.gameplay.softDropSpeed > 500) return false;
      if (typeof settings.gameplay.lockDelay !== 'number' || settings.gameplay.lockDelay < 0 || settings.gameplay.lockDelay > 2000) return false;
      if (typeof settings.gameplay.showNextPieces !== 'number' || settings.gameplay.showNextPieces < 1 || settings.gameplay.showNextPieces > 6) return false;
      
      // Validate controls settings
      if (typeof settings.controls.touch.buttonSize !== 'number' || settings.controls.touch.buttonSize < 0.5 || settings.controls.touch.buttonSize > 2.0) return false;
      if (typeof settings.controls.touch.buttonOpacity !== 'number' || settings.controls.touch.buttonOpacity < 0.1 || settings.controls.touch.buttonOpacity > 1.0) return false;
      
      // Validate performance settings
      if (typeof settings.performance.targetFPS !== 'number' || settings.performance.targetFPS < 30 || settings.performance.targetFPS > 120) return false;
      if (typeof settings.performance.particleLimit !== 'number' || settings.performance.particleLimit < 0 || settings.performance.particleLimit > 500) return false;

      return true;
    } catch (error) {
      console.error('Settings validation error:', error);
      return false;
    }
  }

  /**
   * Export settings to JSON string
   */
  public exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  public importSettings(jsonString: string): boolean {
    try {
      const importedSettings = JSON.parse(jsonString);
      
      if (!this.validateSettings(importedSettings)) {
        return false;
      }

      this.settings = importedSettings;
      this.saveSettings();
      
      // Notify all listeners
      Object.keys(this.settings).forEach(categoryKey => {
        const category = categoryKey as SettingsCategory;
        Object.keys(this.settings[category]).forEach(key => {
          this.notifyListeners(category, key, (this.settings[category] as any)[key]);
        });
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Add settings change listener
   */
  public addListener(listener: SettingChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove settings change listener
   */
  public removeListener(listener: SettingChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of setting changes
   */
  private notifyListeners(category: SettingsCategory, key: string, value: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(category, key, value);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        
        if (this.validateSettings(parsedSettings)) {
          // Merge with defaults to ensure all properties exist
          this.settings = this.mergeWithDefaults(parsedSettings);
        } else {
          console.warn('Invalid settings found, using defaults');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Merge loaded settings with defaults to ensure all properties exist
   */
  private mergeWithDefaults(loadedSettings: any): GameSettings {
    const defaults = this.getDefaultSettings();
    
    // Deep merge function
    const deepMerge = (target: any, source: any): any => {
      const result = { ...target };
      
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      });
      
      return result;
    };
    
    return deepMerge(defaults, loadedSettings);
  }

  /**
   * Get settings schema for UI generation
   */
  public getSettingsSchema(): Record<SettingsCategory, Record<string, {
    type: 'boolean' | 'number' | 'string' | 'array' | 'select';
    label: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: { value: any; label: string }[];
  }>> {
    return {
      audio: {
        enabled: { type: 'boolean', label: 'Enable Audio' },
        masterVolume: { type: 'number', label: 'Master Volume', min: 0, max: 1, step: 0.1 },
        sfxVolume: { type: 'number', label: 'Sound Effects', min: 0, max: 1, step: 0.1 },
        musicVolume: { type: 'number', label: 'Music Volume', min: 0, max: 1, step: 0.1 }
      },
      visual: {
        theme: { 
          type: 'select', 
          label: 'Theme',
          options: Array.from(this.themes.values()).map(t => ({ value: t.id, label: t.name }))
        },
        showGhost: { type: 'boolean', label: 'Show Ghost Piece' },
        showGrid: { type: 'boolean', label: 'Show Grid' },
        particleEffects: { type: 'boolean', label: 'Particle Effects' },
        screenShake: { type: 'boolean', label: 'Screen Shake' },
        animations: { type: 'boolean', label: 'Animations' },
        backgroundAnimation: { type: 'boolean', label: 'Background Animation' }
      },
      gameplay: {
        autoRepeat: { type: 'boolean', label: 'Auto Repeat' },
        autoRepeatDelay: { type: 'number', label: 'Auto Repeat Delay (ms)', min: 50, max: 1000, step: 50 },
        softDropSpeed: { type: 'number', label: 'Soft Drop Speed (ms)', min: 10, max: 500, step: 10 },
        lockDelay: { type: 'number', label: 'Lock Delay (ms)', min: 0, max: 2000, step: 100 },
        showNextPieces: { type: 'number', label: 'Next Pieces to Show', min: 1, max: 6, step: 1 },
        holdPiece: { type: 'boolean', label: 'Enable Hold Piece' },
        instantDrop: { type: 'boolean', label: 'Instant Hard Drop' }
      },
      controls: {
        'touch.enabled': { type: 'boolean', label: 'Touch Controls' },
        'touch.hapticFeedback': { type: 'boolean', label: 'Haptic Feedback' },
        'touch.buttonSize': { type: 'number', label: 'Button Size', min: 0.5, max: 2.0, step: 0.1 },
        'touch.buttonOpacity': { type: 'number', label: 'Button Opacity', min: 0.1, max: 1.0, step: 0.1 },
        'touch.swipeGestures': { type: 'boolean', label: 'Swipe Gestures' }
      },
      accessibility: {
        colorBlindMode: { type: 'boolean', label: 'Color Blind Mode' },
        highContrast: { type: 'boolean', label: 'High Contrast' },
        reducedMotion: { type: 'boolean', label: 'Reduced Motion' },
        largeText: { type: 'boolean', label: 'Large Text' },
        screenReader: { type: 'boolean', label: 'Screen Reader Support' }
      },
      performance: {
        targetFPS: { 
          type: 'select', 
          label: 'Target FPS',
          options: [
            { value: 30, label: '30 FPS' },
            { value: 60, label: '60 FPS' },
            { value: 120, label: '120 FPS' }
          ]
        },
        vsync: { type: 'boolean', label: 'V-Sync' },
        particleLimit: { type: 'number', label: 'Particle Limit', min: 0, max: 500, step: 25 },
        backgroundQuality: {
          type: 'select',
          label: 'Background Quality',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' }
          ]
        }
      }
    };
  }
}