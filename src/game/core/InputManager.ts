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

  private _onKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true;
    // Prevent scrolling on space
    if (e.code === 'Space') e.preventDefault();
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
