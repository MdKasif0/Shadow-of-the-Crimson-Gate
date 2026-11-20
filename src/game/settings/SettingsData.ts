import { DEFAULT_KEY_BINDINGS, KeyBindings } from './KeyBindings';

export interface SettingsData {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  cameraShake: boolean;
  vfxIntensity: QualityLevel;
  graphicsQuality: QualityLevel;
  reduceMotion: boolean;
  keyBindings: KeyBindings;
  /** Multiplies how far the camera turns per mouse or stick movement. */
  lookSensitivity: number;
  invertY: boolean;
  /** Frames per second to stop at; 0 for no limit. */
  fpsCap: number;
  /** Lowers graphics quality on its own if the game can't keep up. */
  autoQuality: boolean;
  /** On-screen controls: shown on touch screens with AUTO. */
  touchControls: 'AUTO' | 'ON' | 'OFF';
  /** The speedrun clock in the corner during play. */
  showRunTimer: boolean;
}

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface GraphicsPreset {
  maxPixelRatio: number;
  /** 0 disables shadows. */
  shadowMapSize: number;
  /** How many nearby lamps cast real light. */
  lampLights: number;
  msaaSamples: number;
  bloom: boolean;
  ambientOcclusion: boolean;
  /** Half-width of the sharp-shadow area around the player. Smaller is crisper. */
  shadowExtent: number;
}

export const GRAPHICS_PRESETS: Record<QualityLevel, GraphicsPreset> = {
  LOW: { maxPixelRatio: 1, shadowMapSize: 0, lampLights: 2, msaaSamples: 0, bloom: false, ambientOcclusion: false, shadowExtent: 34 },
  MEDIUM: { maxPixelRatio: 1.25, shadowMapSize: 2048, lampLights: 4, msaaSamples: 4, bloom: true, ambientOcclusion: true, shadowExtent: 30 },
  HIGH: { maxPixelRatio: 1.5, shadowMapSize: 3072, lampLights: 6, msaaSamples: 4, bloom: true, ambientOcclusion: true, shadowExtent: 26 }
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
  reduceMotion: false,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  lookSensitivity: 1,
  invertY: false,
  fpsCap: 0,
  autoQuality: true,
  touchControls: 'AUTO',
  showRunTimer: true,
};
