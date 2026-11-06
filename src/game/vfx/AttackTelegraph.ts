import * as THREE from 'three';

export interface AttackShape {
  range: number;
  /** Width of the danger area in radians. 2π or more is a full circle. */
  angle: number;
}

const POOL_SIZE = 8;

interface Decal {
  outline: THREE.Mesh;
  fill: THREE.Mesh;
  ownerId: string | null;
  usedThisFrame: boolean;
}

/**
 * AttackTelegraph — Shows on the ground where an attack is about to land. The
 * inner area grows to fill the outline at the moment the attack connects.
 */
export class AttackTelegraph {
  private decals: Decal[] = [];
  private outlineGeometries = new Map<number, THREE.BufferGeometry>();
  private fillGeometries = new Map<number, THREE.BufferGeometry>();

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const makeMesh = (opacity: number) => {
        const mesh = new THREE.Mesh(this.geometryFor(Math.PI / 2, true), new THREE.MeshBasicMaterial({
          color: 0xff3a1c,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }));
        mesh.visible = false;
        mesh.renderOrder = 2;
        scene.add(mesh);
        return mesh;
      };
      this.decals.push({ outline: makeMesh(0.6), fill: makeMesh(0.28), ownerId: null, usedThisFrame: false });
    }
  }

  /** Geometry of radius 1, lying flat with its middle facing +Z. */
  private geometryFor(angle: number, isOutline: boolean): THREE.BufferGeometry {
    const key = Math.round(angle * 100);
    const cache = isOutline ? this.outlineGeometries : this.fillGeometries;
    let geometry = cache.get(key);
    if (!geometry) {
      const sweep = Math.min(angle, Math.PI * 2);
      geometry = new THREE.RingGeometry(isOutline ? 0.965 : 0.02, 1, 48, 1, Math.PI / 2 - sweep / 2, sweep);
      geometry.rotateX(Math.PI / 2);
      cache.set(key, geometry);
    }
    return geometry;
  }

  public beginFrame(): void {
    for (const decal of this.decals) decal.usedThisFrame = false;
  }

  /** `progress` runs from 0 when the windup starts to 1 as the attack lands. */
  public show(ownerId: string, position: THREE.Vector3, facing: number, shape: AttackShape, progress: number): void {
    let decal = this.decals.find(d => d.ownerId === ownerId) ?? this.decals.find(d => d.ownerId === null);
    if (!decal) return;

    decal.ownerId = ownerId;
    decal.usedThisFrame = true;

    decal.outline.geometry = this.geometryFor(shape.angle, true);
    decal.fill.geometry = this.geometryFor(shape.angle, false);

    for (const mesh of [decal.outline, decal.fill]) {
      mesh.visible = true;
      mesh.position.set(position.x, 0.06, position.z);
      mesh.rotation.y = facing;
    }
    decal.outline.scale.setScalar(shape.range);
    decal.fill.scale.setScalar(Math.max(shape.range * progress, 0.01));
    (decal.outline.material as THREE.MeshBasicMaterial).opacity = 0.25 + progress * 0.55;
  }

  public endFrame(): void {
    for (const decal of this.decals) {
      if (decal.usedThisFrame || decal.ownerId === null) continue;
      decal.ownerId = null;
      decal.outline.visible = false;
      decal.fill.visible = false;
    }
  }
}
