import { CharacterRig } from '../characters/CharacterRig';
import { EnemyState } from './EnemyState';
import { lerp } from '../utils/MathUtils';

export class TenguAnimator {
  private rig: CharacterRig;
  private state: EnemyState = EnemyState.IDLE;
  
  private time: number = 0;
  private stateTime: number = 0;

  // Blending weights
  private hoverWeight: number = 1;
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

    // When dead, force all other weights to zero and only run death anim
    if (this.state === EnemyState.DEAD) {
      this.hoverWeight = 0;
      this.strafeWeight = 0;
      this.retreatWeight = 0;
      this.attackWeight = 0;
      this.hurtWeight = 0;
      this.deadWeight = lerp(this.deadWeight, 1, dt * 8);
      this.applyDead(this.deadWeight);
      return;
    }

    const tStrafe = this.state === EnemyState.STRAFE || this.state === EnemyState.WALK ? 1 : 0;
    const tRetreat = this.state === EnemyState.RETREAT ? 1 : 0;
    const tAttack = this.state === EnemyState.ATTACK ? 1 : 0;
    const tHurt = this.state === EnemyState.HURT ? 1 : 0;

    // Hover is active whenever not dead/hurt
    const tHover = (tHurt === 0) ? 1 : 0;

    const lerpSpeed = 10;
    this.hoverWeight = lerp(this.hoverWeight, tHover, dt * lerpSpeed);
    this.strafeWeight = lerp(this.strafeWeight, tStrafe, dt * lerpSpeed);
    this.retreatWeight = lerp(this.retreatWeight, tRetreat, dt * lerpSpeed);
    
    this.attackWeight = lerp(this.attackWeight, tAttack, dt * 15);
    this.hurtWeight = lerp(this.hurtWeight, tHurt, dt * 20);
    this.deadWeight = 0;

    this.applyHover(this.hoverWeight);
    this.applyMovement(this.strafeWeight, this.retreatWeight);
    this.applyAttack(this.attackWeight);
    this.applyHurt(this.hurtWeight);
  }

  private applyHover(weight: number): void {
    if (weight <= 0.01) return;
    const t = this.time * 8.0;
    
    // Core body bobbing
    this.rig.pelvis.position.y = 1.1 + Math.sin(this.time * 2) * 0.1 * weight;
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.1, weight);

    // Legs dangling
    this.rig.leftUpperLeg.rotation.set(0.1, 0, 0.1 * weight);
    this.rig.rightUpperLeg.rotation.set(0.1, 0, -0.1 * weight);
    this.rig.leftLowerLeg.rotation.x = 0.2 * weight;
    this.rig.rightLowerLeg.rotation.x = 0.2 * weight;

    // Arms out slightly
    this.rig.leftUpperArm.rotation.set(0.1, 0, 0.3 * weight);
    this.rig.rightUpperArm.rotation.set(0.1, 0, -0.3 * weight);

    // Procedural wings
    if (this.rig.leftWing && this.rig.rightWing) {
      // Flap cycle
      const flap = Math.sin(t);
      this.rig.leftWing.rotation.set(0, 0.2, flap * 0.4 * weight);
      this.rig.rightWing.rotation.set(0, -0.2, -flap * 0.4 * weight);
    }
  }

  private applyMovement(strafeWeight: number, retreatWeight: number): void {
    if (strafeWeight > 0.01) {
      // Tilt into the strafe/walk
      this.rig.spine.rotation.z = lerp(this.rig.spine.rotation.z, Math.sin(this.time * 4) * 0.1, strafeWeight);
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.3, strafeWeight);
    }
    
    if (retreatWeight > 0.01) {
      // Lean back
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.2, retreatWeight);
      if (this.rig.leftWing && this.rig.rightWing) {
        // Wings push forward
        this.rig.leftWing.rotation.y = lerp(this.rig.leftWing.rotation.y, 0.5, retreatWeight);
        this.rig.rightWing.rotation.y = lerp(this.rig.rightWing.rotation.y, -0.5, retreatWeight);
      }
    }
  }

  private applyAttack(weight: number): void {
    if (weight <= 0.01) return;
    
    // Windup -> active -> recovery based on stateTime
    const windup = 0.6; // Matches config
    
    if (this.stateTime < windup) {
      // Telegraph: wings pull back, arms gather energy
      const p = this.stateTime / windup;
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.3, p * weight);
      
      this.rig.leftUpperArm.rotation.set(-1.0 * weight, 0.5 * weight, 0.5 * weight);
      this.rig.rightUpperArm.rotation.set(-1.0 * weight, -0.5 * weight, -0.5 * weight);

      if (this.rig.leftWing && this.rig.rightWing) {
        this.rig.leftWing.rotation.set(0.3 * weight, -0.6 * weight, -0.2 * weight);
        this.rig.rightWing.rotation.set(0.3 * weight, 0.6 * weight, 0.2 * weight);
      }
    } else {
      // Fire: throw arms forward, wings flap hard
      this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 0.4, weight);
      
      this.rig.leftUpperArm.rotation.set(-1.5 * weight, 0, 0.2 * weight);
      this.rig.rightUpperArm.rotation.set(-1.5 * weight, 0, -0.2 * weight);

      if (this.rig.leftWing && this.rig.rightWing) {
        this.rig.leftWing.rotation.set(0, 0.5 * weight, 0.5 * weight);
        this.rig.rightWing.rotation.set(0, -0.5 * weight, -0.5 * weight);
      }
    }
  }

  private applyHurt(weight: number): void {
    if (weight <= 0.01) return;
    // Stagger, wings curl in
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, -0.5, weight);
    this.rig.head.rotation.x = lerp(this.rig.head.rotation.x, -0.4, weight);
    
    if (this.rig.leftWing && this.rig.rightWing) {
      this.rig.leftWing.rotation.set(0.5 * weight, -0.8 * weight, -0.5 * weight);
      this.rig.rightWing.rotation.set(0.5 * weight, 0.8 * weight, 0.5 * weight);
    }
  }

  private applyDead(weight: number): void {
    if (weight <= 0.01) return;
    // Fall out of the sky
    this.rig.pelvis.position.y = lerp(this.rig.pelvis.position.y, -0.2, weight); // Hit ground
    this.rig.spine.rotation.x = lerp(this.rig.spine.rotation.x, 1.5, weight); // Face plant
    
    this.rig.leftUpperLeg.rotation.set(-1.0 * weight, 0.5 * weight, 0.5 * weight);
    this.rig.rightUpperLeg.rotation.set(-1.0 * weight, -0.5 * weight, -0.5 * weight);
    
    if (this.rig.leftWing && this.rig.rightWing) {
      this.rig.leftWing.rotation.set(0, 0, -1.0 * weight); // Folded/broken
      this.rig.rightWing.rotation.set(0, 0, 1.0 * weight);
    }
  }
}
