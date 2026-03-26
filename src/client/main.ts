import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure Barlow Condensed is loaded before Phaser renders UI text
  if (document.fonts?.load) {
    try {
      await Promise.race([
        document.fonts.load('16px "Barlow Condensed"'),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch {
      // Ignore font loading errors and continue
    }
  }
  
  StartGame('game-container');
});
