import { AudioManager } from '../audio/AudioManager';

export class ControlsScreen {
  private overlay: HTMLDivElement;

  constructor(private onClose: () => void) {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: '2100',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      color: '#f0e6d3', fontFamily: "'Noto Serif JP', serif",
    });

    const controls = [
      { key: 'W A S D', action: 'Move' },
      { key: 'Mouse / J', action: 'Attack' },
      { key: 'Space', action: 'Dash' },
      { key: 'E', action: 'Interact' },
      { key: 'Escape', action: 'Pause' },
      { key: 'R', action: 'Reset (Dev)' },
    ];

    const rows = controls.map(c => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <span style="font-family: 'Cinzel', serif; font-size: 18px; letter-spacing: 3px; color: #c4a35a; min-width: 160px;">${c.key}</span>
        <span style="font-size: 16px; letter-spacing: 2px; color: #d4c5a9;">${c.action}</span>
      </div>
    `).join('');

    this.overlay.innerHTML = `
      <div style="width: 100%; max-width: 500px; padding: 40px; background: rgba(20,20,20,0.95); border: 1px solid #444; border-radius: 8px;">
        <h2 style="font-family: 'Cinzel', serif; font-size: 28px; letter-spacing: 4px; text-align: center; margin-bottom: 30px; color: #cc4444;">CONTROLS</h2>
        ${rows}
        <div style="margin-top: 30px; text-align: center;">
          <button id="btn-close-controls" style="padding: 12px 30px; background: transparent; border: 1px solid #cc4444; color: #cc4444; font-family: 'Noto Serif JP', serif; font-size: 16px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s;">
            CLOSE
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const btn = document.getElementById('btn-close-controls');
    if (btn) {
      btn.addEventListener('click', () => {
        AudioManager.playUIBack();
        this.destroy();
        this.onClose();
      });
      btn.addEventListener('mouseenter', () => {
        AudioManager.playUIHover();
        btn.style.background = 'rgba(204,68,68,0.2)';
      });
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    }

    // Close on Escape
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.destroy();
      this.onClose();
    }
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
