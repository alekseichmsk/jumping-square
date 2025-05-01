import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, OAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getCurrentBackground, 
    updateBackground, 
    getCurrentGradient,
    getCurrentPlatformColor,
    getCurrentPlayerColor,
    getCurrentDustColor,
    backgrounds,
    generateRandomBackground,
    resetBackgroundState,
    toggleEffects
} from './backgrounds.js';
import { 
    getAchievementMessage,
    getNextMessage,
    updateMessageTimer,
    getCurrentMessage,
    resetMessages,
    getMessageAlpha,
    updateEmojiParticles,
    clearEmojiParticles
} from './heights.js';

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
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем кнопки при загрузке
    toggleEffectsButton(false);
    toggleFullscreenButton(false);
    
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
const PIXELS_PER_METER = 100; // 100 пикселей = 1 метр
let isMobile = window.innerWidth <= 500;

// Настройки пружины
const SPRING_CHANCE = 0.45; // 45% шанс появления пружины
let lastSpringY = 0; // Последняя позиция пружины
const SPRING_JUMP_FORCE = -25; // Вернули исходную силу прыжка от пружины

// Настройки джетпака
const JETPACK_CHANCE = 0.05; // 5% шанс появления джетпака
const JETPACK_JUMP_FORCE = SPRING_JUMP_FORCE * 5; // В 5 раз выше, чем пружина
let jetpackActive = false;
let jetpackTimer = 0;
const JETPACK_DURATION = 1.2; // длительность эффекта в секундах
const JETPACK_POWER = -60;    // вернули исходную скорость вверх
let jetpackFlameTimer = 0;
const JETPACK_FLAME_FADE = 0.5; // секунды затухания

// Платформы
let platforms = [];
const platformWidth = isMobile ? 80 : 100; // Увеличили с 60/70 до 80/100
const platformHeight = 20;
const platformGap = isMobile ? 130 : 150; // Меньше на мобильных устройствах
const SPRING_MIN_DISTANCE = platformGap - 10; // чуть меньше шага платформ

// Игрок
const player = {
    x: 0,
    y: 0,
    width: isMobile ? 30 : 40,
    height: isMobile ? 30 : 40,
    velocityY: 0,
    velocityX: 0,
    speed: isMobile ? 4 : 5,
    jumpForce: -13 // Вернули исходную силу прыжка
};

let lastFrameTime = performance.now();
const BASE_FPS = 75; // Вернули к исходному значению
let targetVelocityX = 0; // Для плавного управления на мобилке
let targetX = null;

let isPaused = false;

// Удаляем константы для кнопки полноэкранного режима
const PAUSE_BTN_SIZE = 32;
const PAUSE_BTN_MARGIN = 16;

let dustParticles = [];

let isNewRecord = false;
let recordBeatenThisRun = false;
let recordPulseTime = 0;

// Добавляем переменные для отслеживания изменений
let lastLayerIndex = -1;
let layerTransitionTimer = 0;
const LAYER_TRANSITION_FRAMES = 600; // Примерно 10 секунд при 60 FPS
let lastShownAchievement = 0;
let currentMessage = null;
let messageQueue = []; // Очередь сообщений

// Функция для создания частиц эмодзи
function createEmojiParticles(emoji, count = 10) {
    for (let i = 0; i < count; i++) {
        emojiParticles.push({
            x: Math.random() * canvas.width,
            y: -50, // Начинаем сверху экрана
            emoji: emoji,
            size: 20 + Math.random() * 20, // Размер от 20 до 40
            rotation: Math.random() * Math.PI * 2, // Случайный угол поворота
            rotationSpeed: (Math.random() - 0.5) * 0.1, // Скорость вращения
            speed: 2 + Math.random() * 3, // Скорость падения
            wobble: Math.random() * 0.1, // Амплитуда колебаний
            wobbleSpeed: Math.random() * 0.1, // Скорость колебаний
            wobbleOffset: Math.random() * Math.PI * 2, // Смещение фазы колебаний
            alpha: 1
        });
    }
}

// Функция для управления видимостью кнопки эффектов
function toggleEffectsButton(show) {
    const effectsBtn = document.getElementById('effectsBtn');
    if (effectsBtn) {
        effectsBtn.style.display = show ? 'block' : 'none';
    }
}

// Функция для управления видимостью кнопки полноэкранного режима
function toggleFullscreenButton(show) {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.style.display = show ? 'block' : 'none';
    }
}

function createDust(x, y) {
    for (let i = 0; i < 10; i++) {
        dustParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2,
            alpha: 1,
            size: 4 + Math.random() * 4,
            color: getCurrentDustColor()
        });
    }
}

// Инициализация игры
function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found during initialization');
        return;
    }

    // Инициализируем контекст canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }

    isGameOver = false;
    isPaused = false;
    isNewRecord = false;
    recordBeatenThisRun = false;
    recordPulseTime = 0;
    lastLayerIndex = -1;
    layerTransitionTimer = 0;
    lastShownAchievement = 0;
    currentMessage = null;
    messageQueue = []; // Очищаем очередь сообщений
    toggleEffectsButton(false);
    toggleFullscreenButton(true);
    resizeCanvas();
    generatePlatforms();
    setupPlayer();
    setupEventListeners();
    updateBackground(0);
    canvas.style.background = getCurrentGradient();
    gameLoop();
}

// Изменение размера canvas
function resizeCanvas() {
    isMobile = window.innerWidth <= 500;
    
    if (isMobile) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        // На десктопе используем фиксированные размеры
        canvas.width = 500;
        canvas.height = 900;
    }

    // Обновляем размеры игрока и платформ в зависимости от устройства
    player.width = isMobile ? 30 : 40;
    player.height = isMobile ? 30 : 40;
    player.speed = isMobile ? 4 : 5;
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

// Обработчики событий
function setupEventListeners() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        // Перерисовываем текущий фон после изменения размера
        canvas.style.background = getCurrentGradient();
    });
    
    // Обработчик кликов для canvas
    function handleCanvasClick(e) {
        if (!canvas) return;
        
        try {
            const rect = canvas.getBoundingClientRect();
            const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
            const offsetX = (rect.width - canvas.width * scale) / 2;
            const offsetY = (rect.height - canvas.height * scale) / 2;
            
            const clickX = (e.clientX - rect.left - offsetX) / scale;
            const clickY = (e.clientY - rect.top - offsetY) / scale;

            if (isGameOver) {
                if (gameOverAnimationId) {
                    cancelAnimationFrame(gameOverAnimationId);
                    gameOverAnimationId = null;
                }
                restart();
                return;
            }
            
            if (isPaused) {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const r = 60;

                const playDist = Math.sqrt(
                    Math.pow(clickX - cx, 2) +
                    Math.pow(clickY - cy, 2)
                );
                if (playDist <= r) {
                    isPaused = false;
                    lastFrameTime = performance.now();
                    gameLoop();
                    return;
                }
            } else {
                // Проверяем клик по кнопке паузы
                const pauseBtnX = canvas.width - PAUSE_BTN_SIZE / 2 - PAUSE_BTN_MARGIN;
                const pauseBtnY = PAUSE_BTN_SIZE / 2 + PAUSE_BTN_MARGIN;
                const pauseDistance = Math.sqrt(
                    Math.pow(clickX - pauseBtnX, 2) + 
                    Math.pow(clickY - pauseBtnY, 2)
                );
                
                if (pauseDistance <= PAUSE_BTN_SIZE / 2) {
                    isPaused = true;
                    return;
                }
            }
        } catch (error) {
            console.error('Error handling canvas click:', error);
        }
    }

    // Удаляем старые обработчики перед добавлением новых
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.addEventListener('click', handleCanvasClick);

    // Touch controls
    function handleTouchStart(e) {
        if (!canvas) return;
        
        try {
            if (isGameOver) {
                if (gameOverAnimationId) {
                    cancelAnimationFrame(gameOverAnimationId);
                    gameOverAnimationId = null;
                }
                restart();
                return;
            }
            
            const rect = canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const screenCenter = rect.width / 2;
            
            if (touchX > screenCenter) {
                player.velocityX = player.speed;
            } else {
                player.velocityX = -player.speed;
            }
        } catch (error) {
            console.error('Error handling touch start:', error);
        }
    }

    function handleTouchEnd() {
        if (!isGameOver) {
            player.velocityX = 0;
        }
    }

    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    // Keyboard controls
    function handleKeyDown(e) {
        try {
            if (isGameOver || !canvas) return;
            
            // Проверяем, что событие пришло от клавиатуры
            if (e.type === 'keydown') {
                if(e.key === 'ArrowLeft') {
                    player.velocityX = -player.speed;
                }
                if(e.key === 'ArrowRight') {
                    player.velocityX = player.speed;
                }
            }
        } catch (error) {
            console.error('Error handling key down:', error);
        }
    }

    function handleKeyUp(e) {
        try {
            if (isGameOver || !canvas) return;
            
            // Проверяем, что событие пришло от клавиатуры
            if (e.type === 'keyup') {
                if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    player.velocityX = 0;
                }
            }
        } catch (error) {
            console.error('Error handling key up:', error);
        }
    }

    // Удаляем старые обработчики перед добавлением новых
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // Добавляем обработчики только если canvas существует
    if (canvas) {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
    }

    // Автоматическая пауза при сворачивании вкладки
    function handleVisibilityChange() {
        try {
            if (document.hidden && !isGameOver && canvas) {
                isPaused = true;
            }
        } catch (error) {
            console.error('Error handling visibility change:', error);
        }
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Обработчик изменения полноэкранного режима
    document.addEventListener('fullscreenchange', () => {
        resizeCanvas();
        // Перерисовываем текущий фон после изменения полноэкранного режима
        canvas.style.background = getCurrentGradient();
    });
}

// Проверка столкновений
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Функция для обновления счета
function updateScore() {
    // Используем totalScroll для подсчета общей пройденной высоты
    const totalHeight = totalScroll;
    highestPoint = Math.max(totalHeight, highestPoint);
    const meters = Math.floor(totalHeight / PIXELS_PER_METER);
    
    if (meters !== score) {
        score = meters;
        const newMessage = getAchievementMessage(meters);
        if (newMessage) {
            currentMessage = newMessage;
            layerTransitionTimer = LAYER_TRANSITION_FRAMES;
        }
    }
}

// Показ экрана окончания игры
function showGameOver() {
    // Скрываем кнопку полноэкранного режима
    toggleFullscreenButton(false);
    
    // Устанавливаем состояние перед первым показом
    isGameOver = true;
    recordBeatenThisRun = false;
    recordPulseTime = 0;
    
    // Очищаем canvas перед отрисовкой
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Полупрозрачный фон
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Текст окончания игры
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = isMobile ? '24px Arial' : '30px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText('Игра окончена', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = isMobile ? '16px Arial' : '20px Arial';
    ctx.fillText(`пройдено: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`рекорд: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
    
    // Пульсирующая надпись
    const pulseTime = performance.now() / 1000;
    const pulseScale = 1 + Math.sin(pulseTime * 2) * 0.2;
    const pulseAlpha = 0.7 + Math.sin(pulseTime * 2) * 0.3;
    
    ctx.font = `bold ${(isMobile ? 18 : 22) * pulseScale}px Arial`;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillText('Нажми для рестарта', canvas.width / 2, canvas.height / 2 + 80);
    ctx.restore();
    
    // Запускаем следующий кадр анимации
    gameOverAnimationId = requestAnimationFrame(showGameOver);
}

// Перезапуск игры
function restart() {
    // Отменяем все анимации
    if (gameOverAnimationId) {
        cancelAnimationFrame(gameOverAnimationId);
        gameOverAnimationId = null;
    }
    
    // Сбрасываем все состояния игры
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
    dustParticles = [];
    jetpackActive = false;
    jetpackTimer = 0;
    jetpackFlameTimer = 0;
    lastShownAchievement = 0;
    currentMessage = null;
    messageQueue = []; // Очищаем очередь сообщений
    clearEmojiParticles();
    
    // Сбрасываем состояние игрока
    player.velocityY = 0;
    player.velocityX = 0;
    
    // Генерируем новые цвета фона
    const newBackgrounds = Array(14).fill(null).map(() => generateRandomBackground());
    backgrounds.splice(0, backgrounds.length, ...newBackgrounds);
    resetBackgroundState();
    
    // Пересоздаем игровые объекты
    generatePlatforms();
    setupPlayer();
    
    // Обновляем фон
    updateBackground(0);
    canvas.style.background = getCurrentGradient();
    
    // Показываем кнопки
    toggleEffectsButton(false);
    toggleFullscreenButton(true);
    
    // Запускаем игру
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
    resetMessages();
}

// Основной игровой цикл
function gameLoop() {
    if (isGameOver) {
        showGameOver();
        return;
    }

    if (isPaused) {
        // Показываем кнопку эффектов во время паузы
        toggleEffectsButton(true);
        
        // Обычный экран паузы
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Кнопка play
        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 60;
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

        return;
    } else {
        // Скрываем кнопку эффектов когда игра активна
        toggleEffectsButton(false);
    }

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
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
    
    // Обновляем фон и все цвета
    updateBackground(score);
    const currentLayerIndex = Math.floor(score / 250) % backgrounds.length;
    
    // Проверяем, изменился ли слой
    if (currentLayerIndex !== lastLayerIndex) {
        lastLayerIndex = currentLayerIndex;
        layerTransitionTimer = LAYER_TRANSITION_FRAMES;
    }
    
    // Применяем текущий градиент
    canvas.style.background = getCurrentGradient(score);

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
        ctx.fillStyle = getCurrentPlatformColor();
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
    
    ctx.fillStyle = getCurrentPlayerColor();
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
    ctx.fillText(`${score}м`, canvas.width / 2, 18);
    ctx.shadowBlur = 0;
    ctx.restore();

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

    // Кнопка паузы
    ctx.save();
    
    // Вычисляем размер кнопки с учетом масштабирования
    const scale = Math.min(canvas.width / 400, canvas.height / 720);
    const btnSize = 32 * scale; // Уменьшили базовый размер кнопки
    const margin = 16 * scale;
    
    // Позиция кнопки
    const btnX = canvas.width - btnSize - margin;
    const btnY = margin;
    
    // Фон кнопки
    ctx.beginPath();
    ctx.arc(btnX + btnSize/2, btnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    
    // Обводка кнопки
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();
    
    // Значок паузы
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const barWidth = 4 * scale;
    const barHeight = 16 * scale;
    const barSpacing = 4 * scale;
    const barX = btnX + (btnSize - barWidth * 2 - barSpacing) / 2;
    const barY = btnY + (btnSize - barHeight) / 2;
    
    // Рисуем две полоски паузы
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillRect(barX + barWidth + barSpacing, barY, barWidth, barHeight);
    
    ctx.restore();

    // Обновление и отрисовка пыли
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        const p = dustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.03;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1.0;
        if (p.alpha <= 0) dustParticles.splice(i, 1);
    }

    // Показываем сообщения из очереди
    const message = getNextMessage();
    if (message) {
        const alpha = getMessageAlpha();
        ctx.save();
        
        // Настраиваем стиль текста
        ctx.font = isMobile ? 'bold 18px Arial' : 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 3;
        
        // Разбиваем текст на две строки
        const words = message.split(' ');
        const firstLine = words.slice(0, 3).join(' ');
        const secondLine = words.slice(3).join(' ');
        
        // Рисуем сообщение в две строки под счетом
        ctx.fillText(firstLine, canvas.width / 2, 60);
        ctx.fillText(secondLine, canvas.width / 2, 90);
        
        ctx.restore();
        updateMessageTimer();
    }

    // Обновляем и рисуем частицы эмодзи
    updateEmojiParticles(ctx);

    requestAnimationFrame(gameLoop);
}

// Создаем визуальный эффект пружины
function createSpringEffect(x, y) {
    // Создаем частицы для эффекта пружины
    for (let i = 0; i < 8; i++) {
        dustParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 5,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 8 - 4,
            alpha: 1,
            size: 4 + Math.random() * 4,
            color: '#FFD700' // Золотой цвет для пружины
        });
    }

    // Анимация сжатия пружины
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 10;
    
    // Рисуем пружину в сжатом состоянии
    ctx.fillRect(x - 10, y - 5, 20, 5);
    
    // Добавляем блики
    ctx.fillStyle = '#FFF';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x - 8, y - 4, 16, 2);
    
    ctx.restore();
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

// Добавляем обработчик для кнопки эффектов
document.getElementById('effectsBtn').addEventListener('click', () => {
    const effectsEnabled = toggleEffects();
    const effectsBtn = document.getElementById('effectsBtn');
    if (effectsEnabled) {
        effectsBtn.classList.remove('disabled');
    } else {
        effectsBtn.classList.add('disabled');
    }
});

export {
    startGameWithUser,
    restart,
    toggleEffectsButton,
    toggleFullscreenButton,
    saveHighScore,
    loadHighScore
}; 