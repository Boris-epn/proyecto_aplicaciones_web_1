export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;

    // ---- Jugador ----
    this.x = 100;
    this.y = 100;
    this.speed = 220;
    this.vx = 0;
    this.vy = 0;
    this.heading = -Math.PI / 2;
    this.radius = 14;

    // ---- Última dirección de movimiento ----
    this.lastDirX = 0;
    this.lastDirY = -1; // hacia arriba por defecto

    // ---- Input ----
    this.keys = {};

    // ---- Tiempo / estado ----
    this.lastTime = 0;
    this.running = true;

    // ---- Disparo ----
    this.bullets = [];
    this.bulletSpeed = 520;
    this.bulletCooldown = 0;
    this.bulletRate = 0.18;

    // ---- Asteroides ----
    this.asteroids = [];
    this.wave = 1;
    this.waitingNextWave = false;

    // ---- UI ----
    this.score = 0;
    this.lives = 3;

    // Eventos
    this._setupInput();
    this._resize();
    addEventListener('resize', () => this._resize());
  }

  _setupInput() {
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (!this.running && k === 'enter') this._reset();
      if (k === ' ' || k === 'space') e.preventDefault();
    }, { passive:false });

    addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
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

  start() {
    this._spawnWave(this.wave);
    const loop = (t) => {
      const dt = Math.min(0.033, (t - this.lastTime) / 1000 || 0);
      this.lastTime = t;
      if (this.running) this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------------- UPDATE ----------------
  update(dt) {
    // Movimiento
    let mx = 0, my = 0;
    if (this.keys['arrowleft'] || this.keys['a']) mx -= 1;
    if (this.keys['arrowright']|| this.keys['d']) mx += 1;
    if (this.keys['arrowup']   || this.keys['w']) my -= 1;
    if (this.keys['arrowdown'] || this.keys['s']) my += 1;
    if (mx && my) { const k = Math.SQRT1_2; mx *= k; my *= k; }

    this.vx = mx * this.speed;
    this.vy = my * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bordes
    this.x = Math.max(this.radius, Math.min(this.width  - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.height - this.radius, this.y));

    // Actualiza última dirección si se está moviendo
    if (mx !== 0 || my !== 0) {
      this.lastDirX = mx;
      this.lastDirY = my;
    }

    // Orienta la nave según dirección de movimiento
    if (Math.hypot(this.vx, this.vy) > 1e-3) {
      const velAngle = Math.atan2(this.vy, this.vx);
      const target = velAngle + Math.PI / 2;
      this.heading = lerpAngle(this.heading, target, Math.min(1, 12 * dt));
    }

    // Disparo (Espacio)
    this.bulletCooldown -= dt;
    const spaceDown = this.keys[' '] || this.keys['space'];
    if (spaceDown && this.bulletCooldown <= 0) {
      this._shoot();
      this.bulletCooldown = this.bulletRate;
    }

    // Balas
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bullets = this.bullets.filter(b =>
      b.life > 0 && b.x>-50 && b.x<this.width+50 && b.y>-50 && b.y<this.height+50
    );

    // Asteroides
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.x < a.r && a.vx < 0) a.vx *= -1;
      if (a.x > this.width - a.r && a.vx > 0) a.vx *= -1;
    }
    this.asteroids = this.asteroids.filter(a => a.y < this.height + a.r + 40 && !a.dead);

    // Colisión bala-asteroide
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && circleHit(b.x, b.y, b.r, a.x, a.y, a.r)) {
          a.hp -= 1;
          b.life = 0;
          if (a.hp <= 0) {
            a.dead = true;
            this.score += 10 + Math.floor(a.r);
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter(a => !a.dead);

    // Colisión jugador-asteroide
    for (const a of this.asteroids) {
      if (circleHit(this.x, this.y, this.radius, a.x, a.y, a.r)) {
        this._onPlayerHit();
        a.dead = true;
      }
    }
    this.asteroids = this.asteroids.filter(a => !a.dead);

    // Nueva oleada
    if (!this.waitingNextWave && this.asteroids.length === 0) {
      this.waitingNextWave = true;
      setTimeout(() => {
        this.wave += 1;
        this._spawnWave(this.wave);
        this.waitingNextWave = false;
      }, 800);
    }
  }

  // ---------------- RENDER ----------------
  render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);

    // Fondo (estrellas)
    c.globalAlpha = 0.6;
    for (let i = 0; i < 80; i++) {
      const sx = (i * 73) % this.width;
      const sy = (i * 41 + (this.lastTime/20)) % this.height;
      c.fillRect(sx, sy, 1, 1);
    }
    c.globalAlpha = 1;

    // Balas
    c.fillStyle = '#9dd1ff';
    for (const b of this.bullets) {
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, Math.PI*2);
      c.fill();
    }

    // Asteroides
    c.fillStyle = '#b9b08f';
    for (const a of this.asteroids) {
      c.beginPath();
      c.arc(a.x, a.y, a.r, 0, Math.PI*2);
      c.fill();
    }

    // Jugador
    c.save();
    c.translate(this.x, this.y);
    c.rotate(this.heading);
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(12, 12);
    c.lineTo(-12, 12);
    c.closePath();
    c.fillStyle = '#e6e9f5';
    c.fill();
    c.restore();

    // HUD
    c.fillStyle = '#e6e9f5';
    c.font = 'bold 16px system-ui, sans-serif';
    c.fillText(`Puntaje: ${this.score}`, 12, 22);
    c.fillText(`Vidas: ${this.lives}`, 12, 42);
    c.fillText(`Ola: ${this.wave}`, 12, 62);

    if (!this.running) {
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(0, 0, this.width, this.height);
      c.fillStyle = '#e6e9f5';
      c.font = 'bold 28px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('GAME OVER', this.width/2, this.height/2 - 10);
      c.font = '16px system-ui, sans-serif';
      c.fillText('Pulsa Enter para reiniciar', this.width/2, this.height/2 + 20);
      c.textAlign = 'start';
    }
  }

  // ---------------- Helpers gameplay ----------------
  _shoot() {
    // Usa la última dirección de movimiento
    const mag = Math.hypot(this.lastDirX, this.lastDirY);
    if (mag < 0.01) return; // no dispara si no hay dirección previa

    const dirx = this.lastDirX / mag;
    const diry = this.lastDirY / mag;
    const bx = this.x + dirx * 18;
    const by = this.y + diry * 18;

    this.bullets.push({
      x: bx, y: by,
      vx: dirx * this.bulletSpeed,
      vy: diry * this.bulletSpeed,
      r: 3,
      life: 1.2
    });
  }

  _spawnWave(n) {
    const count = 6 + n * 2;
    const baseSpeed = 70 + n * 8;
    for (let i = 0; i < count; i++) {
      const r = rand(12, 28);
      const hp = Math.max(1, Math.round(r / 10));
      const x = rand(r, this.width - r);
      const y = rand(-200, -r - 10);
      const vy = rand(baseSpeed, baseSpeed + 70);
      const vx = rand(-50, 50);
      this.asteroids.push({ x, y, vx, vy, r, hp, dead:false });
    }
  }

  _onPlayerHit() {
    this.lives -= 1;
    if (this.lives <= 0) this.running = false;
    else this.y = Math.min(this.height - this.radius - 10, this.y + 20);
  }

  _reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.x = this.width / 2;
    this.y = Math.floor(this.height * 0.7);
    this.bullets = [];
    this.asteroids = [];
    this.running = true;
    this._spawnWave(this.wave);
  }
}

// ---- utilidades ----
function rand(min, max) { return Math.random() * (max - min) + min; }

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  return dx*dx + dy*dy <= (ar + br) * (ar + br);
}

function lerpAngle(a, b, t) {
  let diff = normalizeAngle(b - a);
  return a + diff * t;
}
function normalizeAngle(a) {
  while (a > Math.PI)  a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
