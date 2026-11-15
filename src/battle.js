// Undertale: Last Night — Complete 4-Phase Sans Battle Engine

import { audio } from './audio.js';
import { ATTACK_META, ATTACK_NAMES, AttackRunner } from './attacks.js';
import { ARMORS, DEFAULT_INVENTORY, WEAPONS } from './overworld.js';
export { ARMORS, WEAPONS };
import {
  drawBattleButton,
  drawGasterOverlay,
  drawSansBattle,
  drawSoul,
  drawSoulShard
} from './sprites.js';

const BUTTON_LABELS = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
const BUTTON_XS = [32, 185, 345, 498];
const BUTTON_Y = 428;

const ACHIEVEMENTS_STORAGE_KEY = 'undertale_last_night_achievements_v1';
const ENDLESS_BEST_STORAGE_KEY = 'undertale_last_night_endless_best_v1';

const FLAVOR_TEXTS = {
  1: [
    '* You feel like you are going to have a bad time.',
    '* Sans watches you quietly with empty sockets.',
    '* The stained glass shimmers across the silent hall.',
    '* Your sins feel heavy on your shoulders.'
  ],
  2: [
    '* Sans refuses to let the last night end here.',
    '* Sweat beads on Sans\'s brow, yet his grin holds.',
    '* KARMA courses through the air like static.',
    '* The air crackles with blue and golden determination.'
  ],
  3: [
    '* Sans is breathing hard. This is his final stand.',
    '* The corridor glows with the first light of dawn.',
    '* Just a little further until the night breaks.'
  ],
  4: [
    '* Reality fractures behind Sans as the Void watches.',
    '* Hands from beyond time steady the bone storm.',
    '* One last trial stands before the true sunrise.'
  ]
};

const SANS_SPEECH_BY_TURN = [
  "it's a quiet night outside. birds are asleep, flowers are closed... on nights like this, kids like you should be resting.",
  "here's a rule to remember: blue attacks won't hurt if you stay completely still. simple, right?",
  "you're pretty stubborn, huh? keeping your footing even when the ground turns to bone.",
  "alright, let's pick up the pace. see if you can keep up with a few blasters.",
  "huh. you're still standing. okay then... let's test your sense of direction.",
  "huff... you don't quit, do you? alright. second wind. no holding back this time.",
  "orange means keep moving. blue means freeze. don't mix 'em up.",
  "up, down, left, right... gravity's just another suggestion when the timeline's on the line.",
  "blink and you'll miss it. literally.",
  "huff... puff... almost dawn already? fine. this is everything i've got left.",
  "one more barrage. show me why you walked all the way down this hall.",
  "wait... the corridor's cracking? stay sharp—this timeline isn't letting go quietly.",
  "you hear that static too? looks like the void's lending me a hand.",
  "careful now. the doctor's old blueprints don't play by normal corridor rules.",
  "huff... alright... survive this final fracture, and morning is all yours... *yawn*..."
];

export class BattleEngine {
  constructor(callbacks = {}) {
    this.onVictory = callbacks.onVictory || (() => {});
    this.onExitToOverworld = callbacks.onExitToOverworld || (() => {});
    this.onReturnTitle = callbacks.onReturnTitle || (() => {});
    this.onOpenAttackSelect = callbacks.onOpenAttackSelect || callbacks.onReturnTitle || (() => {});

    this.runner = new AttackRunner();
    this.assistMode = false;

    this.unlockedAchievements = this._loadAchievements();
    this.achievementQueue = [];
    this.endlessBestWave = this._loadEndlessBest();

    this.resetBattle();
  }

  _loadAchievements() {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch {
      return new Set();
    }
  }

  _saveAchievements() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify([...this.unlockedAchievements]));
    } catch {
      // Ignore storage quota errors
    }
  }

  _loadEndlessBest() {
    if (typeof localStorage === 'undefined') return 1;
    try {
      const raw = localStorage.getItem(ENDLESS_BEST_STORAGE_KEY);
      const val = raw ? Number(raw) : 1;
      return Number.isFinite(val) && val >= 1 ? val : 1;
    } catch {
      return 1;
    }
  }

  _saveEndlessBest() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(ENDLESS_BEST_STORAGE_KEY, String(this.endlessBestWave));
    } catch {
      // Ignore storage errors
    }
  }

  unlockAchievement(title) {
    if (!title || this.unlockedAchievements.has(title)) return;
    this.unlockedAchievements.add(title);
    this._saveAchievements();
    audio.achievement();
    this.achievementQueue.push({
      title,
      timer: 3.3,
      maxTimer: 3.3
    });
  }

  _phaseForTurnIndex(idx) {
    if (idx >= 12) return 4;
    if (idx >= 9) return 3;
    if (idx >= 5) return 2;
    return 1;
  }

  _pickNextEndlessAttackIndex(firstWave = false) {
    if (!this.endlessBag || this.endlessBag.length === 0) {
      const pool = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      this.endlessBag = pool;
    }
    if (firstWave && this.endlessStartPhase === 4) {
      const p4Idx = this.endlessBag.findIndex((i) => i >= 12);
      if (p4Idx >= 0) {
        return this.endlessBag.splice(p4Idx, 1)[0];
      }
    }
    let next = this.endlessBag.pop();
    if (next === this.endlessCurrentAttackIndex && this.endlessBag.length > 0) {
      this.endlessBag.unshift(next);
      next = this.endlessBag.pop();
    }
    return next;
  }

  resetBattle(options = {}) {
    const turnByPhase = { 1: 0, 2: 5, 3: 9, 4: 12 };

    this.practiceAttackIndex = Number.isInteger(options.practiceAttackIndex)
      ? Math.max(0, Math.min(ATTACK_NAMES.length - 1, options.practiceAttackIndex))
      : null;
    this.endlessMode = Boolean(options.endless) && this.practiceAttackIndex === null;
    this.endlessWave = 1;
    this.endlessStartPhase = options.phase || 4;
    this.endlessBag = [];
    this.endlessCurrentAttackIndex = 12;

    let startPhase = options.phase || 1;
    if (this.practiceAttackIndex !== null) {
      this.turnIndex = this.practiceAttackIndex;
      startPhase = this._phaseForTurnIndex(this.turnIndex);
    } else if (this.endlessMode) {
      this.endlessCurrentAttackIndex = this._pickNextEndlessAttackIndex(true);
      this.turnIndex = this.endlessCurrentAttackIndex;
      startPhase = this.endlessStartPhase;
    } else {
      this.turnIndex = turnByPhase[startPhase] ?? 0;
    }

    this.time = 0;
    this.state = 'INTRO_TRANSITION';
    this.introTimer = 0;

    this.phase = startPhase;
    this._pendingTurnAdvance = 1;
    this.trucePoints = 0;
    this.hitsTaken = 0;
    this.turnHitsTaken = 0;
    this.turnsTaken = 0;

    // Equipment
    this.weaponName = options.weapon && WEAPONS[options.weapon] ? options.weapon : 'Real Knife';
    this.armorName = options.armor && ARMORS[options.armor] ? options.armor : 'The Locket';

    // Player stats
    this.stats = {
      name: options.name || 'FRISK',
      lv: 19,
      hp: options.hp ?? 92,
      maxHp: options.maxHp ?? 92,
      kr: 0
    };
    this.inventory = options.inventory
      ? options.inventory.map((it) => ({ ...it }))
      : DEFAULT_INVENTORY();

    // TP & Combat Modifiers
    this.tp = 0;
    this.shieldBarrier = false;
    this.totalBlocks = 0;
    this.yellowShotsFired = 0;
    this.usedYellowThisTurn = false;
    this.sawGasterThisTurn = false;

    this.krTimer = 0;
    this.invulnTimer = 0;
    this.krShieldActive = false;
    this.spawnGreenBonus = false;
    this.tauntSpeedBoost = false;

    // Sans visual state
    this.sans = {
      x: 320,
      y: 205,
      expression: startPhase >= 4 ? 'gaster' : startPhase >= 2 ? 'blueEye' : 'normal',
      pose: 'pockets',
      dodgeOffsetX: 0,
      dodgeTimer: 0,
      flashAlpha: 0,
      hurtShake: 0,
      sweat: startPhase >= 2,
      sleeping: false,
      defeated: false
    };

    // Battle Box dimensions & dynamic offset
    this.baseBoxCX = 320;
    this.baseBoxCY = 308;
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this.box = {
      x: 42,
      y: 238,
      w: 556,
      h: 150,
      targetX: 42,
      targetY: 238,
      targetW: 556,
      targetH: 150
    };

    // SOUL Physics (red | blue | green | yellow)
    this.soul = {
      x: 320,
      y: 315,
      vx: 0,
      vy: 0,
      mode: 'red',
      gravity: 'down',
      shieldDir: 'up',
      shotCooldown: 0,
      grazeFlashTimer: 0,
      grounded: false,
      speed: 172,
      inputMoving: false
    };

    // Menu Navigation
    this.menuIndex = 0; // 0: FIGHT, 1: ACT, 2: ITEM, 3: MERCY
    this.subIndex = 0;
    this.itemPage = 0;

    // Menu Bone Hazard (Phase 2+)
    this.menuBone = {
      active: false,
      x: 620,
      vx: -140,
      hitCooldown: 0
    };

    // Fight Bar & Slash
    this.fightBar = {
      pos: 0, // -1 .. 1
      dir: 1,
      active: false,
      timer: 0,
      slashTimer: 0,
      showMiss: false,
      damageText: 'MISS',
      damageTimer: 0
    };

    // Dialogue & Speech Bubbles
    this.flavorText = (FLAVOR_TEXTS[this.phase] || FLAVOR_TEXTS[1])[0];
    this.boxDialogue = { text: '', charIdx: 0, timer: 0, onDone: null };
    this.sansBubble = { text: '', charIdx: 0, timer: 0, onDone: null };

    // Climax Sleep Interactive State
    this.climaxSleep = {
      active: false,
      timer: 0,
      choice: null // 'fight' | 'mercy'
    };

    // Game Over Shatter
    this.gameOver = {
      timer: 0,
      shattered: false,
      shards: [],
      choiceIdx: 0
    };

    // Victory Summary
    this.victory = {
      ending: 'truce',
      rank: 'A',
      choiceIdx: 0
    };

    // Single-Attack Practice Clear
    this.practiceClear = {
      choiceIdx: 0,
      noHit: false
    };

    this.screenShake = 0;
    this.phaseBannerTimer = 0;
    this.phaseBannerText = '';

    // Track BGM
    const bgmMap = { 1: 'phase1', 2: 'phase2', 3: 'phase3', 4: 'phase4' };
    audio.playBGM(bgmMap[this.phase] || 'phase1');
  }

  addScreenShake(amount) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  setBoxOffset(ox = 0, oy = 0) {
    this.boxOffsetX = ox;
    this.boxOffsetY = oy;
    this.box.targetX = this.baseBoxCX + ox - this.box.targetW / 2;
    this.box.targetY = this.baseBoxCY + oy - this.box.targetH / 2;
  }

  setSoulMode(mode, gravity = 'down') {
    const prevMode = this.soul.mode;
    const prevGrav = this.soul.gravity;
    this.soul.mode = mode;
    if (mode === 'blue') {
      this.soul.gravity = gravity;
      if (prevMode !== 'blue' || prevGrav !== gravity) {
        this.soul.grounded = false;
      }
    } else {
      this.soul.vx = 0;
      this.soul.vy = 0;
      this.soul.grounded = false;
      if (mode === 'green') {
        this.soul.shieldDir = this.soul.shieldDir || 'up';
      }
    }
  }

  slamSoul(dir) {
    this.soul.mode = 'blue';
    this.soul.gravity = dir;
    this.soul.grounded = false;
    const slamSpeed = 620;
    if (dir === 'down') {
      this.soul.vy = slamSpeed;
      this.sans.pose = 'slamDown';
    } else if (dir === 'up') {
      this.soul.vy = -slamSpeed;
      this.sans.pose = 'slamUp';
    } else if (dir === 'left') {
      this.soul.vx = -slamSpeed;
      this.sans.pose = 'slamLeft';
    } else if (dir === 'right') {
      this.soul.vx = slamSpeed;
      this.sans.pose = 'slamRight';
    }
    this.sans.expression = 'blueEye';
    audio.slam();
    this.addScreenShake(8);
  }

  enterClimaxSleep() {
    if (this.endlessMode || this.practiceAttackIndex !== null) {
      this.runner.finished = true;
      return;
    }
    this.state = 'CLIMAX_SLEEP';
    this.climaxSleep.active = true;
    this.climaxSleep.timer = 0;
    this.climaxSleep.choice = null;
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this.sans.expression = 'sleeping';
    this.sans.pose = 'pockets';
    this.sans.sleeping = true;
    this.soul.mode = 'red';
    this.runner.bones = [];
    this.runner.blasters = [];
    this.runner.warnings = [];
    audio.stopBGM();
  }

  update(dt, input) {
    this.time += dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 28);
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }
    if (this.soul.grazeFlashTimer > 0) {
      this.soul.grazeFlashTimer = Math.max(0, this.soul.grazeFlashTimer - dt);
    }
    if (this.soul.shotCooldown > 0) {
      this.soul.shotCooldown = Math.max(0, this.soul.shotCooldown - dt);
    }
    if (this.phaseBannerTimer > 0) {
      this.phaseBannerTimer = Math.max(0, this.phaseBannerTimer - dt);
    }
    if (this.achievementQueue.length > 0) {
      this.achievementQueue[0].timer -= dt;
      if (this.achievementQueue[0].timer <= 0) {
        this.achievementQueue.shift();
      }
    }
    if (this.sans.flashAlpha > 0) {
      this.sans.flashAlpha = Math.max(0, this.sans.flashAlpha - dt * 3);
    }
    if (this.sans.hurtShake > 0) {
      this.sans.hurtShake = Math.max(0, this.sans.hurtShake - dt * 30);
    }
    if (this.fightBar.damageTimer > 0) {
      this.fightBar.damageTimer -= dt;
      if (this.fightBar.damageTimer <= 0) {
        this.fightBar.showMiss = false;
      }
    }

    // Smooth Battle Box morphing
    const boxLerp = Math.min(1, dt * 13);
    this.box.x += (this.box.targetX - this.box.x) * boxLerp;
    this.box.y += (this.box.targetY - this.box.y) * boxLerp;
    this.box.w += (this.box.targetW - this.box.w) * boxLerp;
    this.box.h += (this.box.targetH - this.box.h) * boxLerp;

    // Dodge animation return
    if (this.sans.dodgeTimer > 0) {
      this.sans.dodgeTimer -= dt;
      const t = this.sans.dodgeTimer;
      this.sans.dodgeOffsetX = Math.sin((t / 0.55) * Math.PI) * -72;
      if (this.sans.dodgeTimer <= 0) {
        this.sans.dodgeOffsetX = 0;
      }
    }

    // KARMA tick down during active fight
    if (
      this.state !== 'GAME_OVER' &&
      this.state !== 'VICTORY_SUMMARY' &&
      this.state !== 'PRACTICE_CLEAR' &&
      this.state !== 'INTRO_TRANSITION' &&
      this.stats.kr > 0
    ) {
      this.krTimer += dt;
      if (this.krTimer >= 0.26) {
        this.krTimer = 0;
        if (this.stats.hp > 1) {
          this.stats.hp -= 1;
          this.stats.kr = Math.max(0, this.stats.kr - 1);
          audio.krTick();
        } else {
          this.stats.kr = 0;
        }
      }
    }

    switch (this.state) {
      case 'INTRO_TRANSITION':
        this.introTimer += dt;
        if (this.practiceAttackIndex !== null) {
          if (this.introTimer >= 0.45) {
            this._startDefendAttack();
          }
        } else if (this.introTimer >= 0.65) {
          this._enterPlayerMenu();
        }
        break;
      case 'PLAYER_MENU':
        this._updatePlayerMenu(dt, input);
        break;
      case 'FIGHT_AIM':
        this._updateFightAim(dt, input);
        break;
      case 'FIGHT_SLASH':
        this._updateFightSlash(dt);
        break;
      case 'ACT_MENU':
        this._updateActMenu(input);
        break;
      case 'ITEM_MENU':
        this._updateItemMenu(input);
        break;
      case 'MERCY_MENU':
        this._updateMercyMenu(input);
        break;
      case 'DIALOGUE_TEXT':
        this._updateBoxDialogue(dt, input);
        break;
      case 'SANS_SPEECH':
        this._updateSansSpeech(dt, input);
        break;
      case 'DEFEND_ATTACK':
        this._updateDefendAttack(dt, input);
        break;
      case 'CLIMAX_SLEEP':
        this._updateClimaxSleep(dt, input);
        break;
      case 'GAME_OVER':
        this._updateGameOver(dt, input);
        break;
      case 'VICTORY_SUMMARY':
        this._updateVictory(input);
        break;
      case 'PRACTICE_CLEAR':
        this._updatePracticeClear(input);
        break;
    }
  }

  _enterPlayerMenu() {
    this.state = 'PLAYER_MENU';
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this.box.targetX = 42;
    this.box.targetY = 238;
    this.box.targetW = 556;
    this.box.targetH = 150;
    this.soul.mode = 'red';

    if (!this.sans.sleeping && !this.sans.defeated) {
      this.sans.pose = 'pockets';
      this.sans.expression = this.phase >= 4 ? 'gaster' : this.phase >= 2 ? 'tired' : 'normal';
    }

    const pool = FLAVOR_TEXTS[this.phase] || FLAVOR_TEXTS[1];
    this.flavorText = pool[this.turnsTaken % pool.length];

    // Activate subtle Menu Bone Hazard in Phase 2+ (not in single-attack practice)
    this.menuBone.active = this.phase >= 2 && !this.sans.sleeping && this.practiceAttackIndex === null;
    this.menuBone.x = 640;
    this.menuBone.vx = this.phase >= 4 ? -195 : this.phase === 3 ? -165 : -130;
    this.menuBone.hitCooldown = 0;
  }

  _updatePlayerMenu(dt, input) {
    if (input.justPressed('ArrowLeft') || input.justPressed('KeyA')) {
      this.menuIndex = (this.menuIndex + 3) % 4;
      audio.menuMove();
    } else if (input.justPressed('ArrowRight') || input.justPressed('KeyD')) {
      this.menuIndex = (this.menuIndex + 1) % 4;
      audio.menuMove();
    }

    // Menu bone hazard update
    if (this.menuBone.active) {
      this.menuBone.x += this.menuBone.vx * dt;
      if (this.menuBone.x < -30) this.menuBone.x = 660;
      if (this.menuBone.hitCooldown > 0) this.menuBone.hitCooldown -= dt;

      const cursorX = BUTTON_XS[this.menuIndex] + 16;
      if (
        this.menuBone.hitCooldown <= 0 &&
        Math.abs(cursorX - (this.menuBone.x + 5)) < 14
      ) {
        this.menuBone.hitCooldown = 0.65;
        if (!this.assistMode && this.stats.hp > 1) {
          this.stats.hp = Math.max(1, this.stats.hp - 1);
          audio.hurt();
        }
      }
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      this.subIndex = 0;
      if (this.menuIndex === 0) {
        this.state = 'FIGHT_AIM';
        this.fightBar.pos = -1;
        this.fightBar.dir = 1;
        this.fightBar.active = true;
      } else if (this.menuIndex === 1) {
        this.state = 'ACT_MENU';
      } else if (this.menuIndex === 2) {
        this.itemPage = 0;
        this.state = 'ITEM_MENU';
      } else if (this.menuIndex === 3) {
        this.state = 'MERCY_MENU';
      }
    }
  }

  _updateFightAim(dt, input) {
    if (input.justPressed('KeyX') || input.justPressed('Escape')) {
      audio.menuMove();
      this._enterPlayerMenu();
      return;
    }

    this.fightBar.pos += this.fightBar.dir * 2.25 * dt;
    if (this.fightBar.pos >= 1.05) {
      // Missed completely without pressing
      this._triggerFightSlash(false);
      return;
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      this._triggerFightSlash(true);
    }
  }

  _triggerFightSlash(swung) {
    this.state = 'FIGHT_SLASH';
    this.fightBar.slashTimer = 0.65;
    if (swung) {
      audio.slash();
      if (this.sans.sleeping) {
        // Climax fatal hit!
        this.sans.pose = 'damaged';
        this.sans.expression = 'cracked';
        this.sans.hurtShake = 18;
        this.sans.flashAlpha = 0.9;
        this.sans.defeated = true;
        this.fightBar.damageText = '9999999';
        this.fightBar.showMiss = true;
        this.fightBar.damageTimer = 1.4;
        audio.hit();
      } else {
        this.sans.dodgeTimer = 0.55;
        this.sans.expression = 'wink';
        this.sans.pose = 'shrug';
        this.fightBar.damageText = 'MISS';
        this.fightBar.showMiss = true;
        this.fightBar.damageTimer = 0.9;
      }
    } else {
      this.fightBar.damageText = 'MISS';
      this.fightBar.showMiss = true;
      this.fightBar.damageTimer = 0.7;
    }
  }

  _updateFightSlash(dt) {
    this.fightBar.slashTimer -= dt;
    if (this.fightBar.slashTimer <= 0) {
      if (this.sans.defeated) {
        this._finishVictory('strike');
      } else {
        this._advanceTurnAfterAction(1);
      }
    }
  }

  _updateActMenu(input) {
    const acts = ['Check', 'Reason', 'Taunt', 'Focus', 'Heal (40 TP)', 'Barrier (60 TP)'];
    if (input.justPressed('KeyX') || input.justPressed('Escape')) {
      audio.menuMove();
      this._enterPlayerMenu();
      return;
    }
    if (
      input.justPressed('ArrowLeft') ||
      input.justPressed('KeyA') ||
      input.justPressed('ArrowRight') ||
      input.justPressed('KeyD')
    ) {
      this.subIndex = this.subIndex ^ 1;
      audio.menuMove();
    } else if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
      this.subIndex = (this.subIndex - 2 + acts.length) % acts.length;
      audio.menuMove();
    } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
      this.subIndex = (this.subIndex + 2) % acts.length;
      audio.menuMove();
    } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      const act = acts[this.subIndex];
      if (act === 'Check') {
        audio.menuSelect();
        const modeTag = this.endlessMode
          ? `Endless Wave ${this.endlessWave}`
          : this.practiceAttackIndex !== null
            ? `Practice #${this.practiceAttackIndex + 1}`
            : `Phase ${this.phase} / 4 | Truce: ${this.trucePoints}/3`;
        this._showBoxDialogue(
          `* SANS  1 ATK  1 DEF  |  ${modeTag}\n* WPN: ${this.weaponName}  |  ARM: ${this.armorName}\n* TP: ${Math.floor(this.tp)}%${this.shieldBarrier ? '  [BARRIER ACTIVE]' : ''}`,
          () => this._enterPlayerMenu()
        );
      } else if (act === 'Reason') {
        audio.menuSelect();
        if (this.endlessMode) {
          this.tp = Math.min(100, this.tp + 15);
          this._showBoxDialogue(
            '* You steady your breath amidst the endless storm.\n* Sans nods faintly across the static. (+15 TP)',
            () => this._advanceTurnAfterAction(1)
          );
        } else {
          this.trucePoints += 1;
          const line =
            this.trucePoints >= 3
              ? '* You lower your weapon and speak from the heart.\n* Sans hesitates... MERCY may now reach him!'
              : `* You remind Sans that sunrise is almost here.\n* His grip loosens slightly. (Truce ${this.trucePoints}/3)`;
          this._showBoxDialogue(line, () => this._advanceTurnAfterAction(1));
        }
      } else if (act === 'Taunt') {
        audio.menuSelect();
        this.tauntSpeedBoost = true;
        this._showBoxDialogue(
          '* You beckon Sans to give it everything he has.\n* Sans\'s stamina drops faster (+2 turns), but attacks speed up!',
          () => this._advanceTurnAfterAction(2)
        );
      } else if (act === 'Focus') {
        audio.menuSelect();
        this.krShieldActive = true;
        this.spawnGreenBonus = true;
        audio.heal();
        this._showBoxDialogue(
          '* You steady your SOUL against KARMA.\n* KR buildup halved & a Green healing bone approaches!',
          () => this._advanceTurnAfterAction(1)
        );
      } else if (act === 'Heal (40 TP)') {
        if (this.tp < 40) {
          audio.menuMove();
          this._showBoxDialogue(
            `* Not enough TP! Need 40% TP (Current: ${Math.floor(this.tp)}%).\n* Graze bullets or block spears to build TP!`,
            () => {
              this.state = 'ACT_MENU';
            }
          );
          return;
        }
        this.tp -= 40;
        const beforeHp = this.stats.hp;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 22);
        this.stats.kr = Math.max(0, this.stats.kr - 10);
        const gained = this.stats.hp - beforeHp;
        audio.heal();
        this._showBoxDialogue(
          `* You weave golden warmth from pure Tension!\n* Restored ${gained} HP and purged up to 10 KARMA!`,
          () => this._advanceTurnAfterAction(0)
        );
      } else if (act === 'Barrier (60 TP)') {
        if (this.tp < 60) {
          audio.menuMove();
          this._showBoxDialogue(
            `* Not enough TP! Need 60% TP (Current: ${Math.floor(this.tp)}%).\n* Graze bullets or block spears to build TP!`,
            () => {
              this.state = 'ACT_MENU';
            }
          );
          return;
        }
        this.tp -= 60;
        this.shieldBarrier = true;
        audio.shieldBlock();
        this._showBoxDialogue(
          '* A radiant SOUL Barrier crystallizes around you!\n* The next direct hit will be completely absorbed.',
          () => this._advanceTurnAfterAction(0)
        );
      }
    }
  }

  _updateItemMenu(input) {
    if (input.justPressed('KeyX') || input.justPressed('Escape')) {
      audio.menuMove();
      this._enterPlayerMenu();
      return;
    }
    if (this.inventory.length === 0) return;

    const totalPages = Math.max(1, Math.ceil(this.inventory.length / 4));
    const pageStart = this.itemPage * 4;
    const pageItems = this.inventory.slice(pageStart, pageStart + 4);
    const count = pageItems.length;

    if (input.justPressed('ArrowLeft')) {
      if (this.subIndex % 2 === 0 && totalPages > 1) {
        this.itemPage = (this.itemPage - 1 + totalPages) % totalPages;
        this.subIndex = 0;
      } else {
        this.subIndex = Math.max(0, this.subIndex - 1);
      }
      audio.menuMove();
    } else if (input.justPressed('ArrowRight')) {
      if ((this.subIndex % 2 === 1 || this.subIndex + 1 >= count) && totalPages > 1) {
        this.itemPage = (this.itemPage + 1) % totalPages;
        this.subIndex = 0;
      } else if (this.subIndex + 1 < count) {
        this.subIndex += 1;
      }
      audio.menuMove();
    } else if (input.justPressed('ArrowUp') || input.justPressed('ArrowDown')) {
      const next = this.subIndex ^ 2;
      if (next < count) {
        this.subIndex = next;
        audio.menuMove();
      }
    } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      const actualIdx = pageStart + this.subIndex;
      const item = this.inventory.splice(actualIdx, 1)[0];
      const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
      const healAmount = item.heal + (weaponSpec.itemHealBonus || 0);
      const krClear = Math.floor(item.heal * 0.5) + (weaponSpec.itemKrClearBonus || 0);
      const beforeHp = this.stats.hp;
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmount);
      this.stats.kr = Math.max(0, this.stats.kr - krClear);
      const gained = this.stats.hp - beforeHp;
      audio.heal();
      const maxStr = this.stats.hp >= this.stats.maxHp ? 'Your HP was maxed out.' : `Recovered ${gained} HP!`;
      const panNote = weaponSpec.itemHealBonus ? ' (Pan bonus!)' : '';
      this._showBoxDialogue(
        `* You ate the ${item.name}.${panNote}\n* ${item.desc}\n* ${maxStr}`,
        () => this._advanceTurnAfterAction(0) // Eating doesn't waste fatigue turn progression, still triggers Sans attack!
      );
    }
  }

  _updateMercyMenu(input) {
    if (input.justPressed('KeyX') || input.justPressed('Escape')) {
      audio.menuMove();
      this._enterPlayerMenu();
      return;
    }
    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      const canSpare =
        !this.endlessMode &&
        this.practiceAttackIndex === null &&
        (this.trucePoints >= 3 ||
          this.sans.sleeping ||
          (this.phase >= 4 && this.turnIndex >= ATTACK_NAMES.length - 1));
      if (canSpare) {
        this._showBoxDialogue(
          '* You offer genuine MERCY before the rising sun.\n* Sans lets out a long breath... and lowers his hands.',
          () => this._finishVictory('truce')
        );
      } else {
        this.sans.expression = 'wink';
        this.sans.pose = 'shrug';
        this._pendingTurnAdvance = 0;
        const msg = this.endlessMode
          ? "spare? in endless mode? sorry pal, the timeline clock's broken tonight."
          : "geeettttttt dunked on?? ...nah, not quite yet. keep your guard up — we aren't done talking.";
        this._showSansSpeech(msg, () => this._startDefendAttack());
      }
    }
  }

  _showBoxDialogue(text, onDone) {
    this.state = 'DIALOGUE_TEXT';
    this.boxDialogue = {
      text,
      charIdx: 0,
      timer: 0,
      onDone
    };
  }

  _updateBoxDialogue(dt, input) {
    const bd = this.boxDialogue;
    if (bd.charIdx < bd.text.length) {
      bd.timer += dt;
      while (bd.timer >= 1 / 46 && bd.charIdx < bd.text.length) {
        bd.timer -= 1 / 46;
        const ch = bd.text[bd.charIdx];
        bd.charIdx++;
        if (ch !== ' ' && ch !== '\n') audio.textBlip('narrator');
      }
      if (input.justPressed('KeyX') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) {
        bd.charIdx = bd.text.length;
      }
      return;
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuMove();
      const cb = bd.onDone;
      if (cb) cb();
    }
  }

  _syncPhaseFromTurnIndex() {
    if (this.endlessMode || this.practiceAttackIndex !== null) return;
    const prevPhase = this.phase;
    this.phase = this._phaseForTurnIndex(this.turnIndex);

    if (this.phase !== prevPhase) {
      if (prevPhase === 1 && this.phase >= 2) {
        this.unlockAchievement('Phase 1 Cleared');
      }
      if (this.phase === 4) {
        this.unlockAchievement('Gaster Challenger');
      }
      audio.phaseShift();
      const bgmMap = { 1: 'phase1', 2: 'phase2', 3: 'phase3', 4: 'phase4' };
      audio.playBGM(bgmMap[this.phase] || 'phase3');
      const bannerByPhase = {
        2: 'PHASE 2: SECOND WIND',
        3: 'PHASE 3: UNTIL DAWN',
        4: 'PHASE 4: VOID FRACTURE'
      };
      this.phaseBannerText = bannerByPhase[this.phase] || 'PHASE SHIFT';
      this.phaseBannerTimer = 2.6;
      this.sans.sweat = true;
    }
  }

  _advanceTurnAfterAction(progress = 1) {
    this.turnsTaken += 1;
    if (this.endlessMode) {
      this._pendingTurnAdvance = 1;
      const speech = SANS_SPEECH_BY_TURN[this.endlessCurrentAttackIndex] || SANS_SPEECH_BY_TURN[12];
      this._showSansSpeech(speech, () => this._startDefendAttack());
      return;
    }
    if (this.practiceAttackIndex !== null) {
      this._pendingTurnAdvance = 0;
      this._startDefendAttack();
      return;
    }

    if (progress > 1) {
      this.turnIndex = Math.min(ATTACK_NAMES.length - 1, this.turnIndex + (progress - 1));
      this._pendingTurnAdvance = 1;
    } else {
      this._pendingTurnAdvance = progress;
    }
    this._syncPhaseFromTurnIndex();

    const speech = SANS_SPEECH_BY_TURN[this.turnIndex] || SANS_SPEECH_BY_TURN[0];
    this._showSansSpeech(speech, () => this._startDefendAttack());
  }

  _showSansSpeech(text, onDone) {
    this.state = 'SANS_SPEECH';
    this.sans.expression = this.phase >= 4 ? 'gaster' : this.phase >= 2 ? 'blueEye' : 'normal';
    this.sansBubble = {
      text,
      charIdx: 0,
      timer: 0,
      onDone
    };
  }

  _updateSansSpeech(dt, input) {
    const sb = this.sansBubble;
    if (sb.charIdx < sb.text.length) {
      sb.timer += dt;
      while (sb.timer >= 1 / 42 && sb.charIdx < sb.text.length) {
        sb.timer -= 1 / 42;
        const ch = sb.text[sb.charIdx];
        sb.charIdx++;
        if (ch !== ' ' && ch !== '\n') audio.textBlip('sans');
      }
      if (input.justPressed('KeyX') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) {
        sb.charIdx = sb.text.length;
      }
      return;
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuMove();
      const cb = sb.onDone;
      if (cb) cb();
    }
  }

  _startDefendAttack() {
    this.state = 'DEFEND_ATTACK';
    this.menuBone.active = false;
    this.turnHitsTaken = 0;
    this.usedYellowThisTurn = false;
    this.sawGasterThisTurn = false;
    this.soul.shotCooldown = 0;
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this.baseBoxCX = 320;
    this.baseBoxCY = 308;

    let attackIdx = this.turnIndex;
    if (this.practiceAttackIndex !== null) {
      attackIdx = this.practiceAttackIndex;
    } else if (this.endlessMode) {
      attackIdx = this.endlessCurrentAttackIndex;
    }

    const attackId = ATTACK_NAMES[attackIdx] || 'openingBadTime';
    const meta = ATTACK_META[attackIdx];
    const attackPhase = meta ? meta.phase : this.phase;
    const boxCX = 320;
    const boxCY = 308;

    const baseMult = this.tauntSpeedBoost ? 1.15 : 1.0;
    const endlessMult = this.endlessMode ? Math.min(1.42, 1.0 + (this.endlessWave - 1) * 0.03) : 1.0;

    this.runner.start(attackId, {
      phase: attackPhase,
      speedMult: baseMult * endlessMult,
      spawnGreenBonus: this.spawnGreenBonus,
      boxCX,
      boxCY
    });
    this.tauntSpeedBoost = false;
    this.spawnGreenBonus = false;

    this.box.targetW = this.runner.targetBoxW;
    this.box.targetH = this.runner.targetBoxH;
    this.box.targetX = boxCX - this.runner.targetBoxW / 2;
    this.box.targetY = boxCY - this.runner.targetBoxH / 2;

    this.soul.x = boxCX;
    this.soul.y = boxCY;
    this.soul.vx = 0;
    this.soul.vy = 0;
    this.setSoulMode(this.runner.initialSoulMode, this.runner.initialGravity);

    if (this.phase === 4 || this.runner.gasterActive) {
      this.sawGasterThisTurn = true;
      this.unlockAchievement('Gaster Challenger');
    }
  }

  _updateDefendAttack(dt, input) {
    this._updateSoulPhysics(dt, input);
    if (this.soul.mode === 'yellow') {
      this.usedYellowThisTurn = true;
    }

    this.runner.update(dt, this);
    if (this.state !== 'DEFEND_ATTACK') return;

    if (this.runner.gasterActive) {
      this.sawGasterThisTurn = true;
      if (this.phase >= 2) {
        this.unlockAchievement('Gaster Challenger');
      }
    }

    // Re-clamp after platforms or box interpolation
    this._clampSoulInsideBox();

    // Check collisions
    const col = this.runner.checkCollisions(this.soul, this.box) || {};
    const { hit = false, healed = 0, grazed = 0, blocked = 0 } = col;

    if (healed > 0) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healed);
      audio.heal();
    }

    if (grazed > 0) {
      this.tp = Math.min(100, this.tp + 4 * grazed);
      this.soul.grazeFlashTimer = 0.14;
      this.unlockAchievement('First Graze');
    }

    if (blocked > 0) {
      this.tp = Math.min(100, this.tp + 6 * blocked);
      this.totalBlocks += blocked;
      if (this.totalBlocks >= 4) {
        this.unlockAchievement('Shield Master');
      }
    }

    if (this.runner.targetsBroken >= 3) {
      this.unlockAchievement('Sharpshooter');
    }

    if (hit && this.invulnTimer <= 0) {
      this._applyBulletHit();
      if (this.state === 'GAME_OVER') return;
    }

    if (this.runner.finished) {
      this.krShieldActive = false;

      // Stained Apron end-of-defend-turn heal
      const armorSpec = ARMORS[this.armorName] || ARMORS['The Locket'];
      if (armorSpec.endTurnHeal > 0 && this.stats.hp < this.stats.maxHp) {
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + armorSpec.endTurnHeal);
        audio.heal();
      }

      if (this.turnHitsTaken === 0) {
        this.unlockAchievement('Untouchable Turn');
      }
      if (this.usedYellowThisTurn && this.yellowShotsFired >= 3 && this.turnHitsTaken <= 1) {
        this.unlockAchievement('Sharpshooter');
      }

      if (this.practiceAttackIndex !== null) {
        if (this.practiceAttackIndex === 4) {
          this.unlockAchievement('Phase 1 Cleared');
        }
        this.state = 'PRACTICE_CLEAR';
        this.practiceClear = {
          choiceIdx: 0,
          noHit: this.turnHitsTaken === 0
        };
        return;
      }

      if (this.endlessMode) {
        this.endlessWave += 1;
        if (this.endlessWave > this.endlessBestWave) {
          this.endlessBestWave = this.endlessWave;
          this._saveEndlessBest();
        }
        this.endlessCurrentAttackIndex = this._pickNextEndlessAttackIndex(false);
        this.turnIndex = this.endlessCurrentAttackIndex;
        this._enterPlayerMenu();
        return;
      }

      if (this._pendingTurnAdvance > 0) {
        const prevIdx = this.turnIndex;
        this.turnIndex = Math.min(ATTACK_NAMES.length - 1, this.turnIndex + this._pendingTurnAdvance);
        this._pendingTurnAdvance = 0;
        if (prevIdx <= 4 && this.turnIndex >= 5) {
          this.unlockAchievement('Phase 1 Cleared');
        }
        this._syncPhaseFromTurnIndex();
      }
      this._enterPlayerMenu();
    }
  }

  _updateSoulPhysics(dt, input) {
    const left = input.isDown('ArrowLeft') || input.isDown('KeyA');
    const right = input.isDown('ArrowRight') || input.isDown('KeyD');
    const up = input.isDown('ArrowUp') || input.isDown('KeyW');
    const down = input.isDown('ArrowDown') || input.isDown('KeyS');

    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveY = (down ? 1 : 0) - (up ? 1 : 0);

    if (this.soul.mode === 'green') {
      // GREEN SOUL: Locked to box center; directional input rotates shield immediately
      if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
        this.soul.shieldDir = 'up';
      } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
        this.soul.shieldDir = 'down';
      } else if (input.justPressed('ArrowLeft') || input.justPressed('KeyA')) {
        this.soul.shieldDir = 'left';
      } else if (input.justPressed('ArrowRight') || input.justPressed('KeyD')) {
        this.soul.shieldDir = 'right';
      } else {
        const activeDirs = [];
        if (up) activeDirs.push('up');
        if (down) activeDirs.push('down');
        if (left) activeDirs.push('left');
        if (right) activeDirs.push('right');
        if (activeDirs.length === 1) {
          this.soul.shieldDir = activeDirs[0];
        }
      }
      this.soul.vx = 0;
      this.soul.vy = 0;
      this.soul.inputMoving = false;
      this.soul.x = this.box.x + this.box.w / 2;
      this.soul.y = this.box.y + this.box.h / 2;
    } else if (this.soul.mode === 'red' || this.soul.mode === 'yellow') {
      const spd = this.soul.speed;
      this.soul.vx = moveX * spd;
      this.soul.vy = moveY * spd;
      this.soul.inputMoving = moveX !== 0 || moveY !== 0;
      this.soul.x += this.soul.vx * dt;
      this.soul.y += this.soul.vy * dt;

      if (this.soul.mode === 'yellow') {
        const shooting =
          input.justPressed('KeyZ') ||
          input.justPressed('Enter') ||
          input.isDown('KeyZ') ||
          input.isDown('Enter');
        if (shooting && this.soul.shotCooldown <= 0) {
          this.runner.spawnPlayerShot(this.soul.x, this.soul.y - 10);
          this.soul.shotCooldown = 0.18;
          this.yellowShotsFired += 1;
        }
      }
    } else {
      // BLUE SOUL 4-direction gravity & variable-height jump!
      const grav = this.soul.gravity;
      const gravityAccel = 920;
      const jumpSpeed = 335;
      const latSpeed = 165;

      this.soul.inputMoving = false;

      if (grav === 'down' || grav === 'up') {
        const gDir = grav === 'down' ? 1 : -1;
        const jumpKey = grav === 'down' ? up : down;

        this.soul.vx = moveX * latSpeed;
        if (moveX !== 0) this.soul.inputMoving = true;

        if (this.soul.grounded && jumpKey) {
          this.soul.vy = -gDir * jumpSpeed;
          this.soul.grounded = false;
          this.soul.inputMoving = true;
        }
        // Cut jump early if key released (authentic Undertale precision hops!)
        if (!jumpKey && this.soul.vy * -gDir > 95) {
          this.soul.vy *= 0.82;
        }

        const prevY = this.soul.y;
        this.soul.vy += gDir * gravityAccel * dt;
        this.soul.x += this.soul.vx * dt;
        this.soul.y += this.soul.vy * dt;

        // Platform landing (when falling downward with grav === 'down')
        let onPlatform = false;
        if (grav === 'down' && this.soul.vy >= 0) {
          for (const p of this.runner.platforms) {
            const onX = this.soul.x + 6 > p.x && this.soul.x - 6 < p.x + p.w;
            const prevFoot = prevY + 8;
            const soulFoot = this.soul.y + 8;
            if (onX && prevFoot <= p.y + 6 && soulFoot >= p.y - 1) {
              this.soul.y = p.y - 8;
              this.soul.vy = 0;
              this.soul.grounded = true;
              onPlatform = true;
              this.soul.x += p.vx * dt; // Ride moving platform!
              break;
            }
          }
        }
        if (grav === 'down' && !onPlatform) {
          this.soul.grounded = false;
        }
      } else {
        // Left or Right horizontal gravity
        const gDir = grav === 'right' ? 1 : -1;
        const jumpKey = grav === 'right' ? left : right;

        this.soul.vy = moveY * latSpeed;
        if (moveY !== 0) this.soul.inputMoving = true;

        if (this.soul.grounded && jumpKey) {
          this.soul.vx = -gDir * jumpSpeed;
          this.soul.grounded = false;
          this.soul.inputMoving = true;
        }
        if (!jumpKey && this.soul.vx * -gDir > 95) {
          this.soul.vx *= 0.82;
        }

        this.soul.vx += gDir * gravityAccel * dt;
        this.soul.x += this.soul.vx * dt;
        this.soul.y += this.soul.vy * dt;
      }
    }
  }

  _clampSoulInsideBox() {
    if (this.soul.mode === 'green') {
      this.soul.x = this.box.x + this.box.w / 2;
      this.soul.y = this.box.y + this.box.h / 2;
      return;
    }

    const margin = 10;
    const minX = this.box.x + margin;
    const maxX = this.box.x + this.box.w - margin;
    const minY = this.box.y + margin;
    const maxY = this.box.y + this.box.h - margin;

    if (this.soul.mode === 'blue') {
      const g = this.soul.gravity;
      if (g === 'down' && this.soul.y >= maxY) {
        this.soul.y = maxY;
        this.soul.vy = 0;
        this.soul.grounded = true;
      } else if (g === 'up' && this.soul.y <= minY) {
        this.soul.y = minY;
        this.soul.vy = 0;
        this.soul.grounded = true;
      } else if (g === 'left' && this.soul.x <= minX) {
        this.soul.x = minX;
        this.soul.vx = 0;
        this.soul.grounded = true;
      } else if (g === 'right' && this.soul.x >= maxX) {
        this.soul.x = maxX;
        this.soul.vx = 0;
        this.soul.grounded = true;
      } else if (g !== 'down') {
        this.soul.grounded = false;
      } else if (this.soul.vy !== 0) {
        // Keep grounded state false if airborne and not resting on platform
        if (this.soul.y < maxY - 1) this.soul.grounded = false;
      }
    }

    if (this.soul.x < minX) {
      this.soul.x = minX;
      if (this.soul.vx < 0) this.soul.vx = 0;
    }
    if (this.soul.x > maxX) {
      this.soul.x = maxX;
      if (this.soul.vx > 0) this.soul.vx = 0;
    }
    if (this.soul.y < minY) {
      this.soul.y = minY;
      if (this.soul.vy < 0) this.soul.vy = 0;
    }
    if (this.soul.y > maxY) {
      this.soul.y = maxY;
      if (this.soul.vy > 0) this.soul.vy = 0;
    }
  }

  _applyBulletHit() {
    const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
    const armorSpec = ARMORS[this.armorName] || ARMORS['The Locket'];
    const invulnBonus = weaponSpec.invulnBonus || 0;

    // Barrier absorbs next hit cleanly
    if (this.shieldBarrier) {
      this.shieldBarrier = false;
      this.invulnTimer = 0.45 + invulnBonus;
      this.addScreenShake(4);
      audio.shieldBlock();
      return;
    }

    this.hitsTaken += 1;
    this.turnHitsTaken += 1;
    this.invulnTimer = 0.35 + invulnBonus;
    this.addScreenShake(5);

    if (this.assistMode) {
      this.stats.hp = Math.max(1, this.stats.hp - 1);
      audio.hurt();
      return;
    }

    const baseDmg = 5 + (this.phase >= 3 ? 3 : this.phase === 2 ? 2 : 0);
    const dmg = Math.max(1, baseDmg - (armorSpec.dmgReduction || 0));
    const baseKr = this.krShieldActive ? 3 : 6;
    const addKr = Math.max(0, baseKr - (armorSpec.krReduction || 0));

    this.stats.hp -= dmg;
    this.stats.kr = Math.min(this.stats.hp, this.stats.kr + addKr);
    audio.hurt();

    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.stats.kr = 0;
      this._triggerGameOver();
    }
  }

  _updateClimaxSleep(dt, input) {
    this.climaxSleep.timer += dt;

    // Move Red SOUL inside the Battle Box, and pushing left/right walls drags the Battle Box!
    const left = input.isDown('ArrowLeft') || input.isDown('KeyA');
    const right = input.isDown('ArrowRight') || input.isDown('KeyD');
    const up = input.isDown('ArrowUp') || input.isDown('KeyW');
    const down = input.isDown('ArrowDown') || input.isDown('KeyS');

    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveY = (down ? 1 : 0) - (up ? 1 : 0);

    this.soul.x += moveX * 195 * dt;
    this.soul.y += moveY * 195 * dt;

    // If pushing against Left wall -> drag box toward FIGHT!
    if (this.soul.x <= this.box.x + 12 && moveX < 0) {
      this.box.targetX = Math.max(20, this.box.targetX - 180 * dt);
      this.box.x = this.box.targetX;
    }
    // If pushing against Right wall -> drag box toward MERCY!
    if (this.soul.x >= this.box.x + this.box.w - 12 && moveX > 0) {
      this.box.targetX = Math.min(620 - this.box.w, this.box.targetX + 180 * dt);
      this.box.x = this.box.targetX;
    }

    this._clampSoulInsideBox();

    // Check if box reached FIGHT (left) or MERCY (right)
    if (this.box.x <= 72) {
      audio.menuSelect();
      this.state = 'FIGHT_AIM';
      this.fightBar.pos = -1;
      this.fightBar.dir = 1;
      this.box.targetX = 42;
      this.box.targetW = 556;
    } else if (this.box.x + this.box.w >= 568) {
      audio.menuSelect();
      this.box.targetX = 42;
      this.box.targetW = 556;
      this._showBoxDialogue(
        '* You dragged the box away from conflict and touched MERCY.\n* Dawn breaks softly over the sleeping skeleton.',
        () => this._finishVictory('truce')
      );
    }
  }

  _triggerGameOver() {
    this.state = 'GAME_OVER';
    this.gameOver.timer = 0;
    this.gameOver.shattered = false;
    this.gameOver.shards = [];
    this.gameOver.choiceIdx = 0;
    audio.stopBGM();
    audio.soulCrack();
  }

  _updateGameOver(dt, input) {
    const go = this.gameOver;
    go.timer += dt;

    if (!go.shattered && go.timer >= 0.75) {
      go.shattered = true;
      audio.soulShatter();
      audio.playBGM('gameover');
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + 0.3;
        go.shards.push({
          x: this.soul.x,
          y: this.soul.y,
          vx: Math.cos(ang) * (95 + i * 18),
          vy: Math.sin(ang) * (95 + i * 12) - 90,
          rot: i,
          vrot: (i % 2 === 0 ? 1 : -1) * 7
        });
      }
    }

    for (const sh of go.shards) {
      sh.vy += 260 * dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.rot += sh.vrot * dt;
    }

    if (go.timer >= 1.5) {
      if (input.justPressed('ArrowLeft') || input.justPressed('ArrowRight')) {
        go.choiceIdx = go.choiceIdx ^ 1;
        audio.menuMove();
      } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        audio.menuSelect();
        if (go.choiceIdx === 0) {
          if (this.practiceAttackIndex !== null) {
            this.resetBattle({
              practiceAttackIndex: this.practiceAttackIndex,
              name: this.stats.name,
              maxHp: this.stats.maxHp,
              weapon: this.weaponName,
              armor: this.armorName
            });
          } else if (this.endlessMode) {
            this.resetBattle({
              endless: true,
              phase: this.endlessStartPhase,
              name: this.stats.name,
              maxHp: this.stats.maxHp,
              weapon: this.weaponName,
              armor: this.armorName
            });
          } else {
            this.resetBattle({
              phase: this.phase,
              name: this.stats.name,
              maxHp: this.stats.maxHp,
              weapon: this.weaponName,
              armor: this.armorName
            });
          }
        } else if (this.practiceAttackIndex !== null) {
          this.onOpenAttackSelect();
        } else if (this.endlessMode) {
          this.onReturnTitle();
        } else {
          this.onExitToOverworld();
        }
      } else if (input.justPressed('KeyX')) {
        if (this.practiceAttackIndex !== null) {
          this.onOpenAttackSelect();
        } else if (this.endlessMode) {
          this.onReturnTitle();
        } else {
          this.onExitToOverworld();
        }
      }
    }
  }

  _finishVictory(endingType) {
    this.state = 'VICTORY_SUMMARY';
    this.victory.ending = endingType;
    this.victory.choiceIdx = 0;
    if (this.hitsTaken <= 2) this.victory.rank = 'S';
    else if (this.hitsTaken <= 6) this.victory.rank = 'A';
    else if (this.hitsTaken <= 12) this.victory.rank = 'B';
    else this.victory.rank = 'C';
    this.unlockAchievement('Dawn Savior');
    audio.playBGM('ending');
  }

  _updateVictory(input) {
    if (input.justPressed('ArrowLeft') || input.justPressed('ArrowRight')) {
      this.victory.choiceIdx = this.victory.choiceIdx ^ 1;
      audio.menuMove();
    } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      if (this.victory.choiceIdx === 0) {
        this.onVictory({
          ending: this.victory.ending,
          rank: this.victory.rank,
          hitsTaken: this.hitsTaken,
          turnsTaken: this.turnsTaken
        });
      } else {
        this.resetBattle({
          phase: 1,
          name: this.stats.name,
          maxHp: this.stats.maxHp,
          weapon: this.weaponName,
          armor: this.armorName
        });
      }
    }
  }

  _updatePracticeClear(input) {
    if (input.justPressed('ArrowLeft') || input.justPressed('ArrowUp') || input.justPressed('KeyA') || input.justPressed('KeyW')) {
      this.practiceClear.choiceIdx = (this.practiceClear.choiceIdx + 2) % 3;
      audio.menuMove();
    } else if (input.justPressed('ArrowRight') || input.justPressed('ArrowDown') || input.justPressed('KeyD') || input.justPressed('KeyS')) {
      this.practiceClear.choiceIdx = (this.practiceClear.choiceIdx + 1) % 3;
      audio.menuMove();
    } else if (input.justPressed('KeyX') || input.justPressed('Escape')) {
      audio.menuMove();
      this.onOpenAttackSelect();
    } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      if (this.practiceClear.choiceIdx === 0) {
        this.stats.hp = this.stats.maxHp;
        this.stats.kr = 0;
        this._startDefendAttack();
      } else if (this.practiceClear.choiceIdx === 1) {
        this._enterPlayerMenu();
      } else {
        this.onOpenAttackSelect();
      }
    }
  }

  // --- RENDER ---

  render(ctx) {
    if (this.state === 'GAME_OVER') {
      this._renderGameOver(ctx);
      this._renderAchievementToast(ctx);
      return;
    }
    if (this.state === 'VICTORY_SUMMARY') {
      this._renderVictory(ctx);
      this._renderAchievementToast(ctx);
      return;
    }
    if (this.state === 'PRACTICE_CLEAR') {
      this._renderPracticeClear(ctx);
      this._renderAchievementToast(ctx);
      return;
    }

    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      ctx.translate(sx, sy);
    }

    // Pure black Undertale battle backdrop with Phase 3 dawn / Phase 4 void glow
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 480);
    if (this.phase === 3) {
      const dawnGrad = ctx.createLinearGradient(0, 0, 0, 260);
      dawnGrad.addColorStop(0, 'rgba(92, 42, 74, 0.28)');
      dawnGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = dawnGrad;
      ctx.fillRect(0, 0, 640, 260);
    } else if (this.phase >= 4) {
      const voidGrad = ctx.createLinearGradient(0, 0, 0, 260);
      voidGrad.addColorStop(0, 'rgba(72, 22, 118, 0.34)');
      voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = voidGrad;
      ctx.fillRect(0, 0, 640, 260);
    }

    // Subtle Judgment Hall floor line behind Sans
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 212);
    ctx.lineTo(580, 212);
    ctx.stroke();

    // W.D. Gaster Overlay behind Sans in Phase 4 or during Gaster-infused attacks (Phase 2+)
    if (!this.sans.defeated && ((this.phase >= 2 && this.runner.gasterActive) || this.phase === 4)) {
      const gasterOpts = {
        time: this.time,
        alpha: this.phase === 4 ? 0.85 : 0.68,
        activeHands: Boolean(this.runner.gasterActive || this.phase === 4),
        handGlow: this.phase === 4 || Boolean(this.runner.gasterActive)
      };
      if (typeof this.runner.gasterAlpha === 'number') gasterOpts.alpha = this.runner.gasterAlpha;
      if (typeof this.runner.leftHandX === 'number') gasterOpts.leftHandX = this.runner.leftHandX;
      if (typeof this.runner.leftHandY === 'number') gasterOpts.leftHandY = this.runner.leftHandY;
      if (typeof this.runner.rightHandX === 'number') gasterOpts.rightHandX = this.runner.rightHandX;
      if (typeof this.runner.rightHandY === 'number') gasterOpts.rightHandY = this.runner.rightHandY;
      drawGasterOverlay(ctx, this.sans.x, this.sans.y, gasterOpts);
    }

    // Draw Sans
    if (!this.sans.defeated || this.fightBar.damageTimer > 0) {
      drawSansBattle(ctx, this.sans.x, this.sans.y, {
        time: this.time,
        expression: this.sans.expression,
        pose: this.sans.pose,
        phase: this.phase,
        dodgeOffsetX: this.sans.dodgeOffsetX,
        flashAlpha: this.sans.flashAlpha,
        hurtShake: this.sans.hurtShake,
        sweat: this.sans.sweat,
        auraIntensity: this.phase >= 4 ? 0.85 : this.phase === 3 ? 0.6 : 0
      });
    }

    // MISS or 9999999 Damage Popup
    if (this.fightBar.showMiss) {
      ctx.save();
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = this.fightBar.damageText === 'MISS' ? '#d4d4e0' : '#ff2a2a';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      const popY = 92 - (1.0 - Math.min(1, this.fightBar.damageTimer)) * 18;
      ctx.strokeText(this.fightBar.damageText, this.sans.x, popY);
      ctx.fillText(this.fightBar.damageText, this.sans.x, popY);
      ctx.restore();
    }

    // Sans Speech Bubble
    if (this.state === 'SANS_SPEECH') {
      this._renderSansSpeechBubble(ctx);
    }

    // Battle Box
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.box.x, this.box.y, this.box.w, this.box.h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);

    // Contents inside Battle Box
    if (this.state === 'PLAYER_MENU') {
      this._renderFlavorText(ctx);
    } else if (this.state === 'FIGHT_AIM' || this.state === 'FIGHT_SLASH') {
      this._renderFightTarget(ctx);
    } else if (this.state === 'ACT_MENU') {
      this._renderActMenu(ctx);
    } else if (this.state === 'ITEM_MENU') {
      this._renderItemMenu(ctx);
    } else if (this.state === 'MERCY_MENU') {
      this._renderMercyMenu(ctx);
    } else if (this.state === 'DIALOGUE_TEXT') {
      this._renderBoxDialogue(ctx);
    } else if (this.state === 'DEFEND_ATTACK') {
      this.runner.renderInsideBox(ctx, this.box);
      const flash = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 24) % 2 === 0;
      drawSoul(ctx, this.soul.x, this.soul.y, this.soul.mode, {
        gravity: this.soul.gravity,
        shieldDir: this.soul.shieldDir,
        flash,
        grazeFlash: this.soul.grazeFlashTimer > 0
      });
      if (this.shieldBarrier) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(this.time * 8);
        ctx.beginPath();
        ctx.arc(this.soul.x, this.soul.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else if (this.state === 'CLIMAX_SLEEP') {
      this._renderClimaxSleepPrompt(ctx);
      drawSoul(ctx, this.soul.x, this.soul.y, 'red');
    }

    // Blaster overlay (drawn above Battle Box border)
    if (this.state === 'DEFEND_ATTACK') {
      this.runner.renderOverlay(ctx);
    }

    // Sleek Vertical TP Bar to the left of the Battle Box
    this._renderTpBar(ctx);

    // HP & KR Status Bar Row
    this._renderHpRow(ctx);

    // 4 Action Buttons
    BUTTON_LABELS.forEach((lbl, idx) => {
      const selected =
        this.state !== 'DEFEND_ATTACK' &&
        this.state !== 'SANS_SPEECH' &&
        this.state !== 'CLIMAX_SLEEP' &&
        this.menuIndex === idx;
      drawBattleButton(ctx, BUTTON_XS[idx], BUTTON_Y, lbl, selected, this.soul.mode);
    });

    // Subtle Menu Bone Hazard sliding across bottom buttons in Phase 2+
    if (this.menuBone.active && this.state === 'PLAYER_MENU') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(this.menuBone.x), BUTTON_Y + 6, 8, 30);
      ctx.fillRect(Math.round(this.menuBone.x) - 2, BUTTON_Y + 6, 12, 5);
      ctx.fillRect(Math.round(this.menuBone.x) - 2, BUTTON_Y + 31, 12, 5);
    }

    // Mode Badge (Endless Wave / Practice Attack)
    this._renderModeHudBadge(ctx);

    // Phase Banner Toast
    if (this.phaseBannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.phaseBannerTimer);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(150, 14, 340, 28);
      ctx.strokeStyle = this.phase >= 4 ? '#c084fc' : this.phase === 3 ? '#ff4444' : '#2ce8f5';
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 14, 340, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.phaseBannerText, 320, 33);
      ctx.restore();
    }

    // Achievement Toast Notification (top-right)
    this._renderAchievementToast(ctx);

    ctx.restore();
  }

  _renderTpBar(ctx) {
    const barW = 14;
    const barH = 128;
    const barX = Math.max(6, Math.min(14, Math.round(this.box.x) - 24));
    const barY = 246;
    const pct = Math.max(0, Math.min(100, this.tp)) / 100;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = this.soul.grazeFlashTimer > 0 ? '#ffffff' : '#ffa024';
    ctx.fillText('TP', barX + barW / 2, barY - 8);

    ctx.fillStyle = '#090910';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = this.soul.grazeFlashTimer > 0 ? '#ffef3f' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    if (pct > 0) {
      const fillH = Math.round((barH - 4) * pct);
      const fillY = barY + barH - 2 - fillH;
      const grad = ctx.createLinearGradient(0, barY + barH, 0, barY);
      grad.addColorStop(0, '#ff6a00');
      grad.addColorStop(1, '#ffef3f');
      ctx.fillStyle = grad;
      ctx.fillRect(barX + 2, fillY, barW - 4, fillH);
    }

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = this.tp >= 60 ? '#ffef3f' : '#f5f5f8';
    ctx.fillText(`${Math.floor(this.tp)}%`, barX + barW / 2, barY + barH + 14);
    ctx.restore();
  }

  _renderModeHudBadge(ctx) {
    if (!this.endlessMode && this.practiceAttackIndex === null) return;

    ctx.save();
    if (this.endlessMode) {
      ctx.fillStyle = 'rgba(12, 8, 22, 0.85)';
      ctx.fillRect(12, 12, 232, 30);
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 232, 30);
      ctx.fillStyle = '#fed7aa';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`WAVE ${this.endlessWave}  BEST:${this.endlessBestWave}`, 22, 32);
    } else if (this.practiceAttackIndex !== null) {
      const meta = ATTACK_META[this.practiceAttackIndex];
      const title = meta ? meta.title : `Attack ${this.practiceAttackIndex + 1}`;
      ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
      ctx.fillRect(12, 12, 290, 30);
      ctx.strokeStyle = '#2ce8f5';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 290, 30);
      ctx.fillStyle = '#cffafe';
      ctx.font = '9px "Press Start 2P", monospace';
      const label = `#${this.practiceAttackIndex + 1} ${title}`.slice(0, 28);
      ctx.fillText(label, 20, 31);
    }
    ctx.restore();
  }

  _renderAchievementToast(ctx) {
    if (this.achievementQueue.length === 0) return;
    const toast = this.achievementQueue[0];
    const fadeIn = Math.min(1, (toast.maxTimer - toast.timer) / 0.25);
    const fadeOut = Math.min(1, toast.timer / 0.4);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

    ctx.save();
    ctx.globalAlpha = alpha;
    const w = 236;
    const h = 44;
    const x = 628 - w;
    const y = 12;
    ctx.fillStyle = 'rgba(10, 10, 18, 0.94)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffef3f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#ffef3f';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('★ ACHIEVEMENT UNLOCKED', x + 10, y + 17);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(toast.title, x + 10, y + 35);
    ctx.restore();
  }

  _wrapText(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const out = [];
    for (const para of paragraphs) {
      const words = para.split(' ');
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && cur) {
          out.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur || para === '') out.push(cur);
    }
    return out;
  }

  _renderFlavorText(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Press Start 2P", monospace';
    const lines = this._wrapText(ctx, this.flavorText, 505);
    lines.forEach((line, i) => {
      ctx.fillText(line, this.box.x + 24, this.box.y + 42 + i * 30);
    });
    ctx.restore();
  }

  _renderBoxDialogue(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Press Start 2P", monospace';
    const shown = this.boxDialogue.text.slice(0, this.boxDialogue.charIdx);
    const lines = this._wrapText(ctx, shown, 505);
    lines.forEach((line, i) => {
      if (i < 4) ctx.fillText(line, this.box.x + 22, this.box.y + 38 + i * 28);
    });
    if (this.boxDialogue.charIdx >= this.boxDialogue.text.length) {
      ctx.fillStyle = '#9090a8';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('[Z] Continue', this.box.x + 410, this.box.y + 136);
    }
    ctx.restore();
  }

  _renderSansSpeechBubble(ctx) {
    const bx = 392;
    const by = 48;
    const bw = 224;
    const bh = 118;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    // Pointer tail toward Sans's head
    ctx.beginPath();
    ctx.moveTo(bx, by + 48);
    ctx.lineTo(bx - 22, by + 56);
    ctx.lineTo(bx, by + 66);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#07070b';
    ctx.font = 'bold 17px "VT323", "Courier New", monospace';
    const shown = this.sansBubble.text.slice(0, this.sansBubble.charIdx);
    const lines = this._wrapText(ctx, shown, bw - 22);
    lines.forEach((line, i) => {
      if (i < 5) ctx.fillText(line, bx + 12, by + 22 + i * 19);
    });
    if (this.sansBubble.charIdx >= this.sansBubble.text.length) {
      ctx.fillStyle = '#555568';
      ctx.font = 'bold 14px "VT323", monospace';
      ctx.fillText('[Z]', bx + bw - 30, by + bh - 8);
    }
    ctx.restore();
  }

  _renderFightTarget(ctx) {
    const cx = this.box.x + this.box.w / 2;
    const cy = this.box.y + this.box.h / 2;

    // Target ellipse oval grid
    ctx.save();
    ctx.strokeStyle = '#48b848';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 240, 56, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffef3f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, this.box.y + 16);
    ctx.lineTo(cx, this.box.y + this.box.h - 16);
    ctx.stroke();

    // Moving strike bar
    const barX = cx + this.fightBar.pos * 240;
    const blink = this.state === 'FIGHT_SLASH' && Math.floor(this.time * 24) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2a2a' : '#ffffff';
    ctx.fillRect(barX - 5, this.box.y + 12, 10, this.box.h - 24);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, this.box.y + 12, 10, this.box.h - 24);

    // Slash arc over Sans during FIGHT_SLASH
    if (this.state === 'FIGHT_SLASH') {
      const p = 1 - Math.max(0, this.fightBar.slashTimer / 0.65);
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.sans.x - 48, 86);
      ctx.lineTo(this.sans.x - 48 + p * 96, 86 + p * 102);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderActMenu(ctx) {
    const acts = ['Check', 'Reason', 'Taunt', 'Focus', 'Heal (40 TP)', 'Barrier (60 TP)'];
    ctx.save();
    ctx.font = '13px "Press Start 2P", monospace';
    acts.forEach((act, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ax = this.box.x + 48 + col * 246;
      const ay = this.box.y + 34 + row * 32;
      const needs40 = act === 'Heal (40 TP)' && this.tp < 40;
      const needs60 = act === 'Barrier (60 TP)' && this.tp < 60;
      const locked = needs40 || needs60;
      if (this.subIndex === idx) {
        drawSoul(ctx, ax - 20, ay - 5, 'red', { scale: 0.85 });
        ctx.fillStyle = locked ? '#b89d38' : '#ffef3f';
      } else {
        ctx.fillStyle = locked ? '#6e6e85' : '#ffffff';
      }
      ctx.fillText(`* ${act}`, ax, ay);
    });
    ctx.fillStyle = '#9090a8';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('[Z] Select   [X] Back', this.box.x + 24, this.box.y + 136);
    ctx.fillStyle = '#ffa024';
    ctx.fillText(`TP: ${Math.floor(this.tp)}%`, this.box.x + 440, this.box.y + 136);
    ctx.restore();
  }

  _renderItemMenu(ctx) {
    ctx.save();
    if (this.inventory.length === 0) {
      ctx.fillStyle = '#9090a8';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('* Your pockets are empty.', this.box.x + 36, this.box.y + 52);
      ctx.restore();
      return;
    }

    const totalPages = Math.max(1, Math.ceil(this.inventory.length / 4));
    const pageItems = this.inventory.slice(this.itemPage * 4, this.itemPage * 4 + 4);
    ctx.font = '14px "Press Start 2P", monospace';
    pageItems.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ix = this.box.x + 56 + col * 255;
      const iy = this.box.y + 46 + row * 44;
      if (this.subIndex === idx) {
        drawSoul(ctx, ix - 20, iy - 5, 'red', { scale: 0.9 });
        ctx.fillStyle = '#ffef3f';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(`* ${item.name}`, ix, iy);
    });

    ctx.fillStyle = '#ffef3f';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`PAGE ${this.itemPage + 1}/${totalPages}`, this.box.x + 426, this.box.y + 134);
    ctx.fillStyle = '#9090a8';
    ctx.fillText('[Z] Eat  [X] Back', this.box.x + 24, this.box.y + 134);
    ctx.restore();
  }

  _renderMercyMenu(ctx) {
    ctx.save();
    const ready =
      !this.endlessMode &&
      this.practiceAttackIndex === null &&
      (this.trucePoints >= 3 ||
        this.sans.sleeping ||
        (this.phase >= 4 && this.turnIndex >= ATTACK_NAMES.length - 1));
    drawSoul(ctx, this.box.x + 52, this.box.y + 48, 'red', { scale: 0.9 });
    ctx.fillStyle = ready ? '#ffef3f' : '#ffffff';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText('* Spare', this.box.x + 74, this.box.y + 54);

    ctx.fillStyle = ready ? '#4ade80' : '#9090a8';
    ctx.font = '10px "Press Start 2P", monospace';
    const subMsg = this.endlessMode
      ? 'No mercy in Endless Survival — endure the storm!'
      : ready
        ? 'Sans is ready to listen!'
        : `Use ACT -> Reason (${this.trucePoints}/3) or outlast him`;
    ctx.fillText(subMsg, this.box.x + 36, this.box.y + 114);
    ctx.restore();
  }

  _renderClimaxSleepPrompt(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffef3f';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SANS FELL ASLEEP!', this.box.x + this.box.w / 2, this.box.y + 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Push Box LEFT -> FIGHT', this.box.x + this.box.w / 2, this.box.y + 128);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Push Box RIGHT -> MERCY', this.box.x + this.box.w / 2, this.box.y + 148);
    ctx.restore();
  }

  _renderHpRow(ctx) {
    const y = 398;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(this.stats.name, 34, y + 15);
    ctx.fillText(`LV ${this.stats.lv}`, 144, y + 15);

    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText('HP', 240, y + 14);

    const barX = 274;
    const barW = 112;
    const barH = 18;
    const safeHp = Math.max(0, this.stats.hp - this.stats.kr);

    // Missing HP (Red)
    ctx.fillStyle = '#ff1a1a';
    ctx.fillRect(barX, y, barW, barH);
    // Pure HP (Yellow)
    ctx.fillStyle = '#ffef3f';
    ctx.fillRect(barX, y, (safeHp / this.stats.maxHp) * barW, barH);
    // KARMA poison segment (Purple)
    if (this.stats.kr > 0) {
      ctx.fillStyle = '#d926ff';
      const safeW = (safeHp / this.stats.maxHp) * barW;
      const krW = (this.stats.kr / this.stats.maxHp) * barW;
      ctx.fillRect(barX + safeW, y, krW, barH);
    }

    // KR Label
    ctx.fillStyle = this.stats.kr > 0 ? '#d926ff' : '#ffffff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('KR', 396, y + 15);

    ctx.fillStyle = this.stats.kr > 0 ? '#d926ff' : '#ffffff';
    ctx.font = '14px "Press Start 2P", monospace';
    const hpStr = `${String(this.stats.hp).padStart(2, '0')} / ${this.stats.maxHp}`;
    ctx.fillText(hpStr, 434, y + 15);

    if (this.shieldBarrier) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('SHIELD', 554, y + 14);
    } else if (this.assistMode) {
      ctx.fillStyle = '#4ade80';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('ASSIST', 558, y + 14);
    }
    ctx.restore();
  }

  _renderGameOver(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 480);

    const go = this.gameOver;
    if (!go.shattered) {
      const split = go.timer > 0.35 ? 3 : 0;
      drawSoul(ctx, this.soul.x, this.soul.y, 'red', { cracked: go.timer > 0.25, splitOffset: split });
    } else {
      for (const sh of go.shards) {
        drawSoulShard(ctx, sh.x, sh.y, sh.rot, '#ff1e1e');
      }
    }

    if (go.timer >= 1.2) {
      const alpha = Math.min(1, (go.timer - 1.2) / 0.8);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '34px "Press Start 2P", monospace';
      ctx.fillText('GAME OVER', 320, 152);

      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#e0e0ec';
      if (this.endlessMode) {
        ctx.fillText(`REACHED WAVE ${this.endlessWave}  |  BEST WAVE ${this.endlessBestWave}`, 320, 224);
        ctx.fillText('Stay determined!', 320, 260);
      } else {
        ctx.fillText(`${this.stats.name}! You cannot give up just yet...`, 320, 232);
        ctx.fillText('Stay determined!', 320, 266);
      }

      if (go.timer >= 1.5) {
        const retryLabel = this.practiceAttackIndex !== null
          ? `Retry Attack #${this.practiceAttackIndex + 1}`
          : this.endlessMode
            ? 'Retry Endless'
            : `Retry Phase ${this.phase}`;
        const exitLabel = this.practiceAttackIndex !== null
          ? 'Attack Select'
          : this.endlessMode
            ? 'Return to Title'
            : 'Return to Antechamber';
        const opts = [
          { label: retryLabel, x: 170 },
          { label: exitLabel, x: 458 }
        ];
        ctx.font = '11px "Press Start 2P", monospace';
        opts.forEach((opt, i) => {
          const oy = 355;
          if (go.choiceIdx === i) {
            const w = ctx.measureText(opt.label).width;
            drawSoul(ctx, opt.x - w / 2 - 16, oy - 6, 'red', { scale: 0.9 });
            ctx.fillStyle = '#ffef3f';
          } else {
            ctx.fillStyle = '#ffffff';
          }
          ctx.fillText(opt.label, opt.x, oy);
        });
      }
      ctx.restore();
    }
  }

  _renderVictory(ctx) {
    ctx.fillStyle = '#07060d';
    ctx.fillRect(0, 0, 640, 480);

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, 544, 384);

    ctx.textAlign = 'center';
    ctx.fillStyle = this.victory.ending === 'truce' ? '#ffd770' : '#ff4c4c';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillText(
      this.victory.ending === 'truce' ? 'DAWN TRUCE REACHED' : 'LAST NIGHT CLEARED',
      320,
      110
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText(
      this.victory.ending === 'truce'
        ? 'You lowered your blade and chose mercy.'
        : 'The final judgment ends in silence.',
      320,
      154
    );

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(`TURNS SURVIVED: ${this.turnsTaken}`, 320, 214);
    ctx.fillText(`HITS TAKEN:     ${this.hitsTaken}`, 320, 248);

    ctx.fillStyle = '#2ce8f5';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText(`RANK: ${this.victory.rank}`, 320, 304);

    const opts = [
      { label: 'Step to Dawn Balcony', x: 190, soulX: 64 },
      { label: 'Fight Again', x: 456, soulX: 382 }
    ];
    opts.forEach((opt, i) => {
      const oy = 376;
      if (this.victory.choiceIdx === i) {
        drawSoul(ctx, opt.soulX, oy - 5, 'red', { scale: 0.9 });
        ctx.fillStyle = '#ffef3f';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(opt.label, opt.x, oy);
    });
    ctx.restore();
  }

  _renderPracticeClear(ctx) {
    ctx.fillStyle = '#07060d';
    ctx.fillRect(0, 0, 640, 480);

    const meta = ATTACK_META[this.practiceAttackIndex] || {
      index: this.practiceAttackIndex,
      title: ATTACK_NAMES[this.practiceAttackIndex] || 'Attack',
      phase: this.phase,
      soulMode: 'red'
    };

    ctx.save();
    ctx.strokeStyle = '#2ce8f5';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 56, 544, 368);

    ctx.textAlign = 'center';
    ctx.fillStyle = this.practiceClear.noHit ? '#ffef3f' : '#4ade80';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(
      this.practiceClear.noHit ? 'NO-HIT CLEAR!' : 'ATTACK CLEARED!',
      320,
      118
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText(`#${meta.index + 1} ${meta.title}`, 320, 166);

    ctx.fillStyle = '#9898ad';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillText(`PHASE ${meta.phase}   |   HITS TAKEN: ${this.turnHitsTaken}   |   TP: ${Math.floor(this.tp)}%`, 320, 212);

    const opts = [
      { label: 'Replay Attack', y: 286 },
      { label: 'Battle Menu (Items/ACT)', y: 326 },
      { label: 'Back to Attack List', y: 366 }
    ];
    ctx.font = '12px "Press Start 2P", monospace';
    opts.forEach((opt, i) => {
      if (this.practiceClear.choiceIdx === i) {
        const w = ctx.measureText(opt.label).width;
        drawSoul(ctx, 328 - w / 2 - 18, opt.y - 5, 'red', { scale: 0.9 });
        ctx.fillStyle = '#ffef3f';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(opt.label, 328, opt.y);
    });
    ctx.restore();
  }
}
