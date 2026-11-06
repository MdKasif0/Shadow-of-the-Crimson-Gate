/**
 * HeroAtmosphere — The living layers of the title screen.
 *
 * Two canvases, rather than hundreds of DOM particles:
 *   - Scene: low-resolution light and fog, screen-blended over the painting.
 *   - Front: petals, dust and embers drifting in front of everything.
 *
 * Light positions are in painting coordinates (0–1), so they stay on the
 * lanterns and the moon however the image is cropped.
 */

export const IMAGE_WIDTH = 2508;
export const IMAGE_HEIGHT = 1411;
/** Where the seam of the gate doors sits across the painting. */
const GATE_CENTER_U = 0.614;
/** On portrait screens: the painting's height and top edge, as fractions of the screen's height. */
const PORTRAIT_HEIGHT = 0.64;
const PORTRAIT_TOP = 0.2;

interface Glow {
  u: number;
  v: number;
  radius: number; // Fraction of the painting's width
  color: string;
  strength: number;
  flicker: number;
  phase: number;
}

const GLOWS: Glow[] = [
  // Soft light around the gate
  { u: 0.614, v: 0.56, radius: 0.27, color: '18, 92, 80', strength: 0.34, flicker: 0.03, phase: 0 },
  // Moon and its halo
  { u: 0.816, v: 0.09, radius: 0.2, color: '150, 210, 190', strength: 0.3, flicker: 0.02, phase: 1.7 },
  // Crimson light coming off the pillars
  { u: 0.497, v: 0.62, radius: 0.09, color: '160, 26, 22', strength: 0.26, flicker: 0.06, phase: 2.4 },
  { u: 0.733, v: 0.62, radius: 0.09, color: '160, 26, 22', strength: 0.26, flicker: 0.06, phase: 4.1 },
  // Lanterns
  { u: 0.46, v: 0.695, radius: 0.058, color: '255, 158, 74', strength: 0.5, flicker: 0.14, phase: 0.6 },
  { u: 0.77, v: 0.695, radius: 0.058, color: '255, 158, 74', strength: 0.5, flicker: 0.14, phase: 3.3 },
  { u: 0.358, v: 0.775, radius: 0.032, color: '255, 158, 74', strength: 0.42, flicker: 0.16, phase: 5.2 },
  { u: 0.874, v: 0.775, radius: 0.032, color: '255, 158, 74', strength: 0.42, flicker: 0.16, phase: 1.1 },
  { u: 0.03, v: 0.8, radius: 0.075, color: '255, 158, 74', strength: 0.46, flicker: 0.12, phase: 2.9 },
];

const MOON = { u: 0.816, v: 0.09 };

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  kind: 'dust' | 'ember';
}

interface Petal {
  x: number;
  y: number;
  depth: number;
  rotation: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  sprite: HTMLCanvasElement;
  size: number;
  alpha: number;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Soft, horizontally seamless bank of mist. */
function createFogTile(): HTMLCanvasElement {
  const width = 1024;
  const height = 256;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * width;
    const y = height * (0.3 + Math.random() * 0.55);
    const radius = 50 + Math.random() * 110;
    const alpha = 0.03 + Math.random() * 0.07;
    // Drawn three times, so blobs crossing an edge wrap to the other side
    for (const offset of [-width, 0, width]) {
      const gradient = ctx.createRadialGradient(x + offset, y, 0, x + offset, y, radius);
      gradient.addColorStop(0, `rgba(150, 196, 182, ${alpha})`);
      gradient.addColorStop(1, 'rgba(150, 196, 182, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x + offset - radius, y - radius, radius * 2, radius * 2);
    }
  }
  return canvas;
}

/** A petal, drawn small and scaled up by `softness` to blur it without canvas filters. */
function createPetalSprite(color: string, softness: number): HTMLCanvasElement {
  const size = 64;
  const small = makeCanvas(Math.round(size / softness), Math.round(size / softness));
  const ctx = small.getContext('2d')!;
  const s = small.width;

  ctx.translate(s / 2, s / 2);
  const gradient = ctx.createLinearGradient(0, -s * 0.42, 0, s * 0.42);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(70, 8, 16, 0.92)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.42);
  ctx.bezierCurveTo(s * 0.34, -s * 0.2, s * 0.26, s * 0.3, 0, s * 0.42);
  ctx.bezierCurveTo(-s * 0.26, s * 0.3, -s * 0.34, -s * 0.2, 0, -s * 0.42);
  ctx.fill();

  const sprite = makeCanvas(size, size);
  const spriteCtx = sprite.getContext('2d')!;
  spriteCtx.imageSmoothingQuality = 'high';
  spriteCtx.drawImage(small, 0, 0, size, size);
  return sprite;
}

export class HeroAtmosphere {
  private sceneCtx: CanvasRenderingContext2D;
  private frontCtx: CanvasRenderingContext2D;

  private width = 0;
  private height = 0;
  private sceneScale = 0.6;
  private imageScale = 1;
  private offsetX = 0;
  private offsetY = 0;

  private fog = createFogTile();
  private petals: Petal[] = [];
  private motes: Mote[] = [];
  private sharpSprites: HTMLCanvasElement[];
  private softSprites: HTMLCanvasElement[];

  private rafId: number | null = null;
  private lastTime = 0;
  private time = 0;
  private frame = 0;

  private pointerX = 0;
  private pointerY = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  constructor(
    private host: HTMLElement,
    private sceneLayer: HTMLElement,
    private frontLayer: HTMLElement,
    private image: HTMLImageElement,
    private sceneCanvas: HTMLCanvasElement,
    private frontCanvas: HTMLCanvasElement,
    private isReducedMotion: boolean,
  ) {
    this.sceneCtx = sceneCanvas.getContext('2d')!;
    this.frontCtx = frontCanvas.getContext('2d')!;

    const colors = ['#a81c26', '#c9283a', '#e6a5ae'];
    this.sharpSprites = colors.map(color => createPetalSprite(color, 1.5));
    this.softSprites = colors.map(color => createPetalSprite(color, 7));

    this.handleResize = this.handleResize.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.handleResize);
    host.addEventListener('pointermove', this.handlePointer);
    this.handleResize();
  }

  public start(): void {
    if (this.isReducedMotion) {
      this.drawScene();
      return;
    }
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener('resize', this.handleResize);
    this.host.removeEventListener('pointermove', this.handlePointer);
  }

  private handlePointer(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.pointerX = event.clientX / window.innerWidth - 0.5;
    this.pointerY = event.clientY / window.innerHeight - 0.5;
  }

  private handleResize(): void {
    const bounds = this.sceneLayer.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.layoutImage();

    this.sceneCanvas.width = Math.round(this.width * this.sceneScale);
    this.sceneCanvas.height = Math.round(this.height * this.sceneScale);

    const frontBounds = this.frontLayer.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    this.frontCanvas.width = Math.round(frontBounds.width * dpr);
    this.frontCanvas.height = Math.round(frontBounds.height * dpr);
    this.frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.populate(frontBounds.width, frontBounds.height);
    if (this.isReducedMotion) this.drawScene();
  }

  /**
   * Frames the painting for the screen's shape.
   *
   * Landscape: the gate sits right of centre, moved in closer if need be, leaving
   * the title a dark sky to sit against.
   *
   * Portrait: filling the height would leave nothing but door. Instead the whole
   * gate stands between the title and the menu, its top and bottom edges fading out.
   */
  private layoutImage(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const isPortrait = aspect < 1;

    // 4:3 screens need the gate further over; ultra-wide ones have room to spare
    const narrowness = Math.min(Math.max(1.6 - aspect, 0), 0.3);
    const wideness = Math.min(Math.max((aspect - 1.85) / 0.35, 0), 1);
    const gateTarget = isPortrait
      ? 0.5
      : 0.65 + narrowness * 0.15 + (GATE_CENTER_U - 0.65) * wideness;

    const scale = isPortrait
      ? Math.max(this.width / IMAGE_WIDTH, (this.height * PORTRAIT_HEIGHT) / IMAGE_HEIGHT)
      : Math.max(
          this.width / IMAGE_WIDTH,
          this.height / IMAGE_HEIGHT,
          (this.width * gateTarget) / (GATE_CENTER_U * IMAGE_WIDTH),
        );
    const scaledWidth = IMAGE_WIDTH * scale;
    const scaledHeight = IMAGE_HEIGHT * scale;

    this.imageScale = scale;
    this.offsetX = Math.min(Math.max(this.width * gateTarget - GATE_CENTER_U * scaledWidth, this.width - scaledWidth), 0);
    this.offsetY = isPortrait ? this.height * PORTRAIT_TOP : (this.height - scaledHeight) * 0.4;

    this.image.style.width = `${scaledWidth}px`;
    this.image.style.height = `${scaledHeight}px`;
    this.image.style.left = `${this.offsetX}px`;
    this.image.style.top = `${this.offsetY}px`;
  }

  private toX(u: number): number {
    return this.offsetX + u * IMAGE_WIDTH * this.imageScale;
  }

  private toY(v: number): number {
    return this.offsetY + v * IMAGE_HEIGHT * this.imageScale;
  }

  private populate(width: number, height: number): void {
    const density = Math.min(width / 1400, 1);
    const petalCount = Math.round(9 + 15 * density);
    const moteCount = Math.round(16 + 30 * density);

    this.petals = Array.from({ length: petalCount }, () => this.createPetal(width, height, true));
    this.motes = Array.from({ length: moteCount }, (_, i) => this.createMote(width, height, i % 5 === 0));
  }

  private createPetal(width: number, height: number, scatter: boolean): Petal {
    // Most are mid-distance. A rare few pass right by the camera, large and out of focus.
    const roll = Math.random();
    const depth = roll > 0.9 ? 1.9 + Math.random() * 0.8 : 0.45 + Math.random() * 0.75;
    const isNear = depth > 1.5;
    const sprites = isNear ? this.softSprites : this.sharpSprites;

    return {
      x: scatter ? Math.random() * width : width * (0.25 + Math.random() * 0.95),
      y: scatter ? Math.random() * height : -40 - Math.random() * height * 0.25,
      depth,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.1,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.8 + Math.random() * 1.2,
      sway: Math.random() * Math.PI * 2,
      sprite: sprites[Math.floor(Math.random() * sprites.length)],
      size: (isNear ? 15 : 7) + Math.random() * 6,
      alpha: isNear ? 0.42 : 0.5 + Math.random() * 0.35,
    };
  }

  private createMote(width: number, height: number, isEmber: boolean): Mote {
    return {
      x: Math.random() * width,
      y: isEmber ? height * (0.55 + Math.random() * 0.45) : Math.random() * height,
      vx: (Math.random() - 0.5) * (isEmber ? 9 : 5),
      vy: isEmber ? -6 - Math.random() * 12 : (Math.random() - 0.5) * 4,
      size: isEmber ? 0.8 + Math.random() * 1.1 : 0.5 + Math.random() * 1.1,
      alpha: isEmber ? 0.8 : 0.14 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      kind: isEmber ? 'ember' : 'dust',
    };
  }

  private loop(now: number): void {
    this.rafId = requestAnimationFrame(this.loop);

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;
    this.frame++;

    this.updateCamera(dt);
    // Light and fog change slowly, so half the frame rate is plenty
    if (this.frame % 2 === 0) this.drawScene();
    this.drawFront(dt);
  }

  /** A slow breathing drift, plus layered parallax from the mouse. */
  private updateCamera(dt: number): void {
    const ease = 1 - Math.exp(-1.8 * dt);
    this.parallaxX += (this.pointerX - this.parallaxX) * ease;
    this.parallaxY += (this.pointerY - this.parallaxY) * ease;

    const reach = window.innerWidth * 0.009;
    const driftX = Math.sin(this.time * 0.11) * reach * 0.55;
    const driftY = Math.cos(this.time * 0.083) * reach * 0.35;

    const sceneX = -this.parallaxX * reach * 1.1 + driftX;
    const sceneY = -this.parallaxY * reach * 0.7 + driftY;
    this.sceneLayer.style.transform = `translate3d(${sceneX.toFixed(2)}px, ${sceneY.toFixed(2)}px, 0)`;

    const frontX = -this.parallaxX * reach * 3 + driftX * 1.8;
    const frontY = -this.parallaxY * reach * 1.9 + driftY * 1.8;
    this.frontLayer.style.transform = `translate3d(${frontX.toFixed(2)}px, ${frontY.toFixed(2)}px, 0)`;
  }

  private drawScene(): void {
    const ctx = this.sceneCtx;
    ctx.setTransform(this.sceneScale, 0, 0, this.sceneScale, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    this.drawMoonlight(ctx);
    this.drawGlows(ctx);
    this.drawFog(ctx);

    ctx.globalCompositeOperation = 'source-over';
  }

  /** Faint shafts of moonlight falling through the haze towards the gate. */
  private drawMoonlight(ctx: CanvasRenderingContext2D): void {
    const sourceX = this.toX(MOON.u);
    const sourceY = this.toY(MOON.v);
    const length = IMAGE_WIDTH * this.imageScale * 0.56;

    const shafts = [
      { angle: 2.1, spread: 0.045, strength: 0.05, speed: 0.17 },
      { angle: 2.32, spread: 0.07, strength: 0.065, speed: 0.11 },
      { angle: 2.55, spread: 0.035, strength: 0.04, speed: 0.23 },
    ];

    for (const shaft of shafts) {
      const breathe = 0.72 + Math.sin(this.time * shaft.speed + shaft.angle * 4) * 0.28;
      const gradient = ctx.createRadialGradient(sourceX, sourceY, 0, sourceX, sourceY, length);
      gradient.addColorStop(0, `rgba(160, 220, 205, ${shaft.strength * breathe})`);
      gradient.addColorStop(1, 'rgba(160, 220, 205, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(sourceX + Math.cos(shaft.angle - shaft.spread) * length, sourceY + Math.sin(shaft.angle - shaft.spread) * length);
      ctx.lineTo(sourceX + Math.cos(shaft.angle + shaft.spread) * length, sourceY + Math.sin(shaft.angle + shaft.spread) * length);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawGlows(ctx: CanvasRenderingContext2D): void {
    const paintingWidth = IMAGE_WIDTH * this.imageScale;

    for (const glow of GLOWS) {
      const x = this.toX(glow.u);
      const y = this.toY(glow.v);
      const radius = glow.radius * paintingWidth;
      if (x + radius < 0 || x - radius > this.width) continue;

      // Layered sines read as a flame; a single one reads as a pulsing light
      const t = this.time;
      const flicker = 1
        + Math.sin(t * 1.9 + glow.phase) * glow.flicker
        + Math.sin(t * 4.7 + glow.phase * 2.3) * glow.flicker * 0.6
        + Math.sin(t * 11.3 + glow.phase * 3.1) * glow.flicker * 0.25;
      const alpha = glow.strength * flicker;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${glow.color}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${glow.color}, ${alpha * 0.34})`);
      gradient.addColorStop(1, `rgba(${glow.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  private drawFog(ctx: CanvasRenderingContext2D): void {
    const bands = [
      { v: 0.84, height: 0.3, speed: 9, alpha: 0.5, scale: 1.3 },
      { v: 0.72, height: 0.26, speed: -5, alpha: 0.26, scale: 1.8 },
      { v: 0.38, height: 0.34, speed: 3, alpha: 0.15, scale: 2.3 },
    ];

    for (const band of bands) {
      const tileWidth = this.fog.width * band.scale;
      const y = this.toY(band.v) - (band.height * this.height) / 2;
      const drawHeight = band.height * this.height;
      let x = ((this.time * band.speed) % tileWidth + tileWidth) % tileWidth - tileWidth;

      ctx.globalAlpha = band.alpha * (0.86 + Math.sin(this.time * 0.13 + band.v * 9) * 0.14);
      for (; x < this.width; x += tileWidth) {
        ctx.drawImage(this.fog, x, y, tileWidth, drawHeight);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFront(dt: number): void {
    const ctx = this.frontCtx;
    const width = this.frontCanvas.clientWidth;
    const height = this.frontCanvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    for (const mote of this.motes) {
      mote.x += (mote.vx + Math.sin(this.time * 0.4 + mote.phase) * 2.5) * dt;
      mote.y += mote.vy * dt;

      if (mote.y < -6 || mote.x < -6 || mote.x > width + 6 || mote.y > height + 6) {
        const respawned = this.createMote(width, height, mote.kind === 'ember');
        Object.assign(mote, respawned);
        if (mote.kind === 'ember') mote.y = height + 4;
      }

      const twinkle = 0.55 + Math.sin(this.time * 1.3 + mote.phase) * 0.45;
      ctx.globalAlpha = mote.alpha * twinkle;
      ctx.fillStyle = mote.kind === 'ember' ? '#f0a35c' : '#d6e6da';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < this.petals.length; i++) {
      const petal = this.petals[i];
      const gust = 0.75 + Math.sin(this.time * 0.21 + petal.sway) * 0.35;

      petal.x += (-30 * gust + Math.sin(this.time * 0.9 + petal.sway) * 14) * petal.depth * dt;
      petal.y += (26 + Math.sin(this.time * 0.6 + petal.sway * 1.7) * 8) * petal.depth * dt;
      petal.rotation += petal.spin * dt;
      petal.flip += petal.flipSpeed * dt;

      if (petal.y > height + 40 || petal.x < -60) {
        this.petals[i] = this.createPetal(width, height, false);
        continue;
      }

      const size = petal.size * petal.depth;
      ctx.save();
      ctx.globalAlpha = petal.alpha;
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      // Foreshortening as it tumbles
      ctx.scale(1, 0.25 + Math.abs(Math.cos(petal.flip)) * 0.75);
      ctx.drawImage(petal.sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Paints the crimson enso behind the title, one sweep of the brush. Hundreds of
 * short bristle strokes give it the dry, broken edge a CSS gradient can't.
 */
export function paintEnso(canvas: HTMLCanvasElement, isInstant: boolean): () => void {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const size = canvas.clientWidth || 400;
  canvas.width = canvas.height = Math.round(size * dpr);

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';

  const center = size / 2;
  const radius = size * 0.43;
  const brushWidth = size * 0.052;
  const startAngle = -1.85;
  const endAngle = 3.8;
  const sweep = endAngle - startAngle;

  const bristles = Array.from({ length: 70 }, () => {
    const across = Math.random() * 2 - 1;
    return {
      across,
      width: 0.5 + Math.random() * 1.7,
      alpha: 0.35 + Math.random() * 0.55,
      // Outer bristles lift off first, so the stroke tapers and breaks up
      liftOff: 0.62 + (1 - Math.abs(across)) * 0.3 + Math.random() * 0.1,
      lands: Math.abs(across) * 0.05 + Math.random() * 0.03,
      color: Math.random() > 0.72 ? '#c22a2e' : '#8f171b',
      seed: Math.random() * 100,
    };
  });

  const steps = 150;
  const paintStep = (step: number) => {
    const t = step / steps;
    const next = (step + 1) / steps;
    const pressure = Math.sin(Math.min(t * 1.18, 1) * Math.PI) * 0.85 + 0.15;

    for (const bristle of bristles) {
      if (t < bristle.lands || t > bristle.liftOff) continue;
      // Dry-brush gaps grow as the ink runs out
      if (Math.sin(step * 0.31 + bristle.seed) > 1.04 - t * 0.62) continue;

      const r = radius + bristle.across * brushWidth * pressure + Math.sin(t * 7 + bristle.seed) * size * 0.003;
      ctx.strokeStyle = bristle.color;
      ctx.globalAlpha = bristle.alpha * (1 - Math.max(0, t - 0.6) * 0.8);
      ctx.lineWidth = bristle.width;
      ctx.beginPath();
      ctx.arc(center, center, r, startAngle + sweep * t, startAngle + sweep * next);
      ctx.stroke();
    }
  };

  if (isInstant) {
    for (let step = 0; step < steps; step++) paintStep(step);
    return () => {};
  }

  // The brush starts once the title begins to appear
  const duration = 1500;
  const delay = 1250;
  const begin = performance.now() + delay;
  let drawn = 0;
  let rafId = requestAnimationFrame(function tick(now) {
    const elapsed = Math.max(0, now - begin);
    const raw = Math.min(elapsed / duration, 1);
    // Eases out, as a hand slows towards the end of a stroke
    const target = Math.floor((1 - Math.pow(1 - raw, 2.2)) * steps);
    while (drawn < target) paintStep(drawn++);
    if (raw < 1) rafId = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(rafId);
}
