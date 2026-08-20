import * as THREE from 'three';

export interface ZoneConfig {
  id: string;
  label: string;
  minZ: number;
  maxZ: number;
  fogDensity: number;
  fogColor: number;
  ambientColor: number;
  ambientIntensity: number;
}

const ZONES: ZoneConfig[] = [
  { id: 'ENTRANCE',         label: 'Entrance',          minZ: 40,  maxZ: 65,  fogDensity: 0.015, fogColor: 0x0a0e14, ambientColor: 0xccccff, ambientIntensity: 2.2 },
  { id: 'COURTYARD',        label: 'Sakura Courtyard',  minZ: 0,   maxZ: 40,  fogDensity: 0.018, fogColor: 0x060a10, ambientColor: 0xffffff, ambientIntensity: 2.0 },
  { id: 'SHRINE',           label: 'Shrine Area',       minZ: -20, maxZ: 0,   fogDensity: 0.020, fogColor: 0x080c12, ambientColor: 0xaaddcc, ambientIntensity: 1.8 },
  { id: 'FOREST',           label: 'Forest Path',       minZ: -50, maxZ: -20, fogDensity: 0.035, fogColor: 0x040810, ambientColor: 0x889999, ambientIntensity: 1.2 },
  { id: 'TEMPLE_APPROACH',  label: 'Temple Approach',   minZ: -85, maxZ: -50, fogDensity: 0.025, fogColor: 0x060a14, ambientColor: 0xccaaee, ambientIntensity: 1.5 },
];

export class ZoneManager {
  private currentZoneId: string = '';

  public getPlayerZone(playerPos: THREE.Vector3): ZoneConfig | null {
    for (const zone of ZONES) {
      if (playerPos.z >= zone.minZ && playerPos.z < zone.maxZ) {
        return zone;
      }
    }
    return ZONES[0]; // Default to entrance
  }

  public getBlendedAtmosphere(playerPos: THREE.Vector3): { fogDensity: number; fogColor: THREE.Color; ambientColor: THREE.Color; ambientIntensity: number } {
    const zone = this.getPlayerZone(playerPos);
    if (!zone) {
      return { fogDensity: 0.02, fogColor: new THREE.Color(0x060a10), ambientColor: new THREE.Color(0xffffff), ambientIntensity: 2.0 };
    }

    // Check if near a zone boundary for blending
    const distToMin = playerPos.z - zone.minZ;
    const distToMax = zone.maxZ - playerPos.z;
    const blendRange = 8; // Blend over 8 units

    let blendZone: ZoneConfig | null = null;
    let blendFactor = 0;

    if (distToMin < blendRange) {
      // Near lower boundary — blend with the zone below
      blendZone = ZONES.find(z => z.maxZ === zone.minZ) || null;
      blendFactor = 1 - (distToMin / blendRange);
    } else if (distToMax < blendRange) {
      // Near upper boundary — blend with the zone above
      blendZone = ZONES.find(z => z.minZ === zone.maxZ) || null;
      blendFactor = 1 - (distToMax / blendRange);
    }

    let fogDensity = zone.fogDensity;
    const fogColor = new THREE.Color(zone.fogColor);
    const ambientColor = new THREE.Color(zone.ambientColor);
    let ambientIntensity = zone.ambientIntensity;

    if (blendZone && blendFactor > 0) {
      fogDensity = THREE.MathUtils.lerp(zone.fogDensity, blendZone.fogDensity, blendFactor);
      fogColor.lerp(new THREE.Color(blendZone.fogColor), blendFactor);
      ambientColor.lerp(new THREE.Color(blendZone.ambientColor), blendFactor);
      ambientIntensity = THREE.MathUtils.lerp(zone.ambientIntensity, blendZone.ambientIntensity, blendFactor);
    }

    // Track zone changes
    if (zone.id !== this.currentZoneId) {
      this.currentZoneId = zone.id;
    }

    return { fogDensity, fogColor, ambientColor, ambientIntensity };
  }

  public getCurrentZoneId(): string {
    return this.currentZoneId;
  }
}
