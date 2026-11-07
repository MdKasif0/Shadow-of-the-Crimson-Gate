import * as THREE from 'three';
import { Interactable } from './Interactable';
import { EventBus } from '../core/EventBus';

/** A shrine to rest at: heals, saves, opens the upgrade menu, and brings enemies back. */
export class ShrineInteraction implements Interactable {
  public radius = 4;
  public label: string;

  constructor(public id: string, public name: string, public position: THREE.Vector3) {
    this.label = `[E] Rest at the ${name}`;
  }

  public canInteract(): boolean {
    return true;
  }

  public onInteract(): void {
    EventBus.emit('shrineRest', { id: this.id });
    // The story still counts the mountain shrine as the one that matters
    if (this.id === 'main_shrine') EventBus.emit('shrineActivated', { id: this.id, position: this.position });
  }
}
