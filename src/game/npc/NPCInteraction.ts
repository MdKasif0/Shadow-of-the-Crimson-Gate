// ─── NPC Interaction ────────────────────────────────────────────────────────
// Adapter implementing the existing Interactable interface for NPCs.

import * as THREE from 'three';
import { Interactable } from '../interaction/Interactable';
import { NPC } from './NPC';

export class NPCInteraction implements Interactable {
  public id: string;
  public position: THREE.Vector3;
  public radius: number;
  public label: string;

  private npc: NPC;
  private onInteractCallback: () => void;

  constructor(npc: NPC, onInteract: () => void) {
    this.npc = npc;
    this.id = `npc_${npc.id}`;
    this.position = npc.position;
    this.radius = npc.interactRadius;
    this.label = `[E] Talk to ${npc.name}`;
    this.onInteractCallback = onInteract;
  }

  public onInteract(): void {
    this.onInteractCallback();
  }

  public canInteract(): boolean {
    return true;
  }
}
