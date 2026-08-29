import { GameStateManager } from '../state/GameStateManager';
import { GameState } from '../state/GameState';
import { EventBus } from '../core/EventBus';

export class EpilogueUI {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'epilogue-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0)', zIndex: '2000',
      display: 'none', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 4s ease',
      color: '#fff', fontFamily: "'Cinzel', 'Noto Serif JP', serif",
      pointerEvents: 'none'
    });

    this.content = document.createElement('div');
    Object.assign(this.content.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '40px', opacity: '0', transition: 'opacity 5s ease'
    });
    
    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);

    EventBus.on('epilogueSequenceStart', () => {
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
    this.content.innerHTML = `
      <h1 style="font-size: 5vw; letter-spacing: 0.2em; text-align: center; text-shadow: 0 0 20px rgba(255,255,255,0.2);">
        SHADOW OF THE<br/>CRIMSON GATE
      </h1>
      <h2 style="font-size: 2vw; letter-spacing: 0.5em; color: #88bbff; margin-top: 40px; text-shadow: 0 0 10px rgba(136,187,255,0.4);">
        THE END
      </h2>
    `;
    // Trigger fade in
    setTimeout(() => {
      this.content.style.opacity = '1';
    }, 100);
  }

  private renderButtons(): void {
    this.overlay.style.pointerEvents = 'auto'; // allow clicking now
    this.content.innerHTML += `
      <div style="display: flex; gap: 20px; margin-top: 60px;">
        <button id="btn-epi-continue" class="hero-nav__cta" style="width: 200px; justify-content: center; font-size: 14px;">CONTINUE</button>
        <button id="btn-epi-mainmenu" class="hero-nav__cta" style="width: 200px; justify-content: center; font-size: 14px;">MAIN MENU</button>
      </div>
    `;

    setTimeout(() => {
      document.getElementById('btn-epi-continue')?.addEventListener('click', () => {
        this.hide();
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
