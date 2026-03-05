// factions.js

// === БАЗА ДАННЫХ ФРАКЦИЙ ===
const FACTIONS = {
    red: {
        id: 'red',
        name: 'Красные',
        color: '#ff5555',
        // Красные получают армию РФ
        allowedUnits: [
            'soldier', 'medic', 'miner', 'rpk', 'rpg', 'pzrk', 'sniper', 'specnaz',
            'transport', 'btr', 'tank', 'mortar', 'rszo',
            'mi8', 'ka52', 'su25',
            'supply'
        ]
    },
    blue: {
        id: 'blue',
        name: 'Синие',
        color: '#5555ff',
        // Синие получают армию США (ВНИМАНИЕ: IDs с дефисами!)
        allowedUnits: [
            'u-soldier', 'u-medic', 'u-miner', 'u-rpk', 'u-grenader', 'u-rpg', 'u-sniper', 'u-specnaz',
            'u-transport', 'u-bradley', 'u-abrams', 'u-mortar', 'u-himars',
            'u-blackhawk', 'u-ah64', 'u-a10',
            'u-supply' 
        ]
    }
};

// === ЛОГИКА ВЫБОРА И ПРОВЕРКИ ===
window.checkFactionSelection = function() {
    if (!gameState || !gameState.players || !gameState.players[window.myPlayerId]) return;
    
    const factionScreen = document.getElementById('faction-selection-screen');
    if (!factionScreen) return;

    if (!gameState.players[window.myPlayerId].faction) {
        factionScreen.classList.remove('hidden');
    } else {
        factionScreen.classList.add('hidden');
        applyFactionSettings(); // Применяем настройки сразу, если фракция уже выбрана
    }
};

window.selectFaction = function(factionId) {
    gameState.players[window.myPlayerId].faction = factionId;
    document.getElementById('faction-selection-screen').classList.add('hidden');
    
    if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
    
    applyFactionSettings(); // Обновляем магазин
    updateUI();
};

// === ФИЛЬТРАЦИЯ МАГАЗИНА ===
window.applyFactionSettings = function() {
    const myFactionId = gameState.players[window.myPlayerId].faction;
    if (!myFactionId || !FACTIONS[myFactionId]) return;
    
    const factionData = FACTIONS[myFactionId];
    const allowed = factionData.allowedUnits;

    console.log(`Применяем настройки фракции: ${factionData.name}`);

    // Проходимся по всем типам юнитов из unit.js и скрываем/показываем кнопки
    for (let key in UNIT_TYPES) {
        const unit = UNIT_TYPES[key];
        
        // ВАЖНО: Формируем ID кнопки.
        // Если unit.id = 'u-soldier', то ID кнопки = 'buy-u-soldier'.
        const btnId = `buy-${unit.id}`;
        const btn = document.getElementById(btnId);
        
        if (btn) {
            if (allowed.includes(unit.id)) {
                // Если юнит в списке разрешенных для этой фракции
                btn.classList.remove('hidden');
                btn.style.border = `1px solid ${factionData.color}`;
            } else {
                // Если запрещен
                btn.classList.add('hidden');
            }
        }
    }
    
    // Обновляем цвет имени игрока в меню (чисто для красоты)
    const pName = document.getElementById(window.myPlayerId === 1 ? 'p1-name' : 'p2-name');
    if (pName) pName.style.color = factionData.color;
};
