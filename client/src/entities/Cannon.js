/**
 * Cannon.js
 * Hệ thống 4 nòng pháo cho 4 ghế người chơi (4 Player Slots).
 * Hỗ trợ xoay nòng mượt mà, đổi cấp độ đạn, nòng đôi/nòng ba,
 * hiệu ứng giật lùi (recoil), tự động bắn (Auto-Fire), khóa mục tiêu (Lock-on),
 * và trí tuệ nhân tạo (AI Bot) khi chơi 1 mình.
 */
import { Bullet } from './Bullet.js';

export const BET_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 75, 100, 200, 500, 1000];

export const SLOT_CONFIGS = [
  { id: 0, name: 'Người Chơi 1', color: '#00e5ff', posRatio: { x: 0.15, y: 1.0 }, defaultAngle: -Math.PI / 2 },
  { id: 1, name: 'Người Chơi 2', color: '#ff9100', posRatio: { x: 0.85, y: 1.0 }, defaultAngle: -Math.PI / 2 },
  { id: 2, name: 'Người Chơi 3', color: '#e040fb', posRatio: { x: 0.15, y: 0.0 }, defaultAngle: Math.PI / 2 },
  { id: 3, name: 'Người Chơi 4', color: '#76ff03', posRatio: { x: 0.85, y: 0.0 }, defaultAngle: Math.PI / 2 },
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

    this.coins = 200;               // Khởi đầu 200 xu (thử thách, bắn có chiến thuật, hết xu giải đố nhận thêm)
    this.betIndex = 2;              // Mức cược ban đầu = 3 xu (trong dải cược 1, 2, 3, 4, 5, 6...)
    this.bet = BET_STEPS[this.betIndex];

    this.energy = 0;                // Năng lượng tích nộ Buzz Bom (0 -> 100%)
    this.specialWeapon = null;      // Loại đạn đặc biệt: 'LASER' | 'FROST' | 'CLUSTER'
    this.specialAmmo = 0;           // Số lượng đạn đặc biệt còn lại

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
    const isNarrow = width < 850;
    let ratioX = this.config.posRatio.x;
    // Trên màn hình hẹp/di động: đẩy pháo ra gần 2 mép hơn để luôn giữ khoảng trống rộng rãi ở giữa
    if (isNarrow) {
      if (this.slotId === 0 || this.slotId === 2) ratioX = 0.13;
      if (this.slotId === 1 || this.slotId === 3) ratioX = 0.87;
    }
    this.x = width * ratioX;
    this.y = height * this.config.posRatio.y;
    // Tỉ lệ scale pháo theo kích thước màn hình
    this.scale = Math.min(1.0, Math.max(0.68, width / 1100));
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

  addEnergy(amount) {
    const prev = this.energy;
    this.energy = Math.min(100, Math.max(0, this.energy + amount));
    if (this.energy >= 100 && prev < 100 && this.isLocal) {
      this.game.audio.playEnergyFull();
      this.game.particles.addFloatingText(this.x, this.y - 50, '⚡ NĂNG LƯỢNG 100%! BUZZ BOM ĐÃ SẴN SÀNG! ⚡', '#ffd700', 22);
    }
    if (this.game.ui) this.game.ui.updateHUD();
  }

  setSpecialWeapon(weaponType, ammoCount) {
    this.specialWeapon = weaponType;
    this.specialAmmo = ammoCount;
    this.game.audio.playPowerupCollect();
    const names = { LASER: 'ĐẠN LASER', FROST: 'ĐẠN BĂNG', CLUSTER: 'ĐẠN CHÙM' };
    this.game.particles.addFloatingText(this.x, this.y - 45, `📦 ${names[weaponType] || weaponType} x${ammoCount}!`, '#00e5ff', 22);
    if (this.game.ui) this.game.ui.updateHUD();
  }

  canShoot() {
    return this.isOccupied && this.coins >= this.bet && this.shootCooldown <= 0;
  }

  shoot() {
    if (!this.canShoot()) {
      if (this.coins < this.bet && this.isLocal) {
        this.game.particles.addFloatingText(this.x, this.y - 40, 'HẾT XU! GIẢI ĐỐ NHẬN XU MIỄN PHÍ', '#ff1744', 20);
        if (this.game.ui) {
          this.game.ui.openQuizModal();
        }
      }
      return null;
    }

    this.coins -= this.bet;
    this.shootCooldown = this.fireRateMs;
    this.recoil = 12; // Giật nòng 12px

    // Tích thêm 0.25% năng lượng cho mỗi phát bắn (tích lũy chậm rãi, cân bằng)
    this.addEnergy(0.25);

    // Tính toán đạn đặc biệt nếu đang sở hữu
    const activeSpecial = this.specialWeapon;
    if (this.specialWeapon) {
      this.specialAmmo--;
      if (this.specialAmmo <= 0) {
        this.specialWeapon = null;
      }
    }

    // Cập nhật số xu & năng lượng hiển thị ngay lập tức
    if (this.game.ui) {
      this.game.ui.updateHUD();
    }

    // Tính tọa độ đầu nòng súng
    const barrelLength = 48;
    const baseTipX = this.x + Math.cos(this.angle) * barrelLength;
    const baseTipY = this.y + Math.sin(this.angle) * barrelLength;

    const bullets = [];
    const perpAngle = this.angle + Math.PI / 2; // Góc vuông để lệch 2 bên

    if (activeSpecial === 'DOUBLE') {
      // 2 viên đạn bắn song song cùng lúc lệch 8px
      const offset = 8;
      const b1 = new Bullet(
        `bullet_${this.slotId}_${Date.now()}_1`,
        this.slotId,
        baseTipX + Math.cos(perpAngle) * offset,
        baseTipY + Math.sin(perpAngle) * offset,
        this.angle,
        this.bet,
        this.color,
        activeSpecial
      );
      const b2 = new Bullet(
        `bullet_${this.slotId}_${Date.now()}_2`,
        this.slotId,
        baseTipX - Math.cos(perpAngle) * offset,
        baseTipY - Math.sin(perpAngle) * offset,
        this.angle,
        this.bet,
        this.color,
        activeSpecial
      );
      bullets.push(b1, b2);
    } else if (activeSpecial === 'TRIPLE') {
      // 3 viên đạn bắn tỏa quạt hình quạt (-13 độ, 0 độ, +13 độ)
      const spreadAngles = [-0.22, 0, 0.22];
      spreadAngles.forEach((angOffset, idx) => {
        bullets.push(
          new Bullet(
            `bullet_${this.slotId}_${Date.now()}_${idx}`,
            this.slotId,
            baseTipX,
            baseTipY,
            this.angle + angOffset,
            this.bet,
            this.color,
            activeSpecial
          )
        );
      });
    } else if (activeSpecial === 'MISSILE') {
      // 1 Tên lửa tầm nhiệt tự khóa mục tiêu gần nhất
      const bullet = new Bullet(
        `bullet_${this.slotId}_${Date.now()}_m`,
        this.slotId,
        baseTipX,
        baseTipY,
        this.angle,
        this.bet,
        this.color,
        activeSpecial,
        this.lockedTarget || this.botTarget
      );
      bullets.push(bullet);
    } else {
      // LASER, CLUSTER, FROST hoặc đạn thường chuẩn
      const bullet = new Bullet(
        `bullet_${this.slotId}_${Date.now()}_${Math.random()}`,
        this.slotId,
        baseTipX,
        baseTipY,
        this.angle,
        this.bet,
        this.color,
        activeSpecial
      );
      bullets.push(bullet);
    }

    // Âm thanh và tia lửa đầu nòng
    if (activeSpecial === 'LASER') {
      this.game.audio.playLaserBeam();
    } else {
      this.game.audio.playShoot(this.betIndex + 1);
    }
    this.game.particles.addSparks(baseTipX, baseTipY, bullets[0].color, 8);

    // Gửi gói tin qua mạng nếu là Multiplayer
    if (this.isLocal && this.game.network && this.game.network.isMultiplayer) {
      this.game.network.broadcast({
        type: 'PLAYER_SHOOT',
        slotId: this.slotId,
        x: baseTipX,
        y: baseTipY,
        angle: this.angle,
        bet: this.bet,
        special: activeSpecial,
      });
    }

    return bullets;
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
          if (this.coins < this.bet) this.coins += 200; // Bot tự nạp 200 xu khi cạn
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

    const s = this.scale || 1.0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);

    // 1. Mâm pháo kim loại tròn (Cannon Base)
    ctx.fillStyle = '#263238';
    ctx.shadowColor = this.energy >= 100 ? '#ffd700' : this.color;
    ctx.shadowBlur = this.energy >= 100 ? 20 : 10;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // Vành đèn LED phát sáng (nhấp nháy vàng rực khi đầy 100% nộ)
    ctx.strokeStyle = this.energy >= 100 ? '#ffd700' : this.color;
    ctx.lineWidth = this.energy >= 100 ? 4 : 3;
    ctx.stroke();

    // 2. Nòng súng quay theo góc (Rotating Barrel with Recoil)
    ctx.rotate(this.angle);

    const isDouble = this.specialWeapon === 'DOUBLE' || (this.bet >= 100 && this.bet < 500);
    const isTriple = this.specialWeapon === 'TRIPLE' || this.bet >= 500;
    const isMissile = this.specialWeapon === 'MISSILE';
    const barrelL = 44 - this.recoil;

    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = this.specialWeapon ? '#ffd700' : this.color;
    ctx.lineWidth = 2;

    if (isMissile) {
      // Hộp phóng tên lửa chiến hạm hầm hố
      ctx.fillStyle = '#37474f';
      ctx.fillRect(-this.recoil, -12, barrelL + 6, 24);
      ctx.strokeRect(-this.recoil, -12, barrelL + 6, 24);
      // Nòng tên lửa đỏ
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(barrelL + 2 - this.recoil, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (isTriple) {
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
    ctx.fillStyle = this.specialWeapon ? '#ffd700' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Khung hiển thị thông tin người chơi (HUD Card)
    this.renderSlotHUD(ctx);
  }

  renderEmptySlot(ctx) {
    const s = this.scale || 1.0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);

    // Vành tròn nét đứt mời gọi thêm Bot
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();

    // Nền mờ bấm được
    ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    // Dấu + và nhãn THÊM BOT
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, -8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('THÊM BOT', 0, 10);
    ctx.restore();
  }

  renderSlotHUD(ctx) {
    const s = this.scale || 1.0;
    const isBottom = this.slotId === 0 || this.slotId === 1;
    const hudY = isBottom ? this.y - (65 * s) : this.y + (45 * s);

    ctx.save();
    ctx.translate(this.x, hudY);
    ctx.scale(s, s);

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
    ctx.fillText(`💰 ${this.coins.toLocaleString('vi-VN')} Xu`, 0, 10);

    // Mini thanh năng lượng Buzz Bom
    const energyW = 130;
    const energyH = 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(-energyW / 2, 16, energyW, energyH);
    ctx.fillStyle = this.energy >= 100 ? '#ffd700' : '#00e5ff';
    ctx.fillRect(-energyW / 2, 16, (energyW * (this.energy / 100)), energyH);

    // Mức cược đạn hiện tại hoặc hiển thị đạn đặc biệt
    ctx.fillStyle = this.specialWeapon ? '#00e5ff' : this.color;
    ctx.font = 'bold 10px sans-serif';
    const weaponText = this.specialWeapon ? `📦 ${this.specialWeapon} x${this.specialAmmo}` : `Đạn: ${this.bet} xu`;
    ctx.fillText(weaponText, 0, isBottom ? -26 : 28);

    // Gợi ý bấm để tắt nếu là máy Bot
    if (this.isBot) {
      ctx.fillStyle = '#ffb74d';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('(Bấm để tắt Bot)', 0, isBottom ? 26 : -24);
    }

    ctx.restore();
  }
}
