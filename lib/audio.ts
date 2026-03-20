let audioContext: AudioContext | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicGain: GainNode | null = null;
let musicMuted = false;
let musicPlaying = false;

export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}

export function tone(frequency: number, duration: number, type: OscillatorType = 'square'): void {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.06;
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

// Hijaz / Phrygian dominant scale for authentic Middle Eastern feel
// E4, F4, G#4, A4, B4, C5, D#5, E5 with ornamental patterns
const MELODY_NOTES = [
  329.6, 349.2, 415.3, 440.0, 493.9, 523.3, 622.3, 659.3,
  622.3, 523.3, 493.9, 440.0, 415.3, 349.2, 329.6, 349.2,
  415.3, 440.0, 415.3, 349.2, 329.6, 293.7, 329.6, 349.2,
  415.3, 493.9, 440.0, 415.3, 349.2, 329.6, 349.2, 415.3,
];
const BASS_NOTES = [
  164.8, 164.8, 174.6, 174.6, 220.0, 220.0, 174.6, 164.8,
  146.8, 164.8, 174.6, 164.8,
];
// Darbuka rhythm: dum(low) tek(hi) _ tek _ dum _ tek tek _ dum tek _
const PERC_PATTERN = [1, 2, 0, 2, 0, 1, 0, 2, 2, 0, 1, 2, 0, 0, 1, 0];

let melodyIdx = 0;
let bassIdx = 0;
let percIdx = 0;

function playPercHit(type: number): void {
  if (!audioContext || !musicGain) return;
  const now = audioContext.currentTime;
  const bufSize = type === 1 ? 2400 : 1200;
  const buffer = audioContext.createBuffer(1, bufSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, type === 1 ? 8 : 15);
  }
  const src = audioContext.createBufferSource();
  src.buffer = buffer;
  const filt = audioContext.createBiquadFilter();
  filt.type = type === 1 ? 'lowpass' : 'highpass';
  filt.frequency.value = type === 1 ? 200 : 3000;
  const g = audioContext.createGain();
  g.gain.setValueAtTime(type === 1 ? 0.06 : 0.03, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + (type === 1 ? 0.12 : 0.06));
  src.connect(filt);
  filt.connect(g);
  g.connect(musicGain);
  src.start(now);
}

function playMusicNote(): void {
  if (!audioContext || !musicGain) return;
  const now = audioContext.currentTime;

  // Melody voice (sine)
  const mel = audioContext.createOscillator();
  const melG = audioContext.createGain();
  mel.type = 'sine';
  mel.frequency.value = MELODY_NOTES[melodyIdx % MELODY_NOTES.length];
  melG.gain.setValueAtTime(0.022, now);
  melG.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
  mel.connect(melG);
  melG.connect(musicGain);
  mel.start(now);
  mel.stop(now + 0.28);

  // Harmony (augmented second intervals)
  if (melodyIdx % 3 === 0) {
    const har = audioContext.createOscillator();
    const harG = audioContext.createGain();
    har.type = 'triangle';
    har.frequency.value = MELODY_NOTES[melodyIdx % MELODY_NOTES.length] * 1.26;
    harG.gain.setValueAtTime(0.010, now);
    harG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    har.connect(harG);
    harG.connect(musicGain);
    har.start(now);
    har.stop(now + 0.24);
  }

  // Bass drone
  if (melodyIdx % 2 === 0) {
    const bass = audioContext.createOscillator();
    const bassG = audioContext.createGain();
    bass.type = 'triangle';
    bass.frequency.value = BASS_NOTES[bassIdx % BASS_NOTES.length];
    bassG.gain.setValueAtTime(0.016, now);
    bassG.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    bass.connect(bassG);
    bassG.connect(musicGain);
    bass.start(now);
    bass.stop(now + 0.52);
    bassIdx++;
  }

  // Darbuka percussion
  const perc = PERC_PATTERN[percIdx % PERC_PATTERN.length];
  if (perc > 0) playPercHit(perc);
  percIdx++;

  melodyIdx++;
}

export function startMusic(): void {
  if (!audioContext || musicMuted) return;
  stopMusic();

  musicGain = audioContext.createGain();
  musicGain.gain.value = 1.0;
  musicGain.connect(audioContext.destination);

  melodyIdx = 0;
  bassIdx = 0;
  percIdx = 0;
  musicPlaying = true;
  musicInterval = setInterval(playMusicNote, 280);
}

export function stopMusic(): void {
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicGain) {
    try { musicGain.disconnect(); } catch {}
    musicGain = null;
  }
  musicPlaying = false;
}

export function toggleMusic(): boolean {
  musicMuted = !musicMuted;
  if (musicMuted) {
    stopMusic();
  } else {
    startMusic();
  }
  return musicMuted;
}

export function isMusicMuted(): boolean {
  return musicMuted;
}

export function sfxFix(): void {
  tone(523, 0.08);
  setTimeout(() => tone(784, 0.1), 100);
}

export function sfxWin(): void {
  [0, 100, 200, 300].forEach((t, i) => {
    setTimeout(() => tone(523 + i * 100, 0.15, 'sine'), t);
  });
}

export function sfxLose(): void {
  tone(200, 0.4, 'sawtooth');
}

export function sfxTeleport(): void {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  [0, 0.06, 0.12, 0.18].forEach((t, i) => {
    const osc = audioContext!.createOscillator();
    const g = audioContext!.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600 + i * 200;
    g.gain.setValueAtTime(0.05, now + t);
    g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
    osc.connect(g);
    g.connect(audioContext!.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.12);
  });
}
