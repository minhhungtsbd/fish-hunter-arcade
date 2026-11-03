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
    baseSpeed: 1.1,
    radius: 18,
    color: '#ff6d00',
    accent: '#ffffff',
  },
  BUTTERFLY: {
    name: 'Cá Bướm Vàng',
    multiplier: 3,
    hp: 3,
    baseSpeed: 1.0,
    radius: 22,
    color: '#ffd600',
    accent: '#00b0ff',
  },
  PUFFER: {
    name: 'Cá Nóc Gai',
    multiplier: 5,
    hp: 5,
    baseSpeed: 0.85,
    radius: 26,
    color: '#00e676',
    accent: '#004d40',
  },
  JELLYFISH: {
    name: 'Sứa Phát Quang',
    multiplier: 8,
    hp: 7,
    baseSpeed: 0.65,
    radius: 30,
    color: '#e040fb',
    accent: '#80d8ff',
  },
  TURTLE: {
    name: 'Rùa Biển Cổ',
    multiplier: 10,
    hp: 12,
    baseSpeed: 0.6,
    radius: 36,
    color: '#2e7d32',
    accent: '#81c784',
  },
  SWORDFISH: {
    name: 'Cá Kiếm Đại Dương',
    multiplier: 15,
    hp: 16,
    baseSpeed: 0.95,
    radius: 44,
    color: '#1976d2',
    accent: '#00e5ff',
  },
  STINGRAY: {
    name: 'Cá Đuối Khổng Lồ',
    multiplier: 20,
    hp: 24,
    baseSpeed: 0.75,
    radius: 46,
    color: '#0288d1',
    accent: '#b3e5fc',
  },
  LANTERN_FISH: {
    name: 'Cá Lồng Đèn Biển Sâu',
    multiplier: 25,
    hp: 26,
    baseSpeed: 0.7,
    radius: 40,
    color: '#283593',
    accent: '#ffd600',
  },
  LOBSTER: {
    name: 'Tôm Hùm Hoàng Gia',
    multiplier: 35,
    hp: 36,
    baseSpeed: 0.65,
    radius: 42,
    color: '#e64a19',
    accent: '#ffab91',
  },
  OCTOPUS: {
    name: 'Bạch Tuộc Tím',
    multiplier: 40,
    hp: 45,
    baseSpeed: 0.6,
    radius: 52,
    color: '#7b1fa2',
    accent: '#ea80fc',
  },
  LIGHTNING_EEL: {
    name: 'Cá Chình Sét',
    multiplier: 50,
    hp: 35,
    baseSpeed: 0.95,
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
    baseSpeed: 0.65,
    radius: 42,
    color: '#d50000',
    accent: '#ff9100',
    isSpecial: true,
    skill: 'BOMB',
  },
  HAMMERHEAD: {
    name: 'Cá Mập Đầu Búa',
    multiplier: 70,
    hp: 70,
    baseSpeed: 0.8,
    radius: 56,
    color: '#455a64',
    accent: '#90a4ae',
  },
  GOLDEN_SHARK: {
    name: 'Cá Mập Hoàng Kim',
    multiplier: 80,
    hp: 90,
    baseSpeed: 0.8,
    radius: 64,
    color: '#ffd700',
    accent: '#ff6f00',
  },
  GOLDEN_TOAD: {
    name: 'Cóc Vàng Thiềm Thừ',
    multiplier: 150,
    hp: 160,
    baseSpeed: 0.5,
    radius: 72,
    color: '#ffd700',
    accent: '#ff6f00',
    isBoss: true,
  },
  GOLDEN_DRAGON: {
    name: 'Boss Rồng Vàng Thần Thoại',
    multiplier: 250,
    hp: 240,
    baseSpeed: 0.52,
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
    // Tốc độ bơi được hiệu chỉnh chậm rãi, êm dịu, chuẩn phong cách bắn cá siêu thị (14s - 26s qua màn hình PC)
    this.speed = (this.config.baseSpeed * speedScale * 0.00007);

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

    this.swimTime += 0.04; // Vây đuôi quẫy uyển chuyển, tự nhiên theo tốc độ bơi thư thả
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
      case 'JELLYFISH':
        this.renderJellyfish(ctx, isHit, tailWiggle);
        break;
      case 'TURTLE':
        this.renderTurtle(ctx, isHit, tailWiggle);
        break;
      case 'SWORDFISH':
        this.renderSwordfish(ctx, isHit, tailWiggle);
        break;
      case 'STINGRAY':
        this.renderStingray(ctx, isHit, tailWiggle);
        break;
      case 'LANTERN_FISH':
        this.renderLanternFish(ctx, isHit, tailWiggle);
        break;
      case 'LOBSTER':
        this.renderLobster(ctx, isHit, tailWiggle);
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
      case 'HAMMERHEAD':
        this.renderHammerhead(ctx, isHit, tailWiggle);
        break;
      case 'GOLDEN_SHARK':
        this.renderShark(ctx, isHit, tailWiggle);
        break;
      case 'GOLDEN_TOAD':
        this.renderGoldenToad(ctx, isHit, tailWiggle);
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

  // 1. Sứa Biển Phát Quang
  renderJellyfish(ctx, isHit, tailWiggle) {
    const r = this.radius;
    const pulse = 1 + Math.sin(this.swimTime * 3) * 0.12;

    // Các xúc tu uốn lượn phía sau
    ctx.strokeStyle = isHit ? '#ffffff' : this.config.accent;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const wave = Math.sin(this.swimTime * 4 + i) * 12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, i * 6);
      ctx.quadraticCurveTo(-r * 0.8, i * 8 + wave, -r * 1.5, i * 10 - wave);
      ctx.stroke();
    }

    // Mũ sứa hình chuông vòm bán cầu
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(-r * 0.3, 0, 0, -r * pulse);
    ctx.closePath();
    ctx.fill();

    // Vành phát quang dạ quang
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 2. Cá Kiếm Đại Dương
  renderSwordfish(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Đuôi cá kiếm
    ctx.save();
    ctx.translate(-r * 0.8, 0);
    ctx.rotate(tailWiggle);
    ctx.fillStyle = isHit ? '#ffffff' : this.config.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.6, -r * 0.6);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.6, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Thân thon dài
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vây lưng dài cao
    ctx.fillStyle = this.config.accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.25);
    ctx.lineTo(0, -r * 0.8);
    ctx.lineTo(r * 0.3, -r * 0.25);
    ctx.closePath();
    ctx.fill();

    // Mũi kiếm nhọn dài đặc trưng
    ctx.strokeStyle = isHit ? '#ffffff' : '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.lineTo(r * 1.6, 0);
    ctx.stroke();

    // Mắt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.5, -r * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Cá Lồng Đèn Biển Sâu (Anglerfish)
  renderLanternFish(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Thân tròn màu tối
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cần câu đèn uốn cong ra trước trán
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.8, -r * 1.2, r * 1.2, -r * 0.6);
    ctx.stroke();

    // Bóng đèn phát sáng vàng rực
    ctx.fillStyle = '#ffd600';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(r * 1.2, -r * 0.6, 7, 0, Math.PI * 2);
    ctx.fill();

    // Miệng to lởm chởm răng sắc
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, r * 0.1);
    ctx.lineTo(r * 0.8, r * 0.1);
    ctx.lineTo(r * 0.5, r * 0.35);
    ctx.closePath();
    ctx.fill();

    // Mắt trắng trừng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.15, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Tôm Hùm Hoàng Gia
  renderLobster(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Đuôi chia đốt
    ctx.fillStyle = isHit ? '#ffffff' : this.config.color;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-i * (r * 0.25), 0, r * 0.2, r * 0.35 - i * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Đôi càng to khỏe phía trước
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    [-r * 0.5, r * 0.5].forEach(offsetY => {
      ctx.beginPath();
      ctx.ellipse(r * 0.8, offsetY, r * 0.4, r * 0.22, 0.3 * Math.sign(offsetY), 0, Math.PI * 2);
      ctx.fill();
    });

    // Thân mai tôm
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi râu dài phất phơ
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -5);
    ctx.lineTo(r * 1.5, -25);
    ctx.moveTo(r * 0.5, 5);
    ctx.lineTo(r * 1.5, 25);
    ctx.stroke();
  }

  // 5. Cá Mập Đầu Búa (Hammerhead Shark)
  renderHammerhead(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Đuôi cá mập quẫy
    ctx.save();
    ctx.translate(-r * 0.8, 0);
    ctx.rotate(tailWiggle);
    ctx.fillStyle = isHit ? '#ffffff' : this.config.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.6, -r * 0.6);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.6, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Thân cá mập
    ctx.fillStyle = isHit ? '#ff5252' : this.config.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đầu búa nằm ngang T-bar đặc trưng
    ctx.fillStyle = isHit ? '#ffffff' : this.config.accent;
    ctx.beginPath();
    ctx.roundRect(r * 0.6, -r * 0.7, r * 0.3, r * 1.4, 6);
    ctx.fill();

    // 2 mắt nằm ở 2 đầu thanh búa
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.75, -r * 0.6, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.75, r * 0.6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Cóc Vàng Thiềm Thừ (Boss May Mắn x150)
  renderGoldenToad(ctx, isHit, tailWiggle) {
    const r = this.radius;

    // Thân cóc tròn vàng óng
    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, r);
    grad.addColorStop(0, isHit ? '#ffffff' : '#fff59d');
    grad.addColorStop(0.7, isHit ? '#ff5252' : '#ffd700');
    grad.addColorStop(1, '#ff6f00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Các nốt sần ngọc đỏ trên lưng
    ctx.fillStyle = '#d50000';
    [[-15, -12], [0, -18], [15, -10], [-10, 10], [10, 12]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Đồng tiền vàng ngậm ở miệng
    ctx.fillStyle = '#fff176';
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r * 0.75, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lỗ vuông giữa đồng tiền
    ctx.fillStyle = '#ff6f00';
    ctx.fillRect(r * 0.75 - 4, -4, 8, 8);

    // Mắt cóc vàng ngọc đỏ
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.4, 7, 0, Math.PI * 2);
    ctx.arc(r * 0.4, r * 0.4, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}
