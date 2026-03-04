// factions.js

// === БАЗА ДАННЫХ ФРАКЦИЙ ===
const FACTIONS = {
    red: {
        id: 'red',
        name: 'Красные',
        color: '#ff5555',
        // В будущем здесь можно прописать уникальных юнитов:
        // allowedUnits: ['soldier', 'tank', 'rszo', 'su25'] 
    },
    blue: {
        id: 'blue',
        name: 'Синие',
        color: '#5555ff',
        // allowedUnits: ['soldier', 'btr', 'mortar', 'ka52']
    }
};

// === ЛОГИКА ВЫБОРА И ПРОВЕРКИ ===
window.checkFactionSelection = function() {
    // Проверяем, существует ли вообще игра и наш игрок
    if (!gameState || !gameState.players || !gameState.players[window.myPlayerId]) return;
    
    const factionScreen = document.getElementById('faction-selection-screen');
    if (!factionScreen) return;

    // Если фракция еще не выбрана — показываем экран блокировки
    if (!gameState.players[window.myPlayerId].faction) {
        factionScreen.classList.remove('hidden');
    } else {
        // Если фракция уже есть (например, игрок перезашел) — пускаем в игру
        factionScreen.classList.add('hidden');
        applyFactionSettings();
    }
};

window.selectFaction = function(factionId) {
    // Записываем выбор в наш профиль игрока
    gameState.players[window.myPlayerId].faction = factionId;
    
    // Прячем окно
    document.getElementById('faction-selection-screen').classList.add('hidden');
    
    // Сохраняем выбор в базу данных, чтобы не слетел при перезагрузке
    if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
    
    applyFactionSettings();
    updateUI();
};

window.applyFactionSettings = function() {
    const myFactionId = gameState.players[window.myPlayerId].faction;
    if (!myFactionId || !FACTIONS[myFactionId]) return;
    
    const factionData = FACTIONS[myFactionId];
    console.log(`Командир, вы успешно приняли командование фракцией: ${factionData.name}!`);
    
    // Позже мы добавим сюда код, который будет скрывать "чужие" юниты из магазина
};
