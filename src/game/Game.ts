/**
 * Game Configuration (Future)
 *
 * Stub file for the Phaser 3 game configuration.
 * This will be expanded when actual gameplay is implemented.
 *
 * DO NOT initialize Phaser or create game instances here yet.
 */

import { PHASER_CONFIG } from '../utils/constants';

/**
 * Placeholder Phaser configuration object.
 * This will be passed to `new Phaser.Game(config)` in a future step.
 */
export const gameConfig = {
  type: 'AUTO' as const,
  width: PHASER_CONFIG.WIDTH,
  height: PHASER_CONFIG.HEIGHT,
  parent: PHASER_CONFIG.PARENT_ID,
  backgroundColor: '#050505',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 300 },
      debug: false,
    },
  },
  scene: [] as unknown[],
} as const;

/**
 * Future: Initialize the Phaser game.
 * This function is a stub and will be implemented when gameplay begins.
 */
export function initializeGame(): void {
  // Will be implemented in a future step:
  // import Phaser from 'phaser';
  // const game = new Phaser.Game(gameConfig);
  console.info('[Game] Phaser game initialization pending. Game systems not yet implemented.');
}
