import * as THREE from 'three';
import { BasicYokai } from '../enemies/BasicYokai';
import { Enemy } from '../enemies/Enemy';

export class EnemySpawner {
  public spawnBasicYokai(scene: THREE.Scene, position: THREE.Vector3): Enemy {
    const yokai = new BasicYokai('yokai_1');
    yokai.root.position.copy(position);
    scene.add(yokai.root);
    return yokai;
  }
}
