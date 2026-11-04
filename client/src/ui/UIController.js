/**
 * UIController.js
 * Quản lý thanh công cụ, các nút bấm điều khiển, hộp thoại trả thưởng,
 * và chia sẻ phòng chơi cho 4 người.
 */
import { FISH_CONFIGS } from '../entities/Fish.js';
import { QuizManager } from './QuizManager.js';

export class UIController {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.game.ui = this;
    this.roomCode = this.getOrGenerateRoomCode();
    this.quiz = new QuizManager(gameEngine);
    this.initDOM();
    this.bindEvents();
    this.updateHUD();
  }

  openQuizModal() {
    if (this.quiz) {
      this.quiz.open();
    }
  }

  getOrGenerateRoomCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const existing = urlParams.get('room');
    if (existing) return existing.toUpperCase();

    // Sinh mã phòng ngẫu nhiên 6 ký tự
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CA';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  initDOM() {
    // Cập nhật mã phòng lên badge
    const badge = document.getElementById('room-badge-text');
    if (badge) badge.innerText = `#PHÒNG: ${this.roomCode}`;

    // Khởi tạo bảng trả thưởng (Paytable)
    const fishGrid = document.getElementById('paytable-grid');
    if (fishGrid) {
      fishGrid.innerHTML = '';
      for (const [key, cfg] of Object.entries(FISH_CONFIGS)) {
        const item = document.createElement('div');
        item.className = 'fish-item';
        item.innerHTML = `
          <div>
            <div class="fish-name" style="color: ${cfg.color}">${cfg.name}</div>
            <div style="font-size: 10px; color: #aaa;">Máu: ${cfg.hp} đạn</div>
          </div>
          <div class="fish-reward">x${cfg.multiplier}</div>
        `;
        fishGrid.appendChild(item);
      }
    }

    // Cập nhật đường link mời
    const inviteInput = document.getElementById('invite-link-input');
    if (inviteInput) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}`;
      inviteInput.value = shareUrl;
    }
  }

  bindEvents() {
    // 1. Chỉnh mức cược đạn +/-
    const btnBetDown = document.getElementById('btn-bet-down');
    const btnBetUp = document.getElementById('btn-bet-up');
    if (btnBetDown) {
      btnBetDown.addEventListener('click', () => {
        this.game.cannons[this.game.localSlotId].changeBet(-1);
        this.updateHUD();
      });
    }
    if (btnBetUp) {
      btnBetUp.addEventListener('click', () => {
        this.game.cannons[this.game.localSlotId].changeBet(1);
        this.updateHUD();
      });
    }

    // 2. Nút Tự động bắn (Auto-Fire)
    const btnAuto = document.getElementById('btn-auto-fire');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        const cannon = this.game.cannons[this.game.localSlotId];
        cannon.autoFire = !cannon.autoFire;
        btnAuto.classList.toggle('active', cannon.autoFire);
      });
    }

    // 3. Nút Âm thanh (Sound FX)
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        this.game.audio.init();
        const isMuted = this.game.audio.toggleMute();
        btnSound.innerHTML = isMuted ? '<span class="btn-icon">🔇</span> Âm thanh: TẮT' : '<span class="btn-icon">🔊</span> Âm thanh: BẬT';
        btnSound.classList.toggle('active', !isMuted);
      });
    }

    // 4. Nút Nhạc nền (Music)
    const btnMusic = document.getElementById('btn-music');
    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        this.game.audio.init();
        const isPlaying = this.game.audio.toggleMusic();
        btnMusic.innerHTML = isPlaying ? '<span class="btn-icon">🎵</span> Nhạc nền: BẬT' : '<span class="btn-icon">🎵</span> Nhạc nền: TẮT';
        btnMusic.classList.toggle('active', isPlaying);
      });
    }

    // 5. Tùy chọn bật 0, 1, 2 hoặc 3 Bot
    const botSelect = document.getElementById('bot-count-select');
    if (botSelect) {
      // Khởi tạo mặc định số bot theo cấu hình select
      setTimeout(() => this.game.setBotCount(botSelect.value), 300);
      botSelect.addEventListener('change', (e) => {
        this.game.setBotCount(e.target.value);
      });
    }

    // 6. Nút Cứu trợ Xu (Giải đố Toán & Tiếng Anh để nhận xu)
    const btnFreeCoins = document.getElementById('btn-free-coins');
    if (btnFreeCoins) {
      btnFreeCoins.addEventListener('click', () => {
        this.openQuizModal();
      });
    }

    const btnSettingsQuiz = document.getElementById('btn-settings-quiz');
    if (btnSettingsQuiz) {
      btnSettingsQuiz.addEventListener('click', () => {
        const modalSettings = document.getElementById('modal-settings');
        if (modalSettings) modalSettings.classList.remove('open');
        this.openQuizModal();
      });
    }

    // 6.5 Mở/Đóng Bảng Cài Đặt Game Toàn Diện (Settings Modal)
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('modal-settings');
    const closeSettings = document.getElementById('close-settings');
    const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');

    if (btnOpenSettings && modalSettings) {
      btnOpenSettings.addEventListener('click', () => {
        modalSettings.classList.add('open');
      });
    }
    if (closeSettings && modalSettings) {
      closeSettings.addEventListener('click', () => {
        modalSettings.classList.remove('open');
      });
    }
    if (btnCloseSettingsModal && modalSettings) {
      btnCloseSettingsModal.addEventListener('click', () => {
        modalSettings.classList.remove('open');
      });
    }

    // 7. Mở/Đóng Bảng trả thưởng
    const btnPaytable = document.getElementById('btn-paytable');
    const modalPaytable = document.getElementById('modal-paytable');
    const closePaytable = document.getElementById('close-paytable');
    if (btnPaytable && modalPaytable) {
      btnPaytable.addEventListener('click', () => modalPaytable.classList.add('open'));
    }
    if (closePaytable && modalPaytable) {
      closePaytable.addEventListener('click', () => modalPaytable.classList.remove('open'));
    }

    // 8. Mở/Đóng Hộp thoại Mời Bạn Bè
    const btnInvite = document.getElementById('btn-invite');
    const modalInvite = document.getElementById('modal-invite');
    const closeInvite = document.getElementById('close-invite');
    const btnCopyLink = document.getElementById('btn-copy-link');

    if (btnInvite && modalInvite) {
      btnInvite.addEventListener('click', () => modalInvite.classList.add('open'));
    }
    if (closeInvite && modalInvite) {
      closeInvite.addEventListener('click', () => modalInvite.classList.remove('open'));
    }
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        const input = document.getElementById('invite-link-input');
        if (input) {
          input.select();
          navigator.clipboard.writeText(input.value);
          btnCopyLink.innerText = '✓ Đã sao chép!';
          setTimeout(() => (btnCopyLink.innerText = 'Sao chép link'), 2000);
        }
      });
    }

    // 9. Nút Toàn màn hình
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // 10. Chọn ghế (Ghế 1, 2, 3, 4) - Đồng bộ cả thanh dưới và modal cài đặt
    const seatSelect = document.getElementById('seat-select');
    const settingsSeatSelect = document.getElementById('settings-seat-select');

    const updateSeat = (slot) => {
      this.game.setLocalSlot(slot);
      if (seatSelect) seatSelect.value = slot;
      if (settingsSeatSelect) settingsSeatSelect.value = slot;
      this.updateHUD();
    };

    // Đọc query param `slot` nếu có
    const urlParams = new URLSearchParams(window.location.search);
    const slotParam = parseInt(urlParams.get('slot'), 10);
    if (!isNaN(slotParam) && slotParam >= 0 && slotParam <= 3) {
      updateSeat(slotParam);
    }

    if (seatSelect) {
      seatSelect.addEventListener('change', (e) => {
        updateSeat(parseInt(e.target.value, 10));
      });
    }
    if (settingsSeatSelect) {
      settingsSeatSelect.addEventListener('change', (e) => {
        updateSeat(parseInt(e.target.value, 10));
      });
    }

    // 11. Chọn độ khó (Dễ / Trung Bình / Khó)
    const diffSelect = document.getElementById('difficulty-select');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this.game.difficulty = e.target.value;
        const labelMap = {
          EASY: 'DỄ (Thư giãn, dễ bắt)',
          NORMAL: 'TRUNG BÌNH (Chuẩn Siêu Thị)',
          HARD: 'KHÓ (Thử thách sinh tồn)',
        };
        this.game.particles.addFloatingText(
          this.game.width / 2,
          this.game.height / 2 - 30,
          `🎮 ĐỘ KHÓ: ${labelMap[this.game.difficulty]}`,
          '#ffd700',
          22
        );
      });
    }

    // 12. Nút Bắn Nhanh dành riêng cho Mobile
    const btnMobileFire = document.getElementById('btn-mobile-fire');
    if (btnMobileFire) {
      btnMobileFire.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.game.audio.init();
        const localCannon = this.game.cannons[this.game.localSlotId];
        if (localCannon) {
          const bullet = localCannon.shoot();
          if (bullet) {
            this.game.bullets.push(bullet);
            this.updateHUD();
          }
        }
      });
    }

    // 13. Tắt thông báo xoay màn hình khi người chơi muốn chơi dọc
    const btnCloseRotate = document.getElementById('btn-close-rotate');
    const rotatePrompt = document.getElementById('rotate-prompt');
    if (btnCloseRotate && rotatePrompt) {
      btnCloseRotate.addEventListener('click', () => {
        rotatePrompt.classList.add('dismissed');
      });
    }

    // 14. Nút Kích hoạt Buzz Bom Nguyên Tử
    const btnBuzz = document.getElementById('btn-buzz-bomb');
    if (btnBuzz) {
      btnBuzz.addEventListener('click', () => {
        this.game.audio.init();
        this.game.triggerBuzzBomb();
      });
    }
  }

  updateHUD() {
    const cannon = this.game.cannons[this.game.localSlotId];
    if (!cannon) return;

    const betDisplay = document.getElementById('bet-value');
    if (betDisplay) {
      betDisplay.innerText = cannon.bet;
    }

    const coinsDisplay = document.getElementById('user-coins-display');
    if (coinsDisplay) {
      coinsDisplay.innerText = Math.max(0, Math.floor(cannon.coins)).toLocaleString('vi-VN');
    }

    // Cập nhật Thanh Năng Lượng & Nút Buzz Bom
    const energyBar = document.getElementById('energy-progress');
    const energyText = document.getElementById('energy-text');
    const btnBuzz = document.getElementById('btn-buzz-bomb');

    const pct = Math.min(100, Math.floor(cannon.energy || 0));
    if (energyBar) energyBar.style.width = `${pct}%`;
    if (energyText) energyText.innerText = `⚡ NỘ: ${pct}%`;
    if (btnBuzz) {
      btnBuzz.classList.toggle('ready', pct >= 100);
      btnBuzz.innerHTML = pct >= 100 ? '💥 BUZZ BOM!' : `⚡ NỘ: ${pct}%`;
    }

    // Cập nhật Badge Đạn Tiếp Tế Đặc Biệt
    const ammoBadge = document.getElementById('special-ammo-badge');
    const ammoText = document.getElementById('special-ammo-text');
    if (ammoBadge && ammoText) {
      if (cannon.specialWeapon && cannon.specialAmmo > 0) {
        ammoBadge.style.display = 'inline-flex';
        const icons = { LASER: '⚡', FROST: '❄️', CLUSTER: '💥' };
        ammoText.innerText = `${icons[cannon.specialWeapon] || '📦'} ${cannon.specialWeapon} x${cannon.specialAmmo}`;
      } else {
        ammoBadge.style.display = 'none';
      }
    }
  }
}
