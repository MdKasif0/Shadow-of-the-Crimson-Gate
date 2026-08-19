import * as THREE from 'three';

// ─── Procedural Character Rig ────────────────────────────────────────────────
// A bone hierarchy using THREE.Group for procedural animation.
// Each "bone" is a Group that child meshes attach to.

export interface BoneMap {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Group;
  leftHand: THREE.Group;
  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Group;
  rightHand: THREE.Group;
  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftFoot: THREE.Group;
  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightFoot: THREE.Group;
}

export class CharacterRig {
  public bones: BoneMap;
  public group: THREE.Group; // The root group to add to scene

  constructor() {
    this.group = new THREE.Group();

    // Build hierarchy
    const b = (name: string): THREE.Group => {
      const g = new THREE.Group(); g.name = name; return g;
    };

    this.bones = {
      root: b('root'),
      pelvis: b('pelvis'),
      spine: b('spine'),
      chest: b('chest'),
      neck: b('neck'),
      head: b('head'),
      leftUpperArm: b('leftUpperArm'),
      leftLowerArm: b('leftLowerArm'),
      leftHand: b('leftHand'),
      rightUpperArm: b('rightUpperArm'),
      rightLowerArm: b('rightLowerArm'),
      rightHand: b('rightHand'),
      leftUpperLeg: b('leftUpperLeg'),
      leftLowerLeg: b('leftLowerLeg'),
      leftFoot: b('leftFoot'),
      rightUpperLeg: b('rightUpperLeg'),
      rightLowerLeg: b('rightLowerLeg'),
      rightFoot: b('rightFoot'),
    };

    // Connect the hierarchy
    this.group.add(this.bones.root);
    this.bones.root.add(this.bones.pelvis);
    this.bones.pelvis.add(this.bones.spine);
    this.bones.spine.add(this.bones.chest);
    this.bones.chest.add(this.bones.neck);
    this.bones.neck.add(this.bones.head);

    // Arms
    this.bones.chest.add(this.bones.leftUpperArm);
    this.bones.leftUpperArm.add(this.bones.leftLowerArm);
    this.bones.leftLowerArm.add(this.bones.leftHand);

    this.bones.chest.add(this.bones.rightUpperArm);
    this.bones.rightUpperArm.add(this.bones.rightLowerArm);
    this.bones.rightLowerArm.add(this.bones.rightHand);

    // Legs
    this.bones.pelvis.add(this.bones.leftUpperLeg);
    this.bones.leftUpperLeg.add(this.bones.leftLowerLeg);
    this.bones.leftLowerLeg.add(this.bones.leftFoot);

    this.bones.pelvis.add(this.bones.rightUpperLeg);
    this.bones.rightUpperLeg.add(this.bones.rightLowerLeg);
    this.bones.rightLowerLeg.add(this.bones.rightFoot);
  }

  /** Set default humanoid proportions */
  public setupProportions(height: number = 1.8): void {
    const h = height;
    this.bones.root.position.y = 0;
    this.bones.pelvis.position.y = h * 0.5;
    this.bones.spine.position.y = h * 0.08;
    this.bones.chest.position.y = h * 0.12;
    this.bones.neck.position.y = h * 0.08;
    this.bones.head.position.y = h * 0.04;

    // Arms positioned at shoulder height
    this.bones.leftUpperArm.position.set(-h * 0.14, h * 0.02, 0);
    this.bones.leftLowerArm.position.y = -h * 0.14;
    this.bones.leftHand.position.y = -h * 0.12;

    this.bones.rightUpperArm.position.set(h * 0.14, h * 0.02, 0);
    this.bones.rightLowerArm.position.y = -h * 0.14;
    this.bones.rightHand.position.y = -h * 0.12;

    // Legs from pelvis
    this.bones.leftUpperLeg.position.set(-h * 0.07, 0, 0);
    this.bones.leftLowerLeg.position.y = -h * 0.24;
    this.bones.leftFoot.position.y = -h * 0.24;

    this.bones.rightUpperLeg.position.set(h * 0.07, 0, 0);
    this.bones.rightLowerLeg.position.y = -h * 0.24;
    this.bones.rightFoot.position.y = -h * 0.24;
  }
}
