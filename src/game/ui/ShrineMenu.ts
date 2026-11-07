import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { CHARM_SLOTS, CHARMS, PlayerBuild, SKILL_PATHS, SKILLS, SkillDef } from '../progression/PlayerBuild';

export interface ShrineMenuContext {
  shrineName: string;
  build: PlayerBuild;
  getEssence: () => number;
  buySkill: (skill: SkillDef) => void;
  toggleCharm: (charmId: string) => void;
  onClose: () => void;
}

type Tab = 'skills' | 'charms';

/**
 * ShrineMenu — Opens when the Ronin rests. Spirit Essence buys skills along
 * three paths, and found charms can be worn here.
 */
export class ShrineMenu {
  private overlay: HTMLDivElement | null = null;
  private context: ShrineMenuContext | null = null;
  private tab: Tab = 'skills';

  public get isOpen(): boolean {
    return this.overlay !== null;
  }

  public open(context: ShrineMenuContext): void {
    if (this.overlay) return;
    this.context = context;
    this.overlay = document.createElement('div');
    this.overlay.className = 'shrine-menu game-overlay-enter';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Shrine');
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.onKey, true);
    this.render();
    (this.overlay.querySelector('.shrine-skill--available, .shrine-menu__leave') as HTMLElement | null)?.focus();
  }

  public close(): void {
    if (!this.overlay) return;
    document.removeEventListener('keydown', this.onKey, true);
    this.overlay.remove();
    this.overlay = null;
    const context = this.context;
    this.context = null;
    context?.onClose();
  }

  /** Escape leaves the shrine, rather than reaching the pause menu underneath. */
  private onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    AudioManager.playUIBack();
    this.close();
  };

  private render(): void {
    const overlay = this.overlay;
    const context = this.context;
    if (!overlay || !context) return;
    const { build } = context;
    const essence = context.getEssence();
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.id;

    const skillButton = (skill: SkillDef) => {
      const owned = build.skills.has(skill.id);
      const unlocked = build.hasPrerequisite(skill);
      const affordable = essence >= skill.cost;
      const state = owned ? 'owned' : !unlocked ? 'locked' : affordable ? 'available' : 'short';
      const note = owned ? 'Learned' : !unlocked ? 'Learn the one above first' : `✧ ${skill.cost}`;
      return `
        <button class="shrine-skill shrine-skill--${state}" data-id="${skill.id}" type="button"
          ${owned || !unlocked ? 'aria-disabled="true"' : ''}>
          <span class="shrine-skill__name">${skill.name}</span>
          <span class="shrine-skill__desc">${skill.description}</span>
          <span class="shrine-skill__cost">${note}</span>
        </button>`;
    };

    const skills = SKILL_PATHS.map(path => `
      <div class="shrine-path shrine-path--${path.id}">
        <h3>${path.name}</h3>
        <p>${path.motto}</p>
        ${SKILLS.filter(s => s.path === path.id).sort((a, b) => a.tier - b.tier).map(skillButton).join('<i class="shrine-path__link"></i>')}
      </div>`).join('');

    const worn = build.equipped.filter(Boolean).length;
    const charms = CHARMS.map(charm => {
      if (!build.charms.has(charm.id)) {
        return `<div class="shrine-charm shrine-charm--unknown"><span class="shrine-charm__name">Not yet found</span></div>`;
      }
      const equipped = build.isEquipped(charm.id);
      return `
        <button class="shrine-charm ${equipped ? 'shrine-charm--worn' : ''}" data-charm="${charm.id}" data-id="${charm.id}" type="button" aria-pressed="${equipped}">
          <span class="shrine-charm__name">${charm.name}</span>
          <span class="shrine-charm__desc">${charm.description}</span>
          <span class="shrine-charm__origin">${charm.origin}</span>
          <span class="shrine-charm__state">${equipped ? 'Worn' : worn >= CHARM_SLOTS ? 'Slots full' : 'Wear'}</span>
        </button>`;
    }).join('');

    overlay.innerHTML = `
      <div class="shrine-menu__panel">
        <header class="shrine-menu__header">
          <p class="shrine-menu__eyebrow">${context.shrineName}</p>
          <h2>Rest at the Shrine</h2>
          <p class="shrine-menu__note">Your wounds are healed and your progress is saved. The yokai you cut down have returned.</p>
          <p class="shrine-menu__essence">✧ ${essence} <span>Spirit Essence</span></p>
        </header>
        <div class="shrine-menu__tabs" role="tablist">
          <button type="button" role="tab" data-tab="skills" aria-selected="${this.tab === 'skills'}">Skills</button>
          <button type="button" role="tab" data-tab="charms" aria-selected="${this.tab === 'charms'}">Charms <span>${worn} / ${CHARM_SLOTS} worn</span></button>
        </div>
        <div class="shrine-menu__body">
          ${this.tab === 'skills' ? `<div class="shrine-paths">${skills}</div>` : `<div class="shrine-charms">${charms}</div>`}
        </div>
        <footer class="shrine-menu__footer">
          <button type="button" class="hero-nav__cta shrine-menu__leave">Leave the shrine <span>Esc</span></button>
        </footer>
      </div>`;

    overlay.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        AudioManager.playUISelect();
        this.render();
      });
    });

    overlay.querySelectorAll<HTMLButtonElement>('.shrine-skill').forEach(button => {
      button.addEventListener('mouseenter', () => AudioManager.playUIHover());
      button.addEventListener('click', () => {
        const skill = SKILLS.find(s => s.id === button.dataset.id);
        if (!skill) return;
        if (!build.canBuy(skill, context.getEssence())) {
          AudioManager.play(AudioId.UI_ERROR);
          button.classList.remove('shrine-skill--refused');
          void button.offsetWidth;
          button.classList.add('shrine-skill--refused');
          return;
        }
        context.buySkill(skill);
        AudioManager.playUIConfirm();
        this.render();
      });
    });

    overlay.querySelectorAll<HTMLButtonElement>('[data-charm]').forEach(button => {
      button.addEventListener('mouseenter', () => AudioManager.playUIHover());
      button.addEventListener('click', () => {
        context.toggleCharm(button.dataset.charm!);
        AudioManager.playUISelect();
        this.render();
      });
    });

    overlay.querySelector('.shrine-menu__leave')?.addEventListener('click', () => {
      AudioManager.playUIBack();
      this.close();
    });

    if (focusedId) (overlay.querySelector(`[data-id="${focusedId}"]`) as HTMLElement | null)?.focus();
  }
}
