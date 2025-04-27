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
const SPRING_CHANCE = 0.85; // Увеличили шанс до 50%
const SPRING_MIN_DISTANCE = 200; // Уменьшили минимальное расстояние между пружинами
let lastSpringY = 0; // Последняя позиция пружины
const SPRING_JUMP_FORCE = -25; // Увеличили силу прыжка от пружины

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

// Platforms
let platforms = [];
const platformWidth = isMobile ? 60 : 70; // Smaller platforms on mobile
const platformHeight = 20;
const platformGap = isMobile ? 130 : 150; // Smaller gap on mobile

// Generate unique device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('doodleJumpDeviceId');
    if (!deviceId) {
        deviceId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('doodleJumpDeviceId', deviceId);
    }
    return deviceId;
}

// Initialize game
function init() {
    console.log('Initializing game...');
    
    // Load high score for this device
    const deviceId = getDeviceId();
    const savedScores = JSON.parse(localStorage.getItem('doodleJumpScores') || '{}');
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
    platforms = []; // Clear platforms array
    let y = canvas.height - 50;
    
    // First platform
    platforms.push({
        x: (canvas.width - platformWidth) / 2,
        y: y,
        width: platformWidth,
        height: platformHeight,
        hasSpring: false
    });
    
    // Generate rest
    while(y > 0) {
        y -= platformGap;
        const platform = {
            x: Math.random() * (canvas.width - platformWidth),
            y: y,
            width: platformWidth,
            height: platformHeight,
            hasSpring: false
        };
        
        // Добавляем пружину с определенной вероятностью и расстоянием
        if (Math.random() < SPRING_CHANCE && Math.abs(y - lastSpringY) > SPRING_MIN_DISTANCE) {
            platform.hasSpring = true;
            lastSpringY = y;
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
    let touchStartX = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (isGameOver) {
            restart();
            return;
        }
        touchStartX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (isGameOver) return;
        const touchX = e.touches[0].clientX;
        const diff = touchX - touchStartX;
        player.velocityX = diff > 0 ? player.speed : -player.speed;
    });

    canvas.addEventListener('touchend', () => {
        if (isGameOver) return;
        player.velocityX = 0;
    });

    canvas.addEventListener('click', () => {
        if (isGameOver) {
            restart();
        }
    });
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
            const savedScores = JSON.parse(localStorage.getItem('doodleJumpScores') || '{}');
            savedScores[deviceId] = highScore;
            localStorage.setItem('doodleJumpScores', JSON.stringify(savedScores));
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
    totalScroll = 0; // Reset scroll
    generatePlatforms();
    setupPlayer();
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (isGameOver) return;

    // Update player
    player.x += player.velocityX;
    player.y += player.velocityY;
    player.velocityY += 0.5;

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
        const scrollAmount = Math.abs(player.velocityY);
        totalScroll += scrollAmount; // Add to total scroll
        player.y = canvas.height / 2;
        platforms.forEach(platform => {
            platform.y += scrollAmount;
        });
    }

    // Update score every frame
    updateScore();

    // Remove platforms below screen
    platforms = platforms.filter(platform => platform.y < canvas.height);

    // Generate new platforms from top
    if (platforms.length > 0) {
        let topPlatform = platforms.reduce((min, p) => p.y < min.y ? p : min, platforms[0]);
        while(topPlatform.y > 0) {
            const platform = {
                x: Math.random() * (canvas.width - platformWidth),
                y: topPlatform.y - platformGap,
                width: platformWidth,
                height: platformHeight,
                hasSpring: false
            };
            
            // Добавляем пружину с определенной вероятностью и расстоянием
            if (Math.random() < SPRING_CHANCE && Math.abs(platform.y - lastSpringY) > SPRING_MIN_DISTANCE) {
                platform.hasSpring = true;
                lastSpringY = platform.y;
            }
            
            platforms.push(platform);
            topPlatform = platform;
        }
    }

    // Check collisions
    platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            if (player.velocityY > 0) {
                player.velocityY = platform.hasSpring ? SPRING_JUMP_FORCE : player.jumpForce;
                if (platform.hasSpring) {
                    // Добавляем визуальный эффект при использовании пружины
                    createSpringEffect(platform.x + platform.width / 2, platform.y);
                }
            }
        }
    });

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Рисуем пружину, если она есть
        if (platform.hasSpring) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(platform.x + platform.width / 2 - 5, platform.y - 5, 10, 5);
        }
    });
    
    // Draw player
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = isMobile ? '16px Arial' : '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`пройдено: ${score}`, 10, 30);
    ctx.fillText(`рекорд: ${highScore}`, 10, 60);

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

// Start game
window.onload = init; 