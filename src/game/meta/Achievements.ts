import { EventBus } from '../core/EventBus';
import { Records } from './Records';

export interface AchievementDef {
  id: string;
  title: string;
  text: string;
  /** For counters: the lifetime counter it watches, and the goal. */
  counter?: string;
  goal?: number;
  /** Kept secret until earned. */
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', title: 'First Cut', text: 'Cut down your first yokai.' },
  { id: 'kills_500', title: 'Yokai Bane', text: 'Cut down 500 yokai.', counter: 'kills', goal: 500 },
  { id: 'parry_50', title: 'Unbroken Guard', text: 'Parry 50 attacks.', counter: 'parries', goal: 50 },
  { id: 'dodge_100', title: 'Water Through Fingers', text: 'Perfectly dodge 100 attacks.', counter: 'perfectDodges', goal: 100 },
  { id: 'execute_25', title: 'The Last Mercy', text: 'Perform 25 executions.', counter: 'executions', goal: 25 },
  { id: 'oni_no_heal', title: 'Untouched by Mercy', text: 'Beat the Crimson Oni without healing.' },
  { id: 'clear_courtyard', title: 'The Lock Breaks', text: 'Clear the Crimson Courtyard.' },
  { id: 'clear_village', title: 'The Tide Recedes', text: 'Clear the Drowned Village.' },
  { id: 'clear_bamboo', title: 'Out of the Maze', text: 'Clear the Bamboo Labyrinth.' },
  { id: 'clear_temple', title: 'Walked Through Fire', text: 'Escape the Burning Temple.' },
  { id: 'clear_gate', title: 'The Gate Is Closed', text: 'Defeat the Maw of Yomi.' },
  { id: 'flawless', title: 'Flawless', text: 'Clear a level without falling once.' },
  { id: 'escape_fast', title: 'With Time to Spare', text: 'Escape the Burning Temple with 15 seconds left.' },
  { id: 'secrets_all', title: 'Nothing Left Hidden', text: 'Find every secret in a single journey.' },
  { id: 'ending_purify', title: 'Dawn', text: 'Shatter the heart of the gate.', hidden: true },
  { id: 'ending_claim', title: 'The Crimson Lord', text: 'Take the heart’s fire for yourself.', hidden: true },
  { id: 'ending_akane', title: 'Two Blades at Dawn', text: 'Finish the journey with Akane at your side.', hidden: true },
  { id: 'crimson_clear', title: 'Crimson Master', text: 'Finish the game on Crimson difficulty.' },
  { id: 'ng_plus', title: 'Again, and Harder', text: 'Begin New Game+.' },
  { id: 'boss_rush', title: 'Trial of Five', text: 'Finish the Boss Rush.' },
  { id: 'arena_10', title: 'Tenth Wave', text: 'Survive ten waves in the Arena.' },
];

/** Grants an achievement, announcing it the first time. */
export function grantAchievement(id: string): void {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def || !Records.grantAchievement(id)) return;
  EventBus.emit('achievementUnlocked', { id, title: def.title, text: def.text });
}

/** Counts towards a lifetime counter, granting anything that reaches its goal. */
export function countTowards(counter: string, amount = 1): void {
  const value = Records.addToCounter(counter, amount);
  for (const def of ACHIEVEMENTS) {
    if (def.counter === counter && def.goal !== undefined && value >= def.goal) grantAchievement(def.id);
  }
}

/** Listens for the moments that count, everywhere in the game. */
export function bindAchievementTracking(): void {
  EventBus.on('enemyDeath', () => {
    grantAchievement('first_blood');
    countTowards('kills');
  });
  EventBus.on('parry', () => countTowards('parries'));
  EventBus.on('perfectDodge', () => countTowards('perfectDodges'));
  EventBus.on('executionStarted', () => countTowards('executions'));
}
