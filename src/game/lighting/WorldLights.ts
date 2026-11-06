import * as THREE from 'three';
import { getGlowTexture } from '../utils/ProceduralTextures';

export interface LightSource {
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  range: number;
  flicker: number;
  phase: number;
}

/**
 * Every lamp, brazier and shrine registers here. LightingSystem lights only the
 * nearest few for real; the rest stay convincing through glows and light pools.
 */
export const WorldLights = {
  sources: [] as LightSource[],

  add(x: number, y: number, z: number, color: number, intensity: number, range: number, flicker: number = 0.12): void {
    this.sources.push({
      position: new THREE.Vector3(x, y, z),
      color: new THREE.Color(color),
      intensity,
      range,
      flicker,
      phase: this.sources.length * 1.7,
    });
  },
};

/** Additive halo that the bloom pass picks up. */
export function createGlowSprite(color: number, size: number, opacity: number = 0.8): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }));
  sprite.scale.setScalar(size);
  return sprite;
}

/** Cheap pool of light on the ground, for lamps too far away to get a real light. */
export function createLightPool(color: number, radius: number, opacity: number = 0.3): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    opacity,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  mesh.position.y = 0.05;
  return mesh;
}
