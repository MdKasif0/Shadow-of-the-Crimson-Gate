// ─── Objective ──────────────────────────────────────────────────────────────

import { ObjectiveType } from './ObjectiveType';

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;   // Display text, e.g. "Reach the abandoned shrine."
  zoneId?: string;        // For REACH_LOCATION
  encounterId?: string;   // For DEFEAT_ENEMIES
  npcId?: string;         // For INTERACT_NPC
  isComplete: boolean;
}
