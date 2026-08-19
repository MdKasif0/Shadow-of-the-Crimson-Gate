import { GAME_CONFIG } from '../GameConfig';

export class GameHUD {
  private container: HTMLElement;
  private playerHPBar!: HTMLElement;
  private playerHPFill!: HTMLElement;
  private enemyHPContainer!: HTMLElement;
  private enemyHPFill!: HTMLElement;
  private pauseOverlay!: HTMLElement;
  private deathOverlay!: HTMLElement;
  private debugPanel!: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.createHUD();
  }

  private createHUD(): void {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;font-family:monospace;';

    // Player HP
    hud.innerHTML = `
      <div style="position:absolute;bottom:2rem;left:2rem;">
        <div style="color:#c4a35a;font-size:0.7rem;letter-spacing:0.1em;margin-bottom:4px;">RONIN</div>
        <div id="player-hp-bar" style="width:200px;height:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);">
          <div id="player-hp-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#8b1a1a,#c0392b);transition:width 0.3s;"></div>
        </div>
      </div>
      <div id="enemy-hp-container" style="position:absolute;top:2rem;left:50%;transform:translateX(-50%);display:none;">
        <div style="color:#ff4444;font-size:0.7rem;letter-spacing:0.1em;margin-bottom:4px;text-align:center;">YOKAI</div>
        <div style="width:250px;height:5px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);">
          <div id="enemy-hp-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#661122,#aa2244);transition:width 0.3s;"></div>
        </div>
      </div>
      <div id="pause-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:none;align-items:center;justify-content:center;flex-direction:column;pointer-events:all;">
        <h1 style="color:#c4a35a;font-size:2rem;letter-spacing:0.3em;">PAUSED</h1>
        <p style="color:#88aadd;margin-top:1rem;">Press ESC to resume</p>
      </div>
      <div id="death-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(60,0,0,0.6);display:none;align-items:center;justify-content:center;flex-direction:column;pointer-events:all;">
        <h1 style="color:#ff3344;font-size:2rem;letter-spacing:0.3em;">YOU DIED</h1>
        <p style="color:#88aadd;margin-top:1rem;">Press R to restart</p>
      </div>
      <div id="debug-panel" style="position:absolute;top:10px;left:10px;color:lime;font-size:11px;background:rgba(0,0,0,0.5);padding:8px;display:${GAME_CONFIG.DEBUG_MODE ? 'block' : 'none'};"></div>
    `;
    this.container.appendChild(hud);

    this.playerHPBar = document.getElementById('player-hp-bar')!;
    this.playerHPFill = document.getElementById('player-hp-fill')!;
    this.enemyHPContainer = document.getElementById('enemy-hp-container')!;
    this.enemyHPFill = document.getElementById('enemy-hp-fill')!;
    this.pauseOverlay = document.getElementById('pause-overlay')!;
    this.deathOverlay = document.getElementById('death-overlay')!;
    this.debugPanel = document.getElementById('debug-panel')!;
  }

  public updatePlayerHP(percent: number): void {
    this.playerHPFill.style.width = `${percent * 100}%`;
  }

  public updateEnemyHP(percent: number, visible: boolean): void {
    this.enemyHPContainer.style.display = visible ? 'block' : 'none';
    this.enemyHPFill.style.width = `${percent * 100}%`;
  }

  public showPause(show: boolean): void {
    this.pauseOverlay.style.display = show ? 'flex' : 'none';
  }

  public showDeath(show: boolean): void {
    this.deathOverlay.style.display = show ? 'flex' : 'none';
  }

  public updateDebug(info: string): void {
    if (this.debugPanel) this.debugPanel.innerHTML = info;
  }

  public destroy(): void {
    const hud = document.getElementById('game-hud');
    if (hud) hud.remove();
  }
}
