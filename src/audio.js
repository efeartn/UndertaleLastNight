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
    this.compressor = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.analyser = null;
    this.echoSend = null;
    this.echoDelay = null;
    this.echoFeedback = null;
    this.reverbSend = null;
    this.reverbNode = null;
    this.guitarBus = null;
    this.noiseBuffer = null;

    this.muted = false;
    this.volume = 0.72;
    this.tempoMult = 1.0;
    this.beatPulse = 0;
    this.lastBeatTime = 0;
    this.glitchStutterUntil = 0;
    this.currentTrack = null;
    this.stepIndex = 0;
    this.nextNoteTime = 0;
    this.schedulerTimer = null;
    this.lastBlipTime = 0;
  }

  _makeOverdriveCurve(amount = 22) {
    const n = 512;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      const asym = x >= 0 ? x : x * 0.92;
      curve[i] = Math.tanh(asym * (1 + amount * 0.14));
    }
    return curve;
  }

  _createReverbImpulse(seconds = 1.55, decay = 2.6) {
    if (!this.ctx) return null;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const impulse = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, decay);
        const white = Math.random() * 2 - 1;
        prev = prev * 0.42 + white * 0.58;
        data[i] = prev * env;
      }
    }
    return impulse;
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
        this.bgmGain.gain.value = 0.38;
        this.sfxGain.gain.value = 0.55;

        // Mastering Compressor -> Analyser -> Destination
        if (typeof this.ctx.createDynamicsCompressor === 'function') {
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.value = -14;
          this.compressor.knee.value = 16;
          this.compressor.ratio.value = 4;
          this.compressor.attack.value = 0.004;
          this.compressor.release.value = 0.14;
          this.compressor.connect(this.master);
        } else {
          this.compressor = this.master;
        }

        // Live FFT Analyser for beat/jukebox visuals
        if (typeof this.ctx.createAnalyser === 'function') {
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 128;
          this.analyser.smoothingTimeConstant = 0.78;
          this.master.connect(this.analyser);
          this.analyser.connect(this.ctx.destination);
        } else {
          this.master.connect(this.ctx.destination);
        }

        // Stereo-feel echo delay bus for bells & Void depth
        if (typeof this.ctx.createDelay === 'function') {
          this.echoSend = this.ctx.createGain();
          this.echoSend.gain.value = 0.24;
          this.echoDelay = this.ctx.createDelay(1.0);
          this.echoDelay.delayTime.value = 0.21;
          const echoTone = this.ctx.createBiquadFilter();
          echoTone.type = 'lowpass';
          echoTone.frequency.value = 2600;
          this.echoFeedback = this.ctx.createGain();
          this.echoFeedback.gain.value = 0.24;

          this.echoSend.connect(this.echoDelay);
          this.echoDelay.connect(echoTone);
          echoTone.connect(this.bgmGain);
          echoTone.connect(this.echoFeedback);
          this.echoFeedback.connect(this.echoDelay);
        }

        // Stereo Hall Convolution Reverb bus
        if (typeof this.ctx.createConvolver === 'function') {
          const impulse = this._createReverbImpulse(1.55, 2.6);
          if (impulse) {
            this.reverbSend = this.ctx.createGain();
            this.reverbSend.gain.value = 0.32;
            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = impulse;
            const reverbTone = this.ctx.createBiquadFilter();
            reverbTone.type = 'lowpass';
            reverbTone.frequency.value = 3600;
            this.reverbSend.connect(this.reverbNode);
            this.reverbNode.connect(reverbTone);
            reverbTone.connect(this.bgmGain);
          }
        }

        // Tube-Amp Overdrive + 4x12 Cabinet EQ Guitar Bus
        if (typeof this.ctx.createWaveShaper === 'function') {
          this.guitarBus = this.ctx.createGain();
          this.guitarBus.gain.value = 0.78;
          const shaper = this.ctx.createWaveShaper();
          shaper.curve = this._makeOverdriveCurve(22);
          shaper.oversample = '4x';
          const hp = this.ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 130;
          const presence = this.ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 1700;
          presence.Q.value = 1.2;
          presence.gain.value = 5;
          const cabFilter = this.ctx.createBiquadFilter();
          cabFilter.type = 'lowpass';
          cabFilter.frequency.value = 3100;

          this.guitarBus.connect(shaper);
          shaper.connect(hp);
          hp.connect(presence);
          presence.connect(cabFilter);
          cabFilter.connect(this.bgmGain);
          if (this.echoSend) {
            const gEcho = this.ctx.createGain();
            gEcho.gain.value = 0.18;
            cabFilter.connect(gEcho);
            gEcho.connect(this.echoSend);
          }
          if (this.reverbSend) {
            const gRev = this.ctx.createGain();
            gRev.gain.value = 0.22;
            cabFilter.connect(gRev);
            gRev.connect(this.reverbSend);
          }
        }

        this.bgmGain.connect(this.compressor);
        this.sfxGain.connect(this.compressor);

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

  dash() {
    this._tone(340, 1180, 0.09, 'triangle', 0.18, 'sfx', 0);
    this._noise(0.08, 2800, 'highpass', 0.14, 'sfx', 0);
  }

  overdrive() {
    this._tone(293.66, 587.33, 0.11, 'sawtooth', 0.16, 'sfx', 0);
    this._tone(587.33, 1174.66, 0.15, 'square', 0.15, 'sfx', 0.06);
  }

  webMove() {
    this._tone(420, 660, 0.045, 'triangle', 0.12, 'sfx', 0);
  }

  rankUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      this._tone(n, n, 0.09, 'square', 0.13, 'sfx', idx * 0.045);
    });
  }

  echoFlower() {
    [523.25, 659.25, 783.99, 987.77].forEach((n, idx) => {
      this._tone(n, n * 0.99, 0.22, 'sine', 0.13, 'sfx', idx * 0.09);
    });
  }

  gasterUnboundRoar() {
    this._tone(160, 48, 0.65, 'sawtooth', 0.24, 'sfx', 0);
    this._tone(240, 72, 0.55, 'square', 0.16, 'sfx', 0.04);
    this._noise(0.6, 620, 'lowpass', 0.22, 'sfx', 0.02);
  }

  itemThrow() {
    this._tone(1480, 420, 0.14, 'triangle', 0.18, 'sfx', 0);
    this._tone(880, 1760, 0.09, 'sine', 0.12, 'sfx', 0.05);
    this._noise(0.11, 3200, 'highpass', 0.13, 'sfx', 0);
  }

  itemBlast() {
    this._tone(190, 46, 0.28, 'sawtooth', 0.22, 'sfx', 0);
    this._noise(0.24, 1400, 'bandpass', 0.24, 'sfx', 0);
    [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
      this._tone(n, n * 1.02, 0.11, 'triangle', 0.11, 'sfx', 0.04 + i * 0.035);
    });
  }

  chronoSlow() {
    this._tone(980, 260, 0.34, 'triangle', 0.16, 'sfx', 0);
    this._tone(985, 258, 0.34, 'sine', 0.12, 'sfx', 0.01);
  }

  ketchupPop() {
    this._tone(260, 720, 0.07, 'sine', 0.18, 'sfx', 0);
    this._tone(140, 90, 0.12, 'triangle', 0.14, 'sfx', 0.08);
  }

  setTempoMult(mult) {
    const v = Number(mult);
    this.tempoMult = Number.isFinite(v) ? Math.max(0.65, Math.min(1.45, v)) : 1.0;
    return this.tempoMult;
  }

  getBeatPulse() {
    if (!this.lastBeatTime || this.muted) return 0;
    const elapsed = (Date.now() - this.lastBeatTime) / 220;
    this.beatPulse = Math.max(0, Math.min(1, 1 - elapsed));
    return this.beatPulse;
  }

  glitchStutter(dur = 0.24) {
    this.glitchStutterUntil = Date.now() + dur * 1000;
    this.fourthWallGlitch();
  }

  transitionToBGM(trackName) {
    if (this.currentTrack === trackName) return;
    if (this.ensureContext() && !this.muted) {
      this._scheduleCrash(this.ctx.currentTime + 0.01);
    }
    this.playBGM(trackName);
  }

  getVisualizerData(outArray) {
    if (!outArray || !outArray.length) return outArray;
    if (this.analyser && this.ctx && this.ctx.state === 'running' && !this.muted) {
      this.analyser.getByteFrequencyData(outArray);
      let sum = 0;
      for (let i = 0; i < outArray.length; i++) sum += outArray[i];
      if (sum > 0) return outArray;
    }
    // Synthesized reactive fallback when playing silently or previewing before interaction
    const pulse = this.getBeatPulse();
    const now = Date.now() * 0.006;
    const base = this.currentTrack && !this.muted ? 42 + pulse * 140 : 12;
    for (let i = 0; i < outArray.length; i++) {
      const wave = 0.5 + 0.5 * Math.sin(now + i * 0.48);
      outArray[i] = Math.min(255, Math.round(base * (0.35 + wave * 0.85)));
    }
    return outArray;
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
      const effBpm = track.bpm * this.tempoMult;
      const secPerStep = 60 / effBpm / 4; // 16th note
      this.nextNoteTime += secPerStep;
      this.stepIndex = (this.stepIndex + 1) % track.length;
    }
  }

  _playTrackStep(track, idx, t) {
    if (this.muted) return;
    const effBpm = track.bpm * this.tempoMult;
    const stepDur = (60 / effBpm / 4) * 0.9;
    const glitchWarp = Date.now() < this.glitchStutterUntil ? (idx % 2 === 0 ? 1.055 : 0.945) : 1.0;

    const lead = track.lead[idx];
    if (lead) {
      const f = freq(lead) * glitchWarp;
      const dur = stepDur * (track.leadHold || 0.9);
      this._dispatchVoice(track.leadInst || 'guitar', f, dur, 0.16, t, -0.1);
    }

    const counter = track.counter && track.counter[idx % track.counter.length];
    if (counter) {
      this._dispatchVoice(track.counterInst || 'strings', freq(counter) * glitchWarp, stepDur * 1.15, 0.115, t, 0.28);
    }

    const arp = track.arp && track.arp[idx % track.arp.length];
    if (arp) {
      this._dispatchVoice(track.arpInst || 'harpsichord', freq(arp) * glitchWarp, stepDur * 0.78, 0.095, t, (idx % 2 === 0 ? -0.32 : 0.32));
    }

    const pad = track.pad && track.pad[idx % track.pad.length];
    if (pad) {
      this._dispatchVoice(track.padInst || 'strings', freq(pad) * glitchWarp, stepDur * 7.5, 0.08, t, 0);
    }

    const bass = track.bass && track.bass[idx % track.bass.length];
    if (bass) {
      const bf = freq(bass) * glitchWarp;
      this._dispatchVoice(track.bassInst || 'electricbass', bf, stepDur * 1.25, 0.21, t, 0);
    }

    if (track.drums) {
      const d = track.drums[idx % track.drums.length];
      if (d === 'K') {
        this._scheduleKick(t);
        this.lastBeatTime = Date.now();
      } else if (d === 'S') {
        this._scheduleSnare(t);
      } else if (d === 'H') {
        this._scheduleHat(t);
      } else if (d === 'O') {
        this._scheduleOpenHat(t);
      } else if (d === 'C') {
        this._scheduleCrash(t);
        this.lastBeatTime = Date.now();
      }
    } else if (idx % 8 === 0) {
      this.lastBeatTime = Date.now();
    }
  }

  _dispatchVoice(inst, f, dur, peak, t, pan = 0) {
    if (!f || !this.ctx) return;
    switch (inst) {
      case 'piano':
        this._playPiano(f, dur, peak, t, pan);
        break;
      case 'musicbox':
        this._playMusicBox(f, dur, peak, t, pan);
        break;
      case 'guitar':
        this._playGuitarLead(f, dur, peak, t, pan);
        break;
      case 'powerchord':
        this._playPowerChord(f, dur, peak, t, pan);
        break;
      case 'electricbass':
        this._playElectricBass(f, dur, peak, t, false);
        break;
      case 'slapbass':
        this._playElectricBass(f, dur, peak, t, true);
        break;
      case 'strings':
        this._playStrings(f, dur, peak, t);
        break;
      case 'brass':
        this._playOrganBrass(f, dur, peak, t, 'brass');
        break;
      case 'organ':
        this._playOrganBrass(f, dur, peak, t, 'organ');
        break;
      case 'harpsichord':
        this._playHarpsichord(f, dur, peak, t, pan);
        break;
      default:
        this._playPiano(f, dur, peak, t, pan);
        break;
    }
  }

  _connectPanned(node, pan, destNode) {
    const target = destNode || this.bgmGain;
    if (pan && typeof this.ctx.createStereoPanner === 'function') {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-0.9, Math.min(0.9, pan));
      node.connect(p);
      p.connect(target);
      return p;
    }
    node.connect(target);
    return target;
  }

  _scheduleNoiseTransient(centerHz, q, dur, peak, t, destNode) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(centerHz, t);
    filt.Q.setValueAtTime(q, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, peak), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(destNode || this.bgmGain);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  _playPiano(f, dur, peak, t, pan = 0) {
    const out = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(6200, f * 7.2), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(520, f * 2.2), t + Math.max(0.18, dur * 1.1));
    out.connect(lp);
    this._connectPanned(lp, pan, this.bgmGain);
    if (this.reverbSend) {
      const revG = this.ctx.createGain();
      revG.gain.value = 0.42;
      lp.connect(revG);
      revG.connect(this.reverbSend);
    }

    const partials = [
      { mult: 1.0, wave: 'triangle', gain: peak * 0.78, dMult: 1.45 },
      { mult: 2.002, wave: 'sine', gain: peak * 0.34, dMult: 0.95 },
      { mult: 3.005, wave: 'sine', gain: peak * 0.16, dMult: 0.65 }
    ];
    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const decay = Math.max(0.12, dur * p.dMult);
      osc.type = p.wave;
      osc.frequency.setValueAtTime(f * p.mult, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(p.gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.02);
    }
    this._scheduleNoiseTransient(2100, 1.8, 0.009, peak * 0.18, t, this.bgmGain);
  }

  _playMusicBox(f, dur, peak, t, pan = 0) {
    const bellDur = Math.max(0.28, dur * 1.6);
    const car = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modG = this.ctx.createGain();
    const outG = this.ctx.createGain();

    car.type = 'sine';
    car.frequency.setValueAtTime(f, t);
    mod.type = 'sine';
    mod.frequency.setValueAtTime(f * 3.0, t);
    modG.gain.setValueAtTime(f * 2.1, t);
    modG.gain.exponentialRampToValueAtTime(1, t + bellDur * 0.65);

    mod.connect(modG);
    modG.connect(car.frequency);

    outG.gain.setValueAtTime(0.0001, t);
    outG.gain.linearRampToValueAtTime(peak * 0.85, t + 0.003);
    outG.gain.exponentialRampToValueAtTime(0.0001, t + bellDur);

    car.connect(outG);
    this._connectPanned(outG, pan, this.bgmGain);
    if (this.echoSend) outG.connect(this.echoSend);
    if (this.reverbSend) outG.connect(this.reverbSend);

    mod.start(t);
    car.start(t);
    mod.stop(t + bellDur + 0.02);
    car.stop(t + bellDur + 0.02);
  }

  _playGuitarLead(f, dur, peak, t, pan = 0) {
    const dest = this.guitarBus || this.bgmGain;
    const sumG = this.ctx.createGain();
    const noteDur = Math.max(0.08, dur);
    sumG.gain.setValueAtTime(0.0001, t);
    sumG.gain.linearRampToValueAtTime(peak * 0.9, t + 0.006);
    sumG.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
    this._connectPanned(sumG, pan, dest);

    for (const mult of [0.9965, 1.0035]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * mult, t);
      if (noteDur > 0.2) {
        const lfo = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        lfo.frequency.setValueAtTime(5.6, t);
        lfoG.gain.setValueAtTime(f * 0.008, t);
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        lfo.start(t + 0.07);
        lfo.stop(t + noteDur + 0.02);
      }
      osc.connect(sumG);
      osc.start(t);
      osc.stop(t + noteDur + 0.02);
    }
    this._scheduleNoiseTransient(3200, 1.4, 0.007, peak * 0.25, t, dest);
  }

  _playPowerChord(f, dur, peak, t, pan = 0) {
    const dest = this.guitarBus || this.bgmGain;
    const chDur = Math.max(0.06, dur * 0.85);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2500, t);
    lp.frequency.exponentialRampToValueAtTime(750, t + chDur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak * 0.45, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + chDur);
    g.connect(lp);
    this._connectPanned(lp, pan, dest);

    for (const ratio of [0.5, 0.749, 1.0]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * ratio, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + chDur + 0.02);
    }
  }

  _playElectricBass(f, dur, peak, t, slap = false) {
    const bDur = Math.max(0.09, dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.setValueAtTime(slap ? 3.2 : 2.2, t);
    lp.frequency.setValueAtTime(slap ? 1950 : 1100, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + bDur);
    lp.connect(this.bgmGain);

    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(f, t);
    subG.gain.setValueAtTime(0.0001, t);
    subG.gain.linearRampToValueAtTime(peak * 0.85, t + 0.005);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + bDur);
    sub.connect(subG);
    subG.connect(this.bgmGain);
    sub.start(t);
    sub.stop(t + bDur + 0.02);

    const body = this.ctx.createOscillator();
    const bodyG = this.ctx.createGain();
    body.type = 'sawtooth';
    body.frequency.setValueAtTime(f, t);
    bodyG.gain.setValueAtTime(0.0001, t);
    bodyG.gain.linearRampToValueAtTime(peak * (slap ? 0.62 : 0.48), t + 0.004);
    bodyG.gain.exponentialRampToValueAtTime(0.0001, t + bDur * 0.92);
    body.connect(bodyG);
    bodyG.connect(lp);
    body.start(t);
    body.stop(t + bDur + 0.02);

    if (slap) {
      this._scheduleNoiseTransient(2600, 1.5, 0.006, peak * 0.16, t, lp);
    }
  }

  _playStrings(f, dur, peak, t) {
    const sDur = Math.max(0.22, dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2100, t);
    lp.connect(this.bgmGain);
    if (this.reverbSend) {
      const revG = this.ctx.createGain();
      revG.gain.value = 0.55;
      lp.connect(revG);
      revG.connect(this.reverbSend);
    }

    const voices = [
      { mult: 0.9954, pan: -0.35, amp: 0.34 },
      { mult: 1.0, pan: 0, amp: 0.42 },
      { mult: 1.0046, pan: 0.35, amp: 0.34 }
    ];
    const atk = Math.min(0.08, sDur * 0.25);
    for (const v of voices) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * v.mult, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * v.amp, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sDur);
      osc.connect(g);
      this._connectPanned(g, v.pan, lp);
      osc.start(t);
      osc.stop(t + sDur + 0.02);
    }
  }

  _playOrganBrass(f, dur, peak, t, mode = 'organ') {
    const oDur = Math.max(0.16, dur);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    if (mode === 'brass') {
      filt.Q.setValueAtTime(1.8, t);
      filt.frequency.setValueAtTime(680, t);
      filt.frequency.exponentialRampToValueAtTime(3400, t + Math.min(0.09, oDur * 0.35));
    } else {
      filt.frequency.setValueAtTime(2900, t);
    }
    filt.connect(this.bgmGain);
    if (this.reverbSend) {
      const revG = this.ctx.createGain();
      revG.gain.value = 0.45;
      filt.connect(revG);
      revG.connect(this.reverbSend);
    }

    const harmonics = mode === 'brass'
      ? [{ m: 1.0, w: 'sawtooth', a: 0.5 }, { m: 1.005, w: 'sawtooth', a: 0.45 }]
      : [
          { m: 0.5, w: 'sine', a: 0.32 },
          { m: 1.0, w: 'triangle', a: 0.46 },
          { m: 1.5, w: 'sine', a: 0.22 },
          { m: 2.0, w: 'sine', a: 0.24 }
        ];
    for (const h of harmonics) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = h.w;
      osc.frequency.setValueAtTime(f * h.m, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * h.a, t + (mode === 'brass' ? 0.022 : 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t + oDur);
      osc.connect(g);
      g.connect(filt);
      osc.start(t);
      osc.stop(t + oDur + 0.02);
    }
  }

  _playHarpsichord(f, dur, peak, t, pan = 0) {
    const hDur = Math.max(0.08, dur * 1.1);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.setValueAtTime(2.2, t);
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(1050, t + hDur);
    this._connectPanned(lp, pan, this.bgmGain);
    if (this.reverbSend) {
      const revG = this.ctx.createGain();
      revG.gain.value = 0.24;
      lp.connect(revG);
      revG.connect(this.reverbSend);
    }

    for (const [m, amp] of [[1.0, 0.55], [2.001, 0.28]]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * m, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak * amp, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + hDur);
      osc.connect(g);
      g.connect(lp);
      osc.start(t);
      osc.stop(t + hDur + 0.02);
    }
    this._scheduleNoiseTransient(3400, 1.6, 0.005, peak * 0.14, t, lp);
  }

  _scheduleKick(t) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.08);
    g.gain.setValueAtTime(0.38, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + 0.15);
    this._scheduleNoiseTransient(2800, 1.5, 0.008, 0.14, t, this.bgmGain);
  }

  _scheduleSnare(t) {
    if (!this.ctx) return;
    const shell = this.ctx.createOscillator();
    const shellG = this.ctx.createGain();
    shell.type = 'triangle';
    shell.frequency.setValueAtTime(215, t);
    shell.frequency.exponentialRampToValueAtTime(130, t + 0.06);
    shellG.gain.setValueAtTime(0.22, t);
    shellG.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    shell.connect(shellG);
    shellG.connect(this.bgmGain);
    shell.start(t);
    shell.stop(t + 0.1);

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1950, t);
      bp.Q.setValueAtTime(0.85, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.22, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(this.bgmGain);
      if (this.reverbSend) ng.connect(this.reverbSend);
      src.start(t);
      src.stop(t + 0.14);
    }
  }

  _scheduleHat(t) {
    if (!this.ctx) return;
    for (const mf of [3400, 4950, 6650]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(mf, t);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + 0.036);
    }
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(6200, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.065, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(this.bgmGain);
      src.start(t);
      src.stop(t + 0.045);
    }
  }

  _scheduleOpenHat(t) {
    if (!this.ctx) return;
    for (const mf of [3250, 4600, 6200]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(mf, t);
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + 0.13);
    }
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4800, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.1, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(this.bgmGain);
      if (this.reverbSend) ng.connect(this.reverbSend);
      src.start(t);
      src.stop(t + 0.14);
    }
  }

  _scheduleCrash(t) {
    if (!this.ctx) return;
    for (const mf of [2900, 4150, 5600]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(mf, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(g);
      g.connect(this.bgmGain);
      if (this.reverbSend) g.connect(this.reverbSend);
      osc.start(t);
      osc.stop(t + 0.34);
    }
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3600, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.18, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(this.bgmGain);
      if (this.reverbSend) ng.connect(this.reverbSend);
      src.start(t);
      src.stop(t + 0.36);
    }
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

// Phase 5: "DARKER YET DARKER // UNBOUND" (176 BPM F# minor + Gaster Void Unbound Anthem)
const P5_LEAD = [
  'F#5', 'G#5', 'A5', 'C#6', 'F#6', null, 'E6', 'F#6', 'D6', 'C#6', 'B5', 'A5', 'G#5', 'A5', 'B5', 'C#6',
  'F#5', 'A5', 'B5', 'D6', 'C#6', null, 'G6', null, 'F#6', 'F6', 'E6', 'D#6', 'D6', 'C#6', 'B5', 'G#5',
  'A5', 'C#6', 'E6', 'F#6', 'E6', null, 'D6', 'C#6', 'B5', 'C#6', 'D6', 'E6', 'C#6', null, 'A5', null,
  'G#5', 'B5', 'D6', 'F6', 'F#6', null, 'G#6', null, 'A6', 'G#6', 'F#6', 'E6', 'D6', 'C#6', 'B5', 'G#5',
  // Gaster Theme Polychord Storm
  'F#5', 'G5', 'D6', 'G5', 'F5', 'G5', 'D6', 'G5', 'E5', 'F#5', 'C#6', 'F#5', 'D5', 'F#5', 'B5', 'F#5',
  'C#5', 'F#5', 'G#5', 'C#6', 'F6', null, 'C#6', 'G#5', 'A5', 'B5', 'C#6', 'D6', 'E6', null, 'G#6', null,
  'F#6', 'F#6', 'A6', null, 'G#6', 'F#6', 'F6', 'F#6', 'D6', 'E6', 'F#6', 'G#6', 'A6', null, 'F#6', 'D6',
  'C#6', 'F6', 'G#6', 'B6', 'A6', 'G#6', 'F#6', 'F6', 'F#6', null, 'C#6', null, 'F#5', null, null, null
];

const P5_COUNTER = [
  'F#4', 'G4', 'D4', 'G4', 'F#4', 'G4', 'D4', 'G4', 'F4', 'G4', 'D4', 'G4', 'F4', 'G4', 'D4', 'G4',
  'E4', 'F#4', 'C#4', 'F#4', 'E4', 'F#4', 'C#4', 'F#4', 'D4', 'F#4', 'B3', 'F#4', 'D4', 'F#4', 'B3', 'F#4',
  'A4', 'C#5', 'E5', 'A5', 'F#4', 'A4', 'C#5', 'F#5', 'D4', 'F#4', 'B4', 'D5', 'C#4', 'F4', 'G#4', 'C#5',
  'B3', 'D4', 'G#4', 'B4', 'C#4', 'F4', 'G#4', 'C#5', 'F#4', 'A4', 'C#5', 'F#5', 'C#4', 'F4', 'G#4', 'C#5',
  'F#4', 'A4', 'D5', 'F#5', 'F4', 'A4', 'D5', 'F5', 'E4', 'G#4', 'C#5', 'E5', 'D4', 'F#4', 'B4', 'D5',
  'C#4', 'F4', 'G#4', 'C#5', 'G#4', 'F4', 'C#4', 'F4', 'F#4', 'A4', 'C#5', 'F#5', 'G#4', 'B4', 'D5', 'G#5',
  'D4', 'F#4', 'A4', 'D5', 'E4', 'G#4', 'B4', 'E5', 'B3', 'D4', 'F#4', 'B4', 'D4', 'F#4', 'B4', 'D5',
  'C#4', 'F4', 'G#4', 'C#5', 'F5', 'G#5', 'C#6', 'B5', 'F#5', null, 'C#5', null, 'F#4', null, null, null
];

const P5_ARP = [
  ...arp16('F#4', 'A4', 'C#5', 'F#5'),
  ...arp16('F#4', 'G4', 'D5', 'F#5'),
  ...arp16('A4', 'C#5', 'E5', 'A5'),
  ...arp16('C#4', 'F4', 'G#4', 'C#5'),
  ...arp16('F#4', 'G4', 'D5', 'F#5'),
  ...arp16('C#4', 'G#4', 'C#5', 'F5'),
  ...arp16('D4', 'A4', 'D5', 'F#5'),
  ...arp16('C#4', 'G#4', 'F5', 'C#6')
];

const P5_BASS = [
  ...gallopBass('F#2', 'F#3'),
  ...gallopBass('E2', 'E3'),
  ...gallopBass('D2', 'D3'),
  ...gallopBass('C#2', 'C#3'),
  ...gallopBass('F#2', 'C#3'),
  ...gallopBass('C#2', 'G#2'),
  ...gallopBass('D2', 'E2'),
  ...gallopBass('C#2', 'F#2')
];

const P5_PAD = [
  'F#3', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  'D3', null, null, null, null, null, null, null, 'C#3', null, null, null, null, null, null, null,
  'A3', null, null, null, null, null, null, null, 'D3', null, null, null, 'C#3', null, null, null,
  'B2', null, null, null, null, null, null, null, 'F#3', null, null, null, 'C#3', null, null, null
];

const TITLE_LEAD = [
  'D4', null, 'A4', null, 'F4', null, 'E4', 'D4', 'C4', null, 'G4', null, 'E4', null, null, null,
  'A#3', null, 'F4', null, 'D4', null, 'E4', 'F4', 'E4', null, 'C#4', null, 'A3', null, null, null,
  'D4', null, 'F4', 'A4', 'D5', null, 'C5', 'A#4', 'A4', null, 'G4', null, 'F4', null, 'E4', null,
  'D4', null, 'E4', null, 'C#4', null, 'A4', null, 'D5', null, null, null, null, null, null, null
];

const TITLE_BASS = [
  'D2', null, null, null, 'A2', null, null, null, 'C2', null, null, null, 'G2', null, null, null,
  'A#1', null, null, null, 'F2', null, null, null, 'A1', null, null, null, 'E2', null, null, null,
  'D2', null, null, null, 'F2', null, null, null, 'G2', null, null, null, 'C3', null, null, null,
  'A#1', null, null, null, 'A1', null, null, null, 'D2', null, null, null, null, null, null, null
];

const TITLE_PAD = [
  'D3', null, null, null, null, null, null, null, 'C3', null, null, null, null, null, null, null,
  'A#2', null, null, null, null, null, null, null, 'A2', null, null, null, null, null, null, null,
  'D3', null, null, null, null, null, null, null, 'G3', null, null, null, null, null, null, null,
  'A#2', null, null, null, 'A2', null, null, null, 'D3', null, null, null, null, null, null, null
];

const ECHO_LEAD = [
  'E5', null, 'B4', null, 'G4', null, 'A4', null, 'B4', null, null, null, 'D5', null, 'C5', null,
  'B4', null, 'G4', null, 'E4', null, null, null, 'F#4', null, 'G4', null, 'B4', null, null, null,
  'E5', null, 'F#5', null, 'G5', null, 'F#5', null, 'E5', null, 'D5', null, 'B4', null, 'G4', null,
  'C5', null, 'B4', null, 'A4', null, 'F#4', null, 'E4', null, null, null, null, null, null, null
];

const ECHO_ARP = [
  ...arp16('E4', 'G4', 'B4', 'E5'),
  ...arp16('G3', 'B3', 'D4', 'G4'),
  ...arp16('C4', 'E4', 'G4', 'C5'),
  ...arp16('B3', 'D#4', 'F#4', 'B4')
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

const VICTORY_LEAD = [
  'D5', null, 'F#5', null, 'A5', null, 'D6', null, 'C#6', null, 'B5', null, 'A5', null, null, null,
  'G5', null, 'B5', null, 'D6', null, 'B5', null, 'A5', null, 'F#5', null, 'E5', null, null, null,
  'D5', null, 'E5', null, 'F#5', null, 'A5', null, 'B5', null, 'A5', null, 'G5', null, 'E5', null,
  'D5', null, 'A4', null, 'F#5', null, 'E5', null, 'D5', null, null, null, null, null, null, null
];

const VOID_PAD = [
  'D3', null, null, null, null, null, null, null, 'C3', null, null, null, null, null, null, null,
  'A#2', null, null, null, null, null, null, null, 'A2', null, null, null, null, null, null, null
];

const TRACKS = {
  title: {
    title: 'MIDNIGHT OVERTURE',
    subtitle: 'Title Theme · Grand Piano & Strings',
    bpm: 104,
    length: TITLE_LEAD.length,
    lead: TITLE_LEAD,
    bass: TITLE_BASS,
    pad: TITLE_PAD,
    leadInst: 'piano',
    bassInst: 'electricbass',
    padInst: 'strings',
    leadHold: 1.5,
    drums: null
  },
  overworld: {
    title: 'TWILIGHT JUDGMENT HALL',
    subtitle: 'Overworld · Cathedral Piano & Strings',
    bpm: 96,
    length: OVERWORLD_LEAD.length,
    lead: OVERWORLD_LEAD,
    bass: OVERWORLD_BASS,
    pad: TITLE_PAD,
    leadInst: 'piano',
    bassInst: 'electricbass',
    padInst: 'strings',
    leadHold: 1.8,
    drums: null
  },
  echo_sanctum: {
    title: 'ECHOES OF WATERFALL',
    subtitle: 'Secret Room · FM Celesta & Piano',
    bpm: 92,
    length: ECHO_LEAD.length,
    lead: ECHO_LEAD,
    arp: ECHO_ARP,
    bass: OVERWORLD_BASS,
    pad: ['E3', null, null, null, null, null, null, null, 'G3', null, null, null, 'C3', null, null, null],
    leadInst: 'musicbox',
    arpInst: 'piano',
    bassInst: 'electricbass',
    padInst: 'strings',
    leadHold: 1.7,
    drums: null
  },
  phase1: {
    title: 'JUDGMENT OVERDRIVE',
    subtitle: 'Phase 1 · Rock Guitar, Harpsichord & Strings',
    bpm: 138,
    length: P1_LEAD.length,
    lead: P1_LEAD,
    arp: P1_ARP,
    bass: P1_BASS,
    pad: VOID_PAD,
    leadInst: 'guitar',
    arpInst: 'harpsichord',
    bassInst: 'slapbass',
    padInst: 'strings',
    leadHold: 0.9,
    drums: ['C', 'H', 'K', 'H', 'S', 'H', 'K', 'H', 'K', 'K', 'S', 'H', 'K', 'O', 'S', 'H']
  },
  phase2: {
    title: 'CRIMSON VELOCITY',
    subtitle: 'Phase 2 · Overdrive Guitar & Dark Brass',
    bpm: 150,
    length: P2_LEAD.length,
    lead: P2_LEAD,
    counter: P2_COUNTER,
    arp: P2_ARP,
    bass: P2_BASS,
    pad: ['E3', null, null, null, null, null, null, null, 'D3', null, null, null, null, null, null, null],
    leadInst: 'guitar',
    counterInst: 'brass',
    arpInst: 'powerchord',
    bassInst: 'slapbass',
    padInst: 'strings',
    leadHold: 0.9,
    drums: ['C', 'H', 'K', 'K', 'S', 'H', 'K', 'O', 'K', 'H', 'S', 'K', 'K', 'O', 'S', 'S']
  },
  phase3: {
    title: 'SHATTERED DAWN',
    subtitle: 'Phase 3 · Lead Guitar & Symphonic Organ',
    bpm: 158,
    length: P3_LEAD.length,
    lead: P3_LEAD,
    counter: P3_COUNTER,
    bass: P3_BASS,
    pad: ['C#3', null, null, null, null, null, null, null, 'B2', null, null, null, null, null, null, null],
    leadInst: 'guitar',
    counterInst: 'strings',
    bassInst: 'slapbass',
    padInst: 'organ',
    leadHold: 0.95,
    drums: ['C', 'K', 'K', 'H', 'S', 'H', 'K', 'O', 'K', 'K', 'S', 'S', 'K', 'O', 'S', 'S']
  },
  phase4: {
    title: 'VOID ANOMALY // 666',
    subtitle: 'Phase 4 · Pipe Organ, Guitar & Baroque Keys',
    bpm: 168,
    length: P4_LEAD.length,
    lead: P4_LEAD,
    counter: P4_COUNTER,
    arp: P4_ARP,
    bass: P4_BASS,
    pad: VOID_PAD,
    leadInst: 'guitar',
    counterInst: 'organ',
    arpInst: 'harpsichord',
    bassInst: 'slapbass',
    padInst: 'strings',
    leadHold: 0.95,
    drums: ['C', 'K', 'K', 'K', 'S', 'O', 'K', 'K', 'C', 'K', 'S', 'K', 'K', 'O', 'S', 'S']
  },
  phase5: {
    title: 'DARKER YET DARKER // UNBOUND',
    subtitle: 'Phase 5 · Full Symphonic Metal Requiem',
    bpm: 176,
    length: P5_LEAD.length,
    lead: P5_LEAD,
    counter: P5_COUNTER,
    arp: P5_ARP,
    bass: P5_BASS,
    pad: P5_PAD,
    leadInst: 'guitar',
    counterInst: 'brass',
    arpInst: 'harpsichord',
    bassInst: 'slapbass',
    padInst: 'organ',
    leadHold: 0.95,
    drums: ['C', 'K', 'K', 'K', 'S', 'K', 'K', 'O', 'C', 'K', 'S', 'K', 'K', 'O', 'S', 'S']
  },
  victory: {
    title: 'FIRST LIGHT OF DAWN',
    subtitle: 'Victory · Acoustic Piano & Warm Strings',
    bpm: 116,
    length: VICTORY_LEAD.length,
    lead: VICTORY_LEAD,
    bass: OVERWORLD_BASS,
    pad: ['D3', null, null, null, null, null, null, null, 'G3', null, null, null, 'A3', null, null, null],
    leadInst: 'piano',
    bassInst: 'electricbass',
    padInst: 'strings',
    leadHold: 1.9,
    drums: ['K', null, 'H', null, 'S', null, 'H', null]
  },
  gameover: {
    title: 'SHATTERED DETERMINATION',
    subtitle: 'Game Over · Solo Felt Piano & Strings',
    bpm: 74,
    length: GAMEOVER_LEAD.length,
    lead: GAMEOVER_LEAD,
    bass: OVERWORLD_BASS,
    pad: TITLE_PAD,
    leadInst: 'piano',
    bassInst: 'electricbass',
    padInst: 'strings',
    leadHold: 2.2,
    drums: null
  }
};
TRACKS.ending = TRACKS.victory;

export const TRACK_CATALOG = [
  'title',
  'overworld',
  'echo_sanctum',
  'phase1',
  'phase2',
  'phase3',
  'phase4',
  'phase5',
  'victory',
  'gameover'
].map((id) => ({
  id,
  title: TRACKS[id].title,
  subtitle: TRACKS[id].subtitle,
  bpm: TRACKS[id].bpm,
  leadInst: TRACKS[id].leadInst
}));

export const audio = new SoundEngine();
