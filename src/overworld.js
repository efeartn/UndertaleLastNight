// Overworld Engine: Rooms, Collision, Interactive Objects, Field Menu (C), and Typewriter Dialogue

import { audio } from './audio.js';
import {
  CHAR_OUTFITS,
  SOUL_SKINS,
  drawChest,
  drawDialoguePortrait,
  drawEchoFlower,
  drawFriskOverworld,
  drawGasterOverlay,
  drawJudgmentHallBackdrop,
  drawJudgmentHallForegroundPillars,
  drawRelicPedestal,
  drawSansOverworld,
  drawSaveStar,
  drawSoul,
  drawSoulShrine,
  drawVoidDoor
} from './sprites.js';

export const WEAPONS = {
  'Real Knife': {
    name: 'Real Knife',
    at: 99,
    perk: 'AT 99 — Pure determination.',
    shortPerk: 'AT 99 (Pure ATK)',
    itemHealBonus: 0,
    itemKrClearBonus: 0,
    invulnBonus: 0
  },
  'Burnt Pan': {
    name: 'Burnt Pan',
    at: 92,
    perk: 'AT 92 — +4 HP & -3 KR per item.',
    shortPerk: '+4 HP / -3 KR per item',
    itemHealBonus: 4,
    itemKrClearBonus: 3,
    invulnBonus: 0
  },
  'Torn Notebook': {
    name: 'Torn Notebook',
    at: 88,
    perk: 'AT 88 — +0.15s invincibility frames.',
    shortPerk: '+0.15s invincibility',
    itemHealBonus: 0,
    itemKrClearBonus: 0,
    invulnBonus: 0.15
  },
  'Empty Gun': {
    name: 'Empty Gun',
    at: 96,
    cost: 160,
    perk: 'AT 96 — Faster Yellow shots & Big Shot charge.',
    shortPerk: 'Fast Yellow Shot/Charge',
    itemHealBonus: 0,
    itemKrClearBonus: 0,
    invulnBonus: 0,
    yellowFastCharge: true
  },
  'Void Blade': {
    name: 'Void Blade',
    at: 105,
    cost: 220,
    perk: 'AT 105 — +20% TP gain & 0.72s Dash cooldown.',
    shortPerk: '+20% TP & Fast Dash',
    itemHealBonus: 0,
    itemKrClearBonus: 0,
    invulnBonus: 0,
    tpMult: 1.2,
    dashCooldownMult: 0.75
  }
};

export const ARMORS = {
  'The Locket': {
    name: 'The Locket',
    df: 99,
    perk: 'DF 99 — -2 direct hit damage.',
    shortPerk: '-2 direct damage',
    dmgReduction: 2,
    krReduction: 0,
    endTurnHeal: 0
  },
  'Cloudy Glasses': {
    name: 'Cloudy Glasses',
    df: 88,
    perk: 'DF 88 — -2 KR buildup per hit.',
    shortPerk: '-2 KR per hit',
    dmgReduction: 0,
    krReduction: 2,
    endTurnHeal: 0
  },
  'Stained Apron': {
    name: 'Stained Apron',
    df: 90,
    perk: 'DF 90 — +2 HP at end of each defend turn.',
    shortPerk: '+2 HP each defend turn',
    dmgReduction: 0,
    krReduction: 0,
    endTurnHeal: 2
  },
  'Void Cloak': {
    name: 'Void Cloak',
    df: 96,
    cost: 180,
    perk: 'DF 96 — +0.06s Dash i-frames & wider graze aura.',
    shortPerk: '+Dash i-frames & Graze',
    dmgReduction: 1,
    krReduction: 0,
    endTurnHeal: 0,
    dashInvulnBonus: 0.06,
    grazeRadiusBonus: 4
  },
  'Heart Locket+': {
    name: 'Heart Locket+',
    df: 105,
    cost: 240,
    perk: 'DF 105 — -2 dmg, -1 KR, & +1 HP end-of-turn.',
    shortPerk: '-2 dmg / -1 KR / +1 HP',
    dmgReduction: 2,
    krReduction: 1,
    endTurnHeal: 1
  }
};

export const DEFAULT_INVENTORY = () => [
  { name: 'B.Scotch Pie', heal: 99, kind: 'heal', tag: 'HEAL', desc: 'All HP restored. Still warm from Toriel.' },
  { name: 'Instant Noodles', heal: 90, kind: 'heal', tag: 'HEAL', desc: 'They are better dry. Restored 90 HP.' },
  { name: 'Face Steak', heal: 60, kind: 'heal', tag: 'HEAL', desc: 'Huge steak in the shape of Mettaton.' },
  { name: 'L. Hero', heal: 40, kind: 'heal', tag: 'HEAL', desc: 'Legendary Hero sandwich! Attack UP!' },
  { name: 'L. Hero', heal: 40, kind: 'heal', tag: 'HEAL', desc: 'Legendary Hero sandwich! Attack UP!' },
  { name: 'Snowman Piece', heal: 45, kind: 'heal', tag: 'HEAL', desc: 'You ate the Snowman Piece. Cold & sweet.' },
  { name: 'Soul Dagger', heal: 0, kind: 'attack', effect: 'dagger', tag: 'ATK', color: '#2ce8f5', desc: 'Spectral blade cuts Sans (-22% next turn) +18 TP.' },
  { name: 'Star Bomb', heal: 0, kind: 'attack', effect: 'bomb', tag: 'ATK', color: '#ffef3f', desc: 'Arms 4-hit Star Nova aura next turn +25 TP.' },
  { name: 'Chrono Sand', heal: 0, kind: 'tactical', effect: 'chrono', tag: 'TAC', color: '#c084fc', desc: '0.72x bullet-time next turn & purges all KARMA.' },
  { name: 'Ketchup', heal: 25, kind: 'tactical', effect: 'ketchup', tag: 'TAC', color: '#ff4c4c', desc: 'Toss to Sans: +25 HP, clears KR, +1 Truce, -12% speed.' }
];

const SAVE_STORAGE_KEY = 'undertale_last_night_save_v1';

export class OverworldEngine {
  constructor(callbacks = {}) {
    this.onTriggerBattle = callbacks.onTriggerBattle || (() => {});
    this.onReturnTitle = callbacks.onReturnTitle || (() => {});

    this.time = 0;
    this.roomId = 'antechamber';
    this.player = {
      x: 120,
      y: 356,
      dir: 'right',
      walkTimer: 0,
      walkFrame: 0,
      speed: 148,
      sprinting: false
    };

    this.stats = {
      name: 'FRISK',
      lv: 19,
      hp: 92,
      maxHp: 92,
      at: 99,
      df: 99,
      weapon: 'Real Knife',
      armor: 'The Locket',
      kills: 0,
      gold: 420
    };

    this.inventory = DEFAULT_INVENTORY();
    this.battleCleared = false;
    this.lastEnding = null; // 'truce' | 'strike' | 'void_unbound'
    this.lastRank = null;
    this.encounterTriggered = false;
    this.sansVisibleInCorridor = true;
    this.hasVoidKey = false;
    this.soulSkin = 'classic';
    this.charOutfit = 'frisk';
    this.footDust = [];
    this.ownedRelics = new Set([
      'Real Knife',
      'Burnt Pan',
      'Torn Notebook',
      'The Locket',
      'Cloudy Glasses',
      'Stained Apron'
    ]);
    this.unlockedSkins = new Set(['classic', 'void_prism', 'golden_dawn']);

    // Dust motes for Judgment Hall atmosphere
    this.dust = Array.from({ length: 28 }, (_, i) => ({
      x: (i * 47) % 1100,
      y: 80 + ((i * 83) % 340),
      r: 1 + (i % 2),
      spd: 6 + (i % 4) * 3,
      phase: i * 0.7
    }));

    // Dialogue Box State
    this.dialogue = null; // { lines, idx, charIdx, speed, choices, choiceIdx, onComplete }

    // Field Menu (C) State
    this.fieldMenu = null; // { tab: 'MAIN'|'ITEM'|'STAT'|'CELL', idx, subIdx }

    // Encounter Transition State (! alert + 3 SOUL flashes)
    this.transition = null; // { timer, phase }
  }

  loadSaveData() {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.roomId) this.roomId = data.roomId;
      if (typeof data.hp === 'number') this.stats.hp = Math.min(this.stats.maxHp, data.hp);
      if (Array.isArray(data.inventory)) this.inventory = data.inventory;
      if (data.weapon && WEAPONS[data.weapon]) {
        this.stats.weapon = data.weapon;
        this.stats.at = WEAPONS[data.weapon].at;
      }
      if (data.armor && ARMORS[data.armor]) {
        this.stats.armor = data.armor;
        this.stats.df = ARMORS[data.armor].df;
      }
      if (data.name && typeof data.name === 'string') {
        const clean = data.name.trim().toUpperCase().slice(0, 10);
        if (clean) this.stats.name = clean;
      }
      if (data.charOutfit && CHAR_OUTFITS[data.charOutfit]) this.charOutfit = data.charOutfit;
      if (typeof data.battleCleared === 'boolean') this.battleCleared = data.battleCleared;
      if (data.lastEnding) this.lastEnding = data.lastEnding;
      if (data.lastRank) this.lastRank = data.lastRank;
      if (typeof data.gold === 'number') this.stats.gold = data.gold;
      if (typeof data.hasVoidKey === 'boolean') this.hasVoidKey = data.hasVoidKey;
      if (data.soulSkin && SOUL_SKINS[data.soulSkin]) this.soulSkin = data.soulSkin;
      if (Array.isArray(data.ownedRelics)) {
        data.ownedRelics.forEach((r) => this.ownedRelics.add(r));
      }
      if (Array.isArray(data.unlockedSkins)) {
        data.unlockedSkins.forEach((s) => this.unlockedSkins.add(s));
      }
      return true;
    } catch {
      return false;
    }
  }

  writeSaveData() {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload = {
        roomId: this.roomId,
        name: this.stats.name,
        hp: this.stats.hp,
        inventory: this.inventory,
        weapon: this.stats.weapon,
        armor: this.stats.armor,
        gold: this.stats.gold,
        hasVoidKey: this.hasVoidKey,
        soulSkin: this.soulSkin,
        charOutfit: this.charOutfit,
        ownedRelics: Array.from(this.ownedRelics),
        unlockedSkins: Array.from(this.unlockedSkins),
        battleCleared: this.battleCleared,
        lastEnding: this.lastEnding,
        lastRank: this.lastRank,
        savedAt: Date.now()
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota / privacy errors
    }
  }

  enterRoom(roomId, spawnX = null, spawnY = null) {
    this.roomId = roomId;
    if (roomId === 'antechamber') {
      this.player.x = spawnX ?? 140;
      this.player.y = spawnY ?? 360;
      audio.playBGM('overworld');
    } else if (roomId === 'echo_sanctum') {
      this.player.x = spawnX ?? 560;
      this.player.y = spawnY ?? 360;
      audio.playBGM('echo_sanctum');
    } else if (roomId === 'void_vault') {
      this.player.x = spawnX ?? 555;
      this.player.y = spawnY ?? 360;
      audio.playBGM('phase4');
    } else if (roomId === 'corridor') {
      this.player.x = spawnX ?? 64;
      this.player.y = spawnY ?? 365;
      this.encounterTriggered = false;
      this.sansVisibleInCorridor = !this.battleCleared;
      audio.playBGM(this.battleCleared ? 'victory' : 'overworld');
    } else if (roomId === 'throne_approach') {
      this.player.x = spawnX ?? 90;
      this.player.y = spawnY ?? 365;
      audio.playBGM('victory');
    }
  }

  startDialogue(lines, onComplete = null) {
    const validPortraits = new Set([
      'sans',
      'sans_wink',
      'sans_hollow',
      'sans_tired',
      'gaster',
      'papyrus'
    ]);
    this.dialogue = {
      lines: lines.map((l) => {
        if (typeof l === 'string') {
          return { speaker: 'narrator', portrait: null, text: l, voice: 'narrator' };
        }
        const speaker = l.speaker || 'narrator';
        const portrait = l.portrait || (validPortraits.has(speaker) ? speaker : null);
        return {
          speaker,
          portrait,
          text: l.text,
          voice: l.voice || speaker || 'narrator',
          choices: l.choices || null,
          onChoice: l.onChoice || null
        };
      }),
      idx: 0,
      charIdx: 0,
      timer: 0,
      choiceIdx: 0,
      onComplete
    };
  }

  update(dt, input) {
    this.time += dt;

    for (const d of this.dust) {
      d.y -= d.spd * dt;
      d.x += Math.sin(this.time * 0.9 + d.phase) * 7 * dt;
      if (d.y < 70) d.y = 420;
    }

    // 1. Encounter Transition Animation
    if (this.transition) {
      this.transition.timer += dt;
      if (this.transition.timer >= 1.15) {
        this.transition = null;
        this.onTriggerBattle();
      }
      return;
    }

    // 2. Active Dialogue Box
    if (this.dialogue) {
      this._updateDialogue(dt, input);
      return;
    }

    // 3. Field Menu (C)
    if (this.fieldMenu) {
      this._updateFieldMenu(input);
      return;
    }

    // Open Field Menu with C or Escape
    if (input.justPressed('KeyC') || input.justPressed('Escape')) {
      audio.menuSelect();
      this.fieldMenu = { tab: 'MAIN', idx: 0, subIdx: 0 };
      return;
    }

    // 4. Player Movement (Hold X / Shift to Sprint)
    let dx = 0;
    let dy = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;
    if (input.isDown('ArrowUp') || input.isDown('KeyW')) dy -= 1;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    for (let i = this.footDust.length - 1; i >= 0; i--) {
      const fd = this.footDust[i];
      fd.y -= 10 * dt;
      fd.life -= dt;
      if (fd.life <= 0) this.footDust.splice(i, 1);
    }

    const sprinting = Boolean(
      (dx !== 0 || dy !== 0) &&
        (input.isDown('KeyX') || input.isDown('ShiftLeft') || input.isDown('ShiftRight'))
    );
    this.player.sprinting = sprinting;
    const moveSpd = sprinting ? 228 : this.player.speed;

    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.player.dir = dx < 0 ? 'left' : 'right';
      } else {
        this.player.dir = dy < 0 ? 'up' : 'down';
      }
      this.player.x += dx * moveSpd * dt;
      this.player.y += dy * moveSpd * dt;
      this.player.walkTimer += dt;
      const stepDur = sprinting ? 0.095 : 0.14;
      if (this.player.walkTimer >= stepDur) {
        this.player.walkTimer = 0;
        this.player.walkFrame = (this.player.walkFrame + 1) % 4;
        if (sprinting && this.player.walkFrame % 2 === 1) {
          this.footDust.push({ x: this.player.x, y: this.player.y - 2, life: 0.28, maxLife: 0.28 });
        }
      }
    } else {
      this.player.walkFrame = 0;
      this.player.walkTimer = 0;
    }

    this._clampAndCheckRoomBounds();

    // 5. Interact with Z / Enter
    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      this._tryInteract();
    }
  }

  _clampAndCheckRoomBounds() {
    // Walkable corridor floor band
    this.player.y = Math.max(314, Math.min(436, this.player.y));

    if (this.roomId === 'antechamber') {
      this.player.x = Math.max(18, Math.min(626, this.player.x));
      if (this.player.x >= 612) {
        this.enterRoom('corridor', 52, this.player.y);
      } else if (this.player.x <= 24) {
        this.enterRoom('echo_sanctum', 575, this.player.y);
      }
    } else if (this.roomId === 'echo_sanctum') {
      this.player.x = Math.max(82, Math.min(620, this.player.x));
      if (this.player.x >= 606) {
        this.enterRoom('antechamber', 54, this.player.y);
      }
    } else if (this.roomId === 'void_vault') {
      this.player.x = Math.max(110, Math.min(620, this.player.x));
      if (this.player.x >= 606) {
        this.enterRoom('echo_sanctum', 110, this.player.y);
      }
    } else if (this.roomId === 'corridor') {
      this.player.x = Math.max(18, Math.min(1080, this.player.x));
      if (this.player.x <= 24) {
        this.enterRoom('antechamber', 584, this.player.y);
      } else if (!this.battleCleared && !this.encounterTriggered && this.player.x >= 470) {
        this._triggerSansCorridorCutscene();
      } else if (this.battleCleared && this.player.x >= 1045) {
        this.enterRoom('throne_approach', 68, this.player.y);
      }
    } else if (this.roomId === 'throne_approach') {
      this.player.x = Math.max(24, Math.min(580, this.player.x));
      if (this.player.x <= 32) {
        this.enterRoom('corridor', 1010, this.player.y);
      }
    }
  }

  _openArmoryMenu() {
    const w = WEAPONS[this.stats.weapon] || WEAPONS['Real Knife'];
    const a = ARMORS[this.stats.armor] || ARMORS['The Locket'];
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Relic Armory Pedestal — Ready for battle.\n* WPN: ${w.name} (${w.shortPerk})\n* ARM: ${a.name} (${a.shortPerk})`,
        choices: ['Swap Weapon', 'Swap Armor', 'Leave'],
        onChoice: (idx) => {
          if (idx === 0) {
            this._openWeaponSwap();
          } else if (idx === 1) {
            this._openArmorSwap();
          }
        }
      }
    ]);
  }

  _openWeaponSwap() {
    const names = Object.keys(WEAPONS).filter((n) => this.ownedRelics.has(n));
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Select a Weapon (Current: ${this.stats.weapon}):\n* Pan: +4HP/-3KR | Notebook: +i-frames | Shrine unlocks more`,
        choices: [...names, 'Back'],
        onChoice: (idx) => {
          if (idx >= names.length) {
            this._openArmoryMenu();
            return;
          }
          const chosen = names[idx];
          const spec = WEAPONS[chosen];
          this.stats.weapon = spec.name;
          this.stats.at = spec.at;
          audio.save();
          this.startDialogue([`* Equipped ${spec.name}!\n* ${spec.perk}`]);
        }
      }
    ]);
  }

  _openArmorSwap() {
    const names = Object.keys(ARMORS).filter((n) => this.ownedRelics.has(n));
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Select an Armor (Current: ${this.stats.armor}):\n* Locket: -2 dmg | Glasses: -2 KR | Apron: +2HP/turn`,
        choices: [...names, 'Back'],
        onChoice: (idx) => {
          if (idx >= names.length) {
            this._openArmoryMenu();
            return;
          }
          const chosen = names[idx];
          const spec = ARMORS[chosen];
          this.stats.armor = spec.name;
          this.stats.df = spec.df;
          audio.save();
          this.startDialogue([`* Equipped ${spec.name}!\n* ${spec.perk}`]);
        }
      }
    ]);
  }

  _openShrineShop() {
    const outfitSpec = CHAR_OUTFITS[this.charOutfit] || CHAR_OUTFITS.frisk;
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Sanctum Shrine — Gold: ${this.stats.gold}G | Skin: ${SOUL_SKINS[this.soulSkin]?.name || 'Classic'} | Outfit: ${outfitSpec.name}`,
        choices: ['Relic Forge', 'SOUL Skins', 'Outfits', 'Leave'],
        onChoice: (idx) => {
          if (idx === 0) this._openRelicShopMenu();
          else if (idx === 1) this._openSkinMenu();
          else if (idx === 2) this._openOutfitMenu();
        }
      }
    ]);
  }

  _openOutfitMenu() {
    const outfits = Object.values(CHAR_OUTFITS);
    const choices = outfits.map((o) =>
      this.charOutfit === o.id ? `${o.name.split(' ')[0]} [ON]` : o.name.split(' ')[0]
    );
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Select Character Outfit (Current: ${(CHAR_OUTFITS[this.charOutfit] || CHAR_OUTFITS.frisk).name}):`,
        choices: [...choices, 'Back'],
        onChoice: (idx) => {
          if (idx >= outfits.length) {
            this._openShrineShop();
            return;
          }
          const chosen = outfits[idx];
          this.charOutfit = chosen.id;
          this.writeSaveData();
          audio.save();
          this.startDialogue([
            {
              speaker: 'player',
              portrait: `player_${chosen.id}`,
              voice: 'narrator',
              text: `* Changed appearance to ${chosen.name}!\n* ${chosen.desc}`
            }
          ]);
        }
      }
    ]);
  }

  _openRelicShopMenu() {
    const items = [
      { kind: 'weapon', name: 'Empty Gun', cost: 160 },
      { kind: 'weapon', name: 'Void Blade', cost: 220 },
      { kind: 'armor', name: 'Void Cloak', cost: 180 },
      { kind: 'armor', name: 'Heart Locket+', cost: 240 }
    ];
    const choices = items.map((it) =>
      this.ownedRelics.has(it.name) ? `${it.name} [OWNED]` : `${it.name} (${it.cost}G)`
    );
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Sanctum Relic Forge — Available Gold: ${this.stats.gold}G\n* Choose a Relic to forge or equip:`,
        choices: [...choices, 'Back'],
        onChoice: (idx) => {
          if (idx >= items.length) {
            this._openShrineShop();
            return;
          }
          const it = items[idx];
          const spec = it.kind === 'weapon' ? WEAPONS[it.name] : ARMORS[it.name];
          if (this.ownedRelics.has(it.name)) {
            if (it.kind === 'weapon') {
              this.stats.weapon = spec.name;
              this.stats.at = spec.at;
            } else {
              this.stats.armor = spec.name;
              this.stats.df = spec.df;
            }
            this.writeSaveData();
            audio.save();
            this.startDialogue([`* Equipped ${spec.name}!\n* ${spec.perk}`]);
            return;
          }
          if (this.stats.gold < it.cost) {
            audio.menuMove();
            this.startDialogue([`* Not enough Gold! Need ${it.cost}G (You have ${this.stats.gold}G).`]);
            return;
          }
          this.stats.gold -= it.cost;
          this.ownedRelics.add(it.name);
          if (it.kind === 'weapon') {
            this.stats.weapon = spec.name;
            this.stats.at = spec.at;
          } else {
            this.stats.armor = spec.name;
            this.stats.df = spec.df;
          }
          this.writeSaveData();
          audio.achievement();
          this.startDialogue([`* Forged & Equipped ${spec.name}!\n* ${spec.perk}`]);
        }
      }
    ]);
  }

  _openSkinMenu() {
    const skins = Object.values(SOUL_SKINS);
    const choices = skins.map((sk) =>
      this.unlockedSkins.has(sk.id)
        ? `${sk.name}${this.soulSkin === sk.id ? ' [ON]' : ''}`
        : `${sk.name} (100G)`
    );
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* SOUL Aura Shrine — Gold: ${this.stats.gold}G | Current: ${SOUL_SKINS[this.soulSkin]?.name || 'Classic'}`,
        choices: [...choices.slice(0, 5), 'Back'],
        onChoice: (idx) => {
          if (idx >= 5) {
            this._openShrineShop();
            return;
          }
          const sk = skins[idx];
          if (!this.unlockedSkins.has(sk.id)) {
            if (this.stats.gold < 100) {
              this.startDialogue([`* Need 100G to unlock ${sk.name}.`]);
              return;
            }
            this.stats.gold -= 100;
            this.unlockedSkins.add(sk.id);
          }
          this.soulSkin = sk.id;
          this.writeSaveData();
          audio.save();
          this.startDialogue([`* SOUL Aura set to ${sk.name}!\n* ${sk.desc}`]);
        }
      }
    ]);
  }

  _tryInteract() {
    const px = this.player.x;
    const py = this.player.y;

    if (this.roomId === 'antechamber') {
      // SAVE Star at (320, 354)
      if (Math.hypot(px - 320, py - 354) < 58) {
        this.stats.hp = this.stats.maxHp;
        audio.heal();
        this.startDialogue([
          {
            speaker: 'narrator',
            text: '* The chill of the last night fades beneath golden light.\n* Your HP was fully restored.',
            voice: 'narrator'
          },
          {
            speaker: 'narrator',
            text: '* The Twilight Antechamber — File Ready.\n  Save your progress?',
            voice: 'narrator',
            choices: ['Save', 'Return'],
            onChoice: (idx) => {
              if (idx === 0) {
                this.writeSaveData();
                audio.save();
                this.startDialogue(['* File saved.']);
              }
            }
          }
        ]);
        return;
      }

      // Dimensional Supply Box at (185, 326)
      if (Math.hypot(px - 185, py - 326) < 58) {
        audio.menuSelect();
        this.startDialogue([
          {
            speaker: 'narrator',
            text: '* It is a Dimensional Supply Chest.\n* Inside are neatly packed snacks for the battle ahead.',
            choices: ['Restock Full Inventory', 'Leave it'],
            onChoice: (idx) => {
              if (idx === 0) {
                this.inventory = DEFAULT_INVENTORY();
                audio.heal();
                this.startDialogue(['* Your pockets are packed with all 10 healing & attack items!']);
              }
            }
          }
        ]);
        return;
      }

      // Relic Armory Pedestal at (465, 344)
      if (Math.hypot(px - 465, py - 344) < 58) {
        audio.menuSelect();
        this._openArmoryMenu();
        return;
      }

      // Wall Plaque & Echo Memory at (96, 320)
      if (Math.hypot(px - 96, py - 320) < 56) {
        audio.menuSelect();
        this.startDialogue([
          '* An ancient inscription reads:\n* "Beyond these pillars stands the final judge of the Last Night."',
          '* As you trace the carved stone, a familiar voice echoes from memory...',
          {
            speaker: 'papyrus',
            portrait: 'papyrus',
            voice: 'narrator',
            text: '* "NYEH HEH HEH! EVEN IN THE DARKEST NIGHT, I BELIEVE ANYONE CAN BE A GOOD PERSON... IF THEY JUST TRY!"'
          },
          {
            speaker: 'gaster',
            portrait: 'gaster',
            voice: 'gaster',
            text: '* "...ENTRY SEVENTEEN. TIMELINE READINGS NEGATIVE.\n  WATCH YOUR STEP IN PHASE FOUR, CHILD."'
          },
          '* The echoes fade. Press [C] to review your STAT perks or swap gear at the east pedestal.'
        ]);
        return;
      }
    }

    if (this.roomId === 'echo_sanctum') {
      // Secret Grey Void Door at (72, 326)
      if (Math.hypot(px - 72, py - 326) < 62) {
        audio.menuSelect();
        this.startDialogue([
          '* A lone grey door stands humming quietly in the mist.',
          '* Turn the cold handle?',
          {
            speaker: 'narrator',
            text: '* Enter the grey door?',
            choices: ['Open Door', 'Step Back'],
            onChoice: (idx) => {
              if (idx === 0) {
                audio.gasterSpeak();
                this.enterRoom('void_vault', 540, 360);
              }
            }
          }
        ]);
        return;
      }

      // Echo Flower 1 (210, 328)
      if (Math.hypot(px - 210, py - 328) < 52) {
        audio.echoFlower();
        this.startDialogue([
          '* You lean in toward the glowing Echo Flower...',
          '* "...two timelines left... the skeleton guards the hall, while a shadow pulls the strings from above..."'
        ]);
        return;
      }

      // Echo Flower 2 (320, 324)
      if (Math.hypot(px - 320, py - 324) < 52) {
        audio.echoFlower();
        this.startDialogue([
          '* The Echo Flower shimmers with violet pollen...',
          '* "...hold [X] or [Shift] during attacks to DASH through impossible patterns with i-frames..."'
        ]);
        return;
      }

      // Echo Flower 3 (435, 328)
      if (Math.hypot(px - 435, py - 328) < 52) {
        audio.echoFlower();
        this.startDialogue([
          '* The flower whispers in fractured static...',
          '* "...take the Void Key behind the grey door to shatter Phase 4\'s ending and challenge PHASE 5..."'
        ]);
        return;
      }

      // Relic & Skin Shrine (525, 344)
      if (Math.hypot(px - 525, py - 344) < 58) {
        audio.menuSelect();
        this._openShrineShop();
        return;
      }
    }

    if (this.roomId === 'void_vault') {
      // W.D. Gaster Fragment at (260, 325)
      if (Math.hypot(px - 260, py - 340) < 92) {
        audio.gasterSpeak();
        if (!this.hasVoidKey) {
          this.hasVoidKey = true;
          this.unlockedSkins.add('gaster_mono');
          this.soulSkin = 'gaster_mono';
          this.stats.gold += 250;
          this.writeSaveData();
          this.startDialogue([
            {
              speaker: 'gaster',
              portrait: 'gaster',
              voice: 'gaster',
              text: '* "VERY... VERY INTERESTING. YOU FOUND MY SILENT CORRIDOR OUTSIDE THE LOOP."'
            },
            {
              speaker: 'gaster',
              portrait: 'gaster',
              voice: 'gaster',
              text: '* "TAKE THIS VOID KEY. REACH PHASE FOUR IN STORY MODE—AND WITNESS WHAT WAITS IN PHASE FIVE."'
            },
            '* Obtained [VOID KEY], +250G, and unlocked the [Void Mono] SOUL Aura!'
          ]);
        } else {
          this.startDialogue([
            {
              speaker: 'gaster',
              portrait: 'gaster',
              voice: 'gaster',
              text: '* "THE VOID KEY RESONATES IN YOUR POCKET. WALK BACK TO THE CORRIDOR... I WILL BE WATCHING."'
            }
          ]);
        }
        return;
      }
    }

    if (this.roomId === 'throne_approach') {
      // Dawn Vista railing at (490, 355)
      if (px > 380) {
        audio.menuSelect();
        const endingLabel =
          this.lastEnding === 'truce'
            ? 'DAWN TRUCE (MERCY)'
            : this.lastEnding === 'strike'
              ? 'NO-MERCY FINALE'
              : 'COMPLETED';
        this.startDialogue([
          `* You gaze out across the brightening sky over Mt. Ebott.`,
          `* Route Cleared: ${endingLabel}${this.lastRank ? `  |  Rank: ${this.lastRank}` : ''}.`,
          `* Thank you for playing UNDERTALE: LAST NIGHT.`
        ]);
      }
    }
  }

  _triggerSansCorridorCutscene() {
    this.encounterTriggered = true;
    this.player.dir = 'right';
    this.startDialogue(
      [
        { speaker: 'sans', portrait: 'sans', voice: 'sans', text: "* heya. looks like you made it all the way to the last night." },
        { speaker: 'sans', portrait: 'sans_hollow', voice: 'sans', text: "* this corridor's seen a whole lot of timelines come and go..." },
        { speaker: 'sans', portrait: 'sans_tired', voice: 'sans', text: "* i promised myself i wouldn't let this one end in silence." },
        { speaker: 'sans', portrait: 'sans_wink', voice: 'sans', text: "* so let's skip the warm-up.\n  ready to see what dawn costs?" }
      ],
      () => {
        audio.encounterAlert();
        this.transition = { timer: 0 };
      }
    );
  }

  _updateDialogue(dt, input) {
    const dlg = this.dialogue;
    const current = dlg.lines[dlg.idx];

    if (dlg.charIdx < current.text.length) {
      dlg.timer += dt;
      const charsPerSec = 42;
      while (dlg.timer >= 1 / charsPerSec && dlg.charIdx < current.text.length) {
        dlg.timer -= 1 / charsPerSec;
        const ch = current.text[dlg.charIdx];
        dlg.charIdx++;
        if (ch !== ' ' && ch !== '\n') {
          if (current.voice === 'gaster') {
            if (dlg.charIdx % 2 === 1) audio.gasterSpeak();
          } else {
            audio.textBlip(current.voice);
          }
        }
      }
      if (input.justPressed('KeyX') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) {
        dlg.charIdx = current.text.length;
      }
      return;
    }

    // Choice handling once text finished typing
    if (current.choices && current.choices.length > 0) {
      const count = current.choices.length;
      if (count > 2) {
        if (input.justPressed('ArrowLeft') || input.justPressed('KeyA')) {
          const next = dlg.choiceIdx ^ 1;
          dlg.choiceIdx = next < count ? next : (dlg.choiceIdx - 1 + count) % count;
          audio.menuMove();
        } else if (input.justPressed('ArrowRight') || input.justPressed('KeyD')) {
          const next = dlg.choiceIdx ^ 1;
          dlg.choiceIdx = next < count ? next : (dlg.choiceIdx + 1) % count;
          audio.menuMove();
        } else if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
          if (dlg.choiceIdx - 2 >= 0) {
            dlg.choiceIdx -= 2;
          } else {
            let target = Math.floor((count - 1) / 2) * 2 + (dlg.choiceIdx % 2);
            if (target >= count) target = count - 1;
            dlg.choiceIdx = target;
          }
          audio.menuMove();
        } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
          if (dlg.choiceIdx + 2 < count) {
            dlg.choiceIdx += 2;
          } else if (dlg.choiceIdx < 2 && count > 2) {
            dlg.choiceIdx = count - 1;
          } else {
            dlg.choiceIdx = dlg.choiceIdx % 2;
          }
          audio.menuMove();
        }
      } else {
        if (input.justPressed('ArrowLeft') || input.justPressed('ArrowUp') || input.justPressed('KeyA') || input.justPressed('KeyW')) {
          dlg.choiceIdx = (dlg.choiceIdx - 1 + count) % count;
          audio.menuMove();
        } else if (input.justPressed('ArrowRight') || input.justPressed('ArrowDown') || input.justPressed('KeyD') || input.justPressed('KeyS')) {
          dlg.choiceIdx = (dlg.choiceIdx + 1) % count;
          audio.menuMove();
        }
      }

      if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        audio.menuSelect();
        const chosen = dlg.choiceIdx;
        const onChoice = current.onChoice;
        this.dialogue = null;
        if (onChoice) onChoice(chosen);
        return;
      } else if (input.justPressed('KeyX')) {
        this.dialogue = null;
        return;
      }
      return;
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuMove();
      if (dlg.idx + 1 < dlg.lines.length) {
        dlg.idx++;
        dlg.charIdx = 0;
        dlg.timer = 0;
        dlg.choiceIdx = 0;
      } else {
        const doneCb = dlg.onComplete;
        this.dialogue = null;
        if (doneCb) doneCb();
      }
    }
  }

  _updateFieldMenu(input) {
    const fm = this.fieldMenu;

    if (input.justPressed('KeyX') || input.justPressed('KeyC') || input.justPressed('Escape')) {
      audio.menuMove();
      if (fm.tab === 'MAIN') {
        this.fieldMenu = null;
      } else {
        fm.tab = 'MAIN';
      }
      return;
    }

    if (fm.tab === 'MAIN') {
      const options = ['ITEM', 'STAT', 'CELL', 'TITLE'];
      if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
        fm.idx = (fm.idx - 1 + options.length) % options.length;
        audio.menuMove();
      } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
        fm.idx = (fm.idx + 1) % options.length;
        audio.menuMove();
      } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        audio.menuSelect();
        const sel = options[fm.idx];
        if (sel === 'TITLE') {
          this.fieldMenu = null;
          this.onReturnTitle();
        } else {
          fm.tab = sel;
          fm.subIdx = 0;
        }
      }
    } else if (fm.tab === 'ITEM') {
      if (this.inventory.length === 0) return;
      if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
        fm.subIdx = (fm.subIdx - 1 + this.inventory.length) % this.inventory.length;
        audio.menuMove();
      } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
        fm.subIdx = (fm.subIdx + 1) % this.inventory.length;
        audio.menuMove();
      } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        const picked = this.inventory[fm.subIdx];
        if (picked && (picked.kind === 'attack' || picked.kind === 'tactical')) {
          audio.menuMove();
          this.fieldMenu = null;
          this.startDialogue([`* Save ${picked.name} for battle against Sans!\n* (${picked.desc})`]);
          return;
        }
        const item = this.inventory.splice(fm.subIdx, 1)[0];
        const bonus = WEAPONS[this.stats.weapon]?.itemHealBonus || 0;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + item.heal + bonus);
        audio.heal();
        this.fieldMenu = null;
        this.startDialogue([`* You ate the ${item.name}.\n* ${item.desc}`]);
      }
    } else if (fm.tab === 'CELL') {
      if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        audio.menuSelect();
        this.fieldMenu = null;
        this.startDialogue([
          '* Ring... Ring...',
          {
            speaker: 'gaster',
            portrait: 'gaster',
            voice: 'gaster',
            text: '* ...A FRACTURED VOICE ECHOES THROUGH THE RECEIVER.\n* "IT IS RUDE TO TALK ABOUT SOMEONE WHO IS LISTENING."'
          },
          '* The line dissolves back into quiet static.'
        ]);
      }
    }
  }

  getCameraX() {
    if (this.roomId === 'corridor') {
      return Math.max(0, Math.min(480, this.player.x - 280));
    }
    return 0;
  }

  render(ctx) {
    const camX = this.getCameraX();

    if (this.roomId === 'antechamber') {
      this._renderAntechamber(ctx);
    } else if (this.roomId === 'echo_sanctum') {
      this._renderEchoSanctum(ctx);
    } else if (this.roomId === 'void_vault') {
      this._renderVoidVault(ctx);
    } else if (this.roomId === 'corridor') {
      this._renderCorridor(ctx, camX);
    } else {
      this._renderDawnBalcony(ctx);
    }

    // Room prompt hint
    if (!this.dialogue && !this.fieldMenu && !this.transition) {
      this._renderInteractionHint(ctx, camX);
    }

    // Field Menu (C)
    if (this.fieldMenu) {
      this._renderFieldMenu(ctx);
    }

    // Overworld Dialogue Box
    if (this.dialogue) {
      this._renderDialogue(ctx);
    }

    // Encounter Transition
    if (this.transition) {
      this._renderTransition(ctx, camX);
    }
  }

  _drawPlayerSprite(ctx, sx, y) {
    for (const fd of this.footDust) {
      const a = Math.max(0, Math.min(1, fd.life / (fd.maxLife || 0.28)));
      const fx = this.roomId === 'corridor' ? fd.x - this.getCameraX() : fd.x;
      ctx.fillStyle = `rgba(255, 239, 130, ${(a * 0.65).toFixed(2)})`;
      ctx.fillRect(Math.round(fx - 3), Math.round(fd.y), 4, 4);
    }
    drawFriskOverworld(ctx, sx, y, this.player.dir, this.player.walkFrame, 1.9, {
      outfit: this.charOutfit,
      time: this.time,
      weapon: this.stats.weapon,
      armor: this.stats.armor,
      sprinting: this.player.sprinting
    });
  }

  _renderAntechamber(ctx) {
    // Deep twilight chamber
    ctx.fillStyle = '#07060d';
    ctx.fillRect(0, 0, 640, 480);

    // Stone wall & floor
    ctx.fillStyle = '#181426';
    ctx.fillRect(28, 70, 584, 232);
    ctx.fillStyle = '#2d2444';
    ctx.fillRect(28, 294, 584, 8);

    // Floor tiles
    for (let x = 28; x < 612; x += 32) {
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = ((x / 32 + row) % 2 === 0) ? '#261f38' : '#1b1629';
        ctx.fillRect(x, 302 + row * 32, 32, 32);
      }
    }

    // East Doorway Arch
    ctx.fillStyle = '#0b0912';
    ctx.fillRect(584, 210, 46, 150);
    ctx.fillStyle = '#ffdf70';
    ctx.fillRect(622, 230, 10, 120);

    // West Echo Sanctum Archway
    ctx.fillStyle = '#0b0912';
    ctx.fillRect(10, 210, 24, 150);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(10, 234, 8, 114);

    // Ancient Plaque (west wall)
    ctx.fillStyle = '#473a66';
    ctx.fillRect(64, 188, 64, 42);
    ctx.strokeStyle = '#9e8fd1';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 188, 64, 42);
    ctx.fillStyle = '#c8bedb';
    ctx.fillRect(74, 198, 44, 4);
    ctx.fillRect(74, 208, 36, 4);
    ctx.fillRect(74, 218, 42, 4);

    // Dimensional Supply Chest
    drawChest(ctx, 185, 322);

    // Depth-sorted props & player (SAVE Star at 344, Relic Armory Pedestal at 465, 344)
    if (this.player.y < 344) {
      this._drawPlayerSprite(ctx, this.player.x, this.player.y);
      drawSaveStar(ctx, 320, 344, this.time);
      drawRelicPedestal(ctx, 465, 344, this.time);
    } else {
      drawSaveStar(ctx, 320, 344, this.time);
      drawRelicPedestal(ctx, 465, 344, this.time);
      this._drawPlayerSprite(ctx, this.player.x, this.player.y);
    }

    // Room Title badge
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(14, 14, 295, 28);
    ctx.fillStyle = '#b4a8d4';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('TWILIGHT ANTECHAMBER', 24, 33);
  }

  _renderEchoSanctum(ctx) {
    // Waterfall-inspired Echo Sanctum
    ctx.fillStyle = '#040914';
    ctx.fillRect(0, 0, 640, 480);

    // Glowing cyan water pool reflections above & stone walkway below
    ctx.fillStyle = '#0b1d36';
    ctx.fillRect(28, 72, 584, 226);
    ctx.fillStyle = '#132f54';
    for (let wx = 40; wx < 590; wx += 48) {
      const shimmer = Math.round(Math.sin(this.time * 2.2 + wx) * 6);
      ctx.fillRect(wx + shimmer, 120 + (wx % 3) * 38, 28, 4);
    }

    // Sanctuary stone walkway
    ctx.fillStyle = '#1a2744';
    ctx.fillRect(28, 298, 584, 8);
    for (let x = 28; x < 612; x += 32) {
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = ((x / 32 + row) % 2 === 0) ? '#152036' : '#0f1829';
        ctx.fillRect(x, 306 + row * 32, 32, 32);
      }
    }

    // East doorway back to Twilight Antechamber
    ctx.fillStyle = '#060912';
    ctx.fillRect(584, 210, 46, 150);
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(622, 232, 10, 118);

    // Secret Grey Door on West Wall & Echo Flowers & Shrine
    drawVoidDoor(ctx, 72, 326, this.time, this.hasVoidKey);
    drawEchoFlower(ctx, 210, 328, this.time, Math.hypot(this.player.x - 210, this.player.y - 328) < 64);
    drawEchoFlower(ctx, 320, 324, this.time, Math.hypot(this.player.x - 320, this.player.y - 324) < 64);
    drawEchoFlower(ctx, 435, 328, this.time, Math.hypot(this.player.x - 435, this.player.y - 328) < 64);

    if (this.player.y < 344) {
      this._drawPlayerSprite(ctx, this.player.x, this.player.y);
      drawSoulShrine(ctx, 525, 344, this.time);
    } else {
      drawSoulShrine(ctx, 525, 344, this.time);
      this._drawPlayerSprite(ctx, this.player.x, this.player.y);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(14, 14, 290, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('ECHO FLOWER SANCTUM', 24, 33);
  }

  _renderVoidVault(ctx) {
    // Stark monochrome-violet Mystery Room (Room 269 vibe)
    ctx.fillStyle = '#030306';
    ctx.fillRect(0, 0, 640, 480);

    // Subtle shifting monochrome grid floor
    for (let x = 60; x < 610; x += 32) {
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = ((x / 32 + row) % 2 === 0) ? '#141320' : '#090910';
        ctx.fillRect(x, 304 + row * 32, 32, 32);
      }
    }

    // East doorway back to Echo Sanctum
    ctx.fillStyle = '#090910';
    ctx.fillRect(584, 210, 46, 150);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(622, 232, 10, 118);

    // W.D. Gaster Fragment awaiting near west center
    drawGasterOverlay(ctx, 260, 354, {
      time: this.time,
      alpha: 0.94,
      activeHands: true,
      handGlow: this.hasVoidKey
    });

    this._drawPlayerSprite(ctx, this.player.x, this.player.y);

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(14, 14, 275, 28);
    ctx.fillStyle = '#e879f9';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('ENTRY SEVENTEEN // VOID', 24, 33);
  }

  _renderCorridor(ctx, camX) {
    drawJudgmentHallBackdrop(ctx, camX, this.time, this.battleCleared ? 'dawn' : 'gold');

    // Dust motes
    ctx.fillStyle = 'rgba(255, 240, 175, 0.5)';
    for (const d of this.dust) {
      const sx = d.x - camX;
      if (sx >= -10 && sx <= 650) {
        ctx.fillRect(Math.round(sx), Math.round(d.y), d.r * 2, d.r * 2);
      }
    }

    // Sans silhouette waiting ahead in shadow
    if (this.sansVisibleInCorridor) {
      const sansScreenX = 760 - camX;
      drawSansOverworld(ctx, sansScreenX, 365, 1.95, this.encounterTriggered);
    }

    // Frisk
    this._drawPlayerSprite(ctx, this.player.x - camX, this.player.y);

    // Foreground parallax pillars
    drawJudgmentHallForegroundPillars(ctx, camX);

    // Room Title
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(14, 14, 240, 28);
    ctx.fillStyle = '#ffd978';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('THE LAST CORRIDOR', 24, 33);
  }

  _renderDawnBalcony(ctx) {
    // Warm sunrise sky over Mt. Ebott
    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, '#23163d');
    grad.addColorStop(0.55, '#a84f5c');
    grad.addColorStop(1, '#ffb86b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 320);

    // Rising Sun
    ctx.fillStyle = '#fff1a8';
    ctx.beginPath();
    ctx.arc(460, 250, 56, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain ridge
    ctx.fillStyle = '#2d1c3d';
    ctx.beginPath();
    ctx.moveTo(0, 290);
    ctx.lineTo(130, 195);
    ctx.lineTo(270, 275);
    ctx.lineTo(400, 210);
    ctx.lineTo(540, 265);
    ctx.lineTo(640, 225);
    ctx.lineTo(640, 320);
    ctx.lineTo(0, 320);
    ctx.closePath();
    ctx.fill();

    // Stone balcony floor
    ctx.fillStyle = '#5c463c';
    ctx.fillRect(0, 300, 640, 180);
    // Railing
    ctx.fillStyle = '#2c2028';
    ctx.fillRect(36, 264, 568, 10);
    for (let rx = 44; rx < 600; rx += 38) {
      ctx.fillRect(rx, 274, 8, 30);
    }

    this._drawPlayerSprite(ctx, this.player.x, this.player.y);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(14, 14, 210, 28);
    ctx.fillStyle = '#ffd59a';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('DAWN BALCONY', 24, 33);
  }

  _renderInteractionHint(ctx, camX) {
    let hint = null;
    if (this.roomId === 'antechamber') {
      if (Math.hypot(this.player.x - 320, this.player.y - 354) < 58) {
        hint = '[Z] Touch SAVE Star';
      } else if (Math.hypot(this.player.x - 185, this.player.y - 326) < 58) {
        hint = '[Z] Open Supply Chest';
      } else if (Math.hypot(this.player.x - 465, this.player.y - 344) < 58) {
        hint = '[Z] Relic Armory';
      } else if (Math.hypot(this.player.x - 96, this.player.y - 320) < 56) {
        hint = '[Z] Inspect Plaque';
      } else if (this.player.x < 70) {
        hint = 'West <- Echo Sanctum';
      } else if (this.player.x > 520) {
        hint = 'East -> Judgment Hall';
      }
    } else if (this.roomId === 'echo_sanctum') {
      if (Math.hypot(this.player.x - 72, this.player.y - 326) < 62) {
        hint = '[Z] Mysterious Grey Door';
      } else if (Math.hypot(this.player.x - 210, this.player.y - 328) < 52 || Math.hypot(this.player.x - 320, this.player.y - 324) < 52 || Math.hypot(this.player.x - 435, this.player.y - 328) < 52) {
        hint = '[Z] Listen to Echo Flower';
      } else if (Math.hypot(this.player.x - 525, this.player.y - 344) < 58) {
        hint = '[Z] Shrine Forge & Skins';
      } else if (this.player.x > 540) {
        hint = 'East -> Antechamber';
      }
    } else if (this.roomId === 'void_vault') {
      if (Math.hypot(this.player.x - 260, this.player.y - 340) < 92) {
        hint = this.hasVoidKey ? '[Z] Speak to Mystery Man' : '[Z] Claim VOID KEY';
      } else if (this.player.x > 520) {
        hint = 'East -> Echo Sanctum';
      }
    } else if (this.roomId === 'corridor') {
      if (!this.battleCleared && this.player.x < 450) {
        hint = 'Walk East -> Face Sans';
      } else if (this.battleCleared && this.player.x > 900) {
        hint = 'East -> Dawn Balcony';
      }
    } else if (this.roomId === 'throne_approach') {
      if (this.player.x > 380) {
        hint = '[Z] View Ending Summary';
      }
    }

    if (hint) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(200, 440, 240, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(200, 440, 240, 28);
      ctx.fillStyle = '#ffef3f';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hint, 320, 459);
      ctx.restore();
    }
  }

  _renderFieldMenu(ctx) {
    // Top-left status box
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;

    ctx.fillRect(28, 36, 152, 118);
    ctx.strokeRect(28, 36, 152, 118);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(this.stats.name, 44, 62);
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText(`LV  ${this.stats.lv}`, 44, 92);
    ctx.fillText(`HP  ${this.stats.hp}/${this.stats.maxHp}`, 44, 114);
    ctx.fillText(`G   ${this.stats.gold}`, 44, 136);

    // Command list box
    ctx.fillStyle = '#000000';
    ctx.fillRect(28, 166, 152, 166);
    ctx.strokeRect(28, 166, 152, 166);

    const opts = ['ITEM', 'STAT', 'CELL', 'TITLE'];
    ctx.font = '14px "Press Start 2P", monospace';
    opts.forEach((opt, i) => {
      const oy = 198 + i * 34;
      if (this.fieldMenu.tab === 'MAIN' && this.fieldMenu.idx === i) {
        drawSoul(ctx, 48, oy - 5, 'red', { scale: 0.9 });
      }
      ctx.fillStyle = this.fieldMenu.tab === opt ? '#ffef3f' : '#ffffff';
      ctx.fillText(opt, 66, oy);
    });

    // Sub-panel
    if (this.fieldMenu.tab === 'ITEM') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(194, 36, 360, 310);
      ctx.strokeRect(194, 36, 360, 310);
      ctx.font = '13px "Press Start 2P", monospace';
      if (this.inventory.length === 0) {
        ctx.fillStyle = '#888899';
        ctx.fillText('(No items left)', 230, 86);
      } else {
        const compact = this.inventory.length > 8;
        const rowStep = compact ? 25 : 31;
        ctx.font = compact ? '11px "Press Start 2P", monospace' : '13px "Press Start 2P", monospace';
        this.inventory.forEach((it, idx) => {
          const iy = (compact ? 68 : 74) + idx * rowStep;
          if (this.fieldMenu.subIdx === idx) {
            drawSoul(ctx, 214, iy - 4, 'red', { scale: 0.78 });
          }
          ctx.fillStyle = it.color || '#ffffff';
          const tag = it.tag && it.tag !== 'HEAL' ? `[${it.tag}] ` : '';
          ctx.fillText(`${tag}${it.name}`, 232, iy);
        });
        ctx.fillStyle = '#ffef3f';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('[Z] Use Item   [X] Back', 226, 332);
      }
    } else if (this.fieldMenu.tab === 'STAT') {
      const wSpec = WEAPONS[this.stats.weapon] || WEAPONS['Real Knife'];
      const aSpec = ARMORS[this.stats.armor] || ARMORS['The Locket'];
      const outfitSpec = CHAR_OUTFITS[this.charOutfit] || CHAR_OUTFITS.frisk;
      ctx.fillStyle = '#000000';
      ctx.fillRect(194, 36, 412, 310);
      ctx.strokeRect(194, 36, 412, 310);

      // Framed 72x72 Pixel-Art Player Portrait
      ctx.fillStyle = '#0b0a14';
      ctx.fillRect(512, 50, 76, 76);
      ctx.strokeStyle = outfitSpec.badgeColor || '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(512, 50, 76, 76);
      drawDialoguePortrait(ctx, 514, 52, `player_${outfitSpec.id}`, 0);

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.fillText(`"${this.stats.name}"`, 216, 70);
      ctx.fillText(`LV ${this.stats.lv}   HP ${this.stats.hp}/${this.stats.maxHp}`, 216, 102);
      ctx.fillText(`AT ${wSpec.at}   DF ${aSpec.df}`, 216, 134);

      ctx.fillStyle = '#ffef3f';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(`WEAPON: ${wSpec.name}`, 216, 174);
      ctx.fillStyle = '#2ce8f5';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`  ${wSpec.shortPerk}`, 216, 198);

      ctx.fillStyle = '#ffef3f';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(`ARMOR:  ${aSpec.name}`, 216, 238);
      ctx.fillStyle = '#4ade80';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`  ${aSpec.shortPerk}`, 216, 262);

      ctx.fillStyle = outfitSpec.badgeColor || '#c084fc';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`STYLE: ${outfitSpec.name}`, 216, 294);

      ctx.fillStyle = '#9090a8';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('Swap gear at Pedestal / [X] Back', 216, 326);
    } else if (this.fieldMenu.tab === 'CELL') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(194, 36, 360, 140);
      ctx.strokeRect(194, 36, 360, 140);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px "Press Start 2P", monospace';
      drawSoul(ctx, 218, 80, 'red', { scale: 0.85 });
      ctx.fillText('Call Unknown Number', 236, 86);
      ctx.fillStyle = '#ffef3f';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('[Z] Dial   [X] Back', 226, 150);
    }
    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const out = [];
    for (const para of paragraphs) {
      const words = para.split(' ');
      let current = '';
      for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && current) {
          out.push(current);
          current = w;
        } else {
          current = test;
        }
      }
      if (current || para === '') out.push(current);
    }
    return out;
  }

  _renderDialogue(ctx) {
    const dlg = this.dialogue;
    const current = dlg.lines[dlg.idx];
    const shown = current.text.slice(0, dlg.charIdx);
    const hasMultiRowChoices = Boolean(current.choices && current.choices.length > 2);

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(32, 314, 576, 148);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 314, 576, 148);

    // Optional Character Dialogue Portrait
    let textStartX = 56;
    if (current.portrait) {
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(46, 330, 82, 82);
      const talkingFrame = dlg.charIdx < current.text.length ? Math.floor(this.time * 10) % 2 : 0;
      drawDialoguePortrait(ctx, 50, 334, current.portrait, talkingFrame);
      textStartX = 144;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = hasMultiRowChoices ? '11px "Press Start 2P", monospace' : '13px "Press Start 2P", monospace';
    const maxTextWidth = 588 - textStartX;
    const lines = this._wrapText(ctx, shown, maxTextWidth);
    const lineY0 = hasMultiRowChoices ? 342 : 346;
    const lineStep = hasMultiRowChoices ? 22 : 26;
    const maxLines = hasMultiRowChoices ? 3 : 4;
    lines.forEach((line, i) => {
      if (i < maxLines) {
        ctx.fillText(line, textStartX, lineY0 + i * lineStep);
      }
    });

    // Choices at bottom of dialogue box
    if (dlg.charIdx >= current.text.length && current.choices) {
      const count = current.choices.length;
      if (count > 2) {
        current.choices.forEach((c, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const cx = textStartX + 24 + col * 246;
          const cy = 414 + row * 26;
          if (dlg.choiceIdx === idx) {
            drawSoul(ctx, cx - 16, cy - 5, 'red', { scale: 0.85 });
            ctx.fillStyle = '#ffef3f';
          } else {
            ctx.fillStyle = '#ffffff';
          }
          ctx.font = '11px "Press Start 2P", monospace';
          ctx.fillText(c, cx, cy);
        });
      } else {
        current.choices.forEach((c, idx) => {
          const cx = textStartX + 26 + idx * 240;
          const cy = 436;
          if (dlg.choiceIdx === idx) {
            drawSoul(ctx, cx - 16, cy - 5, 'red', { scale: 0.9 });
            ctx.fillStyle = '#ffef3f';
          } else {
            ctx.fillStyle = '#ffffff';
          }
          ctx.font = '12px "Press Start 2P", monospace';
          ctx.fillText(c, cx, cy);
        });
      }
    } else if (dlg.charIdx >= current.text.length) {
      ctx.fillStyle = '#9090a8';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('[Z] Continue', 466, 448);
    }

    ctx.restore();
  }

  _renderTransition(ctx, camX) {
    const t = this.transition.timer;
    const flashOn = Math.floor(t * 14) % 2 === 0;
    if (t < 0.75) {
      if (flashOn) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 640, 480);
      }
      drawSoul(ctx, this.player.x - camX, this.player.y - 18, 'red', { scale: 1.05 });
    } else {
      // Glide toward Battle Box SOUL spawn point (320, 315)
      const p = (t - 0.75) / 0.4;
      const sx = (this.player.x - camX) + (320 - (this.player.x - camX)) * p;
      const sy = (this.player.y - 18) + (315 - (this.player.y - 18)) * p;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 640, 480);
      drawSoul(ctx, sx, sy, 'red', { scale: 1.05 });
    }
  }

  handlePointerMove(x, y) {
    if (this.dialogue) {
      const dlg = this.dialogue;
      const current = dlg.lines[dlg.idx];
      if (dlg.charIdx >= current.text.length && current.choices && current.choices.length > 0) {
        const count = current.choices.length;
        const textStartX = current.portrait ? 144 : 56;
        if (count > 2) {
          if (y >= 394 && y <= 462 && x >= textStartX) {
            const col = x >= textStartX + 220 ? 1 : 0;
            const row = y >= 427 ? 1 : 0;
            const picked = row * 2 + col;
            if (picked < count && dlg.choiceIdx !== picked) {
              dlg.choiceIdx = picked;
              audio.menuMove();
            }
          }
        } else if (y >= 412 && y <= 456 && x >= textStartX) {
          const col = x >= textStartX + 220 ? 1 : 0;
          if (col < count && dlg.choiceIdx !== col) {
            dlg.choiceIdx = col;
            audio.menuMove();
          }
        }
      }
      return;
    }

    if (this.fieldMenu) {
      const fm = this.fieldMenu;
      if (x >= 28 && x <= 180 && y >= 166 && y <= 332) {
        const i = Math.floor((y - 178) / 34);
        if (i >= 0 && i < 4 && fm.tab === 'MAIN' && fm.idx !== i) {
          fm.idx = i;
          audio.menuMove();
        }
      } else if (fm.tab === 'ITEM' && x >= 194 && x <= 554 && y >= 50 && y <= 316) {
        const compact = this.inventory.length > 8;
        const rowStep = compact ? 25 : 31;
        const baseY = compact ? 52 : 54;
        const idx = Math.floor((y - baseY) / rowStep);
        if (idx >= 0 && idx < this.inventory.length && fm.subIdx !== idx) {
          fm.subIdx = idx;
          audio.menuMove();
        }
      }
    }
  }

  handlePointerDown(x, y, input) {
    const fireKey = (code) => {
      if (input.tap) input.tap(code);
      else input.triggerPress(code);
    };
    this.handlePointerMove(x, y);

    if (this.dialogue) {
      const dlg = this.dialogue;
      const current = dlg.lines[dlg.idx];
      if (y >= 314 && y <= 462 && x >= 32 && x <= 608) {
        if (dlg.charIdx < current.text.length) {
          dlg.charIdx = current.text.length;
        } else {
          fireKey('KeyZ');
        }
      }
      return;
    }

    if (this.fieldMenu) {
      const fm = this.fieldMenu;
      if (x >= 28 && x <= 180 && y >= 166 && y <= 332) {
        const i = Math.floor((y - 178) / 34);
        if (i >= 0 && i < 4) {
          const options = ['ITEM', 'STAT', 'CELL', 'TITLE'];
          audio.menuSelect();
          if (options[i] === 'TITLE') {
            this.fieldMenu = null;
            this.onReturnTitle();
          } else {
            fm.idx = i;
            fm.tab = options[i];
            fm.subIdx = 0;
          }
        }
        return;
      }
      if (fm.tab === 'ITEM' && x >= 194 && x <= 554 && y >= 50 && y <= 316 && this.inventory.length > 0) {
        const compact = this.inventory.length > 8;
        const rowStep = compact ? 25 : 31;
        const baseY = compact ? 52 : 54;
        const idx = Math.floor((y - baseY) / rowStep);
        if (idx >= 0 && idx < this.inventory.length) {
          fm.subIdx = idx;
          fireKey('KeyZ');
        }
        return;
      }
      if (fm.tab === 'CELL' && x >= 194 && x <= 554 && y >= 50 && y <= 130) {
        fireKey('KeyZ');
        return;
      }
      if (x < 28 || x > 606 || y < 36 || y > 350) {
        audio.menuMove();
        this.fieldMenu = null;
      }
      return;
    }

    if (!this.transition && y >= 436 && y <= 472 && x >= 190 && x <= 450) {
      fireKey('KeyZ');
    }
  }
}
