// factions.js

// === БАЗА ДАННЫХ ФРАКЦИЙ ===
const FACTIONS = {
    red: {
        id: 'red',
        name: 'Красные',
        color: '#ff5555',
        // Красные получают ВЕСЬ текущий арсенал
        allowedUnits: [
            'soldier', 'medic', 'miner', 'rpk', 'rpg', 'pzrk', 'sniper', 'specnaz', // Пехота
            'transport', 'btr', 'tank', 'mortar', 'rszo', // Техника
            'mi8', 'ka52', 'su25', // Авиация
            'supply' // Логистика
        ]
    },
    blue: {
        id: 'blue',
        name: 'Синие',
        color: '#5555ff',
        // У Синих пока пусто (ждут поставок НАТО?)
        allowedUnits: [
            'u_soldier', 'u_medic', 'u_miner', 'u_rpk', 'u_grenader', 'u_rpg', 'u_sniper', 'u_specnaz',
            'u_transport', 'u_bradley', 'u_abrams', 'u_mortar', 'u_himars',
            'u_blackhawk', 'u_ah64', 'u_a10',
            'u_supply' ]
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
    
    applyFactionSettings(); // <-- Самый важный момент: обновляем магазин!
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
        // Формируем ID кнопки (например, 'buy-soldier')
        const btnId = `buy-${unit.id}`;
        const btn = document.getElementById(btnId);
        
        if (btn) {
            if (allowed.includes(unit.id)) {
                // Если юнит разрешен — показываем и красим рамку в цвет фракции
                btn.classList.remove('hidden');
                btn.style.border = `1px solid ${factionData.color}`;
            } else {
                // Если запрещен — скрываем
                btn.classList.add('hidden');
            }
        }
    }
    
    // Обновляем цвет имени игрока в меню (чисто для красоты)
    const pName = document.getElementById(window.myPlayerId === 1 ? 'p1-name' : 'p2-name');
    if (pName) pName.style.color = factionData.color;
};
