import { EventBus } from '../core/EventBus';
import { GameState } from './GameState';

export class GameStateManager {
  private static instance: GameStateManager;
  private currentState: GameState = GameState.MAIN_MENU;
  private previousState: GameState | null = null;

  private constructor() {}

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public getPreviousState(): GameState | null {
    return this.previousState;
  }

  public setState(newState: GameState): void {
    if (this.currentState === newState) return;

    this.previousState = this.currentState;
    this.currentState = newState;

    EventBus.emit('gameStateChanged', {
      previous: this.previousState,
      current: this.currentState
    });
  }
}
