const UNIT_TYPES = {
    SOLDIER: { 
        id: 'soldier', name: "Пехота", imgSrc: "./images/team-r-soldier.png", 
        cost: 20, maxHp: 10, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true 
    },
    RPK: { 
        id: 'rpk', name: "Пулемет", imgSrc: "./images/team-r-rpk.png", 
        cost: 50, maxHp: 15, attack: 5, attackRange: 4, moveRange: 3, visionRange: 5, canCapture: true,
        isInfantry: true 
    },
    RPG: { 
        id: 'rpg', name: "Гранатометчик", imgSrc: "./images/team-r-rpg.png", 
        cost: 50, maxHp: 15, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true, 
        bonusArmorDamage: 13, isInfantry: true 
    },
    MEDIC: { 
        id: 'medic', name: "Медик", imgSrc: "./images/team-r-med.png", 
        cost: 70, maxHp: 8, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true, maxMedkits: 5, healAmount: 5 
    },
    MINER: { 
        id: 'miner', name: "Минёр", imgSrc: "./images/team-r-mine.png", 
        cost: 100, maxHp: 8, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true, maxMines: 3, mineDamage: 12 
    },
    SNIPER: { 
        id: 'sniper', name: "Снайпер", imgSrc: "./images/team-r-sniper.png", 
        cost: 175, maxHp: 8, attack: 8, attackRange: 5, moveRange: 2, visionRange: 6, canCapture: true,
        isInfantry: true 
    },
    SPECNAZ: { 
        id: 'specnaz', name: "Спецназ", imgSrc: "./images/team-r-spec.png", 
        cost: 150, maxHp: 15, attack: 8, attackRange: 4, moveRange: 4, visionRange: 5, canCapture: true,
        isInfantry: true 
    },
    TRANSPORT: { 
        id: 'transport', name: "Транспортник", imgSrc: "./images/team-r-peh.png", 
        cost: 60, maxHp: 8, attack: 0, attackRange: 0, moveRange: 7, visionRange: 4, canCapture: false, 
        isArmor: true, transportCapacity: 2 
    },
    SUPPLY: { 
        id: 'supply', name: "Снабжение", imgSrc: "./images/team-r-supply.png", 
        cost: 80, maxHp: 8, attack: 0, attackRange: 0, moveRange: 7, visionRange: 4, canCapture: false,
        maxCargo: 10 
    },
    BTR: { 
        id: 'btr', name: "БТР", imgSrc: "./images/team-r-btr.png", 
        cost: 200, maxHp: 30, attack: 5, attackRange: 3, moveRange: 4, visionRange: 6, canCapture: false, 
        isArmor: true, transportCapacity: 1 
    },
    TANK: { 
        id: 'tank', name: "Танк", imgSrc: "./images/team-r-tank.png", 
        cost: 350, maxHp: 50, attack: 12, attackRange: 3, moveRange: 4, visionRange: 5, canCapture: false, 
        isArmor: true 
    },
    RSZO: { 
        id: 'rszo', name: "РСЗО", imgSrc: "./images/team-r-rszo.png", 
        cost: 400, maxHp: 20, attack: 30, attackRange: 15, moveRange: 5, visionRange: 4, canCapture: false, 
        isArmor: true, isArtillery: true, artArea: 4, artShots: 3, maxCooldown: 4 
    },
    MORTAR: { 
        id: 'mortar', name: "Миномёт", imgSrc: "./images/team-r-minomet.png", 
        cost: 150, maxHp: 10, attack: 20, attackRange: 8, moveRange: 2, visionRange: 5, canCapture: true,
        isInfantry: true, isArtillery: true, artArea: 2, artShots: 1, maxCooldown: 0 
    },
    PZRK: { 
        id: 'pzrk', name: "Солдат ПЗРК", imgSrc: "./images/team-r-ptrk.png", 
        cost: 120, maxHp: 10, attack: 25, attackRange: 7, moveRange: 3, visionRange: 5, canCapture: true,
        isInfantry: true, isAntiAir: true 
    },
    MI8: { 
        id: 'mi8', name: "Ми-8АМТШ", imgSrc: "./images/team-r-mi8.png", 
        cost: 250, maxHp: 25, attack: 5, attackRange: 2, moveRange: 8, visionRange: 7, canCapture: false, 
        isAir: true, transportCapacity: 4 
    },
    KA52: { 
        id: 'ka52', name: "Ка-52 Аллигатор", imgSrc: "./images/team-r-ka52.png", 
        cost: 450, maxHp: 25, attack: 15, attackRange: 4, moveRange: 7, visionRange: 7, canCapture: false, 
        isAir: true, bonusArmorDamage: 15 
    },
    SU25: { 
        id: 'su25', name: "Су-25СМ3", imgSrc: "./images/team-r-su25.png", 
        cost: 600, maxHp: 40, attack: 25, attackRange: 5, moveRange: 10, visionRange: 8, canCapture: false, 
        isAir: true, bonusArmorDamage: 20 
    },

    // ==========================================
    // === ФРАКЦИЯ U (СИНИЕ) ===
    // ==========================================
    // ВНИМАНИЕ: ID изменены на дефисы (u-soldier), чтобы совпадать с HTML!

    U_SOLDIER: { 
        id: 'u-soldier', name: "Солдат", imgSrc: "./images/team-u-soldier.png", 
        cost: 20, maxHp: 10, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true, isInfantry: true 
    },
    U_RPK: { 
        id: 'u-rpk', name: "Пулеметчик", imgSrc: "./images/team-u-rpk.png", 
        cost: 50, maxHp: 15, attack: 5, attackRange: 4, moveRange: 3, visionRange: 5, canCapture: true, isInfantry: true 
    },
    U_GRENADER: { 
        id: 'u-grenader', name: "Гренадер", imgSrc: "./images/team-u-grenader.png", 
        cost: 60, maxHp: 18, attack: 6, attackRange: 4, moveRange: 3, visionRange: 5, canCapture: true, isInfantry: true 
    },
    U_RPG: { 
        id: 'u-rpg', name: "SMAW (РПГ+ПВО)", imgSrc: "./images/team-u-rpg.png", 
        cost: 100, maxHp: 15, attack: 3, attackRange: 4, moveRange: 3, visionRange: 4, canCapture: true, 
        isInfantry: true, bonusArmorDamage: 13, isAntiAir: true 
    },
    U_MEDIC: { 
        id: 'u-medic', name: "Медик", imgSrc: "./images/team-u-medic.png", 
        cost: 70, maxHp: 8, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true, maxMedkits: 5, healAmount: 5 
    },
    U_MINER: { 
        id: 'u-miner', name: "Минёр", imgSrc: "./images/team-u-miner.png", 
        cost: 100, maxHp: 8, attack: 3, attackRange: 3, moveRange: 3, visionRange: 4, canCapture: true,
        isInfantry: true, maxMines: 3, mineDamage: 12 
    },
    U_SPECNAZ: { 
        id: 'u-specnaz', name: "Дельта", imgSrc: "./images/team-u-spec.png", 
        cost: 150, maxHp: 15, attack: 8, attackRange: 4, moveRange: 4, visionRange: 5, canCapture: true, isInfantry: true 
    },
    U_SNIPER: { 
        id: 'u-sniper', name: "Снайпер", imgSrc: "./images/team-u-sniper.png", 
        cost: 175, maxHp: 8, attack: 8, attackRange: 5, moveRange: 2, visionRange: 6, canCapture: true, isInfantry: true 
    },

    U_TRANSPORT: { 
        id: 'u-transport', name: "Транспортник", imgSrc: "./images/team-u-peh.png", 
        cost: 60, maxHp: 8, attack: 0, attackRange: 0, moveRange: 7, visionRange: 4, canCapture: false, 
        isArmor: true, transportCapacity: 2 
    },
    U_BRADLEY: { 
        id: 'u-bradley', name: "M2 Bradley", imgSrc: "./images/team-u-bredli.png", 
        cost: 200, maxHp: 30, attack: 5, attackRange: 3, moveRange: 4, visionRange: 6, canCapture: false, 
        isArmor: true, transportCapacity: 1 
    },
    U_ABRAMS: { 
        id: 'u-abrams', name: "M1 Abrams", imgSrc: "./images/team-u-abrams.png", 
        cost: 350, maxHp: 50, attack: 12, attackRange: 3, moveRange: 4, visionRange: 5, canCapture: false, isArmor: true 
    },
    U_MORTAR: { 
        id: 'u-mortar', name: "Миномёт", imgSrc: "./images/team-u-minomet.png", 
        cost: 150, maxHp: 10, attack: 20, attackRange: 8, moveRange: 2, visionRange: 5, canCapture: true,
        isInfantry: true, isArtillery: true, artArea: 2, artShots: 1, maxCooldown: 0 
    },
    U_HIMARS: { 
        id: 'u-himars', name: "HIMARS", imgSrc: "./images/team-u-himars.png", 
        cost: 400, maxHp: 20, attack: 30, attackRange: 15, moveRange: 3, visionRange: 6, canCapture: false, 
        isArmor: true, isArtillery: true, artArea: 4, artShots: 3, maxCooldown: 4 
    },
    U_SUPPLY: { 
        id: 'u-supply', name: "Снабжение", imgSrc: "./images/team-u-suply.png", 
        cost: 80, maxHp: 8, attack: 0, attackRange: 0, moveRange: 7, visionRange: 4, canCapture: false, maxCargo: 10 
    },

    U_BLACKHAWK: { 
        id: 'u-blackhawk', name: "Black Hawk", imgSrc: "./images/team-u-black.png", 
        cost: 250, maxHp: 25, attack: 5, attackRange: 2, moveRange: 8, visionRange: 7, canCapture: false, 
        isAir: true, transportCapacity: 4 
    },
    U_AH64: { 
        id: 'u-ah64', name: "AH-64 Apache", imgSrc: "./images/team-u-ah.png", 
        cost: 450, maxHp: 25, attack: 15, attackRange: 4, moveRange: 7, visionRange: 7, canCapture: false, 
        isAir: true, bonusArmorDamage: 15 
    },
    U_A10: { 
        id: 'u-a10', name: "A-10C Warthog", imgSrc: "./images/team-u-a10.png", 
        cost: 600, maxHp: 40, attack: 25, attackRange: 5, moveRange: 10, visionRange: 8, canCapture: false, 
        isAir: true, bonusArmorDamage: 20 
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
