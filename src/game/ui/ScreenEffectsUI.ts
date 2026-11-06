import { EventBus } from '../core/EventBus';
import { SettingsManager } from '../settings/SettingsManager';

export class ScreenEffectsUI {
  private overlay: HTMLDivElement;

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

    document.body.appendChild(this.overlay);

    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('playerHit', () => {
      this.triggerFlash('rgba(255, 0, 0, 0.4)', 0.2);
    });

    EventBus.on('perfectDodge', () => {
      this.triggerFlash('rgba(120, 190, 255, 0.5)', 0.7);
    });

    EventBus.on('finisherStarted', () => {
      this.triggerFlash('rgba(255, 60, 40, 0.55)', 0.6);
    });

    EventBus.on('bossPhaseTransition', () => {
      this.triggerFlash('rgba(255, 255, 255, 0.8)', 1.0);
    });
    
    EventBus.on('purifyEffect', () => {
      this.triggerFlash('rgba(200, 255, 255, 0.5)', 2.0);
    });
  }

  private triggerFlash(color: string, duration: number): void {
    const { vfxIntensity, reduceMotion } = SettingsManager.getInstance().get();
    if (vfxIntensity === 'LOW' || reduceMotion) return;

    this.overlay.style.transition = 'none';
    this.overlay.style.backgroundColor = color;
    
    // Force reflow
    void this.overlay.offsetWidth;
    
    this.overlay.style.transition = `background-color ${duration}s ease-out`;
    this.overlay.style.backgroundColor = 'transparent';
  }
}
