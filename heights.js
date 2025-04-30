// Массив с информацией о высотах
const heightInfo = [
    { min: 0, max: 250, description: "Высота 5-этажного дома (15м)" },
    { min: 250, max: 500, description: "Высота Эйфелевой башни (300м)" },
    { min: 500, max: 1000, description: "Высота Эмпайр-стейт-билдинг (443м)" },
    { min: 1000, max: 2000, description: "Высота Бурдж-Халифа (828м)" },
    { min: 2000, max: 5000, description: "Высота горы Эверест (8848м)" },
    { min: 5000, max: 10000, description: "Высота полета пассажирского самолета (10000м)" },
    { min: 10000, max: Infinity, description: "Высота полета космического корабля (100000м)" }
];

// Функция для получения описания высоты
function getHeightDescription(meters) {
    const info = heightInfo.find(item => meters >= item.min && meters < item.max);
    return info ? info.description : "Неизвестная высота";
}

// Функция для получения сообщения о достижении
function getAchievementMessage(meters) {
    return `Вы достигли ${meters} метров! ${getHeightDescription(meters)}`;
}

export { getAchievementMessage, getHeightDescription }; 