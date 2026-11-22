// Pixel-Art Sprite Renderer & Procedural Undertale Asset Cache

const spriteCache = new Map();

function createOffscreen(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const octx = c.getContext('2d');
  if (octx) octx.imageSmoothingEnabled = false;
  return c;
}

function drawPixelGrid(grid, palette, scale = 2, cacheKey = null) {
  if (cacheKey && spriteCache.has(cacheKey)) {
    return spriteCache.get(cacheKey);
  }
  if (!grid || !grid.length) return null;
  const h = grid.length;
  const w = grid[0].length;
  const canvas = createOffscreen(w * scale, h * scale);
  if (!canvas) return null;
  const octx = canvas.getContext('2d');
  if (!octx) return null;
  octx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    const row = grid[y];
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') {
        x++;
        continue;
      }
      const color = palette[ch];
      if (!color) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < w && row[x + run] === ch) {
        run++;
      }
      octx.fillStyle = color;
      octx.fillRect(x * scale, y * scale, run * scale, scale);
      x += run;
    }
  }

  if (cacheKey) spriteCache.set(cacheKey, canvas);
  return canvas;
}

function flipGridH(grid) {
  return grid.map((r) => r.split('').reverse().join(''));
}

function flipGridV(grid) {
  return [...grid].reverse();
}

function rotateGrid90CW(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const out = [];
  for (let x = 0; x < w; x++) {
    let row = '';
    for (let y = h - 1; y >= 0; y--) {
      row += grid[y][x];
    }
    out.push(row);
  }
  return out;
}

function rotateGrid90CCW(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const out = [];
  for (let x = w - 1; x >= 0; x--) {
    let row = '';
    for (let y = 0; y < h; y++) {
      row += grid[y][x];
    }
    out.push(row);
  }
  return out;
}

function rotateGrid180(grid) {
  return flipGridH(flipGridV(grid));
}

function composeGrid(baseGrid, overlayRows) {
  const out = baseGrid.map((r) => r.split(''));
  for (const [yStr, rowPattern] of Object.entries(overlayRows)) {
    const y = Number(yStr);
    if (y < 0 || y >= out.length) continue;
    for (let x = 0; x < rowPattern.length && x < out[y].length; x++) {
      const ch = rowPattern[x];
      if (ch !== '~') out[y][x] = ch;
    }
  }
  return out.map((chars) => chars.join(''));
}

function makeWhiteSilhouettePalette(palette) {
  const out = {};
  for (const k of Object.keys(palette)) {
    out[k] = '#ffffff';
  }
  return out;
}

function makeGrazeOutlineGrid(heartGrid) {
  const h = heartGrid.length;
  const w = heartGrid[0].length;
  const pad = 2;
  const outH = h + pad * 2;
  const outW = w + pad * 2;
  const out = Array.from({ length: outH }, () => Array(outW).fill('.'));
  const hasHeart = (gx, gy) => {
    const hx = gx - pad;
    const hy = gy - pad;
    return hx >= 0 && hx < w && hy >= 0 && hy < h && heartGrid[hy][hx] !== '.';
  };
  for (let gy = 0; gy < outH; gy++) {
    for (let gx = 0; gx < outW; gx++) {
      if (hasHeart(gx, gy)) continue;
      const adj4 =
        hasHeart(gx - 1, gy) ||
        hasHeart(gx + 1, gy) ||
        hasHeart(gx, gy - 1) ||
        hasHeart(gx, gy + 1);
      if (adj4) {
        out[gy][gx] = (gx + gy) % 3 === 0 ? 'w' : 'c';
      }
    }
  }
  return out.map((r) => r.join(''));
}

// ============================================================================
// 1. SOUL SPRITES & SHARDS
// ============================================================================

const SOUL_GRID = [
  '..rrrr....rrrr..',
  '.rrrrrr..rrrrrr.',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  '.rrrrrrrrrrrrrr.',
  '..rrrrrrrrrrrr..',
  '...rrrrrrrrrr...',
  '....rrrrrrrr....',
  '.....rrrrrr.....',
  '......rrrr......',
  '.......rr.......',
  '................',
  '................',
  '................'
];

const SOUL_YELLOW_GRID = [
  '.......mm.......',
  '......rmmr......',
  '.....rrrrrr.....',
  '....rrrrrrrr....',
  '...rrrrrrrrrr...',
  '..rrrrrrrrrrrr..',
  '.rrrrrrrrrrrrrr.',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr',
  '.rrrrrr..rrrrrr.',
  '..rrrr....rrrr..',
  '................',
  '................',
  '................'
];

const SOUL_BROKEN_LEFT = [
  '..rrrr..........',
  '.rrrrrr.........',
  'rrrrrr..........',
  'rrrrrrr.........',
  'rrrrrr..........',
  'rrrrrrr.........',
  '.rrrrr..........',
  '..rrrrr.........',
  '...rrr..........',
  '....rrr.........',
  '.....rr.........',
  '......r.........',
  '.......r........',
  '................',
  '................',
  '................'
];

const SOUL_BROKEN_RIGHT = [
  '..........rrrr..',
  '.........rrrrrr.',
  '........rrrrrrrr',
  '.........rrrrrrr',
  '........rrrrrrrr',
  '.........rrrrrrr',
  '........rrrrrrr.',
  '........rrrrrr..',
  '.........rrrrr..',
  '........rrrr....',
  '.........rrr....',
  '........rr......',
  '........r.......',
  '................',
  '................',
  '................'
];

const SOUL_GRAZE_GRID = makeGrazeOutlineGrid(SOUL_GRID);
const SOUL_GRAZE_YELLOW_GRID = makeGrazeOutlineGrid(SOUL_YELLOW_GRID);

// 28x28 octagonal Green Shield Bar around the 16x16 SOUL (facing UP by default)
const GREEN_SHIELD_UP_GRID = [
  '........cccccccccccc........',
  '......ccggggggggggggcc......',
  '.....cggssssssssssssggc.....',
  '....cgs..............sgc....',
  '...cgs................sgc...',
  '..cgs..................sgc..',
  '.cgs....................sgc.',
  '.ds......................sd.',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  'd..........................d',
  '.d........................d.',
  '.d........................d.',
  '..d......................d..',
  '...d....................d...',
  '....d..................d....',
  '.....d................d.....',
  '......dd............dd......',
  '........dddddddddddd........'
];

const GREEN_SHIELD_GRIDS = {
  up: GREEN_SHIELD_UP_GRID,
  right: rotateGrid90CW(GREEN_SHIELD_UP_GRID),
  down: rotateGrid180(GREEN_SHIELD_UP_GRID),
  left: rotateGrid90CCW(GREEN_SHIELD_UP_GRID)
};

const GREEN_SHIELD_PAL = {
  c: '#96fff4',
  g: '#24eb56',
  s: '#0d993e',
  d: '#155430'
};

const SOUL_SHARD_GRID = [
  '...hh...',
  '...hr...',
  '..hhrr..',
  '..hrrr..',
  '.hhrrrr.',
  '.hrrrrr.',
  'hhrrrrd.',
  'hrrrrdd.',
  '.rrddd..',
  '..dd....'
];

export const SOUL_SKINS = {
  classic: { id: 'classic', name: 'Classic Soul', trim: null, core: null, desc: 'Pure Determination.' },
  void_prism: { id: 'void_prism', name: 'Void Prism', trim: '#2ce8f5', altTrim: '#c084fc', desc: 'Shifting cyan/violet prism rim.' },
  golden_dawn: { id: 'golden_dawn', name: 'Golden Dawn', trim: '#ffef3f', altTrim: '#fde047', desc: 'Judgment Hall sunlight aura.' },
  cyber_cyan: { id: 'cyber_cyan', name: 'Cyber Holo', trim: '#38bdf8', altTrim: '#ffffff', desc: 'Crisp neon wireframe trim.' },
  crimson_flame: { id: 'crimson_flame', name: 'Crimson Flame', trim: '#fb923c', altTrim: '#ef4444', desc: 'Burning ember ring.' },
  gaster_mono: { id: 'gaster_mono', name: 'Void Mono', trim: '#e2e8f0', altTrim: '#a855f7', desc: 'Gaster Secret Vault emblem.' }
};

export function drawSoul(ctx, x, y, mode = 'red', options = {}) {
  const {
    gravity = 'down',
    shieldDir = 'up',
    scale = 1,
    alpha = 1,
    flash = false,
    cracked = false,
    splitOffset = 0,
    grazeFlash = false,
    skin = 'classic',
    dashing = false,
    dashReady = false
  } = options;

  const colorMap = {
    red: '#ff1e1e',
    blue: '#003cff',
    green: '#22e646',
    yellow: '#ffef3f',
    purple: '#d946ef',
    cyan: '#2ce8f5',
    orange: '#ffa024'
  };
  const baseColor = colorMap[mode] || '#ff1e1e';
  const fill = flash ? '#ffffff' : baseColor;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));

  if (scale !== 1) ctx.scale(scale, scale);

  // Dash glow / active i-frame aura
  if (dashing && !cracked) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(-10, -9, 20, 18);
    ctx.fillStyle = 'rgba(44, 232, 245, 0.4)';
    ctx.fillRect(-12, -7, 24, 14);
  } else if (dashReady && skin && skin !== 'classic' && SOUL_SKINS[skin]?.trim && !cracked) {
    const sk = SOUL_SKINS[skin];
    const now = typeof performance !== 'undefined' ? performance.now() * 0.006 : 0;
    const pulse = Math.sin(now) > 0 ? sk.trim : (sk.altTrim || sk.trim);
    ctx.save();
    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = pulse;
    ctx.fillRect(-9, -8, 18, 2);
    ctx.fillRect(-9, 6, 18, 2);
    ctx.fillRect(-10, -6, 2, 12);
    ctx.fillRect(8, -6, 2, 12);
    ctx.restore();
  }

  // Green Shield Bar rendered around the SOUL before heart rotation
  if (mode === 'green') {
    const dirKey = GREEN_SHIELD_GRIDS[shieldDir] ? shieldDir : 'up';
    const shieldSpr = drawPixelGrid(
      GREEN_SHIELD_GRIDS[dirKey],
      GREEN_SHIELD_PAL,
      1,
      `soul-shield-${dirKey}`
    );
    if (shieldSpr) {
      ctx.drawImage(shieldSpr, -14, -14);
    }
  }

  let angle = 0;
  if (mode === 'blue') {
    if (gravity === 'up') angle = Math.PI;
    else if (gravity === 'left') angle = Math.PI / 2;
    else if (gravity === 'right') angle = -Math.PI / 2;
  }
  if (angle !== 0) ctx.rotate(angle);

  if (grazeFlash && !cracked) {
    const grazeGrid = mode === 'yellow' ? SOUL_GRAZE_YELLOW_GRID : SOUL_GRAZE_GRID;
    const grazeSpr = drawPixelGrid(
      grazeGrid,
      { w: '#ffffff', c: '#70f8ff' },
      1,
      `soul-graze-${mode === 'yellow' ? 'y' : 'n'}`
    );
    if (grazeSpr) {
      ctx.drawImage(grazeSpr, -10, -9);
    }
  }

  if (cracked) {
    const pal = { r: fill };
    const leftSpr = drawPixelGrid(SOUL_BROKEN_LEFT, pal, 1, `soul-bl-${fill}`);
    const rightSpr = drawPixelGrid(SOUL_BROKEN_RIGHT, pal, 1, `soul-br-${fill}`);
    if (leftSpr && rightSpr) {
      ctx.drawImage(leftSpr, -8 - splitOffset, -7);
      ctx.drawImage(rightSpr, -8 + splitOffset, -7);
    }
  } else if (mode === 'yellow') {
    const muzzle = flash ? '#ffffff' : '#ffffd4';
    const spr = drawPixelGrid(
      SOUL_YELLOW_GRID,
      { r: fill, m: muzzle },
      1,
      `soul-yellow-${fill}`
    );
    if (spr) {
      ctx.drawImage(spr, -8, -7);
    }
  } else {
    const spr = drawPixelGrid(SOUL_GRID, { r: fill }, 1, `soul-${fill}`);
    if (spr) {
      ctx.drawImage(spr, -8, -7);
    }
    if (mode === 'purple' && !flash) {
      ctx.fillStyle = '#fae8ff';
      ctx.fillRect(-5, -4, 2, 2);
    }
  }

  ctx.restore();
}

export function drawSoulTrail(ctx, trailPoints, mode = 'red', options = {}) {
  if (!trailPoints || !trailPoints.length) return;
  const { gravity = 'down', skin = 'classic' } = options;
  for (let i = 0; i < trailPoints.length; i++) {
    const pt = trailPoints[i];
    if (pt.life <= 0) continue;
    const ratio = Math.max(0, Math.min(1, pt.life / (pt.maxLife || 0.24)));
    drawSoul(ctx, pt.x, pt.y, pt.mode || mode, {
      gravity: pt.gravity || gravity,
      alpha: ratio * 0.42,
      scale: 0.92 + ratio * 0.08,
      flash: Boolean(pt.dashing && i % 2 === 0),
      skin
    });
  }
}

export function drawSoulShard(ctx, x, y, rot, color = '#ff1e1e') {
  const pal = {
    r: color,
    h: '#ffffff',
    d: color === '#ff1e1e' ? '#8c0c0c' : '#555566'
  };
  const spr = drawPixelGrid(SOUL_SHARD_GRID, pal, 1, `soul-shard-${color}`);
  if (!spr) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(rot);
  ctx.drawImage(spr, -4, -5);
  ctx.restore();
}

// ============================================================================
// 2. FRISK OVERWORLD SPRITE (16x16, 4-frame walk cycle in 4 directions)
// ============================================================================

const FRISK_PAL = {
  H: '#4a2511', // hair
  D: '#2b1307', // hair shadow / bangs
  S: '#ffd573', // skin
  A: '#e0aa45', // skin shadow
  E: '#241106', // closed eyes
  B: '#3b4cca', // sweater blue
  C: '#27349c', // sweater shadow
  P: '#cc44b8', // sweater magenta stripes
  N: '#1c2159', // pants
  T: '#3b2416'  // shoes
};

const FRISK_DOWN_IDLE = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHSSSSSSSSHH..',
  '..HHSEESSEESHH..',
  '..DDSSSSSSSSDD..',
  '...DSSSSSSSSD...',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '...BPPPPPPPPB...',
  '...BBBBBBBBBB...',
  '...SSPPPPPPSS...',
  '....BBBBBBBB....',
  '....NNN..NNN....',
  '....NNN..NNN....',
  '....TTT..TTT....'
];

const FRISK_DOWN_STEP_A = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHSSSSSSSSHH..',
  '..HHSEESSEESHH..',
  '..DDSSSSSSSSDD..',
  '...DSSSSSSSSD...',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '...BPPPPPPPPB...',
  '..CBBBBBBBBBBSA.',
  '..SSPPPPPPBBC...',
  '....BBBBBBBB....',
  '...NNN....NNN...',
  '...NNN....TTT...',
  '...TTT..........'
];

const FRISK_DOWN_STEP_B = flipGridH(FRISK_DOWN_STEP_A);

const FRISK_UP_IDLE = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..DDHHHHHHHHDD..',
  '...DDDDDDDDDD...',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '...BPPPPPPPPB...',
  '...BBBBBBBBBB...',
  '...SSPPPPPPSS...',
  '....BBBBBBBB....',
  '....NNN..NNN....',
  '....NNN..NNN....',
  '....TTT..TTT....'
];

const FRISK_UP_STEP_A = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..DDHHHHHHHHDD..',
  '...DDDDDDDDDD...',
  '....BBBBBBBB....',
  '...BBBBBBBBBB...',
  '...BPPPPPPPPB...',
  '..CBBBBBBBBBBSA.',
  '..SSPPPPPPBBC...',
  '....BBBBBBBB....',
  '...NNN....NNN...',
  '...NNN....TTT...',
  '...TTT..........'
];

const FRISK_UP_STEP_B = flipGridH(FRISK_UP_STEP_A);

const FRISK_RIGHT_IDLE = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHSSSSHH..',
  '..HHHHHHSSESHH..',
  '..DDHHHHSSSSSD..',
  '...DDHHHSSSSS...',
  '....BBBBBBBB....',
  '....BBBBBBBB....',
  '....PPPPPPPP....',
  '....BBBCBBBB....',
  '....PPSSPPPP....',
  '....BBBBBBBB....',
  '.....NNNNNN.....',
  '.....NNN.NN.....',
  '.....TTT.TT.....'
];

const FRISK_RIGHT_STEP_A = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHSSSSHH..',
  '..HHHHHHSSESHH..',
  '..DDHHHHSSSSSD..',
  '...DDHHHSSSSS...',
  '....BBBBBBBB....',
  '....BBBBBBBB....',
  '...BPPPPPPPP....',
  '..SSBBBBBBBB....',
  '....PPPPPPPP....',
  '....BBBBBBBB....',
  '....NNN..NNN....',
  '...NNN....NNN...',
  '...TTT....TTT...'
];

const FRISK_RIGHT_STEP_B = [
  '.....HHHHHH.....',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHSSSSHH..',
  '..HHHHHHSSESHH..',
  '..DDHHHHSSSSSD..',
  '...DDHHHSSSSS...',
  '....BBBBBBBB....',
  '....BBBBBBBB....',
  '....PPPPPPPPB...',
  '....BBBBBBBBSS..',
  '....PPPPPPPP....',
  '....BBBBBBBB....',
  '.....NNNNNN.....',
  '....NNN..NNN....',
  '....TTT..TTT....'
];

const FRISK_FRAMES = {
  down: {
    idle: FRISK_DOWN_IDLE,
    stepA: FRISK_DOWN_STEP_A,
    stepB: FRISK_DOWN_STEP_B
  },
  up: {
    idle: FRISK_UP_IDLE,
    stepA: FRISK_UP_STEP_A,
    stepB: FRISK_UP_STEP_B
  },
  right: {
    idle: FRISK_RIGHT_IDLE,
    stepA: FRISK_RIGHT_STEP_A,
    stepB: FRISK_RIGHT_STEP_B
  },
  left: {
    idle: flipGridH(FRISK_RIGHT_IDLE),
    stepA: flipGridH(FRISK_RIGHT_STEP_A),
    stepB: flipGridH(FRISK_RIGHT_STEP_B)
  }
};

export function drawFriskOverworld(ctx, x, y, dir = 'down', walkFrame = 0, scale = 2.5) {
  const dirKey = FRISK_FRAMES[dir] ? dir : 'down';
  const stepMod = ((Math.floor(walkFrame) % 4) + 4) % 4;
  const poseKey = stepMod === 1 ? 'stepA' : stepMod === 3 ? 'stepB' : 'idle';
  const grid = FRISK_FRAMES[dirKey][poseKey];

  const spr = drawPixelGrid(grid, FRISK_PAL, 2, `frisk-${dirKey}-${poseKey}`);
  if (!spr) return;

  const drawW = Math.round(16 * scale);
  const drawH = Math.round(16 * scale);
  const bob = stepMod === 1 || stepMod === 3 ? -2 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(x - drawW / 2), Math.round(y - drawH + bob), drawW, drawH);
  ctx.restore();
}

// ============================================================================
// 3. SANS OVERWORLD SPRITE (16x16)
// ============================================================================

const SANS_OW_PAL = {
  K: '#090910',
  W: '#f4f5fa',
  L: '#cfd5e6',
  J: '#2968db',
  S: '#18449c',
  P: '#f29bc1',
  Q: '#c77298'
};

const SANS_OW_GRID = [
  '.....KKKKKK.....',
  '...KKWWWWWWKK...',
  '..KWWWWWWWWWWK..',
  '..KWWKKWWKKWWK..',
  '..KWWWWKKWWWWK..',
  '..KWWKKKKKKWWK..',
  '...KKWWWWWWKK...',
  '..JJLLLLLLLLJJ..',
  '.JJJJWWWWWWJJJJ.',
  '.SJJJLLLLLLJJJS.',
  '.SJJJWWWWWWJJJS.',
  '..SSKKKKKKKKSS..',
  '...KKKKKKKKKK...',
  '...KKK....KKK...',
  '...WWK....KWW...',
  '...PPQ....QPP...'
];

const SANS_OW_EYE_GLOW_GRID = [
  '..c..',
  '.cwc.',
  'cwwwc',
  '.cwc.',
  '..c..'
];

export function drawSansOverworld(ctx, x, y, scale = 2.5, glowEye = false) {
  const spr = drawPixelGrid(SANS_OW_GRID, SANS_OW_PAL, 2, 'sans-ow-v2');
  if (!spr) return;
  const drawW = Math.round(16 * scale);
  const drawH = Math.round(16 * scale);
  const dx = Math.round(x - drawW / 2);
  const dy = Math.round(y - drawH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, dx, dy, drawW, drawH);

  if (glowEye) {
    const eyeSpr = drawPixelGrid(
      SANS_OW_EYE_GLOW_GRID,
      { c: '#2ce8f5', w: '#ffffff' },
      1,
      'sans-ow-eye-glow'
    );
    if (eyeSpr) {
      const ex = Math.round(dx + 9.5 * scale);
      const ey = Math.round(dy + 3 * scale);
      const ew = Math.round(5 * scale * 0.65);
      ctx.drawImage(eyeSpr, ex - Math.floor(ew / 2), ey - Math.floor(ew / 2), ew, ew);
    }
  }
  ctx.restore();
}

// ============================================================================
// 4. SANS MULTI-PART BATTLE SPRITE (28x24 Head, 36x24 Torso, 28x14 Legs @ 2x)
// ============================================================================

const SANS_PAL = {
  K: '#07070c', // crisp black outline & eye voids
  W: '#ffffff', // pure skull/teeth/stripe white
  L: '#dce2f0', // cool bone/collar shading
  G: '#9aa5be', // deeper grey bone/hood shadow
  B: '#2262e0', // main hoodie blue
  H: '#4d8cff', // hoodie shoulder highlight
  D: '#153b8f', // hoodie deep shadow
  S: '#0c0c14', // shorts black
  P: '#f29bc1', // slipper pink
  Q: '#c96e98', // slipper shadow
  R: '#ff2828', // crimson slash
  F: '#ffa0a0', // fresh slash glint
  Y: '#8a1414', // dark dried scar
  C: '#2ce8f5', // cyan eye/aura
  Z: '#ffef3f', // yellow eye
  A: '#9be8ff', // sweat drop
  V: '#9b4dff'  // gaster void glitch
};

// 28x24 Skull Base (hollow sockets as baseline)
const SANS_HEAD_HOLLOW = [
  '........KKKKKKKKKKKK........',
  '......KKWWWWWWWWWWWWKK......',
  '....KKWWWWWWWWWWWWWWWWKK....',
  '...KWWWWWWWWWWWWWWWWWWWWK...',
  '..KWWWWWWWWWWWWWWWWWWWWWWK..',
  '..KLWWWWWWWWWWWWWWWWWWWWLK..',
  '.KWWWWWWWWWWWWWWWWWWWWWWWWK.',
  '.KWWWWWWWWWWWWWWWWWWWWWWWWK.',
  '.KWWWWWWWWWWWWWWWWWWWWWWWWK.',
  '.KWWWWKKKKKKWWWWKKKKKKWWWWK.',
  '.KWWWKKKKKKKWWWWKKKKKKKWWWK.',
  '.KWWWKKKKKKKWWWWKKKKKKKWWWK.',
  '.KWWWKKKKKKKWWWWKKKKKKKWWWK.',
  '.KLWWKKKKKKKWWWWKKKKKKKWWLK.',
  '.KWWWWWWWWWWWKKWWWWWWWWWWWK.',
  'KWWWWWWWWWWWKKKKWWWWWWWWWWWK',
  'KLLWWWWWWWWWWWWWWWWWWWWWWLLK',
  '.KKWWKWWWWWWWWWWWWWWWWKWWKK.',
  '..KWWKKWWKWWKWWKWWKWWKKWWK..',
  '..KWWWKWWKWWKWWKWWKWWKWWWK..',
  '...KWWKKKKKKKKKKKKKKKKWWK...',
  '....KLLWWWWWWWWWWWWWWLLK....',
  '.....KKLLLLLLLLLLLLLLKK.....',
  '.......KKKKKKKKKKKKKK.......'
];

const SANS_HEAD_VARIANTS = {
  hollow: SANS_HEAD_HOLLOW,
  normal: composeGrid(SANS_HEAD_HOLLOW, {
    10: '~~~~~~~~WW~~~~~~~~WW~~~~~~~~',
    11: '~~~~~~~~WW~~~~~~~~WW~~~~~~~~'
  }),
  wink: composeGrid(SANS_HEAD_HOLLOW, {
    9:  '~~~~~~~~~~~~~~~~WWWWWW~~~~~~',
    10: '~~~~~~~~WW~~~~~~WKKKKW~~~~~~',
    11: '~~~~~~~~~~~~~~~~KWWWWK~~~~~~',
    12: '~~~~~~~~~~~~~~~~WWWWWW~~~~~~',
    13: '~~~~~~~~~~~~~~~~WWWWWW~~~~~~'
  }),
  closed: composeGrid(SANS_HEAD_HOLLOW, {
    9:  '~~~~~~WWWWWW~~~~WWWWWW~~~~~~',
    10: '~~~~~WWWWWWWW~~WWWWWWWW~~~~~',
    11: '~~~~~WKWWWWKW~~WKWWWWKW~~~~~',
    12: '~~~~~WWKKKKWW~~WWKKKKWW~~~~~',
    13: '~~~~~~WWWWWW~~~~WWWWWW~~~~~~'
  }),
  sleeping: composeGrid(SANS_HEAD_HOLLOW, {
    9:  '~~~~~~WWWWWW~~~~WWWWWW~~~~~~',
    10: '~~~~~WWWWWWWW~~WWWWWWWW~~~~~',
    11: '~~~~~WKWWWWKW~~WKWWWWKW~~~~~',
    12: '~~~~~WWKKKKWW~~WWKKKKWW~~~~~',
    13: '~~~~~~WWWWWW~~~~WWWWWW~~~~~~',
    18: '~~~~~KKWWWWWWWWWWWWWWKK~~~~~',
    19: '~~~~~~KWWWWWWWWWWWWWWK~~~~~~'
  }),
  tired: composeGrid(SANS_HEAD_HOLLOW, {
    9:  '~~~~~~WWWWWW~~~~WWWWWW~~~~~~',
    10: '~~~~~WLLLLLLW~~WLLLLLLW~~~~~',
    11: '~~~~~KKKKKKKK~~KKKKKKKK~~~~~',
    12: '~~~~~~~~WW~~~~~~~~WW~~~~~~~~'
  }),
  cracked: composeGrid(SANS_HEAD_HOLLOW, {
    2:  '~~~~~~~~~~~~~~~~~~~~KK~~~~~~',
    3:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    4:  '~~~~~~~~~~~~~~~~~~KG~~~~~~~~',
    5:  '~~~~~~~~~~~~~~~~~KG~~~~~~~~~',
    6:  '~~~~~~~~~~~~~~~~KG~~~~~~~~~~',
    7:  '~~~~~~~~~~~~~~~~K~~~~~~~~~~~',
    8:  '~~~~~~~~~~~~~~~K~~~~~~~~~~~~',
    9:  '~~~~~~WWWWWW~~~~WWWWWW~~~~~~',
    10: '~~~~~WLLLLLLW~~WLLLLLLW~~~~~',
    11: '~~~~~KKKKKKKK~~KKKKKKKK~~~~~',
    12: '~~~~~~~~WW~~~~~~~~WW~~~~~~~~'
  }),
  blueEyeCyan: composeGrid(SANS_HEAD_HOLLOW, {
    10: '~~~~~~~~WW~~~~~~~~CC~~~~~~~~',
    11: '~~~~~~~~WW~~~~~~~CWWC~~~~~~~',
    12: '~~~~~~~~~~~~~~~~~~CC~~~~~~~~'
  }),
  blueEyeYellow: composeGrid(SANS_HEAD_HOLLOW, {
    10: '~~~~~~~~WW~~~~~~~~ZZ~~~~~~~~',
    11: '~~~~~~~~WW~~~~~~~ZWWZ~~~~~~~',
    12: '~~~~~~~~~~~~~~~~~~ZZ~~~~~~~~'
  }),
  gaster: composeGrid(SANS_HEAD_HOLLOW, {
    4:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    5:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    6:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    7:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    8:  '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    10: '~~~~~~~~LL~~~~~~~CVWC~~~~~~~',
    11: '~~~~~~~~~~~~~~~~~VWWC~~~~~~~',
    12: '~~~~~~~~~~~~~~~~~~CV~~~~~~~~',
    14: '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    15: '~~~~~~~~~~~~~~~~~~~K~~~~~~~~',
    16: '~~~~~~~~~~~~~~~~~~~K~~~~~~~~'
  })
};

const SANS_CRACK_OVERLAY = [
  '............................',
  '............................',
  '....................KK......',
  '...................K........',
  '..................KG........',
  '.................KG.........',
  '................KG..........',
  '................K...........',
  '...............K............'
];

// 36x24 Hoodie & Ribcage Torso
const SANS_TORSO_POCKETS = [
  '.........KKKKKKKKKKKKKKKKKK.........',
  '.......KKLLLLWWWWWWWWWWLLLLKK.......',
  '.....KKLLWWWWLLLLLLLLLLWWWWLLKK.....',
  '....KLLWWLLKKLLLLLLLLLLKKLLWWLLK....',
  '...KHHBBBBKWWLKKKKKKKKLWWKBBBBHHK...',
  '..KHHBBBBBKWWLWWWWWWWWLWWKBBBBBHHK..',
  '.KHHBBBBBBKWWLLGGGGGGLLWWKBBBBBBHHK.',
  '.KBBBBBBBBKWWWWWWWWWWWWWWKBBBBBBBBK.',
  'KBBBBBBBBBKWWLLGGGGGGLLWWKBBBBBBBBBK',
  'KBBBDBBBBBKWWWWWWWWWWWWWWKBBBBDBBBBK',
  'KBBBDDBBBBKWWLLGGGGGGLLWWKBBBBDDBBBK',
  'KBBBDDBBBBKWWWWWWWWWWWWWWKBBBBDDBBBK',
  'KBBBBBBBBBKWWLLGGGGGGLLWWKBBBBBBBBBK',
  'KBBBBBBBBBKWWWWWWWWWWWWWWKBBBBBBBBBK',
  'KBBKKBBBBBKWWLLGGGGGGLLWWKBBBBBKKBBK',
  'KBBBDKBBBBKWWWWWWWWWWWWWWKBBBBKDBBBK',
  'KBBBBDKBBBKWWWWWWWWWWWWWWKBBBKDBBBBK',
  '.KBBBBDKBBKWWWWWWWWWWWWWWKBBKDBBBBK.',
  '.KBBBBBDKKKWWWWWWWWWWWWWWKKKDBBBBBK.',
  '..KDDDDDDDKWWWWWWWWWWWWWWKDDDDDDDK..',
  '...KKKKKKKKDDDDDDDDDDDDDDKKKKKKKK...',
  '....KSSSSSSSSSSSSSSSSSSSSSSSSSSK....',
  '.....KKKKKKKKKKKKKKKKKKKKKKKKKK.....',
  '....................................'
];

const SANS_TORSO_SHRUG = composeGrid(SANS_TORSO_POCKETS, {
  4:  '..KHHBBBBBKWWLKKKKKKKKLWWKBBBBHHK...',
  5:  '.KHHBBBBBBKWWLWWWWWWWWLWWKBBBBBBHHK.',
  6:  'KHHBBBBBBBKWWLLGGGGGGLLWWKBBBBBBBHHK',
  7:  'KBBBBBBBBBKWWWWWWWWWWWWWWKBBBBBBBBBK',
  8:  'KBBBDBBBBBKWWLLGGGGGGLLWWKBBBBDBBBBK',
  9:  '.KKKDBBBBBKWWWWWWWWWWWWWWKBBBBDKKK..',
  10: '...KDBBBBBKWWLLGGGGGGLLWWKBBBBDK....',
  11: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  12: '...KBBBBBBKWWLLGGGGGGLLWWKBBBBBK....',
  13: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  14: '...KBBBBBBKWWLLGGGGGGLLWWKBBBBBK....',
  15: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  16: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  17: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  18: '...KBBBBBBKWWWWWWWWWWWWWWKBBBBBK....',
  19: '...KDDDDDDKWWWWWWWWWWWWWWKDDDDDK....'
});

const SANS_TORSO_DAMAGED = composeGrid(SANS_TORSO_POCKETS, {
  4:  '~~~~~~~RR~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  5:  '~~~~~~~~RRF~~~~~~~~~~~~~~~~~~~~~~~~~',
  6:  '~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~~~~~~',
  7:  '~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~~~~~',
  8:  '~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~~~~',
  9:  '~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~~~',
  10: '~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~~',
  11: '~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~~',
  12: '~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~~',
  13: '~~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~~',
  14: '~~~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~~',
  15: '~~~~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~~',
  16: '~~~~~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~~',
  17: '~~~~~~~~~~~~~~~~~~~~YRRF~~~~~~~~~~~~',
  18: '~~~~~~~~~~~~~~~~~~~~~YRR~~~~~~~~~~~~',
  19: '~~~~~~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~'
});

const SANS_TORSO_SCAR_P3 = composeGrid(SANS_TORSO_POCKETS, {
  6:  '~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~~~~~~',
  7:  '~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~~~~~',
  8:  '~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~~~~',
  9:  '~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~~~',
  10: '~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~~',
  11: '~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~~',
  12: '~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~~',
  13: '~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~~',
  14: '~~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~~',
  15: '~~~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~~',
  16: '~~~~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~~',
  17: '~~~~~~~~~~~~~~~~~~~~~YY~~~~~~~~~~~~~'
});

// Pixel-grid limbs for extended poses (2x aligned)
const SANS_HAND_UP_GRID = [
  '..KK..KK..',
  '.KWWKKWWK.',
  'KWWWWWWWWK',
  'KWWLWWLWWK',
  '.KWWWWWWK.',
  '..KWWWWK..',
  '..KBBBBK..',
  '..KBBBBK..',
  '.KBBBBBHK.',
  '.KBBBBBBK.',
  '.KDBBBBBK.',
  '.KDBBBBBK.',
  '.KDDDDDDK.',
  '..KKKKKK..'
];

const SANS_ARM_RIGHT_GRID = [
  '............KKKK..',
  '...KKKKKKKKKWWWWK.',
  '.KKHHHHHHHHBWWWWWK',
  'KBBBBBBBBBBBWWLWWK',
  'KBBBBBBBBBBBWWWWK.',
  'KDDDDDDDDDDDKWWK..',
  '.KKKKKKKKKKKKKK...'
];

const SANS_ARM_LEFT_GRID = flipGridH(SANS_ARM_RIGHT_GRID);
const SANS_ARM_DOWN_GRID = rotateGrid180(SANS_HAND_UP_GRID);

const SANS_SHRUG_HAND_LEFT = [
  '.K.K.K..',
  'KWWWWWKK',
  'KWWWWWWK',
  '.KWWWWK.',
  '.KBBBBK.',
  'KBBBBBBK',
  'KDDDDDK.',
  '.KKKKK..'
];
const SANS_SHRUG_HAND_RIGHT = flipGridH(SANS_SHRUG_HAND_LEFT);

// 28x14 Shorts & Pink Slippers
const SANS_LEGS_GRID = [
  '..KKKKKKKKKKKKKKKKKKKKKKKK..',
  '.KWWSSSSSSSSSSSSSSSSSSSSWWK.',
  '.KWWSSSSSSSSLLSSSSSSSSSSWWK.',
  '.KWWSSSSSSSSSSSSSSSSSSSSWWK.',
  '.KWWSSSSSSSSSSKKSSSSSSSSWWK.',
  '..KKWSSSSSSSKK..KKSSSSSSWKK.',
  '...KKKKKKKKK......KKKKKKKKK.',
  '.....KWWWWK........KWWWWK...',
  '.....KWLLWK........KWLLWK...',
  '....KKWWWWKK......KKWWWWKK..',
  '..KKPPPPPPPPK....KPPPPPPPPKK',
  '.KWWPPPPPPPPK....KPPPPPPPPWW',
  '.KPQQQQQQQQPK....KPQQQQQQQQP',
  '..KKKKKKKKKK......KKKKKKKKKK'
];

const SANS_SWEAT_GRID = [
  '..K..',
  '.KAK.',
  'KAAWK',
  'KAAAK',
  'KAAAK',
  '.KKK.'
];

const SANS_PIXEL_Z_BIG = [
  'KKKKKKK',
  'KWWWWWK',
  'KKKWWKK',
  '..KWWK.',
  '.KWWKK.',
  'KWWWWWK',
  'KKKKKKK'
];

const SANS_PIXEL_Z_SMALL = [
  'KKKKK',
  'KWWWK',
  '.KWKK',
  'KWWWK',
  'KKKKK'
];

export function drawSansBattle(ctx, cx, baseY, options = {}) {
  const {
    time = 0,
    expression = 'normal',
    pose = 'pockets',
    phase = 1,
    dodgeOffsetX = 0,
    flashAlpha = 0,
    hurtShake = 0,
    sweat = false,
    auraIntensity = 0
  } = options;

  const isSleeping = expression === 'sleeping';
  const breathSpeed = phase >= 2 ? 4.8 : 2.9;
  const torsoBobY = isSleeping ? Math.sin(time * 1.8) * 1.5 : Math.sin(time * breathSpeed) * 2.5;
  const headBobY = isSleeping ? Math.sin(time * 1.8) * 2.2 : Math.sin(time * breathSpeed - 0.5) * 3.0;
  const swayX = isSleeping ? 0 : Math.cos(time * (breathSpeed * 0.5)) * 1.4;
  const shakeX = hurtShake > 0 ? (Math.random() - 0.5) * hurtShake : 0;

  const x = Math.round(cx + dodgeOffsetX + shakeX);
  const y = Math.round(baseY);
  const scale = 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Phase 2/3 crisp pixel-art aura motes behind Sans
  if (phase >= 2 || auraIntensity > 0) {
    const auraColor = phase >= 3 ? '#ff3c3c' : '#2ce8f5';
    const auraSub = phase >= 3 ? '#ff9b40' : '#96fff4';
    const moteCount = phase >= 3 ? 16 : 10;
    const baseAlpha = Math.min(0.85, 0.35 + auraIntensity * 0.45);
    for (let i = 0; i < moteCount; i++) {
      const cycle = ((time * (1.2 + (i % 3) * 0.35) + i * 0.19) % 1);
      const px = Math.round((x + Math.sin(i * 2.1 + time * 1.6) * (34 + (i % 4) * 10)) / 2) * 2;
      const py = Math.round((y - 12 - cycle * 110) / 2) * 2;
      const sz = cycle < 0.5 ? 4 : 2;
      ctx.globalAlpha = baseAlpha * (1 - cycle);
      ctx.fillStyle = i % 3 === 0 ? auraSub : auraColor;
      ctx.fillRect(px, py, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  // 1. Shorts & Pink Slippers (28x14 @ 2x = 56x28)
  const legsX = x - 28;
  const legsY = y - 28;
  const legsSpr = drawPixelGrid(SANS_LEGS_GRID, SANS_PAL, scale, 'sans-b-legs');
  if (legsSpr) {
    ctx.drawImage(legsSpr, legsX, legsY);
  }

  // 2. Hoodie & Ribcage Torso (36x24 @ 2x = 72x48)
  const tx = Math.round(x + swayX * 0.6);
  const ty = Math.round(y - 72 + torsoBobY);
  const torsoX = tx - 36;

  let torsoGrid = SANS_TORSO_POCKETS;
  let torsoKey = 'pockets';
  if (pose === 'damaged') {
    torsoGrid = SANS_TORSO_DAMAGED;
    torsoKey = 'damaged';
  } else if (pose === 'shrug') {
    torsoGrid = SANS_TORSO_SHRUG;
    torsoKey = 'shrug';
  } else if (phase >= 3) {
    torsoGrid = SANS_TORSO_SCAR_P3;
    torsoKey = 'scar-p3';
  }

  const torsoSpr = drawPixelGrid(torsoGrid, SANS_PAL, scale, `sans-b-torso-${torsoKey}`);
  if (torsoSpr) {
    ctx.drawImage(torsoSpr, torsoX, ty);
  }

  // Phase-tinted crisp pixel rim lighting along hoodie silhouette & chest slash embers
  if (phase >= 2 && !isSleeping) {
    const rimClr = phase >= 5 ? '#e879f9' : phase >= 3 ? '#ff3c3c' : '#2ce8f5';
    ctx.fillStyle = rimClr;
    ctx.globalAlpha = 0.7 + Math.sin(time * 8) * 0.2;
    // Left & right hoodie shoulder pixel rims
    ctx.fillRect(torsoX + 2, ty + 6, 2, 16);
    ctx.fillRect(torsoX + 68, ty + 6, 2, 16);
    ctx.fillRect(torsoX + 4, ty + 2, 10, 2);
    ctx.fillRect(torsoX + 58, ty + 2, 10, 2);
    ctx.globalAlpha = 1;
  }

  if ((phase >= 3 || pose === 'damaged') && !isSleeping) {
    for (let e = 0; e < 5; e++) {
      const cycle = (time * 2.6 + e * 0.23) % 1;
      const ex = torsoX + 26 + e * 4 + Math.round(Math.sin(time * 9 + e) * 2);
      const ey = ty + 28 - Math.round(cycle * 16);
      ctx.globalAlpha = (1 - cycle) * 0.9;
      ctx.fillStyle = cycle < 0.3 ? '#fff3a8' : (e % 2 === 0 ? '#ff3c3c' : '#ff8c24');
      ctx.fillRect(Math.round(ex / 2) * 2, Math.round(ey / 2) * 2, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // Animated hoodie hem & collar flutter in high-intensity phases
  if (phase >= 2 && !isSleeping) {
    const flutter = Math.round(Math.sin(time * 9.5) * 2);
    ctx.fillStyle = '#1b50a8';
    ctx.fillRect(torsoX + 4, ty + 44, 6, 4 + (flutter > 0 ? 2 : 0));
    ctx.fillRect(torsoX + 62, ty + 44, 6, 4 + (flutter < 0 ? 2 : 0));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(torsoX + 18 + (flutter > 0 ? 2 : 0), ty + 2, 4, 4);
  }

  // Pose-specific extended pixel-grid limbs (snapped cleanly to 2x grid)
  if (pose === 'shrug') {
    const lh = drawPixelGrid(SANS_SHRUG_HAND_LEFT, SANS_PAL, scale, 'sans-shrug-l');
    const rh = drawPixelGrid(SANS_SHRUG_HAND_RIGHT, SANS_PAL, scale, 'sans-shrug-r');
    if (lh) ctx.drawImage(lh, tx - 48, ty + 4);
    if (rh) ctx.drawImage(rh, tx + 32, ty + 4);
  } else if (pose === 'slamUp') {
    const upArm = drawPixelGrid(SANS_HAND_UP_GRID, SANS_PAL, scale, 'sans-arm-up');
    if (upArm) ctx.drawImage(upArm, tx + 26, ty - 16);
  } else if (pose === 'slamDown') {
    const downArm = drawPixelGrid(SANS_ARM_DOWN_GRID, SANS_PAL, scale, 'sans-arm-down');
    if (downArm) ctx.drawImage(downArm, tx + 26, ty + 18);
  } else if (pose === 'slamRight') {
    const rArm = drawPixelGrid(SANS_ARM_RIGHT_GRID, SANS_PAL, scale, 'sans-arm-right');
    if (rArm) ctx.drawImage(rArm, tx + 26, ty + 10);
  } else if (pose === 'slamLeft') {
    const lArm = drawPixelGrid(SANS_ARM_LEFT_GRID, SANS_PAL, scale, 'sans-arm-left');
    if (lArm) ctx.drawImage(lArm, tx - 62, ty + 10);
  }

  // 3. Skull Head (28x24 @ 2x = 56x48)
  const hx = Math.round(x + swayX);
  const hy = Math.round(y - 110 + headBobY);
  const headX = hx - 28;

  let headKey = expression;
  if (expression === 'blueEye') {
    const isYellow = Math.floor(time * 16) % 2 === 0;
    headKey = isYellow ? 'blueEyeYellow' : 'blueEyeCyan';
  } else if (!SANS_HEAD_VARIANTS[headKey]) {
    headKey = 'normal';
  }

  const headGrid = SANS_HEAD_VARIANTS[headKey];
  const headSpr = drawPixelGrid(headGrid, SANS_PAL, scale, `sans-b-head-${headKey}`);
  if (headSpr) {
    ctx.drawImage(headSpr, headX, hy);
  }

  // Phase skull dome rim highlight
  if (phase >= 2 && !isSleeping) {
    const skullRim = phase >= 5 ? '#e879f9' : phase >= 3 ? '#ff4d4d' : '#2ce8f5';
    ctx.fillStyle = skullRim;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(headX + 12, hy, 32, 2);
    ctx.fillRect(headX + 4, hy + 8, 2, 14);
    ctx.fillRect(headX + 50, hy + 8, 2, 14);
    ctx.globalAlpha = 1;
  }

  // Phase 2/3 jagged skull crack overlay (when not already cracked/sleeping)
  if (phase >= 2 && expression !== 'cracked' && !isSleeping) {
    const crackSpr = drawPixelGrid(SANS_CRACK_OVERLAY, SANS_PAL, scale, 'sans-b-crack');
    if (crackSpr) {
      ctx.drawImage(crackSpr, headX, hy);
    }
  }

  // Animated multi-layer cyan/gold pixel eye flame ribbon for blueEye
  if (expression === 'blueEye') {
    const isYellow = Math.floor(time * 16) % 2 === 0;
    const eyeMain = isYellow ? '#ffef3f' : '#2ce8f5';
    const eyeOuter = isYellow ? '#ff8c1a' : '#0072e5';
    const eyeHot = '#ffffff';

    // Crisp pupil crosshair glints
    ctx.fillStyle = eyeMain;
    ctx.fillRect(hx + 6, hy + 18, 12, 2);
    ctx.fillRect(hx + 11, hy + 13, 2, 12);
    ctx.fillStyle = eyeHot;
    ctx.fillRect(hx + 10, hy + 17, 4, 4);

    // 12-segment swirling multi-layer pixel flame ribbon
    for (let i = 0; i < 12; i++) {
      const t = ((time * 5.2 + i * 0.085) % 1);
      const sway = Math.sin(time * 20 + i * 0.75) * (2 + t * 5);
      const px = Math.round((hx + 11 + t * 22 + sway) / 2) * 2;
      const py = Math.round((hy + 20 - t * 32) / 2) * 2;

      if (t < 0.75) {
        ctx.globalAlpha = Math.max(0.15, (1 - t) * 0.7);
        ctx.fillStyle = eyeOuter;
        ctx.fillRect(px - 2, py, 6, 4);
      }
      ctx.globalAlpha = Math.max(0.2, 1 - t * 0.85);
      ctx.fillStyle = t < 0.24 ? eyeHot : eyeMain;
      const coreSz = t < 0.45 ? 4 : 2;
      ctx.fillRect(px, py, coreSz, coreSz);
    }
    ctx.globalAlpha = 1;
  }

  // Animated pixel-art sweat drop
  if (sweat || phase >= 2) {
    const dropStep = Math.floor(((time * 24) % 12) / 2) * 2;
    const sweatSpr = drawPixelGrid(SANS_SWEAT_GRID, SANS_PAL, scale, 'sans-b-sweat');
    if (sweatSpr) {
      ctx.drawImage(sweatSpr, headX + 2, hy + 8 + dropStep);
    }
  }

  // Floating pixel Zzz when sleeping
  if (isSleeping) {
    const zSprBig = drawPixelGrid(SANS_PIXEL_Z_BIG, SANS_PAL, scale, 'sans-z-big');
    const zSprSm = drawPixelGrid(SANS_PIXEL_Z_SMALL, SANS_PAL, scale, 'sans-z-sm');
    const zFloat = (time * 18) % 24;
    if (zSprBig) {
      ctx.globalAlpha = Math.max(0.15, 1 - zFloat / 24);
      ctx.drawImage(zSprBig, Math.round(hx + 24 + zFloat * 0.5), Math.round(hy - 4 - zFloat));
    }
    if (zSprSm) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(zSprSm, Math.round(hx + 38 + zFloat * 0.3), Math.round(hy - 16 - zFloat * 0.6));
    }
    ctx.globalAlpha = 1;
  }

  // White pixel silhouette flash on hit / transition
  if (flashAlpha > 0) {
    const whitePal = makeWhiteSilhouettePalette(SANS_PAL);
    ctx.globalAlpha = Math.min(1, flashAlpha);
    const wLegs = drawPixelGrid(SANS_LEGS_GRID, whitePal, scale, 'sans-w-legs');
    const wTorso = drawPixelGrid(torsoGrid, whitePal, scale, `sans-w-torso-${torsoKey}`);
    const wHead = drawPixelGrid(headGrid, whitePal, scale, `sans-w-head-${headKey}`);
    if (wLegs) ctx.drawImage(wLegs, legsX, legsY);
    if (wTorso) ctx.drawImage(wTorso, torsoX, ty);
    if (wHead) ctx.drawImage(wHead, headX, hy);
  }

  ctx.restore();
}

// ============================================================================
// 5. W.D. GASTER OVERLAY & PALM-HOLE HANDS
// ============================================================================

const GASTER_PAL = {
  K: '#06060b', // void black cloak & sockets
  D: '#191829', // dark spectral cloak shading
  V: '#5d47a8', // eerie violet rim
  W: '#f0f2fc', // pale cracked skull
  L: '#b4bcd4'  // pale bone shading
};

// 32x48 Mysteryman silhouette
const GASTER_BODY_GRID = [
  '...........KKKKKKKKKK...........',
  '.........KKWWWWWWWWWWKK.........',
  '........KWWWWWWWWWWWWWWK........',
  '.......KWWWWWWKKKKWWWWWWK.......',
  '......KWWWWWWWKKKKWWWWWWWK......',
  '......KWWLWWWWWWWWWWWWLWWK......',
  '......KWWKKKKWWWWWKKKKWWWK......',
  '......KWWKKKKKWWWKKKKKWWWK......',
  '......KWWKKKKKWWWKKKKKWWWK......',
  '......KWWLKKKWWKWWKKKLWWWK......',
  '.......KWWWWWWWKWWWWWWWWK.......',
  '.......KWWWWWWWKWWWWWWWWK.......',
  '........KLLWWKKKKKWWLLKK........',
  '.........KKLLKKKKKLLKK..........',
  '...........KKKKKKKKK............',
  '.........KKDDDDDDDDDKK..........',
  '.......KKDDKKKKKKKKKDDKK........',
  '......KDDKKKKKKKKKKKKKDDK.......',
  '.....KDDKKKKKKKKKKKKKKKDDK......',
  '....KVKKKKKKKKKKKKKKKKKKKVK.....',
  '....KDKKKKKKKKKKKKKKKKKKKDK.....',
  '...KVDKKKKKKKKKKKKKKKKKKKDVK....',
  '...KDKKKKKKKKKKKKKKKKKKKKKDK....',
  '..KVKKKKKKKKKKKKKKKKKKKKKKKVK...',
  '..KDKKKKKKKKKKKKKKKKKKKKKKKDK...',
  '..KDKKKKKKKKKKKKKKKKKKKKKKKDK...',
  '.KVKKKKKKKKKKKKKKKKKKKKKKKKKVK..',
  '.KDKKKKKKKKKKKKKKKKKKKKKKKKKDK..',
  '.KDKKKKKKKKKKKKKKKKKKKKKKKKKDK..',
  '.KDKKKKKKKKKKKKKKKKKKKKKKKKKDK..',
  '.KDKKKKKKKKKKKKKKKKKKKKKKKKKDK..',
  '.KVKKKKKKKKKKKKKKKKKKKKKKKKKVK..',
  '..KDKKKKKKKKKKKKKKKKKKKKKKKDK...',
  '..KDKKKKKKKKKKKKKKKKKKKKKKKDK...',
  '..KDKKKKKKKKKKKKKKKKKKKKKKKDK...',
  '..KVKKKKKKKKKKKKKKKKKKKKKKKVK...',
  '...KDKKKKKKKKKKKKKKKKKKKKKDK....',
  '...KDKKKKKKKKKKKKKKKKKKKKKDK....',
  '...KDKKKKKKKKKKKKKKKKKKKKKDK....',
  '...KVKKKKKKKKKKKKKKKKKKKKKVK....',
  '....KDKKKKKKKKKKKKKKKKKKKDK.....',
  '....KDKKKKKKKKKKKKKKKKKKKDK.....',
  '....KDK.KKKKKKKKKKKKKKK.KDK.....',
  '....KK...KKKKKKKKKKKKK...KK.....',
  '..........KKKK...KKKK...........',
  '..........KKK.....KKK...........',
  '...........K.......K............',
  '................................'
];

// Asymmetric Mysteryman eye cracks (left up, right down)
const GASTER_CRACKED_BODY = composeGrid(GASTER_BODY_GRID, {
  3:  '~~~~~~~~~KK~~~~~~~~~~~~~~~~~~~~~',
  4:  '~~~~~~~~~K~~~~~~~~~~~~~~~~~~~~~~',
  5:  '~~~~~~~~~K~~~~~~~~~~~~~~~~~~~~~~',
  10: '~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~',
  11: '~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~',
  12: '~~~~~~~~~~~~~~~~~~~~K~~~~~~~~~~~'
});

// 16x18 Skeletal Hand with hollow palm hole (right hand orientation)
const GASTER_HAND_RIGHT = [
  '.....KK..KK.....',
  '....KWWKKWWK....',
  '..KKKWWKKWWKKK..',
  '.KWWKWWKKWWKWWK.',
  '.KWWKWWKKWWKWWK.',
  '.KWWLWWLLWWLWWK.',
  '..KWWWWWWWWWWK..',
  '..KWWKKKKKKWWK..',
  '.KKWKKKKKKKKWKK.',
  'KWWKKKKKKKKKKWWK',
  'KWWLKKKKKKKKLWWK',
  '.KWWKKKKKKKKWWK.',
  '..KWWKKKKKKWWK..',
  '..KWWWWWWWWWWK..',
  '...KLLWWWWLLK...',
  '....KWWWWWWK....',
  '....KLLWWLLK....',
  '.....KKKKKK.....'
];

const GASTER_HAND_LEFT = flipGridH(GASTER_HAND_RIGHT);

export function drawGasterOverlay(ctx, cx, baseY, options = {}) {
  const {
    time = 0,
    alpha = 0.85,
    activeHands = true,
    leftHandX = null,
    leftHandY = null,
    rightHandX = null,
    rightHandY = null,
    handGlow = false
  } = options;

  const bodySpr = drawPixelGrid(GASTER_CRACKED_BODY, GASTER_PAL, 3, 'gaster-body-v1');
  const floatY = Math.round(Math.sin(time * 2.1) * 4);
  const glitchX = Math.sin(time * 19) > 0.94 ? (Math.sin(time * 43) > 0 ? 2 : -2) : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;

  if (bodySpr) {
    // Looming behind Sans (32*3 = 96w, 48*3 = 144h)
    const gx = Math.round(cx - 48 + glitchX);
    const gy = Math.round(baseY - 148 + floatY);
    ctx.drawImage(bodySpr, gx, gy);
  }

  if (activeHands) {
    const lhX = leftHandX !== null ? leftHandX : cx - 115;
    const lhY = leftHandY !== null ? leftHandY : baseY - 75 + Math.sin(time * 3.1) * 5;
    const rhX = rightHandX !== null ? rightHandX : cx + 115;
    const rhY = rightHandY !== null ? rightHandY : baseY - 75 + Math.cos(time * 2.9) * 5;

    const handScale = 2.5;
    const hw = Math.round(16 * handScale); // 40
    const hh = Math.round(18 * handScale); // 45

    const lSpr = drawPixelGrid(GASTER_HAND_LEFT, GASTER_PAL, 2, 'gaster-hand-l');
    const rSpr = drawPixelGrid(GASTER_HAND_RIGHT, GASTER_PAL, 2, 'gaster-hand-r');

    const drawHandWithGlow = (spr, hx, hy, phaseOff) => {
      const dx = Math.round(hx - hw / 2);
      const dy = Math.round(hy - hh / 2);
      if (handGlow) {
        const pulse = (Math.sin(time * 8 + phaseOff) + 1) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha * (0.55 + pulse * 0.35);
        ctx.fillStyle = pulse > 0.5 ? '#2ce8f5' : '#b464ff';
        const cxPalm = Math.round(hx);
        const cyPalm = Math.round(hy + 2);
        // Pixelated aura ring around palm hole
        ctx.fillRect(cxPalm - 6, cyPalm - 6, 4, 4);
        ctx.fillRect(cxPalm + 2, cyPalm - 6, 4, 4);
        ctx.fillRect(cxPalm - 6, cyPalm + 2, 4, 4);
        ctx.fillRect(cxPalm + 2, cyPalm + 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cxPalm - 2, cyPalm - 2, 4, 4);
        ctx.restore();
      }
      if (spr) {
        ctx.drawImage(spr, dx, dy, hw, hh);
      }
    };

    drawHandWithGlow(lSpr, lhX, lhY, 0);
    drawHandWithGlow(rSpr, rhX, rhY, 1.8);
  }

  ctx.restore();
}

// ============================================================================
// 6. GASTER BLASTER (3 distinct pixel-grid skull matrices + pixelated beam)
// ============================================================================

const GB_PAL = {
  K: '#07070c',
  W: '#ffffff',
  L: '#d6dceb',
  G: '#8d96ad',
  C: '#2ce8f5',
  A: '#b8ffff'
};

// Closed skull (28x32 @ 2x = 56x64)
const GB_CLOSED_GRID = [
  '.....KKK............KKK.....',
  '....KWWWK..........KWWWK....',
  '...KWWLWWK.KKKKKK.KWWLWWK...',
  '...KWWLWWKKWWWWWWKKWWLWWK...',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '.KWWWWWWWWWWKKKKWWWWWWWWWWK.',
  '.KWWWWWWKWWWWWWWWWWKWWWWWWK.',
  '.KLLWWWWWKWWWWWWWWKWWWWWLLK.',
  'KLLWWWWWWWWWWWWWWWWWWWWWWLLK',
  'KLLWWWWKKKKKWWWWKKKKKWWWWLLK',
  'KWWWWWWKKKKKKWWKKKKKKWWWWWWK',
  'KWWWWWWKKKKKKWWKKKKKKWWWWWWK',
  '.KWWWWWWKKKKWWWWKKKKWWWWWWK.',
  '.KWWLLWWWWWWWKKWWWWWWWLLWWK.',
  '..KWWLLWWWWWWKKWWWWWWLLWWK..',
  '..KKWWLWWWWWWWWWWWWWWLWWKK..',
  '...KWWWLWWWWWWWWWWWWLWWWK...',
  '...KWWWWKWKWKWWKWKWKWWWWK...',
  '....KWWWKWWWWWWWWWWKWWWK....',
  '....KLLWKKKKKKKKKKKKWLLK....',
  '.....KLLWWWWWWWWWWWWLLK.....',
  '......KKLLLLWWWWLLLLKK......',
  '........KKKKKKKKKKKK........',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................'
];

// Charging skull (jaw hinged open, pupils ignited, mouth core starting)
const GB_CHARGING_GRID = [
  '.....KKK............KKK.....',
  '....KWWWK..........KWWWK....',
  '...KWWLWWK.KKKKKK.KWWLWWK...',
  '...KWWLWWKKWWWWWWKKWWLWWK...',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '.KWWWWWWWWWWKKKKWWWWWWWWWWK.',
  '.KWWWWWWKWWWWWWWWWWKWWWWWWK.',
  '.KLLWWWWWKWWWWWWWWKWWWWWLLK.',
  'KLLWWWWWWWWWWWWWWWWWWWWWWLLK',
  'KLLWWWWKKKKKWWWWKKKKKWWWWLLK',
  'KWWWWWWKKWWKKWWKKWWKKWWWWWWK',
  'KWWWWWWKKCWKKWWKKWCKKWWWWWWK',
  '.KWWWWWWKKKKWWWWKKKKWWWWWWK.',
  '.KWWLLWWWWWWWKKWWWWWWWLLWWK.',
  '..KWWLLWWWWWWKKWWWWWWLLWWK..',
  '..KKWWLWWWWWWWWWWWWWWLWWKK..',
  '...KWWWLWWWWKAAKWWWWLWWWK...',
  '...KWWWWKWKKCCCCKKWKWKWWK...',
  '....KWWWKKKKCAAAKKKKWWWK....',
  '....KLLWK..KCCCCK..KWLLK....',
  '.....KKK...KWWWWK...KKK.....',
  '......KLLWWKWWWWKWWLLK......',
  '......KKWWWWWWWWWWWWKK......',
  '.......KLLWWWWWWWWLLK.......',
  '........KKKKKKKKKKKK........',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................'
];

// Roaring skull (28x36 @ 2x = 56x72: wide blazing eyes & full-drop jaw)
const GB_ROARING_GRID = [
  '.....KKK............KKK.....',
  '....KWWWK..........KWWWK....',
  '...KWWLWWK.KKKKKK.KWWLWWK...',
  '...KWWLWWKKWWWWWWKKWWLWWK...',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '..KWWLWWWWWWWWWWWWWWWWLWWK..',
  '.KWWWWWWWWWWKKKKWWWWWWWWWWK.',
  '.KWWWWWWKWWWWWWWWWWKWWWWWWK.',
  '.KLLWWWWWKWWWWWWWWKWWWWWLLK.',
  'KLLWWWWWWWWWWWWWWWWWWWWWWLLK',
  'KLLWWWWKKKKKWWWWKKKKKWWWWLLK',
  'KWWWWWWKCCCKKWWKKCCCKWWWWWWK',
  'KWWWWWWKCWCKKWWKKCWCKWWWWWWK',
  '.KWWWWWWKKKKWWWWKKKKWWWWWWK.',
  '.KWWLLWWWWWWWKKWWWWWWWLLWWK.',
  '..KWWLLWWWWWWKKWWWWWWLLWWK..',
  '..KKWWLWWWWWWWWWWWWWWLWWKK..',
  '...KWWWLWWWKAAAAKWWWLWWWK...',
  '...KWWWWKWKCCCCCCKWKWWWWK...',
  '....KWWWKKAAAAAAAAKKWWWK....',
  '....KLLWKCCCCCCCCCCKWLLK....',
  '.....KKK.CCAAAAAAACC.KKK....',
  '.....KLLK.CCCCCCCC.KLLK.....',
  '.....KWWK..........KWWK.....',
  '......KWK..........KWK......',
  '......KWWK........KWWK......',
  '.......KWWKKKKKKKKWWK.......',
  '.......KLLWWWWWWWWLLK.......',
  '........KKWWWWWWWWKK........',
  '.........KKKKKKKKKK.........',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................',
  '............................'
];

export function drawGasterBlaster(
  ctx,
  x,
  y,
  angle,
  scale = 1,
  jawOpen = 0,
  charging = 0,
  beamActive = false,
  beamLen = 900
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  if (scale !== 1) ctx.scale(scale, scale);

  // Pixelated dashed warning sightline & converging charge reticle while charging
  if (!beamActive && charging > 0) {
    ctx.save();
    const hotLock = charging > 0.72;
    ctx.fillStyle = hotLock
      ? `rgba(255, 239, 63, ${Math.min(0.9, 0.3 + charging * 0.55)})`
      : `rgba(255, 255, 255, ${Math.min(0.85, 0.22 + charging * 0.45)})`;
    for (let dy = 14; dy < beamLen; dy += 16) {
      ctx.fillRect(-1, dy, 2, 8);
    }
    // Corridor rail guide ticks
    ctx.fillStyle = `rgba(44, 232, 245, ${Math.min(0.45, charging * 0.4)})`;
    for (let dy = 20; dy < beamLen; dy += 40) {
      ctx.fillRect(-14, dy, 2, 4);
      ctx.fillRect(12, dy, 2, 4);
    }

    const now = typeof performance !== 'undefined' ? performance.now() * 0.014 : 0;
    const radius = Math.max(4, (1 - Math.min(1, charging)) * 24 + 5);
    for (let i = 0; i < 8; i++) {
      const a = now + i * (Math.PI / 4);
      const sx = Math.round(Math.cos(a) * radius);
      const sy = Math.round(14 + Math.sin(a) * radius * 0.52);
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : (hotLock ? '#ffef3f' : '#2ce8f5');
      ctx.fillRect(sx - 2, sy - 2, i % 2 === 0 ? 4 : 2, i % 2 === 0 ? 4 : 2);
    }
    ctx.restore();
  }

  // Pixelated beam core + outer dither glow + plasma crackle + muzzle shockwaves along local +Y
  if (beamActive) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulseStep = Math.sin(now * 0.04) > 0 ? 2 : 0;
    const coreHalf = 12 + pulseStep;
    const cyanHalf = coreHalf + 4;
    const ditherHalf = cyanHalf + 8;

    // Outer dither glow (checkerboard 4x4 pixel glow strips along edges)
    ctx.fillStyle = 'rgba(130, 240, 255, 0.35)';
    ctx.fillRect(-ditherHalf, 14, ditherHalf * 2, beamLen);

    const step = 4;
    ctx.fillStyle = 'rgba(200, 248, 255, 0.58)';
    for (let by = 14; by < Math.min(beamLen, 920); by += step) {
      const parity = ((by / step) + Math.floor(now * 0.03)) % 2;
      if (parity === 0) {
        ctx.fillRect(-ditherHalf - 4, by, 4, step);
        ctx.fillRect(ditherHalf, by, 4, step);
      }
    }

    // Crisp cyan inner border
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(-cyanHalf, 12, cyanHalf * 2, beamLen);

    // Pure white pixelated core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-coreHalf, 10, coreHalf * 2, beamLen);

    // High-voltage plasma chevrons & zigzags inside the beam
    ctx.fillStyle = '#d8ffff';
    for (let by = 24; by < Math.min(beamLen, 720); by += 26) {
      const zig = Math.sin(now * 0.05 + by * 0.1) > 0 ? 1 : -1;
      ctx.fillRect(zig * (coreHalf - 3), by, 4, 8);
      ctx.fillStyle = '#2ce8f5';
      ctx.fillRect(-4, by + 6, 8, 2);
      ctx.fillStyle = '#d8ffff';
    }

    // Stepped pixel muzzle shockwave rings & wing flare at mouth origin
    const waveOffset = Math.floor((now * 0.09) % 18);
    const waveHalf = coreHalf + 8 + Math.floor(waveOffset * 0.45);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-coreHalf - 8, 12, (coreHalf + 8) * 2, 10);
    ctx.fillStyle = '#a8f8ff';
    ctx.fillRect(-coreHalf - 14, 14, (coreHalf + 14) * 2, 6);
    ctx.fillStyle = '#2ce8f5';
    ctx.fillRect(-waveHalf, 20 + waveOffset, 4, 4);
    ctx.fillRect(waveHalf - 4, 20 + waveOffset, 4, 4);
    ctx.fillRect(-waveHalf + 6, 22 + waveOffset, (waveHalf - 6) * 2, 2);
  }

  // Select 1 of the 3 distinct skull matrices
  let grid = GB_CLOSED_GRID;
  let key = 'closed';
  if (beamActive || jawOpen >= 0.7) {
    grid = GB_ROARING_GRID;
    key = 'roaring';
  } else if (jawOpen >= 0.25) {
    grid = GB_CHARGING_GRID;
    key = 'charging';
  }

  const spr = drawPixelGrid(grid, GB_PAL, 2, `gb-${key}`);
  if (spr) {
    ctx.drawImage(spr, -28, -28);
  }

  ctx.restore();
}

// ============================================================================
// 7. PIXEL-ART BONES & BONE WHEEL
// ============================================================================

const BONE_PALETTES = {
  white: {
    fill: '#ffffff',
    hi: '#ffffff',
    sh: '#c8d0e0',
    out: '#07070c',
    crack: '#1a1a24'
  },
  blue: {
    fill: '#1ec8ff',
    hi: '#9bf0ff',
    sh: '#0f82c4',
    out: '#07070c',
    crack: '#042a47'
  },
  orange: {
    fill: '#ff9b26',
    hi: '#ffd588',
    sh: '#c25b0c',
    out: '#07070c',
    crack: '#3d1902'
  },
  green: {
    fill: '#4ade80',
    hi: '#b5facd',
    sh: '#1c9648',
    out: '#07070c',
    crack: '#073317'
  },
  yellow: {
    fill: '#ffef3f',
    hi: '#fff9b0',
    sh: '#c99e0e',
    out: '#07070c',
    crack: '#1c1304'
  },
  purple: {
    fill: '#e879f9',
    hi: '#fae8ff',
    sh: '#9333ea',
    out: '#07070c',
    crack: '#2e1065'
  }
};

export function drawBone(ctx, x, y, w, h, colorType = 'white', orientation = 'vertical') {
  const pal = BONE_PALETTES[colorType] || BONE_PALETTES.white;

  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.max(4, Math.round(w));
  const rh = Math.max(4, Math.round(h));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (orientation === 'vertical') {
    const capH = Math.max(4, Math.min(8, Math.floor(rh * 0.28)));
    const midX = rx + Math.floor(rw / 2);

    // Dark pixel outline behind shaft & knuckle caps
    ctx.fillStyle = pal.out;
    ctx.fillRect(rx - 1, ry + 1, rw + 2, rh - 2);
    ctx.fillRect(rx - 3, ry + 1, rw + 6, capH);
    ctx.fillRect(rx - 3, ry + rh - capH - 1, rw + 6, capH);

    // Main bone shaft
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rx, ry + 1, rw, rh - 2);

    // Inner shade on right edge, highlight on left edge, and neon inner core spine
    if (rw >= 6) {
      ctx.fillStyle = pal.hi;
      ctx.fillRect(rx + 1, ry + 2, 2, rh - 4);
      ctx.fillStyle = pal.sh;
      ctx.fillRect(rx + rw - 2, ry + 2, 2, rh - 4);
      ctx.fillStyle = colorType === 'white' ? '#f8fbff' : '#ffffff';
      ctx.globalAlpha = colorType === 'white' ? 0.45 : 0.72;
      ctx.fillRect(midX - 1, ry + capH, 2, Math.max(2, rh - capH * 2));
      ctx.globalAlpha = 1;
    }

    // Top pixel-art dual knuckle condyles
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rx - 2, ry + 2, rw + 4, capH - 2);
    ctx.fillRect(rx - 1, ry, Math.max(2, midX - rx), 2);
    ctx.fillRect(midX + 1, ry, Math.max(2, rx + rw + 1 - (midX + 1)), 2);
    // Condyle crown specular pips
    ctx.fillStyle = pal.hi;
    ctx.fillRect(rx, ry + 2, 2, 2);
    ctx.fillRect(rx + rw - 2, ry + 2, 2, 2);
    // Top center cleft notch
    ctx.fillStyle = pal.out;
    ctx.fillRect(midX - 1, ry, 2, 2);

    // Bottom pixel-art dual knuckle condyles
    const botY = ry + rh - capH;
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rx - 2, botY, rw + 4, capH - 2);
    ctx.fillRect(rx - 1, ry + rh - 2, Math.max(2, midX - rx), 2);
    ctx.fillRect(midX + 1, ry + rh - 2, Math.max(2, rx + rw + 1 - (midX + 1)), 2);
    ctx.fillStyle = pal.hi;
    ctx.fillRect(rx, ry + rh - 4, 2, 2);
    // Bottom center cleft notch
    ctx.fillStyle = pal.out;
    ctx.fillRect(midX - 1, ry + rh - 2, 2, 2);

    // Destructible yellow bone dark fracture pixel lines
    if (colorType === 'yellow') {
      ctx.fillStyle = pal.crack;
      const step = 18;
      for (let cy = ry + capH + 3; cy < ry + rh - capH - 4; cy += step) {
        const dir = ((cy - ry) / step) % 2 === 0 ? 1 : -1;
        const startX = dir > 0 ? rx + 1 : rx + rw - 3;
        ctx.fillRect(startX, cy, 2, 2);
        ctx.fillRect(startX + dir * 2, cy + 2, 2, 2);
        ctx.fillRect(startX + dir * 4, cy + 3, Math.max(2, rw - 6), 2);
        ctx.fillRect(startX + dir * 2, cy + 5, 2, 2);
      }
    }
  } else {
    const capW = Math.max(4, Math.min(8, Math.floor(rw * 0.28)));
    const midY = ry + Math.floor(rh / 2);

    // Dark pixel outline behind shaft & knuckle caps
    ctx.fillStyle = pal.out;
    ctx.fillRect(rx + 1, ry - 1, rw - 2, rh + 2);
    ctx.fillRect(rx + 1, ry - 3, capW, rh + 6);
    ctx.fillRect(rx + rw - capW - 1, ry - 3, capW, rh + 6);

    // Main horizontal bone shaft
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rx + 1, ry, rw - 2, rh);

    if (rh >= 6) {
      ctx.fillStyle = pal.hi;
      ctx.fillRect(rx + 2, ry + 1, rw - 4, 2);
      ctx.fillStyle = pal.sh;
      ctx.fillRect(rx + 2, ry + rh - 2, rw - 4, 2);
      ctx.fillStyle = colorType === 'white' ? '#f8fbff' : '#ffffff';
      ctx.globalAlpha = colorType === 'white' ? 0.45 : 0.72;
      ctx.fillRect(rx + capW, midY - 1, Math.max(2, rw - capW * 2), 2);
      ctx.globalAlpha = 1;
    }

    // Left pixel-art dual knuckle condyles
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rx + 2, ry - 2, capW - 2, rh + 4);
    ctx.fillRect(rx, ry - 1, 2, Math.max(2, midY - ry));
    ctx.fillRect(rx, midY + 1, 2, Math.max(2, ry + rh + 1 - (midY + 1)));
    ctx.fillStyle = pal.hi;
    ctx.fillRect(rx + 2, ry, 2, 2);
    ctx.fillStyle = pal.out;
    ctx.fillRect(rx, midY - 1, 2, 2);

    // Right pixel-art dual knuckle condyles
    const rightX = rx + rw - capW;
    ctx.fillStyle = pal.fill;
    ctx.fillRect(rightX, ry - 2, capW - 2, rh + 4);
    ctx.fillRect(rx + rw - 2, ry - 1, 2, Math.max(2, midY - ry));
    ctx.fillRect(rx + rw - 2, midY + 1, 2, Math.max(2, ry + rh + 1 - (midY + 1)));
    ctx.fillStyle = pal.hi;
    ctx.fillRect(rx + rw - 4, ry, 2, 2);
    ctx.fillStyle = pal.out;
    ctx.fillRect(rx + rw - 2, midY - 1, 2, 2);

    // Destructible yellow bone dark fracture pixel lines
    if (colorType === 'yellow') {
      ctx.fillStyle = pal.crack;
      const step = 18;
      for (let cx = rx + capW + 3; cx < rx + rw - capW - 4; cx += step) {
        const dir = ((cx - rx) / step) % 2 === 0 ? 1 : -1;
        const startY = dir > 0 ? ry + 1 : ry + rh - 3;
        ctx.fillRect(cx, startY, 2, 2);
        ctx.fillRect(cx + 2, startY + dir * 2, 2, 2);
        ctx.fillRect(cx + 3, startY + dir * 4, 2, Math.max(2, rh - 6));
        ctx.fillRect(cx + 5, startY + dir * 2, 2, 2);
      }
    }
  }

  ctx.restore();
}

// 16x16 Skull/Core Hub for Bone Wheel
const BONE_WHEEL_HUB_GRID = [
  '....KKKKKKKK....',
  '..KKWWWWWWWWKK..',
  '.KWWWWWWWWWWWWK.',
  '.KWWLLWWWWLLWWK.',
  'KWWKKKKWWKKKKWWK',
  'KWWKKKKWWKKKKWWK',
  'KWWLKKLWWLKKLWWK',
  'KWWWWWWKKWWWWWWK',
  'KLLWWWWWWWWWWLLK',
  '.KKWWKWWWWKWWKK.',
  '..KWWKWKKWKWWK..',
  '..KWWKWKKWKWWK..',
  '...KKLLLLLLKK...',
  '....KKKKKKKK....',
  '................',
  '................'
];

export function drawBoneWheel(ctx, x, y, radius, angle, spokes = 6, colorType = 'white') {
  const pal = BONE_PALETTES[colorType] || BONE_PALETTES.white;
  const cx = Math.round(x);
  const cy = Math.round(y);
  const rStart = Math.min(12, Math.max(6, Math.round(radius * 0.24)));
  const boneLen = Math.max(8, Math.round(radius - rStart));

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy);

  for (let i = 0; i < spokes; i++) {
    const a = angle + (i * Math.PI * 2) / spokes;
    ctx.save();
    ctx.rotate(a);
    drawBone(ctx, -4, rStart, 8, boneLen, colorType, 'vertical');
    ctx.restore();
  }

  const hubSize = radius < 30 ? 20 : 28;
  const spikeOffset = Math.round(hubSize * 0.5);

  // Inter-spoke spiked iron-bone hub crown
  for (let i = 0; i < spokes; i++) {
    const a = angle + ((i + 0.5) * Math.PI * 2) / spokes;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = pal.out;
    ctx.fillRect(-3, spikeOffset - 2, 6, 8);
    ctx.fillStyle = pal.sh;
    ctx.fillRect(-2, spikeOffset - 1, 4, 6);
    ctx.fillStyle = pal.hi;
    ctx.fillRect(-1, spikeOffset + 3, 2, 2);
    ctx.restore();
  }

  const hubSpr = drawPixelGrid(
    BONE_WHEEL_HUB_GRID,
    { K: pal.out, W: pal.fill, L: pal.sh },
    2,
    `bone-wheel-hub-${colorType}`
  );
  if (hubSpr) {
    ctx.drawImage(hubSpr, -Math.round(hubSize / 2), -Math.round(hubSize / 2), hubSize, hubSize);
  }

  // Center jewel glint inside the spinning skull hub
  ctx.fillStyle = colorType === 'white' ? '#2ce8f5' : pal.hi;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -1, 2, 2);

  ctx.restore();
}

// ============================================================================
// 8. PIXEL-ART SPEAR (Green Shield SOUL Mode)
// ============================================================================

const SPEAR_PALETTES = {
  white: {
    K: '#07070c',
    H: '#ffffff',
    M: '#dcf8ff',
    S: '#88d8f0'
  },
  green: {
    K: '#07070c',
    H: '#d8ffe6',
    M: '#4ade80',
    S: '#15803d'
  },
  blue: {
    K: '#07070c',
    H: '#d8ffff',
    M: '#2ce8f5',
    S: '#0068c8'
  },
  orange: {
    K: '#07070c',
    H: '#fff0b8',
    M: '#ff9b26',
    S: '#b8450a'
  },
  yellow: {
    K: '#07070c',
    H: '#ffffd4',
    M: '#ffef3f',
    S: '#b58908'
  }
};

// 16x16 Spear pointing UP (used when approaching from 'down' moving up)
const SPEAR_UP_GRID = [
  '.......KK.......',
  '......KHHK......',
  '.....KHHMK......',
  '....KHHMMMK.....',
  '...KHHMMMMMK....',
  '..KHHMMMMMMMK...',
  '..KSSKMMMKSSK...',
  '...KK.KMK.KK....',
  '......KMK.......',
  '......KMK.......',
  '......KMK.......',
  '......KMK.......',
  '.....KSMMK......',
  '....KSSKSSK.....',
  '....KK...KK.....',
  '................'
];

// dir indicates approach origin:
// 'up' -> approaches from above moving DOWN -> points DOWN
// 'down' -> approaches from below moving UP -> points UP
// 'left' -> approaches from left moving RIGHT -> points RIGHT
// 'right' -> approaches from right moving LEFT -> points LEFT
const SPEAR_GRIDS = {
  down: SPEAR_UP_GRID,
  up: rotateGrid180(SPEAR_UP_GRID),
  left: rotateGrid90CW(SPEAR_UP_GRID),
  right: rotateGrid90CCW(SPEAR_UP_GRID)
};

export function drawSpear(ctx, x, y, dir = 'up', colorType = 'white') {
  const dirKey = SPEAR_GRIDS[dir] ? dir : 'up';
  const colorKey = SPEAR_PALETTES[colorType] ? colorType : 'white';
  const spr = drawPixelGrid(
    SPEAR_GRIDS[dirKey],
    SPEAR_PALETTES[colorKey],
    2,
    `spear-${dirKey}-${colorKey}`
  );
  if (!spr) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(x - 16), Math.round(y - 16));
  ctx.restore();
}

// ============================================================================
// 9. DIALOGUE PORTRAITS (24x24 scaled 3x -> 72x72)
// ============================================================================

const PORTRAIT_PAL = {
  K: '#07070c',
  W: '#ffffff',
  L: '#b8c2d8',
  V: '#8f6bff'
};

const PORTRAIT_SANS_BASE = [
  '......KKKKKKKKKKKK......',
  '....KKWWWWWWWWWWWWKK....',
  '...KWWWWWWWWWWWWWWWWK...',
  '..KWWWWWWWWWWWWWWWWWWK..',
  '..KWWLWWWWWWWWWWWWLWWK..',
  '.KWWWWWWWWWWWWWWWWWWWWK.',
  '.KWWWWWWWWWWWWWWWWWWWWK.',
  '.KWWKKKKKKWWWWKKKKKKWWK.',
  '.KWKKKKKKKKWWKKKKKKKKWK.',
  '.KWKKKKKKKKWWKKKKKKKKWK.',
  '.KWKKKKKKKKWWKKKKKKKKWK.',
  '.KWWKKKKKKWWWWKKKKKKWWK.',
  '.KWWWWWWWWWWWWWWWWWWWWK.',
  'KWWWWWWWWWWKKWWWWWWWWWWK',
  'KLLWWWWWWWKKKKWWWWWWWLLK',
  '.KKWKWWWWWWWWWWWWWWKWKK.',
  '..KWKKWWKWWKKWWKWWKKWK..',
  '..KWWKWWKWWKKWWKWWKWWK..',
  '...KWKKKKKKKKKKKKKKWK...',
  '....KLLWWWWWWWWWWLLK....',
  '.....KKLLLLLLLLLLKK.....',
  '.......KKKKKKKKKK.......',
  '........................',
  '........................'
];

const PORTRAIT_GRIDS = {
  sans: [
    composeGrid(PORTRAIT_SANS_BASE, {
      9:  '~~~~~~WW~~~~~~~~WW~~~~~~',
      10: '~~~~~~WW~~~~~~~~WW~~~~~~'
    }),
    composeGrid(PORTRAIT_SANS_BASE, {
      9:  '~~~~~~WW~~~~~~~~WW~~~~~~',
      10: '~~~~~~WW~~~~~~~~WW~~~~~~',
      18: '~~~KWKKKKKKKKKKKKKKWK~~~',
      19: '~~~KWKKKKKKKKKKKKKKWK~~~',
      20: '....KLLWWWWWWWWWWLLK....',
      21: '.....KKLLLLLLLLLLKK.....',
      22: '.......KKKKKKKKKK.......'
    })
  ],
  sans_wink: [
    composeGrid(PORTRAIT_SANS_BASE, {
      7:  '~~~~~~~~~~~~~~WWWWWW~~~~',
      8:  '~~~~~~~~~~~~~~WKKKKW~~~~',
      9:  '~~~~~~WW~~~~~~KWWWWK~~~~',
      10: '~~~~~~WW~~~~~~WWWWWW~~~~',
      11: '~~~~~~~~~~~~~~WWWWWW~~~~'
    }),
    composeGrid(PORTRAIT_SANS_BASE, {
      7:  '~~~~~~~~~~~~~~WWWWWW~~~~',
      8:  '~~~~~~~~~~~~~~WKKKKW~~~~',
      9:  '~~~~~~WW~~~~~~KWWWWK~~~~',
      10: '~~~~~~WW~~~~~~WWWWWW~~~~',
      11: '~~~~~~~~~~~~~~WWWWWW~~~~',
      18: '~~~KWKKKKKKKKKKKKKKWK~~~',
      19: '~~~KWKKKKKKKKKKKKKKWK~~~',
      20: '....KLLWWWWWWWWWWLLK....',
      21: '.....KKLLLLLLLLLLKK.....',
      22: '.......KKKKKKKKKK.......'
    })
  ],
  sans_hollow: [
    composeGrid(PORTRAIT_SANS_BASE, {
      6:  '~~LLWWWWWWWWWWWWWWWWLL~~'
    }),
    composeGrid(PORTRAIT_SANS_BASE, {
      6:  '~~LLWWWWWWWWWWWWWWWWLL~~',
      18: '~~~KWKKKKKKKKKKKKKKWK~~~',
      19: '~~~KWKKKKKKKKKKKKKKWK~~~',
      20: '....KLLWWWWWWWWWWLLK....',
      21: '.....KKLLLLLLLLLLKK.....',
      22: '.......KKKKKKKKKK.......'
    })
  ],
  sans_tired: [
    composeGrid(PORTRAIT_SANS_BASE, {
      6:  '~~K~~~~~~~~~~~~~~~~~~~~~',
      7:  '~KWKWWWWWW~~~~WWWWWW~~~~',
      8:  '~~~WLLLLLLW~~WLLLLLLW~~~',
      9:  '~~~KKKKKKKK~~KKKKKKKK~~~',
      10: '~~~~~~WW~~~~~~~~WW~~~~~~'
    }),
    composeGrid(PORTRAIT_SANS_BASE, {
      7:  '~KWKWWWWWW~~~~WWWWWW~~~~',
      8:  '~~~WLLLLLLW~~WLLLLLLW~~~',
      9:  '~~~KKKKKKKK~~KKKKKKKK~~~',
      10: '~~~~~~WW~~~~~~~~WW~~~~~~',
      18: '~~~KWKKKKKKKKKKKKKKWK~~~',
      19: '~~~KWKKKKKKKKKKKKKKWK~~~',
      20: '....KLLWWWWWWWWWWLLK....',
      21: '.....KKLLLLLLLLLLKK.....',
      22: '.......KKKKKKKKKK.......'
    })
  ],
  gaster: [
    [
      '.......KKKKKKKKKK.......',
      '.....KKWWWWWWWWWWKK.....',
      '....KWWWWWWKKWWWWWWK....',
      '...KWWWWWWWKKWWWWWWWK...',
      '...KWWWWWWWKKWWWWWWWK...',
      '..KWWLWWWWWWWWWWWWLWWK..',
      '..KWWKKKKWWWWWWKKKKWWK..',
      '..KWKKKKKKWWWWKKKKKKWK..',
      '..KWKKKKKKWWWWKKKKKKWK..',
      '..KWKKKKKKWWWWKKKKKKWK..',
      '..KWWKKKKWWWWWWKKKKWWK..',
      '..KWWWWWWWWWWWWWKKWWWK..',
      '...KWWWWWWWWWWWWKKWWK...',
      '...KLLWWWWWWWWWWKKLLK...',
      '....KKWWWWKKKKWWKKWWK...',
      '.....KWWKKKKKKKKKWWK....',
      '.....KWWWWKKKKKKKKWK....',
      '......KLLWWWWWWWWLK.....',
      '.......KKLLLLLLKK.......',
      '.........KKKKKK.........',
      '......KKKDDDDDDKKK......',
      '....KKDDDDDDDDDDDDKK....',
      '...KDDDDDDDDDDDDDDDDK...',
      '........................'
    ],
    [
      '.......KKKKKKKKKK.......',
      '.....KKWWWWWWWWWWKK.....',
      '....KWWWWWWKKWWWWWWK....',
      '...KWWWWWWWKKWWWWWWWK...',
      '...KWWWWWWWKKWWWWWWWK...',
      '..KWWLWWWWWWWWWWWWLWWK..',
      '..KWWKKKKWWWWWWKKKKWWK..',
      '..KWKKKKKKWWWWKKKKKKWK..',
      '..KWKKVKKKWWWWKKKVKKWK..',
      '..KWKKKKKKWWWWKKKKKKWK..',
      '..KWWKKKKWWWWWWKKKKWWK..',
      '..KWWWWWWWWWWWWWKKWWWK..',
      '...KWWWWWWWWWWWWKKWWK...',
      '...KLLWWWWWWWWWWKKLLK...',
      '....KKWWKKKKKKKKKKWWK...',
      '.....KWWKKKKKKKKKKWK....',
      '.....KWWKKKKKKKKKKWK....',
      '......KWWKKKKKKKKWK.....',
      '.......KLLWWWWWWLK......',
      '........KKKKKKKKK.......',
      '......KKKDDDDDDKKK......',
      '....KKDDDDDDDDDDDDKK....',
      '...KDDDDDDDDDDDDDDDDK...',
      '........................'
    ]
  ],
  papyrus: [
    [
      '.......KKKKKKKKKK.......',
      '.....KKWWWWWWWWWWKK.....',
      '....KWWWWWWWWWWWWWWK....',
      '...KWWWWWWWWWWWWWWWWK...',
      '...KWWKKKKKKKKKKKKWWK...',
      '..KWWKKWWWWWWWWWWKKWWK..',
      '..KWWKWWKKKKWWKKKKWWWK..',
      '..KWWKWWKKWKWWKKWKWWWK..',
      '..KWWKWWKKKKWWKKKKWWWK..',
      '..KWWWLLWWWWKKWWWWLLWK..',
      '...KWWWWWWWKKKKWWWWWWK..',
      '...KLLWWWWWWWWWWWWLLK...',
      '....KWWWWWWWWWWWWWWK....',
      '....KWWKWWWWWWWWKWWK....',
      '.....KWKWWKWWKWWKWK.....',
      '.....KWKWWKWWKWWKWK.....',
      '.....KWWKKKKKKKKWWK.....',
      '......KWWWWWWWWWWK......',
      '.......KLLWWWWLLK.......',
      '........KWWWWWWK........',
      '........KKKKKKKK........',
      '......KKLLLLLLLLKK......',
      '.....KLLLLLLLLLLLLK.....',
      '........................'
    ],
    [
      '.......KKKKKKKKKK.......',
      '.....KKWWWWWWWWWWKK.....',
      '....KWWWWWWWWWWWWWWK....',
      '...KWWWWWWWWWWWWWWWWK...',
      '...KWWKKKKKKKKKKKKWWK...',
      '..KWWKKWWWWWWWWWWKKWWK..',
      '..KWWKWWKKKKWWKKKKWWWK..',
      '..KWWKWWKKWKWWKKWKWWWK..',
      '..KWWKWWKKKKWWKKKKWWWK..',
      '..KWWWLLWWWWKKWWWWLLWK..',
      '...KWWWWWWWKKKKWWWWWWK..',
      '...KLLWWWWWWWWWWWWLLK...',
      '....KWWWWWWWWWWWWWWK....',
      '....KWWKWWWWWWWWKWWK....',
      '.....KWKWWKWWKWWKWK.....',
      '.....KWKKKKKKKKKKWK.....',
      '.....KWKKKKKKKKKKWK.....',
      '.....KWWKWWKWWKWWWK.....',
      '......KWWWWWWWWWWK......',
      '.......KLLWWWWLLK.......',
      '........KWWWWWWK........',
      '........KKKKKKKK........',
      '......KKLLLLLLLLKK......',
      '.....KLLLLLLLLLLLLK.....'
    ]
  ]
};

// Ensure D key in gaster portrait maps cleanly
const PORTRAIT_PAL_FULL = { ...PORTRAIT_PAL, D: '#161524' };

export function drawDialoguePortrait(ctx, x, y, portraitId = 'sans', talkingFrame = 0) {
  const pair = PORTRAIT_GRIDS[portraitId] || PORTRAIT_GRIDS.sans;
  const frame = Math.abs(Math.floor(talkingFrame)) % 2;
  const grid = pair[frame];
  const spr = drawPixelGrid(grid, PORTRAIT_PAL_FULL, 3, `portrait-${portraitId}-${frame}`);
  if (!spr) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(x), Math.round(y), 72, 72);
  ctx.restore();
}

// ============================================================================
// 10. PROPS, RELIC PEDESTAL & BATTLE UI BUTTONS
// ============================================================================

const SAVE_STAR_PAL = {
  G: '#ffae19',
  Y: '#ffef3f',
  L: '#fff9a8',
  W: '#ffffff'
};

const SAVE_STAR_FRAMES = [
  [
    '.......YY.......',
    '.......YY.......',
    '......YLLY......',
    '......YLLY......',
    '.....GYWWYG.....',
    '....GYYWWYYG....',
    '..GGYYYWWYYYGG..',
    'YYYYWWWWWWWWYYYY',
    'YYYYWWWWWWWWYYYY',
    '..GGYYYWWYYYGG..',
    '....GYYWWYYG....',
    '.....GYWWYG.....',
    '......YLLY......',
    '......YLLY......',
    '.......YY.......',
    '.......YY.......'
  ],
  [
    '.......LL.......',
    '..G....YY....G..',
    '......YWWY......',
    '.....GYWWYG.....',
    '....GYYWWYYG....',
    '...GYYYWWYYYG...',
    '.GGYYYYWWYYYYGG.',
    'LLLYWWWWWWWWYLLL',
    'LLLYWWWWWWWWYLLL',
    '.GGYYYYWWYYYYGG.',
    '...GYYYWWYYYG...',
    '....GYYWWYYG....',
    '.....GYWWYG.....',
    '......YWWY......',
    '..G....YY....G..',
    '.......LL.......'
  ]
];

export function drawSaveStar(ctx, x, y, time = 0) {
  const frame = Math.floor(time * 4.5) % 2;
  const spr = drawPixelGrid(SAVE_STAR_FRAMES[frame], SAVE_STAR_PAL, 2, `save-star-${frame}`);
  if (!spr) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(x - 16), Math.round(y - 16));
  ctx.restore();
}

const CHEST_PAL = {
  K: '#120e1c',
  D: '#241c36',
  M: '#3b2e57',
  H: '#57477d',
  B: '#b4a2e8',
  Y: '#ffef3f',
  G: '#d99a1e'
};

const CHEST_GRID = [
  '.KKKKKKKKKKKKKKKK.',
  'KBBBBBBBBBBBBBBBBK',
  'KBHHHHHHHHHHHHHHBK',
  'KBMMMMMMMMMMMMMMBK',
  'KBBBBBBBBBBBBBBBBK',
  'KKKKKKKYYYYKKKKKKK',
  'KDDDDDDYGGYDDDDDDK',
  'KBDDDDDYYYYDDDDDBK',
  'KDDDDDDDDDDDDDDDDK',
  'KBDDDDDDDDDDDDDDBK',
  'KDDDDDDDDDDDDDDDDK',
  'KBBBBBBBBBBBBBBBBK',
  '.KKKKKKKKKKKKKKKK.',
  '..................'
];

export function drawChest(ctx, x, y) {
  const spr = drawPixelGrid(CHEST_GRID, CHEST_PAL, 2, 'supply-chest-v2');
  if (!spr) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, Math.round(x - 18), Math.round(y - 24));
  ctx.restore();
}

const PEDESTAL_PAL = {
  K: '#110e1b',
  D: '#241e38',
  M: '#3d335c',
  H: '#65568f',
  B: '#9e8fd1',
  C: '#2ce8f5',
  W: '#ffffff',
  Y: '#ffef3f'
};

const PEDESTAL_BASE_GRID = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..KKKKKKKKKKKKKKKK..',
  '.KBBBBBBBBBBBBBBBBK.',
  '.KHHHHHHHHHHHHHHHHK.',
  '..KMMMMMMMMMMMMMMK..',
  '...KDDDDKCCKDDDDK...',
  '....KDDDKCCKDDDK....',
  '....KDDDKMMKDDDK....',
  '....KDDDKCCKDDDK....',
  '....KDDDKMMKDDDK....',
  '...KDDDDDDDDDDDDK...',
  '..KMMMMMMMMMMMMMMK..',
  '.KHHHHHHHHHHHHHHHHK.',
  '.KDDDDDDDDDDDDDDDDK.',
  'KKKKKKKKKKKKKKKKKKKK'
];

const RELIC_ICON_GRID = [
  '..KK....KK..',
  '.KCCK..KCCK.',
  'KCWWCKKCWWCK',
  'KCCCCWWCCCCK',
  '.KCCCCCCCCK.',
  '..KCCYYCCK..',
  '...KCCCCK...',
  '....KCCK....',
  '.....KK.....'
];

export function drawRelicPedestal(ctx, x, y, time = 0) {
  const baseSpr = drawPixelGrid(PEDESTAL_BASE_GRID, PEDESTAL_PAL, 2, 'relic-pedestal-base');
  const relicSpr = drawPixelGrid(RELIC_ICON_GRID, PEDESTAL_PAL, 2, 'relic-floating-icon');

  const bx = Math.round(x - 20);
  const by = Math.round(y - 44);
  const hover = Math.round(Math.sin(time * 3.5) * 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (baseSpr) {
    ctx.drawImage(baseSpr, bx, by);
  }
  if (relicSpr) {
    ctx.drawImage(relicSpr, Math.round(x - 12), Math.round(y - 46 + hover));
  }

  // Rising pixel sparkles above pedestal
  for (let i = 0; i < 4; i++) {
    const t = ((time * 1.4 + i * 0.25) % 1);
    const sx = Math.round((x + Math.sin(i * 2.2 + time * 2) * 14) / 2) * 2;
    const sy = Math.round((y - 30 - t * 22) / 2) * 2;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = i % 2 === 0 ? '#2ce8f5' : '#ffef3f';
    ctx.fillRect(sx, sy, 2, 2);
  }

  ctx.restore();
}

const BTN_ICON_GRIDS = {
  FIGHT: [
    '.........BBB',
    '........BBWB',
    '.......BBWBB',
    '......BBWBB.',
    '..BB.BBWBB..',
    '...BBBBBB...',
    '...BBBBB....',
    '..BB.BB.....',
    '.BB...B.....',
    'BB..........'
  ],
  ACT: [
    '.BB..BB..BB.',
    '..BB..BB..BB',
    '...BB..BB..B',
    '...BB..BB..B',
    '...BB..BB..B',
    '...BB..BB..B',
    '...BB..BB..B',
    '..BB..BB..BB',
    '.BB..BB..BB.',
    '............'
  ],
  ITEM: [
    '....BBBB....',
    '...B....B...',
    '..BBBBBBBB..',
    '.BWWWWWWWWB.',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '..BBBBBBBB..',
    '............'
  ],
  MERCY: [
    '.BB......BB.',
    'BBBB....BBBB',
    '.BBBB..BBBB.',
    '..BBBBBBBB..',
    '...BBBBBB...',
    '...BBBBBB...',
    '..BBBBBBBB..',
    '.BBBB..BBBB.',
    'BBBB....BBBB',
    '.BB......BB.'
  ]
};

export function drawBattleButton(ctx, x, y, label, selected = false, soulMode = 'red') {
  const w = 110;
  const h = 42;
  const bx = Math.round(x);
  const by = Math.round(y);
  const color = selected ? '#ffef3f' : '#ff7d20';
  const hiColor = selected ? '#fff9c4' : '#ffb86c';
  const shColor = selected ? '#a37b00' : '#8c3708';

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Recessed interior panel & subtle inner shade band
  ctx.fillStyle = selected ? '#161102' : '#050408';
  ctx.fillRect(bx + 2, by + 2, w - 4, h - 4);
  ctx.fillStyle = selected ? 'rgba(255, 239, 63, 0.14)' : 'rgba(255, 125, 32, 0.08)';
  ctx.fillRect(bx + 4, by + 4, w - 8, 4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(bx + 4, by + h - 6, w - 8, 2);

  // Beveled 2px pixel outer border (chamfered corner notched style)
  ctx.fillStyle = color;
  ctx.fillRect(bx + 2, by, w - 4, 2);
  ctx.fillRect(bx + 2, by + h - 2, w - 4, 2);
  ctx.fillRect(bx, by + 2, 2, h - 4);
  ctx.fillRect(bx + w - 2, by + 2, 2, h - 4);

  // Inner top-left bevel highlight & bottom-right shadow
  ctx.fillStyle = hiColor;
  ctx.fillRect(bx + 4, by + 2, w - 8, 1);
  ctx.fillRect(bx + 2, by + 4, 1, h - 8);
  ctx.fillStyle = shColor;
  ctx.fillRect(bx + 4, by + h - 3, w - 8, 1);
  ctx.fillRect(bx + w - 3, by + 4, 1, h - 8);

  if (selected) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 2, by + 2, 2, 2);
    ctx.fillRect(bx + w - 4, by + 2, 2, 2);
    ctx.fillRect(bx + 2, by + h - 4, 2, 2);
    ctx.fillRect(bx + w - 4, by + h - 4, 2, 2);
  }

  const ix = bx + 16;
  const iy = by + Math.floor(h / 2);

  if (selected) {
    drawSoul(ctx, ix, iy, soulMode, { scale: 0.9 });
  } else {
    const iconGrid = BTN_ICON_GRIDS[label];
    if (iconGrid) {
      const iconSpr = drawPixelGrid(
        iconGrid,
        { B: color, W: '#fff2cc' },
        1,
        `btn-icon-${label}-${color}`
      );
      if (iconSpr) {
        ctx.drawImage(iconSpr, ix - 6, iy - 5);
      }
    }
  }

  ctx.fillStyle = color;
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 31, by + h / 2 + 1);
  ctx.restore();
}

// ============================================================================
// 11. JUDGMENT HALL PIXEL-TILE BACKDROP & FOREGROUND PILLARS
// ============================================================================

const TILE_PALETTES = {
  gold: {
    light: {
      A: '#96703d',
      B: '#7c5b32',
      C: '#5e4222',
      D: '#402c18'
    },
    dark: {
      A: '#3b2b3d',
      B: '#281d29',
      C: '#1a121c',
      D: '#100a12'
    }
  },
  dawn: {
    light: {
      A: '#bd8a56',
      B: '#a3754a',
      C: '#7d5434',
      D: '#543522'
    },
    dark: {
      A: '#614134',
      B: '#4d3328',
      C: '#36221b',
      D: '#21130f'
    }
  }
};

// 16x16 floor tile (@ 2x = 32x32)
const FLOOR_TILE_GRID = [
  'AAAAAAAAAAAAAAAC',
  'ABBBBBBBBBBBBBBC',
  'ABBBBBBBABBBBBBC',
  'ABBBBBBBBBBBBBBC',
  'ABBBABBBBBBBBBBC',
  'ABBBBBBBBBBBBBBC',
  'ABBBBBBBBBABBBBC',
  'ABBBBBBBBBBBBBBC',
  'ABBBBBBBBBBBBBBC',
  'ABBBABBBBBBBBBBC',
  'ABBBBBBBBBBBBBBC',
  'ABBBBBBBBABBBBBD',
  'ABBBBBBBBBBBBBBD',
  'ABBBBBBBBBBBBBBD',
  'ACCCCCCCCCCCCCCD',
  'DDDDDDDDDDDDDDDD'
];

// 44x86 Gothic Stained Glass Window with Pixel Delta Rune (@ 2x = 88x172)
const WINDOW_GRID = [
  '...............KKKKKKKKKKKKKK...............',
  '............KKKDDDDDDDDDDDDDDKKK............',
  '..........KKDDKKKKKKKKKKKKKKKKDDKK..........',
  '........KKDKWWGGGGGGGGGGGGGGGGWWKDKK........',
  '.......KDKWGGGGGGGGGWWWWGGGGGGGGGWKDK.......',
  '......KDKGGGGGGGGGGGWWWWGGGGGGGGGGGKDK......',
  '.....KDKGGGGGGGGWWGGWWWWGGWWGGGGGGGGKDK.....',
  '....KDKGGGGGGGGGWWWWWWWWWWWWGGGGGGGGGKDK....',
  '....KDKGGGGGGGGGGWWWWWWWWWWGGGGGGGGGGKDK....',
  '...KDKGGGGGGGGGGGWWWWWWWWWWGGGGGGGGGGGKDK...',
  '...KDKGGGGGGGGGGGGWWWWWWWWGGGGGGGGGGGGKDK...',
  '..KDKGGGGGGGGGGGGGGWWGGWWGGGGGGGGGGGGGGKDK..',
  '..KDKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKDK..',
  '..KDKGGGGGGGGGGGGGGGGWWWWGGGGGGGGGGGGGGKDK..',
  '.KDKGGGGGGGGGGGGGGGGWWWWWWGGGGGGGGGGGGGGKDK.',
  '.KDKGGGGGGGGGGGGGGGWWWWWWWWGGGGGGGGGGGGGKDK.',
  '.KDKGGGGGGGGGGGGGGWWWWWWWWWWGGGGGGGGGGGGKDK.',
  '.KDKGGGGGGGGGWWGGGGGGGGGGGGGGGGWWGGGGGGGKDK.',
  'KDKGGGGGGGGWWWWWWGGGGGGGGGGGGWWWWWWGGGGGGKDK',
  'KDKGGGGGGGWWWWWWWWGGGGGGGGGGWWWWWWWWGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGKDK',
  'KDKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGSSSSGGGGGKDKGGGGGSSSSGGGGGGGGKDK',
  'KDKGGGGGGGGSSSSSSGGGGKDKGGGGSSSSSSGGGGGGGKDK',
  'KDKGGGGGGGGSSSSSSGGGGKDKGGGGSSSSSSGGGGGGGKDK',
  'KDKGGGGGGGGGSSSSGGGGGKDKGGGGGSSSSGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGSSSSSSSSGGGGKDKGGGSSSSSSSSGGGGGGKDK',
  'KDKGGGGGGSSSSSSSSGGGGKDKGGGSSSSSSSSGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGSSSSSSGGGGKDKGGGGSSSSSSGGGGGGGKDK',
  'KDKGGGGGGGGSSSSSSGGGGKDKGGGGSSSSSSGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKGGGGGGGGGGGGGGGGGGKDKGGGGGGGGGGGGGGGGGKDK',
  'KDKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSGGGGKDKGGGGSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSGGGGKDKGGGGSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSGGGGGGGGSSSSKDKSSSSGGGGGGGGSSSSSKDK',
  'KDKSSSSSSGGGGGGGGSSSSKDKSSSSGGGGGGGGSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSGGGGGGSSSSKDKSSSSGGGGGGSSSSSSSKDK',
  'KDKSSSSSSSSGGGGGGSSSSKDKSSSSGGGGGGSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKSSSSSSSSSSSSSSSSSSKDKSSSSSSSSSSSSSSSSSKDK',
  'KDKDDDDDDDDDDDDDDDDDDKDKDDDDDDDDDDDDDDDDDKDK',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  '............................................'
];

const WINDOW_PALETTES = {
  gold: {
    K: '#09070f',
    D: '#2a1f36',
    G: '#ffd770',
    S: '#c4832b',
    W: '#fff7d6'
  },
  dawn: {
    K: '#120a14',
    D: '#4a2e38',
    G: '#ffd485',
    S: '#e87846',
    W: '#fff9e6'
  }
};

export function drawJudgmentHallBackdrop(ctx, camX, time, variant = 'gold') {
  const varKey = variant === 'dawn' ? 'dawn' : 'gold';

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Pixel-stepped sky gradient bands
  const skyBands =
    varKey === 'dawn'
      ? ['#2c1b47', '#3f2654', '#5c365c', '#824b58', '#a85d50', '#c96f49']
      : ['#090714', '#0e0b1c', '#140f24', '#19132b', '#1f1732', '#241a38'];
  for (let i = 0; i < skyBands.length; i++) {
    ctx.fillStyle = skyBands[i];
    ctx.fillRect(0, i * 12, 640, 12);
  }

  // Back wall with subtle pixel brick masonry bands
  ctx.fillStyle = varKey === 'dawn' ? '#271e30' : '#1b1426';
  ctx.fillRect(0, 56, 640, 240);

  const brickOffset = -(Math.floor(camX) % 64);
  ctx.fillStyle = varKey === 'dawn' ? '#33263d' : '#241b33';
  for (let y = 76; y < 280; y += 24) {
    ctx.fillRect(0, y, 640, 2);
    const shift = ((y - 76) / 24) % 2 === 0 ? 0 : 32;
    for (let bx = brickOffset + shift - 64; bx < 680; bx += 64) {
      ctx.fillRect(bx, y, 2, 24);
    }
  }

  // Pixel-art cornice & baseboard trim with dentil blocks
  const trimLight = varKey === 'dawn' ? '#8c664e' : '#7a5d36';
  const trimDark = varKey === 'dawn' ? '#4a3228' : '#3d2c19';
  ctx.fillStyle = trimLight;
  ctx.fillRect(0, 56, 640, 6);
  ctx.fillRect(0, 286, 640, 6);
  ctx.fillStyle = trimDark;
  ctx.fillRect(0, 62, 640, 4);
  ctx.fillRect(0, 292, 640, 4);

  const dentilShift = -(Math.floor(camX) % 16);
  ctx.fillStyle = trimDark;
  for (let dx = dentilShift - 16; dx < 656; dx += 16) {
    ctx.fillRect(dx, 58, 6, 4);
  }

  // Pixel-tiled Checkered Floor
  const tileSize = 32;
  const tilePal = TILE_PALETTES[varKey];
  const lightSpr = drawPixelGrid(FLOOR_TILE_GRID, tilePal.light, 2, `jh-tile-l-${varKey}`);
  const darkSpr = drawPixelGrid(FLOOR_TILE_GRID, tilePal.dark, 2, `jh-tile-d-${varKey}`);

  const startWorldX = Math.floor(camX / tileSize) * tileSize;
  for (let wx = startWorldX; wx < camX + 680; wx += tileSize) {
    const colIdx = Math.floor(wx / tileSize);
    const sx = Math.round(wx - camX);
    for (let row = 0; row < 6; row++) {
      const isLight = (colIdx + row) % 2 === 0;
      const spr = isLight ? lightSpr : darkSpr;
      const sy = 296 + row * tileSize;
      if (spr) {
        ctx.drawImage(spr, sx, sy);
      }
    }
  }

  // Tall Pixel-Art Stained Glass Windows & Volumetric Sunbeams
  const winSpr = drawPixelGrid(WINDOW_GRID, WINDOW_PALETTES[varKey], 2, `jh-win-${varKey}`);
  const windowSpacing = 220;
  const firstWin = Math.floor((camX - 100) / windowSpacing) * windowSpacing + 140;

  for (let wx = firstWin; wx < camX + 760; wx += windowSpacing) {
    const sx = Math.round(wx - camX);
    if (winSpr) {
      ctx.drawImage(winSpr, sx - 44, 84);
    }

    // Crisp pixel-stepped diagonal sunbeam
    const beamAlpha = 0.14 + Math.sin(time * 1.1 + wx) * 0.02;
    ctx.save();
    ctx.fillStyle =
      varKey === 'dawn'
        ? `rgba(255, 210, 140, ${beamAlpha + 0.06})`
        : `rgba(255, 224, 130, ${beamAlpha})`;
    const beamH = 230;
    const stepH = 8;
    for (let by = 0; by < beamH; by += stepH) {
      const progress = by / beamH;
      const leftEdge = Math.round(sx - 38 + progress * 56);
      const width = Math.round(76 + progress * 52);
      ctx.fillRect(leftEdge, 250 + by, width, stepH);
    }
    ctx.restore();
  }

  ctx.restore();
}

// 24x120 Foreground Fluted Pillar (@ 2x = 48x480 stretched vertically)
const PILLAR_PAL = {
  K: '#06050a',
  D: '#0b0912',
  M: '#171224',
  H: '#2a203d',
  E: '#3d2e57'
};

const PILLAR_ROW_SHAFT = 'KDMMMDDDDHHMMMMDDDDMDDDK';
const PILLAR_ROW_BAND =  'KEEEEMMMMHHMMMMDDDDMMMDK';
const PILLAR_CAP_ROW =   'KKEEEEMMMHHMMMMDDDDMMDDK';

const PILLAR_SEGMENT_GRID = Array.from({ length: 120 }, (_, i) => {
  if (i < 4 || i > 115) return PILLAR_CAP_ROW;
  if (i === 4 || i === 5 || i === 114 || i === 115) return PILLAR_ROW_BAND;
  return PILLAR_ROW_SHAFT;
});

export function drawJudgmentHallForegroundPillars(ctx, camX) {
  const pillarSpr = drawPixelGrid(PILLAR_SEGMENT_GRID, PILLAR_PAL, 2, 'jh-fg-pillar');
  const pillarSpacing = 220;
  const firstPillar = Math.floor((camX - 100) / pillarSpacing) * pillarSpacing + 30;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.94;
  for (let wx = firstPillar; wx < camX + 760; wx += pillarSpacing) {
    const sx = Math.round(wx - camX * 1.15);
    if (pillarSpr) {
      ctx.drawImage(pillarSpr, sx - 24, 0, 48, 480);
    }
  }
  ctx.restore();
}

// ============================================================================
// 13. V2.0 EXPANSION: GASTER UNBOUND, DYNAMIC BATTLE BACKDROPS & NEW PROPS
// ============================================================================

const ECHO_FLOWER_GRID = [
  '....BBBB....',
  '..BBLLLLBB..',
  '.BLCCCCCCLB.',
  '.BLCWCCWCLB.',
  '..BCCCCCCB..',
  '...BBBBBB...',
  '.....GG.....',
  '....GGGG....',
  '...GG..GG...',
  '.....GG.....',
  '....GGGG....'
];

const ECHO_PAL = {
  B: '#1d4ed8',
  L: '#38bdf8',
  C: '#7dd3fc',
  W: '#e0f2fe',
  G: '#22c55e'
};

export function drawEchoFlower(ctx, x, y, time = 0, glowing = false) {
  const spr = drawPixelGrid(ECHO_FLOWER_GRID, ECHO_PAL, 2, 'prop-echo-flower');
  const bob = Math.round(Math.sin(time * 2.6 + x * 0.05) * 1.5);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (glowing) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(Math.round(x - 16), Math.round(y - 26 + bob), 32, 24);
  }
  if (spr) {
    ctx.drawImage(spr, Math.round(x - 12), Math.round(y - 22 + bob));
  }
  ctx.restore();
}

export function drawVoidDoor(ctx, x, y, time = 0, unlocked = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const gx = Math.round(x - 24);
  const gy = Math.round(y - 78);
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.5);
  // Subtle eerie aura behind the grey door
  ctx.fillStyle = unlocked
    ? `rgba(217, 70, 239, ${0.22 + pulse * 0.2})`
    : `rgba(148, 163, 184, ${0.14 + pulse * 0.12})`;
  ctx.fillRect(gx - 6, gy - 6, 60, 86);
  // Crisp grey door frame & panels (authentic Undertale mystery door vibe)
  ctx.fillStyle = '#090910';
  ctx.fillRect(gx - 2, gy - 2, 52, 82);
  ctx.fillStyle = unlocked ? '#c4b5fd' : '#9ca3af';
  ctx.fillRect(gx, gy, 48, 78);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(gx + 6, gy + 6, 36, 26);
  ctx.fillRect(gx + 6, gy + 38, 36, 32);
  ctx.fillStyle = '#06060b';
  ctx.fillRect(gx + 10, gy + 10, 28, 18);
  ctx.fillRect(gx + 10, gy + 42, 28, 24);
  // Glowing palm hole crest & doorknob
  ctx.fillStyle = unlocked ? '#e879f9' : '#e5e7eb';
  ctx.fillRect(gx + 34, gy + 35, 4, 4);
  ctx.fillStyle = unlocked ? '#2ce8f5' : '#64748b';
  ctx.fillRect(gx + 21, gy + 16, 6, 8);
  ctx.restore();
}

export function drawSoulShrine(ctx, x, y, time = 0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const sx = Math.round(x);
  const sy = Math.round(y);
  const float = Math.round(Math.sin(time * 3.2) * 3);
  ctx.fillStyle = '#07070c';
  ctx.fillRect(sx - 20, sy - 20, 40, 22);
  ctx.fillStyle = '#334155';
  ctx.fillRect(sx - 18, sy - 18, 36, 18);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(sx - 14, sy - 16, 28, 4);
  ctx.fillStyle = 'rgba(217, 70, 239, 0.25)';
  ctx.fillRect(sx - 16, sy - 46 + float, 32, 24);
  drawSoul(ctx, sx, sy - 34 + float, 'purple', { scale: 1.15, skin: 'void_prism', dashReady: true });
  ctx.restore();
}

// Dedicated Phase 5 Gaster Unbound pixel matrices & void palette
const GASTER_UNBOUND_PAL = {
  K: '#070610',
  V: '#1b1136',
  P: '#4c1d95',
  R: '#e879f9',
  C: '#2ce8f5',
  W: '#f1f5f9',
  S: '#94a3b8'
};

// 24x22 Asymmetric Cracked Void Skull (at 3x = 72x66)
const GASTER_UNBOUND_SKULL_GRID = [
  '........KKKKKKKK........',
  '......KKWWWWWWWWKK......',
  '....KKWWWWWWWWWWWWKK....',
  '...KWWCWWWWWWWWWWCWWK...',
  '..KWWWCWWWSWWWWWWWWWWK..',
  '..KWWWWWWSSKWWKWWWWWWK..',
  '.KWWWWWWWWKWWWKWWWWWWWK.',
  '.KWWKWWKWWKWWKWWKWWKWWK.',
  '.KWWKKKKKKWWWWKKKKKKWWK.',
  '.KWWKCCKKKWWWWKKKRRKWWK.',
  '.KWWKCKKKWWKKWWKKRKKWWK.',
  '..KWWKKKWWWWWWWWKKKWWK..',
  '..KWWWSWWWKWWKWWWSWWWK..',
  '...KWWKWWWKWWKWWWKWWK...',
  '...KWWWWSSWWWWSSWWWWK...',
  '....KWWWKWWKKWWKWWWK....',
  '....KWWWKWWKKWWKWWWK....',
  '.....KWWWWWWWWWWWWK.....',
  '......KKWKWKKWKWKK......',
  '........KKKKKKKK........',
  '.........KKKKKK.........',
  '........................'
];

// 30x28 Flowing Void Cloak, Pauldrons & Void-Core Sternum (at 3x = 90x84)
const GASTER_UNBOUND_CLOAK_GRID = [
  '.........KKKKKKKKKKKK.........',
  '.......KKPPPPVVVVPPPPKK.......',
  '.....KKPPVVVVKKKKVVVVPPKK.....',
  '....KPPVVKKKRCCCCRKKKVVPPK....',
  '...KPVVKKKRRCCCCCCRRRKKVVPK...',
  '..KPVVKKRRRRCCCCCCRRRRKKVVPK..',
  '..KPVKKKRRRRWCCCCWRRRRKKKVPK..',
  '.KPVVKKKRRRRWWWWWRRRRRKKKVVPK.',
  '.KPVKKKVKKKRRRRRRRRKKKVKKKVPK.',
  '.KPVKKVVKKKPPCCCCPPKKKVVKKVPK.',
  'KPVVKKVVKPPPPCCCCPPPPKVVKVVPPK',
  'KPVKKVVVKPPVCCCCCCVPPKVVVKKVPK',
  'KPKKKVVVKPPVCWWWWCVPPKVVVKKKPK',
  '.K..KVVVKPPVVCCCCVVPPKVVVK..K.',
  '....KVVVKPPVVKKKKVVPPKVVVK....',
  '....KVVVKPPVVVKKVVVPPKVVVK....',
  '...KVVVKKPPVVVVVVVVPPKKVVVK...',
  '...KVVKKKPPVRVVVVRVPPKKKVVK...',
  '..KVVKKKKPPVVRRRRVVPPKKKKVVK..',
  '..KVK..KKPPVVVVVVVVPPKK..KVK..',
  '..KK...KPPVVKVVVVKVPPK...KK...',
  '.......KPVKK.KVVVK.KVPK.......',
  '......KKPKK..KVVVK..KKPKK.....',
  '......KK.....KVVK......KK.....',
  '.............KVK..............',
  '..............K...............',
  '..............................',
  '..............................'
];

export function drawGasterUnbound(ctx, cx, baseY, options = {}) {
  const {
    time = 0,
    phase = 5,
    flashAlpha = 0,
    hurtShake = 0,
    beatPulse = 0
  } = options;

  const shakeX = hurtShake > 0 ? (Math.random() - 0.5) * hurtShake : 0;
  const x = Math.round(cx + shakeX);
  const floatY = Math.round(Math.sin(time * 2.4) * 5);
  const y = Math.round(baseY + floatY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Rotating arcane rune ring & inner void pulse halo behind Gaster Unbound
  const runeRadius = 60 + beatPulse * 10;
  for (let i = 0; i < 10; i++) {
    const ang = time * 0.95 + (i * Math.PI) / 5;
    const rx = Math.round(x + Math.cos(ang) * runeRadius);
    const ry = Math.round(y - 72 + Math.sin(ang) * (runeRadius * 0.44));
    ctx.fillStyle = i % 2 === 0 ? '#e879f9' : '#2ce8f5';
    ctx.globalAlpha = 0.55 + beatPulse * 0.35;
    ctx.fillRect(rx - 3, ry - 3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rx - 1, ry - 1, 2, 2);
  }
  ctx.globalAlpha = 1;

  // 2. Waving dark void tendrils along lower cloak
  for (let i = -3; i <= 3; i++) {
    const sway = Math.round(Math.sin(time * 5.2 + i * 1.1) * 6);
    ctx.fillStyle = Math.abs(i) % 2 === 0 ? '#110c21' : '#28194a';
    ctx.fillRect(x + i * 11 - 4 + sway, y - 34, 8, 34 + (i % 2 === 0 ? 6 : 0));
    ctx.fillStyle = Math.abs(i) % 2 === 0 ? '#a855f7' : '#2ce8f5';
    ctx.fillRect(x + i * 11 - 2 + sway, y - 6, 4, 4);
  }

  // 3. Dedicated Void Cloak & Asymmetric Cracked Skull matrices
  const cloakSpr = drawPixelGrid(GASTER_UNBOUND_CLOAK_GRID, GASTER_UNBOUND_PAL, 3, 'gaster-u-cloak');
  const skullSpr = drawPixelGrid(GASTER_UNBOUND_SKULL_GRID, GASTER_UNBOUND_PAL, 3, 'gaster-u-skull');
  if (cloakSpr) {
    ctx.drawImage(cloakSpr, x - 45, y - 92);
  }
  const headHover = Math.round(Math.cos(time * 3.1) * 2);
  if (skullSpr) {
    ctx.drawImage(skullSpr, x - 36, y - 146 + headHover);
  }

  // Intense Phase 5 glowing void eyes & crack lightning
  const flicker = Math.sin(time * 22) > 0;
  ctx.fillStyle = flicker ? '#2ce8f5' : '#e879f9';
  ctx.fillRect(x - 16, y - 122 + headHover, 6, 6);
  ctx.fillRect(x + 10, y - 120 + headHover, 6, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 14, y - 120 + headHover, 2, 2);
  ctx.fillRect(x + 12, y - 119 + headHover, 2, 2);

  // 4. Six floating skeletal Gaster hands with crackling energy hand tethers
  const lSpr = drawPixelGrid(GASTER_HAND_LEFT, GASTER_PAL, 2, 'gaster-hand-l');
  const rSpr = drawPixelGrid(GASTER_HAND_RIGHT, GASTER_PAL, 2, 'gaster-hand-r');
  const coreY = y - 66;
  for (let row = 0; row < 3; row++) {
    const fanAngle = (row - 1) * 0.45 + Math.sin(time * 2.5 + row) * 0.15;
    const dist = 78 + row * 18 + beatPulse * 6;
    const hy = y - 78 + (row - 1) * 32 + Math.round(Math.cos(time * 3.1 + row) * 4);
    const lx = Math.round(x - dist + Math.sin(fanAngle) * 6);
    const rx = Math.round(x + dist - Math.sin(fanAngle) * 6);

    for (const [spr, hx, clr] of [
      [lSpr, lx, row % 2 === 0 ? '#e879f9' : '#2ce8f5'],
      [rSpr, rx, row % 2 === 0 ? '#2ce8f5' : '#e879f9']
    ]) {
      // Stepped pixel lightning tether from core to floating palm
      ctx.fillStyle = clr;
      ctx.globalAlpha = 0.45 + beatPulse * 0.3;
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const jx = Math.round((x + (hx - x) * t + Math.sin(time * 18 + s + row) * 3) / 2) * 2;
        const jy = Math.round((coreY + (hy - coreY) * t + Math.cos(time * 16 + s) * 2) / 2) * 2;
        ctx.fillRect(jx, jy, 2, 2);
      }

      ctx.globalAlpha = 0.65 + beatPulse * 0.3;
      ctx.fillRect(hx - 4, hy - 4, 8, 8);
      ctx.globalAlpha = 1;
      if (spr) ctx.drawImage(spr, hx - 16, hy - 18, 32, 36);
    }
  }

  // White flash silhouette on hit
  if (flashAlpha > 0) {
    const whitePal = makeWhiteSilhouettePalette(GASTER_UNBOUND_PAL);
    const wCloak = drawPixelGrid(GASTER_UNBOUND_CLOAK_GRID, whitePal, 3, 'gaster-u-wcloak');
    const wSkull = drawPixelGrid(GASTER_UNBOUND_SKULL_GRID, whitePal, 3, 'gaster-u-wskull');
    ctx.globalAlpha = Math.min(1, flashAlpha);
    if (wCloak) ctx.drawImage(wCloak, x - 45, y - 92);
    if (wSkull) ctx.drawImage(wSkull, x - 36, y - 146 + headHover);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawBattleBackdrop(ctx, options = {}) {
  const {
    phase = 1,
    time = 0,
    beatPulse = 0,
    width = 640,
    height = 480
  } = options;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Base Obsidian Backdrop
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (phase === 1) {
    // Twilight Judgment Hall: arched stained-glass windows + warm sunbeams + golden dust
    const windowXs = [78, 224, 416, 562];
    for (let i = 0; i < windowXs.length; i++) {
      const wx = windowXs[i] - 26;
      // Arched stone frame
      ctx.fillStyle = 'rgba(255, 210, 105, 0.08)';
      ctx.fillRect(wx, 18, 52, 130);
      ctx.fillRect(wx + 8, 6, 36, 12);
      // Stained glass diamond lattice mullions
      ctx.fillStyle = 'rgba(255, 190, 80, 0.14)';
      ctx.fillRect(wx + 25, 8, 2, 140);
      ctx.fillRect(wx, 54, 52, 2);
      ctx.fillRect(wx, 96, 52, 2);
      // Warm diagonal light shaft
      ctx.fillStyle = 'rgba(255, 220, 110, 0.048)';
      ctx.beginPath();
      ctx.moveTo(wx + 2, 18);
      ctx.lineTo(wx + 50, 18);
      ctx.lineTo(wx - 22, 250);
      ctx.lineTo(wx - 70, 250);
      ctx.closePath();
      ctx.fill();
    }
    // Floating twilight dust motes
    for (let i = 0; i < 14; i++) {
      const dx = Math.round(((i * 97 + time * 8 + Math.sin(time + i) * 14) % width) / 2) * 2;
      const dy = Math.round((40 + ((i * 53 + Math.sin(time * 0.9 + i) * 16) % 180)) / 2) * 2;
      ctx.fillStyle = 'rgba(255, 232, 150, 0.35)';
      ctx.fillRect(dx, dy, 2, 2);
    }
  } else if (phase === 2) {
    // Crimson Velocity storm + diagonal wind streaks + dual-tone rising embers
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, `rgba(180, 30, 30, ${0.14 + beatPulse * 0.1})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 260);

    for (let i = 0; i < 8; i++) {
      const sy = Math.round((24 + i * 28) / 2) * 2;
      const sx = ((time * (180 + (i % 3) * 45) + i * 90) % (width + 120)) - 120;
      ctx.fillStyle = 'rgba(255, 95, 70, 0.18)';
      ctx.fillRect(Math.round(sx), sy, 76, 2);
    }

    for (let i = 0; i < 28; i++) {
      const cy = ((time * (34 + (i % 4) * 12) + i * 37) % 240);
      const px = Math.round(((i * 97 + Math.sin(time * 2.4 + i) * 22) % width) / 2) * 2;
      const py = Math.round((240 - cy) / 2) * 2;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 230, 120, 0.48)' : 'rgba(248, 113, 113, 0.35)';
      ctx.fillRect(px, py, 2, 4);
    }
  } else if (phase === 3 || phase === 4) {
    // Void Fracture branching sky fissures & floating horizon crystal shards
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, phase >= 4 ? `rgba(126, 34, 206, ${0.2 + beatPulse * 0.16})` : `rgba(34, 211, 238, ${0.15 + beatPulse * 0.11})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 260);

    // Branching Jagged Void Sky Fissures
    const fissureClr = phase >= 4 ? `rgba(192, 132, 252, ${0.26 + beatPulse * 0.22})` : 'rgba(44, 232, 245, 0.26)';
    for (let k = 0; k < 5; k++) {
      const bx = 68 + k * 124;
      ctx.fillStyle = fissureClr;
      for (let step = 0; step < 7; step++) {
        const fx = bx + ((step % 2) * 8 - 4);
        const fy = step * 16 + 10;
        ctx.fillRect(fx, fy, 2, 14);
        if (step % 2 === 1) {
          ctx.fillRect(fx + (k % 2 === 0 ? 4 : -6), fy + 6, 6, 2);
        }
      }
    }
    // Floating fractured void crystal shards along the lower horizon
    for (let s = 0; s < 10; s++) {
      const sx = 32 + s * 62;
      const sy = Math.round((214 + Math.sin(time * 2.2 + s) * 8) / 2) * 2;
      ctx.fillStyle = s % 2 === 0 ? 'rgba(44, 232, 245, 0.3)' : 'rgba(217, 70, 239, 0.3)';
      ctx.fillRect(sx - 2, sy, 4, 10);
      ctx.fillRect(sx - 4, sy + 2, 8, 4);
    }
  } else {
    // Phase 5: DARKER YET DARKER — Scrolling parallax monoliths & perspective Void floor grid
    const bgGlow = ctx.createRadialGradient(320, 120, 18, 320, 130, 340);
    bgGlow.addColorStop(0, `rgba(217, 70, 239, ${0.24 + beatPulse * 0.2})`);
    bgGlow.addColorStop(0.55, `rgba(44, 232, 245, ${0.1 + beatPulse * 0.08})`);
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    const scroll = (time * 34) % 160;
    for (let col = -1; col < 6; col++) {
      const mx = Math.round(col * 160 - scroll);
      ctx.fillStyle = 'rgba(24, 14, 48, 0.72)';
      ctx.fillRect(mx, 0, 34, 210);
      ctx.fillStyle = `rgba(217, 70, 239, ${0.28 + beatPulse * 0.25})`;
      ctx.fillRect(mx, 0, 2, 210);
      ctx.fillRect(mx + 32, 0, 2, 210);
      ctx.fillStyle = 'rgba(44, 232, 245, 0.35)';
      ctx.fillRect(mx + 8, 28, 18, 4);
      ctx.fillRect(mx + 12, 54, 10, 4);
    }

    // Parallax Perspective Void Floor Grid (y = 186..244)
    ctx.fillStyle = `rgba(44, 232, 245, ${0.18 + beatPulse * 0.14})`;
    const gridH = 58;
    for (let r = 0; r < 6; r++) {
      const z = ((r / 6 + (time * 0.55) % 1) % 1);
      const gy = Math.round(186 + z * z * gridH);
      ctx.fillRect(0, gy, width, 1);
    }
    for (let c = -6; c <= 6; c++) {
      const topX = 320 + c * 28;
      const botX = 320 + c * 74;
      const steps = 8;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        ctx.fillRect(Math.round(topX + (botX - topX) * t), Math.round(186 + t * gridH), 2, 4);
      }
    }

    // Subtle rising void rune sparkles
    for (let i = 0; i < 24; i++) {
      const cy = ((time * 38 + i * 41) % 240);
      const px = Math.round(((i * 71 + Math.sin(time * 2.4 + i) * 14) % width) / 2) * 2;
      const py = Math.round((240 - cy) / 2) * 2;
      ctx.fillStyle = i % 2 === 0 ? '#e879f9' : '#2ce8f5';
      ctx.globalAlpha = 0.5 * (1 - cy / 240);
      ctx.fillRect(px, py, 2, 2);
    }
  }

  ctx.restore();
}
