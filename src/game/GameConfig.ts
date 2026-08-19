export const GAME_CONFIG = {
  WORLD_SEED: 47291,
  PLAYER: {
    SPEED: 5.5,
    ROTATION_SPEED: 10.0,
    RADIUS: 0.4,
    MAX_HP: 100,
    ATTACK: {
      COMBO: [
        { windup: 0.10, active: 0.12, recovery: 0.18 }, // Light slash
        { windup: 0.12, active: 0.14, recovery: 0.20 }, // Cross slash
        { windup: 0.15, active: 0.18, recovery: 0.30 }, // Heavy thrust
      ],
      DAMAGE: [25, 30, 45],
      HITBOX_RANGE: 2.0,
      HITBOX_ANGLE: Math.PI / 2.5,
      COOLDOWN: 0.08,
      COMBO_WINDOW: 0.5,
    },
    DASH: {
      SPEED: 18.0,
      DURATION: 0.18,
      COOLDOWN: 0.8,
      INVULNERABLE_DURATION: 0.15,
    },
  },
  ENEMY: {
    YOKAI: {
      MAX_HP: 100,
      SPEED: 2.5,
      DETECT_RANGE: 12.0,
      ATTACK_RANGE: 2.2,
      ATTACK_DAMAGE: 15,
      ATTACK_WINDUP: 0.4,
      ATTACK_ACTIVE: 0.15,
      ATTACK_RECOVERY: 0.6,
    },
  },
  CAMERA: {
    OFFSET: { x: 0, y: 14, z: 16 },
    LERP_SPEED: 4.0,
    ORTHO_SIZE: 10,
    SHAKE_DECAY: 5.0,
  },
  WORLD: {
    SIZE: 50,
    BOUNDS: { minX: -24, maxX: 24, minZ: -24, maxZ: 24 },
    COURTYARD_RADIUS: 18,
  },
  DEBUG_MODE: import.meta.env.MODE === 'development',
};
