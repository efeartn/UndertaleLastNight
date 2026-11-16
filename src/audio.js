// Procedural Web Audio Synthesizer & Chiptune Sequencer for UNDERTALE: LAST NIGHT

const NOTE_FREQ = {};
(function buildNoteTable() {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let oct = 1; oct <= 7; oct++) {
    for (let i = 0; i < 12; i++) {
      const midi = (oct + 1) * 12 + i;
      NOTE_FREQ[`${names[i]}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
    }
  }
})();

function freq(note) {
  if (typeof note === 'number') return note;
  return NOTE_FREQ[note] || 0;
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;

    this.muted = false;
    this.volume = 0.72;
    this.currentTrack = null;
    this.stepIndex = 0;
    this.nextNoteTime = 0;
    this.schedulerTimer = null;
    this.lastBlipTime = 0;
  }

  ensureContext() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      try {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.master.gain.value = this.muted ? 0 : this.volume;
        this.bgmGain.gain.value = 0.28;
        this.sfxGain.gain.value = 0.55;

        this.bgmGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.ctx.destination);

        this.noiseBuffer = this._createNoiseBuffer();
      } catch {
        return false;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return Boolean(this.ctx);
  }

  _createNoiseBuffer() {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 1.0;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  setVolume(val) {
    const v = Number(val);
    this.volume = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.72;
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
    return this.volume;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _tone(fStart, fEnd, duration, type = 'square', gainPeak = 0.22, dest = 'sfx', delay = 0) {
    if (!this.ensureContext() || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const t1 = t0 + Math.max(0.01, duration);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, fStart), t0);
    if (fEnd && fEnd !== fStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t1);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainPeak, t0 + Math.min(0.012, duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(g);
    g.connect(dest === 'bgm' ? this.bgmGain : this.sfxGain);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  }

  _noise(duration, filterFreq = 1800, filterType = 'bandpass', gainPeak = 0.24, dest = 'sfx', delay = 0) {
    if (!this.ensureContext() || this.muted || !this.noiseBuffer) return;
    const t0 = this.ctx.currentTime + delay;
    const t1 = t0 + Math.max(0.015, duration);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t0);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainPeak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);

    src.connect(filter);
    filter.connect(g);
    g.connect(dest === 'bgm' ? this.bgmGain : this.sfxGain);
    src.start(t0);
    src.stop(t1 + 0.01);
  }

  // --- Classic Undertale SFX ---

  menuMove() {
    this._tone(520, 520, 0.04, 'square', 0.14);
  }

  menuSelect() {
    this._tone(660, 880, 0.05, 'square', 0.16, 'sfx', 0);
    this._tone(990, 990, 0.07, 'square', 0.16, 'sfx', 0.04);
  }

  textBlip(voiceType = 'narrator') {
    if (!this.ensureContext() || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBlipTime < 0.032) return;
    this.lastBlipTime = now;

    switch (voiceType) {
      case 'sans':
        // Low gruff sawtooth/square grunt
        this._tone(125 + Math.random() * 14, 108, 0.048, 'sawtooth', 0.18);
        break;
      case 'papyrus':
        // Bright energetic staccato nasal voice
        this._tone(335 + Math.random() * 65, 385 + Math.random() * 35, 0.046, 'sawtooth', 0.15);
        break;
      case 'gaster': {
        // Eerie Wingdings pitch-warble blip
        const f0 = 150 + Math.random() * 230;
        const f1 = 85 + Math.random() * 240;
        this._tone(f0, f1, 0.055, 'square', 0.14);
        break;
      }
      case 'system':
        this._tone(740, 740, 0.03, 'triangle', 0.1);
        break;
      case 'narrator':
      default:
        this._tone(430 + Math.random() * 25, 420, 0.035, 'square', 0.1);
        break;
    }
  }

  slash() {
    this._noise(0.18, 2200, 'highpass', 0.25, 'sfx', 0);
    this._tone(920, 210, 0.16, 'sawtooth', 0.18, 'sfx', 0);
  }

  hit() {
    this._noise(0.2, 850, 'lowpass', 0.35, 'sfx', 0);
    this._tone(175, 55, 0.2, 'square', 0.28, 'sfx', 0);
  }

  hurt() {
    this._tone(260, 120, 0.09, 'square', 0.22, 'sfx', 0);
    this._noise(0.08, 1200, 'bandpass', 0.2, 'sfx', 0.01);
  }

  krTick() {
    this._tone(190, 160, 0.03, 'triangle', 0.07);
  }

  heal() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this._tone(n, n, 0.09, 'triangle', 0.2, 'sfx', idx * 0.055);
    });
  }

  save() {
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((n, idx) => {
      this._tone(n, n, 0.12, 'square', 0.16, 'sfx', idx * 0.065);
    });
  }

  encounterAlert() {
    this._tone(784, 784, 0.08, 'square', 0.2, 'sfx', 0);
    this._tone(1046.5, 1046.5, 0.16, 'square', 0.22, 'sfx', 0.08);
  }

  slam() {
    this._tone(140, 42, 0.16, 'sawtooth', 0.34, 'sfx', 0);
    this._noise(0.14, 480, 'lowpass', 0.3, 'sfx', 0);
  }

  blasterCharge() {
    this._tone(220, 1280, 0.36, 'sawtooth', 0.15, 'sfx', 0);
    this._tone(330, 1620, 0.36, 'triangle', 0.1, 'sfx', 0);
  }

  blasterFire() {
    this._noise(0.42, 950, 'bandpass', 0.32, 'sfx', 0);
    this._tone(185, 58, 0.42, 'sawtooth', 0.3, 'sfx', 0);
    this._tone(96, 40, 0.4, 'square', 0.24, 'sfx', 0.02);
  }

  soulCrack() {
    this._noise(0.1, 3200, 'highpass', 0.26, 'sfx', 0);
    this._tone(320, 140, 0.12, 'square', 0.22, 'sfx', 0);
  }

  soulShatter() {
    this._noise(0.32, 2600, 'bandpass', 0.32, 'sfx', 0);
    this._tone(440, 90, 0.28, 'sawtooth', 0.22, 'sfx', 0);
    this._tone(290, 65, 0.32, 'square', 0.18, 'sfx', 0.05);
  }

  phaseShift() {
    this._tone(220, 880, 0.28, 'sawtooth', 0.2, 'sfx', 0);
    this._tone(440, 1174, 0.34, 'square', 0.16, 'sfx', 0.08);
  }

  blackout() {
    this._noise(0.05, 3600, 'highpass', 0.22, 'sfx', 0);
    this._tone(110, 75, 0.045, 'square', 0.18, 'sfx', 0);
  }

  shieldBlock() {
    this._tone(980, 1480, 0.06, 'square', 0.18, 'sfx', 0);
    this._tone(1760, 1320, 0.08, 'triangle', 0.15, 'sfx', 0.018);
    this._noise(0.045, 3400, 'highpass', 0.14, 'sfx', 0);
  }

  yellowShot() {
    this._tone(1280, 440, 0.075, 'square', 0.14, 'sfx', 0);
    this._tone(1680, 720, 0.055, 'triangle', 0.1, 'sfx', 0.01);
  }

  yellowChargeShot() {
    this._tone(620, 1980, 0.14, 'sawtooth', 0.2, 'sfx', 0);
    this._tone(920, 2400, 0.11, 'square', 0.16, 'sfx', 0.015);
    this._noise(0.08, 3200, 'bandpass', 0.14, 'sfx', 0);
  }

  targetBreak() {
    this._noise(0.12, 2200, 'bandpass', 0.24, 'sfx', 0);
    this._tone(540, 180, 0.11, 'sawtooth', 0.18, 'sfx', 0);
    this._tone(980, 1240, 0.08, 'square', 0.14, 'sfx', 0.03);
  }

  graze() {
    this._tone(1420, 1980, 0.04, 'triangle', 0.09, 'sfx', 0);
    this._noise(0.025, 4800, 'highpass', 0.06, 'sfx', 0);
  }

  gasterSpeak() {
    const motif = [
      [150, 260, 0.07, 0],
      [310, 130, 0.08, 0.075],
      [190, 340, 0.07, 0.155],
      [115, 78, 0.11, 0.23]
    ];
    for (const [f0, f1, dur, d] of motif) {
      this._tone(f0, f1, dur, 'square', 0.15, 'sfx', d);
      this._tone(f0 * 1.5, f1 * 0.75, dur * 0.9, 'sawtooth', 0.08, 'sfx', d + 0.01);
    }
    this._noise(0.24, 1400, 'bandpass', 0.09, 'sfx', 0.02);
  }

  achievement() {
    const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
    notes.forEach((n, idx) => {
      this._tone(n, n, idx === notes.length - 1 ? 0.24 : 0.09, 'square', 0.15, 'sfx', idx * 0.06);
      this._tone(n * 2, n * 2, 0.08, 'triangle', 0.07, 'sfx', idx * 0.06 + 0.015);
    });
  }

  fourthWallGlitch() {
    const cuts = [
      [1920, 410, 0.04, 0],
      [260, 1540, 0.04, 0.045],
      [1180, 180, 0.05, 0.09],
      [440, 2240, 0.05, 0.145]
    ];
    for (const [f0, f1, dur, d] of cuts) {
      this._tone(f0, f1, dur, 'sawtooth', 0.16, 'sfx', d);
    }
    this._noise(0.18, 2600, 'bandpass', 0.14, 'sfx', 0.01);
  }

  // --- Procedural BGM Tracks ---

  playBGM(trackName) {
    if (this.currentTrack === trackName) return;
    this.stopBGM();
    if (!trackName) return;
    this.currentTrack = trackName;
    this.stepIndex = 0;

    if (!this.ensureContext()) return;
    this.nextNoteTime = this.ctx.currentTime + 0.04;
    this.schedulerTimer = setInterval(() => this._scheduleLoop(), 25);
  }

  stopBGM() {
    this.currentTrack = null;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  _scheduleLoop() {
    if (!this.ctx || !this.currentTrack) return;
    const track = TRACKS[this.currentTrack];
    if (!track) return;

    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playTrackStep(track, this.stepIndex, this.nextNoteTime);
      const secPerStep = 60 / track.bpm / 4; // 16th note
      this.nextNoteTime += secPerStep;
      this.stepIndex = (this.stepIndex + 1) % track.length;
    }
  }

  _playTrackStep(track, idx, t) {
    if (this.muted) return;
    const stepDur = (60 / track.bpm / 4) * 0.9;

    const lead = track.lead[idx];
    if (lead) {
      const f = freq(lead);
      const dur = stepDur * (track.leadHold || 0.9);
      this._scheduleOsc(f, dur, track.leadWave || 'sawtooth', 0.15, t);
      if (track.detuneLead) {
        this._scheduleOsc(f * 1.003, dur * 0.95, 'square', 0.09, t);
      }
    }

    const counter = track.counter && track.counter[idx % track.counter.length];
    if (counter) {
      this._scheduleOsc(freq(counter), stepDur * 0.92, 'triangle', 0.11, t);
    }

    const arp = track.arp && track.arp[idx % track.arp.length];
    if (arp) {
      this._scheduleOsc(freq(arp), stepDur * 0.65, 'square', 0.085, t);
    }

    const bass = track.bass && track.bass[idx % track.bass.length];
    if (bass) {
      const bf = freq(bass);
      this._scheduleOsc(bf, stepDur * 1.15, track.bassWave || 'sawtooth', 0.16, t);
      if (track.subBass) {
        this._scheduleOsc(bf * 0.5, stepDur * 1.25, 'triangle', 0.12, t);
      }
    }

    if (track.drums) {
      const d = track.drums[idx % track.drums.length];
      if (d === 'K') {
        this._scheduleKick(t);
      } else if (d === 'S') {
        this._scheduleSnare(t);
      } else if (d === 'H') {
        this._scheduleHat(t);
      } else if (d === 'O') {
        this._scheduleOpenHat(t);
      } else if (d === 'C') {
        this._scheduleCrash(t);
      }
    }
  }

  _scheduleOsc(f, dur, wave, peak, t) {
    if (!f || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + Math.max(0.04, dur) + 0.01);
  }

  _scheduleKick(t) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  _scheduleSnare(t) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1100, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);
    src.start(t);
    src.stop(t + 0.1);
  }

  _scheduleHat(t) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5200, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);
    src.start(t);
    src.stop(t + 0.04);
  }

  _scheduleOpenHat(t) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);
    src.start(t);
    src.stop(t + 0.12);
  }

  _scheduleCrash(t) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bgmGain);
    src.start(t);
    src.stop(t + 0.30);
  }
}

// --- Original High-Intensity Boss Track Definitions (4x 128-Step Anthems) ---

function gallopBass(rootLo, rootHi) {
  return [
    rootLo, rootLo, rootHi, rootLo, rootLo, rootHi, rootLo, rootHi,
    rootLo, rootLo, rootHi, rootLo, rootHi, rootLo, rootHi, rootLo
  ];
}

function arp16(a, b, c, d) {
  return [a, b, c, d, a, b, c, d, a, b, c, d, a, c, d, c];
}

// Phase 1: "JUDGMENT OVERDRIVE" (138 BPM D minor / F# phrygian energy)
const P1_LEAD = [
  'D5', null, 'F5', 'E5', 'D5', null, 'A4', 'C5', 'D5', null, 'G5', 'F5', 'E5', null, 'C5', 'E5',
  'F5', null, 'G5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', null, 'A4', 'C5', 'D5', null, 'E5', null,
  'D5', null, 'F5', 'A5', 'A#5', null, 'A5', 'G5', 'F5', 'E5', 'D5', 'F5', 'E5', null, 'C5', null,
  'A#4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', null, 'G#5', null, 'G5', 'F5', 'E5', null, 'A4', null,
  // B-section drop
  'A5', null, 'A5', 'G5', 'F5', null, 'D5', 'F5', 'G5', null, 'G5', 'F5', 'E5', null, 'C5', 'E5',
  'F5', 'G5', 'A5', null, 'A#5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C#5', 'E5', 'A5', null, null, null,
  'D6', null, 'C6', 'A#5', 'A5', null, 'G5', 'F5', 'G5', 'A5', 'A#5', 'C6', 'A5', null, 'F5', null,
  'G5', 'F5', 'E5', 'D5', 'C#5', 'D5', 'E5', 'G5', 'A5', null, 'E5', null, 'D5', null, 'A4', null
];

const P1_ARP = [
  ...arp16('D4', 'F4', 'A4', 'D5'),
  ...arp16('C4', 'E4', 'G4', 'C5'),
  ...arp16('A#3', 'D4', 'F4', 'A#4'),
  ...arp16('A3', 'C#4', 'E4', 'A4'),
  ...arp16('F4', 'A4', 'C5', 'F5'),
  ...arp16('G4', 'A#4', 'D5', 'G5'),
  ...arp16('A#3', 'D4', 'F4', 'A4'),
  ...arp16('A3', 'C#4', 'E4', 'A4')
];

const P1_BASS = [
  ...gallopBass('D2', 'D3'),
  ...gallopBass('C2', 'C3'),
  ...gallopBass('A#1', 'A#2'),
  ...gallopBass('A1', 'A2'),
  ...gallopBass('F2', 'F3'),
  ...gallopBass('G2', 'G3'),
  ...gallopBass('A#1', 'A#2'),
  ...gallopBass('A1', 'A2')
];

// Phase 2: "CRIMSON VELOCITY" (150 BPM syncopated bullet-hell surge)
const P2_LEAD = [
  'E5', 'E5', null, 'G5', 'F#5', null, 'D5', 'E5', 'G5', null, 'A5', 'G5', 'F#5', 'E5', 'D5', 'B4',
  'C5', null, 'D5', 'E5', 'G5', null, 'F#5', 'E5', 'D5', 'C5', 'B4', 'C5', 'D5', null, 'F#5', null,
  'E5', 'G5', 'B5', null, 'A5', 'G5', 'F#5', 'E5', 'G5', null, 'F#5', 'D5', 'E5', null, 'B4', null,
  'C5', 'E5', 'G5', 'B5', 'A5', null, 'G5', 'F#5', 'E5', 'D#5', 'E5', 'F#5', 'G5', null, 'B5', null,
  // Bridge overdrive
  'B5', null, 'B5', 'A5', 'G5', 'F#5', 'E5', null, 'A5', null, 'A5', 'G5', 'F#5', 'E5', 'D5', null,
  'G5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'F#5', 'E5', 'F#5', 'G5', 'E5', 'D#5', null, 'B4', null,
  'E5', 'F#5', 'G5', 'A5', 'B5', null, 'E6', null, 'D6', 'C6', 'B5', 'A5', 'G5', 'F#5', 'E5', 'D5',
  'C5', 'B4', 'A4', 'B4', 'C5', 'D5', 'E5', 'G5', 'F#5', null, 'D#5', null, 'E5', null, null, null
];

const P2_COUNTER = [
  'B3', null, 'E4', null, 'G4', null, 'B4', null, 'D4', null, 'F#4', null, 'A4', null, 'D5', null,
  'C4', null, 'E4', null, 'G4', null, 'C5', null, 'B3', null, 'D#4', null, 'F#4', null, 'B4', null,
  'E4', null, 'G4', null, 'B4', null, 'E5', null, 'D4', null, 'G4', null, 'B4', null, 'D5', null,
  'C4', null, 'E4', null, 'A4', null, 'C5', null, 'B3', null, 'F#4', null, 'B4', null, 'E5', null,
  'E4', null, 'G4', null, 'B4', null, 'E5', null, 'D4', null, 'F#4', null, 'A4', null, 'D5', null,
  'C4', null, 'E4', null, 'G4', null, 'C5', null, 'B3', null, 'D#4', null, 'F#4', null, 'B4', null,
  'E4', null, 'B4', null, 'G4', null, 'E5', null, 'D4', null, 'A4', null, 'C5', null, 'D5', null,
  'C4', null, 'E4', null, 'A4', null, 'C5', null, 'B3', null, 'F#4', null, 'E4', null, null, null
];

const P2_ARP = [
  ...arp16('E4', 'G4', 'B4', 'E5'),
  ...arp16('D4', 'F#4', 'A4', 'D5'),
  ...arp16('C4', 'E4', 'G4', 'C5'),
  ...arp16('B3', 'D#4', 'F#4', 'B4'),
  ...arp16('E4', 'B4', 'G4', 'E5'),
  ...arp16('D4', 'A4', 'F#4', 'D5'),
  ...arp16('C4', 'G4', 'E4', 'C5'),
  ...arp16('B3', 'F#4', 'D#4', 'B4')
];

const P2_BASS = [
  ...gallopBass('E2', 'E3'),
  ...gallopBass('D2', 'D3'),
  ...gallopBass('C2', 'C3'),
  ...gallopBass('B1', 'B2'),
  ...gallopBass('E2', 'E3'),
  ...gallopBass('D2', 'D3'),
  ...gallopBass('C2', 'C3'),
  ...gallopBass('B1', 'B2')
];

// Phase 3: "SHATTERED DAWN" (158 BPM high-stakes C# minor climax)
const P3_LEAD = [
  'C#5', 'C#5', 'G#5', null, 'F#5', null, 'E5', 'D#5', 'E5', 'F#5', 'G#5', null, 'A5', null, 'G#5', 'F#5',
  'E5', null, 'D#5', 'C#5', 'B4', 'C#5', 'D#5', 'E5', 'F#5', null, 'G#5', null, 'D#5', null, 'G#4', null,
  'C#5', 'E5', 'G#5', 'C#6', 'B5', null, 'A5', 'G#5', 'A5', null, 'G#5', 'F#5', 'E5', null, 'C#5', null,
  'D#5', 'F#5', 'A5', 'B5', 'C#6', null, 'B5', 'A5', 'G#5', null, 'F#5', null, 'E5', null, 'D#5', null,
  // Urgent rising finale
  'A5', 'A5', 'G#5', 'F#5', 'E5', null, 'C#5', 'E5', 'F#5', 'G#5', 'A5', null, 'B5', null, 'G#5', null,
  'C#6', null, 'B5', 'A5', 'G#5', 'F#5', 'E5', 'D#5', 'E5', 'F#5', 'G#5', 'A5', 'G#5', null, 'D#5', null,
  'E5', 'F#5', 'G#5', 'A5', 'B5', 'C#6', 'D#6', null, 'C#6', 'B5', 'A5', 'G#5', 'F#5', 'E5', 'D#5', 'C#5',
  'A5', null, 'G#5', null, 'F#5', null, 'D#5', null, 'C#5', null, 'G#4', null, 'C#5', null, null, null
];

const P3_COUNTER = [
  'C#4', 'E4', 'G#4', 'C#5', 'G#4', 'E4', 'C#4', 'E4', 'B3', 'D#4', 'F#4', 'B4', 'F#4', 'D#4', 'B3', 'D#4',
  'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'A3', 'C#4', 'G#3', 'B3', 'D#4', 'G#4', 'D#4', 'B3', 'G#3', 'B3',
  'C#4', 'E4', 'G#4', 'C#5', 'G#4', 'E4', 'C#4', 'E4', 'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'A3', 'C#4',
  'F#3', 'A3', 'C#4', 'F#4', 'G#3', 'C4', 'D#4', 'G#4', 'G#3', 'C4', 'D#4', 'G#4', 'D#4', 'C4', 'G#3', 'C4',
  'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'A3', 'C#4', 'B3', 'D#4', 'F#4', 'B4', 'F#4', 'D#4', 'B3', 'D#4',
  'C#4', 'E4', 'G#4', 'C#5', 'G#4', 'E4', 'C#4', 'E4', 'G#3', 'B3', 'D#4', 'G#4', 'D#4', 'B3', 'G#3', 'B3',
  'A3', 'E4', 'A4', 'C#5', 'B3', 'F#4', 'B4', 'D#5', 'C#4', 'G#4', 'C#5', 'E5', 'G#4', 'E4', 'C#4', 'E4',
  'F#3', 'A3', 'C#4', 'F#4', 'G#3', 'C4', 'D#4', 'G#4', 'C#4', null, 'G#3', null, 'C#4', null, null, null
];

const P3_BASS = [
  ...gallopBass('C#2', 'C#3'),
  ...gallopBass('B1', 'B2'),
  ...gallopBass('A1', 'A2'),
  ...gallopBass('G#1', 'G#2'),
  ...gallopBass('C#2', 'C#3'),
  ...gallopBass('A1', 'A2'),
  ...gallopBass('F#2', 'F#3'),
  ...gallopBass('G#1', 'G#2')
];

// Phase 4: "VOID ANOMALY // 666" (168 BPM chromatic polychord chaos)
const P4_LEAD = [
  'D5', 'F5', 'G#5', 'A5', 'D6', null, 'C#6', 'D6', 'A#5', 'A5', 'G#5', 'G5', 'F5', 'E5', 'D5', 'C#5',
  'D5', 'E5', 'F5', 'G5', 'A5', null, 'D#6', null, 'D6', 'C#6', 'C6', 'B5', 'A#5', 'A5', 'G#5', 'G5',
  'F5', 'A5', 'C6', 'E6', 'D6', null, 'C#6', 'A5', 'G#5', 'A5', 'A#5', 'C6', 'A5', null, 'F5', null,
  'G5', 'G#5', 'A5', 'C#6', 'D6', null, 'E6', null, 'F6', 'E6', 'D6', 'C#6', 'A5', 'G5', 'E5', 'C#5',
  // Void Gaster Chromatic Pulse
  'D5', 'D#5', 'A5', 'D#5', 'C#5', 'D#5', 'A5', 'D#5', 'C5', 'D5', 'G5', 'D5', 'A#4', 'D5', 'F5', 'D5',
  'A4', 'C#5', 'E5', 'A5', 'C#6', null, 'A5', 'E5', 'F5', 'G5', 'G#5', 'A5', 'C6', null, 'E6', null,
  'D6', 'D6', 'F6', null, 'E6', 'D6', 'C#6', 'D6', 'A#5', 'C6', 'D6', 'E6', 'F6', null, 'D6', 'A#5',
  'A5', 'C#6', 'E6', 'G6', 'F6', 'E6', 'D6', 'C#6', 'D6', null, 'A5', null, 'D5', null, null, null
];

const P4_COUNTER = [
  'D4', 'D#4', 'A3', 'D#4', 'D4', 'D#4', 'A3', 'D#4', 'C#4', 'D#4', 'A3', 'D#4', 'C#4', 'D#4', 'A3', 'D#4',
  'C4', 'D4', 'G3', 'D4', 'C4', 'D4', 'G3', 'D4', 'A3', 'C4', 'F3', 'C4', 'A3', 'C4', 'F3', 'C4',
  'F4', 'A4', 'C5', 'F5', 'D4', 'F4', 'A4', 'D5', 'A#3', 'D4', 'F4', 'A#4', 'A3', 'C#4', 'E4', 'A4',
  'G3', 'A#3', 'D4', 'G4', 'A3', 'C#4', 'E4', 'A4', 'D4', 'F4', 'A4', 'D5', 'A3', 'C#4', 'E4', 'A4',
  'D4', 'F4', 'G#4', 'D5', 'C#4', 'F4', 'G#4', 'C#5', 'C4', 'E4', 'G4', 'C5', 'A#3', 'D4', 'F4', 'A#4',
  'A3', 'C#4', 'E4', 'A4', 'E4', 'C#4', 'A3', 'C#4', 'D4', 'F4', 'A4', 'D5', 'E4', 'G#4', 'B4', 'E5',
  'A#3', 'D4', 'F4', 'A#4', 'C4', 'E4', 'G4', 'C5', 'G3', 'A#3', 'D4', 'G4', 'A#3', 'D4', 'F4', 'A#4',
  'A3', 'C#4', 'E4', 'A4', 'C#5', 'E5', 'A5', 'G5', 'D5', null, 'A4', null, 'D4', null, null, null
];

const P4_ARP = [
  ...arp16('D4', 'F4', 'G#4', 'D5'),
  ...arp16('D4', 'D#4', 'A4', 'D5'),
  ...arp16('F4', 'A4', 'C5', 'F5'),
  ...arp16('A3', 'C#4', 'E4', 'G#4'),
  ...arp16('D4', 'D#4', 'A4', 'C#5'),
  ...arp16('A3', 'E4', 'A4', 'C#5'),
  ...arp16('A#3', 'F4', 'A#4', 'D5'),
  ...arp16('A3', 'E4', 'C#5', 'A5')
];

const P4_BASS = [
  ...gallopBass('D2', 'D3'),
  ...gallopBass('C2', 'C3'),
  ...gallopBass('A#1', 'A#2'),
  ...gallopBass('A1', 'A2'),
  ...gallopBass('D2', 'G#2'),
  ...gallopBass('A1', 'E2'),
  ...gallopBass('A#1', 'C2'),
  ...gallopBass('A1', 'D2')
];

const OVERWORLD_LEAD = [
  'A4', null, null, null, 'E5', null, null, null, 'D5', null, null, null, 'C5', null, 'B4', null,
  'A4', null, null, null, 'C5', null, null, null, 'B4', null, null, null, 'G4', null, null, null,
  'F4', null, null, null, 'C5', null, null, null, 'B4', null, null, null, 'A4', null, 'G4', null,
  'E4', null, null, null, 'G#4', null, null, null, 'A4', null, null, null, null, null, null, null
];

const OVERWORLD_BASS = [
  'A2', null, null, null, null, null, null, null, 'F2', null, null, null, null, null, null, null,
  'C3', null, null, null, null, null, null, null, 'G2', null, null, null, null, null, null, null,
  'D2', null, null, null, null, null, null, null, 'G2', null, null, null, null, null, null, null,
  'E2', null, null, null, null, null, null, null, 'A2', null, null, null, null, null, null, null
];

const GAMEOVER_LEAD = [
  'C4', null, null, 'E4', null, null, 'G4', null, null, 'B4', null, null, 'A4', null, null, 'G4',
  null, null, 'E4', null, null, 'D4', null, null, 'C4', null, null, null, null, null, null, null,
  'F4', null, null, 'E4', null, null, 'D4', null, null, 'C4', null, null, 'D4', null, null, 'E4',
  null, null, 'G4', null, null, 'E4', null, null, 'C4', null, null, null, null, null, null, null
];

const ENDING_LEAD = [
  'D4', null, 'F#4', null, 'A4', null, 'D5', null, 'C#5', null, 'B4', null, 'A4', null, null, null,
  'G4', null, 'B4', null, 'D5', null, 'B4', null, 'A4', null, 'F#4', null, 'E4', null, null, null,
  'D4', null, 'E4', null, 'F#4', null, 'A4', null, 'B4', null, 'A4', null, 'G4', null, 'E4', null,
  'D4', null, null, null, 'F#4', null, null, null, 'D5', null, null, null, null, null, null, null
];

const TRACKS = {
  overworld: {
    bpm: 92,
    length: OVERWORLD_LEAD.length,
    lead: OVERWORLD_LEAD,
    bass: OVERWORLD_BASS,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadHold: 1.8,
    drums: null
  },
  phase1: {
    title: 'JUDGMENT OVERDRIVE',
    bpm: 138,
    length: P1_LEAD.length,
    lead: P1_LEAD,
    arp: P1_ARP,
    bass: P1_BASS,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    detuneLead: true,
    subBass: true,
    leadHold: 0.9,
    drums: ['C', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'K', 'K', 'S', 'H', 'K', 'O', 'S', 'H']
  },
  phase2: {
    title: 'CRIMSON VELOCITY',
    bpm: 150,
    length: P2_LEAD.length,
    lead: P2_LEAD,
    counter: P2_COUNTER,
    arp: P2_ARP,
    bass: P2_BASS,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    detuneLead: true,
    subBass: true,
    leadHold: 0.9,
    drums: ['C', 'H', 'K', 'K', 'S', 'H', 'K', 'O', 'K', 'H', 'S', 'K', 'K', 'O', 'S', 'S']
  },
  phase3: {
    title: 'SHATTERED DAWN',
    bpm: 158,
    length: P3_LEAD.length,
    lead: P3_LEAD,
    counter: P3_COUNTER,
    bass: P3_BASS,
    leadWave: 'sawtooth',
    bassWave: 'square',
    detuneLead: true,
    subBass: true,
    leadHold: 0.95,
    drums: ['C', 'K', 'K', 'H', 'S', 'H', 'K', 'O', 'K', 'K', 'S', 'S', 'K', 'O', 'S', 'S']
  },
  phase4: {
    title: 'VOID ANOMALY // 666',
    bpm: 168,
    length: P4_LEAD.length,
    lead: P4_LEAD,
    counter: P4_COUNTER,
    arp: P4_ARP,
    bass: P4_BASS,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    detuneLead: true,
    subBass: true,
    leadHold: 0.95,
    drums: ['C', 'K', 'K', 'K', 'S', 'O', 'K', 'K', 'C', 'K', 'S', 'K', 'K', 'O', 'S', 'S']
  },
  gameover: {
    bpm: 84,
    length: GAMEOVER_LEAD.length,
    lead: GAMEOVER_LEAD,
    bass: OVERWORLD_BASS,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadHold: 2.2,
    drums: null
  },
  ending: {
    bpm: 88,
    length: ENDING_LEAD.length,
    lead: ENDING_LEAD,
    bass: OVERWORLD_BASS,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadHold: 2.0,
    drums: null
  }
};

export const audio = new SoundEngine();
