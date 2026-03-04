export function createAmbientBgmStarter() {
  let started = false;
  return function startAmbientBgm() {
    if (started) return;
    started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ac = new AC();
    ac.resume?.();
    const master = ac.createGain();
    master.gain.value = 0.14;
    master.connect(ac.destination);

    const notes = [220.0, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94];
    const bass = [110.0, 123.47, 130.81, 146.83];
    let step = 0;

    const tick = () => {
      const t = ac.currentTime;

      const pad = ac.createOscillator();
      const padGain = ac.createGain();
      pad.type = 'triangle';
      pad.frequency.value = notes[step % notes.length];
      padGain.gain.setValueAtTime(0.0001, t);
      padGain.gain.exponentialRampToValueAtTime(0.04, t + 0.12);
      padGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      pad.connect(padGain).connect(master);
      pad.start(t);
      pad.stop(t + 1.0);

      if (step % 2 === 0) {
        const b = ac.createOscillator();
        const bGain = ac.createGain();
        b.type = 'sine';
        b.frequency.value = bass[(step / 2) % bass.length];
        bGain.gain.setValueAtTime(0.0001, t);
        bGain.gain.exponentialRampToValueAtTime(0.03, t + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        b.connect(bGain).connect(master);
        b.start(t);
        b.stop(t + 0.72);
      }

      step++;
    };

    const unlock = () => { ac.resume?.(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once:true });

    tick();
    setInterval(tick, 950);
  };
}
