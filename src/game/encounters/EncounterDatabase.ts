import * as THREE from 'three';
import { EncounterConfig } from './EncounterConfig';

export class EncounterDatabase {
  public static getAll(): EncounterConfig[] {
    return [
      {
        id: 'enc_courtyard',
        center: new THREE.Vector3(0, 0, 15),
        activationRadius: 15,
        leashRadius: 25,
        reward: 25,
        waves: [
          {
            enemies: [
              { type: 'BASIC_YOKAI', offset: new THREE.Vector3(-6, 0, 0) },
              { type: 'BASIC_YOKAI', offset: new THREE.Vector3(6, 0, 0) }
            ],
            delayAfterComplete: 0
          }
        ]
      },
      {
        id: 'enc_forest_1',
        center: new THREE.Vector3(0, 0, -25),
        activationRadius: 12,
        leashRadius: 20,
        reward: 20,
        waves: [
          {
            enemies: [
              { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(0, 0, 0) }
            ],
            delayAfterComplete: 0
          }
        ]
      },
      {
        id: 'enc_forest_2',
        center: new THREE.Vector3(0, 0, -45),
        activationRadius: 12,
        leashRadius: 20,
        reward: 35,
        waves: [
          {
            enemies: [
              { type: 'TENGU', offset: new THREE.Vector3(0, 0, 0) },
              { type: 'BASIC_YOKAI', offset: new THREE.Vector3(-5, 0, 5) }
            ],
            delayAfterComplete: 0
          }
        ]
      },
      {
        id: 'enc_temple',
        center: new THREE.Vector3(0, 0, -70),
        activationRadius: 14,
        leashRadius: 22,
        reward: 50,
        waves: [
          {
            enemies: [
              { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(-6, 0, 0) },
              { type: 'SHADOW_YOKAI', offset: new THREE.Vector3(6, 0, 0) }
            ],
            delayAfterComplete: 1.5
          },
          {
            enemies: [
              { type: 'TENGU', offset: new THREE.Vector3(0, 0, -4) }
            ],
            delayAfterComplete: 0
          }
        ]
      }
    ];
  }
}
