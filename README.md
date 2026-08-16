# Shadow of the Crimson Gate

> A cinematic, Japanese fantasy action-adventure 2D web game.

![Shadow of the Crimson Gate Hero](public/assets/hero-bg-image.png)

*Shadow of the Crimson Gate* is a 2D action-adventure web game. It features a premium, immersive landing page that transitions seamlessly into a playable Phaser 3 game environment.

## ✨ Features

- **Cinematic Game World:** A fully playable 2.5D environment featuring deep parallax scrolling, dynamic layering, and atmospheric lighting.
- **Fluid Arcade Physics:** Control the Ronin protagonist with responsive 8-way directional movement and state-driven animations.
- **Procedural VFX:** Highly optimized, programmatic Sakura petals and spirit particles using custom object pooling and sinusoidal math.
- **Strict Single-Screen Experience:** The application is rigidly locked to a non-scrollable viewport, preventing traditional page scrolling.
- **Seamless Architecture:** A custom hash-based router transitions users from the vanilla TypeScript title screen directly into the Phaser 3 canvas.
- **Ambient Audio:** High-quality background audio that respects browser autoplay policies and persists user preferences.

## 🛠️ Technology Stack

- **Core:** TypeScript, HTML5, Vanilla CSS
- **Game Engine:** [Phaser 3](https://phaser.io/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Architecture:** Zero frontend frameworks (No React/Vue) to ensure maximum performance and minimal time-to-interactive.

## 📂 Project Structure

```text
src/
├── components/    # Landing page UI overlays and cinematic hero
├── game/          # Core Phaser 3 game engine
│   ├── config/    # Environment, depth, and system configurations
│   ├── entities/  # Player and enemy physics/animation controllers
│   ├── scenes/    # Preloader, Combat, and UI scenes
│   └── systems/   # VFX, Camera, and Audio managers
├── pages/         # High-level route views (Home, Game)
├── styles/        # CSS Variables and resets
├── types/         # TypeScript interfaces
├── utils/         # Global utilities
└── main.ts        # Entry point & Hash-based Router
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate.git
   cd Shadow-of-the-Crimson-Gate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

### Building for Production

To build the project for production, run:

```bash
npm run build
```

This will output the optimized static files into the `dist/` directory.

## 🎨 Design Philosophy

The aesthetic direction is **dark, premium, and mysterious**. The color palette relies on deep charcoals, crimson reds, muted golds, and warm ivory to convey a high-fidelity Japanese fantasy environment. The UI stays strictly minimal to let the environment artwork command the user's attention.

## 📜 License

All rights reserved. Artwork and code belong to the respective repository owner.
