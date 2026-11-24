import { BeatSnapshot } from './types';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface SongConfig {
  levelId: number;
  bpm: number;
  rootMidi: number;
  bassPattern: number[]; // 16 steps, -1 = rest, 0+ = semitone offset
  melodyPattern: number[]; // 16 steps
  chordPattern: number[]; // 16 steps
}

const SONGS: Record<number, SongConfig> = {
  1: {
    levelId: 1,
    bpm: 105,
    rootMidi: 48, // C3
    // Cheerful Mario-meets-Sprunki major groove
    bassPattern: [0, -1, 0, -1, 7, -1, 4, -1, 5, -1, 5, -1, 7, -1, 7, -1],
    melodyPattern: [12, -1, 16, 19, -1, 16, 12, -1, 14, -1, 17, 19, 24, -1, 19, -1],
    chordPattern: [12, -1, -1, -1, 16, -1, -1, -1, 17, -1, -1, -1, 19, -1, -1, -1],
  },
  2: {
    levelId: 2,
    bpm: 124,
    rootMidi: 42, // F#2 volcanic minor
    // Fiery volcanic magma groove
    bassPattern: [0, 0, 3, 0, 5, 6, 5, 0, 3, 3, 7, 3, 8, 7, 5, 3],
    melodyPattern: [12, 15, 18, 15, 19, 22, 19, 15, 24, 22, 19, 15, 18, 15, 12, -1],
    chordPattern: [12, -1, 15, -1, 18, -1, 15, -1, 19, -1, 22, -1, 19, -1, 15, -1],
  },
  3: {
    levelId: 3,
    bpm: 120,
    rootMidi: 45, // A2
    // Funky minor underground bass groove
    bassPattern: [0, 0, -1, 3, -1, 5, 7, -1, 0, -1, 7, -1, 10, -1, 7, 5],
    melodyPattern: [12, -1, 15, -1, 19, 17, 15, -1, 12, 15, 19, -1, 22, -1, 19, 15],
    chordPattern: [12, -1, 15, -1, -1, -1, 19, -1, 12, -1, 15, -1, -1, -1, 17, -1],
  },
  4: {
    levelId: 4,
    bpm: 132,
    rootMidi: 50, // D3
    // Energetic sky-top synthwave / chiptune beat
    bassPattern: [0, 12, 0, 12, 7, 19, 7, 19, 5, 17, 5, 17, 9, 21, 7, 19],
    melodyPattern: [24, -1, 21, 19, -1, 16, 19, 21, 24, -1, 26, 24, 21, -1, 19, -1],
    chordPattern: [12, -1, 16, -1, 19, -1, 16, -1, 17, -1, 21, -1, 19, -1, 14, -1],
  },
};

class RhythmAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private isPlaying = false;
  private currentLevelId = 1;
  private unlockedLayers = 2; // 1=drums, 2=+bass, 3=+chords, 4=+melody
  private bpm = 105;
  private startAudioTime = 0;
  private nextStepTime = 0;
  private currentStep = 0;
  private schedulerId: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.75;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.42;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.72;
      this.sfxGain.connect(this.masterGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.75,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setLayers(layers: number): void {
    this.unlockedLayers = Math.max(1, Math.min(4, layers));
  }

  public startMusic(levelId: number, bpm: number): void {
    const ctx = this.ensureContext();
    this.stopMusic();
    this.currentLevelId = levelId;
    this.bpm = bpm;
    this.isPlaying = true;
    this.currentStep = 0;

    if (!ctx) return;

    this.startAudioTime = ctx.currentTime + 0.05;
    this.nextStepTime = this.startAudioTime;

    this.schedulerId = window.setInterval(() => {
      this.scheduleAhead();
    }, 25);
  }

  public stopMusic(): void {
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  public pauseMusic(): void {
    this.stopMusic();
  }

  public getBeatSnapshot(fallbackTimeSec: number): BeatSnapshot {
    const beatDuration = 60 / this.bpm;
    let elapsed = fallbackTimeSec;
    if (this.ctx && this.isPlaying) {
      elapsed = Math.max(0, this.ctx.currentTime - this.startAudioTime);
    }
    const totalBeatsFloat = elapsed / beatDuration;
    const totalBeats = Math.floor(totalBeatsFloat);
    const beatPhase = totalBeatsFloat - totalBeats;
    const beatIndex = ((totalBeats % 4) + 4) % 4;
    const isBeatA = beatIndex === 0 || beatIndex === 1;
    const isBeatB = beatIndex === 2 || beatIndex === 3;
    const distToBeat = Math.min(beatPhase, 1 - beatPhase) * beatDuration;
    const isOnBeatWindow = distToBeat <= 0.135;
    const pulse = Math.max(0, 1 - beatPhase * 2.4);

    return {
      beatIndex,
      totalBeats,
      beatPhase,
      isBeatA,
      isBeatB,
      isOnBeatWindow,
      pulse,
    };
  }

  private scheduleAhead(): void {
    if (!this.ctx || !this.isPlaying) return;
    const stepDuration = 60 / this.bpm / 4; // 16th note
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.triggerStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  private triggerStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain) return;
    const song = SONGS[this.currentLevelId] ?? SONGS[1];

    // Layer 1: Kick, Snare & Hi-hat (always active)
    if (step % 4 === 0) {
      this.playKick(time, step === 0 ? 0.55 : 0.44);
    }
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }
    if (step % 2 === 1 || step % 4 === 2) {
      this.playHiHat(time, step % 4 === 2 ? 0.12 : 0.06);
    }

    // Layer 2: Bassline
    if (this.unlockedLayers >= 2) {
      const bassOffset = song.bassPattern[step];
      if (bassOffset >= 0) {
        this.playBass(time, midiToFreq(song.rootMidi + bassOffset));
      }
    }

    // Layer 3: Sprunki Chord Stabs
    if (this.unlockedLayers >= 3) {
      const chordOffset = song.chordPattern[step];
      if (chordOffset >= 0) {
        this.playChord(time, midiToFreq(song.rootMidi + chordOffset));
      }
    }

    // Layer 4: Lead Melody
    if (this.unlockedLayers >= 4) {
      const melOffset = song.melodyPattern[step];
      if (melOffset >= 0) {
        this.playLead(time, midiToFreq(song.rootMidi + melOffset));
      }
    }
  }

  private playKick(time: number, gainVal: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.12);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playSnare(time: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.12);
  }

  private playHiHat(time: number, vol: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playBass(time: number, freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.26, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.17);
  }

  private playChord(time: number, freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.11, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.23);
  }

  private playLead(time: number, freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.065, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  // --- Platformer SFX ---

  public sfxJump(pitchOffset = 0, onBeat = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    const base = 240 * Math.pow(2, pitchOffset / 12);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 2.15, now + 0.13);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);

    if (onBeat) {
      const chime = ctx.createOscillator();
      const cg = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(base * 3, now + 0.03);
      cg.gain.setValueAtTime(0.14, now + 0.03);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      chime.connect(cg);
      cg.connect(this.sfxGain);
      chime.start(now + 0.03);
      chime.stop(now + 0.23);
    }
  }

  public sfxNote(combo = 0, rootMidi = 60): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const midi = rootMidi + 12 + scale[combo % scale.length];
    const f1 = midiToFreq(midi);
    const f2 = midiToFreq(midi + 7);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.setValueAtTime(f2, now + 0.055);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public sfxStomp(onBeat = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(onBeat ? 360 : 260, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.14);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public sfxSpring(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.2);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public sfxBump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public sfxBreakBrick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.17);
  }

  public sfxPowerUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public sfxHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.28);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public sfxLevelClear(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5];
    const times = [0, 0.09, 0.18, 0.27, 0.42, 0.56];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + times[idx];
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }
}

export const audioEngine = new RhythmAudioEngine();
