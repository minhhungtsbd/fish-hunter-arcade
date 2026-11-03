/**
 * Net.js
 * Lưới năng lượng bung ra khi đạn chạm vào cá hoặc chạm mục tiêu.
 * Giật sát thương và tính toán bắt cá chuẩn arcade.
 */
export class Net {
  constructor(id, slotId, x, y, bet, maxRadius = 55, color = '#00e5ff') {
    this.id = id;
    this.slotId = slotId;
    this.x = x;
    this.y = y;
    this.bet = bet;
    this.currentRadius = 10;
    this.maxRadius = maxRadius;
    this.life = 1.0;
    this.color = color;
    this.hasDamaged = false; // Chỉ gây sát thương 1 lần khi bung ra
  }

  update(dt) {
    if (this.currentRadius < this.maxRadius) {
      this.currentRadius += (this.maxRadius - this.currentRadius) * 0.25;
    }
    this.life -= 0.045;
  }

  get isDead() {
    return this.life <= 0;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = Math.max(0, this.life);

    // Vòng sóng năng lượng ngoài
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Mạng lưới đan xen bên trong (Arcade Energy Grid)
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rings = 3;
    for (let r = 1; r <= rings; r++) {
      ctx.arc(0, 0, (this.currentRadius / rings) * r, 0, Math.PI * 2);
    }
    // Các đường nan hoa tỏa ra
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * this.currentRadius, Math.sin(a) * this.currentRadius);
    }
    ctx.stroke();

    ctx.restore();
  }
}
