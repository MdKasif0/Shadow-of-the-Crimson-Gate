/**
 * Game Page (Placeholder)
 *
 * Minimal dark cinematic placeholder for the future Phaser 3 game.
 * Displays a "Game Loading..." state and a back button.
 *
 * The actual Phaser game will be initialized here in a future step.
 */

import type { PageComponent } from '../types/index';
import { ROUTES, PHASER_CONFIG } from '../utils/constants';
import { createPhaserGame } from '../game/Game';
import type Phaser from 'phaser';

function navigateHome(): void {
  window.location.hash = `#/${ROUTES.HOME}`;
}

export function createGamePage(): PageComponent {
  let backButton: HTMLButtonElement | null = null;
  let gameInstance: Phaser.Game | null = null;

  return {
    render(container: HTMLElement): void {
      const page = document.createElement('main');
      page.className = 'page-enter';
      page.id = 'game-page';

      // Full screen container for the game + an absolute positioned back button overlay
      page.innerHTML = `
        <div style="width: 100vw; height: 100dvh; overflow: hidden; background: #000; position: relative;">
          <div id="${PHASER_CONFIG.PARENT_ID}" aria-label="Game canvas container" style="width: 100%; height: 100%;"></div>
          
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

      // Boot Phaser
      gameInstance = createPhaserGame(PHASER_CONFIG.PARENT_ID);
    },

    destroy(): void {
      if (backButton) {
        backButton.removeEventListener('click', navigateHome);
        backButton = null;
      }

      if (gameInstance) {
        gameInstance.destroy(true);
        gameInstance = null;
      }

      const page = document.getElementById('game-page');
      if (page) {
        page.remove();
      }
    },
  };
}
