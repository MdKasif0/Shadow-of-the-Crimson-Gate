/**
 * Centralized constants for the application.
 * All magic values, colors, routes, and configuration live here.
 */

import type { NavItem } from '../types/index';

// ─── Game Identity ───────────────────────────────────────────────────────────

export const GAME_TITLE = 'Shadow of the Crimson Gate';
export const HERO_SUBTITLE = 'A Japanese Fantasy Action Adventure';
export const GAME_DESCRIPTION =
  'A cinematic Japanese fantasy action game set in a world of yokai, spirits, and ancient mysteries.';

// ─── Routes ──────────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: '',
  GAME: 'game',
} as const;

// ─── Navigation ──────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { label: 'World', id: 'nav-world', overlayId: 'world' },
  { label: 'Lore', id: 'nav-lore', overlayId: 'lore' },
  { label: 'Characters', id: 'nav-characters', overlayId: 'characters' },
  { label: 'Media', id: 'nav-media', overlayId: 'media' },
];

// ─── Assets ──────────────────────────────────────────────────────────────────

export const ASSETS = {
  HERO_BG: '/assets/hero-gate.webp',
} as const;

// ─── Design Tokens: Colors ───────────────────────────────────────────────────

export const COLORS = {
  /** Near-black base */
  CHARCOAL: '#0a0a0a',
  /** Deep background */
  BLACK: '#050505',
  /** Dark teal accent */
  TEAL: '#1a3a3a',
  /** Light teal for highlights */
  TEAL_LIGHT: '#2a5a5a',
  /** Crimson red primary accent */
  CRIMSON: '#8b1a1a',
  /** Brighter crimson for hover states */
  CRIMSON_BRIGHT: '#c0392b',
  /** Muted gold for accents */
  GOLD: '#c4a35a',
  /** Bright gold for emphasis */
  GOLD_BRIGHT: '#d4af37',
  /** Warm ivory for text */
  IVORY: '#f0e6d3',
  /** Slightly muted ivory */
  IVORY_MUTED: '#d4c5a9',
  /** Subtle fog color */
  FOG: 'rgba(20, 50, 50, 0.3)',
} as const;

// ─── Design Tokens: Typography ───────────────────────────────────────────────

export const FONTS = {
  /** Display/title font — elegant serif */
  DISPLAY: "'Cinzel', serif",
  /** UI/body font — clean sans-serif */
  UI: "'Inter', sans-serif",
} as const;

// ─── Design Tokens: Timing ───────────────────────────────────────────────────

export const TIMING = {
  /** Page transition duration in ms */
  PAGE_TRANSITION: 400,
  /** Hero elements stagger delay in ms */
  HERO_STAGGER: 200,
  /** Ken Burns animation duration */
  KEN_BURNS_DURATION: '25s',
  /** Play click transition duration in ms */
  PLAY_TRANSITION: 500,
} as const;
