// ─── Story Flags ────────────────────────────────────────────────────────────
// Central, data-driven flag store. All story booleans live here.

export interface StoryFlags {
  enteredMountain: boolean;
  metShrineKeeper: boolean;
  courtyardPurified: boolean;
  forestPurified: boolean;
  shrineActivated: boolean;
  templeReached: boolean;
  crimsonOniDefeated: boolean;
  endingStarted: boolean;
  completedCampaign: boolean;
}

export function createDefaultFlags(): StoryFlags {
  return {
    enteredMountain: false,
    metShrineKeeper: false,
    courtyardPurified: false,
    forestPurified: false,
    shrineActivated: false,
    templeReached: false,
    crimsonOniDefeated: false,
    endingStarted: false,
    completedCampaign: false,
  };
}
