const UNIT_TYPES = {
    SOLDIER: { id: 'soldier', name: "Пехота", imgSrc: "./images/team-r-soldier.png", cost: 50, maxHp: 10, attack: 2, attackRange: 1, moveRange: 2, canCapture: true },
    RPK: { id: 'rpk', name: "Пулемет", imgSrc: "./images/team-r-rpk.png", cost: 80, maxHp: 10, attack: 4, attackRange: 2, moveRange: 1, canCapture: true },
    RPG: { id: 'rpg', name: "Гранатометчик", imgSrc: "./images/team-r-rpg.png", cost: 100, maxHp: 8, attack: 7, attackRange: 2, moveRange: 2, canCapture: true },
    SUPPLY: { id: 'supply', name: "Снабжение", imgSrc: "./images/team-r-supply.png", cost: 120, maxHp: 12, attack: 0, attackRange: 0, moveRange: 5, canCapture: false },
    BTR: { id: 'btr', name: "БТР", imgSrc: "./images/team-r-btr.png", cost: 250, maxHp: 25, attack: 5, attackRange: 3, moveRange: 4, canCapture: false },
    TANK: { id: 'tank', name: "Танк", imgSrc: "./images/team-r-tank.png", cost: 500, maxHp: 50, attack: 12, attackRange: 4, moveRange: 3, canCapture: false }
};

// Глобальный объект для хранения загруженных картинок
const loadedImages = {};

function preloadUnitImages(callback) {
    let loadedCount = 0;
    const keys = Object.keys(UNIT_TYPES);
    if (keys.length === 0) return callback();

    keys.forEach(key => {
        const img = new Image();
        img.src = UNIT_TYPES[key].imgSrc;
        img.onload = () => {
            // ИСПРАВЛЕНО: Сохраняем картинку по точному id ('soldier', 'rpk' и т.д.)
            loadedImages[UNIT_TYPES[key].id] = img; 
            loadedCount++;
            if (loadedCount === keys.length) callback();
        };
        img.onerror = () => {
            console.error(`Ошибка загрузки: ${UNIT_TYPES[key].imgSrc}`);
            loadedCount++;
            if (loadedCount === keys.length) callback();
        };
    });
}
