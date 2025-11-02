// src/main.js
import { Game } from './game.js';
import { SFX } from './sfx.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const muteBtn = document.getElementById('muteBtn');
const contrastBtn = document.getElementById('contrastBtn');

const prefs = {
  muted: JSON.parse(localStorage.getItem('aw_muted') || 'false'),
  contrast: JSON.parse(localStorage.getItem('aw_contrast') || 'false'),
};

if (prefs.contrast) document.body.classList.add('contrast');

const sfx = new SFX({ muted: prefs.muted });
const game = new Game(canvas, sfx);

// UI helpers
function updateMuteButton(){
  muteBtn.textContent = sfx.muted ? '🔇 Sonido: OFF' : '🔈 Sonido: ON';
  muteBtn.setAttribute('aria-pressed', sfx.muted ? 'true':'false');
}
function toggleOverlay(show){
  overlay.classList.toggle('hidden', !show);
  overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
}

updateMuteButton();
toggleOverlay(true);

startBtn.addEventListener('click', () => {
  toggleOverlay(false);
  canvas.focus();
  if (game.state === 'menu' || game.state === 'gameover') game.startNew();
  else game.resume();
});
pauseBtn.addEventListener('click', () => game.togglePause());

muteBtn.addEventListener('click', () => {
  sfx.setMuted(!sfx.muted);
  localStorage.setItem('aw_muted', JSON.stringify(sfx.muted));
  updateMuteButton();
});
contrastBtn.addEventListener('click', () => {
  document.body.classList.toggle('contrast');
  const on = document.body.classList.contains('contrast');
  contrastBtn.setAttribute('aria-pressed', on ? 'true':'false');
  localStorage.setItem('aw_contrast', JSON.stringify(on));
});

// Accesos rápidos accesibles
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'm'){ sfx.setMuted(!sfx.muted); localStorage.setItem('aw_muted', JSON.stringify(sfx.muted)); updateMuteButton(); }
  if (k === 'h'){ document.body.classList.toggle('contrast'); const on=document.body.classList.contains('contrast'); contrastBtn.setAttribute('aria-pressed', on?'true':'false'); localStorage.setItem('aw_contrast', JSON.stringify(on)); }
  if (k === 'p'){ game.togglePause(); }
  if (k === 'enter' && (game.state==='menu' || game.state==='gameover')){ toggleOverlay(false); game.startNew(); }
});

// Comienza en menú
game.onShowMenu = () => { toggleOverlay(true); };
game.onGameOver = () => { toggleOverlay(true); };
game.startMenu();
