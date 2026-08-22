import { EventBus } from '../core/EventBus';
import { BossPhaseId } from '../boss/BossPhase';

/**
 * BossUI — Manages the cinematic boss name display and the boss health bar.
 */
export class BossUI {
  private container: HTMLElement;
  
  // Cinematic Title
  private titleContainer!: HTMLElement;
  private titleText!: HTMLElement;
  
  // Health Bar
  private healthContainer!: HTMLElement;
  private healthFill!: HTMLElement;
  private healthLabel!: HTMLElement;

  private isVisible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'boss-ui-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '100'; // Above standard UI but below menus
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';

    this.createTitle();
    this.createHealthBar();
    
    document.body.appendChild(this.container);

    EventBus.on('bossHealth', this.onBossHealth.bind(this));
    EventBus.on('bossDeath', this.onBossDeath.bind(this));
  }

  private createTitle(): void {
    this.titleContainer = document.createElement('div');
    this.titleContainer.style.position = 'absolute';
    this.titleContainer.style.top = '45%';
    this.titleContainer.style.width = '100%';
    this.titleContainer.style.textAlign = 'center';
    this.titleContainer.style.opacity = '0';
    this.titleContainer.style.transition = 'opacity 1.5s ease-in-out';
    
    this.titleText = document.createElement('h1');
    this.titleText.style.fontFamily = 'Cinzel, serif'; // Assuming we have a serif font or default
    this.titleText.style.fontSize = '4rem';
    this.titleText.style.color = '#ff3333';
    this.titleText.style.textShadow = '0 0 20px #ff0000, 2px 2px 4px #000';
    this.titleText.style.letterSpacing = '0.5em';
    this.titleText.style.margin = '0';
    this.titleText.style.fontWeight = '300';
    
    this.titleContainer.appendChild(this.titleText);
    this.container.appendChild(this.titleContainer);
  }

  private createHealthBar(): void {
    this.healthContainer = document.createElement('div');
    this.healthContainer.style.position = 'absolute';
    this.healthContainer.style.top = '40px';
    this.healthContainer.style.width = '50%';
    this.healthContainer.style.maxWidth = '600px';
    this.healthContainer.style.opacity = '0';
    this.healthContainer.style.transition = 'opacity 1s ease-in-out';

    // Label
    this.healthLabel = document.createElement('div');
    this.healthLabel.style.fontFamily = 'Cinzel, serif';
    this.healthLabel.style.fontSize = '1.2rem';
    this.healthLabel.style.color = '#fff';
    this.healthLabel.style.textAlign = 'center';
    this.healthLabel.style.marginBottom = '8px';
    this.healthLabel.style.letterSpacing = '0.2em';
    this.healthLabel.style.textShadow = '1px 1px 2px #000';
    this.healthContainer.appendChild(this.healthLabel);

    // Track
    const track = document.createElement('div');
    track.style.width = '100%';
    track.style.height = '8px';
    track.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    track.style.border = '1px solid #444';
    track.style.position = 'relative';

    // Fill
    this.healthFill = document.createElement('div');
    this.healthFill.style.width = '100%';
    this.healthFill.style.height = '100%';
    this.healthFill.style.backgroundColor = '#cc2222';
    this.healthFill.style.transition = 'width 0.3s ease-out, background-color 0.5s';
    this.healthFill.style.boxShadow = '0 0 10px #ff0000';
    
    track.appendChild(this.healthFill);
    this.healthContainer.appendChild(track);
    this.container.appendChild(this.healthContainer);
  }

  /**
   * Triggers the cinematic title sequence.
   */
  public showCinematicTitle(name: string, duration: number = 3000): void {
    this.titleText.innerText = name.toUpperCase();
    this.titleContainer.style.opacity = '1';
    
    setTimeout(() => {
      this.titleContainer.style.opacity = '0';
    }, duration);
  }

  /**
   * Fades in the persistent boss health bar.
   */
  public showHealthBar(name: string): void {
    this.isVisible = true;
    this.healthLabel.innerText = name.toUpperCase();
    this.healthContainer.style.opacity = '1';
  }

  public hideHealthBar(): void {
    this.isVisible = false;
    this.healthContainer.style.opacity = '0';
  }

  private onBossHealth(data: { current: number; max: number; phase: BossPhaseId }): void {
    if (!this.isVisible) return;
    
    const pct = Math.max(0, (data.current / data.max) * 100);
    this.healthFill.style.width = `${pct}%`;
    
    // Change color based on phase
    if (data.phase === BossPhaseId.PHASE_2) {
      this.healthFill.style.backgroundColor = '#ff4400'; // Oranger
    } else if (data.phase === BossPhaseId.PHASE_3) {
      this.healthFill.style.backgroundColor = '#ff0000'; // Brighter red
      this.healthFill.style.boxShadow = '0 0 15px #ff0000';
    }
  }

  private onBossDeath(): void {
    // Fade out health bar on death
    this.hideHealthBar();
    
    // Show cinematic victory text
    setTimeout(() => {
      this.titleText.style.color = '#ffffff';
      this.titleText.style.textShadow = '0 0 20px #aaaaaa, 2px 2px 4px #000';
      this.showCinematicTitle('CRIMSON ONI DEFEATED', 4000);
    }, 2000);

    setTimeout(() => {
      this.titleText.style.color = '#ffaa33'; // Golden hue for purified/reward
      this.titleText.style.textShadow = '0 0 20px #ff8800, 2px 2px 4px #000';
      this.showCinematicTitle('PURIFIED', 3000);
    }, 7000);
  }

  public reset(): void {
    this.hideHealthBar();
    this.titleContainer.style.opacity = '0';
    this.healthFill.style.width = '100%';
    this.healthFill.style.backgroundColor = '#cc2222';
    this.healthFill.style.boxShadow = '0 0 10px #ff0000';
  }

  public dispose(): void {
    EventBus.off('bossHealth', this.onBossHealth.bind(this));
    EventBus.off('bossDeath', this.onBossDeath.bind(this));
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
