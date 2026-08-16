export interface PlayerStateData {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  souls: number;
  upgrades: string[];
}

export interface RunStateData {
  currentArea: string;
  currentWave: number;
  totalWaves: number;
}

export interface BossStateData {
  active: boolean;
  health: number;
  phase: number;
}

export interface SettingsStateData {
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
}

export class GameState {
  private static instance: GameState;

  public player: PlayerStateData;
  public run: RunStateData;
  public boss: BossStateData;
  public settings: SettingsStateData;

  private constructor() {
    this.player = {
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      souls: 0,
      upgrades: []
    };

    this.run = {
      currentArea: 'temple',
      currentWave: 1,
      totalWaves: 5
    };

    this.boss = {
      active: false,
      health: 1000,
      phase: 1
    };

    this.settings = {
      musicVolume: 1,
      sfxVolume: 1,
      reducedMotion: false
    };
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }
}
