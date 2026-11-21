import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyState } from './EnemyState';
import { EnemyOptions, EnemyTraits } from './EnemyTraits';
import { EnemyConfig } from './EnemyConfig';
import { HealthComponent } from '../combat/HealthComponent';
import { HitboxSystem } from '../combat/HitboxSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { AttackRole } from '../combat/AttackDirector';
import { applyRimLight, CharacterGlow } from '../utils/RimLight';
import { AttackShape } from '../vfx/AttackTelegraph';
import { EventBus } from '../core/EventBus';
import { GAME_CONFIG } from '../GameConfig';
import { AudioManager } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import {
  DirectorRole, LevelEnemyDef, LevelEnemyModel, LevelEnemyWorld, MoveDef, PoseInput,
} from './LevelEnemyTypes';

const UP = new THREE.Vector3(0, 1, 0);
const AMBUSH_RANGE = 5.5;
const LEASH_RADIUS = 30;
const DECISION_INTERVAL = 0.15;
const PHASE_ROAR_SECONDS = 1.3;
const MAX_MINIONS = 3;
const RANGED_KINDS = new Set(['shoot', 'hazard', 'summon']);

const noWorld: LevelEnemyWorld = {
  playerPosition: new THREE.Vector3(),
  isPlayerRooted: () => false,
  rootPlayer: () => {},
  hurtPlayer: () => {},
  footing: () => 1,
  groundHeight: () => 0,
  spawnHazard: () => {},
  callout: () => {},
  onPhase: () => {},
};

/**
 * LevelEnemy — Every yokai of the later levels, bosses included. What it does
 * comes from its LevelEnemyDef: the moves it knows, when it uses them, and how
 * its health splits into phases.
 */
export class LevelEnemy implements Enemy {
  /** The scene sets this, so enemies can reach the player and the level. */
  public static world: LevelEnemyWorld = noWorld;

  public readonly id: string;
  public readonly enemyType: string;
  public readonly def: LevelEnemyDef;
  public readonly config: EnemyConfig;
  public readonly root = new THREE.Group();
  public readonly health: HealthComponent;
  public readonly glow: CharacterGlow;
  public readonly traits: EnemyTraits;
  public state: EnemyState = EnemyState.IDLE;
  public phaseIndex = 0;

  private model: LevelEnemyModel;
  private velocity = new THREE.Vector3();
  private stateTimer = 0;
  private time = Math.random() * 10;
  private attackCooldown = 0.6 + Math.random() * 0.8;
  private moveCooldowns = new Map<string, number>();
  private move: MoveDef | null = null;
  private stage: 'windup' | 'active' | 'recovery' = 'windup';
  private repeatIndex = 0;
  private staggerSeconds = 0;
  private roarTimer = 0;
  private holdTimer = 0;
  private isHolding = false;
  private grabLanded = false;
  private isCountering = false;
  private isDeathVfxPlayed = false;
  private role: AttackRole = AttackRole.PRIMARY_MELEE;
  private home: THREE.Vector3 | null = null;
  private isLeashing = false;
  private decisionTimer = 0;
  private strafeDir = Math.random() > 0.5 ? 1 : -1;
  private strafeTimer = 0;
  private lastPosition = new THREE.Vector3();
  private groundSpeed = 0;
  private readonly baseScale: number;

  constructor(id: string, def: LevelEnemyDef, options: EnemyOptions = {}) {
    this.id = id;
    this.def = def;
    this.enemyType = def.type;
    const isElite = !def.isBoss && !!options.eliteName;
    this.config = def.isBoss ? { ...def.config } : EnemyTraits.adjustConfig(def.config, { eliteName: options.eliteName });
    this.traits = new EnemyTraits(def.name, this.config, def.isBoss ? { eliteName: def.name } : { eliteName: options.eliteName });
    this.traits.isHidden = !!def.ambush;
    // A boss's guard breaks under steady pressure, not a quarter of its life in blows
    if (def.isBoss) this.traits.posture.max = this.config.maxHealth * 0.2;

    this.model = def.model();
    this.baseScale = isElite ? 1.3 : 1;
    this.model.root.scale.multiplyScalar(this.baseScale);
    this.root.name = `${def.type}_${id}`;
    this.root.add(this.model.root);
    this.glow = applyRimLight(this.root, def.rimColor, def.rimIntensity, { uniqueMaterials: true });

    this.health = new HealthComponent(this.config.maxHealth);
    this.health.onDamage(() => this.onDamageTaken());
    this.health.onDeath(() => this.onDeath());
  }

  /** How the attack director should treat this enemy. */
  public get preferredRole(): DirectorRole {
    return this.def.role;
  }

  public get isBoss(): boolean {
    return !!this.def.isBoss;
  }

  private get world(): LevelEnemyWorld {
    return LevelEnemy.world;
  }

  private get phaseMoves(): MoveDef[] {
    const phase = this.def.phases?.[this.phaseIndex];
    return phase ? this.def.moves.filter(m => phase.moves.includes(m.id)) : this.def.moves;
  }

  private get phaseSpeed(): number {
    return this.def.phases?.[this.phaseIndex]?.speed ?? 1;
  }

  public get isStaggered(): boolean {
    return this.state === EnemyState.HURT && (this.staggerSeconds > 0 || this.traits.posture.isBroken) && !this.health.isDead;
  }

  public get attackWarning(): number {
    const move = this.move;
    if (this.state !== EnemyState.ATTACK || !move || this.stage !== 'windup' || this.isHolding) return 0;
    if (move.kind === 'hazard' || move.kind === 'summon' || move.kind === 'blink') return 0;
    return Math.min(1, this.stateTimer / this.windupFor(move));
  }

  public get attackShape(): AttackShape {
    const move = this.move;
    if (!move) return { range: this.config.attackRange, angle: Math.PI / 2 };
    switch (move.kind) {
      case 'slam': return { range: move.reach ?? 3, angle: Math.PI * 2 };
      case 'lunge':
      case 'grab': return { range: (move.reach ?? 1.5) + (move.lungeSpeed ?? 10) * move.active, angle: 0.55 };
      case 'shoot': return { range: Math.min(move.maxRange, 14), angle: (move.spread ?? 0) + 0.25 };
      default: return { range: move.reach ?? 2.5, angle: move.angle ?? Math.PI / 2 };
    }
  }

  public assignRole(role: AttackRole): void {
    this.role = role;
  }

  public setHomePosition(position: THREE.Vector3): void {
    this.home = position.clone();
  }

  public breakGuard(seconds: number): void {
    if (this.health.isDead) return;
    this.releaseHold();
    this.staggerSeconds = seconds;
    this.setState(EnemyState.HURT);
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number, staggerSeconds: number = 0): void {
    if (this.health.isDead || this.roarTimer > 0) return;

    // A master swordsman turns aside blows he sees coming, and answers at once
    const guardChance = this.def.guardChance ?? 0;
    const canGuard = this.state !== EnemyState.ATTACK && this.state !== EnemyState.HURT && !this.traits.posture.isBroken;
    if (guardChance > 0 && canGuard && staggerSeconds < 1 && Math.random() < guardChance) {
      amount = Math.max(1, Math.round(amount * 0.15));
      this.world.callout(this.root.position, 'DEFLECTED');
      AudioManager.play(AudioId.SWORD_CLASH, { position: this.root.position, volume: 0.6 });
      this.attackCooldown = 0;
      this.isCountering = true;
      this.health.takeDamage(amount, 'PLAYER');
      return;
    }

    this.staggerSeconds = staggerSeconds;
    const resistance = this.def.isBoss ? Math.max(this.config.knockbackResistance, 0.85) : this.config.knockbackResistance;
    this.velocity.copy(knockbackDir).setY(0).multiplyScalar(knockbackPower * (1 - resistance));
    this.health.takeDamage(amount, 'PLAYER');
  }

  /** Called when this enemy's grab catches the player. */
  public onGrabLanded(): void {
    if (this.move?.kind !== 'grab' || this.health.isDead) return;
    this.grabLanded = true;
  }

  private onDamageTaken(): void {
    if (this.health.isDead) return;
    this.checkPhase();
    if (this.roarTimer > 0) return;

    const armor = this.def.armor ?? 'none';
    const isHeavy = this.staggerSeconds >= 1;
    const flinches = armor === 'none'
      || (armor === 'attacking' && (this.state !== EnemyState.ATTACK || isHeavy))
      || (armor === 'full' && isHeavy && this.state !== EnemyState.ATTACK);
    if (!flinches) {
      this.staggerSeconds = 0;
      return;
    }
    this.releaseHold();
    this.setState(EnemyState.HURT);
  }

  private checkPhase(): void {
    const phases = this.def.phases;
    if (!phases) return;
    const fraction = this.health.currentHealth / this.health.maxHealth;
    let next = this.phaseIndex;
    while (next + 1 < phases.length && fraction <= phases[next + 1].at) next++;
    if (next === this.phaseIndex) return;

    this.phaseIndex = next;
    this.traits.isEnraged = true;
    this.releaseHold();
    this.move = null;
    this.roarTimer = PHASE_ROAR_SECONDS;
    this.staggerSeconds = 0;
    this.state = EnemyState.IDLE;
    this.stateTimer = 0;
    this.attackCooldown = 0.5;
    this.moveCooldowns.clear();
    const phase = phases[next];
    this.world.onPhase(this.def.name, phase.title ?? `${this.def.name} changes`, phase.text ?? 'Its attacks change. Watch for the warning.');
  }

  private onDeath(): void {
    this.releaseHold();
    this.setState(EnemyState.DEAD);
  }

  public reset(position: THREE.Vector3): void {
    this.root.position.copy(position);
    this.health.maxHealth = this.config.maxHealth;
    this.health.currentHealth = this.config.maxHealth;
    this.health.isDead = false;
    this.velocity.set(0, 0, 0);
    this.attackCooldown = 0.8;
    this.moveCooldowns.clear();
    this.move = null;
    this.phaseIndex = 0;
    this.roarTimer = 0;
    this.isDeathVfxPlayed = false;
    this.releaseHold();
    this.state = EnemyState.IDLE;
    this.stateTimer = 0;
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    this.traits.reset();
    this.traits.isHidden = !!this.def.ambush;
    this.root.visible = !this.traits.isHidden;
  }

  private setState(state: EnemyState): void {
    if (this.state === EnemyState.DEAD) return;
    this.state = state;
    this.stateTimer = 0;
    if (state !== EnemyState.ATTACK) this.move = null;
  }

  private releaseHold(): void {
    if (this.isHolding && this.world.isPlayerRooted()) this.world.rootPlayer(0);
    this.isHolding = false;
    this.grabLanded = false;
  }

  public update(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, collisionSystem: any, vfx?: any, projectileSystem?: ProjectileSystem, allEnemies?: Enemy[]): void {
    this.time += dt;
    this.stateTimer += dt;
    this.traits.posture.update(dt);
    this.glow.update(dt);
    this.attackCooldown -= dt;
    for (const [id, cooldown] of this.moveCooldowns) this.moveCooldowns.set(id, cooldown - dt);

    const position = this.root.position;
    this.groundSpeed = dt > 0 ? Math.min(12, Math.hypot(position.x - this.lastPosition.x, position.z - this.lastPosition.z) / dt) : 0;
    this.lastPosition.copy(position);

    if (this.traits.isHidden && !this.health.isDead) {
      if (!this.tryAmbush(playerPos)) {
        this.root.visible = false;
        return;
      }
    }

    if (this.state === EnemyState.DEAD) {
      this.updateDeath(dt, vfx, collisionSystem);
      return;
    }

    hitboxSystem.registerHurtbox({
      id: this.id,
      position: position.clone(),
      radius: this.config.hurtboxRadius,
      height: this.config.hurtboxHeight,
    });

    if (this.roarTimer > 0) {
      this.roarTimer -= dt;
      this.turnTowards(playerPos, dt, 3);
      this.animate(dt, 'roar');
      this.applyVelocity(dt, collisionSystem);
      return;
    }

    if (this.state === EnemyState.HURT) {
      if (this.stateTimer > this.config.hurtDuration + this.staggerSeconds) {
        this.staggerSeconds = 0;
        this.setState(EnemyState.IDLE);
      }
      this.animate(dt, 'hurt');
      this.applyVelocity(dt, collisionSystem);
      return;
    }

    if (this.state === EnemyState.ATTACK && this.move) {
      this.runMove(dt, playerPos, hitboxSystem, vfx, projectileSystem);
      this.applyVelocity(dt, collisionSystem);
      return;
    }

    this.separate(dt, allEnemies);
    this.decide(dt, playerPos);
    this.applyVelocity(dt, collisionSystem);
    this.animate(dt, this.groundSpeed > 0.4 ? 'move' : 'idle');
  }

  private animate(dt: number, action: PoseInput['action']): void {
    const move = this.move;
    let progress = 0;
    if (move && this.state === EnemyState.ATTACK) {
      const length = this.stage === 'windup' ? this.windupFor(move) : this.stage === 'active' ? move.active : move.recovery;
      progress = Math.min(1, this.stateTimer / Math.max(length, 0.001));
    } else if (action === 'hurt') {
      progress = Math.min(1, this.stateTimer / Math.max(this.config.hurtDuration + this.staggerSeconds, 0.001));
    } else if (action === 'roar') {
      progress = 1 - this.roarTimer / PHASE_ROAR_SECONDS;
    } else if (action === 'dead') {
      progress = Math.min(1, this.stateTimer / 1.2);
    }
    this.model.animate({
      dt,
      time: this.time,
      action,
      move: action === 'attack' || action === 'hold' ? move?.kind ?? null : null,
      stage: action === 'attack' ? this.stage : null,
      progress,
      speed: this.groundSpeed,
    });
  }

  // ─── Ambush ────────────────────────────────────────────────────────────

  private tryAmbush(playerPos: THREE.Vector3): boolean {
    if (this.root.position.distanceTo(playerPos) > AMBUSH_RANGE) return false;
    this.traits.isHidden = false;
    const away = playerPos.clone().sub(this.root.position).setY(0).normalize();
    const at = playerPos.clone().addScaledVector(away, 2);
    at.y = this.world.groundHeight(at.x, at.z);
    this.root.position.copy(at);
    this.lastPosition.copy(at);
    this.root.rotation.y = Math.atan2(playerPos.x - at.x, playerPos.z - at.z);
    this.root.visible = true;
    EventBus.emit('enemyAmbush', { position: at.clone() });
    const opener = this.phaseMoves.find(m => !RANGED_KINDS.has(m.kind));
    if (opener) this.startMove(opener);
    return true;
  }

  // ─── Choosing what to do ────────────────────────────────────────────────

  private decide(dt: number, playerPos: THREE.Vector3): void {
    const position = this.root.position;
    const config = this.config;

    if (this.home) {
      const fromHome = position.distanceTo(this.home);
      if (this.isLeashing && fromHome < LEASH_RADIUS * 0.35) this.isLeashing = false;
      else if (!this.isLeashing && fromHome > LEASH_RADIUS) this.isLeashing = true;
      if (this.isLeashing) {
        const toHome = this.home.clone().sub(position).setY(0).normalize();
        this.walk(toHome, config.movementSpeed * 1.3);
        this.face(Math.atan2(toHome.x, toHome.z), dt, 8);
        this.state = EnemyState.LEASH;
        return;
      }
    }

    const toPlayer = playerPos.clone().sub(position).setY(0);
    const distance = toPlayer.length();
    const direction = distance > 0.001 ? toPlayer.divideScalar(distance) : new THREE.Vector3(0, 0, 1);

    if (distance > config.detectionRange && !this.def.isBoss) {
      this.velocity.multiplyScalar(0.8);
      this.state = EnemyState.IDLE;
      return;
    }
    this.face(Math.atan2(direction.x, direction.z), dt, 7);

    // Pick a move, now and then, when one fits the distance
    this.decisionTimer -= dt;
    const isWaiting = this.role === AttackRole.WAITING;
    if (this.attackCooldown <= 0 && this.decisionTimer <= 0) {
      this.decisionTimer = DECISION_INTERVAL;
      const usable = this.phaseMoves.filter(m =>
        (this.moveCooldowns.get(m.id) ?? 0) <= 0
        && distance <= m.maxRange && distance >= (m.minRange ?? 0)
        && (!isWaiting || RANGED_KINDS.has(m.kind))
        && (m.kind !== 'summon' || this.traits.minionCount < MAX_MINIONS));
      const eager = this.isCountering || this.def.isBoss || Math.random() < config.aggression;
      if (usable.length > 0 && eager) {
        this.startMove(this.pick(usable));
        return;
      }
    }

    // Otherwise keep to a comfortable distance and circle
    const preferred = isWaiting ? Math.max(config.preferredDistance, 5.5) : config.preferredDistance;
    const wantsToClose = this.attackCooldown <= 0 && !isWaiting;
    const speed = config.movementSpeed * this.phaseSpeed;
    if (distance > preferred + 0.8 || (wantsToClose && distance > preferred * 0.6 + 1.2)) {
      this.walk(direction, speed);
      this.state = EnemyState.WALK;
    } else if (distance < preferred * 0.65) {
      this.walk(direction.clone().negate(), speed * 0.8);
      this.state = EnemyState.RETREAT;
    } else {
      this.strafeTimer += dt;
      if (this.strafeTimer > 1.6 + Math.random()) {
        this.strafeTimer = 0;
        this.strafeDir *= -1;
      }
      const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(this.strafeDir);
      this.walk(side, speed * 0.6);
      this.state = EnemyState.STRAFE;
    }
  }

  private pick(moves: MoveDef[]): MoveDef {
    if (this.isCountering) {
      const melee = moves.find(m => m.kind === 'swipe' || m.kind === 'lunge');
      if (melee) return melee;
    }
    const total = moves.reduce((sum, m) => sum + (m.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const move of moves) {
      roll -= move.weight ?? 1;
      if (roll <= 0) return move;
    }
    return moves[moves.length - 1];
  }

  private walk(direction: THREE.Vector3, speed: number): void {
    const footing = this.def.ignoresFooting ? 1 : this.world.footing(this.root.position.x, this.root.position.z);
    this.velocity.copy(direction).multiplyScalar(speed * footing);
  }

  private face(angle: number, dt: number, rate: number): void {
    let current = this.root.rotation.y;
    let diff = angle - current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    current += diff * Math.min(1, dt * rate);
    this.root.rotation.y = current;
  }

  private turnTowards(target: THREE.Vector3, dt: number, rate: number): void {
    this.face(Math.atan2(target.x - this.root.position.x, target.z - this.root.position.z), dt, rate);
  }

  private get forward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, this.root.rotation.y);
  }

  // ─── Moves ──────────────────────────────────────────────────────────────

  private windupFor(move: MoveDef): number {
    // Later blows in a combo come quicker
    return this.repeatIndex > 0 ? move.windup * 0.55 : move.windup;
  }

  private startMove(move: MoveDef): void {
    this.isCountering = false;
    this.move = move;
    this.stage = 'windup';
    this.repeatIndex = 0;
    this.grabLanded = false;
    this.state = EnemyState.ATTACK;
    this.stateTimer = 0;
    this.velocity.set(0, 0, 0);
    this.moveCooldowns.set(move.id, move.cooldown);
    if (move.callout) this.world.callout(this.root.position, move.callout);
    if (!RANGED_KINDS.has(move.kind)) {
      AudioManager.play(AudioId.YOKAI_ATTACK, { position: this.root.position, pitchMin: this.def.isBoss ? 0.6 : 0.9, pitchMax: this.def.isBoss ? 0.75 : 1.15, volume: 0.8 });
    }
  }

  private runMove(dt: number, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, vfx: any, projectiles?: ProjectileSystem): void {
    const move = this.move!;

    if (this.isHolding) {
      this.updateHold(dt, move);
      this.animate(dt, 'hold');
      return;
    }

    if (this.stage === 'windup') {
      // Tracks the player while winding up, then commits
      this.turnTowards(playerPos, dt, move.kind === 'lunge' || move.kind === 'grab' ? 9 : 6);
      this.velocity.multiplyScalar(0.8);
      if (this.stateTimer >= this.windupFor(move)) {
        this.stage = 'active';
        this.stateTimer = 0;
        this.beginActive(move, playerPos, hitboxSystem, vfx, projectiles);
      }
    } else if (this.stage === 'active') {
      this.whileActive(move, hitboxSystem);
      if (this.grabLanded) {
        this.isHolding = true;
        this.holdTimer = move.grabSeconds ?? 1.6;
        this.world.rootPlayer(this.holdTimer);
        this.velocity.set(0, 0, 0);
        this.world.callout(playerPos, 'GRABBED · PRESS DASH');
      } else if (this.stateTimer >= move.active) {
        this.stage = 'recovery';
        this.stateTimer = 0;
      }
    } else if (this.stateTimer >= move.recovery) {
      this.velocity.set(0, 0, 0);
      if (this.repeatIndex + 1 < (move.repeat ?? 1)) {
        this.repeatIndex++;
        this.stage = 'windup';
        this.stateTimer = 0;
      } else {
        this.finishMove();
      }
    } else {
      this.velocity.multiplyScalar(0.85);
    }
    this.animate(dt, 'attack');
  }

  private finishMove(): void {
    const { attackCooldownMin, attackCooldownMax } = this.config;
    this.attackCooldown = (attackCooldownMin + Math.random() * (attackCooldownMax - attackCooldownMin)) / this.phaseSpeed;
    this.setState(EnemyState.IDLE);
  }

  private beginActive(move: MoveDef, playerPos: THREE.Vector3, hitboxSystem: HitboxSystem, vfx: any, projectiles?: ProjectileSystem): void {
    const position = this.root.position;
    hitboxSystem.resetAttackMemory(this.id);

    switch (move.kind) {
      case 'slam':
        EventBus.emit('eliteSlam', { position: position.clone() });
        break;
      case 'shoot': {
        if (!projectiles) break;
        const count = move.count ?? 1;
        const spread = move.spread ?? 0;
        const aim = Math.atan2(playerPos.x - position.x, playerPos.z - position.z);
        const start = position.clone().setY(position.y + 1.3).addScaledVector(this.forward, 0.8);
        for (let i = 0; i < count; i++) {
          const angle = aim + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
          const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
          projectiles.spawnProjectile(this.id, start, direction, move.speed ?? 12, move.damage, move.knockback ?? 8, 3.5, move.projectile ?? 'DEFAULT');
        }
        AudioManager.play(AudioId.TENGU_ATTACK, { position, volume: 0.7, pitchMin: 0.8, pitchMax: 1.1 });
        break;
      }
      case 'hazard': {
        const count = move.hazardCount ?? 1;
        const radius = move.hazardRadius ?? 2.5;
        for (let i = 0; i < count; i++) {
          let at: THREE.Vector3;
          if (move.aroundSelf) {
            const angle = (i / count) * Math.PI * 2 + this.time;
            const distance = count === 1 ? 0 : 2.5 + (i % 2) * 2.5;
            at = position.clone().add(new THREE.Vector3(Math.sin(angle) * distance, 0, Math.cos(angle) * distance));
          } else {
            const spread = i === 0 ? 0 : 3.2;
            at = playerPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread * 2, 0, (Math.random() - 0.5) * spread * 2));
          }
          this.world.spawnHazard(move.hazard ?? 'burst', at.setY(this.world.groundHeight(at.x, at.z)), radius, move.damage);
        }
        break;
      }
      case 'summon': {
        const count = move.summonCount ?? 1;
        for (let i = 0; i < count && this.traits.minionCount < MAX_MINIONS; i++) {
          const angle = this.root.rotation.y + (i % 2 === 0 ? 1 : -1) * (1.2 + i * 0.4);
          const at = position.clone().add(new THREE.Vector3(Math.sin(angle) * 2.6, 0, Math.cos(angle) * 2.6));
          this.traits.minionCount++;
          this.traits.onSummon?.(move.summon ?? 'MINION', at);
        }
        break;
      }
      case 'blink': {
        vfx?.spawnDeath?.(position.clone());
        const behind = playerPos.clone().sub(position).setY(0).normalize();
        const at = playerPos.clone().addScaledVector(behind, 1.9);
        at.y = this.world.groundHeight(at.x, at.z);
        position.copy(at);
        this.lastPosition.copy(at);
        this.root.rotation.y = Math.atan2(playerPos.x - at.x, playerPos.z - at.z);
        vfx?.spawnHurt?.(at.clone());
        AudioManager.play(AudioId.SHADOW_TELEPORT, { position: at, volume: 0.8 });
        break;
      }
    }
  }

  private whileActive(move: MoveDef, hitboxSystem: HitboxSystem): void {
    const position = this.root.position;
    const forward = this.forward;
    const blow = (type: 'ARC' | 'RADIAL', range: number, angle: number) => hitboxSystem.addActiveHitbox({
      ownerId: this.id,
      damage: move.damage,
      position: position.clone(),
      direction: forward,
      range,
      hitAngle: angle,
      knockback: move.kind === 'grab' ? 1 : move.knockback ?? 12,
      hitboxType: type,
      grab: move.kind === 'grab' ? (move.grabSeconds ?? 1.6) : undefined,
      unblockable: move.unblockable,
    });

    switch (move.kind) {
      case 'swipe':
      case 'blink':
        blow('ARC', move.reach ?? 2.4, move.angle ?? Math.PI / 2);
        this.velocity.copy(forward).multiplyScalar(move.lungeSpeed ?? 3);
        break;
      case 'slam':
        blow('RADIAL', move.reach ?? 3, Math.PI * 2);
        this.velocity.set(0, 0, 0);
        break;
      case 'lunge':
      case 'grab':
        blow('ARC', move.reach ?? 1.4, move.angle ?? 1.3);
        this.velocity.copy(forward).multiplyScalar(move.lungeSpeed ?? 10);
        break;
      default:
        this.velocity.set(0, 0, 0);
    }
  }

  /** Holding the player. They either struggle free, or get thrown. */
  private updateHold(dt: number, move: MoveDef): void {
    this.holdTimer -= dt;
    this.velocity.set(0, 0, 0);
    if (!this.world.isPlayerRooted()) {
      // Broke free: the grip leaves this one open
      this.isHolding = false;
      this.grabLanded = false;
      this.traits.posture.add(this.traits.posture.max * 0.4);
      this.staggerSeconds = 1.1;
      this.setState(EnemyState.HURT);
      this.world.callout(this.root.position, 'BROKE FREE');
      return;
    }
    if (this.holdTimer <= 0) {
      this.isHolding = false;
      this.grabLanded = false;
      this.world.rootPlayer(0);
      this.world.hurtPlayer(move.throwDamage ?? move.damage, this.forward, 18);
      this.stage = 'recovery';
      this.stateTimer = 0;
    }
  }

  // ─── Movement ───────────────────────────────────────────────────────────

  private separate(dt: number, allEnemies?: Enemy[]): void {
    if (!allEnemies) return;
    for (const other of allEnemies) {
      if (other === this || other.health.isDead || !other.root.visible) continue;
      const push = this.root.position.clone().sub(other.root.position).setY(0);
      const distance = push.length();
      if (distance > 0.001 && distance < this.config.collisionRadius * 2.5) {
        this.velocity.addScaledVector(push.divideScalar(distance), 20 * dt);
      }
    }
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    const isLoose = this.state === EnemyState.HURT || this.state === EnemyState.DEAD || this.roarTimer > 0;
    const isDriven = this.state === EnemyState.ATTACK && this.stage === 'active';
    if (!isDriven) this.velocity.lerp(new THREE.Vector3(), Math.min(1, dt * (isLoose ? 5 : 10)));

    const position = this.root.position;
    if (this.velocity.lengthSq() > 0.01) {
      const move = collisionSystem.resolveMovement(position, this.velocity.clone().multiplyScalar(dt), this.config.collisionRadius);
      position.add(move);
      const bounds = GAME_CONFIG.WORLD.BOUNDS;
      position.x = THREE.MathUtils.clamp(position.x, bounds.MIN_X, bounds.MAX_X);
      position.z = THREE.MathUtils.clamp(position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
    const ground = this.world.groundHeight(position.x, position.z);
    position.y += (ground - position.y) * Math.min(1, dt * 12);
  }

  private updateDeath(dt: number, vfx: any, collisionSystem: any): void {
    if (this.def.yields) {
      // She lowers her sword and stays, until the talking is done
      this.animate(dt, 'idle');
      if (this.stateTimer > 6) this.root.visible = false;
      this.applyVelocity(dt, collisionSystem);
      return;
    }
    if (!this.isDeathVfxPlayed && vfx) {
      vfx.spawnDeath(this.root.position);
      this.isDeathVfxPlayed = true;
    }
    this.animate(dt, 'dead');
    // A haunted yokai burns away instead, and the haunting hides it when it's gone
    if (this.root.userData.haunted) {
      this.applyVelocity(dt, collisionSystem);
      return;
    }
    const linger = this.def.isBoss ? 2.4 : 1;
    const shrinkTime = this.def.isBoss ? 1.6 : 0.5;
    if (this.stateTimer > linger) {
      const scale = 1 - (this.stateTimer - linger) / shrinkTime;
      if (scale > 0) this.root.scale.setScalar(scale);
      else this.root.visible = false;
    }
    this.applyVelocity(dt, collisionSystem);
  }
}
