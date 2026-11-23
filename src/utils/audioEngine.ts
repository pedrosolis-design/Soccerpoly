// Centralized Web Audio synthesizer for Monopolio Futbolero 412
// Supports dice ticks, token steps, signings, and stadium trophy applause/cheering

let mutedState = false;
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function isAudioMuted(): boolean {
  return mutedState;
}

export function setAudioMuted(next: boolean): void {
  mutedState = next;
}

export function playTone(
  freq: number,
  durationMs = 70,
  type: OscillatorType = 'triangle',
  volume = 0.05
): void {
  if (mutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationMs / 1000
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function playStadiumCelebration(tier: 'copa' | 'liga' | 'ucl'): void {
  if (mutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Stadium crowd roar & applause bed (bandpass-filtered noise)
    const durationSec = tier === 'ucl' ? 2.8 : 2.1;
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const crowdSource = ctx.createBufferSource();
    crowdSource.buffer = noiseBuffer;

    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.setValueAtTime(880, now);
    crowdFilter.frequency.exponentialRampToValueAtTime(1450, now + 0.5);
    crowdFilter.frequency.exponentialRampToValueAtTime(760, now + durationSec);
    crowdFilter.Q.value = 0.7;

    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.001, now);
    crowdGain.gain.linearRampToValueAtTime(0.11, now + 0.25);
    crowdGain.gain.setValueAtTime(0.09, now + durationSec * 0.55);
    crowdGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    crowdSource.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(ctx.destination);
    crowdSource.start(now);
    crowdSource.stop(now + durationSec);

    // 2. Rhythmic hand-clap applause transients
    const clapCount = tier === 'ucl' ? 22 : 15;
    for (let i = 0; i < clapCount; i++) {
      const clapTime = now + 0.08 + i * 0.095 + Math.random() * 0.04;
      const clapLen = Math.floor(ctx.sampleRate * 0.045);
      const clapBuf = ctx.createBuffer(1, clapLen, ctx.sampleRate);
      const clapData = clapBuf.getChannelData(0);
      for (let j = 0; j < clapLen; j++) {
        clapData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (clapLen * 0.28));
      }

      const clapSrc = ctx.createBufferSource();
      clapSrc.buffer = clapBuf;

      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = 'bandpass';
      clapFilter.frequency.value = 1800 + Math.random() * 700;
      clapFilter.Q.value = 1.4;

      const clapGain = ctx.createGain();
      clapGain.gain.setValueAtTime(0.065, clapTime);
      clapGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.045);

      clapSrc.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(ctx.destination);
      clapSrc.start(clapTime);
    }

    // 3. Triumphant stadium fanfare chord arpeggio
    const notes =
      tier === 'ucl'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const t = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  } catch {
    // Ignore audio context restrictions
  }
}
