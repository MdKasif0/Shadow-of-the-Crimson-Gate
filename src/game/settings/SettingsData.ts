export interface SettingsData {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  cameraShake: boolean;
  vfxIntensity: QualityLevel;
  graphicsQuality: QualityLevel;
  reduceMotion: boolean;
}

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Render settings per Graphics Quality level. A shadow map size of 0 disables shadows. */
export const GRAPHICS_PRESETS: Record<QualityLevel, { maxPixelRatio: number; shadowMapSize: number }> = {
  LOW: { maxPixelRatio: 1, shadowMapSize: 0 },
  MEDIUM: { maxPixelRatio: 1.5, shadowMapSize: 1024 },
  HIGH: { maxPixelRatio: 2, shadowMapSize: 2048 }
};

/** Fraction of particles kept per VFX Density level. */
export const VFX_DENSITY: Record<QualityLevel, number> = {
  LOW: 0.35,
  MEDIUM: 0.65,
  HIGH: 1
};

export const DEFAULT_SETTINGS: SettingsData = {
  masterVolume: 1.0,
  musicVolume: 0.8,
  sfxVolume: 1.0,
  cameraShake: true,
  vfxIntensity: 'HIGH',
  graphicsQuality: 'HIGH',
  reduceMotion: false
};
