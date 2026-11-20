import { ChapterId } from '../story/StoryChapter';
import { SECRETS, WARD } from '../world/WorldSecrets';
import { LevelId } from './LevelTypes';
import { NEUTRAL_THEME, ScoreTheme } from '../audio/ProceduralScore';
import { ColorGrade, DEFAULT_GRADE } from '../rendering/CinematicGrade';

export interface LevelInfo {
  id: LevelId;
  numeral: string;
  name: string;
  /** One line on what makes the level different. */
  hook: string;
  /** The rule this level adds, as the loading card explains it. */
  rule: string;
  enemies: string;
  boss: string;
  /** The objective shown on arrival. */
  objective: string;
  chapter: ChapterId;
  /** Where the level sits on the painted map, as percentages. */
  map: { x: number; y: number };
  /** Every secret in the level, for the map's tally. */
  secretIds: string[];
  /** The level's key and pace on the live score. */
  music: ScoreTheme;
  /** The level's colour grade. */
  grade: ColorGrade;
}

export const LEVELS: Record<LevelId, LevelInfo> = {
  courtyard: {
    id: 'courtyard',
    numeral: 'I',
    name: 'The Crimson Courtyard',
    hook: 'Where the climb begins, beneath the red gate.',
    rule: 'Learn the blade, the guard and the dash.',
    enemies: 'Yokai, Shadow Yokai, Tengu',
    boss: 'The Crimson Oni',
    objective: 'REACH THE CRIMSON GATE',
    chapter: ChapterId.CHAPTER_1,
    map: { x: 18, y: 76 },
    secretIds: [...SECRETS.map(s => s.id), WARD.id],
    music: NEUTRAL_THEME,
    grade: DEFAULT_GRADE,
  },
  village: {
    id: 'village',
    numeral: 'II',
    name: 'The Drowned Village',
    hook: 'Rain without end over a village the river swallowed.',
    rule: 'Shallow water slows you. Fight from the boardwalks and rooftops. Kappa grab: press Dash to break free.',
    enemies: 'Kappa, Shadow Yokai',
    boss: 'Umibōzu',
    objective: 'CROSS THE DROWNED VILLAGE',
    chapter: ChapterId.CHAPTER_5,
    map: { x: 36, y: 56 },
    secretIds: ['village_charm', 'village_scroll', 'village_cache'],
    // Low and slow, with the flute out front like wind over water
    music: { transpose: -2, tempo: 0.9, flute: 1.5, koto: 0.8, drums: 0.8 },
    // Cold blue-green, washed out by the rain
    grade: { shadows: [0.8, 1.0, 1.1], highlights: [0.94, 1.04, 1.06], saturation: 0.88, contrast: 0.32, lift: 0.01, vignette: 0.55 },
  },
  bamboo: {
    id: 'bamboo',
    numeral: 'III',
    name: 'The Bamboo Labyrinth',
    hook: 'A maze of green dark, where the wind has teeth.',
    rule: 'It is dark. Your lantern lights only a little way. Kamaitachi strike from hiding.',
    enemies: 'Kamaitachi, Lurking Shades',
    boss: 'Jorōgumo',
    objective: 'FIND THE WAY THROUGH THE LABYRINTH',
    chapter: ChapterId.CHAPTER_6,
    map: { x: 61, y: 64 },
    secretIds: ['bamboo_charm', 'bamboo_scroll', 'bamboo_cache'],
    // Higher and sparser: mostly breath, the drums held back
    music: { transpose: 3, tempo: 0.95, flute: 1.8, koto: 0.6, drums: 0.7 },
    // A sickly green, the blacks sunk deep
    grade: { shadows: [0.88, 1.08, 0.86], highlights: [1.0, 1.08, 0.84], saturation: 0.96, contrast: 0.42, lift: -0.012, vignette: 0.62 },
  },
  temple: {
    id: 'temple',
    numeral: 'IV',
    name: 'The Burning Temple',
    hook: 'The monks kept their vigil. Now they keep the fire.',
    rule: 'Fire spreads across the floor and old boards give way. When the master falls, run before it all comes down.',
    enemies: 'Possessed Monks, Tengu',
    boss: 'The Fallen Samurai',
    objective: 'REACH THE TEMPLE’S MAIN HALL',
    chapter: ChapterId.CHAPTER_7,
    map: { x: 74, y: 36 },
    secretIds: ['temple_charm', 'temple_scroll', 'temple_cache'],
    // Deep and driving, led by the drums
    music: { transpose: -5, tempo: 1.08, flute: 0.6, koto: 1.2, drums: 1.3 },
    // Orange and black: fire, and nothing else
    grade: { shadows: [1.0, 0.84, 0.72], highlights: [1.2, 0.98, 0.74], saturation: 1.22, contrast: 0.5, lift: -0.02, vignette: 0.6 },
  },
  gate: {
    id: 'gate',
    numeral: 'V',
    name: 'The Gate Itself',
    hook: 'The summit, where the gate opens onto Yomi.',
    rule: 'Gusts of wind push you and turn projectiles aside. A gauntlet of everything you have faced.',
    enemies: 'All of them',
    boss: 'The Maw of Yomi',
    objective: 'CLIMB TO THE GATE',
    chapter: ChapterId.CHAPTER_8,
    map: { x: 50, y: 14 },
    secretIds: ['gate_charm', 'gate_scroll'],
    // Everything at once, and a little faster
    music: { transpose: 1, tempo: 1.12, flute: 1.1, koto: 1.3, drums: 1.2 },
    // Crimson, from the gate's own light
    grade: { shadows: [1.04, 0.84, 0.92], highlights: [1.14, 0.92, 0.88], saturation: 1.12, contrast: 0.45, lift: -0.01, vignette: 0.58 },
  },
  // The Trials arena: not part of the journey, so never on the map
  arena: {
    id: 'arena',
    numeral: '✦',
    name: 'The Trial Arena',
    hook: 'A ring of stone above the clouds, where blades are tested.',
    rule: 'No shrines, no rest. Win, or fall.',
    enemies: 'All of them',
    boss: 'All of them',
    objective: 'SURVIVE',
    chapter: ChapterId.CHAPTER_8,
    map: { x: -100, y: -100 },
    secretIds: [],
    music: { transpose: -3, tempo: 1.15, flute: 0.8, koto: 1.2, drums: 1.4 },
    grade: { shadows: [1.02, 0.86, 0.94], highlights: [1.12, 0.96, 0.9], saturation: 1.1, contrast: 0.45, lift: -0.01, vignette: 0.55 },
  },
};
