import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

export type DamageKind = 'normal' | 'heavy' | 'critical' | 'player' | 'label';

const POOL_SIZE = 24;
const LIFETIME = 0.85;
const RISE_UNITS = 1.3;

const STYLES: Record<DamageKind, { color: string; size: number }> = {
  normal: { color: '#f4efe4', size: 22 },
  heavy: { color: '#f2c14e', size: 30 },
  critical: { color: '#ff5436', size: 38 },
  player: { color: '#ff6a5a', size: 24 },
  label: { color: '#9fd8ff', size: 20 },
};

interface FloatingNumber {
  element: HTMLDivElement;
  position: THREE.Vector3;
  age: number;
  drift: number;
  isActive: boolean;
}

/** Numbers and short labels that rise from where a hit landed. */
export class DamageNumbers {
  private layer: HTMLDivElement;
  private items: FloatingNumber[] = [];
  private next = 0;
  private projected = new THREE.Vector3();

  constructor() {
    this.layer = document.createElement('div');
    Object.assign(this.layer.style, {
      position: 'fixed', inset: '0', overflow: 'hidden', pointerEvents: 'none', zIndex: '60',
    });

    for (let i = 0; i < POOL_SIZE; i++) {
      const element = document.createElement('div');
      Object.assign(element.style, {
        position: 'absolute', left: '0', top: '0', display: 'none',
        fontFamily: "'Cinzel', serif", fontWeight: '700', letterSpacing: '0.04em',
        textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 2px #000', willChange: 'transform, opacity',
      });
      this.layer.appendChild(element);
      this.items.push({ element, position: new THREE.Vector3(), age: 0, drift: 0, isActive: false });
    }
    document.body.appendChild(this.layer);

    EventBus.on('damageNumber', (data: { position: THREE.Vector3; text: string; kind: DamageKind }) => {
      this.show(data.position, data.text, data.kind);
    });
  }

  private show(position: THREE.Vector3, text: string, kind: DamageKind): void {
    const item = this.items[this.next];
    this.next = (this.next + 1) % POOL_SIZE;

    item.position.copy(position);
    item.position.y += kind === 'label' ? 2.5 : 1.9;
    item.age = 0;
    item.drift = (Math.random() - 0.5) * 34;
    item.isActive = true;

    const style = STYLES[kind];
    item.element.textContent = text;
    item.element.style.color = style.color;
    item.element.style.fontSize = `${style.size}px`;
    item.element.style.display = 'block';
  }

  public update(dt: number, camera: THREE.Camera): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const item of this.items) {
      if (!item.isActive) continue;

      item.age += dt;
      if (item.age >= LIFETIME) {
        item.isActive = false;
        item.element.style.display = 'none';
        continue;
      }

      const t = item.age / LIFETIME;
      this.projected.copy(item.position);
      this.projected.y += (1 - (1 - t) * (1 - t)) * RISE_UNITS;
      this.projected.project(camera);

      // z above 1 means the point is behind the camera
      if (this.projected.z > 1) {
        item.element.style.opacity = '0';
        continue;
      }

      const x = (this.projected.x * 0.5 + 0.5) * width + item.drift * t;
      const y = (-this.projected.y * 0.5 + 0.5) * height;
      const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.75 : 1.35 - Math.min(1, (t - 0.12) / 0.15) * 0.35;
      item.element.style.opacity = String(t > 0.6 ? (1 - t) / 0.4 : 1);
      item.element.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${pop.toFixed(3)})`;
    }
  }
}
