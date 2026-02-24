// Характеристики всех типов войск
const UNIT_TYPES = {
    SOLDIER: {
        id: 'soldier',
        name: "Отделение пехоты",
        imgSrc: "images/team-r-soldier.png", 
        cost: 50,
        maxHp: 10,
        attack: 2,
        attackRange: 1, // Ближний бой (соседняя клетка)
        moveRange: 2,   // Ходит на 2 клетки
        canCapture: true // Может захватывать здания
    },
    RPK: {
        id: 'rpk',
        name: "Пулеметный расчёт",
        imgSrc: "images/team-r-rpk.png",
        cost: 80,
        maxHp: 10,
        attack: 4,
        attackRange: 2, // Бьет дальше пехоты
        moveRange: 1,   // Тяжелое оружие, ходит медленнее
        canCapture: true
    },
    RPG: {
        id: 'rpg',
        name: "Гранатометчик",
        imgSrc: "images/team-r-rpg.png",
        cost: 100,
        maxHp: 8,
        attack: 7,
        attackRange: 2,
        moveRange: 2,
        canCapture: true
    },
    SUPPLY: {
        id: 'supply',
        name: "Автомобиль снабжения",
        imgSrc: "images/team-r-supply.png",
        cost: 120,
        maxHp: 12,
        attack: 0,      // Не атакует
        attackRange: 0,
        moveRange: 5,   // Быстро ездит
        canCapture: false
    },
    BTR: {
        id: 'btr',
        name: "БТР",
        imgSrc: "images/team-r-btr.png",
        cost: 250,
        maxHp: 25,
        attack: 5,
        attackRange: 3,
        moveRange: 4,
        canCapture: false
    },
    TANK: {
        id: 'tank',
        name: "Танк",
        imgSrc: "images/team-r-tank.png",
        cost: 500,
        maxHp: 50,
        attack: 12,
        attackRange: 4,
        moveRange: 3,
        canCapture: false
    }
};

// Глобальный объект для хранения загруженных картинок
const loadedImages = {};

// Функция предзагрузки изображений (вызовем её при старте игры)
function preloadUnitImages(callback) {
    let loadedCount = 0;
    const keys = Object.keys(UNIT_TYPES);
    
    if (keys.length === 0) {
        callback();
        return;
    }

    keys.forEach(key => {
        const img = new Image();
        img.src = UNIT_TYPES[key].imgSrc;
        
        img.onload = () => {
            loadedImages[key] = img;
            loadedCount++;
            // Когда все картинки загрузятся, запускаем callback (старт игры)
            if (loadedCount === keys.length) {
                console.log("Все картинки юнитов успешно загружены!");
                callback();
            }
        };
        
        img.onerror = () => {
            console.error(`Ошибка загрузки: ${UNIT_TYPES[key].imgSrc}. Проверь имя файла!`);
            // Заглушка, чтобы игра не зависла, если картинки нет
            loadedCount++;
            if (loadedCount === keys.length) {
                callback();
            }
        };
    });
}

