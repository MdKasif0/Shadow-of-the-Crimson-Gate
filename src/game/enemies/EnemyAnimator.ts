import { CharacterRig } from '../characters/CharacterRig';
import { EnemyState } from './EnemyState';
import { lerp } from '../utils/MathUtils';

export class EnemyAnimator {
  private rig: CharacterRig;
  private state: EnemyState = EnemyState.IDLE;
  
  private time: number = 0;
  private stateTime: number = 0;

  // Blending weights
  private idleWeight: number = 1;
  private walkWeight: number = 0;
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

    // When dead, force all other weights to zero immediately and only run death anim
    if (this.state === EnemyState.DEAD) {
      this.idleWeight = 0;
      this.walkWeight = 0;
      this.attackWeight = 0;
      this.hurtWeight = 0;
      this.deadWeight = lerp(this.deadWeight, 1, dt * 8);
      this.applyDead(this.deadWeight);
      return;
    }

    const tIdle = this.state === EnemyState.IDLE ? 1 : 0;
    const tWalk = this.state === EnemyState.WALK ? 1 : 0;
    const tAttack = this.state === EnemyState.ATTACK ? 1 : 0;
    const tHurt = this.state === EnemyState.HURT ? 1 : 0;

    const lerpSpeed = 10;
    this.idleWeight = lerp(this.idleWeight, tIdle, dt * lerpSpeed);
    this.walkWeight = lerp(this.walkWeight, tWalk, dt * lerpSpeed);
    
    // Fast snap for attacks/hurt
    this.attackWeight = lerp(this.attackWeight, tAttack, dt * 15);
    this.hurtWeight = lerp(this.hurtWeight, tHurt, dt * 20);
    this.deadWeight = 0;

    this.applyIdle(this.idleWeight);
    this.applyWalk(this.walkWeight);
    this.applyAttack(this.attackWeight);
    this.applyHurt(this.hurtWeight);
  }

  private applyIdle(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 2.0;
    
    // Yokai hunch
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.4, weight);
    this.rig.chest.rotation.x = lerp(this.rig.chest.rotation.x, 0.2, weight);
    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, -0.3 + Math.sin(t*0.5)*0.05, weight);
    
    // Breathing
    this.rig.chest.position.y = 0.25 + Math.sin(t) * 0.03 * weight;

    // Relaxed arms
    this.rig.leftUpperArm.rotation.set(0.1, 0, 0.2 * weight);
    this.rig.rightUpperArm.rotation.set(0.1, 0, -0.2 * weight);
    this.rig.leftLowerArm.rotation.x = -0.2 * weight;
    this.rig.rightLowerArm.rotation.x = -0.2 * weight;
  }

  private applyWalk(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 8.0;

    // Asymmetrical limp/hunch walk
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.5, weight);
    this.rig.pelvis.position.y = 1.0 - Math.abs(Math.sin(t)) * 0.1 * weight;

    const stride = 0.7;
    const lLeg = Math.sin(t) * stride;
    const rLeg = Math.sin(t + Math.PI) * stride;

    this.rig.leftUpperLeg.rotation.x = lLeg * weight;
    this.rig.rightUpperLeg.rotation.x = rLeg * weight;
    
    // Dragging arms
    this.rig.leftUpperArm.rotation.x = -lLeg * 0.3 * weight;
    this.rig.rightUpperArm.rotation.x = -rLeg * 0.3 * weight;
  }

  private applyAttack(weight: number): void {
    if (weight <= 0.01) return;
    
    const windup = 0.4;
    const activeEnd = 0.6;
    
    // Procedural keyframes based on stateTime
    if (this.stateTime < windup) {
      // Windup - pull arms back, twist spine
      const p = this.stateTime / windup;
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, 0.5, p * weight);
      this.rig.rightUpperArm.rotation.set(0.5, 0, -1.0 * weight);
      this.rig.rightUpperArm.rotation.x = lerp(this.rig.rightUpperArm.rotation.x, -1.0, p * weight);
      this.rig.leftUpperArm.rotation.set(-0.5, 0, 0.5 * weight);
    } else if (this.stateTime < activeEnd) {
      // Strike - throw arms forward, twist spine back
      const p = (this.stateTime - windup) / (activeEnd - windup);
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, -0.5, p * weight);
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.8, p * weight);
      this.rig.rightUpperArm.rotation.set(-1.5 * weight, 0, -0.2 * weight);
      this.rig.leftUpperArm.rotation.set(-1.0 * weight, 0, 0.2 * weight);
    } else {
      // Recovery - hold strike pose momentarily before idle weight takes over
      this.rig.spine.rotation.y = lerp(this.rig.spine.rotation.y, 0, weight);
      this.rig.rightUpperArm.rotation.set(-1.0 * weight, 0, -0.2 * weight);
      this.rig.leftUpperArm.rotation.set(-0.5 * weight, 0, 0.2 * weight);
    }
  }

  private applyHurt(weight: number): void {
    if (weight <= 0.01) return;
    // Snap back
    const recoil = Math.sin(Math.min(this.stateTime * 15, Math.PI)) * 0.5;
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.3 * recoil, weight);
    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, -0.5 * recoil, weight);
    this.rig.leftUpperArm.rotation.z = lerp(this.rig.leftUpperArm.rotation.z, 0.5, weight);
    this.rig.rightUpperArm.rotation.z = lerp(this.rig.rightUpperArm.rotation.z, -0.5, weight);
  }

  private applyDead(weight: number): void {
    if (weight <= 0.01) return;
    // Collapse to the floor
    this.rig.pelvis.position.y = lerp(this.rig.pelvis.position.y, 0.2, weight);
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 1.5, weight); // Face plant
    this.rig.chest.rotation.x = lerp(this.rig.chest.rotation.x, 0.5, weight);
    
    // Limbs sprawl
    this.rig.leftUpperLeg.rotation.set(-1.0, 0.5, 0.5);
    this.rig.rightUpperLeg.rotation.set(-1.0, -0.5, -0.5);
    this.rig.leftUpperArm.rotation.set(-1.5, 0, 0.8);
    this.rig.rightUpperArm.rotation.set(-1.5, 0, -0.8);
  }
}
