import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { Records } from '../meta/Records';
import { ACHIEVEMENTS } from '../meta/Achievements';
import { DIFFICULTIES, Difficulty } from '../meta/Run';
import { formatTime } from './WorldMap';

/**
 * A full-screen panel in the style of the save slots, closed with Escape or
 * its Back button. `wire` attaches the panel's own buttons.
 */
function openPanel(eyebrow: string, title: string, body: string, wire: (panel: HTMLElement, close: () => void) => void, onClose: () => void, backLabel = 'Back'): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'save-slots meta-screen game-overlay-enter';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', title);
  overlay.innerHTML = `
    <div class="save-slots__panel">
      <p class="world-map__eyebrow">${eyebrow}</p>
      <h2>${title}</h2>
      ${body}
      <button type="button" class="hero-nav__cta save-slots__back">${backLabel} <span>Esc</span></button>
    </div>`;
  document.body.appendChild(overlay);

  let isClosed = false;
  const remove = () => {
    if (isClosed) return;
    isClosed = true;
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
  };
  const close = () => {
    remove();
    onClose();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.code !== 'Escape') return;
    event.stopPropagation();
    event.preventDefault();
    AudioManager.playUIBack();
    close();
  };
  document.addEventListener('keydown', onKey, true);
  overlay.querySelector('.save-slots__back')?.addEventListener('click', () => {
    AudioManager.playUIBack();
    close();
  });
  overlay.querySelectorAll('button').forEach(button => button.addEventListener('mouseenter', () => AudioManager.playUIHover()));
  wire(overlay, close);
  // Focus without scrolling, so long lists open at the top
  (overlay.querySelector('button:not([disabled])') as HTMLElement | null)?.focus({ preventScroll: true });
  return remove;
}

/** Story, Normal or Crimson, picked when a new journey begins. */
export function openDifficultyScreen(onChoose: (difficulty: Difficulty) => void, onClose: () => void): void {
  const cards = (Object.keys(DIFFICULTIES) as Difficulty[]).map(id => {
    const def = DIFFICULTIES[id];
    const locked = id === 'crimson' && !Records.crimsonUnlocked;
    return `
      <div class="save-slot">
        <button type="button" class="save-slot__main" data-difficulty="${id}" ${locked ? 'disabled' : ''}>
          <span class="save-slot__number">${locked ? 'Sealed' : id === 'normal' ? 'Recommended' : 'Difficulty'}</span>
          <span class="save-slot__title">${def.name}</span>
          <span class="save-slot__line">${locked ? 'Finish the game once to unlock Crimson.' : def.text}</span>
        </button>
      </div>`;
  }).join('');

  openPanel('New game', 'How hard is the climb?', `
    <p class="save-slots__note">You can't change this later. New Game+ keeps it.</p>
    <div class="save-slots__list">${cards}</div>`, (panel, close) => {
    panel.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(button => {
      button.addEventListener('click', () => {
        AudioManager.playUIConfirm();
        const choice = button.dataset.difficulty as Difficulty;
        // Leave without calling onClose: the journey is starting
        close.call(null);
        onChoose(choice);
      });
    });
    (panel.querySelector('[data-difficulty="normal"]') as HTMLElement | null)?.focus();
  }, onClose);
}

/** Every achievement: earned ones with their date, counters with their progress. */
export function openAchievementsScreen(onClose: () => void): void {
  const earned = ACHIEVEMENTS.filter(a => Records.hasAchievement(a.id)).length;
  const items = ACHIEVEMENTS.map(def => {
    const at = Records.achievedAt(def.id);
    const isSecret = def.hidden && at === null;
    const progress = def.counter && def.goal && at === null
      ? `<span class="achievement__progress"><span style="transform: scaleX(${Math.min(1, Records.counter(def.counter) / def.goal)})"></span></span>
         <span class="save-slot__line">${Math.min(def.goal, Records.counter(def.counter))} / ${def.goal}</span>`
      : '';
    return `
      <li class="achievement ${at !== null ? 'achievement--earned' : ''}">
        <span class="achievement__seal" aria-hidden="true">${at !== null ? '✦' : '✧'}</span>
        <span class="achievement__body">
          <span class="save-slot__title">${isSecret ? 'A hidden achievement' : def.title}</span>
          <span class="save-slot__line">${isSecret ? 'Keep playing to discover it.' : def.text}</span>
          ${progress}
          ${at !== null ? `<span class="save-slot__line achievement__date">Earned ${new Date(at).toLocaleDateString()}</span>` : ''}
        </span>
      </li>`;
  }).join('');

  openPanel('Achievements', `${earned} of ${ACHIEVEMENTS.length} earned`, `
    <p class="save-slots__note">Achievements count across every save slot.</p>
    <ul class="achievements-list">${items}</ul>`, () => {}, onClose);
}

export type TrialMode = 'bossRush' | 'arena';

/** Boss Rush and Arena, with each one's high-score table. */
export function openTrialsScreen(onChoose: (mode: TrialMode) => void, onClose: () => void): void {
  const rush = Records.bossRush.map((r, i) => `<li><span>${i + 1}.</span> ${formatTime(r.time)} <em>${DIFFICULTIES[r.difficulty]?.name ?? ''} · ${new Date(r.date).toLocaleDateString()}</em></li>`).join('')
    || '<li class="trials__empty">No runs yet</li>';
  const arena = Records.arena.map((r, i) => `<li><span>${i + 1}.</span> Wave ${r.waves} · ${r.kills} kills <em>${new Date(r.date).toLocaleDateString()}</em></li>`).join('')
    || '<li class="trials__empty">No runs yet</li>';

  openPanel('Trials', 'Test your blade', `
    <p class="save-slots__note">Trials use the skills and charms from your most recent save, and never change it.</p>
    <div class="save-slots__list">
      <div class="save-slot">
        <button type="button" class="save-slot__main" data-trial="bossRush">
          <span class="save-slot__number">Boss Rush</span>
          <span class="save-slot__title">The Five Guardians</span>
          <span class="save-slot__line">Umibōzu, Jorōgumo, the Fallen Samurai, Akane and the Maw, one after another, against the clock.</span>
        </button>
        <ol class="trials__scores">${rush}</ol>
      </div>
      <div class="save-slot">
        <button type="button" class="save-slot__main" data-trial="arena">
          <span class="save-slot__number">Arena</span>
          <span class="save-slot__title">Endless Waves</span>
          <span class="save-slot__line">Every yokai on the mountain, wave after wave, each one harder. How long can you last?</span>
        </button>
        <ol class="trials__scores">${arena}</ol>
      </div>
    </div>`, (panel, close) => {
    panel.querySelectorAll<HTMLButtonElement>('[data-trial]').forEach(button => {
      button.addEventListener('click', () => {
        AudioManager.playUIConfirm();
        close.call(null);
        onChoose(button.dataset.trial as TrialMode);
      });
    });
  }, onClose);
}

export interface TrialResult {
  mode: TrialMode;
  isVictory: boolean;
  time: number;
  waves: number;
  kills: number;
  place: number | null;
}

/** The end of a Trial run: the score, its place in the table, and what next. */
export function openTrialResults(result: TrialResult, onRetry: () => void, onQuit: () => void): void {
  AudioManager.play(result.isVictory ? AudioId.SHRINE_PURIFY : AudioId.UI_NOTIFICATION, { volume: 0.8 });
  const title = result.mode === 'bossRush'
    ? (result.isVictory ? `All five fell in ${formatTime(result.time)}` : `Fell after ${result.waves} of 5`)
    : `${result.waves} wave${result.waves === 1 ? '' : 's'} survived`;
  const detail = result.mode === 'bossRush'
    ? (result.isVictory ? 'The Five Guardians are beaten.' : `${formatTime(result.time)} on the clock.`)
    : `${result.kills} yokai cut down in ${formatTime(result.time)}.`;
  const place = result.place !== null ? `<p class="trials__place">New record · #${result.place} on the table</p>` : '';

  const remove = openPanel(result.mode === 'bossRush' ? 'Boss Rush' : 'Arena', title, `
    <p class="save-slots__note">${detail}</p>
    ${place}
    <div class="trials__actions">
      <button type="button" class="hero-nav__cta" data-retry>Try again</button>
    </div>`, (panel, close) => {
    panel.querySelector('[data-retry]')?.addEventListener('click', () => {
      AudioManager.playUIConfirm();
      remove();
      onRetry();
    });
    void close;
  }, onQuit, 'Main menu');
}
