/**
 * Hero Component
 *
 * The title screen: a painted scene brought to life by HeroAtmosphere, the game's
 * title, and the main menu. Returns a cleanup function.
 */

import { GAME_TITLE, HERO_SUBTITLE, ASSETS } from '../utils/constants';
import { AudioManager } from '../game/audio/AudioManager';
import { SaveManager } from '../game/save/SaveManager';
import { GameStateManager } from '../game/state/GameStateManager';
import { GameState } from '../game/state/GameState';
import { SettingsManager } from '../game/settings/SettingsManager';
import { SettingsMenu } from '../game/ui/SettingsMenu';
import { ControlsScreen } from '../game/ui/ControlsScreen';
import { EventBus } from '../game/core/EventBus';
import { HeroAtmosphere, IMAGE_HEIGHT, IMAGE_WIDTH, paintEnso } from './HeroAtmosphere';

const AUDIO_PREFERENCE_KEY = 'sotcg_audio';
const MENU_MUSIC_VOLUME = 0.3;
/** How long the fade to black runs before the game takes over. */
const LEAVE_DELAY_MS = 520;

const SAKURA_MON = `
  <svg class="hero__mon" viewBox="0 0 24 24" aria-hidden="true">
    <g fill="currentColor">
      ${[0, 72, 144, 216, 288].map(angle => `
        <path transform="rotate(${angle} 12 12)" d="M12 11.2c-2.9-1.7-3.5-5.1-1.7-7.7L12 5l1.7-1.5c1.8 2.6 1.2 6-1.7 7.7z"/>
      `).join('')}
      <circle cx="12" cy="12" r="1.15"/>
    </g>
  </svg>
`;

const SPEAKER_ICON = `
  <svg class="hero__audio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path fill="currentColor" d="M11 5.5 6.6 9H3.5v6h3.1l4.4 3.5z"/>
    <path class="hero__audio-wave" d="M14.6 9.2a4 4 0 0 1 0 5.6"/>
    <path class="hero__audio-wave" d="M17.2 6.6a7.6 7.6 0 0 1 0 10.8"/>
    <path class="hero__audio-off" d="m15 9.6 5 4.8M20 9.6l-5 4.8"/>
  </svg>
`;

function buildMenuHTML(): string {
  const hasSave = SaveManager.getInstance().hasSave();
  const items = [
    { id: 'nav-continue', label: 'Continue', disabled: !hasSave },
    { id: 'nav-new-game', label: 'New Game', disabled: false },
    { id: 'nav-controls', label: 'Controls', disabled: false },
    { id: 'nav-settings', label: 'Settings', disabled: false },
  ];

  return `
    <nav class="hero-menu" aria-label="Main menu">
      ${items.map((item, index) => `
        <button class="hero-menu__item" id="${item.id}" type="button" style="--i: ${index}" ${item.disabled ? 'disabled' : ''}>
          <span class="hero-menu__mark" aria-hidden="true"><span></span></span>
          <span class="hero-menu__label">${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

export function renderHero(container: HTMLElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || SettingsManager.getInstance().get().reduceMotion;

  const section = document.createElement('section');
  section.className = isReducedMotion ? 'hero hero--still' : 'hero';
  section.id = 'hero-section';
  section.setAttribute('aria-label', GAME_TITLE);

  section.innerHTML = `
    <div class="hero__scene" id="hero-scene" aria-hidden="true">
      <div class="hero__scene-inner">
        <img class="hero__painting" id="hero-painting" src="${ASSETS.HERO_BG}" alt="" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" decoding="sync" />
        <canvas class="hero__light" id="hero-light"></canvas>
      </div>
    </div>

    <div class="hero__shade" aria-hidden="true"></div>

    <div class="hero__front" id="hero-front" aria-hidden="true">
      <canvas class="hero__particles" id="hero-particles"></canvas>
    </div>

    <div class="hero__grain" aria-hidden="true"></div>

    <div class="hero__content">
      <header class="hero__brand">
        <canvas class="hero__enso" id="hero-enso" aria-hidden="true"></canvas>
        <h1 class="hero__title" aria-label="${GAME_TITLE}">
          <span class="hero__title-word hero__title-word--first" aria-hidden="true">Shadow</span>
          <span class="hero__title-of" aria-hidden="true">
            <i class="hero__rule hero__rule--left"></i>${SAKURA_MON}<em>of</em>${SAKURA_MON}<em>the</em>${SAKURA_MON}<i class="hero__rule"></i>
          </span>
          <span class="hero__title-word hero__title-word--last" aria-hidden="true">Crimson Gate</span>
        </h1>
        <p class="hero__subtitle">${HERO_SUBTITLE}</p>
      </header>
      ${buildMenuHTML()}
    </div>

    <audio id="hero-audio" src="/assets/audio/music/main_theme.m4a" loop preload="none"></audio>
    <button class="hero__audio" id="hero-audio-toggle" type="button" aria-label="Play music" aria-pressed="false" data-state="off">
      ${SPEAKER_ICON}
    </button>

    <div class="hero__curtain" aria-hidden="true"></div>
  `;

  container.appendChild(section);

  // ── Atmosphere ──

  const atmosphere = new HeroAtmosphere(
    section,
    section.querySelector('#hero-scene') as HTMLElement,
    section.querySelector('#hero-front') as HTMLElement,
    section.querySelector('#hero-painting') as HTMLImageElement,
    section.querySelector('#hero-light') as HTMLCanvasElement,
    section.querySelector('#hero-particles') as HTMLCanvasElement,
    isReducedMotion,
  );
  atmosphere.start();

  const stopEnso = paintEnso(section.querySelector('#hero-enso') as HTMLCanvasElement, isReducedMotion);

  // ── Audio ──
  // Nothing plays until the player's first interaction, as browsers require.

  const audio = section.querySelector('#hero-audio') as HTMLAudioElement;
  const audioToggle = section.querySelector('#hero-audio-toggle') as HTMLButtonElement;
  let isMusicPlaying = false;
  let fadeTimer: ReturnType<typeof setInterval> | null = null;

  const showAudioState = () => {
    audioToggle.dataset.state = isMusicPlaying ? 'on' : 'off';
    audioToggle.setAttribute('aria-pressed', String(isMusicPlaying));
    audioToggle.setAttribute('aria-label', isMusicPlaying ? 'Mute music' : 'Play music');
  };

  const startMusic = async () => {
    audio.volume = 0;
    try {
      await audio.play();
    } catch {
      return; // Still blocked; the next interaction tries again
    }
    isMusicPlaying = true;
    showAudioState();

    if (fadeTimer) clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      audio.volume = Math.min(audio.volume + 0.012, MENU_MUSIC_VOLUME);
      if (audio.volume >= MENU_MUSIC_VOLUME && fadeTimer) clearInterval(fadeTimer);
    }, 50);
  };

  const stopMusic = () => {
    if (fadeTimer) clearInterval(fadeTimer);
    audio.pause();
    isMusicPlaying = false;
    showAudioState();
  };

  audioToggle.addEventListener('click', () => {
    if (isMusicPlaying) {
      localStorage.setItem(AUDIO_PREFERENCE_KEY, 'off');
      stopMusic();
    } else {
      localStorage.setItem(AUDIO_PREFERENCE_KEY, 'on');
      void startMusic();
    }
  }, { signal });

  const startMusicOnFirstInteraction = (event: Event) => {
    document.removeEventListener('pointerdown', startMusicOnFirstInteraction);
    document.removeEventListener('keydown', startMusicOnFirstInteraction);
    if (audioToggle.contains(event.target as Node)) return; // The toggle's own click decides
    if (localStorage.getItem(AUDIO_PREFERENCE_KEY) !== 'off') void startMusic();
  };
  document.addEventListener('pointerdown', startMusicOnFirstInteraction, { signal });
  document.addEventListener('keydown', startMusicOnFirstInteraction, { signal });

  // ── Menu ──

  const items = Array.from(section.querySelectorAll<HTMLButtonElement>('.hero-menu__item'));
  const enabledItems = () => items.filter(item => !item.disabled);
  let selected: HTMLButtonElement | null = null;
  let isLeaving = false;

  const select = (item: HTMLButtonElement, playSound: boolean) => {
    if (item === selected || item.disabled) return;
    selected?.classList.remove('is-selected');
    item.classList.add('is-selected');
    selected = item;
    if (playSound) AudioManager.playUIHover();
  };

  // Something is always selected, so the screen always shows what Enter will do
  select(enabledItems()[0], false);

  const leaveFor = (action: () => void) => {
    if (isLeaving) return;
    isLeaving = true;
    section.classList.add('hero--leaving');
    AudioManager.playUIConfirm();

    if (isReducedMotion) action();
    else window.setTimeout(action, LEAVE_DELAY_MS);
  };

  items.forEach(item => {
    item.addEventListener('pointerenter', () => select(item, true), { signal });
    item.addEventListener('focus', () => select(item, true), { signal });
  });

  section.querySelector('#nav-continue')?.addEventListener('click', () => {
    const saveManager = SaveManager.getInstance();
    if (!saveManager.hasSave()) return;
    leaveFor(() => {
      EventBus.emit('loadGame', saveManager.getSave());
      GameStateManager.getInstance().setState(GameState.PLAYING);
    });
  }, { signal });

  section.querySelector('#nav-new-game')?.addEventListener('click', () => {
    leaveFor(() => {
      const saveManager = SaveManager.getInstance();
      if (saveManager.hasSave()) saveManager.deleteSave();
      EventBus.emit('newGame', {});
      GameStateManager.getInstance().setState(GameState.PLAYING);
    });
  }, { signal });

  section.querySelector('#nav-controls')?.addEventListener('click', () => {
    AudioManager.playUISelect();
    new ControlsScreen(() => {});
  }, { signal });

  section.querySelector('#nav-settings')?.addEventListener('click', () => {
    AudioManager.playUISelect();
    new SettingsMenu(() => {});
  }, { signal });

  // Arrow keys move the selection, and Enter works whether or not anything has focus
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (isLeaving || !section.isConnected || !selected) return;
    const isOverlayOpen = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('.hero') === null;
    if (isOverlayOpen) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const available = enabledItems();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = available[(available.indexOf(selected) + step + available.length) % available.length];
      select(next, true);
      next.focus({ preventScroll: true });
      event.preventDefault();
    } else if (event.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) {
      selected.click();
      event.preventDefault();
    }
  }, { signal });

  // ── Cleanup ──

  return () => {
    controller.abort();
    atmosphere.destroy();
    stopEnso();
    if (fadeTimer) clearInterval(fadeTimer);
    audio.pause();
  };
}
