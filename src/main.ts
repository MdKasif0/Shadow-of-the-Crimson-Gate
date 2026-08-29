/**
 * Application Entry Point
 *
 * Boots the GameStateManager, SaveManager, and SettingsManager.
 * Manages the top-level DOM nodes for the cinematic menu (Hero) and the 3D game.
 */

import './styles/global.css';
import './styles/hero.css';

import { GameStateManager } from './game/state/GameStateManager';
import { GameState } from './game/state/GameState';
import { renderHero } from './components/Hero';
import { init3DGame, ThreeGame } from './game/Game';
import { SaveManager } from './game/save/SaveManager';
import { SettingsManager } from './game/settings/SettingsManager';
import { AudioManager } from './game/audio/AudioManager';
import { EventBus } from './game/core/EventBus';

let gameInstance: ThreeGame | null = null;
let heroCleanup: (() => void) | null = null;

function init(): void {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('[App] Could not find #app container.');
    return;
  }

  // Initialize managers
  SettingsManager.getInstance();
  SaveManager.getInstance();
  AudioManager.init();
  const stateManager = GameStateManager.getInstance();

  // Create containers
  const menuContainer = document.createElement('div');
  menuContainer.id = 'menu-container';
  menuContainer.style.position = 'absolute';
  menuContainer.style.inset = '0';
  menuContainer.style.zIndex = '100'; // Above game

  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';
  gameContainer.style.position = 'absolute';
  gameContainer.style.inset = '0';
  gameContainer.style.zIndex = '1';

  appContainer.appendChild(gameContainer);
  appContainer.appendChild(menuContainer);

  // Initialize 3D game immediately (it will render behind the menu, or we can pause it)
  gameInstance = init3DGame('game-container');

  // Handle State Changes
  EventBus.on('gameStateChanged', (data: { previous: GameState | null, current: GameState }) => {
    if (data.current === GameState.MAIN_MENU) {
      menuContainer.style.display = 'block';
      if (!heroCleanup) {
        menuContainer.innerHTML = '';
        heroCleanup = renderHero(menuContainer);
      }
    } else {
      // Any other state (PLAYING, PAUSED, etc) -> hide menu
      menuContainer.style.display = 'none';
      if (heroCleanup) {
        heroCleanup();
        heroCleanup = null;
        menuContainer.innerHTML = '';
      }
    }
  });

  // Start in Main Menu
  stateManager.setState(GameState.MAIN_MENU);

  if (stateManager.getState() === GameState.MAIN_MENU) {
    menuContainer.style.display = 'block';
    if (!heroCleanup) {
      menuContainer.innerHTML = '';
      heroCleanup = renderHero(menuContainer);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
