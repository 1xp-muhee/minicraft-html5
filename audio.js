export function createAmbientBgmStarter() {
  let started = false;
  let ac = null;
  let timer = null;

  function installUnlock(fn) {
    const opts = { once: true, passive: true };
    const unlock = () => fn();
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('click', unlock, opts);
  }

  return function startAmbientBgm() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    if (!ac) ac = new AC();

    const startCore = async () => {
      try {
        if (ac.state !== 'running') await ac.resume();
      } catch {
        return;
      }

      if (started) return;
      started = true;

      const master = ac.createGain();
      master.gain.value = 0.22;
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
        padGain.gain.exponentialRampToValueAtTime(0.07, t + 0.12);
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
          bGain.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
          bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
          b.connect(bGain).connect(master);
          b.start(t);
          b.stop(t + 0.78);
        }

        step++;
      };

      // short audible cue to verify unlocked audio path
      const ping = ac.createOscillator();
      const pingGain = ac.createGain();
      ping.type = 'sine';
      ping.frequency.value = 660;
      pingGain.gain.setValueAtTime(0.0001, ac.currentTime);
      pingGain.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.02);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
      ping.connect(pingGain).connect(master);
      ping.start();
      ping.stop(ac.currentTime + 0.13);

      tick();
      timer = setInterval(tick, 950);
    };

    startCore();
    installUnlock(startCore);
  };
}
