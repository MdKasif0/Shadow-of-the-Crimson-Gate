import * as THREE from 'three';

export class GameScene {
  public scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    // Placeholder lighting to verify renderer works
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);

    // Placeholder cube to verify rendering and loop
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const cube = new THREE.Mesh(geometry, material);
    cube.name = 'TestCube';
    this.scene.add(cube);
  }

  public update(dt: number): void {
    // Basic test animation
    const cube = this.scene.getObjectByName('TestCube');
    if (cube) {
      cube.rotation.x += dt;
      cube.rotation.y += dt * 0.5;
    }
  }
}
