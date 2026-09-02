export class AudioSys {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.startEngine();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.03);
    }
  }

  private startEngine() {
    if (!this.ctx || !this.master || this.engine) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 42;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    osc.start();
    this.engine = osc;
    this.engineGain = g;
    this.engineFilter = filter;

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const ng = this.ctx.createGain();
    ng.gain.value = 0;
    const nf = this.ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 900;
    src.connect(nf);
    nf.connect(ng);
    ng.connect(this.master);
    src.start();
    this.noise = src;
    this.noiseGain = ng;
  }

  engineTo(speed: number, nitro: boolean, racing: boolean) {
    if (!this.ctx || !this.engine || !this.engineGain || !this.engineFilter) return;
    const t = this.ctx.currentTime;
    const on = racing && speed > 2;
    const freq = 38 + speed * 1.15 + (nitro ? 40 : 0);
    this.engine.frequency.setTargetAtTime(freq, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(380 + speed * 4 + (nitro ? 500 : 0), t, 0.05);
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + Math.min(0.12, speed / 1400) : 0, t, 0.08);
    this.noiseGain?.gain.setTargetAtTime(on ? 0.015 + speed / 8000 : 0, t, 0.08);
  }

  beep(freq: number, dur = 0.12, type: OscillatorType = "square", vol = 0.12) {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  countdown(n: number) {
    if (n <= 0) this.beep(880, 0.28, "square", 0.16);
    else this.beep(440, 0.16, "square", 0.12);
  }

  bump() {
    this.beep(90, 0.1, "triangle", 0.18);
  }

  land() {
    this.beep(70, 0.14, "sine", 0.14);
  }

  pickup() {
    this.beep(720, 0.08, "square", 0.1);
    setTimeout(() => this.beep(980, 0.1, "square", 0.1), 60);
  }

  nitro() {
    if (!this.ctx || !this.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.35);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.42);
  }

  finish(win: boolean) {
    if (win) {
      this.beep(523, 0.14);
      setTimeout(() => this.beep(659, 0.14), 120);
      setTimeout(() => this.beep(784, 0.28), 240);
    } else {
      this.beep(200, 0.3, "triangle", 0.1);
    }
  }
}
