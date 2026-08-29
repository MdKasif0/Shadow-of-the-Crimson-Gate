export class LoadingScreen {
  private overlay: HTMLDivElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: '#050505',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c4a35a',
      fontFamily: "'Cinzel', serif",
      transition: 'opacity 1.5s ease',
      pointerEvents: 'all' // Block interactions during loading
    });

    this.overlay.innerHTML = `
      <h1 style="font-size: 48px; letter-spacing: 8px; margin-bottom: 20px;">SHADOW OF THE CRIMSON GATE</h1>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="width: 200px; height: 2px; background: rgba(196, 163, 90, 0.2); margin-bottom: 10px; position: relative; overflow: hidden;">
          <div id="loading-bar" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: #c4a35a; transition: width 0.3s ease;"></div>
        </div>
        <p id="loading-text" style="font-family: 'Noto Serif JP', serif; font-size: 14px; letter-spacing: 2px; color: #aaddcc;">Awakening the mountain...</p>
      </div>
    `;

    document.body.appendChild(this.overlay);
  }

  public updateProgress(percent: number, message: string): void {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = message;
  }

  public hide(): void {
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 1500);
  }
}
