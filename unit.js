const UNIT_TYPES = {
    SOLDIER: { 
        id: 'soldier', name: "Пехота", imgSrc: "./images/team-r-soldier.png", 
        cost: 50, maxHp: 10, attack: 2, attackRange: 1, moveRange: 2, visionRange: 4, canCapture: true,
        isInfantry: true 
    },
    RPK: { 
        id: 'rpk', name: "Пулемет", imgSrc: "./images/team-r-rpk.png", 
        cost: 80, maxHp: 15, attack: 5, attackRange: 2, moveRange: 1, visionRange: 3, canCapture: true,
        isInfantry: true 
    },
    RPG: { 
        id: 'rpg', name: "Гранатометчик", imgSrc: "./images/team-r-rpg.png", 
        cost: 100, maxHp: 8, attack: 2, attackRange: 2, moveRange: 2, visionRange: 3, canCapture: true, 
        bonusArmorDamage: 13, isInfantry: true 
    },
    MEDIC: { 
        id: 'medic', name: "Медик", imgSrc: "./images/team-r-med.png", 
        cost: 60, maxHp: 10, attack: 1, attackRange: 1, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true 
    },
    MINER: { 
        id: 'miner', name: "Минёр", imgSrc: "./images/team-r-mine.png", 
        cost: 70, maxHp: 10, attack: 2, attackRange: 1, moveRange: 2, visionRange: 4, canCapture: true,
        isInfantry: true 
    },
    SNIPER: { 
        id: 'sniper', name: "Снайпер", imgSrc: "./images/team-r-sniper.png", 
        cost: 150, maxHp: 8, attack: 15, attackRange: 5, moveRange: 2, visionRange: 6, canCapture: false,
        isInfantry: true 
    },
    SPECNAZ: { 
        id: 'specnaz', name: "Спецназ", imgSrc: "./images/team-r-spec.png", 
        cost: 200, maxHp: 15, attack: 8, attackRange: 2, moveRange: 3, visionRange: 5, canCapture: true,
        isInfantry: true 
    },
    TRANSPORT: { 
        id: 'transport', name: "Транспортник", imgSrc: "./images/team-r-peh.png", 
        cost: 150, maxHp: 20, attack: 0, attackRange: 0, moveRange: 6, visionRange: 5, canCapture: false, 
        isArmor: true, transportCapacity: 2 
    },
    SUPPLY: { 
        id: 'supply', name: "Снабжение", imgSrc: "./images/team-r-supply.png", 
        cost: 120, maxHp: 12, attack: 0, attackRange: 0, moveRange: 5, visionRange: 6, canCapture: false 
    },
    BTR: { 
        id: 'btr', name: "БТР", imgSrc: "./images/team-r-btr.png", 
        cost: 250, maxHp: 25, attack: 5, attackRange: 3, moveRange: 4, visionRange: 6, canCapture: false, 
        isArmor: true, transportCapacity: 1 
    },
    TANK: { 
        id: 'tank', name: "Танк", imgSrc: "./images/team-r-tank.png", 
        cost: 500, maxHp: 50, attack: 12, attackRange: 4, moveRange: 3, visionRange: 5, canCapture: false, 
        isArmor: true 
    }
};

const loadedImages = {};

function preloadUnitImages(callback) {
    let loadedCount = 0;
    const keys = Object.keys(UNIT_TYPES);
    if (keys.length === 0) return callback();

    keys.forEach(key => {
        const img = new Image();
        img.src = UNIT_TYPES[key].imgSrc;
        img.onload = () => {
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
