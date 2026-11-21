import * as THREE from 'three';
import { Enemy } from './Enemy';
import { HauntTheme } from '../levels/LevelTypes';
import { SoftParticles } from '../vfx/SoftParticles';
import { Afterimages } from '../vfx/Afterimages';
import { getGlowTexture } from '../utils/ProceduralTextures';
import { EventBus } from '../core/EventBus';

/**
 * Haunting — What makes a yokai look like something that shouldn't be there.
 * Its colours wash out, spirit-fire crawls over its skin, and its feet trail
 * away to smoke. Its eyes burn. It flickers like a bad memory, smoulders as
 * it moves, leaves ghosts behind when it lunges, and when it dies it burns
 * away rather than falling over.
 */

const hauntTime = { value: 0 };

const VERTEX_PARS = /* glsl */`
  varying vec3 vHauntPos;
`;

const FRAGMENT_PARS = /* glsl */`
  uniform float uHauntTime;
  uniform float uDissolve;
  uniform float uFlicker;
  uniform float uHauntFade;
  uniform float uHauntBase;
  uniform float uHauntStrength;
  uniform vec3 uHauntColor;
  uniform vec3 uHauntTint;
  varying vec3 vHauntPos;
  float hHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float hNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hHash(i), hHash(i + vec3(1, 0, 0)), f.x), mix(hHash(i + vec3(0, 1, 0)), hHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hHash(i + vec3(0, 0, 1)), hHash(i + vec3(1, 0, 1)), f.x), mix(hHash(i + vec3(0, 1, 1)), hHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float hFbm(vec3 p) { return hNoise(p) * 0.55 + hNoise(p * 2.13 + 3.1) * 0.3 + hNoise(p * 4.37 + 7.7) * 0.15; }
`;

// Early in the fragment: the parts that aren't there at all
const FRAGMENT_CLIP = /* glsl */`
  float hFlow = hFbm(vec3(vHauntPos.xz * 2.2, vHauntPos.y * 2.6 - uHauntTime * 1.3));
  float hHeight = vHauntPos.y - uHauntBase;
  float hDither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  // Legs that end in smoke
  if (uHauntFade > 0.0) {
    float keep = smoothstep(0.0, uHauntFade, hHeight) + (hFlow - 0.5) * 0.7;
    if (keep < hDither) discard;
  }
  // Burning away, or burning in
  float hDis = hFbm(vHauntPos * 3.1 + 11.0);
  float hCut = mix(-0.05, 1.0, uDissolve);
  if (uDissolve > 0.0 && hDis < hCut) discard;
  // A bad signal: bands of it missing, for a moment
  if (uFlicker > 0.01 && fract(vHauntPos.y * 7.0 + uHauntTime * 19.0) < uFlicker * 0.42) discard;
`;

// After the base colour: wash it out towards the haunt's tint
const FRAGMENT_COLOR = /* glsl */`
  {
    float hL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = mix(diffuseColor.rgb, hL * uHauntTint * 1.5, 0.45 * uHauntStrength);
  }
`;

// Last: spirit-fire over the skin, glowing veins, the burning edge
const FRAGMENT_GLOW = /* glsl */`
  {
    float hRim = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.0);
    float hVein = 1.0 - smoothstep(0.0, 0.03, abs(hFlow - 0.52));
    float hFire = smoothstep(0.56, 0.86, hFlow);
    float hAmount = (hFire * (0.25 + hRim * 1.5) + hVein * (0.2 + hRim * 0.5)) * uHauntStrength;
    outgoingLight += uHauntColor * hAmount * (1.0 + uFlicker * 2.5);
    if (uHauntFade > 0.0) outgoingLight += uHauntColor * (1.0 - smoothstep(0.0, uHauntFade * 1.3, hHeight)) * 0.9;
    if (uDissolve > 0.0) outgoingLight += uHauntColor * (1.0 - smoothstep(0.0, 0.08, hDis - hCut)) * 6.0;
  }
`;

interface HauntUniforms {
  uDissolve: { value: number };
  uFlicker: { value: number };
  uHauntFade: { value: number };
  uHauntBase: { value: number };
  uHauntStrength: { value: number };
  uHauntColor: { value: THREE.Color };
  uHauntTint: { value: THREE.Color };
}

interface Profile {
  /** How high off the ground the legs turn to smoke, in metres. 0 for none. */
  fade: number;
  strength: number;
  /** Ghosts trail it when it moves fast. */
  ghosts: boolean;
}

const PROFILES: Record<string, Partial<Profile>> = {
  KAMAITACHI: { fade: 0.3, ghosts: true },
  KAMAITACHI_LURKER: { fade: 0.3, ghosts: true },
  SHADOW_YOKAI: { fade: 0.75, strength: 1.2 },
  LURKING_SHADE: { fade: 0.9, strength: 1.3 },
  SHADOW_CALLER: { fade: 0.85, strength: 1.3 },
  KAPPA: { fade: 0.18, ghosts: true },
  TENGU: { fade: 0.35 },
  SPIDERLING: { fade: 0, strength: 0.8 },
  JOROGUMO: { fade: 0, strength: 0.75 },
  UMIBOZU: { fade: 0, strength: 0.85 },
  AKANE: { fade: 0, strength: 0 },
};

interface Tracked {
  enemy: Enemy;
  uniforms: HauntUniforms;
  profile: Profile;
  eyes: { sprite: THREE.Sprite; base: number }[];
  ghosts: Afterimages | null;
  height: number;
  radius: number;
  wasVisible: boolean;
  appear: number;
  deathTime: number;
  isBoss: boolean;
  yields: boolean;
  lastHealth: number;
  flickerTimer: number;
  emitSmoke: number;
  emitFire: number;
  emitExtra: number;
  ghostTimer: number;
  lastPosition: THREE.Vector3;
}

const DEFAULT_THEME: HauntTheme = { color: 0x8ad8ff, tint: 0x8aa0b8, extra: 'none' };

export class Haunting {
  private tracked = new Map<Enemy, Tracked>();
  private smoke = new SoftParticles(900, { blending: 'normal', softness: 1.1, noisy: true });
  private fire = new SoftParticles(700, { softness: 1.8 });
  private drops = new SoftParticles(300, { softness: 3 });
  private theme: HauntTheme = DEFAULT_THEME;
  private color = new THREE.Color(DEFAULT_THEME.color);
  private tint = new THREE.Color(DEFAULT_THEME.tint);
  private smokeColor = new THREE.Color();
  private onHit: (data: { position: THREE.Vector3; direction: THREE.Vector3; isHeavy: boolean; isKill: boolean }) => void;

  constructor(private readonly scene: THREE.Scene) {
    scene.add(this.smoke.points, this.fire.points, this.drops.points);
    // Cutting a ghost spills spirit-fire
    this.onHit = data => {
      if (this.tracked.size === 0) return;
      const at = data.position.clone().setY(data.position.y + 1.05);
      const count = (data.isHeavy ? 26 : 14) * SoftParticles.density();
      for (let i = 0; i < count; i++) {
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().addScaledVector(data.direction, 0.8);
        this.fire.emit({
          position: at.clone(), velocity: dir.multiplyScalar(2.5 + Math.random() * 3.5),
          life: 0.4 + Math.random() * 0.4, size: 0.16, sizeEnd: 0.02, color: this.color, alpha: 0.9, drag: 3, gravity: 2,
        });
      }
    };
    EventBus.on('playerHitLanded', this.onHit);
  }

  /** The look of the level now loaded, or null for the courtyard, where nothing is haunted. */
  public setTheme(theme: HauntTheme | null): void {
    this.clear();
    this.theme = theme ?? DEFAULT_THEME;
    this.color.setHex(this.theme.color).multiplyScalar(1.4);
    this.tint.setHex(this.theme.tint);
    this.smokeColor.setHex(this.theme.tint).multiplyScalar(0.12);
  }

  public update(dt: number, enemies: Enemy[]): void {
    hauntTime.value += dt;
    for (const enemy of enemies) if (!this.tracked.has(enemy)) this.track(enemy);
    for (const [enemy, t] of this.tracked) {
      if (!enemies.includes(enemy)) {
        t.ghosts?.dispose();
        this.tracked.delete(enemy);
        continue;
      }
      this.animate(t, dt);
    }
    this.smoke.update(dt);
    this.fire.update(dt);
    this.drops.update(dt);
  }

  public clear(): void {
    for (const t of this.tracked.values()) t.ghosts?.dispose();
    this.tracked.clear();
    this.smoke.clear();
    this.fire.clear();
    this.drops.clear();
  }

  // ─── Taking hold of a new yokai ────────────────────────────────────────

  private track(enemy: Enemy): void {
    const type = enemy.enemyType;
    const profile: Profile = { fade: 0.2, strength: 1, ghosts: false, ...PROFILES[type] };
    const uniforms: HauntUniforms = {
      uDissolve: { value: 0 },
      uFlicker: { value: 0 },
      uHauntFade: { value: profile.fade },
      uHauntBase: { value: 0 },
      uHauntStrength: { value: profile.strength },
      uHauntColor: { value: this.color.clone() },
      uHauntTint: { value: this.tint.clone() },
    };

    // Its size, for where smoke rises from and how big its eyes burn
    const box = new THREE.Box3();
    const wasVisible = enemy.root.visible;
    enemy.root.visible = true;
    enemy.root.updateWorldMatrix(true, true);
    box.setFromObject(enemy.root, true);
    enemy.root.visible = wasVisible;
    const size = box.getSize(new THREE.Vector3());
    const height = Number.isFinite(size.y) && size.y > 0.2 ? Math.min(size.y, 12) : 1.8;
    const radius = Number.isFinite(size.x) ? Math.min(Math.max(size.x, size.z) * 0.35, 4) : 0.5;

    const eyes: Tracked['eyes'] = [];
    const glowTexture = getGlowTexture();
    const worldScale = new THREE.Vector3();
    const patchedHere = new Set<THREE.Material>();
    enemy.root.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      if (!patchedHere.has(material) && !material.userData.haunted) {
        patchedHere.add(material);
        material.userData.haunted = true;
        haunt(material, uniforms);
      }
      // Small, bright things are eyes: give them a burning halo
      if (material.emissiveIntensity >= 1.2 && material.emissive.getHSL({ h: 0, s: 0, l: 0 }).l > 0.15) {
        mesh.geometry.computeBoundingSphere();
        mesh.getWorldScale(worldScale);
        const r = (mesh.geometry.boundingSphere?.radius ?? 1) * worldScale.x;
        if (r < 0.16 * Math.max(1, height / 2)) {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTexture, color: material.emissive.clone().multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
          }));
          const world = 0.32 * Math.max(1, height / 2.2);
          sprite.scale.setScalar(world / Math.max(worldScale.x, 0.001));
          sprite.userData.noAO = true;
          sprite.raycast = () => {};
          mesh.add(sprite);
          eyes.push({ sprite, base: 0.9 });
        }
      }
    });

    const isLevelEnemy = 'def' in enemy;
    const def = isLevelEnemy ? (enemy as unknown as { def: { isBoss?: boolean; yields?: boolean } }).def : null;
    this.tracked.set(enemy, {
      enemy, uniforms, profile, eyes,
      // Built last, so the ghost's copy of the hierarchy includes the eye halos
      ghosts: profile.ghosts ? new Afterimages(enemy.root, this.scene, 5, this.theme.color) : null,
      height, radius,
      wasVisible: false,
      appear: 0,
      deathTime: -1,
      isBoss: !!def?.isBoss,
      yields: !!def?.yields,
      lastHealth: enemy.health.currentHealth,
      flickerTimer: 1 + Math.random() * 4,
      emitSmoke: 0, emitFire: 0, emitExtra: 0, ghostTimer: 0,
      lastPosition: enemy.root.position.clone(),
    });
    enemy.root.userData.haunted = true;
  }

  // ─── Each frame ────────────────────────────────────────────────────────

  private animate(t: Tracked, dt: number): void {
    const { enemy, uniforms: u } = t;
    const root = enemy.root;
    const position = root.position;
    u.uHauntBase.value = position.y;
    const speed = dt > 0 ? Math.hypot(position.x - t.lastPosition.x, position.z - t.lastPosition.z) / dt : 0;
    t.lastPosition.copy(position);

    const isDead = enemy.health.isDead;
    // Back from the dead: a reset fight
    if (!isDead && t.deathTime >= 0) {
      t.deathTime = -1;
      t.wasVisible = false;
      root.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    }

    // Burning in, the moment it appears
    if (root.visible && !t.wasVisible && !isDead) t.appear = 0;
    t.wasVisible = root.visible;
    if (!root.visible) return;
    t.appear += dt;

    if (isDead && !t.yields) {
      if (t.deathTime < 0) {
        t.deathTime = 0;
        root.traverse(o => { (o as THREE.Mesh).castShadow = false; });
      }
      t.deathTime += dt;
      const delay = t.isBoss ? 1.8 : 0.45;
      const length = t.isBoss ? 2.6 : 1.1;
      const burn = THREE.MathUtils.clamp((t.deathTime - delay) / length, 0, 1);
      u.uDissolve.value = burn;
      u.uFlicker.value = 0;
      for (const eye of t.eyes) eye.sprite.material.opacity = (1 - burn) * 1.2;
      if (burn > 0 && burn < 1) this.burnAway(t, dt);
      if (burn >= 1) root.visible = false;
      return;
    }

    u.uDissolve.value = Math.max(0, 1 - t.appear / 0.75);
    if (u.uDissolve.value > 0) this.burnAway(t, dt * 0.6);

    // Hurt, and every so often unprovoked, it flickers
    if (enemy.health.currentHealth < t.lastHealth) t.flickerTimer = 0;
    t.lastHealth = enemy.health.currentHealth;
    t.flickerTimer -= dt;
    if (t.flickerTimer <= 0) {
      u.uFlicker.value = 0.6 + Math.random() * 0.4;
      t.flickerTimer = 2.5 + Math.random() * 5;
    }
    u.uFlicker.value = Math.max(0, u.uFlicker.value - dt * 6);

    // Eyes burn hotter as it winds up to strike
    const warning = enemy.attackWarning;
    const flick = 0.85 + Math.sin(hauntTime.value * 17 + position.x) * 0.1 + Math.sin(hauntTime.value * 31) * 0.05;
    for (const eye of t.eyes) eye.sprite.material.opacity = (eye.base + warning * 1.5) * flick * (1 - u.uFlicker.value * 0.8);

    // Smoke and spirit-fire rising off it, more when it moves
    const density = SoftParticles.density();
    const scale = Math.max(1, t.height / 2);
    const moving = Math.min(1, speed / 5);
    t.emitSmoke += dt * (10 + moving * 16) * density * Math.min(scale, 3);
    t.emitFire += dt * (5 + warning * 18) * density * Math.min(scale, 3);
    while (t.emitSmoke >= 1) {
      t.emitSmoke--;
      const at = this.somewhereOn(t, 0.05, 0.75);
      this.smoke.emit({
        position: at,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.35 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3),
        life: 1.1 + Math.random() * 1.1, size: 0.3 * scale, sizeEnd: 1.1 * scale, color: this.smokeColor, alpha: 0.42, drag: 0.4,
      });
    }
    while (t.emitFire >= 1) {
      t.emitFire--;
      this.fire.emit({
        position: this.somewhereOn(t, 0.3, 1),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.4),
        life: 0.5 + Math.random() * 0.6, size: 0.1 * scale, sizeEnd: 0.02, color: this.color, alpha: 0.85, drag: 0.8, gravity: -0.4,
      });
    }

    // Drowned things drip; burnt things shed embers
    if (this.theme.extra === 'drip' || this.theme.extra === 'embers') {
      const isDrip = this.theme.extra === 'drip';
      t.emitExtra += dt * (isDrip ? 14 : 9) * density * Math.min(scale, 3);
      while (t.emitExtra >= 1) {
        t.emitExtra--;
        this.drops.emit({
          position: this.somewhereOn(t, 0.25, 0.95),
          velocity: isDrip ? new THREE.Vector3(0, -0.4, 0) : new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8 + Math.random(), (Math.random() - 0.5) * 0.6),
          life: isDrip ? 0.55 + Math.random() * 0.3 : 0.8 + Math.random() * 0.8,
          size: isDrip ? 0.045 : 0.05, sizeEnd: isDrip ? 0.03 : 0.01,
          color: isDrip ? new THREE.Color(0.55, 0.75, 0.85) : new THREE.Color(2.4, 0.9, 0.3),
          alpha: isDrip ? 0.85 : 1, gravity: isDrip ? 9 : -0.5,
        });
      }
    }

    // A lunge leaves ghosts in the air behind it
    if (t.ghosts) {
      t.ghosts.update(dt);
      t.ghostTimer -= dt;
      if (speed > 6.5 && t.ghostTimer <= 0) {
        t.ghosts.spawn({ life: 0.3, opacity: 0.5 });
        t.ghostTimer = 0.05;
      }
    }
  }

  /** A point on or near the yokai's body, between two fractions of its height. */
  private somewhereOn(t: Tracked, from: number, to: number): THREE.Vector3 {
    const p = t.enemy.root.position;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * t.radius;
    return new THREE.Vector3(p.x + Math.cos(a) * r, p.y + t.height * (from + Math.random() * (to - from)), p.z + Math.sin(a) * r);
  }

  /** Ash and spirit-fire lifting off as it burns away. */
  private burnAway(t: Tracked, dt: number): void {
    const scale = Math.max(1, t.height / 2);
    const count = dt * 90 * SoftParticles.density() * Math.min(scale, 3);
    for (let i = 0; i < count; i++) {
      this.fire.emit({
        position: this.somewhereOn(t, 0, 1),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.8, 1 + Math.random() * 1.6, (Math.random() - 0.5) * 0.8),
        life: 0.6 + Math.random() * 0.8, size: 0.14 * scale, sizeEnd: 0.02, color: this.color, alpha: 1, drag: 0.6, gravity: -0.8,
      });
      if (Math.random() < 0.5) {
        this.smoke.emit({
          position: this.somewhereOn(t, 0, 1),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4),
          life: 1.2 + Math.random(), size: 0.4 * scale, sizeEnd: 1.4 * scale, color: this.smokeColor, alpha: 0.5, drag: 0.5,
        });
      }
    }
  }
}

/** Chains the haunt onto a material, after whatever it already does. */
function haunt(material: THREE.MeshStandardMaterial, uniforms: HauntUniforms): void {
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms, { uHauntTime: hauntTime });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHauntPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAGMENT_CLIP}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${FRAGMENT_COLOR}`)
      .replace('#include <opaque_fragment>', `${FRAGMENT_GLOW}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `${previousKey ? previousKey() : ''}|haunt`;
  material.needsUpdate = true;
}
