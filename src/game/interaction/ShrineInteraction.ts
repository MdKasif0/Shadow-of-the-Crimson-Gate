import * as THREE from 'three';
import { Interactable } from './Interactable';
import { EventBus } from '../core/EventBus';

export class ShrineInteraction implements Interactable {
  public id = 'main_shrine';
  public position: THREE.Vector3;
  public radius = 3.5;
  public label = "Press E to Rest";

  constructor(position: THREE.Vector3) {
    this.position = position;
  }

  public canInteract(): boolean {
    return true; // Shrine is always available to rest
  }

  public onInteract(): void {
    EventBus.emit('shrineActivated', { id: this.id, position: this.position });
  }
}
