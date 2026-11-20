import { InputManager } from '../core/InputManager';
import { GameAction } from '../settings/KeyBindings';
import { SettingsManager } from '../settings/SettingsManager';

/** How far the stick travels from where the thumb went down, in pixels. */
const STICK_RADIUS = 56;
/** Pushing the stick this far makes the Ronin run. */
const RUN_THRESHOLD = 0.92;
/** Touch drags move the camera this many times as far as a mouse would. */
const LOOK_SCALE = 2.4;

interface ButtonDef {
  action: GameAction | 'pause';
  label: string;
  className: string;
}

const BUTTONS: ButtonDef[] = [
  { action: 'attack', label: 'Strike', className: 'touch-btn--attack' },
  { action: 'heavy', label: 'Heavy', className: 'touch-btn--heavy' },
  { action: 'dash', label: 'Dash', className: 'touch-btn--dash' },
  { action: 'block', label: 'Guard', className: 'touch-btn--block' },
  { action: 'spiritWave', label: 'Wave', className: 'touch-btn--wave' },
  { action: 'finisher', label: 'Finish', className: 'touch-btn--finisher' },
  { action: 'interact', label: 'Use', className: 'touch-btn--interact' },
  { action: 'lockOn', label: 'Lock', className: 'touch-btn--lock' },
  { action: 'pause', label: 'II', className: 'touch-btn--pause' },
];

/**
 * TouchControls — For phones and tablets: a floating stick on the left, drag
 * anywhere else to turn the camera, and buttons under the right thumb.
 */
export class TouchControls {
  private root: HTMLDivElement;
  private stickBase: HTMLDivElement;
  private stickThumb: HTMLDivElement;
  private stickPointer: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookPointer: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private isShown = false;
  private isTouchDevice: boolean;

  constructor(private input: InputManager) {
    this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-hidden', 'true');

    const stickZone = document.createElement('div');
    stickZone.className = 'touch-stick-zone';
    this.stickBase = document.createElement('div');
    this.stickBase.className = 'touch-stick';
    this.stickThumb = document.createElement('div');
    this.stickThumb.className = 'touch-stick__thumb';
    this.stickBase.appendChild(this.stickThumb);
    stickZone.appendChild(this.stickBase);

    const lookZone = document.createElement('div');
    lookZone.className = 'touch-look-zone';

    const buttons = document.createElement('div');
    buttons.className = 'touch-buttons';
    for (const def of BUTTONS) buttons.appendChild(this.createButton(def));

    this.root.append(lookZone, stickZone, buttons);
    document.body.appendChild(this.root);

    stickZone.addEventListener('pointerdown', this.onStickDown);
    lookZone.addEventListener('pointerdown', this.onLookDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  public get isActive(): boolean {
    return this.isShown;
  }

  private get isEnabled(): boolean {
    const mode = SettingsManager.getInstance().get().touchControls;
    return mode === 'ON' || (mode === 'AUTO' && this.isTouchDevice);
  }

  /** Shows the controls while the player is in control, and hides them for menus and dialogue. */
  public update(canPlay: boolean): void {
    const shouldShow = canPlay && this.isEnabled;
    if (shouldShow === this.isShown) return;
    this.isShown = shouldShow;
    this.root.classList.toggle('touch-controls--visible', shouldShow);
    if (!shouldShow) this.reset();
  }

  private reset(): void {
    this.stickPointer = null;
    this.lookPointer = null;
    this.input.releaseAllVirtual();
    this.input.releaseVirtual('sprint');
    this.stickBase.classList.remove('touch-stick--active');
    this.root.querySelectorAll('.touch-btn--down').forEach(b => b.classList.remove('touch-btn--down'));
  }

  private createButton(def: ButtonDef): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `touch-btn ${def.className}`;
    button.textContent = def.label;
    button.tabIndex = -1;
    const release = (event: PointerEvent) => {
      event.preventDefault();
      button.classList.remove('touch-btn--down');
      if (def.action !== 'pause') this.input.releaseVirtual(def.action);
    };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers refuse capture for pen or synthetic input; the button still works
      }
      button.classList.add('touch-btn--down');
      if (def.action === 'pause') {
        // The game reads Escape as pause, the same as the keyboard
        this.input.keys['Escape'] = true;
        setTimeout(() => { this.input.keys['Escape'] = false; }, 120);
      } else {
        this.input.pressVirtual(def.action);
      }
      navigator.vibrate?.(8);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    return button;
  }

  private onStickDown = (event: PointerEvent): void => {
    if (this.stickPointer !== null) return;
    event.preventDefault();
    this.stickPointer = event.pointerId;
    // The stick appears under the thumb, wherever it lands
    this.stickOrigin = { x: event.clientX, y: event.clientY };
    this.stickBase.style.left = `${event.clientX}px`;
    this.stickBase.style.top = `${event.clientY}px`;
    this.stickBase.classList.add('touch-stick--active');
    this.moveStick(event.clientX, event.clientY);
  };

  private onLookDown = (event: PointerEvent): void => {
    if (this.lookPointer !== null) return;
    event.preventDefault();
    this.lookPointer = event.pointerId;
    this.lookLast = { x: event.clientX, y: event.clientY };
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.stickPointer) {
      event.preventDefault();
      this.moveStick(event.clientX, event.clientY);
    } else if (event.pointerId === this.lookPointer) {
      event.preventDefault();
      this.input.addLook((event.clientX - this.lookLast.x) * LOOK_SCALE, (event.clientY - this.lookLast.y) * LOOK_SCALE);
      this.lookLast = { x: event.clientX, y: event.clientY };
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.stickPointer) {
      this.stickPointer = null;
      this.input.virtualStick.set(0, 0);
      this.input.releaseVirtual('sprint');
      this.stickBase.classList.remove('touch-stick--active');
      this.stickThumb.style.transform = 'translate(-50%, -50%)';
    } else if (event.pointerId === this.lookPointer) {
      this.lookPointer = null;
    }
  };

  private moveStick(x: number, y: number): void {
    let dx = x - this.stickOrigin.x;
    let dy = y - this.stickOrigin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      dx *= STICK_RADIUS / distance;
      dy *= STICK_RADIUS / distance;
    }
    this.stickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const amount = Math.min(1, distance / STICK_RADIUS);
    this.input.virtualStick.set(dx / STICK_RADIUS, dy / STICK_RADIUS);
    if (amount > RUN_THRESHOLD) this.input.pressVirtual('sprint');
    else this.input.releaseVirtual('sprint');
  }
}
