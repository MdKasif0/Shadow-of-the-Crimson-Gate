export const GAME_CONFIG = {
  DEBUG_MODE: import.meta.env.DEV, // Show debug info only in dev

  CAMERA: {
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
    OFFSET_X: -15,
    OFFSET_Y: 20,
    OFFSET_Z: 15,
  },

  PLAYER: {
    SPEED: 8,
    HEIGHT: 1.8,
  },

  WORLD: {
    WIDTH: 100,
    DEPTH: 100,
  }
};
