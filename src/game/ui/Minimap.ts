import * as THREE from 'three';
import { Rect } from '../levels/LevelTypes';

/**
 * Minimap — A round map in the top corner that turns with the camera, so up
 * is always the way you're looking. The ground you've walked fills in as you
 * go; the way on is a gold thread; yokai are red sparks; the boss or the gate
 * waits at the end, pinned to the rim when it's out of sight.
 */

export interface MinimapLayout {
  bounds: Rect;
  water: Rect[];
  decks: Rect[];
  boxes: THREE.Box3[];
  spheres: { center: THREE.Vector3; radius: number }[];
  /** Fires that never go out, drawn as embers to keep clear of. */
  fires?: { x: number; z: number; radius: number }[];
  /** Colours for walls and open ground. */
  wall?: string;
  ground?: string;
}

export interface MinimapFrame {
  player: THREE.Vector3;
  /** The Ronin's facing, as root.rotation.y. */
  facing: number;
  /** The camera's yaw: the map turns with it. */
  yaw: number;
  path: THREE.Vector3[] | null;
  objective: { position: THREE.Vector3; kind: 'boss' | 'gate'; label: string } | null;
  enemies: { position: THREE.Vector3; isElite: boolean }[];
  shrine: THREE.Vector3 | null;
}

const PIXELS_PER_METRE = 6;
const VIEW_RADIUS = 30;
const REVEAL_RADIUS = 15;

export class Minimap {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private label: HTMLDivElement;
  private base: HTMLCanvasElement | null = null;
  private explored: HTMLCanvasElement | null = null;
  private exploredCtx: CanvasRenderingContext2D | null = null;
  private layout: MinimapLayout | null = null;
  private lastReveal = new THREE.Vector3(Infinity, 0, Infinity);
  private time = 0;
  private size = 0;
  private shownLabel = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'minimap';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap__canvas';
    this.ctx = this.canvas.getContext('2d')!;
    this.label = document.createElement('div');
    this.label.className = 'minimap__label';
    this.root.append(this.canvas, this.label);
    document.body.appendChild(this.root);
  }

  /** Draws the level's walls and water once, and forgets what was explored. */
  public setLevel(layout: MinimapLayout | null): void {
    this.layout = layout;
    this.lastReveal.set(Infinity, 0, Infinity);
    if (!layout) {
      this.base = this.explored = null;
      this.exploredCtx = null;
      this.setVisible(false);
      return;
    }
    const b = layout.bounds;
    const width = Math.ceil((b.maxX - b.minX) * PIXELS_PER_METRE);
    const height = Math.ceil((b.maxZ - b.minZ) * PIXELS_PER_METRE);
    const base = document.createElement('canvas');
    base.width = width;
    base.height = height;
    const ctx = base.getContext('2d')!;
    const px = (x: number) => (x - b.minX) * PIXELS_PER_METRE;
    const pz = (z: number) => (z - b.minZ) * PIXELS_PER_METRE;
    const fillRect = (r: Rect) => ctx.fillRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * PIXELS_PER_METRE, (r.maxZ - r.minZ) * PIXELS_PER_METRE);

    ctx.fillStyle = layout.ground ?? 'rgba(46, 52, 40, 0.92)';
    ctx.fillRect(0, 0, width, height);
    // Faint texture, so open ground doesn't read as a flat slab
    for (let i = 0; i < width * height / 90; i++) {
      ctx.fillStyle = `rgba(255,255,240,${Math.random() * 0.035})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }

    ctx.fillStyle = 'rgba(38, 86, 118, 0.95)';
    for (const r of layout.water) fillRect(r);
    ctx.fillStyle = 'rgba(126, 98, 62, 0.95)';
    for (const r of layout.decks) fillRect(r);
    ctx.strokeStyle = 'rgba(40, 28, 16, 0.8)';
    ctx.lineWidth = 1;
    for (const r of layout.decks) ctx.strokeRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * PIXELS_PER_METRE, (r.maxZ - r.minZ) * PIXELS_PER_METRE);

    // Walls, with a soft shadow so passages read at a glance
    const drawWalls = () => {
      for (const box of layout.boxes) {
        if (box.max.x < b.minX - 2 || box.min.x > b.maxX + 2 || box.max.z < b.minZ - 2 || box.min.z > b.maxZ + 2) continue;
        ctx.globalAlpha = box.max.y < 1 ? 0.55 : 1;
        ctx.fillRect(px(box.min.x), pz(box.min.z), (box.max.x - box.min.x) * PIXELS_PER_METRE, (box.max.z - box.min.z) * PIXELS_PER_METRE);
      }
      ctx.globalAlpha = 1;
      for (const s of layout.spheres) {
        ctx.beginPath();
        ctx.arc(px(s.center.x), pz(s.center.z), s.radius * PIXELS_PER_METRE, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(10, 12, 10, 0.9)';
    drawWalls();
    ctx.restore();
    ctx.fillStyle = layout.wall ?? 'rgba(214, 206, 182, 1)';
    drawWalls();

    for (const fire of layout.fires ?? []) {
      const glow = ctx.createRadialGradient(px(fire.x), pz(fire.z), 0, px(fire.x), pz(fire.z), fire.radius * PIXELS_PER_METRE * 1.3);
      glow.addColorStop(0, 'rgba(255, 200, 90, 0.95)');
      glow.addColorStop(0.45, 'rgba(255, 90, 30, 0.75)');
      glow.addColorStop(1, 'rgba(160, 30, 10, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px(fire.x), pz(fire.z), fire.radius * PIXELS_PER_METRE * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    this.base = base;
    this.explored = document.createElement('canvas');
    this.explored.width = width;
    this.explored.height = height;
    this.exploredCtx = this.explored.getContext('2d')!;
    // Shown once play is under way, not over the title screen
    this.setVisible(false);
  }

  public setVisible(isVisible: boolean): void {
    this.root.classList.toggle('minimap--visible', isVisible && !!this.layout);
    document.body.classList.toggle('has-minimap', isVisible && !!this.layout);
  }

  public update(dt: number, frame: MinimapFrame): void {
    if (!this.layout || !this.base || !this.explored || !this.exploredCtx) return;
    this.time += dt;
    this.reveal(frame.player);

    const cssSize = this.root.clientWidth || 176;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixels = Math.round(cssSize * dpr);
    if (pixels !== this.size) {
      this.size = pixels;
      this.canvas.width = this.canvas.height = pixels;
    }
    const ctx = this.ctx;
    const half = cssSize / 2;
    const radius = half - 6;
    const scale = radius / VIEW_RADIUS;
    const cos = Math.cos(frame.yaw);
    const sin = Math.sin(frame.yaw);
    const toScreen = (x: number, z: number): [number, number] => {
      const dx = x - frame.player.x;
      const dz = z - frame.player.z;
      return [half + (dx * cos - dz * sin) * scale, half + (dx * sin + dz * cos) * scale];
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    // The disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, radius, 0, Math.PI * 2);
    ctx.clip();
    const backdrop = ctx.createRadialGradient(half, half, radius * 0.2, half, half, radius);
    backdrop.addColorStop(0, 'rgba(14, 16, 14, 0.72)');
    backdrop.addColorStop(1, 'rgba(4, 5, 5, 0.86)');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, cssSize, cssSize);

    // The ground walked so far, turned with the camera
    const b = this.layout.bounds;
    ctx.save();
    ctx.translate(half, half);
    ctx.transform(cos * scale, sin * scale, -sin * scale, cos * scale, 0, 0);
    ctx.translate(-frame.player.x, -frame.player.z);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.explored, b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);

    // The way on: a gold thread that runs forward
    if (frame.path && frame.path.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(frame.path[0].x, frame.path[0].z);
      for (let i = 1; i < frame.path.length; i++) ctx.lineTo(frame.path[i].x, frame.path[i].z);
      ctx.strokeStyle = 'rgba(255, 196, 96, 0.28)';
      ctx.lineWidth = 7 / scale;
      ctx.stroke();
      ctx.setLineDash([2.2 / scale * 2, 2.8 / scale * 2]);
      ctx.lineDashOffset = -this.time * 14 / scale;
      ctx.strokeStyle = 'rgba(255, 220, 150, 0.95)';
      ctx.lineWidth = 2.4 / scale;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // The shrine
    if (frame.shrine) {
      const [sx, sy] = toScreen(frame.shrine.x, frame.shrine.z);
      if (Math.hypot(sx - half, sy - half) < radius - 4) this.drawShrine(sx, sy);
    }

    // Yokai close by
    for (const enemy of frame.enemies) {
      const [ex, ey] = toScreen(enemy.position.x, enemy.position.z);
      if (Math.hypot(ex - half, ey - half) > radius - 3) continue;
      const pulse = 0.75 + Math.sin(this.time * 6 + enemy.position.x) * 0.25;
      ctx.fillStyle = `rgba(255, 60, 50, ${0.25 * pulse})`;
      ctx.beginPath();
      ctx.arc(ex, ey, enemy.isElite ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.isElite ? '#ffb070' : '#ff5a4a';
      ctx.beginPath();
      ctx.arc(ex, ey, enemy.isElite ? 3.2 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Where to go: on the map if it's close, pinned to the rim if not
    if (frame.objective) {
      let [ox, oy] = toScreen(frame.objective.position.x, frame.objective.position.z);
      const dx = ox - half;
      const dy = oy - half;
      const distance = Math.hypot(dx, dy);
      const isPinned = distance > radius - 10;
      if (isPinned) {
        ox = half + (dx / distance) * (radius - 10);
        oy = half + (dy / distance) * (radius - 10);
      }
      this.drawObjective(ox, oy, frame.objective.kind, isPinned ? Math.atan2(dy, dx) : null);
    }

    // The rim and north
    ctx.strokeStyle = 'rgba(185, 154, 98, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(half, half, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(185, 154, 98, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(half, half, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    const [nx, ny] = [half + sin * (radius + 0.5), half - cos * (radius + 0.5)];
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9dec8';
    ctx.font = '600 9px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);

    // The Ronin, and the way the camera looks
    const cone = ctx.createRadialGradient(half, half, 0, half, half, radius * 0.55);
    cone.addColorStop(0, 'rgba(233, 222, 200, 0.22)');
    cone.addColorStop(1, 'rgba(233, 222, 200, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.arc(half, half, radius * 0.55, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55);
    ctx.closePath();
    ctx.fill();
    const fx = Math.sin(frame.facing);
    const fz = Math.cos(frame.facing);
    const angle = Math.atan2(fx * sin + fz * cos, fx * cos - fz * sin);
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#f4ead6';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // The objective's name and distance, under the map
    let text = '';
    if (frame.objective) {
      const metres = frame.path && frame.path.length > 1 ? pathMetres(frame.path) : frame.player.distanceTo(frame.objective.position);
      text = `${frame.objective.label} · ${Math.max(0, Math.round(metres))} m`;
    }
    if (text !== this.shownLabel) {
      this.shownLabel = text;
      this.label.textContent = text;
    }
  }

  /** Fills in the map around the Ronin. */
  private reveal(position: THREE.Vector3): void {
    if (!this.base || !this.exploredCtx || !this.layout) return;
    if (Math.hypot(position.x - this.lastReveal.x, position.z - this.lastReveal.z) < 0.8) return;
    this.lastReveal.copy(position);
    const b = this.layout.bounds;
    const x = (position.x - b.minX) * PIXELS_PER_METRE;
    const z = (position.z - b.minZ) * PIXELS_PER_METRE;
    const r = REVEAL_RADIUS * PIXELS_PER_METRE;
    const ctx = this.exploredCtx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();
  }

  private drawShrine(x: number, y: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(138, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bfe2ff';
    ctx.fillRect(x - 3.5, y - 3, 7, 1.6);
    ctx.fillRect(x - 2.5, y - 1.4, 1.4, 4.4);
    ctx.fillRect(x + 1.1, y - 1.4, 1.4, 4.4);
  }

  private drawObjective(x: number, y: number, kind: 'boss' | 'gate', pinnedAngle: number | null): void {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.time * 4) * 0.12;
    const color = kind === 'boss' ? '#ff5a3a' : '#ffd27a';
    ctx.save();
    ctx.translate(x, y);
    if (pinnedAngle !== null) {
      // An arrowhead on the rim pointing the way
      ctx.save();
      ctx.rotate(pinnedAngle);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(8, -4);
      ctx.lineTo(8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(8, 8, 8, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    if (kind === 'boss') {
      // An oni's horned head
      ctx.beginPath();
      ctx.arc(0, 1, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3.2, -0.5); ctx.lineTo(-4.4, -5); ctx.lineTo(-1.4, -1.8);
      ctx.moveTo(3.2, -0.5); ctx.lineTo(4.4, -5); ctx.lineTo(1.4, -1.8);
      ctx.fill();
    } else {
      // A torii
      ctx.fillRect(-4.5, -3.6, 9, 1.4);
      ctx.fillRect(-3.6, -1.6, 7.2, 1);
      ctx.fillRect(-3, -2.4, 1.3, 6);
      ctx.fillRect(1.7, -2.4, 1.3, 6);
    }
    ctx.restore();
  }
}

function pathMetres(path: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].z - path[i].z);
  return total;
}
