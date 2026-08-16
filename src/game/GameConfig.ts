export const GAME_CONFIG = {
  PLAYER: {
    SPEED: 6.0,
    ROTATION_SPEED: 10.0, // lerp factor
  },
  CAMERA: {
    OFFSET: { x: 0, y: 12, z: 15 },
    TARGET_OFFSET: { x: 0, y: 0, z: 0 },
    LERP_SPEED: 5.0,
    FOV: 40, // used for perspective fallback, but orthographic uses frustum sizing
    ORTHO_SIZE: 12,
  },
  WORLD: {
    BOUNDS: {
      minX: -20,
      maxX: 20,
      minZ: -20,
      maxZ: 20
    }
  },
  DEBUG_MODE: import.meta.env.MODE === 'development',
};
