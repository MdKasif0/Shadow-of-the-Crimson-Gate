import { EventBus } from '../core/EventBus';

export class ScreenEffectsUI {
  private overlay: HTMLDivElement;
  private vignette: HTMLDivElement;

  constructor() {
    // Container
    this.overlay = document.createElement('div');
    this.overlay.className = 'screen-effects-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '500', // Behind UI elements like pause menu, but above canvas
      mixBlendMode: 'overlay',
      backgroundColor: 'transparent',
      transition: 'background-color 0.1s ease-out'
    });

    // Vignette layer
    this.vignette = document.createElement('div');
    Object.assign(this.vignette.style, {
      position: 'absolute',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle, transparent 60%, rgba(0, 5, 15, 0.7) 100%)',
      pointerEvents: 'none'
    });

    this.overlay.appendChild(this.vignette);
    document.body.appendChild(this.overlay);

    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('playerHit', () => {
      this.triggerFlash('rgba(255, 0, 0, 0.4)', 0.2);
    });

    EventBus.on('bossPhaseTransition', () => {
      this.triggerFlash('rgba(255, 255, 255, 0.8)', 1.0);
    });
    
    EventBus.on('purifyEffect', () => {
      this.triggerFlash('rgba(200, 255, 255, 0.5)', 2.0);
    });
  }

  private triggerFlash(color: string, duration: number): void {
    // Check if reduce motion/vfx is enabled (can be pulled from a settings manager later)
    const vfxIntensity = localStorage.getItem('shadow-crimson-settings') 
      ? JSON.parse(localStorage.getItem('shadow-crimson-settings')!).vfxIntensity 
      : 1.0;
      
    if (vfxIntensity < 0.2) return; // Very low VFX = no flash

    this.overlay.style.transition = 'none';
    this.overlay.style.backgroundColor = color;
    
    // Force reflow
    void this.overlay.offsetWidth;
    
    this.overlay.style.transition = `background-color ${duration}s ease-out`;
    this.overlay.style.backgroundColor = 'transparent';
  }
}
