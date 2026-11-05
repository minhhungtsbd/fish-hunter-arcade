/**
 * PowerUpBox.js
 * Hộp đạn tiếp tế ngẫu nhiên trôi nổi trong đại dương.
 * Khi người chơi bắn vỡ hộp đạn sẽ được nâng cấp loại đạn đặc biệt:
 * 1. DOUBLE: Đạn 2 nòng bắn song song tăng gấp đôi hỏa lực
 * 2. TRIPLE: Đạn 3 nòng bắn tỏa quạt quét sạch đàn cá rộng lớn
 * 3. MISSILE: Tên lửa tầm nhiệt tự động bám đuổi theo cá và nổ cực mạnh diện rộng
 * 4. CLUSTER: Đạn chùm phân mảnh tạo 5 lưới năng lượng nổ liên tiếp
 * 5. LASER: Đạn tia xuyên thấu qua mọi con cá trên đường bay
 * 6. FROST: Đạn băng giá làm đông cứng và chậm 70% cá trong vùng lưới
 */

export const WEAPON_TYPES = {
  DOUBLE: {
    name: 'ĐẠN 2 NÒNG SONG SONG',
    icon: '⚡⚡',
    color: '#00e5ff',
    ammoCount: 25,
    desc: 'Bắn 2 viên đạn song song tăng gấp đôi hỏa lực!',
  },
  TRIPLE: {
    name: 'ĐẠN 3 NÒNG TỎA QUẠT',
    icon: '🔱',
    color: '#ffd700',
    ammoCount: 20,
    desc: 'Bắn 3 viên đạn tỏa quạt quét sạch đàn cá!',
  },
  MISSILE: {
    name: 'TÊN LỬA TẦM NHIỆT',
    icon: '🚀',
    color: '#ff1744',
    ammoCount: 14,
    desc: 'Tự động đuổi theo cá và phát nổ cực mạnh diện rộng!',
  },
  CLUSTER: {
    name: 'ĐẠN CHÙM BÙNG NỔ',
    icon: '💥',
    color: '#ff9100',
    ammoCount: 16,
    desc: 'Tách làm 5 lưới nổ liên hoàn bao trọn đàn cá!',
  },
  LASER: {
    name: 'ĐẠN LASER XUYÊN THẤU',
    icon: '⚡',
    color: '#76ff03',
    ammoCount: 22,
    desc: 'Bắn tia laser cực nhanh xuyên thủng qua mọi con cá!',
  },
  FROST: {
    name: 'ĐẠN BĂNG ĐÔNG CỨNG',
    icon: '❄️',
    color: '#80d8ff',
    ammoCount: 18,
    desc: 'Lưới băng làm đông cứng & giảm 70% tốc độ của cá!',
  },
};

export class PowerUpBox {
  constructor(id, startSide, width, height) {
    this.id = id;
    this.width = 46;
    this.height = 46;
    this.maxHp = 5;
    this.hp = this.maxHp;
    this.isDead = false;
    this.floatTime = Math.random() * 10;
    this.hitTimer = 0;

    // Chọn ngẫu nhiên 1 trong 6 loại vũ khí đặc biệt
    const keys = Object.keys(WEAPON_TYPES);
    this.weaponType = keys[Math.floor(Math.random() * keys.length)];
    this.weaponConfig = WEAPON_TYPES[this.weaponType];

    // Xác định quỹ đạo trôi nổi từ trái sang phải hoặc ngược lại
    this.fromLeft = startSide === 'LEFT';
    this.x = this.fromLeft ? -60 : width + 60;
    this.y = height * (0.25 + Math.random() * 0.5); // trôi ở khoảng giữa màn hình
    this.targetY = this.y;
    this.speed = (this.fromLeft ? 1 : -1) * (0.9 + Math.random() * 0.4);
  }

  update(dt, screenWidth, screenHeight) {
    if (this.isDead) return;

    this.floatTime += 0.05;
    this.x += this.speed;
    this.y = this.targetY + Math.sin(this.floatTime) * 22; // dập dềnh theo sóng

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
    }

    // Ra khỏi màn hình thì tự hủy
    if ((this.fromLeft && this.x > screenWidth + 80) || (!this.fromLeft && this.x < -80)) {
      this.isDead = true;
    }
  }

  takeDamage(dmg = 1) {
    this.hp -= dmg;
    this.hitTimer = 120;
    if (this.hp <= 0) {
      this.isDead = true;
      return true; // Bị phá hủy
    }
    return false;
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const isHit = this.hitTimer > 0;
    const pulse = 1 + Math.sin(this.floatTime * 4) * 0.08;

    // Vầng hào quang bảo vệ phát sáng bên ngoài
    ctx.shadowColor = this.weaponConfig.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = this.weaponConfig.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, (this.width / 2 + 6) * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Thùng gỗ quân sự / Hộp kim loại công nghệ cao
    ctx.fillStyle = isHit ? '#ffffff' : '#37474f';
    ctx.beginPath();
    ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();

    // Khung nẹp góc kim loại màu vàng
    ctx.fillStyle = isHit ? '#ffeb3b' : '#ffd700';
    [-this.width / 2, this.width / 2 - 8].forEach(xOffset => {
      [-this.height / 2, this.height / 2 - 8].forEach(yOffset => {
        ctx.fillRect(xOffset, yOffset, 8, 8);
      });
    });

    // Icon vũ khí ở giữa hộp
    ctx.font = this.weaponConfig.icon.length > 2 ? '15px sans-serif' : '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.weaponConfig.icon, 0, 1);

    // Thanh máu của hộp đạn (HP Bar)
    const barW = this.width;
    const barH = 5;
    const hpPct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2, -this.height / 2 - 12, barW, barH);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(-barW / 2, -this.height / 2 - 12, barW * hpPct, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, -this.height / 2 - 12, barW, barH);

    ctx.restore();
  }
}
