/**
 * Fish.js
 * Hệ thống định nghĩa 10 loài cá chuẩn game bắn cá siêu thị.
 * Vẽ vector canvas động với vây đuôi quẫy tự nhiên, hiệu ứng chớp sáng khi dính đạn,
 * và các kỹ năng đặc biệt: Cua Bom, Cá Điện phóng sét, Boss Rồng Vàng.
 */

export const FISH_CONFIGS = {
  CLOWN: {
    name: 'Cá Hề Nemo',
    multiplier: 2,
    hp: 2,
    baseSpeed: 1.8,
    radius: 18,
    color: '#ff6d00',
    accent: '#ffffff',
  },
  BUTTERFLY: {
    name: 'Cá Bướm Vàng',
    multiplier: 3,
    hp: 3,
    baseSpeed: 1.5,
    radius: 22,
    color: '#ffd600',
    accent: '#00b0ff',
  },
  PUFFER: {
    name: 'Cá Nóc Gai',
    multiplier: 5,
    hp: 5,
    baseSpeed: 1.2,
    radius: 26,
    color: '#00e676',
    accent: '#004d40',
  },
  TURTLE: {
    name: 'Rùa Biển Cổ',
    multiplier: 10,
    hp: 12,
    baseSpeed: 0.9,
    radius: 36,
    color: '#2e7d32',
    accent: '#81c784',
  },
  STINGRAY: {
    name: 'Cá Đuối Khổng Lồ',
    multiplier: 20,
    hp: 24,
    baseSpeed: 1.1,
    radius: 46,
    color: '#0288d1',
    accent: '#b3e5fc',
  },
  OCTOPUS: {
    name: 'Bạch Tuộc Tím',
    multiplier: 40,
    hp: 45,
    baseSpeed: 0.8,
    radius: 52,
    color: '#7b1fa2',
    accent: '#ea80fc',
  },
  LIGHTNING_EEL: {
    name: 'Cá Chình Sét',
    multiplier: 50,
    hp: 35,
    baseSpeed: 1.6,
    radius: 38,
    color: '#00ffff',
    accent: '#ffff00',
    isSpecial: true,
    skill: 'LIGHTNING',
  },
  BOMB_CRAB: {
    name: 'Cua Mang Bom',
    multiplier: 60,
    hp: 40,
    baseSpeed: 0.9,
    radius: 42,
    color: '#d50000',
    accent: '#ff9100',
    isSpecial: true,
    skill: 'BOMB',
  },
  GOLDEN_SHARK: {
    name: 'Cá Mập Hoàng Kim',
    multiplier: 80,
    hp: 90,
    baseSpeed: 1.3,
    radius: 64,
    color: '#ffd700',
    accent: '#ff6f00',
  },
  GOLDEN_DRAGON: {
    name: 'Boss Rồng Vàng Thần Thoại',
    multiplier: 250,
    hp: 240,
    baseSpeed: 0.75,
    radius: 85,
    color: '#ffab00',
    accent: '#d50000',
    isBoss: true,
  },
};

export class Fish {
  constructor(id, typeKey, pathPoints, speedScale = 1.0) {
    this.id = id;
    this.typeKey = typeKey;
    this.config = FISH_CONFIGS[typeKey] || FISH_CONFIGS.CLOWN;
    this.maxHp = this.config.hp;
    this.hp = this.maxHp;
    this.multiplier = this.config.multiplier;
    this.radius = this.config.radius;

    this.pathPoints = pathPoints; // Mảng [P0, P1, P2, P3] điểm điều khiển Bezier
    this.progress = 0; // 0.0 -> 1.0
    this.speed = (this.config.baseSpeed * speedScale * 0.00035);

    this.x = pathPoints[0].x;
    this.y = pathPoints[0].y;
    this.angle = 0;
    this.swimTime = Math.random() * 100;
    this.hitTimer = 0; // Chớp sáng khi trúng đạn
    this.isDead = false;
  }

  // Tính tọa độ theo đường cong Bezier bậc 3 (Cubic Bezier Curve)
  getBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
  }

  update(dt) {
    if (this.isDead) return;

    this.swimTime += 0.08;
    this.progress += this.speed * (dt || 16);

    if (this.hitTimer > 0) {
      this.hitTimer -= (dt || 16);
    }

    if (this.progress >= 1.0) {
      this.isDead = true; // Bơi ra khỏi màn hình
      return;
    }

    const curr = this.getBezierPoint(
      this.progress,
      this.pathPoints[0],
      this.pathPoints[1],
      this.pathPoints[2],
      this.pathPoints[3]
    );

    // Tính hướng đầu cá bằng điểm tiếp theo trên đường cong
    const nextT = Math.min(1.0, this.progress + 0.01);
    const next = this.getBezierPoint(
      nextT,
      this.pathPoints[0],
      this.pathPoints[1],
      this.pathPoints[2],
      this.pathPoints[3]
    );

    this.angle = Math.atan2(next.y - curr.y, next.x - curr.x);
    this.x = curr.x;
    this.y = curr.y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitTimer = 120; // 120ms chớp đỏ/trắng
    return this.hp <= 0;
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const isHit = this.hitTimer > 0;
    const tailWiggle = Math.sin(this.swimTime * 3) * 0.25;

    // Hiệu ứng phát sáng cho Boss & Cá đặc biệt
    if (this.config.isBoss) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 25;
    } else if (this.config.isSpecial) {
      ctx.shadowColor = this.config.color;
      ctx.shadowBlur = 18;
    }

    // Vẽ hình dáng từng loài cá
    switch (this.typeKey) {
      case 'CLOWN':
      case 'BUTTERFLY':
        this.renderBasicFish(ctx, isHit, tailWiggle);
        break;
      case 'PUFFER':
        this.renderPuffer(ctx, isHit, tailWiggle);
        break;
      case 'TURTLE':
        this.renderTurtle(ctx, isHit, tailWiggle);
        break;
      case 'STINGRAY':
        this.renderStingray(ctx, isHit, tailWiggle);
        break;
      case 'OCTOPUS':
        this.renderOctopus(ctx, isHit, tailWiggle);
        break;
      case 'LIGHTNING_EEL':
        this.renderEel(ctx, isHit, tailWiggle);
        break;
      case 'BOMB_CRAB':
        this.renderBombCrab(ctx, isHit, tailWiggle);
        break;
      case 'GOLDEN_SHARK':
        this.renderShark(ctx, isHit, tailWiggle);
        break;
      case 'GOLDEN_DRAGON':
        this.renderDragon(ctx, isHit, tailWiggle);
        break;
      default:
        this.renderBasicFish(ctx, isHit, tailWiggle);
    }

    // Vẽ thanh máu (HP Bar) nếu là Boss hoặc cá to bị dính đạn
    if (this.hp < this.maxHp && this.maxHp >= 10) {
      const barW = this.radius * 1.5;
      const barH = 5;
      const hpPct = Math.max(0, this.hp / this.maxHp);

      ctx.rotate(-this.angle); // Giữ thanh máu luôn nằm ngang
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW, barH);

      ctx.fillStyle = hpPct > 0.4 ? '#00e676' : '#ff1744';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW * hpPct, barH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, -this.radius - 12, barW, barH);
    }

    ctx.restore();
  }

  // Cá cơ bản (Cá hề / Cá bướm)
  renderBasicFish(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Đuôi cá quẫy
    ctx.save();
    ctx.translate(-r * 0.8, 0);
    ctx.rotate(tailWiggle);
    ctx.fillStyle = isHit ? '#ffffff' : this.config.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.7, -r * 0.5);
    ctx.lineTo(-r * 0.5, 0);
    ctx.lineTo(-r * 0.7, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Thân cá hình bầu dục
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sọc vằn đặc trưng
    ctx.fillStyle = isHit ? '#ffffff' : this.config.accent;
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, 0, r * 0.18, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mắt cá
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.5, -r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cá nóc gai
  renderPuffer(ctx, isHit, tailWiggle) {
    const r = this.radius * (isHit ? 1.15 : 1.0);
    // Gai nhọn
    ctx.fillStyle = isHit ? '#ffffff' : this.config.accent;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
      ctx.lineTo(Math.cos(a + 0.15) * r, Math.sin(a + 0.15) * r);
      ctx.fill();
    }
    // Thân tròn
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Mắt tròn
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rùa biển
  renderTurtle(ctx, isHit, tailWiggle) {
    const r = this.radius;
    // Chân bơi chèo
    const flipperA = Math.sin(this.swimTime * 2) * 0.3;
    ctx.fillStyle = isHit ? '#ffffff' : this.config.accent;
    // 2 chân trước
    ctx.save();
    ctx.translate(r * 0.3, -r * 0.5);
    ctx.rotate(-0.5 + flipperA);
    ctx.fillRect(0, -r * 0.3, r * 0.7, r * 0.25);
    ctx.restore();
    ctx.save();
    ctx.translate(r * 0.3, r * 0.5);
    ctx.rotate(0.5 - flipperA);
    ctx.fillRect(0, 0, r * 0.7, r * 0.25);
    ctx.restore();

    // Đầu rùa
    ctx.beginPath();
    ctx.arc(r * 0.9, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mai rùa hình khiên
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vân hoa văn mai rùa
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Cá đuối
  renderStingray(ctx, isHit, tailWiggle) {
    const r = this.radius;
    const wingWave = Math.sin(this.swimTime * 3) * (r * 0.2);

    // Đuôi dài nhọn
    ctx.strokeStyle = isHit ? '#ffffff' : this.config.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    ctx.quadraticCurveTo(-r * 1.2, tailWiggle * 25, -r * 2.0, tailWiggle * 40);
    ctx.stroke();

    // Cánh xòe kim cương
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(0, -r * 0.9 + wingWave);
    ctx.lineTo(-r * 0.6, 0);
    ctx.lineTo(0, r * 0.9 - wingWave);
    ctx.closePath();
    ctx.fill();

    // Mắt phát sáng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bạch tuộc tím
  renderOctopus(ctx, isHit, tailWiggle) {
    const r = this.radius;
    // 6 xúc tu uốn lượn phía sau
    ctx.strokeStyle = isHit ? '#ffffff' : this.config.color;
    ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) {
      const tentacleWave = Math.sin(this.swimTime * 3 + i) * 15;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, i * 8);
      ctx.quadraticCurveTo(-r * 0.8, i * 14 + tentacleWave, -r * 1.4, i * 18 - tentacleWave);
      ctx.stroke();
    }

    // Đầu bạch tuộc tròn to
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 2 mắt to tròn
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.35, r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.4, r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cá chình điện (Lightning Eel)
  renderEel(ctx, isHit, tailWiggle) {
    const r = this.radius;
    ctx.save();
    // Thân dài uốn éo như rắn
    ctx.strokeStyle = isHit ? '#ffffff' : this.config.color;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    const segments = 4;
    for (let i = 1; i <= segments; i++) {
      const x = r * 0.8 - (i * r * 0.5);
      const wave = Math.sin(this.swimTime * 4 + i) * 16;
      ctx.lineTo(x, wave);
    }
    ctx.stroke();

    // Vầng hào quang điện chớp nháy
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mắt điện
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.7, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cua mang bom
  renderBombCrab(ctx, isHit, tailWiggle) {
    const r = this.radius;
    // Càng cua
    ctx.fillStyle = isHit ? '#ffffff' : this.config.color;
    ctx.beginPath();
    ctx.arc(r * 0.6, -r * 0.6, r * 0.3, 0, Math.PI * 2);
    ctx.arc(r * 0.6, r * 0.6, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mai cua
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Quả bom đen trên lưng với ngòi nổ chớp sáng
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Tia lửa ngòi bom
    const fuseFlash = Math.sin(this.swimTime * 8) > 0;
    ctx.fillStyle = fuseFlash ? '#ffeb3b' : '#ff1744';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.35, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cá mập hoàng kim
  renderShark(ctx, isHit, tailWiggle) {
    const r = this.radius;
    // Đuôi cá mập to khỏe
    ctx.save();
    ctx.translate(-r * 0.8, 0);
    ctx.rotate(tailWiggle);
    ctx.fillStyle = isHit ? '#ffffff' : '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.6, -r * 0.7);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.6, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Thân cá mập thon dài hùng dũng
    const grad = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
    grad.addColorStop(0, isHit ? '#ffffff' : '#ffeb3b');
    grad.addColorStop(1, isHit ? '#ff5252' : '#f57f17');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vây lưng cá mập đặc trưng
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.4);
    ctx.lineTo(r * 0.1, -r * 0.85);
    ctx.lineTo(r * 0.3, -r * 0.4);
    ctx.closePath();
    ctx.fill();

    // Răng nanh sắc nhọn
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, r * 0.1);
    ctx.lineTo(r * 0.7, r * 0.25);
    ctx.lineTo(r * 0.6, r * 0.1);
    ctx.fill();

    // Mắt đỏ hung dữ
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(r * 0.6, -r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss Rồng Vàng Thần Thoại
  renderDragon(ctx, isHit, tailWiggle) {
    const r = this.radius;
    // Thân rồng uốn lượn nhiều đốt
    const segments = 6;
    for (let i = segments; i >= 1; i--) {
      const segX = -i * (r * 0.3);
      const segWave = Math.sin(this.swimTime * 2.5 + i * 0.8) * (r * 0.3);
      const segR = r * (0.8 - i * 0.08);

      const grad = ctx.createRadialGradient(segX, segWave, 2, segX, segWave, segR);
      grad.addColorStop(0, isHit ? '#ffffff' : '#fff176');
      grad.addColorStop(1, isHit ? '#ff1744' : '#ff6f00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(segX, segWave, segR, 0, Math.PI * 2);
      ctx.fill();

      // Vây gai lưng rồng
      ctx.fillStyle = '#d50000';
      ctx.beginPath();
      ctx.moveTo(segX, segWave - segR);
      ctx.lineTo(segX + 10, segWave - segR - 15);
      ctx.lineTo(segX + 20, segWave - segR);
      ctx.closePath();
      ctx.fill();
    }

    // Đầu rồng uy nghi
    ctx.fillStyle = isHit ? '#ffffff' : '#ffab00';
    ctx.beginPath();
    ctx.ellipse(r * 0.3, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sừng rồng màu đỏ
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.3);
    ctx.lineTo(r * 0.2, -r * 0.9);
    ctx.lineTo(r * 0.4, -r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Râu rồng phấp phới
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, 0);
    ctx.quadraticCurveTo(r * 1.1, Math.sin(this.swimTime * 3) * 20, r * 1.5, Math.cos(this.swimTime * 3) * 25);
    ctx.stroke();

    // Mắt rồng thần
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.48, -r * 0.15, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
