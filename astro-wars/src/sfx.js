// src/sfx.js
export class SFX {
  constructor({ muted=false } = {}) {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this._muted = muted;
    this.setMuted(muted);
  }
  setMuted(m){ this._muted = !!m; this.master.gain.value = this._muted ? 0 : 0.9; }
  get muted(){ return this._muted; }

  // tono rápido utilitario
  _beep({ f=440, t=0.08, type='square', vol=0.15 }) {
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + t + 0.02);
  }
  shoot(){ this._beep({ f:880, t:0.06, type:'triangle', vol:.12 }); }
  hit(){ this._beep({ f:300, t:0.08, type:'sawtooth', vol:.18 }); }
  boom(){ this._beep({ f:120, t:0.18, type:'square', vol:.20 }); }
  power(){ this._beep({ f:520, t:0.12, type:'sine', vol:.16 }); }
  wave(){ this._beep({ f:260, t:0.14, type:'triangle', vol:.16 }); }
  over(){ this._beep({ f:90, t:0.5, type:'sine', vol:.22 }); }
}
