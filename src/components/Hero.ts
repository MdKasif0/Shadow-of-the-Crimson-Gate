/**
 * Hero Component
 *
 * Renders the full-viewport cinematic hero section for the landing page.
 *
 * Features:
 *   - Background image with ken-burns (CSS) + mouse parallax (JS)
 *   - Atmospheric overlays (gradient, vignette, bottom fog)
 *   - Floating navigation with mobile hamburger menu
 *   - Staggered title reveal (SHADOW / OF THE / CRIMSON GATE)
 *   - Sakura petal particles + spirit glow particles
 *   - Ambient glow effects
 *   - Play button with cursor-tracking glow
 *   - Cinematic transition on Play click before navigating to /game
 */

import {
  GAME_TITLE,
  HERO_SUBTITLE,
  HERO_TAGLINE,
  NAV_ITEMS,
  ROUTES,
  PARALLAX,
  PARTICLES,
  TIMING,
} from '../utils/constants';

import {
  OverlayManager,
  openWorldOverlay,
  openLoreOverlay,
  openCharactersOverlay,
  openMediaOverlay
} from './Overlays';

// ─── Internal Constants ──────────────────────────────────────────────────────

const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const PREFERS_REDUCED_MOTION = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
const ENABLE_PARALLAX = !IS_TOUCH && !PREFERS_REDUCED_MOTION;

// ─── Particle Helpers ────────────────────────────────────────────────────────

/** Creates a single sakura petal element with randomized animation. */
function createPetal(index: number): HTMLElement {
  const el = document.createElement('div');
  const isWhite = Math.random() > 0.6;

  el.className = `hero__petal ${isWhite ? 'hero__petal--white' : 'hero__petal--pink'}`;

  const left = Math.random() * 100;
  const size = 6 + Math.random() * 9;
  const duration = 8 + Math.random() * 7;
  const delay = Math.random() * 14;
  const drift = -40 + Math.random() * 100;
  const spin = 360 + Math.random() * 360;

  el.style.left = `${left}%`;
  el.style.width = `${size}px`;
  el.style.height = `${size * 0.8}px`;
  el.style.animationDuration = `${duration}s`;
  el.style.animationDelay = `${delay}s`;
  el.style.setProperty('--drift', `${drift}px`);
  el.style.setProperty('--spin', `${spin}deg`);
  el.style.transform = `rotate(${index * 37}deg)`;

  return el;
}

/** Creates a single spirit/glow particle element. */
function createSpirit(index: number): HTMLElement {
  const el = document.createElement('div');
  const isGold = Math.random() > 0.4;

  el.className = `hero__spirit ${isGold ? 'hero__spirit--gold' : 'hero__spirit--teal'}`;

  const left = 15 + Math.random() * 70;
  const bottom = 10 + Math.random() * 40;
  const size = 2 + Math.random() * 3;
  const duration = 10 + Math.random() * 10;
  const delay = Math.random() * 16;
  const rise = -(15 + Math.random() * 20);
  const wander = -15 + Math.random() * 30;

  el.style.left = `${left}%`;
  el.style.bottom = `${bottom}%`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.animationDuration = `${duration}s`;
  el.style.animationDelay = `${delay}s`;
  el.style.setProperty('--rise', `${rise}vh`);
  el.style.setProperty('--wander', `${wander}px`);

  // Stagger initial position for variety
  void index;

  return el;
}

// ─── SVG Arrow Icon ──────────────────────────────────────────────────────────

function arrowSVG(className: string = 'hero__cta-arrow'): string {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>`;
}

// ─── Navigation HTML ─────────────────────────────────────────────────────────

function buildNavHTML(): string {
  const links = NAV_ITEMS.map((item) => {
    return `<button class="hero-nav__link" data-overlay="${item.overlayId}" id="${item.id}">
      <span class="hero-nav__link-text">${item.label}</span>
    </button>`;
  }).join('');

  return `
    <div class="hero-nav-wrapper">
      <nav class="hero-nav" aria-label="Main navigation">
        <button class="hero-nav__emblem" id="hero-emblem" type="button" aria-label="Home">
          <div class="hero-nav__emblem-inner"></div>
        </button>

        <div class="hero-nav__links" id="nav-links">
          ${links}
          <button type="button" class="hero-nav__cta" id="nav-play">
            <span class="hero-nav__cta-text">PLAY</span>
            ${arrowSVG('hero-nav__cta-arrow')}
          </button>
        </div>

        <button class="hero-nav__toggle" id="nav-toggle" type="button"
                aria-label="Toggle navigation menu" aria-expanded="false">
          <span class="hero-nav__bar" aria-hidden="true"></span>
          <span class="hero-nav__bar" aria-hidden="true"></span>
          <span class="hero-nav__bar" aria-hidden="true"></span>
        </button>
      </nav>
      <div class="hero-nav__atmospheric-gradient" aria-hidden="true"></div>
    </div>
  `;
}

// ─── Title Lines ─────────────────────────────────────────────────────────────

/** Splits "Shadow of the Crimson Gate" into cinematic hierarchy lines. */
function buildTitleHTML(): string {
  return `
    <h1 class="hero__title">
      <span class="hero__title-line hero__title-line--lg">Shadow</span>
      <span class="hero__title-line hero__title-line--sm">of the</span>
      <span class="hero__title-line hero__title-line--lg">Crimson Gate</span>
    </h1>
  `;
}

// ─── Main Render ─────────────────────────────────────────────────────────────

/**
 * Renders the cinematic hero section into the given container.
 * Returns a cleanup function to remove listeners and cancel animation frames.
 */
export function renderHero(container: HTMLElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;

  let rafId: number | null = null;
  let isTransitioning = false;

  // ── Build DOM ──

  const section = document.createElement('section');
  section.className = 'hero';
  section.id = 'hero-section';
  section.setAttribute('role', 'banner');
  section.setAttribute('aria-label', `${GAME_TITLE} hero section`);

  section.innerHTML = `
    ${buildNavHTML()}

    <!-- Background: wrapper for ken-burns, inner for parallax -->
    <div class="hero__bg-wrap" aria-hidden="true">
      <div class="hero__bg" id="hero-bg"></div>
    </div>

    <!-- Atmospheric overlays -->
    <div class="hero__overlay hero__overlay--gradient" aria-hidden="true"></div>
    <div class="hero__overlay hero__overlay--vignette" aria-hidden="true"></div>
    <div class="hero__overlay hero__overlay--bottom" aria-hidden="true"></div>

    <!-- Particles -->
    <div class="hero__petals" id="hero-petals" aria-hidden="true"></div>
    <div class="hero__spirits" id="hero-spirits" aria-hidden="true"></div>

    <!-- Ambient glow -->
    <div class="hero__glow hero__glow--warm" aria-hidden="true"></div>
    <div class="hero__glow hero__glow--cool" aria-hidden="true"></div>

    <!-- Title content (lower-left) -->
    <div class="hero__content">
      ${buildTitleHTML()}
      <p class="hero__subtitle">${HERO_SUBTITLE}</p>
    </div>

    <!-- Bottom atmospheric text -->
    <p class="hero__tagline">${HERO_TAGLINE}</p>

    <!-- Play button (bottom-right) -->
    <button class="hero__cta" id="hero-play" type="button"
            aria-label="Play — enter the game">
      <span class="hero__cta-label">Play</span>
      ${arrowSVG()}
      <span class="hero__cta-glow" aria-hidden="true"></span>
    </button>

    <!-- Ambient audio and toggle (bottom-left) -->
    <audio id="hero-audio" src="/assets/silent-blade.mp3" loop preload="auto" autoplay></audio>
    <button class="hero__audio-toggle" id="hero-audio-toggle" type="button" aria-label="Toggle audio" aria-pressed="false">
      <svg class="hero__audio-icon hero__audio-icon--on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
      </svg>
      <svg class="hero__audio-icon hero__audio-icon--off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="21" y1="9" x2="15" y2="15"></line>
        <line x1="15" y1="9" x2="21" y2="15"></line>
      </svg>
    </button>

    <!-- Transition curtain -->
    <div class="hero__curtain" aria-hidden="true"></div>
  `;

  // ── Inject Particles ──

  const petalsContainer = section.querySelector('#hero-petals') as HTMLElement;
  for (let i = 0; i < PARTICLES.PETAL_COUNT; i++) {
    petalsContainer.appendChild(createPetal(i));
  }

  const spiritsContainer = section.querySelector('#hero-spirits') as HTMLElement;
  for (let i = 0; i < PARTICLES.SPIRIT_COUNT; i++) {
    spiritsContainer.appendChild(createSpirit(i));
  }

  // ── Audio ──

  const audio = section.querySelector('#hero-audio') as HTMLAudioElement;
  const audioToggle = section.querySelector('#hero-audio-toggle') as HTMLButtonElement;
  const iconOn = audioToggle.querySelector('.hero__audio-icon--on') as HTMLElement;
  const iconOff = audioToggle.querySelector('.hero__audio-icon--off') as HTMLElement;

  let isPlaying = false;
  const savedAudioPref = localStorage.getItem('sotcg_audio');
  const shouldPlay = savedAudioPref !== 'off';
  audio.volume = 0; // Start at 0 for fade in

  const fadeAudioIn = () => {
    let vol = 0;
    audio.volume = vol;
    const fade = setInterval(() => {
      if (vol < 0.20) {
        vol += 0.01;
        audio.volume = vol;
      } else {
        clearInterval(fade);
      }
    }, 50);
  };

  const fadeAudioOut = () => {
    let vol = audio.volume;
    const fade = setInterval(() => {
      if (vol > 0.02) {
        vol -= 0.02;
        audio.volume = vol;
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fade);
      }
    }, 50);
  };

  const playAudio = async () => {
    if (!shouldPlay) return;
    try {
      await audio.play();
      isPlaying = true;
      iconOn.style.display = 'block';
      iconOff.style.display = 'none';
      audioToggle.setAttribute('aria-pressed', 'true');
      fadeAudioIn();
    } catch (err) {
      console.log('Autoplay blocked. User interaction required to play audio.');
    }
  };

  const toggleAudio = () => {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      iconOn.style.display = 'none';
      iconOff.style.display = 'block';
      audioToggle.setAttribute('aria-pressed', 'false');
      localStorage.setItem('sotcg_audio', 'off');
    } else {
      localStorage.setItem('sotcg_audio', 'on');
      // Reset volume instantly on toggle
      audio.volume = 0.20;
      audio.play().then(() => {
        isPlaying = true;
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
        audioToggle.setAttribute('aria-pressed', 'true');
      }).catch(e => console.error(e));
    }
  };

  audioToggle.addEventListener('click', toggleAudio, { signal });

  // Attempt to autoplay
  playAudio();

  // Play on first interaction if autoplay failed
  const unlockAudio = () => {
    if (!isPlaying) {
      playAudio();
    }
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('click', unlockAudio, { once: true, signal });

  container.appendChild(section);

  // ── Overlay Manager Registration ──

  const overlayManager = OverlayManager.getInstance();
  
  // Register elements that should blur when overlay opens
  const contentEl = section.querySelector('.hero__content') as HTMLElement;
  const taglineEl = section.querySelector('.hero__tagline') as HTMLElement;
  const ctaEl = section.querySelector('.hero__cta') as HTMLElement;
  
  if (contentEl && taglineEl && ctaEl) {
    overlayManager.registerBackgroundTargets([
      contentEl, taglineEl, ctaEl
    ]);
  }

  // Emblem closes overlay
  const emblemBtn = section.querySelector('#hero-emblem') as HTMLButtonElement;
  emblemBtn.addEventListener('click', () => {
    overlayManager.closeOverlay();
  }, { signal });

  // Nav Links open overlays
  const overlayBtns = section.querySelectorAll('.hero-nav__link');
  overlayBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const overlayId = target.getAttribute('data-overlay');
      
      switch(overlayId) {
        case 'world': openWorldOverlay(); break;
        case 'lore': openLoreOverlay(); break;
        case 'characters': openCharactersOverlay(); break;
        case 'media': openMediaOverlay(); break;
      }
    }, { signal });
  });

  // ── Parallax ──

  const bgElement = section.querySelector('#hero-bg') as HTMLElement;

  if (ENABLE_PARALLAX && bgElement) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    section.addEventListener('mousemove', (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = ((e.clientX - cx) / cx) * PARALLAX.STRENGTH_X;
      targetY = ((e.clientY - cy) / cy) * PARALLAX.STRENGTH_Y;
    }, { signal });

    const animateParallax = () => {
      if (!isTransitioning) {
        currentX += (targetX - currentX) * PARALLAX.LERP;
        currentY += (targetY - currentY) * PARALLAX.LERP;
        bgElement.style.transform =
          `translate3d(${-currentX}px, ${-currentY}px, 0)`;
      }
      rafId = requestAnimationFrame(animateParallax);
    };

    rafId = requestAnimationFrame(animateParallax);
  }

  // ── Play Button ──

  const playButton = section.querySelector('#hero-play') as HTMLButtonElement;

  // Cursor-tracking glow
  playButton.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = playButton.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    playButton.style.setProperty('--glow-x', `${x}px`);
    playButton.style.setProperty('--glow-y', `${y}px`);
  }, { signal });

  // Play click → cinematic transition → navigate
  const handlePlayClick = () => {
    if (isTransitioning) return;
    isTransitioning = true;

    section.classList.add('hero--transitioning');
    if (isPlaying) fadeAudioOut();

    setTimeout(() => {
      window.location.hash = `#/${ROUTES.GAME}`;
    }, TIMING.PLAY_TRANSITION);
  };

  playButton.addEventListener('click', handlePlayClick, { signal });
  
  const navPlayButton = section.querySelector('#nav-play') as HTMLButtonElement;
  if (navPlayButton) {
    navPlayButton.addEventListener('click', handlePlayClick, { signal });
  }

  // ── Mobile Navigation Toggle ──

  const toggleButton = section.querySelector('#nav-toggle') as HTMLButtonElement;
  const navLinks = section.querySelector('#nav-links') as HTMLElement;

  toggleButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('hero-nav__links--open');
    toggleButton.classList.toggle('hero-nav__toggle--open', isOpen);
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  }, { signal });

  // Close mobile menu when a link inside is clicked
  navLinks.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.hero-nav__link') || target.closest('.hero-nav__cta')) {
      navLinks.classList.remove('hero-nav__links--open');
      toggleButton.classList.remove('hero-nav__toggle--open');
      toggleButton.setAttribute('aria-expanded', 'false');
    }
  }, { signal });

  // ── Cleanup ──

  return () => {
    controller.abort();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}
