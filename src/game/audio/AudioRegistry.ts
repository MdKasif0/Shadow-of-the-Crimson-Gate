/**
 * AudioRegistry — Centralized audio ID → file path mapping.
 * All gameplay code references AudioId enums, never raw paths.
 */

// ─── Audio Categories ──────────────────────────────────────────────────────

export enum AudioCategory {
  MUSIC     = 'MUSIC',
  AMBIENCE  = 'AMBIENCE',
  PLAYER    = 'PLAYER',
  SWORD     = 'SWORD',
  ENEMY     = 'ENEMY',
  BOSS      = 'BOSS',
  SHRINE    = 'SHRINE',
  ENVIRONMENT = 'ENVIRONMENT',
  VFX       = 'VFX',
  UI        = 'UI',
  SYSTEM    = 'SYSTEM',
}

// ─── Audio Priority ────────────────────────────────────────────────────────

export enum AudioPriority {
  CRITICAL = 4,
  HIGH     = 3,
  NORMAL   = 2,
  LOW      = 1,
}

// ─── Audio IDs ─────────────────────────────────────────────────────────────

export enum AudioId {
  // Music
  MUSIC_MAIN_THEME     = 'music_main_theme',
  MUSIC_EXPLORATION    = 'music_exploration',
  MUSIC_VICTORY        = 'music_victory',

  // Ambience
  AMB_FOREST_NIGHT     = 'amb_forest_night',
  AMB_FOREST_WIND      = 'amb_forest_wind',
  AMB_CRICKETS         = 'amb_crickets',
  AMB_NIGHT_INSECTS    = 'amb_night_insects',
  AMB_MOUNTAIN_WIND    = 'amb_mountain_wind',
  AMB_WIND_SOFT        = 'amb_wind_soft',
  AMB_WIND_MEDIUM      = 'amb_wind_medium',
  AMB_WIND_STRONG      = 'amb_wind_strong',
  AMB_WIND_CHIME       = 'amb_wind_chime',
  AMB_DISTANT_BIRDS    = 'amb_distant_birds',
  AMB_DISTANT_CREATURE = 'amb_distant_creature',
  AMB_DISTANT_WIND     = 'amb_distant_wind',

  // Player
  FOOTSTEP_STONE_01    = 'footstep_stone_01',
  FOOTSTEP_STONE_02    = 'footstep_stone_02',
  FOOTSTEP_GRASS_01    = 'footstep_grass_01',
  FOOTSTEP_GRASS_02    = 'footstep_grass_02',
  PLAYER_DASH          = 'player_dash',
  PLAYER_LANDING       = 'player_landing',

  // Sword
  SWORD_DRAW           = 'sword_draw',
  SWORD_SHEATH         = 'sword_sheath',
  SWORD_SWING_01       = 'sword_swing_01',
  SWORD_SWING_02       = 'sword_swing_02',
  SWORD_SWING_03       = 'sword_swing_03',
  SWORD_SWING_HEAVY    = 'sword_swing_heavy',
  SWORD_HIT_01         = 'sword_hit_01',
  SWORD_HIT_02         = 'sword_hit_02',
  SWORD_HIT            = 'sword_hit',
  SWORD_CLASH          = 'sword_clash',

  // Yokai
  YOKAI_IDLE           = 'yokai_idle',
  YOKAI_GROWL_01       = 'yokai_growl_01',
  YOKAI_GROWL_02       = 'yokai_growl_02',
  YOKAI_ATTACK         = 'yokai_attack',
  YOKAI_HURT           = 'yokai_hurt',
  YOKAI_DEATH          = 'yokai_death',

  // Shadow Yokai
  SHADOW_IDLE          = 'shadow_idle',
  SHADOW_WHISPER       = 'shadow_whisper',
  SHADOW_TELEPORT      = 'shadow_teleport',
  SHADOW_ATTACK        = 'shadow_attack',
  SHADOW_HIT           = 'shadow_hit',
  SHADOW_HURT          = 'shadow_hurt',
  SHADOW_DEATH         = 'shadow_death',
  SHADOW_ENERGY        = 'shadow_energy',

  // Tengu
  TENGU_WING_FLAP_01   = 'tengu_wing_flap_01',
  TENGU_WING_FLAP_02   = 'tengu_wing_flap_02',
  TENGU_WING_FLAP_HEAVY = 'tengu_wing_flap_heavy',
  TENGU_CALL           = 'tengu_call',
  TENGU_ATTACK         = 'tengu_attack',
  TENGU_PROJECTILE     = 'tengu_projectile',
  TENGU_PROJECTILE_IMPACT = 'tengu_projectile_impact',
  TENGU_HURT           = 'tengu_hurt',
  TENGU_DEATH          = 'tengu_death',

  // Boss — Crimson Oni
  BOSS_IDLE            = 'boss_idle',
  BOSS_GROWL_01        = 'boss_growl_01',
  BOSS_GROWL_02        = 'boss_growl_02',
  BOSS_ROAR_01         = 'boss_roar_01',
  BOSS_ROAR_02         = 'boss_roar_02',
  BOSS_ATTACK          = 'boss_attack',
  BOSS_HURT            = 'boss_hurt',
  BOSS_DEATH           = 'boss_death',
  BOSS_CHARGE          = 'boss_charge',
  BOSS_SMASH           = 'boss_smash',
  BOSS_PHASE_2         = 'boss_phase_2',
  BOSS_PHASE_3         = 'boss_phase_3',

  // Shrine
  SHRINE_ACTIVATE      = 'shrine_activate',
  SHRINE_PURIFY        = 'shrine_purify',
  SHRINE_COMPLETE      = 'shrine_complete',
  SPIRIT_CHIME         = 'spirit_chime',
  HEALING_CHIME        = 'healing_chime',

  // Environment
  ENV_BRANCH_CREAK     = 'env_branch_creak',
  ENV_LEAVES_RUSTLE    = 'env_leaves_rustle',

  // UI
  UI_HOVER             = 'ui_hover',
  UI_SELECT            = 'ui_select',
  UI_CONFIRM           = 'ui_confirm',
  UI_BACK              = 'ui_back',
  UI_ERROR             = 'ui_error',
  UI_DIALOGUE          = 'ui_dialogue',
  UI_NOTIFICATION      = 'ui_notification',

  // System
  SYS_GAME_OVER        = 'sys_game_over',
  SYS_GAME_START       = 'sys_game_start',
  SYS_LEVEL_UP         = 'sys_level_up',

  // ─── Future Hooks (files not yet downloaded) ─────────────────────────
  VFX_SPIRIT           = 'vfx_spirit',
  VFX_MAGIC            = 'vfx_magic',
  VFX_ENERGY_PULSE     = 'vfx_energy_pulse',
  VFX_SUPERNATURAL     = 'vfx_supernatural',
  ARENA_GROUND_CRACK   = 'arena_ground_crack',
  ARENA_GROUND_IMPACT  = 'arena_ground_impact',
  ARENA_SHOCKWAVE      = 'arena_shockwave',
  ARENA_RUMBLE         = 'arena_rumble',
  ARENA_CRIMSON_ENERGY = 'arena_crimson_energy',
  ARENA_BOSS_WARNING   = 'arena_boss_warning',
}

// ─── Registry Entry ────────────────────────────────────────────────────────

export interface AudioEntry {
  path: string;
  category: AudioCategory;
  priority: AudioPriority;
  loop: boolean;
  volume: number;       // default volume multiplier (0–1)
  optional: boolean;    // if true, missing file won't warn
}

// ─── The Registry ──────────────────────────────────────────────────────────

const BASE = '/assets/audio';

export const AUDIO_REGISTRY: Record<AudioId, AudioEntry> = {
  // ── Music ──
  [AudioId.MUSIC_MAIN_THEME]:    { path: `${BASE}/music/main_theme.wav`,    category: AudioCategory.MUSIC,  priority: AudioPriority.HIGH,    loop: true,  volume: 0.35, optional: false },
  [AudioId.MUSIC_EXPLORATION]:   { path: `${BASE}/music/exploration.wav`,   category: AudioCategory.MUSIC,  priority: AudioPriority.HIGH,    loop: true,  volume: 0.3,  optional: false },
  [AudioId.MUSIC_VICTORY]:       { path: `${BASE}/music/victory.wav`,       category: AudioCategory.MUSIC,  priority: AudioPriority.CRITICAL,loop: false, volume: 0.5,  optional: false },

  // ── Ambience ──
  [AudioId.AMB_FOREST_NIGHT]:    { path: `${BASE}/ambience/forest_night_loop.wav`, category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.25, optional: false },
  [AudioId.AMB_FOREST_WIND]:     { path: `${BASE}/ambience/forest_wind.wav`,       category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.2,  optional: false },
  [AudioId.AMB_CRICKETS]:        { path: `${BASE}/ambience/crickets_loop.wav`,     category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.15, optional: false },
  [AudioId.AMB_NIGHT_INSECTS]:   { path: `${BASE}/ambience/night_insects.wav`,     category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.12, optional: false },
  [AudioId.AMB_MOUNTAIN_WIND]:   { path: `${BASE}/ambience/mountain_wind.wav`,     category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.2,  optional: false },
  [AudioId.AMB_WIND_SOFT]:       { path: `${BASE}/ambience/wind_soft.wav`,         category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.15, optional: false },
  [AudioId.AMB_WIND_MEDIUM]:     { path: `${BASE}/ambience/wind_medium.wav`,       category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.2,  optional: false },
  [AudioId.AMB_WIND_STRONG]:     { path: `${BASE}/ambience/wind_strong.wav`,       category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.25, optional: false },
  [AudioId.AMB_WIND_CHIME]:      { path: `${BASE}/ambience/wind_chime.wav`,        category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: false,volume: 0.2,  optional: false },
  [AudioId.AMB_DISTANT_BIRDS]:   { path: `${BASE}/ambience/distant_birds.wav`,     category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: false,volume: 0.15, optional: false },
  [AudioId.AMB_DISTANT_CREATURE]:{ path: `${BASE}/ambience/distant_creature.wav`,  category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: false,volume: 0.1,  optional: false },
  [AudioId.AMB_DISTANT_WIND]:    { path: `${BASE}/ambience/distant_wind.wav`,      category: AudioCategory.AMBIENCE, priority: AudioPriority.LOW, loop: true, volume: 0.15, optional: false },

  // ── Player ──
  [AudioId.FOOTSTEP_STONE_01]:   { path: `${BASE}/player/footstep_stone_01.wav`, category: AudioCategory.PLAYER, priority: AudioPriority.LOW,    loop: false, volume: 0.3, optional: false },
  [AudioId.FOOTSTEP_STONE_02]:   { path: `${BASE}/player/footstep_stone_02.wav`, category: AudioCategory.PLAYER, priority: AudioPriority.LOW,    loop: false, volume: 0.3, optional: false },
  [AudioId.FOOTSTEP_GRASS_01]:   { path: `${BASE}/player/footstep_grass_01.wav`, category: AudioCategory.PLAYER, priority: AudioPriority.LOW,    loop: false, volume: 0.25,optional: false },
  [AudioId.FOOTSTEP_GRASS_02]:   { path: `${BASE}/player/footstep_grass_02.wav`, category: AudioCategory.PLAYER, priority: AudioPriority.LOW,    loop: false, volume: 0.25,optional: false },
  [AudioId.PLAYER_DASH]:         { path: `${BASE}/player/dash.wav`,              category: AudioCategory.PLAYER, priority: AudioPriority.NORMAL, loop: false, volume: 0.5, optional: false },
  [AudioId.PLAYER_LANDING]:      { path: `${BASE}/player/landing.wav`,           category: AudioCategory.PLAYER, priority: AudioPriority.LOW,    loop: false, volume: 0.35,optional: false },

  // ── Sword ──
  [AudioId.SWORD_DRAW]:          { path: `${BASE}/sword/draw.wav`,          category: AudioCategory.SWORD, priority: AudioPriority.NORMAL, loop: false, volume: 0.5,  optional: false },
  [AudioId.SWORD_SHEATH]:        { path: `${BASE}/sword/sheath.wav`,        category: AudioCategory.SWORD, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.SWORD_SWING_01]:      { path: `${BASE}/sword/swing_01.wav`,      category: AudioCategory.SWORD, priority: AudioPriority.NORMAL, loop: false, volume: 0.55, optional: false },
  [AudioId.SWORD_SWING_02]:      { path: `${BASE}/sword/swing_02.wav`,      category: AudioCategory.SWORD, priority: AudioPriority.NORMAL, loop: false, volume: 0.55, optional: false },
  [AudioId.SWORD_SWING_03]:      { path: `${BASE}/sword/swing_03.wav`,      category: AudioCategory.SWORD, priority: AudioPriority.NORMAL, loop: false, volume: 0.55, optional: false },
  [AudioId.SWORD_SWING_HEAVY]:   { path: `${BASE}/sword/swing_heavy.wav`,   category: AudioCategory.SWORD, priority: AudioPriority.HIGH,   loop: false, volume: 0.65, optional: false },
  [AudioId.SWORD_HIT_01]:        { path: `${BASE}/sword/hit_01.wav`,        category: AudioCategory.SWORD, priority: AudioPriority.HIGH,   loop: false, volume: 0.6,  optional: false },
  [AudioId.SWORD_HIT_02]:        { path: `${BASE}/sword/hit_02.wav`,        category: AudioCategory.SWORD, priority: AudioPriority.HIGH,   loop: false, volume: 0.6,  optional: false },
  [AudioId.SWORD_HIT]:           { path: `${BASE}/sword/hit.wav`,           category: AudioCategory.SWORD, priority: AudioPriority.HIGH,   loop: false, volume: 0.6,  optional: false },
  [AudioId.SWORD_CLASH]:         { path: `${BASE}/sword/clash.wav`,         category: AudioCategory.SWORD, priority: AudioPriority.HIGH,   loop: false, volume: 0.55, optional: false },

  // ── Yokai ──
  [AudioId.YOKAI_IDLE]:          { path: `${BASE}/enemies/yokai/idle.wav`,      category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.2,  optional: false },
  [AudioId.YOKAI_GROWL_01]:      { path: `${BASE}/enemies/yokai/growl_01.wav`,  category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.3,  optional: false },
  [AudioId.YOKAI_GROWL_02]:      { path: `${BASE}/enemies/yokai/growl_02.wav`,  category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.3,  optional: false },
  [AudioId.YOKAI_ATTACK]:        { path: `${BASE}/enemies/yokai/attack.wav`,    category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.5,  optional: false },
  [AudioId.YOKAI_HURT]:          { path: `${BASE}/enemies/yokai/hurt.wav`,      category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.YOKAI_DEATH]:         { path: `${BASE}/enemies/yokai/death.wav`,     category: AudioCategory.ENEMY, priority: AudioPriority.HIGH,   loop: false, volume: 0.55, optional: false },

  // ── Shadow Yokai ──
  [AudioId.SHADOW_IDLE]:         { path: `${BASE}/enemies/shadow_yokai/shadow_idle.wav`,     category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.15, optional: false },
  [AudioId.SHADOW_WHISPER]:      { path: `${BASE}/enemies/shadow_yokai/shadow_whisper.wav`,  category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.2,  optional: false },
  [AudioId.SHADOW_TELEPORT]:     { path: `${BASE}/enemies/shadow_yokai/shadow_teleport.wav`, category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.4,  optional: false },
  [AudioId.SHADOW_ATTACK]:       { path: `${BASE}/enemies/shadow_yokai/shadow_attack.wav`,   category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.SHADOW_HIT]:          { path: `${BASE}/enemies/shadow_yokai/shadow_hit.wav`,      category: AudioCategory.ENEMY, priority: AudioPriority.HIGH,   loop: false, volume: 0.5,  optional: false },
  [AudioId.SHADOW_HURT]:         { path: `${BASE}/enemies/shadow_yokai/shadow_hurt.wav`,     category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.4,  optional: false },
  [AudioId.SHADOW_DEATH]:        { path: `${BASE}/enemies/shadow_yokai/shadow_death.wav`,    category: AudioCategory.ENEMY, priority: AudioPriority.HIGH,   loop: false, volume: 0.5,  optional: false },
  [AudioId.SHADOW_ENERGY]:       { path: `${BASE}/enemies/shadow_yokai/shadow_energy.wav`,   category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.3,  optional: false },

  // ── Tengu ──
  [AudioId.TENGU_WING_FLAP_01]:  { path: `${BASE}/enemies/tengu/wing_flap_01.wav`,          category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.3,  optional: false },
  [AudioId.TENGU_WING_FLAP_02]:  { path: `${BASE}/enemies/tengu/wing_flap_02.wav`,          category: AudioCategory.ENEMY, priority: AudioPriority.LOW,    loop: false, volume: 0.3,  optional: false },
  [AudioId.TENGU_WING_FLAP_HEAVY]:{ path: `${BASE}/enemies/tengu/wing_flap_heavy.wav`,      category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.4,  optional: false },
  [AudioId.TENGU_CALL]:          { path: `${BASE}/enemies/tengu/tengu_call.wav`,             category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.TENGU_ATTACK]:        { path: `${BASE}/enemies/tengu/tengu_attack.wav`,           category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.5,  optional: false },
  [AudioId.TENGU_PROJECTILE]:    { path: `${BASE}/enemies/tengu/tengu_projectile.wav`,       category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.TENGU_PROJECTILE_IMPACT]:{ path: `${BASE}/enemies/tengu/tengu_projectile_impact.wav`, category: AudioCategory.ENEMY, priority: AudioPriority.HIGH, loop: false, volume: 0.5, optional: false },
  [AudioId.TENGU_HURT]:          { path: `${BASE}/enemies/tengu/tengu_hurt.wav`,             category: AudioCategory.ENEMY, priority: AudioPriority.NORMAL, loop: false, volume: 0.45, optional: false },
  [AudioId.TENGU_DEATH]:         { path: `${BASE}/enemies/tengu/tengu_death.wav`,            category: AudioCategory.ENEMY, priority: AudioPriority.HIGH,   loop: false, volume: 0.55, optional: false },

  // ── Boss — Crimson Oni ──
  [AudioId.BOSS_IDLE]:           { path: `${BASE}/boss/crimson_oni/crimson_idle.wav`,       category: AudioCategory.BOSS, priority: AudioPriority.LOW,      loop: false, volume: 0.2,  optional: false },
  [AudioId.BOSS_GROWL_01]:       { path: `${BASE}/boss/crimson_oni/crimson_growl_01.wav`,   category: AudioCategory.BOSS, priority: AudioPriority.NORMAL,   loop: false, volume: 0.4,  optional: false },
  [AudioId.BOSS_GROWL_02]:       { path: `${BASE}/boss/crimson_oni/crimson_growl_02.wav`,   category: AudioCategory.BOSS, priority: AudioPriority.NORMAL,   loop: false, volume: 0.4,  optional: false },
  [AudioId.BOSS_ROAR_01]:        { path: `${BASE}/boss/crimson_oni/crimson_roar_01.wav`,    category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.7,  optional: false },
  [AudioId.BOSS_ROAR_02]:        { path: `${BASE}/boss/crimson_oni/crimson_roar_02.wav`,    category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.7,  optional: false },
  [AudioId.BOSS_ATTACK]:         { path: `${BASE}/boss/crimson_oni/crimson_attack.wav`,     category: AudioCategory.BOSS, priority: AudioPriority.HIGH,     loop: false, volume: 0.6,  optional: false },
  [AudioId.BOSS_HURT]:           { path: `${BASE}/boss/crimson_oni/crimson_hurt.wav`,       category: AudioCategory.BOSS, priority: AudioPriority.NORMAL,   loop: false, volume: 0.5,  optional: false },
  [AudioId.BOSS_DEATH]:          { path: `${BASE}/boss/crimson_oni/crimson_death.wav`,      category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.7,  optional: false },
  [AudioId.BOSS_CHARGE]:         { path: `${BASE}/boss/crimson_oni/charge.wav`,             category: AudioCategory.BOSS, priority: AudioPriority.HIGH,     loop: false, volume: 0.55, optional: false },
  [AudioId.BOSS_SMASH]:          { path: `${BASE}/boss/crimson_oni/smash.wav`,              category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.7,  optional: false },
  [AudioId.BOSS_PHASE_2]:        { path: `${BASE}/boss/crimson_oni/phase_2.wav`,            category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.65, optional: false },
  [AudioId.BOSS_PHASE_3]:        { path: `${BASE}/boss/crimson_oni/phase_3.wav`,            category: AudioCategory.BOSS, priority: AudioPriority.CRITICAL, loop: false, volume: 0.7,  optional: false },

  // ── Shrine ──
  [AudioId.SHRINE_ACTIVATE]:     { path: `${BASE}/shrine/shrine_activate.wav`,  category: AudioCategory.SHRINE, priority: AudioPriority.HIGH,   loop: false, volume: 0.5,  optional: false },
  [AudioId.SHRINE_PURIFY]:       { path: `${BASE}/shrine/shrine_purify.wav`,    category: AudioCategory.SHRINE, priority: AudioPriority.HIGH,   loop: false, volume: 0.5,  optional: false },
  [AudioId.SHRINE_COMPLETE]:     { path: `${BASE}/shrine/shrine_complete.wav`,  category: AudioCategory.SHRINE, priority: AudioPriority.HIGH,   loop: false, volume: 0.5,  optional: false },
  [AudioId.SPIRIT_CHIME]:        { path: `${BASE}/shrine/spirit_chime.wav`,     category: AudioCategory.SHRINE, priority: AudioPriority.NORMAL, loop: false, volume: 0.35, optional: false },
  [AudioId.HEALING_CHIME]:       { path: `${BASE}/shrine/healing_chime.wav`,    category: AudioCategory.SHRINE, priority: AudioPriority.NORMAL, loop: false, volume: 0.4,  optional: false },

  // ── Environment ──
  [AudioId.ENV_BRANCH_CREAK]:    { path: `${BASE}/environment/branch_creak.wav`,    category: AudioCategory.ENVIRONMENT, priority: AudioPriority.LOW, loop: false, volume: 0.2, optional: false },
  [AudioId.ENV_LEAVES_RUSTLE]:   { path: `${BASE}/environment/leaves_rustle.wav`,   category: AudioCategory.ENVIRONMENT, priority: AudioPriority.LOW, loop: false, volume: 0.15,optional: false },

  // ── UI ──
  [AudioId.UI_HOVER]:            { path: `${BASE}/ui/hover.wav`,        category: AudioCategory.UI, priority: AudioPriority.LOW,    loop: false, volume: 0.12, optional: false },
  [AudioId.UI_SELECT]:           { path: `${BASE}/ui/select.wav`,       category: AudioCategory.UI, priority: AudioPriority.NORMAL, loop: false, volume: 0.25, optional: false },
  [AudioId.UI_CONFIRM]:          { path: `${BASE}/ui/confirm.wav`,      category: AudioCategory.UI, priority: AudioPriority.NORMAL, loop: false, volume: 0.3,  optional: false },
  [AudioId.UI_BACK]:             { path: `${BASE}/ui/back.wav`,         category: AudioCategory.UI, priority: AudioPriority.LOW,    loop: false, volume: 0.2,  optional: false },
  [AudioId.UI_ERROR]:            { path: `${BASE}/ui/error.wav`,        category: AudioCategory.UI, priority: AudioPriority.NORMAL, loop: false, volume: 0.3,  optional: false },
  [AudioId.UI_DIALOGUE]:         { path: `${BASE}/ui/dialogue.wav`,     category: AudioCategory.UI, priority: AudioPriority.LOW,    loop: false, volume: 0.2,  optional: false },
  [AudioId.UI_NOTIFICATION]:     { path: `${BASE}/ui/notification.wav`, category: AudioCategory.UI, priority: AudioPriority.NORMAL, loop: false, volume: 0.3,  optional: false },

  // ── System ──
  [AudioId.SYS_GAME_OVER]:       { path: `${BASE}/system/game_over.wav`,   category: AudioCategory.SYSTEM, priority: AudioPriority.CRITICAL, loop: false, volume: 0.5, optional: false },
  [AudioId.SYS_GAME_START]:      { path: `${BASE}/system/game_start.wav`,  category: AudioCategory.SYSTEM, priority: AudioPriority.HIGH,     loop: false, volume: 0.4, optional: false },
  [AudioId.SYS_LEVEL_UP]:        { path: `${BASE}/system/level_up.wav`,    category: AudioCategory.SYSTEM, priority: AudioPriority.HIGH,     loop: false, volume: 0.45,optional: false },

  // ── Future Hooks (files do NOT exist yet) ──
  [AudioId.VFX_SPIRIT]:          { path: `${BASE}/vfx/spirit/spirit.wav`,              category: AudioCategory.VFX,  priority: AudioPriority.LOW,    loop: false, volume: 0.3, optional: true },
  [AudioId.VFX_MAGIC]:           { path: `${BASE}/vfx/magic/magic.wav`,                category: AudioCategory.VFX,  priority: AudioPriority.NORMAL, loop: false, volume: 0.4, optional: true },
  [AudioId.VFX_ENERGY_PULSE]:    { path: `${BASE}/vfx/magic/energy_pulse.wav`,         category: AudioCategory.VFX,  priority: AudioPriority.NORMAL, loop: false, volume: 0.4, optional: true },
  [AudioId.VFX_SUPERNATURAL]:    { path: `${BASE}/vfx/spirit/supernatural_burst.wav`,  category: AudioCategory.VFX,  priority: AudioPriority.NORMAL, loop: false, volume: 0.4, optional: true },
  [AudioId.ARENA_GROUND_CRACK]:  { path: `${BASE}/boss/crimson_oni/ground_crack.wav`,  category: AudioCategory.BOSS, priority: AudioPriority.HIGH,   loop: false, volume: 0.6, optional: true },
  [AudioId.ARENA_GROUND_IMPACT]: { path: `${BASE}/boss/crimson_oni/ground_impact.wav`, category: AudioCategory.BOSS, priority: AudioPriority.HIGH,   loop: false, volume: 0.6, optional: true },
  [AudioId.ARENA_SHOCKWAVE]:     { path: `${BASE}/boss/crimson_oni/shockwave.wav`,     category: AudioCategory.BOSS, priority: AudioPriority.HIGH,   loop: false, volume: 0.6, optional: true },
  [AudioId.ARENA_RUMBLE]:        { path: `${BASE}/boss/crimson_oni/arena_rumble.wav`,   category: AudioCategory.BOSS, priority: AudioPriority.NORMAL, loop: false, volume: 0.5, optional: true },
  [AudioId.ARENA_CRIMSON_ENERGY]:{ path: `${BASE}/boss/crimson_oni/crimson_energy.wav`, category: AudioCategory.BOSS, priority: AudioPriority.NORMAL, loop: false, volume: 0.5, optional: true },
  [AudioId.ARENA_BOSS_WARNING]:  { path: `${BASE}/boss/crimson_oni/boss_warning.wav`,  category: AudioCategory.BOSS, priority: AudioPriority.HIGH,   loop: false, volume: 0.6, optional: true },
};
