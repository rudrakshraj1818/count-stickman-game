export class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.musicInterval = null;
        this.musicPlaying = false;
        this.musicStep = 0;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
    }

    init() {
        if (this.initialized) {
            this.resume();
            return;
        }
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
            this.resume();
        } catch (e) {
            console.warn('AudioContext initialization failed or blocked:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    startMusic() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicStep = 0;

        // Upbeat arcade runner bass & melody sequence
        const bassLine = [130.81, 130.81, 164.81, 196.00, 146.83, 146.83, 174.61, 220.00];
        const leadNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 698.46];

        const playTick = () => {
            if (!this.musicPlaying || !this.ctx) return;
            const t = this.ctx.currentTime;
            const step = this.musicStep % 8;

            // Bass note
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(bassLine[step], t);
            bassGain.gain.setValueAtTime(0.18, t);
            bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGain);
            bassOsc.start(t);
            bassOsc.stop(t + 0.2);

            // Lead note on alternate steps
            if (step % 2 === 0) {
                const leadOsc = this.ctx.createOscillator();
                const leadGain = this.ctx.createGain();
                leadOsc.type = 'sine';
                leadOsc.frequency.setValueAtTime(leadNotes[step], t);
                leadGain.gain.setValueAtTime(0.1, t);
                leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                leadOsc.connect(leadGain);
                leadGain.connect(this.musicGain);
                leadOsc.start(t);
                leadOsc.stop(t + 0.18);
            }

            this.musicStep++;
        };

        this.musicInterval = setInterval(playTick, 200);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playClick() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.06);
    }

    playGateGood() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = t + i * 0.05;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startTime);
            osc.stop(startTime + 0.13);
        });
    }

    playGateBad() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.26);
    }

    playHit() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.13);
    }

    playFightHit() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180 + Math.random() * 80, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.06);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.07);
    }

    playBossAppear() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        [110, 164.81, 220].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.linearRampToValueAtTime(freq * 0.9, t + 0.6);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.65);
        });
    }

    playWin() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const fanfare = [261.63, 392.00, 523.25, 659.25];
        fanfare.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const st = t + idx * 0.12;
            const dur = (idx === fanfare.length - 1) ? 0.45 : 0.12;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, st);
            gain.gain.setValueAtTime(0.28, st);
            gain.gain.exponentialRampToValueAtTime(0.001, st + dur);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(st);
            osc.stop(st + dur + 0.05);
        });
    }

    playLose() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const sad = [311.13, 293.66, 277.18, 261.63];
        sad.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const st = t + idx * 0.14;
            const dur = (idx === sad.length - 1) ? 0.4 : 0.13;
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, st);
            gain.gain.setValueAtTime(0.22, st);
            gain.gain.exponentialRampToValueAtTime(0.001, st + dur);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(st);
            osc.stop(st + dur + 0.05);
        });
    }

    playCountUp() {
        if (!this.initialized || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.04);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }
}
