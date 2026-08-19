import * as THREE from 'three';

// ─── Input Manager ───────────────────────────────────────────────────────────
// Centralized keyboard + mouse input tracking.

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseDown: boolean = false;
  public mouseJustPressed: boolean = false;
  private _mouseWasDown: boolean = false;

  constructor() {
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('contextmenu', this._onContextMenu);
  }

  /** Call at the END of each frame to clear transient flags */
  public endFrame(): void {
    this.mouseJustPressed = false;
  }

  /** Call at the START of each frame to compute transients */
  public beginFrame(): void {
    this.mouseJustPressed = this.mouseDown && !this._mouseWasDown;
    this._mouseWasDown = this.mouseDown;
  }

  public isPressed(code: string): boolean { return !!this.keys[code]; }
  public isAttackPressed(): boolean {
    return this.mouseJustPressed || this.isPressed('KeyJ');
  }

  public getMovementDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, 0);
    
    // W / Up
    if (this.isPressed('KeyW') || this.isPressed('ArrowUp')) dir.z -= 1;
    // S / Down
    if (this.isPressed('KeyS') || this.isPressed('ArrowDown')) dir.z += 1;
    // A / Left
    if (this.isPressed('KeyA') || this.isPressed('ArrowLeft')) dir.x -= 1;
    // D / Right
    if (this.isPressed('KeyD') || this.isPressed('ArrowRight')) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize();
    }
    return dir;
  }

  private _onKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true;
    // Prevent scrolling on space and arrows
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }
  private _onKeyUp(e: KeyboardEvent): void { this.keys[e.code] = false; }
  private _onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { this.mouseDown = true; e.preventDefault(); }
  }
  private _onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseDown = false;
  }
  private _onBlur(): void { this.keys = {}; this.mouseDown = false; }
  private _onContextMenu(e: Event): void { e.preventDefault(); }

  public dispose(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('contextmenu', this._onContextMenu);
  }
}
