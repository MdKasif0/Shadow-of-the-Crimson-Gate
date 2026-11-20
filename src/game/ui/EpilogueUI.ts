import { GameStateManager } from '../state/GameStateManager';
import { GameState } from '../state/GameState';
import { EventBus } from '../core/EventBus';
import { endingFor } from '../story/Endings';
import { StoryFlags } from '../story/StoryFlag';

export class EpilogueUI {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private flags: StoryFlags | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'epilogue-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0)', zIndex: '2000',
      display: 'none', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 4s ease',
      color: '#fff', fontFamily: "'Cinzel', serif",
      pointerEvents: 'none'
    });

    this.content = document.createElement('div');
    Object.assign(this.content.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '40px', opacity: '0', transition: 'opacity 5s ease'
    });
    
    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);

    EventBus.on('epilogueSequenceStart', (data: { flags?: StoryFlags }) => {
      this.flags = data?.flags ?? null;
      // 5 seconds after boss death
      this.overlay.style.display = 'flex';
      // Fade to black slowly
      setTimeout(() => {
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      }, 1000);
      
      // After 8 seconds, show text
      setTimeout(() => {
        this.renderText();
      }, 9000);
    });
    
    EventBus.on('epilogueSequenceEnd', () => {
      // 35 seconds total
      this.renderButtons();
    });
  }

  private renderText(): void {
    const ending = this.flags ? endingFor(this.flags) : null;
    this.content.innerHTML = `
      <h1 style="font-size: clamp(28px, 5vw, 72px); letter-spacing: 0.2em; text-align: center; text-shadow: 0 0 20px rgba(255,255,255,0.2); margin: 0;">
        SHADOW OF THE<br/>CRIMSON GATE
      </h1>
      ${ending ? `
        <h2 style="font-size: clamp(14px, 1.6vw, 24px); letter-spacing: 0.4em; color: ${ending.accent}; margin: 24px 0 0; text-align: center; text-shadow: 0 0 10px ${ending.accent}66;">
          ${ending.title.toUpperCase()}
        </h2>
        <p style="max-width: 640px; margin: 0; padding: 0 24px; font-family: var(--font-ui, sans-serif); font-size: clamp(14px, 1.1vw, 17px); line-height: 1.8; color: #d8d2c4; text-align: center;">
          ${ending.text}
        </p>` : ''}
      <p style="font-size: 12px; letter-spacing: 0.5em; color: #888; margin: 8px 0 0;">THE END</p>
    `;
    // Trigger fade in
    setTimeout(() => {
      this.content.style.opacity = '1';
    }, 100);
  }

  private renderButtons(): void {
    this.overlay.style.pointerEvents = 'auto'; // allow clicking now
    this.content.innerHTML += `
      <p style="margin: 48px 0 0; max-width: 560px; font-family: var(--font-ui, sans-serif); font-size: 13px; color: #a8a090; text-align: center;">New Game+ starts the climb again with your skills and charms. Enemies are stronger, and each guardian drops a new charm.</p>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">
        <button id="btn-epi-continue" class="hero-nav__cta" style="width: 200px; justify-content: center; font-size: 14px;">CONTINUE</button>
        <button id="btn-epi-ngplus" class="hero-nav__cta" style="width: 200px; justify-content: center; font-size: 14px;">NEW GAME+</button>
        <button id="btn-epi-mainmenu" class="hero-nav__cta" style="width: 200px; justify-content: center; font-size: 14px;">MAIN MENU</button>
      </div>
    `;

    setTimeout(() => {
      document.getElementById('btn-epi-continue')?.addEventListener('click', () => {
        this.hide();
        GameStateManager.getInstance().setState(GameState.PLAYING);
      });

      document.getElementById('btn-epi-ngplus')?.addEventListener('click', () => {
        this.hide();
        EventBus.emit('newGame', { plus: true });
        GameStateManager.getInstance().setState(GameState.PLAYING);
      });

      document.getElementById('btn-epi-mainmenu')?.addEventListener('click', () => {
        this.hide();
        GameStateManager.getInstance().setState(GameState.MAIN_MENU);
      });
    }, 100);
  }
  
  private hide(): void {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.display = 'none';
      this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      this.content.style.opacity = '0';
      this.content.innerHTML = '';
      this.overlay.style.pointerEvents = 'none';
    }, 3000);
  }
}
