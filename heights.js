// Массив с информацией о высотах
const heightInfo = [
    { height: 1, description: "📏 Достижение: Рост человека (~1.7м, но округлим до 1м)" },
    { height: 3, description: "🦒 Достижение: Высота жирафа (до 5.5м, но возьмем 3м)" },
    { height: 5, description: "🌳 Достижение: Высота двухэтажного дерева (5м)" },
    { height: 10, description: "🏠 Достижение: Высота 3-этажного дома (10м)" },
    { height: 15, description: "🧠 Достижение: Высота Твоего QI составляет 15" },
    { height: 20, description: "🏢 Достижение: Высота 7-этажного дома (20м)" },
    { height: 30, description: "🌴 Достижение: Высота пальмы (30м)" },
    { height: 51, description: "🌊 Достижение: Высота Ниагарского водопада (51м)" },
    { height: 70, description: "🏛️ Достижение: Высота Колизея (48м, округлим до 70м)" },
    { height: 93, description: "🗽 Достижение: Высота статуи Свободы (93м)" },
    { height: 115, description: "🌲 Достижение: Высота секвойи (115м)" },
    { height: 139, description: "🔺 Достижение: Высота Великой пирамиды Гизы (139м)" },
    { height: 180, description: "🎡 Достижение: Высота колеса обозрения (London Eye, 135м, округлим)" },
    { height: 227, description: "🌉 Достижение: Высота моста Золотые Ворота (227м)" },
    { height: 300, description: "🗼 Достижение: Высота Эйфелевой башни (300м)" },
    { height: 350, description: "🎢 Достижение: Высота Stratosphere Tower (350м)" },
    { height: 400, description: "🏗️ Достижение: Высота Empire State Building без шпиля (381м, округлим)" },
    { height: 443, description: "🏙️ Достижение: Высота Эмпайр-стейт-билдинг (443м со шпилем)" },
    { height: 500, description: "📡 Достижение: Высота телебашни (500м)" },
    { height: 553, description: "📡 Достижение: Высота CN Tower (553м)" },
    { height: 600, description: "🏗️ Достижение: Высота небоскреба (600м)" },
    { height: 634, description: "🗼 Достижение: Высота Tokyo Skytree (634м)" },
    { height: 700, description: "🏙️ Достижение: Высота Бурдж-Халифа без шпиля (828м, но возьмем 700м)" },
    { height: 828, description: "🌆 Достижение: Высота Бурдж-Халифа (828м)" },
    { height: 1000, description: "⛰️ Достижение: Высота горы средней высоты (1000м)" },
    { height: 2000, description: "🏔️ Достижение: Высота Альп (до 4808м, но возьмем 2000м)" },
    { height: 3000, description: "🚁 Достижение: Предел высоты вертолета (3000м)" },
    { height: 5000, description: "❄️ Достижение: Высота вечных снегов (5000м)" },
    { height: 5895, description: "🌋 Достижение: Высота горы Килиманджаро (5895м)" },
    { height: 7000, description: "✈️ Достижение: Максимальная высота истребителя (7000м)" },
    { height: 8000, description: "🏔️ Достижение: Высота «зоны смерти» на Эвересте (8000м)" },
    { height: 8848, description: "🏔️ Достижение: Высота горы Эверест (8848м)" },
    { height: 10000, description: "✈️ Достижение: Высота полета пассажирского самолета (10000м)" },
    { height: 20000, description: "🛩️ Достижение: Высота стратосферы (20,000м)" },
    { height: 39000, description: "🪂 Достижение: Рекорд высоты прыжка (39,000м)" },
    { height: 50000, description: "🌌 Достижение: Граница космоса (линия Кармана, 100км, но возьмем 50км)" },
    { height: 100000, description: "🚀 Достижение: Высота полета космического корабля (100,000м)" },
    { height: 200000, description: "🛰️ Достижение: Низкая околоземная орбита (200,000м)" },
    { height: 35786, description: "🛸 Достижение: Геостационарная орбита (35,786км)" },
    { height: 400000, description: "🛰️ Достижение: Высота орбиты МКС (400,000м)" },
    { height: 1000000, description: "🌠 Достижение: Высота, где начинается глубокий космос (1,000,000м)" },
    { height: 384400000, description: "🌕 Достижение: Расстояние до Луны (384,400км)" }
];

// Переменные для управления отображением достижений
let messageQueue = [];
let currentMessage = null;
let layerTransitionTimer = 0;
const LAYER_TRANSITION_FRAMES = 600; // Примерно 10 секунд при 60 FPS

// Массив для частиц эмодзи
let emojiParticles = [];

// Функция для создания частиц эмодзи
function createEmojiParticles(emoji, count = 10) {
    // Очищаем предыдущие частицы перед созданием новых
    clearEmojiParticles();
    
    for (let i = 0; i < count; i++) {
        emojiParticles.push({
            x: Math.random() * window.innerWidth,
            y: -50,
            emoji: emoji,
            size: 20 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            speed: 2 + Math.random() * 3,
            wobble: Math.random() * 0.1,
            wobbleSpeed: Math.random() * 0.1,
            wobbleOffset: Math.random() * Math.PI * 2,
            alpha: 0,
            targetAlpha: 1
        });
    }
}

// Функция для обновления и отрисовки частиц эмодзи
function updateEmojiParticles(ctx) {
    const messageAlpha = getMessageAlpha();
    
    for (let i = emojiParticles.length - 1; i >= 0; i--) {
        const p = emojiParticles[i];
        
        // Обновляем позицию
        p.y += p.speed;
        p.x += Math.sin(p.wobbleOffset + p.wobbleSpeed * performance.now() / 1000) * p.wobble;
        p.rotation += p.rotationSpeed;
        
        // Синхронизируем прозрачность частиц с прозрачностью сообщения
        p.alpha = p.targetAlpha * messageAlpha;
        
        // Рисуем эмодзи
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = p.alpha;
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
    }
}

// Функция для очистки частиц эмодзи
function clearEmojiParticles() {
    emojiParticles = [];
}

// Функция для получения эмодзи из сообщения о достижении
function extractEmojiFromAchievement(achievement) {
    const emojiMatch = achievement.match(/^([^\s]+)/);
    return emojiMatch ? emojiMatch[1] : null;
}

// Функция для получения описания высоты
function getHeightDescription(meters) {
    // Находим достижение, которое точно соответствует текущей высоте
    const achieved = heightInfo.find(item => item.height === meters);
    return achieved ? achieved.description : null;
}

// Функция для получения сообщения о достижении
function getAchievementMessage(meters) {
    const description = getHeightDescription(meters);
    if (description) {
        // Добавляем сообщение в очередь, если его там еще нет
        if (!messageQueue.includes(description)) {
            messageQueue.push(description);
        }
        return description;
    }
    return null;
}

// Функция для получения следующего сообщения из очереди
function getNextMessage() {
    if (messageQueue.length > 0 && layerTransitionTimer <= 0) {
        currentMessage = messageQueue.shift();
        layerTransitionTimer = LAYER_TRANSITION_FRAMES;
        
        // Создаем частицы эмодзи только при показе нового сообщения
        const emoji = extractEmojiFromAchievement(currentMessage);
        if (emoji) {
            createEmojiParticles(emoji, 15);
        }
    }
    return currentMessage;
}

// Функция для обновления таймера
function updateMessageTimer() {
    if (layerTransitionTimer > 0) {
        layerTransitionTimer--;
    }
    return layerTransitionTimer;
}

// Функция для получения текущего сообщения
function getCurrentMessage() {
    return currentMessage;
}

// Функция для сброса состояния сообщений
function resetMessages() {
    messageQueue = [];
    currentMessage = null;
    layerTransitionTimer = 0;
    clearEmojiParticles(); // Очищаем и частицы эмодзи при сбросе
}

// Функция для получения прогресса анимации (0-1)
function getMessageAlpha() {
    return Math.min(1, layerTransitionTimer / LAYER_TRANSITION_FRAMES * 2);
}

export { 
    getAchievementMessage, 
    getHeightDescription,
    getNextMessage,
    updateMessageTimer,
    getCurrentMessage,
    resetMessages,
    getMessageAlpha,
    updateEmojiParticles,
    clearEmojiParticles
}; 