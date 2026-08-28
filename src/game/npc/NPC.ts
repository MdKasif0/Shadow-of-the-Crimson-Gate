// ─── NPC ────────────────────────────────────────────────────────────────────
// Runtime NPC entity. Holds a CharacterRig, added to scene.

import * as THREE from 'three';
import { CharacterRig } from '../characters/CharacterRig';
import { NPCFactory } from './NPCFactory';
import { NPCDef } from './NPCData';
import { DialogueNode } from '../dialogue/DialogueNode';
import { StoryFlags } from '../story/StoryFlag';

export class NPC {
  public id: string;
  public name: string;
  public root: THREE.Group;
  public rig: CharacterRig;
  public position: THREE.Vector3;
  public interactRadius: number;

  private def: NPCDef;
  private idleTime: number = 0;

  constructor(def: NPCDef) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.interactRadius = def.interactRadius;

    this.rig = NPCFactory.create(def.modelType);
    this.root = this.rig.root;
    this.position = new THREE.Vector3(def.position.x, def.position.y, def.position.z);
    this.root.position.copy(this.position);
  }

  /** Get the appropriate dialogue based on story flags */
  public getDialogue(flags: StoryFlags): DialogueNode[] {
    if (this.def.dialogueAfterFlag && this.def.dialogueAlt) {
      const flagKey = this.def.dialogueAfterFlag as keyof StoryFlags;
      if (flags[flagKey]) {
        return this.def.dialogueAlt;
      }
    }
    return this.def.dialogue;
  }

  /** Subtle idle animation */
  public update(dt: number): void {
    this.idleTime += dt;

    // Gentle breathing / swaying
    const sway = Math.sin(this.idleTime * 1.2) * 0.02;
    this.rig.spine.rotation.z = sway;
    this.rig.head.rotation.z = sway * 0.5;

    // Staff sway
    if (this.rig.leftHand.children.length > 0) {
      this.rig.leftHand.children[0].rotation.z = Math.sin(this.idleTime * 0.8) * 0.03;
    }
  }

  /** Face toward the player */
  public lookAt(targetPos: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(targetPos, this.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.01) {
      const angle = Math.atan2(dir.x, dir.z);
      this.root.rotation.y = angle;
    }
  }
}
