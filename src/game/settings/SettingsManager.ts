import { SettingsData, DEFAULT_SETTINGS } from './SettingsData';
import { EventBus } from '../core/EventBus';

const SETTINGS_KEY = 'shadow-crimson-settings';

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: SettingsData;

  private constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public get(): SettingsData {
    return this.settings;
  }

  public update(newSettings: Partial<SettingsData>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.save();
    EventBus.emit('settingsChanged', this.settings);
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }

  private save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }
}
