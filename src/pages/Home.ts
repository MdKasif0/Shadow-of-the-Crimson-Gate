/**
 * Home Page
 *
 * Landing page for the game website.
 * Composes the cinematic Hero section.
 */

import type { PageComponent } from '../types/index';
import { renderHero } from '../components/Hero';

export function createHomePage(): PageComponent {
  let cleanup: (() => void) | null = null;

  return {
    render(container: HTMLElement): void {
      const page = document.createElement('main');
      page.id = 'home-page';

      cleanup = renderHero(page);
      container.appendChild(page);
    },

    destroy(): void {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      const page = document.getElementById('home-page');
      if (page) {
        page.remove();
      }
    },
  };
}
