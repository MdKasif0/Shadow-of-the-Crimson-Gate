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
  /** Promised the Shrine Keeper to cleanse the mountain, and was given his bell. */
  keeperTrusted: boolean;
  /** Asked the Shrine Keeper for payment instead. */
  keeperPaid: boolean;
  akaneMet: boolean;
  /** Shared essence with Akane when she was wounded. */
  akaneTrusted: boolean;
  /** Asked Akane to fight the Oni alongside you. */
  akaneAlly: boolean;
  akaneRefused: boolean;
  /** The ending chosen at the Crimson Heart. */
  endingPurify: boolean;
  endingClaim: boolean;
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
    keeperTrusted: false,
    keeperPaid: false,
    akaneMet: false,
    akaneTrusted: false,
    akaneAlly: false,
    akaneRefused: false,
    endingPurify: false,
    endingClaim: false,
  };
}
