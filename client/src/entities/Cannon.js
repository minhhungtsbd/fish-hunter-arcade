/**
 * Cannon.js
 * Hệ thống 4 nòng pháo cho 4 ghế người chơi (4 Player Slots).
 * Hỗ trợ xoay nòng mượt mà, đổi cấp độ đạn, nòng đôi/nòng ba,
 * hiệu ứng giật lùi (recoil), tự động bắn (Auto-Fire), khóa mục tiêu (Lock-on),
 * và trí tuệ nhân tạo (AI Bot) khi chơi 1 mình.
 */
import { Bullet } from './Bullet.js';

export const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000];

export const SLOT_CONFIGS = [
  { id: 0, name: 'Người Chơi 1', color: '#00e5ff', posRatio: { x: 0.28, y: 1.0 }, defaultAngle: -Math.PI / 2 },
  { id: 1, name: 'Người Chơi 2', color: '#ff9100', posRatio: { x: 0.72, y: 1.0 }, defaultAngle: -Math.PI / 2 },
  { id: 2, name: 'Người Chơi 3', color: '#e040fb', posRatio: { x: 0.28, y: 0.0 }, defaultAngle: Math.PI / 2 },
  { id: 3, name: 'Người Chơi 4', color: '#76ff03', posRatio: { x: 0.72, y: 0.0 }, defaultAngle: Math.PI / 2 },
];

export class Cannon {
  constructor(slotId, gameEngine) {
    this.slotId = slotId;
    this.game = gameEngine;
    this.config = SLOT_CONFIGS[slotId];
    this.color = this.config.color;

    this.isOccupied = slotId === 0; // Slot 0 mặc định có người chơi
    this.isLocal = slotId === 0;    // Slot 0 là người dùng máy hiện tại
    this.isBot = false;             // Chế độ Bot
    this.playerName = this.config.name;

    this.coins = 10000;             // 10,000 xu ban đầu
    this.betIndex = 0;              // Mức cược ban đầu = 10 xu
    this.bet = BET_STEPS[this.betIndex];

    this.x = 0;
    this.y = 0;
    this.angle = this.config.defaultAngle;
    this.targetAngle = this.config.defaultAngle;

    this.recoil = 0;
    this.shootCooldown = 0;
    this.fireRateMs = 180;          // Tốc độ bắn: 180ms/viên

    this.autoFire = false;
    this.lockedTarget = null;       // Cá bị khóa mục tiêu (Lock-on)

    this.botTimer = 0;
    this.botTarget = null;
  }

  resize(width, height) {
    this.x = width * this.config.posRatio.x;
    this.y = height * this.config.posRatio.y;
  }

  changeBet(direction) {
    this.betIndex += direction;
    if (this.betIndex < 0) this.betIndex = BET_STEPS.length - 1;
    if (this.betIndex >= BET_STEPS.length) this.betIndex = 0;
    this.bet = BET_STEPS[this.betIndex];
  }

  setBet(newBet) {
    const idx = BET_STEPS.indexOf(newBet);
    if (idx !== -1) {
      this.betIndex = idx;
      this.bet = newBet;
    }
  }

  aimAt(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.targetAngle = Math.atan2(dy, dx);

    // Giới hạn góc bắn không quay ngược vào viền ngoài bàn
    if (this.slotId === 0 || this.slotId === 1) {
      // Nằm dưới đáy: chỉ hướng lên (-PI -> 0)
      if (this.targetAngle > -0.15 && this.targetAngle <= Math.PI / 2) this.targetAngle = -0.15;
      if (this.targetAngle < -Math.PI + 0.15 || this.targetAngle > Math.PI / 2) this.targetAngle = -Math.PI + 0.15;
    } else {
      // Nằm trên đỉnh: chỉ hướng xuống (0 -> PI)
      if (this.targetAngle < 0.15 && this.targetAngle >= -Math.PI / 2) this.targetAngle = 0.15;
      if (this.targetAngle > Math.PI - 0.15 || this.targetAngle < -Math.PI / 2) this.targetAngle = Math.PI - 0.15;
    }
  }

  canShoot() {
    return this.isOccupied && this.coins >= this.bet && this.shootCooldown <= 0;
  }

  shoot() {
    if (!this.canShoot()) {
      if (this.coins < this.bet && this.isLocal) {
        this.game.particles.addFloatingText(this.x, this.y - 40, 'HẾT XU! NHẬN THÊM XU', '#ff1744', 20);
      }
      return null;
    }

    this.coins -= this.bet;
    this.shootCooldown = this.fireRateMs;
    this.recoil = 12; // Giật nòng 12px

    // Tính tọa độ đầu nòng súng
    const barrelLength = 48;
    const tipX = this.x + Math.cos(this.angle) * barrelLength;
    const tipY = this.y + Math.sin(this.angle) * barrelLength;

    const bullet = new Bullet(
      `bullet_${this.slotId}_${Date.now()}_${Math.random()}`,
      this.slotId,
      tipX,
      tipY,
      this.angle,
      this.bet,
      this.color
    );

    // Âm thanh và tia lửa đầu nòng
    this.game.audio.playShoot(this.betIndex + 1);
    this.game.particles.addSparks(tipX, tipY, this.color, 8);

    // Gửi gói tin qua mạng nếu là Multiplayer
    if (this.isLocal && this.game.network && this.game.network.isMultiplayer) {
      this.game.network.broadcast({
        type: 'PLAYER_SHOOT',
        slotId: this.slotId,
        x: tipX,
        y: tipY,
        angle: this.angle,
        bet: this.bet,
      });
    }

    return bullet;
  }

  update(dt, activeFishes) {
    if (!this.isOccupied) return null;

    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (this.recoil > 0) {
      this.recoil *= 0.82;
      if (this.recoil < 0.5) this.recoil = 0;
    }

    // Góc xoay tiếp cận mượt mà
    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.22;

    // Xử lý mục tiêu bị khóa (Lock-on Target)
    if (this.lockedTarget) {
      if (this.lockedTarget.isDead || this.lockedTarget.progress >= 1.0) {
        this.lockedTarget = null;
      } else {
        this.aimAt(this.lockedTarget.x, this.lockedTarget.y);
      }
    }

    // Xử lý AI Bot tự động chơi
    if (this.isBot) {
      this.botTimer += dt;
      if (this.botTimer > 350) {
        this.botTimer = 0;
        // Tìm cá gần hoặc cá to để ngắm
        if (!this.botTarget || this.botTarget.isDead || Math.random() < 0.15) {
          const aliveFishes = activeFishes.filter(f => !f.isDead);
          if (aliveFishes.length > 0) {
            // Ưu tiên Boss hoặc cá ngẫu nhiên
            const boss = aliveFishes.find(f => f.config.isBoss || f.config.multiplier >= 20);
            this.botTarget = boss || aliveFishes[Math.floor(Math.random() * aliveFishes.length)];
          }
        }
        if (this.botTarget && !this.botTarget.isDead) {
          this.aimAt(this.botTarget.x, this.botTarget.y);
          if (this.coins < 200) this.coins += 5000; // Bot tự nạp xu khi cạn
          if (Math.random() < 0.85) {
            return this.shoot();
          }
        }
      }
    }

    // Tự động bắn nếu bật Auto-Fire (dành cho người chơi)
    if (this.isLocal && this.autoFire && this.canShoot()) {
      return this.shoot();
    }

    return null;
  }

  render(ctx) {
    if (!this.isOccupied) {
      this.renderEmptySlot(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Mâm pháo kim loại tròn (Cannon Base)
    ctx.fillStyle = '#263238';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // Vành đèn LED phát sáng
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Nòng súng quay theo góc (Rotating Barrel with Recoil)
    ctx.rotate(this.angle);

    const isDouble = this.bet >= 100 && this.bet < 500;
    const isTriple = this.bet >= 500;
    const barrelL = 44 - this.recoil;

    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;

    if (isTriple) {
      // 3 nòng pháo siêu cấp
      [-9, 0, 9].forEach(offset => {
        ctx.fillRect(-this.recoil, offset - 4, barrelL, 8);
        ctx.strokeRect(-this.recoil, offset - 4, barrelL, 8);
      });
    } else if (isDouble) {
      // 2 nòng pháo kép
      [-6, 6].forEach(offset => {
        ctx.fillRect(-this.recoil, offset - 4, barrelL, 8);
        ctx.strokeRect(-this.recoil, offset - 4, barrelL, 8);
      });
    } else {
      // 1 nòng pháo chuẩn
      ctx.fillRect(-this.recoil, -6, barrelL, 12);
      ctx.strokeRect(-this.recoil, -6, barrelL, 12);
    }

    // Lõi năng lượng giữa mâm pháo
    ctx.rotate(-this.angle); // Reset xoay để vẽ tâm
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Khung hiển thị thông tin người chơi (HUD Card)
    this.renderSlotHUD(ctx);
  }

  renderEmptySlot(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GHẾ TRỐNG', 0, 4);
    ctx.restore();
  }

  renderSlotHUD(ctx) {
    const isBottom = this.slotId === 0 || this.slotId === 1;
    const hudY = isBottom ? this.y - 68 : this.y + 48;

    ctx.save();
    ctx.translate(this.x, hudY);

    // Hộp nền HUD
    ctx.fillStyle = 'rgba(10, 25, 47, 0.85)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-75, -20, 150, 40, 8);
    ctx.fill();
    ctx.stroke();

    // Tên người chơi
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const tag = this.isLocal ? ' (Bạn)' : this.isBot ? ' [BOT]' : '';
    ctx.fillText(`${this.playerName}${tag}`, 0, -6);

    // Số xu vàng
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px "Arial Black", sans-serif';
    ctx.fillText(`💰 ${this.coins.toLocaleString('vi-VN')} Xu`, 0, 12);

    // Mức cược đạn hiện tại
    ctx.fillStyle = this.color;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`Đạn: ${this.bet} xu`, 0, isBottom ? -26 : 28);

    ctx.restore();
  }
}
