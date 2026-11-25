// Kitchen sounds synthesised with Web Audio, so the game ships no audio files: a knife tock, a pop when
// something lands in a bowl, the service bell, a buzz for a mistake and a clock tick in the last seconds.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function unlock() {
    if (!ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      ctx = new Context();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, duration, type = 'sine', volume = 0.15, slideTo = null, delay = 0) {
    if (!ctx || muted) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function knock() {
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    source.buffer = buffer;
    source.connect(filter).connect(ctx.destination);
    source.start();
  }

  /** Plays the sound for each kitchen event of this frame. */
  function play(events) {
    for (const event of events) {
      switch (event.type) {
        case 'chop':
          knock();
          if (event.done) tone(660, 0.12, 'triangle', 0.12, 990);
          break;
        case 'grab':
        case 'ladle':
          tone(520, 0.08, 'sine', 0.1, 380);
          break;
        case 'add':
          tone(event.ready ? 880 : 600, 0.12, 'sine', 0.14, event.ready ? 1320 : 420);
          break;
        case 'boil':
          tone(180, 0.25, 'sine', 0.12, 120);
          break;
        case 'served':
          tone(1320, 0.6, 'sine', 0.18);
          tone(1760, 0.5, 'sine', 0.1, null, 0.05);
          break;
        case 'order':
          tone(990, 0.1, 'triangle', 0.08);
          tone(1240, 0.12, 'triangle', 0.08, null, 0.1);
          break;
        case 'missed':
          tone(150, 0.4, 'square', 0.08, 90);
          break;
        case 'say':
          if (event.tone === 'bad') tone(170, 0.18, 'square', 0.06, 130);
          break;
        case 'shiftOver':
          tone(784, 0.3, 'triangle', 0.14);
          tone(988, 0.3, 'triangle', 0.14, null, 0.2);
          tone(1175, 0.5, 'triangle', 0.14, null, 0.4);
          break;
        default:
          break;
      }
    }
  }

  return {
    unlock,
    play,
    tick: () => tone(2000, 0.03, 'square', 0.04),
    toggleMute: () => {
      muted = !muted;
      return muted;
    },
  };
}
