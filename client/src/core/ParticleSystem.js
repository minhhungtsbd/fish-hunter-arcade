/**
 * ParticleSystem.js
 * Quản lý tất cả hiệu ứng hình ảnh: bọt nước đại dương, tia lửa đạn,
 * xu vàng 3D bay về pháo, chữ số nhảy điểm, tia sét xích và rung màn hình.
 */
export class ParticleSystem {
  constructor() {
    this.bubbles = [];
    this.sparks = [];
    this.coins = [];
    this.floatingTexts = [];
    this.lightningArcs = [];
    this.screenShake = 0;
  }

  // Khởi tạo các bọt khí biển tự nhiên
  initBubbles(width, height) {
    this.bubbles = [];
    for (let i = 0; i < 35; i++) {
      this.bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 5,
        speed: 0.4 + Math.random() * 1.2,
        wobble: Math.random() * Math.PI * 2,
        opacity: 0.15 + Math.random() * 0.35,
      });
    }
  }

  triggerScreenShake(intensity = 12) {
    this.screenShake = Math.max(this.screenShake, intensity);
  }

  // Tia lửa nổ / lưới bung
  addSparks(x, y, color = '#ffeb3b', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04,
      });
    }
  }

  // Hiệu ứng đồng xu bay từ cá chết về nòng pháo người chơi
  addCoinFountain(startX, startY, targetX, targetY, amount, valueText = '') {
    const coinCount = Math.min(Math.max(4, Math.floor(amount / 20)), 22);

    for (let i = 0; i < coinCount; i++) {
      const burstAngle = Math.random() * Math.PI * 2;
      const burstSpeed = 2 + Math.random() * 5;
      this.coins.push({
        x: startX,
        y: startY,
        vx: Math.cos(burstAngle) * burstSpeed,
        vy: Math.sin(burstAngle) * burstSpeed - 1.5,
        targetX,
        targetY,
        progress: 0,
        age: 0,
        scatterTime: 15 + Math.random() * 15, // frames to scatter before flying to target
        size: 9 + Math.random() * 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 0.15 + Math.random() * 0.25,
      });
    }

    if (valueText) {
      this.addFloatingText(startX, startY - 20, valueText, '#ffe600', 26);
    }
  }

  // Chữ số điểm / thông báo bay lên
  addFloatingText(x, y, text, color = '#ffe600', size = 20) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      life: 1.0,
      vy: -1.2,
      scale: 1.4,
    });
  }

  // Tia sét xích nối giữa các cá bị giật
  addLightning(fromX, fromY, toX, toY, color = '#00ffff') {
    this.lightningArcs.push({
      fromX,
      fromY,
      toX,
      toY,
      color,
      life: 1.0,
      decay: 0.08,
    });
  }

  update(dt, width, height) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // Cập nhật bọt khí
    for (const b of this.bubbles) {
      b.y -= b.speed;
      b.wobble += 0.04;
      b.x += Math.sin(b.wobble) * 0.4;
      if (b.y < -10) {
        b.y = height + 10;
        b.x = Math.random() * width;
      }
    }

    // Cập nhật tia lửa
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.94;
      s.vy *= 0.94;
      s.life -= s.decay;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Cập nhật đồng xu bay về pháo
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.age++;
      c.rotation += c.rotSpeed;

      if (c.age < c.scatterTime) {
        // Giai đoạn bung ra
        c.x += c.vx;
        c.y += c.vy;
        c.vx *= 0.92;
        c.vy *= 0.92;
      } else {
        // Giai đoạn bay hút về nòng pháo
        const dx = c.targetX - c.x;
        const dy = c.targetY - c.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 20) {
          this.coins.splice(i, 1);
          continue;
        }

        const flySpeed = Math.min(24, Math.max(8, dist * 0.12));
        c.x += (dx / dist) * flySpeed;
        c.y += (dy / dist) * flySpeed;
      }
    }

    // Cập nhật chữ số bay
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.018;
      if (ft.scale > 1.0) ft.scale -= 0.03;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Cập nhật tia sét
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const l = this.lightningArcs[i];
      l.life -= l.decay;
      if (l.life <= 0) {
        this.lightningArcs.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // 1. Vẽ bọt khí
    for (const b of this.bubbles) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // Ánh sáng lấp lánh nhẹ trên bọt
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Vẽ tia sét xích
    for (const l of this.lightningArcs) {
      ctx.save();
      ctx.strokeStyle = l.color;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5 * l.life;
      ctx.globalAlpha = l.life;
      ctx.beginPath();
      ctx.moveTo(l.fromX, l.fromY);

      // Tạo đường gãy khúc ngẫu nhiên như tia chớp
      const segments = 6;
      let currX = l.fromX;
      let currY = l.fromY;
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const midX = l.fromX + (l.toX - l.fromX) * t + (Math.random() - 0.5) * 24;
        const midY = l.fromY + (l.toY - l.fromY) * t + (Math.random() - 0.5) * 24;
        ctx.lineTo(midX, midY);
        currX = midX;
        currY = midY;
      }
      ctx.lineTo(l.toX, l.toY);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Vẽ tia lửa
    for (const s of this.sparks) {
      ctx.save();
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Vẽ đồng xu vàng
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);

      // Vòng tròn vàng sáng
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, c.size);
      grad.addColorStop(0, '#fff59d');
      grad.addColorStop(0.6, '#fbc02d');
      grad.addColorStop(1, '#f57f17');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, c.size, 0, Math.PI * 2);
      ctx.fill();

      // Viền dập nổi đồng xu arcade
      ctx.strokeStyle = '#fff9c4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c.size * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Chữ $ hoặc ★ ở giữa
      ctx.fillStyle = '#b78103';
      ctx.font = `bold ${Math.floor(c.size * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.5);

      ctx.restore();
    }

    // 5. Vẽ chữ số nhảy điểm
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.font = `900 ${ft.size}px "Impact", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Viền đen dày
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, 0, 0);

      // Lớp bóng sáng
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }
  }
}
