import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, OAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGVzDuGvlNrWwwq-IoOoiqT8uqdXEWs3c",
  authDomain: "jumping-square.firebaseapp.com",
  projectId: "jumping-square",
  storageBucket: "jumping-square.appspot.com",
  messagingSenderId: "483719577912",
  appId: "1:483719577912:web:d34d130282630cc84401cd",
  measurementId: "G-B5EBKE3HZZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let firebaseUserId = null;
let highScore = 0;
let isGameStarted = false;
let gameOverAnimationId = null; // ID анимации экрана окончания игры

// Координаты и размеры кнопок авторизации на canvas
const authButtons = [
  {
    key: 'google',
    text: 'Войти через Google',
    color: '#fff',
    textColor: '#222',
    borderColor: '#e0e0e0',
    y: 0, // будет вычислено динамически
    onClick: () => {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider).catch((error) => {
        alert('Ошибка входа: ' + error.message);
      });
    }
  },
  // {
  //   key: 'apple',
  //   text: 'Войти через Apple',
  //   color: '#111',
  //   textColor: '#fff',
  //   borderColor: '#222',
  //   y: 0, // будет вычислено динамически
  //   onClick: () => {
  //     const provider = new OAuthProvider('apple.com');
  //     signInWithPopup(auth, provider).catch((error) => {
  //       alert('Ошибка входа через Apple: ' + error.message);
  //     });
  //   }
  // }
];

function drawAuthButtons() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Фон
  ctx.fillStyle = '#23272a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Заголовок
  ctx.save();
  ctx.font = 'bold 2.2rem Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 10;
  ctx.fillText('Вход в игру', canvas.width / 2, canvas.height / 2 - 120);
  ctx.restore();
  // Кнопки
  const btnWidth = Math.min(380, canvas.width * 0.9);
  const btnHeight = 64;
  const gap = 32;
  const startY = canvas.height / 2 - btnHeight - gap / 2;
  authButtons.forEach((btn, i) => {
    const x = (canvas.width - btnWidth) / 2;
    const y = startY + i * (btnHeight + gap);
    btn.y = y;
    // Кнопка
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + 32, y);
    ctx.lineTo(x + btnWidth - 32, y);
    ctx.quadraticCurveTo(x + btnWidth, y, x + btnWidth, y + 32);
    ctx.lineTo(x + btnWidth, y + btnHeight - 32);
    ctx.quadraticCurveTo(x + btnWidth, y + btnHeight, x + btnWidth - 32, y + btnHeight);
    ctx.lineTo(x + 32, y + btnHeight);
    ctx.quadraticCurveTo(x, y + btnHeight, x, y + btnHeight - 32);
    ctx.lineTo(x, y + 32);
    ctx.quadraticCurveTo(x, y, x + 32, y);
    ctx.closePath();
    ctx.fillStyle = btn.color;
    ctx.strokeStyle = btn.borderColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Текст
    ctx.font = 'bold 1.5rem Arial';
    ctx.fillStyle = btn.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.text, x + btnWidth / 2, y + btnHeight / 2);
    ctx.restore();
  });
}

// Обработка кликов по canvas для авторизации
canvas.addEventListener('click', (e) => {
  if (!auth.currentUser) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const btnWidth = Math.min(380, canvas.width * 0.9);
    const btnHeight = 64;
    authButtons.forEach((btn) => {
      const x = (canvas.width - btnWidth) / 2;
      const y = btn.y;
      if (
        clickX >= x && clickX <= x + btnWidth &&
        clickY >= y && clickY <= y + btnHeight
      ) {
        btn.onClick();
      }
    });
  }
});

// Показываем лоадер сразу при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    drawCanvasLoader('Проверка авторизации…');
    // Таймер: если через 5 секунд пользователь не определён — показать кнопки авторизации
    setTimeout(() => {
        if (!auth.currentUser) {
            cancelAnimationFrame(window._canvasLoaderAnim);
            drawAuthButtons();
        }
    }, 5000);
});

onAuthStateChanged(auth, (user) => {
  if (user && !isGameStarted) {
    cancelAnimationFrame(window._canvasLoaderAnim);
    drawCanvasLoader('Авторизация успешна!');
    setTimeout(() => {
      cancelAnimationFrame(window._canvasLoaderAnim);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      startGameWithUser(user);
    }, 1000);
  } else if (!user) {
    drawAuthButtons();
  }
});

// Для анимации пыли при загрузке
let loaderDustParticles = [];
let loaderJumpPhase = 0;
let loaderLastGrounded = false;

function drawCanvasLoader(statusText = 'Загрузка…') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Параметры квадрата
    const size = 48;
    const baseY = canvas.height / 2 - size / 2 - 30;
    const x = canvas.width / 2 - size / 2;
    // Прыжок по синусоиде
    loaderJumpPhase += 0.06;
    const jump = Math.abs(Math.sin(loaderJumpPhase)) * 80;
    const y = baseY - jump;
    // Определяем момент "приземления"
    const grounded = Math.abs(Math.sin(loaderJumpPhase)) < 0.05;
    if (grounded && !loaderLastGrounded) {
        // Создаём пыль при приземлении
        for (let i = 0; i < 14; i++) {
            loaderDustParticles.push({
                x: canvas.width / 2,
                y: baseY + size / 2 + 8,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 2 - 1,
                alpha: 1,
                size: 6 + Math.random() * 4
            });
        }
    }
    loaderLastGrounded = grounded;
    // Рисуем пыль
    for (let i = loaderDustParticles.length - 1; i >= 0; i--) {
        const p = loaderDustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.alpha -= 0.025;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = '#bbb';
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1.0;
        if (p.alpha <= 0) loaderDustParticles.splice(i, 1);
    }
    // Рисуем квадрат
    ctx.save();
    ctx.fillStyle = '#FF6B6B';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 16;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
    ctx.restore();
    // Текст статуса
    ctx.save();
    ctx.font = 'bold 2rem Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#23272a';
    ctx.shadowBlur = 8;
    ctx.fillText(statusText, canvas.width / 2, baseY + size + 60);
    ctx.restore();
    // Анимация
    window._canvasLoaderAnim = requestAnimationFrame(() => drawCanvasLoader(statusText));
}

function startGameWithUser(user) {
  window.firebaseUserId = user.uid;
  loaderDustParticles = [];
  loaderJumpPhase = 0;
  loaderLastGrounded = false;
  drawCanvasLoader('Загрузка…');
  loadHighScore(user.uid).then(score => {
    highScore = score;
    window.highScore = highScore;
    cancelAnimationFrame(window._canvasLoaderAnim);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    init();
    isGameStarted = true;
  });
}

// Game variables
let score = 0;
let isGameOver = false;
let lastY = 0; // Track last Y position
let totalScroll = 0; // Track total scroll amount
let platformTouched = false; // Track if platform was touched
let highestPoint = 0; // Track highest point reached
let canScore = false; // Track if we can score points
const PIXELS_PER_METER = 10; // 10 пикселей = 1 метр
let isMobile = window.innerWidth <= 500;

// Настройки пружины
const SPRING_CHANCE = 0.45; // 45% шанс появления пружины
let lastSpringY = 0; // Последняя позиция пружины
const SPRING_JUMP_FORCE = -25; // Увеличили силу прыжка от пружины

// Настройки джетпака
const JETPACK_CHANCE = 0.05; // 5% шанс появления джетпака
const JETPACK_JUMP_FORCE = SPRING_JUMP_FORCE * 5; // В 5 раз выше, чем пружина
let jetpackActive = false;
let jetpackTimer = 0;
const JETPACK_DURATION = 1.2; // длительность эффекта в секундах
const JETPACK_POWER = -60;    // постоянная высокая скорость вверх
let jetpackFlameTimer = 0;
const JETPACK_FLAME_FADE = 0.5; // секунды затухания

// Платформы
let platforms = [];
const platformWidth = isMobile ? 60 : 70; // Меньше на мобильных устройствах
const platformHeight = 20;
const platformGap = isMobile ? 130 : 150; // Меньше на мобильных устройствах
const SPRING_MIN_DISTANCE = platformGap - 10; // чуть меньше шага платформ

// Игрок
const player = {
    x: 0,
    y: 0,
    width: isMobile ? 30 : 40, // Меньше на мобильных устройствах
    height: isMobile ? 30 : 40,
    velocityY: 0,
    velocityX: 0,
    speed: isMobile ? 4 : 5, // Немного медленнее на мобильных устройствах
    jumpForce: -13
};

let lastFrameTime = performance.now();
const BASE_FPS = 75;
let targetVelocityX = 0; // Для плавного управления на мобилке
let targetX = null;

let isPaused = false;

// Координаты и размеры кнопки паузы (в углу)
const PAUSE_BTN_SIZE = 40;
const PAUSE_BTN_MARGIN = 16;

let dustParticles = [];

let isNewRecord = false;
let recordBeatenThisRun = false;
let recordPulseTime = 0;

const LOGOUT_BTN_SIZE = 40; // Размер кнопки выхода
let showLogoutConfirm = false;

function createDust(x, y) {
    for (let i = 0; i < 10; i++) {
        dustParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2,
            alpha: 1,
            size: 4 + Math.random() * 4
        });
    }
}

// Инициализация игры
function init() {
    isGameOver = false;
    isPaused = false;
    isNewRecord = false;
    recordBeatenThisRun = false;
    recordPulseTime = 0;
    resizeCanvas();
    generatePlatforms();
    setupPlayer();
    setupEventListeners();
    gameLoop();
}

// Изменение размера canvas
function resizeCanvas() {
    isMobile = window.innerWidth <= 500;
    // Для мобильных — используем максимально доступную высоту
    const height = window.innerHeight || document.documentElement.clientHeight;
    canvas.width = isMobile ? window.innerWidth : Math.min(window.innerWidth, 500);
    canvas.height = height;
    // Обновляем размеры игрока и платформ в зависимости от устройства
    player.width = isMobile ? 30 : 40;
    player.height = isMobile ? 30 : 40;
    player.speed = isMobile ? 4 : 5;
    // Пересоздаем платформы с новыми размерами
    generatePlatforms();
}

// Генерация платформ
function generatePlatforms() {
    platforms = [];
    let y = canvas.height - 50;
    let prevHadSpring = false;
    let prevHadJetpack = false;
    // Первая платформа
    platforms.push({
        x: (canvas.width - platformWidth) / 2,
        y: y,
        width: platformWidth,
        height: platformHeight,
        hasSpring: false,
        hasJetpack: false
    });
    // Остальные платформы
    while(y > 0) {
        y -= platformGap;
        const platform = {
            x: Math.random() * (canvas.width - platformWidth),
            y: y,
            width: platformWidth,
            height: platformHeight,
            hasSpring: false,
            hasJetpack: false
        };
        // Джетпак (приоритетнее пружины)
        if (Math.random() < JETPACK_CHANCE && !prevHadJetpack && !prevHadSpring) {
            platform.hasJetpack = true;
            prevHadJetpack = true;
            prevHadSpring = false;
        } else if (Math.random() < SPRING_CHANCE && !prevHadSpring && !prevHadJetpack) {
            platform.hasSpring = true;
            prevHadSpring = true;
            prevHadJetpack = false;
        } else {
            prevHadSpring = false;
            prevHadJetpack = false;
        }
        platforms.push(platform);
    }
}

// Настройка игрока
function setupPlayer() {
    player.x = platforms[0].x + platformWidth / 2 - player.width / 2;
    player.y = platforms[0].y - player.height;
    player.velocityY = 0;
    player.velocityX = 0;
}

// Отрисовка кнопки выхода (теперь внизу под play)
function drawLogoutButton() {
    const cx = canvas.width / 2;
    const bottomOffset = 50;
    const logoutY = canvas.height - bottomOffset;

    // Только надпись
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText('Выйти из аккаунта', cx, logoutY);
    ctx.restore();
}

function handleLogoutClick(x, y) {
    const cx = canvas.width / 2;
    const bottomOffset = 50;
    const logoutY = canvas.height - bottomOffset;
    // Проверяем попадание по надписи (ширина и высота зоны клика)
    const textWidth = 180;
    const textHeight = 32;
    return (
        x >= cx - textWidth / 2 &&
        x <= cx + textWidth / 2 &&
        y >= logoutY - textHeight / 2 &&
        y <= logoutY + textHeight / 2
    );
}

function drawLogoutConfirm() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 40;
    const width = Math.min(340, canvas.width * 0.9);
    const height = 170;
    // Фон модального окна
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = '#23272a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(cx - width/2 + 20, cy - height/2);
    ctx.lineTo(cx + width/2 - 20, cy - height/2);
    ctx.quadraticCurveTo(cx + width/2, cy - height/2, cx + width/2, cy - height/2 + 20);
    ctx.lineTo(cx + width/2, cy + height/2 - 20);
    ctx.quadraticCurveTo(cx + width/2, cy + height/2, cx + width/2 - 20, cy + height/2);
    ctx.lineTo(cx - width/2 + 20, cy + height/2);
    ctx.quadraticCurveTo(cx - width/2, cy + height/2, cx - width/2, cy + height/2 - 20);
    ctx.lineTo(cx - width/2, cy - height/2 + 20);
    ctx.quadraticCurveTo(cx - width/2, cy - height/2, cx - width/2 + 20, cy - height/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Текст
    ctx.save();
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Вы действительно хотите выйти?', cx, cy - 30);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#bbb';
    ctx.fillText('Ваш прогресс сохранён', cx, cy - 5);
    ctx.restore();
    // Кнопки
    drawConfirmButton(cx - 60, cy + 40, 56, 36, '#FF6B6B', 'Да', '#fff');
    drawConfirmButton(cx + 60, cy + 40, 56, 36, '#444', 'Нет', '#fff');
}

function drawConfirmButton(x, y, w, h, color, text, textColor) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w/2 + 12, y - h/2);
    ctx.lineTo(x + w/2 - 12, y - h/2);
    ctx.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + 12);
    ctx.lineTo(x + w/2, y + h/2 - 12);
    ctx.quadraticCurveTo(x + w/2, y + h/2, x + w/2 - 12, y + h/2);
    ctx.lineTo(x - w/2 + 12, y + h/2);
    ctx.quadraticCurveTo(x - w/2, y + h/2, x - w/2, y + h/2 - 12);
    ctx.lineTo(x - w/2, y - h/2 + 12);
    ctx.quadraticCurveTo(x - w/2, y - h/2, x - w/2 + 12, y - h/2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

// Обработчики событий
function setupEventListeners() {
    window.addEventListener('resize', resizeCanvas);
    
    // Обработчик клика для рестарта игры, паузы и выхода
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Если открыто окно подтверждения выхода
        if (showLogoutConfirm) {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2 + 40;
            // Кнопка 'Да'
            if (
                clickX >= cx - 60 - 28 && clickX <= cx - 60 + 28 &&
                clickY >= cy + 40 - 18 && clickY <= cy + 40 + 18
            ) {
                showLogoutConfirm = false;
                auth.signOut().then(() => {
                    location.reload();
                }).catch((error) => {
                    alert('Ошибка при выходе: ' + error.message);
                });
                return;
            }
            // Кнопка 'Нет'
            if (
                clickX >= cx + 60 - 28 && clickX <= cx + 60 + 28 &&
                clickY >= cy + 40 - 18 && clickY <= cy + 40 + 18
            ) {
                showLogoutConfirm = false;
                return;
            }
            // Клик вне кнопок — ничего не делаем
            return;
        }

        // Проверяем клик по надписи выхода (используем масштабированные координаты)
        if (isPaused && auth.currentUser && handleLogoutClick(clickX, clickY)) {
            showLogoutConfirm = true;
            drawLogoutConfirm();
            requestAnimationFrame(gameLoop); // чтобы цикл не останавливался
            return;
        }

        if (isGameOver) {
            restart();
            return;
        }
        
        if (isPaused) {
            // Проверяем клик по кнопке play в центре экрана
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = 60;
            const distance = Math.sqrt(
                Math.pow(clickX - cx, 2) + 
                Math.pow(clickY - cy, 2)
            );
            if (distance <= r) {
                isPaused = false;
                lastFrameTime = performance.now();
                gameLoop();
                return;
            }
        } else {
            // Проверяем клик по кнопке паузы
            const pauseBtnX = canvas.width - PAUSE_BTN_SIZE / 2 - PAUSE_BTN_MARGIN;
            const pauseBtnY = PAUSE_BTN_SIZE / 2 + PAUSE_BTN_MARGIN;
            const distance = Math.sqrt(
                Math.pow(clickX - pauseBtnX, 2) + 
                Math.pow(clickY - pauseBtnY, 2)
            );
            if (distance <= PAUSE_BTN_SIZE / 2) {
                isPaused = true;
            }
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        if(e.key === 'ArrowLeft') player.velocityX = -player.speed;
        if(e.key === 'ArrowRight') player.velocityX = player.speed;
    });

    document.addEventListener('keyup', (e) => {
        if (isGameOver) return;
        if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.velocityX = 0;
    });

    // Touch controls for mobile
    canvas.addEventListener('touchstart', (e) => {
        if (isGameOver) {
            restart();
            return;
        }
        targetX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (isGameOver) return;
        targetX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchend', () => {
        if (isGameOver) return;
        targetX = null;
    });

    // Автоматическая пауза при сворачивании вкладки/приложения
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isPaused = true;
            }
            // При возвращении во вкладку пауза не снимается автоматически!
        });
    }
}

// Проверка столкновений
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Обновление счета
function updateScore() {
    // Общая высота = прокрутка + текущая видимая высота
    const totalHeight = totalScroll + (canvas.height - player.y);
    
    if (totalHeight > highestPoint) {
        highestPoint = totalHeight;
        // Конвертируем пиксели в метры
        const meters = Math.floor(highestPoint / PIXELS_PER_METER);
        score = meters;
        
        if (score > highScore) {
            highScore = score;
            isNewRecord = true;
            recordBeatenThisRun = true;
            // Сохраняем рекорд только в Firestore
            if (window.firebaseUserId) {
                saveHighScore(window.firebaseUserId, highScore);
            }
        } else {
            isNewRecord = false;
        }
    }
}

// Показ экрана окончания игры
function showGameOver() {
    isGameOver = true;
    recordBeatenThisRun = false;
    recordPulseTime = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = isMobile ? '24px Arial' : '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = isMobile ? '16px Arial' : '20px Arial';
    ctx.fillText(`пройдено: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`рекорд: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
    
    // Пульсирующая надпись "Нажми для рестарта"
    const pulseTime = performance.now() / 1000; // время в секундах
    const pulseScale = 1 + Math.sin(pulseTime * 2) * 0.2; // увеличил амплитуду пульсации размера
    const pulseAlpha = 0.7 + Math.sin(pulseTime * 2) * 0.3; // пульсация прозрачности
    
    ctx.save();
    const baseFontSize = isMobile ? 18 : 22;
    ctx.font = `bold ${baseFontSize * pulseScale}px Arial`; // применяем пульсацию к размеру шрифта
    ctx.globalAlpha = pulseAlpha;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText('Нажми для рестарта', canvas.width / 2, canvas.height / 2 + 80);
    ctx.restore();
    
    // Запускаем анимацию пульсации только если игра окончена
    if (isGameOver) {
        gameOverAnimationId = requestAnimationFrame(showGameOver);
    }
}

// Перезапуск игры
function restart() {
    // Останавливаем анимацию экрана окончания игры
    if (gameOverAnimationId) {
        cancelAnimationFrame(gameOverAnimationId);
        gameOverAnimationId = null;
    }
    
    isGameOver = false;
    isPaused = false;
    score = 0;
    highestPoint = 0;
    totalScroll = 0;
    lastSpringY = 0;
    isNewRecord = false;
    recordBeatenThisRun = false;
    recordPulseTime = 0;
    targetX = null;
    generatePlatforms();
    setupPlayer();
    gameLoop();
}

// Основной игровой цикл
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // ОЧИСТКА ВСЕГДА!

    if (isGameOver) {
        showGameOver();
        return;
    }

    if (isPaused) {
        if (showLogoutConfirm) {
            drawLogoutButton();
            drawLogoutConfirm();
            requestAnimationFrame(gameLoop);
            return;
        }
        // Обычный экран паузы с кнопкой play
        // Затемнение
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Кнопка play (белый круг с тенью и треугольник)
        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 60;
        // Круг
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        // Треугольник ▶
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 30);
        ctx.lineTo(cx + 32, cy);
        ctx.lineTo(cx - 18, cy + 30);
        ctx.closePath();
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.restore();
        // Надпись 'Пауза'
        ctx.save();
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.fillText('Пауза', cx, cy + r + 24);
        ctx.restore();
        drawLogoutButton();
        return;
    }

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000; // в секундах
    lastFrameTime = now;

    // Движение на основе времени
    player.x += player.velocityX * delta * BASE_FPS;
    player.y += player.velocityY * delta * BASE_FPS;
    player.velocityY += 0.5 * delta * BASE_FPS;

    // Проверка окончания игры
    if (player.y > canvas.height) {
        showGameOver();
        return;
    }

    // Границы экрана
    if (player.x > canvas.width) player.x = 0 - player.width;
    if (player.x + player.width < 0) player.x = canvas.width;

    // Прокрутка
    if(player.y < canvas.height / 2) {
        const scrollAmount = Math.abs(player.velocityY * delta * BASE_FPS);
        totalScroll += scrollAmount;
        player.y = canvas.height / 2;
        platforms.forEach(platform => {
            platform.y += scrollAmount;
        });
        // Прокручиваем частицы пыли вместе с платформами
        dustParticles.forEach(p => {
            p.y += scrollAmount;
        });
    }

    // Обновление счета каждый кадр
    updateScore();

    // Удаление платформ ниже экрана
    platforms = platforms.filter(platform => platform.y < canvas.height);

    // Генерация новых платформ сверху
    if (platforms.length > 0) {
        let topPlatform = platforms.reduce((min, p) => p.y < min.y ? p : min, platforms[0]);
        let prevHadSpringTop = platforms[platforms.length-1]?.hasSpring || false;
        let prevHadJetpackTop = platforms[platforms.length-1]?.hasJetpack || false;
        while(topPlatform.y > 0) {
            const platform = {
                x: Math.random() * (canvas.width - platformWidth),
                y: topPlatform.y - platformGap,
                width: platformWidth,
                height: platformHeight,
                hasSpring: false,
                hasJetpack: false
            };
            if (Math.random() < JETPACK_CHANCE && !prevHadJetpackTop && !prevHadSpringTop) {
                platform.hasJetpack = true;
                prevHadJetpackTop = true;
                prevHadSpringTop = false;
            } else if (Math.random() < SPRING_CHANCE && !prevHadSpringTop && !prevHadJetpackTop) {
                platform.hasSpring = true;
                prevHadSpringTop = true;
                prevHadJetpackTop = false;
            } else {
                prevHadSpringTop = false;
                prevHadJetpackTop = false;
            }
            platforms.push(platform);
            topPlatform = platform;
        }
    }

    // Проверка столкновений
    platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            if (player.velocityY > 0) {
                if (platform.hasJetpack) {
                    jetpackActive = true;
                    jetpackTimer = 0;
                    createJetpackEffect(platform.x + platform.width / 2, platform.y);
                } else if (platform.hasSpring) {
                    player.velocityY = SPRING_JUMP_FORCE;
                    createSpringEffect(platform.x + platform.width / 2, platform.y);
                } else {
                    player.velocityY = player.jumpForce;
                }
                createDust(player.x + player.width / 2, platform.y);
            }
        }
    });

    // Отрисовка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    platforms.forEach(platform => {
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        if (platform.hasJetpack) {
            ctx.fillStyle = '#FF9800'; // оранжевый
            ctx.fillRect(platform.x + platform.width / 2 - 8, platform.y - 12, 16, 12);
        }
        if (platform.hasSpring) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(platform.x + platform.width / 2 - 5, platform.y - 5, 10, 5);
        }
    });
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Анимация огня под игроком при jetpackActive
    if (jetpackActive || jetpackFlameTimer > 0) {
        for (let i = 0; i < 5; i++) {
            const flameX = player.x + player.width / 2 + (Math.random() - 0.5) * player.width * 0.6;
            const flameY = player.y + player.height + Math.random() * 10;
            const flameSize = 6 + Math.random() * 6;
            const colors = ['#FFD700', '#FF9800', '#FF3D00'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.globalAlpha = 0.7 + Math.random() * 0.3;
            ctx.fillRect(flameX - flameSize / 2, flameY, flameSize, flameSize);
            ctx.globalAlpha = 1.0;
        }
    }

    // Выводим очки по центру сверху
    if (recordBeatenThisRun) recordPulseTime += delta;
    else recordPulseTime = 0;
    let fontSize = (isMobile ? 32 : 40);
    if (recordBeatenThisRun) fontSize *= 1.2 + 0.08 * Math.sin(recordPulseTime * 6);
    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText(score, canvas.width / 2, 18);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (isMobile && targetX !== null) {
        const playerCenter = player.x + player.width / 2;
        const dx = targetX - playerCenter;
        const maxMove = player.speed * delta * BASE_FPS;
        if (Math.abs(dx) > 1) {
            player.x += Math.sign(dx) * Math.min(Math.abs(dx), maxMove);
        }
    }

    if (jetpackActive) {
        player.velocityY = JETPACK_POWER;
        jetpackTimer += delta;
        if (jetpackTimer >= JETPACK_DURATION) {
            jetpackActive = false;
            jetpackFlameTimer = JETPACK_FLAME_FADE;
        }
    } else if (jetpackFlameTimer > 0) {
        jetpackFlameTimer -= delta;
    }

    // Кнопка паузы в углу
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width - PAUSE_BTN_SIZE / 2 - PAUSE_BTN_MARGIN, PAUSE_BTN_SIZE / 2 + PAUSE_BTN_MARGIN, PAUSE_BTN_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Рисуем значок "⏸"
    ctx.fillStyle = '#222';
    ctx.fillRect(canvas.width - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN + 12, PAUSE_BTN_MARGIN + 10, 6, 20);
    ctx.fillRect(canvas.width - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN + 22, PAUSE_BTN_MARGIN + 10, 6, 20);
    ctx.restore();

    // Обновление и отрисовка пыли
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        const p = dustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.03;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = '#bbb';
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); // квадрат
        ctx.globalAlpha = 1.0;
        if (p.alpha <= 0) dustParticles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

// Создаем визуальный эффект пружины
function createSpringEffect(x, y) {
    // Анимация сжатия пружины
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - 10, y - 5, 20, 5);
    setTimeout(() => {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - 10, y - 10, 20, 10);
    }, 50);
}

// Визуальный эффект для джетпака
function createJetpackEffect(x, y) {
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(x, y - 20, 18, 0, Math.PI * 2);
    ctx.fill();
    setTimeout(() => {
        ctx.clearRect(x - 20, y - 40, 40, 40);
    }, 80);
}

// Сохранение рекорда
async function saveHighScore(userId, score) {
  if (!userId) {
    return;
  }
  try {
    // Получаем текущий рекорд из Firestore
    const docRef = doc(db, "highscores", userId);
    const docSnap = await getDoc(docRef);
    const currentScore = docSnap.exists() ? docSnap.data().score : 0;

    // Сохраняем только если новый рекорд больше
    if (score > currentScore) {
      await setDoc(docRef, { score });
    }
  } catch (e) {
  }
}

// Загрузка рекорда
async function loadHighScore(userId) {
  try {
    const docSnap = await getDoc(doc(db, "highscores", userId));
    if (docSnap.exists()) {
      return docSnap.data().score;
    } else {
      return 0;
    }
  } catch (e) {
    return 0;
  }
} 