---
name: audio-engine
description: High-precision Web Audio API FFT analyzer with adaptive peak normalization, punchy power-curve scaling, and procedural 128 BPM synthwave generator.
---

# Web Audio API & Adaptive Beat Detection Rules

## 1. Non-Linear Frequency Extraction (Fixing Weak Bass Visuals)
Raw FFT averages look flat because audio energy is logarithmic and track mastering varies. You MUST apply an adaptive peak tracker and power curve inside `AudioEngine.ts`:

    // Inside AudioEngine.update():
    this.analyser.getByteFrequencyData(this.dataArray);

    // 1. Sub-Bass (Bins 1 to 8 - strictly 40Hz to 180Hz where the Kick lives)
    let bassSum = 0;
    for (let i = 1; i <= 8; i++) bassSum += this.dataArray[i];
    const rawBassLinear = bassSum / (8 * 255);

    // Apply power curve so quiet parts stay calm and kicks explode (0.0 -> 1.0)
    const punchyBass = Math.pow(rawBassLinear, 2.2) * 1.4;

    // Asymmetric smoothing: Instant attack (0.5), smooth decay (0.08)
    this.bass = punchyBass > this.bass 
      ? this.bass + (punchyBass - this.bass) * 0.5 
      : this.bass + (punchyBass - this.bass) * 0.08;

    // 2. Beat Peak / Kick Trigger with Cooldown (prevents flickering)
    const now = performance.now();
    if (punchyBass > 0.65 && (punchyBass - this.prevBass) > 0.15 && (now - this.lastBeatTime > 220)) {
      this.isBeat = true;
      this.beatIntensity = 1.0;
      this.lastBeatTime = now;
    } else {
      this.isBeat = false;
      this.beatIntensity *= 0.88; // Smooth decay for camera punch & flash
    }
    this.prevBass = punchyBass;

## 2. Procedural 128 BPM Cyberpunk Demo Synth
When the user clicks `"DEMO SYNTH BEAT"`, schedule a Web Audio loop (using `setInterval` every `468ms` = 128 BPM) that triggers:
- **Kick Drum:** `OscillatorNode` (sine wave) pitching down rapidly from `150Hz` to `40Hz` over `0.15s` with a `GainNode` envelope.
- **Cyber Bassline:** `OscillatorNode` (sawtooth wave) through a `BiquadFilterNode` (lowpass) playing a dark synthwave off-beat pattern.
- Connect the master demo GainNode to BOTH `this.analyser` and `this.ctx.destination` so the visualizer reacts identically to real music.