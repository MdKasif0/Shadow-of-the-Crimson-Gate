# Shadow of the Crimson Gate

A cinematic Japanese dark fantasy action game built entirely with **Three.js** and **TypeScript**. All 3D geometry is procedurally generated — no external models.

## Quick Start

```bash
npm install
npm run dev        # Development server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
```

## Controls

| Key | Action |
|---|---|
| **W A S D** | Move |
| **Mouse / J** | Attack |
| **Space** | Dash |
| **E** | Interact (NPCs, Shrines) |
| **Escape** | Pause |
| **R** | Reset (Dev) |

## Architecture

```
src/
├── game/
│   ├── core/          # GameLoop, Renderer, EventBus, InputManager
│   ├── state/         # GameStateManager, GameState, WorldState
│   ├── scenes/        # GameScene (main scene orchestrator)
│   ├── world/         # Procedural terrain, trees, rocks, temples, shrines
│   ├── characters/    # Ronin (player), CharacterRig, Animator
│   ├── enemies/       # BasicYokai, ShadowYokai, Tengu, AI, Factory
│   ├── boss/          # CrimsonOni, BossAI, Phases, Arena
│   ├── combat/        # CombatSystem, DashSystem, Hitboxes, Damage
│   ├── encounters/    # EncounterManager, Database, Spawner, Waves
│   ├── camera/        # CameraController, CameraShake
│   ├── collision/     # Grid-based collision
│   ├── vfx/           # ParticlePool, Slash/Hit/Dash/Death VFX
│   ├── lighting/      # LightingSystem (moonlight, ambient)
│   ├── atmosphere/    # Sakura, Spirit particles, Wind
│   ├── audio/         # AudioManager (Web Audio API synthesis)
│   ├── dialogue/      # DialogueBox, DialogueManager
│   ├── npc/           # NPC system, ShrineKeeper
│   ├── story/         # StoryManager, Chapters, Flags, Intro
│   ├── objectives/    # ObjectiveManager
│   ├── progression/   # Essence, Leveling, Rewards
│   ├── save/          # SaveManager (localStorage)
│   ├── settings/      # SettingsManager (quality, audio, accessibility)
│   └── ui/            # HUD, Menus, Pause, Settings, Dialogue, Loading
│
├── components/        # Hero (landing page)
├── pages/             # Home, Game
└── main.ts            # Entry point + router
```

## Game Flow

```
Main Menu → New Game → Intro → Chapter 1 (Courtyard) → Shrine Keeper
→ Basic Yokai Encounter → Shrine → Chapter 2 (Forest)
→ Shadow Yokai → Tengu → Chapter 3 (Temple Approach)
→ Chapter 4 (Boss Arena) → Crimson Oni (3 Phases)
→ Victory → Epilogue → Ending → Main Menu
```

## Save System

- Saves to `localStorage` under key `shadow-crimson-save`
- Auto-saves at checkpoints and after boss defeat
- Version-tagged for forward compatibility
- Gracefully recovers from corrupted save data

## Performance Settings

| Setting | Options |
|---|---|
| Graphics Quality | LOW / MEDIUM / HIGH |
| VFX Intensity | LOW / MEDIUM / HIGH |
| Camera Shake | ON / OFF |
| Reduce Motion | ON / OFF |
| Master Volume | 0–100% |
| Music Volume | 0–100% |
| Fullscreen | Toggle |

## Technical Details

- **Rendering**: Single `THREE.WebGLRenderer` with capped pixel ratio (max 2x)
- **Game Loop**: Single `requestAnimationFrame` loop with delta time clamped to 100ms
- **Particles**: `InstancedMesh`-based pooling for all VFX
- **Audio**: Entirely synthesized via Web Audio API (no external audio files)
- **Lighting**: 3 lights total (directional moonlight + ambient + bounce)
- **Shadows**: PCF soft shadow maps at 2048×2048
- **Tab Safety**: Auto-pauses when browser tab loses focus
