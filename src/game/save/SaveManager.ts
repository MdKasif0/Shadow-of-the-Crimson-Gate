import { SaveData } from './SaveData';
import { SAVE_VERSION } from './SaveVersion';
import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';

/** The single save from before slots existed. Moved into slot 1 on first run. */
const LEGACY_KEY = 'shadow-crimson-save';
const SLOT_PREFIX = 'shadow-crimson-save-slot-';
const ACTIVE_SLOT_KEY = 'shadow-crimson-active-slot';
export const SAVE_SLOTS = 3;

export interface SlotSummary {
  slot: number;
  save: SaveData | null;
}

/**
 * SaveManager — Three save slots in localStorage. The game always writes to the
 * active slot: autosaves at shrines, level changes and story beats all land there.
 */
export class SaveManager {
  private static instance: SaveManager;
  private slots: (SaveData | null)[] = new Array(SAVE_SLOTS).fill(null);
  private activeSlot = 1;
  
  private saveIndicator: HTMLDivElement;

  private constructor() {
    this.saveIndicator = document.createElement('div');
    Object.assign(this.saveIndicator.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      color: '#fff', fontFamily: "'Cinzel', serif",
      fontSize: '14px', letterSpacing: '2px',
      textShadow: '0 1px 4px #000',
      opacity: '0', transition: 'opacity 0.5s ease',
      zIndex: '3000', pointerEvents: 'none'
    });
    document.body.appendChild(this.saveIndicator);
    
    this.migrateLegacySave();
    for (let slot = 1; slot <= SAVE_SLOTS; slot++) this.slots[slot - 1] = this.read(slot);
    const stored = Number(this.storage(() => localStorage.getItem(ACTIVE_SLOT_KEY)));
    this.activeSlot = stored >= 1 && stored <= SAVE_SLOTS ? stored : this.mostRecentSlot() ?? 1;
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  public get currentSlot(): number {
    return this.activeSlot;
  }

  /** Makes this slot the one the game reads and writes. */
  public setActiveSlot(slot: number): void {
    if (slot < 1 || slot > SAVE_SLOTS) return;
    this.activeSlot = slot;
    this.storage(() => localStorage.setItem(ACTIVE_SLOT_KEY, String(slot)));
  }

  public listSlots(): SlotSummary[] {
    return this.slots.map((save, i) => ({ slot: i + 1, save }));
  }

  /** The slot saved to most recently, if any has a save. */
  public mostRecentSlot(): number | null {
    let best: number | null = null;
    let bestTime = -1;
    this.slots.forEach((save, i) => {
      if (!save) return;
      const time = save.savedAt ?? 0;
      if (time > bestTime) {
        bestTime = time;
        best = i + 1;
      }
    });
    return best;
  }

  /** True if any slot holds a save, so Continue has something to load. */
  public hasAnySave(): boolean {
    return this.slots.some(Boolean);
  }

  public hasSave(): boolean {
    return this.getSave() !== null;
  }

  public getSave(): SaveData | null {
    return this.slots[this.activeSlot - 1];
  }

  public deleteSave(slot: number = this.activeSlot): void {
    this.slots[slot - 1] = null;
    this.storage(() => localStorage.removeItem(SLOT_PREFIX + slot));
  }

  public saveGame(data: Omit<SaveData, 'version'>): void {
    const save: SaveData = { ...data, version: SAVE_VERSION, savedAt: Date.now() };
    this.slots[this.activeSlot - 1] = save;

    try {
      localStorage.setItem(SLOT_PREFIX + this.activeSlot, JSON.stringify(save));
      AudioManager.play(AudioId.UI_CONFIRM, { cooldownMs: 2000 });
      this.showSaveIndicator();
    } catch (e) {
      console.warn("Failed to write save data to localStorage", e);
    }
  }

  private storage<T>(action: () => T): T | null {
    try {
      return action();
    } catch {
      return null;
    }
  }

  private migrateLegacySave(): void {
    const legacy = this.storage(() => localStorage.getItem(LEGACY_KEY));
    if (!legacy) return;
    if (!this.storage(() => localStorage.getItem(SLOT_PREFIX + 1))) {
      this.storage(() => localStorage.setItem(SLOT_PREFIX + 1, legacy));
      this.storage(() => localStorage.setItem(ACTIVE_SLOT_KEY, '1'));
    }
    this.storage(() => localStorage.removeItem(LEGACY_KEY));
  }

  private read(slot: number): SaveData | null {
    const key = SLOT_PREFIX + slot;
    try {
      const dataStr = localStorage.getItem(key);
      if (!dataStr) return null;

      let data: SaveData;
      try {
        data = JSON.parse(dataStr) as SaveData;
      } catch {
        console.warn(`Save slot ${slot} is corrupted. Clearing it.`);
        localStorage.removeItem(key);
        return null;
      }

      // Validate essential fields
      if (typeof data.version !== 'number' || !data.playerPosition) {
        console.warn(`Save slot ${slot} is malformed. Clearing it.`);
        localStorage.removeItem(key);
        return null;
      }

      // Version migration
      if (data.version < SAVE_VERSION) {
        data.version = SAVE_VERSION;
      } else if (data.version > SAVE_VERSION) {
        console.warn(`Save slot ${slot} is from a newer version of the game. Ignoring it.`);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Unexpected error loading save data.', e);
      return null;
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
