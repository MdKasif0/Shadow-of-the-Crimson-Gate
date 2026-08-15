/**
 * Application Entry Point
 *
 * Sets up a simple hash-based client-side router and mounts
 * the appropriate page component based on the current URL hash.
 */

import './styles/global.css';
import './styles/hero.css';

import type { PageComponent, Route } from './types/index';
import { ROUTES } from './utils/constants';
import { createHomePage } from './pages/Home';
import { createGamePage } from './pages/Game';

// ─── Route Registry ──────────────────────────────────────────────────────────

const routes: Route[] = [
  {
    path: ROUTES.HOME,
    component: createHomePage,
  },
  {
    path: ROUTES.GAME,
    component: createGamePage,
  },
];

// ─── Router State ────────────────────────────────────────────────────────────

let currentPage: PageComponent | null = null;
let appContainer: HTMLElement | null = null;

/**
 * Extracts the route path from the URL hash.
 * Supports: #/, #/game, etc.
 * Falls back to empty string (home) for bare URLs.
 */
function getHashPath(): string {
  const hash = window.location.hash;

  // No hash or just '#' → home
  if (!hash || hash === '#' || hash === '#/') {
    return '';
  }

  // Strip leading '#/' and return the path segment
  return hash.replace(/^#\/?/, '');
}

/**
 * Finds the matching route for the given path.
 * Returns the home route as fallback.
 */
function findRoute(path: string): Route {
  const match = routes.find((route) => route.path === path);
  return match ?? routes[0]; // Fallback to home
}

/**
 * Handles route changes: destroys the current page and mounts the new one.
 */
function handleRouteChange(): void {
  if (!appContainer) return;

  // Destroy current page
  if (currentPage) {
    currentPage.destroy();
    currentPage = null;
  }

  // Find and mount new page
  const path = getHashPath();
  const route = findRoute(path);
  currentPage = route.component();
  currentPage.render(appContainer);
}

/**
 * Initializes the application.
 */
function init(): void {
  appContainer = document.getElementById('app');

  if (!appContainer) {
    console.error('[App] Could not find #app container.');
    return;
  }

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial route
  handleRouteChange();
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
