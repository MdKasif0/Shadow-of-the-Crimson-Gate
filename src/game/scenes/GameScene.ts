import * as THREE from 'three';
import { GAME_CONFIG } from '../GameConfig';
import { WorldGenerator } from '../world/WorldGenerator';
import { LoadReporter } from '../ui/LoadingScreen';
import { Ronin } from '../characters/Ronin';
import { CollisionSystem } from '../collision/CollisionSystem';
import { HitboxSystem } from '../combat/HitboxSystem';
import { DamageSystem } from '../combat/DamageSystem';
import { InputManager } from '../core/InputManager';
import { Enemy } from '../enemies/Enemy';
import { CameraController } from '../camera/CameraController';
import { EncounterManager } from '../encounters/EncounterManager';
import { EncounterDatabase } from '../encounters/EncounterDatabase';
import { AttackDirector } from '../combat/AttackDirector';
import { VFXManager } from '../vfx/VFXManager';
import { EventBus } from '../core/EventBus';
import { LightingSystem } from '../lighting/LightingSystem';
import { OcclusionFader } from '../camera/OcclusionFader';
import { AttackTelegraph } from '../vfx/AttackTelegraph';
import { createLockOnMarker, LockOnMarker } from '../vfx/LockOnMarker';
import { MusicMood } from '../audio/AudioManager';
import { AudioId } from '../audio/AudioRegistry';
import { easeInOut } from '../camera/CameraController';
import { windTime } from '../utils/Wind';
import { StoryEvents } from '../story/StoryEvent';
import { SettingsManager } from '../settings/SettingsManager';
import { AtmosphereSystem } from '../atmosphere/AtmosphereSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';

import { ZoneManager } from '../world/ZoneManager';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { ShrineInteraction } from '../interaction/ShrineInteraction';
import { ObjectiveManager } from '../progression/ObjectiveManager';
import { ObjectiveUI } from '../ui/ObjectiveUI';
import { EncounterTelegraphVFX } from '../vfx/EncounterTelegraphVFX';

import { PlayerProgress } from '../progression/PlayerProgress';
import { PlayerStats } from '../progression/PlayerStats';
import { RewardSystem } from '../progression/RewardSystem';
import { AudioManager } from '../audio/AudioManager';
import { AudioZoneManager } from '../audio/AudioZoneManager';
import { CrimsonOni } from '../boss/CrimsonOni';
import { Boss } from '../boss/Boss';
import { BossIntroCamera } from '../boss/arena/BossIntroCamera';
import { BossUI } from '../ui/BossUI';
import { ArenaHazardSystem } from '../boss/arena/ArenaHazardSystem';
import { ArenaGenerator } from '../boss/arena/ArenaGenerator';
import { BossPhaseId } from '../boss/BossPhase';

// ─── Phase 5 Story Imports ──────────────────────────────────────
import { StoryManager } from '../story/StoryManager';
import { DialogueManager } from '../dialogue/DialogueManager';
import { ChapterUI } from '../ui/ChapterUI';
import { NPCFactory } from '../npc/NPCFactory';
import { NPC_DATABASE } from '../npc/NPCData';
import { NPC } from '../npc/NPC';
import { NPCInteraction } from '../npc/NPCInteraction';

// ─── Phase 5 Step 2 Integration ───────────────────────────────
import { CheckpointManager } from '../progression/CheckpointManager';
import { SaveManager } from '../save/SaveManager';
import { GameStateManager } from '../state/GameStateManager';
import { GameState } from '../state/GameState';
import { WorldStateManager } from '../state/WorldStateManager';

// ─── Progression, combat depth and world secrets ───────────────
import { PlayerBuild, CHARMS, TECHNIQUES, TechniqueId, SkillDef } from '../progression/PlayerBuild';
import { EssenceDrop } from '../progression/EssenceDrop';
import { SpiritWaves } from '../combat/SpiritWaves';
import { WorldSecrets, SECRETS, WARD, SecretDef } from '../world/WorldSecrets';
import { ShrineMenu } from '../ui/ShrineMenu';
import { AKANE_REMATCH_DIALOGUE, AKANE_YIELDS_DIALOGUE, CRIMSON_HEART_DIALOGUE, ONI_FALLS_DIALOGUE } from '../story/Endings';
import { ChapterId } from '../story/StoryChapter';
import { createDefaultFlags } from '../story/StoryFlag';
import { EncounterState } from '../encounters/Encounter';
import { BossPhaseId as PhaseId } from '../boss/BossPhase';
import { keyName } from '../settings/KeyBindings';
import { Interactable } from '../interaction/Interactable';

// ─── Levels ───────────────────────────────────────────────────────
import { LEVEL_ORDER, LevelContext, LevelId, LevelProgressSave, LevelRuntime, createDefaultLevelProgress } from '../levels/LevelTypes';
import { LEVELS } from '../levels/LevelCatalog';
import { buildLevel } from '../levels/LevelFactory';
import { LevelHazards } from '../levels/LevelHazards';
import { ExitGate, LevelBuilder } from '../levels/LevelKit';
import { LevelEnemy } from '../enemies/LevelEnemy';
import { HazardKind } from '../enemies/LevelEnemyTypes';
import { WorldLights, LightSource } from '../lighting/WorldLights';
import { WorldMap, LevelLoadingCard, LevelCountdown, formatTime } from '../ui/WorldMap';
import { CHAPTERS } from '../story/StoryChapter';
import { EncounterConfig } from '../encounters/EncounterConfig';
import { ParryFlash } from '../vfx/ParryFlash';
import { ContactShadows, ShadowCaster } from '../rendering/ContactShadows';
import { mergeStatic } from '../utils/MergeStatic';
import { SurfaceUniforms, surfaceEverything } from '../rendering/Surfaces';
import { LanternGenerator } from '../world/LanternGenerator';
import { Run, Difficulty } from '../meta/Run';
import { Records } from '../meta/Records';
import { bindAchievementTracking, grantAchievement } from '../meta/Achievements';
import { RunTimer } from '../ui/MetaHUD';
import { TrialMode, openTrialResults } from '../ui/MetaScreens';
import { NG_PLUS_DROPS } from '../progression/PlayerBuild';
import { EnemyKind, EnemySpawnDef } from '../encounters/EncounterConfig';

/** Enemies this close pull the camera's framing towards them. */
const COMBAT_FRAMING_RANGE = 12;
const BOSS_FRAMING_RANGE = 40;
const LOCK_ON_RANGE = 18;
const LOCK_ON_BREAK_RANGE = 26;
/** Enemies this close start the battle music. */
const COMBAT_MUSIC_RANGE = 16;
/** How long battle music plays on after the last enemy leaves that range. */
const COMBAT_MUSIC_LINGER = 5;

const realTimeNow = () => performance.now() / 1000;

/** Where the Ronin can rest. Each rest point sits clear of every fight's trigger. */
const SHRINES = [
  { id: 'courtyard_shrine', name: 'Courtyard Shrine', position: new THREE.Vector3(-12, 0, 25), rest: new THREE.Vector3(-12, 0, 29.5) },
  { id: 'main_shrine', name: 'Mountain Shrine', position: new THREE.Vector3(0, 0, -10), rest: new THREE.Vector3(0, 0, -5) },
  { id: 'wayside_shrine', name: 'Wayside Shrine', position: new THREE.Vector3(-12, 0, -52), rest: new THREE.Vector3(-12, 0, -47.5) },
];

/** The technique each chapter teaches as it begins. */
const CHAPTER_TECHNIQUES: Partial<Record<ChapterId, TechniqueId>> = {
  [ChapterId.CHAPTER_2]: 'dashStrike',
  [ChapterId.CHAPTER_3]: 'spiritWave',
  [ChapterId.CHAPTER_4]: 'crimsonWhirl',
};
const CHAPTER_ORDER = [ChapterId.CHAPTER_1, ChapterId.CHAPTER_2, ChapterId.CHAPTER_3, ChapterId.CHAPTER_4,
  ChapterId.CHAPTER_5, ChapterId.CHAPTER_6, ChapterId.CHAPTER_7, ChapterId.CHAPTER_8, ChapterId.EPILOGUE];

/** Where the way on from the courtyard opens, once the Oni falls. */
const COURTYARD_EXIT = new THREE.Vector3(0, 0, -131);
/** A loading card stays up at least this long, so it can be read. */
const MIN_CARD_SECONDS = 2.2;
const LEVEL_BOSS_RANGE = 40;
/** Defeating each level's guardian opens the next. */
const nextLevel = (id: LevelId): LevelId | null => LEVEL_ORDER[LEVEL_ORDER.indexOf(id) + 1] ?? null;

const EXECUTION_RANGE = 3.4;
const BOSS_EXECUTION_RANGE = 5.5;
const ELITE_BAR_RANGE = 26;
/** Akane, if she fights beside you, strikes the Oni this often. */
const ALLY_STRIKE_INTERVAL = 11;

export class GameScene {
  public scene: THREE.Scene;
  public player: Ronin;
  public collisionSystem: CollisionSystem;
  public hitboxSystem: HitboxSystem;
  public projectileSystem: ProjectileSystem;
  public arenaHazardSystem: ArenaHazardSystem;
  public enemies: Enemy[] = [];
  public vfx: VFXManager;
  public cameraController: CameraController;
  
  private encounterManager: EncounterManager;
  private attackDirector: AttackDirector;
  
  private hitStopTimer: number = 0;

  private lighting: LightingSystem;
  private occlusion = new OcclusionFader();
  private attackTelegraph!: AttackTelegraph;
  private lockMarker!: LockOnMarker;
  /** The enemy or boss being locked on to. */
  private lockTarget: Enemy | CrimsonOni | null = null;
  private slowMotionTimer: number = 0;
  private slowMotionScale: number = 1;
  private combatMusicTimer: number = 0;
  private atmosphere: AtmosphereSystem;
  
  private zoneManager: ZoneManager;
  private interactionSystem: InteractionSystem;
  private objectiveManager: ObjectiveManager;
  private objectiveUI: ObjectiveUI;
  private telegraphVfx: EncounterTelegraphVFX;

  // ─── Phase 5 Systems ──────────────────────────────────────────
  private storyManager: StoryManager;
  private dialogueManager: DialogueManager;
  private chapterUI: ChapterUI;
  private npcs: NPC[] = [];

  private playerProgress: PlayerProgress;
  private playerStats: PlayerStats;
  private rewardSystem: RewardSystem;
  private checkpointManager: CheckpointManager;

  // ─── Boss (Phase 4) ───────────────────────────────────────────────
  private boss: CrimsonOni | null = null;
  private audioZoneManager: AudioZoneManager;
  private bossIntroCamera: BossIntroCamera;
  private bossUI: BossUI;
  private bossIsDefeatedSequence: boolean = false;
  private purificationTimer: number = 0;
  private hasBossIntroPlayed: boolean = false;
  private hasSeenBossIntro: boolean = false;
  private isCinematicActive: boolean = false;
  private hasShownTitle: boolean = false;

  // ─── Progression, combat depth and world secrets ──────────────
  private build = new PlayerBuild();
  private shrineMenu = new ShrineMenu();
  private essenceDrop: EssenceDrop | null = null;
  private spiritWaves: SpiritWaves;
  private secrets: WorldSecrets;
  private collected = new Set<string>();
  /** The broken enemy in reach this frame, and the one an execution is aimed at. */
  private executionCandidate: Enemy | CrimsonOni | null = null;
  private executionVictim: Enemy | CrimsonOni | null = null;
  private isExecutePromptShown = false;
  private hazardTimers = new Map<string, number>();
  private allyTimer = 0;
  private eliteBarId: string | null = null;
  private isEndingChoicePending = false;

  // ─── Levels ───────────────────────────────────────────────────────
  private renderer: THREE.WebGLRenderer | null = null;
  private levelId: LevelId = 'courtyard';
  private level: LevelRuntime | null = null;
  private levelProgress: LevelProgressSave = createDefaultLevelProgress();
  private levelHazards = new LevelHazards();
  private levelSecrets: WorldSecrets | null = null;
  private levelTimer = 0;
  private levelBossDefeated = false;
  private isLevelBossFight = false;
  private isTraveling = false;
  private worldMap = new WorldMap();
  private loadingCard = new LevelLoadingCard();
  private countdown = new LevelCountdown();
  /** The original mountain, kept aside while the Ronin is elsewhere. */
  private courtyard: {
    world: THREE.Group | null;
    interactions: InteractionSystem;
    boxes: THREE.Box3[];
    spheres: THREE.Sphere[];
    lights: LightSource[];
    bounds: { MIN_X: number; MAX_X: number; MIN_Z: number; MAX_Z: number };
    occluders: unknown[];
    exit: ExitGate | null;
  } | null = null;
  private essenceDropLevel: LevelId = 'courtyard';
  private parryFlash!: ParryFlash;
  private courtyardExtras: LevelBuilder | null = null;
  private contactShadows!: ContactShadows;
  /** Last frame's state of each fight, to catch the moment one is won. */
  private encounterStates = new Map<string, EncounterState>();

  // ─── Reasons to come back ─────────────────────────────────────────
  private runTimer = new RunTimer();
  /** Deaths since arriving in this level, for Flawless. */
  private deathsThisLevel = 0;
  /** Set if the Ronin heals at all during the Crimson Oni fight. */
  private healedDuringOni = false;
  private trial: {
    mode: TrialMode;
    wave: number;
    kills: number;
    time: number;
    isOver: boolean;
    resting: number;
  } | null = null;

  constructor(cameraController: CameraController) {
    AudioManager.init();
    
    this.cameraController = cameraController;
    this.scene = new THREE.Scene();
    
    this.atmosphere = new AtmosphereSystem(this.scene);
    this.lighting = new LightingSystem(this.scene);
    this.zoneManager = new ZoneManager();

    this.collisionSystem = new CollisionSystem();
    this.hitboxSystem = new HitboxSystem(this.scene);
    this.projectileSystem = new ProjectileSystem(this.scene);
    this.arenaHazardSystem = new ArenaHazardSystem(this.scene);

    this.playerProgress = new PlayerProgress();
    this.playerStats = new PlayerStats();
    this.rewardSystem = new RewardSystem(this.playerProgress);

    this.bossIntroCamera = new BossIntroCamera(this.cameraController);
    this.bossUI = new BossUI();

    this.player = new Ronin();
    this.applyPlayerStats(true);
    
    // Ensure player is instantiated before AudioZoneManager (though AudioZoneManager doesn't take args currently)
    this.audioZoneManager = new AudioZoneManager();

    this.player.reset(new THREE.Vector3(0, 0, GAME_CONFIG.PLAYER.SPAWN_Z)); // Start at entrance
    this.scene.add(this.player.root);

    this.encounterManager = new EncounterManager();
    this.attackDirector = new AttackDirector();

    // Register encounters from database
    const configs = EncounterDatabase.getAll();
    for (const config of configs) {
      if (!this.playerProgress.hasClearedEncounter(config.id)) {
        this.encounterManager.registerEncounter(config);
      }
    }

    this.vfx = new VFXManager(this.scene, this.cameraController);
    this.attackTelegraph = new AttackTelegraph(this.scene);
    this.lockMarker = createLockOnMarker(this.scene);
    this.telegraphVfx = new EncounterTelegraphVFX(this.scene, this.encounterManager);

    this.interactionSystem = new InteractionSystem();
    for (const shrine of SHRINES) {
      this.interactionSystem.register(new ShrineInteraction(shrine.id, shrine.name, shrine.position));
    }

    this.scene.add(this.levelHazards.group);
    this.parryFlash = new ParryFlash(this.scene);
    this.contactShadows = new ContactShadows(this.scene);
    this.bindLevelEnemyWorld();

    this.spiritWaves = new SpiritWaves(this.scene);
    this.secrets = new WorldSecrets(this.collisionSystem);
    this.scene.add(this.secrets.group);
    for (const secret of SECRETS) this.interactionSystem.register(this.createSecretInteraction(secret));
    this.interactionSystem.register(this.createWardInteraction());

    this.objectiveManager = new ObjectiveManager();
    this.objectiveUI = new ObjectiveUI();
    this.checkpointManager = new CheckpointManager();

    this.storyManager = new StoryManager();
    this.dialogueManager = new DialogueManager();
    this.chapterUI = new ChapterUI();

    // Spawn NPCs from database
    for (const npcDef of NPC_DATABASE) {
      const npc = new NPC(npcDef);
      this.scene.add(npc.root);
      this.npcs.push(npc);
      
      this.interactionSystem.register(new NPCInteraction(npc, () => {
        this.cameraController.dialogueFocus = npc.position;
        const dialogue = npc.getDialogue(this.storyManager.flags);
        this.dialogueManager.startDialogue(dialogue, npc.id);
      }));
    }

    // Boss is in the Boss Arena
    if (!this.playerProgress.crimsonOniDefeated) {
      this.boss = new CrimsonOni();
      this.boss.reset(new THREE.Vector3(0, 0, -115)); // Boss Arena center
      this.scene.add(this.boss.root);
    } else {
      this.boss = null;
    }

    EventBus.on('perfectDodge', (data: { position: THREE.Vector3 }) => {
      this.startSlowMotion(0.28, 0.8);
      const dodgeHeal = this.build.modifiers.dodgeHeal;
      if (dodgeHeal > 0) this.player.heal(dodgeHeal);
      AudioManager.play(AudioId.SPIRIT_CHIME, { volume: 0.7 });
      EventBus.emit('damageNumber', { position: data.position, text: 'PERFECT', kind: 'label' });

      // Shadow Step: slipping a blow rattles every attacker close by
      if (this.build.modifiers.hasShadowStep) {
        for (const enemy of this.enemies) {
          if (enemy.health.isDead || enemy.root.position.distanceTo(data.position) > 3.6) continue;
          DamageSystem.addPosture(enemy, enemy.traits.posture.max * 0.35);
        }
      }
    });

    this.bindProgressionEvents();
    this.bindReplayEvents();

    EventBus.on('finisherStarted', () => {
      this.startSlowMotion(0.4, 0.85);
      this.cameraController.addShake(1.2);
      AudioManager.play(AudioId.SHRINE_PURIFY, { volume: 0.5 });
    });

    EventBus.on('restartEncounter', () => {
      this.respawnAtCheckpoint();
    });

    // Remember cleared fights so a respawn or Continue doesn't bring them back
    EventBus.on('encounterComplete', (data: { id: string }) => {
      this.playerProgress.completeEncounter(data.id);
    });

    EventBus.on(StoryEvents.INTRO_COMPLETE, () => this.playOpeningShot());

    EventBus.on('shrineActivated', () => {
      this.player['health'].heal(this.player['health'].maxHealth);
      EventBus.emit('playerHealth', { current: this.player['health']['currentHealth'], max: this.player['health']['maxHealth'], delta: 0 });
    });

    // ─── Phase 5 Step 2 Flows ─────────────────────────────────────
    EventBus.on('loadCheckpoint', () => {
      this.respawnAtCheckpoint();
    });

    EventBus.on('requestSave', () => {
      // Trials never touch the story save
      if (this.trial) return;
      const pos = this.player.root.position;
      SaveManager.getInstance().saveGame({
        chapter: this.storyManager.state.currentChapter,
        objective: this.objectiveManager.getActive(),
        playerPosition: { x: pos.x, y: pos.y, z: pos.z },
        spiritEssence: this.playerProgress.spiritEssence,
        level: this.build.level,
        clearedEncounters: Array.from(this.playerProgress.clearedEncounters),
        storyFlags: this.storyManager.flags,
        crimsonOniDefeated: this.playerProgress.crimsonOniDefeated,
        build: this.build.toSave(),
        droppedEssence: this.essenceDrop
          ? { ...this.essenceDrop.position, amount: this.essenceDrop.amount, level: this.essenceDropLevel }
          : null,
        collected: [...this.collected],
        levels: { ...this.levelProgress, current: this.levelId },
        difficulty: Run.difficulty,
        ngPlus: Run.ngPlus,
      });
    });

    EventBus.on('loadGame', (saveData: any) => {
      if (!saveData) return;
      
      // Whatever level the save is in, start from the courtyard and travel on from there
      this.endTrialQuietly();
      if (this.levelId !== 'courtyard') this.swapTo('courtyard');
      Run.reset(saveData.difficulty ?? 'normal', saveData.ngPlus ?? 0);
      this.playerProgress.initFromSave(saveData);
      this.build.load(saveData.build);
      this.levelProgress = this.normalizeLevelProgress(saveData.levels, !!saveData.crimsonOniDefeated);
      this.levelBossDefeated = this.playerProgress.crimsonOniDefeated;
      this.levelTimer = 0;
      if (this.levelProgress.cleared.includes('bamboo')) this.build.setSlotCount(3);
      // Saves from before techniques existed: teach whatever the chapter reached
      const reached = CHAPTER_ORDER.indexOf(saveData.chapter ?? ChapterId.CHAPTER_1);
      CHAPTER_ORDER.slice(0, reached + 1).forEach(chapter => {
        const technique = CHAPTER_TECHNIQUES[chapter];
        if (technique) this.build.techniques.add(technique);
      });
      this.applyPlayerStats(true);
      EventBus.emit('essenceUpdate', { amount: this.playerProgress.spiritEssence, added: 0 });

      this.restoreWorldState(saveData.collected ?? [], saveData.droppedEssence ?? null);
      this.essenceDropLevel = saveData.droppedEssence?.level ?? 'courtyard';
      this.syncEssenceDropVisibility();

      const savedPos = saveData.playerPosition;
      const loadPos = savedPos
        ? new THREE.Vector3(savedPos.x, savedPos.y, savedPos.z)
        : this.checkpointManager.getCheckpointPosition();
      this.checkpointManager.setCheckpointPosition(loadPos);
      this.revivePlayer(loadPos);

      if (saveData.storyFlags) this.storyManager.state.flags = { ...createDefaultFlags(), ...saveData.storyFlags };
      if (saveData.chapter) this.storyManager.state.currentChapter = saveData.chapter;
      if (saveData.objective) this.objectiveManager.setObjective(saveData.objective);
      
      this.resetBossEncounter();
      
      this.encounterManager.resetAll(this.scene);
      this.encounterManager.clearAll();
      const configs = EncounterDatabase.getAll();
      for (const config of configs) {
        if (saveData.storyFlags?.completedCampaign || !this.playerProgress.hasClearedEncounter(config.id)) {
          this.encounterManager.registerEncounter(config);
        }
      }

      const target = this.levelProgress.current;
      if (target !== 'courtyard') void this.travel(target, { spawnAt: loadPos, isLoad: true });
    });
    
    EventBus.on('newGame', (data?: { difficulty?: Difficulty; plus?: boolean }) => {
      this.endTrialQuietly();
      if (this.levelId !== 'courtyard') this.swapTo('courtyard');
      const isPlus = !!data?.plus;
      // New Game+ keeps the build, the essence and the best times; the world starts over
      const bestTimes = isPlus ? { ...this.levelProgress.bestTimes } : {};
      const essence = this.playerProgress.spiritEssence;
      Run.reset(isPlus ? Run.difficulty : data?.difficulty ?? 'normal', isPlus ? Run.ngPlus + 1 : 0);
      this.levelProgress = createDefaultLevelProgress();
      this.levelProgress.bestTimes = bestTimes;
      this.essenceDropLevel = 'courtyard';
      this.levelBossDefeated = false;
      this.levelTimer = 0;
      this.deathsThisLevel = 0;
      this.playerProgress.wipe();
      if (isPlus) {
        this.playerProgress.spiritEssence = essence;
        grantAchievement('ng_plus');
      } else {
        this.build.wipe();
      }
      this.hasSeenBossIntro = false;
      this.applyPlayerStats(true);
      EventBus.emit('essenceUpdate', { amount: this.playerProgress.spiritEssence, added: 0 });
      this.restoreWorldState([], null);

      const startPos = new THREE.Vector3(0, 0, GAME_CONFIG.PLAYER.SPAWN_Z);
      this.checkpointManager.setCheckpointPosition(startPos);
      this.revivePlayer(startPos);
      this.storyManager.reset();
      this.objectiveManager.reset();
      this.encounterManager.resetAll(this.scene);
      this.encounterManager.clearAll();
      const configs = EncounterDatabase.getAll();
      for (const config of configs) {
        this.encounterManager.registerEncounter(config);
      }
      this.resetBossEncounter();
      setTimeout(() => {
        this.storyManager.startGame();
        EventBus.emit('requestSave', {});
      }, 100);
    });

    EventBus.on('bossPhaseTransition', (data: any) => {
      // Lock player controls during transformation
      this.player.isControlsEnabled = false;
      this.cameraController.addShake(3.0); // Heavy sustained shake
      
      if (ArenaGenerator.corruptionMat) {
        (ArenaGenerator.corruptionMat as THREE.MeshBasicMaterial).opacity = data.phase === BossPhaseId.PHASE_2 ? 0.4 : 0.8;
      }

      setTimeout(() => {
        this.player.isControlsEnabled = true;
      }, 2500);
    });

    EventBus.on('bossDeath', (data: any) => {
      this.levelBossDefeated = true;
      if (!this.healedDuringOni) grantAchievement('oni_no_heal');
      this.dropNgPlusCharm('CRIMSON_ONI');
      this.bossIsDefeatedSequence = true;
      this.purificationTimer = 0;
      this.startSlowMotion(0.25, 1.4);
      AudioManager.playBossDefeat();
      this.player.isControlsEnabled = false;
      
      // Heavy hit stop & shake
      this.hitStopTimer = 0.5;
      this.cameraController.addShake(5.0);
      
      // Look at boss
      if (this.boss) this.playBossDeathShot(this.boss.root.position.clone());

      // Energy VFX
      this.vfx.spawnBossDeathEnergy(data.position);
      
      // Sequence timing
      setTimeout(() => {
        // Reward
        this.playerProgress.addEssence(500);
        this.playerProgress.crimsonOniDefeated = true;
        EventBus.emit('requestSave', {});

        this.player.isControlsEnabled = true;
        // The Oni was only the gate's lock; the way on opens beneath it
        this.completeLevel('courtyard');
        this.dialogueManager.startDialogue(ONI_FALLS_DIALOGUE, 'oni_falls');
        EventBus.emit('objectiveUpdate', { text: 'PASS THROUGH THE CRIMSON GATE' });
      }, 7500);
    });

    EventBus.on('spawnBossProjectile', (data: any) => {
      this.projectileSystem.spawnProjectile(
        data.ownerId,
        data.startPos,
        data.direction,
        data.speed,
        data.damage,
        data.knockback,
        3.0,
        'CRIMSON_ARC'
      );
    });

    EventBus.on('spawnBossHazard', (data: any) => {
      const bossPos = this.boss ? this.boss.root.position : new THREE.Vector3();
      const playerPos = this.player.root.position;

      if (data.type === 'RAIN') {
        // Spawn 3 hazards near player
        for (let i = 0; i < 3; i++) {
          const offset = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
          this.arenaHazardSystem.spawnHazard({
            position: playerPos.clone().add(offset),
            radius: 3.5,
            damage: data.damage,
            telegraphDuration: 1.5,
            activeDuration: 0.5
          });
        }
      } else if (data.type === 'ERUPTION') {
        // Large AOE around player and boss
        this.arenaHazardSystem.spawnHazard({
          position: bossPos.clone(),
          radius: 8.0,
          damage: data.damage,
          telegraphDuration: 2.0,
          activeDuration: 1.0
        });
        this.arenaHazardSystem.spawnHazard({
          position: playerPos.clone(),
          radius: 6.0,
          damage: data.damage,
          telegraphDuration: 2.0,
          activeDuration: 1.0
        });
      }
    });

    setTimeout(() => {
      // Don't auto-start game if in menu
      if (GameStateManager.getInstance().getState() === GameState.PLAYING) {
        this.storyManager.startGame();
      }
    }, 100);
  }

  /** Where a cinematic camera should focus: the boss during its intro and death, else the Ronin. */
  public get cinematicFocus(): THREE.Vector3 {
    return this.boss && (this.isCinematicActive || this.bossIsDefeatedSequence) ? this.boss.root.position : this.player.root.position;
  }

  /** True while the loading card is up and the next level is being built. */
  public get isLoadingLevel(): boolean {
    return this.isTraveling;
  }

  public get isStoryIntroRunning(): boolean {
    return this.storyManager.isIntroRunning;
  }

  /** Builds the world in stages. Runs once, before the game loop starts. */
  public async buildWorld(renderer: THREE.WebGLRenderer, report: LoadReporter): Promise<void> {
    const world = await WorldGenerator.build(this.scene, this.collisionSystem, report);
    this.mergeCourtyardMeshes(world);
    this.registerOccluders(world);
    this.lighting.buildEnvironment(renderer, this.scene);
    this.renderer = renderer;
    this.buildCourtyardExit(world);
  }

  public updateOcclusion(dt: number): void {
    this.occlusion.update(dt, this.cameraController.camera, this.player.root.position);
  }

  /**
   * Merges the courtyard's unmoving buildings into fewer meshes. Lanterns and
   * shrines merge one at a time, so each can still fade out on its own. Trees
   * and the arena are left as they are: they sway and change.
   */
  private mergeCourtyardMeshes(world: THREE.Group): void {
    // Wood, stone, lacquer and paper on the courtyard's buildings, before they're merged
    for (const group of world.children) {
      if (['Torii', 'Temple', 'Shrines', 'Lanterns', 'Rocks', 'Path', 'CourtyardArena'].includes(group.name)) surfaceEverything(group);
    }
    for (const group of world.children) {
      if (group.name === 'Torii' || group.name === 'Temple' || group.name === 'Mountains') mergeStatic(group);
      else if (group.name === 'Lanterns' || group.name === 'Shrines') mergeStatic(group, [...group.children]);
    }
  }

  /** Anything tall enough to hide the player can fade out. Ground and low walls can't. */
  private registerOccluders(world: THREE.Group): void {
    const bounds = new THREE.Box3();
    const fadeable = ['Trees', 'Lanterns', 'Shrines', 'CourtyardArena'];

    for (const group of world.children) {
      if (group.name === 'Torii' || group.name === 'Temple') {
        this.occlusion.register(group);
      } else if (fadeable.includes(group.name)) {
        for (const child of group.children) {
          if ((child as THREE.Sprite).isSprite) continue;
          bounds.setFromObject(child);
          if (bounds.max.y > 2.6) this.occlusion.register(child, group.name === 'Trees');
        }
      }
    }
  }

  /** Toggles lock-on, and moves it to another enemy when the target dies. */
  private updateLockOn(input: InputManager): void {
    const position = this.player.root.position;

    if (input.isActionJustPressed('lockOn')) {
      this.lockTarget = this.lockTarget ? null : this.findLockTarget(LOCK_ON_RANGE);
    }

    if (this.lockTarget) {
      const isGone = this.lockTarget.health.isDead || !this.lockTarget.root.parent;
      const isFar = this.lockTarget.root.position.distanceTo(position) > LOCK_ON_BREAK_RANGE;
      if (isGone) this.lockTarget = this.findLockTarget(LOCK_ON_RANGE);
      else if (isFar) this.lockTarget = null;
    }

    this.lockMarker.update(this.lockTarget?.root.position ?? null, this.lockTarget === this.boss ? 5.4 : 2.7, realTimeNow());
    this.player.lockTarget = this.lockTarget?.root.position ?? null;
    this.cameraController.isLockedOn = this.lockTarget !== null;
  }

  private findLockTarget(range: number): Enemy | CrimsonOni | null {
    const position = this.player.root.position;
    let best: Enemy | CrimsonOni | null = null;
    let bestScore = Infinity;

    const consider = (candidate: Enemy | CrimsonOni) => {
      if (candidate.health.isDead || !candidate.root.parent || !candidate.root.visible) return;
      const distance = candidate.root.position.distanceTo(position);
      if (distance > range) return;

      // Prefers what the camera is looking at, but a nearby enemy behind still counts
      const toCandidate = Math.atan2(candidate.root.position.x - position.x, candidate.root.position.z - position.z);
      const aim = this.cameraController.yaw + Math.PI;
      const offAim = Math.abs(Math.atan2(Math.sin(toCandidate - aim), Math.cos(toCandidate - aim)));
      const score = distance + offAim * 5;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    };

    this.enemies.forEach(consider);
    if (this.boss && this.hasBossIntroPlayed && !this.isCinematicActive) consider(this.boss);
    return best;
  }

  /** Shows where each attack in its windup is going to land. */
  private updateTelegraphs(): void {
    this.attackTelegraph.beginFrame();

    const show = (attacker: Enemy | CrimsonOni) => {
      const warning = attacker.attackWarning;
      attacker.glow.setWarning(warning);
      if (warning > 0) {
        this.attackTelegraph.show(attacker.id, attacker.root.position, attacker.root.rotation.y, attacker.attackShape, warning);
      }
    };

    this.enemies.forEach(show);
    if (this.boss) show(this.boss);

    this.attackTelegraph.endFrame();
  }

  /** Chooses the music from what's actually happening around the player. */
  private updateMusicMood(realDt: number): void {
    const position = this.player.root.position;
    let mood: MusicMood = 'explore';

    if (this.bossIsDefeatedSequence || (this.playerProgress.crimsonOniDefeated && this.zoneManager.getCurrentZoneId() === 'BOSS_ARENA')) {
      mood = 'victory';
    } else if (this.boss && this.hasBossIntroPlayed && !this.boss.health.isDead
      && this.boss.root.position.distanceTo(position) < BOSS_FRAMING_RANGE) {
      mood = this.boss.phase === BossPhaseId.PHASE_3 ? 'boss3' : this.boss.phase === BossPhaseId.PHASE_2 ? 'boss2' : 'boss1';
    } else if (this.nearLevelBoss()) {
      const phase = this.nearLevelBoss()!.phaseIndex;
      mood = phase >= 2 ? 'boss3' : phase === 1 ? 'boss2' : 'boss1';
    } else {
      const nearby = this.enemies.filter(enemy =>
        !enemy.health.isDead && enemy.root.visible && enemy.root.position.distanceTo(position) < COMBAT_MUSIC_RANGE);
      const isEnemyNear = nearby.length > 0;
      // The battle music swells as the fight crowds in, elites counting double
      const pressure = nearby.reduce((sum, enemy) => sum + (enemy.traits.isElite ? 2 : 1), 0);
      AudioManager.setMusicIntensity(Math.min(1, pressure / 5));
      this.combatMusicTimer = isEnemyNear ? COMBAT_MUSIC_LINGER : Math.max(0, this.combatMusicTimer - realDt);
      if (this.combatMusicTimer > 0) mood = 'combat';
    }

    AudioManager.setMusicMood(mood);
  }

  /** Tells the camera what the player is fighting, and feeds soft aim. */
  private updateCameraFocus(): void {
    const camera = this.cameraController;
    const playerPos = this.player.root.position;

    if (!this.dialogueManager.isActive) camera.dialogueFocus = null;

    const aimTargets: THREE.Vector3[] = [];
    let nearest: THREE.Vector3 | null = null;
    let nearestDistSq = COMBAT_FRAMING_RANGE * COMBAT_FRAMING_RANGE;
    for (const enemy of this.enemies) {
      if (enemy.health.isDead || !enemy.root.visible) continue;
      aimTargets.push(enemy.root.position);
      const distSq = enemy.root.position.distanceToSquared(playerPos);
      if (distSq < nearestDistSq) {
        nearest = enemy.root.position;
        nearestDistSq = distSq;
      }
    }

    const isFightingBoss = this.boss !== null && this.hasBossIntroPlayed && !this.isCinematicActive && !this.boss.health.isDead
      && this.boss.root.position.distanceToSquared(playerPos) < BOSS_FRAMING_RANGE * BOSS_FRAMING_RANGE;
    if (isFightingBoss) aimTargets.push(this.boss!.root.position);

    this.player.aimTargets = aimTargets;
    camera.isBossFocus = isFightingBoss;
    camera.combatFocus = this.lockTarget?.root.position ?? (isFightingBoss ? this.boss!.root.position : nearest);

    const glow = !this.boss || this.boss.health.isDead || !this.hasBossIntroPlayed
      ? 0
      : [14, 22, 34][this.boss.phase];
    this.lighting.setBossGlow(this.boss ? this.boss.root.position : null, glow);
  }

  /** A slow crane down over the valley as the intro text fades away. */
  private playOpeningShot(): void {
    if (SettingsManager.getInstance().get().reduceMotion) return;

    const player = this.player.root.position.clone();
    this.cameraController.playSequence([{
      duration: 4.2,
      sample: (t, position, look) => {
        const e = easeInOut(t);
        position.set(Math.sin(t * 1.4) * 5, THREE.MathUtils.lerp(17, player.y + 4, e), THREE.MathUtils.lerp(player.z + 5, player.z + 8.5, e));
        look.set(0, THREE.MathUtils.lerp(4, 1.5, e), THREE.MathUtils.lerp(player.z - 38, player.z, e));
        return THREE.MathUtils.lerp(38, 50, e);
      },
    }]);
  }

  /** Circles the fallen boss while the purification plays out. */
  private playBossDeathShot(boss: THREE.Vector3): void {
    this.cameraController.playSequence([{
      duration: 7,
      sample: (t, position, look) => {
        const angle = this.cameraController.yaw + t * 1.5;
        const radius = THREE.MathUtils.lerp(8.5, 11, t);
        position.set(boss.x + Math.sin(angle) * radius, THREE.MathUtils.lerp(1.2, 3.2, t), boss.z + Math.cos(angle) * radius);
        look.set(boss.x, 2.2, boss.z);
        return 42;
      },
    }]);
  }

  /**
   * Applies the build to the Ronin. Raising maximum health adds the difference
   * rather than healing outright, unless `isFullHeal`.
   */
  private applyPlayerStats(isFullHeal: boolean = false): void {
    const modifiers = this.build.modifiers;
    this.playerStats.apply(modifiers);
    const health = this.player.health;
    const oldMax = health.maxHealth;
    health.maxHealth = this.playerStats.maxHealth;
    health.currentHealth = isFullHeal
      ? health.maxHealth
      : Math.min(health.maxHealth, health.currentHealth + Math.max(0, health.maxHealth - oldMax));
    this.player.dashSystem['dashCooldown'] = this.playerStats.dashCooldown;
    this.player.damageMultiplier = this.playerStats.attackPower;
    this.player.applyBuild(modifiers, this.build.techniques);
    EventBus.emit('playerHealth', { current: health.currentHealth, max: health.maxHealth, delta: 0 });
    EventBus.emit('levelSync', { level: this.build.level });
  }

  private time: number = 0;

  /** Time runs slower for gameplay, while the camera and music carry on at full speed. */
  private startSlowMotion(scale: number, realSeconds: number): void {
    this.slowMotionScale = scale;
    this.slowMotionTimer = realSeconds;
  }

  public update(realDt: number, inputManager: InputManager): void {
    // Nothing moves while the next level is being built
    if (this.isTraveling) return;
    this.slowMotionTimer = Math.max(0, this.slowMotionTimer - realDt);
    const dt = this.slowMotionTimer > 0 ? realDt * this.slowMotionScale : realDt;

    this.time += dt;
    windTime.value = this.time;
    this.lighting.tick(dt, this.player.root.position);
    this.updateLockOn(inputManager);
    this.updateCameraFocus();
    this.updateMusicMood(realDt);

    if (GAME_CONFIG.DEBUG_MODE && inputManager.isPressed('KeyR')) {
      this.respawnAtCheckpoint();
    }

    this.vfx.update(dt, this.time);
    this.parryFlash.update(realDt);
    this.updateContactShadows();
    this.telegraphVfx.update(dt, this.time);

    // ─── Dialogue & Intro Block ──────────────────────────────────────
    const isDialogueActive = this.dialogueManager.isActive;
    const isIntroActive = this.storyManager.isIntroRunning;
    this.secrets.update(dt);
    this.levelSecrets?.update(dt);
    this.updateNpcPresence();
    if (this.shrineMenu.isOpen || this.worldMap.isOpen) return;

    if (isDialogueActive || isIntroActive) {
      // Update NPCs idle animation
      for (const npc of this.npcs) {
        npc.update(dt);
        if (isDialogueActive) npc.lookAt(this.player.root.position);
      }
      return; // Skip combat/movement processing
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= realDt;
      return; 
    }
    if (!this.levelBossDefeated) this.levelTimer += realDt;
    this.updateRunTimer(realDt);

    // Zone & Atmosphere updates
    const playerPos = this.player.root.position;
    if (this.level) {
      this.updateLevel(dt, realDt);
    } else {
      this.updateCourtyardAtmosphere(dt);
    }

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(dt);
      if (playerPos.distanceToSquared(npc.position) < 25) {
        npc.lookAt(playerPos);
      }
    }

    // Systems updates
    this.player.footing = 1 - (1 - this.footingAt(playerPos.x, playerPos.z)) * this.build.modifiers.footingResist;
    this.interactionSystem.update(playerPos, inputManager);
    this.hitboxSystem.clearActiveHitboxes();
    this.updateExecutionTarget();
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    this.spiritWaves.update(dt, this.hitboxSystem, this.player.damageMultiplier);
    this.updateEssenceDrop(dt);
    
    // Projectile & Hazard System update
    this.projectileSystem.update(dt, this.player, this.vfx, this.cameraController);
    this.arenaHazardSystem.update(dt, this.player);
    const { burn, splash } = this.levelHazards.update(dt, this.time, playerPos);
    if (burn > 0) this.hurtByHazard(burn, 'BURNING');
    if (splash > 0) this.hurtByHazard(splash);
    
    // Encounter Update
    this.encounterManager.update(dt, playerPos, this.scene);
    this.enemies = this.encounterManager.getActiveEnemies();
    this.celebrateWonFights();
    this.updateTrial(dt);
    
    // Group AI Update
    this.attackDirector.update(dt, this.enemies, playerPos);

    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, this.hitboxSystem, this.collisionSystem, this.vfx, this.projectileSystem, this.enemies);
      // The original yokai don't know about decks and ramps, so set them on the floor here
      if (this.level && !(enemy instanceof LevelEnemy)) {
        enemy.root.position.y = this.level.groundHeight(enemy.root.position.x, enemy.root.position.z);
      }
    }
    this.updateHazards(dt);
    this.updateEliteBar();
    this.updateBossAndHits(dt);
  }

  /** The original mountain's zones, fog and corruption. */
  private updateCourtyardAtmosphere(dt: number): void {
    const playerPos = this.player.root.position;
    let { fogDensity, fogColor, ambientColor, ambientIntensity } = this.zoneManager.getBlendedAtmosphere(playerPos, this.storyManager.flags);

    if (this.bossIsDefeatedSequence || this.playerProgress.crimsonOniDefeated) {
      // Force purified atmosphere in boss arena
      if (this.zoneManager.getCurrentZoneId() === 'BOSS_ARENA') {
        fogColor = new THREE.Color(0x1e2a44);
        fogDensity = 0.007;
        ambientColor = new THREE.Color(0xb8a8c0);
        ambientIntensity = 1.6;
      }

      if (this.bossIsDefeatedSequence) {
        this.purificationTimer += dt;
        ArenaGenerator.purifyArena(dt);
        if (this.purificationTimer > 8.0) {
          this.bossIsDefeatedSequence = false;
          if (this.boss) {
            this.scene.remove(this.boss.root);
            this.boss = null;
          }
        }
      }
    } else if (this.boss && this.boss.phase === BossPhaseId.PHASE_2) {
      fogColor = new THREE.Color(0x401010);
      fogDensity = 0.015;
      ambientColor = new THREE.Color(0xa84040);
      ambientIntensity = 1.3;
    } else if (this.boss && this.boss.phase === BossPhaseId.PHASE_3) {
      fogColor = new THREE.Color(0x4c0c0c);
      fogDensity = 0.021;
      ambientColor = new THREE.Color(0xc03030);
      ambientIntensity = 1.4;
    }

    WorldStateManager.getInstance().updateParticles(this.vfx, this.storyManager.flags);
    this.atmosphere.update(dt, playerPos, fogDensity, fogColor);
    this.lighting.update(dt, ambientColor, ambientIntensity);
    const zoneId = this.zoneManager.getCurrentZoneId();
    this.objectiveManager.onZoneEntered(zoneId);
    this.storyManager.onZoneChanged(zoneId);
    this.audioZoneManager.onZoneChanged(zoneId);
    this.audioZoneManager.update(dt);
    this.lighting.setMoonIntensity(2.6);
    this.lighting.setHeroLight(0xa8c4ff, 7, 12);
    this.atmosphere.sky.cloudiness = 0.42;
    this.courtyard?.exit?.update(this.time);
    this.courtyardExtras?.tick(this.time, dt, this.cameraController.camera);
    this.flickerCourtyardLanterns();
    SurfaceUniforms.uWetness.value += (0 - SurfaceUniforms.uWetness.value) * Math.min(1, dt * 0.5);
    this.courtyard?.exit?.setOpen(this.playerProgress.crimsonOniDefeated);
  }

  /** The Crimson Oni, then every hit landed this frame, then whether the Ronin still stands. */
  private updateBossAndHits(dt: number): void {

    // ─── Boss Update ──────────────────────────────────────────────
    
    // Trigger Cinematic Intro
    if (this.boss && this.player.root.position.z < -85 && !this.hasBossIntroPlayed) {
      this.hasBossIntroPlayed = true;
      this.healedDuringOni = false;

      if (this.hasSeenBossIntro) {
        // Retrying from the arena checkpoint goes straight back into the fight
        this.boss.endIntro();
        this.bossUI.showHealthBar('Crimson Oni');
        AudioManager.playBossPhase(1);
      } else {
        this.hasSeenBossIntro = true;
        this.isCinematicActive = true;
        this.hasShownTitle = false;
        this.player.isControlsEnabled = false;

        AudioManager.playBossIntro();
        this.boss.startIntro();
        this.bossIntroCamera.start(this.boss.root.position, this.player.root.position);
      }
    }

    if (this.isCinematicActive && this.boss) {
      if (this.bossIntroCamera.isHolding && !this.hasShownTitle) {
        this.chapterUI.hide();
        this.bossUI.showCinematicTitle('Crimson Oni', 2500);
        this.hasShownTitle = true;
      }

      if (!this.bossIntroCamera.isActive) {
        this.isCinematicActive = false;
        this.player.isControlsEnabled = true;
        this.boss.endIntro();
        this.bossUI.showHealthBar('Crimson Oni');
        AudioManager.playBossPhase(1);
      }
    }

    this.updateAllyStrikes(dt);

    if (this.boss) {
      // Don't update boss combat AI if cinematic is active
      if (!this.isCinematicActive) {
        this.boss.update(dt, this.player.root.position, this.hitboxSystem, this.collisionSystem, this.vfx);
      } else {
        // Still update animation during cinematic
        this.boss.update(dt, this.boss.root.position.clone(), this.hitboxSystem, this.collisionSystem, this.vfx);
      }
    }

    // ─── Hit Resolution ─────────────────────────────────────────────
    const hits = this.hitboxSystem.checkHits();
    if (hits.length > 0) {
      const { hitStopTime, result } = DamageSystem.resolveHits(
        hits, this.player, this.enemies, this.vfx, this.cameraController, this.boss
      );
      this.hitStopTimer = Math.max(this.hitStopTimer, hitStopTime);
    }
    this.hitboxSystem.update();
    this.updateTelegraphs();

    // ─── Check Player Death ───────────────────────────────────────
    if (this.player.health.currentHealth <= 0) {
      this.player.isControlsEnabled = false;
      if (this.trial) {
        this.endTrial(false);
        return;
      }
      this.dropEssence();
      this.deathsThisLevel++;
      GameStateManager.getInstance().setState(GameState.GAME_OVER);
    }
  }

  /**
   * Puts the player back at the last checkpoint and resets unfinished fights.
   * Level, essence, story and cleared encounters are all kept.
   */
  private respawnAtCheckpoint(): void {
    this.vfx.clear();
    this.telegraphVfx.clear();
    this.projectileSystem.clear();
    this.projectileSystem.clearAll();
    this.arenaHazardSystem.reset();

    this.encounterManager.resetIncomplete(this.scene);
    this.enemies = [];
    this.hitboxSystem.clearActiveHitboxes();
    this.hitboxSystem.clearHurtboxes();
    this.hitStopTimer = 0;
    this.spiritWaves.clear();

    this.resetBossEncounter();
    this.level?.reset();
    this.levelHazards.clear();
    this.countdown.set('', null);
    this.isLevelBossFight = false;
    this.lockTarget = null;
    this.slowMotionTimer = 0;
    this.combatMusicTimer = 0;
    this.revivePlayer(this.checkpointManager.getCheckpointPosition());

    EventBus.emit('playerRespawned', {});
  }

  /** Uses Ronin.reset because HealthComponent.heal does nothing once the player is dead. */
  private revivePlayer(position: THREE.Vector3): void {
    this.player.reset(position);
    this.player.isControlsEnabled = true;
    this.cameraController.dialogueFocus = null;
    this.cameraController.snapTo(position);
    this.occlusion.reset();
    EventBus.emit('playerHealth', { current: this.player.health.currentHealth, max: this.player.health.maxHealth, delta: 0 });
  }

  /** Returns the boss fight to its pre-intro state, reusing the existing boss so none is left behind. */
  private resetBossEncounter(): void {
    this.hasBossIntroPlayed = false;
    this.isCinematicActive = false;
    this.hasShownTitle = false;
    this.bossIsDefeatedSequence = false;
    this.bossUI.reset();

    if (this.playerProgress.crimsonOniDefeated) {
      if (this.boss) this.scene.remove(this.boss.root);
      this.boss = null;
      return;
    }

    ArenaGenerator.resetCorruption();
    if (!this.boss) {
      this.boss = new CrimsonOni();
      this.scene.add(this.boss.root);
    }
    this.boss.reset(new THREE.Vector3(0, 0, -115)); // Back of arena
  }

  // ─── Progression, combat depth and world secrets ──────────────

  private bindProgressionEvents(): void {
    EventBus.on('shrineRest', (data: { id: string }) => this.restAtShrine(data.id));

    EventBus.on('buildChanged', () => this.applyPlayerStats());

    EventBus.on('playerStrike', (data: { attackId: string; position: THREE.Vector3; direction: THREE.Vector3 }) => {
      if (data.attackId === 'ATTACK_WAVE') {
        this.spiritWaves.fire(data.position, data.direction, this.build.modifiers.hasTripleWave, this.hitboxSystem);
        AudioManager.play(AudioId.VFX_SPIRIT, { volume: 0.7 });
      } else if (data.attackId === 'ATTACK_EXECUTE') {
        this.resolveExecution(data.direction);
      }
    });

    EventBus.on('executionStarted', () => {
      this.executionVictim = this.executionCandidate;
      this.startSlowMotion(0.3, 0.9);
      this.cameraController.addShake(0.8);
      AudioManager.play(AudioId.SWORD_DRAW, { volume: 0.8 });
    });

    EventBus.on('parry', (data: { attackerId: string; position: THREE.Vector3 }) => {
      this.startSlowMotion(0.32, 0.55);
      this.cameraController.addShake(0.9);
      AudioManager.play(AudioId.SWORD_CLASH, { volume: 0.9 });
      EventBus.emit('damageNumber', { position: data.position.clone().setY(2.2), text: 'PARRY', kind: 'label' });
      this.vfx.spawnHit(data.position.clone().setY(1.4), new THREE.Vector3(0, 0, 1), true);
      const facing = new THREE.Vector3(Math.sin(this.player.root.rotation.y), 0, Math.cos(this.player.root.rotation.y));
      this.parryFlash.spawn(data.position.clone().setY(data.position.y + 1.3).addScaledVector(facing, 0.7), facing);

      const enemy = this.enemies.find(e => e.id === data.attackerId);
      if (enemy) DamageSystem.addPosture(enemy, enemy.traits.posture.max * 0.45);
      else if (this.boss && data.attackerId === this.boss.id) this.boss.applyPostureDamage(16);
    });

    EventBus.on('enemyDeath', () => {
      const heal = this.build.modifiers.healOnKill;
      if (heal > 0) this.player.heal(heal);
    });

    EventBus.on('eliteEnraged', (data: { name: string }) => {
      this.cameraController.addShake(1.6);
      AudioManager.play(AudioId.ARENA_BOSS_WARNING, { volume: 0.8 });
      EventBus.emit('notice', { title: `${data.name} rages`, text: 'Its attacks change. Watch for the warning.' });
    });

    EventBus.on('eliteSlam', () => {
      this.cameraController.addShake(1.4);
      AudioManager.play(AudioId.ARENA_GROUND_IMPACT, { volume: 0.7 });
    });

    EventBus.on('enemySummoned', (data: { position: THREE.Vector3 }) => {
      this.vfx.spawnDeath(data.position);
      AudioManager.play(AudioId.SHADOW_TELEPORT, { position: data.position, volume: 0.7 });
    });

    EventBus.on('enemyAmbush', (data: { position: THREE.Vector3 }) => {
      this.vfx.spawnHurt(data.position);
      this.cameraController.addShake(0.8);
      AudioManager.play(AudioId.SHADOW_TELEPORT, { position: data.position, volume: 0.9 });
      EventBus.emit('damageNumber', { position: data.position.clone().setY(2.3), text: 'AMBUSH', kind: 'label' });
    });

    EventBus.on('dialogueEffect', (data: { effect: string }) => this.applyDialogueEffect(data.effect));

    EventBus.on(StoryEvents.DIALOGUE_END, (data: { speakerId?: string | null }) => {
      if (data?.speakerId === 'crimson_heart' && this.isEndingChoicePending) {
        this.isEndingChoicePending = false;
        EventBus.emit('endingChosen', {});
      }
    });

    EventBus.on(StoryEvents.CHAPTER_START, (data: { chapter: { id: ChapterId } }) => {
      const technique = CHAPTER_TECHNIQUES[data.chapter.id];
      if (technique && this.build.learn(technique)) {
        const { name, how } = TECHNIQUES[technique];
        const bindings = SettingsManager.getInstance().get().keyBindings;
        const key = technique === 'spiritWave' ? keyName(bindings.spiritWave)
          : technique === 'dashStrike' ? `${keyName(bindings.dash)} then ${keyName(bindings.attack)}`
          : `${keyName(bindings.sprint)} + ${keyName(bindings.heavy)}`;
        setTimeout(() => EventBus.emit('notice', { title: `New technique: ${name}`, text: `${how}. (${key})` }), 3500);
        EventBus.emit('requestSave', {});
      }
    });

    EventBus.on('encounterComplete', (data: { id: string }) => {
      const config = [...EncounterDatabase.getAll(), ...(this.level?.encounters ?? [])].find(c => c.id === data.id);
      if (config?.charmReward && !this.build.charms.has(config.charmReward)) {
        this.build.addCharm(config.charmReward);
        const charm = CHARMS.find(c => c.id === config.charmReward)!;
        EventBus.emit('notice', { title: `Charm found: ${charm.name}`, text: charm.description });
      }
    });
  }

  /** Heals, saves, brings the yokai back, and opens the upgrade menu. */
  private restAtShrine(id: string): void {
    const shrine = SHRINES.find(s => s.id === id) ?? (this.level?.shrine.id === id ? this.level.shrine : undefined);
    if (!shrine) return;

    this.player.reset(shrine.rest);
    this.applyPlayerStats(true);
    this.checkpointManager.setCheckpointPosition(shrine.rest);
    this.cameraController.snapTo(shrine.rest);

    // Every fight but the boss comes back, as long as it has been fought before
    this.registerEncounters('all');
    this.level?.reset();
    this.levelHazards.clear();
    this.countdown.set('', null);
    this.isLevelBossFight = false;
    this.enemies = [];
    this.hitboxSystem.clearHurtboxes();
    this.projectileSystem.clearAll();
    this.arenaHazardSystem.reset();
    this.spiritWaves.clear();
    this.hazardTimers.clear();
    this.lockTarget = null;

    AudioManager.play(AudioId.SHRINE_ACTIVATE, { volume: 0.8 });
    EventBus.emit('requestSave', {});

    EventBus.emit('overlayMenu', { open: true });
    this.shrineMenu.open({
      shrineName: shrine.name,
      build: this.build,
      getEssence: () => this.playerProgress.spiritEssence,
      buySkill: (skill: SkillDef) => {
        this.playerProgress.removeEssence(skill.cost);
        this.build.buy(skill.id);
        this.applyPlayerStats(true);
        EventBus.emit('requestSave', {});
      },
      toggleCharm: (charmId: string) => {
        this.build.toggleCharm(charmId);
        EventBus.emit('requestSave', {});
      },
      openMap: () => this.openWorldMap(),
      onClose: () => EventBus.emit('overlayMenu', { open: false }),
    });
  }

  /** Death leaves unspent essence behind. Dying again before recovering it loses it. */
  private dropEssence(): void {
    if (this.essenceDrop) {
      this.essenceDrop.dispose();
      this.essenceDrop = null;
      EventBus.emit('notice', { title: 'Essence lost', text: 'You fell again before you could recover it.' });
    }

    const amount = this.playerProgress.spiritEssence;
    if (amount > 0) {
      this.playerProgress.removeEssence(amount);
      const at = this.player.root.position.clone();
      at.y = this.level ? this.level.groundHeight(at.x, at.z) : 0;
      this.essenceDropLevel = this.levelId;
      this.placeEssenceDrop(at, amount);
      setTimeout(() => EventBus.emit('notice', { title: `${amount} essence left behind`, text: 'Return to where you fell to recover it.' }), 1200);
    }
    EventBus.emit('requestSave', {});
  }

  private placeEssenceDrop(position: THREE.Vector3, amount: number): void {
    this.essenceDrop = new EssenceDrop(position, amount);
    this.scene.add(this.essenceDrop.root);
  }

  private updateEssenceDrop(dt: number): void {
    if (!this.essenceDrop || this.player.health.isDead || this.essenceDropLevel !== this.levelId) return;
    if (!this.essenceDrop.update(dt, this.player.root.position)) return;

    const amount = this.essenceDrop.amount;
    this.essenceDrop.dispose();
    this.essenceDrop = null;
    this.playerProgress.addEssence(amount);
    AudioManager.play(AudioId.SPIRIT_CHIME, { volume: 0.8 });
    EventBus.emit('notice', { title: 'Essence recovered', text: `${amount} Spirit Essence returned to you.` });
    EventBus.emit('requestSave', {});
  }

  /** The nearest guard-broken enemy in reach, offered to the Ronin to execute. */
  private updateExecutionTarget(): void {
    const position = this.player.root.position;
    let best: Enemy | CrimsonOni | null = null;
    let bestDist = EXECUTION_RANGE;

    for (const enemy of this.enemies) {
      if (enemy.health.isDead || !enemy.root.visible || !enemy.traits.posture.isBroken) continue;
      const dist = enemy.root.position.distanceTo(position);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    if (!best && this.boss && this.boss.isStaggered && !this.boss.health.isDead
      && this.boss.root.position.distanceTo(position) < BOSS_EXECUTION_RANGE) {
      best = this.boss;
    }

    this.executionCandidate = best;
    this.player.executionTarget = best ? best.root.position : null;
    if (!!best !== this.isExecutePromptShown) {
      this.isExecutePromptShown = !!best;
      EventBus.emit('executePrompt', { visible: !!best });
    }
  }

  private resolveExecution(direction: THREE.Vector3): void {
    const victim = this.executionVictim;
    this.executionVictim = null;
    if (!victim || victim.health.isDead) return;

    const isBoss = victim === this.boss;
    const enemy = isBoss ? null : victim as Enemy;
    const isLevelBoss = victim instanceof LevelEnemy && victim.isBoss;
    const damage = isBoss ? victim.health.maxHealth * 0.08 / Run.enemyToughness
      : isLevelBoss ? victim.health.maxHealth * 0.1 / Run.enemyToughness
      : enemy!.traits.isElite ? victim.health.maxHealth * 0.35 / Run.enemyToughness
      : victim.health.currentHealth;

    victim.takeDamage(Math.ceil(damage), direction, 14, 1.2);
    this.hitStopTimer = Math.max(this.hitStopTimer, 0.2);
    this.cameraController.addShake(2.2);
    this.vfx.spawnHit(victim.root.position.clone().setY(1.4), direction, true);
    AudioManager.play(AudioId.SWORD_HIT, { volume: 1 });
    EventBus.emit('damageNumber', { position: victim.root.position.clone().setY(2.6), text: 'EXECUTION', kind: 'label' });
    EventBus.emit('damageNumber', { position: victim.root.position.clone(), text: String(Math.ceil(damage)), kind: 'critical' });

    if (enemy) {
      DamageSystem.emitEnemyHealth(enemy, -damage);
      if (enemy.health.isDead) DamageSystem.emitDeath(enemy);
    }

    const { executionHeal, executionFocus } = this.build.modifiers;
    if (executionHeal > 0) this.player.heal(this.player.health.maxHealth * executionHeal);
    if (executionFocus > 0) this.player.addFocus(executionFocus);
  }

  /** Corruption bursts from the ground during fights that call for it. */
  private updateHazards(dt: number): void {
    for (const encounter of this.encounterManager.getAllEncounters()) {
      const hazard = encounter.config.hazard;
      if (!hazard || encounter.state !== EncounterState.ACTIVE) continue;
      // Only around the fight itself, not wherever the player wanders off to
      if (this.player.root.position.distanceTo(encounter.config.center) > encounter.config.leashRadius) continue;

      const timer = (this.hazardTimers.get(encounter.config.id) ?? hazard.interval) - dt;
      if (timer > 0) {
        this.hazardTimers.set(encounter.config.id, timer);
        continue;
      }
      this.hazardTimers.set(encounter.config.id, hazard.interval * (0.8 + Math.random() * 0.4));
      const offset = new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5);
      this.arenaHazardSystem.spawnHazard({
        position: this.player.root.position.clone().add(offset),
        radius: hazard.radius,
        damage: hazard.damage,
        telegraphDuration: 1.4,
        activeDuration: 0.5,
      });
    }
  }

  /** Chapter elites get the boss bar while they're close. */
  private updateEliteBar(): void {
    const position = this.player.root.position;
    const elite = this.enemies.find(e => e.traits.isElite && !e.health.isDead && e.root.visible
      && e.root.position.distanceTo(position) < ELITE_BAR_RANGE);

    if (elite) {
      if (this.eliteBarId !== elite.id) {
        this.eliteBarId = elite.id;
        this.bossUI.reset();
        this.bossUI.showHealthBar(elite.traits.displayName);
      }
      EventBus.emit('bossHealth', {
        current: elite.health.currentHealth,
        max: elite.health.maxHealth,
        phase: elite instanceof LevelEnemy && elite.isBoss
          ? [PhaseId.PHASE_1, PhaseId.PHASE_2, PhaseId.PHASE_3][Math.min(2, elite.phaseIndex)]
          : elite.traits.isEnraged ? PhaseId.PHASE_2 : PhaseId.PHASE_1,
      });
      EventBus.emit('bossPosture', { fraction: elite.traits.posture.isBroken ? 1 : elite.traits.posture.fraction });
    } else if (this.eliteBarId) {
      this.eliteBarId = null;
      this.bossUI.reset();
    }
  }

  /** Akane, if she fights beside you, cuts at the Oni, and at the Maw, from the shadows. */
  private updateAllyStrikes(dt: number): void {
    const oni = this.boss && this.hasBossIntroPlayed && !this.isCinematicActive && !this.boss.health.isDead ? this.boss : null;
    const maw = this.levelId === 'gate' ? this.nearLevelBoss() : null;
    const target = oni ?? maw;
    if (!target || !this.storyManager.flags.akaneAlly) {
      this.allyTimer = 0;
      return;
    }

    this.allyTimer += dt;
    if (this.allyTimer < ALLY_STRIKE_INTERVAL) return;
    this.allyTimer = 0;

    const toTarget = target.root.position.clone().sub(this.player.root.position).setY(0).normalize();
    const damage = Math.round(target.health.maxHealth * 0.035);
    if (oni) {
      oni.takeDamage(damage, toTarget, 0);
      oni.applyPostureDamage(14);
    } else if (maw) {
      maw.takeDamage(damage, toTarget, 0);
      DamageSystem.addPosture(maw, maw.traits.posture.max * 0.12);
      DamageSystem.emitEnemyHealth(maw, -damage);
      if (maw.health.isDead) DamageSystem.emitDeath(maw);
    }
    this.vfx.spawnSlash(target.root.position, toTarget, 3);
    AudioManager.play(AudioId.SWORD_HIT, { volume: 0.8 });
    EventBus.emit('damageNumber', { position: target.root.position.clone().setY(3.4), text: 'AKANE STRIKES', kind: 'label' });
  }

  private updateNpcPresence(): void {
    const flags = this.storyManager.flags;
    for (const npc of this.npcs) npc.root.visible = this.levelId === 'courtyard' && npc.isPresent(flags);
  }

  private applyDialogueEffect(effect: string): void {
    const story = this.storyManager.state;
    switch (effect) {
      case 'keeperTrust': {
        story.setFlag('keeperTrusted', true);
        this.build.addCharm('keepers_bell');
        const charm = CHARMS.find(c => c.id === 'keepers_bell')!;
        EventBus.emit('notice', { title: `Charm received: ${charm.name}`, text: charm.description });
        break;
      }
      case 'keeperPay':
        story.setFlag('keeperPaid', true);
        this.playerProgress.addEssence(60);
        break;
      case 'akaneMet':
        story.setFlag('akaneMet', true);
        break;
      case 'akaneShare': {
        const shared = this.playerProgress.removeEssence(40);
        story.setFlag('akaneTrusted', true);
        EventBus.emit('notice', { title: 'Essence shared', text: shared > 0 ? `You gave Akane ${shared} essence.` : 'You had nothing to give, but she saw you try.' });
        break;
      }
      case 'akaneAlly':
        story.setFlag('akaneAlly', true);
        break;
      case 'akaneRefuse':
        story.setFlag('akaneRefused', true);
        break;
      case 'endingPurify':
        story.setFlag('endingPurify', true);
        break;
      case 'endingClaim':
        story.setFlag('endingClaim', true);
        break;
    }
    EventBus.emit('requestSave', {});
  }

  private createSecretInteraction(secret: SecretDef): Interactable {
    const verb = secret.kind === 'charm' ? 'Take the charm' : secret.kind === 'scroll' ? 'Read the scroll' : 'Gather the essence';
    return {
      id: secret.id,
      position: new THREE.Vector3(secret.x, secret.y ?? 0, secret.z),
      radius: 2.2,
      label: `[E] ${verb}`,
      canInteract: () => !this.collected.has(secret.id),
      onInteract: () => this.collectSecret(secret),
    };
  }

  private collectSecret(secret: SecretDef): void {
    if (secret.kind === 'scroll' && secret.scroll) {
      // Scrolls can be read again; reading one counts as finding it
      this.dialogueManager.startDialogue(secret.scroll, secret.id);
    }
    if (this.collected.has(secret.id)) return;
    this.collected.add(secret.id);
    this.secrets.markCollected(secret.id);
    this.levelSecrets?.markCollected(secret.id);
    AudioManager.play(AudioId.UI_NOTIFICATION, { volume: 0.7 });
    const everySecret = LEVEL_ORDER.flatMap(level => LEVELS[level].secretIds);
    if (everySecret.every(id => this.collected.has(id))) grantAchievement('secrets_all');

    if (secret.kind === 'charm' && secret.charmId) {
      this.build.addCharm(secret.charmId);
      const charm = CHARMS.find(c => c.id === secret.charmId)!;
      const isWorn = this.build.isEquipped(charm.id);
      EventBus.emit('notice', { title: `Charm found: ${charm.name}`, text: `${charm.description}${isWorn ? ' Now worn.' : ' Wear it at a shrine.'}` });
    } else if (secret.kind === 'cache' && secret.essence) {
      this.playerProgress.addEssence(secret.essence);
      EventBus.emit('notice', { title: 'Hidden essence', text: `${secret.essence} Spirit Essence gathered.` });
    }
    EventBus.emit('requestSave', {});
  }

  private createWardInteraction(): Interactable {
    const scene = this;
    return {
      id: WARD.id,
      position: new THREE.Vector3(WARD.x + 1.2, 0, WARD.z),
      radius: 3.6,
      get label() {
        return scene.build.techniques.has('spiritWave') ? '[E] Break the spirit ward' : '[E] Examine the spirit ward';
      },
      canInteract: () => !this.collected.has(WARD.id),
      onInteract: () => {
        if (!this.build.techniques.has('spiritWave')) {
          EventBus.emit('notice', { title: 'A spirit ward', text: 'Paper charms bar the way. Only a wave of spirit could break them. Come back when you have learned one.' });
          return;
        }
        this.collected.add(WARD.id);
        this.secrets.breakWard();
        const everySecret = LEVEL_ORDER.flatMap(level => LEVELS[level].secretIds);
        if (everySecret.every(id => this.collected.has(id))) grantAchievement('secrets_all');
        this.vfx.spawnBossDeathEnergy(new THREE.Vector3(WARD.x, 1, WARD.z));
        this.cameraController.addShake(0.8);
        AudioManager.play(AudioId.SHRINE_PURIFY, { volume: 0.8 });
        EventBus.emit('notice', { title: 'The ward breaks', text: 'Something waits in the alcove beyond.' });
        EventBus.emit('requestSave', {});
      },
    };
  }

  /** Puts secrets, the ward and any dropped essence back as a save describes them. */
  private restoreWorldState(collected: string[], dropped: { x: number; y: number; z: number; amount: number } | null): void {
    this.collected = new Set(collected);
    this.secrets.resetAll();
    for (const id of this.collected) this.secrets.markCollected(id);
    if (this.collected.has(WARD.id)) this.secrets.breakWard();

    this.essenceDrop?.dispose();
    this.essenceDrop = null;
    if (dropped && dropped.amount > 0) this.placeEssenceDrop(new THREE.Vector3(dropped.x, dropped.y ?? 0, dropped.z), dropped.amount);
  }

  // ─── Levels ──────────────────────────────────────────────────────

  /** What the later yokai can reach: the player, the floor, and the level's hazards. */
  private bindLevelEnemyWorld(): void {
    LevelEnemy.world = {
      playerPosition: this.player.root.position,
      isPlayerRooted: () => this.player.isRooted,
      rootPlayer: seconds => {
        if (seconds <= 0) this.player.rootedTimer = 0;
        else this.player.grab(seconds);
      },
      hurtPlayer: (amount, direction, knockback) => {
        const before = this.player.health.currentHealth;
        this.player.takeDamage(amount, direction, knockback);
        const after = this.player.health.currentHealth;
        if (after === before) return;
        EventBus.emit('playerHealth', { current: after, max: this.player.health.maxHealth, delta: after - before });
        EventBus.emit('damageNumber', { position: this.player.root.position.clone(), text: String(before - after), kind: 'player' });
        this.player.glow.flash(0.8);
        this.cameraController.addShake(1.6);
        this.vfx.spawnHurt(this.player.root.position);
      },
      footing: (x, z) => this.footingAt(x, z),
      groundHeight: (x, z) => this.level ? this.level.groundHeight(x, z) : 0,
      spawnHazard: (kind, position, radius, damage) => this.spawnLevelHazard(kind, position, radius, damage),
      callout: (position, text) => EventBus.emit('damageNumber', { position: position.clone().setY(position.y + 2.6), text, kind: 'label' }),
      onPhase: (_name, title, text) => {
        this.cameraController.addShake(2.2);
        this.startSlowMotion(0.5, 0.6);
        AudioManager.play(AudioId.BOSS_ROAR_01, { volume: 0.9 });
        EventBus.emit('notice', { title, text });
      },
    };

    EventBus.on('encounterStarted', (data: { id: string }) => {
      if (this.trial) return;
      if (this.level && data.id === this.level.bossEncounterId) this.onLevelBossStart();
      if (data.id === 'enc_gate_akane') this.dialogueManager.startDialogue(AKANE_REMATCH_DIALOGUE, 'akane_rematch');
    });

    EventBus.on('enemyDeath', (data: { enemyType: string; position: THREE.Vector3 }) => {
      if (this.trial) {
        this.trial.kills++;
        return;
      }
      if (this.level && data.enemyType === this.levelBossType()) {
        this.onLevelBossDefeated(data.position);
        this.dropNgPlusCharm(data.enemyType);
      }
      if (data.enemyType === 'AKANE') {
        setTimeout(() => this.dialogueManager.startDialogue(AKANE_YIELDS_DIALOGUE, 'akane_yields'), 1600);
      }
    });

    EventBus.on('grabEscaped', (data: { position: THREE.Vector3 }) => {
      this.cameraController.addShake(0.6);
      AudioManager.play(AudioId.SWORD_CLASH, { volume: 0.6 });
      this.vfx.spawnHit(data.position.clone().setY(1.2), new THREE.Vector3(0, 0, 1), false);
    });
  }

  /** Builds the gate onward at the back of the Oni's arena. It opens when the Oni falls. */
  private buildCourtyardExit(world: THREE.Group): void {
    const builder = new LevelBuilder('CourtyardExit', this.collisionSystem, 77);
    const exit = builder.exitGate(COURTYARD_EXIT.x, COURTYARD_EXIT.z, 0, 0xff6a4a);
    // Moonlight falling through the forest canopy
    const beams = builder.shafts({ color: 0xb0c8ff, opacity: 0.42, width: [1.4, 2.8], length: 20 });
    for (const [x, z] of [[-3, -24], [4, -29], [-6, -35], [2, -40], [7, -44], [-4, -47], [5, -33], [-8, -27]]) {
      beams.add(new THREE.Vector3(x, 0, z), () => builder.random.next());
    }
    this.courtyardExtras = builder;
    // Banners along the climb
    for (const [x, z, r] of [[-5, 50, 0.4], [5, 50, -0.4], [-4.6, 23.5, 0.2], [4.6, 23.5, -0.2], [-3.6, -15, 0], [3.6, -15, 0]] as [number, number, number][]) {
      builder.banner(x, z, 4.6, 0x8a1418, { rotY: r, mark: 0xe8dcc0 });
    }
    builder.finish();
    world.add(builder.group);
    WorldLights.sources.push(...builder.lights);
    this.courtyard = {
      world,
      interactions: this.interactionSystem,
      boxes: [],
      spheres: [],
      lights: [],
      bounds: { ...GAME_CONFIG.WORLD.BOUNDS },
      occluders: [],
      exit,
    };
    this.interactionSystem.register(this.createExitInteraction(
      COURTYARD_EXIT.clone().setZ(COURTYARD_EXIT.z + 2.5),
      () => this.playerProgress.crimsonOniDefeated,
    ));
  }

  private createExitInteraction(position: THREE.Vector3, isOpen: () => boolean): Interactable {
    return {
      id: 'level_exit',
      position,
      radius: 4.2,
      label: '[E] Pass through the gate',
      canInteract: isOpen,
      onInteract: () => this.openWorldMap(nextLevel(this.levelId) ?? this.levelId),
    };
  }

  private openWorldMap(suggested?: LevelId): void {
    if (this.worldMap.isOpen) return;
    EventBus.emit('overlayMenu', { open: true });
    this.worldMap.open({
      current: this.levelId,
      unlocked: new Set(this.levelProgress.unlocked),
      cleared: new Set(this.levelProgress.cleared),
      bestTimes: this.levelProgress.bestTimes,
      secretsFound: id => LEVELS[id].secretIds.filter(secret => this.collected.has(secret)).length,
      suggested,
      onTravel: id => void this.travel(id),
      onClose: () => EventBus.emit('overlayMenu', { open: false }),
    });
  }

  /** Puts the save's level record in order, including saves from before levels existed. */
  private normalizeLevelProgress(saved: Partial<LevelProgressSave> | undefined, oniDefeated: boolean): LevelProgressSave {
    const progress: LevelProgressSave = {
      current: saved?.current ?? 'courtyard',
      unlocked: [...(saved?.unlocked ?? ['courtyard'])],
      cleared: [...(saved?.cleared ?? [])],
      bestTimes: { ...(saved?.bestTimes ?? {}) },
    };
    if (oniDefeated && !progress.cleared.includes('courtyard')) progress.cleared.push('courtyard');
    for (const id of ['courtyard' as LevelId, ...progress.cleared]) {
      if (!progress.unlocked.includes(id)) progress.unlocked.push(id);
      const next = progress.cleared.includes(id) ? nextLevel(id) : null;
      if (next && !progress.unlocked.includes(next)) progress.unlocked.push(next);
    }
    if (!LEVEL_ORDER.includes(progress.current) || !progress.unlocked.includes(progress.current)) progress.current = 'courtyard';
    return progress;
  }

  /** Shows the loading card, swaps the level in, and puts the Ronin at its start. */
  public async travel(id: LevelId, options: { spawnAt?: THREE.Vector3; isLoad?: boolean } = {}): Promise<void> {
    if (this.isTraveling) return;
    this.isTraveling = true;
    EventBus.emit('overlayMenu', { open: true });
    EventBus.emit('hideInteractPrompt', {});
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const started = performance.now();
    this.loadingCard.show(LEVELS[id]);

    try {
      await wait(80);
      this.loadingCard.progress(0.2);
      this.swapTo(id);
      this.loadingCard.progress(0.65);
      await wait(40);
      // Compile the new level's shaders now, rather than stuttering through its first seconds
      try {
        this.renderer?.compile(this.scene, this.cameraController.camera);
      } catch {
        // Compiling early is only an optimisation
      }
      this.loadingCard.progress(0.9);

      const spawn = (options.spawnAt ?? (this.level ? this.level.spawn : new THREE.Vector3(0, 0, GAME_CONFIG.PLAYER.SPAWN_Z))).clone();
      spawn.y = this.level ? this.level.groundHeight(spawn.x, spawn.z) : 0;
      this.checkpointManager.setCheckpointPosition(spawn.clone());
      this.revivePlayer(spawn);
      this.applyPlayerStats(true);

      const elapsed = (performance.now() - started) / 1000;
      if (elapsed < MIN_CARD_SECONDS) await wait((MIN_CARD_SECONDS - elapsed) * 1000);
      this.loadingCard.progress(1);
      await wait(250);
    } catch (error) {
      console.error('[Levels] Could not build the level.', error);
      if (this.levelId !== 'courtyard') this.swapTo('courtyard');
      this.revivePlayer(new THREE.Vector3(0, 0, GAME_CONFIG.PLAYER.SPAWN_Z));
      EventBus.emit('notice', { title: 'The way is closed', text: 'Something went wrong building that level. You are back at the Crimson Courtyard.' });
    } finally {
      this.loadingCard.hide();
      this.isTraveling = false;
      EventBus.emit('overlayMenu', { open: false });
    }

    this.announceLevel();
    EventBus.emit('requestSave', {});
  }

  /** The chapter card and objective for the level just arrived in. */
  private announceLevel(): void {
    const info = LEVELS[this.levelId];
    if (this.levelId === 'arena') return;
    if (this.levelId !== 'courtyard') {
      const story = this.storyManager.state;
      if (CHAPTER_ORDER.indexOf(info.chapter) > CHAPTER_ORDER.indexOf(story.currentChapter)) story.currentChapter = info.chapter;
      EventBus.emit(StoryEvents.CHAPTER_START, { chapter: CHAPTERS[info.chapter] });
    }
    const isOpen = this.isExitOpen();
    const text = this.levelId === 'courtyard'
      ? (this.playerProgress.crimsonOniDefeated ? 'PASS THROUGH THE CRIMSON GATE' : this.objectiveManager.getActive()?.description ?? info.objective)
      : this.levelId === 'gate' && this.levelBossDefeated ? 'THE GATE IS CLOSED'
      : isOpen ? 'PASS THROUGH THE GATE' : info.objective;
    EventBus.emit('objectiveUpdate', { text });
  }

  /** Puts the current level away and brings another in, all at once. */
  private swapTo(id: LevelId): void {
    this.leaveCurrentLevel();
    this.levelId = id;
    this.levelProgress.current = id;
    if (id === 'courtyard') this.enterCourtyard();
    else this.enterLevel(id);

    AudioManager.setMusicTheme(LEVELS[id].music, id !== 'courtyard');
    EventBus.emit('levelGrade', { grade: LEVELS[id].grade });
    this.deathsThisLevel = 0;
    this.levelTimer = 0;
    this.isLevelBossFight = false;
    this.levelBossDefeated = id === 'courtyard'
      ? this.playerProgress.crimsonOniDefeated
      : this.levelProgress.cleared.includes(id) || this.playerProgress.hasClearedEncounter(this.level!.bossEncounterId);
    this.registerEncounters('all');
    this.syncEssenceDropVisibility();
    this.lockTarget = null;
    this.eliteBarId = null;
    this.bossUI.reset();
    this.countdown.set('', null);
    this.occlusion.reset();
  }

  private leaveCurrentLevel(): void {
    // Fights, shots and hazards belong to the level being left
    this.encounterManager.resetAll(this.scene);
    this.encounterManager.clearAll();
    this.enemies = [];
    this.hitboxSystem.clearActiveHitboxes();
    this.hitboxSystem.clearHurtboxes();
    this.projectileSystem.clearAll();
    this.arenaHazardSystem.reset();
    this.levelHazards.clear();
    this.spiritWaves.clear();
    this.hazardTimers.clear();
    this.vfx.clear();
    this.telegraphVfx.clear();
    EventBus.emit('hideInteractPrompt', {});

    if (this.levelId === 'courtyard') {
      const courtyard = this.courtyard ?? {
        world: null, interactions: this.interactionSystem, boxes: [], spheres: [], lights: [],
        bounds: { ...GAME_CONFIG.WORLD.BOUNDS }, occluders: [], exit: null,
      };
      this.courtyard = courtyard;
      courtyard.world?.removeFromParent();
      courtyard.boxes = this.collisionSystem.boxes;
      courtyard.spheres = this.collisionSystem.spheres;
      courtyard.lights = WorldLights.sources;
      courtyard.bounds = { ...GAME_CONFIG.WORLD.BOUNDS };
      courtyard.occluders = this.occlusion.takeAll();
      courtyard.interactions = this.interactionSystem;
      this.secrets.group.visible = false;
      if (this.boss) {
        this.scene.remove(this.boss.root);
        this.boss = null;
      }
      this.hasBossIntroPlayed = false;
      this.isCinematicActive = false;
      this.bossIsDefeatedSequence = false;
    } else if (this.level) {
      this.levelSecrets?.group.removeFromParent();
      this.levelSecrets = null;
      this.occlusion.takeAll();
      this.level.dispose();
      this.level = null;
    }
    this.collisionSystem.boxes = [];
    this.collisionSystem.spheres = [];
  }

  private enterCourtyard(): void {
    const courtyard = this.courtyard!;
    if (courtyard.world) this.scene.add(courtyard.world);
    this.collisionSystem.boxes = courtyard.boxes;
    this.collisionSystem.spheres = courtyard.spheres;
    WorldLights.sources = courtyard.lights;
    Object.assign(GAME_CONFIG.WORLD.BOUNDS, courtyard.bounds);
    this.occlusion.restore(courtyard.occluders as never);
    this.interactionSystem = courtyard.interactions;
    this.secrets.group.visible = true;
    this.player.groundHeight = null;
    this.player.surfaceAt = null;
    this.resetBossEncounter();
  }

  private enterLevel(id: Exclude<LevelId, 'courtyard'>): void {
    const level = buildLevel(id, this.collisionSystem);
    this.level = level;
    this.scene.add(level.group);
    WorldLights.sources = level.lights;
    Object.assign(GAME_CONFIG.WORLD.BOUNDS, level.bounds);
    for (const occluder of level.occluders) this.occlusion.register(occluder);
    this.player.groundHeight = level.groundHeight;
    const ground = id === 'bamboo' || id === 'village' ? 'grass' : 'stone';
    this.player.surfaceAt = (x, z) => level.groundHeight(x, z) > 0.25 ? 'wood' : this.footingAt(x, z) < 0.9 ? 'water' : ground;

    const interactions = new InteractionSystem();
    interactions.register(new ShrineInteraction(level.shrine.id, level.shrine.name, level.shrine.position));
    this.levelSecrets = new WorldSecrets(this.collisionSystem, level.secrets, false);
    level.group.add(this.levelSecrets.group);
    for (const secretId of this.collected) this.levelSecrets.markCollected(secretId);
    for (const secret of level.secrets) interactions.register(this.createSecretInteraction(secret));
    interactions.register(this.createExitInteraction(level.exit.clone().setZ(level.exit.z + 2.5), () => this.isExitOpen()));
    this.interactionSystem = interactions;
  }

  /** The way on is open once the guardian falls, or, for the temple, once you've escaped. */
  private isExitOpen(): boolean {
    if (this.levelId === 'courtyard') return this.playerProgress.crimsonOniDefeated;
    if (!this.level || !this.levelBossDefeated) return false;
    return !this.level.defersCompletion || this.levelProgress.cleared.includes(this.levelId);
  }

  /** The fights of the level the Ronin is in. */
  private levelEncounters(): EncounterConfig[] {
    return this.level ? this.level.encounters : EncounterDatabase.getAll();
  }

  /** Registers the current level's fights. 'all' brings every fight back, as resting does. */
  private registerEncounters(mode: 'all' | 'uncleared'): void {
    this.encounterStates.clear();
    this.encounterManager.resetAll(this.scene);
    this.encounterManager.clearAll();
    const flags = this.storyManager.flags;
    for (const config of this.levelEncounters()) {
      if (config.requiresFlag && !flags[config.requiresFlag]) continue;
      if (config.unlessFlag && flags[config.unlessFlag]) continue;
      const isCleared = this.playerProgress.hasClearedEncounter(config.id);
      if (config.once && isCleared) continue;
      if (this.level && config.id === this.level.bossEncounterId && this.levelBossDefeated) continue;
      if (mode === 'uncleared' && isCleared) continue;
      this.encounterManager.registerEncounter(config);
    }
  }

  private levelBossType(): string | null {
    const level = this.level;
    if (!level) return null;
    return level.encounters.find(c => c.id === level.bossEncounterId)?.waves[0]?.enemies[0]?.type ?? null;
  }

  /** The current level's guardian, if it's alive and close. */
  private nearLevelBoss(): LevelEnemy | null {
    const position = this.player.root.position;
    for (const enemy of this.enemies) {
      if (enemy instanceof LevelEnemy && enemy.isBoss && !enemy.health.isDead && enemy.root.visible
        && enemy.root.position.distanceTo(position) < LEVEL_BOSS_RANGE) return enemy;
    }
    return null;
  }

  private onLevelBossStart(): void {
    this.isLevelBossFight = true;
    const type = this.levelBossType();
    const name = this.enemies.find(e => e.enemyType === type)?.traits.displayName ?? LEVELS[this.levelId].boss;
    this.chapterUI.hide();
    this.bossUI.showCinematicTitle(name, 2500);
    this.cameraController.addShake(1.5);
    AudioManager.play(AudioId.BOSS_ROAR_02, { volume: 0.9 });
    EventBus.emit('objectiveUpdate', { text: `DEFEAT ${name.toUpperCase()}` });
    this.level?.onBossStart?.(this.levelContext(0));
  }

  private onLevelBossDefeated(position: THREE.Vector3): void {
    if (this.levelBossDefeated) return;
    this.levelBossDefeated = true;
    this.isLevelBossFight = false;
    this.startSlowMotion(0.25, 1.4);
    this.hitStopTimer = 0.4;
    this.cameraController.addShake(4);
    this.vfx.spawnBossDeathEnergy(position.clone());
    AudioManager.playBossDefeat();
    this.level?.onBossDefeated?.(this.levelContext(0));
    if (!this.level?.defersCompletion) this.completeLevel(this.levelId);

    if (this.levelId === 'gate') {
      // What remains of the Maw offers a choice, and the ending follows from it
      setTimeout(() => {
        this.isEndingChoicePending = true;
        this.dialogueManager.startDialogue(CRIMSON_HEART_DIALOGUE, 'crimson_heart');
      }, 4500);
      EventBus.emit('objectiveUpdate', { text: 'FACE WHAT REMAINS' });
    } else if (this.level?.defersCompletion) {
      EventBus.emit('objectiveUpdate', { text: 'ESCAPE THE TEMPLE' });
    }
  }

  /** Records the clear, the time, and opens the next level. */
  private completeLevel(id: LevelId): void {
    if (this.trial) return;
    const progress = this.levelProgress;
    if (!progress.cleared.includes(id)) progress.cleared.push(id);
    grantAchievement(`clear_${id}`);
    if (id === this.levelId && this.deathsThisLevel === 0) grantAchievement('flawless');
    const time = this.levelId === id && this.levelTimer > 1 ? this.levelTimer : null;
    let isBest = false;
    if (time !== null) {
      const best = progress.bestTimes[id];
      if (best === undefined || time < best) {
        progress.bestTimes[id] = time;
        isBest = best !== undefined;
      }
    }
    const next = nextLevel(id);
    const isNewlyOpen = next !== null && !progress.unlocked.includes(next);
    if (next && isNewlyOpen) progress.unlocked.push(next);
    if (id === 'bamboo' && this.build.slotCount < 3) {
      this.build.setSlotCount(3);
      setTimeout(() => EventBus.emit('notice', { title: 'A third charm slot', text: 'You can now wear three charms at once. Choose them at any shrine.' }), 6000);
    }

    const parts: string[] = [];
    if (time !== null) parts.push(`Cleared in ${formatTime(time)}${isBest ? ', a new best' : ''}.`);
    if (next && isNewlyOpen) parts.push(`${LEVELS[next].name} is open. Pass through the gate, or travel from any shrine.`);
    setTimeout(() => EventBus.emit('notice', { title: `${LEVELS[id].name} cleared`, text: parts.join(' ') || 'The way on is open.' }), 2500);
    if (id === this.levelId && id !== 'courtyard' && id !== 'gate') EventBus.emit('objectiveUpdate', { text: 'PASS THROUGH THE GATE' });
    EventBus.emit('requestSave', {});
  }

  /** Everything a level's rules can see and do this frame. */
  private levelContext(dt: number): LevelContext {
    return {
      dt,
      time: this.time,
      player: this.player,
      enemies: this.enemies,
      vfx: this.vfx,
      camera: this.cameraController,
      hazards: this.arenaHazardSystem,
      projectiles: this.projectileSystem,
      flags: this.storyManager.flags,
      isBossFight: this.isLevelBossFight,
      isBossDefeated: this.levelBossDefeated,
      hurtPlayer: (amount, label) => this.hurtByHazard(amount, label),
      notice: (title, text) => EventBus.emit('notice', { title, text }),
      hazardResist: this.build.modifiers.hazardResist,
      spawnHazard: (kind, position, radius, damage, life) => this.spawnLevelHazard(kind, position, radius, damage, life),
      teleportPlayer: position => { this.player.root.position.copy(position); },
      memory: {
        has: id => this.collected.has(id),
        add: id => {
          this.collected.add(id);
          EventBus.emit('requestSave', {});
        },
      },
      completeLevel: () => this.completeLevel(this.levelId),
      setCountdown: (label, seconds) => this.countdown.set(label, seconds),
    };
  }

  /** The level's own rules, then its fog and light. */
  private updateLevel(dt: number, realDt: number): void {
    void realDt;
    const level = this.level!;
    const position = this.player.root.position;
    this.player.externalPush.set(0, 0, 0);
    const frame = level.update(this.levelContext(dt)) || {};
    const air = { ...level.atmosphere, ...frame };
    this.atmosphere.sky.cloudiness = air.cloudiness ?? 0.5;
    SurfaceUniforms.uWetness.value += ((air.wetness ?? 0) - SurfaceUniforms.uWetness.value) * Math.min(1, dt * 0.5);
    this.atmosphere.update(dt, position, air.fogDensity, new THREE.Color(air.fogColor));
    this.lighting.update(dt, new THREE.Color(air.ambientColor), air.ambientIntensity);
    this.lighting.setMoonIntensity(air.moonIntensity ?? 2.6);
    const hero = air.heroLight ?? { color: 0xa8c4ff, intensity: 7, distance: 12 };
    this.lighting.setHeroLight(hero.color, hero.intensity, hero.distance);
    this.audioZoneManager.onZoneChanged(level.audioZone);
    this.audioZoneManager.update(dt);
  }

  /** How surely the ground holds here: water, webs and floods slow everyone but kappa. */
  private footingAt(x: number, z: number): number {
    if (!this.level) return 1;
    return Math.min(this.level.footing(x, z), this.levelHazards.footingAt(x, z));
  }

  private spawnLevelHazard(kind: HazardKind, position: THREE.Vector3, radius: number, damage: number, life?: number): void {
    if (kind === 'burst') {
      this.arenaHazardSystem.spawnHazard({ position: position.clone(), radius, damage, telegraphDuration: 1.2, activeDuration: 0.5 });
    } else {
      this.levelHazards.spawn(kind, position, radius, damage, life);
    }
  }

  /** Fire, falls and the like. The Ash Sutra halves it. */
  private hurtByHazard(amount: number, label?: string): void {
    if (this.player.health.isDead) return;
    const damage = Math.max(1, Math.round(amount * this.build.modifiers.hazardResist));
    this.player.takeHazardDamage(damage);
    this.player.glow.flash(0.5);
    EventBus.emit('damageNumber', { position: this.player.root.position.clone(), text: String(damage), kind: 'player' });
    if (label) EventBus.emit('damageNumber', { position: this.player.root.position.clone().setY(this.player.root.position.y + 2.4), text: label, kind: 'label' });
  }

  /** Candlelight behind paper never burns quite steady. */
  private flickerCourtyardLanterns(): void {
    const t = this.time;
    LanternGenerator.flameMaterials.forEach((material, i) => {
      const base = (material.userData.base as THREE.Color | undefined) ?? (material.userData.base = material.color.clone());
      const flicker = 0.85 + Math.sin(t * 8.7 + i * 2.1) * 0.08 + Math.sin(t * 21 + i * 4.3) * 0.05;
      material.color.copy(base).multiplyScalar(flicker);
    });
  }

  /** A soft shadow right under everyone standing on the ground. */
  private updateContactShadows(): void {
    const casters: ShadowCaster[] = [];
    if (this.player.root.visible) casters.push({ position: this.player.root.position, radius: 0.55, strength: 1 });
    for (const enemy of this.enemies) {
      if (!enemy.root.visible) continue;
      const scale = enemy.root.scale.x;
      const radius = (enemy instanceof LevelEnemy ? enemy.config.hurtboxRadius : 0.6) * scale;
      casters.push({ position: enemy.root.position, radius, strength: enemy.health.isDead ? scale : 1 });
    }
    if (this.boss?.root.visible) casters.push({ position: this.boss.root.position, radius: 2, strength: this.boss.health.isDead ? 0.5 : 1 });
    for (const npc of this.npcs) if (npc.root.visible) casters.push({ position: npc.root.position, radius: 0.5, strength: 1 });
    this.contactShadows.update(casters, (x, z) => this.level ? this.level.groundHeight(x, z) : 0);
  }

  /** The last blow of a fight lands in slow motion. Bosses have their own, longer, moment. */
  private celebrateWonFights(): void {
    for (const encounter of this.encounterManager.getAllEncounters()) {
      const id = encounter.config.id;
      const was = this.encounterStates.get(id);
      this.encounterStates.set(id, encounter.state);
      if (encounter.state !== EncounterState.COMPLETED || was === undefined || was === EncounterState.COMPLETED) continue;
      if (this.level && id === this.level.bossEncounterId) continue;
      this.startSlowMotion(0.3, 0.75);
      this.cameraController.addShake(1);
    }
  }

  /** Essence left in one level waits there, out of sight elsewhere. */
  private syncEssenceDropVisibility(): void {
    if (this.essenceDrop) this.essenceDrop.root.visible = this.essenceDropLevel === this.levelId;
  }

  // ─── Reasons to come back ────────────────────────────────────────

  private bindReplayEvents(): void {
    bindAchievementTracking();

    EventBus.on('playerHealth', (data: { delta: number }) => {
      if (data.delta > 0 && this.boss && this.hasBossIntroPlayed && !this.boss.health.isDead) this.healedDuringOni = true;
    });

    EventBus.on('templeEscaped', (data: { remaining: number }) => {
      if (data.remaining >= 15) grantAchievement('escape_fast');
    });

    // Finishing the game opens Crimson difficulty, and records how it ended
    EventBus.on('endingChosen', () => {
      const flags = this.storyManager.flags;
      Records.unlockCrimson();
      if (flags.endingClaim) grantAchievement('ending_claim');
      if (flags.endingPurify) grantAchievement('ending_purify');
      if (flags.akaneAlly && !flags.endingClaim) grantAchievement('ending_akane');
      if (Run.difficulty === 'crimson') grantAchievement('crimson_clear');
    });

    EventBus.on('startTrial', (data: { mode: TrialMode }) => void this.startTrial(data.mode));
  }

  /** In New Game+, each guardian drops a charm the first time it falls again. */
  private dropNgPlusCharm(enemyType: string): void {
    if (Run.ngPlus < 1 || this.trial) return;
    const charmId = NG_PLUS_DROPS[enemyType];
    if (!charmId || this.build.charms.has(charmId)) return;
    this.build.addCharm(charmId);
    const charm = CHARMS.find(c => c.id === charmId)!;
    setTimeout(() => EventBus.emit('notice', { title: `Charm found: ${charm.name}`, text: charm.description }), 4000);
    EventBus.emit('requestSave', {});
  }

  /** The clock in the corner: this level against its best, or the Trial's progress. */
  private updateRunTimer(realDt: number): void {
    if (this.trial) {
      const trial = this.trial;
      if (!trial.isOver) trial.time += realDt;
      if (trial.mode === 'bossRush') this.runTimer.showText(formatTime(trial.time), `Guardian ${Math.min(5, trial.wave)} of 5`);
      else this.runTimer.showText(`Wave ${trial.wave}`, `${trial.kills} kills · ${formatTime(trial.time)}`);
      return;
    }
    if (!SettingsManager.getInstance().get().showRunTimer) {
      this.runTimer.hide();
      return;
    }
    const info = LEVELS[this.levelId];
    this.runTimer.showLevel(info.numeral, this.levelTimer, this.levelProgress.bestTimes[this.levelId], this.levelBossDefeated);
  }

  // ─── Trials ──────────────────────────────────────────────────────

  /**
   * Starts a Boss Rush or Arena run in the Trial Arena, with the build from the
   * most recent save. Nothing a Trial does is saved, except its score.
   */
  public async startTrial(mode: TrialMode): Promise<void> {
    const save = SaveManager.getInstance().listSlots()
      .map(s => s.save)
      .filter(Boolean)
      .sort((a, b) => (b!.savedAt ?? 0) - (a!.savedAt ?? 0))[0];
    this.build.load(save?.build);
    if (save?.levels?.cleared.includes('bamboo')) this.build.setSlotCount(3);
    for (const technique of ['dashStrike', 'spiritWave', 'crimsonWhirl'] as TechniqueId[]) this.build.techniques.add(technique);
    Run.reset('normal', 0);
    this.trial = { mode, wave: 0, kills: 0, time: 0, isOver: false, resting: 0 };
    this.essenceDrop?.dispose();
    this.essenceDrop = null;

    await this.travel('arena');
    this.applyPlayerStats(true);
    EventBus.emit('objectiveUpdate', { text: mode === 'bossRush' ? 'DEFEAT THE FIVE GUARDIANS' : 'SURVIVE THE WAVES' });
    this.nextTrialWave();
  }

  private nextTrialWave(): void {
    const trial = this.trial;
    if (!trial || trial.isOver) return;
    trial.wave++;

    let enemies: EnemySpawnDef[];
    if (trial.mode === 'bossRush') {
      const order: EnemyKind[] = ['UMIBOZU', 'JOROGUMO', 'FALLEN_SAMURAI', 'AKANE', 'MAW_OF_YOMI'];
      if (trial.wave > order.length) {
        this.endTrial(true);
        return;
      }
      enemies = [{ type: order[trial.wave - 1], offset: new THREE.Vector3(0, 0, -12) }];
    } else {
      enemies = this.arenaWave(trial.wave);
      // Each wave is a little tougher than the last
      Run.trialToughness = 1 + (trial.wave - 1) * 0.07;
    }

    this.encounterManager.registerEncounter({
      id: `trial_${trial.mode}_${trial.wave}`,
      center: new THREE.Vector3(0, 0, 0),
      activationRadius: 999,
      leashRadius: 60,
      waves: [{ enemies, delayAfterComplete: 0 }],
    });
    this.cameraController.addShake(0.8);
    AudioManager.play(AudioId.ARENA_BOSS_WARNING, { volume: 0.6 });
    EventBus.emit('notice', {
      title: trial.mode === 'bossRush' ? `Guardian ${trial.wave} of 5` : `Wave ${trial.wave}`,
      text: trial.mode === 'bossRush' ? 'It rises from the stone.' : `${enemies.length} yokai close in.`,
    });
  }

  /** A wave for the endless Arena, built from a budget that grows each time. */
  private arenaWave(wave: number): EnemySpawnDef[] {
    const pool: [EnemyKind, number][] = [
      ['BASIC_YOKAI', 1], ['SHADOW_YOKAI', 1.5], ['KAMAITACHI', 1.5], ['SHIELDED_YOKAI', 1.5],
      ['KAPPA', 2], ['TENGU', 2], ['POSSESSED_MONK', 2], ['LURKING_SHADE', 2], ['SHADOW_CALLER', 2.5],
    ];
    // Early waves draw only from the simpler yokai
    const unlocked = pool.slice(0, Math.min(pool.length, 3 + wave));
    let budget = 2.5 + wave * 1.4;
    const enemies: EnemySpawnDef[] = [];
    const spot = (i: number) => {
      const a = (i / 7) * Math.PI * 2 + wave;
      return new THREE.Vector3(Math.sin(a) * 15, 0, Math.cos(a) * 15);
    };
    // Every fifth wave brings an elite to lead it
    if (wave % 5 === 0) {
      const [type] = unlocked[Math.floor(Math.random() * unlocked.length)];
      enemies.push({ type, offset: spot(0), eliteName: `Champion of Wave ${wave}` });
      budget -= 4;
    }
    while (budget >= 1 && enemies.length < 9) {
      const affordable = unlocked.filter(([, cost]) => cost <= budget);
      const [type, cost] = affordable[Math.floor(Math.random() * affordable.length)];
      enemies.push({ type, offset: spot(enemies.length) });
      budget -= cost;
    }
    return enemies;
  }

  /** Watches for each wave's end, then rests briefly before the next. */
  private updateTrial(dt: number): void {
    const trial = this.trial;
    if (!trial || trial.isOver) return;
    const id = `trial_${trial.mode}_${trial.wave}`;
    const encounter = this.encounterManager.getAllEncounters().find(e => e.config.id === id);
    if (trial.resting > 0) {
      trial.resting -= dt;
      if (trial.resting <= 0) this.nextTrialWave();
      return;
    }
    if (encounter?.state !== EncounterState.COMPLETED) return;

    // Wave won: a breath, a little health back, and the next
    trial.resting = trial.mode === 'bossRush' ? 3.5 : 3;
    this.player.heal(this.player.health.maxHealth * (trial.mode === 'bossRush' ? 0.5 : 0.25));
    if (trial.mode === 'arena' && trial.wave >= 10) grantAchievement('arena_10');
    if (trial.mode === 'bossRush' && trial.wave >= 5) {
      trial.resting = 0;
      this.endTrial(true);
    }
  }

  /** Ends the run, records the score, and shows the results. */
  private endTrial(isVictory: boolean): void {
    const trial = this.trial;
    if (!trial || trial.isOver) return;
    trial.isOver = true;
    this.player.isControlsEnabled = false;
    this.startSlowMotion(0.3, 1.2);

    const wavesCleared = isVictory ? trial.wave : Math.max(0, trial.wave - 1);
    let place: number | null = null;
    if (trial.mode === 'bossRush') {
      if (isVictory) {
        grantAchievement('boss_rush');
        place = Records.addBossRush({ time: trial.time, difficulty: Run.difficulty, date: Date.now() });
      }
    } else if (wavesCleared > 0) {
      place = Records.addArena({ waves: wavesCleared, kills: trial.kills, date: Date.now() });
    }

    setTimeout(() => {
      EventBus.emit('overlayMenu', { open: true });
      openTrialResults(
        { mode: trial.mode, isVictory, time: trial.time, waves: trial.mode === 'bossRush' ? wavesCleared : wavesCleared, kills: trial.kills, place },
        () => {
          EventBus.emit('overlayMenu', { open: false });
          void this.startTrial(trial.mode);
        },
        () => {
          EventBus.emit('overlayMenu', { open: false });
          this.endTrialQuietly();
          GameStateManager.getInstance().setState(GameState.MAIN_MENU);
        },
      );
    }, 1600);
  }

  /** Leaves Trial mode without a word, before a story game starts or loads. */
  private endTrialQuietly(): void {
    if (!this.trial) return;
    this.trial = null;
    Run.trialToughness = 1;
    this.runTimer.hide();
  }
}
