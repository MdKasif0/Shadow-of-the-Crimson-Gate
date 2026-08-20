import * as THREE from 'three';
import { AtmosphereSystem } from '../atmosphere/AtmosphereSystem';
import { EventBus } from '../core/EventBus';
import { EncounterManager } from '../encounters/EncounterManager';
import { lerp } from '../utils/MathUtils';

export interface ZoneConfig {
  id: string;
  bounds: THREE.Box3;
  encounterId?: string; // If this zone triggers an encounter
  objective: string;
  atmosphere: {
    fogDensity: number;
    fogColor: THREE.Color;
    ambientColor: THREE.Color;
    directionalIntensity: number;
  };
}

export class ZoneManager {
  private zones: ZoneConfig[] = [];
  private activeZoneId: string | null = null;
  private atmosphere: AtmosphereSystem;
  private encounterManager: EncounterManager;

  // Track the current interpolated atmosphere values
  private currentFogDensity: number = 0.02;
  private currentFogColor: THREE.Color = new THREE.Color(0x060a10);
  private currentAmbientColor: THREE.Color = new THREE.Color(0xffffff);
  private currentDirIntensity: number = 5.0;

  constructor(atmosphere: AtmosphereSystem, encounterManager: EncounterManager) {
    this.atmosphere = atmosphere;
    this.encounterManager = encounterManager;

    // Define Zones based on Z axis mostly (Entrance to Temple)
    this.zones = [
      {
        id: 'ENTRANCE',
        bounds: new THREE.Box3(new THREE.Vector3(-50, -50, 5), new THREE.Vector3(50, 50, 40)),
        objective: 'PASS THROUGH THE TORII GATE',
        atmosphere: {
          fogDensity: 0.015,
          fogColor: new THREE.Color(0x060a10),
          ambientColor: new THREE.Color(0xffffff),
          directionalIntensity: 5.0
        }
      },
      {
        id: 'COURTYARD',
        bounds: new THREE.Box3(new THREE.Vector3(-20, -50, -10), new THREE.Vector3(20, 50, 5)),
        encounterId: 'COURTYARD_BATTLE',
        objective: 'PURIFY THE COURTYARD',
        atmosphere: {
          fogDensity: 0.02,
          fogColor: new THREE.Color(0x060a10),
          ambientColor: new THREE.Color(0xeeeeff),
          directionalIntensity: 4.5
        }
      },
      {
        id: 'SHRINE',
        bounds: new THREE.Box3(new THREE.Vector3(-40, -50, -30), new THREE.Vector3(-10, 50, -10)),
        encounterId: 'SHRINE_BATTLE',
        objective: 'CLEANSE THE OLD SHRINE',
        atmosphere: {
          fogDensity: 0.025,
          fogColor: new THREE.Color(0x040608),
          ambientColor: new THREE.Color(0xaaaacc),
          directionalIntensity: 3.5
        }
      },
      {
        id: 'FOREST',
        bounds: new THREE.Box3(new THREE.Vector3(10, -50, -40), new THREE.Vector3(40, 50, -10)),
        encounterId: 'FOREST_BATTLE',
        objective: 'NAVIGATE THE SHADOW FOREST',
        atmosphere: {
          fogDensity: 0.04, // Dense fog
          fogColor: new THREE.Color(0x020305), // Darker
          ambientColor: new THREE.Color(0x666688), // Very dark
          directionalIntensity: 2.0 // Minimal moonlight
        }
      },
      {
        id: 'TEMPLE_APPROACH',
        bounds: new THREE.Box3(new THREE.Vector3(-20, -50, -70), new THREE.Vector3(20, 50, -40)),
        encounterId: 'TEMPLE_BATTLE',
        objective: 'APPROACH THE CRIMSON GATE',
        atmosphere: {
          fogDensity: 0.025,
          fogColor: new THREE.Color(0x1a0a0a), // Crimson tint
          ambientColor: new THREE.Color(0xffcccc),
          directionalIntensity: 6.0 // Bright moonlight again
        }
      }
    ];
  }

  public update(dt: number, playerPos: THREE.Vector3): void {
    let currentZone: ZoneConfig | null = null;
    
    // Find which zone the player is in
    for (const zone of this.zones) {
      if (zone.bounds.containsPoint(playerPos)) {
        currentZone = zone;
        break;
      }
    }

    if (currentZone && currentZone.id !== this.activeZoneId) {
      this.activeZoneId = currentZone.id;
      EventBus.emit('setObjective', { text: currentZone.objective });
      
      // We do not auto-trigger encounters here directly to allow EncounterManager's 
      // activation radius to naturally trigger them as player walks deeper into the zone,
      // but we could also broadcast a 'ZoneEntered' event.
    }

    // Interpolate Atmosphere
    if (currentZone) {
      const targetAtm = currentZone.atmosphere;
      const lerpSpeed = 0.5 * dt;

      this.currentFogDensity = lerp(this.currentFogDensity, targetAtm.fogDensity, lerpSpeed);
      this.currentDirIntensity = lerp(this.currentDirIntensity, targetAtm.directionalIntensity, lerpSpeed);
      
      this.currentFogColor.lerp(targetAtm.fogColor, lerpSpeed);
      this.currentAmbientColor.lerp(targetAtm.ambientColor, lerpSpeed);

      // Apply to actual atmosphere
      // Apply to actual atmosphere
      this.atmosphere.setFogParams(this.currentFogColor, this.currentFogDensity);
      
      // Note: We need a way to modify ambient/directional light intensities cleanly.
      // For now, if we emit an event, LightingSystem can pick it up.
      EventBus.emit('atmosphereChanged', {
        ambientColor: this.currentAmbientColor,
        directionalIntensity: this.currentDirIntensity
      });
    }
  }
}
