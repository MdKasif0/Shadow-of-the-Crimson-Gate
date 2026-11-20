import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimator, AnimState } from './CharacterAnimator';
import { CharacterFactory, RoninModel } from './CharacterFactory';
import { PlayerState, CombatPhase, MovementState } from '../combat/PlayerState';
import { CombatSystem } from '../combat/CombatSystem';
import { Katana } from '../combat/Katana';
import { AudioManager } from '../audio/AudioManager';
import { InputManager } from '../core/InputManager';
import { ATTACK_DATA } from '../combat/AttackData';
import { HealthComponent, HealthEventPayload } from '../combat/HealthComponent';
import { DashSystem } from '../combat/DashSystem';
import { GAME_CONFIG } from '../GameConfig';
import { applyRimLight, CharacterGlow } from '../utils/RimLight';
import { EventBus } from '../core/EventBus';
import { BuildModifiers, PlayerBuild, TechniqueId } from '../progression/PlayerBuild';

/** How far away an enemy can be and still pull the player's swing towards it. */
const AIM_ASSIST_RANGE = 6.5;
/** Half-width of the cone in front of the camera that counts as aiming at an enemy. */
const AIM_ASSIST_CONE = 1.05;
/** Enemies this close get swung at wherever the camera is pointing. */
const AIM_ASSIST_POINT_BLANK = 2.6;
const LOCK_AIM_RANGE = 12;

export const MAX_FOCUS = 100;
const PERFECT_DODGE_FOCUS = 30;
const PARRY_FOCUS = 20;
/** How long after a parry or perfect dodge the next swing counts as a counter. */
const COUNTER_WINDOW = 1.3;
/** A Dash Strike can still start this long after a dash ends. */
const DASH_STRIKE_GRACE = 0.16;
const BLOCK_SPEED = 1.8;
const PERFECT_DODGE_COOLDOWN = 0.6;
const FINISHER_INVULNERABILITY = 0.95;
/** How long the sword stays out after the last swing. */
const SWORD_DRAWN_SECONDS = 3;

export class Ronin {
  public root: THREE.Group;
  private rig: CharacterRig;
  private model: RoninModel;
  private swordDrawnTimer: number = 0;
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private animator: CharacterAnimator;

  private targetRotation: number = 0;
  private currentRotation: number = 0;

  public state: PlayerState;
  public combat: CombatSystem;
  public health: HealthComponent;
  public dashSystem: DashSystem;
  private katana: Katana;
  
  public isControlsEnabled: boolean = true;
  public damageMultiplier: number = 1;
  /** Positions of living enemies, used to turn swings towards the nearest one. */
  public aimTargets: THREE.Vector3[] = [];
  /** When locked on, the player keeps facing this while moving. */
  public lockTarget: THREE.Vector3 | null = null;
  public focus: number = 0;
  public glow: CharacterGlow;

  /** Skill and charm effects, set by the scene whenever the build changes. */
  public modifiers: BuildModifiers = new PlayerBuild().modifiers;
  public techniques = new Set<TechniqueId>();
  /** A guard-broken enemy close enough to execute, set by the scene each frame. */
  public executionTarget: THREE.Vector3 | null = null;
  public isBlocking: boolean = false;
  /** Set by the level each frame: 1 on solid ground, lower in water or webs. */
  public footing: number = 1;
  /** Held fast by a grab. Dash presses struggle free sooner. */
  public rootedTimer: number = 0;
  /** A shove from outside, such as a gust of wind, in units per second. */
  public externalPush = new THREE.Vector3();
  /** Floor height under a point, for levels with decks and ramps. */
  public groundHeight: ((x: number, z: number) => number) | null = null;
  /** What's underfoot, for footstep sounds. Unset, the courtyard's own rule applies. */
  public surfaceAt: ((x: number, z: number) => 'stone' | 'grass' | 'water' | 'wood') | null = null;
  private isAbsorbingBlow: boolean = false;
  private parryTimer: number = 0;
  private counterTimer: number = 0;
  private isCounterAttack: boolean = false;
  private sinceDash: number = 99;
  private dodgeWindowTimer: number = 0;
  private perfectDodgeCooldown: number = 0;

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private hurtTimer: number = 0;
  private footstepDistance: number = 0;

  constructor() {
    this.state = new PlayerState();
    this.combat = new CombatSystem(this.state);
    this.dashSystem = new DashSystem(this.state);

    this.health = new HealthComponent(100);
    this.health.onDamage(this.onDamageTaken.bind(this));
    this.health.onDeath(this.onDeath.bind(this));

    // 1. Generate procedural rig and mesh
    this.model = CharacterFactory.createRonin();
    this.rig = this.model.rig;

    // Attach Weapon
    this.katana = new Katana();
    this.katana.attachTo(this.rig.weaponSlot);
    this.setSwordDrawn(false);

    this.combat.events.addListener({
      onAttackStarted: () => {
        // The first swing after a parry or perfect dodge is a counter
        this.isCounterAttack = this.counterTimer > 0;
        this.counterTimer = 0;
      }
    });

    // 2. Setup Animation
    this.animator = new CharacterAnimator(this.rig);
    
    // 3. Encapsulate
    this.root = new THREE.Group();
    this.root.name = 'PlayerRonin';
    this.root.add(this.rig.root);
    this.glow = applyRimLight(this.root, 0x9fc4ff, 0.26);
  }

  /** The sword stays in its scabbard until a fight calls for it. */
  private setSwordDrawn(isDrawn: boolean): void {
    this.katana.mesh.visible = isDrawn;
    this.model.sheathedHilt.visible = !isDrawn;
  }

  private updateAppearance(dt: number): void {
    if (this.state.combatPhase !== CombatPhase.NONE) this.swordDrawnTimer = SWORD_DRAWN_SECONDS;
    else this.swordDrawnTimer = Math.max(0, this.swordDrawnTimer - dt);
    this.setSwordDrawn(this.swordDrawnTimer > 0);

    const speed = dt > 0 ? this.root.position.distanceTo(this.lastPosition) / dt : 0;
    this.lastPosition.copy(this.root.position);
    const movement = Math.min(speed, 16);
    this.model.cape.update(dt, movement);

    // The ponytail trails behind, with a little sway of its own
    const time = performance.now() * 0.001;
    this.model.ponytail.rotation.x = -Math.min(movement * 0.035, 0.45) + Math.sin(time * 1.6) * 0.03;
    this.model.ponytail.rotation.z = Math.sin(time * 1.1) * 0.03;
  }

  public takeDamage(amount: number, knockbackDir: THREE.Vector3, knockbackPower: number): void {
    if (this.health.isDead || this.state.isInvulnerable()) return;
    this.velocity.copy(knockbackDir).multiplyScalar(knockbackPower);
    this.health.takeDamage(amount, 'ENEMY');
  }

  /** Fire, falls and the like: hurts, but doesn't knock the Ronin about. */
  public takeHazardDamage(amount: number): void {
    if (this.health.isDead || amount <= 0) return;
    const before = this.health.currentHealth;
    this.isAbsorbingBlow = true;
    this.health.takeDamage(amount, 'HAZARD');
    this.isAbsorbingBlow = false;
    EventBus.emit('playerHealth', { current: this.health.currentHealth, max: this.health.maxHealth, delta: this.health.currentHealth - before });
  }

  /** A blocked blow: some damage gets through, but the guard holds. */
  public takeBlockedDamage(amount: number): void {
    if (this.health.isDead || this.state.isInvulnerable()) return;
    this.isAbsorbingBlow = true;
    this.health.takeDamage(amount, 'ENEMY');
    this.isAbsorbingBlow = false;
  }

  private onDamageTaken(event: HealthEventPayload): void {
    if (this.health.isDead) return;
    if (this.isAbsorbingBlow) return;
    this.state.movement = MovementState.HURT;
    this.state.combatPhase = CombatPhase.NONE; // Interrupt attacks
    this.state.currentAttackId = null;
    this.hurtTimer = 0;
    this.state.invulnerabilityTimer = 0.5; // 0.5 seconds i-frames
  }

  private onDeath(event: HealthEventPayload): void {
    this.state.movement = MovementState.DEAD;
    this.state.combatPhase = CombatPhase.NONE;
  }

  public get isRooted(): boolean {
    return this.rootedTimer > 0 && !this.health.isDead;
  }

  /** Held in place for a moment, unable to move or swing. */
  public grab(seconds: number): void {
    if (this.health.isDead) return;
    this.rootedTimer = Math.max(this.rootedTimer, seconds);
    this.isBlocking = false;
    this.state.combatPhase = CombatPhase.NONE;
    this.state.currentAttackId = null;
    this.dashSystem.isDashing = false;
    if (this.state.movement === MovementState.DASH) this.state.movement = MovementState.IDLE;
  }

  public reset(position: THREE.Vector3): void {
    this.setPosition(position.x, position.y, position.z);
    this.rootedTimer = 0;
    this.footing = 1;
    this.externalPush.set(0, 0, 0);
    this.health['currentHealth'] = this.health['maxHealth'];
    this.health.isDead = false;
    this.state.movement = MovementState.IDLE;
    this.state.combatPhase = CombatPhase.NONE;
    this.state.currentAttackId = null;
    this.state.invulnerabilityTimer = 0;
    this.velocity.set(0, 0, 0);
    this.targetRotation = Math.PI;
    this.currentRotation = Math.PI;
    this.root.rotation.set(0, Math.PI, 0);
    this.combat['attackTimer'] = 0;
    this.combat['inputBuffer'] = false;
    this.combat['comboWindowActive'] = false;
    this.dashSystem.isDashing = false;
    this.dashSystem['cooldownTimer'] = 0;
    this.lockTarget = null;
    this.dodgeWindowTimer = 0;
    this.parryTimer = 0;
    this.counterTimer = 0;
    this.isBlocking = false;
    this.executionTarget = null;
    this.setFocus(0);
  }

  public heal(amount: number): void {
    const before = this.health.currentHealth;
    this.health.heal(amount);
    if (this.health.currentHealth !== before) {
      EventBus.emit('playerHealth', { current: this.health.currentHealth, max: this.health.maxHealth, delta: this.health.currentHealth - before });
    }
  }

  public addFocus(amount: number): void {
    this.setFocus(this.focus + amount * this.modifiers.focusGain);
  }

  /** Applies the current skills and charms. */
  public applyBuild(modifiers: BuildModifiers, techniques: Set<TechniqueId>): void {
    this.modifiers = modifiers;
    this.techniques = techniques;
    this.combat.hasFourthCut = modifiers.hasFourthCut;
  }

  /**
   * Called when a blow is about to land. Blocking turns aside anything from the
   * front; raising the guard at the last moment parries it outright.
   */
  public tryGuard(attackDirection: THREE.Vector3): 'parry' | 'block' | null {
    if (!this.isBlocking || this.health.isDead) return null;
    const facing = new THREE.Vector3(Math.sin(this.currentRotation), 0, Math.cos(this.currentRotation));
    const isFromFront = facing.dot(attackDirection.clone().setY(0).normalize()) < -0.2;
    if (!isFromFront) return null;

    if (this.parryTimer > 0) {
      this.parryTimer = 0;
      this.counterTimer = COUNTER_WINDOW;
      this.addFocus(PARRY_FOCUS);
      this.glow.flash(0.5);
      return 'parry';
    }
    return 'block';
  }

  private setFocus(value: number): void {
    const next = THREE.MathUtils.clamp(value, 0, MAX_FOCUS);
    if (next === this.focus && value !== 0) return;
    this.focus = next;
    EventBus.emit('focusChanged', { value: next, max: MAX_FOCUS });
  }

  /**
   * Called when an attack would land. If the player has just dashed, the hit
   * misses and they're rewarded. Returns true if the hit should be ignored.
   */
  public tryPerfectDodge(): boolean {
    if (this.dodgeWindowTimer <= 0) return false;

    if (this.perfectDodgeCooldown <= 0) {
      this.perfectDodgeCooldown = PERFECT_DODGE_COOLDOWN;
      this.addFocus(PERFECT_DODGE_FOCUS);
      this.counterTimer = COUNTER_WINDOW;
      EventBus.emit('perfectDodge', { position: this.root.position.clone() });
    }
    return true;
  }

  public update(dt: number, inputManager: InputManager, collisionSystem: any, hitboxSystem?: any, vfx?: any): void {
    // I-Frames timer
    if (this.state.invulnerabilityTimer > 0) {
      this.state.invulnerabilityTimer -= dt;
    }
    if (this.dodgeWindowTimer > 0) this.dodgeWindowTimer -= dt;
    if (this.perfectDodgeCooldown > 0) this.perfectDodgeCooldown -= dt;
    if (this.parryTimer > 0) this.parryTimer -= dt;
    if (this.counterTimer > 0) this.counterTimer -= dt;
    if (this.rootedTimer > 0) {
      this.rootedTimer -= dt;
      // Every dash press is a pull against the grip
      if (this.isControlsEnabled && inputManager.isActionJustPressed('dash')) {
        this.rootedTimer -= 0.3;
        this.glow.flash(0.3);
        if (this.rootedTimer <= 0) EventBus.emit('grabEscaped', { position: this.root.position.clone() });
      }
    }
    this.sinceDash = this.dashSystem.isDashing ? 0 : this.sinceDash + dt;
    this.glow.update(dt);

    if (this.state.movement === MovementState.DEAD) {
      // Just collapse and slide
      this.applyVelocity(dt, collisionSystem);
      // Wait, need an animator for dead? We don't have one in CharacterAnimator yet.
      // For now, let's just rotate root to simulate falling or do nothing.
      this.root.rotation.x = THREE.MathUtils.lerp(this.root.rotation.x, -1.5, dt * 5);
      return;
    }

    // Register hurtbox for this frame
    if (hitboxSystem) {
      hitboxSystem.registerHurtbox({
        id: 'PLAYER',
        position: this.root.position.clone(),
        radius: 0.5,
        height: 1.8
      });
    }

    // Process combat inputs
    if (this.isControlsEnabled && !this.isRooted) {
      const canAct = this.state.movement !== MovementState.HURT;
      const modifiers = this.modifiers;

      // Raising the guard opens a brief parry window; holding it blocks
      const wantsBlock = inputManager.isAction('block') && canAct
        && this.state.movement !== MovementState.DASH && !this.state.isAttacking();
      if (wantsBlock && !this.isBlocking) this.parryTimer = modifiers.parryWindow;
      this.isBlocking = wantsBlock;

      const isMoving = inputManager.getMovementDirection().lengthSq() > 0;
      const canDashStrike = this.techniques.has('dashStrike') && this.sinceDash < DASH_STRIKE_GRACE;

      const isExecuting = this.state.currentAttackId === 'ATTACK_EXECUTE';
      if (isExecuting) {
        // Nothing interrupts an execution once it starts
      } else if (inputManager.isActionJustPressed('finisher') && canAct && this.executionTarget) {
        this.isBlocking = false;
        this.targetRotation = Math.atan2(this.executionTarget.x - this.root.position.x, this.executionTarget.z - this.root.position.z);
        this.combat.startSpecial('ATTACK_EXECUTE');
        this.state.invulnerabilityTimer = 1.0;
        EventBus.emit('executionStarted', {});
      } else if (inputManager.isActionJustPressed('finisher') && canAct && this.focus >= MAX_FOCUS) {
        this.setFocus(0);
        this.aimAttack(inputManager);
        this.combat.startSpecial('ATTACK_FINISHER');
        this.state.invulnerabilityTimer = FINISHER_INVULNERABILITY;
        if (modifiers.finisherHeal > 0) this.heal(modifiers.finisherHeal);
        EventBus.emit('finisherStarted', {});
      } else if (inputManager.isActionJustPressed('spiritWave') && canAct && this.techniques.has('spiritWave')) {
        if (this.focus >= modifiers.waveCost) {
          this.setFocus(this.focus - modifiers.waveCost);
          this.aimAttack(inputManager);
          this.combat.startSpecial('ATTACK_WAVE');
        } else {
          EventBus.emit('damageNumber', { position: this.root.position.clone(), text: 'NOT ENOUGH FOCUS', kind: 'label' });
        }
      } else if (inputManager.isHeavyPressed() && canAct) {
        this.aimAttack(inputManager);
        const canWhirl = this.techniques.has('crimsonWhirl') && inputManager.isRunPressed() && isMoving && !this.state.isAttacking();
        if (canWhirl) this.combat.startSpecial('ATTACK_WHIRL');
        else this.combat.registerHeavyInput();
      } else if (inputManager.isAttackPressed() && canAct) {
        this.aimAttack(inputManager);
        if (canDashStrike && !this.state.isAttacking()) {
          // Turns the dash straight into a cut
          this.dashSystem.isDashing = false;
          this.state.movement = MovementState.IDLE;
          this.combat.startSpecial('ATTACK_DASH');
        } else {
          this.combat.registerAttackInput();
        }
      }

      // Process Dash
      if (inputManager.isAction('dash') && !this.isBlocking) {
        const inputMoveDir = inputManager.getMovementDirection();
        if (this.dashSystem.tryDash(inputMoveDir, this.currentRotation)) {
          this.dodgeWindowTimer = modifiers.dodgeWindow;
          this.state.invulnerabilityTimer = Math.max(this.state.invulnerabilityTimer, modifiers.dodgeWindow);
        }
      }
    } else {
      this.isBlocking = false;
    }
    this.animator.isGuarding = this.isBlocking;

    // Update combat state machine
    this.combat.update(dt);

    // Fetch movement dir
    const canSteer = this.isControlsEnabled && !this.isRooted;
    const inputMoveDir = canSteer ? inputManager.getMovementDirection() : new THREE.Vector3();
    const isAttacking = this.state.isAttacking();
    
    let intendedMove = new THREE.Vector3();
    const isRunning = canSteer && inputManager.isRunPressed();
    const speed = (this.isBlocking ? BLOCK_SPEED : isRunning ? 8 : 4) * this.footing;

    // Priority: HURT > DASH > ATTACK > MOVEMENT
    if (this.state.movement === MovementState.HURT) {
      this.hurtTimer += dt;
      if (this.hurtTimer > 0.4) {
        this.state.movement = MovementState.IDLE;
      }
      this.playIdle();
    } else if (this.state.movement === MovementState.DASH) {
      const dashMove = this.dashSystem.update(dt);
      if (dashMove) intendedMove.copy(dashMove);
      // Also instantly snap rotation to dash dir
      this.targetRotation = Math.atan2(this.dashSystem.dashDirection.x, this.dashSystem.dashDirection.z);
      this.animator.setState(AnimState.DASH);
      if (vfx && Math.random() > 0.5) vfx.spawnDash(this.root.position, this.targetRotation);
    } else if (isAttacking) {
      // During an attack, standard movement is ignored.
      // But we can apply an attack lunge during the ACTIVE phase
      if (this.state.combatPhase === CombatPhase.ACTIVE && this.state.currentAttackId) {
        const attackDef = ATTACK_DATA[this.state.currentAttackId];
        if (attackDef) {
          // Lunge forward relative to current rotation
          const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentRotation);
          intendedMove = forward.multiplyScalar(attackDef.lungeSpeed * dt);

          if (hitboxSystem) {
            // Reset memory on the very first frame of ACTIVE
            // (CombatSystem zeroes the timer on that frame; by the next one it equals dt)
            if (this.combat['attackTimer'] === 0) {
               hitboxSystem.resetAttackMemory('PLAYER');
               
               // Spawn Slash VFX exactly once per attack
               if (vfx) {
                 vfx.spawnSlash(this.root.position, forward, attackDef.slashType);
               }
               // Waves and executions land through the scene, not the blade
               if (attackDef.noHitbox) {
                 EventBus.emit('playerStrike', { attackId: attackDef.id, position: this.root.position.clone(), direction: forward.clone() });
               }
            }

            const isHealthy = this.health.currentHealth > this.health.maxHealth * 0.8;
            const damage = attackDef.damage * this.damageMultiplier
              * (isHealthy ? this.modifiers.healthyDamage : 1)
              * (this.isCounterAttack ? this.modifiers.counterDamage : 1);
            const rangeScale = (attackDef.rangeScale ?? 1) * (attackDef.id === 'ATTACK_FINISHER' ? this.modifiers.finisherRange : 1);

            if (!attackDef.noHitbox) hitboxSystem.addActiveHitbox({
              ownerId: 'PLAYER',
              damage: Math.round(damage),
              position: this.root.position.clone(),
              direction: forward,
              range: this.katana.getRange() * rangeScale,
              hitAngle: this.katana.getHitAngle(),
              knockback: attackDef.knockback ?? 10,
              hitboxType: attackDef.isRadial ? 'RADIAL' : 'ARC',
              stagger: attackDef.stagger,
              focusGain: attackDef.focusGain,
              hitStop: attackDef.hitStop,
              shake: attackDef.shake,
              isHeavy: attackDef.slashType >= 3,
              posture: attackDef.posture,
              isCounter: this.isCounterAttack,
            });
          }
        }
      }
      this.playIdle(); // Stop walking animation
    } else {
      // Normal Movement
      this.dashSystem.update(dt); // Keep cooldowns ticking
      if (inputMoveDir.lengthSq() > 0) {
        // Set target rotation based on movement direction
        this.targetRotation = Math.atan2(inputMoveDir.x, inputMoveDir.z);
        intendedMove = inputMoveDir.clone().multiplyScalar(speed * dt);
        this.playWalk();

        // Footsteps
        this.footstepDistance += speed * dt;
        const stepThreshold = isRunning ? 2.4 : 1.8;
        if (this.footstepDistance >= stepThreshold) {
          this.footstepDistance = 0;
          const { x, z } = this.root.position;
          const isGrass = z < -20 && z > -50;
          AudioManager.playFootstep(this.surfaceAt ? this.surfaceAt(x, z) : isGrass ? 'grass' : 'stone');
        }
      } else {
        this.footstepDistance = 0;
        this.playIdle();
      }
    }

    // Apply Knockback velocity
    if (this.state.movement === MovementState.HURT) {
      intendedMove.add(this.velocity.clone().multiplyScalar(dt));
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 8); // Damping
    }
    if (this.externalPush.lengthSq() > 0) intendedMove.addScaledVector(this.externalPush, dt);

    // Resolve Movement against collisions
    if (intendedMove.lengthSq() > 0) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        intendedMove, 
        0.4 // GAME_CONFIG.PLAYER.COLLISION_RADIUS
      );
      
      this.root.position.add(resolvedMove);

      // Clamp to world bounds
      const bounds = GAME_CONFIG.WORLD.BOUNDS;
      this.root.position.x = THREE.MathUtils.clamp(this.root.position.x, bounds.MIN_X, bounds.MAX_X);
      this.root.position.z = THREE.MathUtils.clamp(this.root.position.z, bounds.MIN_Z, bounds.MAX_Z);
    }
    this.followGround(dt);

    // Locked on: keep facing the target, except when dashing
    if (this.lockTarget && this.state.movement !== MovementState.DASH && !isAttacking) {
      this.targetRotation = Math.atan2(this.lockTarget.x - this.root.position.x, this.lockTarget.z - this.root.position.z);
    }

    // Smooth rotation interpolation
    let diff = this.targetRotation - this.currentRotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    // Rotate faster during attacks for snap, or normal speed
    const rotationSpeed = isAttacking ? 25.0 : 15.0; 
    this.currentRotation += diff * Math.min(1.0, rotationSpeed * dt);
    
    while (this.currentRotation < -Math.PI) this.currentRotation += Math.PI * 2;
    while (this.currentRotation > Math.PI) this.currentRotation -= Math.PI * 2;

    this.root.rotation.y = this.currentRotation;

    // Pass combat phase to animator
    let maxTime = 1;
    if (this.state.currentAttackId && this.state.combatPhase !== CombatPhase.NONE) {
      const def = ATTACK_DATA[this.state.currentAttackId];
      if (this.state.combatPhase === CombatPhase.WINDUP) maxTime = def.windup;
      else if (this.state.combatPhase === CombatPhase.ACTIVE) maxTime = def.active;
      else if (this.state.combatPhase === CombatPhase.RECOVERY) maxTime = def.recovery;
    }
    const attackProgress = this.combat['attackTimer'] / maxTime;
    
    this.animator.setCombatState(this.state.currentAttackId, this.state.combatPhase, attackProgress);

    // Update internal animation
    const animSpeedMultiplier = (isRunning && inputMoveDir.lengthSq() > 0 && !isAttacking) ? 1.5 : 1.0;
    this.animator.update(dt * animSpeedMultiplier);
    this.updateAppearance(dt);
  }

  /**
   * Aims a swing. A locked target comes first; then the nearest enemy roughly where
   * the camera is pointing, or right next to the player; then the camera's own direction.
   */
  private aimAttack(inputManager: InputManager): void {
    const position = this.root.position;
    const aimYaw = inputManager.cameraYaw + Math.PI;

    if (this.lockTarget && position.distanceTo(this.lockTarget) < LOCK_AIM_RANGE) {
      this.targetRotation = Math.atan2(this.lockTarget.x - position.x, this.lockTarget.z - position.z);
      return;
    }

    let nearest: THREE.Vector3 | null = null;
    let nearestDistSq = AIM_ASSIST_RANGE * AIM_ASSIST_RANGE;
    for (const target of this.aimTargets) {
      const distSq = position.distanceToSquared(target);
      if (distSq >= nearestDistSq) continue;

      const toTarget = Math.atan2(target.x - position.x, target.z - position.z);
      const offAim = Math.abs(Math.atan2(Math.sin(toTarget - aimYaw), Math.cos(toTarget - aimYaw)));
      if (offAim < AIM_ASSIST_CONE || distSq < AIM_ASSIST_POINT_BLANK * AIM_ASSIST_POINT_BLANK) {
        nearest = target;
        nearestDistSq = distSq;
      }
    }

    if (nearest) {
      this.targetRotation = Math.atan2(nearest.x - position.x, nearest.z - position.z);
      return;
    }

    // With the mouse captured, the camera is the aim. Otherwise follow the movement keys.
    const moveDir = inputManager.getMovementDirection();
    this.targetRotation = !inputManager.isPointerLocked && moveDir.lengthSq() > 0
      ? Math.atan2(moveDir.x, moveDir.z)
      : aimYaw;
  }

  public playIdle(): void {
    this.animator.setState(AnimState.IDLE);
  }

  public playWalk(): void {
    this.animator.setState(AnimState.WALK);
  }

  // Position control
  public setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  // Rotation control
  public setRotation(y: number): void {
    this.targetRotation = y;
    this.currentRotation = y;
    this.root.rotation.set(0, y, 0); // Restore full rotation safely
  }
  
  /** Steps up onto decks and down off them, a little smoothed. */
  private followGround(dt: number): void {
    const target = this.groundHeight ? this.groundHeight(this.root.position.x, this.root.position.z) : 0;
    const y = this.root.position.y;
    this.root.position.y = Math.abs(target - y) < 0.01 ? target : y + (target - y) * Math.min(1, dt * 14);
  }

  private applyVelocity(dt: number, collisionSystem: any): void {
    if (this.velocity.lengthSq() > 0.01) {
      const resolvedMove = collisionSystem.resolveMovement(
        this.root.position, 
        this.velocity.clone().multiplyScalar(dt), 
        0.4
      );
      this.root.position.add(resolvedMove);
      this.velocity.lerp(new THREE.Vector3(0,0,0), dt * 5.0);
    }
  }
}
