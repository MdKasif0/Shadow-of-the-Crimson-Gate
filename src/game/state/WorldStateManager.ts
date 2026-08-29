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
        finalFogDensity = 0.015; // Lighter fog
        finalFogColor.setHex(0x0a121e); // Cleaner blue
        finalAmbientColor.setHex(0xeef5ff); // Cooler, calmer light
      } else {
        finalFogColor.setHex(0x2a1010); // Reddish corruption
        finalAmbientColor.setHex(0xffaaaa);
        finalAmbientIntensity = 2.5;
      }
    }

    // Modify Forest
    if (zone.id === 'FOREST') {
      if (flags.forestPurified) {
        finalFogDensity = 0.02;
        finalFogColor.setHex(0x182633); // Less oppressive, match new ZoneManager forest vibe
        finalAmbientColor.setHex(0xaaccbb);
        finalAmbientIntensity = 1.6;
      } else {
        finalFogDensity = 0.025;
        finalFogColor.setHex(0x2a0d0d); // Dark red, corrupted, but visible
        finalAmbientColor.setHex(0x995555);
        finalAmbientIntensity = 2.0;
      }
    }
    
    // Global modifications after campaign completion
    if (flags.completedCampaign) {
      finalFogDensity *= 0.5;
      finalFogColor.setHex(0x223344); // Dawn colors
      finalAmbientColor.setHex(0xffeedd); // Morning light
      finalAmbientIntensity = 3.0;
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
