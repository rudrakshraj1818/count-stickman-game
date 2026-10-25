export class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  isMusicPlaying = false;
  musicNodes: (AudioScheduledSourceNode)[] = [];
  musicTimeout: ReturnType<typeof setTimeout> | null = null;
  initialized = false;

  init() {
    if (this.initialized) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.initialized = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startMusic() {
    if (!this.initialized) this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.playMusicLoop();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    this.musicNodes.forEach(node => {
      try { node.stop(); } catch {}
    });
    this.musicNodes = [];
  }

  playMusicLoop() {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

    const now = this.ctx.currentTime;
    const bpm = 128;
    const beatDuration = 60 / bpm;

    // Bass line pattern
    const bassNotes = [110, 110, 146.83, 130.81, 110, 110, 146.83, 164.81];
    bassNotes.forEach((freq, i) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * beatDuration);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.8) * beatDuration);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now + i * beatDuration);
      osc.stop(now + (i + 1) * beatDuration);
      this.musicNodes.push(osc);
    });

    // Kick drum on every beat
    for (let i = 0; i < 8; i++) {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now + i * beatDuration);
      osc.frequency.exponentialRampToValueAtTime(30, now + i * beatDuration + 0.1);
      gain.gain.setValueAtTime(0.8, now + i * beatDuration);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * beatDuration + 0.15);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now + i * beatDuration);
      osc.stop(now + i * beatDuration + 0.2);
      this.musicNodes.push(osc);
    }

    // Hi-hat on offbeats
    for (let i = 0; i < 16; i++) {
      if (!this.ctx || !this.musicGain) return;
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (data.length * 0.2));
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = i % 2 === 0 ? 0.1 : 0.2;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      source.start(now + i * beatDuration * 0.5);
      this.musicNodes.push(source);
    }

    // Melody arpeggios
    const melodyNotes = [329.63, 392, 440, 523.25, 440, 392, 349.23, 329.63];
    melodyNotes.forEach((freq, i) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * beatDuration);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 0.6) * beatDuration);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now + i * beatDuration);
      osc.stop(now + (i + 0.7) * beatDuration);
      this.musicNodes.push(osc);
    });

    // Schedule next loop
    const loopDuration = 8 * beatDuration;
    this.musicTimeout = setTimeout(() => {
      this.musicNodes = [];
      this.playMusicLoop();
    }, loopDuration * 1000 - 50);
  }

  playGateGood() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  }

  playGateBad() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playHit() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);

    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.3;
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  playFightHit() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150 + Math.random() * 100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playWin() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.setValueAtTime(0.3, now + i * 0.15 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.5);
    });

    for (let i = 0; i < 8; i++) {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1000 + Math.random() * 2000;
      gain.gain.setValueAtTime(0.05, now + 0.6 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + 0.6 + i * 0.05);
      osc.stop(now + 0.6 + i * 0.05 + 0.25);
    }
  }

  playLose() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [392, 349.23, 293.66, 261.63];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.5);
    });
  }

  playCountUp() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800 + Math.random() * 400;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playBossAppear() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.5);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.setValueAtTime(0.4, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 55;
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.1);
    osc2.stop(now + 1);
  }

  playClick() {
    if (!this.initialized || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}
