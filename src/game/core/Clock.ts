export class Clock {
  private lastTime: number = 0;
  private deltaTime: number = 0;
  
  public start(): void {
    this.lastTime = performance.now();
  }

  public update(): number {
    const now = performance.now();
    // Convert to seconds
    this.deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Cap delta time to prevent massive jumps when tab is inactive
    return Math.min(this.deltaTime, 0.1);
  }

  public getDelta(): number {
    return this.deltaTime;
  }
}
