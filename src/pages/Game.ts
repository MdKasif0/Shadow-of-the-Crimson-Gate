/**
 * Game Page (Placeholder)
 *
 * Minimal dark cinematic placeholder for the future Phaser 3 game.
 * Displays a "Game Loading..." state and a back button.
 *
 * The actual Phaser game will be initialized here in a future step.
 */

import type { PageComponent } from '../types/index';
import { GAME_TITLE, ROUTES, PHASER_CONFIG } from '../utils/constants';

function navigateHome(): void {
  window.location.hash = `#/${ROUTES.HOME}`;
}

export function createGamePage(): PageComponent {
  let backButton: HTMLButtonElement | null = null;

  return {
    render(container: HTMLElement): void {
      const page = document.createElement('main');
      page.className = 'page-enter';
      page.id = 'game-page';

      page.innerHTML = `
        <div class="game-placeholder">
          <h1 class="game-placeholder__title">${GAME_TITLE}</h1>
          <p class="game-placeholder__status">Game Loading\u2026</p>
          <div id="${PHASER_CONFIG.PARENT_ID}" aria-label="Game canvas container"></div>
          <button
            class="game-placeholder__back"
            id="game-back-button"
            type="button"
            aria-label="Return to home page"
          >
            \u2190 Return
          </button>
        </div>
      `;

      container.appendChild(page);

      backButton = page.querySelector('#game-back-button') as HTMLButtonElement;
      backButton.addEventListener('click', navigateHome);
    },

    destroy(): void {
      if (backButton) {
        backButton.removeEventListener('click', navigateHome);
        backButton = null;
      }

      const page = document.getElementById('game-page');
      if (page) {
        page.remove();
      }
    },
  };
}
