/**
 * NetworkManager.js
 * Quản lý kết nối Multiplayer thời gian thực cho 4 người chơi.
 * Hỗ trợ 3 chế độ:
 * 1. Chơi đơn cùng 3 AI Bot thông minh (Offline)
 * 2. Chơi nhiều tab trên cùng máy tính qua BroadcastChannel (Local Test)
 * 3. Chơi Online bạn bè qua Cloudflare Worker WebSocket / WebRTC Signaling (100% Free)
 */

export class NetworkManager {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.game.network = this;

    this.isMultiplayer = false;
    this.roomCode = this.getRoomCodeFromUrl();
    this.peerId = `peer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    this.workerWs = null;
    this.broadcastChannel = null;

    this.initBroadcastChannel();
    this.initCloudflareWorkerSync();
  }

  getRoomCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || 'CA8888').toUpperCase();
  }

  initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(`fish_room_${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleNetworkMessage(event.data);
        };

        // Gửi thông báo gia nhập local room
        setTimeout(() => {
          this.broadcast({
            type: 'PLAYER_JOIN',
            slotId: this.game.localSlotId,
            playerName: this.game.cannons[this.game.localSlotId].playerName,
            coins: this.game.cannons[this.game.localSlotId].coins,
          });
        }, 500);
      } catch (_) {}
    }
  }

  // Kết nối đến Cloudflare Worker WebSocket nếu có cấu hình
  initCloudflareWorkerSync() {
    const params = new URLSearchParams(window.location.search);
    const customWorker = params.get('worker') || window.CLOUDFLARE_WORKER_URL;

    if (customWorker) {
      try {
        const wsProtocol = customWorker.startsWith('https') ? 'wss:' : 'ws:';
        const host = customWorker.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const wsUrl = `${wsProtocol}//${host}/ws?room=${this.roomCode}&slot=${this.game.localSlotId}&peerId=${this.peerId}`;

        console.log(`🌐 [Multiplayer] Đang kết nối Cloudflare Worker WebSocket: ${wsUrl}`);
        this.workerWs = new WebSocket(wsUrl);

        this.workerWs.onopen = () => {
          this.isMultiplayer = true;
          console.log('✅ [Multiplayer] Đã kết nối Cloudflare Worker thành công!');
          this.broadcast({
            type: 'PLAYER_JOIN',
            slotId: this.game.localSlotId,
            playerName: this.game.cannons[this.game.localSlotId].playerName,
            coins: this.game.cannons[this.game.localSlotId].coins,
          });
        };

        this.workerWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleNetworkMessage(data);
          } catch (_) {}
        };

        this.workerWs.onclose = () => {
          console.log('🔌 [Multiplayer] Đã ngắt kết nối Cloudflare Worker.');
        };
      } catch (err) {
        console.warn('Không thể kết nối Cloudflare Worker, chuyển sang chế độ Local/BroadcastChannel', err);
      }
    }
  }

  // Phát gói tin đến tất cả người chơi khác
  broadcast(message) {
    // 1. Gửi qua BroadcastChannel (cho các tab local)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (_) {}
    }

    // 2. Gửi qua Cloudflare Worker WebSocket
    if (this.workerWs && this.workerWs.readyState === WebSocket.OPEN) {
      try {
        this.workerWs.send(JSON.stringify(message));
      } catch (_) {}
    }
  }

  // Xử lý gói tin nhận được từ mạng
  handleNetworkMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'PLAYER_JOIN': {
        if (msg.slotId === this.game.localSlotId) return;
        const cannon = this.game.cannons[msg.slotId];
        if (cannon) {
          cannon.isOccupied = true;
          cannon.isLocal = false;
          cannon.isBot = false;
          cannon.playerName = msg.playerName || `Người Chơi ${msg.slotId + 1}`;
          if (msg.coins) cannon.coins = msg.coins;
          this.game.particles.addFloatingText(
            cannon.x,
            cannon.y - 35,
            `👋 ${cannon.playerName} ĐÃ VÀO BÀN!`,
            cannon.color,
            18
          );
        }
        break;
      }

      case 'PLAYER_SHOOT': {
        if (msg.slotId === this.game.localSlotId) return;
        const cannon = this.game.cannons[msg.slotId];
        if (cannon) {
          cannon.angle = msg.angle;
          cannon.bet = msg.bet;
          const bullet = cannon.shoot();
          if (bullet) this.game.bullets.push(bullet);
        }
        break;
      }

      case 'SPAWN_FISH': {
        // Khách nhận cá được sinh từ Host
        if (this.game.localSlotId !== 0 && msg.fish) {
          this.game.spawner.spawnFish(
            msg.fish.typeKey,
            msg.fish.path,
            msg.fish.speedScale,
            msg.fish.id
          );
        }
        break;
      }

      case 'FISH_KILL': {
        const fish = this.game.spawner.fishes.find(f => f.id === msg.fishId);
        const cannon = this.game.cannons[msg.slotId];
        if (fish && !fish.isDead && cannon) {
          fish.isDead = true;
          cannon.coins += msg.rewardCoins;
          this.game.particles.addCoinFountain(
            fish.x,
            fish.y,
            cannon.x,
            cannon.y,
            msg.rewardCoins,
            `+${msg.rewardCoins.toLocaleString('vi-VN')} Xu`
          );
          this.game.audio.playCoin(fish.multiplier >= 20);
        }
        break;
      }

      case 'PLAYER_LEAVE': {
        const cannon = this.game.cannons[msg.slotId];
        if (cannon) {
          cannon.isOccupied = false;
          this.game.particles.addFloatingText(
            cannon.x,
            cannon.y - 35,
            `🚪 ${cannon.playerName} ĐÃ RỜI PHÒNG`,
            '#ff5252',
            16
          );
        }
        break;
      }
    }
  }
}
