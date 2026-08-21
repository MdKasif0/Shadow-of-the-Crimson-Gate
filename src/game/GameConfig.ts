export const GAME_CONFIG = {
  DEBUG_MODE: false, // Hidden by default for final gameplay slice

  WORLD_SEED: 47291, // Fixed seed for deterministic generation

  CAMERA: {
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
    OFFSET_X: -15,
    OFFSET_Y: 20,
    OFFSET_Z: 15,
    ZOOM: 10, // For Orthographic camera zoom
  },

  PLAYER: {
    SPEED: 4,
    HEIGHT: 1.8,
    COLLISION_RADIUS: 0.4,
  },

  WORLD: {
    WIDTH: 60,
    DEPTH: 160,
    BOUNDS: {
      MIN_X: -28,
      MAX_X: 28,
      MIN_Z: -140,
      MAX_Z: 60,
    },
    SPAWN_AREA_SIZE: 10,
  }
};
