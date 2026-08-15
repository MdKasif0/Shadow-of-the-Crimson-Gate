/**
 * Shared TypeScript types for the application.
 */

/** A mountable page component */
export interface PageComponent {
  /** Render the page into the given container */
  render(container: HTMLElement): void;
  /** Clean up event listeners and DOM when leaving the page */
  destroy(): void;
}

/** Route definition for the client-side router */
export interface Route {
  /** URL hash path, e.g. '' for home, 'game' for /game */
  path: string;
  /** Factory that creates the page component */
  component: () => PageComponent;
}

/** Navigation item */
export interface NavItem {
  label: string;
  id: string;
  overlayId: string;
}
