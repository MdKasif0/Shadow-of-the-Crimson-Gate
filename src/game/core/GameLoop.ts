export class GameLoop {
  private isRunning: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  
  // Callbacks
  private updateCallback: (dt: number) => void;
  private renderCallback: () => void;

  constructor(updateCallback: (dt: number) => void, renderCallback: () => void) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.loop = this.loop.bind(this);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
  }

  private loop(now: number): void {
    if (!this.isRunning) return;
    
    // Calculate delta time in seconds
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Cap max delta time to prevent huge spikes when tab is backgrounded
    if (dt > 0.1) dt = 0.1;

    this.updateCallback(dt);
    this.renderCallback();

    this.animFrameId = requestAnimationFrame(this.loop);
  }
}
