/**
 * AudioEngine.ts
 * Production-Grade Singleton Web Audio API & FFT Analyzer
 * Implements non-linear frequency scaling, adaptive kick/beat detection with cooldown,
 * and a 128 BPM procedural Cyberpunk Demo Synth.
 */

import { parseStreamMetadata, ParsedTrackInfo } from './streamMetadata';

export interface AudioFrequencyData {
  bass: number;
  mid: number;
  high: number;
  isBeat: boolean;
  beatIntensity: number;
  rawLinearBass: number;
  dominantFreqHz: number;
  acousticEnergy: number;
  dataArray: Uint8Array;
  timeDomainArray: Uint8Array;
  isClimax: boolean;         // True strictly on the explosive ONSET/DROP of a musical climax (cao trào)
  climaxIntensity: number;   // 0.0 to 1.0 energy tier during the climax
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(256) as Uint8Array<ArrayBuffer>;
  public timeDomainArray: Uint8Array<ArrayBuffer> = new Uint8Array(256) as Uint8Array<ArrayBuffer>;
  public bufferLength: number = 256;

  // Smoothing and frequency band metrics
  public bass: number = 0;
  public prevBass: number = 0;
  public mid: number = 0;
  public high: number = 0;
  public dominantFreqHz: number = 120;
  public acousticEnergy: number = 0;

  // Beat peak detection
  public isBeat: boolean = false;
  public beatIntensity: number = 0;
  private lastBeatTime: number = 0;
  private bassEnergyHistory: number = 0.2;
  private prevBassCombined: number = 0;
  private peakThreshold: number = 0.25;
  private rhythmEnergyHistory: number = 0.15;
  private prevRhythmCombined: number = 0;

  // Climax / Drop Detection (Cao Trào)
  public isClimax: boolean = false;
  public climaxIntensity: number = 0;
  private longTermEnergy: number = 0.25;
  private shortTermEnergy: number = 0.25;
  private wasInClimax: boolean = true; // Lock out initial track start from false climax
  private lastClimaxTime: number = 0;
  private gracePeriodUntil: number = 0;

  // Frame-level caching
  private lastFrameTime: number = 0;
  private cachedAudioData: AudioFrequencyData = {
    bass: 0,
    mid: 0,
    high: 0,
    isBeat: false,
    beatIntensity: 0,
    rawLinearBass: 0,
    dominantFreqHz: 120,
    acousticEnergy: 0,
    dataArray: new Uint8Array(256) as Uint8Array<ArrayBuffer>,
    timeDomainArray: new Uint8Array(256) as Uint8Array<ArrayBuffer>,
    isClimax: false,
    climaxIntensity: 0,
  };

  // Real-time audio element connection
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  // Live Stream / System Audio Input (Spotify / Desktop Capture)
  public isLiveInputActive: boolean = false;
  public liveTrackMeta: ParsedTrackInfo | null = null;
  private liveStream: MediaStream | null = null;
  private liveSourceNode: MediaStreamAudioSourceNode | null = null;
  private silentSinkGain: GainNode | null = null;

  // Procedural 128 BPM Synthwave Demo
  public isDemoPlaying: boolean = false;
  private demoIntervalId: number | null = null;
  private demoMasterGain: GainNode | null = null;
  private demoStep: number = 0;

  private constructor() {
    // AudioContext will be initialized on user gesture
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initializes AudioContext and AnalyserNode
   */
  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512; // 256 frequency bins
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = 0.75;
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength) as Uint8Array<ArrayBuffer>;
      this.timeDomainArray = new Uint8Array(this.bufferLength) as Uint8Array<ArrayBuffer>;

      // Connect demo master gain to analyser & destination
      this.demoMasterGain = this.ctx.createGain();
      this.demoMasterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.demoMasterGain.connect(this.analyser);
      this.demoMasterGain.connect(this.ctx.destination);

      // Web Audio render quantum pull-pump:
      // AnalyserNode MUST be connected to ctx.destination for Chrome to pull audio buffers from live media streams!
      // We route analyser -> silentSinkGain (gain = 0.0) -> destination.
      // This forces 100% continuous FFT buffer streaming while guaranteeing ZERO audio bleed / zero echo to speakers!
      this.silentSinkGain = this.ctx.createGain();
      this.silentSinkGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.analyser.connect(this.silentSinkGain);
      this.silentSinkGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.error);
    }

    return this.ctx;
  }

  /**
   * Connect an HTMLAudioElement to Web Audio API graph
   */
  public connectAudioElement(element: HTMLAudioElement): void {
    this.initContext();
    if (!this.ctx || !this.analyser) return;

    if (this.audioElement === element && this.mediaSource) {
      return; // already connected to this element
    }

    this.audioElement = element;

    try {
      if (!this.mediaSource) {
        this.mediaSource = this.ctx.createMediaElementSource(element);
        this.mediaSource.connect(this.analyser);
        this.mediaSource.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('MediaElementSource already created or error connecting:', e);
    }

    this.resetAudioTracking();
  }

  /**
   * Resets audio transient & climax tracking
   * Sets up 1 clean punchy beat on startup arrival, while locking out climax CME during song intro
   */
  public resetAudioTracking(): void {
    const now = performance.now();
    this.lastBeatTime = now - 500;    // Ready to fire 1 clean beat when sound arrives
    this.lastClimaxTime = now;
    this.wasInClimax = true;          // Lock out climax CME during first ~8 seconds of song intro
    this.longTermEnergy = 0.25;
    this.shortTermEnergy = 0.25;
    this.bassEnergyHistory = 0.20;
    this.peakThreshold = 0.20;
    this.prevBassCombined = 0;
    this.rhythmEnergyHistory = 0.15;
    this.prevRhythmCombined = 0;
    this.isClimax = false;
    this.isBeat = false;
    this.beatIntensity = 0;
  }

  /**
   * Update FFT analysis on each frame (Called inside requestAnimationFrame / useFrame)
   */
  public update(): AudioFrequencyData {
    const now = performance.now();
    if (now - this.lastFrameTime < 10) {
      return this.cachedAudioData;
    }
    this.lastFrameTime = now;

    if (!this.analyser) {
      return this.cachedAudioData;
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.timeDomainArray);

    // Compute dominant frequency and acoustic energy
    let maxBinVal = 0;
    let peakBin = 2;
    let energySum = 0;
    for (let i = 1; i < this.bufferLength; i++) {
      const val = this.dataArray[i];
      energySum += val;
      if (val > maxBinVal) {
        maxBinVal = val;
        peakBin = i;
      }
    }
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    this.dominantFreqHz = Math.round(peakBin * (sampleRate / 512));
    this.acousticEnergy = Math.min(1.0, (energySum / (this.bufferLength * 255)) * 1.6);

    // 1. Sub-Bass & Kick Core (Bins 1 to 6: ~40Hz to 560Hz across 44.1k/48k where Kick punch lives)
    let bassSum = 0;
    let maxSubBass = 0;
    for (let i = 1; i <= 6; i++) {
      const val = this.dataArray[i];
      bassSum += val;
      if (val > maxSubBass) maxSubBass = val;
    }
    const avgSubBass = bassSum / (6 * 255);
    const peakSubBass = maxSubBass / 255;
    // Balanced combination: peak captures transient kick attacks, avg captures bass body
    const rawBassCombined = peakSubBass * 0.55 + avgSubBass * 0.45;

    // Punchy bass calculation (clean dynamic range 0.0 to 1.5)
    const punchyBass = Math.min(1.5, Math.pow(rawBassCombined, 1.20) * 1.85);

    // Asymmetric smoothing: Instant attack (0.65), smooth decay (0.09)
    this.bass = punchyBass > this.bass
      ? this.bass + (punchyBass - this.bass) * 0.65
      : this.bass + (punchyBass - this.bass) * 0.09;

    // 2. Dual-Tier Adaptive Transient Flux Beat Detection (Heavy Kicks + Light Beats / Snares)
    // Computes broad rhythmic percussion energy (Bins 4 to 20: ~250Hz - 1.8kHz: snare body, toms, claps, light kicks)
    let rhythmSum = 0;
    for (let i = 4; i <= 20; i++) {
      rhythmSum += this.dataArray[i];
    }
    const rawRhythm = rhythmSum / ((20 - 4 + 1) * 255);
    const rawRhythmCombined = rawBassCombined * 0.60 + rawRhythm * 0.40;

    const timeSinceLastBeat = now - this.lastBeatTime;
    const minBeatInterval = 140; // 140ms refractory allows up to 210 BPM 1/8th note rhythms

    // Tier 1: Major Bass Kick / 808
    const bassTransient = rawBassCombined - this.bassEnergyHistory;
    const isBassRising = (rawBassCombined - this.prevBassCombined) > 0.012;
    const isMajorKick = isBassRising &&
                        (bassTransient > Math.max(0.014, this.bassEnergyHistory * 0.035)) &&
                        (rawBassCombined > this.peakThreshold) &&
                        (timeSinceLastBeat > minBeatInterval);

    // Tier 2: Light Beat / Snare / Groove Tap
    const rhythmTransient = rawRhythmCombined - this.rhythmEnergyHistory;
    const isRhythmRising = (rawRhythmCombined - this.prevRhythmCombined) > 0.007;
    const isLightBeat = !isMajorKick &&
                        isRhythmRising &&
                        (rhythmTransient > Math.max(0.007, this.rhythmEnergyHistory * 0.022)) &&
                        (rawRhythmCombined > this.rhythmEnergyHistory * 1.08) &&
                        (timeSinceLastBeat > minBeatInterval);

    if (isMajorKick) {
      this.isBeat = true;
      this.beatIntensity = 1.0;
      this.lastBeatTime = now;
      this.peakThreshold = Math.max(0.20, rawBassCombined * 0.86);
    } else if (isLightBeat) {
      this.isBeat = true;
      // Proportional strength for light beats: calibrated to [0.48 .. 0.75]
      const relativePulse = (rhythmTransient / Math.max(0.015, this.rhythmEnergyHistory * 0.20));
      const lightStrength = Math.min(0.75, Math.max(0.48, 0.48 + relativePulse * 0.25));
      this.beatIntensity = Math.max(this.beatIntensity * 0.5, lightStrength);
      this.lastBeatTime = now;
      this.peakThreshold = Math.max(this.bassEnergyHistory + 0.02, this.peakThreshold * 0.95);
    } else {
      this.isBeat = false;
      this.beatIntensity *= 0.88; // Smooth natural decay
      this.peakThreshold = Math.max(this.bassEnergyHistory + 0.015, this.peakThreshold * 0.975);
    }

    // Adapt baselines once per frame (smooth ~1.5s window)
    this.bassEnergyHistory = this.bassEnergyHistory * 0.965 + rawBassCombined * 0.035;
    this.rhythmEnergyHistory = this.rhythmEnergyHistory * 0.960 + rawRhythmCombined * 0.040;
    this.prevBassCombined = rawBassCombined;
    this.prevRhythmCombined = rawRhythmCombined;
    this.prevBass = punchyBass;

    // 3. Mid frequency (Bins 7 to 64: ~600Hz - 6kHz: vocals, acoustic guitar, piano, snare snap)
    let midSum = 0;
    for (let i = 7; i <= 64; i++) {
      midSum += this.dataArray[i];
    }
    const rawMid = Math.min(1.0, (midSum / ((64 - 7 + 1) * 255)) * 1.4);
    this.mid = this.mid + (rawMid - this.mid) * 0.25;

    // 4. High frequency (Bins 65 to 180: ~6kHz - 17kHz: cymbals, hi-hats, shimmer)
    let highSum = 0;
    for (let i = 65; i <= 180; i++) {
      highSum += this.dataArray[i];
    }
    const rawHigh = highSum / ((180 - 65 + 1) * 255);
    this.high = this.high + (rawHigh - this.high) * 0.25;

    // 5. Musical Climax / Drop Detection (ĐOẠN CAO TRÀO)
    // Seamlessly adapts across EDM festival drops and K-HipHop / Melodic Rap / Pop choruses
    const currentTotalEnergy = rawBassCombined * 0.50 + this.acousticEnergy * 0.50;
    this.longTermEnergy = this.longTermEnergy * 0.997 + currentTotalEnergy * 0.003;
    this.shortTermEnergy = this.shortTermEnergy * 0.90 + currentTotalEnergy * 0.10;

    const surgeRatio = this.shortTermEnergy / Math.max(0.10, this.longTermEnergy);
    const isNowClimax = (surgeRatio > 1.14 || currentTotalEnergy > 0.75) && currentTotalEnergy > 0.42;

    // Climax onset triggers strictly at the entrance/drop of the climax
    // Protected by a 7-second lockout and 5s initial song intro grace period
    const isClimaxOnset = isNowClimax &&
                          !this.wasInClimax &&
                          (now - this.lastClimaxTime > 7000) &&
                          (now > this.gracePeriodUntil + 4000);

    if (isClimaxOnset) {
      this.isClimax = true;
      this.climaxIntensity = Math.min(1.0, currentTotalEnergy * 1.35);
      this.lastClimaxTime = now;
      this.wasInClimax = true;
    } else {
      this.isClimax = false;
      // Disarm back to verse state when energy drops below 0.42
      if (!isNowClimax && currentTotalEnergy < 0.42) {
        this.wasInClimax = false;
      }
    }

    this.cachedAudioData = {
      bass: Math.min(1.5, Math.max(0, this.bass)),
      mid: Math.min(1.0, Math.max(0, this.mid)),
      high: Math.min(1.0, Math.max(0, this.high)),
      isBeat: this.isBeat,
      beatIntensity: Math.min(1.0, Math.max(0, this.beatIntensity)),
      rawLinearBass: rawBassCombined,
      dominantFreqHz: this.dominantFreqHz,
      acousticEnergy: this.acousticEnergy,
      dataArray: this.dataArray,
      timeDomainArray: this.timeDomainArray,
      isClimax: this.isClimax,
      climaxIntensity: this.climaxIntensity,
    };

    return this.cachedAudioData;
  }

  /**
   * PROCEDURAL 128 BPM CYBERPUNK DEMO SYNTH
   * 128 BPM -> 468.75ms per quarter-note beat.
   * Generates:
   * 1. Heavy sub kick (Sine wave dropping 150Hz -> 40Hz with exponential gain decay)
   * 2. Driving Cyber Sawtooth Bassline through a lowpass filter
   * 3. Neon Synth Arp / Hi-hat accent
   */
  public startDemoSynth(): void {
    this.initContext();
    if (!this.ctx || !this.demoMasterGain) return;

    if (this.isDemoPlaying) return;
    this.isDemoPlaying = true;
    this.demoStep = 0;

    // 16th note timing: 60000 / (128 * 4) = ~117.18ms
    const stepDurationMs = 117.18;

    this.demoIntervalId = window.setInterval(() => {
      this.playDemoStep();
      this.demoStep = (this.demoStep + 1) % 16;
    }, stepDurationMs);
  }

  public stopDemoSynth(): void {
    if (this.demoIntervalId !== null) {
      clearInterval(this.demoIntervalId);
      this.demoIntervalId = null;
    }
    this.isDemoPlaying = false;
  }

  public toggleDemoSynth(): boolean {
    if (this.isDemoPlaying) {
      this.stopDemoSynth();
      return false;
    } else {
      this.startDemoSynth();
      return true;
    }
  }

  private playDemoStep(): void {
    if (!this.ctx || !this.demoMasterGain) return;
    const now = this.ctx.currentTime;

    // 1. Kick on every quarter note (steps 0, 4, 8, 12)
    if (this.demoStep % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(155, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.16);

      kickGain.gain.setValueAtTime(1.1, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      kickOsc.connect(kickGain);
      kickGain.connect(this.demoMasterGain);

      kickOsc.start(now);
      kickOsc.stop(now + 0.23);
    }

    // 2. Offbeat Cyber Sawtooth Bassline (steps 2, 6, 10, 14) and 16th-note variations
    if (this.demoStep % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassFilter = this.ctx.createBiquadFilter();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sawtooth';

      // Bass notes in D minor / Cyberpunk scale: D1 (36.7Hz), F1 (43.65Hz), G1 (49Hz), A1 (55Hz)
      const bassNotes = [36.71, 36.71, 43.65, 48.99, 36.71, 36.71, 55.0, 43.65];
      const noteIdx = Math.floor(this.demoStep / 2) % bassNotes.length;
      bassOsc.frequency.setValueAtTime(bassNotes[noteIdx], now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(450, now);
      bassFilter.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      bassFilter.Q.setValueAtTime(4.5, now);

      bassGain.gain.setValueAtTime(0.65, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.demoMasterGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.19);
    }

    // 3. Cyber Hi-hat / Metallic Arp on offbeat steps (steps 2, 6, 10, 14)
    if (this.demoStep % 4 === 2) {
      const hatOsc = this.ctx.createOscillator();
      const hatFilter = this.ctx.createBiquadFilter();
      const hatGain = this.ctx.createGain();

      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(1200 + Math.random() * 800, now);

      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(6000, now);

      hatGain.gain.setValueAtTime(0.2, now);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      hatOsc.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.demoMasterGain);

      hatOsc.start(now);
      hatOsc.stop(now + 0.06);
    }

    // 4. Occasional Cyber Lead Pluck (steps 3, 7, 11, 15)
    if (this.demoStep === 6 || this.demoStep === 14) {
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();

      leadOsc.type = 'triangle';
      leadOsc.frequency.setValueAtTime(this.demoStep === 6 ? 587.33 : 440.0, now); // D5 or A4

      leadGain.gain.setValueAtTime(0.25, now);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      leadOsc.connect(leadGain);
      leadGain.connect(this.demoMasterGain);

      leadOsc.start(now);
      leadOsc.stop(now + 0.26);
    }
  }

  /**
   * Start capturing System Audio (Spotify, YouTube, Desktop Sound)
   * Uses navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
   */
  public async startSystemAudioCapture(onEndedCallback?: () => void): Promise<boolean> {
    try {
      this.initContext();
      if (!this.ctx || !this.analyser) return false;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (this.isDemoPlaying) {
        this.stopDemoSynth();
      }

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.muted = true;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("No audio track selected! Please check 'Share system audio'.");
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Keep video tracks alive to prevent Chrome from terminating the capture session,
      // but disable rendering to eliminate GPU/CPU decode overhead
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((vt) => {
        vt.enabled = false;
      });

      // Disconnect existing live node
      if (this.liveSourceNode) {
        try {
          this.liveSourceNode.disconnect();
        } catch {
          // ignore
        }
        this.liveSourceNode = null;
      }

      // Connect original stream directly to createMediaStreamSource
      this.liveSourceNode = this.ctx.createMediaStreamSource(stream);
      this.liveSourceNode.connect(this.analyser);

      this.liveStream = stream;
      this.isLiveInputActive = true;

      // Extract window/tab title for track metadata
      const streamLabel = videoTracks[0]?.label || audioTracks[0]?.label || '';
      this.liveTrackMeta = parseStreamMetadata(streamLabel);

      const handleEnded = () => {
        this.stopLiveInput();
        if (onEndedCallback) onEndedCallback();
      };

      if (audioTracks[0]) audioTracks[0].onended = handleEnded;
      if (videoTracks[0]) videoTracks[0].onended = handleEnded;

      return true;
    } catch (err) {
      console.warn("System audio capture failed or canceled:", err);
      this.stopLiveInput();
      return false;
    }
  }

  /**
   * Fallback: Start capturing Microphone / Stereo Mix
   */
  public async startMicAudioCapture(onEndedCallback?: () => void): Promise<boolean> {
    try {
      this.initContext();
      if (!this.ctx || !this.analyser) return false;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (this.isDemoPlaying) {
        this.stopDemoSynth();
      }

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.muted = true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (this.liveSourceNode) {
        try {
          this.liveSourceNode.disconnect();
        } catch {
          // ignore
        }
        this.liveSourceNode = null;
      }

      this.liveSourceNode = this.ctx.createMediaStreamSource(stream);
      this.liveSourceNode.connect(this.analyser);

      this.liveStream = stream;
      this.isLiveInputActive = true;
      this.liveTrackMeta = { title: 'MICROPHONE / STEREO MIX', artist: 'LOCAL AUDIO INPUT' };

      stream.getAudioTracks()[0].onended = () => {
        this.stopLiveInput();
        if (onEndedCallback) onEndedCallback();
      };

      return true;
    } catch (err) {
      console.warn("Mic audio capture failed or canceled:", err);
      this.stopLiveInput();
      return false;
    }
  }

  /**
   * Stop live audio capture
   */
  public stopLiveInput(): void {
    if (this.liveSourceNode) {
      try {
        this.liveSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.liveSourceNode = null;
    }
    if (this.liveStream) {
      this.liveStream.getTracks().forEach((t) => t.stop());
      this.liveStream = null;
    }
    if (this.audioElement) {
      this.audioElement.muted = false;
    }
    this.isLiveInputActive = false;
    this.liveTrackMeta = null;
  }
}
