// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let score = 0;
let highScore = 0;
let isGameOver = false;
let lastY = 0; // Track last Y position
let totalScroll = 0; // Track total scroll amount
let platformTouched = false; // Track if platform was touched
let highestPoint = 0; // Track highest point reached
let canScore = false; // Track if we can score points
const PIXELS_PER_METER = 10; // 10 пикселей = 1 метр
let isMobile = window.innerWidth <= 500;

// Spring bonus settings
const SPRING_CHANCE = 0.45; // 45% шанс появления пружины
let lastSpringY = 0; // Последняя позиция пружины
const SPRING_JUMP_FORCE = -25; // Увеличили силу прыжка от пружины

// Jetpack settings
const JETPACK_CHANCE = 0.05; // 5% шанс появления джетпака
const JETPACK_JUMP_FORCE = SPRING_JUMP_FORCE * 5; // В 5 раз выше, чем пружина
let jetpackActive = false;
let jetpackTimer = 0;
const JETPACK_DURATION = 1.2; // длительность эффекта в секундах
const JETPACK_POWER = -60;    // постоянная высокая скорость вверх
let jetpackFlameTimer = 0;
const JETPACK_FLAME_FADE = 0.5; // секунды затухания

// Platforms
let platforms = [];
const platformWidth = isMobile ? 60 : 70; // Smaller platforms on mobile
const platformHeight = 20;
const platformGap = isMobile ? 130 : 150; // Smaller gap on mobile
const SPRING_MIN_DISTANCE = platformGap - 10; // чуть меньше шага платформ

// Player
const player = {
    x: 0,
    y: 0,
    width: isMobile ? 30 : 40, // Smaller player on mobile
    height: isMobile ? 30 : 40,
    velocityY: 0,
    velocityX: 0,
    speed: isMobile ? 4 : 5, // Slightly slower on mobile
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

// Generate unique device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('jumpingSquareDeviceId');
    if (!deviceId) {
        deviceId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('jumpingSquareDeviceId', deviceId);
    }
    return deviceId;
}

// Initialize game
function init() {
    console.log('Initializing game...');
    
    // Load high score for this device
    const deviceId = getDeviceId();
    const savedScores = JSON.parse(localStorage.getItem('jumpingSquareScores') || '{}');
    highScore = savedScores[deviceId] || 0;
    
    resizeCanvas();
    generatePlatforms();
    setupPlayer();
    setupEventListeners();
    gameLoop();
}

// Resize canvas
function resizeCanvas() {
    isMobile = window.innerWidth <= 500;
    canvas.width = isMobile ? window.innerWidth : Math.min(window.innerWidth, 500);
    canvas.height = window.innerHeight;
    
    // Update player and platform sizes based on device
    player.width = isMobile ? 30 : 40;
    player.height = isMobile ? 30 : 40;
    player.speed = isMobile ? 4 : 5;
    
    // Regenerate platforms with new sizes
    generatePlatforms();
}

// Generate platforms
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

// Setup player
function setupPlayer() {
    player.x = platforms[0].x + platformWidth / 2 - 20;
    player.y = platforms[0].y - 40;
    player.velocityY = 0;
    player.velocityX = 0;
}

// Event listeners
function setupEventListeners() {
    window.addEventListener('resize', resizeCanvas);
    
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

    // Обработка кликов по canvas
    canvas.addEventListener('click', (e) => {
        if (isGameOver) {
            restart();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!isPaused) {
            // Проверяем клик по кнопке паузы в углу
            if (
                x > canvas.width - PAUSE_BTN_SIZE - PAUSE_BTN_MARGIN &&
                x < canvas.width - PAUSE_BTN_MARGIN &&
                y > PAUSE_BTN_MARGIN &&
                y < PAUSE_BTN_SIZE + PAUSE_BTN_MARGIN
            ) {
                isPaused = true;
            }
        } else {
            // Проверяем клик по большой кнопке play в центре
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = 60;
            if ((x - cx) ** 2 + (y - cy) ** 2 < r ** 2) {
                isPaused = false;
                lastFrameTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
        }
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

// Check collision
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update score
function updateScore() {
    // Total height = scroll + current visible height
    const totalHeight = totalScroll + (canvas.height - player.y);
    
    if (totalHeight > highestPoint) {
        highestPoint = totalHeight;
        // Convert pixels to meters
        const meters = Math.floor(highestPoint / PIXELS_PER_METER);
        score = meters;
        
        if (score > highScore) {
            highScore = score;
            // Save score for this device
            const deviceId = getDeviceId();
            const savedScores = JSON.parse(localStorage.getItem('jumpingSquareScores') || '{}');
            savedScores[deviceId] = highScore;
            localStorage.setItem('jumpingSquareScores', JSON.stringify(savedScores));
        }
    }
}

// Show game over
function showGameOver() {
    isGameOver = true;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = isMobile ? '24px Arial' : '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = isMobile ? '16px Arial' : '20px Arial';
    ctx.fillText(`Высота: ${score}м`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Рекорд: ${highScore}м`, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('Нажмите для рестарта', canvas.width / 2, canvas.height / 2 + 80);
}

// Restart game
function restart() {
    isGameOver = false;
    score = 0;
    highestPoint = 0;
    totalScroll = 0;
    lastSpringY = 0; // Сброс позиции последней пружины
    generatePlatforms();
    setupPlayer();
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (isGameOver || isPaused) {
        // Затемнение
        if (isPaused) {
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
        }
        return;
    }

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000; // в секундах
    lastFrameTime = now;

    // Time-based движение
    player.x += player.velocityX * delta * BASE_FPS;
    player.y += player.velocityY * delta * BASE_FPS;
    player.velocityY += 0.5 * delta * BASE_FPS;

    // Check game over
    if (player.y > canvas.height) {
        showGameOver();
        return;
    }

    // Screen edges
    if(player.x > canvas.width) player.x = 0;
    if(player.x < 0) player.x = canvas.width;

    // Scroll
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

    // Update score every frame
    updateScore();

    // Remove platforms below screen
    platforms = platforms.filter(platform => platform.y < canvas.height);

    // Generate new platforms from top
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

    // Check collisions
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

    // Draw
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

    ctx.fillStyle = 'white';
    ctx.font = isMobile ? '16px Arial' : '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`пройдено: ${score}`, 10, 30);
    ctx.fillText(`рекорд: ${highScore}`, 10, 60);

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

// Start game
window.onload = init; 