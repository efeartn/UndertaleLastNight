// UNDERTALE: LAST NIGHT — Main Game Loop, Unified Input, Title Screen, UI & Mouse Orchestration

import { ATTACK_META } from './attacks.js';
import { audio } from './audio.js';
import { ACHIEVEMENT_DEFS, BattleEngine } from './battle.js';
import { OverworldEngine } from './overworld.js';
import { drawSansBattle, drawSoul } from './sprites.js';

class InputManager {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.virtualHeld = new Set();
    this.prevPadButtons = {};
  }

  triggerPress(code) {
    if (!this.held.has(code)) {
      this.pressed.add(code);
    }
    this.held.add(code);
  }

  tap(code) {
    this.pressed.add(code);
  }

  release(code) {
    this.held.delete(code);
  }

  setVirtual(code, down) {
    if (down) {
      if (!this.virtualHeld.has(code)) {
        this.pressed.add(code);
      }
      this.virtualHeld.add(code);
    } else {
      this.virtualHeld.delete(code);
    }
  }

  pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads && pads[0];
    if (!gp) return;

    const map = [
      { idx: 12, code: 'ArrowUp' },
      { idx: 13, code: 'ArrowDown' },
      { idx: 14, code: 'ArrowLeft' },
      { idx: 15, code: 'ArrowRight' },
      { idx: 0, code: 'KeyZ' },
      { idx: 1, code: 'KeyX' },
      { idx: 2, code: 'KeyC' }
    ];

    for (const m of map) {
      const btn = gp.buttons[m.idx];
      const down = Boolean(btn && btn.pressed);
      const prev = Boolean(this.prevPadButtons[m.code]);
      if (down && !prev) this.pressed.add(m.code);
      this.prevPadButtons[m.code] = down;
    }

    if (gp.axes && gp.axes.length >= 2) {
      this.prevPadButtons['StickLeft'] = gp.axes[0] < -0.45;
      this.prevPadButtons['StickRight'] = gp.axes[0] > 0.45;
      this.prevPadButtons['StickUp'] = gp.axes[1] < -0.45;
      this.prevPadButtons['StickDown'] = gp.axes[1] > 0.45;
    }
  }

  isDown(code) {
    if (this.held.has(code) || this.virtualHeld.has(code) || this.prevPadButtons[code]) {
      return true;
    }
    if (code === 'ArrowLeft' && this.prevPadButtons['StickLeft']) return true;
    if (code === 'ArrowRight' && this.prevPadButtons['StickRight']) return true;
    if (code === 'ArrowUp' && this.prevPadButtons['StickUp']) return true;
    if (code === 'ArrowDown' && this.prevPadButtons['StickDown']) return true;
    return false;
  }

  justPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }
}

export class UndertaleLastNightGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.input = new InputManager();

    this.mode = 'TITLE'; // TITLE | CONTROLS_LORE | ATTACK_SELECT | OVERWORLD | BATTLE
    this.titleIndex = 0;
    this.attackSelectIndex = 0;
    this.customSpeedMult = 1.0;
    this.time = 0;
    this.hasSave = false;
    this.crtEnabled = false;
    this.assistEnabled = false;

    this._titleRects = [];
    this._attackCardRects = [];
    this._attackBarButtons = [];
    this._onHudSync = null;

    this.overworld = new OverworldEngine({
      onTriggerBattle: () => this.startBattleFromOverworld(),
      onReturnTitle: () => this.returnToTitle()
    });

    this.battle = new BattleEngine({
      onVictory: (res) => this.handleBattleVictory(res),
      onExitToOverworld: () => {
        this.mode = 'OVERWORLD';
        this.overworld.enterRoom('antechamber', 320, 380);
      },
      onReturnTitle: () => this.returnToTitle(),
      onOpenAttackSelect: () => this.openAttackSelect()
    });

    this.hasSave = this.overworld.loadSaveData();
    this.stars = Array.from({ length: 42 }, (_, i) => ({
      x: (i * 97) % 640,
      y: (i * 59) % 240,
      r: (i % 3) + 1,
      spd: 4 + (i % 5) * 3,
      phase: i * 0.4
    }));

    this.lastTime = 0;
  }

  returnToTitle() {
    this.mode = 'TITLE';
    this.hasSave = this.overworld.loadSaveData();
    audio.stopBGM();
  }

  startFullGame(useSave = false) {
    audio.ensureContext();
    if (useSave && this.overworld.loadSaveData()) {
      this.overworld.enterRoom(this.overworld.roomId || 'antechamber', 320, 380);
    } else {
      this.overworld = new OverworldEngine({
        onTriggerBattle: () => this.startBattleFromOverworld(),
        onReturnTitle: () => this.returnToTitle()
      });
      this.overworld.enterRoom('antechamber', 120, 362);
      this.overworld.startDialogue([
        '* Long ago, a timeline stalled on the threshold of morning.',
        '* Tonight is the Last Night in the Judgment Hall.',
        '* Walk east to confront Sans, or visit the Relic Pedestal & SAVE Star.'
      ]);
    }
    this.mode = 'OVERWORLD';
  }

  startBattleFromOverworld() {
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      phase: 1,
      name: this.overworld.stats.name,
      hp: this.overworld.stats.hp,
      maxHp: this.overworld.stats.maxHp,
      inventory: this.overworld.inventory,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor,
      customSpeedMult: this.customSpeedMult
    });
  }

  jumpToBattlePhase(phase) {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      phase,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor,
      customSpeedMult: this.customSpeedMult
    });
  }

  startAttackPractice(index) {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      practiceAttackIndex: index,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor,
      customSpeedMult: this.customSpeedMult
    });
  }

  startEndlessBattle() {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      endless: true,
      phase: 4,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor,
      customSpeedMult: this.customSpeedMult
    });
  }

  startBossRush() {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      bossRush: true,
      phase: 1,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor,
      customSpeedMult: this.customSpeedMult
    });
  }

  cycleSpeedMultiplier() {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const idx = speeds.findIndex((s) => Math.abs(s - this.customSpeedMult) < 0.05);
    this.customSpeedMult = speeds[(idx + 1) % speeds.length];
    audio.menuMove();
  }

  openAttackSelect() {
    audio.ensureContext();
    audio.stopBGM();
    this.mode = 'ATTACK_SELECT';
  }

  handleBattleVictory(res) {
    this.overworld.battleCleared = true;
    this.overworld.lastEnding = res.ending;
    this.overworld.lastRank = res.rank;
    this.overworld.stats.hp = this.overworld.stats.maxHp;
    this.overworld.writeSaveData();
    this.hasSave = true;

    this.mode = 'OVERWORLD';
    this.overworld.enterRoom('throne_approach', 130, 365);
    this.overworld.startDialogue([
      res.ending === 'truce'
        ? '* For the first time in countless resets, the sky outside brightens.'
        : '* Silence settles over the hall as dawn spills across the stone.',
      '* Walk up to the balcony railing and press [Z] to view your summary.'
    ]);
  }

  getTitleOptions() {
    const opts = [];
    if (this.hasSave) {
      opts.push({ label: 'Continue Saved File', action: () => this.startFullGame(true) });
    }
    opts.push(
      { label: 'Start Full Game (Overworld + Story)', action: () => this.startFullGame(false) },
      { label: 'Jump to Sans Battle (Phase 1)', action: () => this.jumpToBattlePhase(1) },
      { label: 'Jump to Sans Battle (Phase 2)', action: () => this.jumpToBattlePhase(2) },
      { label: 'Jump to Sans Battle (Phase 3)', action: () => this.jumpToBattlePhase(3) },
      { label: 'Jump to Sans Battle (Phase 4)', action: () => this.jumpToBattlePhase(4) },
      { label: `Full Boss Rush (${ATTACK_META.length} Attacks)`, action: () => this.startBossRush() },
      { label: 'Endless Survival (Phase 4)', action: () => this.startEndlessBattle() },
      { label: `Attack Practice Menu (${ATTACK_META.length})`, action: () => this.openAttackSelect() },
      { label: 'Controls & Mechanics Guide', action: () => { this.mode = 'CONTROLS_LORE'; } }
    );
    return opts;
  }

  handleCanvasHover(x, y) {
    if (this.mode === 'TITLE') {
      for (const r of this._titleRects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (this.titleIndex !== r.idx) {
            this.titleIndex = r.idx;
            audio.menuMove();
          }
          return;
        }
      }
    } else if (this.mode === 'ATTACK_SELECT') {
      for (const r of this._attackCardRects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (this.attackSelectIndex !== r.idx) {
            this.attackSelectIndex = r.idx;
            audio.menuMove();
          }
          return;
        }
      }
    } else if (this.mode === 'OVERWORLD') {
      this.overworld.handlePointerMove(x, y);
    } else if (this.mode === 'BATTLE') {
      this.battle.handlePointerMove(x, y);
    }
  }

  handleCanvasClick(x, y) {
    if (this.mode === 'TITLE') {
      for (const r of this._titleRects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          this.titleIndex = r.idx;
          audio.menuSelect();
          const opts = this.getTitleOptions();
          opts[this.titleIndex]?.action();
          return;
        }
      }
    } else if (this.mode === 'ATTACK_SELECT') {
      for (const btn of this._attackBarButtons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          btn.action();
          return;
        }
      }
      for (const r of this._attackCardRects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          this.attackSelectIndex = r.idx;
          audio.menuSelect();
          this.startAttackPractice(r.idx);
          return;
        }
      }
    } else if (this.mode === 'CONTROLS_LORE') {
      audio.menuMove();
      this.mode = 'TITLE';
    } else if (this.mode === 'OVERWORLD') {
      this.overworld.handlePointerDown(x, y, this.input);
    } else if (this.mode === 'BATTLE') {
      this.battle.handlePointerDown(x, y, this.input);
    }
  }

  update(dt) {
    this.time += dt;
    this.input.pollGamepad();

    for (const st of this.stars) {
      st.y += st.spd * dt;
      if (st.y > 240) st.y = -4;
    }

    if (this.mode === 'TITLE') {
      const opts = this.getTitleOptions();
      if (this.titleIndex >= opts.length) this.titleIndex = opts.length - 1;
      if (this.input.justPressed('ArrowUp') || this.input.justPressed('KeyW')) {
        this.titleIndex = (this.titleIndex - 1 + opts.length) % opts.length;
        audio.menuMove();
      } else if (this.input.justPressed('ArrowDown') || this.input.justPressed('KeyS')) {
        this.titleIndex = (this.titleIndex + 1) % opts.length;
        audio.menuMove();
      } else if (this.input.justPressed('KeyZ') || this.input.justPressed('Enter')) {
        audio.menuSelect();
        opts[this.titleIndex]?.action();
      }
    } else if (this.mode === 'ATTACK_SELECT') {
      this._updateAttackSelect();
    } else if (this.mode === 'CONTROLS_LORE') {
      if (
        this.input.justPressed('KeyX') ||
        this.input.justPressed('KeyZ') ||
        this.input.justPressed('Enter') ||
        this.input.justPressed('Escape')
      ) {
        audio.menuMove();
        this.mode = 'TITLE';
      }
    } else if (this.mode === 'OVERWORLD') {
      this.overworld.update(dt, this.input);
    } else if (this.mode === 'BATTLE') {
      this.battle.assistMode = this.assistEnabled;
      this.battle.update(dt, this.input);
    }

    this.input.endFrame();
  }

  _updateAttackSelect() {
    const count = ATTACK_META.length;
    if (count === 0) return;

    if (this.input.justPressed('ArrowLeft') || this.input.justPressed('KeyA')) {
      this.attackSelectIndex = (this.attackSelectIndex - 1 + count) % count;
      audio.menuMove();
    } else if (this.input.justPressed('ArrowRight') || this.input.justPressed('KeyD')) {
      this.attackSelectIndex = (this.attackSelectIndex + 1) % count;
      audio.menuMove();
    } else if (this.input.justPressed('ArrowUp') || this.input.justPressed('KeyW')) {
      let next = this.attackSelectIndex - 2;
      if (next < 0) {
        const col = this.attackSelectIndex % 2;
        next = count - 1;
        while (next % 2 !== col && next > 0) next -= 1;
      }
      this.attackSelectIndex = next;
      audio.menuMove();
    } else if (this.input.justPressed('ArrowDown') || this.input.justPressed('KeyS')) {
      let next = this.attackSelectIndex + 2;
      if (next >= count) {
        next = this.attackSelectIndex % 2;
      }
      this.attackSelectIndex = next;
      audio.menuMove();
    } else if (this.input.justPressed('KeyC')) {
      this.cycleSpeedMultiplier();
    } else if (this.input.justPressed('KeyZ') || this.input.justPressed('Enter')) {
      audio.menuSelect();
      this.startAttackPractice(this.attackSelectIndex);
    } else if (this.input.justPressed('KeyX') || this.input.justPressed('Escape')) {
      audio.menuMove();
      this.mode = 'TITLE';
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    if (this.mode === 'TITLE') {
      this._renderTitle(ctx);
    } else if (this.mode === 'ATTACK_SELECT') {
      this._renderAttackSelect(ctx);
    } else if (this.mode === 'CONTROLS_LORE') {
      this._renderControlsGuide(ctx);
    } else if (this.mode === 'OVERWORLD') {
      this.overworld.render(ctx);
    } else if (this.mode === 'BATTLE') {
      this.battle.render(ctx);
    }
  }

  _fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 3 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  _renderTitle(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#07060f');
    grad.addColorStop(0.55, '#130e24');
    grad.addColorStop(1, '#040407');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    for (const s of this.stars) {
      const alpha = 0.25 + 0.35 * Math.sin(this.time * 2 + s.phase);
      ctx.fillStyle = `rgba(255, 224, 130, ${alpha})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r);
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Press Start 2P", monospace';
    ctx.fillText('UNDERTALE', 320, 66);

    ctx.fillStyle = '#ffef3f';
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillText('LAST NIGHT', 320, 98);

    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(140, 112, 360, 2);

    drawSansBattle(ctx, 108, 355, {
      time: this.time,
      expression: 'blueEye',
      pose: 'pockets',
      phase: 2
    });

    const opts = this.getTitleOptions();
    const boxX = 204;
    const boxY = 128;
    const boxW = 412;
    const boxH = 312;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    this._titleRects = [];
    const rowStep = Math.min(30, Math.floor((boxH - 22) / opts.length));
    ctx.textAlign = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    opts.forEach((opt, idx) => {
      const oy = boxY + 26 + idx * rowStep;
      this._titleRects.push({ idx, x: boxX + 8, y: oy - 16, w: boxW - 16, h: rowStep });
      if (idx === this.titleIndex) {
        ctx.fillStyle = 'rgba(255, 239, 63, 0.08)';
        ctx.fillRect(boxX + 8, oy - 15, boxW - 16, rowStep - 4);
        drawSoul(ctx, boxX + 20, oy - 5, 'red', { scale: 0.85 });
        ctx.fillStyle = '#ffef3f';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(opt.label, boxX + 38, oy);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9e9eb8';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('Arrows / Mouse: Select   [Z] / Click: Confirm   [M]: Mute', 320, 460);
    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(' ');
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  _renderAttackSelect(ctx) {
    ctx.fillStyle = '#06060d';
    ctx.fillRect(0, 0, 640, 480);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffef3f';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText('ATTACK PRACTICE SELECT', 320, 30);

    const noHitCount = this.battle.noHitAttacks.size;
    ctx.fillStyle = '#9898ad';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(
      `16 Signature Patterns (Phases 1-4)   |   ★ NO-HIT: ${noHitCount}/${ATTACK_META.length}`,
      320,
      48
    );

    const phaseColors = {
      1: '#cbd5e1',
      2: '#2ce8f5',
      3: '#fb923c',
      4: '#c084fc'
    };
    const soulColors = {
      red: '#ff2a2a',
      blue: '#38bdf8',
      green: '#4ade80',
      yellow: '#facc15',
      mixed: '#e879f9'
    };

    const startX = 24;
    const startY = 60;
    const cardW = 290;
    const cardH = 33;
    const gapX = 12;
    const gapY = 5;

    this._attackCardRects = [];

    ATTACK_META.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const selected = idx === this.attackSelectIndex;
      const noHitCleared = this.battle.noHitAttacks.has(idx);

      this._attackCardRects.push({ idx, x, y, w: cardW, h: cardH });

      ctx.fillStyle = selected ? '#18182a' : '#0d0d16';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = selected ? '#ffef3f' : noHitCleared ? '#854d0e' : '#303048';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, y, cardW, cardH);

      if (selected) {
        drawSoul(ctx, x + 11, y + 16, 'red', { scale: 0.65 });
      } else {
        ctx.fillStyle = noHitCleared ? '#facc15' : '#334155';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(noHitCleared ? '★' : '·', x + 11, y + 21);
      }

      const pColor = phaseColors[item.phase] || '#ffffff';
      const modeKey = String(item.soulMode || 'red').toLowerCase();
      const sColor = soulColors[modeKey] || '#e879f9';

      // Attack index & title measured safely so it never overlaps right-side badges
      ctx.textAlign = 'left';
      ctx.fillStyle = selected ? '#ffef3f' : '#f1f5f9';
      ctx.font = '15px "VT323", "Courier New", monospace';
      const label = `#${item.index + 1} ${item.title}`;
      const maxTitleW = cardW - 120;
      const shownTitle = this._fitText(ctx, label, maxTitleW);
      ctx.fillText(shownTitle, x + 21, y + 22);

      // Difficulty badge
      ctx.fillStyle = 'rgba(255, 239, 63, 0.08)';
      ctx.fillRect(x + cardW - 97, y + 8, 25, 17);
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + cardW - 97, y + 8, 25, 17);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(`${item.stars || 3}★`, x + cardW - 84.5, y + 20);

      // Phase badge
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + cardW - 69, y + 8, 25, 17);
      ctx.strokeStyle = pColor;
      ctx.strokeRect(x + cardW - 69, y + 8, 25, 17);
      ctx.fillStyle = pColor;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`P${item.phase}`, x + cardW - 56.5, y + 20);

      // SOUL mode badge
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x + cardW - 41, y + 8, 34, 17);
      ctx.strokeStyle = sColor;
      ctx.strokeRect(x + cardW - 41, y + 8, 34, 17);
      ctx.fillStyle = sColor;
      ctx.fillText(modeKey.slice(0, 3).toUpperCase(), x + cardW - 24, y + 20);
    });

    // Selected Attack Detail Box
    const sel = ATTACK_META[this.attackSelectIndex];
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(24, 368, 592, 62);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 368, 592, 62);

    if (sel) {
      const noHitStr = this.battle.noHitAttacks.has(sel.index) ? '  ★ NO-HIT' : '';
      const starsStr = '★'.repeat(sel.stars || 3) + '☆'.repeat(Math.max(0, 5 - (sel.stars || 3)));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2ce8f5';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(
        `#${sel.index + 1} ${sel.title}  |  PHASE ${sel.phase}  |  ${String(sel.soulMode || 'red').toUpperCase()}${noHitStr}`,
        38,
        388
      );
      ctx.textAlign = 'right';
      ctx.fillStyle = '#facc15';
      ctx.fillText(starsStr, 602, 388);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '16px "VT323", "Courier New", monospace';
      const descLines = this._wrapText(ctx, sel.desc || 'Practice this attack pattern.', 562);
      descLines.slice(0, 2).forEach((ln, i) => {
        ctx.fillText(ln, 38, 408 + i * 16);
      });
    }

    // Bottom Interactive Action Bar
    const barBtns = [
      {
        x: 24,
        y: 440,
        w: 136,
        h: 28,
        color: '#ffef3f',
        label: `[C] SPD: ${this.customSpeedMult.toFixed(2)}x`,
        action: () => this.cycleSpeedMultiplier()
      },
      {
        x: 170,
        y: 440,
        w: 158,
        h: 28,
        color: '#2ce8f5',
        label: '[Z] PRACTICE',
        action: () => {
          audio.menuSelect();
          this.startAttackPractice(this.attackSelectIndex);
        }
      },
      {
        x: 338,
        y: 440,
        w: 154,
        h: 28,
        color: '#fb923c',
        label: 'BOSS RUSH (16)',
        action: () => {
          audio.menuSelect();
          this.startBossRush();
        }
      },
      {
        x: 502,
        y: 440,
        w: 114,
        h: 28,
        color: '#94a3b8',
        label: '[X] TITLE',
        action: () => {
          audio.menuMove();
          this.mode = 'TITLE';
        }
      }
    ];
    this._attackBarButtons = barBtns;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const b of barBtns) {
      ctx.fillStyle = '#11111d';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillText(b.label, b.x + b.w / 2, b.y + 18);
    }

    ctx.restore();
  }

  _renderControlsGuide(ctx) {
    ctx.fillStyle = '#06060b';
    ctx.fillRect(0, 0, 640, 480);

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 26, 584, 428);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffef3f';
    ctx.font = '17px "Press Start 2P", monospace';
    ctx.fillText('CONTROLS & MECHANICS', 320, 62);

    ctx.textAlign = 'left';
    ctx.font = '9px "Press Start 2P", monospace';
    const rows = [
      { c: '#ffffff', t: 'MOVE / SHIELD: Arrow Keys / WASD / Click Canvas Menus' },
      { c: '#ffffff', t: 'CONFIRM / FIRE:[Z] or Enter (Hold [Z] in Yellow = BIG SHOT!)' },
      { c: '#ffffff', t: 'CANCEL / MENU: [X] Back   |   [C] Field Menu / Speed' },
      { c: '#2ce8f5', t: 'BLUE BONES:    Freeze still! (Blue SOUL jumps)' },
      { c: '#ffa024', t: 'ORANGE / TP:   Keep moving! Graze bullets for TP' },
      { c: '#4ade80', t: 'GREEN SOUL:    Point shield at incoming spears (+TP)' },
      { c: '#facc15', t: 'YELLOW SOUL:   Tap or Hold [Z] to break barriers & bones' },
      { c: '#d926ff', t: 'KARMA & ACT:   TP Heal (40) / Barrier (60) are free bonus acts!' },
      { c: '#c084fc', t: 'RELIC ARMORY:  Swap Weapon & Armor in Antechamber' },
      { c: '#ffef3f', t: '4 PHASES+:     Phase 3 Climax -> Void -> True Finale + Rush!' }
    ];

    rows.forEach((r, idx) => {
      ctx.fillStyle = r.c;
      ctx.fillText(r.t, 44, 102 + idx * 30);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9090a8';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText('Press [Z], [X], or Click to Return to Title', 320, 430);
    ctx.restore();
  }

  startLoop() {
    if (typeof window === 'undefined') return;
    let lastHudSync = 0;
    const step = (ts) => {
      if (!this.lastTime) this.lastTime = ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTime) / 1000));
      this.lastTime = ts;
      this.update(dt);
      this.render();
      if (this._onHudSync && ts - lastHudSync > 120) {
        lastHudSync = ts;
        this._onHudSync();
      }
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }
}

// --- Browser Bootstrap ---
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const game = new UndertaleLastNightGame(canvas);

    // Expose safe debug hook for verification
    window.__UNDERTALE_LAST_NIGHT__ = game;

    const toCanvasCoords = (ev) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
        y: ((ev.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height
      };
    };

    // Keyboard bindings
    const preventKeys = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'
    ]);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        const modal = document.getElementById('achievementsModal');
        if (modal && !modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          return;
        }
      }
      if (preventKeys.has(e.code)) e.preventDefault();
      audio.ensureContext();
      if (e.code === 'KeyM') {
        const muted = audio.toggleMute();
        const btnMute = document.getElementById('btnMute');
        if (btnMute) btnMute.textContent = muted ? '🔇 Muted' : '🔊 Audio';
        return;
      }
      game.input.triggerPress(e.code);
    });

    window.addEventListener('keyup', (e) => {
      game.input.release(e.code);
    });

    // Mouse Hover & Click on Canvas Menus & Battle UI
    canvas.addEventListener('mousemove', (e) => {
      const pt = toCanvasCoords(e);
      game.handleCanvasHover(pt.x, pt.y);
    });

    canvas.addEventListener('pointerdown', (e) => {
      audio.ensureContext();
      canvas.focus();
      const pt = toCanvasCoords(e);
      game.handleCanvasClick(pt.x, pt.y);
    });

    // Touch / Virtual Pad bindings
    document.querySelectorAll('[data-key]').forEach((btn) => {
      const code = btn.getAttribute('data-key');
      const down = (ev) => {
        ev.preventDefault();
        audio.ensureContext();
        game.input.setVirtual(code, true);
      };
      const up = (ev) => {
        ev.preventDefault();
        game.input.setVirtual(code, false);
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });

    // Top HUD controls & Volume Slider
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        audio.ensureContext();
        const muted = audio.toggleMute();
        btnMute.textContent = muted ? '🔇 Muted' : '🔊 Audio';
        btnMute.blur();
        canvas.focus();
      });
    }

    const rngVolume = document.getElementById('rngVolume');
    if (rngVolume) {
      rngVolume.addEventListener('input', () => {
        audio.ensureContext();
        const v = Number(rngVolume.value) / 100;
        audio.setVolume(v);
        if (audio.muted && v > 0) {
          audio.setMuted(false);
          if (btnMute) btnMute.textContent = '🔊 Audio';
        }
      });
    }

    const btnCRT = document.getElementById('btnCRT');
    const crtOverlay = document.getElementById('crtOverlay');
    if (btnCRT && crtOverlay) {
      btnCRT.addEventListener('click', () => {
        game.crtEnabled = !game.crtEnabled;
        crtOverlay.classList.toggle('hidden', !game.crtEnabled);
        btnCRT.classList.toggle('active', game.crtEnabled);
        btnCRT.textContent = game.crtEnabled ? '📺 CRT: ON' : '📺 CRT';
        btnCRT.blur();
        canvas.focus();
      });
    }

    const btnAssist = document.getElementById('btnAssist');
    if (btnAssist) {
      btnAssist.addEventListener('click', () => {
        game.assistEnabled = !game.assistEnabled;
        btnAssist.classList.toggle('warn-active', game.assistEnabled);
        btnAssist.textContent = game.assistEnabled ? '🛡 Assist: ON' : '🛡 Assist';
        btnAssist.blur();
        canvas.focus();
      });
    }

    const bindJump = (id, fn) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          fn();
          el.blur();
          canvas.focus();
        });
      }
    };

    bindJump('btnJumpOverworld', () => game.startFullGame(false));
    bindJump('btnJumpP1', () => game.jumpToBattlePhase(1));
    bindJump('btnJumpP2', () => game.jumpToBattlePhase(2));
    bindJump('btnJumpP3', () => game.jumpToBattlePhase(3));
    bindJump('btnJumpP4', () => game.jumpToBattlePhase(4));
    bindJump('btnAttackSelect', () => game.openAttackSelect());
    bindJump('btnBossRush', () => game.startBossRush());
    bindJump('btnEndless', () => game.startEndlessBattle());

    // Trophies / Achievements Modal
    const achModal = document.getElementById('achievementsModal');
    const achGrid = document.getElementById('achGrid');
    const achSummary = document.getElementById('achSummary');
    const achCountEl = document.getElementById('achCount');

    const renderAchievementsModal = () => {
      if (!achGrid || !achSummary) return;
      const unlocked = game.battle.unlockedAchievements;
      const noHitCount = game.battle.noHitAttacks.size;
      achSummary.textContent = `Unlocked ${unlocked.size}/${ACHIEVEMENT_DEFS.length} Trophies  •  No-Hit Cleared: ${noHitCount}/${ATTACK_META.length} Attacks  •  Endless Best: Wave ${game.battle.endlessBestWave}`;
      achGrid.innerHTML = '';
      for (const def of ACHIEVEMENT_DEFS) {
        const isUnlocked = unlocked.has(def.id);
        const card = document.createElement('div');
        card.className = `ach-card${isUnlocked ? ' unlocked' : ''}`;
        const tEl = document.createElement('div');
        tEl.className = 'ach-title';
        tEl.textContent = `${isUnlocked ? '★ ' : '🔒 '}${def.title}`;
        const dEl = document.createElement('div');
        dEl.className = 'ach-desc';
        dEl.textContent = def.desc;
        card.appendChild(tEl);
        card.appendChild(dEl);
        achGrid.appendChild(card);
      }
    };

    const btnAchievements = document.getElementById('btnAchievements');
    const btnCloseAchievements = document.getElementById('btnCloseAchievements');
    if (btnAchievements && achModal) {
      btnAchievements.addEventListener('click', () => {
        renderAchievementsModal();
        achModal.classList.remove('hidden');
        btnAchievements.blur();
      });
    }
    if (btnCloseAchievements && achModal) {
      btnCloseAchievements.addEventListener('click', () => {
        achModal.classList.add('hidden');
        canvas.focus();
      });
    }
    if (achModal) {
      achModal.addEventListener('click', (e) => {
        if (e.target === achModal) {
          achModal.classList.add('hidden');
          canvas.focus();
        }
      });
    }

    const hudPill = document.getElementById('hudModePill');
    const modeButtons = [
      'btnJumpOverworld',
      'btnJumpP1',
      'btnJumpP2',
      'btnJumpP3',
      'btnJumpP4',
      'btnAttackSelect',
      'btnBossRush',
      'btnEndless'
    ];
    game._onHudSync = () => {
      if (achCountEl) {
        achCountEl.textContent = `${game.battle.unlockedAchievements.size}/${ACHIEVEMENT_DEFS.length}`;
      }
      let activeId = null;
      let pillText = game.mode;
      if (game.mode === 'OVERWORLD') {
        activeId = 'btnJumpOverworld';
        pillText = 'HALL';
      } else if (game.mode === 'ATTACK_SELECT') {
        activeId = 'btnAttackSelect';
        pillText = 'PRACTICE';
      } else if (game.mode === 'BATTLE') {
        if (game.battle.bossRushMode) {
          activeId = 'btnBossRush';
          pillText = `RUSH ${game.battle.turnIndex + 1}/${ATTACK_META.length}`;
        } else if (game.battle.endlessMode) {
          activeId = 'btnEndless';
          pillText = `ENDLESS W${game.battle.endlessWave}`;
        } else if (game.battle.practiceAttackIndex !== null) {
          activeId = 'btnAttackSelect';
          pillText = `ATK #${game.battle.practiceAttackIndex + 1}`;
        } else {
          activeId = `btnJumpP${game.battle.phase}`;
          pillText = `PHASE ${game.battle.phase}`;
        }
      }
      if (hudPill) hudPill.textContent = pillText;
      for (const id of modeButtons) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active-mode', id === activeId);
      }
    };

    const btnFullscreen = document.getElementById('btnFullscreen');
    const shell = document.getElementById('canvasShell');
    if (btnFullscreen && shell) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          shell.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        btnFullscreen.blur();
        canvas.focus();
      });
    }

    game._onHudSync();
    game.startLoop();
  });
}
