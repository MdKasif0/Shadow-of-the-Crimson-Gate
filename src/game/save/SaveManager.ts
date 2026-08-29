import { SaveData } from './SaveData';
import { SAVE_VERSION } from './SaveVersion';

const SAVE_KEY = 'shadow-crimson-save';

export class SaveManager {
  private static instance: SaveManager;
  private currentSave: SaveData | null = null;
  
  private saveIndicator: HTMLDivElement;

  private constructor() {
    this.saveIndicator = document.createElement('div');
    Object.assign(this.saveIndicator.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      color: '#fff', fontFamily: "'Noto Serif JP', serif",
      fontSize: '14px', letterSpacing: '2px',
      textShadow: '0 1px 4px #000',
      opacity: '0', transition: 'opacity 0.5s ease',
      zIndex: '3000', pointerEvents: 'none'
    });
    document.body.appendChild(this.saveIndicator);
    
    this.load();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  public hasSave(): boolean {
    return this.currentSave !== null;
  }

  public getSave(): SaveData | null {
    return this.currentSave;
  }

  public deleteSave(): void {
    this.currentSave = null;
    localStorage.removeItem(SAVE_KEY);
  }

  public saveGame(data: Omit<SaveData, 'version'>): void {
    this.currentSave = {
      ...data,
      version: SAVE_VERSION
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.currentSave));
      this.showSaveIndicator();
    } catch (e) {
      console.warn("Failed to write save data to localStorage", e);
    }
  }

  private load(): void {
    try {
      const dataStr = localStorage.getItem(SAVE_KEY);
      if (!dataStr) return;

      let data: SaveData;
      try {
        data = JSON.parse(dataStr) as SaveData;
      } catch {
        console.warn('Save data is corrupted. Resetting save.');
        this.deleteSave();
        return;
      }

      // Validate essential fields
      if (typeof data.version !== 'number' || !data.playerPosition) {
        console.warn('Save data is malformed. Resetting save.');
        this.deleteSave();
        return;
      }

      // Version migration
      if (data.version < SAVE_VERSION) {
        // Future: migrate save data here per version
        data.version = SAVE_VERSION;
        console.warn(`Migrated save from older version to v${SAVE_VERSION}.`);
      } else if (data.version > SAVE_VERSION) {
        console.warn('Save version is newer than game version. Resetting save.');
        this.deleteSave();
        return;
      }

      this.currentSave = data;
    } catch (e) {
      console.error('Unexpected error loading save data.', e);
      this.deleteSave();
    }
  }

  private showSaveIndicator(): void {
    this.saveIndicator.textContent = 'SAVING...';
    this.saveIndicator.style.opacity = '0.8';
    
    setTimeout(() => {
      this.saveIndicator.textContent = 'SAVED';
      setTimeout(() => {
        this.saveIndicator.style.opacity = '0';
      }, 1500);
    }, 800);
  }
}
