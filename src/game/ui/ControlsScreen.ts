import { AudioManager } from '../audio/AudioManager';
import { SettingsManager } from '../settings/SettingsManager';
import { ACTION_LABELS, DEFAULT_KEY_BINDINGS, GameAction, KeyBindings, keyName } from '../settings/KeyBindings';

/** Keys the player can't assign, because the game or browser needs them. */
const RESERVED_KEYS = ['Escape', 'Tab', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight'];

const GAMEPAD_LEGEND = [
  ['Left Stick', 'Move'], ['Right Stick', 'Camera'], ['X / Square', 'Light Attack'], ['Y / Triangle', 'Heavy Attack'],
  ['A / Cross', 'Dash'], ['B / Circle', 'Interact'], ['LB', 'Lock On'], ['RB', 'Spirit Cut'], ['RT', 'Sprint'], ['Start', 'Pause'],
];

const BUTTON_STYLE = 'min-width: 122px; padding: 7px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(196,163,90,0.4); color: #e8d9b4; font-family: Inter, sans-serif; font-size: 13px; letter-spacing: 0.04em; cursor: pointer; border-radius: 2px;';

/** Shows the controls, and lets the player rebind any key by clicking it. */
export class ControlsScreen {
  private overlay: HTMLDivElement;
  private waitingFor: GameAction | null = null;
  private message: HTMLElement | null = null;

  constructor(private onClose: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'game-overlay-enter';
    Object.assign(this.overlay.style, {
      position: 'fixed', inset: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.88)', zIndex: '2100',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      color: '#f0e6d3', fontFamily: "'Inter', sans-serif",
      padding: '20px', boxSizing: 'border-box',
    });

    document.body.appendChild(this.overlay);
    this.render();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  private render(): void {
    const bindings = SettingsManager.getInstance().get().keyBindings;

    const rows = ACTION_LABELS.map(({ action, label, mouse }) => `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.07);">
        <span style="font-size: 14px; color: #d4c5a9;">${label}</span>
        <span style="display: flex; align-items: center; gap: 10px;">
          ${mouse ? `<span style="font-size: 12px; color: #8d8574;">${mouse}</span>` : ''}
          <button data-action="${action}" style="${BUTTON_STYLE}">${keyName(bindings[action])}</button>
        </span>
      </div>
    `).join('');

    const legend = GAMEPAD_LEGEND.map(([button, use]) => `
      <div style="display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 12px;">
        <span style="color: #c4a35a;">${button}</span><span style="color: #a8a294;">${use}</span>
      </div>
    `).join('');

    this.overlay.innerHTML = `
      <div style="width: 100%; max-width: 780px; max-height: 100%; overflow-y: auto; padding: 30px 34px; box-sizing: border-box; background: rgba(16,14,14,0.96); border: 1px solid rgba(196,163,90,0.28);">
        <h2 style="font-family: 'Cinzel', serif; font-size: 26px; letter-spacing: 0.14em; text-align: center; margin: 0 0 6px; color: #e8e2d4;">Controls</h2>
        <p id="controls-message" role="status" style="text-align: center; margin: 0 0 18px; min-height: 18px; font-size: 13px; color: #a8a294;">Click a key to change it</p>
        <div style="display: flex; flex-wrap: wrap; gap: 32px;">
          <div style="flex: 1 1 340px;">${rows}</div>
          <div style="flex: 0 1 240px;">
            <h3 style="font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 0.1em; color: #c4a35a; margin: 6px 0 10px;">Gamepad</h3>
            ${legend}
            <p style="font-size: 12px; line-height: 1.6; color: #8d8574; margin-top: 14px;">Move the mouse to look, once you've clicked the game. Dodge just as a hit lands to slow time and build focus.</p>
          </div>
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 24px;">
          <button id="btn-reset-controls" class="hero-nav__cta" style="justify-content: center; font-size: 13px;">RESET TO DEFAULTS</button>
          <button id="btn-close-controls" class="hero-nav__cta" style="justify-content: center; font-size: 13px;">CLOSE</button>
        </div>
      </div>
    `;

    this.message = this.overlay.querySelector('#controls-message');

    this.overlay.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button => {
      button.addEventListener('mouseenter', () => AudioManager.playUIHover());
      button.addEventListener('click', () => this.beginRebind(button));
    });

    this.overlay.querySelector('#btn-reset-controls')?.addEventListener('click', () => {
      AudioManager.playUIConfirm();
      SettingsManager.getInstance().update({ keyBindings: { ...DEFAULT_KEY_BINDINGS } });
      this.render();
    });

    this.overlay.querySelector('#btn-close-controls')?.addEventListener('click', () => {
      AudioManager.playUIBack();
      this.close();
    });
  }

  private beginRebind(button: HTMLButtonElement): void {
    AudioManager.playUISelect();
    this.waitingFor = button.dataset.action as GameAction;
    button.textContent = 'Press a key…';
    button.style.borderColor = '#e0523a';
    if (this.message) this.message.textContent = 'Press the new key, or Escape to cancel';
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.waitingFor) {
      if (e.key === 'Escape') {
        // Otherwise this Escape would also resume the game behind the screen
        e.stopPropagation();
        this.close();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const action = this.waitingFor;
    this.waitingFor = null;

    if (e.code === 'Escape') {
      this.render();
      return;
    }
    if (RESERVED_KEYS.includes(e.code)) {
      this.render();
      if (this.message) this.message.textContent = `${keyName(e.code)} is reserved, so please choose another key`;
      return;
    }

    const settings = SettingsManager.getInstance();
    const bindings: KeyBindings = { ...settings.get().keyBindings };

    // Swap rather than leave two actions on one key
    const clash = (Object.keys(bindings) as GameAction[]).find(other => other !== action && bindings[other] === e.code);
    if (clash) bindings[clash] = bindings[action];
    bindings[action] = e.code;

    settings.update({ keyBindings: bindings });
    AudioManager.playUIConfirm();
    this.render();
    if (clash && this.message) {
      const label = ACTION_LABELS.find(item => item.action === clash)?.label ?? clash;
      this.message.textContent = `Swapped with ${label}`;
    }
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.overlay.remove();
  }
}
