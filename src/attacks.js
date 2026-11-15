// 15 Hand-Crafted Sans "Last Night" Bullet-Hell Attack Patterns (Phases 1-4)

import { audio } from './audio.js';
import { drawBone, drawGasterBlaster, drawBoneWheel, drawSpear } from './sprites.js';

export const ATTACK_NAMES = [
  // Phase 1 (0..4)
  'openingBadTime',
  'blueStopSigns',
  'platformPeril',
  'blasterCarousel',
  'fourWaySlam',
  // Phase 2 (5..8)
  'sineBoneTunnel',
  'greenShieldBarrage',
  'boneWheelLab',
  'blackoutCuts',
  // Phase 3 (9..11)
  'yellowShooterCorridor',
  'gasterHandMatrix',
  'finalGambitAndSleep',
  // Phase 4 / Secret (12..14)
  'greenShieldStorm',
  'yellowBlasterBreakout',
  'gasterDualFinale'
];

export const ATTACK_META = [
  {
    id: 'openingBadTime',
    index: 0,
    title: 'Opening Bad Time',
    phase: 1,
    soulMode: 'blue',
    desc: 'Blue slam opener into sweeping bone tunnel & 4-corner Gaster Blasters'
  },
  {
    id: 'blueStopSigns',
    index: 1,
    title: 'Blue & Orange Signs',
    phase: 1,
    soulMode: 'blue',
    desc: 'Rhythmic White bone hops, Blue freeze gates & Orange motion sweeps'
  },
  {
    id: 'platformPeril',
    index: 2,
    title: 'Platform Peril',
    phase: 1,
    soulMode: 'blue',
    desc: 'Multi-tier moving platforms over floor spikes & dual-lane blasters'
  },
  {
    id: 'blasterCarousel',
    index: 3,
    title: 'Blaster Carousel',
    phase: 1,
    soulMode: 'red',
    desc: '360-degree rotating Gaster Blaster ring & crossfire finale'
  },
  {
    id: 'fourWaySlam',
    index: 4,
    title: 'Four-Way Slam',
    phase: 1,
    soulMode: 'blue',
    desc: 'Telegraphed 4-wall gravity slams with instant wall bone eruptions'
  },
  {
    id: 'sineBoneTunnel',
    index: 5,
    title: 'Sine Bone Corridor',
    phase: 2,
    soulMode: 'red',
    desc: 'Oscillating bone wave corridor inside a smoothly swaying Battle Box'
  },
  {
    id: 'greenShieldBarrage',
    index: 6,
    title: 'Green Shield Barrage',
    phase: 2,
    soulMode: 'green',
    desc: 'Directional spear deflection with a healing green spear'
  },
  {
    id: 'boneWheelLab',
    index: 7,
    title: 'Bone Wheel Lab',
    phase: 2,
    soulMode: 'red',
    desc: 'Spinning multi-spoke bone wheels inside a drifting Battle Box'
  },
  {
    id: 'blackoutCuts',
    index: 8,
    title: 'Blackout Cuts',
    phase: 2,
    soulMode: 'red',
    desc: 'Sudden blackout resets shifting between Blue jumps, Blasters & color gates'
  },
  {
    id: 'yellowShooterCorridor',
    index: 9,
    title: 'Justice Corridor',
    phase: 3,
    soulMode: 'yellow',
    desc: 'Blast through descending yellow cracked bone walls with upward shots'
  },
  {
    id: 'gasterHandMatrix',
    index: 10,
    title: 'Gaster Hand Matrix',
    phase: 3,
    soulMode: 'red',
    desc: 'W.D. Gaster warps the Battle Box with grid bones, wheels & slam blasters'
  },
  {
    id: 'finalGambitAndSleep',
    index: 11,
    title: 'Final Gambit',
    phase: 3,
    soulMode: 'blue',
    desc: 'Sans unleashes his last slam & twin blasters before nodding off'
  },
  {
    id: 'greenShieldStorm',
    index: 12,
    title: 'Green Shield Storm',
    phase: 4,
    soulMode: 'green',
    desc: 'High-tempo Gaster-distorted spear storm with tight directional spins'
  },
  {
    id: 'yellowBlasterBreakout',
    index: 13,
    title: 'Justice Breakout',
    phase: 4,
    soulMode: 'yellow',
    desc: 'Shatter multi-HP yellow barriers while dodging Gaster Blaster crossfire'
  },
  {
    id: 'gasterDualFinale',
    index: 14,
    title: 'Enigmatic Dual Finale',
    phase: 4,
    soulMode: 'red',
    desc: 'Red, Green, Yellow & Blue SOUL gauntlet under Gaster & Sans command'
  }
];

const NOOP_API = {
  soul: { x: 320, y: 308, vx: 0, vy: 0, mode: 'red', shieldDir: 'up' },
  slamSoul() {},
  setSoulMode() {},
  setBoxOffset() {},
  addScreenShake() {},
  enterClimaxSleep() {}
};

function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distPointToBox(px, py, x, y, w, h) {
  const cx = Math.max(x, Math.min(px, x + w));
  const cy = Math.max(y, Math.min(py, y + h));
  return Math.hypot(px - cx, py - cy);
}

function colorHitsSoul(color, moving) {
  if (color === 'green') return false;
  if (color === 'blue') return moving;
  if (color === 'orange') return !moving;
  return true;
}

export function aimAngleTo(bx, by, tx, ty) {
  // Matches drawGasterBlaster local +Y beam direction: (-sin(a), cos(a))
  return Math.atan2(-(tx - bx), ty - by);
}

export class AttackRunner {
  constructor() {
    this.reset();
  }

  reset() {
    this.id = 'openingBadTime';
    this.turnIndex = 0;
    this.phase = 1;
    this.elapsed = 0;
    this.duration = 9.0;
    this.speedMult = 1.0;
    this.finished = false;

    this.targetBoxW = 190;
    this.targetBoxH = 170;
    this.initialSoulMode = 'red';
    this.initialGravity = 'down';
    this.boxOffsetX = 0;
    this.boxOffsetY = 0;
    this._boxMotionFn = null;
    this.gasterActive = false;

    this.bones = [];
    this.platforms = [];
    this.blasters = [];
    this.wheels = [];
    this.spears = [];
    this.destructibles = [];
    this.shots = [];
    this.warnings = [];
    this.scheduled = [];
    this.blackoutFlash = 0;
    this.grazeCooldown = 0;
    this.pendingGraze = 0;
    this.targetsBroken = 0;
    this.spawnGreenBonus = false;
    this.isClimaxTurn = false;
    this.climaxSleepReady = false;
  }

  start(attackId, options = {}) {
    this.reset();
    this.id = ATTACK_NAMES.includes(attackId) ? attackId : ATTACK_NAMES[0];
    this.phase = options.phase || 1;
    this.speedMult = options.speedMult || 1.0;
    this.spawnGreenBonus = Boolean(options.spawnGreenBonus);

    const builder = ATTACK_BUILDERS[this.id];
    if (builder) {
      builder(this, options);
    }

    if (this.spawnGreenBonus && this.id !== 'finalGambitAndSleep') {
      this._at(2.4, (ctx, api) => {
        if (ctx.initialSoulMode === 'green') {
          ctx.spawnSpear({
            dir: 'left',
            cx: api?.soul?.x ?? ctx.boxCenterX(options),
            cy: api?.soul?.y ?? ctx.boxCenterY(options),
            dist: 195,
            speed: 175,
            color: 'green'
          });
        } else {
          ctx.spawnBone({
            x: ctx.boxRight(options) + 20,
            y: ctx.boxBottom(options) - 56,
            w: 12,
            h: 36,
            vx: -145,
            vy: 0,
            color: 'green',
            orientation: 'vertical'
          });
        }
      });
    }
  }

  setBoxMotion(fn) {
    this._boxMotionFn = fn;
  }

  boxCenterX(opts) {
    return opts.boxCX ?? 320;
  }

  boxCenterY(opts) {
    return opts.boxCY ?? 308;
  }

  boxLeft(opts) {
    return this.boxCenterX(opts) - this.targetBoxW / 2;
  }

  boxRight(opts) {
    return this.boxCenterX(opts) + this.targetBoxW / 2;
  }

  boxTop(opts) {
    return this.boxCenterY(opts) - this.targetBoxH / 2;
  }

  boxBottom(opts) {
    return this.boxCenterY(opts) + this.targetBoxH / 2;
  }

  _at(timeSec, fn) {
    this.scheduled.push({ time: timeSec, fn, fired: false });
  }

  spawnBone(cfg) {
    this.bones.push({
      x: cfg.x,
      y: cfg.y,
      w: cfg.w ?? 10,
      h: cfg.h ?? 40,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      color: cfg.color ?? 'white', // white, blue, orange, green
      orientation: cfg.orientation ?? 'vertical',
      life: cfg.life ?? 12,
      age: 0,
      waveAmp: cfg.waveAmp ?? 0,
      waveFreq: cfg.waveFreq ?? 0,
      baseY: cfg.y,
      collected: false
    });
  }

  spawnPlatform(cfg) {
    this.platforms.push({
      x: cfg.x,
      y: cfg.y,
      w: cfg.w ?? 60,
      h: cfg.h ?? 8,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      life: cfg.life ?? 12,
      age: 0,
      color: cfg.color ?? '#33e65a'
    });
  }

  spawnWarning(cfg) {
    this.warnings.push({
      x: cfg.x,
      y: cfg.y,
      w: cfg.w,
      h: cfg.h,
      timer: cfg.duration ?? 0.45,
      maxTimer: cfg.duration ?? 0.45,
      color: cfg.color ?? '#ff2a2a',
      label: cfg.label ?? '!'
    });
  }

  spawnBlaster(cfg) {
    const startX = cfg.startX ?? (cfg.x < 320 ? -60 : 700);
    const startY = cfg.startY ?? -60;
    this.blasters.push({
      x: startX,
      y: startY,
      targetX: cfg.x,
      targetY: cfg.y,
      angle: cfg.startAngle ?? cfg.angle ?? 0,
      targetAngle: cfg.angle ?? 0,
      scale: cfg.scale ?? 1.0,
      chargeTime: cfg.chargeTime ?? 0.55,
      fireTime: cfg.fireTime ?? 0.42,
      age: 0,
      jawOpen: 0,
      beamActive: false,
      beamHalfWidth: (cfg.scale ?? 1.0) * 14,
      chargedSfx: false,
      firedSfx: false,
      dead: false
    });
  }

  spawnWheel(cfg) {
    this.wheels.push({
      x: cfg.x,
      y: cfg.y,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      radius: cfg.radius ?? 26,
      angle: cfg.angle ?? 0,
      vAngle: cfg.vAngle ?? 2.4,
      spokes: cfg.spokes ?? 4,
      color: cfg.color ?? 'white',
      life: cfg.life ?? 10,
      age: 0,
      waveAmpX: cfg.waveAmpX ?? 0,
      waveFreqX: cfg.waveFreqX ?? 0,
      waveAmpY: cfg.waveAmpY ?? 0,
      waveFreqY: cfg.waveFreqY ?? 0,
      baseX: cfg.x,
      baseY: cfg.y
    });
  }

  spawnSpear(cfg) {
    const dir = cfg.dir ?? 'up';
    const speed = cfg.speed ?? 210;
    const dist = cfg.dist ?? 195;
    const cx = cfg.cx ?? 320;
    const cy = cfg.cy ?? 308;

    let x = cfg.x;
    let y = cfg.y;
    let vx = cfg.vx;
    let vy = cfg.vy;

    if (dir === 'up') {
      if (x === undefined) x = cx;
      if (y === undefined) y = cy - dist;
      if (vx === undefined) vx = 0;
      if (vy === undefined) vy = speed;
    } else if (dir === 'down') {
      if (x === undefined) x = cx;
      if (y === undefined) y = cy + dist;
      if (vx === undefined) vx = 0;
      if (vy === undefined) vy = -speed;
    } else if (dir === 'left') {
      if (x === undefined) x = cx - dist;
      if (y === undefined) y = cy;
      if (vx === undefined) vx = speed;
      if (vy === undefined) vy = 0;
    } else {
      if (x === undefined) x = cx + dist;
      if (y === undefined) y = cy;
      if (vx === undefined) vx = -speed;
      if (vy === undefined) vy = 0;
    }

    this.spears.push({
      x,
      y,
      vx,
      vy,
      dir,
      color: cfg.color ?? 'cyan',
      blocked: false,
      hit: false,
      speed,
      age: 0,
      life: cfg.life ?? 6
    });
  }

  spawnDestructible(cfg) {
    const hp = cfg.hp ?? 1;
    const w = cfg.w ?? 28;
    const h = cfg.h ?? 18;
    this.destructibles.push({
      x: cfg.x,
      y: cfg.y,
      w,
      h,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      hp,
      maxHp: cfg.maxHp ?? hp,
      color: cfg.color ?? 'yellow',
      life: cfg.life ?? 12,
      age: 0,
      flashTimer: 0,
      orientation: cfg.orientation ?? (w >= h ? 'horizontal' : 'vertical')
    });
  }

  spawnPlayerShot(x, y) {
    this.shots.push({
      x,
      y,
      vy: -440,
      life: 1.4,
      age: 0
    });
    audio.yellowShot();
  }

  update(dt, battleApi) {
    const stepDt = dt * this.speedMult;
    this.elapsed += stepDt;
    const api = battleApi
      ? {
          soul: battleApi.soul ?? NOOP_API.soul,
          slamSoul: (dir) => battleApi.slamSoul?.(dir),
          setSoulMode: (mode, gravity) => battleApi.setSoulMode?.(mode, gravity),
          setBoxOffset: (ox, oy) => battleApi.setBoxOffset?.(ox, oy),
          addScreenShake: (amount) => battleApi.addScreenShake?.(amount),
          enterClimaxSleep: () => battleApi.enterClimaxSleep?.()
        }
      : NOOP_API;

    if (this.blackoutFlash > 0) {
      this.blackoutFlash = Math.max(0, this.blackoutFlash - dt);
    }
    if (this.grazeCooldown > 0) {
      this.grazeCooldown = Math.max(0, this.grazeCooldown - dt);
    }

    // Dynamic moving Battle Box animation
    if (this._boxMotionFn) {
      const nextOffset = this._boxMotionFn(this.elapsed, this.duration);
      const nx = (nextOffset?.x ?? 0) || 0;
      const ny = (nextOffset?.y ?? 0) || 0;
      if (nx !== this.boxOffsetX || ny !== this.boxOffsetY) {
        this.boxOffsetX = nx;
        this.boxOffsetY = ny;
        battleApi?.setBoxOffset?.(this.boxOffsetX, this.boxOffsetY);
      }
    }

    // Trigger scheduled timeline events
    for (const ev of this.scheduled) {
      if (!ev.fired && this.elapsed >= ev.time) {
        ev.fired = true;
        ev.fn(this, api);
      }
    }

    // Update warnings
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      this.warnings[i].timer -= stepDt;
      if (this.warnings[i].timer <= 0) {
        this.warnings.splice(i, 1);
      }
    }

    // Update platforms
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      p.age += stepDt;
      p.x += p.vx * stepDt;
      p.y += p.vy * stepDt;
      if (p.age >= p.life || p.x + p.w < -120 || p.x > 760) {
        this.platforms.splice(i, 1);
      }
    }

    // Update bones
    for (let i = this.bones.length - 1; i >= 0; i--) {
      const b = this.bones[i];
      b.age += stepDt;
      b.x += b.vx * stepDt;
      if (b.waveAmp !== 0) {
        b.y = b.baseY + Math.sin(b.age * b.waveFreq) * b.waveAmp;
      } else {
        b.y += b.vy * stepDt;
      }
      if (b.collected || b.age >= b.life || b.x + b.w < -160 || b.x > 800 || b.y + b.h < -160 || b.y > 640) {
        this.bones.splice(i, 1);
      }
    }

    // Update rotating bone wheels
    for (let i = this.wheels.length - 1; i >= 0; i--) {
      const w = this.wheels[i];
      w.age += stepDt;
      w.angle += w.vAngle * stepDt;
      w.baseX += w.vx * stepDt;
      w.baseY += w.vy * stepDt;
      w.x = w.baseX + (w.waveAmpX ? Math.sin(w.age * w.waveFreqX) * w.waveAmpX : 0);
      w.y = w.baseY + (w.waveAmpY ? Math.sin(w.age * w.waveFreqY) * w.waveAmpY : 0);
      if (
        w.age >= w.life ||
        w.x + w.radius < -160 ||
        w.x - w.radius > 800 ||
        w.y + w.radius < -160 ||
        w.y - w.radius > 640
      ) {
        this.wheels.splice(i, 1);
      }
    }

    // Update spears
    for (let i = this.spears.length - 1; i >= 0; i--) {
      const sp = this.spears[i];
      sp.age += stepDt;
      sp.x += sp.vx * stepDt;
      sp.y += sp.vy * stepDt;
      if (
        sp.blocked ||
        sp.hit ||
        sp.age >= sp.life ||
        sp.x < -120 ||
        sp.x > 760 ||
        sp.y < -120 ||
        sp.y > 600
      ) {
        this.spears.splice(i, 1);
      }
    }

    // Update destructible yellow targets
    for (let i = this.destructibles.length - 1; i >= 0; i--) {
      const d = this.destructibles[i];
      d.age += stepDt;
      d.x += d.vx * stepDt;
      d.y += d.vy * stepDt;
      if (d.flashTimer > 0) d.flashTimer = Math.max(0, d.flashTimer - dt);
      if (d.age >= d.life || d.x + d.w < -160 || d.x > 800 || d.y + d.h < -160 || d.y > 640) {
        this.destructibles.splice(i, 1);
      }
    }

    // Update player Yellow SOUL shots & check collisions vs destructibles
    for (let si = this.shots.length - 1; si >= 0; si--) {
      const sh = this.shots[si];
      sh.age += stepDt;
      sh.y += sh.vy * stepDt;

      let consumed = false;
      for (let di = this.destructibles.length - 1; di >= 0; di--) {
        const d = this.destructibles[di];
        const hitTarget =
          sh.x + 5 > d.x &&
          sh.x - 5 < d.x + d.w &&
          sh.y + 8 > d.y &&
          sh.y - 8 < d.y + d.h;
        if (!hitTarget) continue;

        consumed = true;
        d.hp -= 1;
        d.flashTimer = 0.08;
        if (d.hp <= 0) {
          this.destructibles.splice(di, 1);
          this.targetsBroken += 1;
          audio.targetBreak();
          this.pendingGraze += 1;
        } else {
          audio.graze();
        }
        break;
      }

      if (consumed || sh.age >= sh.life || sh.y < -40) {
        this.shots.splice(si, 1);
      }
    }

    // Update Gaster Blasters
    for (let i = this.blasters.length - 1; i >= 0; i--) {
      const gb = this.blasters[i];
      gb.age += stepDt;

      const arriveT = Math.min(1, gb.age / 0.28);
      const ease = 1 - Math.pow(1 - arriveT, 3);
      gb.x = gb.x + (gb.targetX - gb.x) * Math.min(1, stepDt * 14);
      gb.y = gb.y + (gb.targetY - gb.y) * Math.min(1, stepDt * 14);

      let diff = gb.targetAngle - gb.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      gb.angle += diff * Math.min(1, stepDt * 12);

      if (!gb.chargedSfx && gb.age >= 0.08) {
        gb.chargedSfx = true;
        audio.blasterCharge();
      }

      if (gb.age < gb.chargeTime) {
        gb.jawOpen = ease * 0.35 + (gb.age / gb.chargeTime) * 0.25;
        gb.beamActive = false;
      } else if (gb.age < gb.chargeTime + gb.fireTime) {
        gb.jawOpen = 1.0;
        gb.beamActive = true;
        if (!gb.firedSfx) {
          gb.firedSfx = true;
          audio.blasterFire();
          battleApi?.addScreenShake?.(7);
        }
        const bxDir = -Math.sin(gb.angle);
        const byDir = Math.cos(gb.angle);
        gb.x -= bxDir * 35 * stepDt;
        gb.y -= byDir * 35 * stepDt;
        gb.targetX = gb.x;
        gb.targetY = gb.y;
      } else {
        gb.beamActive = false;
        gb.jawOpen = Math.max(0, gb.jawOpen - stepDt * 4);
        const bxDir = -Math.sin(gb.angle);
        const byDir = Math.cos(gb.angle);
        gb.x -= bxDir * 420 * stepDt;
        gb.y -= byDir * 420 * stepDt;
        gb.targetX = gb.x;
        gb.targetY = gb.y;
        if (gb.age > gb.chargeTime + gb.fireTime + 0.45) {
          this.blasters.splice(i, 1);
        }
      }
    }

    if (!this.isClimaxTurn && this.elapsed >= this.duration) {
      if (this.boxOffsetX !== 0 || this.boxOffsetY !== 0) {
        this.boxOffsetX = 0;
        this.boxOffsetY = 0;
        battleApi?.setBoxOffset?.(0, 0);
      }
      this.finished = true;
    }
  }

  checkCollisions(soul, box) {
    const r = 5.2;
    const sx = soul.x;
    const sy = soul.y;
    const speed = Math.hypot(soul.vx ?? 0, soul.vy ?? 0);
    const moving = speed > 18 || Boolean(soul.inputMoving);

    let hit = false;
    let healed = 0;
    let grazed = this.pendingGraze;
    this.pendingGraze = 0;
    let blocked = 0;
    let nearHazard = false;

    // 1. Bones
    for (const b of this.bones) {
      if (b.collected) continue;
      const dist = distPointToBox(sx, sy, b.x, b.y, b.w, b.h);
      if (b.color !== 'green' && dist <= 20) {
        nearHazard = true;
      }
      if (dist >= r) continue;

      if (b.color === 'green') {
        b.collected = true;
        healed += 4;
      } else if (colorHitsSoul(b.color, moving)) {
        hit = true;
      }
    }

    // 2. Gaster Blaster beams
    for (const gb of this.blasters) {
      if (!gb.beamActive) continue;
      const dirX = -Math.sin(gb.angle);
      const dirY = Math.cos(gb.angle);
      const ox = gb.x + dirX * 12;
      const oy = gb.y + dirY * 12;
      const dx = sx - ox;
      const dy = sy - oy;
      const proj = dx * dirX + dy * dirY;
      if (proj >= -10 && proj <= 900) {
        const perp = Math.abs(dx * -dirY + dy * dirX);
        if (perp < gb.beamHalfWidth + 20) {
          nearHazard = true;
        }
        if (proj >= 0 && perp < gb.beamHalfWidth + r - 2) {
          hit = true;
        }
      }
    }

    // 3. Rotating Bone Wheels (hub + spoke segment checks)
    for (const w of this.wheels) {
      const centerDist = Math.hypot(sx - w.x, sy - w.y);
      if (centerDist > w.radius + 22) continue;

      let minDist = centerDist - 5; // hub radius ~5px
      for (let k = 0; k < w.spokes; k++) {
        const theta = w.angle + (k * Math.PI * 2) / w.spokes;
        const tipX = w.x + Math.cos(theta) * w.radius;
        const tipY = w.y + Math.sin(theta) * w.radius;
        const segDist = distPointToSegment(sx, sy, w.x, w.y, tipX, tipY) - 2.6;
        if (segDist < minDist) minDist = segDist;
      }

      if (w.color !== 'green' && minDist <= 20) {
        nearHazard = true;
      }
      if (minDist < r && colorHitsSoul(w.color, moving)) {
        hit = true;
      }
    }

    // 4. Directional Spears (Green SOUL shield deflection + core contact)
    for (const sp of this.spears) {
      if (sp.blocked || sp.hit) continue;
      const dist = Math.hypot(sp.x - sx, sp.y - sy);
      if (soul.mode === 'green' && sp.dir === soul.shieldDir && dist <= 32) {
        sp.blocked = true;
        blocked += 1;
        audio.shieldBlock();
        if (sp.color === 'green') {
          healed += 4;
        }
        continue;
      }
      if (dist <= 11) {
        sp.hit = true;
        hit = true;
      }
    }

    // 5. Destructible yellow targets (contact hurts)
    for (const d of this.destructibles) {
      const dist = distPointToBox(sx, sy, d.x, d.y, d.w, d.h);
      if (dist <= 20) nearHazard = true;
      if (dist < r) hit = true;
    }

    // 6. Grazing reward
    if (!hit && nearHazard && this.grazeCooldown <= 0) {
      grazed += 1;
      this.grazeCooldown = 0.16;
      audio.graze();
    }

    return { hit, healed, grazed, blocked };
  }

  renderInsideBox(ctx, box) {
    // Warnings inside the box
    for (const w of this.warnings) {
      const blink = Math.floor(w.timer * 18) % 2 === 0;
      ctx.save();
      ctx.fillStyle = blink ? 'rgba(255, 35, 35, 0.35)' : 'rgba(255, 220, 40, 0.25)';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = blink ? '#ff2a2a' : '#ffef3f';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      if (w.label) {
        ctx.fillStyle = blink ? '#ff2a2a' : '#ffffff';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(w.label, w.x + w.w / 2, w.y + w.h / 2);
      }
      ctx.restore();
    }

    // Platforms
    for (const p of this.platforms) {
      ctx.save();
      ctx.fillStyle = '#1b5e2e';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), 3);
      ctx.restore();
    }

    // Hazards & Yellow shots clipped cleanly inside battle box
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
    ctx.clip();

    for (const b of this.bones) {
      if (!b.collected) {
        drawBone(ctx, b.x, b.y, b.w, b.h, b.color, b.orientation);
      }
    }

    for (const w of this.wheels) {
      drawBoneWheel(ctx, w.x, w.y, w.radius, w.angle, w.spokes, w.color);
    }

    for (const d of this.destructibles) {
      const tint = d.flashTimer > 0 ? 'white' : (d.color || 'yellow');
      drawBone(ctx, d.x, d.y, d.w, d.h, tint, d.orientation);
      if (d.hp < d.maxHp || d.maxHp > 1) {
        // Cracked target notch & HP indicator for multi-HP blocks
        ctx.save();
        ctx.strokeStyle = '#1a1200';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x + d.w * 0.35, d.y + 2);
        ctx.lineTo(d.x + d.w * 0.5, d.y + d.h * 0.55);
        ctx.lineTo(d.x + d.w * 0.65, d.y + d.h - 2);
        ctx.stroke();
        if (d.maxHp > 1) {
          ctx.fillStyle = '#fff55a';
          ctx.font = 'bold 8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(d.hp), d.x + d.w / 2, d.y + d.h / 2);
        }
        ctx.restore();
      }
    }

    for (const sh of this.shots) {
      ctx.save();
      ctx.fillStyle = '#fff55a';
      ctx.fillRect(Math.round(sh.x - 2), Math.round(sh.y - 7), 4, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sh.x - 1), Math.round(sh.y - 5), 2, 10);
      ctx.restore();
    }

    ctx.restore();
  }

  renderOverlay(ctx) {
    // Incoming Green SOUL spears render above box border so players read them outside the box
    for (const sp of this.spears) {
      if (!sp.blocked && !sp.hit) {
        drawSpear(ctx, sp.x, sp.y, sp.dir, sp.color);
      }
    }

    // Gaster Blasters render above the Battle Box border
    for (const gb of this.blasters) {
      const chargeRatio = gb.beamActive ? 1 : Math.min(1, gb.age / gb.chargeTime);
      drawGasterBlaster(
        ctx,
        gb.x,
        gb.y,
        gb.angle,
        gb.scale,
        gb.jawOpen,
        chargeRatio,
        gb.beamActive,
        850
      );
    }

    if (this.blackoutFlash > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 640, 480);
    }
  }
}

// --- Shared Pattern Helpers ---

function scheduleSpearVolley(a, opts, entries) {
  for (const e of entries) {
    a._at(e.t, (_, api) => {
      a.spawnSpear({
        dir: e.dir,
        cx: api?.soul?.x ?? a.boxCenterX(opts),
        cy: api?.soul?.y ?? a.boxCenterY(opts),
        dist: e.dist ?? 200,
        speed: e.speed ?? 210,
        color: e.color ?? 'cyan'
      });
    });
  }
}

function scheduleCrackedRow(a, opts, timeSec, cfg = {}) {
  const L = a.boxLeft(opts);
  const T = a.boxTop(opts);
  const count = cfg.count ?? 6;
  const gap = cfg.gap ?? 3;
  const startX = cfg.startX ?? L + 6;
  const spanW = cfg.spanW ?? a.targetBoxW - 12;
  const blockW = Math.floor((spanW - gap * (count - 1)) / count);
  const blockH = cfg.h ?? 18;
  const vy = cfg.vy ?? 72;
  const y = cfg.y ?? T + 4;

  a._at(timeSec, () => {
    for (let i = 0; i < count; i++) {
      const hp = typeof cfg.hpFn === 'function' ? cfg.hpFn(i) : (cfg.hp ?? 1);
      a.spawnDestructible({
        x: startX + i * (blockW + gap),
        y,
        w: blockW,
        h: blockH,
        vx: 0,
        vy,
        hp,
        color: cfg.color ?? 'yellow',
        life: cfg.life ?? 6
      });
    }
  });
}

// --- 15 ATTACK BUILDERS ---

const ATTACK_BUILDERS = {
  // 0. Phase 1: Classic opening bad time (slam down -> floor bones -> sweeping gap -> 4 blasters)
  openingBadTime(a, opts) {
    a.targetBoxW = 220;
    a.targetBoxH = 165;
    a.initialSoulMode = 'blue';
    a.initialGravity = 'down';
    a.duration = 9.8;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    a._at(0.15, (_, api) => {
      api.slamSoul('down');
      a.spawnWarning({ x: L + 3, y: B - 28, w: a.targetBoxW - 6, h: 25, duration: 0.65, label: '!' });
    });

    a._at(0.81, () => {
      for (let bx = L + 6; bx < R - 10; bx += 14) {
        a.spawnBone({ x: bx, y: B - 24, w: 9, h: 24, vx: 0, vy: 0, life: 0.25 });
      }
    });

    a._at(1.85, (_, api) => {
      api.setSoulMode('red');
    });

    for (let i = 0; i < 6; i++) {
      const t = 2.0 + i * 0.56;
      const gapY = T + 48 + (i % 3) * 30;
      const gapHalf = 31;
      a._at(t, () => {
        a.spawnBone({ x: R + 8, y: T, w: 10, h: Math.max(8, gapY - gapHalf - T), vx: -140, vy: 0 });
        a.spawnBone({ x: R + 8, y: gapY + gapHalf, w: 10, h: Math.max(8, B - (gapY + gapHalf)), vx: -140, vy: 0 });
      });
    }

    a._at(5.5, (_, api) => {
      const sx = api.soul.x;
      const sy = api.soul.y;
      a.spawnBlaster({ startX: CX - 270, startY: CY - 230, x: CX - 165, y: CY - 140, angle: aimAngleTo(CX - 165, CY - 140, sx, sy), chargeTime: 0.75, fireTime: 0.42 });
      a.spawnBlaster({ startX: CX + 270, startY: CY - 230, x: CX + 165, y: CY - 140, angle: aimAngleTo(CX + 165, CY - 140, sx, sy), chargeTime: 0.75, fireTime: 0.42 });
    });

    a._at(6.8, (_, api) => {
      const sx = api.soul.x;
      const sy = api.soul.y;
      a.spawnBlaster({ startX: CX - 290, startY: CY, x: CX - 185, y: CY, angle: aimAngleTo(CX - 185, CY, sx, sy), chargeTime: 0.72, fireTime: 0.42 });
      a.spawnBlaster({ startX: CX + 290, startY: CY, x: CX + 185, y: CY, angle: aimAngleTo(CX + 185, CY, sx, sy), chargeTime: 0.72, fireTime: 0.42 });
    });

    a._at(8.1, () => {
      a.spawnBlaster({ startX: CX, startY: T - 170, x: CX, y: T - 70, angle: 0, scale: 1.08, chargeTime: 0.72, fireTime: 0.45 });
    });
  },

  // 1. Phase 1: Blue Stop Signs, Orange Motion Gates & White Jumps
  blueStopSigns(a, opts) {
    a.targetBoxW = 290;
    a.targetBoxH = 140;
    a.initialSoulMode = 'blue';
    a.initialGravity = 'down';
    a.duration = 9.4;

    const R = a.boxRight(opts);
    const B = a.boxBottom(opts);

    const sequence = [
      { t: 0.40, color: 'white', h: 26 },
      { t: 1.50, color: 'blue', h: 116 },
      { t: 2.65, color: 'white', h: 28 },
      { t: 3.75, color: 'blue', h: 116 },
      { t: 4.90, color: 'white', h: 26 },
      { t: 5.95, color: 'white', h: 28 },
      { t: 7.05, color: 'orange', h: 116 }
    ];

    for (const s of sequence) {
      a._at(s.t, () => {
        a.spawnBone({
          x: R + 12,
          y: B - s.h,
          w: 11,
          h: s.h,
          vx: -155,
          vy: 0,
          color: s.color
        });
      });
    }
  },

  // 2. Phase 1: Platform Peril
  platformPeril(a, opts) {
    a.targetBoxW = 340;
    a.targetBoxH = 160;
    a.initialSoulMode = 'blue';
    a.initialGravity = 'down';
    a.duration = 10.8;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const lowDeck = B - 46;
    const highDeck = B - 76;

    a._at(0.0, () => {
      a.spawnPlatform({ x: L + 90, y: lowDeck, w: 135, h: 8, vx: 0, vy: 0, life: 2.6 });
      a.spawnWarning({ x: L + 3, y: B - 22, w: a.targetBoxW - 6, h: 19, duration: 0.70, label: 'FLOOR' });
    });

    for (let t = 0.72; t < 10.1; t += 0.85) {
      a._at(t, () => {
        for (let bx = L + 6; bx < R - 8; bx += 16) {
          a.spawnBone({ x: bx, y: B - 20, w: 10, h: 20, vx: 0, vy: 0, life: 0.90 });
        }
      });
    }

    const deckHeights = [lowDeck, highDeck, lowDeck, lowDeck, highDeck, lowDeck, highDeck, lowDeck];
    deckHeights.forEach((py, i) => {
      const t = 0.35 + i * 1.05;
      a._at(t, () => {
        a.spawnPlatform({
          x: R + 4,
          y: py,
          w: 78,
          h: 8,
          vx: -100,
          life: 5.5
        });
      });
    });

    a._at(8.3, () => {
      a.spawnPlatform({ x: L + 90, y: lowDeck, w: 150, h: 8, vx: 0, vy: 0, life: 2.7 });
    });

    a._at(1.55, () => {
      a.spawnBone({ x: R + 10, y: lowDeck - 24, w: 10, h: 24, vx: -155, color: 'white' });
    });
    a._at(2.40, () => {
      a.spawnBone({ x: R + 10, y: T, w: 11, h: 54, vx: -150, color: 'white' });
    });
    a._at(3.10, () => {
      a.spawnBone({ x: R + 10, y: T, w: 11, h: a.targetBoxH - 22, vx: -155, color: 'blue' });
    });
    a._at(4.45, () => {
      a.spawnBone({ x: R + 10, y: lowDeck - 25, w: 10, h: 25, vx: -155, color: 'white' });
    });

    a._at(5.45, () => {
      a.spawnBlaster({
        startX: R + 150,
        startY: B - 38,
        x: R + 75,
        y: B - 38,
        angle: Math.PI / 2,
        scale: 0.82,
        chargeTime: 0.78,
        fireTime: 0.42
      });
    });

    a._at(7.05, () => {
      a.spawnBlaster({
        startX: L - 150,
        startY: T + 42,
        x: L - 75,
        y: T + 42,
        angle: -Math.PI / 2,
        scale: 0.85,
        chargeTime: 0.78,
        fireTime: 0.42
      });
    });

    a._at(8.45, () => {
      a.spawnBone({ x: R + 10, y: T, w: 11, h: a.targetBoxH - 22, vx: -160, color: 'orange' });
    });
    a._at(9.15, () => {
      a.spawnBone({ x: R + 10, y: lowDeck - 25, w: 10, h: 25, vx: -160, color: 'white' });
    });
  },

  // 3. Phase 1: Blaster Carousel (Red SOUL)
  blasterCarousel(a, opts) {
    a.targetBoxW = 190;
    a.targetBoxH = 190;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 9.6;

    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    for (let i = 0; i < 8; i++) {
      const t = 0.5 + i * 0.78;
      a._at(t, (_, api) => {
        const theta = (i * Math.PI) / 4;
        const bx = CX + Math.cos(theta) * 165;
        const by = CY + Math.sin(theta) * 145;
        a.spawnBlaster({
          startX: bx + Math.cos(theta) * 110,
          startY: by + Math.sin(theta) * 110,
          x: bx,
          y: by,
          angle: aimAngleTo(bx, by, api.soul.x, api.soul.y),
          scale: 0.90,
          chargeTime: 0.75,
          fireTime: 0.36
        });
      });
    }

    a._at(7.4, () => {
      a.spawnBlaster({ startX: CX - 260, startY: CY, x: CX - 165, y: CY, angle: -Math.PI / 2, chargeTime: 0.75, fireTime: 0.45 });
      a.spawnBlaster({ startX: CX, startY: CY - 250, x: CX, y: CY - 155, angle: 0, chargeTime: 0.75, fireTime: 0.45 });
    });
  },

  // 4. Phase 1: Four-Way Gravity Slam
  fourWaySlam(a, opts) {
    a.targetBoxW = 185;
    a.targetBoxH = 185;
    a.initialSoulMode = 'blue';
    a.initialGravity = 'down';
    a.duration = 9.8;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);

    const slams = [
      { t: 0.4, dir: 'down', warn: { x: L + 3, y: B - 28, w: 179, h: 25 } },
      { t: 2.1, dir: 'left', warn: { x: L + 3, y: T + 3, w: 25, h: 179 } },
      { t: 3.8, dir: 'up', warn: { x: L + 3, y: T + 3, w: 179, h: 25 } },
      { t: 5.5, dir: 'right', warn: { x: R - 28, y: T + 3, w: 25, h: 179 } },
      { t: 7.2, dir: 'down', warn: { x: L + 3, y: B - 28, w: 179, h: 25 } }
    ];

    for (const s of slams) {
      a._at(s.t, (_, api) => {
        api.slamSoul(s.dir);
        a.spawnWarning({ ...s.warn, duration: 0.65, label: '!' });
      });

      a._at(s.t + 0.66, () => {
        if (s.dir === 'down') {
          for (let bx = L + 6; bx < R - 10; bx += 14) {
            a.spawnBone({ x: bx, y: B - 24, w: 9, h: 24, life: 0.25 });
          }
        } else if (s.dir === 'up') {
          for (let bx = L + 6; bx < R - 10; bx += 14) {
            a.spawnBone({ x: bx, y: T, w: 9, h: 24, life: 0.25 });
          }
        } else if (s.dir === 'left') {
          for (let by = T + 6; by < B - 10; by += 14) {
            a.spawnBone({ x: L, y: by, w: 24, h: 9, orientation: 'horizontal', life: 0.25 });
          }
        } else if (s.dir === 'right') {
          for (let by = T + 6; by < B - 10; by += 14) {
            a.spawnBone({ x: R - 24, y: by, w: 24, h: 9, orientation: 'horizontal', life: 0.25 });
          }
        }
      });
    }
  },

  // 5. Phase 2: Sine Bone Tunnel + Orange/Blue Gates + Dynamic Swaying Battle Box
  sineBoneTunnel(a, opts) {
    a.targetBoxW = 250;
    a.targetBoxH = 165;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 9.8;

    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CY = a.boxCenterY(opts);

    a.setBoxMotion((t, dur) => {
      const env = Math.min(1, t / 0.9) * Math.min(1, Math.max(0, (dur - 0.8 - t) / 0.8));
      return {
        x: Math.sin(t * 1.45) * 22 * env,
        y: Math.sin(t * 2.1) * 12 * env
      };
    });

    for (let i = 0; i < 18; i++) {
      const t = 0.35 + i * 0.42;
      a._at(t, () => {
        const wave = Math.sin(i * 0.65) * 34;
        const gapCenter = CY + wave;
        const gapHalf = 30;
        const topStart = T - 24;
        const botEnd = B + 24;
        a.spawnBone({ x: R + 32, y: topStart, w: 10, h: Math.max(8, gapCenter - gapHalf - topStart), vx: -155 });
        a.spawnBone({ x: R + 32, y: gapCenter + gapHalf, w: 10, h: Math.max(8, botEnd - (gapCenter + gapHalf)), vx: -155 });

        if (i === 5 || i === 14) {
          a.spawnBone({ x: R + 52, y: T - 24, w: 10, h: a.targetBoxH + 48, vx: -155, color: 'orange' });
        } else if (i === 10) {
          a.spawnBone({ x: R + 52, y: T - 24, w: 10, h: a.targetBoxH + 48, vx: -155, color: 'blue' });
        }
      });
    }
  },

  // 6. Phase 2: Green Shield Barrage (Undyne-style rhythmic spear deflection)
  greenShieldBarrage(a, opts) {
    a.targetBoxW = 112;
    a.targetBoxH = 112;
    a.initialSoulMode = 'green';
    a.initialGravity = 'down';
    a.duration = 10.4;

    const L = a.boxLeft(opts);
    const T = a.boxTop(opts);
    a._at(0.05, () => {
      a.spawnWarning({ x: L + 8, y: T + 8, w: a.targetBoxW - 16, h: 24, duration: 0.55, color: '#33e65a', label: 'SHIELD' });
    });

    scheduleSpearVolley(a, opts, [
      // Wave 1: Steady clockwise cardinal warmup (0.50s spacing)
      { t: 0.50, dir: 'up', speed: 185, color: 'cyan' },
      { t: 1.00, dir: 'right', speed: 185, color: 'cyan' },
      { t: 1.50, dir: 'down', speed: 185, color: 'cyan' },
      { t: 2.00, dir: 'left', speed: 185, color: 'cyan' },
      // Wave 2: Opposite pair rhythms (leave ~2.4s open for optional green bonus)
      { t: 2.85, dir: 'up', speed: 200, color: 'cyan' },
      { t: 3.30, dir: 'down', speed: 200, color: 'cyan' },
      { t: 3.75, dir: 'left', speed: 200, color: 'cyan' },
      { t: 4.20, dir: 'right', speed: 200, color: 'cyan' },
      { t: 4.65, dir: 'left', speed: 200, color: 'cyan' },
      // Mid-attack healing green spear
      { t: 5.20, dir: 'down', speed: 175, color: 'green' },
      // Wave 3: Counter-clockwise spin + snappy red accents (0.36s spacing)
      { t: 5.95, dir: 'up', speed: 215, color: 'cyan' },
      { t: 6.32, dir: 'left', speed: 215, color: 'cyan' },
      { t: 6.69, dir: 'down', speed: 215, color: 'cyan' },
      { t: 7.06, dir: 'right', speed: 215, color: 'cyan' },
      { t: 7.50, dir: 'left', speed: 225, color: 'red' },
      { t: 7.88, dir: 'right', speed: 225, color: 'red' },
      { t: 8.26, dir: 'up', speed: 220, color: 'cyan' },
      { t: 8.64, dir: 'down', speed: 220, color: 'cyan' },
      { t: 9.02, dir: 'up', speed: 220, color: 'red' }
    ]);
  },

  // 7. Phase 2: Bone Wheel Lab (Rotating bone wheels + Dynamic Moving Box)
  boneWheelLab(a, opts) {
    a.targetBoxW = 240;
    a.targetBoxH = 175;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 10.4;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    a.setBoxMotion((t, dur) => {
      const env = Math.min(1, t / 0.9) * Math.min(1, Math.max(0, (dur - 0.8 - t) / 0.8));
      return {
        x: Math.sin(t * 1.25) * 26 * env,
        y: Math.cos(t * 1.8) * 14 * env
      };
    });

    // Twin upper/lower wheels leaving wide central path
    a._at(0.40, () => {
      a.spawnWheel({ x: R + 45, y: CY - 38, vx: -108, radius: 26, vAngle: 2.3, spokes: 4, color: 'white' });
      a.spawnWheel({ x: L - 45, y: CY + 38, vx: 108, radius: 26, vAngle: -2.3, spokes: 4, color: 'white' });
    });

    // Slow wide 3-spoke Ferris wheel crossing middle
    a._at(2.35, () => {
      a.spawnWheel({ x: R + 50, y: CY, vx: -95, radius: 34, vAngle: 1.85, spokes: 3, color: 'white' });
    });

    // Blue wheel sweep (pause moving as spokes pass, or dodge edges)
    a._at(4.15, () => {
      a.spawnWheel({ x: L - 50, y: CY, vx: 112, radius: 32, vAngle: -2.1, spokes: 4, color: 'blue' });
    });

    // Oscillating lab wheels with wide vertical sway
    a._at(5.55, () => {
      a.spawnWheel({ x: R + 45, y: CY - 16, vx: -96, radius: 22, vAngle: 2.8, spokes: 4, waveAmpY: 26, waveFreqY: 2.5 });
    });
    a._at(6.55, () => {
      a.spawnWheel({ x: L - 45, y: CY + 16, vx: 96, radius: 22, vAngle: -2.8, spokes: 4, waveAmpY: 26, waveFreqY: 2.5 });
    });

    // Final balanced wheels + side warning blaster along top lane
    a._at(7.80, () => {
      a.spawnBlaster({
        startX: CX - 260,
        startY: CY - 46,
        x: L - 72,
        y: CY - 46,
        angle: -Math.PI / 2,
        scale: 0.9,
        chargeTime: 0.78,
        fireTime: 0.42
      });
      a.spawnWheel({ x: R + 45, y: CY + 36, vx: -115, radius: 24, vAngle: 2.5, spokes: 4 });
    });
  },

  // 8. Phase 2: Blackout Flash Cuts
  blackoutCuts(a, opts) {
    a.targetBoxW = 200;
    a.targetBoxH = 170;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 10.2;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    a._at(0.3, () => {
      a.blackoutFlash = 0.14;
      audio.blackout();
    });
    a._at(0.45, (_, api) => {
      api.setSoulMode('blue', 'down');
      api.slamSoul('down');
      a.spawnBone({ x: R + 8, y: B - 38, w: 12, h: 38, vx: -185 });
      a.spawnBone({ x: L - 20, y: B - 38, w: 12, h: 38, vx: 185 });
    });

    a._at(2.8, () => {
      a.bones = [];
      a.blackoutFlash = 0.14;
      audio.blackout();
    });
    a._at(2.95, (_, api) => {
      api.setSoulMode('red');
      a.spawnBlaster({ x: CX - 160, y: CY - 135, angle: aimAngleTo(CX - 160, CY - 135, CX, CY), chargeTime: 0.6, fireTime: 0.42 });
      a.spawnBlaster({ x: CX + 160, y: CY - 135, angle: aimAngleTo(CX + 160, CY - 135, CX, CY), chargeTime: 0.6, fireTime: 0.42 });
    });

    a._at(5.3, () => {
      a.blackoutFlash = 0.14;
      audio.blackout();
    });
    a._at(5.45, () => {
      a.spawnBone({ x: R + 12, y: T, w: 12, h: a.targetBoxH, vx: -190, color: 'orange' });
      a.spawnBone({ x: R + 115, y: T, w: 12, h: a.targetBoxH, vx: -190, color: 'blue' });
      a.spawnBone({ x: R + 225, y: T, w: 12, h: a.targetBoxH, vx: -190, color: 'orange' });
    });

    a._at(7.8, () => {
      a.blackoutFlash = 0.14;
      audio.blackout();
    });
    a._at(7.95, (_, api) => {
      a.spawnBlaster({ x: L - 70, y: CY, angle: aimAngleTo(L - 70, CY, api.soul.x, api.soul.y), scale: 1.05, chargeTime: 0.58, fireTime: 0.45 });
      a.spawnBlaster({ x: R + 70, y: CY, angle: aimAngleTo(R + 70, CY, api.soul.x, api.soul.y), scale: 1.05, chargeTime: 0.58, fireTime: 0.45 });
    });
  },

  // 9. Phase 3: Yellow Shooter Corridor (Justice SOUL vs Destructible Bone Walls)
  yellowShooterCorridor(a, opts) {
    a.targetBoxW = 220;
    a.targetBoxH = 185;
    a.initialSoulMode = 'yellow';
    a.initialGravity = 'down';
    a.duration = 10.6;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);

    a._at(0.05, () => {
      a.spawnWarning({ x: L + 20, y: T + 12, w: a.targetBoxW - 40, h: 26, duration: 0.85, color: '#ffe640', label: 'SHOOT!' });
    });

    // Wave 1: Full-width descending yellow target wall (1 shot opens a clean gap)
    scheduleCrackedRow(a, opts, 0.55, { count: 6, h: 18, vy: 66, hp: 1 });

    // Wave 2: Armored center targets (2 HP) + fragile flank targets (1 HP)
    scheduleCrackedRow(a, opts, 2.75, {
      count: 6,
      h: 18,
      vy: 70,
      hpFn: (i) => (i === 2 || i === 3 ? 2 : 1)
    });

    // Wave 3: Upper target convoy + lower bone hops (middle lane safe while shooting up)
    for (let i = 0; i < 5; i++) {
      a._at(5.05 + i * 0.42, () => {
        a.spawnDestructible({ x: R + 8, y: T + 34, w: 28, h: 20, vx: -108, vy: 0, hp: 1, life: 5 });
      });
    }
    for (let i = 0; i < 3; i++) {
      a._at(5.30 + i * 0.78, () => {
        a.spawnBone({ x: R + 8, y: B - 32, w: 10, h: 32, vx: -120, color: 'white' });
      });
    }

    // Wave 4: Twin armored targets + upper-lane sniper blaster (stay in lower half shooting up)
    a._at(7.45, () => {
      a.spawnDestructible({ x: CX - 64, y: T + 30, w: 34, h: 18, vx: 0, vy: 58, hp: 2 });
      a.spawnDestructible({ x: CX + 30, y: T + 30, w: 34, h: 18, vx: 0, vy: 58, hp: 2 });
    });
    scheduleCrackedRow(a, opts, 8.10, { count: 4, startX: CX - 72, spanW: 144, h: 18, vy: 74, hp: 1 });
    a._at(8.55, () => {
      a.spawnBlaster({
        startX: L - 160,
        startY: T + 26,
        x: L - 72,
        y: T + 26,
        angle: -Math.PI / 2,
        scale: 0.85,
        chargeTime: 0.85,
        fireTime: 0.40
      });
    });
  },

  // 10. Phase 3: Gaster Hand Matrix (W.D. Gaster Interference + Moving Box + Blasters)
  gasterHandMatrix(a, opts) {
    a.targetBoxW = 215;
    a.targetBoxH = 185;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 11.0;
    a.gasterActive = true;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    // Smoothly warp box in Acts 1 & 3 while stabilizing to (0,0) during the Blue Slam Act 2
    a.setBoxMotion((t, dur) => {
      const slamMask = t >= 3.1 && t <= 6.3
        ? 0
        : t < 3.1
          ? Math.min(1, (3.1 - t) / 0.45)
          : Math.min(1, (t - 6.3) / 0.45);
      const env = Math.min(1, t / 0.8) * Math.min(1, Math.max(0, (dur - 0.8 - t) / 0.8)) * slamMask;
      return {
        x: Math.sin(t * 1.9) * 24 * env,
        y: Math.sin(t * 1.15) * 14 * env
      };
    });

    a._at(0.05, () => {
      audio.gasterSpeak();
      a.spawnWarning({ x: L + 18, y: T + 10, w: a.targetBoxW - 36, h: 24, duration: 0.75, color: '#c480ff', label: 'GASTER' });
    });

    // Matrix 1: Alternating vertical gates with generous 60px center openings
    for (let i = 0; i < 3; i++) {
      a._at(0.65 + i * 0.62, () => {
        const gapY = CY + (i % 2 === 0 ? -24 : 24);
        const gapHalf = 30;
        a.spawnBone({ x: R + 28, y: T - 20, w: 10, h: Math.max(8, gapY - gapHalf - (T - 20)), vx: -155 });
        a.spawnBone({ x: R + 28, y: gapY + gapHalf, w: 10, h: Math.max(8, (B + 20) - (gapY + gapHalf)), vx: -155 });
      });
    }

    // Matrix 2: Twin orbiting wheels around center lane (finish crossing before Act 2 slam)
    a._at(1.85, () => {
      a.spawnWheel({ x: L - 36, y: CY - 46, vx: 145, radius: 22, vAngle: 2.6, spokes: 4, color: 'white' });
      a.spawnWheel({ x: R + 36, y: CY + 46, vx: -145, radius: 22, vAngle: -2.6, spokes: 4, color: 'white' });
    });

    // Act 2: Gaster slam down + floor jump
    a._at(3.95, (_, api) => {
      audio.gasterSpeak();
      api.slamSoul('down');
      a.spawnWarning({ x: L + 3, y: B - 28, w: a.targetBoxW - 6, h: 25, duration: 0.65, label: '!' });
    });
    a._at(4.62, () => {
      for (let bx = L + 6; bx < R - 10; bx += 14) {
        a.spawnBone({ x: bx, y: B - 24, w: 9, h: 24, life: 0.25 });
      }
    });
    a._at(5.20, () => {
      a.spawnBone({ x: R + 10, y: B - 28, w: 10, h: 28, vx: -165, color: 'white' });
    });

    // Act 3: Return to Red SOUL + Gaster Blaster matrix pairs
    a._at(6.35, (_, api) => {
      api.setSoulMode('red');
      audio.gasterSpeak();
      a.spawnBlaster({ startX: CX - 250, startY: T - 150, x: CX - 145, y: T - 60, angle: aimAngleTo(CX - 145, T - 60, CX, CY), chargeTime: 0.72, fireTime: 0.42 });
      a.spawnBlaster({ startX: CX + 250, startY: T - 150, x: CX + 145, y: T - 60, angle: aimAngleTo(CX + 145, T - 60, CX, CY), chargeTime: 0.72, fireTime: 0.42 });
    });

    a._at(7.85, () => {
      a.spawnBlaster({ startX: CX - 56, startY: T - 160, x: CX - 56, y: T - 70, angle: 0, scale: 0.95, chargeTime: 0.72, fireTime: 0.44 });
      a.spawnBlaster({ startX: L - 160, startY: CY + 42, x: L - 72, y: CY + 42, angle: -Math.PI / 2, scale: 0.95, chargeTime: 0.72, fireTime: 0.44 });
    });

    a._at(9.35, () => {
      a.spawnBlaster({ startX: CX + 56, startY: T - 160, x: CX + 56, y: T - 70, angle: 0, scale: 0.95, chargeTime: 0.70, fireTime: 0.44 });
      a.spawnBlaster({ startX: R + 160, startY: CY - 42, x: R + 72, y: CY - 42, angle: Math.PI / 2, scale: 0.95, chargeTime: 0.70, fireTime: 0.44 });
    });
  },

  // 11. Phase 3 Climax: Final Gambit -> Sans gets exhausted & falls asleep!
  finalGambitAndSleep(a, opts) {
    a.targetBoxW = 190;
    a.targetBoxH = 165;
    a.initialSoulMode = 'blue';
    a.initialGravity = 'down';
    a.duration = 999; // Ended interactively when player pushes the box or finishes climax!
    a.isClimaxTurn = true;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);

    a._at(0.3, (_, api) => {
      api.slamSoul('down');
      a.spawnWarning({ x: L + 3, y: B - 30, w: a.targetBoxW - 6, h: 27, duration: 0.58, label: '!' });
    });
    a._at(0.90, () => {
      for (let bx = L + 6; bx < R - 10; bx += 14) {
        a.spawnBone({ x: bx, y: B - 26, w: 9, h: 26, life: 0.30 });
      }
    });

    a._at(1.95, (_, api) => {
      api.slamSoul('right');
      a.spawnWarning({ x: R - 30, y: T + 3, w: 27, h: a.targetBoxH - 6, duration: 0.58, label: '!' });
    });
    a._at(2.55, () => {
      for (let by = T + 6; by < B - 10; by += 14) {
        a.spawnBone({ x: R - 26, y: by, w: 26, h: 9, orientation: 'horizontal', life: 0.30 });
      }
    });

    a._at(3.6, (_, api) => {
      api.setSoulMode('red');
      a.spawnBlaster({ startX: CX - 240, startY: T - 140, x: CX - 150, y: T - 60, angle: aimAngleTo(CX - 150, T - 60, CX, B - 70), scale: 1.05, chargeTime: 0.75, fireTime: 0.45 });
      a.spawnBlaster({ startX: CX + 240, startY: T - 140, x: CX + 150, y: T - 60, angle: aimAngleTo(CX + 150, T - 60, CX, B - 70), scale: 1.05, chargeTime: 0.75, fireTime: 0.45 });
    });

    a._at(5.2, (_, api) => {
      a.climaxSleepReady = true;
      api.enterClimaxSleep?.();
    });
  },

  // 12. Phase 4 / Secret: Green Shield Storm (High-tempo Gaster spear gauntlet)
  greenShieldStorm(a, opts) {
    a.targetBoxW = 116;
    a.targetBoxH = 116;
    a.initialSoulMode = 'green';
    a.initialGravity = 'down';
    a.duration = 10.6;
    a.gasterActive = true;

    const L = a.boxLeft(opts);
    const T = a.boxTop(opts);
    a._at(0.05, () => {
      audio.gasterSpeak();
      a.spawnWarning({ x: L + 8, y: T + 8, w: a.targetBoxW - 16, h: 24, duration: 0.6, color: '#33e65a', label: 'DEFEND' });
    });

    scheduleSpearVolley(a, opts, [
      // Phase A: Fast rhythmic 8-beat cardinal storm (0.34s spacing)
      { t: 0.65, dir: 'up', speed: 225, color: 'cyan' },
      { t: 0.99, dir: 'right', speed: 225, color: 'cyan' },
      { t: 1.33, dir: 'down', speed: 225, color: 'cyan' },
      { t: 1.67, dir: 'left', speed: 225, color: 'cyan' },
      { t: 2.01, dir: 'right', speed: 225, color: 'red' },
      // Leave ~2.4s open in case spawnGreenBonus triggers
      { t: 2.80, dir: 'up', speed: 230, color: 'cyan' },
      { t: 3.14, dir: 'left', speed: 230, color: 'cyan' },
      { t: 3.48, dir: 'down', speed: 230, color: 'cyan' },
      // Mid-storm healing green spear
      { t: 3.92, dir: 'up', speed: 185, color: 'green' },
      // Phase B: Double-tap directional checks (0.30s spacing)
      { t: 4.55, dir: 'left', speed: 235, color: 'cyan' },
      { t: 4.85, dir: 'left', speed: 235, color: 'red' },
      { t: 5.20, dir: 'right', speed: 235, color: 'cyan' },
      { t: 5.50, dir: 'right', speed: 235, color: 'red' },
      { t: 5.85, dir: 'up', speed: 235, color: 'cyan' },
      { t: 6.15, dir: 'down', speed: 235, color: 'cyan' },
      { t: 6.45, dir: 'up', speed: 235, color: 'cyan' },
      { t: 6.75, dir: 'down', speed: 235, color: 'red' },
      // Finale: Tight clockwise & counter spin (0.27s spacing)
      { t: 7.35, dir: 'up', speed: 240, color: 'cyan' },
      { t: 7.62, dir: 'right', speed: 240, color: 'cyan' },
      { t: 7.89, dir: 'down', speed: 240, color: 'cyan' },
      { t: 8.16, dir: 'left', speed: 240, color: 'cyan' },
      { t: 8.43, dir: 'up', speed: 240, color: 'red' },
      { t: 8.70, dir: 'left', speed: 240, color: 'cyan' },
      { t: 8.97, dir: 'down', speed: 240, color: 'cyan' },
      { t: 9.24, dir: 'right', speed: 240, color: 'red' }
    ]);
  },

  // 13. Phase 4 / Secret: Yellow Blaster Breakout (Shooter SOUL vs Multi-HP Walls & Blasters)
  yellowBlasterBreakout(a, opts) {
    a.targetBoxW = 240;
    a.targetBoxH = 190;
    a.initialSoulMode = 'yellow';
    a.initialGravity = 'down';
    a.duration = 10.8;
    a.gasterActive = true;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);

    a._at(0.05, () => {
      audio.gasterSpeak();
      a.spawnWarning({ x: L + 20, y: T + 10, w: a.targetBoxW - 40, h: 26, duration: 0.75, color: '#ffe640', label: 'BREAK OUT!' });
    });

    // Wave 1: Full-width destructible wall
    scheduleCrackedRow(a, opts, 0.55, { count: 7, h: 18, vy: 72, hp: 1 });

    // Wave 2: Corner blasters framing center while horizontal targets glide above
    a._at(2.55, () => {
      a.spawnBlaster({ startX: L - 160, startY: T - 140, x: L - 65, y: T - 55, angle: aimAngleTo(L - 65, T - 55, L + 42, B - 24), scale: 0.9, chargeTime: 0.78, fireTime: 0.42 });
      a.spawnBlaster({ startX: R + 160, startY: T - 140, x: R + 65, y: T - 55, angle: aimAngleTo(R + 65, T - 55, R - 42, B - 24), scale: 0.9, chargeTime: 0.78, fireTime: 0.42 });
      for (let i = 0; i < 3; i++) {
        a.spawnDestructible({ x: L + 20 + i * 72, y: T + 38, w: 34, h: 18, vx: i % 2 === 0 ? 52 : -52, vy: 18, hp: 1, life: 4 });
      }
    });

    // Wave 3: Staggered left & right cracked barricades
    scheduleCrackedRow(a, opts, 4.65, { count: 4, startX: L + 6, spanW: 132, h: 18, vy: 78, hp: 1 });
    scheduleCrackedRow(a, opts, 5.55, { count: 4, startX: R - 138, spanW: 132, h: 18, vy: 78, hp: 1 });

    // Wave 4: High horizontal blaster + central descending targets
    a._at(7.05, () => {
      a.spawnBlaster({ startX: R + 160, startY: T + 34, x: R + 72, y: T + 34, angle: Math.PI / 2, scale: 0.88, chargeTime: 0.82, fireTime: 0.42 });
    });
    scheduleCrackedRow(a, opts, 7.25, { count: 4, startX: CX - 72, spanW: 144, y: T + 56, h: 18, vy: 68, hp: 1 });

    // Wave 5: 3-HP Mega Yellow Core down center flanked by twin vertical edge blasters
    a._at(8.65, () => {
      a.spawnDestructible({ x: CX - 24, y: T + 6, w: 48, h: 24, vx: 0, vy: 58, hp: 3, life: 5 });
      a.spawnBlaster({ startX: L + 32, startY: T - 170, x: L + 32, y: T - 68, angle: 0, scale: 0.95, chargeTime: 0.85, fireTime: 0.44 });
      a.spawnBlaster({ startX: R - 32, startY: T - 170, x: R - 32, y: T - 68, angle: 0, scale: 0.95, chargeTime: 0.85, fireTime: 0.44 });
    });
  },

  // 14. Phase 4 / Secret Climax: Enigmatic Dual Finale (Red -> Green -> Yellow -> Blue -> Red)
  gasterDualFinale(a, opts) {
    a.targetBoxW = 230;
    a.targetBoxH = 180;
    a.initialSoulMode = 'red';
    a.initialGravity = 'down';
    a.duration = 11.4;
    a.gasterActive = true;

    const L = a.boxLeft(opts);
    const R = a.boxRight(opts);
    const T = a.boxTop(opts);
    const B = a.boxBottom(opts);
    const CX = a.boxCenterX(opts);
    const CY = a.boxCenterY(opts);

    // Move Battle Box smoothly during Act 1 (0..2.7s), settling back to (0,0) before Green SOUL Act 2
    a.setBoxMotion((t) => {
      if (t >= 2.75) return { x: 0, y: 0 };
      const env = Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (2.75 - t) / 0.5));
      return {
        x: Math.sin(t * 2.4) * 20 * env,
        y: Math.cos(t * 2.0) * 12 * env
      };
    });

    // Act 1 (0.0 - 2.8s): Red SOUL + Bone Wheels + Corner Blasters
    a._at(0.05, () => {
      audio.gasterSpeak();
      a.spawnWarning({ x: L + 20, y: T + 10, w: a.targetBoxW - 40, h: 24, duration: 0.65, color: '#c480ff', label: 'FINALE' });
    });
    a._at(0.45, () => {
      a.spawnWheel({ x: R + 45, y: CY - 38, vx: -135, radius: 24, vAngle: 2.8, spokes: 4 });
      a.spawnWheel({ x: L - 45, y: CY + 38, vx: 135, radius: 24, vAngle: -2.8, spokes: 4 });
    });
    a._at(1.45, () => {
      a.spawnBlaster({ startX: CX - 240, startY: T - 140, x: CX - 140, y: T - 60, angle: aimAngleTo(CX - 140, T - 60, CX, CY), scale: 0.95, chargeTime: 0.70, fireTime: 0.40 });
      a.spawnBlaster({ startX: CX + 240, startY: T - 140, x: CX + 140, y: T - 60, angle: aimAngleTo(CX + 140, T - 60, CX, CY), scale: 0.95, chargeTime: 0.70, fireTime: 0.40 });
    });

    // Act 2 (2.85 - 5.4s): Blackout cut -> Green SOUL Spear Volley
    a._at(2.85, (_, api) => {
      a.bones = [];
      a.wheels = [];
      a.blackoutFlash = 0.12;
      audio.blackout();
      api.setSoulMode('green');
    });
    scheduleSpearVolley(a, opts, [
      { t: 3.10, dir: 'up', speed: 225, dist: 185, color: 'cyan' },
      { t: 3.44, dir: 'right', speed: 225, dist: 185, color: 'cyan' },
      { t: 3.78, dir: 'down', speed: 225, dist: 185, color: 'cyan' },
      { t: 4.12, dir: 'left', speed: 225, dist: 185, color: 'red' },
      { t: 4.46, dir: 'up', speed: 190, dist: 185, color: 'green' },
      { t: 4.80, dir: 'down', speed: 225, dist: 185, color: 'red' }
    ]);

    // Act 3 (5.55 - 7.8s): Blackout cut -> Yellow SOUL Cracked Barrier Breakout
    a._at(5.55, (_, api) => {
      a.spears = [];
      a.blackoutFlash = 0.12;
      audio.blackout();
      api.setSoulMode('yellow');
    });
    scheduleCrackedRow(a, opts, 5.75, { count: 6, h: 18, vy: 82, hp: 1 });

    // Act 4 (7.85 - 11.4s): Blue Slam -> Red Dual Sans & Gaster Symmetrical Blasters
    a._at(7.85, (_, api) => {
      a.destructibles = [];
      a.blackoutFlash = 0.12;
      audio.blackout();
      api.setSoulMode('blue', 'down');
      api.slamSoul('down');
      a.spawnWarning({ x: L + 3, y: B - 28, w: a.targetBoxW - 6, h: 25, duration: 0.60, label: '!' });
    });
    a._at(8.47, () => {
      for (let bx = L + 6; bx < R - 10; bx += 14) {
        a.spawnBone({ x: bx, y: B - 24, w: 9, h: 24, life: 0.25 });
      }
    });
    a._at(9.05, (_, api) => {
      api.setSoulMode('red');
      audio.gasterSpeak();
      a.spawnBlaster({ startX: L - 160, startY: CY - 44, x: L - 72, y: CY - 44, angle: -Math.PI / 2, scale: 1.0, chargeTime: 0.72, fireTime: 0.44 });
      a.spawnBlaster({ startX: R + 160, startY: CY + 44, x: R + 72, y: CY + 44, angle: Math.PI / 2, scale: 1.0, chargeTime: 0.72, fireTime: 0.44 });
    });
    a._at(9.95, () => {
      a.spawnBlaster({ startX: CX - 56, startY: T - 170, x: CX - 56, y: T - 70, angle: 0, scale: 1.05, chargeTime: 0.70, fireTime: 0.48 });
      a.spawnBlaster({ startX: CX + 56, startY: T - 170, x: CX + 56, y: T - 70, angle: 0, scale: 1.05, chargeTime: 0.70, fireTime: 0.48 });
    });
  }
};
