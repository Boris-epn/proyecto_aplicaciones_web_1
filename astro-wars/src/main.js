const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width = 0, height = 0;
let lastTime = 0;
let x = 20; // variable de prueba para ver animación
let speed = 120; // px/s

// 1) Resize con soporte para pantallas retina (DPR)
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // tamaño CSS
  const cssWidth  = innerWidth;
  const cssHeight = innerHeight;

  // tamaño real del buffer
  canvas.width  = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  // escalado del contexto → cada unidad será 1px “CSS”
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // guarda medidas lógicas (en px CSS)
  width = cssWidth;
  height = cssHeight;
}
addEventListener('resize', resize);
resize();

// 2) Bucle principal
function loop(t) {
  // convierte ms a s y limita dt para evitar “saltos”
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0);
  lastTime = t;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 3) Update: lógica del juego
function update(dt) {
  // animación de prueba: mover un cuadrado horizontalmente
  x += speed * dt;
  if (x > width - 40 || x < 0) {
    speed *= -1; // rebote
  }
}

// 4) Render: dibujo en el canvas
function render() {
  // limpiar
  ctx.clearRect(0, 0, width, height);

  // fondo estrellado mínimo (opcional)
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 80; i++) {
    const sx = (i * 73) % width;
    const sy = (i * 41 + (lastTime/20)) % height;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // dibujar el “player” de prueba: un triángulo
  ctx.save();
  ctx.translate(x + 20, height * 0.7);
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, 12);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fillStyle = '#e6e9f5';
  ctx.fill();
  ctx.restore();
}
