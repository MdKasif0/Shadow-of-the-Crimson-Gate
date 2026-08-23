/**
 * Game Page (Placeholder)
 *
 * Minimal dark cinematic placeholder for the future Phaser 3 game.
 * Displays a "Game Loading..." state and a back button.
 *
 * The actual Phaser game will be initialized here in a future step.
 */

import type { PageComponent } from '../types/index';
import { ROUTES } from '../utils/constants';
import { init3DGame, ThreeGame } from '../game/Game';

const GAME_CONTAINER_ID = 'game-container';


function navigateHome(): void {
  window.location.hash = `#/${ROUTES.HOME}`;
}

export function createGamePage(): PageComponent {
  https://127.0.0.1:55361/static/artifacts/bc0c8793-5d14-4b13-963b-6d8028ce8bce/.user_uploaded/media_1787484900356.jpg?csrf=6767a21f-ea6e-41d9-80bf-0a039d89e3a4
  let backButton: HTMLButtonElement | null = null;
  let gameInstance: ThreeGame | null = null;

  return {
    render(container: HTMLElement): void {
      const page = document.createElement('main');
      page.className = '';
      page.id = 'game-page';

      // Full screen container for the game + an absolute positioned back button overlay
      page.innerHTML = `
        <div style="width: 100vw; height: 100dvh; overflow: hidden; background: #000; position: relative;">
          <div id="${GAME_CONTAINER_ID}" aria-label="Game canvas container" style="width: 100%; height: 100%; overflow: hidden;"></div>
          
          <button
            class="hero-nav__cta"
            id="game-back-button"
            type="button"
            aria-label="Return to Title"
            style="position: absolute; top: 2rem; left: 2rem; z-index: 9999;"
          >
            \u2190 RETURN TO TITLE
          </button>
        </div>
      `;

      container.appendChild(page);

      backButton = page.querySelector('#game-back-button') as HTMLButtonElement;
      backButton.addEventListener('click', navigateHome);

      // Boot Three.js Game
      gameInstance = init3DGame(GAME_CONTAINER_ID);
    },

    destroy(): void {
      if (backButton) {
        backButton.removeEventListener('click', navigateHome);
        backButton = null;
      }

      if (gameInstance) {
        gameInstance.destroy();
        gameInstance = null;
      }

      const page = document.getElementById('game-page');
      if (page) {
        page.remove();
      }
    },
  };
}
