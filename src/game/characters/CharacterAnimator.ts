import { CharacterRig } from './CharacterRig';
import { lerp } from '../utils/MathUtils';

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

  constructor(rig: CharacterRig) {
    this.rig = rig;
  }

  public setState(newState: AnimState): void {
    if (this.state === newState) return;
    this.state = newState;
  }

  public update(dt: number): void {
    this.time += dt;

    // Smoothly interpolate weights based on current state
    const targetWalk = this.state === AnimState.WALK ? 1 : 0;
    const targetIdle = this.state === AnimState.IDLE ? 1 : 0;
    
    this.walkWeight = lerp(this.walkWeight, targetWalk, dt * 10);
    this.idleWeight = lerp(this.idleWeight, targetIdle, dt * 10);

    this.applyIdle(this.idleWeight);
    this.applyWalk(this.walkWeight);
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
}
