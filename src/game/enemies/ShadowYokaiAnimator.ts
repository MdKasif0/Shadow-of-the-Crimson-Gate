import { CharacterRig } from '../characters/CharacterRig';
import { EnemyState } from './EnemyState';
import { lerp } from '../utils/MathUtils';

export class ShadowYokaiAnimator {
  private rig: CharacterRig;
  private state: EnemyState = EnemyState.IDLE;
  
  private time: number = 0;
  private stateTime: number = 0;

  // Blending weights
  private idleWeight: number = 1;
  private walkWeight: number = 0;
  private strafeWeight: number = 0;
  private retreatWeight: number = 0;
  private attackWeight: number = 0;
  private hurtWeight: number = 0;
  private deadWeight: number = 0;

  constructor(rig: CharacterRig) {
    this.rig = rig;
  }

  public setState(newState: EnemyState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTime = 0;
  }

  public update(dt: number): void {
    this.time += dt;
    this.stateTime += dt;

    const tIdle = this.state === EnemyState.IDLE ? 1 : 0;
    const tWalk = this.state === EnemyState.WALK ? 1 : 0;
    const tStrafe = this.state === EnemyState.STRAFE ? 1 : 0;
    const tRetreat = this.state === EnemyState.RETREAT ? 1 : 0;
    const tAttack = this.state === EnemyState.ATTACK ? 1 : 0;
    const tHurt = this.state === EnemyState.HURT ? 1 : 0;
    const tDead = this.state === EnemyState.DEAD ? 1 : 0;

    const lerpSpeed = 10;
    this.idleWeight = lerp(this.idleWeight, tIdle, dt * lerpSpeed);
    this.walkWeight = lerp(this.walkWeight, tWalk, dt * lerpSpeed);
    this.strafeWeight = lerp(this.strafeWeight, tStrafe, dt * lerpSpeed);
    this.retreatWeight = lerp(this.retreatWeight, tRetreat, dt * lerpSpeed);
    
    // Fast snap for attacks/hurt/dead
    this.attackWeight = lerp(this.attackWeight, tAttack, dt * 15);
    this.hurtWeight = lerp(this.hurtWeight, tHurt, dt * 20);
    this.deadWeight = lerp(this.deadWeight, tDead, dt * 5); // slower collapse

    this.applyIdle(this.idleWeight);
    this.applyWalk(this.walkWeight);
    this.applyStrafe(this.strafeWeight);
    this.applyRetreat(this.retreatWeight);
    this.applyAttack(this.attackWeight);
    this.applyHurt(this.hurtWeight);
    this.applyDead(this.deadWeight);
  }

  private applyIdle(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 2.0;
    
    // Shadow Yokai stands taller but swaying
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.1, weight);
    this.rig.chest.rotation.x = lerp(this.rig.chest.rotation.x, 0.1, weight);
    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, -0.2 + Math.sin(t*0.5)*0.08, weight);
    this.rig.head.rotation.z = lerp(this.rig.head.rotation.z, Math.sin(t*0.3)*0.05, weight); // Eerie head tilt
    
    // Floating feel
    this.rig.pelvis.position.y = 1.2 + Math.sin(t) * 0.05 * weight;

    // Ghostly arms
    this.rig.leftUpperArm.rotation.set(0.1, 0, 0.3 * weight);
    this.rig.rightUpperArm.rotation.set(0.1, 0, -0.3 * weight);
    this.rig.leftLowerArm.rotation.x = -0.1 * weight;
    this.rig.rightLowerArm.rotation.x = -0.1 * weight;
    
    // Twitched fingers
    this.rig.leftHand.rotation.z = Math.sin(t * 1.5) * 0.2 * weight;
    this.rig.rightHand.rotation.z = Math.sin(t * 1.7 + 1) * -0.2 * weight;
  }

  private applyWalk(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 10.0;

    // Gliding walk
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.2, weight);
    this.rig.pelvis.position.y = 1.2 - Math.abs(Math.sin(t)) * 0.05 * weight;

    const stride = 0.5;
    const lLeg = Math.sin(t) * stride;
    const rLeg = Math.sin(t + Math.PI) * stride;

    this.rig.leftUpperLeg.rotation.x = lLeg * weight;
    this.rig.rightUpperLeg.rotation.x = rLeg * weight;
    
    // Arms trail behind
    this.rig.leftUpperArm.rotation.x = lerp(this.rig.leftUpperArm.rotation.x, 0.3, weight);
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, 0.3, weight);
  }

  private applyStrafe(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 8.0;

    // Lateral slide
    this.rig.spine.rotation.z = lerp(this.rig.spine.rotation.z, Math.sin(t * 0.5) * 0.1, weight);
    this.rig.pelvis.position.y = 1.2 - Math.abs(Math.sin(t)) * 0.05 * weight;

    // Legs cross over slightly
    const stride = 0.4;
    const lLeg = Math.sin(t) * stride;
    const rLeg = Math.sin(t + Math.PI) * stride;

    this.rig.leftUpperLeg.rotation.z = lLeg * weight;
    this.rig.rightUpperLeg.rotation.z = rLeg * weight;
    
    // Arms out for balance
    this.rig.leftUpperArm.rotation.z = lerp(this.rig.leftUpperArm.rotation.z, 0.5, weight);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, -0.5, weight);
  }

  private applyRetreat(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 10.0;

    // Gliding backward
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.1, weight);
    this.rig.pelvis.position.y = 1.2 - Math.abs(Math.sin(t)) * 0.05 * weight;

    const stride = 0.5;
    const lLeg = Math.sin(t + Math.PI) * stride;
    const rLeg = Math.sin(t) * stride;

    this.rig.leftUpperLeg.rotation.x = lLeg * weight;
    this.rig.rightUpperLeg.rotation.x = rLeg * weight;
    
    // Arms forward defensively
    this.rig.leftUpperArm.rotation.x = lerp(this.rig.leftUpperArm.rotation.x, -0.2, weight);
    this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, -0.2, weight);
  }

  private applyAttack(weight: number): void {
    if (weight <= 0.01) return;
    
    // Shadow Yokai attack is much faster
    const windup = 0.25;
    const activeEnd = 0.4;
    
    if (this.stateTime < windup) {
      // Windup - pull one arm back high
      const p = this.stateTime / windup;
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, 0.4, p * weight);
      this.rig.rightUpperArm.rotation.set(0.2, 0, -1.2 * weight);
      this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, -1.5, p * weight);
      this.rig.leftUpperArm.rotation.set(-0.2, 0, 0.4 * weight);
    } else if (this.stateTime < activeEnd) {
      // Strike - fast sweeping slash
      const p = (this.stateTime - windup) / (activeEnd - windup);
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, -0.6, p * weight);
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.4, p * weight);
      this.rig.rightUpperArm.rotation.set(-1.8 * weight, 0, -0.2 * weight);
      this.rig.rightLowerArm.rotation.set(-0.5 * weight, 0, 0); // Extended
      this.rig.leftUpperArm.rotation.set(-0.8 * weight, 0, 0.5 * weight);
    } else {
      // Recovery
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, 0, weight);
      this.rig.rightUpperArm.rotation.set(-1.2 * weight, 0, -0.2 * weight);
      this.rig.leftUpperArm.rotation.set(-0.4 * weight, 0, 0.2 * weight);
    }
  }

  private applyHurt(weight: number): void {
    if (weight <= 0.01) return;
    // Violent jittering recoil
    const recoil = Math.sin(Math.min(this.stateTime * 20, Math.PI)) * 0.6;
    const jitterX = (Math.random() - 0.5) * 0.2 * weight;
    const jitterZ = (Math.random() - 0.5) * 0.2 * weight;
    
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.4 * recoil, weight);
    this.rig.spine.rotation.z = jitterZ;
    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, -0.6 * recoil, weight) + jitterX;
    this.rig.leftUpperArm.rotation.z = lerp(this.rig.leftUpperArm.rotation.z, 0.8, weight);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, -0.8, weight);
  }

  private applyDead(weight: number): void {
    if (weight <= 0.01) return;
    
    // Disintegrate upward - rise slightly then collapse inward
    if (this.stateTime < 0.5) {
      this.rig.pelvis.position.y = lerp(this.rig.pelvis.position.y, 1.5, weight * (this.stateTime * 2));
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.5, weight);
      this.rig.leftUpperArm.rotation.set(0, 0, 1.5);
      this.rig.rightUpperArm.rotation.set(0, 0, -1.5);
    } else {
      this.rig.pelvis.position.y = lerp(this.rig.pelvis.position.y, 0.1, weight);
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 1.5, weight);
      this.rig.leftUpperLeg.rotation.set(-1.0, 0.5, 0.5);
      this.rig.rightUpperLeg.rotation.set(-1.0, -0.5, -0.5);
      this.rig.leftUpperArm.rotation.set(-1.5, 0, 0.8);
      this.rig.rightUpperArm.rotation.set(-1.5, 0, -0.8);
    }
  }
}
