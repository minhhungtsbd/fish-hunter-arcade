/**
 * AudioEngine.js
 * Hệ thống âm thanh Arcade mô phỏng máy bắn cá siêu thị bằng Web Audio API.
 * Hoạt động 100% độc lập, không cần tải file mp3 bên ngoài, không lo lỗi 404!
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.masterVolume = 0.5;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.musicPlaying) {
      this.stopMusic();
      this.musicPlaying = true; // nhớ trạng thái
    } else if (!this.isMuted && this.musicPlaying) {
      this.startMusic();
    }
    return this.isMuted;
  }

  // Tiếng pháo bắn (pew laser năng lượng)
  playShoot(level = 1) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 480 + Math.min(level, 10) * 35;
      osc.type = level > 50 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.18 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  // Tiếng lưới bắt cá bung ra (whoosh năng lượng điện)
  playNet() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(660, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);

      gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch (_) {}
  }

  // Tiếng cá trúng đạn (thump nhẹ)
  playHit() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

      gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  // Tiếng xu leng keng ăn tiền arcade (Coin Jingle)
  playCoin(isBig = false) {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = isBig ? [987, 1318, 1567, 1975, 2637] : [1318, 1760];
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
      });
    } catch (_) {}
  }

  // Tiếng bom nổ / Boss bị tiêu diệt (Boom bass rung chuyển)
  playBomb() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

      gain.gain.setValueAtTime(0.4 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.62);
    } catch (_) {}
  }

  // Tiếng sét phóng giật liên hoàn (Cá điện)
  playLightning() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.25);

      gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (_) {}
  }

  // Còi báo động khi Boss Rồng Vàng hoặc Cá Mập Vàng xuất hiện
  playBossAlert() {
    if (this.isMuted || !this.ctx) return;
    try {
      for (let i = 0; i < 3; i++) {
        const now = this.ctx.currentTime + i * 0.28;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.2);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (_) {}
  }

  // Nhạc nền đại dương du dương arcade
  toggleMusic() {
    if (this.musicPlaying) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.musicPlaying;
  }

  startMusic() {
    this.musicPlaying = true;
    if (this.isMuted || !this.ctx) return;

    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ];
    let chordIdx = 0;

    const playChordStep = () => {
      if (!this.musicPlaying || this.isMuted || !this.ctx) return;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, idx) => {
        try {
          const now = this.ctx.currentTime + idx * 0.12;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.025 * this.masterVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 1.25);
        } catch (_) {}
      });

      this.musicTimer = setTimeout(playChordStep, 1400);
    };

    playChordStep();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
