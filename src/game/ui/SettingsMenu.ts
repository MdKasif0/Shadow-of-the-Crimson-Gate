import { SettingsManager } from '../settings/SettingsManager';
import { SettingsData } from '../settings/SettingsData';
import { AudioManager } from '../audio/AudioManager';

type Field =
  | { kind: 'range'; key: keyof SettingsData; label: string; min: number; max: number; step: number; format?: (v: number) => string }
  | { kind: 'select'; key: keyof SettingsData; label: string; options: { value: string; label: string }[]; numeric?: boolean }
  | { kind: 'toggle'; key: keyof SettingsData; label: string; hint?: string };

const QUALITY = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];
const percent = (v: number) => `${Math.round(v * 100)}%`;

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: 'Sound',
    fields: [
      { kind: 'range', key: 'masterVolume', label: 'Master volume', min: 0, max: 1, step: 0.05, format: percent },
      { kind: 'range', key: 'musicVolume', label: 'Music', min: 0, max: 1, step: 0.05, format: percent },
      { kind: 'range', key: 'sfxVolume', label: 'Sound effects', min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    title: 'Controls',
    fields: [
      { kind: 'range', key: 'lookSensitivity', label: 'Camera sensitivity', min: 0.3, max: 2.5, step: 0.05, format: v => `${v.toFixed(2)}×` },
      { kind: 'toggle', key: 'invertY', label: 'Invert camera Y' },
      {
        kind: 'select', key: 'touchControls', label: 'Touch controls', options: [
          { value: 'AUTO', label: 'On touch screens' },
          { value: 'ON', label: 'Always' },
          { value: 'OFF', label: 'Never' },
        ],
      },
    ],
  },
  {
    title: 'Graphics',
    fields: [
      { kind: 'select', key: 'graphicsQuality', label: 'Quality (shadows, lights)', options: QUALITY },
      { kind: 'select', key: 'vfxIntensity', label: 'Particles', options: QUALITY },
      {
        kind: 'select', key: 'fpsCap', label: 'Frame rate limit', numeric: true, options: [
          { value: '0', label: 'No limit' },
          { value: '120', label: '120 fps' },
          { value: '60', label: '60 fps' },
          { value: '30', label: '30 fps (saves battery)' },
        ],
      },
      { kind: 'toggle', key: 'autoQuality', label: 'Lower quality if the game slows down' },
    ],
  },
  {
    title: 'Comfort',
    fields: [
      { kind: 'toggle', key: 'cameraShake', label: 'Camera shake' },
      { kind: 'toggle', key: 'reduceMotion', label: 'Reduce motion' },
    ],
  },
];

/** Every option in one panel, saved the moment it changes. */
export class SettingsMenu {
  private overlay: HTMLDivElement;

  constructor(private onClose: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-menu game-overlay-enter';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Settings');
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.onKey, true);
    this.render();
  }

  private onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    this.close();
  };

  private close(): void {
    AudioManager.playUIBack();
    this.destroy();
    this.onClose();
  }

  private renderField(field: Field, settings: SettingsData): string {
    const id = `setting-${field.key}`;
    const value = settings[field.key];
    if (field.kind === 'range') {
      const n = value as number;
      return `
        <label class="settings-row" for="${id}">
          <span>${field.label}</span>
          <span class="settings-row__control">
            <input type="range" id="${id}" data-key="${field.key}" data-kind="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${n}" />
            <output for="${id}">${field.format ? field.format(n) : n}</output>
          </span>
        </label>`;
    }
    if (field.kind === 'select') {
      return `
        <label class="settings-row" for="${id}">
          <span>${field.label}</span>
          <select id="${id}" data-key="${field.key}" data-kind="${field.numeric ? 'number' : 'select'}">
            ${field.options.map(o => `<option value="${o.value}" ${String(value) === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </label>`;
    }
    return `
      <label class="settings-row" for="${id}">
        <span>${field.label}</span>
        <input type="checkbox" id="${id}" data-key="${field.key}" data-kind="toggle" ${value ? 'checked' : ''} />
      </label>`;
  }

  private render(): void {
    const settings = SettingsManager.getInstance().get();
    this.overlay.innerHTML = `
      <div class="settings-menu__panel">
        <h2>Settings</h2>
        ${SECTIONS.map(section => `
          <section class="settings-menu__section">
            <h3>${section.title}</h3>
            ${section.fields.map(field => this.renderField(field, settings)).join('')}
          </section>`).join('')}
        <div class="settings-menu__actions">
          <button type="button" class="hero-nav__cta" id="btn-fullscreen">${document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'}</button>
          <button type="button" class="hero-nav__cta" id="btn-close-settings">Close <span>Esc</span></button>
        </div>
      </div>`;

    this.overlay.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach(input => {
      const key = input.dataset.key as keyof SettingsData;
      const kind = input.dataset.kind;
      const read = (): unknown => kind === 'toggle' ? (input as HTMLInputElement).checked
        : kind === 'range' || kind === 'number' ? parseFloat(input.value)
        : input.value;

      if (kind === 'range') {
        // Show the value as it moves; save once it's let go
        input.addEventListener('input', () => {
          const field = SECTIONS.flatMap(s => s.fields).find(f => f.key === key);
          const output = input.parentElement?.querySelector('output');
          const n = parseFloat(input.value);
          if (output && field?.kind === 'range') output.textContent = field.format ? field.format(n) : String(n);
        });
      }
      input.addEventListener('change', () => {
        AudioManager.playUISelect();
        SettingsManager.getInstance().update({ [key]: read() } as Partial<SettingsData>);
      });
    });

    const fullscreen = this.overlay.querySelector('#btn-fullscreen') as HTMLButtonElement;
    fullscreen.addEventListener('click', () => {
      AudioManager.playUIConfirm();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
        fullscreen.textContent = 'Exit fullscreen';
      } else {
        document.exitFullscreen().catch(err => console.warn(err));
        fullscreen.textContent = 'Fullscreen';
      }
    });
    this.overlay.querySelector('#btn-close-settings')?.addEventListener('click', () => this.close());
    (this.overlay.querySelector('[data-key]') as HTMLElement | null)?.focus();
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.onKey, true);
    this.overlay.remove();
  }
}
