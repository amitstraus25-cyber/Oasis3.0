let audioContext: AudioContext | null = null;

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
