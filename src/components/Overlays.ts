import { GAME_TITLE } from '../utils/constants';

/**
 * Core Overlay Manager to handle mounting, unmounting, and animation.
 */
export class OverlayManager {
  private static instance: OverlayManager;
  private container: HTMLElement;
  private activeOverlay: HTMLElement | null = null;
  private backgroundTargets: HTMLElement[] = [];

  private constructor() {
    this.container = document.createElement('div');
    this.container.className = 'hero-overlays-container';
    document.body.appendChild(this.container);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeOverlay) {
        this.closeOverlay();
      }
    });
  }

  public static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
    }
    return OverlayManager.instance;
  }

  /**
   * Elements that should be darkened/blurred when an overlay is open.
   */
  public registerBackgroundTargets(elements: HTMLElement[]) {
    this.backgroundTargets = elements;
  }

  public openOverlay(contentHTML: string, onMount?: (element: HTMLElement) => void) {
    if (this.activeOverlay) {
      this.closeOverlay();
    }

    const overlay = document.createElement('div');
    overlay.className = 'hero-overlay';
    overlay.innerHTML = `
      <button class="hero-overlay__close" type="button" aria-label="Close overlay">
        CLOSE &times;
      </button>
      <div class="hero-overlay__content-wrapper">
        ${contentHTML}
      </div>
    `;

    this.container.appendChild(overlay);
    this.activeOverlay = overlay;

    // Trigger open animations
    requestAnimationFrame(() => {
      overlay.classList.add('hero-overlay--open');
      this.backgroundTargets.forEach(el => el.classList.add('hero-bg--overlay-active'));
    });

    // Close button logic
    const closeBtn = overlay.querySelector('.hero-overlay__close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closeOverlay());

    if (onMount) {
      onMount(overlay);
    }
  }

  public closeOverlay() {
    if (!this.activeOverlay) return;
    
    const overlay = this.activeOverlay;
    this.activeOverlay = null;

    overlay.classList.remove('hero-overlay--open');
    this.backgroundTargets.forEach(el => el.classList.remove('hero-bg--overlay-active'));

    // Wait for transition to finish before removing from DOM
    setTimeout(() => {
      if (overlay.parentNode === this.container) {
        this.container.removeChild(overlay);
      }
    }, 600); // matches CSS transition duration
  }
}

// ─── Overlay Factories ────────────────────────────────────────────────────────

export function openWorldOverlay() {
  const content = `
    <h2 class="overlay-title">THE WORLD</h2>
    <div class="overlay-world-locations">
      <div class="world-location">
        <h3 class="world-location__name">Crimson Temple</h3>
        <p class="world-location__desc">The forbidden sanctuary where the ancient seal was broken.</p>
      </div>
      <div class="world-location">
        <h3 class="world-location__name">Sakura Courtyard</h3>
        <p class="world-location__desc">A deceptive place of beauty, now stained with fallen petals and blood.</p>
      </div>
      <div class="world-location">
        <h3 class="world-location__name">Cursed Forest</h3>
        <p class="world-location__desc">Twisted woods where restless spirits and Yokai gather in the dark.</p>
      </div>
      <div class="world-location">
        <h3 class="world-location__name">Spirit Realm</h3>
        <p class="world-location__desc">The ethereal plane overlapping ours, accessible only to the worthy.</p>
      </div>
    </div>
  `;
  OverlayManager.getInstance().openOverlay(content);
}

export function openLoreOverlay() {
  const content = `
    <h2 class="overlay-title">${GAME_TITLE}</h2>
    <div class="overlay-lore-paragraphs">
      <div class="lore-section">
        <h3 class="lore-section__title">THE SEAL</h3>
        <p class="lore-section__text">For centuries, the Crimson Gate remained sealed, keeping the darkness at bay.</p>
      </div>
      <div class="lore-section">
        <h3 class="lore-section__title">THE AWAKENING</h3>
        <p class="lore-section__text">Then, beneath a blood-red moon, the seal broke. The world shattered.</p>
      </div>
      <div class="lore-section">
        <h3 class="lore-section__title">THE RONIN</h3>
        <p class="lore-section__text">A wandering swordsman arrived at the forgotten temple, seeking answers.</p>
      </div>
      <div class="lore-section">
        <h3 class="lore-section__title">THE YOKAI</h3>
        <p class="lore-section__text">Something ancient had awakened beyond the gate, and it hungered.</p>
      </div>
    </div>
  `;
  OverlayManager.getInstance().openOverlay(content);
}

const CHARACTERS = [
  { id: 'ronin', name: 'Wandering Ronin', role: 'The Protagonist', desc: 'A masterless samurai bound by an ancient oath to protect the Crimson Gate.', lore: 'He wields a blade forged in spirit fire.' },
  { id: 'shadow', name: 'Shadow Yokai', role: 'Lesser Demon', desc: 'Born from the malice of fallen warriors. They stalk the cursed forests.', lore: 'Their forms constantly shift like smoke in the wind.' },
  { id: 'tengu', name: 'Tengu', role: 'Mountain Spirit', desc: 'Proud avian warriors of the high peaks. Neutral, but dangerous if provoked.', lore: 'They demand respect and combat prowess.' },
  { id: 'oni', name: 'Crimson Oni', role: 'Gate Guardian', desc: 'A massive demon guarding the threshold to the Spirit Realm.', lore: 'Its club can shatter mountains.' }
];

export function openCharactersOverlay() {
  const content = `
    <h2 class="overlay-title">CHARACTERS</h2>
    <div class="overlay-characters-nav">
      <button class="char-nav-btn char-nav-btn--prev" aria-label="Previous character">&larr;</button>
      <div class="char-nav-list">
        ${CHARACTERS.map((c, i) => `<button class="char-nav-item ${i === 0 ? 'char-nav-item--active' : ''}" data-index="${i}">[ ${c.name.toUpperCase()} ]</button>`).join('')}
      </div>
      <button class="char-nav-btn char-nav-btn--next" aria-label="Next character">&rarr;</button>
    </div>
    
    <div class="overlay-character-details" id="char-details">
      <!-- Injected via JS -->
    </div>
  `;

  OverlayManager.getInstance().openOverlay(content, (overlayEl) => {
    let currentIndex = 0;
    const detailsContainer = overlayEl.querySelector('#char-details') as HTMLElement;
    const navItems = overlayEl.querySelectorAll('.char-nav-item');
    const prevBtn = overlayEl.querySelector('.char-nav-btn--prev') as HTMLButtonElement;
    const nextBtn = overlayEl.querySelector('.char-nav-btn--next') as HTMLButtonElement;

    const renderChar = (index: number) => {
      const char = CHARACTERS[index];
      detailsContainer.innerHTML = `
        <div class="char-details__inner">
          <h3 class="char-details__name">${char.name}</h3>
          <p class="char-details__role">${char.role}</p>
          <p class="char-details__desc">${char.desc}</p>
          <p class="char-details__lore">${char.lore}</p>
        </div>
      `;
      navItems.forEach(el => el.classList.remove('char-nav-item--active'));
      navItems[index].classList.add('char-nav-item--active');
    };

    renderChar(currentIndex);

    prevBtn.addEventListener('click', () => {
      currentIndex = currentIndex === 0 ? CHARACTERS.length - 1 : currentIndex - 1;
      renderChar(currentIndex);
    });

    nextBtn.addEventListener('click', () => {
      currentIndex = currentIndex === CHARACTERS.length - 1 ? 0 : currentIndex + 1;
      renderChar(currentIndex);
    });

    navItems.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        currentIndex = idx;
        renderChar(currentIndex);
      });
    });
  });
}

export function openMediaOverlay() {
  const galleryAssets = [
    '/assets/environments/courtyard/sakura_courtyard.png',
    '/assets/environments/forest/cursed_forest.png',
    '/assets/environments/temple/temple.png',
    '/assets/boss/crimson-oni/crimson_oni.png',
    '/assets/characters/tengu/tengu.png',
    '/assets/characters/player/player_ronin.png'
  ];

  const content = `
    <h2 class="overlay-title">MEDIA</h2>
    <div class="overlay-media-content" style="max-width: 1200px; width: 100%;">
      <h3 class="media-subtitle">CONCEPT ART & ENVIRONMENTS</h3>
      <p class="media-text">Explore the beautiful, dark world of Shadow of the Crimson Gate.</p>
      <div class="media-gallery-grid">
        ${galleryAssets.map(src => `<div class="media-item" style="background-image: url('${src}')"></div>`).join('')}
      </div>
    </div>
  `;
  OverlayManager.getInstance().openOverlay(content);
}
