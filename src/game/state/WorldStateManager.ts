import * as THREE from 'three';
import { StoryFlags } from '../story/StoryFlag';
import { VFXManager } from '../vfx/VFXManager';
import { ZoneConfig } from '../world/ZoneManager';

export class WorldStateManager {
  private static instance: WorldStateManager;

  private constructor() {}

  public static getInstance(): WorldStateManager {
    if (!WorldStateManager.instance) {
      WorldStateManager.instance = new WorldStateManager();
    }
    return WorldStateManager.instance;
  }

  /**
   * Applies state modifiers to the base zone atmosphere.
   * e.g., If the courtyard is purified, make the fog brighter.
   */
  public modifyAtmosphere(
    zone: ZoneConfig,
    baseFogDensity: number,
    baseFogColor: THREE.Color,
    baseAmbientColor: THREE.Color,
    baseAmbientIntensity: number,
    flags: StoryFlags
  ): { fogDensity: number; fogColor: THREE.Color; ambientColor: THREE.Color; ambientIntensity: number } {
    let finalFogDensity = baseFogDensity;
    let finalFogColor = baseFogColor.clone();
    let finalAmbientColor = baseAmbientColor.clone();
    let finalAmbientIntensity = baseAmbientIntensity;

    // Modify Courtyard
    if (zone.id === 'COURTYARD') {
      if (flags.courtyardPurified) {
        finalFogDensity = 0.006; // Lighter fog
        finalFogColor.setHex(0x1e2c48); // Cleaner blue
        finalAmbientColor.setHex(0x8fa6d0); // Cooler, calmer light
      } else {
        finalFogColor.setHex(0x331a26); // Reddish corruption
        finalAmbientColor.setHex(0x7c5468);
        finalAmbientIntensity = 1.35;
      }
    }

    // Modify Forest
    if (zone.id === 'FOREST') {
      if (flags.forestPurified) {
        finalFogDensity = 0.01;
        finalFogColor.setHex(0x1a3038); // Less oppressive, match new ZoneManager forest vibe
        finalAmbientColor.setHex(0x5f8a84);
        finalAmbientIntensity = 1.25;
      } else {
        finalFogDensity = 0.014;
        finalFogColor.setHex(0x2a1418); // Dark red, corrupted, but visible
        finalAmbientColor.setHex(0x6a4048);
        finalAmbientIntensity = 1.15;
      }
    }
    
    // Global modifications after campaign completion
    if (flags.completedCampaign) {
      finalFogDensity *= 0.5;
      finalFogColor.setHex(0x3a4a60); // Dawn colors
      finalAmbientColor.setHex(0xc8c0c0); // Morning light
      finalAmbientIntensity = 1.8;
    }

    return { fogDensity: finalFogDensity, fogColor: finalFogColor, ambientColor: finalAmbientColor, ambientIntensity: finalAmbientIntensity };
  }

  /**
   * Updates global particle systems based on world state.
   */
  public updateParticles(vfx: VFXManager, flags: StoryFlags): void {
    // Assuming vfx has properties for these, or we just set global uniforms
    // For now, we will add support if VFXManager doesn't have it, or leave it as placeholder
    // We can just rely on the existing particle update logic or add fields to VFXManager later.
  }
}
