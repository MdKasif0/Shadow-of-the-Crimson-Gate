import * as THREE from 'three';
import { BasicYokai } from '../enemies/BasicYokai';
import { ShadowYokai } from '../enemies/ShadowYokai';
import { Tengu } from '../enemies/Tengu';
import { Enemy } from '../enemies/Enemy';

export class EnemySpawner {
  public spawnBasicYokai(scene: THREE.Scene, position: THREE.Vector3, id: string = 'yokai_1'): Enemy {
    const yokai = new BasicYokai(id);
    yokai.root.position.copy(position);
    scene.add(yokai.root);
    return yokai;
  }

  public spawnShadowYokai(scene: THREE.Scene, position: THREE.Vector3, id: string = 'shadow_1'): Enemy {
    const shadow = new ShadowYokai(id);
    shadow.root.position.copy(position);
    scene.add(shadow.root);
    return shadow;
  }

  public spawnTengu(scene: THREE.Scene, position: THREE.Vector3, id: string = 'tengu_1'): Enemy {
    const tengu = new Tengu(id);
    tengu.root.position.copy(position);
    scene.add(tengu.root);
    return tengu;
  }
}
