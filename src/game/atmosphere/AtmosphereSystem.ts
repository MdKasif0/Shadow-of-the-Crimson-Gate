import * as THREE from 'three';

export class AtmosphereSystem {
  private petals: THREE.Mesh[] = [];
  private spirits: THREE.Mesh[] = [];
  private time: number = 0;
  private windAngle: number = 0;

  constructor(scene: THREE.Scene) {
    // Fog
    scene.fog = new THREE.FogExp2(0x0a1118, 0.025);
    scene.background = new THREE.Color(0x060a10);

    // Sakura petals
    const petalGeo = new THREE.PlaneGeometry(0.15, 0.12);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xffaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
    });
    for (let i = 0; i < 45; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(
        (Math.random() - 0.5) * 50, Math.random() * 15, (Math.random() - 0.5) * 50
      );
      petal.userData = {
        speedY: 0.5 + Math.random() * 1.2,
        speedX: 0.1 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        rotX: Math.random() * 2, rotY: Math.random() * 2,
      };
      scene.add(petal);
      this.petals.push(petal);
    }

    // Spirit particles
    const spiritGeo = new THREE.PlaneGeometry(0.3, 0.3);
    const spiritMat = new THREE.MeshBasicMaterial({
      color: 0x88ffff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (let i = 0; i < 15; i++) {
      const spirit = new THREE.Mesh(spiritGeo, spiritMat.clone());
      spirit.position.set(
        (Math.random() - 0.5) * 35, Math.random() * 5, (Math.random() - 0.5) * 35
      );
      spirit.userData = {
        speedY: 0.15 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        baseY: spirit.position.y,
      };
      scene.add(spirit);
      this.spirits.push(spirit);
    }
  }

  public update(dt: number): void {
    this.time += dt;
    this.windAngle += dt * 0.1;
    const windX = Math.cos(this.windAngle) * 0.3;
    const windZ = Math.sin(this.windAngle) * 0.15;

    this.petals.forEach(p => {
      const d = p.userData;
      p.position.y -= d.speedY * dt;
      p.position.x += (d.speedX + windX + Math.sin(this.time * 0.8 + d.phase) * 0.3) * dt;
      p.position.z += windZ * dt;
      p.rotation.x += d.rotX * dt;
      p.rotation.y += d.rotY * dt;
      if (p.position.y < -1) {
        p.position.y = 14 + Math.random() * 4;
        p.position.x = (Math.random() - 0.5) * 50;
        p.position.z = (Math.random() - 0.5) * 50;
      }
    });

    this.spirits.forEach(s => {
      const d = s.userData;
      s.position.y += d.speedY * dt;
      s.position.x += Math.sin(this.time * 0.5 + d.phase) * dt * 0.3;
      (s.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.3 * Math.sin(this.time * 1.5 + d.phase);
      s.rotation.x = -Math.PI / 4;
      if (s.position.y > 10) {
        s.position.y = -0.5;
        s.position.x = (Math.random() - 0.5) * 35;
        s.position.z = (Math.random() - 0.5) * 35;
      }
    });
  }
}
