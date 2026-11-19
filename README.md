<p align="center">
  <img src="assets/og-preview.png" alt="UNDERTALE: LAST NIGHT Banner" width="760">
</p>

# UNDERTALE: LAST NIGHT

A playable browser-based **Undertale** fan game built with HTML5 Canvas, zero external dependencies, pure ES Modules, and procedural Web Audio soundtrack & sound effects.

**[Play Online on GitHub Pages](https://efeartn.github.io/UndertaleLastNight/)**

---

## Features

- **Custom 1:1 Pixel-Matrix Art & Dynamic Battle Visuals**
  - Handcrafted offscreen pixel-matrix sprites (`sprites.js`), animated hoodie flutter & sweat drops, **6 SOUL Aura Skins**, **W.D. Gaster Unbound** (6 floating hands + orbiting arcane runes), beat-synced **Phase 1–5 Battle Backdrops** (Twilight sunlight beams, Crimson embers, Void cracks, Parallax Cathedral monoliths), **Hitstop**, **SOUL Afterimage Trails**, **Slash Arcs**, and **Chromatic Aberration**.
- **5 Playable SOUL Modes + SOUL Dash & Style Rank**
  - **Red SOUL**: Classic free directional movement.
  - **Blue SOUL**: 4-directional gravity slams (`up`, `down`, `left`, `right`) and moving platforming.
  - **Green SOUL**: Center-locked 4-way shield deflecting spears (including healing green spears).
  - **Yellow SOUL**: Justice shooter — tap `Z` / `Enter` for rapid bolts, or **Hold `Z` (`>= 0.38s`)** to fire a piercing **Charged Big Shot** that breaks armored blocks & vaporizes small bones.
  - **Purple SOUL**: Glide horizontally across **3 glowing violet web rails** using `Up` / `Down` to dodge Web Matrix & Arcane Rune patterns.
  - **SOUL Dash & Close-Call Slow-Mo**: Press **`X` / `Shift`** during attacks for an i-frame burst (`0.95s` cooldown); close grazes during Dash trigger micro-slow-mo (`CLOSE CALL!`), +TP, and elevate your **Live Style Rank (`C -> B -> A -> S -> SS`)**.
- **10-Track Original OST Synth Engine & In-Game Sound Test Jukebox**
  - Upgraded Web Audio synthesizer (`audio.js`) with **Distorted Lead Guitar Overdrive** (`WaveShaperNode`), **Stereo Echo Delay** (`DelayNode`), **Void Choir Pads**, live **FFT Audio Visualizer**, and dynamic tempo boost:
    `MIDNIGHT OVERTURE` (Title, 104 BPM) · `TWILIGHT JUDGMENT HALL` (96 BPM) · `ECHOES OF WATERFALL` (92 BPM) · `JUDGMENT OVERDRIVE` (Phase 1, 138 BPM) · `CRIMSON VELOCITY` (Phase 2, 150 BPM) · `SHATTERED DAWN` (Phase 3, 158 BPM) · `VOID ANOMALY // 666` (Phase 4, 168 BPM) · `DARKER YET DARKER // UNBOUND` (Phase 5, 176 BPM) · `FIRST LIGHT OF DAWN` (Victory, 116 BPM) · `SHATTERED DETERMINATION` (Game Over, 74 BPM).
- **20 Non-Repeating Attacks Across 5 Phases & 4th-Wall Breaks**
  - Expanded from 16 to **20 attacks** adding Secret Phase 5 (`#17 Purple Web Matrix`, `#18 Arcane Rune Storm`, `#19 Dimensional Shatter`, `#20 DARKER YET DARKER`) alongside Gaster Box-Grip Hands, Dynamic Tilted Battle Box, Phase 3+ Button Scrambler, Meta HUD Callouts, and Dynamic Tab Titles.
- **Expanded Overworld: Echo Sanctum, Void Vault & New Relics**
  - Walk **West** from the Twilight Antechamber to discover **Echo Flower Sanctum** (3 glowing Echo Flowers, **Relic Forge & SOUL Skin Shrine** selling `Empty Gun`, `Void Blade`, `Void Cloak`, `Heart Locket+` + skins), and enter the mysterious grey door to **Entry Seventeen // Void Vault** to claim the **Void Key** unlocking Story Phase 5!
- **Trophies (12), Challenge Modifiers & Endless Leaderboard**
  - Unlock 12 persistent trophies in **🏆 Trophies**, customize **6 SOUL Skins**, toggle **Challenge Modifiers** (`Ironman 1-HP`, `Hyper Speed 1.35x`, `Inverted Gravity`, `Mirror Horizon`), and climb the **Local Top-5 Endless Leaderboard** in **⚡ Mods**.
- **Full Mobile Handheld Edition + Multi-Touch Controls**
  - Adaptive mobile layout featuring a compact single-row mobile top bar + **Slide-Out Command Drawer**, **Portrait** handheld deck, **Switch-style Landscape Split Layout** (Left Stick/D-Pad + Center Canvas + Right `Z/X/C` buttons), switchable **Virtual Analog Thumbstick / Classic D-Pad**, and simultaneous multi-touch hold.

---

## Controls

| Action | Key / Input |
| :--- | :--- |
| **Move / Switch Web Rail / Shield** | `Arrow Keys`, `WASD`, Virtual Thumbstick, or Touch D-Pad |
| **Confirm / Shoot / Charge Shot** | `Z` / `Enter` (Hold in Yellow SOUL for Big Shot) or `Z` Touch Button |
| **SOUL Dash (i-Frames) / Cancel** | `X` / `Shift` or `X` Touch Button |
| **Field Menu / Toggle Practice Speed** | `C` / `Esc` or `C` Touch Button |
| **Mute Audio** | `M` |

---

## Run Locally

Because the game uses native ES Modules (`<script type="module">`), serve the folder with any static HTTP server:

```bash
python -m http.server 8085
```

Then open [http://localhost:8085/](http://localhost:8085/) in your browser.
