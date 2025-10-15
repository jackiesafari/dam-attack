import * as Phaser from 'phaser';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  water: string;
  wood: string[];
  leaves: string[];
  neon: {
    cyan: string;
    magenta: string;
    yellow: string;
    orange: string;
  };
}

export interface PieceTheme {
  I: { colors: string[]; texture?: string; };
  O: { colors: string[]; texture?: string; };
  T: { colors: string[]; texture?: string; };
  S: { colors: string[]; texture?: string; };
  Z: { colors: string[]; texture?: string; };
  L: { colors: string[]; texture?: string; };
  J: { colors: string[]; texture?: string; };
}

export interface UITheme {
  button: {
    background: string;
    backgroundHover: string;
    backgroundActive: string;
    text: string;
    border: string;
    borderRadius: number;
    shadow: string;
  };
  modal: {
    background: string;
    overlay: string;
    border: string;
    borderRadius: number;
    shadow: string;
  };
  panel: {
    background: string;
    border: string;
    borderRadius: number;
    shadow: string;
  };
  text: {
    primary: string;
    secondary: string;
    accent: string;
    neon: string;
  };
}

export interface EffectsTheme {
  particles: {
    lineClear: string[];
    placement: string[];
    celebration: string[];
  };
  animations: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: {
      bounce: string;
      elastic: string;
      smooth: string;
    };
  };
  screen: {
    shake: {
      intensity: number;
      duration: number;
    };
    flash: {
      color: string;
      duration: number;
    };
  };
}

export interface GameTheme {
  name: string;
  displayName: string;
  colors: ColorPalette;
  pieces: PieceTheme;
  ui: UITheme;
  effects: EffectsTheme;
  fonts: {
    primary: string;
    secondary: string;
    display: string;
  };
  sounds?: {
    [key: string]: string;
  };
}

export class ThemeManager {
  private scene: Phaser.Scene;
  private currentTheme: GameTheme;
  private themes: Map<string, GameTheme> = new Map();
  private styleSheet: HTMLStyleElement | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeThemes();
    this.currentTheme = this.themes.get('retro-dam')!;
    this.createStyleSheet();
  }

  /**
   * Initialize all available themes
   */
  private initializeThemes(): void {
    // Retro Dam Theme (inspired by the provided image)
    const retroDamTheme: GameTheme = {
      name: 'retro-dam',
      displayName: 'Retro Dam Builder',
      colors: {
        primary: '#8B4513', // Saddle brown for wood
        secondary: '#D2691E', // Chocolate for lighter wood
        accent: '#00FFFF', // Cyan for neon accents
        background: '#1a1a1a', // Dark background
        surface: '#2d2d2d', // Dark surface
        text: '#FFFFFF', // White text
        textSecondary: '#CCCCCC', // Light gray
        success: '#00FF00', // Bright green
        warning: '#FFD700', // Gold
        error: '#FF4444', // Bright red
        water: '#4169E1', // Royal blue for water
        wood: [
          '#8B4513', // Saddle brown
          '#A0522D', // Sienna
          '#CD853F', // Peru
          '#D2691E', // Chocolate
          '#DEB887', // Burlywood
          '#F4A460', // Sandy brown
          '#DAA520'  // Goldenrod
        ],
        leaves: [
          '#228B22', // Forest green
          '#32CD32', // Lime green
          '#90EE90', // Light green
          '#9ACD32', // Yellow green
          '#ADFF2F'  // Green yellow
        ],
        neon: {
          cyan: '#00FFFF',
          magenta: '#FF00FF',
          yellow: '#FFFF00',
          orange: '#FF8C00'
        }
      },
      pieces: {
        I: { colors: ['#8B4513', '#A0522D'], texture: 'log-horizontal' },
        O: { colors: ['#CD853F', '#D2691E'], texture: 'log-block' },
        T: { colors: ['#DEB887', '#F4A460'], texture: 'log-branch' },
        S: { colors: ['#228B22', '#32CD32'], texture: 'branch-leaves' },
        Z: { colors: ['#90EE90', '#9ACD32'], texture: 'branch-leaves' },
        L: { colors: ['#DAA520', '#B8860B'], texture: 'log-corner' },
        J: { colors: ['#A0522D', '#8B4513'], texture: 'log-corner' }
      },
      ui: {
        button: {
          background: '#8B4513',
          backgroundHover: '#A0522D',
          backgroundActive: '#654321',
          text: '#FFFFFF',
          border: '#FFD700',
          borderRadius: 8,
          shadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        },
        modal: {
          background: '#1a1a1a',
          overlay: 'rgba(0, 0, 0, 0.8)',
          border: '#FFD700',
          borderRadius: 15,
          shadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        },
        panel: {
          background: '#2d2d2d',
          border: '#8B4513',
          borderRadius: 10,
          shadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#CCCCCC',
          accent: '#FFD700',
          neon: '#00FFFF'
        }
      },
      effects: {
        particles: {
          lineClear: ['#FFD700', '#FFA500', '#FF8C00'],
          placement: ['#8B4513', '#A0522D', '#CD853F'],
          celebration: ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00']
        },
        animations: {
          duration: {
            fast: 150,
            normal: 300,
            slow: 600
          },
          easing: {
            bounce: 'Back.easeOut',
            elastic: 'Elastic.easeOut',
            smooth: 'Power2.easeInOut'
          }
        },
        screen: {
          shake: {
            intensity: 0.02,
            duration: 200
          },
          flash: {
            color: '#FFFFFF',
            duration: 100
          }
        }
      },
      fonts: {
        primary: 'Arial Black',
        secondary: 'Arial',
        display: 'Courier New'
      }
    };

    // Classic Theme (fallback)
    const classicTheme: GameTheme = {
      name: 'classic',
      displayName: 'Classic Tetris',
      colors: {
        primary: '#0066CC',
        secondary: '#004499',
        accent: '#FFD700',
        background: '#000000',
        surface: '#333333',
        text: '#FFFFFF',
        textSecondary: '#CCCCCC',
        success: '#00FF00',
        warning: '#FFFF00',
        error: '#FF0000',
        water: '#0066FF',
        wood: ['#8B4513'],
        leaves: ['#228B22'],
        neon: {
          cyan: '#00FFFF',
          magenta: '#FF00FF',
          yellow: '#FFFF00',
          orange: '#FF8C00'
        }
      },
      pieces: {
        I: { colors: ['#00FFFF'] },
        O: { colors: ['#FFFF00'] },
        T: { colors: ['#800080'] },
        S: { colors: ['#00FF00'] },
        Z: { colors: ['#FF0000'] },
        L: { colors: ['#FFA500'] },
        J: { colors: ['#0000FF'] }
      },
      ui: {
        button: {
          background: '#0066CC',
          backgroundHover: '#0088FF',
          backgroundActive: '#004499',
          text: '#FFFFFF',
          border: '#FFD700',
          borderRadius: 5,
          shadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        },
        modal: {
          background: '#000000',
          overlay: 'rgba(0, 0, 0, 0.7)',
          border: '#FFD700',
          borderRadius: 10,
          shadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
        },
        panel: {
          background: '#333333',
          border: '#666666',
          borderRadius: 5,
          shadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#CCCCCC',
          accent: '#FFD700',
          neon: '#00FFFF'
        }
      },
      effects: {
        particles: {
          lineClear: ['#FFFFFF', '#FFD700'],
          placement: ['#CCCCCC'],
          celebration: ['#FFD700', '#00FFFF', '#FF00FF']
        },
        animations: {
          duration: {
            fast: 100,
            normal: 200,
            slow: 400
          },
          easing: {
            bounce: 'Bounce.easeOut',
            elastic: 'Elastic.easeOut',
            smooth: 'Power2.easeInOut'
          }
        },
        screen: {
          shake: {
            intensity: 0.01,
            duration: 150
          },
          flash: {
            color: '#FFFFFF',
            duration: 80
          }
        }
      },
      fonts: {
        primary: 'Arial',
        secondary: 'Arial',
        display: 'Courier New'
      }
    };

    this.themes.set('retro-dam', retroDamTheme);
    this.themes.set('classic', classicTheme);
  }

  /**
   * Get the current active theme
   */
  public getCurrentTheme(): GameTheme {
    return this.currentTheme;
  }

  /**
   * Set the active theme
   */
  public setTheme(themeName: string): boolean {
    const theme = this.themes.get(themeName);
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return false;
    }

    this.currentTheme = theme;
    this.updateStyleSheet();
    this.scene.events.emit('theme-changed', theme);
    return true;
  }

  /**
   * Get all available themes
   */
  public getAvailableThemes(): GameTheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by name
   */
  public getTheme(name: string): GameTheme | undefined {
    return this.themes.get(name);
  }

  /**
   * Add a custom theme
   */
  public addTheme(theme: GameTheme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Get piece colors for a specific piece type
   */
  public getPieceColors(pieceType: keyof PieceTheme): string[] {
    return this.currentTheme.pieces[pieceType].colors;
  }

  /**
   * Get piece texture for a specific piece type
   */
  public getPieceTexture(pieceType: keyof PieceTheme): string | undefined {
    return this.currentTheme.pieces[pieceType].texture;
  }

  /**
   * Get UI colors
   */
  public getUIColors(): UITheme {
    return this.currentTheme.ui;
  }

  /**
   * Get color palette
   */
  public getColors(): ColorPalette {
    return this.currentTheme.colors;
  }

  /**
   * Get effects configuration
   */
  public getEffects(): EffectsTheme {
    return this.currentTheme.effects;
  }

  /**
   * Get fonts configuration
   */
  public getFonts(): { primary: string; secondary: string; display: string; } {
    return this.currentTheme.fonts;
  }

  /**
   * Create CSS style sheet for web elements
   */
  private createStyleSheet(): void {
    this.styleSheet = document.createElement('style');
    this.styleSheet.id = 'game-theme-styles';
    document.head.appendChild(this.styleSheet);
    this.updateStyleSheet();
  }

  /**
   * Update CSS style sheet with current theme
   */
  private updateStyleSheet(): void {
    if (!this.styleSheet) return;

    const theme = this.currentTheme;
    const css = `
      :root {
        --theme-primary: ${theme.colors.primary};
        --theme-secondary: ${theme.colors.secondary};
        --theme-accent: ${theme.colors.accent};
        --theme-background: ${theme.colors.background};
        --theme-surface: ${theme.colors.surface};
        --theme-text: ${theme.colors.text};
        --theme-text-secondary: ${theme.colors.textSecondary};
        --theme-success: ${theme.colors.success};
        --theme-warning: ${theme.colors.warning};
        --theme-error: ${theme.colors.error};
        --theme-water: ${theme.colors.water};
        --theme-neon-cyan: ${theme.colors.neon.cyan};
        --theme-neon-magenta: ${theme.colors.neon.magenta};
        --theme-neon-yellow: ${theme.colors.neon.yellow};
        --theme-neon-orange: ${theme.colors.neon.orange};
        
        --font-primary: ${theme.fonts.primary};
        --font-secondary: ${theme.fonts.secondary};
        --font-display: ${theme.fonts.display};
        
        --button-bg: ${theme.ui.button.background};
        --button-bg-hover: ${theme.ui.button.backgroundHover};
        --button-bg-active: ${theme.ui.button.backgroundActive};
        --button-text: ${theme.ui.button.text};
        --button-border: ${theme.ui.button.border};
        --button-radius: ${theme.ui.button.borderRadius}px;
        --button-shadow: ${theme.ui.button.shadow};
        
        --modal-bg: ${theme.ui.modal.background};
        --modal-overlay: ${theme.ui.modal.overlay};
        --modal-border: ${theme.ui.modal.border};
        --modal-radius: ${theme.ui.modal.borderRadius}px;
        --modal-shadow: ${theme.ui.modal.shadow};
      }

      .game-container {
        background-color: var(--theme-background);
        color: var(--theme-text);
        font-family: var(--font-primary);
      }

      .game-button {
        background-color: var(--button-bg);
        color: var(--button-text);
        border: 2px solid var(--button-border);
        border-radius: var(--button-radius);
        box-shadow: var(--button-shadow);
        font-family: var(--font-primary);
        transition: all 0.2s ease;
      }

      .game-button:hover {
        background-color: var(--button-bg-hover);
        transform: translateY(-2px);
      }

      .game-button:active {
        background-color: var(--button-bg-active);
        transform: translateY(0);
      }

      .game-modal {
        background-color: var(--modal-bg);
        border: 3px solid var(--modal-border);
        border-radius: var(--modal-radius);
        box-shadow: var(--modal-shadow);
      }

      .game-text-neon {
        color: var(--theme-neon-cyan);
        text-shadow: 
          0 0 5px var(--theme-neon-cyan),
          0 0 10px var(--theme-neon-cyan),
          0 0 15px var(--theme-neon-cyan);
        font-family: var(--font-display);
        font-weight: bold;
      }

      .game-text-accent {
        color: var(--theme-accent);
        font-weight: bold;
      }

      .retro-grid {
        background-image: 
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
      }
    `;

    this.styleSheet.textContent = css;
  }

  /**
   * Apply theme to HTML canvas element
   */
  public applyCanvasTheme(canvas: HTMLCanvasElement): void {
    const theme = this.currentTheme;
    canvas.style.backgroundColor = theme.colors.background;
    
    // Add theme classes to canvas container
    const container = canvas.parentElement;
    if (container) {
      container.classList.add('game-container');
      if (theme.name === 'retro-dam') {
        container.classList.add('retro-grid');
      }
    }
  }

  /**
   * Get random wood color from theme
   */
  public getRandomWoodColor(): string {
    const woodColors = this.currentTheme.colors.wood;
    return woodColors[Math.floor(Math.random() * woodColors.length)];
  }

  /**
   * Get random leaf color from theme
   */
  public getRandomLeafColor(): string {
    const leafColors = this.currentTheme.colors.leaves;
    return leafColors[Math.floor(Math.random() * leafColors.length)];
  }

  /**
   * Convert hex color to Phaser color number
   */
  public hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Get contrasting text color for a background
   */
  public getContrastingTextColor(backgroundColor: string): string {
    // Simple contrast calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.styleSheet && this.styleSheet.parentNode) {
      this.styleSheet.parentNode.removeChild(this.styleSheet);
    }
    this.themes.clear();
  }
}