import * as THREE from 'three';
import { EncounterConfig } from './EncounterConfig';

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);

/**
 * EncounterDatabase — Every fight on the mountain. Each mixes roles, so the order
 * you take enemies on matters: shields from behind, summoners first, and watch
 * for shades waiting on the path.
 */
export class EncounterDatabase {
  public static getAll(): EncounterConfig[] {
    return [
      {
        id: 'enc_courtyard',
        center: at(0, 15),
        activationRadius: 15,
        leashRadius: 25,
        reward: 25,
        waves: [
          {
            enemies: [
              { type: 'BASIC_YOKAI', offset: at(-6, 0) },
              { type: 'BASIC_YOKAI', offset: at(6, 0) },
              { type: 'SHIELDED_YOKAI', offset: at(0, -4) },
            ],
            delayAfterComplete: 1.5,
          },
          {
            // Chapter I's elite
            enemies: [{ type: 'BASIC_YOKAI', offset: at(0, -6), eliteName: 'Warden of the Courtyard' }],
            delayAfterComplete: 0,
          },
        ],
      },
      {
        id: 'enc_forest_1',
        center: at(0, -25),
        activationRadius: 12,
        leashRadius: 20,
        reward: 20,
        waves: [
          {
            enemies: [
              { type: 'SHADOW_YOKAI', offset: at(0, 0) },
              { type: 'BASIC_YOKAI', offset: at(-5, -3) },
              // Waits further up the path for the player to walk past
              { type: 'LURKING_SHADE', offset: at(3, -12) },
            ],
            delayAfterComplete: 0,
          },
        ],
      },
      {
        id: 'enc_forest_2',
        center: at(0, -45),
        activationRadius: 12,
        leashRadius: 20,
        reward: 35,
        hazard: { interval: 4.5, radius: 3, damage: 14 },
        waves: [
          {
            enemies: [
              { type: 'SHADOW_CALLER', offset: at(0, -7) },
              { type: 'TENGU', offset: at(6, -3) },
              { type: 'BASIC_YOKAI', offset: at(-5, 4) },
            ],
            delayAfterComplete: 1.5,
          },
          {
            // Chapter II's elite
            enemies: [{ type: 'SHADOW_YOKAI', offset: at(0, -5), eliteName: 'The Shadow Matriarch' }],
            delayAfterComplete: 0,
          },
        ],
      },
      {
        id: 'enc_temple',
        center: at(0, -70),
        activationRadius: 14,
        leashRadius: 22,
        reward: 50,
        hazard: { interval: 5, radius: 3.4, damage: 18 },
        waves: [
          {
            enemies: [
              { type: 'SHIELDED_YOKAI', offset: at(-5, 0) },
              { type: 'SHIELDED_YOKAI', offset: at(5, 0) },
              { type: 'SHADOW_CALLER', offset: at(0, -6) },
            ],
            delayAfterComplete: 1.5,
          },
          {
            enemies: [
              { type: 'TENGU', offset: at(-6, -4) },
              { type: 'TENGU', offset: at(6, -4) },
              { type: 'LURKING_SHADE', offset: at(0, 6) },
            ],
            delayAfterComplete: 1.5,
          },
          {
            // Chapter III's elite
            enemies: [{ type: 'TENGU', offset: at(0, -5), eliteName: 'The Tengu Captain' }],
            delayAfterComplete: 0,
          },
        ],
      },
      {
        // Off the forest path, for those who go looking
        id: 'enc_optional_hollow',
        center: at(10.5, -32.5),
        activationRadius: 6,
        leashRadius: 14,
        reward: 80,
        charmReward: 'blood_lotus',
        isOptional: true,
        hazard: { interval: 3.5, radius: 2.8, damage: 16 },
        waves: [
          {
            enemies: [
              { type: 'SHADOW_YOKAI', offset: at(0, -2), eliteName: 'The Hollow Widow' },
              { type: 'LURKING_SHADE', offset: at(4, 3) },
              { type: 'LURKING_SHADE', offset: at(-4, 3) },
            ],
            delayAfterComplete: 0,
          },
        ],
      },
    ];
  }
}
