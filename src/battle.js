// Undertale: Last Night — Complete 4-Phase Sans Battle Engine

import { audio } from './audio.js';
import { ATTACK_META, ATTACK_NAMES, AttackRunner } from './attacks.js';
import { ARMORS, DEFAULT_INVENTORY, WEAPONS } from './overworld.js';
export { ARMORS, WEAPONS };
import {
  SOUL_SKINS,
  drawBattleBackdrop,
  drawBattleButton,
  drawGasterBlaster,
  drawGasterOverlay,
  drawGasterUnbound,
  drawSansBattle,
  drawSoul,
  drawSoulShard,
  drawSoulTrail
} from './sprites.js';

const BUTTON_LABELS = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
const BUTTON_XS = [32, 185, 345, 498];
const BUTTON_Y = 428;

const ACHIEVEMENTS_STORAGE_KEY = 'undertale_last_night_achievements_v1';
const ENDLESS_BEST_STORAGE_KEY = 'undertale_last_night_endless_best_v1';
const ENDLESS_BOARD_STORAGE_KEY = 'undertale_last_night_endless_board_v1';
const NOHIT_STORAGE_KEY = 'undertale_last_night_nohit_v1';
const RESETS_STORAGE_KEY = 'undertale_last_night_resets_v1';
const DIFFICULTY_STORAGE_KEY = 'undertale_last_night_difficulty_v1';

export const DIFFICULTIES = {
  normal: {
    id: 'normal',
    label: 'NORMAL',
    shortLabel: 'NORM',
    speedMult: 0.90,
    dmgMult: 0.80,
    krMult: 0.75,
    tempoMult: 0.96,
    color: '#4ade80'
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    shortLabel: 'HARD',
    speedMult: 1.08,
    dmgMult: 1.25,
    krMult: 1.25,
    tempoMult: 1.05,
    color: '#f97316'
  },
  nightmare: {
    id: 'nightmare',
    label: 'NIGHTMARE',
    shortLabel: 'NMARE',
    speedMult: 1.20,
    dmgMult: 1.50,
    krMult: 1.50,
    tempoMult: 1.12,
    color: '#e879f9'
  }
};

export const ACHIEVEMENT_DEFS = [
  { id: 'First Graze', title: 'First Graze', desc: 'Collect Tension (TP) by closely grazing a hazard.' },
  { id: 'Shield Master', title: 'Shield Master', desc: 'Deflect 4+ incoming spears as the Green SOUL.' },
  { id: 'Sharpshooter', title: 'Sharpshooter', desc: 'Shatter 3+ yellow targets cleanly with the Justice SOUL.' },
  { id: 'Untouchable Turn', title: 'Untouchable Turn', desc: 'Survive any attack pattern without taking a single hit.' },
  { id: 'Phase 1 Cleared', title: 'Phase 1 Cleared', desc: 'Push past Sans\'s opening barrage into Phase 2.' },
  { id: 'Gaster Challenger', title: 'Gaster Challenger', desc: 'Witness W.D. Gaster\'s interference in the Void.' },
  { id: 'Dawn Savior', title: 'Dawn Savior', desc: 'Reach the sunrise ending in Story or Boss Rush.' },
  { id: 'Master of the Night', title: 'Master of the Night', desc: 'No-Hit 5 unique attacks or clear Full Boss Rush.' },
  { id: 'Web Dancer', title: 'Web Dancer', desc: 'Clear any Purple SOUL 3-rail attack without taking a hit.' },
  { id: 'Style Legend', title: 'Style Legend', desc: 'Reach Style Rank S or SS during active combat.' },
  { id: 'Void Sovereign', title: 'Void Sovereign', desc: 'Defeat Secret Phase 5 Boss W.D. Gaster Unbound.' },
  { id: 'Ironman Legend', title: 'Ironman Legend', desc: 'Survive 3 turns or clear an attack with 1-HP Ironman active.' },
  { id: 'Hardcore Survivor', title: 'Hardcore Survivor', desc: 'Clear any Story or Boss Rush run on HARD or NIGHTMARE.' },
  { id: 'Nightmare Sovereign', title: 'Nightmare Sovereign', desc: 'Triumph on NIGHTMARE difficulty without lowering the bar.' }
];

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
  ],
  5: [
    '* W.D. Gaster Unbound looms across shattered reality.',
    '* Entry Seventeen echoes louder than your heartbeat.',
    '* Every timeline converges inside this single box.'
  ]
};

const SANS_SPEECH_BY_TURN = [
  "it's a quiet night outside. birds are asleep, flowers are closed... on nights like this, kids like you shouldn't be standing.",
  "here's a rule to remember: blue attacks won't hurt if you stay completely still. blink and miss orange, though.",
  "you're pretty stubborn, huh? keeping your footing even when the floor itself is sharp bone.",
  "alright, let's wind up the carousel. see if you can keep your cool inside crossfire.",
  "four walls, zero mercy. let's test whether you can still dodge when gravity picks the side.",
  "huff... you don't quit, do you? alright. second wind. welcome to the corridor.",
  "shields up, kid. green means face the spear—especially the red ones that spin behind your back.",
  "the doctor left a few spinning toys in the lab. try not to get clipped between gears.",
  "sawblades running hot tonight. weave the lanes and brace for the final slam.",
  "blink and you'll miss it. lights out—hope you memorized the beat.",
  "justice soul, huh? blast through my barricade before the corridor crushes you.",
  "diamond walls locked down with bone wheels. break a path through before the crossfire locks in.",
  "wait... the corridor's cracking? stay sharp—this timeline isn't letting go quietly.",
  "huff... puff... almost dawn already? survive one last slam... *yawn*...",
  "the doctor's storm is tearing the ceiling open. defend every direction at once!",
  "blast through the prison walls while the blasters close in. zero room for hesitation.",
  "twelve ticks around the abyssal clock. move with the pendulum or get crushed.",
  "dual matrices engaged. blue slams and void blasters at full pressure now!",
  "huff... alright... survive this final singularity, and morning is all yours...",
  "...DARKER. YET DARKER. LET EVERY PURPLE THREAD TREMBLE.",
  "...MY ARCANUM DOES NOT RESPECT YOUR TIMELINE BORDERS.",
  "...EVERY VECTOR SHATTERS WHEN THE VOID UNBINDS.",
  "...YELLOW, BLUE, PURPLE... WATCH YOUR TIMELINE COLLAPSE.",
  "...FINAL RECORDING: LAST NIGHT APOCALYPSE. SHOW ME TRUE DETERMINATION."
];

export class BattleEngine {
  constructor(callbacks = {}) {
    this.onVictory = callbacks.onVictory || (() => {});
    this.onExitToOverworld = callbacks.onExitToOverworld || (() => {});
    this.onReturnTitle = callbacks.onReturnTitle || (() => {});
    this.onOpenAttackSelect = callbacks.onOpenAttackSelect || callbacks.onReturnTitle || (() => {});

    this.runner = new AttackRunner();
    this.assistMode = false;
    this.difficulty = this._loadDifficulty();

    this.unlockedAchievements = this._loadAchievements();
    this.achievementQueue = [];
    this.endlessBestWave = this._loadEndlessBest();
    this.endlessLeaderboard = this._loadEndlessLeaderboard();
    this.noHitAttacks = this._loadNoHitAttacks();
    this.resetCount = this._loadResetCount();
    this.modifiers = {
      ironman: false,
      hyperSpeed: false,
      invertedGravity: false,
      mirrorBox: false
    };
    this.soulSkin = 'classic';
    this.hasVoidKey = false;

    this.resetBattle({ skipResetCount: true });
  }

  _loadDifficulty() {
    if (typeof localStorage === 'undefined') return 'hard';
    try {
      const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
      return raw && DIFFICULTIES[raw] ? raw : 'hard';
    } catch {
      return 'hard';
    }
  }

  _saveDifficulty() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, this.difficulty);
    } catch {
      // Ignore storage errors
    }
  }

  setDifficulty(diffId) {
    if (!DIFFICULTIES[diffId]) return DIFFICULTIES[this.difficulty] || DIFFICULTIES.hard;
    this.difficulty = diffId;
    this._saveDifficulty();
    return DIFFICULTIES[diffId];
  }

  _loadResetCount() {
    if (typeof localStorage === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(RESETS_STORAGE_KEY);
      const val = raw ? Number(raw) : 0;
      return Number.isFinite(val) && val >= 0 ? val : 0;
    } catch {
      return 0;
    }
  }

  _saveResetCount() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(RESETS_STORAGE_KEY, String(this.resetCount));
    } catch {
      // Ignore storage errors
    }
  }

  _loadNoHitAttacks() {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(NOHIT_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? new Set(arr.filter((n) => Number.isInteger(n))) : new Set();
    } catch {
      return new Set();
    }
  }

  _saveNoHitAttacks() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(NOHIT_STORAGE_KEY, JSON.stringify([...this.noHitAttacks]));
    } catch {
      // Ignore storage quota errors
    }
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

  _loadEndlessLeaderboard() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(ENDLESS_BOARD_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  recordEndlessRun(wave, rank = 'C') {
    if (!Number.isFinite(wave) || wave < 1) return;
    this.endlessLeaderboard = [
      ...this.endlessLeaderboard,
      { wave, rank, date: new Date().toLocaleDateString() }
    ]
      .sort((a, b) => b.wave - a.wave)
      .slice(0, 5);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ENDLESS_BOARD_STORAGE_KEY, JSON.stringify(this.endlessLeaderboard));
      } catch {
        // Ignore storage errors
      }
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
    if (idx >= 19) return 5;
    if (idx >= 14) return 4;
    if (idx >= 10) return 3;
    if (idx >= 5) return 2;
    return 1;
  }

  _pickNextEndlessAttackIndex(firstWave = false) {
    if (!this.endlessBag || this.endlessBag.length === 0) {
      const pool = Array.from({ length: Math.max(1, ATTACK_NAMES.length - 5) }, (_, k) => k + 5);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      this.endlessBag = pool;
    }
    if (firstWave && this.endlessStartPhase === 4) {
      const p4Idx = this.endlessBag.findIndex((i) => i >= 14);
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
    const turnByPhase = { 1: 0, 2: 5, 3: 10, 4: 14, 5: 19 };

    if (!options.skipResetCount) {
      this.resetCount = (this.resetCount || 0) + 1;
      this._saveResetCount();
    }
    this.usedMouseThisBattle = false;
    this.metaCalloutsUsed = new Set();
    this.buttonOrder = [0, 1, 2, 3];

    if (options.difficulty && DIFFICULTIES[options.difficulty]) {
      this.difficulty = options.difficulty;
      this._saveDifficulty();
    }
    if (options.modifiers) {
      this.modifiers = { ...this.modifiers, ...options.modifiers };
    }
    if (options.soulSkin && SOUL_SKINS[options.soulSkin]) {
      this.soulSkin = options.soulSkin;
    }
    if (typeof options.hasVoidKey === 'boolean') {
      this.hasVoidKey = options.hasVoidKey;
    }

    this.practiceAttackIndex = Number.isInteger(options.practiceAttackIndex)
      ? Math.max(0, Math.min(ATTACK_NAMES.length - 1, options.practiceAttackIndex))
      : null;
    this.endlessMode = Boolean(options.endless) && this.practiceAttackIndex === null;
    this.bossRushMode = Boolean(options.bossRush) && this.practiceAttackIndex === null && !this.endlessMode;
    this.customSpeedMult = Number.isFinite(options.customSpeedMult)
      ? Math.max(0.5, Math.min(2.0, options.customSpeedMult))
      : 1.0;
    this.endlessWave = 1;
    this.endlessStartPhase = options.phase || 4;
    this.endlessBag = [];
    this.endlessCurrentAttackIndex = 14;

    let startPhase = options.phase || 1;
    if (this.practiceAttackIndex !== null) {
      this.turnIndex = this.practiceAttackIndex;
      startPhase = this._phaseForTurnIndex(this.turnIndex);
    } else if (this.endlessMode) {
      this.endlessCurrentAttackIndex = this._pickNextEndlessAttackIndex(true);
      this.turnIndex = this.endlessCurrentAttackIndex;
      startPhase = this.endlessStartPhase;
    } else if (this.bossRushMode) {
      this.turnIndex = 0;
      startPhase = 1;
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

    // Style Rank & Combat Juice state
    this.styleScore = 0;
    this.styleRank = 'C';
    this.styleCombo = 0;
    this.hitstopTimer = 0;
    this.slowMoTimer = 0;
    this.chromaticTimer = 0;
    this.particles = [];
    this.soulTrail = [];
    this.slashArcs = [];

    // Equipment
    this.weaponName = options.weapon && WEAPONS[options.weapon] ? options.weapon : 'Real Knife';
    this.armorName = options.armor && ARMORS[options.armor] ? options.armor : 'The Locket';

    // Player stats
    const ironmanOn = Boolean(this.modifiers?.ironman);
    if (ironmanOn) this.assistMode = false;
    this.stats = {
      name: options.name || 'FRISK',
      lv: 19,
      hp: ironmanOn ? 1 : (options.hp ?? 92),
      maxHp: ironmanOn ? 1 : (options.maxHp ?? 92),
      kr: 0
    };
    this.inventory = options.inventory
      ? options.inventory.map((it) => ({ ...it }))
      : DEFAULT_INVENTORY();

    // TP & Combat Modifiers
    this.tp = 0;
    this.shieldBarrier = false;
    this.usedTpSpellThisTurn = false;
    this.voidInterventionPending = false;
    this.totalBlocks = 0;
    this.yellowShotsFired = 0;
    this.usedYellowThisTurn = false;
    this.sawGasterThisTurn = false;
    this.popups = [];
    this.soulTransitionRing = null;

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

    // SOUL Physics (red | blue | green | yellow | purple)
    this.soul = {
      x: 320,
      y: 315,
      vx: 0,
      vy: 0,
      mode: 'red',
      gravity: 'down',
      shieldDir: 'up',
      webLine: 1,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: 0,
      shotCooldown: 0,
      chargeTimer: 0,
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
    const bgmMap = { 1: 'phase1', 2: 'phase2', 3: 'phase3', 4: 'phase4', 5: 'phase5' };
    audio.setTempoMult?.(this.modifiers?.hyperSpeed ? 1.16 : 1.0);
    audio.playBGM(bgmMap[this.phase] || 'phase1');
  }

  _spawnParticles(x, y, color = '#ffffff', count = 8, speed = 110) {
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2 + (i % 3) * 2,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6
      });
    }
  }

  _refreshStyleRank() {
    const prev = this.styleRank;
    if (this.styleScore >= 1200) this.styleRank = 'SS';
    else if (this.styleScore >= 720) this.styleRank = 'S';
    else if (this.styleScore >= 420) this.styleRank = 'A';
    else if (this.styleScore >= 180) this.styleRank = 'B';
    else this.styleRank = 'C';
    if (this.styleRank !== prev && (this.styleRank === 'S' || this.styleRank === 'SS')) {
      this.unlockAchievement('Style Legend');
      audio.rankUp?.();
    }
  }

  addScreenShake(amount) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  addPopup(x, y, text, color = '#ffffff') {
    this.popups.push({
      x,
      y,
      text,
      color,
      vy: -36,
      timer: 0.95,
      maxTimer: 0.95
    });
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
    this.runner.currentSoulMode = mode;
    if (mode !== 'yellow') {
      this.soul.chargeTimer = 0;
    }
    if (mode !== prevMode) {
      const ringColors = {
        red: '#ff1e1e',
        blue: '#2ce8f5',
        green: '#4ade80',
        yellow: '#ffef3f',
        purple: '#d946ef'
      };
      this.soulTransitionRing = {
        timer: 0.45,
        maxTimer: 0.45,
        color: ringColors[mode] || '#ffffff'
      };
    }
    if (mode === 'blue') {
      let g = gravity;
      if (this.modifiers?.invertedGravity) {
        const flip = { down: 'up', up: 'down', left: 'right', right: 'left' };
        g = flip[g] || g;
      }
      this.soul.gravity = g;
      if (prevMode !== 'blue' || prevGrav !== g) {
        this.soul.grounded = false;
      }
    } else if (mode === 'purple') {
      this.soul.vx = 0;
      this.soul.vy = 0;
      this.soul.grounded = false;
      this.soul.webLine = 1;
      const rails = this.runner.getWebLines(this.box);
      this.soul.y = rails[1] ?? (this.box.y + this.box.h * 0.5);
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
    let effDir = dir;
    if (this.modifiers?.invertedGravity) {
      const flip = { down: 'up', up: 'down', left: 'right', right: 'left' };
      effDir = flip[dir] || dir;
    }
    this.soul.mode = 'blue';
    this.runner.currentSoulMode = 'blue';
    this.soul.gravity = effDir;
    this.soul.grounded = false;
    const slamSpeed = 620;
    if (effDir === 'down') {
      this.soul.vy = slamSpeed;
      this.sans.pose = 'slamDown';
    } else if (effDir === 'up') {
      this.soul.vy = -slamSpeed;
      this.sans.pose = 'slamUp';
    } else if (effDir === 'left') {
      this.soul.vx = -slamSpeed;
      this.sans.pose = 'slamLeft';
    } else if (effDir === 'right') {
      this.soul.vx = slamSpeed;
      this.sans.pose = 'slamRight';
    }
    this.sans.expression = 'blueEye';
    audio.slam();
    this.addScreenShake(8);
  }

  enterClimaxSleep() {
    if (this.endlessMode || this.practiceAttackIndex !== null || this.bossRushMode) {
      this.runner.finished = true;
      return;
    }
    this.state = 'CLIMAX_SLEEP';
    this.climaxSleep.active = true;
    this.climaxSleep.timer = 0;
    this.climaxSleep.choice = null;
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this.box.targetW = 240;
    this.box.w = 240;
    this.box.targetX = 200;
    this.box.x = 200;
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
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }
    const rawDt = dt;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer = Math.max(0, this.slowMoTimer - rawDt);
      dt = dt * 0.58;
    }
    this.time += dt;

    if (this.chromaticTimer > 0) {
      this.chromaticTimer = Math.max(0, this.chromaticTimer - rawDt);
    }
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - rawDt * 28);
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }
    if (this.soul.dashTimer > 0) {
      this.soul.dashTimer = Math.max(0, this.soul.dashTimer - dt);
    }
    if (this.soul.dashCooldown > 0) {
      this.soul.dashCooldown = Math.max(0, this.soul.dashCooldown - dt);
    }
    if (this.soul.grazeFlashTimer > 0) {
      this.soul.grazeFlashTimer = Math.max(0, this.soul.grazeFlashTimer - dt);
    }
    if (this.soul.shotCooldown > 0) {
      this.soul.shotCooldown = Math.max(0, this.soul.shotCooldown - dt);
    }
    if (this.phaseBannerTimer > 0) {
      this.phaseBannerTimer = Math.max(0, this.phaseBannerTimer - rawDt);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * rawDt;
      p.y += p.vy * rawDt;
      p.life -= rawDt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.soulTrail.length - 1; i >= 0; i--) {
      this.soulTrail[i].life -= rawDt;
      if (this.soulTrail[i].life <= 0) this.soulTrail.splice(i, 1);
    }
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      this.slashArcs[i].timer -= rawDt;
      if (this.slashArcs[i].timer <= 0) this.slashArcs.splice(i, 1);
    }
    if (this.soulTransitionRing) {
      this.soulTransitionRing.timer -= dt;
      if (this.soulTransitionRing.timer <= 0) {
        this.soulTransitionRing = null;
      }
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy * dt;
      p.timer -= dt;
      if (p.timer <= 0) {
        this.popups.splice(i, 1);
      }
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
        if (this.practiceAttackIndex !== null || this.bossRushMode) {
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
    if (this.phase >= 2 && !this.sans.sleeping && this.practiceAttackIndex === null && this.turnsTaken % 3 === 2) {
      this.flavorText =
        this.turnsTaken % 2 === 0
          ? `* Attempt #${Math.max(1, this.resetCount)} logged in localStorage... Sans winks at the canvas.`
          : '* Something in the Void keeps glancing past the HTML frame at you.';
    } else {
      this.flavorText = pool[this.turnsTaken % pool.length];
    }

    // 4th-Wall Button Scrambler in Phase 3 & 4
    this.buttonOrder = [0, 1, 2, 3];
    if (
      this.phase >= 3 &&
      !this.sans.sleeping &&
      this.practiceAttackIndex === null &&
      !this.bossRushMode &&
      this.turnsTaken > 0
    ) {
      const order = [0, 1, 2, 3];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      if (order[0] === 0 && order[1] === 1 && order[2] === 2 && order[3] === 3) {
        [order[0], order[3]] = [order[3], order[0]];
      }
      this.buttonOrder = order;
      this.addPopup(320, 382, '4TH WALL: BUTTONS SCRAMBLED!', '#c084fc');
      audio.fourthWallGlitch?.();
    }

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
        Math.abs(cursorX - (this.menuBone.x + 8)) < 14
      ) {
        this.menuBone.hitCooldown = 0.65;
        if (!this.assistMode && this.stats.hp > 1) {
          this.stats.hp = Math.max(1, this.stats.hp - 1);
          audio.hurt();
          this.addPopup(cursorX, BUTTON_Y - 16, '-1 HP', '#ff4c4c');
        }
      }
    }

    if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      this.subIndex = 0;
      const actionId = this.buttonOrder ? (this.buttonOrder[this.menuIndex] ?? this.menuIndex) : this.menuIndex;
      if (actionId === 0) {
        this.state = 'FIGHT_AIM';
        this.fightBar.pos = -1;
        this.fightBar.dir = 1;
        this.fightBar.active = true;
      } else if (actionId === 1) {
        this.state = 'ACT_MENU';
      } else if (actionId === 2) {
        this.itemPage = 0;
        this.state = 'ITEM_MENU';
      } else if (actionId === 3) {
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
      this.slashArcs.push({
        x: this.sans.x,
        y: this.sans.y - 60,
        timer: 0.34,
        maxTimer: 0.34,
        color: this.phase >= 5 ? '#e879f9' : '#2ce8f5'
      });
      if (this.sans.sleeping) {
        if (
          this.phase < 4 &&
          !this.bossRushMode &&
          !this.endlessMode &&
          this.practiceAttackIndex === null
        ) {
          // Phase 3 climax interrupted by W.D. Gaster's Void Intervention -> Phase 4!
          this.sans.pose = 'damaged';
          this.sans.expression = 'gaster';
          this.sans.hurtShake = 14;
          this.sans.flashAlpha = 0.85;
          this.sans.sleeping = false;
          this.sans.defeated = false;
          this.voidInterventionPending = true;
          this.fightBar.damageText = 'VOID BLOCKED';
          this.fightBar.showMiss = true;
          this.fightBar.damageTimer = 1.2;
          this.fightBar.slashTimer = 0.95;
          this.addPopup(this.sans.x, this.sans.y - 76, 'GASTER INTERVENED!', '#c084fc');
          audio.gasterSpeak();
        } else if (
          this.phase === 4 &&
          this.hasVoidKey &&
          !this.bossRushMode &&
          !this.endlessMode &&
          this.practiceAttackIndex === null
        ) {
          // Secret Void Key shatters Phase 4's ending -> Phase 5 Gaster Unbound!
          this.sans.pose = 'damaged';
          this.sans.expression = 'cracked';
          this.sans.hurtShake = 18;
          this.sans.flashAlpha = 0.95;
          this.sans.sleeping = false;
          this.sans.defeated = false;
          this.voidUnboundPending = true;
          this.fightBar.damageText = 'VOID SHATTERED';
          this.fightBar.showMiss = true;
          this.fightBar.damageTimer = 1.3;
          this.fightBar.slashTimer = 1.05;
          this.hitstopTimer = 0.08;
          this.chromaticTimer = 0.35;
          this._spawnParticles(this.sans.x, this.sans.y - 50, '#e879f9', 16, 160);
          audio.gasterUnboundRoar?.();
        } else {
          // Final Climax fatal hit!
          this.sans.pose = 'damaged';
          this.sans.expression = 'cracked';
          this.sans.hurtShake = 18;
          this.sans.flashAlpha = 0.9;
          this.sans.defeated = true;
          this.fightBar.damageText = '9999999';
          this.fightBar.showMiss = true;
          this.fightBar.damageTimer = 1.4;
          this.hitstopTimer = 0.08;
          this._spawnParticles(this.sans.x, this.sans.y - 50, '#ff4c4c', 18, 175);
          audio.hit();
        }
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
      if (this.voidUnboundPending) {
        this.voidUnboundPending = false;
        this.turnIndex = 19;
        this._pendingTurnAdvance = 1;
        this._syncPhaseFromTurnIndex();
        this._showSansSpeech(
          '* ...THE VOID KEY SHATTERED THE SEAL. WITNESS ENTRY SEVENTEEN UNBOUND.',
          () => this._startDefendAttack()
        );
      } else if (this.voidInterventionPending) {
        this.voidInterventionPending = false;
        this.turnIndex = 14;
        this._pendingTurnAdvance = 1;
        this._syncPhaseFromTurnIndex();
        this._showSansSpeech(
          "* ...he won't let the timeline end here. welcome to the void, kid.",
          () => this._startDefendAttack()
        );
      } else if (this.sans.defeated) {
        this._finishVictory(this.phase >= 5 ? 'void_unbound' : 'strike');
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
        if (this.usedTpSpellThisTurn) {
          audio.menuMove();
          this._showBoxDialogue(
            '* You already channeled a TP spell this turn!\n* Take another action or press FIGHT to continue.',
            () => {
              this.state = 'ACT_MENU';
            }
          );
          return;
        }
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
        this.usedTpSpellThisTurn = true;
        const beforeHp = this.stats.hp;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 22);
        this.stats.kr = Math.max(0, this.stats.kr - 10);
        const gained = this.stats.hp - beforeHp;
        audio.heal();
        this.addPopup(330, 386, `+${gained} HP`, '#4ade80');
        this._showBoxDialogue(
          `* You weave golden warmth from pure Tension!\n* Restored ${gained} HP and purged KARMA! (Free action)`,
          () => this._enterPlayerMenu()
        );
      } else if (act === 'Barrier (60 TP)') {
        if (this.usedTpSpellThisTurn) {
          audio.menuMove();
          this._showBoxDialogue(
            '* You already channeled a TP spell this turn!\n* Take another action or press FIGHT to continue.',
            () => {
              this.state = 'ACT_MENU';
            }
          );
          return;
        }
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
        this.usedTpSpellThisTurn = true;
        this.shieldBarrier = true;
        audio.shieldBlock();
        this.addPopup(330, 386, 'BARRIER!', '#38bdf8');
        this._showBoxDialogue(
          '* A radiant SOUL Barrier crystallizes around you!\n* Next direct hit absorbed! (Free action)',
          () => this._enterPlayerMenu()
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

    if (input.justPressed('ArrowLeft') || input.justPressed('KeyA')) {
      if (this.subIndex % 2 === 0 && totalPages > 1) {
        this.itemPage = (this.itemPage - 1 + totalPages) % totalPages;
        this.subIndex = 0;
      } else {
        this.subIndex = Math.max(0, this.subIndex - 1);
      }
      audio.menuMove();
    } else if (input.justPressed('ArrowRight') || input.justPressed('KeyD')) {
      if ((this.subIndex % 2 === 1 || this.subIndex + 1 >= count) && totalPages > 1) {
        this.itemPage = (this.itemPage + 1) % totalPages;
        this.subIndex = 0;
      } else if (this.subIndex + 1 < count) {
        this.subIndex += 1;
      }
      audio.menuMove();
    } else if (
      input.justPressed('ArrowUp') ||
      input.justPressed('ArrowDown') ||
      input.justPressed('KeyW') ||
      input.justPressed('KeyS')
    ) {
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
        () => this._advanceTurnAfterAction(1) // Advance smoothly into the next pattern instead of repeating!
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
          (this.phase === 4 && this.turnIndex >= 18 && !this.hasVoidKey) ||
          this.turnIndex >= ATTACK_NAMES.length - 1);
      if (canSpare) {
        this._showBoxDialogue(
          '* You offer genuine MERCY before the rising sun.\n* Sans lets out a long breath... and lowers his hands.',
          () => this._finishVictory('truce')
        );
      } else {
        this.sans.expression = 'wink';
        this.sans.pose = 'shrug';
        this._pendingTurnAdvance = 1;
        const msg = this.endlessMode
          ? "spare? in endless mode? sorry pal, the timeline clock's broken tonight."
          : this._pickFourthWallSpeech("geeettttttt dunked on?? ...nah, not quite yet. keep your guard up — we aren't done talking.");
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
      if (this.phase >= 4) {
        this.unlockAchievement('Gaster Challenger');
      }
      audio.phaseShift();
      const bgmMap = { 1: 'phase1', 2: 'phase2', 3: 'phase3', 4: 'phase4', 5: 'phase5' };
      audio.transitionToBGM?.(bgmMap[this.phase] || 'phase3') || audio.playBGM(bgmMap[this.phase] || 'phase3');
      const bannerByPhase = {
        2: 'PHASE 2: SECOND WIND',
        3: 'PHASE 3: UNTIL DAWN',
        4: 'PHASE 4: VOID FRACTURE',
        5: 'PHASE 5: GASTER UNBOUND'
      };
      this.phaseBannerText = bannerByPhase[this.phase] || 'PHASE SHIFT';
      this.phaseBannerTimer = 2.6;
      this.sans.sweat = true;
    }
  }

  _pickFourthWallSpeech(baseSpeech) {
    if (!this.metaCalloutsUsed) this.metaCalloutsUsed = new Set();
    if (this.assistMode && !this.metaCalloutsUsed.has('assist') && this.turnsTaken >= 1) {
      this.metaCalloutsUsed.add('assist');
      audio.fourthWallGlitch?.();
      return "hey... i see that bright green 'Assist: ON' toggle up on your browser HUD. won't stop me from trying though.";
    }
    if (audio.muted && !this.metaCalloutsUsed.has('mute') && this.turnsTaken >= 1) {
      this.metaCalloutsUsed.add('mute');
      return "did you seriously mute the tab? c'mon, our synth tracks go at 150+ bpm for a reason.";
    }
    if (this.usedMouseThisBattle && !this.metaCalloutsUsed.has('mouse') && this.turnsTaken >= 1) {
      this.metaCalloutsUsed.add('mouse');
      return "clicking my menu with a mouse cursor? careful—maybe i'll start scrambling where those buttons sit.";
    }
    if (this.resetCount >= 3 && !this.metaCalloutsUsed.has('resets') && this.turnIndex >= 2) {
      this.metaCalloutsUsed.add('resets');
      return `localStorage says this is timeline attempt #${this.resetCount}. dedication looks weirdly good on you.`;
    }
    return baseSpeech;
  }

  _advanceTurnAfterAction(progress = 1) {
    this.turnsTaken += 1;
    if (this.endlessMode) {
      this._pendingTurnAdvance = 1;
      const speech = SANS_SPEECH_BY_TURN[this.endlessCurrentAttackIndex] || SANS_SPEECH_BY_TURN[14];
      this._showSansSpeech(this._pickFourthWallSpeech(speech), () => this._startDefendAttack());
      return;
    }
    if (this.bossRushMode) {
      this._pendingTurnAdvance = 1;
      this._startDefendAttack();
      return;
    }
    if (this.practiceAttackIndex !== null) {
      this._pendingTurnAdvance = 0;
      this._startDefendAttack();
      return;
    }

    this._pendingTurnAdvance = progress;
    const baseSpeech = SANS_SPEECH_BY_TURN[this.turnIndex] || SANS_SPEECH_BY_TURN[0];
    const speech = progress >= 1 ? this._pickFourthWallSpeech(baseSpeech) : baseSpeech;
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
    this.usedTpSpellThisTurn = false;
    this.turnHitsTaken = 0;
    this.usedYellowThisTurn = false;
    this.sawGasterThisTurn = false;
    this.soul.shotCooldown = 0;
    this.soul.chargeTimer = 0;
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
    this.activeAttackIdx = attackIdx;

    const attackId = ATTACK_NAMES[attackIdx] || 'openingBadTime';
    const meta = ATTACK_META[attackIdx];
    const attackPhase = meta ? meta.phase : this.phase;
    const boxCX = 320;
    const boxCY = 308;

    const diffSpec = DIFFICULTIES[this.difficulty] || DIFFICULTIES.hard;
    const baseMult = this.tauntSpeedBoost ? 1.15 : 1.0;
    const modSpeedMult = this.modifiers?.hyperSpeed ? 1.35 : 1.0;
    const endlessMult = this.endlessMode ? Math.min(1.42, 1.0 + (this.endlessWave - 1) * 0.03) : 1.0;
    const speedMult = baseMult * modSpeedMult * endlessMult * diffSpec.speedMult * (this.customSpeedMult || 1.0);
    audio.setTempoMult?.(
      (this.modifiers?.hyperSpeed ? 1.16 : 1.0) * diffSpec.tempoMult * (this.stats.hp <= 24 ? 1.07 : 1.0)
    );

    this.runner.start(attackId, {
      phase: attackPhase,
      difficulty: this.difficulty,
      speedMult,
      spawnGreenBonus: this.spawnGreenBonus,
      boxCX,
      boxCY
    });
    this.tauntSpeedBoost = false;
    this.spawnGreenBonus = false;
    this.soul.dashTimer = 0;
    this.soul.dashCooldown = 0;
    this.soulTrail = [];

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
      this.addPopup(this.soul.x, this.soul.y - 16, `+${healed} HP`, '#4ade80');
    }

    if (grazed > 0) {
      const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
      const tpMult = weaponSpec.tpMult || 1.0;
      const isCloseCall = this.soul.dashTimer > 0 || grazed >= 2;
      const gainTp = Math.round((isCloseCall ? 8 : 4) * grazed * tpMult);
      this.tp = Math.min(100, this.tp + gainTp);
      this.soul.grazeFlashTimer = 0.14;
      this.styleCombo += grazed;
      this.styleScore += (isCloseCall ? 65 : 35) * grazed;
      this._refreshStyleRank();
      if (isCloseCall) {
        this.slowMoTimer = 0.14;
        this.addPopup(this.soul.x, this.soul.y - 20, 'CLOSE CALL!', '#2ce8f5');
      }
      this._spawnParticles(this.soul.x, this.soul.y, '#70f8ff', 4, 70);
      this.unlockAchievement('First Graze');
    }

    if (blocked > 0) {
      const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
      const gainTp = Math.round(6 * blocked * (weaponSpec.tpMult || 1.0));
      this.tp = Math.min(100, this.tp + gainTp);
      this.totalBlocks += blocked;
      this.styleCombo += blocked;
      this.styleScore += 45 * blocked;
      this._refreshStyleRank();
      this._spawnParticles(this.soul.x, this.soul.y, '#4ade80', 5, 85);
      this.addPopup(this.soul.x, this.soul.y - 18, `+${gainTp}% TP`, '#4ade80');
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

      // Stained Apron / Heart Locket+ end-of-defend-turn heal
      const armorSpec = ARMORS[this.armorName] || ARMORS['The Locket'];
      if (armorSpec.endTurnHeal > 0 && this.stats.hp < this.stats.maxHp) {
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + armorSpec.endTurnHeal);
        audio.heal();
        this.addPopup(330, 386, `+${armorSpec.endTurnHeal} HP`, '#4ade80');
      }

      if (this.turnHitsTaken === 0) {
        this.styleScore += 180;
        this._refreshStyleRank();
        this.unlockAchievement('Untouchable Turn');
        if (this.modifiers?.ironman) {
          this.unlockAchievement('Ironman Legend');
        }
        const meta = ATTACK_META[this.activeAttackIdx];
        if (meta && String(meta.soulMode).includes('purple')) {
          this.unlockAchievement('Web Dancer');
        }
        if (Number.isInteger(this.activeAttackIdx)) {
          this.noHitAttacks.add(this.activeAttackIdx);
          this._saveNoHitAttacks();
          if (this.noHitAttacks.size >= 5) {
            this.unlockAchievement('Master of the Night');
          }
        }
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

      if (this.bossRushMode) {
        this.turnsTaken += 1;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 10);
        this.stats.kr = Math.max(0, this.stats.kr - 4);
        audio.heal();
        if (this.turnIndex >= ATTACK_NAMES.length - 1) {
          this.unlockAchievement('Master of the Night');
          this._finishVictory('boss_rush');
          return;
        }
        this.turnIndex += 1;
        this._syncPhaseFromTurnIndex();
        this.addPopup(320, 224, `RUSH ${this.turnIndex + 1}/${ATTACK_NAMES.length} (+10 HP)`, '#4ade80');
        this._startDefendAttack();
        return;
      }

      if (this._pendingTurnAdvance > 0) {
        const prevIdx = this.turnIndex;
        if (prevIdx >= ATTACK_NAMES.length - 1) {
          this._pendingTurnAdvance = 0;
          this.enterClimaxSleep();
          return;
        }
        if (prevIdx === 18 && !this.hasVoidKey) {
          this._pendingTurnAdvance = 0;
          this.enterClimaxSleep();
          return;
        }
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
    const rawLeft = input.isDown('ArrowLeft') || input.isDown('KeyA');
    const rawRight = input.isDown('ArrowRight') || input.isDown('KeyD');
    const left = this.modifiers?.mirrorBox ? rawRight : rawLeft;
    const right = this.modifiers?.mirrorBox ? rawLeft : rawRight;
    const up = input.isDown('ArrowUp') || input.isDown('KeyW');
    const down = input.isDown('ArrowDown') || input.isDown('KeyS');

    const mirrorSign = this.modifiers?.mirrorBox ? -1 : 1;
    const hasAnalog = Boolean(
      input.analogActive && (Math.abs(input.analogX || 0) > 0.01 || Math.abs(input.analogY || 0) > 0.01)
    );
    let moveX = (right ? 1 : 0) - (left ? 1 : 0);
    let moveY = (down ? 1 : 0) - (up ? 1 : 0);
    if (hasAnalog && (this.soul.mode === 'red' || this.soul.mode === 'yellow' || (moveX === 0 && moveY === 0))) {
      const ax = Math.max(-1, Math.min(1, (input.analogX || 0) * mirrorSign));
      const ay = Math.max(-1, Math.min(1, input.analogY || 0));
      if (Math.abs(ax) > 0.01 || Math.abs(ay) > 0.01) {
        moveX = ax;
        moveY = ay;
      }
    }

    const effUp = up || moveY < -0.45;
    const effDown = down || moveY > 0.45;
    const effLeft = left || moveX < -0.45;
    const effRight = right || moveX > 0.45;

    // Record Soul Afterimage Trail during Dash or intense speeds
    if (this.soul.dashTimer > 0 || (this.phase >= 4 && this.soul.inputMoving && Math.floor(this.time * 30) % 2 === 0)) {
      this.soulTrail.push({
        x: this.soul.x,
        y: this.soul.y,
        mode: this.soul.mode,
        gravity: this.soul.gravity,
        dashing: this.soul.dashTimer > 0,
        life: this.soul.dashTimer > 0 ? 0.24 : 0.14,
        maxLife: 0.24
      });
      if (this.soulTrail.length > 14) this.soulTrail.shift();
    }

    // Trigger SOUL Dash on X / Shift (gives brief burst + i-frames)
    const dashPressed =
      input.justPressed('KeyX') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight');
    if (dashPressed && this.soul.mode !== 'green' && this.soul.dashCooldown <= 0) {
      const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
      const armorSpec = ARMORS[this.armorName] || ARMORS['The Locket'];
      let dx = moveX;
      let dy = moveY;
      if (this.soul.mode === 'purple') dy = 0;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        if (this.soul.mode === 'blue') dy = this.soul.gravity === 'up' ? 1 : -1;
        else dx = 1;
      }
      const len = Math.hypot(dx, dy) || 1;
      this.soul.dashDirX = dx / len;
      this.soul.dashDirY = dy / len;
      this.soul.dashTimer = 0.15;
      this.soul.dashCooldown = 0.95 * (weaponSpec.dashCooldownMult || 1.0);
      this.invulnTimer = Math.max(this.invulnTimer, 0.14 + (armorSpec.dashInvulnBonus || 0));
      audio.dash?.();
      this._spawnParticles(this.soul.x, this.soul.y, '#2ce8f5', 7, 130);
    }

    if (this.soul.dashTimer > 0) {
      const dashSpd = 435;
      this.soul.x += this.soul.dashDirX * dashSpd * dt;
      if (this.soul.mode !== 'purple') {
        this.soul.y += this.soul.dashDirY * dashSpd * dt;
      }
      this.soul.inputMoving = true;
      return;
    }

    if (this.soul.mode === 'green') {
      // GREEN SOUL: Locked to box center; dominant-axis / directional input rotates shield reliably
      const upJust = input.justPressed('ArrowUp') || input.justPressed('KeyW');
      const downJust = input.justPressed('ArrowDown') || input.justPressed('KeyS');
      const rawLeftJust = input.justPressed('ArrowLeft') || input.justPressed('KeyA');
      const rawRightJust = input.justPressed('ArrowRight') || input.justPressed('KeyD');
      const leftJust = this.modifiers?.mirrorBox ? rawRightJust : rawLeftJust;
      const rightJust = this.modifiers?.mirrorBox ? rawLeftJust : rawRightJust;

      if (upJust) {
        this.soul.shieldDir = 'up';
      } else if (downJust) {
        this.soul.shieldDir = 'down';
      } else if (leftJust) {
        this.soul.shieldDir = 'left';
      } else if (rightJust) {
        this.soul.shieldDir = 'right';
      } else if (hasAnalog) {
        const ax = (input.analogX || 0) * mirrorSign;
        const ay = input.analogY || 0;
        if (Math.hypot(ax, ay) > 0.18) {
          this.soul.shieldDir = Math.abs(ax) >= Math.abs(ay)
            ? (ax >= 0 ? 'right' : 'left')
            : (ay >= 0 ? 'down' : 'up');
        }
      } else {
        const activeDirs = [];
        if (up) activeDirs.push('up');
        if (down) activeDirs.push('down');
        if (left) activeDirs.push('left');
        if (right) activeDirs.push('right');
        if (activeDirs.length === 1) {
          this.soul.shieldDir = activeDirs[0];
        } else if (activeDirs.length >= 2 && !activeDirs.includes(this.soul.shieldDir)) {
          this.soul.shieldDir = activeDirs[0];
        }
      }
      this.soul.vx = 0;
      this.soul.vy = 0;
      this.soul.inputMoving = false;
      this.soul.x = this.box.x + this.box.w / 2;
      this.soul.y = this.box.y + this.box.h / 2;
    } else if (this.soul.mode === 'purple') {
      // PURPLE SOUL: 3-line horizontal web dodging!
      const rails = this.runner.getWebLines(this.box);
      if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
        if (this.soul.webLine > 0) {
          this.soul.webLine -= 1;
          audio.webMove?.();
        }
      } else if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
        if (this.soul.webLine < 2) {
          this.soul.webLine += 1;
          audio.webMove?.();
        }
      }
      const targetY = rails[this.soul.webLine] ?? (this.box.y + this.box.h * 0.5);
      const railLerp = Math.min(1, dt * 28);
      this.soul.y += (targetY - this.soul.y) * railLerp;
      this.soul.vx = moveX * 190;
      this.soul.vy = 0;
      this.soul.x += this.soul.vx * dt;
      this.soul.inputMoving = Math.abs(moveX) > 0.05;
    } else if (this.soul.mode === 'red' || this.soul.mode === 'yellow') {
      const spd = this.soul.speed;
      this.soul.vx = moveX * spd;
      this.soul.vy = moveY * spd;
      this.soul.inputMoving = Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05;
      this.soul.x += this.soul.vx * dt;
      this.soul.y += this.soul.vy * dt;

      if (this.soul.mode === 'yellow') {
        const weaponSpec = WEAPONS[this.weaponName] || WEAPONS['Real Knife'];
        const fastGun = Boolean(weaponSpec.yellowFastCharge);
        const cdTap = fastGun ? 0.12 : 0.16;
        const chargeNeed = fastGun ? 0.28 : 0.38;
        const autoReleaseAt = fastGun ? 0.54 : 0.68;

        const fireJustPressed = input.justPressed('KeyZ') || input.justPressed('Enter');
        const fireHeld = input.isDown('KeyZ') || input.isDown('Enter');
        if (fireJustPressed) {
          if (this.soul.shotCooldown <= 0) {
            this.runner.spawnPlayerShot(this.soul.x, this.soul.y - 10, false);
            this.soul.shotCooldown = cdTap;
            this.yellowShotsFired += 1;
          }
          this.soul.chargeTimer = 0.001;
        } else if (fireHeld) {
          this.soul.chargeTimer += dt;
          if (this.soul.chargeTimer >= autoReleaseAt && this.soul.shotCooldown <= 0) {
            this.runner.spawnPlayerShot(this.soul.x, this.soul.y - 12, true);
            this.soul.shotCooldown = 0.24;
            this.soul.chargeTimer = 0;
            this.yellowShotsFired += 1;
            this.addPopup(this.soul.x, this.soul.y - 18, 'BIG SHOT!', '#ffef3f');
          }
        } else {
          if (this.soul.chargeTimer >= chargeNeed && this.soul.shotCooldown <= 0) {
            this.runner.spawnPlayerShot(this.soul.x, this.soul.y - 12, true);
            this.soul.shotCooldown = 0.22;
            this.yellowShotsFired += 1;
            this.addPopup(this.soul.x, this.soul.y - 18, 'BIG SHOT!', '#ffef3f');
          }
          this.soul.chargeTimer = 0;
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
        const jumpKey = grav === 'down' ? effUp : effDown;

        this.soul.vx = moveX * latSpeed;
        if (Math.abs(moveX) > 0.05) this.soul.inputMoving = true;

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
        const jumpKey = grav === 'right' ? effLeft : effRight;

        this.soul.vy = moveY * latSpeed;
        if (Math.abs(moveY) > 0.05) this.soul.inputMoving = true;

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
      this.addPopup(this.soul.x, this.soul.y - 18, 'BARRIER!', '#38bdf8');
      return;
    }

    this.hitsTaken += 1;
    this.turnHitsTaken += 1;
    this.styleCombo = 0;
    this.styleScore = Math.max(0, this.styleScore - 160);
    this._refreshStyleRank();
    this.hitstopTimer = 0.055;
    this.chromaticTimer = 0.22;
    this._spawnParticles(this.soul.x, this.soul.y, '#ff3333', 10, 145);
    this.invulnTimer = 0.35 + invulnBonus;
    this.addScreenShake(6);

    if (this.assistMode) {
      this.stats.hp = Math.max(1, this.stats.hp - 1);
      audio.hurt();
      this.addPopup(this.soul.x, this.soul.y - 16, '-1 HP', '#ffa024');
      return;
    }

    const diffSpec = DIFFICULTIES[this.difficulty] || DIFFICULTIES.hard;
    const baseDmg = (5 + (this.phase >= 3 ? 3 : this.phase === 2 ? 2 : 0)) * diffSpec.dmgMult;
    const dmg = Math.max(1, Math.round(baseDmg) - (armorSpec.dmgReduction || 0));
    const baseKr = (this.krShieldActive ? 3 : 6) * diffSpec.krMult;
    const addKr = Math.max(0, Math.round(baseKr) - (armorSpec.krReduction || 0));

    this.stats.hp -= dmg;
    this.stats.kr = Math.min(this.stats.hp, this.stats.kr + addKr);
    audio.hurt();
    this.addPopup(this.soul.x, this.soul.y - 16, `-${dmg}`, '#ff4c4c');

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
    if (this.endlessMode) {
      this.recordEndlessRun(this.endlessWave, this.styleRank);
    }
    audio.setTempoMult?.(1.0);
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
      if (
        input.justPressed('ArrowLeft') ||
        input.justPressed('ArrowRight') ||
        input.justPressed('KeyA') ||
        input.justPressed('KeyD')
      ) {
        go.choiceIdx = go.choiceIdx ^ 1;
        audio.menuMove();
      } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
        audio.menuSelect();
        if (go.choiceIdx === 0) {
          const shared = {
            name: this.stats.name,
            maxHp: this.stats.maxHp,
            weapon: this.weaponName,
            armor: this.armorName,
            customSpeedMult: this.customSpeedMult,
            difficulty: this.difficulty,
            modifiers: { ...this.modifiers },
            soulSkin: this.soulSkin,
            hasVoidKey: this.hasVoidKey
          };
          if (this.practiceAttackIndex !== null) {
            this.resetBattle({
              ...shared,
              practiceAttackIndex: this.practiceAttackIndex
            });
          } else if (this.endlessMode) {
            this.resetBattle({
              ...shared,
              endless: true,
              phase: this.endlessStartPhase
            });
          } else if (this.bossRushMode) {
            this.resetBattle({
              ...shared,
              bossRush: true
            });
          } else {
            this.resetBattle({
              ...shared,
              phase: this.phase
            });
          }
        } else if (this.practiceAttackIndex !== null) {
          this.onOpenAttackSelect();
        } else if (this.endlessMode || this.bossRushMode) {
          this.onReturnTitle();
        } else {
          this.onExitToOverworld();
        }
      } else if (input.justPressed('KeyX') || input.justPressed('Escape')) {
        if (this.practiceAttackIndex !== null) {
          this.onOpenAttackSelect();
        } else if (this.endlessMode || this.bossRushMode) {
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
    if (endingType === 'void_unbound' || this.phase >= 5) {
      this.unlockAchievement('Void Sovereign');
    }
    if (this.difficulty === 'hard' || this.difficulty === 'nightmare') {
      this.unlockAchievement('Hardcore Survivor');
    }
    if (this.difficulty === 'nightmare') {
      this.unlockAchievement('Nightmare Sovereign');
    }
    audio.setTempoMult?.(1.0);
    audio.playBGM('victory');
  }

  _updateVictory(input) {
    if (
      input.justPressed('ArrowLeft') ||
      input.justPressed('ArrowRight') ||
      input.justPressed('KeyA') ||
      input.justPressed('KeyD')
    ) {
      this.victory.choiceIdx = this.victory.choiceIdx ^ 1;
      audio.menuMove();
    } else if (input.justPressed('KeyZ') || input.justPressed('Enter')) {
      audio.menuSelect();
      if (this.victory.choiceIdx === 0) {
        if (this.victory.ending === 'boss_rush') {
          this.onReturnTitle();
        } else {
          this.onVictory({
            ending: this.victory.ending,
            rank: this.victory.rank,
            hitsTaken: this.hitsTaken,
            turnsTaken: this.turnsTaken
          });
        }
      } else {
        this.resetBattle({
          bossRush: this.victory.ending === 'boss_rush',
          phase: 1,
          name: this.stats.name,
          maxHp: this.stats.maxHp,
          weapon: this.weaponName,
          armor: this.armorName,
          customSpeedMult: this.customSpeedMult,
          difficulty: this.difficulty,
          modifiers: { ...this.modifiers },
          soulSkin: this.soulSkin,
          hasVoidKey: this.hasVoidKey
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

    // Dynamic Phase 1-5 Battle Backdrop (Beat-Synced)
    const beatPulse = audio.getBeatPulse ? audio.getBeatPulse() : 0;
    drawBattleBackdrop(ctx, {
      phase: this.phase,
      time: this.time,
      beatPulse,
      width: 640,
      height: 480
    });

    // Subtle Judgment Hall floor line behind Boss
    ctx.strokeStyle = this.phase >= 5 ? 'rgba(217, 70, 239, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 212);
    ctx.lineTo(580, 212);
    ctx.stroke();

    // Boss Character: Phase 5 Secret Boss W.D. Gaster Unbound OR Sans + Phase 2-4 Gaster Overlay
    if (this.phase >= 5 && (!this.sans.defeated || this.fightBar.damageTimer > 0)) {
      drawGasterUnbound(ctx, this.sans.x, this.sans.y + 8, {
        time: this.time,
        phase: this.phase,
        flashAlpha: this.sans.flashAlpha,
        hurtShake: this.sans.hurtShake,
        beatPulse
      });
    } else {
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
    }

    // Crisp Slash Arc VFX across the Boss
    for (const sa of this.slashArcs) {
      const p = 1 - sa.timer / sa.maxTimer;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = sa.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = Math.max(1, (1 - p) * 6);
      ctx.beginPath();
      ctx.moveTo(sa.x - 36, sa.y - 28);
      ctx.lineTo(sa.x - 36 + 76 * Math.min(1, p * 1.6), sa.y - 28 + 64 * Math.min(1, p * 1.6));
      ctx.stroke();
      ctx.restore();
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

    // Battle Box (supports 4th-Wall visual tilt transform during Gaster/fracture attacks)
    const boxTilt = this.state === 'DEFEND_ATTACK' ? (this.runner.boxAngle || 0) : 0;
    const boxCX = this.box.x + this.box.w / 2;
    const boxCY = this.box.y + this.box.h / 2;
    ctx.save();
    if (Math.abs(boxTilt) > 0.001) {
      ctx.translate(boxCX, boxCY);
      ctx.rotate(boxTilt);
      ctx.translate(-boxCX, -boxCY);
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(this.box.x, this.box.y, this.box.w, this.box.h);
    const beatBorder =
      Math.abs(boxTilt) > 0.005 || this.phase >= 5
        ? '#e879f9'
        : beatPulse > 0.55 && this.phase >= 2
          ? this.phase >= 4
            ? '#c084fc'
            : '#2ce8f5'
          : '#ffffff';
    ctx.strokeStyle = beatBorder;
    ctx.lineWidth = 4 + (this.state === 'DEFEND_ATTACK' ? beatPulse * 1.4 : 0);
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
      this.runner.currentSoulMode = this.soul.mode;
      this.runner.renderInsideBox(ctx, this.box);
      drawSoulTrail(ctx, this.soulTrail, this.soul.mode, {
        gravity: this.soul.gravity,
        skin: this.soulSkin
      });
      const flash = this.invulnTimer > 0 && Math.floor(this.invulnTimer * 24) % 2 === 0;
      if (this.soul.mode === 'yellow' && this.soul.chargeTimer >= 0.12) {
        const chargePct = Math.min(1, this.soul.chargeTimer / 0.38);
        ctx.save();
        ctx.strokeStyle = chargePct >= 1 ? '#ffffff' : '#ffef3f';
        ctx.lineWidth = chargePct >= 1 ? 2.5 : 1.5;
        ctx.globalAlpha = 0.45 + chargePct * 0.45;
        ctx.beginPath();
        ctx.arc(this.soul.x, this.soul.y, 11 + chargePct * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawSoul(ctx, this.soul.x, this.soul.y, this.soul.mode, {
        gravity: this.soul.gravity,
        shieldDir: this.soul.shieldDir,
        flash,
        grazeFlash: this.soul.grazeFlashTimer > 0,
        skin: this.soulSkin,
        dashing: this.soul.dashTimer > 0,
        dashReady: this.soul.dashCooldown <= 0
      });
      // Render combat particles inside Battle Box
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.maxLife * 0.6)));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.restore();
      }
      if (this.soulTransitionRing) {
        const prog = 1 - this.soulTransitionRing.timer / this.soulTransitionRing.maxTimer;
        ctx.save();
        ctx.strokeStyle = this.soulTransitionRing.color;
        ctx.globalAlpha = Math.max(0, 1 - prog);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.soul.x, this.soul.y, 10 + prog * 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
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

    // 4th-Wall Gaster Box-Grip Hands seizing outer borders in Phase 3/4 Gaster turns
    if (
      !this.sans.defeated &&
      ((this.phase >= 3 && this.runner.gasterActive) || (this.phase === 4 && this.state === 'DEFEND_ATTACK'))
    ) {
      this._drawGasterBoxGripHands(ctx);
    }

    ctx.restore();

    // Blaster overlay (drawn above Battle Box border)
    if (this.state === 'DEFEND_ATTACK') {
      this.runner.renderOverlay(ctx);
    }

    // Sleek Vertical TP Bar to the left of the Battle Box
    this._renderTpBar(ctx);

    // HP & KR Status Bar Row
    this._renderHpRow(ctx);

    // 4 Action Buttons (uses this.buttonOrder for Phase 3/4 4th-Wall Scrambler)
    BUTTON_LABELS.forEach((_, idx) => {
      const actionId = this.buttonOrder ? (this.buttonOrder[idx] ?? idx) : idx;
      const lbl = BUTTON_LABELS[actionId] || BUTTON_LABELS[idx];
      const selected =
        this.state !== 'DEFEND_ATTACK' &&
        this.state !== 'SANS_SPEECH' &&
        this.state !== 'CLIMAX_SLEEP' &&
        this.menuIndex === idx;
      drawBattleButton(ctx, BUTTON_XS[idx], BUTTON_Y, lbl, selected, this.soul.mode);
    });

    // Menu Bone Warning Rail & Sliding Bone above buttons (Phase 2+, never obscures button labels)
    if (this.menuBone.active && this.state === 'PLAYER_MENU') {
      const railY = BUTTON_Y - 10;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(32, railY + 4);
      ctx.lineTo(608, railY + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      const bx = Math.round(this.menuBone.x);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, railY + 1, 14, 6);
      ctx.fillRect(bx - 2, railY, 4, 8);
      ctx.fillRect(bx + 12, railY, 4, 8);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(bx + 2, railY + 3, 10, 2);
      ctx.restore();
    }

    // Mode Badge (Endless Wave / Boss Rush / Practice Attack) & Story Boss Stamina HUD & Style Rank
    this._renderModeHudBadge(ctx);
    this._renderBossHud(ctx);
    this._renderDiffSoulBadge(ctx);
    this._renderStyleRankBadge(ctx);
    this._renderPopups(ctx);

    // Chromatic glitch border flash on damage or Void Unbound transition
    if (this.chromaticTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.42, this.chromaticTimer * 1.4);
      ctx.strokeStyle = '#ff2244';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 632, 472);
      ctx.strokeStyle = '#2ce8f5';
      ctx.strokeRect(10, 8, 620, 464);
      ctx.restore();
    }

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

  _drawGasterBoxGripHands(ctx) {
    const midY = this.box.y + this.box.h / 2;
    const lx = this.box.x - 4;
    const rx = this.box.x + this.box.w + 4;
    const bob = Math.sin(this.time * 5) * 3;
    ctx.save();
    for (const [sideX, dir] of [[lx, 1], [rx, -1]]) {
      const cx = Math.round(sideX - dir * 8);
      const cy = Math.round(midY + bob);
      // Tendril into the void
      ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
      ctx.fillRect(cx - dir * 18, cy - 6, 18, 12);
      // Palm gripping border
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(cx - 5, cy - 11, 10, 22);
      // Hole in palm (Void stigma)
      ctx.fillStyle = '#0a0714';
      ctx.fillRect(cx - 2, cy - 3, 4, 6);
      // Fingers curling onto white box border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + dir * 4, cy - 11, 7, 4);
      ctx.fillRect(cx + dir * 4, cy - 4, 8, 4);
      ctx.fillRect(cx + dir * 4, cy + 3, 8, 4);
      ctx.fillRect(cx + dir * 3, cy + 9, 6, 3);
    }
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
    if (!this.endlessMode && !this.bossRushMode && this.practiceAttackIndex === null) return;

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
    } else if (this.bossRushMode) {
      ctx.fillStyle = 'rgba(24, 10, 12, 0.88)';
      ctx.fillRect(12, 12, 238, 30);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 238, 30);
      ctx.fillStyle = '#ffedd5';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(`BOSS RUSH  ${this.turnIndex + 1}/${ATTACK_NAMES.length}`, 22, 31);
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

  _renderBossHud(ctx) {
    if (this.endlessMode || this.practiceAttackIndex !== null || this.bossRushMode) return;
    if (this.phaseBannerTimer > 0) return;

    const total = ATTACK_NAMES.length;
    const staminaPct = Math.max(0, Math.min(1, 1 - this.turnIndex / total));
    const phaseAccent =
      this.phase >= 5
        ? '#e879f9'
        : this.phase === 4
          ? '#c084fc'
          : this.phase === 3
            ? '#ff4c4c'
            : this.phase === 2
              ? '#2ce8f5'
              : '#e2e8f0';

    ctx.save();
    const x = 14;
    const y = 12;
    const w = 186;
    const h = 30;
    ctx.fillStyle = 'rgba(8, 8, 16, 0.84)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = phaseAccent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = phaseAccent;
    ctx.font = '8px "Press Start 2P", monospace';
    const titleStr = this.phase >= 5 ? `VOID UNBOUND ${this.turnIndex + 1}/${total}` : `PHASE ${this.phase}/5  ${this.turnIndex + 1}/${total}`;
    ctx.fillText(titleStr, x + 8, y + 13);

    // Boss Stamina Bar
    ctx.fillStyle = '#1f1f2e';
    ctx.fillRect(x + 8, y + 19, w - 16, 6);
    ctx.fillStyle = phaseAccent;
    ctx.fillRect(x + 8, y + 19, Math.round((w - 16) * staminaPct), 6);
    ctx.restore();
  }

  _renderDiffSoulBadge(ctx) {
    const diffSpec = DIFFICULTIES[this.difficulty] || DIFFICULTIES.hard;
    const soulColors = {
      red: '#ff3030',
      blue: '#2ce8f5',
      green: '#4ade80',
      yellow: '#ffef3f',
      purple: '#e879f9'
    };
    const soulMode = (this.soul.mode || 'red').toLowerCase();
    const soulClr = soulColors[soulMode] || '#ffffff';

    ctx.save();
    const x = 14;
    const y = 46;
    ctx.fillStyle = 'rgba(8, 8, 16, 0.84)';
    ctx.fillRect(x, y, 164, 20);
    ctx.strokeStyle = diffSpec.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 76, 20);
    ctx.fillStyle = diffSpec.color;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(diffSpec.shortLabel, x + 7, y + 13);

    ctx.strokeStyle = soulClr;
    ctx.strokeRect(x + 80, y, 84, 20);
    ctx.fillStyle = soulClr;
    ctx.fillText(soulMode.toUpperCase(), x + 88, y + 13);
    ctx.restore();
  }

  _renderStyleRankBadge(ctx) {
    if (this.state !== 'DEFEND_ATTACK' && this.styleScore <= 0) return;
    const colors = { SS: '#e879f9', S: '#ffef3f', A: '#2ce8f5', B: '#4ade80', C: '#cbd5e1' };
    const clr = colors[this.styleRank] || '#ffffff';
    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 16, 0.85)';
    ctx.fillRect(496, 12, 130, 34);
    ctx.strokeStyle = clr;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(496, 12, 130, 34);
    ctx.fillStyle = clr;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`RANK ${this.styleRank}`, 506, 28);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#cbd5e1';
    const dashTxt = this.soul.dashCooldown <= 0 ? 'DASH OK' : 'DASH ..';
    ctx.fillText(`x${this.styleCombo} ${dashTxt}`, 506, 40);
    ctx.restore();
  }

  _renderPopups(ctx) {
    if (this.popups.length === 0) return;
    ctx.save();
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const p of this.popups) {
      const alpha = Math.max(0, Math.min(1, p.timer / (p.maxTimer * 0.55)));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, Math.round(p.x), Math.round(p.y));
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
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
        (this.phase === 4 && this.turnIndex >= 18 && !this.hasVoidKey) ||
        this.turnIndex >= ATTACK_NAMES.length - 1);
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
    const cx = this.box.x + this.box.w / 2;
    ctx.save();
    ctx.fillStyle = '#ffef3f';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SANS IS EXHAUSTED!', cx, this.box.y + 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('<- PUSH LEFT: FIGHT', cx, this.box.y + 124);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('PUSH RIGHT: MERCY ->', cx, this.box.y + 144);
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
    const lowHp = this.stats.hp > 0 && this.stats.hp <= Math.ceil(this.stats.maxHp * 0.28);
    const lowPulse = lowHp ? 0.5 + 0.5 * Math.sin(this.time * 12) : 0;

    if (lowHp) {
      ctx.fillStyle = `rgba(255, 48, 48, ${(0.25 + lowPulse * 0.35).toFixed(2)})`;
      ctx.fillRect(barX - 3, y - 3, barW + 6, barH + 6);
    }

    // Missing HP (Red)
    ctx.fillStyle = '#ff1a1a';
    ctx.fillRect(barX, y, barW, barH);
    // Pure HP (Yellow, pulses warm orange when critical)
    ctx.fillStyle = lowHp && lowPulse > 0.65 ? '#ff9b26' : '#ffef3f';
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

    ctx.fillStyle = this.stats.kr > 0 ? '#d926ff' : (lowHp && lowPulse > 0.55 ? '#ff5c5c' : '#ffffff');
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
            : this.bossRushMode
              ? 'Retry Boss Rush'
              : `Retry Phase ${this.phase}`;
        const exitLabel = this.practiceAttackIndex !== null
          ? 'Attack Select'
          : this.endlessMode || this.bossRushMode
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

    const isBossRush = this.victory.ending === 'boss_rush';
    const isTruce = this.victory.ending === 'truce';
    const isVoidUnbound = this.victory.ending === 'void_unbound';
    ctx.textAlign = 'center';
    ctx.fillStyle = isVoidUnbound ? '#e879f9' : isBossRush ? '#f97316' : isTruce ? '#ffd770' : '#ff4c4c';
    ctx.font = '21px "Press Start 2P", monospace';
    ctx.fillText(
      isVoidUnbound
        ? 'VOID UNBOUND DEFEATED'
        : isBossRush
          ? 'BOSS RUSH CLEARED!'
          : isTruce
            ? 'DAWN TRUCE REACHED'
            : 'LAST NIGHT CLEARED',
      320,
      110
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillText(
      isVoidUnbound
        ? 'Entry Seventeen sealed. Reality stabilizes at dawn.'
        : isBossRush
          ? `All ${ATTACK_NAMES.length} signature patterns endured.`
          : isTruce
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
      { label: isBossRush ? 'Return to Title' : 'Step to Dawn Balcony', x: 190, soulX: 64 },
      { label: isBossRush ? 'Rush Again' : 'Fight Again', x: 456, soulX: 382 }
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

  handlePointerMove(x, y) {
    if (this.state === 'PLAYER_MENU') {
      if (y >= BUTTON_Y && y <= BUTTON_Y + 42) {
        for (let i = 0; i < BUTTON_XS.length; i++) {
          if (x >= BUTTON_XS[i] && x <= BUTTON_XS[i] + 110) {
            if (this.menuIndex !== i) {
              this.menuIndex = i;
              audio.menuMove();
            }
            return;
          }
        }
      }
    } else if (this.state === 'ACT_MENU') {
      const col = x >= this.box.x + 280 ? 1 : 0;
      const row = Math.floor((y - (this.box.y + 12)) / 32);
      if (row >= 0 && row < 3) {
        const idx = row * 2 + col;
        if (idx >= 0 && idx < 6 && this.subIndex !== idx) {
          this.subIndex = idx;
          audio.menuMove();
        }
      }
    } else if (this.state === 'ITEM_MENU') {
      const pageItems = this.inventory.slice(this.itemPage * 4, this.itemPage * 4 + 4);
      const col = x >= this.box.x + 295 ? 1 : 0;
      const row = y >= this.box.y + 62 ? 1 : 0;
      const idx = row * 2 + col;
      if (y >= this.box.y + 18 && y <= this.box.y + 112 && idx < pageItems.length && this.subIndex !== idx) {
        this.subIndex = idx;
        audio.menuMove();
      }
    } else if (this.state === 'GAME_OVER' && this.gameOver.timer >= 1.5) {
      if (y >= 330 && y <= 385) {
        const nextIdx = x >= 320 ? 1 : 0;
        if (this.gameOver.choiceIdx !== nextIdx) {
          this.gameOver.choiceIdx = nextIdx;
          audio.menuMove();
        }
      }
    } else if (this.state === 'VICTORY_SUMMARY') {
      if (y >= 348 && y <= 404) {
        const nextIdx = x >= 320 ? 1 : 0;
        if (this.victory.choiceIdx !== nextIdx) {
          this.victory.choiceIdx = nextIdx;
          audio.menuMove();
        }
      }
    } else if (this.state === 'PRACTICE_CLEAR') {
      const ys = [286, 326, 366];
      for (let i = 0; i < ys.length; i++) {
        if (Math.abs(y - ys[i]) <= 18) {
          if (this.practiceClear.choiceIdx !== i) {
            this.practiceClear.choiceIdx = i;
            audio.menuMove();
          }
          return;
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
    if (this.state === 'PLAYER_MENU') {
      if (y >= BUTTON_Y && y <= BUTTON_Y + 42) {
        for (let i = 0; i < BUTTON_XS.length; i++) {
          if (x >= BUTTON_XS[i] && x <= BUTTON_XS[i] + 110) {
            this.menuIndex = i;
            fireKey('KeyZ');
            return;
          }
        }
      }
    } else if (this.state === 'FIGHT_AIM') {
      if (y >= this.box.y && y <= this.box.y + this.box.h) {
        fireKey('KeyZ');
      }
    } else if (this.state === 'ACT_MENU') {
      if (y >= this.box.y + 114 && y <= this.box.y + 148 && x < this.box.x + 240) {
        fireKey('KeyX');
        return;
      }
      if (y >= this.box.y + 12 && y <= this.box.y + 110) {
        fireKey('KeyZ');
      }
    } else if (this.state === 'ITEM_MENU') {
      if (y >= this.box.y + 114 && y <= this.box.y + 148) {
        if (x >= this.box.x + 390) {
          const totalPages = Math.max(1, Math.ceil(this.inventory.length / 4));
          if (totalPages > 1) {
            this.itemPage = (this.itemPage + 1) % totalPages;
            this.subIndex = 0;
            audio.menuMove();
          }
        } else {
          fireKey('KeyX');
        }
        return;
      }
      if (y >= this.box.y + 18 && y <= this.box.y + 112 && this.inventory.length > 0) {
        fireKey('KeyZ');
      }
    } else if (this.state === 'MERCY_MENU') {
      if (y >= this.box.y && y <= this.box.y + this.box.h) {
        fireKey('KeyZ');
      }
    } else if (this.state === 'DIALOGUE_TEXT') {
      if (this.boxDialogue.charIdx < this.boxDialogue.text.length) {
        this.boxDialogue.charIdx = this.boxDialogue.text.length;
      } else {
        fireKey('KeyZ');
      }
    } else if (this.state === 'SANS_SPEECH') {
      if (this.sansBubble.charIdx < this.sansBubble.text.length) {
        this.sansBubble.charIdx = this.sansBubble.text.length;
      } else {
        fireKey('KeyZ');
      }
    } else if (this.state === 'GAME_OVER' && this.gameOver.timer >= 1.5 && y >= 330 && y <= 385) {
      fireKey('KeyZ');
    } else if (this.state === 'VICTORY_SUMMARY' && y >= 348 && y <= 404) {
      fireKey('KeyZ');
    } else if (this.state === 'PRACTICE_CLEAR' && y >= 264 && y <= 388) {
      fireKey('KeyZ');
    }
  }
}
