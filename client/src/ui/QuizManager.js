/**
 * QuizManager.js
 * Hệ thống Cứu Trợ Xu Miễn Phí:
 * Tự động kích hoạt khi người chơi cạn xu, hoặc người chơi bấm nút "🧠 Nhận Xu".
 * Sinh ngẫu nhiên câu hỏi:
 * 1. Phép tính Cộng / Trừ (Toán học)
 * 2. Đoán tên tiếng Anh qua hình ảnh sinh vật biển & đồ vật quen thuộc
 * Đúng: thưởng +2,000 -> +3,000 Xu
 * Sai: tự động đổi câu hỏi khác ngay lập tức để người chơi tiếp tục thử tài.
 */

export const ENGLISH_VOCABULARY = [
  { icon: '🐟', english: 'Fish', vietnamese: 'Con cá' },
  { icon: '🦈', english: 'Shark', vietnamese: 'Cá mập' },
  { icon: '🐢', english: 'Turtle', vietnamese: 'Rùa biển' },
  { icon: '🐙', english: 'Octopus', vietnamese: 'Bạch tuộc' },
  { icon: '🦀', english: 'Crab', vietnamese: 'Con cua' },
  { icon: '🐬', english: 'Dolphin', vietnamese: 'Cá heo' },
  { icon: '🐳', english: 'Whale', vietnamese: 'Cá voi' },
  { icon: '🦞', english: 'Lobster', vietnamese: 'Tôm hùm' },
  { icon: '🌊', english: 'Wave', vietnamese: 'Sóng biển' },
  { icon: '⚓', english: 'Anchor', vietnamese: 'Mỏ neo' },
  { icon: '🚢', english: 'Ship', vietnamese: 'Tàu thủy' },
  { icon: '🐚', english: 'Shell', vietnamese: 'Vỏ sò' },
  { icon: '🍎', english: 'Apple', vietnamese: 'Quả táo' },
  { icon: '🐱', english: 'Cat', vietnamese: 'Con mèo' },
  { icon: '🐶', english: 'Dog', vietnamese: 'Con chó' },
  { icon: '🚗', english: 'Car', vietnamese: 'Xe hơi' },
  { icon: '✈️', english: 'Airplane', vietnamese: 'Máy bay' },
  { icon: '☀️', english: 'Sun', vietnamese: 'Mặt trời' },
  { icon: '🌙', english: 'Moon', vietnamese: 'Mặt trăng' },
  { icon: '⭐', english: 'Star', vietnamese: 'Ngôi sao' },
];

export class QuizManager {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.modal = document.getElementById('modal-quiz');
    this.closeBtn = document.getElementById('close-quiz');
    this.iconDisplay = document.getElementById('quiz-icon-display');
    this.promptText = document.getElementById('quiz-prompt-text');
    this.optionsGrid = document.getElementById('quiz-options-grid');
    this.feedback = document.getElementById('quiz-feedback');
    this.successBox = document.getElementById('quiz-success-box');
    this.rewardAmount = document.getElementById('quiz-reward-amount');

    this.currentCorrectIndex = 0;
    this.currentReward = 150;
    this.isAnswering = false;

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn && this.modal) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    const btnContinue = document.getElementById('btn-quiz-continue-game');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => this.close());
    }

    const btnAnother = document.getElementById('btn-quiz-another');
    if (btnAnother) {
      btnAnother.addEventListener('click', () => this.loadNewQuestion());
    }
  }

  open() {
    if (!this.modal) return;
    this.modal.classList.add('open');
    this.loadNewQuestion();
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.remove('open');
  }

  loadNewQuestion() {
    this.isAnswering = false;
    if (this.feedback) {
      this.feedback.innerText = '';
      this.feedback.className = 'quiz-feedback';
    }
    if (this.successBox) {
      this.successBox.style.display = 'none';
    }
    if (this.optionsGrid) {
      this.optionsGrid.style.display = 'grid';
    }

    // 50% ra câu đố Toán (Cộng / Trừ), 50% ra câu đố Tiếng Anh qua hình ảnh
    const isMath = Math.random() > 0.5;
    if (isMath) {
      this.generateMathQuestion();
    } else {
      this.generateEnglishQuestion();
    }
  }

  // 1. Sinh câu hỏi Phép tính Cộng / Trừ (Phù hợp cho bé lớp 1 & lớp 2: số nhỏ trong phạm vi 10 - 20)
  generateMathQuestion() {
    this.currentReward = 200; // Thưởng 200 xu cứu trợ
    const isAdd = Math.random() > 0.5;
    let a, b, answer, questionStr;

    if (isAdd) {
      // Phép cộng lớp 1 & lớp 2: Các số nhỏ 1 đến 9, tổng không vượt quá 18
      a = Math.floor(1 + Math.random() * 9); // 1 đến 9
      b = Math.floor(1 + Math.random() * 9); // 1 đến 9
      answer = a + b;
      questionStr = `Em hãy tính:  ${a}  +  ${b}  =  ?`;
    } else {
      // Phép trừ lớp 1 & lớp 2: Kết quả và số trừ là số nhỏ 1 đến 9
      answer = Math.floor(1 + Math.random() * 9); // 1 đến 9
      b = Math.floor(1 + Math.random() * 9);      // 1 đến 9
      a = answer + b;                             // a từ 2 đến 18 (luôn lớn hơn b)
      questionStr = `Em hãy tính:  ${a}  -  ${b}  =  ?`;
    }

    if (this.iconDisplay) this.iconDisplay.innerText = '🔢';
    if (this.promptText) this.promptText.innerText = questionStr;

    // Sinh 4 phương án nhỏ gần kề kết quả (sai lệch ±1, ±2, ±3, luôn > 0)
    const options = [answer];
    const candidateOffsets = [-2, 1, -1, 2, 3, -3].sort(() => Math.random() - 0.5);

    for (const offset of candidateOffsets) {
      if (options.length >= 4) break;
      const fake = answer + offset;
      if (fake > 0 && !options.includes(fake)) {
        options.push(fake);
      }
    }

    // Nếu vẫn chưa đủ 4 phương án, bù các số nhỏ tự nhiên khác
    let fallbackNum = 1;
    while (options.length < 4) {
      if (!options.includes(fallbackNum) && fallbackNum !== answer) {
        options.push(fallbackNum);
      }
      fallbackNum++;
    }

    // Trộn ngẫu nhiên
    this.renderOptions(options, answer);
  }

  // 2. Sinh câu hỏi Từ vựng Tiếng Anh qua hình ảnh
  generateEnglishQuestion() {
    this.currentReward = 150;
    const correctItem = ENGLISH_VOCABULARY[Math.floor(Math.random() * ENGLISH_VOCABULARY.length)];

    if (this.iconDisplay) this.iconDisplay.innerText = correctItem.icon;
    if (this.promptText) {
      this.promptText.innerHTML = `Hình ảnh trên có tên tiếng Anh là gì?<br><span style="font-size: 13px; color: #80d8ff;">(Nghĩa tiếng Việt: ${correctItem.vietnamese})</span>`;
    }

    // Lấy thêm 3 từ tiếng Anh sai từ danh sách
    const options = [correctItem.english];
    while (options.length < 4) {
      const randomItem = ENGLISH_VOCABULARY[Math.floor(Math.random() * ENGLISH_VOCABULARY.length)];
      if (!options.includes(randomItem.english)) {
        options.push(randomItem.english);
      }
    }

    this.renderOptions(options, correctItem.english);
  }

  renderOptions(optionsArray, correctAnswer) {
    if (!this.optionsGrid) return;
    this.optionsGrid.innerHTML = '';

    // Xáo trộn mảng phương án
    const shuffled = [...optionsArray].sort(() => Math.random() - 0.5);

    shuffled.forEach((optValue) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.innerText = optValue;

      btn.addEventListener('click', () => {
        if (this.isAnswering) return;
        this.isAnswering = true;

        if (optValue === correctAnswer) {
          // TRẢ LỜI ĐÚNG!
          btn.classList.add('correct');
          this.game.audio.playCorrect();

          // Thưởng xu cho người chơi
          const cannon = this.game.cannons[this.game.localSlotId];
          cannon.coins += this.currentReward;
          this.game.particles.addFloatingText(
            this.game.width / 2,
            this.game.height / 2,
            `🎉 CHÍNH XÁC! +${this.currentReward.toLocaleString('vi-VN')} XU!`,
            '#ffd700',
            26
          );
          if (this.game.ui) this.game.ui.updateHUD();

          if (this.feedback) {
            this.feedback.className = 'quiz-feedback success';
            this.feedback.innerText = `✓ Tuyệt vời! Bạn nhận được +${this.currentReward.toLocaleString('vi-VN')} Xu!`;
          }

          if (this.rewardAmount) {
            this.rewardAmount.innerText = `+${this.currentReward.toLocaleString('vi-VN')}`;
          }

          if (this.optionsGrid) this.optionsGrid.style.display = 'none';
          if (this.successBox) this.successBox.style.display = 'block';

        } else {
          // TRẢ LỜI SAI: Báo lỗi và tự động đổi câu hỏi khác ngay lập tức!
          btn.classList.add('wrong');
          this.game.audio.playWrong();

          if (this.feedback) {
            this.feedback.className = 'quiz-feedback error';
            this.feedback.innerText = '❌ Chưa chính xác rồi! Đang đổi câu hỏi khác...';
          }

          setTimeout(() => {
            this.loadNewQuestion();
          }, 900);
        }
      });

      this.optionsGrid.appendChild(btn);
    });
  }
}
