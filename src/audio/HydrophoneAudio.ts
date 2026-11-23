/**
 * Procedural Hydrophone & Deep-Ocean Acoustic Engine (Web Audio API)
 * Zero external audio files — synthesizes real-time hydrophone currents,
 * deep bowed cello/contrabass drones, hull pressure creaks, Heliox regulator
 * breathing, acoustic sonar echoes, cavitation glaive implosions, pneumatic
 * harpoon winches, and arc welder plasma crackles.
 */
export class HydrophoneAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private currentNoiseGain: GainNode | null = null;
  private currentFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private initialized = false;
  private lastCreakTime = 0;
  private lastBreathTime = 0;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.65;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Generate 3-second brown/pink noise buffer for hydrophone water turbulence
    const sampleRate = ctx.sampleRate;
    const len = sampleRate * 3;
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      data[i] = lastOut * 2.8;
    }
    this.noiseBuffer = buf;

    // Continuous deep ocean current bed
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;

    const curFilter = ctx.createBiquadFilter();
    curFilter.type = 'lowpass';
    curFilter.frequency.value = 240;
    curFilter.Q.value = 0.9;

    const curGain = ctx.createGain();
    curGain.gain.value = 0.22;

    noiseSrc.connect(curFilter);
    curFilter.connect(curGain);
    curGain.connect(master);
    noiseSrc.start();

    this.currentFilter = curFilter;
    this.currentNoiseGain = curGain;

    // Deep bowed cello & contrabass harmonic drone
    const dFilter = ctx.createBiquadFilter();
    dFilter.type = 'lowpass';
    dFilter.frequency.value = 180;
    dFilter.Q.value = 2.2;

    const dGain = ctx.createGain();
    dGain.gain.value = 0.14;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55; // A1 contrabass

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.41; // E2 fifth harmonic

    osc1.connect(dFilter);
    osc2.connect(dFilter);
    dFilter.connect(dGain);
    dGain.connect(master);

    osc1.start();
    osc2.start();

    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;
    this.droneFilter = dFilter;
    this.initialized = true;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateAmbience(depthMeters: number, speedNorm: number, inEva: boolean): void {
    if (!this.ctx || !this.initialized) return;
    const now = this.ctx.currentTime;

    // Depth shifts cello/contrabass drone lower & darker
    const depthRatio = Math.min(1, Math.max(0, depthMeters / 11000));
    if (this.droneOsc1 && this.droneOsc2 && this.droneFilter) {
      const baseFreq = 58 - depthRatio * 24; // 58Hz -> 34Hz sub-abyssal
      this.droneOsc1.frequency.setTargetAtTime(baseFreq, now, 0.5);
      this.droneOsc2.frequency.setTargetAtTime(baseFreq * 1.498, now, 0.5);
      this.droneFilter.frequency.setTargetAtTime(220 - depthRatio * 110, now, 0.5);
    }

    // Hydrophone current rush responds to movement speed
    if (this.currentFilter && this.currentNoiseGain) {
      this.currentFilter.frequency.setTargetAtTime(160 + speedNorm * 420, now, 0.15);
      this.currentNoiseGain.gain.setTargetAtTime(0.16 + speedNorm * 0.24, now, 0.15);
    }

    // Periodic hull pressure creaks at deeper layers
    const creakInterval = Math.max(4.5, 14 - depthRatio * 9);
    if (!inEva && depthRatio > 0.12 && now - this.lastCreakTime > creakInterval) {
      this.lastCreakTime = now;
      this.playHullCreak(depthRatio);
    }

    // Regulator breathing & micro-bubbles when in Bathysphere Suit (EVA)
    if (inEva && now - this.lastBreathTime > 3.4) {
      this.lastBreathTime = now;
      this.playRegulatorBreath();
    }
  }

  public playHullCreak(intensity = 0.6): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const startF = 110 + Math.random() * 80;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 0.62, now + 1.1);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 340 + Math.random() * 180;
    bp.Q.value = 9.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09 * intensity, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.3);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.35);
  }

  public playRegulatorBreath(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(620, now);
    bp.frequency.exponentialRampToValueAtTime(980, now + 0.55);
    bp.Q.value = 3.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.075, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.95);

    // Bubble trail pops
    for (let i = 0; i < 4; i++) {
      const t = now + 0.35 + i * 0.11;
      const bOsc = this.ctx.createOscillator();
      bOsc.type = 'sine';
      const bf = 380 + Math.random() * 280;
      bOsc.frequency.setValueAtTime(bf, t);
      bOsc.frequency.exponentialRampToValueAtTime(bf * 1.9, t + 0.06);

      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.03, t);
      bg.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);

      bOsc.connect(bg);
      bg.connect(this.masterGain);
      bOsc.start(t);
      bOsc.stop(t + 0.08);
    }
  }

  public playSonarPing(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const taps = [0, 0.48, 1.05];
    const amps = [0.22, 0.08, 0.03];

    taps.forEach((delay, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180 - idx * 45, t);
      osc.frequency.exponentialRampToValueAtTime(940 - idx * 35, t + 0.55);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(amps[idx], t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.85);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }

  public playCavitationStrike(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Supersonic water crack + vacuum bubble implosion
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(220, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.32);

    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.32, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    sub.connect(sg);
    sg.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.38);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(1900, now);
    hp.frequency.exponentialRampToValueAtTime(420, now + 0.25);
    hp.Q.value = 1.4;

    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.24, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noise.connect(hp);
    hp.connect(ng);
    ng.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.28);
  }

  public playHarpoonLaunch(latched: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(latched ? 520 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(latched ? 180 : 120, now + 0.24);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);

    if (latched) {
      // Steel cable winch clank
      const clank = this.ctx.createOscillator();
      clank.type = 'square';
      clank.frequency.setValueAtTime(760, now + 0.08);
      clank.frequency.exponentialRampToValueAtTime(340, now + 0.17);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.08, now + 0.08);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      clank.connect(cg);
      cg.connect(this.masterGain);
      clank.start(now + 0.08);
      clank.stop(now + 0.2);
    }
  }

  public playArcWelder(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800, now);
    bp.Q.value = 3.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.45);
  }

  public playMechanicalSwitch(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.06);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playKrakenRoar(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(72, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 1.4);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + 1.4);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.55);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.initialized = false;
    }
  }
}
