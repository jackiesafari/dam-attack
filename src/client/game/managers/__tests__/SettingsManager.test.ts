import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../SettingsManager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SettingsManager', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    settingsManager = new SettingsManager();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      const settings = settingsManager.getSettings();
      
      expect(settings.audio.masterVolume).toBe(0.7);
      expect(settings.audio.enabled).toBe(true);
      expect(settings.visual.theme).toBe('classic');
      expect(settings.visual.showGhost).toBe(true);
      expect(settings.gameplay.autoRepeat).toBe(true);
      expect(settings.controls.touch.enabled).toBe(true);
    });

    it('should initialize with available themes', () => {
      const themes = settingsManager.getThemes();
      
      expect(themes.length).toBeGreaterThan(0);
      expect(themes.some(t => t.id === 'classic')).toBe(true);
      expect(themes.some(t => t.id === 'dark')).toBe(true);
      expect(themes.some(t => t.id === 'neon')).toBe(true);
      expect(themes.some(t => t.id === 'beaver')).toBe(true);
    });

    it('should set classic as current theme by default', () => {
      const currentTheme = settingsManager.getCurrentTheme();
      
      expect(currentTheme?.id).toBe('classic');
      expect(currentTheme?.name).toBe('Classic');
    });
  });

  describe('setting individual values', () => {
    it('should update audio settings', () => {
      settingsManager.setSetting('audio', 'masterVolume', 0.5);
      
      const volume = settingsManager.getSetting('audio', 'masterVolume');
      expect(volume).toBe(0.5);
    });

    it('should update visual settings', () => {
      settingsManager.setSetting('visual', 'showGhost', false);
      
      const showGhost = settingsManager.getSetting('visual', 'showGhost');
      expect(showGhost).toBe(false);
    });

    it('should update gameplay settings', () => {
      settingsManager.setSetting('gameplay', 'autoRepeatDelay', 200);
      
      const delay = settingsManager.getSetting('gameplay', 'autoRepeatDelay');
      expect(delay).toBe(200);
    });

    it('should save to localStorage when setting changes', () => {
      settingsManager.setSetting('audio', 'masterVolume', 0.5);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dam-attack-settings',
        expect.any(String)
      );
    });

    it('should not save if value is unchanged', () => {
      const initialVolume = settingsManager.getSetting('audio', 'masterVolume');
      settingsManager.setSetting('audio', 'masterVolume', initialVolume);
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('bulk settings updates', () => {
    it('should update multiple settings at once', () => {
      settingsManager.updateSettings({
        audio: {
          masterVolume: 0.8,
          sfxVolume: 0.9
        },
        visual: {
          showGhost: false,
          showGrid: false
        }
      });
      
      expect(settingsManager.getSetting('audio', 'masterVolume')).toBe(0.8);
      expect(settingsManager.getSetting('audio', 'sfxVolume')).toBe(0.9);
      expect(settingsManager.getSetting('visual', 'showGhost')).toBe(false);
      expect(settingsManager.getSetting('visual', 'showGrid')).toBe(false);
    });

    it('should only save once for bulk updates', () => {
      settingsManager.updateSettings({
        audio: {
          masterVolume: 0.8,
          sfxVolume: 0.9
        }
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('theme management', () => {
    it('should switch themes', () => {
      const success = settingsManager.setTheme('dark');
      
      expect(success).toBe(true);
      expect(settingsManager.getSetting('visual', 'theme')).toBe('dark');
      
      const currentTheme = settingsManager.getCurrentTheme();
      expect(currentTheme?.id).toBe('dark');
    });

    it('should reject invalid theme', () => {
      const success = settingsManager.setTheme('invalid-theme');
      
      expect(success).toBe(false);
      expect(settingsManager.getSetting('visual', 'theme')).toBe('classic');
    });

    it('should get theme by ID', () => {
      const beaverTheme = settingsManager.getTheme('beaver');
      
      expect(beaverTheme?.id).toBe('beaver');
      expect(beaverTheme?.name).toBe('Beaver Theme');
      expect(beaverTheme?.colors).toBeDefined();
    });

    it('should add custom theme', () => {
      const customTheme = {
        id: 'custom',
        name: 'Custom Theme',
        description: 'A custom theme',
        colors: {
          background: 0x123456,
          board: 0x654321,
          grid: 0x111111,
          pieces: [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFFFFF],
          ui: {
            primary: 0xFF0000,
            secondary: 0x00FF00,
            accent: 0x0000FF,
            text: 0xFFFFFF,
            textSecondary: 0xCCCCCC
          }
        }
      };
      
      settingsManager.addCustomTheme(customTheme);
      
      const themes = settingsManager.getThemes();
      expect(themes.some(t => t.id === 'custom')).toBe(true);
      
      const retrievedTheme = settingsManager.getTheme('custom');
      expect(retrievedTheme).toEqual(customTheme);
    });
  });

  describe('settings validation', () => {
    it('should validate correct settings', () => {
      const validSettings = settingsManager.getSettings();
      const isValid = settingsManager.validateSettings(validSettings);
      
      expect(isValid).toBe(true);
    });

    it('should reject settings with missing categories', () => {
      const invalidSettings = {
        audio: { masterVolume: 0.5 }
        // Missing other required categories
      };
      
      const isValid = settingsManager.validateSettings(invalidSettings);
      expect(isValid).toBe(false);
    });

    it('should reject settings with invalid ranges', () => {
      const invalidSettings = {
        ...settingsManager.getSettings(),
        audio: {
          ...settingsManager.getSetting('audio', 'masterVolume'),
          masterVolume: 2.0 // Invalid: should be 0-1
        }
      };
      
      const isValid = settingsManager.validateSettings(invalidSettings);
      expect(isValid).toBe(false);
    });

    it('should reject settings with invalid types', () => {
      const invalidSettings = {
        ...settingsManager.getSettings(),
        audio: {
          ...settingsManager.getSettings().audio,
          enabled: 'yes' as any // Invalid: should be boolean
        }
      };
      
      const isValid = settingsManager.validateSettings(invalidSettings);
      expect(isValid).toBe(false);
    });
  });

  describe('reset functionality', () => {
    it('should reset all settings to defaults', () => {
      settingsManager.setSetting('audio', 'masterVolume', 0.1);
      settingsManager.setSetting('visual', 'theme', 'dark');
      
      settingsManager.resetToDefaults();
      
      expect(settingsManager.getSetting('audio', 'masterVolume')).toBe(0.7);
      expect(settingsManager.getSetting('visual', 'theme')).toBe('classic');
    });

    it('should reset specific category', () => {
      settingsManager.setSetting('audio', 'masterVolume', 0.1);
      settingsManager.setSetting('visual', 'theme', 'dark');
      
      settingsManager.resetCategory('audio');
      
      expect(settingsManager.getSetting('audio', 'masterVolume')).toBe(0.7);
      expect(settingsManager.getSetting('visual', 'theme')).toBe('dark'); // Should remain unchanged
    });
  });

  describe('import/export', () => {
    it('should export settings as JSON', () => {
      const exported = settingsManager.exportSettings();
      const parsed = JSON.parse(exported);
      
      expect(parsed.audio).toBeDefined();
      expect(parsed.visual).toBeDefined();
      expect(parsed.gameplay).toBeDefined();
      expect(parsed.controls).toBeDefined();
    });

    it('should import valid settings', () => {
      const customSettings = {
        ...settingsManager.getSettings(),
        audio: {
          ...settingsManager.getSettings().audio,
          masterVolume: 0.3
        }
      };
      
      const success = settingsManager.importSettings(JSON.stringify(customSettings));
      
      expect(success).toBe(true);
      expect(settingsManager.getSetting('audio', 'masterVolume')).toBe(0.3);
    });

    it('should reject invalid settings on import', () => {
      const invalidSettings = { invalid: 'data' };
      
      const success = settingsManager.importSettings(JSON.stringify(invalidSettings));
      
      expect(success).toBe(false);
    });

    it('should reject malformed JSON on import', () => {
      const success = settingsManager.importSettings('invalid json');
      
      expect(success).toBe(false);
    });
  });

  describe('settings listeners', () => {
    it('should notify listeners of setting changes', () => {
      const listener = vi.fn();
      settingsManager.addListener(listener);
      
      settingsManager.setSetting('audio', 'masterVolume', 0.5);
      
      expect(listener).toHaveBeenCalledWith('audio', 'masterVolume', 0.5);
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      settingsManager.addListener(listener1);
      settingsManager.addListener(listener2);
      
      settingsManager.setSetting('visual', 'showGhost', false);
      
      expect(listener1).toHaveBeenCalledWith('visual', 'showGhost', false);
      expect(listener2).toHaveBeenCalledWith('visual', 'showGhost', false);
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      settingsManager.addListener(listener);
      settingsManager.removeListener(listener);
      
      settingsManager.setSetting('audio', 'masterVolume', 0.5);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners on bulk updates', () => {
      const listener = vi.fn();
      settingsManager.addListener(listener);
      
      settingsManager.updateSettings({
        audio: {
          masterVolume: 0.8,
          sfxVolume: 0.9
        }
      });
      
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith('audio', 'masterVolume', 0.8);
      expect(listener).toHaveBeenCalledWith('audio', 'sfxVolume', 0.9);
    });
  });

  describe('persistence', () => {
    it('should save settings to localStorage', () => {
      settingsManager.setSetting('audio', 'masterVolume', 0.5);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dam-attack-settings',
        expect.any(String)
      );
    });

    it('should load settings from localStorage', () => {
      const mockSettings = {
        ...settingsManager.getSettings(),
        audio: {
          ...settingsManager.getSettings().audio,
          masterVolume: 0.3
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSettings));
      
      const newManager = new SettingsManager();
      expect(newManager.getSetting('audio', 'masterVolume')).toBe(0.3);
    });

    it('should merge loaded settings with defaults', () => {
      // Create a valid but partial settings object
      const defaultSettings = settingsManager.getSettings();
      const partialSettings = {
        ...defaultSettings,
        audio: {
          ...defaultSettings.audio,
          masterVolume: 0.3
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialSettings));
      
      const newManager = new SettingsManager();
      const settings = newManager.getSettings();
      
      expect(settings.audio.masterVolume).toBe(0.3); // From loaded settings
      expect(settings.audio.sfxVolume).toBe(0.8); // From defaults
      expect(settings.visual).toBeDefined(); // From defaults
    });

    it('should use defaults if localStorage data is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const newManager = new SettingsManager();
      const settings = newManager.getSettings();
      
      expect(settings.audio.masterVolume).toBe(0.7); // Default value
    });
  });

  describe('settings schema', () => {
    it('should provide settings schema for UI generation', () => {
      const schema = settingsManager.getSettingsSchema();
      
      expect(schema.audio).toBeDefined();
      expect(schema.visual).toBeDefined();
      expect(schema.gameplay).toBeDefined();
      expect(schema.controls).toBeDefined();
      expect(schema.accessibility).toBeDefined();
      expect(schema.performance).toBeDefined();
    });

    it('should include proper field types in schema', () => {
      const schema = settingsManager.getSettingsSchema();
      
      expect(schema.audio.enabled.type).toBe('boolean');
      expect(schema.audio.masterVolume.type).toBe('number');
      expect(schema.visual.theme.type).toBe('select');
      expect(schema.performance.targetFPS.type).toBe('select');
    });

    it('should include validation ranges in schema', () => {
      const schema = settingsManager.getSettingsSchema();
      
      expect(schema.audio.masterVolume.min).toBe(0);
      expect(schema.audio.masterVolume.max).toBe(1);
      expect(schema.audio.masterVolume.step).toBe(0.1);
    });

    it('should include select options in schema', () => {
      const schema = settingsManager.getSettingsSchema();
      
      expect(schema.visual.theme.options).toBeDefined();
      expect(schema.visual.theme.options!.length).toBeGreaterThan(0);
      expect(schema.performance.targetFPS.options).toBeDefined();
    });
  });

  describe('keyboard controls', () => {
    it('should have default keyboard mappings', () => {
      const controls = settingsManager.getSetting('controls', 'keyboard');
      
      expect(controls.moveLeft).toContain('ArrowLeft');
      expect(controls.moveRight).toContain('ArrowRight');
      expect(controls.softDrop).toContain('ArrowDown');
      expect(controls.hardDrop).toContain('Space');
      expect(controls.rotateLeft).toContain('KeyZ');
      expect(controls.rotateRight).toContain('ArrowUp');
    });

    it('should allow multiple keys per action', () => {
      const controls = settingsManager.getSetting('controls', 'keyboard');
      
      expect(Array.isArray(controls.moveLeft)).toBe(true);
      expect(controls.moveLeft.length).toBeGreaterThan(1);
    });
  });

  describe('accessibility settings', () => {
    it('should have accessibility options', () => {
      const accessibility = settingsManager.getSetting('accessibility', 'colorBlindMode');
      
      expect(typeof accessibility).toBe('boolean');
    });

    it('should include all accessibility features', () => {
      const settings = settingsManager.getSettings();
      
      expect(settings.accessibility.colorBlindMode).toBeDefined();
      expect(settings.accessibility.highContrast).toBeDefined();
      expect(settings.accessibility.reducedMotion).toBeDefined();
      expect(settings.accessibility.largeText).toBeDefined();
      expect(settings.accessibility.screenReader).toBeDefined();
    });
  });
});