import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { SaveManager } from '../save/SaveManager';
import { SaveData } from '../save/SaveData';
import { LEVELS } from '../levels/LevelCatalog';
import { formatTime } from './WorldMap';
import { DIFFICULTIES } from '../meta/Run';

export type SlotMode = 'new' | 'load';

function describe(save: SaveData): { title: string; lines: string[] } {
  const level = LEVELS[save.levels?.current ?? 'courtyard'] ?? LEVELS.courtyard;
  const cleared = save.levels?.cleared.length ?? (save.crimsonOniDefeated ? 1 : 0);
  const bestTotal = Object.values(save.levels?.bestTimes ?? {}).reduce((sum, t) => sum + (t ?? 0), 0);
  const when = save.savedAt
    ? new Date(save.savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Saved before slots existed';
  const run = `${DIFFICULTIES[save.difficulty ?? 'normal'].name}${save.ngPlus ? ` · New Game+${save.ngPlus > 1 ? ` ${save.ngPlus}` : ''}` : ''}`;
  return {
    title: `${level.numeral} · ${level.name}`,
    lines: [
      run,
      `${cleared} of 5 levels cleared${bestTotal > 0 ? ` · best clears ${formatTime(bestTotal)}` : ''}`,
      `✧ ${save.spiritEssence} essence · ${save.build?.skills.length ?? 0} skills · ${save.build?.charms.length ?? 0} charms`,
      when,
    ],
  };
}

/**
 * SaveSlotsScreen — Choose one of three slots: to start a new game in, or to
 * load. Starting over a slot that's in use asks first.
 */
export class SaveSlotsScreen {
  private overlay: HTMLDivElement;
  private confirmSlot: number | null = null;

  constructor(private mode: SlotMode, private onChoose: (slot: number) => void, private onClose: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'save-slots game-overlay-enter';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', mode === 'new' ? 'Choose a slot for a new game' : 'Load a game');
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.onKey, true);
    this.render();
  }

  private onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    AudioManager.playUIBack();
    if (this.confirmSlot !== null) {
      this.confirmSlot = null;
      this.render();
    } else {
      this.close();
    }
  };

  private close(): void {
    document.removeEventListener('keydown', this.onKey, true);
    this.overlay.remove();
    this.onClose();
  }

  private choose(slot: number): void {
    document.removeEventListener('keydown', this.onKey, true);
    this.overlay.remove();
    this.onChoose(slot);
  }

  private render(): void {
    const manager = SaveManager.getInstance();
    const slots = manager.listSlots();
    const isNew = this.mode === 'new';

    const cards = slots.map(({ slot, save }) => {
      const info = save ? describe(save) : null;
      const isConfirming = this.confirmSlot === slot;
      const disabled = !isNew && !save;
      return `
        <div class="save-slot ${save ? '' : 'save-slot--empty'} ${isConfirming ? 'save-slot--confirm' : ''}">
          <button type="button" class="save-slot__main" data-slot="${slot}" ${disabled ? 'disabled' : ''}>
            <span class="save-slot__number">Slot ${slot}</span>
            ${info ? `
              <span class="save-slot__title">${info.title}</span>
              ${info.lines.map(line => `<span class="save-slot__line">${line}</span>`).join('')}
            ` : `<span class="save-slot__title">Empty</span><span class="save-slot__line">${isNew ? 'Begin a new journey here' : 'Nothing saved yet'}</span>`}
          </button>
          ${isConfirming ? `
            <div class="save-slot__confirm" role="alert">
              <p>Start over in slot ${slot}? Its save will be lost.</p>
              <button type="button" class="hero-nav__cta" data-confirm="${slot}">Start over</button>
              <button type="button" class="hero-nav__cta" data-cancel>Keep it</button>
            </div>` : ''}
          ${!isNew && save && !isConfirming ? `<button type="button" class="save-slot__delete" data-delete="${slot}" aria-label="Delete slot ${slot}">Delete</button>` : ''}
        </div>`;
    }).join('');

    this.overlay.innerHTML = `
      <div class="save-slots__panel">
        <p class="world-map__eyebrow">${isNew ? 'New game' : 'Load game'}</p>
        <h2>${isNew ? 'Choose a slot' : 'Choose a save'}</h2>
        <p class="save-slots__note">The game saves itself at every shrine, every new level and every story beat.</p>
        <div class="save-slots__list">${cards}</div>
        <button type="button" class="hero-nav__cta save-slots__back">Back <span>Esc</span></button>
      </div>`;

    this.overlay.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(button => {
      button.addEventListener('mouseenter', () => AudioManager.playUIHover());
      button.addEventListener('click', () => {
        const slot = Number(button.dataset.slot);
        const save = manager.listSlots()[slot - 1].save;
        if (isNew && save) {
          AudioManager.play(AudioId.UI_NOTIFICATION, { volume: 0.6 });
          this.confirmSlot = slot;
          this.render();
          (this.overlay.querySelector('[data-cancel]') as HTMLElement | null)?.focus();
          return;
        }
        if (!isNew && !save) return;
        this.choose(slot);
      });
    });
    this.overlay.querySelector('[data-confirm]')?.addEventListener('click', () => this.choose(this.confirmSlot!));
    this.overlay.querySelector('[data-cancel]')?.addEventListener('click', () => {
      AudioManager.playUIBack();
      this.confirmSlot = null;
      this.render();
    });
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button => {
      button.addEventListener('click', () => {
        const slot = Number(button.dataset.delete);
        if (button.dataset.armed !== 'true') {
          // A second press deletes, so a stray click can't
          button.dataset.armed = 'true';
          button.textContent = 'Press again to delete';
          return;
        }
        manager.deleteSave(slot);
        AudioManager.playUIBack();
        this.render();
      });
    });
    this.overlay.querySelector('.save-slots__back')?.addEventListener('click', () => {
      AudioManager.playUIBack();
      this.close();
    });

    (this.overlay.querySelector('.save-slot__main:not([disabled])') as HTMLElement | null)?.focus();
  }
}
