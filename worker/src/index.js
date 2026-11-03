/**
 * Cloudflare Worker Signaling Server cho Game Bắn Cá 4P
 * Miễn phí 100% trên Cloudflare Workers Free Tier (100,000 req/ngày).
 * Hỗ trợ cả WebSocket Relay và HTTP REST Signaling cho WebRTC P2P.
 */

// Lưu danh sách kết nối theo phòng trong bộ nhớ Worker
const rooms = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Xử lý CORS cho phép frontend từ Cloudflare Pages hoặc localhost gọi vào
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Kiểm tra trạng thái hoạt động (Healthcheck)
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'online',
        service: 'Fish Hunter 4P Multiplayer Signaling',
        timestamp: new Date().toISOString(),
        activeRooms: rooms.size,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Kết nối WebSocket thời gian thực (/ws?room=CA8888&slot=0&peerId=xyz)
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Yêu cầu kết nối WebSocket Upgrade', { status: 426, headers: corsHeaders });
      }

      const roomId = (url.searchParams.get('room') || 'DEFAULT').toUpperCase();
      const peerId = url.searchParams.get('peerId') || `peer_${Date.now()}`;
      const slotId = parseInt(url.searchParams.get('slot') || '0', 10);

      const webSocketPair = new WebSocketPair();
      const [clientWs, serverWs] = Object.values(webSocketPair);

      serverWs.accept();

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const roomClients = rooms.get(roomId);
      roomClients.set(peerId, { ws: serverWs, slotId, peerId });

      // Khi nhận tin từ 1 người chơi -> chuyển tiếp cho tất cả người chơi khác trong phòng
      serverWs.addEventListener('message', (event) => {
        try {
          const rawData = event.data;
          for (const [otherPeerId, otherClient] of roomClients.entries()) {
            if (otherPeerId !== peerId && otherClient.ws.readyState === WebSocket.READY_STATE_OPEN) {
              otherClient.ws.send(rawData);
            }
          }
        } catch (_) {}
      });

      // Khi người chơi ngắt kết nối
      const handleClose = () => {
        roomClients.delete(peerId);
        if (roomClients.size === 0) {
          rooms.delete(roomId);
        } else {
          // Báo cho các người chơi còn lại biết slot này đã rời
          const leaveMsg = JSON.stringify({ type: 'PLAYER_LEAVE', slotId, peerId });
          for (const otherClient of roomClients.values()) {
            if (otherClient.ws.readyState === WebSocket.READY_STATE_OPEN) {
              otherClient.ws.send(leaveMsg);
            }
          }
        }
      };

      serverWs.addEventListener('close', handleClose);
      serverWs.addEventListener('error', handleClose);

      return new Response(null, {
        status: 101,
        webSocket: clientWs,
        headers: corsHeaders,
      });
    }

    // 3. API Tra cứu trạng thái phòng chơi (/api/room?code=CA8888)
    if (url.pathname === '/api/room') {
      const roomId = (url.searchParams.get('code') || '').toUpperCase();
      const roomClients = rooms.get(roomId);

      const occupiedSlots = [];
      if (roomClients) {
        for (const client of roomClients.values()) {
          occupiedSlots.push(client.slotId);
        }
      }

      return new Response(JSON.stringify({
        room: roomId,
        playerCount: occupiedSlots.length,
        occupiedSlots,
        availableSlots: [0, 1, 2, 3].filter(s => !occupiedSlots.includes(s)),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Không tìm thấy đường dẫn', { status: 404, headers: corsHeaders });
  },
};
