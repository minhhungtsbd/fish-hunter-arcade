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
import { PowerUpBox } from '../entities/PowerUpBox.js';

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
    this.activeBuzzBombs = []; // Danh sách sóng xung kích Buzz Bom đang mở rộng
    this.powerUpBoxes = []; // Danh sách Hộp Đạn tiếp tế
    this.powerUpTimer = 0;
    this.network = null; // Sẽ được gán từ NetworkManager

    this.localSlotId = 0; // Mặc định người chơi ngồi Slot 0
    this.difficulty = 'NORMAL'; // Chế độ: 'EASY' | 'NORMAL' | 'HARD'
    this.ui = null; // Sẽ được gán từ UIController
    this.isRunning = false;
    this.lastTime = performance.now();
    this.isPointerDown = false;

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
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 150));
    handleResize();
  }

  setupInputs() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const handlePointerDown = (e) => {
      if (e.target !== this.canvas) return;
      this.audio.init(); // Mở khóa Web Audio API lần đầu chạm
      this.isPointerDown = true;
      const pos = getPos(e);

      // 1. Kiểm tra nếu người chơi bấm vào ghế trống -> Chuyển sang ghế đó
      for (const cannon of this.cannons) {
        if (!cannon.isOccupied) {
          const distToSlot = Math.hypot(cannon.x - pos.x, cannon.y - pos.y);
          if (distToSlot < 48) {
            this.setLocalSlot(cannon.slotId);
            if (this.ui) this.ui.updateHUD();
            this.particles.addFloatingText(cannon.x, cannon.y - (cannon.slotId < 2 ? 60 : -60), `🪑 ĐÃ CHUYỂN ${cannon.playerName.toUpperCase()}`, '#00e5ff', 18);
            return;
          }
        }
      }

      const localCannon = this.cannons[this.localSlotId];
      if (!localCannon) return;

      // 2. Kiểm tra xem người chơi có click trúng con cá nào để Khóa Mục Tiêu (Lock-On) không
      let clickedFish = null;
      for (const fish of this.spawner.fishes) {
        if (!fish.isDead && Math.hypot(fish.x - pos.x, fish.y - pos.y) <= fish.radius + 18) {
          clickedFish = fish;
          break;
        }
      }

      if (clickedFish) {
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

      // Bắn phát đạn đầu tiên
      const bullets = localCannon.shoot();
      if (bullets) {
        this.addBullets(bullets);
        if (this.ui) this.ui.updateHUD();
      }
    };

    const handlePointerMove = (e) => {
      const pos = getPos(e);
      const localCannon = this.cannons[this.localSlotId];
      if (localCannon && !localCannon.lockedTarget) {
        localCannon.aimAt(pos.x, pos.y);
      }
    };

    const handlePointerUp = () => {
      this.isPointerDown = false;
    };

    this.canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Phím tắt bàn phím
    window.addEventListener('keydown', (e) => {
      const localCannon = this.cannons[this.localSlotId];
      if (!localCannon) return;

      if (e.code === 'Space') {
        const bullets = localCannon.shoot();
        if (bullets) {
          this.addBullets(bullets);
          if (this.ui) this.ui.updateHUD();
        }
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.key === '+') {
        localCannon.changeBet(1);
        if (this.ui) this.ui.updateHUD();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.key === '-') {
        localCannon.changeBet(-1);
        if (this.ui) this.ui.updateHUD();
      } else if (e.code === 'KeyA') {
        localCannon.autoFire = !localCannon.autoFire;
        this.particles.addFloatingText(
          localCannon.x,
          localCannon.y - 45,
          localCannon.autoFire ? '⚡ TỰ ĐỘNG BẮN: BẬT' : '⚡ TỰ ĐỘNG BẮN: TẮT',
          '#ffd700',
          18
        );
      } else if (e.code === 'KeyB') {
        this.triggerBuzzBomb();
      }
    });
  }

  // Tùy chọn bật 0, 1, 2 hoặc 3 Bot
  setBotCount(count) {
    const num = Math.max(0, Math.min(3, parseInt(count, 10) || 0));
    const otherSlots = [0, 1, 2, 3].filter(s => s !== this.localSlotId);

    otherSlots.forEach((slotId, index) => {
      const cannon = this.cannons[slotId];
      if (index < num) {
        cannon.isOccupied = true;
        cannon.isBot = true;
        cannon.isLocal = false;
        cannon.playerName = `Bot ${['Hải Tặc', 'Thủy Thủ', 'Ngư Phủ', 'Đại Gia'][slotId]}`;
      } else {
        cannon.isOccupied = false;
        cannon.isBot = false;
      }
    });

    const botMsg = num === 0 ? '🤖 ĐÃ TẮT HẾT BOT' : `🤖 ĐÃ BẬT ${num} AI BOT CHƠI CÙNG`;
    this.particles.addFloatingText(this.width / 2, this.height / 2 - 30, botMsg, '#00e5ff', 20);
    if (this.ui) this.ui.updateHUD();
  }

  // Kích hoạt BUZZ BOM nguyên tử khi đầy 100% năng lượng (hiệu ứng sóng xung kích mở rộng chậm rãi, mãn nhãn)
  triggerBuzzBomb(slotId = null, shouldBroadcast = true) {
    const targetSlot = slotId !== null ? slotId : this.localSlotId;
    const cannon = this.cannons[targetSlot];
    if (!cannon || cannon.energy < 100) {
      if (cannon && cannon.isLocal) {
        this.particles.addFloatingText(cannon.x, cannon.y - 45, 'CHƯA ĐỦ 100% NĂNG LƯỢNG NỘ!', '#ff5252', 18);
      }
      return false;
    }

    cannon.energy = 0;
    this.audio.playNukeBomb();
    this.particles.triggerScreenShake(24);

    // Hiệu ứng chữ chấn động báo hiệu
    this.particles.addFloatingText(
      this.width / 2,
      this.height / 2 - 50,
      '💥 BUZZ BOM NGUYÊN TỬ KÍCH HOẠT! 💥',
      '#ff1744',
      36
    );

    // Phóng tia dẫn đường từ nòng pháo người chơi vào tâm nổ đại dương
    this.particles.addLightning(cannon.x, cannon.y, this.width / 2, this.height / 2, '#00e5ff');
    this.particles.addSparks(this.width / 2, this.height / 2, '#ffd700', 30);

    // Tạo đợt sóng xung kích chậm rãi quét toàn màn hình trong ~2.4 giây
    const maxRadius = Math.hypot(this.width, this.height) * 0.75;
    this.activeBuzzBombs.push({
      cx: this.width / 2,
      cy: this.height / 2,
      cannonX: cannon.x,
      cannonY: cannon.y,
      cannonSlot: targetSlot,
      bet: cannon.bet,
      radius: 0,
      maxRadius: maxRadius,
      duration: 2400, // 2.4 giây lan tỏa chậm rãi
      elapsed: 0,
      hitFishIds: new Set(),
      pulse: 0,
    });

    if (this.ui) this.ui.updateHUD();

    // Đồng bộ gói tin qua mạng nếu là Multiplayer
    if (shouldBroadcast && this.network && this.network.isMultiplayer) {
      this.network.broadcast({
        type: 'BUZZ_BOMB',
        slotId: targetSlot,
      });
    }

    return true;
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

  addBullets(bullets) {
    if (!bullets) return;
    if (Array.isArray(bullets)) {
      this.bullets.push(...bullets);
    } else {
      this.bullets.push(bullets);
    }
  }

  update(dt) {
    // 1. Cập nhật 4 Pháo (bắn tự động hoặc bot bắn)
    for (const cannon of this.cannons) {
      const bullets = cannon.update(dt, this.spawner.fishes);
      if (bullets) {
        this.addBullets(bullets);
      }
    }

    // Bắn liên thanh khi người chơi giữ ngón tay/chuột trên màn hình
    if (this.isPointerDown) {
      const localCannon = this.cannons[this.localSlotId];
      if (localCannon && localCannon.canShoot()) {
        const bullets = localCannon.shoot();
        if (bullets) {
          this.addBullets(bullets);
          if (this.ui) this.ui.updateHUD();
        }
      }
    }

    // 2. Cập nhật Đạn
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, this.width, this.height, this.spawner.fishes);

      // Kiểm tra va chạm đạn với Hộp Đạn tiếp tế
      let hitBox = null;
      for (const box of this.powerUpBoxes) {
        if (!box.isDead && Math.hypot(b.x - box.x, b.y - box.y) < (box.width / 2 + b.radius + 4)) {
          hitBox = box;
          break;
        }
      }

      if (hitBox) {
        const destroyed = hitBox.takeDamage(1);
        this.audio.playHit();
        this.particles.addSparks(hitBox.x, hitBox.y, hitBox.weaponConfig.color, 8);
        if (destroyed) {
          const cannon = this.cannons[b.slotId];
          if (cannon) {
            cannon.setSpecialWeapon(hitBox.weaponType, hitBox.weaponConfig.ammoCount);
          }
          this.particles.addSparks(hitBox.x, hitBox.y, '#ffd700', 30);
        }
        b.isDead = true;
      }

      // Kiểm tra va chạm đạn với cá
      let hitFish = null;
      for (const fish of this.spawner.fishes) {
        if (!fish.isDead && Math.hypot(b.x - fish.x, b.y - fish.y) < fish.radius + b.radius + 6) {
          hitFish = fish;
          break;
        }
      }

      if (hitFish || b.isDead) {
        const spawnedNets = b.explode();
        if (Array.isArray(spawnedNets)) {
          this.nets.push(...spawnedNets);
        } else if (spawnedNets) {
          this.nets.push(spawnedNets);
        }
        this.audio.playNet();
        if (b.isDead) {
          this.bullets.splice(i, 1);
        }
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

    // 3.5 Cập nhật Sóng xung kích Buzz Bom quét qua màn hình chậm rãi (~2.4 giây)
    for (let bIdx = this.activeBuzzBombs.length - 1; bIdx >= 0; bIdx--) {
      const bomb = this.activeBuzzBombs[bIdx];
      bomb.elapsed += dt;
      bomb.pulse += 0.14;
      const progress = Math.min(1.0, bomb.elapsed / bomb.duration);
      // Easing sin giúp sóng nở ra chậm rãi, uy lực
      bomb.radius = bomb.maxRadius * Math.sin((progress * Math.PI) / 2);

      // Rung màn hình âm ỉ liên tục trong lúc sóng đang quét
      if (bomb.elapsed % 150 < dt) {
        this.particles.triggerScreenShake(3);
      }

      // Quét cá bị sóng chạm tới (cá gần tâm nổ trước, cá ở xa nổ sau)
      const cannon = this.cannons[bomb.cannonSlot] || this.cannons[this.localSlotId];
      for (const fish of this.spawner.fishes) {
        if (fish.isDead || bomb.hitFishIds.has(fish.id)) continue;

        const dist = Math.hypot(fish.x - bomb.cx, fish.y - bomb.cy);
        if (dist <= bomb.radius + fish.radius) {
          bomb.hitFishIds.add(fish.id);

          // Hiệu ứng giật sét và tia lửa tại vị trí từng con cá
          this.particles.addLightning(bomb.cx, bomb.cy, fish.x, fish.y, '#ffd700');
          this.particles.addSparks(fish.x, fish.y, '#ff1744', 16);

          if (fish.config.isBoss) {
            fish.takeDamage(70);
            this.particles.addFloatingText(fish.x, fish.y - 30, '-70 HP', '#ff5252', 24);
          } else {
            fish.isDead = true;
            const rewardCoins = fish.multiplier * bomb.bet;
            cannon.coins += rewardCoins;
            this.particles.addCoinFountain(fish.x, fish.y, cannon.x, cannon.y, rewardCoins);
            this.audio.playHit();
          }

          if (this.ui) this.ui.updateHUD();
        }
      }

      if (bomb.elapsed >= bomb.duration) {
        this.activeBuzzBombs.splice(bIdx, 1);
      }
    }

    // 4. Cập nhật Hộp Đạn Tiếp Tế
    this.powerUpTimer += dt;
    if (this.powerUpTimer > 28000 && this.powerUpBoxes.length < 2) {
      this.powerUpTimer = 0;
      const startSide = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      const box = new PowerUpBox(`box_${Date.now()}`, startSide, this.width, this.height);
      this.powerUpBoxes.push(box);
      this.particles.addFloatingText(this.width / 2, 85, '📦 HỘP ĐẠN TIẾP TẾ XUẤT HIỆN!', '#00e5ff', 22);
    }
    for (let i = this.powerUpBoxes.length - 1; i >= 0; i--) {
      const box = this.powerUpBoxes[i];
      box.update(dt, this.width, this.height);
      if (box.isDead) {
        this.powerUpBoxes.splice(i, 1);
      }
    }

    // 5. Cập nhật Đàn cá & Sinh cá
    this.spawner.update(dt);

    // 6. Cập nhật Hệ thống hạt & xu bay
    this.particles.update(dt, this.width, this.height);
  }

  // Tính toán sát thương & bắt cá theo Chế độ độ khó
  applyNetDamage(net) {
    const cannon = this.cannons[net.slotId];
    if (!cannon) return;

    // Cấu hình tỷ lệ cân bằng theo 3 cấp độ: Dễ, Trung bình, Khó
    const diffConfigs = {
      EASY: { luckDiv: 25, dmgMult: 1.2 },
      NORMAL: { luckDiv: 55, dmgMult: 1.0 },
      HARD: { luckDiv: 110, dmgMult: 0.8 },
    };
    const diff = diffConfigs[this.difficulty] || diffConfigs.NORMAL;

    for (const fish of this.spawner.fishes) {
      if (fish.isDead) continue;
      const dist = Math.hypot(fish.x - net.x, fish.y - net.y);
      if (dist <= net.currentRadius + fish.radius) {
        this.audio.playHit();

        // Hiệu ứng làm chậm và đóng băng của Đạn Băng
        if (net.specialType === 'FROST') {
          fish.speed = Math.max(0.000015, fish.speed * 0.35);
          fish.hitTimer = 350;
          this.particles.addSparks(fish.x, fish.y, '#80d8ff', 4);
        }

        // Sát thương theo cấp độ đạn và chế độ chơi
        const damage = Math.max(1, Math.round((net.bet / 10) * diff.dmgMult));
        const isDeadByHp = fish.takeDamage(damage);

        // Tỷ lệ may mắn trúng lưới bắt ngay (càng khó tỷ lệ càng giảm)
        const luckChance = (net.bet / (fish.multiplier * diff.luckDiv));
        const luckRoll = Math.random() < luckChance;

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

    // Tích năng lượng nộ khi bắt được cá (chậm lại cân bằng)
    cannon.addEnergy(Math.min(3.5, Math.max(0.15, fish.multiplier * 0.06)));

    // Cập nhật giao diện Xu ngay lập tức
    if (this.ui) this.ui.updateHUD();

    // Hiệu ứng xu bay về nòng pháo
    const valueStr = `+${rewardCoins.toLocaleString('vi-VN')} Xu`;
    this.particles.addCoinFountain(fish.x, fish.y, cannon.x, cannon.y, rewardCoins, valueStr);
    this.audio.playCoin(fish.multiplier >= 20);

    // Kỹ năng đặc biệt: Cá Chình Sét (Chain Lightning - giật tối đa 2 cá lân cận)
    if (fish.typeKey === 'LIGHTNING_EEL') {
      this.audio.playLightning();
      this.particles.triggerScreenShake(8);
      const nearbyFishes = this.spawner.fishes.filter(f => !f.isDead && Math.hypot(f.x - fish.x, f.y - fish.y) < 280);
      nearbyFishes.slice(0, 2).forEach(targetFish => {
        this.particles.addLightning(fish.x, fish.y, targetFish.x, targetFish.y, '#00ffff');
        targetFish.isDead = true;
        const extraReward = targetFish.multiplier * betUsed;
        cannon.coins += extraReward;
        this.particles.addCoinFountain(targetFish.x, targetFish.y, cannon.x, cannon.y, extraReward, `+${extraReward}`);
      });
      if (this.ui) this.ui.updateHUD();
    }

    // Kỹ năng đặc biệt: Cua Mang Bom (Bomb Crab - nổ quét sạch cá nhỏ & trung)
    if (fish.typeKey === 'BOMB_CRAB') {
      this.audio.playBomb();
      this.particles.triggerScreenShake(18);
      this.particles.addFloatingText(this.width / 2, this.height / 2, '💥 BÙM! NỔ BOM QUÉT MÀN HÌNH!', '#ff1744', 28);
      this.spawner.fishes.forEach(targetFish => {
        // Chỉ nổ các con cá nhỏ & trung (multiplier <= 15) để tránh lạm phát xu quá đà
        if (!targetFish.isDead && !targetFish.config.isBoss && targetFish.multiplier <= 15) {
          targetFish.isDead = true;
          const extraReward = targetFish.multiplier * betUsed;
          cannon.coins += extraReward;
          this.particles.addCoinFountain(targetFish.x, targetFish.y, cannon.x, cannon.y, extraReward);
        }
      });
      if (this.ui) this.ui.updateHUD();
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

    // 2. Vẽ đàn cá bơi & Hộp đạn tiếp tế
    this.spawner.render(this.ctx);
    this.powerUpBoxes.forEach(b => b.render(this.ctx));

    // 3. Vẽ đạn & lưới năng lượng
    this.bullets.forEach(b => b.render(this.ctx));
    this.nets.forEach(n => n.render(this.ctx));

    // 3.5. Vẽ sóng xung kích nguyên tử Buzz Bom lan tỏa chậm rãi
    this.renderBuzzBombs(this.ctx);

    // 4. Vẽ các hiệu ứng hạt, bọt khí, xu bay, chữ số nhảy điểm
    this.particles.render(this.ctx);

    // 5. Vẽ 4 nòng pháo & bảng tên người chơi
    this.cannons.forEach(c => c.render(this.ctx));

    this.ctx.restore();
  }

  // Vẽ sóng xung kích Buzz Bom nhiều lớp năng lượng neon phát sáng
  renderBuzzBombs(ctx) {
    if (!this.activeBuzzBombs || this.activeBuzzBombs.length === 0) return;

    for (const bomb of this.activeBuzzBombs) {
      const alpha = Math.max(0, 1 - (bomb.elapsed / bomb.duration));
      ctx.save();

      // 1. Ánh sáng chớp nguyên tử dịu dần trên toàn mặt biển
      if (bomb.elapsed < 450) {
        ctx.fillStyle = `rgba(255, 23, 68, ${0.18 * (1 - bomb.elapsed / 450)})`;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      // 2. Vầng hào quang tâm nổ ban đầu
      if (bomb.radius < 350) {
        const coreGrad = ctx.createRadialGradient(bomb.cx, bomb.cy, 5, bomb.cx, bomb.cy, Math.max(12, bomb.radius));
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        coreGrad.addColorStop(0.35, `rgba(255, 215, 0, ${alpha * 0.7})`);
        coreGrad.addColorStop(0.7, `rgba(255, 23, 68, ${alpha * 0.4})`);
        coreGrad.addColorStop(1, 'rgba(255, 23, 68, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(bomb.cx, bomb.cy, Math.max(12, bomb.radius), 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Vòng sóng xung kích rực lửa ngoài cùng
      ctx.beginPath();
      ctx.arc(bomb.cx, bomb.cy, Math.max(6, bomb.radius), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 23, 68, ${alpha * 0.85})`;
      ctx.lineWidth = 10;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 24;
      ctx.stroke();

      // 4. Vòng sóng điện từ hoàng kim ở giữa
      if (bomb.radius > 25) {
        ctx.beginPath();
        ctx.arc(bomb.cx, bomb.cy, bomb.radius - 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.75})`;
        ctx.lineWidth = 6;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 18;
        ctx.stroke();
      }

      // 5. Vòng xung kích xanh neon bên trong
      if (bomb.radius > 50) {
        ctx.beginPath();
        ctx.arc(bomb.cx, bomb.cy, bomb.radius - 45, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.stroke();
      }

      // 6. Các hạt điện tích quay xung quanh chu vi sóng
      const numArcs = 8;
      for (let i = 0; i < numArcs; i++) {
        const angle = (i / numArcs) * Math.PI * 2 + bomb.pulse;
        const sparkDist = bomb.radius + (Math.sin(bomb.pulse * 2 + i) * 14);
        const px = bomb.cx + Math.cos(angle) * sparkDist;
        const py = bomb.cy + Math.sin(angle) * sparkDist;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
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

    // Lớp đáy cát biển sâu tự nhiên (Subtle Ocean Bed Floor)
    ctx.save();
    const floorGrad = ctx.createLinearGradient(0, this.height - 35, 0, this.height);
    floorGrad.addColorStop(0, 'transparent');
    floorGrad.addColorStop(1, 'rgba(2, 24, 43, 0.45)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.height - 35, this.width, 35);
    ctx.restore();
  }
}
