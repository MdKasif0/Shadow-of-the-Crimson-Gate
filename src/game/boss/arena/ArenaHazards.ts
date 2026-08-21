export interface ArenaHazard {
  activate(): void;
  deactivate(): void;
  update(dt: number, time: number): void;
  reset(): void;
}
