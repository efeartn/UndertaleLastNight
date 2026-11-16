// Overworld Engine: Rooms, Collision, Interactive Objects, Field Menu (C), and Typewriter Dialogue

import { audio } from './audio.js';
import {
  drawChest,
  drawDialoguePortrait,
  drawFriskOverworld,
  drawJudgmentHallBackdrop,
  drawJudgmentHallForegroundPillars,
  drawRelicPedestal,
  drawSansOverworld,
  drawSaveStar,
  drawSoul
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
  }
};

export const DEFAULT_INVENTORY = () => [
  { name: 'B.Scotch Pie', heal: 99, desc: 'All HP restored. Still warm from Toriel.' },
  { name: 'Instant Noodles', heal: 90, desc: 'They are better dry. Restored 90 HP.' },
  { name: 'Face Steak', heal: 60, desc: 'Huge steak in the shape of Mettaton.' },
  { name: 'L. Hero', heal: 40, desc: 'Legendary Hero sandwich! Attack UP!' },
  { name: 'L. Hero', heal: 40, desc: 'Legendary Hero sandwich! Attack UP!' },
  { name: 'L. Hero', heal: 40, desc: 'Legendary Hero sandwich! Attack UP!' },
  { name: 'Snowman Piece', heal: 45, desc: 'You ate the Snowman Piece. Cold & sweet.' },
  { name: 'Snowman Piece', heal: 45, desc: 'You ate the Snowman Piece. Nostalgic.' }
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
      speed: 148
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
    this.lastEnding = null; // 'truce' | 'strike'
    this.lastRank = null;
    this.encounterTriggered = false;
    this.sansVisibleInCorridor = true;

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
      if (typeof data.battleCleared === 'boolean') this.battleCleared = data.battleCleared;
      if (data.lastEnding) this.lastEnding = data.lastEnding;
      if (data.lastRank) this.lastRank = data.lastRank;
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
        hp: this.stats.hp,
        inventory: this.inventory,
        weapon: this.stats.weapon,
        armor: this.stats.armor,
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
    } else if (roomId === 'corridor') {
      this.player.x = spawnX ?? 64;
      this.player.y = spawnY ?? 365;
      this.encounterTriggered = false;
      this.sansVisibleInCorridor = !this.battleCleared;
      audio.playBGM(this.battleCleared ? 'ending' : 'overworld');
    } else if (roomId === 'throne_approach') {
      this.player.x = spawnX ?? 90;
      this.player.y = spawnY ?? 365;
      audio.playBGM('ending');
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

    // 4. Player Movement
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

    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.player.dir = dx < 0 ? 'left' : 'right';
      } else {
        this.player.dir = dy < 0 ? 'up' : 'down';
      }
      this.player.x += dx * this.player.speed * dt;
      this.player.y += dy * this.player.speed * dt;
      this.player.walkTimer += dt;
      if (this.player.walkTimer >= 0.14) {
        this.player.walkTimer = 0;
        this.player.walkFrame = (this.player.walkFrame + 1) % 4;
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
      this.player.x = Math.max(46, Math.min(626, this.player.x));
      if (this.player.x >= 612) {
        this.enterRoom('corridor', 52, this.player.y);
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
    const names = Object.keys(WEAPONS);
    this.startDialogue([
      {
        speaker: 'narrator',
        text: `* Select a Weapon (Current: ${this.stats.weapon}):\n* Pan: +4HP/-3KR item | Notebook: +0.15s i-frames`,
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
    const names = Object.keys(ARMORS);
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
                this.startDialogue(['* Your pockets are packed with all 8 healing items!']);
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
      drawFriskOverworld(ctx, this.player.x, this.player.y, this.player.dir, this.player.walkFrame);
      drawSaveStar(ctx, 320, 344, this.time);
      drawRelicPedestal(ctx, 465, 344, this.time);
    } else {
      drawSaveStar(ctx, 320, 344, this.time);
      drawRelicPedestal(ctx, 465, 344, this.time);
      drawFriskOverworld(ctx, this.player.x, this.player.y, this.player.dir, this.player.walkFrame);
    }

    // Room Title badge
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(14, 14, 295, 28);
    ctx.fillStyle = '#b4a8d4';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('TWILIGHT ANTECHAMBER', 24, 33);
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
      drawSansOverworld(ctx, sansScreenX, 365, 2.55, this.encounterTriggered);
    }

    // Frisk
    drawFriskOverworld(ctx, this.player.x - camX, this.player.y, this.player.dir, this.player.walkFrame);

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

    drawFriskOverworld(ctx, this.player.x, this.player.y, this.player.dir, this.player.walkFrame);

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
      } else if (this.player.x > 520) {
        hint = 'East -> Judgment Hall';
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
        this.inventory.forEach((it, idx) => {
          const iy = 74 + idx * 31;
          if (this.fieldMenu.subIdx === idx) {
            drawSoul(ctx, 218, iy - 5, 'red', { scale: 0.85 });
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillText(it.name, 236, iy);
        });
        ctx.fillStyle = '#ffef3f';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('[Z] Use Item   [X] Back', 226, 330);
      }
    } else if (this.fieldMenu.tab === 'STAT') {
      const wSpec = WEAPONS[this.stats.weapon] || WEAPONS['Real Knife'];
      const aSpec = ARMORS[this.stats.armor] || ARMORS['The Locket'];
      ctx.fillStyle = '#000000';
      ctx.fillRect(194, 36, 412, 310);
      ctx.strokeRect(194, 36, 412, 310);
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

      ctx.fillStyle = '#9090a8';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('Swap gear at Relic Armory Pedestal', 216, 316);
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
      } else if (fm.tab === 'ITEM' && x >= 194 && x <= 554 && y >= 50 && y <= 310) {
        const idx = Math.floor((y - 54) / 31);
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
      if (fm.tab === 'ITEM' && x >= 194 && x <= 554 && y >= 50 && y <= 310 && this.inventory.length > 0) {
        const idx = Math.floor((y - 54) / 31);
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
