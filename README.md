# Shadow of the Crimson Gate

> A cinematic, Japanese fantasy action-adventure 2D web game.

![Shadow of the Crimson Gate Hero](public/assets/hero-bg-image.png)

*Shadow of the Crimson Gate* is an upcoming 2D action-adventure web game. Currently, this repository houses the **AAA-quality, highly immersive landing page** and the foundational architecture necessary for the eventual Phaser 3 game integration.

The project features a heavily atmospheric, cinematic hero section built without UI frameworks like React—opting instead for raw performance using vanilla TypeScript, CSS custom properties, and an advanced custom-built Overlay architecture. The experience is designed to feel like a high-end game's title screen rather than a traditional marketing website.

## ✨ Features

- **Strict Single-Screen Experience:** The entire application is rigidly locked to a non-scrollable `100vw` × `100dvh` viewport, entirely preventing traditional page scrolling.
- **Cinematic Overlay Architecture:** Instead of routing to new pages, navigation triggers a sophisticated `OverlayManager` that seamlessly dims and blurs the background while injecting full-screen lore, character, and media panels.
- **Ambient Audio Subsystem:** High-quality background audio that respects browser autoplay policies, gracefully fading in upon the user's first interaction and saving mute preferences via `localStorage`.
- **Hardware-Accelerated Effects:** CSS-based sakura petal and spirit particle systems that run smoothly without heavy JavaScript canvas calculations.
- **Dynamic Mouse Parallax:** Depth-of-field movement tied to cursor position on desktop, using smooth `requestAnimationFrame` interpolation.
- **Reduced Motion Support:** Automatically disables parallax and particle animations for users who prefer reduced motion.
- **Game Ready:** A hash-based client-side router is prepared for transitioning from the title screen into the actual Phaser 3 game canvas.

## 🛠️ Technology Stack

- **Core:** TypeScript, HTML5, Vanilla CSS
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Game Engine:** [Phaser 3](https://phaser.io/) *(Scaffolded and prepared)*
- **No unnecessary bloat:** No React, no heavy state-management libraries, ensuring the quickest time-to-interactive for the landing page.

## 📂 Project Structure

```text
src/
├── components/
│   ├── Hero.ts          # Handles the cinematic landing page animations & parallax
│   └── Overlays.ts      # Singleton OverlayManager for World, Lore, Characters, Media
├── game/
│   └── Game.ts          # Placeholder for future Phaser 3 instance
├── pages/
│   ├── Home.ts          # Renders the Home View
│   └── Game.ts          # Renders the Game View (Loading Placeholder)
├── styles/
│   ├── global.css       # CSS Variables, resets, typography, and viewport locks
│   └── hero.css         # Hero layout, particles, overlays, and responsive breakpoints
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   └── constants.ts     # Global configuration, timings, and navigation structure
├── main.ts              # Entry point & Hash-based Router
└── vite-env.d.ts        # Vite environment types
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

> **Note on Netlify Deployment:** This repository contains a `netlify.toml` file to explicitly handle `esbuild` native postinstall scripts that are sometimes blocked by Netlify's secure `allow-scripts` environment.

## 🎨 Design Philosophy

The aesthetic direction is **dark, premium, and mysterious**. The color palette relies on deep charcoals, crimson reds, muted golds, and warm ivory to convey a high-fidelity Japanese fantasy environment. The UI stays strictly minimal to let the environment artwork command the user's attention.

## 📜 License

All rights reserved. Artwork and code belong to the respective repository owner.
