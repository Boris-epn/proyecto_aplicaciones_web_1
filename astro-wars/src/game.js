// src/game.js
export class Game {
  constructor(canvas, sfx) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.sfx = sfx;
    this.width = 0; this.height = 0;

    // Estado de alto nivel
    this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
    this.onShowMenu = null; // callbacks opcionales
    this.onGameOver = null;

    // ---- Jugador ----
    this.x = 100; this.y = 100; this.speed = 220;
    this.vx = 0; this.vy = 0; this.heading = -Math.PI/2; this.radius = 14;
    this.lastDirX = 0; this.lastDirY = -1;

    // ---- Input ----
    this.keys = {};

    // ---- Estado general ----
    this.lastTime = 0; this.running = true;
    this.score = 0; this.lives = 3;

    // ---- Disparo ----
    this.bullets = []; this.bulletSpeed = 520;
    this.bulletCooldown = 0; this.bulletRate = 0.18;
    this.doubleShot = false; this.doubleShotTimer = 0;
    this.shield = 0;
    this.damageMultiplier = 1; this.damageTimer = 0;

    // ---- Oleadas ----
    this.asteroids = [];
    this.wave = 1; this.killsThisWave = 0; this.targetKills = 0;
    this.spawnTimer = 0; this.spawnInterval = 1.0; this.maxOnScreen = 8;
    this.spawnLocked = true;
    this.powerups = []; this.powerupTimer = 0;

    // Banner
    this.bannerTimer = 0; this.bannerDuration = 1.6; this.bannerText = "";

    this._setupInput();
    this._resize();
    addEventListener("resize", () => this._resize());
  }

  // ======= Ciclo de vida de estados =======
  startMenu(){
    this.state = 'menu';
    this._resetCore();
    if (this.onShowMenu) this.onShowMenu();
    this._ensureLoop();
  }
  startNew(){
    this._resetCore();
    this.state = 'playing';
    this._startWave(1);
    this._ensureLoop();
  }
  resume(){ if (this.state==='paused'){ this.state='playing'; } }
  togglePause(){ if (this.state==='playing') this.state='paused'; else if (this.state==='paused') this.state='playing'; }
  gameOver(){
    this.state = 'gameover';
    this.sfx?.over();
    if (this.onGameOver) this.onGameOver();
  }

  _resetCore(){
    this.score=0; this.lives=3; this.lastTime=0;
    this.x=this.width/2 || 100; this.y=Math.floor((this.height||600)*0.7);
    this.vx=0; this.vy=0; this.heading=-Math.PI/2; this.lastDirX=0; this.lastDirY=-1;
    this.bullets=[]; this.doubleShot=false; this.doubleShotTimer=0; this.shield=0;
    this.damageMultiplier=1; this.damageTimer=0;
    this.asteroids=[]; this.wave=1; this.killsThisWave=0; this.targetKills=0;
    this.spawnTimer=0; this.spawnInterval=1.0; this.maxOnScreen=8; this.spawnLocked=true;
    this.powerups=[]; this.powerupTimer=0; this.bannerTimer=0;
  }

  _ensureLoop(){
    if (this._loopStarted) return;
    this._loopStarted = true;
    const loop = (t) => {
      const dt = Math.min(0.033, (t - this.lastTime) / 1000 || 0);
      this.lastTime = t;
      if (this.state==='playing') this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ======= Sistema base =======
  _setupInput() {
    addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      // Controles de estado rápidos
      if (k === 'enter' && (this.state==='menu'||this.state==='gameover')) { this.startNew(); }
      if (k === 'p') this.togglePause();
      if (k === ' ' || k === 'space' || k === 'spacebar') e.preventDefault();
    }, { passive:false });
    addEventListener("keyup", (e) => (this.keys[e.key.toLowerCase()] = false));
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = innerWidth, cssH = innerHeight;
    this.canvas.width  = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = cssW; this.height = cssH;
    if (!this.y) this.y = Math.floor(this.height * 0.7);
  }

  // ======= Oleadas =======
  _startWave(n) {
    this.wave = n; this.killsThisWave = 0;
    this.targetKills = 8 + (n - 1) * 4;
    this.spawnInterval = Math.max(0.45, 1.0 - (n - 1) * 0.07);
    this.maxOnScreen   = Math.min(22, 8 + (n - 1) * 2);
    this.bannerText = `Oleada ${this.wave}`;
    this.bannerTimer = this.bannerDuration;
    this.spawnLocked = true; this.spawnTimer = 0;
    this.sfx?.wave();
  }
  _showNextWave() { this._startWave(this.wave + 1); }

  // ======= Update =======
  update(dt) {
    // Banner
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.spawnLocked = false;
    }

    // Movimiento
    let mx = 0, my = 0;
    if (this.keys["arrowleft"] || this.keys["a"]) mx -= 1;
    if (this.keys["arrowright"]|| this.keys["d"]) mx += 1;
    if (this.keys["arrowup"]   || this.keys["w"]) my -= 1;
    if (this.keys["arrowdown"] || this.keys["s"]) my += 1;
    if (mx && my) { const k = Math.SQRT1_2; mx *= k; my *= k; }

    this.vx = mx * this.speed; this.vy = my * this.speed;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = Math.max(this.radius, Math.min(this.width  - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.height - this.radius, this.y));

    if (mx !== 0 || my !== 0) { this.lastDirX = mx; this.lastDirY = my; }

    if (Math.hypot(this.vx, this.vy) > 1e-3) {
      const velAngle = Math.atan2(this.vy, this.vx);
      const target = velAngle + Math.PI / 2;
      this.heading = lerpAngle(this.heading, target, Math.min(1, 12 * dt));
    }

    // Disparo
    this.bulletCooldown -= dt;
    const spaceDown = this.keys[" "] || this.keys["space"] || this.keys["spacebar"];
    if (spaceDown && this.bulletCooldown <= 0) {
      this._shoot();
      this.bulletCooldown = this.bulletRate;
    }

    // Timers de poderes
    if (this.shield > 0) this.shield -= dt;
    if (this.doubleShotTimer > 0) this.doubleShotTimer -= dt; else this.doubleShot = false;
    if (this.damageTimer > 0) { this.damageTimer -= dt; if (this.damageTimer <= 0){ this.damageMultiplier=1; this.damageTimer=0; } }

    // Balas
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    this.bullets = this.bullets.filter(b => b.life > 0 && b.x>-50 && b.x<this.width+50 && b.y>-50 && b.y<this.height+50);

    // Spawner
    if (!this.spawnLocked) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval && this.asteroids.length < this.maxOnScreen) {
        this.spawnTimer = 0;
        this._spawnAsteroid();
      }
    }

    // Powerups
    this.powerupTimer += dt;
    if (!this.spawnLocked && this.powerupTimer > 10 + Math.random()*5) { this.powerupTimer = 0; this._spawnPowerup(); }
    for (const p of this.powerups) p.y += p.vy * dt;
    this.powerups = this.powerups.filter(p => p.y < this.height + 40 && !p.dead);

    // Asteroides
    for (const a of this.asteroids) {
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < a.r && a.vx < 0) a.vx *= -1;
      if (a.x > this.width - a.r && a.vx > 0) a.vx *= -1;
    }
    this.asteroids = this.asteroids.filter(a => a.y < this.height + a.r + 60 && !a.dead);

    // Colisiones bala-asteroide
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && circleHit(b.x, b.y, b.r, a.x, a.y, a.r)) {
          a.hp -= (b.dmg || 1);
          b.life = 0;
          this.sfx?.hit();
          if (a.hp <= 0) {
            a.dead = true; this.killsThisWave += 1;
            this.score += 10 + Math.floor(a.r);
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter(a => !a.dead);

    // Colisión jugador-asteroide
    for (const a of this.asteroids) {
      if (circleHit(this.x, this.y, this.radius, a.x, a.y, a.r)) {
        if (this.shield <= 0) this._onPlayerHit();
        a.dead = true;
      }
    }
    this.asteroids = this.asteroids.filter(a => !a.dead);

    // Jugador-powerup
    for (const p of this.powerups) {
      if (circleHit(this.x, this.y, this.radius, p.x, p.y, 10)) {
        this._applyPowerup(p.type);
        p.dead = true;
      }
    }
    this.powerups = this.powerups.filter(p => !p.dead);

    // Avance de oleada
    if (this.killsThisWave >= this.targetKills && this.bannerTimer <= 0) {
      this.asteroids.length = 0; this.powerups.length = 0;
      this.spawnLocked = true; this._showNextWave();
    }

    // Game over
    if (this.lives <= 0 && this.state==='playing') this.gameOver();
  }

  // ======= Render =======
  render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);

    // Fondo
    c.globalAlpha = 0.6;
    for (let i = 0; i < 80; i++) {
      const sx = (i * 73) % this.width;
      const sy = (i * 41 + (this.lastTime/20)) % this.height;
      c.fillRect(sx, sy, 1, 1);
    }
    c.globalAlpha = 1;

    // Balas
    c.fillStyle = "#9dd1ff";
    for (const b of this.bullets) { c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI*2); c.fill(); }

    // Asteroides
    c.fillStyle = "#b9b08f";
    for (const a of this.asteroids) { c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI*2); c.fill(); }

    // Powerups
    for (const p of this.powerups) {
      c.save(); c.translate(p.x, p.y);
      if (p.type === "life") c.fillStyle = "#ff3b3b"; // rojo = daño
      else if (p.type === "double") c.fillStyle = "#5cf";
      else if (p.type === "shield") c.fillStyle = "#5f5";
      c.beginPath(); c.arc(0,0,10,0,Math.PI*2); c.fill();
      c.restore();
    }

    // Jugador
    c.save();
    c.translate(this.x, this.y);
    c.rotate(this.heading);
    c.beginPath();
    c.moveTo(0, -16); c.lineTo(12, 12); c.lineTo(-12, 12); c.closePath();
    c.fillStyle = this.shield > 0 ? "#5f5" : "#e6e9f5";
    c.fill(); c.restore();

    // HUD si no estamos en menú
    if (this.state !== 'menu') {
      c.fillStyle = "#e6e9f5";
      c.font = "bold 16px system-ui, sans-serif";
      c.fillText(`Puntaje: ${this.score}`, 12, 22);
      c.fillText(`Vidas: ${this.lives}`, 12, 42);
      c.fillText(`Oleada: ${this.wave}`, 12, 62);
      c.fillText(`Eliminados: ${this.killsThisWave}/${this.targetKills}`, 12, 82);
      if (this.doubleShot) c.fillText(`Disparo doble ${Math.ceil(this.doubleShotTimer)}s`, 12, 102);
      if (this.shield>0)   c.fillText(`Escudo ${Math.ceil(this.shield)}s`, 12, 122);
      if (this.damageTimer>0) c.fillText(`Daño ×${this.damageMultiplier}  ${Math.ceil(this.damageTimer)}s`, 12, 142);
    }

    // Banner de oleada
    if (this.bannerTimer > 0) {
      const t = this.bannerTimer / this.bannerDuration;
      const alpha = t < 0.5 ? t*2 : (1 - t)*2;
      c.save();
      c.globalAlpha = Math.max(0, Math.min(1, alpha));
      c.fillStyle = "#e6e9f5";
      c.font = "bold 42px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(this.bannerText, this.width/2, this.height*0.38);
      c.restore();
    }

    if (this.state === 'paused') {
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.fillRect(0,0,this.width,this.height);
      c.fillStyle = "#e6e9f5"; c.font="bold 28px system-ui, sans-serif"; c.textAlign="center";
      c.fillText("PAUSA (P para continuar)", this.width/2, this.height/2);
      c.textAlign="start";
    }

    if (this.state === 'menu') {
      // El overlay HTML muestra el menú
    }

    if (this.state === 'gameover') {
      c.fillStyle = "rgba(0,0,0,0.55)"; c.fillRect(0, 0, this.width, this.height);
      c.fillStyle = "#e6e9f5"; c.font = "bold 28px system-ui, sans-serif"; c.textAlign = "center";
      c.fillText("GAME OVER", this.width/2, this.height/2 - 10);
      c.font = "16px system-ui, sans-serif";
      c.fillText("Enter para reiniciar", this.width/2, this.height/2 + 20); c.textAlign = "start";
    }
  }

  // ======= Gameplay helpers =======
  _shoot() {
    const mag = Math.hypot(this.lastDirX, this.lastDirY);
    if (mag < 0.01) return;
    const dirx = this.lastDirX / mag, diry = this.lastDirY / mag;
    const bx = this.x + dirx * 18,  by = this.y + diry * 18;

    const addBullet = (dx, dy) => {
      this.bullets.push({ x: bx, y: by, vx: dx * this.bulletSpeed, vy: dy * this.bulletSpeed, r: 3, life: 1.2, dmg: this.damageMultiplier });
    };

    addBullet(dirx, diry);
    this.sfx?.shoot();
    if (this.doubleShot) {
      const off = 0.16; const ca = Math.cos(off), sa = Math.sin(off);
      const dx1 = dirx * ca - diry * sa, dy1 = dirx * sa + diry * ca;
      const dx2 = dirx * ca + diry * sa, dy2 = -dirx * sa + diry * ca;
      addBullet(dx1, dy1); addBullet(dx2, dy2);
    }
  }

  _spawnAsteroid() {
    const n = this.wave, baseSpeed = 70 + n * 8;
    const r = rand(12, 28);
    const hp = Math.max(1, Math.round(r / 10 + (n - 1) * 0.6));
    const x = rand(r, this.width - r), y = rand(-200, -r - 10);
    const vy = rand(baseSpeed, baseSpeed + 70), vx = rand(-50, 50);
    this.asteroids.push({ x, y, vx, vy, r, hp, dead:false });
  }

  _spawnPowerup() {
    const types = ["life", "double", "shield"]; // 'life' = rojo = daño x2 temporal
    const type = types[Math.floor(Math.random() * types.length)];
    const x = rand(40, this.width - 40), y = -20, vy = rand(40, 80);
    this.powerups.push({ x, y, vy, type, dead:false });
  }

  _applyPowerup(type) {
    if (type === "life") {       // ROJO => daño
      this.damageMultiplier = 2; this.damageTimer = 8; this.sfx?.power();
    } else if (type === "double") {
      this.doubleShot = true; this.doubleShotTimer = 8; this.sfx?.power();
    } else if (type === "shield") {
      this.shield = 6; this.sfx?.power();
    }
  }

  _onPlayerHit() {
    if (this.shield > 0) return;
    this.lives -= 1; this.sfx?.boom();
    if (this.lives <= 0) this.gameOver();
  }
}

// ---- utilidades ----
function rand(min, max) { return Math.random() * (max - min) + min; }
function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by; return dx*dx + dy*dy <= (ar + br)*(ar + br);
}
function lerpAngle(a, b, t) { let diff = normalizeAngle(b - a); return a + diff * t; }
function normalizeAngle(a) {
  while (a > Math.PI)  a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
