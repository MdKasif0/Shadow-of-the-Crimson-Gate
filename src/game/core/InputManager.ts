import * as THREE from 'three';
import { SettingsManager } from '../settings/SettingsManager';
import { GameAction } from '../settings/KeyBindings';

// ─── Input Manager ───────────────────────────────────────────────────────────
// Keyboard, mouse and gamepad, presented to the game as named actions.

const UP = new THREE.Vector3(0, 1, 0);
const STICK_DEADZONE = 0.22;
/** Camera speed at full right-stick tilt, in the same units as mouse pixels per second. */
const STICK_LOOK_SPEED = 1050;

/** Standard-mapping gamepad button for each action. */
const GAMEPAD_BUTTONS: Partial<Record<GameAction, number>> = {
  attack: 2,   // X / Square
  heavy: 3,    // Y / Triangle
  dash: 0,     // A / Cross
  interact: 1, // B / Circle
  lockOn: 4,   // LB
  finisher: 5, // RB
  sprint: 7,   // RT
};
const GAMEPAD_START = 9;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const BUTTON_CONFIRM = 0;
const BUTTON_CANCEL = 1;

const ALL_ACTIONS: GameAction[] = ['moveForward', 'moveBack', 'moveLeft', 'moveRight', 'attack', 'heavy', 'dash', 'sprint', 'lockOn', 'finisher', 'interact'];

export class InputManager {
  public keys: Record<string, boolean> = {};
  public mouseDown: boolean = false;
  public mouseJustPressed: boolean = false;
  private _mouseWasDown: boolean = false;

  /** Yaw of the camera. Movement is relative to where the camera is facing. */
  public cameraYaw: number = 0;
  private _lookX: number = 0;
  private _lookY: number = 0;
  private _rightMouseDown: boolean = false;
  private _heavyClicked: boolean = false;

  private _isActionDown = new Map<GameAction, boolean>();
  private _wasActionDown = new Map<GameAction, boolean>();

  private _gamepad: Gamepad | null = null;
  private _padPrevious: boolean[] = [];
  private _stick = new THREE.Vector2();

  constructor() {
    this._onMouseMove = this._onMouseMove.bind(this);
    window.addEventListener('mousemove', this._onMouseMove);
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
    this._heavyClicked = false;
    if (this._gamepad) this._padPrevious = this._gamepad.buttons.map(b => b.pressed);
  }

  /** Call at the START of each frame to compute transients */
  public beginFrame(dt: number = 0): void {
    this.mouseJustPressed = this.mouseDown && !this._mouseWasDown;
    this._mouseWasDown = this.mouseDown;

    this.pollGamepad(dt);

    const bindings = SettingsManager.getInstance().get().keyBindings;
    for (const action of ALL_ACTIONS) {
      this._wasActionDown.set(action, this._isActionDown.get(action) ?? false);

      const button = GAMEPAD_BUTTONS[action];
      const isPadDown = button !== undefined && !!this._gamepad?.buttons[button]?.pressed;
      this._isActionDown.set(action, !!this.keys[bindings[action]] || isPadDown);
    }
  }

  private pollGamepad(dt: number): void {
    this._gamepad = navigator.getGamepads?.().find(pad => pad?.mapping === 'standard' || pad) ?? null;
    this._stick.set(0, 0);
    if (!this._gamepad) return;

    const axes = this._gamepad.axes;
    const deadzone = (value: number) => (Math.abs(value) < STICK_DEADZONE ? 0 : value);
    this._stick.set(deadzone(axes[0] ?? 0), deadzone(axes[1] ?? 0));

    const lookX = deadzone(axes[2] ?? 0);
    const lookY = deadzone(axes[3] ?? 0);
    // Squared, so small tilts give fine control
    this._lookX += Math.sign(lookX) * lookX * lookX * STICK_LOOK_SPEED * dt;
    this._lookY += Math.sign(lookY) * lookY * lookY * STICK_LOOK_SPEED * 0.6 * dt;
  }

  private padJustPressed(button: number): boolean {
    return !!this._gamepad?.buttons[button]?.pressed && !this._padPrevious[button];
  }

  public get isPadPauseJustPressed(): boolean { return this.padJustPressed(GAMEPAD_START); }
  public get isPadUpJustPressed(): boolean { return this.padJustPressed(DPAD_UP); }
  public get isPadDownJustPressed(): boolean { return this.padJustPressed(DPAD_DOWN); }
  public get isPadConfirmJustPressed(): boolean { return this.padJustPressed(BUTTON_CONFIRM); }
  public get isPadCancelJustPressed(): boolean { return this.padJustPressed(BUTTON_CANCEL); }

  public isPressed(code: string): boolean { return !!this.keys[code]; }

  public isAction(action: GameAction): boolean {
    return this._isActionDown.get(action) ?? false;
  }

  public isActionJustPressed(action: GameAction): boolean {
    return this.isAction(action) && !this._wasActionDown.get(action);
  }

  public isAttackPressed(): boolean {
    return this.mouseJustPressed || this.isActionJustPressed('attack');
  }

  public isHeavyPressed(): boolean {
    return this._heavyClicked || this.isActionJustPressed('heavy');
  }

  public isRunPressed(): boolean {
    return this.isAction('sprint') || this.isPressed('ShiftRight');
  }

  public getMovementDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(this._stick.x, 0, this._stick.y);

    if (this.isAction('moveForward') || this.isPressed('ArrowUp')) dir.z -= 1;
    if (this.isAction('moveBack') || this.isPressed('ArrowDown')) dir.z += 1;
    if (this.isAction('moveLeft') || this.isPressed('ArrowLeft')) dir.x -= 1;
    if (this.isAction('moveRight') || this.isPressed('ArrowRight')) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize();
      dir.applyAxisAngle(UP, this.cameraYaw);
    }
    return dir;
  }

  /** Returns the mouse and right-stick movement since the last call. */
  public consumeLook(): { x: number; y: number } {
    const look = { x: this._lookX, y: this._lookY };
    this._lookX = 0;
    this._lookY = 0;
    return look;
  }

  public get isPointerLocked(): boolean {
    return document.pointerLockElement !== null;
  }

  private _onMouseMove(e: MouseEvent): void {
    // The mouse steers the camera when captured, or while the right button is held
    if (this.isPointerLocked || this._rightMouseDown) {
      this._lookX += e.movementX;
      this._lookY += e.movementY;
    }
  }

  private _onKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true;
    // Prevent scrolling on space and arrows
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      // Unless a menu button has focus, where these keys need to work normally
      if (!(document.activeElement instanceof HTMLButtonElement)) e.preventDefault();
    }
  }
  private _onKeyUp(e: KeyboardEvent): void { this.keys[e.code] = false; }
  private _onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { this.mouseDown = true; e.preventDefault(); }
    if (e.button === 2) {
      this._rightMouseDown = true;
      // Without capture, right-drag steers the camera, so only a captured click is a heavy attack
      if (this.isPointerLocked) this._heavyClicked = true;
    }
  }
  private _onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this._rightMouseDown = false;
  }
  private _onBlur(): void { this.keys = {}; this.mouseDown = false; this._rightMouseDown = false; }
  private _onContextMenu(e: Event): void { e.preventDefault(); }

  public dispose(): void {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('contextmenu', this._onContextMenu);
  }
}
