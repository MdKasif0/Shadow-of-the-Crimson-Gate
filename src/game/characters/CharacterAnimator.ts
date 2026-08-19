import { CharacterRig } from './CharacterRig';
import { lerp } from '../utils/MathUtils';
import { CombatPhase } from '../combat/PlayerState';

export enum AnimState {
  IDLE,
  WALK
}

export class CharacterAnimator {
  private rig: CharacterRig;
  private state: AnimState = AnimState.IDLE;
  
  private time: number = 0;
  
  // Blending weights
  private walkWeight: number = 0;
  private idleWeight: number = 1;
  private attackWeight: number = 0;

  // Attack state for procedural animation
  private currentAttackId: string | null = null;
  private currentCombatPhase: CombatPhase = CombatPhase.NONE;
  private attackProgress: number = 0; // 0.0 to 1.0 within the current phase

  constructor(rig: CharacterRig) {
    this.rig = rig;
  }

  public setCombatState(attackId: string | null, phase: CombatPhase, progress: number): void {
    this.currentAttackId = attackId;
    this.currentCombatPhase = phase;
    this.attackProgress = progress;
  }

  public setState(newState: AnimState): void {
    if (this.state === newState) return;
    this.state = newState;
  }

  public update(dt: number): void {
    this.time += dt;

    // Smoothly interpolate weights based on current state
    const isAttacking = this.currentCombatPhase !== CombatPhase.NONE;
    const targetWalk = (!isAttacking && this.state === AnimState.WALK) ? 1 : 0;
    const targetIdle = (!isAttacking && this.state === AnimState.IDLE) ? 1 : 0;
    const targetAttack = isAttacking ? 1 : 0;
    
    this.walkWeight = lerp(this.walkWeight, targetWalk, dt * 10);
    this.idleWeight = lerp(this.idleWeight, targetIdle, dt * 10);
    this.attackWeight = lerp(this.attackWeight, targetAttack, dt * 15);

    this.applyIdle(this.idleWeight);
    this.applyWalk(this.walkWeight);
    this.applyAttack(this.attackWeight);
  }

  private applyIdle(weight: number): void {
    if (weight <= 0.01) return;

    const t = this.time * 2.0; // Breathe speed

    // Breathing (subtle up/down on chest and scale)
    const breath = Math.sin(t) * 0.02 * weight;
    this.rig.chest.position.y = 0.25 + breath;
    this.rig.chest.rotation.x = Math.sin(t) * 0.02 * weight;
    
    // Shoulders relax
    this.rig.leftUpperArm.rotation.z = 0.1 * weight;
    this.rig.rightUpperArm.rotation.z = -0.1 * weight;
    this.rig.leftUpperArm.rotation.x = 0.05 * weight;
    this.rig.rightUpperArm.rotation.x = 0.05 * weight;
    
    // Natural slight bend in elbows
    this.rig.leftLowerArm.rotation.x = -0.1 * weight;
    this.rig.rightLowerArm.rotation.x = -0.1 * weight;

    // Head looks slightly around or rests
    this.rig.head.rotation.y = Math.sin(t * 0.5) * 0.05 * weight;
    
    // Stable stance
    this.rig.pelvis.position.y = 1.0;
    this.rig.leftUpperLeg.rotation.set(0, 0, 0.05 * weight);
    this.rig.rightUpperLeg.rotation.set(0, 0, -0.05 * weight);
    this.rig.leftLowerLeg.rotation.set(0, 0, 0);
    this.rig.rightLowerLeg.rotation.set(0, 0, 0);
  }

  private applyWalk(weight: number): void {
    if (weight <= 0.01) return;

    const t = this.time * 10.0; // Walk cycle speed

    // Pelvis bob
    const bob = Math.abs(Math.sin(t)) * 0.08;
    this.rig.pelvis.position.y = 1.0 - bob * weight;
    
    // Pelvis twist
    const twist = Math.sin(t) * 0.1;
    this.rig.pelvis.rotation.y = twist * weight;
    this.rig.chest.rotation.y = -twist * 0.5 * weight; // counter-twist

    // Legs
    const stride = 0.6;
    const lLeg = Math.sin(t) * stride;
    const rLeg = Math.sin(t + Math.PI) * stride;

    this.rig.leftUpperLeg.rotation.x = lLeg * weight;
    this.rig.rightUpperLeg.rotation.x = rLeg * weight;

    // Knee bending (only bend backward)
    this.rig.leftLowerLeg.rotation.x = Math.max(0, -lLeg * 1.5) * weight;
    this.rig.rightLowerLeg.rotation.x = Math.max(0, -rLeg * 1.5) * weight;

    // Arms swing opposite to legs
    const armSwing = 0.5;
    this.rig.leftUpperArm.rotation.x = -lLeg * armSwing * weight;
    this.rig.rightUpperArm.rotation.x = -rLeg * armSwing * weight;

    // Elbows slightly bent while swinging forward
    this.rig.leftLowerArm.rotation.x = Math.min(0, lLeg) * weight;
    this.rig.rightLowerArm.rotation.x = Math.min(0, rLeg) * weight;
  }

  private applyAttack(weight: number): void {
    if (weight <= 0.01 || !this.currentAttackId) return;

    // We reset the base pose to avoid additive distortion if weight == 1
    // But since we are blending, we just set the rotations that matter.
    // To properly override, we should interpolate the specific bones.

    const p = this.attackProgress; // 0 to 1
    const phase = this.currentCombatPhase;
    
    // Default pose values to blend from
    let spineY = 0, spineX = 0;
    let rArmX = 0, rArmY = 0, rArmZ = 0;
    let rLowerX = 0;
    let wristX = 0, wristY = 0;

    if (this.currentAttackId === 'ATTACK_1') {
      // Right-to-left horizontal slash
      if (phase === CombatPhase.WINDUP) {
        // Pull back to the right
        spineY = lerp(0, -0.5, p);
        rArmX = lerp(0, -0.5, p);
        rArmZ = lerp(0, 0.5, p);
        rLowerX = lerp(0, -0.8, p);
        wristY = lerp(0, 1.0, p);
      } else if (phase === CombatPhase.ACTIVE) {
        // Fast slash to the left
        spineY = lerp(-0.5, 0.8, p);
        rArmX = lerp(-0.5, -1.2, p);
        rArmZ = lerp(0.5, -0.8, p);
        rLowerX = lerp(-0.8, -0.2, p);
        wristY = lerp(1.0, -1.0, p);
      } else if (phase === CombatPhase.RECOVERY) {
        // Return to neutral
        spineY = lerp(0.8, 0, p);
        rArmX = lerp(-1.2, 0, p);
        rArmZ = lerp(-0.8, 0, p);
        rLowerX = lerp(-0.2, 0, p);
        wristY = lerp(-1.0, 0, p);
      }
    } 
    else if (this.currentAttackId === 'ATTACK_2') {
      // Left-to-right ascending slash
      if (phase === CombatPhase.WINDUP) {
        spineY = lerp(0.8, 0.5, p);
        spineX = lerp(0, 0.2, p);
        rArmX = lerp(-1.2, 0.2, p);
        rArmZ = lerp(-0.8, -0.5, p);
        rLowerX = lerp(-0.2, -1.0, p);
        wristY = lerp(-1.0, -1.2, p);
      } else if (phase === CombatPhase.ACTIVE) {
        spineY = lerp(0.5, -0.6, p);
        spineX = lerp(0.2, -0.2, p);
        rArmX = lerp(0.2, -1.5, p);
        rArmZ = lerp(-0.5, 0.8, p);
        rLowerX = lerp(-1.0, -0.1, p);
        wristY = lerp(-1.2, 0.8, p);
      } else if (phase === CombatPhase.RECOVERY) {
        spineY = lerp(-0.6, 0, p);
        spineX = lerp(-0.2, 0, p);
        rArmX = lerp(-1.5, 0, p);
        rArmZ = lerp(0.8, 0, p);
        rLowerX = lerp(-0.1, 0, p);
        wristY = lerp(0.8, 0, p);
      }
    }
    else if (this.currentAttackId === 'ATTACK_3') {
      // Overhead heavy downward strike
      if (phase === CombatPhase.WINDUP) {
        spineX = lerp(-0.2, 0.5, p);
        rArmX = lerp(-1.5, -2.8, p); // Raise arm high
        rArmY = lerp(0, -0.5, p);
        rArmZ = lerp(0.8, 0, p);
        rLowerX = lerp(-0.1, -1.5, p);
        wristX = lerp(0, -0.5, p);
      } else if (phase === CombatPhase.ACTIVE) {
        spineX = lerp(0.5, -0.5, p);
        rArmX = lerp(-2.8, 0.2, p); // Smash down
        rArmY = lerp(-0.5, 0.2, p);
        rLowerX = lerp(-1.5, -0.2, p);
        wristX = lerp(-0.5, 0.8, p);
      } else if (phase === CombatPhase.RECOVERY) {
        spineX = lerp(-0.5, 0, p);
        rArmX = lerp(0.2, 0, p);
        rArmY = lerp(0.2, 0, p);
        rLowerX = lerp(-0.2, 0, p);
        wristX = lerp(0.8, 0, p);
      }
    }

    // Blend into the rig
    this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, spineY, weight);
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, spineX, weight);
    
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, rArmX, weight);
    this.rig.rightUpperArm.rotation.y = lerp(this.rig.rightUpperArm.rotation.y, rArmY, weight);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, rArmZ, weight);
    
    this.rig.rightLowerArm.rotation.x = lerp(this.rig.rightLowerArm.rotation.x, rLowerX, weight);
    
    this.rig.rightHand.rotation.x = lerp(this.rig.rightHand.rotation.x, wristX, weight);
    this.rig.rightHand.rotation.y = lerp(this.rig.rightHand.rotation.y, wristY, weight);
  }
}
