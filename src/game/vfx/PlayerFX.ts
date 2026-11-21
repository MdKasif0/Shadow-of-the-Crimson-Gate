import * as THREE from 'three';
import { Ronin } from '../characters/Ronin';
import { KatanaTrail } from './KatanaTrail';
import { Afterimages } from './Afterimages';
import { SoftParticles } from './SoftParticles';
import { ScreenPulse } from '../rendering/ScreenPulse';
import { EventBus } from '../core/EventBus';
import { getGlowTexture } from '../utils/ProceduralTextures';

const HEAVY_CUTS = new Set(['ATTACK_3', 'ATTACK_4', 'ATTACK_HEAVY', 'ATTACK_FINISHER', 'ATTACK_WHIRL', 'ATTACK_EXECUTE']);
const DASH_GHOST_EVERY = 0.035;

/** A four-pointed flash, for the instant a blade bites. */
function starTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.12, 'rgba(255,240,220,0.8)');
  glow.addColorStop(0.4, 'rgba(255,160,120,0.15)');
  glow.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[c, 3], [3, c * 0.7]]) {
    const ray = ctx.createRadialGradient(c, c, 0, c, c, Math.max(w, h));
    ray.addColorStop(0, 'rgba(255,255,255,0.95)');
    ray.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.ellipse(c, c, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * PlayerFX — What makes the Ronin's sword and footwork read: a ribbon of
 * light behind each cut, a flash where it bites, ghosts left along a dash
 * with dust thrown up at the start, and on a perfect dodge, a shadow of
 * themself left standing for the blow to pass through.
 */
export class PlayerFX {
  private trail: KatanaTrail;
  private ghosts: Afterimages;
  private dust = new SoftParticles(220, { blending: 'normal', softness: 1.2, noisy: true });
  private sparks = new SoftParticles(260, { softness: 2.2 });
  private flashes: { sprite: THREE.Sprite; life: number; size: number }[] = [];
  private nextFlash = 0;
  private wasDashing = false;
  private ghostTimer = 0;
  private base = new THREE.Vector3();
  private tip = new THREE.Vector3();
  private unsubscribe: (() => void)[] = [];

  constructor(private readonly scene: THREE.Scene, private readonly player: Ronin, private readonly camera: () => THREE.Camera) {
    this.trail = new KatanaTrail(scene);
    this.ghosts = new Afterimages(player.root, scene, 10, 0x9ad4ff);
    scene.add(this.dust.points, this.sparks.points);

    const texture = starTexture();
    for (let i = 0; i < 4; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture, color: new THREE.Color(2.4, 2.1, 1.9), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      }));
      sprite.visible = false;
      sprite.renderOrder = 6;
      sprite.userData.noAO = true;
      scene.add(sprite);
      this.flashes.push({ sprite, life: 0, size: 1 });
    }

    const onDodge = () => this.onPerfectDodge();
    const onHit = (data: { position: THREE.Vector3; direction: THREE.Vector3; isHeavy: boolean; isKill: boolean }) => this.onHit(data);
    EventBus.on('perfectDodge', onDodge);
    EventBus.on('playerHitLanded', onHit);
    this.unsubscribe.push(() => EventBus.off('perfectDodge', onDodge), () => EventBus.off('playerHitLanded', onHit));
  }

  public update(dt: number): void {
    const player = this.player;

    // The blade's trail
    player.bladeEnds(this.base, this.tip);
    const attack = player.currentAttack;
    this.trail.update(dt, this.base, this.tip, player.isCutting, !!attack && HEAVY_CUTS.has(attack.id));

    // Dashes: dust off the mark, ghosts all the way along
    const dash = player.dashSystem;
    if (dash.isDashing && !this.wasDashing) {
      this.kickUp(dash.dashDirection, 1);
      this.ghosts.spawn({ life: 0.32, opacity: 0.9 });
      this.ghostTimer = 0;
    }
    if (dash.isDashing) {
      this.ghostTimer += dt;
      while (this.ghostTimer >= DASH_GHOST_EVERY) {
        this.ghostTimer -= DASH_GHOST_EVERY;
        this.ghosts.spawn({ life: 0.26, opacity: 0.55 + (1 - dash.progress) * 0.3 });
      }
    } else if (this.wasDashing) {
      this.kickUp(dash.dashDirection, 0.5);
    }
    this.wasDashing = dash.isDashing;

    this.ghosts.update(dt);
    this.dust.update(dt);
    this.sparks.update(dt);
    for (const flash of this.flashes) {
      if (flash.life <= 0) continue;
      flash.life -= dt;
      const t = 1 - Math.max(0, flash.life) / 0.12;
      flash.sprite.visible = flash.life > 0;
      flash.sprite.scale.setScalar(flash.size * (0.4 + t * 0.9));
      flash.sprite.material.opacity = 1 - t * t;
      flash.sprite.material.rotation += dt * 2;
    }
  }

  /** Dust thrown back from the feet, or a spray of water if wading. */
  private kickUp(direction: THREE.Vector3, strength: number): void {
    const feet = this.player.root.position;
    const isWater = this.player.surfaceAt?.(feet.x, feet.z) === 'water';
    const count = Math.round((isWater ? 22 : 16) * strength * SoftParticles.density());
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const back = direction.clone().multiplyScalar(-(1.5 + Math.random() * 2.5));
      if (isWater) {
        this.sparks.emit({
          position: feet.clone().add(new THREE.Vector3(out.x * 0.3, 0.1, out.z * 0.3)),
          velocity: out.multiplyScalar(1 + Math.random() * 2).add(back).setY(2.5 + Math.random() * 3),
          life: 0.5 + Math.random() * 0.3, size: 0.08, sizeEnd: 0.05, color: new THREE.Color(0.55, 0.7, 0.8), alpha: 0.8, gravity: 14,
        });
      } else {
        this.dust.emit({
          position: feet.clone().add(new THREE.Vector3(out.x * 0.35, 0.12 + Math.random() * 0.2, out.z * 0.35)),
          velocity: out.multiplyScalar(0.6 + Math.random() * 1.4).add(back).setY(0.3 + Math.random() * 0.6),
          life: 0.55 + Math.random() * 0.5, size: 0.35, sizeEnd: 1.3, color: new THREE.Color(0.32, 0.3, 0.27), alpha: 0.32 * strength, drag: 3.5,
        });
      }
    }
  }

  /** The blow passes through a shadow; the world slows and drains of colour around it. */
  private onPerfectDodge(): void {
    this.ghosts.spawn({ life: 0.9, opacity: 1, breaks: true, color: new THREE.Color(0.55, 0.75, 1.4) });
    const position = this.player.root.position.clone().setY(this.player.root.position.y + 1.1);
    const screen = position.clone().project(this.camera());
    ScreenPulse.origin.x = screen.x * 0.5 + 0.5;
    ScreenPulse.origin.y = screen.y * 0.5 + 0.5;
    ScreenPulse.kickSpirit(1);
    for (let i = 0; i < 40 * SoftParticles.density(); i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
      this.sparks.emit({
        position: position.clone().addScaledVector(dir, 0.3),
        velocity: dir.multiplyScalar(2 + Math.random() * 3),
        life: 0.6 + Math.random() * 0.5, size: 0.12, sizeEnd: 0.02, color: new THREE.Color(0.7, 0.9, 1.6), drag: 2.5, gravity: -0.6,
      });
    }
  }

  /** A star of light where the blade bites, and the screen kicks with it. */
  private onHit(data: { position: THREE.Vector3; direction: THREE.Vector3; isHeavy: boolean; isKill: boolean }): void {
    const flash = this.flashes[this.nextFlash];
    this.nextFlash = (this.nextFlash + 1) % this.flashes.length;
    flash.life = 0.12;
    flash.size = data.isKill ? 3.4 : data.isHeavy ? 2.6 : 1.7;
    flash.sprite.position.copy(data.position).setY(data.position.y + 1.05).addScaledVector(data.direction, -0.2);
    flash.sprite.visible = true;
    flash.sprite.material.rotation = Math.random() * Math.PI;
    if (data.isHeavy || data.isKill) ScreenPulse.kickImpact(data.isKill ? 1 : 0.7);
    else ScreenPulse.kickImpact(0.25);
  }

  public clear(): void {
    this.trail.clear();
    this.ghosts.clear();
    this.dust.clear();
    this.sparks.clear();
  }

  public dispose(): void {
    for (const off of this.unsubscribe) off();
    this.ghosts.dispose();
    this.dust.dispose();
    this.sparks.dispose();
  }
}
