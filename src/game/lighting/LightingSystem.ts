import * as THREE from 'three';

export class LightingSystem {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    // 1. Ambient Fill Light (Brighter for debugging)
    const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
    this.scene.add(ambientLight);

    // 2. Main Moonlight (Directional Light casting shadows)
    const moonlight = new THREE.DirectionalLight(0xffffff, 3.0);
    moonlight.position.set(-20, 30, -10); // Angled from top-left-back
    moonlight.castShadow = true;

    // Optimize shadow map
    moonlight.shadow.mapSize.width = 2048;
    moonlight.shadow.mapSize.height = 2048;
    moonlight.shadow.camera.near = 0.5;
    moonlight.shadow.camera.far = 100;
    const d = 25;
    moonlight.shadow.camera.left = -d;
    moonlight.shadow.camera.right = d;
    moonlight.shadow.camera.top = d;
    moonlight.shadow.camera.bottom = -d;
    moonlight.shadow.bias = -0.0005;

    this.scene.add(moonlight);

    // 3. Lantern Point Lights (Warm gold/orange)
    // Placed roughly where the lanterns are instantiated in Environment
    const lanternPositions = [
      { x: -8, y: 1.5, z: -12 },
      { x: 8, y: 1.5, z: -10 },
      { x: -5, y: 1.5, z: 5 },
      { x: 6, y: 1.5, z: 8 }
    ];

    lanternPositions.forEach(pos => {
      const lanternLight = new THREE.PointLight(0xffaa44, 2.0, 10);
      lanternLight.position.set(pos.x, pos.y, pos.z);
      // We don't enable shadows on all point lights for performance.
      this.scene.add(lanternLight);
    });
  }
}
