/**
 * GameEngine.js
 * Trung tâm điều phối toàn bộ game bắn cá: vòng lặp đồ họa 60 FPS,
 * xử lý va chạm đạn - cá - lưới, tính toán thưởng xu arcade,
 * và điều khiển 4 nòng pháo người chơi.
 */
import { AudioEngine } from '../audio/AudioEngine.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FishSpawner } from '../entities/FishSpawner.js';
import { Cannon } from '../entities/Cannon.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1280;
    this.height = 720;
    this.dpr = window.devicePixelRatio || 1;

    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.spawner = new FishSpawner(this);

    // 4 ghế người chơi (Slots 0, 1, 2, 3)
    this.cannons = [
      new Cannon(0, this),
      new Cannon(1, this),
      new Cannon(2, this),
      new Cannon(3, this),
    ];

    this.bullets = [];
    this.nets = [];
    this.network = null; // Sẽ được gán từ NetworkManager

    this.localSlotId = 0; // Mặc định người chơi ngồi Slot 0
    this.isRunning = false;
    this.lastTime = performance.now();

    this.oceanTime = 0;
    this.setupResize();
    this.setupInputs();
  }

  setupResize() {
    const handleResize = () => {
      const container = this.canvas.parentElement;
      const targetWidth = container ? container.clientWidth : window.innerWidth;
      const targetHeight = container ? container.clientHeight : window.innerHeight;

      this.width = targetWidth;
      this.height = targetHeight;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);

      // Cập nhật vị trí 4 nòng pháo theo kích thước mới
      this.cannons.forEach(c => c.resize(this.width, this.height));
      this.particles.initBubbles(this.width, this.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  setupInputs() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const handlePointerMove = (e) => {
      const pos = getPos(e);
      const localCannon = this.cannons[this.localSlotId];
      if (localCannon && !localCannon.lockedTarget) {
        localCannon.aimAt(pos.x, pos.y);
      }
    };

    const handlePointerDown = (e) => {
      this.audio.init(); // Mở khóa Web Audio API lần đầu click
      const pos = getPos(e);
      const localCannon = this.cannons[this.localSlotId];
      if (!localCannon) return;

      // Kiểm tra xem người chơi có click trúng con cá nào để Khóa Mục Tiêu (Lock-On) không
      let clickedFish = null;
      for (const fish of this.spawner.fishes) {
        if (!fish.isDead && Math.hypot(fish.x - pos.x, fish.y - pos.y) <= fish.radius + 15) {
          clickedFish = fish;
          break;
        }
      }

      if (clickedFish) {
        // Khóa mục tiêu hoặc hủy khóa
        if (localCannon.lockedTarget === clickedFish) {
          localCannon.lockedTarget = null;
        } else {
          localCannon.lockedTarget = clickedFish;
          localCannon.aimAt(clickedFish.x, clickedFish.y);
          this.particles.addFloatingText(clickedFish.x, clickedFish.y - 25, '🎯 ĐÃ KHÓA MỤC TIÊU', '#00e5ff', 16);
        }
      } else {
        localCannon.aimAt(pos.x, pos.y);
      }

      // Bắn 1 viên đạn
      const bullet = localCannon.shoot();
      if (bullet) {
        this.bullets.push(bullet);
      }
    };

    this.canvas.addEventListener('mousemove', handlePointerMove);
    this.canvas.addEventListener('mousedown', handlePointerDown);
    this.canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
    this.canvas.addEventListener('touchstart', handlePointerDown, { passive: true });

    // Phím tắt bàn phím
    window.addEventListener('keydown', (e) => {
      const localCannon = this.cannons[this.localSlotId];
      if (!localCannon) return;

      if (e.code === 'Space') {
        const bullet = localCannon.shoot();
        if (bullet) this.bullets.push(bullet);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.key === '+') {
        localCannon.changeBet(1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.key === '-') {
        localCannon.changeBet(-1);
      } else if (e.code === 'KeyA') {
        localCannon.autoFire = !localCannon.autoFire;
        this.particles.addFloatingText(
          localCannon.x,
          localCannon.y - 45,
          localCannon.autoFire ? '⚡ TỰ ĐỘNG BẮN: BẬT' : '⚡ TỰ ĐỘNG BẮN: TẮT',
          '#ffd700',
          18
        );
      }
    });
  }

  setLocalSlot(slotId) {
    this.localSlotId = slotId;
    this.cannons.forEach((c, idx) => {
      c.isLocal = idx === slotId;
      if (idx === slotId) {
        c.isOccupied = true;
        c.isBot = false;
      }
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.isRunning = false;
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;
    this.oceanTime += dt * 0.001;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    // 1. Cập nhật 4 Pháo (bắn tự động hoặc bot bắn)
    for (const cannon of this.cannons) {
      const bullet = cannon.update(dt, this.spawner.fishes);
      if (bullet) {
        this.bullets.push(bullet);
      }
    }

    // 2. Cập nhật Đạn
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, this.width, this.height);

      // Kiểm tra va chạm đạn với cá
      let hitFish = null;
      for (const fish of this.spawner.fishes) {
        if (!fish.isDead && Math.hypot(b.x - fish.x, b.y - fish.y) < fish.radius + b.radius + 6) {
          hitFish = fish;
          break;
        }
      }

      if (hitFish || b.isDead) {
        const net = b.explode();
        this.nets.push(net);
        this.audio.playNet();
        this.bullets.splice(i, 1);
      }
    }

    // 3. Cập nhật Lưới & Kiểm tra sát thương cá
    for (let i = this.nets.length - 1; i >= 0; i--) {
      const net = this.nets[i];
      net.update(dt);

      if (!net.hasDamaged) {
        net.hasDamaged = true;
        this.applyNetDamage(net);
      }

      if (net.isDead) {
        this.nets.splice(i, 1);
      }
    }

    // 4. Cập nhật Đàn cá & Sinh cá
    this.spawner.update(dt);

    // 5. Cập nhật Hệ thống hạt & xu bay
    this.particles.update(dt, this.width, this.height);
  }

  // Tính toán sát thương & bắt cá
  applyNetDamage(net) {
    const cannon = this.cannons[net.slotId];
    if (!cannon) return;

    for (const fish of this.spawner.fishes) {
      if (fish.isDead) continue;
      const dist = Math.hypot(fish.x - net.x, fish.y - net.y);
      if (dist <= net.currentRadius + fish.radius) {
        this.audio.playHit();

        // Công thức sát thương và tỷ lệ bắt cá chuẩn máy siêu thị
        const damage = Math.max(1, Math.floor(net.bet / 10));
        const isDeadByHp = fish.takeDamage(damage);

        // Tỷ lệ trúng hên xui (Lucky catch)
        const luckRoll = Math.random() < (net.bet / (fish.multiplier * 16));

        if (isDeadByHp || luckRoll) {
          this.handleFishKilled(fish, cannon, net.bet);
        }
      }
    }
  }

  handleFishKilled(fish, cannon, betUsed) {
    fish.isDead = true;
    const rewardCoins = fish.multiplier * betUsed;
    cannon.coins += rewardCoins;

    // Hiệu ứng xu bay về nòng pháo
    const valueStr = `+${rewardCoins.toLocaleString('vi-VN')} Xu`;
    this.particles.addCoinFountain(fish.x, fish.y, cannon.x, cannon.y, rewardCoins, valueStr);
    this.audio.playCoin(fish.multiplier >= 20);

    // Kỹ năng đặc biệt: Cá Chình Sét (Chain Lightning)
    if (fish.typeKey === 'LIGHTNING_EEL') {
      this.audio.playLightning();
      this.particles.triggerScreenShake(8);
      const nearbyFishes = this.spawner.fishes.filter(f => !f.isDead && Math.hypot(f.x - fish.x, f.y - fish.y) < 320);
      nearbyFishes.slice(0, 4).forEach(targetFish => {
        this.particles.addLightning(fish.x, fish.y, targetFish.x, targetFish.y, '#00ffff');
        targetFish.isDead = true;
        const extraReward = targetFish.multiplier * betUsed;
        cannon.coins += extraReward;
        this.particles.addCoinFountain(targetFish.x, targetFish.y, cannon.x, cannon.y, extraReward, `+${extraReward}`);
      });
    }

    // Kỹ năng đặc biệt: Cua Mang Bom (Bomb Crab)
    if (fish.typeKey === 'BOMB_CRAB') {
      this.audio.playBomb();
      this.particles.triggerScreenShake(20);
      this.particles.addFloatingText(this.width / 2, this.height / 2, '💥 BÙM! QUÉT SẠCH MÀN HÌNH!', '#ff1744', 30);
      this.spawner.fishes.forEach(targetFish => {
        if (!targetFish.isDead && !targetFish.config.isBoss) {
          targetFish.isDead = true;
          const extraReward = targetFish.multiplier * betUsed;
          cannon.coins += extraReward;
          this.particles.addCoinFountain(targetFish.x, targetFish.y, cannon.x, cannon.y, extraReward);
        }
      });
    }

    // Kỹ năng Boss: Rồng Vàng hoặc Cá Mập Vàng
    if (fish.config.isBoss) {
      this.audio.playBomb();
      this.particles.triggerScreenShake(25);
      this.particles.addFloatingText(this.width / 2, this.height / 2 - 30, '🏆 MEGA JACKPOT THẦN THOẠI! 🏆', '#ffd700', 36);
    }

    // Đồng bộ gói tin diệt cá qua mạng nếu là Multiplayer
    if (this.network && this.network.isMultiplayer) {
      this.network.broadcast({
        type: 'FISH_KILL',
        fishId: fish.id,
        slotId: cannon.slotId,
        rewardCoins,
      });
    }
  }

  render() {
    this.ctx.save();

    // Rung màn hình khi nổ bom / nổ Boss
    if (this.particles.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.particles.screenShake;
      const shakeY = (Math.random() - 0.5) * this.particles.screenShake;
      this.ctx.translate(shakeX, shakeY);
    }

    // 1. Vẽ nền đại dương sâu thẳm lung linh (Deep Ocean Background)
    this.renderOceanBackground();

    // 2. Vẽ đàn cá bơi
    this.spawner.render(this.ctx);

    // 3. Vẽ đạn & lưới năng lượng
    this.bullets.forEach(b => b.render(this.ctx));
    this.nets.forEach(n => n.render(this.ctx));

    // 4. Vẽ các hiệu ứng hạt, bọt khí, xu bay, chữ số nhảy điểm
    this.particles.render(this.ctx);

    // 5. Vẽ 4 nòng pháo & bảng tên người chơi
    this.cannons.forEach(c => c.render(this.ctx));

    this.ctx.restore();
  }

  renderOceanBackground() {
    const ctx = this.ctx;
    // Gradient nước biển xanh sâu thẳm
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#02182b');
    grad.addColorStop(0.5, '#042940');
    grad.addColorStop(1, '#00131f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Tia sáng mặt trời chiếu xuyên qua mặt nước (Sun Caustics)
    ctx.save();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 5; i++) {
      const waveOffset = Math.sin(this.oceanTime + i * 1.5) * 60;
      const lightGrad = ctx.createLinearGradient(this.width * 0.2 * i + waveOffset, 0, this.width * 0.25 * i + waveOffset, this.height);
      lightGrad.addColorStop(0, '#00e5ff');
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.18 * i + waveOffset, 0);
      ctx.lineTo(this.width * 0.26 * i + waveOffset, 0);
      ctx.lineTo(this.width * 0.35 * i + waveOffset, this.height);
      ctx.lineTo(this.width * 0.15 * i + waveOffset, this.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Rạn san hô trang trí ở 2 bên góc đáy
    ctx.save();
    ctx.fillStyle = '#063a56';
    ctx.beginPath();
    ctx.arc(80, this.height + 20, 110, 0, Math.PI * 2);
    ctx.arc(this.width - 80, this.height + 20, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
