// src/main.js
import { Game } from './game.js';

// Espera a que el DOM esté cargado antes de iniciar
window.addEventListener('DOMContentLoaded', () => {
  // Buscar el canvas (asegúrate que tenga id="game" en tu index.html)
  const canvas = document.getElementById('game');
  
  // Verificar que exista el canvas
  if (!canvas) {
    console.error('No se encontró un canvas con id="game".');
    return;
  }

  // Crear instancia del juego
  const game = new Game(canvas);

  // Iniciar el bucle del juego
  game.start();

  // Log opcional para depurar desde consola
  console.log('🚀 Astro Wars iniciado');
});
