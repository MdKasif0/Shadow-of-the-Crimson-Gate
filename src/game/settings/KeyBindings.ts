export type GameAction =
  | 'moveForward' | 'moveBack' | 'moveLeft' | 'moveRight'
  | 'attack' | 'heavy' | 'dash' | 'sprint'
  | 'lockOn' | 'finisher' | 'interact';

export type KeyBindings = Record<GameAction, string>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveForward: 'KeyW',
  moveBack: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  attack: 'KeyJ',
  heavy: 'KeyK',
  dash: 'Space',
  sprint: 'ShiftLeft',
  lockOn: 'KeyQ',
  finisher: 'KeyR',
  interact: 'KeyE',
};

/** Rebindable actions in display order, with any fixed mouse alternative. */
export const ACTION_LABELS: { action: GameAction; label: string; mouse?: string }[] = [
  { action: 'moveForward', label: 'Move Forward' },
  { action: 'moveBack', label: 'Move Back' },
  { action: 'moveLeft', label: 'Move Left' },
  { action: 'moveRight', label: 'Move Right' },
  { action: 'attack', label: 'Light Attack', mouse: 'Left Click' },
  { action: 'heavy', label: 'Heavy Attack', mouse: 'Right Click' },
  { action: 'dash', label: 'Dash / Dodge' },
  { action: 'sprint', label: 'Sprint' },
  { action: 'lockOn', label: 'Lock On' },
  { action: 'finisher', label: 'Spirit Cut (full focus)' },
  { action: 'interact', label: 'Interact' },
];

/** Turns a KeyboardEvent code such as "KeyW" or "ShiftLeft" into a readable name. */
export function keyName(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return `${code.slice(5)} Arrow`;
  if (code === 'ShiftLeft') return 'Left Shift';
  if (code === 'ShiftRight') return 'Right Shift';
  if (code === 'ControlLeft') return 'Left Ctrl';
  if (code === 'ControlRight') return 'Right Ctrl';
  if (code === 'AltLeft') return 'Left Alt';
  if (code === 'AltRight') return 'Right Alt';
  return code;
}
