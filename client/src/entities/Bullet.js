/**
 * Bullet.js
 * Viên đạn pháo năng lượng. Có cơ chế "Dội viền màn hình (Bouncing Bullet)"
 * chuẩn siêu thị: đạn bắn vào cạnh mép sẽ nảy lại cho đến khi chạm vào cá!
 */
import { Net } from './Net.js';

export class Bullet {
  constructor(id, slotId, x, y, angle, bet = 10, color = '#00e5ff', specialType = null, targetFish = null) {
    this.id = id;
    this.slotId = slotId;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.bet = bet;
    this.specialType = specialType;
    this.targetFish = targetFish;

    const SPECIAL_COLORS = {
      DOUBLE: '#00e5ff',
      TRIPLE: '#ffd700',
      MISSILE: '#ff1744',
      CLUSTER: '#ff9100',
      LASER: '#76ff03',
      FROST: '#80d8ff',
    };
    this.color = SPECIAL_COLORS[specialType] || color;

    const speed = specialType === 'LASER' ? 18.0 : specialType === 'MISSILE' ? 14.0 : 12.0;
    this.speed = speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius = specialType === 'MISSILE' ? 8 : bet >= 100 ? 7 : 5;
    this.bouncesRemaining = specialType === 'MISSILE' ? 2 : 1;
    this.piercesRemaining = specialType === 'LASER' ? 4 : 0;
    this.isDead = false;
    this.trail = [];
  }

  update(dt, width, height, activeFishes = []) {
    if (this.isDead) return;

    // Cơ chế bám đuổi mục tiêu thông minh của Tên Lửa (Homing Missile)
    if (this.specialType === 'MISSILE') {
      if (!this.targetFish || this.targetFish.isDead) {
        if (activeFishes && activeFishes.length > 0) {
          let closest = null;
          let minDist = Infinity;
          for (const f of activeFishes) {
            if (!f.isDead) {
              const d = Math.hypot(f.x - this.x, f.y - this.y);
              if (d < minDist) {
                minDist = d;
                closest = f;
              }
            }
          }
          this.targetFish = closest;
        }
      }

      if (this.targetFish && !this.targetFish.isDead) {
        const targetAngle = Math.atan2(this.targetFish.y - this.y, this.targetFish.x - this.x);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += Math.max(-0.1, Math.min(0.1, diff));
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }

    // Lưu vết đuôi đạn phát sáng (Glowing Bullet Trail)
    this.trail.push({ x: this.x, y: this.y, alpha: 0.85 });
    if (this.trail.length > (this.specialType === 'MISSILE' ? 8 : 5)) this.trail.shift();
    for (const t of this.trail) t.alpha *= 0.72;

    this.x += this.vx;
    this.y += this.vy;

    // Cơ chế nảy viền màn hình
    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = -this.vx;
      this.angle = Math.atan2(this.vy, this.vx);
      this.bouncesRemaining--;
    } else if (this.x + this.radius >= width) {
      this.x = width - this.radius;
      this.vx = -this.vx;
      this.angle = Math.atan2(this.vy, this.vx);
      this.bouncesRemaining--;
    }

    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = -this.vy;
      this.angle = Math.atan2(this.vy, this.vx);
      this.bouncesRemaining--;
    } else if (this.y + this.radius >= height) {
      this.y = height - this.radius;
      this.vy = -this.vy;
      this.angle = Math.atan2(this.vy, this.vx);
      this.bouncesRemaining--;
    }

    if (this.bouncesRemaining < 0) {
      this.isDead = true;
    }
  }

  // Tạo lưới khi chạm vào cá hoặc hộp đạn
  explode() {
    if (this.piercesRemaining > 0) {
      this.piercesRemaining--;
    } else {
      this.isDead = true;
    }

    const baseRadius = this.bet >= 500 ? 75 : this.bet >= 100 ? 60 : 45;
    const netRadius = this.specialType === 'MISSILE' ? baseRadius * 1.8 : baseRadius;
    const nets = [];

    // Lưới chính
    const mainNet = new Net(
      `net_${Date.now()}_${Math.random()}`,
      this.slotId,
      this.x,
      this.y,
      this.bet,
      netRadius,
      this.color,
      this.specialType
    );
    nets.push(mainNet);

    // Nếu là Đạn Chùm (CLUSTER): bung thêm 4 lưới phụ xung quanh (4 hướng)
    if (this.specialType === 'CLUSTER') {
      [
        { ox: -36, oy: 0 },
        { ox: 36, oy: 0 },
        { ox: 0, oy: -36 },
        { ox: 0, oy: 36 },
      ].forEach((offset, idx) => {
        nets.push(new Net(
          `net_cluster_${Date.now()}_${idx}`,
          this.slotId,
          this.x + offset.ox,
          this.y + offset.oy,
          this.bet,
          baseRadius * 0.85,
          '#ff9100',
          'CLUSTER'
        ));
      });
    }

    return nets;
  }

  render(ctx) {
    if (this.isDead) return;

    // Vẽ vệt đuôi đạn
    for (const t of this.trail) {
      ctx.save();
      ctx.fillStyle = this.specialType === 'MISSILE' ? '#ff9100' : this.color;
      ctx.globalAlpha = t.alpha * 0.6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Vẽ đầu đạn đặc biệt hoặc đầu đạn chuẩn
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.specialType === 'MISSILE') {
      // Vẽ hình quả Tên Lửa Tầm Nhiệt (Rocket)
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 15;

      // Thân tên lửa đỏ
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-12, -4, 18, 8);

      // Đầu đạn nhọn bạc
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(14, 0);
      ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();

      // Cánh đuôi tên lửa
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-12, -7, 4, 14);

      // Ngọn lửa phụt đuôi (Jet Flame)
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.moveTo(-12, -3);
      ctx.lineTo(-18 - Math.random() * 6, 0);
      ctx.lineTo(-12, 3);
      ctx.closePath();
      ctx.fill();
    } else {
      // Đạn năng lượng chuẩn
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Vành màu năng lượng
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
