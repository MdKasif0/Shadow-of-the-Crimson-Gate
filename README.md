# Shadow of the Crimson Gate

> A cinematic, Japanese fantasy action-adventure 2D web game.

![Shadow of the Crimson Gate Hero](public/assets/hero-bg-image.png)

*Shadow of the Crimson Gate* is a premium 2D action-adventure web game. Designed from the ground up for high performance, it bridges a highly immersive, lore-rich landing page directly into a full-scale Phaser 3 game environment—without the overhead of heavy frontend frameworks.

## ✨ Features

- **Cinematic Game World:** Explore a beautifully crafted 2.5D Sakura Courtyard featuring deep parallax scrolling, dynamic depth layering, and atmospheric lighting.
- **Fluid Arcade Physics:** Take control of the Ronin with highly responsive 8-way directional movement and state-driven animations.
- **Procedural VFX Architecture:** Experience highly optimized, programmatic Sakura petals and spirit particles powered by custom object pooling and non-linear sinusoidal physics.
- **Strict Single-Screen Experience:** The application is rigidly locked to a non-scrollable viewport, ensuring a focused, distraction-free environment.
- **Seamless Engine Transition:** A custom hash-based router transitions players smoothly from the vanilla TypeScript cinematic title screen directly into the active Phaser 3 canvas.
- **Ambient Audio:** High-quality background audio that intelligently respects browser autoplay policies and persists user preferences.

## 🛠️ Technology Stack

- **Core Engine:** [Phaser 3](https://phaser.io/)
- **Language:** TypeScript
- **Styling:** Vanilla CSS3
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Architecture:** Zero frontend UI frameworks (No React/Vue) to ensure maximum rendering performance and instantaneous load times.

## 📂 Project Structure

```text
src/
├── components/          # UI components and cinematic overlay engine
├── game/                # Phaser 3 game architecture
│   ├── config/          # Global settings (Environment, Assets, Depth)
│   ├── entities/        # Player, Enemies, and interactive actors
│   ├── scenes/          # Game states (Preload, Combat, GameOver, UI)
│   ├── state/           # State machines and global enums
│   └── systems/         # Modular game managers (VFX, Audio, Camera, Wave)
├── pages/               # Top-level routing views (Home, Game)
├── styles/              # Global CSS, resets, and layout styling
├── types/               # Global TypeScript definitions
├── utils/               # Helper functions and constants
└── main.ts              # Application entry point and hash-router
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate.git
   cd Shadow-of-the-Crimson-Gate
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Launch:** Open your browser and navigate to `http://localhost:3000`.

### Building for Production

To build the project for production environments, run:

```bash
npm run build
```

This will output optimized, minified static files into the `dist/` directory, ready for deployment.

## 🎨 Design Philosophy

The aesthetic direction of the game is **dark, premium, and mysterious**. The visual palette relies heavily on deep charcoals, crimson reds, muted golds, and warm ivory to convey a high-fidelity Japanese fantasy environment. The User Interface remains strictly minimal, ensuring that the environmental artwork and combat mechanics always command the player's attention.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

*Note: Artwork and audio assets remain the intellectual property of their respective creators and are subject to their own licensing terms.*
