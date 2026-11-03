# 🌊 Game Bắn Cá Ăn Xu Siêu Thị 4P (Arcade Fish Hunter Multiplayer)

Game mô phỏng bàn bắn cá ăn xu siêu thị truyền thống dành cho **4 người chơi (4 Player Slots)**, đồng bộ thời gian thực, âm thanh arcade sống động, hiệu ứng xu vàng bay và các loài cá đặc biệt.

Được thiết kế tối ưu hóa **100% Miễn Phí (Free Tier)** để lưu source code trên **GitHub** và triển khai tự động lên **Cloudflare Pages (Frontend)** và **Cloudflare Workers (Real-time Multiplayer Signaling)**.

---

## 🌟 Tính Năng Nổi Bật Chuẩn Máy Siêu Thị

1. **Bàn chơi 4 Ghế Người Chơi (4 Slots)**:
   - **Ghế 1 & 2**: Góc dưới màn hình (hướng nòng súng lên trên).
   - **Ghế 3 & 4**: Góc trên màn hình (hướng nòng súng chúc xuống).
   - Mỗi người chơi có avatar, số xu riêng biệt, cấp độ đạn và hiệu ứng xoay nòng mượt mà.
2. **Cơ chế Đạn Nảy Viền (Bouncing Bullets)**:
   - Đạn bắn vào mép màn hình tự động dội lại tối đa 3 lần cho đến khi trúng cá, không lo bị phí đạn!
3. **Đa dạng 10 Loài Cá & Kỹ Năng Độc Đáo**:
   - **Cá Hề, Cá Bướm, Cá Nóc, Rùa Biển, Cá Đuối, Bạch Tuộc**: Thưởng từ x2 đến x40 lần cược.
   - **⚡ Cá Chình Sét (Lightning Eel)**: Khi chết phóng tia sét xích (Chain Lightning) tiêu diệt liên hoàn 3-4 cá xung quanh!
   - **💥 Cua Mang Bom (Bomb Crab)**: Kích nổ quét sạch toàn bộ cá nhỏ & trung trên toàn màn hình!
   - **👑 Cá Mập Hoàng Kim & Boss Rồng Vàng**: Xuất hiện kèm còi báo động toàn sàn đấu, thưởng cực đại **x250 lần xu**!
4. **Hiệu ứng Arcade Cực Phê**:
   - Vòi phun đồng xu vàng 3D bay thành vòng cung từ con cá chết hút thẳng vào nòng pháo người chơi.
   - Hệ thống âm thanh độc lập phát triển bằng **Web Audio API** (tiếng pháo, tiếng lưới bung, tiếng xu leng keng, tiếng rung chấn nổ bom bass) - **không cần tải file mp3 bên ngoài, không lo lỗi 404**!
5. **3 Chế Độ Chơi Linh Hoạt**:
   - **Offline / Chơi cùng AI Bot**: Khi chơi một mình, bấm nút `🤖 Bật 3 Bot` để 3 máy tự động vào bàn ngắm bắn sống động.
   - **Thử nghiệm Nhiều Tab (Multi-Tab Local)**: Mở 2 đến 4 tab trình duyệt cùng lúc trên máy tính để thử nghiệm ngay lập tức (sử dụng công nghệ BroadcastChannel).
   - **Online Bạn Bè (Cloudflare Worker WebSocket)**: Chia sẻ link phòng để 4 người chơi từ các máy khác nhau cùng vào săn cá.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
fish-hunter-multiplayer/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions tự động build & deploy lên Cloudflare
├── client/                     # Mã nguồn Frontend (Cloudflare Pages)
│   ├── index.html              # Giao diện bàn game & thanh điều khiển Arcade
│   ├── vite.config.js          # Cấu hình Vite build siêu tốc
│   ├── package.json
│   └── src/
│       ├── main.js             # Điểm khởi chạy trò chơi
│       ├── style.css           # Giao diện Cyber-Oceanic hiện đại
│       ├── audio/
│       │   └── AudioEngine.js  # Bộ phát âm thanh Web Audio API độc lập
│       ├── core/
│       │   ├── GameEngine.js   # Game Loop 60 FPS & quản lý va chạm
│       │   └── ParticleSystem.js # Bọt khí biển, xu vàng 3D, tia sét xích
│       ├── entities/
│       │   ├── Cannon.js       # 4 nòng pháo, nòng đôi/ba, đổi cược, AI Bot
│       │   ├── Bullet.js       # Viên đạn dội mép màn hình
│       │   ├── Net.js          # Lưới năng lượng bung bắt cá
│       │   ├── Fish.js         # Định nghĩa 10 loài cá vector động
│       │   └── FishSpawner.js  # Quản lý đàn cá bơi & chu kỳ Boss
│       ├── network/
│       │   └── NetworkManager.js # Đồng bộ nhiều tab và kết nối Cloudflare Worker
│       └── ui/
│           └── UIController.js # Menu, bảng trả thưởng, link mời bạn bè
├── worker/                     # Cloudflare Worker Signaling (100% Free Tier)
│   ├── wrangler.toml           # Cấu hình Cloudflare Worker
│   ├── package.json
│   └── src/
│       └── index.js            # Máy chủ WebSocket chuyển tiếp phòng chơi
├── package.json
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Thử Trên Máy Tính (Local)

### 1. Xem trước bản build tĩnh
Vào thư mục `client` và chạy lệnh preview bằng Vite:
```powershell
cd client
npm run preview
# hoặc dùng lệnh dev để code trực tiếp:
npm run dev
```

### 2. Thử nghiệm chế độ 4 người chơi (Multi-tab)
1. Mở trình duyệt truy cập: `http://localhost:3000` (Bạn đang ở **Ghế 1**).
2. Mở thêm 1 Tab mới: `http://localhost:3000/?slot=1` (Tab này sẽ ngồi vào **Ghế 2**).
3. Thử bắn cá ở Tab 1, bạn sẽ thấy ngay lập tức nòng pháo ở Tab 2 xoay và bắn đồng bộ!

---

## 🌐 Hướng Dẫn Đẩy Lên GitHub & Triển Khai Cloudflare (100% Miễn Phí)

### Bước 1: Khởi tạo và Đẩy Source Code lên GitHub
Mở terminal tại thư mục `fish-hunter-multiplayer`:
```powershell
git init
git add .
git commit -m "feat: Khoi tao Game Ban Ca An Xu 4P Multiplayer"
git branch -M main

# Tạo repo mới trên github.com, sau đó gắn link remote:
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
git push -u origin main
```

---

### Bước 2: Triển Khai Frontend Trên Cloudflare Pages (Miễn phí vĩnh viễn)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Vào mục **Workers & Pages** -> Chọn **Create application** -> Tab **Pages** -> **Connect to Git**.
3. Chọn Repository GitHub vừa tạo của bạn.
4. Cấu hình thông số Build:
   - **Framework preset**: `Vite`
   - **Root directory**: `client`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Bấm **Save and Deploy**.
   - Chỉ sau 30 giây, Cloudflare Pages sẽ cung cấp cho bạn một đường link trực tiếp (ví dụ: `https://fish-hunter-arcade.pages.dev`).

---

### Bước 3: Triển Khai Backend Real-time Trên Cloudflare Workers (Gói Free Tier)

1. Mở terminal trong thư mục `worker`:
   ```powershell
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```
2. Sau khi deploy xong, bạn sẽ nhận được link Worker dạng:
   `https://fish-hunter-signaling.<ten-cua-ban>.workers.dev`

3. **Gắn link Worker vào game**:
   - Khi chơi, người chơi chỉ cần truy cập kèm tham số:
     `https://fish-hunter-arcade.pages.dev/?worker=https://fish-hunter-signaling.<ten-cua-ban>.workers.dev`
   - Hoặc bạn có thể gán cố định URL này vào biến `window.CLOUDFLARE_WORKER_URL` trong file `client/index.html`.

---

## 🎮 Hướng Dẫn Điều Khiển Trong Game

| Thao tác | Hành động |
| :--- | :--- |
| **Click Chuột Trái / Chạm màn hình** | Bắn đạn về hướng chỉ định |
| **Click vào con cá bất kỳ** | **Khóa mục tiêu (Lock-on)** - Nòng pháo tự bám theo con cá đó |
| **Phím Space (Cách)** | Bắn nhanh một phát đạn |
| **Phím A** | Bật / Tắt chế độ **Tự động bắn liên tục (Auto-Fire)** |
| **Nút [+] / [-] (hoặc Phím Mũi Tên Lên / Xuống)** | Tăng / Giảm mức cược đạn (10 -> 1000 xu) |
| **Nút "🤖 Bật 3 Bot"** | Kích hoạt 3 máy AI tự động chơi cùng ở 3 ghế trống |
| **Nút "+5,000 Xu Free"** | Nhận 5,000 xu miễn phí bất cứ lúc nào |

---

Chúc bạn có những giây phút săn cá bắn xu thật bùng nổ cùng bạn bè! 🐟🪙🎉
