# UNDERTALE: LAST NIGHT

A playable browser-based **Undertale** fan game built with HTML5 Canvas, zero external dependencies, pure ES Modules, and procedural Web Audio soundtrack & sound effects.

**[Play Online on GitHub Pages](https://efeartn.github.io/UndertaleLastNight/)**

---

## Features

- **Custom 1:1 Pixel-Matrix Art & Animations**
  - Handcrafted offscreen pixel-matrix battle sprites (`sprites.js`), animated Sans poses, Gaster Blasters, rotating Bone Wheels, Twilight Antechamber, Judgment Hall stained-glass lighting, and animated dialogue portraits.
- **4 Playable SOUL Modes**
  - **Red SOUL**: Classic free directional movement.
  - **Blue SOUL**: 4-directional gravity slams (`up`, `down`, `left`, `right`) and moving platforming.
  - **Green SOUL**: Undyne-style center-locked 4-way shield deflecting spears (including healing green spears).
  - **Yellow SOUL**: Justice shooter firing upward bolts (`Z` / `Enter`) to break cracked bone barriers.
- **15 Custom Attacks Across 4 Phases**
  - Dynamic swaying Battle Box patterns, Sine Bone Corridors, Blaster Carousels, Blackout Cuts, Bone Wheel Labs, and **W.D. Gaster** interference in Phases 2–4.
- **Twilight Antechamber & Relic Armory**
  - Explore the Twilight Antechamber before entering the Judgment Hall, inspect your **SAVE Star**, and swap gear at the **Relic Armory Pedestal**:
    - **Weapons**: `Real Knife`, `Burnt Pan` (+item heal / KR cure bonus), `Torn Notebook` (+invulnerability frames)
    - **Armors**: `The Locket` (-direct damage), `Cloudy Glasses` (-KR buildup), `Stained Apron` (+HP regen at end of turn)
- **TP Grazing Meter, Achievements & Game Modes**
  - Graze hazards and block spears to build **TP (0–100%)** for `Heal (40 TP)` and `Barrier (60 TP)` in `ACT`.
  - Unlock persistent achievements (`First Graze`, `Shield Master`, `Sharpshooter`, `Untouchable Turn`, `Phase 1 Cleared`, `Gaster Challenger`, `Dawn Savior`).
  - Jump straight into any of the **15 Attacks** via the HUD **Attacks** menu, challenge **Phase 4**, or test your survival in **Endless Mode**.

---

## Controls

| Action | Key / Input |
| :--- | :--- |
| **Move / Rotate Shield / Jump** | `Arrow Keys` or `WASD` (plus on-screen touch D-pad / gamepad support) |
| **Confirm / Shoot (Yellow SOUL)** | `Z` or `Enter` |
| **Cancel / Skip Text** | `X` or `Shift` |
| **Overworld Menu / Stats** | `C` or `Esc` |

---

## Run Locally

Because the game uses native ES Modules (`<script type="module">`), serve the folder with any static HTTP server:

```bash
python -m http.server 8085
```

Then open [http://localhost:8085/](http://localhost:8085/) in your browser.
