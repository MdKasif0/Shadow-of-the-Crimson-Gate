export interface SettingsData {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  cameraShake: boolean;
  screenShake: boolean;
  vfxIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  masterVolume: 1.0,
  musicVolume: 0.8,
  sfxVolume: 1.0,
  cameraShake: true,
  screenShake: true,
  vfxIntensity: 'HIGH',
  graphicsQuality: 'HIGH',
  reduceMotion: false
};
