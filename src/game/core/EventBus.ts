// A simple global event bus for decoupling game logic from UI

type EventHandler = (data?: any) => void;

export class EventBus {
  private static handlers: Map<string, EventHandler[]> = new Map();

  public static on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  public static off(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) return;
    const handlers = this.handlers.get(event)!;
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  public static emit(event: string, data?: any): void {
    if (!this.handlers.has(event)) return;
    for (const handler of this.handlers.get(event)!) {
      handler(data);
    }
  }

  public static clear(): void {
    this.handlers.clear();
  }
}
