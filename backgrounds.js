import { getAchievementMessage } from './heights.js';

// Функция для генерации случайного цвета в HSL
function generateRandomHSL() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 30 + Math.floor(Math.random() * 70);
    const lightness = 20 + Math.floor(Math.random() * 70);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Функция для генерации второго цвета градиента
function generateSecondColor(firstColor) {
    const hsl1 = firstColor.match(/\d+/g).map(Number);
    const hue1 = hsl1[0];
    
    // Случайно выбираем один из вариантов генерации второго цвета
    const strategy = Math.random();
    
    if (strategy < 0.3) {
        // Контрастный цвет (противоположный на цветовом круге)
        return `hsl(${(hue1 + 180) % 360}, ${hsl1[1]}%, ${hsl1[2]}%)`;
    } else if (strategy < 0.6) {
        // Случайный цвет с похожей яркостью
        return `hsl(${Math.floor(Math.random() * 360)}, ${hsl1[1]}%, ${hsl1[2]}%)`;
    } else if (strategy < 0.8) {
        // Смежный цвет (смещение на 30-60 градусов)
        const hue2 = (hue1 + 30 + Math.floor(Math.random() * 30)) % 360;
        return `hsl(${hue2}, ${hsl1[1]}%, ${hsl1[2]}%)`;
    } else {
        // Полностью случайный цвет
        return generateRandomHSL();
    }
}

// Функция для генерации цвета платформы
function generatePlatformColor(baseHue) {
    // Случайно выбираем стратегию для цвета платформы
    const strategy = Math.random();
    
    if (strategy < 0.4) {
        // Контрастный цвет
        return `hsl(${(baseHue + 180) % 360}, 80%, 60%)`;
    } else if (strategy < 0.7) {
        // Смежный цвет
        return `hsl(${(baseHue + 30) % 360}, 85%, 65%)`;
    } else {
        // Случайный яркий цвет
        return `hsl(${Math.floor(Math.random() * 360)}, 90%, 70%)`;
    }
}

// Функция для генерации случайного фона
function generateRandomBackground(score = 0) {
    const color1 = generateRandomHSL();
    const color2 = generateRandomHSL();
    const color3 = generateRandomHSL();
    const baseHue = parseInt(color1.match(/\d+/)[0]);
    const platformColor = generatePlatformColor(baseHue);
    
    const background = generateAuroraGradient(score);
    
    return {
        name: background.name,
        gradient: background.gradient,
        platforms: platformColor,
        player: color2,
        dust: color1,
        description: background.name
    };
}

// Генерация начального массива фонов
let backgrounds = Array(14).fill(null).map(() => generateRandomBackground());

// Текущий фон
let currentBackgroundIndex = 0;
let nextBackgroundIndex = 1;
let transitionProgress = 0;
const TRANSITION_DISTANCE = 500; // Расстояние для перехода между фонами

// Функция для сброса состояния фона
function resetBackgroundState() {
    currentBackgroundIndex = 0;
    nextBackgroundIndex = 1;
    transitionProgress = 0;
}

// Функция для получения текущего фона
function getCurrentBackground() {
    return backgrounds[currentBackgroundIndex];
}

// Функция для получения следующего фона
function getNextBackground() {
    return backgrounds[nextBackgroundIndex];
}

// Функция для обновления фона на основе пройденных метров
function updateBackground(meters) {
    const totalDistance = meters;
    const currentLayerDistance = Math.floor(totalDistance / TRANSITION_DISTANCE);
    const distanceInLayer = totalDistance % TRANSITION_DISTANCE;
    
    // Вычисляем прогресс перехода (от 0 до 1)
    transitionProgress = distanceInLayer / TRANSITION_DISTANCE;
    
    // Определяем индексы текущего и следующего фонов
    const newCurrentIndex = currentLayerDistance % backgrounds.length;
    const newNextIndex = (newCurrentIndex + 1) % backgrounds.length;
    
    // Если индексы изменились, генерируем новый фон
    if (newCurrentIndex !== currentBackgroundIndex) {
        currentBackgroundIndex = newCurrentIndex;
        nextBackgroundIndex = newNextIndex;
        
        // Генерируем новый фон для следующего уровня
        if (nextBackgroundIndex === 0) {
            backgrounds = Array(14).fill(null).map(() => generateRandomBackground());
        }
    }
    
    // Всегда возвращаем true, чтобы обновлять фон каждый кадр
    return true;
}

// Функция для получения текущего градиента с учетом перехода
function getCurrentGradient() {
    const currentBg = backgrounds[currentBackgroundIndex];
    const nextBg = backgrounds[nextBackgroundIndex];
    
    if (!currentBg || !nextBg) {
        return 'linear-gradient(to bottom, hsl(200, 50%, 50%), hsl(220, 60%, 40%))';
    }

    // Извлекаем цвета из обоих фонов
    const currentColors = currentBg.gradient.match(/hsl\([^)]+\)/g) || [];
    const nextColors = nextBg.gradient.match(/hsl\([^)]+\)/g) || [];
    
    if (currentColors.length === 0 || nextColors.length === 0) {
        return currentBg.gradient;
    }

    // Создаем плавный переход между цветами
    const gradientSteps = 20;
    const gradientColors = [];
    
    for (let i = 0; i <= gradientSteps; i++) {
        const stepProgress = i / gradientSteps;
        const color = interpolateHSLColor(
            currentColors[0], 
            nextColors[0], 
            transitionProgress * stepProgress
        );
        gradientColors.push(`${color} ${stepProgress * 100}%`);
    }
    
    return `linear-gradient(to bottom, ${gradientColors.join(', ')})`;
}

// Функция для интерполяции HSL цветов
function interpolateHSLColor(color1, color2, factor) {
    const hsl1 = color1.match(/\d+/g).map(Number);
    const hsl2 = color2.match(/\d+/g).map(Number);
    
    // Интерполируем каждый компонент HSL
    const h = Math.round(hsl1[0] + (hsl2[0] - hsl1[0]) * factor);
    const s = Math.round(hsl1[1] + (hsl2[1] - hsl1[1]) * factor);
    const l = Math.round(hsl1[2] + (hsl2[2] - hsl1[2]) * factor);
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Функция для получения текущего цвета платформы с учетом перехода
function getCurrentPlatformColor() {
    const currentBg = backgrounds[currentBackgroundIndex];
    const nextBg = backgrounds[nextBackgroundIndex];
    return interpolateHSLColor(currentBg.platforms, nextBg.platforms, transitionProgress);
}

// Функция для получения текущего цвета игрока с учетом перехода
function getCurrentPlayerColor() {
    const currentBg = backgrounds[currentBackgroundIndex];
    const nextBg = backgrounds[nextBackgroundIndex];
    return interpolateHSLColor(currentBg.player, nextBg.player, transitionProgress);
}

// Функция для получения текущего цвета пыли с учетом перехода
function getCurrentDustColor() {
    const currentBg = backgrounds[currentBackgroundIndex];
    const nextBg = backgrounds[nextBackgroundIndex];
    return interpolateHSLColor(currentBg.dust, nextBg.dust, transitionProgress);
}

// Функция для получения описания текущего слоя
function getCurrentLayerDescription(currentScore) {
    const meters = Math.floor(currentScore / 250) * 250;
    const heightInfo = [
        { min: 0, max: 250, description: "Высота 5-этажного дома (15м)" },
        { min: 250, max: 500, description: "Высота Эйфелевой башни (300м)" },
        { min: 500, max: 1000, description: "Высота Эмпайр-стейт-билдинг (443м)" },
        { min: 1000, max: 2000, description: "Высота Бурдж-Халифа (828м)" },
        { min: 2000, max: 5000, description: "Высота горы Эверест (8848м)" },
        { min: 5000, max: 10000, description: "Высота полета пассажирского самолета (10000м)" },
        { min: 10000, max: Infinity, description: "Высота полета космического корабля (100000м)" }
    ];
    
    const info = heightInfo.find(item => meters >= item.min && meters < item.max);
    return `Вы достигли ${meters} метров! ${info ? info.description : "Неизвестная высота"}`;
}

// Функция для генерации анимированного северного сияния
function generateAuroraGradient(score = 0) {
    // Генерируем базовые цвета
    const color1 = generateRandomHSL();
    const color2 = generateRandomHSL();
    const color3 = generateRandomHSL();
    
    // Вычисляем скорость анимации на основе очков
    const baseSpeed = 60; // базовая скорость в секундах
    const speedMultiplier = Math.max(0.5, 1 - (score / 10000)); // уменьшаем скорость с ростом очков
    const waveSpeed = baseSpeed * speedMultiplier;
    const colorSpeed = waveSpeed * 1.5; // скорость изменения цветов немного медленнее
    
    // Вычисляем интенсивность волн на основе очков
    const baseIntensity = 120; // базовая интенсивность
    const intensityMultiplier = Math.min(2, 1 + (score / 5000)); // увеличиваем интенсивность с ростом очков
    const waveIntensity = baseIntensity * intensityMultiplier;
    
    // Вычисляем частоту волн на основе очков
    const baseFrequency = 0.005;
    const frequencyMultiplier = Math.min(2, 1 + (score / 8000)); // увеличиваем частоту с ростом очков
    const waveFrequency = baseFrequency * frequencyMultiplier;
    
    const svg = `
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="aurora">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feTurbulence type="fractalNoise" baseFrequency="${waveFrequency}" numOctaves="5" result="noise">
                        <animate attributeName="baseFrequency" 
                            values="${waveFrequency};${waveFrequency * 2};${waveFrequency};${waveFrequency * 1.6};${waveFrequency * 0.8};${waveFrequency * 1.8};${waveFrequency}" 
                            dur="${waveSpeed}s" 
                            repeatCount="indefinite" 
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="${waveIntensity}">
                        <animate attributeName="scale" 
                            values="${waveIntensity};${waveIntensity * 1.25};${waveIntensity};${waveIntensity * 1.17};${waveIntensity * 1.08};${waveIntensity * 1.21};${waveIntensity}" 
                            dur="${waveSpeed * 0.8}s" 
                            repeatCount="indefinite"/>
                    </feDisplacementMap>
                    <feGaussianBlur stdDeviation="3" result="blur2"/>
                </filter>
                <filter id="aurora2">
                    <feGaussianBlur stdDeviation="1.5" result="blur3"/>
                    <feTurbulence type="fractalNoise" baseFrequency="${waveFrequency * 0.6}" numOctaves="4" result="noise2">
                        <animate attributeName="baseFrequency" 
                            values="${waveFrequency * 0.6};${waveFrequency * 1.2};${waveFrequency * 0.8};${waveFrequency};${waveFrequency * 0.6};${waveFrequency * 0.8};${waveFrequency * 0.6};${waveFrequency * 0.7};${waveFrequency * 0.4};${waveFrequency * 0.8};${waveFrequency * 0.6}" 
                            dur="${waveSpeed * 0.75}s" 
                            repeatCount="indefinite"
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="noise2" scale="${waveIntensity * 0.75}">
                        <animate attributeName="scale" 
                            values="${waveIntensity * 0.75};${waveIntensity};${waveIntensity * 0.75};${waveIntensity * 0.92};${waveIntensity * 0.83};${waveIntensity * 0.96};${waveIntensity * 0.75}" 
                            dur="${waveSpeed * 0.9}s" 
                            repeatCount="indefinite"/>
                    </feDisplacementMap>
                    <feGaussianBlur stdDeviation="2.5" result="blur4"/>
                </filter>
                <linearGradient id="auroraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1}">
                        <animate attributeName="stop-color" 
                            values="${color1};${color2};${color3};${color1};${color3};${color2};${color1};${color3};${color2};${color1}" 
                            dur="${colorSpeed}s" 
                            repeatCount="indefinite"
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </stop>
                    <stop offset="33%" style="stop-color:${color2}">
                        <animate attributeName="stop-color" 
                            values="${color2};${color3};${color1};${color2};${color1};${color3};${color2};${color1};${color3};${color2}" 
                            dur="${colorSpeed}s" 
                            repeatCount="indefinite"
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </stop>
                    <stop offset="66%" style="stop-color:${color3}">
                        <animate attributeName="stop-color" 
                            values="${color3};${color1};${color2};${color3};${color2};${color1};${color3};${color2};${color1};${color3}" 
                            dur="${colorSpeed}s" 
                            repeatCount="indefinite"
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </stop>
                    <stop offset="100%" style="stop-color:${color1}">
                        <animate attributeName="stop-color" 
                            values="${color1};${color2};${color3};${color1};${color3};${color2};${color1};${color3};${color2};${color1}" 
                            dur="${colorSpeed}s" 
                            repeatCount="indefinite"
                            calcMode="spline"
                            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1; 0.4 0 0.2 1"/>
                    </stop>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#auroraGradient)" filter="url(#aurora)" opacity="0.9"/>
            <rect width="100%" height="100%" fill="url(#auroraGradient)" filter="url(#aurora2)" opacity="0.7"/>
        </svg>
    `;
    
    return {
        gradient: `url('data:image/svg+xml;base64,${btoa(svg)}')`,
        name: "Северное сияние"
    };
}

// Функция для генерации анимированных пузырей
function generateBubbleGradient() {
    const color1 = generateRandomHSL();
    const color2 = generateRandomHSL();
    
    const svg = `
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1}"/>
                    <stop offset="100%" style="stop-color:${color2}"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bubbleGradient)"/>
            ${Array(20).fill(0).map((_, i) => {
                const size = 20 + Math.random() * 40;
                const x = Math.random() * 100;
                const y = 100 + Math.random() * 20; // Начинаем ниже экрана
                const duration = 15 + Math.random() * 10;
                const delay = Math.random() * 5;
                return `
                    <circle cx="${x}%" cy="${y}%" r="${size}" fill="${color1}" opacity="0.2">
                        <animate attributeName="cy" values="${y};-${size};${y}" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                        <animate attributeName="r" values="${size};${size*1.2};${size}" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                    </circle>
                `;
            }).join('')}
        </svg>
    `;
    
    return {
        gradient: `url('data:image/svg+xml;base64,${btoa(svg)}')`,
        name: "Пузыри"
    };
}

// Функция для генерации анимированного космического фона
function generateSpaceGradient() {
    const color1 = generateRandomHSL();
    const color2 = generateRandomHSL();
    
    const svg = `
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="spaceGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${color1}"/>
                    <stop offset="100%" style="stop-color:${color2}"/>
                </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#spaceGradient)"/>
            ${Array(50).fill(0).map((_, i) => {
                const size = 1 + Math.random() * 2;
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const duration = 3 + Math.random() * 2;
                const delay = Math.random() * 2;
                return `
                    <circle cx="${x}%" cy="${y}%" r="${size}" fill="white" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                        <animate attributeName="r" values="${size};${size*1.5};${size}" dur="${duration}s" begin="${delay}s" repeatCount="indefinite"/>
                    </circle>
                `;
            }).join('')}
        </svg>
    `;
    
    return {
        gradient: `url('data:image/svg+xml;base64,${btoa(svg)}')`,
        name: "Космос"
    };
}

// Экспортируем функции и массив фонов
export { 
    backgrounds, 
    getCurrentBackground, 
    updateBackground, 
    getCurrentLayerDescription,
    getCurrentGradient,
    getCurrentPlatformColor,
    getCurrentPlayerColor,
    getCurrentDustColor,
    generateRandomBackground,
    resetBackgroundState,
    getAchievementMessage
}; 