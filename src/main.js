// UNDERTALE: LAST NIGHT — Main Game Loop, Unified Input, Title Screen & State Orchestration

import { ATTACK_META } from './attacks.js';
import { audio } from './audio.js';
import { BattleEngine } from './battle.js';
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

    // Left analog stick
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
    this.time = 0;
    this.hasSave = false;
    this.crtEnabled = false;
    this.assistEnabled = false;

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
      armor: this.overworld.stats.armor
    });
  }

  jumpToBattlePhase(phase) {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      phase,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor
    });
  }

  startAttackPractice(index) {
    audio.ensureContext();
    this.mode = 'BATTLE';
    this.battle.assistMode = this.assistEnabled;
    this.battle.resetBattle({
      practiceAttackIndex: index,
      weapon: this.overworld.stats.weapon,
      armor: this.overworld.stats.armor
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
      armor: this.overworld.stats.armor
    });
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
      `* Walk up to the balcony railing and press [Z] to view your summary.`
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
      { label: 'Endless Survival (Phase 4)', action: () => this.startEndlessBattle() },
      { label: 'Attack Practice Menu', action: () => this.openAttackSelect() },
      { label: 'Controls & Mechanics Guide', action: () => { this.mode = 'CONTROLS_LORE'; } }
    );
    return opts;
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

  _renderTitle(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#07060f');
    grad.addColorStop(0.55, '#130e24');
    grad.addColorStop(1, '#040407');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Falling golden dust stars
    for (const s of this.stars) {
      const alpha = 0.25 + 0.35 * Math.sin(this.time * 2 + s.phase);
      ctx.fillStyle = `rgba(255, 224, 130, ${alpha})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r);
    }

    // Title Banner
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Press Start 2P", monospace';
    ctx.fillText('UNDERTALE', 320, 72);

    ctx.fillStyle = '#ffef3f';
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.fillText('LAST NIGHT', 320, 104);

    // Subtle divider
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(140, 118, 360, 2);

    // Mini Sans silhouette on left
    drawSansBattle(ctx, 108, 355, {
      time: this.time,
      expression: 'blueEye',
      pose: 'pockets',
      phase: 2
    });

    // Menu box on right
    const opts = this.getTitleOptions();
    const boxX = 204;
    const boxY = 140;
    const boxW = 412;
    const boxH = 294;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    opts.forEach((opt, idx) => {
      const oy = boxY + 28 + idx * 29;
      if (idx === this.titleIndex) {
        drawSoul(ctx, boxX + 20, oy - 5, 'red', { scale: 0.85 });
        ctx.fillStyle = '#ffef3f';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(opt.label, boxX + 38, oy);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9e9eb8';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('Arrows: Select   [Z] / Enter: Confirm   [M]: Mute', 320, 458);
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
    ctx.font = '15px "Press Start 2P", monospace';
    ctx.fillText('ATTACK PRACTICE SELECT', 320, 36);
    ctx.fillStyle = '#9898ad';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('Choose any of the 15 signature attacks (Phases 1-4)', 320, 56);

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

    const startX = 28;
    const startY = 70;
    const cardW = 286;
    const cardH = 33;
    const gapX = 12;
    const gapY = 5;

    ATTACK_META.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const selected = idx === this.attackSelectIndex;

      ctx.fillStyle = selected ? '#18182a' : '#0d0d16';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = selected ? '#ffef3f' : '#303048';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, y, cardW, cardH);

      if (selected) {
        drawSoul(ctx, x + 12, y + 16, 'red', { scale: 0.7 });
      }

      const pColor = phaseColors[item.phase] || '#ffffff';
      const modeKey = String(item.soulMode || 'red').toLowerCase();
      const sColor = soulColors[modeKey] || '#e879f9';

      // Attack index & title
      ctx.textAlign = 'left';
      ctx.fillStyle = selected ? '#ffef3f' : '#f1f5f9';
      ctx.font = '17px "VT323", "Courier New", monospace';
      const label = `#${item.index + 1} ${item.title}`;
      const clipped = label.length > 23 ? `${label.slice(0, 22)}…` : label;
      ctx.fillText(clipped, x + (selected ? 22 : 10), y + 22);

      // Phase badge
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + cardW - 76, y + 7, 26, 19);
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + cardW - 76, y + 7, 26, 19);
      ctx.textAlign = 'center';
      ctx.fillStyle = pColor;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`P${item.phase}`, x + cardW - 63, y + 20);

      // SOUL mode badge
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x + cardW - 44, y + 7, 36, 19);
      ctx.strokeStyle = sColor;
      ctx.strokeRect(x + cardW - 44, y + 7, 36, 19);
      ctx.fillStyle = sColor;
      ctx.fillText(modeKey.slice(0, 3).toUpperCase(), x + cardW - 26, y + 20);
    });

    // Selected Attack Detail Box
    const sel = ATTACK_META[this.attackSelectIndex];
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(28, 382, 584, 58);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 382, 584, 58);

    if (sel) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2ce8f5';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(
        `#${sel.index + 1} ${sel.title}  |  PHASE ${sel.phase}  |  ${String(sel.soulMode || 'red').toUpperCase()} SOUL`,
        42,
        403
      );
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '17px "VT323", "Courier New", monospace';
      const descLines = this._wrapText(ctx, sel.desc || 'Practice this attack pattern.', 554);
      descLines.slice(0, 2).forEach((ln, i) => {
        ctx.fillText(ln, 42, 424 + i * 16);
      });
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9090a8';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('Arrows: Select   [Z] / Enter: Practice   [X] / Esc: Title', 320, 464);
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
    ctx.font = '10px "Press Start 2P", monospace';
    const rows = [
      { c: '#ffffff', t: 'MOVE / SHIELD: Arrow Keys or WASD' },
      { c: '#ffffff', t: 'CONFIRM / FIRE:[Z] or Enter (Yellow SOUL shoots!)' },
      { c: '#ffffff', t: 'CANCEL / MENU: [X] Back   |   [C] Field Menu' },
      { c: '#2ce8f5', t: 'BLUE BONES:    Freeze still! (Blue SOUL jumps)' },
      { c: '#ffa024', t: 'ORANGE / TP:   Keep moving! Graze bullets for TP' },
      { c: '#4ade80', t: 'GREEN SOUL:    Point shield at incoming spears (+TP)' },
      { c: '#facc15', t: 'YELLOW SOUL:   Press/hold [Z] to break targets' },
      { c: '#d926ff', t: 'KARMA & ACT:   Use TP for Heal (40) / Barrier (60)' },
      { c: '#c084fc', t: 'RELIC ARMORY:  Swap Weapon & Armor in Antechamber' },
      { c: '#ffef3f', t: '4 PHASES+:     ACT->Reason (3x) or Endless Phase 4!' }
    ];

    rows.forEach((r, idx) => {
      ctx.fillStyle = r.c;
      ctx.fillText(r.t, 48, 102 + idx * 30);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9090a8';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText('Press [Z] or [X] to Return to Title', 320, 430);
    ctx.restore();
  }

  startLoop() {
    if (typeof window === 'undefined') return;
    const step = (ts) => {
      if (!this.lastTime) this.lastTime = ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - this.lastTime) / 1000));
      this.lastTime = ts;
      this.update(dt);
      this.render();
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

    // Keyboard bindings
    const preventKeys = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'
    ]);

    window.addEventListener('keydown', (e) => {
      if (preventKeys.has(e.code)) e.preventDefault();
      audio.ensureContext();
      if (e.code === 'KeyM') {
        const muted = audio.toggleMute();
        const btnMute = document.getElementById('btnMute');
        if (btnMute) btnMute.textContent = muted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
        return;
      }
      game.input.triggerPress(e.code);
    });

    window.addEventListener('keyup', (e) => {
      game.input.release(e.code);
    });

    // Click canvas to focus & unlock Web Audio
    canvas.addEventListener('pointerdown', () => {
      audio.ensureContext();
      canvas.focus();
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

    // Top HUD controls
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        audio.ensureContext();
        const muted = audio.toggleMute();
        btnMute.textContent = muted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
        btnMute.blur();
        canvas.focus();
      });
    }

    const btnCRT = document.getElementById('btnCRT');
    const crtOverlay = document.getElementById('crtOverlay');
    if (btnCRT && crtOverlay) {
      btnCRT.addEventListener('click', () => {
        game.crtEnabled = !game.crtEnabled;
        crtOverlay.classList.toggle('hidden', !game.crtEnabled);
        btnCRT.classList.toggle('active', game.crtEnabled);
        btnCRT.textContent = game.crtEnabled ? '📺 CRT: ON' : '📺 CRT: OFF';
        btnCRT.blur();
        canvas.focus();
      });
    }

    const btnAssist = document.getElementById('btnAssist');
    if (btnAssist) {
      btnAssist.addEventListener('click', () => {
        game.assistEnabled = !game.assistEnabled;
        btnAssist.classList.toggle('warn-active', game.assistEnabled);
        btnAssist.textContent = game.assistEnabled ? '🛡 Assist: ON' : '🛡 Assist: OFF';
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
    bindJump('btnEndless', () => game.startEndlessBattle());

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

    game.startLoop();
  });
}
