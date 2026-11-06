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

export interface GraphicsPreset {
  maxPixelRatio: number;
  /** 0 disables shadows. */
  shadowMapSize: number;
  /** How many nearby lamps cast real light. */
  lampLights: number;
  bloom: boolean;
  ambientOcclusion: boolean;
}

export const GRAPHICS_PRESETS: Record<QualityLevel, GraphicsPreset> = {
  LOW: { maxPixelRatio: 1, shadowMapSize: 0, lampLights: 2, bloom: false, ambientOcclusion: false },
  MEDIUM: { maxPixelRatio: 1.25, shadowMapSize: 1024, lampLights: 4, bloom: true, ambientOcclusion: false },
  HIGH: { maxPixelRatio: 1.5, shadowMapSize: 2048, lampLights: 6, bloom: true, ambientOcclusion: true }
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
