// All sound is synthesized with WebAudio — no audio files, no network.
// A tiny helper builds short oscillator blips; the game layers them
// into pickup chimes, alarm warnings, a caught sting and a win fanfare.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let alarmOsc = null;
  let alarmGain = null;

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (muted) return;
    const ac = context();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  return {
    unlock() {
      context();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopAlarmLoop();
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.16);
      tone(1318, 0.12, 'sine', 0.14, 0.07);
    },
    safeCracked() {
      tone(523, 0.1, 'square', 0.1);
      tone(659, 0.1, 'square', 0.1, 0.09);
      tone(784, 0.18, 'square', 0.12, 0.18);
    },
    tool() {
      tone(440, 0.12, 'sawtooth', 0.08, 0, 880);
    },
    denied() {
      tone(180, 0.15, 'square', 0.1);
    },
    spotted() {
      tone(980, 0.1, 'square', 0.12);
      tone(980, 0.1, 'square', 0.12, 0.13);
    },
    caught() {
      this.stopAlarmLoop();
      tone(220, 0.5, 'sawtooth', 0.18, 0, 55);
      tone(110, 0.7, 'square', 0.12, 0.1, 40);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.12));
      tone(1318, 0.4, 'triangle', 0.14, 0.5);
    },
    levelClear() {
      [659, 784, 988].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.1));
    },
    // A low two-tone siren while the alarm meter is critical.
    startAlarmLoop() {
      if (muted || alarmOsc) return;
      const ac = context();
      if (!ac) return;
      alarmOsc = ac.createOscillator();
      alarmGain = ac.createGain();
      alarmOsc.type = 'sine';
      alarmOsc.frequency.setValueAtTime(620, ac.currentTime);
      alarmGain.gain.setValueAtTime(0.045, ac.currentTime);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 1.6;
      const lfoGain = ac.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(alarmOsc.frequency);
      alarmOsc.connect(alarmGain).connect(ac.destination);
      alarmOsc.start();
      lfo.start();
      alarmOsc._lfo = lfo;
    },
    stopAlarmLoop() {
      if (!alarmOsc) return;
      try {
        alarmOsc._lfo && alarmOsc._lfo.stop();
        alarmOsc.stop();
      } catch (e) {}
      alarmOsc = null;
      alarmGain = null;
    },
  };
}
