// Функция для переключения полноэкранного режима
function toggleFullscreen() {
    const gameContainer = document.getElementById('gameContainer');
    if (!gameContainer) return;
    
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen().catch(err => {
            console.error(`Ошибка при попытке перейти в полноэкранный режим: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Обработчик изменения состояния полноэкранного режима
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const gameContainer = document.getElementById('gameContainer');
    
    if (!fullscreenBtn || !gameContainer) return;
    
    if (document.fullscreenElement) {
        fullscreenBtn.style.display = 'none';
        // Применяем стили для полноэкранного режима
        gameContainer.style.width = '100vw';
        gameContainer.style.height = '100vh';
        gameContainer.style.maxWidth = 'none';
        gameContainer.style.maxHeight = 'none';
    } else {
        fullscreenBtn.style.display = 'block';
        // Возвращаем обычные стили
        gameContainer.style.width = '100%';
        gameContainer.style.height = '100vh';
        gameContainer.style.maxWidth = '400px';
        gameContainer.style.maxHeight = '720px';
    }
    
    // Вызываем событие resize для перерисовки canvas
    window.dispatchEvent(new Event('resize'));
});

// Добавляем обработчик клика на canvas для кнопки полноэкранного режима
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!canvas || !fullscreenBtn) return;
    
    // Позиционируем кнопку
    fullscreenBtn.style.position = 'absolute';
    fullscreenBtn.style.left = '16px';
    fullscreenBtn.style.top = '16px';
    fullscreenBtn.style.width = '32px';
    fullscreenBtn.style.height = '32px';
    fullscreenBtn.style.padding = '0';
    fullscreenBtn.style.borderRadius = '50%';
    fullscreenBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    fullscreenBtn.style.border = '2px solid rgba(0, 0, 0, 0.3)';
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.style.display = 'block';
    fullscreenBtn.style.zIndex = '1000';
    
    // Добавляем иконку
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.style.fontSize = '16px';
    fullscreenBtn.style.lineHeight = '28px';
    fullscreenBtn.style.textAlign = 'center';
    fullscreenBtn.style.color = 'rgba(0, 0, 0, 0.7)';
    
    // Добавляем обработчик клика
    fullscreenBtn.addEventListener('click', toggleFullscreen);
}); 