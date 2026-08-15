/**
 * Centralized constants for the application.
 * All magic values, colors, routes, and configuration live here.
 */

import type { NavItem } from '../types/index';

// ─── Game Identity ───────────────────────────────────────────────────────────

export const GAME_TITLE = 'Shadow of the Crimson Gate';
export const HERO_SUBTITLE = 'A Japanese Fantasy Action Adventure';
export const HERO_TAGLINE = 'A World of Spirits Awaits';
export const GAME_DESCRIPTION =
  'A cinematic Japanese fantasy 2D action game set in a world of yokai, spirits, and ancient mysteries.';

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
  HERO_BG: '/assets/hero-bg-image.png',
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

// ─── Parallax ────────────────────────────────────────────────────────────────

export const PARALLAX = {
  /** Max pixel offset on the X axis */
  STRENGTH_X: 8,
  /** Max pixel offset on the Y axis (less than X to feel natural) */
  STRENGTH_Y: 5,
  /** Interpolation smoothing factor (0–1, lower = smoother) */
  LERP: 0.05,
} as const;

// ─── Particles ───────────────────────────────────────────────────────────────

export const PARTICLES = {
  /** Number of sakura petal elements */
  PETAL_COUNT: 14,
  /** Number of spirit/glow particle elements */
  SPIRIT_COUNT: 7,
} as const;

// ─── Phaser (Future) ─────────────────────────────────────────────────────────

export const PHASER_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  PARENT_ID: 'game-container',
} as const;
