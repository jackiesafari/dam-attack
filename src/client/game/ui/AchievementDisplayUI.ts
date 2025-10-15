import { Achievement, AchievementCategory, AchievementRarity } from '../types/GameTypes';

export interface AchievementDisplayConfig {
  itemHeight: number;
  itemSpacing: number;
  itemsPerPage: number;
  categoryColors: Record<AchievementCategory, number>;
}

export class AchievementDisplayUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private config: AchievementDisplayConfig;
  private achievements: Achievement[] = [];
  private currentPage: number = 0;
  private currentCategory: AchievementCategory | 'all' = 'all';
  private scrollContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, config?: Partial<AchievementDisplayConfig>) {
    this.scene = scene;
    this.config = {
      itemHeight: 80,
      itemSpacing: 10,
      itemsPerPage: 6,
      categoryColors: {
        [AchievementCategory.SCORING]: 0xffd700,
        [AchievementCategory.LINES]: 0x4caf50,
        [AchievementCategory.SURVIVAL]: 0xff5722,
        [AchievementCategory.SKILL]: 0x9c27b0,
        [AchievementCategory.SPECIAL]: 0x2196f3
      },
      ...config
    };
  }

  /**
   * Show achievements panel
   */
  public show(achievements: Achievement[]): void {
    this.achievements = achievements;
    this.currentPage = 0;
    this.createPanel();
  }

  /**
   * Hide achievements panel
   */
  public hide(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
      this.scrollContainer = null;
    }
  }

  /**
   * Create the main achievements panel
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
    bg.fillStyle(0x000000, 0.9);
    bg.lineStyle(2, 0x444444, 1);
    bg.fillRoundedRect(-400, -300, 800, 600, 15);
    bg.strokeRoundedRect(-400, -300, 800, 600, 15);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(0, -260, 'ACHIEVEMENTS', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    // Progress summary
    this.createProgressSummary();

    // Category filters
    this.createCategoryFilters();

    // Achievement list
    this.createAchievementList();

    // Close button
    this.createCloseButton();

    // Navigation buttons
    this.createNavigationButtons();
  }

  /**
   * Create progress summary
   */
  private createProgressSummary(): void {
    if (!this.container) return;

    const unlocked = this.achievements.filter(a => a.unlocked).length;
    const total = this.achievements.length;
    const percentage = Math.round((unlocked / total) * 100);
    const points = this.achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + (a.reward?.points || 0), 0);

    const progressText = this.scene.add.text(0, -220, 
      `${unlocked}/${total} Unlocked (${percentage}%) • ${points} Points`, {
      fontSize: '16px',
      color: '#cccccc'
    }).setOrigin(0.5);
    this.container.add(progressText);

    // Progress bar
    const progressBg = this.scene.add.graphics();
    progressBg.fillStyle(0x333333, 1);
    progressBg.fillRoundedRect(-200, -195, 400, 10, 5);
    this.container.add(progressBg);

    const progressFill = this.scene.add.graphics();
    progressFill.fillStyle(0x4caf50, 1);
    progressFill.fillRoundedRect(-200, -195, 400 * (percentage / 100), 10, 5);
    this.container.add(progressFill);
  }

  /**
   * Create category filter buttons
   */
  private createCategoryFilters(): void {
    if (!this.container) return;

    const categories: (AchievementCategory | 'all')[] = [
      'all',
      AchievementCategory.SCORING,
      AchievementCategory.LINES,
      AchievementCategory.SURVIVAL,
      AchievementCategory.SKILL,
      AchievementCategory.SPECIAL
    ];

    const buttonWidth = 120;
    const startX = -(categories.length * buttonWidth) / 2 + buttonWidth / 2;

    categories.forEach((category, index) => {
      const x = startX + (index * buttonWidth);
      const isActive = this.currentCategory === category;
      
      const button = this.scene.add.graphics();
      const color = category === 'all' ? 0x666666 : this.config.categoryColors[category as AchievementCategory];
      
      button.fillStyle(isActive ? color : 0x333333, 1);
      button.lineStyle(2, color, 1);
      button.fillRoundedRect(x - 50, -160, 100, 30, 5);
      button.strokeRoundedRect(x - 50, -160, 100, 30, 5);
      button.setInteractive(new Phaser.Geom.Rectangle(x - 50, -160, 100, 30), Phaser.Geom.Rectangle.Contains);
      
      const text = this.scene.add.text(x, -145, 
        category === 'all' ? 'ALL' : category.toUpperCase(), {
        fontSize: '12px',
        color: isActive ? '#000000' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      button.on('pointerdown', () => {
        this.currentCategory = category;
        this.currentPage = 0;
        this.createPanel(); // Refresh panel
      });

      button.on('pointerover', () => {
        button.clear();
        button.fillStyle(color, 0.8);
        button.lineStyle(2, color, 1);
        button.fillRoundedRect(x - 50, -160, 100, 30, 5);
        button.strokeRoundedRect(x - 50, -160, 100, 30, 5);
      });

      button.on('pointerout', () => {
        button.clear();
        button.fillStyle(isActive ? color : 0x333333, 1);
        button.lineStyle(2, color, 1);
        button.fillRoundedRect(x - 50, -160, 100, 30, 5);
        button.strokeRoundedRect(x - 50, -160, 100, 30, 5);
      });

      this.container!.add(button);
      this.container!.add(text);
    });
  }

  /**
   * Create achievement list
   */
  private createAchievementList(): void {
    if (!this.container) return;

    // Filter achievements by category
    const filteredAchievements = this.currentCategory === 'all' 
      ? this.achievements 
      : this.achievements.filter(a => a.category === this.currentCategory);

    // Create scroll container
    this.scrollContainer = this.scene.add.container(0, -50);
    this.container.add(this.scrollContainer);

    // Calculate pagination
    const startIndex = this.currentPage * this.config.itemsPerPage;
    const endIndex = Math.min(startIndex + this.config.itemsPerPage, filteredAchievements.length);
    const pageAchievements = filteredAchievements.slice(startIndex, endIndex);

    // Create achievement items
    pageAchievements.forEach((achievement, index) => {
      const y = index * (this.config.itemHeight + this.config.itemSpacing);
      this.createAchievementItem(achievement, y);
    });
  }

  /**
   * Create individual achievement item
   */
  private createAchievementItem(achievement: Achievement, y: number): void {
    if (!this.scrollContainer) return;

    const itemContainer = this.scene.add.container(0, y);
    
    // Background
    const bg = this.scene.add.graphics();
    const bgColor = achievement.unlocked ? 0x1a1a1a : 0x0a0a0a;
    const borderColor = achievement.unlocked 
      ? this.getRarityColor(achievement.rarity)
      : 0x333333;
    
    bg.fillStyle(bgColor, 1);
    bg.lineStyle(2, borderColor, achievement.unlocked ? 1 : 0.5);
    bg.fillRoundedRect(-350, -35, 700, 70, 8);
    bg.strokeRoundedRect(-350, -35, 700, 70, 8);
    itemContainer.add(bg);

    // Icon
    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(borderColor, achievement.unlocked ? 0.3 : 0.1);
    iconBg.fillCircle(-300, 0, 25);
    itemContainer.add(iconBg);

    const iconText = this.scene.add.text(-300, 0, achievement.icon, {
      fontSize: '24px',
      color: achievement.unlocked ? '#ffffff' : '#666666'
    }).setOrigin(0.5);
    itemContainer.add(iconText);

    // Achievement info
    const nameColor = achievement.unlocked ? '#ffffff' : '#888888';
    const descColor = achievement.unlocked ? '#cccccc' : '#555555';

    const nameText = this.scene.add.text(-250, -15, achievement.name, {
      fontSize: '18px',
      color: nameColor,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    itemContainer.add(nameText);

    const descText = this.scene.add.text(-250, 5, achievement.description, {
      fontSize: '14px',
      color: descColor,
      wordWrap: { width: 400 }
    }).setOrigin(0, 0.5);
    itemContainer.add(descText);

    // Progress bar (for locked achievements)
    if (!achievement.unlocked && achievement.progress > 0) {
      const progressBg = this.scene.add.graphics();
      progressBg.fillStyle(0x333333, 1);
      progressBg.fillRoundedRect(-250, 20, 200, 8, 4);
      itemContainer.add(progressBg);

      const progressFill = this.scene.add.graphics();
      progressFill.fillStyle(borderColor, 0.7);
      const progressWidth = 200 * (achievement.progress / achievement.maxProgress);
      progressFill.fillRoundedRect(-250, 20, progressWidth, 8, 4);
      itemContainer.add(progressFill);

      const progressText = this.scene.add.text(-40, 24, 
        `${achievement.progress}/${achievement.maxProgress}`, {
        fontSize: '10px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      itemContainer.add(progressText);
    }

    // Rarity and points
    const rarityText = this.scene.add.text(300, -15, achievement.rarity.toUpperCase(), {
      fontSize: '12px',
      color: this.getRarityColorHex(achievement.rarity),
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    itemContainer.add(rarityText);

    if (achievement.reward?.points) {
      const pointsText = this.scene.add.text(300, 5, `${achievement.reward.points} pts`, {
        fontSize: '14px',
        color: achievement.unlocked ? '#ffdd44' : '#666666'
      }).setOrigin(1, 0.5);
      itemContainer.add(pointsText);
    }

    // Unlock date (for unlocked achievements)
    if (achievement.unlocked && achievement.unlockedAt) {
      const date = new Date(achievement.unlockedAt);
      const dateText = this.scene.add.text(300, 20, date.toLocaleDateString(), {
        fontSize: '10px',
        color: '#888888'
      }).setOrigin(1, 0.5);
      itemContainer.add(dateText);
    }

    this.scrollContainer.add(itemContainer);
  }

  /**
   * Create navigation buttons
   */
  private createNavigationButtons(): void {
    if (!this.container) return;

    const filteredAchievements = this.currentCategory === 'all' 
      ? this.achievements 
      : this.achievements.filter(a => a.category === this.currentCategory);
    
    const totalPages = Math.ceil(filteredAchievements.length / this.config.itemsPerPage);

    if (totalPages <= 1) return;

    // Previous button
    if (this.currentPage > 0) {
      const prevButton = this.scene.add.graphics();
      prevButton.fillStyle(0x444444, 1);
      prevButton.lineStyle(2, 0x666666, 1);
      prevButton.fillRoundedRect(-100, 240, 80, 30, 5);
      prevButton.strokeRoundedRect(-100, 240, 80, 30, 5);
      prevButton.setInteractive(new Phaser.Geom.Rectangle(-100, 240, 80, 30), Phaser.Geom.Rectangle.Contains);

      const prevText = this.scene.add.text(-60, 255, 'PREV', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      prevButton.on('pointerdown', () => {
        this.currentPage--;
        this.createPanel();
      });

      this.container.add(prevButton);
      this.container.add(prevText);
    }

    // Next button
    if (this.currentPage < totalPages - 1) {
      const nextButton = this.scene.add.graphics();
      nextButton.fillStyle(0x444444, 1);
      nextButton.lineStyle(2, 0x666666, 1);
      nextButton.fillRoundedRect(20, 240, 80, 30, 5);
      nextButton.strokeRoundedRect(20, 240, 80, 30, 5);
      nextButton.setInteractive(new Phaser.Geom.Rectangle(20, 240, 80, 30), Phaser.Geom.Rectangle.Contains);

      const nextText = this.scene.add.text(60, 255, 'NEXT', {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      nextButton.on('pointerdown', () => {
        this.currentPage++;
        this.createPanel();
      });

      this.container.add(nextButton);
      this.container.add(nextText);
    }

    // Page indicator
    const pageText = this.scene.add.text(0, 255, `${this.currentPage + 1} / ${totalPages}`, {
      fontSize: '14px',
      color: '#cccccc'
    }).setOrigin(0.5);
    this.container.add(pageText);
  }

  /**
   * Create close button
   */
  private createCloseButton(): void {
    if (!this.container) return;

    const closeButton = this.scene.add.graphics();
    closeButton.fillStyle(0x666666, 1);
    closeButton.lineStyle(2, 0x888888, 1);
    closeButton.fillRoundedRect(350, -290, 40, 40, 5);
    closeButton.strokeRoundedRect(350, -290, 40, 40, 5);
    closeButton.setInteractive(new Phaser.Geom.Rectangle(350, -290, 40, 40), Phaser.Geom.Rectangle.Contains);

    const closeText = this.scene.add.text(370, -270, '×', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeButton.on('pointerdown', () => {
      this.hide();
    });

    closeButton.on('pointerover', () => {
      closeButton.clear();
      closeButton.fillStyle(0x888888, 1);
      closeButton.lineStyle(2, 0xaaaaaa, 1);
      closeButton.fillRoundedRect(350, -290, 40, 40, 5);
      closeButton.strokeRoundedRect(350, -290, 40, 40, 5);
    });

    closeButton.on('pointerout', () => {
      closeButton.clear();
      closeButton.fillStyle(0x666666, 1);
      closeButton.lineStyle(2, 0x888888, 1);
      closeButton.fillRoundedRect(350, -290, 40, 40, 5);
      closeButton.strokeRoundedRect(350, -290, 40, 40, 5);
    });

    this.container.add(closeButton);
    this.container.add(closeText);
  }

  /**
   * Get color for achievement rarity
   */
  private getRarityColor(rarity: AchievementRarity): number {
    switch (rarity) {
      case AchievementRarity.COMMON: return 0x9e9e9e;
      case AchievementRarity.UNCOMMON: return 0x4caf50;
      case AchievementRarity.RARE: return 0x2196f3;
      case AchievementRarity.EPIC: return 0x9c27b0;
      case AchievementRarity.LEGENDARY: return 0xff9800;
      default: return 0xffffff;
    }
  }

  /**
   * Get hex color string for achievement rarity
   */
  private getRarityColorHex(rarity: AchievementRarity): string {
    switch (rarity) {
      case AchievementRarity.COMMON: return '#9e9e9e';
      case AchievementRarity.UNCOMMON: return '#4caf50';
      case AchievementRarity.RARE: return '#2196f3';
      case AchievementRarity.EPIC: return '#9c27b0';
      case AchievementRarity.LEGENDARY: return '#ff9800';
      default: return '#ffffff';
    }
  }

  /**
   * Check if panel is currently visible
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