/**
 * main.js
 * Điểm khởi chạy của trò chơi Bắn Cá Ăn Xu Siêu Thị 4P.
 */
import { GameEngine } from './core/GameEngine.js';
import { NetworkManager } from './network/NetworkManager.js';
import { UIController } from './ui/UIController.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // 1. Khởi tạo Game Engine
  const game = new GameEngine(canvas);

  // 2. Khởi tạo Hệ thống Mạng Multiplayer (Local multi-tab + WebRTC Signaling)
  const network = new NetworkManager(game);

  // 3. Khởi tạo Giao diện điều khiển (UI)
  const ui = new UIController(game);

  // 4. Bắt đầu vòng lặp game
  game.start();

  console.log('🎮 [Fish Hunter 4P] Game đã khởi chạy thành công!');
});
