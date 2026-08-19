// ─── Event Bus ───────────────────────────────────────────────────────────────
// Simple pub/sub for game-wide events without tight coupling.

type Callback = (...args: any[]) => void;

export class EventBus {
  private listeners: Map<string, Callback[]> = new Map();

  public on(event: string, callback: Callback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Callback): void {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  public emit(event: string, ...args: any[]): void {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(...args));
  }

  public clear(): void { this.listeners.clear(); }
}

// Singleton game event bus
export const gameEvents = new EventBus();
