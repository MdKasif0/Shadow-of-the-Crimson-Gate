export enum PlayerCombatState {
  IDLE = 'idle',
  WALK = 'walk',
  ATTACK_WINDUP = 'attack_windup',
  ATTACK_ACTIVE = 'attack_active',
  ATTACK_RECOVERY = 'attack_recovery',
  HURT = 'hurt',
  DASH = 'dash',
  PARRY = 'parry',
  DEAD = 'dead'
}

export enum CombatEvent {
  ATTACK_STARTED = 'attackStarted',
  ATTACK_ACTIVE = 'attackActive',
  ATTACK_FINISHED = 'attackFinished',
  HIT_CONFIRMED = 'hitConfirmed',
  DAMAGE_APPLIED = 'damageApplied',
  PLAYER_HURT = 'playerHurt',
  PLAYER_DEATH = 'playerDeath'
}
