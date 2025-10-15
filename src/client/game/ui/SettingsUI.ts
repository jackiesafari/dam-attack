import { SettingsManager, SettingsCategory, GameSettings } from '../managers/SettingsManager';

export interface SettingsUIConfig {
  width: number;
  height: number;
  tabHeight: number;
  itemHeight: number;
  itemSpacing: number;
}

export class SettingsUI {
  private scene: Phaser.Scene;
  private settingsManager: SettingsManager;
  private container: Phaser.GameObjects.Container | null = null;
  private config: SettingsUIConfig;
  private currentTab: SettingsCategory = 'visual';
  private scrollContainer: Phaser.GameObjects.Container | null = null;
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  constructor(scene: Phaser.Scene, settingsManager: SettingsManager, config?: Partial<SettingsUIConfig>) {
    this.scene = scene;
    this.settingsManager = settingsManager;
    this.config = {
      width: 800,
      height: 600,
      tabHeight: 50,
      itemHeight: 60,
      itemSpacing: 10,
      ...config
    };
  }

  /**
   * Show settings panel
   */
  public show(): void {
    this.createPanel();
  }

  /**
   * Hide settings panel
   */
  public hide(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.scrollContainer = null;
    }
  }

  /**
   * Create the main settings panel
   */
  private createPanel(): void {
    if (this.container) {
      this.container.destroy();
    }

    const camera = this.scene.cameras.main;
    this.container = this.scene.add.container(camera.width / 2, camera.height / 2);
    this.container.setDepth(100);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.lineStyle(2, 0x444444, 1);
    bg.fillRoundedRect(-this.config.width / 2, -this.config.height / 2, this.config.width, this.config.height, 15);
    bg.strokeRoundedRect(-this.config.width / 2, -this.config.height / 2, this.config.width, this.config.height, 15);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(0, -this.config.height / 2 + 30, 'SETTINGS', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    // Create tabs
    this.createTabs();

    // Create settings content
    this.createSettingsContent();

    // Create action buttons
    this.createActionButtons();

    // Close button
    this.createCloseButton();
  }

  /**
   * Create category tabs
   */
  private createTabs(): void {
    if (!this.container) return;

    const categories: { key: SettingsCategory; label: string; icon: string }[] = [
      { key: 'visual', label: 'Visual', icon: '🎨' },
      { key: 'audio', label: 'Audio', icon: '🔊' },
      { key: 'gameplay', label: 'Gameplay', icon: '🎮' },
      { key: 'controls', label: 'Controls', icon: '⌨️' },
      { key: 'accessibility', label: 'Access', icon: '♿' },
      { key: 'performance', label: 'Performance', icon: '⚡' }
    ];

    const tabWidth = 120;
    const startX = -(categories.length * tabWidth) / 2 + tabWidth / 2;
    const tabY = -this.config.height / 2 + 80;

    categories.forEach((category, index) => {
      const x = startX + (index * tabWidth);
      const isActive = this.currentTab === category.key;
      
      const tabBg = this.scene.add.graphics();
      const bgColor = isActive ? 0x4CAF50 : 0x333333;
      const borderColor = isActive ? 0x66BB6A : 0x555555;
      
      tabBg.fillStyle(bgColor, 1);
      tabBg.lineStyle(2, borderColor, 1);
      tabBg.fillRoundedRect(x - 55, tabY - 20, 110, 40, 8);
      tabBg.strokeRoundedRect(x - 55, tabY - 20, 110, 40, 8);
      tabBg.setInteractive(new Phaser.Geom.Rectangle(x - 55, tabY - 20, 110, 40), Phaser.Geom.Rectangle.Contains);

      const iconText = this.scene.add.text(x, tabY - 8, category.icon, {
        fontSize: '16px'
      }).setOrigin(0.5);

      const labelText = this.scene.add.text(x, tabY + 8, category.label, {
        fontSize: '10px',
        color: isActive ? '#000000' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      tabBg.on('pointerdown', () => {
        this.currentTab = category.key;
        this.scrollY = 0;
        this.createPanel(); // Refresh panel
      });

      tabBg.on('pointerover', () => {
        if (!isActive) {
          tabBg.clear();
          tabBg.fillStyle(0x555555, 1);
          tabBg.lineStyle(2, 0x777777, 1);
          tabBg.fillRoundedRect(x - 55, tabY - 20, 110, 40, 8);
          tabBg.strokeRoundedRect(x - 55, tabY - 20, 110, 40, 8);
        }
      });

      tabBg.on('pointerout', () => {
        if (!isActive) {
          tabBg.clear();
          tabBg.fillStyle(0x333333, 1);
          tabBg.lineStyle(2, 0x555555, 1);
          tabBg.fillRoundedRect(x - 55, tabY - 20, 110, 40, 8);
          tabBg.strokeRoundedRect(x - 55, tabY - 20, 110, 40, 8);
        }
      });

      this.container!.add(tabBg);
      this.container!.add(iconText);
      this.container!.add(labelText);
    });
  }

  /**
   * Create settings content for current tab
   */
  private createSettingsContent(): void {
    if (!this.container) return;

    // Create scroll container
    this.scrollContainer = this.scene.add.container(0, -50);
    this.container.add(this.scrollContainer);

    // Create mask for scrolling
    const maskShape = this.scene.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(-this.config.width / 2 + 20, -200, this.config.width - 40, 350);
    const mask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(mask);

    const schema = this.settingsManager.getSettingsSchema();
    const categorySchema = schema[this.currentTab];
    const settings = this.settingsManager.getSettings();

    let yOffset = this.scrollY;
    const items: Phaser.GameObjects.GameObject[] = [];

    Object.keys(categorySchema).forEach((key) => {
      const setting = categorySchema[key];
      const currentValue = this.getNestedValue(settings[this.currentTab], key);
      
      const item = this.createSettingItem(key, setting, currentValue, yOffset);
      items.push(...item);
      yOffset += this.config.itemHeight + this.config.itemSpacing;
    });

    items.forEach(item => this.scrollContainer!.add(item));

    // Calculate max scroll
    this.maxScrollY = Math.max(0, yOffset - 300);

    // Add scroll wheel support
    this.setupScrolling();
  }

  /**
   * Create individual setting item
   */
  private createSettingItem(
    key: string, 
    setting: any, 
    currentValue: any, 
    y: number
  ): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];

    // Background
    const itemBg = this.scene.add.graphics();
    itemBg.fillStyle(0x1a1a1a, 1);
    itemBg.lineStyle(1, 0x333333, 1);
    itemBg.fillRoundedRect(-350, y - 25, 700, 50, 5);
    itemBg.strokeRoundedRect(-350, y - 25, 700, 50, 5);
    items.push(itemBg);

    // Label
    const label = this.scene.add.text(-330, y, setting.label, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    items.push(label);

    // Control based on type
    switch (setting.type) {
      case 'boolean':
        const toggle = this.createToggle(key, currentValue, 250, y);
        items.push(...toggle);
        break;
      
      case 'number':
        const slider = this.createSlider(key, setting, currentValue, 150, y);
        items.push(...slider);
        break;
      
      case 'select':
        const dropdown = this.createDropdown(key, setting, currentValue, 200, y);
        items.push(...dropdown);
        break;
    }

    return items;
  }

  /**
   * Create toggle control
   */
  private createToggle(key: string, value: boolean, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];

    // Toggle background
    const toggleBg = this.scene.add.graphics();
    const bgColor = value ? 0x4CAF50 : 0x666666;
    toggleBg.fillStyle(bgColor, 1);
    toggleBg.fillRoundedRect(x, y - 10, 50, 20, 10);
    toggleBg.setInteractive(new Phaser.Geom.Rectangle(x, y - 10, 50, 20), Phaser.Geom.Rectangle.Contains);
    items.push(toggleBg);

    // Toggle handle
    const handleX = value ? x + 30 : x + 10;
    const toggleHandle = this.scene.add.graphics();
    toggleHandle.fillStyle(0xffffff, 1);
    toggleHandle.fillCircle(handleX, y, 8);
    items.push(toggleHandle);

    // Toggle interaction
    toggleBg.on('pointerdown', () => {
      const newValue = !value;
      this.updateSetting(key, newValue);
      this.createPanel(); // Refresh to show new state
    });

    return items;
  }

  /**
   * Create slider control
   */
  private createSlider(key: string, setting: any, value: number, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    const sliderWidth = 150;
    const min = setting.min || 0;
    const max = setting.max || 1;
    const normalizedValue = (value - min) / (max - min);

    // Slider track
    const track = this.scene.add.graphics();
    track.fillStyle(0x333333, 1);
    track.fillRoundedRect(x, y - 3, sliderWidth, 6, 3);
    items.push(track);

    // Slider fill
    const fill = this.scene.add.graphics();
    fill.fillStyle(0x4CAF50, 1);
    fill.fillRoundedRect(x, y - 3, sliderWidth * normalizedValue, 6, 3);
    items.push(fill);

    // Slider handle
    const handleX = x + (sliderWidth * normalizedValue);
    const handle = this.scene.add.graphics();
    handle.fillStyle(0xffffff, 1);
    handle.fillCircle(handleX, y, 8);
    handle.setInteractive(new Phaser.Geom.Circle(handleX, y, 8), Phaser.Geom.Circle.Contains);
    items.push(handle);

    // Value display
    const valueText = this.scene.add.text(x + sliderWidth + 20, y, value.toFixed(setting.step < 1 ? 1 : 0), {
      fontSize: '14px',
      color: '#cccccc'
    }).setOrigin(0, 0.5);
    items.push(valueText);

    // Slider interaction
    let isDragging = false;
    
    handle.on('pointerdown', () => {
      isDragging = true;
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const localX = pointer.x - this.container!.x - x;
        const clampedX = Phaser.Math.Clamp(localX, 0, sliderWidth);
        const newNormalizedValue = clampedX / sliderWidth;
        const newValue = min + (newNormalizedValue * (max - min));
        const steppedValue = setting.step ? Math.round(newValue / setting.step) * setting.step : newValue;
        
        this.updateSetting(key, steppedValue);
        this.createPanel(); // Refresh to show new state
      }
    });

    this.scene.input.on('pointerup', () => {
      isDragging = false;
    });

    return items;
  }

  /**
   * Create dropdown control
   */
  private createDropdown(key: string, setting: any, value: any, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];

    // Dropdown background
    const dropdownBg = this.scene.add.graphics();
    dropdownBg.fillStyle(0x333333, 1);
    dropdownBg.lineStyle(1, 0x666666, 1);
    dropdownBg.fillRoundedRect(x, y - 15, 150, 30, 5);
    dropdownBg.strokeRoundedRect(x, y - 15, 150, 30, 5);
    dropdownBg.setInteractive(new Phaser.Geom.Rectangle(x, y - 15, 150, 30), Phaser.Geom.Rectangle.Contains);
    items.push(dropdownBg);

    // Current value text
    const currentOption = setting.options.find((opt: any) => opt.value === value);
    const valueText = this.scene.add.text(x + 10, y, currentOption?.label || 'Unknown', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    items.push(valueText);

    // Dropdown arrow
    const arrow = this.scene.add.text(x + 130, y, '▼', {
      fontSize: '12px',
      color: '#cccccc'
    }).setOrigin(0.5);
    items.push(arrow);

    // Dropdown interaction (simplified - would need full dropdown menu implementation)
    dropdownBg.on('pointerdown', () => {
      // Cycle through options for now
      const currentIndex = setting.options.findIndex((opt: any) => opt.value === value);
      const nextIndex = (currentIndex + 1) % setting.options.length;
      const newValue = setting.options[nextIndex].value;
      
      this.updateSetting(key, newValue);
      this.createPanel(); // Refresh to show new state
    });

    return items;
  }

  /**
   * Setup scrolling for settings content
   */
  private setupScrolling(): void {
    if (!this.container || !this.scrollContainer) return;

    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      if (this.container && this.scrollContainer) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY * 0.5, -this.maxScrollY, 0);
        this.scrollContainer.y = -50 + this.scrollY;
      }
    });
  }

  /**
   * Create action buttons (Reset, Import, Export)
   */
  private createActionButtons(): void {
    if (!this.container) return;

    const buttonY = this.config.height / 2 - 60;
    const buttons = [
      { text: 'Reset Category', x: -200, action: () => this.resetCategory() },
      { text: 'Reset All', x: -50, action: () => this.resetAll() },
      { text: 'Export', x: 100, action: () => this.exportSettings() },
      { text: 'Import', x: 200, action: () => this.importSettings() }
    ];

    buttons.forEach(button => {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x666666, 1);
      bg.lineStyle(2, 0x888888, 1);
      bg.fillRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
      bg.strokeRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
      bg.setInteractive(new Phaser.Geom.Rectangle(button.x - 40, buttonY - 15, 80, 30), Phaser.Geom.Rectangle.Contains);

      const text = this.scene.add.text(button.x, buttonY, button.text, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      bg.on('pointerdown', button.action);

      bg.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x888888, 1);
        bg.lineStyle(2, 0xaaaaaa, 1);
        bg.fillRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
        bg.strokeRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
      });

      bg.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x666666, 1);
        bg.lineStyle(2, 0x888888, 1);
        bg.fillRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
        bg.strokeRoundedRect(button.x - 40, buttonY - 15, 80, 30, 5);
      });

      this.container.add(bg);
      this.container.add(text);
    });
  }

  /**
   * Create close button
   */
  private createCloseButton(): void {
    if (!this.container) return;

    const closeButton = this.scene.add.graphics();
    closeButton.fillStyle(0x666666, 1);
    closeButton.lineStyle(2, 0x888888, 1);
    closeButton.fillRoundedRect(this.config.width / 2 - 50, -this.config.height / 2 + 10, 40, 40, 5);
    closeButton.strokeRoundedRect(this.config.width / 2 - 50, -this.config.height / 2 + 10, 40, 40, 5);
    closeButton.setInteractive(new Phaser.Geom.Rectangle(this.config.width / 2 - 50, -this.config.height / 2 + 10, 40, 40), Phaser.Geom.Rectangle.Contains);

    const closeText = this.scene.add.text(this.config.width / 2 - 30, -this.config.height / 2 + 30, '×', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeButton.on('pointerdown', () => {
      this.hide();
    });

    this.container.add(closeButton);
    this.container.add(closeText);
  }

  /**
   * Update a setting value
   */
  private updateSetting(key: string, value: any): void {
    if (key.includes('.')) {
      // Handle nested keys like 'touch.enabled'
      const [parentKey, childKey] = key.split('.');
      const currentSettings = this.settingsManager.getSettings();
      const updatedCategory = {
        ...currentSettings[this.currentTab],
        [parentKey]: {
          ...(currentSettings[this.currentTab] as any)[parentKey],
          [childKey]: value
        }
      };
      this.settingsManager.updateSettings({ [this.currentTab]: updatedCategory });
    } else {
      this.settingsManager.setSetting(this.currentTab, key as any, value);
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, key: string): any {
    if (key.includes('.')) {
      const [parentKey, childKey] = key.split('.');
      return obj[parentKey]?.[childKey];
    }
    return obj[key];
  }

  /**
   * Reset current category
   */
  private resetCategory(): void {
    this.settingsManager.resetCategory(this.currentTab);
    this.createPanel();
  }

  /**
   * Reset all settings
   */
  private resetAll(): void {
    this.settingsManager.resetToDefaults();
    this.createPanel();
  }

  /**
   * Export settings
   */
  private exportSettings(): void {
    const settingsJson = this.settingsManager.exportSettings();
    // In a real implementation, this would open a save dialog or copy to clipboard
    console.log('Settings exported:', settingsJson);
    // For now, just show a toast message
    this.showToast('Settings exported to console');
  }

  /**
   * Import settings
   */
  private importSettings(): void {
    // In a real implementation, this would open a file dialog
    // For now, just show a toast message
    this.showToast('Import feature would open file dialog');
  }

  /**
   * Show toast message
   */
  private showToast(message: string): void {
    if (!this.container) return;

    const toast = this.scene.add.container(0, this.config.height / 2 - 100);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x333333, 0.9);
    bg.fillRoundedRect(-100, -15, 200, 30, 5);
    toast.add(bg);

    const text = this.scene.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    toast.add(text);

    this.container.add(toast);

    // Fade out after 2 seconds
    this.scene.tweens.add({
      targets: toast,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => toast.destroy()
    });
  }

  /**
   * Check if panel is visible
   */
  public isVisible(): boolean {
    return this.container !== null;
  }

  /**
   * Update layout on screen resize
   */
  public updateLayout(): void {
    if (this.container) {
      const camera = this.scene.cameras.main;
      this.container.setPosition(camera.width / 2, camera.height / 2);
    }
  }

  /**
   * Destroy the UI
   */
  public destroy(): void {
    this.hide();
  }
}