/**
 * FishSpawner.js
 * Quản lý sinh đàn cá, bầy cá diễu hành (school of fish),
 * và xuất hiện Boss theo chu kỳ chuẩn siêu thị.
 */
import { Fish, FISH_CONFIGS } from './Fish.js';

export class FishSpawner {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.fishes = [];
    this.spawnTimer = 0;
    this.bossTimer = 0;
    this.nextFishId = 1;
    this.isHost = true; // Chỉ Host mới chủ động sinh cá và đồng bộ qua mạng
  }

  reset() {
    this.fishes = [];
    this.spawnTimer = 0;
    this.bossTimer = 0;
  }

  // Tạo quỹ đạo đường cong Bezier ngẫu nhiên đi qua màn hình
  generatePath(width, height) {
    const sides = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM'];
    const startSide = sides[Math.floor(Math.random() * sides.length)];

    let p0, p1, p2, p3;

    if (startSide === 'LEFT') {
      p0 = { x: -80, y: Math.random() * height };
      p1 = { x: width * 0.35, y: Math.random() * height };
      p2 = { x: width * 0.65, y: Math.random() * height };
      p3 = { x: width + 80, y: Math.random() * height };
    } else if (startSide === 'RIGHT') {
      p0 = { x: width + 80, y: Math.random() * height };
      p1 = { x: width * 0.65, y: Math.random() * height };
      p2 = { x: width * 0.35, y: Math.random() * height };
      p3 = { x: -80, y: Math.random() * height };
    } else if (startSide === 'TOP') {
      p0 = { x: Math.random() * width, y: -80 };
      p1 = { x: Math.random() * width, y: height * 0.35 };
      p2 = { x: Math.random() * width, y: height * 0.65 };
      p3 = { x: Math.random() * width, y: height + 80 };
    } else {
      p0 = { x: Math.random() * width, y: height + 80 };
      p1 = { x: Math.random() * width, y: height * 0.65 };
      p2 = { x: Math.random() * width, y: height * 0.35 };
      p3 = { x: Math.random() * width, y: -80 };
    }

    return [p0, p1, p2, p3];
  }

  spawnFish(typeKey, pathPoints = null, speedScale = 1.0, syncId = null) {
    const id = syncId || `fish_${Date.now()}_${this.nextFishId++}`;
    const path = pathPoints || this.generatePath(this.game.width, this.game.height);
    const fish = new Fish(id, typeKey, path, speedScale);
    this.fishes.push(fish);

    // Nếu là Host và đang kết nối Multiplayer -> gửi gói tin đồng bộ cá
    if (this.isHost && this.game.network && this.game.network.isMultiplayer) {
      this.game.network.broadcast({
        type: 'SPAWN_FISH',
        fish: {
          id,
          typeKey,
          path,
          speedScale,
        },
      });
    }

    return fish;
  }

  // Sinh đàn cá hề bơi nối đuôi nhau (School of Clownfish)
  spawnClownSchool() {
    const baseP = this.generatePath(this.game.width, this.game.height);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.game) return;
        const offsetPath = baseP.map(p => ({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 30 }));
        this.spawnFish('CLOWN', offsetPath, 1.2);
      }, i * 350);
    }
  }

  update(dt) {
    // 1. Cập nhật vị trí tất cả cá
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      fish.update(dt);
      if (fish.isDead) {
        this.fishes.splice(i, 1);
      }
    }

    // 2. Chỉ Host mới tự sinh cá mới
    if (!this.isHost) return;

    this.spawnTimer += dt;
    this.bossTimer += dt;

    // Duy trì mật độ từ 14 - 24 con cá trên màn hình
    if (this.spawnTimer > 1000 && this.fishes.length < 24) {
      this.spawnTimer = 0;

      const roll = Math.random();
      if (roll < 0.18) {
        this.spawnClownSchool();
      } else if (roll < 0.30) {
        this.spawnFish('BUTTERFLY');
      } else if (roll < 0.42) {
        this.spawnFish('PUFFER');
      } else if (roll < 0.52) {
        this.spawnFish('JELLYFISH');
      } else if (roll < 0.62) {
        this.spawnFish('TURTLE');
      } else if (roll < 0.72) {
        this.spawnFish('SWORDFISH');
      } else if (roll < 0.80) {
        this.spawnFish('STINGRAY');
      } else if (roll < 0.87) {
        this.spawnFish('LANTERN_FISH');
      } else if (roll < 0.92) {
        this.spawnFish('LOBSTER');
      } else if (roll < 0.95) {
        this.spawnFish('OCTOPUS');
      } else if (roll < 0.97) {
        this.spawnFish('HAMMERHEAD');
      } else if (roll < 0.985) {
        this.spawnFish('LIGHTNING_EEL');
      } else {
        this.spawnFish('BOMB_CRAB');
      }
    }

    // Chu kỳ xuất hiện Boss Rồng Vàng, Cóc Vàng hoặc Cá Mập Vàng
    if (this.bossTimer > 38000) { // Mỗi 38 giây xuất hiện 1 Boss
      this.bossTimer = 0;
      const bossRoll = Math.random();
      let bossType = 'GOLDEN_DRAGON';
      let bossName = 'BOSS RỒNG VÀNG THẦN THOẠI';

      if (bossRoll < 0.35) {
        bossType = 'GOLDEN_SHARK';
        bossName = 'CÁ MẬP HOÀNG KIM';
      } else if (bossRoll < 0.7) {
        bossType = 'GOLDEN_TOAD';
        bossName = 'CÓC VÀNG THIỀM THỪ';
      }

      this.game.audio.playBossAlert();
      this.game.particles.triggerScreenShake(16);
      this.game.particles.addFloatingText(
        this.game.width / 2,
        this.game.height / 2 - 50,
        `⚠ ${bossName} XUẤT HIỆN! ⚠`,
        '#ffd700',
        32
      );

      this.spawnFish(bossType, null, 0.7);
    }
  }

  render(ctx) {
    for (const fish of this.fishes) {
      fish.render(ctx);
    }
  }
}
