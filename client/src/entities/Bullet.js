/**
 * Bullet.js
 * Viên đạn pháo năng lượng. Có cơ chế "Dội viền màn hình (Bouncing Bullet)"
 * chuẩn siêu thị: đạn bắn vào cạnh mép sẽ nảy lại cho đến khi chạm vào cá!
 */
import { Net } from './Net.js';

export class Bullet {
  constructor(id, slotId, x, y, angle, bet = 10, color = '#00e5ff') {
    this.id = id;
    this.slotId = slotId;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.bet = bet;
    this.color = color;

    const speed = 12.0;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius = bet >= 100 ? 7 : 5;
    this.bouncesRemaining = 1; // Đạn chỉ phản xạ viền đúng 1 lần
    this.isDead = false;
    this.trail = [];
  }

  update(dt, width, height) {
    if (this.isDead) return;

    // Lưu vết đuôi đạn phát sáng (Glowing Bullet Trail)
    this.trail.push({ x: this.x, y: this.y, alpha: 0.8 });
    if (this.trail.length > 5) this.trail.shift();
    for (const t of this.trail) t.alpha *= 0.7;

    this.x += this.vx;
    this.y += this.vy;

    // Cơ chế nảy viền màn hình
    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = -this.vx;
      this.bouncesRemaining--;
    } else if (this.x + this.radius >= width) {
      this.x = width - this.radius;
      this.vx = -this.vx;
      this.bouncesRemaining--;
    }

    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = -this.vy;
      this.bouncesRemaining--;
    } else if (this.y + this.radius >= height) {
      this.y = height - this.radius;
      this.vy = -this.vy;
      this.bouncesRemaining--;
    }

    if (this.bouncesRemaining < 0) {
      this.isDead = true;
    }
  }

  // Tạo lưới khi chạm vào cá
  explode() {
    this.isDead = true;
    const netRadius = this.bet >= 500 ? 75 : this.bet >= 100 ? 60 : 45;
    return new Net(
      `net_${Date.now()}_${Math.random()}`,
      this.slotId,
      this.x,
      this.y,
      this.bet,
      netRadius,
      this.color
    );
  }

  render(ctx) {
    if (this.isDead) return;

    // Vẽ vệt đuôi đạn
    for (const t of this.trail) {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Vẽ đầu đạn phát sáng
    ctx.save();
    ctx.translate(this.x, this.y);
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

    ctx.restore();
  }
}
