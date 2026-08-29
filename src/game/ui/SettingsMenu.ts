import { SettingsManager } from '../settings/SettingsManager';

export class SettingsMenu {
  private overlay: HTMLDivElement;

  constructor(private onClose: () => void) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'menu-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: '2000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      color: '#fff', fontFamily: "'Noto Serif JP', serif",
    });

    this.render();
    document.body.appendChild(this.overlay);
  }

  private render(): void {
    const settings = SettingsManager.getInstance().get();

    this.overlay.innerHTML = `
      <div style="width: 100%; max-width: 600px; padding: 40px; background: rgba(20,20,20,0.9); border: 1px solid #444; border-radius: 8px;">
        <h2 style="font-size: 32px; letter-spacing: 4px; text-align: center; margin-bottom: 30px; color: #cc4444;">SETTINGS</h2>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Master Volume -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">Master Volume</label>
            <input type="range" id="setting-master-vol" min="0" max="1" step="0.05" value="${settings.masterVolume}" style="width: 200px;" />
          </div>

          <!-- Music Volume -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">Music Volume</label>
            <input type="range" id="setting-music-vol" min="0" max="1" step="0.05" value="${settings.musicVolume}" style="width: 200px;" />
          </div>

          <!-- Graphics Quality -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">Graphics Quality</label>
            <select id="setting-graphics" style="width: 200px; padding: 5px; background: #000; color: #fff; border: 1px solid #444; font-family: inherit;">
              <option value="LOW" ${settings.graphicsQuality === 'LOW' ? 'selected' : ''}>LOW</option>
              <option value="MEDIUM" ${settings.graphicsQuality === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
              <option value="HIGH" ${settings.graphicsQuality === 'HIGH' ? 'selected' : ''}>HIGH</option>
            </select>
          </div>

          <!-- VFX Intensity -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">VFX Intensity</label>
            <select id="setting-vfx" style="width: 200px; padding: 5px; background: #000; color: #fff; border: 1px solid #444; font-family: inherit;">
              <option value="LOW" ${settings.vfxIntensity === 'LOW' ? 'selected' : ''}>LOW</option>
              <option value="MEDIUM" ${settings.vfxIntensity === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
              <option value="HIGH" ${settings.vfxIntensity === 'HIGH' ? 'selected' : ''}>HIGH</option>
            </select>
          </div>

          <!-- Camera Shake -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">Camera Shake</label>
            <input type="checkbox" id="setting-cam-shake" ${settings.cameraShake ? 'checked' : ''} style="transform: scale(1.5);" />
          </div>

          <!-- Reduce Motion -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 18px; letter-spacing: 2px;">Reduce Motion</label>
            <input type="checkbox" id="setting-reduce-motion" ${settings.reduceMotion ? 'checked' : ''} style="transform: scale(1.5);" />
          </div>

        </div>

        <div style="margin-top: 40px; text-align: center; display: flex; justify-content: center; gap: 20px;">
          <button id="btn-fullscreen" style="padding: 12px 30px; background: transparent; border: 1px solid #cc4444; color: #cc4444; font-family: 'Noto Serif JP', serif; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s;">
            ${document.fullscreenElement ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'}
          </button>
          <button id="btn-close-settings" style="padding: 12px 30px; background: transparent; border: 1px solid #cc4444; color: #cc4444; font-family: 'Noto Serif JP', serif; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s;">
            CLOSE
          </button>
        </div>
      </div>
    `;

    // Event Listeners
    const updateSettings = () => {
      const masterVolume = parseFloat((document.getElementById('setting-master-vol') as HTMLInputElement).value);
      const musicVolume = parseFloat((document.getElementById('setting-music-vol') as HTMLInputElement).value);
      const graphicsQuality = (document.getElementById('setting-graphics') as HTMLSelectElement).value as any;
      const vfxIntensity = (document.getElementById('setting-vfx') as HTMLSelectElement).value as any;
      const cameraShake = (document.getElementById('setting-cam-shake') as HTMLInputElement).checked;
      const reduceMotion = (document.getElementById('setting-reduce-motion') as HTMLInputElement).checked;

      SettingsManager.getInstance().update({
        masterVolume, musicVolume, graphicsQuality, vfxIntensity, cameraShake, reduceMotion
      });
    };

    ['setting-master-vol', 'setting-music-vol', 'setting-graphics', 'setting-vfx', 'setting-cam-shake', 'setting-reduce-motion'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', updateSettings);
    });

    const btnClose = document.getElementById('btn-close-settings');
    if (btnClose) {
      btnClose.addEventListener('click', this.onClose);
      btnClose.addEventListener('mouseenter', () => btnClose.style.background = 'rgba(204,68,68,0.2)');
      btnClose.addEventListener('mouseleave', () => btnClose.style.background = 'transparent');
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.log(err));
          btnFullscreen.textContent = 'EXIT FULLSCREEN';
        } else {
          document.exitFullscreen().catch(err => console.log(err));
          btnFullscreen.textContent = 'ENTER FULLSCREEN';
        }
      });
      btnFullscreen.addEventListener('mouseenter', () => btnFullscreen.style.background = 'rgba(204,68,68,0.2)');
      btnFullscreen.addEventListener('mouseleave', () => btnFullscreen.style.background = 'transparent');
    }
  }

    const closeBtn = document.getElementById('btn-close-settings');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.destroy();
        this.onClose();
      });
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#cc4444';
        closeBtn.style.color = '#fff';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = '#cc4444';
      });
    }
  }

  public destroy(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
