# UNDERTALE: LAST NIGHT

A playable browser-based **Undertale** fan game built with HTML5 Canvas, zero external dependencies, pure ES Modules, and procedural Web Audio soundtrack & sound effects.

**[Play Online on GitHub Pages](https://efeartn.github.io/UndertaleLastNight/)**

---

## Features

- **Custom 1:1 Pixel-Matrix Art & Animations**
  - Handcrafted offscreen pixel-matrix battle sprites (`sprites.js`), animated Sans poses, Gaster Blasters, rotating Bone Wheels, Twilight Antechamber, Judgment Hall stained-glass lighting, Boss Phase/Stamina HUD, expanding SOUL transition rings, and animated dialogue portraits.
- **4 Playable SOUL Modes**
  - **Red SOUL**: Classic free directional movement.
  - **Blue SOUL**: 4-directional gravity slams (`up`, `down`, `left`, `right`) and moving platforming.
  - **Green SOUL**: Undyne-style center-locked 4-way shield deflecting spears (including healing green spears).
  - **Yellow SOUL**: Justice shooter — tap `Z` / `Enter` for rapid upward bolts, or **Hold `Z` (`>= 0.38s`)** to fire a piercing **Charged Big Shot** that breaks armored blocks & vaporizes small bones.
- **High-Intensity Original Boss Soundtrack & 4th-Wall Breaks**
  - **4 Original 128-Step Multi-Channel Boss Themes** (`audio.js`) with dual detuned leads, 16th-note arpeggios, sub-octave bass, and crash/open hi-hat percussion: **JUDGMENT OVERDRIVE** (138 BPM, Phase 1), **CRIMSON VELOCITY** (150 BPM, Phase 2), **SHATTERED DAWN** (158 BPM, Phase 3), and **VOID ANOMALY // 666** (168 BPM, Phase 4).
  - **4th-Wall Interference**: Gaster skeletal hands physically grip the outer Battle Box borders (`Phase 3–4`), the Battle Box dynamically **tilts** with chromatic glitch borders, Phase 3/4 turns **scramble the battle action buttons** (`FIGHT`/`ACT`/`ITEM`/`MERCY`), Sans reacts directly to your **HUD Assist toggle, Mute state, mouse clicks, and localStorage Reset count**, and the browser tab `document.title` shifts live during void anomalies.
- **16 Non-Repeating Multi-Act Attacks Across 4 Phases**
  - Upgraded multi-act choreography across all 4 phases (bidirectional blue/orange stop gates, orbiting carousel blasters, mid-lane slam finishers, 3-act sine corridors, tilted green shield barrages, 3/4/5-spoke bone wheels, **W.D. Gaster** Phase 2–4 Void Intervention, and **#16 Void Singularity**), with smooth turn progression on Items and Mercy.
- **Twilight Antechamber & Relic Armory**
  - Explore the Twilight Antechamber before entering the Judgment Hall, inspect your **SAVE Star**, and swap gear at the **Relic Armory Pedestal**:
    - **Weapons**: `Real Knife`, `Burnt Pan` (+item heal / KR cure bonus), `Torn Notebook` (+invulnerability frames)
    - **Armors**: `The Locket` (-direct damage), `Cloudy Glasses` (-KR buildup), `Stained Apron` (+HP regen at end of turn)
- **TP Grazing Meter, Trophies & Game Modes**
  - Graze hazards and block spears to build **TP (0–100%)** for free bonus actions (`Heal (40 TP)` and `Barrier (60 TP)`, usable once per turn).
  - Unlock persistent trophies in the **🏆 Trophies** modal (`First Graze`, `Shield Master`, `Sharpshooter`, `Untouchable Turn`, `Phase 1 Cleared`, `Gaster Challenger`, `Dawn Savior`, `Master of the Night`).
  - Practice any of the **16 Attacks** with custom speed toggles (`0.75x–1.50x`) and `★` No-Hit badges, challenge **🔥 Boss Rush** (all 16 attacks sequentially), or test survival in **∞ Endless Mode**.
- **Full Keyboard, Mouse, Touch & Gamepad Support**
  - Navigate menus via `Arrow Keys` / `WASD`, or click directly on Title, Overworld, Attack Select, and Battle UI options (`handlePointerMove` / `handlePointerDown`), plus adjust Master Volume cleanly in the top HUD bar.

---

## Controls

| Action | Key / Input |
| :--- | :--- |
| **Move / Rotate Shield / Jump** | `Arrow Keys` or `WASD` (plus mouse clicks, touch D-pad, or gamepad) |
| **Confirm / Shoot / Charge Shot** | `Z` or `Enter` (Hold in Yellow SOUL for Big Shot) |
| **Cancel / Skip Text** | `X` or `Shift` |
| **Field Menu / Toggle Practice Speed** | `C` or `Esc` |
| **Mute Audio** | `M` |

---

## Run Locally

Because the game uses native ES Modules (`<script type="module">`), serve the folder with any static HTTP server:

```bash
python -m http.server 8085
```

Then open [http://localhost:8085/](http://localhost:8085/) in your browser.
