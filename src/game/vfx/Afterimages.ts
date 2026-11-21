import * as THREE from 'three';

const VERTEX = /* glsl */`
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vViewPos = mv.xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

// A fresnel ghost: bright at the silhouette, nearly clear face-on, and it can
// come apart in drifting flecks as it fades
const FRAGMENT = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBreak;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorld;
  float aHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main() {
    float edge = pow(1.0 - abs(dot(normalize(-vViewPos), normalize(vNormalView))), 2.2);
    if (uBreak > 0.0 && aHash(floor(vWorld * 14.0)) < uBreak) discard;
    float a = (0.12 + edge * 0.95) * uOpacity;
    gl_FragColor = vec4(uColor * (0.5 + edge * 1.6), a);
  }
`;

interface Ghost {
  root: THREE.Group;
  nodes: THREE.Object3D[];
  material: THREE.ShaderMaterial;
  life: number;
  maxLife: number;
  breaks: boolean;
  opacity: number;
}

export interface GhostOptions {
  color?: THREE.Color | number;
  life?: number;
  opacity?: number;
  /** Comes apart in flecks as it fades, rather than simply fading. */
  breaks?: boolean;
}

/**
 * Afterimages — Ghostly copies of a character left in the air behind them,
 * frozen in the pose they had: a dash's trail, or the shadow a perfect dodge
 * leaves for the blow to pass through.
 */
export class Afterimages {
  private ghosts: Ghost[] = [];
  private sourceNodes: THREE.Object3D[] = [];
  private next = 0;
  private color: THREE.Color;

  constructor(private readonly source: THREE.Object3D, private readonly scene: THREE.Scene, count = 6, color: number = 0x9ad4ff) {
    this.color = new THREE.Color(color);
    source.traverse(node => this.sourceNodes.push(node));
    for (let i = 0; i < count; i++) this.ghosts.push(this.build());
  }

  /** A copy of the source's hierarchy, sharing its geometry, with every surface made of ghost. */
  private build(): Ghost {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: { uColor: { value: this.color.clone() }, uOpacity: { value: 0 }, uBreak: { value: 0 } },
    });
    const copy = (node: THREE.Object3D): THREE.Object3D => {
      const mesh = node as THREE.Mesh;
      const out = mesh.isMesh && !(mesh as unknown as THREE.Sprite).isSprite && !(node as THREE.Points).isPoints
        ? new THREE.Mesh(mesh.geometry, material)
        : new THREE.Object3D();
      out.matrixAutoUpdate = true;
      return out;
    };
    const nodes: THREE.Object3D[] = [];
    const clone = (node: THREE.Object3D, parent: THREE.Object3D | null): THREE.Object3D => {
      const out = copy(node);
      nodes.push(out);
      parent?.add(out);
      for (const child of node.children) clone(child, out);
      return out;
    };
    const top = clone(this.source, null);
    const root = new THREE.Group();
    root.add(top);
    root.visible = false;
    root.matrixAutoUpdate = false;
    root.userData.noAO = true;
    root.renderOrder = 4;
    root.traverse(node => {
      node.frustumCulled = false;
      node.userData.noAO = true;
      (node as THREE.Mesh).castShadow = false;
    });
    this.scene.add(root);
    return { root, nodes, material, life: 0, maxLife: 1, breaks: false, opacity: 1 };
  }

  /** Leaves a ghost where the source stands, in the pose it has right now. */
  public spawn(options: GhostOptions = {}): void {
    const ghost = this.ghosts[this.next];
    this.next = (this.next + 1) % this.ghosts.length;
    // The traversal orders match, node for node
    for (let i = 0; i < this.sourceNodes.length && i < ghost.nodes.length; i++) {
      const from = this.sourceNodes[i];
      const to = ghost.nodes[i];
      if (i === 0) {
        to.position.set(0, 0, 0);
        to.quaternion.identity();
        to.scale.set(1, 1, 1);
      } else {
        to.position.copy(from.position);
        to.quaternion.copy(from.quaternion);
        to.scale.copy(from.scale);
      }
      to.visible = from.visible;
    }
    this.source.updateWorldMatrix(true, false);
    ghost.root.matrix.copy(this.source.matrixWorld);
    ghost.root.matrixWorldNeedsUpdate = true;
    ghost.root.visible = true;
    ghost.maxLife = ghost.life = options.life ?? 0.3;
    ghost.breaks = !!options.breaks;
    ghost.opacity = options.opacity ?? 0.8;
    const color = options.color;
    ghost.material.uniforms.uColor.value.copy(color === undefined ? this.color : typeof color === 'number' ? new THREE.Color(color) : color);
    ghost.material.uniforms.uOpacity.value = ghost.opacity;
    ghost.material.uniforms.uBreak.value = 0;
  }

  public update(dt: number): void {
    for (const ghost of this.ghosts) {
      if (!ghost.root.visible) continue;
      ghost.life -= dt;
      if (ghost.life <= 0) {
        ghost.root.visible = false;
        continue;
      }
      const t = 1 - ghost.life / ghost.maxLife;
      const u = ghost.material.uniforms;
      if (ghost.breaks) {
        u.uOpacity.value = ghost.opacity * (1 - t * 0.4);
        u.uBreak.value = Math.max(0, (t - 0.35) / 0.65);
      } else {
        u.uOpacity.value = ghost.opacity * (1 - t) * (1 - t);
      }
    }
  }

  public clear(): void {
    for (const ghost of this.ghosts) ghost.root.visible = false;
  }

  public dispose(): void {
    for (const ghost of this.ghosts) {
      ghost.material.dispose();
      ghost.root.removeFromParent();
    }
  }
}
