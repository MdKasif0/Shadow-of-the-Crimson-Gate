import * as THREE from 'three';

export interface HeatSource {
  position: THREE.Vector3;
  /** Rough size of the fire, in world units. */
  size: number;
  strength: number;
}

/**
 * Every fire in the world registers here, so the final pass can make the air
 * above it shimmer. Levels add their flames and take them away again.
 */
export const HeatSources = {
  sources: new Set<HeatSource>(),

  add(position: THREE.Vector3, size: number, strength = 1): HeatSource {
    const source = { position: position.clone(), size, strength };
    this.sources.add(source);
    return source;
  },

  remove(source: HeatSource): void {
    this.sources.delete(source);
  },
};
