import { CharacterRig } from '../characters/CharacterRig';
import { BossState } from './BossState';
import { BossAttackPhase } from './BossAttackSystem';
import { lerp } from '../utils/MathUtils';

/**
 * BossAnimator — Procedural animation for the Crimson Oni.
 * Designed for weight, power, and menace. Does NOT extend CharacterAnimator
 * because boss animations use fundamentally different timing and feel.
 */
export class BossAnimator {
  private rig: CharacterRig;
  private time: number = 0;
  private state: BossState = BossState.IDLE;

  // Blend weights
  private idleWeight: number = 1;
  private walkWeight: number = 0;
  private hurtWeight: number = 0;
  private attackWeight: number = 0;
  private introWeight: number = 0;

  // Intro specific
  private introTimer: number = 0;

  // Attack animation state
  private currentAttackId: string | null = null;
  private attackPhase: BossAttackPhase = BossAttackPhase.NONE;
  private attackProgress: number = 0;

  constructor(rig: CharacterRig) {
    this.rig = rig;
  }

  public setState(newState: BossState): void {
    this.state = newState;
  }

  public setAttackState(attackId: string | null, phase: BossAttackPhase, progress: number): void {
    this.currentAttackId = attackId;
    this.attackPhase = phase;
    this.attackProgress = progress;
  }

  public update(dt: number): void {
    this.time += dt;

    // Compute blend targets
    const isAttacking = this.attackPhase !== BossAttackPhase.NONE;
    const targetIdle = (!isAttacking && (this.state === BossState.IDLE || this.state === BossState.OBSERVE)) ? 1 : 0;
    const targetWalk = (!isAttacking && (this.state === BossState.APPROACH || this.state === BossState.ENRAGED)) ? 1 : 0;
    const targetHurt = (this.state === BossState.HURT) ? 1 : 0;
    const targetAttack = isAttacking ? 1 : 0;
    const targetIntro = (this.state === BossState.INTRO) ? 1 : 0;

    this.idleWeight = lerp(this.idleWeight, targetIdle, dt * 6);
    this.walkWeight = lerp(this.walkWeight, targetWalk, dt * 6);
    this.hurtWeight = lerp(this.hurtWeight, targetHurt, dt * 10);
    this.attackWeight = lerp(this.attackWeight, targetAttack, dt * 10);
    this.introWeight = lerp(this.introWeight, targetIntro, dt * 4);

    this.applyIdle(this.idleWeight);
    this.applyWalk(this.walkWeight);
    this.applyHurt(this.hurtWeight);
    this.applyAttack(this.attackWeight);
    this.applyIntro(this.introWeight, dt);

    // Phase transition: boss glows and trembles
    if (this.state === BossState.PHASE_TRANSITION) {
      this.applyPhaseTransition();
    }

    // Defeated: collapse
    if (this.state === BossState.DEFEATED) {
      this.applyDefeated();
    }
  }

  // ─── IDLE ────────────────────────────────────────────────────────────────
  private applyIdle(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time;

    // Heavy breathing — slower than Ronin
    const breath = Math.sin(t * 1.2) * 0.03 * weight;
    this.rig.chest.position.y = 0.25 + breath;
    this.rig.chest.rotation.x = Math.sin(t * 1.2) * 0.03 * weight;

    // Shoulder weight — arms hang heavy
    this.rig.leftUpperArm.rotation.z = 0.15 * weight;
    this.rig.rightUpperArm.rotation.z = -0.15 * weight;
    this.rig.leftUpperArm.rotation.x = 0.1 * weight;
    this.rig.rightUpperArm.rotation.x = 0.1 * weight;

    // Natural elbow bend — heavier than human
    this.rig.leftLowerArm.rotation.x = -0.15 * weight;
    this.rig.rightLowerArm.rotation.x = -0.25 * weight; // Weapon arm slightly more bent

    // Head tracking — slow, menacing sweep
    this.rig.head.rotation.y = Math.sin(t * 0.4) * 0.08 * weight;
    this.rig.head.rotation.x = -0.05 * weight; // Slight downward tilt

    // Weight shifting — subtle sway
    this.rig.pelvis.rotation.y = Math.sin(t * 0.6) * 0.02 * weight;
    this.rig.pelvis.position.y = 1.0;

    // Stable wide stance
    this.rig.leftUpperLeg.rotation.set(0, 0, 0.08 * weight);
    this.rig.rightUpperLeg.rotation.set(0, 0, -0.08 * weight);
    this.rig.leftLowerLeg.rotation.set(0, 0, 0);
    this.rig.rightLowerLeg.rotation.set(0, 0, 0);
  }

  // ─── INTRO ──────────────────────────────────────────────────────────────
  private applyIntro(weight: number, dt: number): void {
    if (weight <= 0.01) {
      this.introTimer = 0;
      return;
    }
    
    if (this.state === BossState.INTRO) {
      this.introTimer += dt;
    }

    // Sequence: 
    // 0-1.5s: Look down, weapon resting.
    // 1.5s-3s: Slowly raise head.
    // 3s-4.5s: Raise weapon slightly, tense up.

    let headX = 0.5; // looking down
    let rightArmX = -0.2;
    let rightArmZ = 0.2;

    if (this.introTimer > 1.5) {
      // Raise head
      const t = Math.min((this.introTimer - 1.5) / 1.5, 1.0);
      headX = lerp(0.5, -0.1, t); // Look slightly up/forward
    }
    
    if (this.introTimer > 3.0) {
      // Grip weapon
      const t = Math.min((this.introTimer - 3.0) / 1.5, 1.0);
      rightArmX = lerp(-0.2, -0.4, t);
      rightArmZ = lerp(0.2, 0.0, t);
    }

    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, headX, weight);
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, rightArmX, weight);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, rightArmZ, weight);
    
    // Add heavy breathing
    const breath = Math.sin(this.time * 1.5) * 0.04 * weight;
    this.rig.chest.position.y = 0.25 + breath;
    this.rig.spine.rotation.x = 0.1 * weight; // slightly hunched
  }

  // ─── WALK ────────────────────────────────────────────────────────────────
  private applyWalk(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time;

    // Lumbering gait — much slower cycle than player
    const cycleSpeed = 6.0;
    const cycle = t * cycleSpeed;

    // Heavy vertical bob
    const bob = Math.abs(Math.sin(cycle)) * 0.12;
    this.rig.pelvis.position.y = 1.0 - bob * weight;

    // Pelvis twist
    const twist = Math.sin(cycle) * 0.12;
    this.rig.pelvis.rotation.y = twist * weight;
    this.rig.chest.rotation.y = -twist * 0.4 * weight; // Counter-twist

    // Legs — wide lumbering stride
    const stride = 0.5;
    const lLeg = Math.sin(cycle) * stride;
    const rLeg = Math.sin(cycle + Math.PI) * stride;

    this.rig.leftUpperLeg.rotation.x = lLeg * weight;
    this.rig.rightUpperLeg.rotation.x = rLeg * weight;

    // Heavy knee bending
    this.rig.leftLowerLeg.rotation.x = Math.max(0, -lLeg * 1.2) * weight;
    this.rig.rightLowerLeg.rotation.x = Math.max(0, -rLeg * 1.2) * weight;

    // Arms sway — weapon arm stays more stable
    this.rig.leftUpperArm.rotation.x = -lLeg * 0.3 * weight;
    this.rig.rightUpperArm.rotation.x = -rLeg * 0.15 * weight; // Weapon arm less swing

    // Spine lean forward slightly during approach
    this.rig.spine.rotation.x = 0.05 * weight;
  }

  // ─── HURT ────────────────────────────────────────────────────────────────
  private applyHurt(weight: number): void {
    if (weight <= 0.01) return;

    // Flinch — minimal for a boss, shows stagger resistance
    this.rig.chest.rotation.x = -0.15 * weight;
    this.rig.spine.rotation.x = -0.1 * weight;
    this.rig.head.rotation.x = 0.2 * weight;
  }

  // ─── ATTACK ──────────────────────────────────────────────────────────────
  private applyAttack(weight: number): void {
    if (weight <= 0.01 || !this.currentAttackId) return;

    const p = this.attackProgress;
    const phase = this.attackPhase;

    if (this.currentAttackId === 'HEAVY_SWING') {
      this.applyKanaboSlam(weight, p, phase);
    } else if (this.currentAttackId === 'DOUBLE_SWING') {
      this.applyKanaboSweep(weight, p, phase);
    } else if (this.currentAttackId === 'GROUND_SMASH') {
      this.applyStomp(weight, p, phase);
    } else if (this.currentAttackId === 'CHARGE_ATTACK') {
      // Use stomp or sweep as placeholder for charge animation
      this.applyKanaboSweep(weight, p, phase);
    }
  }

  private applyKanaboSlam(w: number, p: number, phase: BossAttackPhase): void {
    let spineX = 0, rArmX = 0, rArmZ = 0, rLowerX = 0;

    if (phase === BossAttackPhase.WINDUP) {
      // Raise weapon overhead
      spineX = lerp(0, 0.3, p);
      rArmX = lerp(0, -2.5, p);   // Arm goes way up
      rArmZ = lerp(-0.15, 0, p);
      rLowerX = lerp(-0.25, -1.2, p);
    } else if (phase === BossAttackPhase.ACTIVE) {
      // Smash down hard
      spineX = lerp(0.3, -0.4, p);
      rArmX = lerp(-2.5, 0.3, p);
      rLowerX = lerp(-1.2, -0.1, p);
    } else if (phase === BossAttackPhase.RECOVERY) {
      // Return slowly
      spineX = lerp(-0.4, 0, p);
      rArmX = lerp(0.3, 0, p);
      rLowerX = lerp(-0.1, -0.25, p);
    }

    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, spineX, w);
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, rArmX, w);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, rArmZ, w);
    this.rig.rightLowerArm.rotation.x = lerp(this.rig.rightLowerArm.rotation.x, rLowerX, w);
  }

  private applyKanaboSweep(w: number, p: number, phase: BossAttackPhase): void {
    let spineY = 0, rArmX = 0, rArmZ = 0, rLowerX = 0;

    if (phase === BossAttackPhase.WINDUP) {
      // Pull back to the right
      spineY = lerp(0, -0.4, p);
      rArmX = lerp(0, -0.8, p);
      rArmZ = lerp(-0.15, 0.6, p);
      rLowerX = lerp(-0.25, -0.6, p);
    } else if (phase === BossAttackPhase.ACTIVE) {
      // Sweep across
      spineY = lerp(-0.4, 0.6, p);
      rArmX = lerp(-0.8, -1.0, p);
      rArmZ = lerp(0.6, -0.8, p);
      rLowerX = lerp(-0.6, -0.2, p);
    } else if (phase === BossAttackPhase.RECOVERY) {
      spineY = lerp(0.6, 0, p);
      rArmX = lerp(-1.0, 0, p);
      rArmZ = lerp(-0.8, -0.15, p);
      rLowerX = lerp(-0.2, -0.25, p);
    }

    this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, spineY, w);
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, rArmX, w);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, rArmZ, w);
    this.rig.rightLowerArm.rotation.x = lerp(this.rig.rightLowerArm.rotation.x, rLowerX, w);
  }

  private applyStomp(w: number, p: number, phase: BossAttackPhase): void {
    let pelvisY = 1.0, rLegX = 0, rLegLowerX = 0, spineX = 0;

    if (phase === BossAttackPhase.WINDUP) {
      // Lift right leg
      rLegX = lerp(0, -0.8, p);
      rLegLowerX = lerp(0, 0.6, p);
      spineX = lerp(0, 0.1, p);
    } else if (phase === BossAttackPhase.ACTIVE) {
      // Stomp down
      rLegX = lerp(-0.8, 0.2, p);
      rLegLowerX = lerp(0.6, 0, p);
      pelvisY = 1.0 - 0.15 * (1 - p); // Drop
      spineX = lerp(0.1, -0.15, p);
    } else if (phase === BossAttackPhase.RECOVERY) {
      pelvisY = lerp(0.85, 1.0, p);
      rLegX = lerp(0.2, 0, p);
      spineX = lerp(-0.15, 0, p);
    }

    this.rig.pelvis.position.y = lerp(this.rig.pelvis.position.y, pelvisY, w);
    this.rig.rightUpperLeg.rotation.x = lerp(this.rig.rightUpperLeg.rotation.x, rLegX, w);
    this.rig.rightLowerLeg.rotation.x = lerp(this.rig.rightLowerLeg.rotation.x, rLegLowerX, w);
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, spineX, w);
  }

  // ─── PHASE TRANSITION ───────────────────────────────────────────────────
  private applyPhaseTransition(): void {
    // Trembling rage animation
    const shake = Math.sin(this.time * 40) * 0.02;
    this.rig.chest.rotation.z = shake;
    this.rig.head.rotation.z = -shake;
    this.rig.spine.rotation.x = -0.1;
  }

  // ─── DEFEATED ────────────────────────────────────────────────────────────
  private applyDefeated(): void {
    // Slow collapse forward
    const t = Math.min(this.time * 0.5, 1.0); // 2 seconds to fall
    this.rig.pelvis.position.y = lerp(1.0, 0.2, t);
    this.rig.spine.rotation.x = lerp(0, 0.8, t);
    this.rig.head.rotation.x = lerp(0, 0.5, t);
    this.rig.leftUpperArm.rotation.z = lerp(0.15, 0.8, t);
    this.rig.rightUpperArm.rotation.z = lerp(-0.15, -0.8, t);
  }
}
