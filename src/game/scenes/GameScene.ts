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
import { CRIMSON_HEART_DIALOGUE } from '../story/Endings';
import { ChapterId } from '../story/StoryChapter';
import { createDefaultFlags } from '../story/StoryFlag';
import { EncounterState } from '../encounters/Encounter';
import { BossPhaseId as PhaseId } from '../boss/BossPhase';
import { keyName } from '../settings/KeyBindings';
import { Interactable } from '../interaction/Interactable';

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
const CHAPTER_ORDER = [ChapterId.CHAPTER_1, ChapterId.CHAPTER_2, ChapterId.CHAPTER_3, ChapterId.CHAPTER_4, ChapterId.EPILOGUE];

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
          ? { ...this.essenceDrop.position, amount: this.essenceDrop.amount }
          : null,
        collected: [...this.collected],
      });
    });

    EventBus.on('loadGame', (saveData: any) => {
      if (!saveData) return;
      
      this.playerProgress.initFromSave(saveData);
      this.build.load(saveData.build);
      // Saves from before techniques existed: teach whatever the chapter reached
      const reached = CHAPTER_ORDER.indexOf(saveData.chapter ?? ChapterId.CHAPTER_1);
      CHAPTER_ORDER.slice(0, reached + 1).forEach(chapter => {
        const technique = CHAPTER_TECHNIQUES[chapter];
        if (technique) this.build.techniques.add(technique);
      });
      this.applyPlayerStats(true);
      EventBus.emit('essenceUpdate', { amount: this.playerProgress.spiritEssence, added: 0 });

      this.restoreWorldState(saveData.collected ?? [], saveData.droppedEssence ?? null);

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
    });
    
    EventBus.on('newGame', () => {
      this.playerProgress.wipe();
      this.build.wipe();
      this.hasSeenBossIntro = false;
      this.applyPlayerStats(true);
      EventBus.emit('essenceUpdate', { amount: 0, added: 0 });
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
        // What remains of the Oni offers a choice, and the ending follows from it
        this.isEndingChoicePending = true;
        this.dialogueManager.startDialogue(CRIMSON_HEART_DIALOGUE, 'crimson_heart');
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

  public get isStoryIntroRunning(): boolean {
    return this.storyManager.isIntroRunning;
  }

  /** Builds the world in stages. Runs once, before the game loop starts. */
  public async buildWorld(renderer: THREE.WebGLRenderer, report: LoadReporter): Promise<void> {
    const world = await WorldGenerator.build(this.scene, this.collisionSystem, report);
    this.registerOccluders(world);
    this.lighting.buildEnvironment(renderer, this.scene);
  }

  public updateOcclusion(dt: number): void {
    this.occlusion.update(dt, this.cameraController.camera, this.player.root.position);
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
    } else {
      const isEnemyNear = this.enemies.some(enemy =>
        !enemy.health.isDead && enemy.root.visible && enemy.root.position.distanceTo(position) < COMBAT_MUSIC_RANGE);
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
    this.telegraphVfx.update(dt, this.time);

    // ─── Dialogue & Intro Block ──────────────────────────────────────
    const isDialogueActive = this.dialogueManager.isActive;
    const isIntroActive = this.storyManager.isIntroRunning;
    this.secrets.update(dt);
    this.updateNpcPresence();
    if (this.shrineMenu.isOpen) return;

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

    // Zone & Atmosphere updates
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

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(dt);
      if (playerPos.distanceToSquared(npc.position) < 25) {
        npc.lookAt(playerPos);
      }
    }

    // Systems updates
    this.interactionSystem.update(playerPos, inputManager);
    this.hitboxSystem.clearActiveHitboxes();
    this.updateExecutionTarget();
    this.player.update(dt, inputManager, this.collisionSystem, this.hitboxSystem, this.vfx);
    this.spiritWaves.update(dt, this.hitboxSystem, this.player.damageMultiplier);
    this.updateEssenceDrop(dt);
    
    // Projectile & Hazard System update
    this.projectileSystem.update(dt, this.player, this.vfx, this.cameraController);
    this.arenaHazardSystem.update(dt, this.player);
    
    // Encounter Update
    this.encounterManager.update(dt, playerPos, this.scene);
    this.enemies = this.encounterManager.getActiveEnemies();
    
    // Group AI Update
    this.attackDirector.update(dt, this.enemies, playerPos);

    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, this.hitboxSystem, this.collisionSystem, this.vfx, this.projectileSystem, this.enemies);
    }
    this.updateHazards(dt);
    this.updateEliteBar();

    // ─── Boss Update ──────────────────────────────────────────────
    
    // Trigger Cinematic Intro
    if (this.boss && this.player.root.position.z < -85 && !this.hasBossIntroPlayed) {
      this.hasBossIntroPlayed = true;

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
      this.dropEssence();
      this.player.isControlsEnabled = false;
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
      const config = EncounterDatabase.getAll().find(c => c.id === data.id);
      if (config?.charmReward && !this.build.charms.has(config.charmReward)) {
        this.build.addCharm(config.charmReward);
        const charm = CHARMS.find(c => c.id === config.charmReward)!;
        EventBus.emit('notice', { title: `Charm found: ${charm.name}`, text: charm.description });
      }
    });
  }

  /** Heals, saves, brings the yokai back, and opens the upgrade menu. */
  private restAtShrine(id: string): void {
    const shrine = SHRINES.find(s => s.id === id);
    if (!shrine) return;

    this.player.reset(shrine.rest);
    this.applyPlayerStats(true);
    this.checkpointManager.setCheckpointPosition(shrine.rest);
    this.cameraController.snapTo(shrine.rest);

    // Every fight but the boss comes back, as long as it has been fought before
    this.encounterManager.resetAll(this.scene);
    this.encounterManager.clearAll();
    for (const config of EncounterDatabase.getAll()) this.encounterManager.registerEncounter(config);
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
      this.placeEssenceDrop(this.player.root.position.clone().setY(0), amount);
      setTimeout(() => EventBus.emit('notice', { title: `${amount} essence left behind`, text: 'Return to where you fell to recover it.' }), 1200);
    }
    EventBus.emit('requestSave', {});
  }

  private placeEssenceDrop(position: THREE.Vector3, amount: number): void {
    this.essenceDrop = new EssenceDrop(position, amount);
    this.scene.add(this.essenceDrop.root);
  }

  private updateEssenceDrop(dt: number): void {
    if (!this.essenceDrop || this.player.health.isDead) return;
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
    const damage = isBoss ? victim.health.maxHealth * 0.08
      : enemy!.traits.isElite ? victim.health.maxHealth * 0.35
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
        phase: elite.traits.isEnraged ? PhaseId.PHASE_2 : PhaseId.PHASE_1,
      });
      EventBus.emit('bossPosture', { fraction: elite.traits.posture.isBroken ? 1 : elite.traits.posture.fraction });
    } else if (this.eliteBarId) {
      this.eliteBarId = null;
      this.bossUI.reset();
    }
  }

  /** Akane, if she fights beside you, cuts at the Oni from the shadows. */
  private updateAllyStrikes(dt: number): void {
    const boss = this.boss;
    const isFighting = boss && this.storyManager.flags.akaneAlly && this.hasBossIntroPlayed
      && !this.isCinematicActive && !boss.health.isDead;
    if (!isFighting) {
      this.allyTimer = 0;
      return;
    }

    this.allyTimer += dt;
    if (this.allyTimer < ALLY_STRIKE_INTERVAL) return;
    this.allyTimer = 0;

    const toBoss = boss!.root.position.clone().sub(this.player.root.position).setY(0).normalize();
    boss!.takeDamage(Math.round(boss!.health.maxHealth * 0.035), toBoss, 0);
    boss!.applyPostureDamage(14);
    this.vfx.spawnSlash(boss!.root.position, toBoss, 3);
    AudioManager.play(AudioId.SWORD_HIT, { volume: 0.8 });
    EventBus.emit('damageNumber', { position: boss!.root.position.clone().setY(3.4), text: 'AKANE STRIKES', kind: 'label' });
  }

  private updateNpcPresence(): void {
    const flags = this.storyManager.flags;
    for (const npc of this.npcs) npc.root.visible = npc.isPresent(flags);
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
      position: new THREE.Vector3(secret.x, 0, secret.z),
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
    AudioManager.play(AudioId.UI_NOTIFICATION, { volume: 0.7 });

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
    if (dropped && dropped.amount > 0) this.placeEssenceDrop(new THREE.Vector3(dropped.x, 0, dropped.z), dropped.amount);
  }
}
