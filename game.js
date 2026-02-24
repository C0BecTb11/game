// Состояние игры
let gameState = {
    turn: 1, // Текущий ход (1 или 2)
    state: 'IDLE', // IDLE (ожидание), PLACING_UNIT (размещение купленного), SELECTED (юнит выбран)
    players: {
        1: { points: 100, color: '#ff5555', name: 'Игрок 1' },
        2: { points: 100, color: '#5555ff', name: 'Игрок 2' }
    },
    units: [], // Все юниты на карте
    selectedUnit: null, // Выбранный юнит для приказа
    unitToPlace: null   // Юнит, которого мы только что купили и хотим поставить
};

// --- ИНИЦИАЛИЗАЦИЯ ИГРЫ ---
function initGame() {
    generateMap(); // Создаем карту из map.js
    setupControls(); // Настраиваем кнопки
    updateUI(); // Обновляем текст на экране
    renderAll(); // Рисуем первый кадр
}

// Настройка кнопок интерфейса
function setupControls() {
    // Привязываем кнопки покупки
    document.getElementById('buy-soldier').onclick = () => prepareBuy('SOLDIER');
    document.getElementById('buy-rpk').onclick = () => prepareBuy('RPK');
    document.getElementById('buy-rpg').onclick = () => prepareBuy('RPG');
    document.getElementById('buy-supply').onclick = () => prepareBuy('SUPPLY');
    document.getElementById('buy-btr').onclick = () => prepareBuy('BTR');
    document.getElementById('buy-tank').onclick = () => prepareBuy('TANK');

    // Кнопка завершения хода
    document.getElementById('end-turn').onclick = endTurn;

    // Клик мышкой по карте
    canvas.addEventListener('mousedown', handleMapClick);
}

// --- ПОКУПКА И РАЗМЕЩЕНИЕ ---
function prepareBuy(typeKey) {
    const type = UNIT_TYPES[typeKey];
    const player = gameState.players[gameState.turn];
    
    if (player.points >= type.cost) {
        gameState.unitToPlace = type;
        gameState.state = 'PLACING_UNIT';
        gameState.selectedUnit = null;
        alert(`Вы купили ${type.name}. Кликните на свою базу для высадки!`);
    } else {
        alert("Командир, не хватает очков снабжения!");
    }
}

// Проверка: можно ли высадить юнита в эту клетку?
function isValidSpawn(x, y, playerID) {
    if (getUnitAt(x, y)) return false; // Клетка занята
    
    // Игрок 1: левый верхний угол (2x2)
    if (playerID === 1) return x <= 1 && y <= 1;
    // Игрок 2: правый нижний угол (2x2)
    if (playerID === 2) return x >= GRID_SIZE - 2 && y >= GRID_SIZE - 2;
    
    return false;
}

// --- ЛОГИКА КЛИКА ПО КАРТЕ ---
function handleMapClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    
    // 1. Если мы высаживаем купленного юнита
    if (gameState.state === 'PLACING_UNIT' && gameState.unitToPlace) {
        if (isValidSpawn(x, y, gameState.turn)) {
            // Списываем очки
            gameState.players[gameState.turn].points -= gameState.unitToPlace.cost;
            // Добавляем юнита на поле
            gameState.units.push({
                type: gameState.unitToPlace,
                x: x, y: y,
                owner: gameState.turn,
                hp: gameState.unitToPlace.maxHp,
                hasMoved: true // В этот ход он уже не ходит
            });
            
            gameState.unitToPlace = null;
            gameState.state = 'IDLE';
            updateUI();
            renderAll();
        } else {
            alert("Высадка разрешена только на свободных клетках вашей базы!");
        }
        return;
    }

    // 2. Логика управления войсками на поле
    const clickedUnit = getUnitAt(x, y);

    if (gameState.selectedUnit) {
        // Если юнит уже выбран, пытаемся походить или атаковать
        if (clickedUnit && clickedUnit.owner !== gameState.turn) {
            attackUnit(gameState.selectedUnit, clickedUnit);
        } else if (!clickedUnit) {
            moveUnit(gameState.selectedUnit, x, y);
        } else if (clickedUnit.owner === gameState.turn) {
            // Переключаем выбор на другого своего юнита
            gameState.selectedUnit = clickedUnit;
        }
    } else {
        // Выбираем своего юнита
        if (clickedUnit && clickedUnit.owner === gameState.turn && !clickedUnit.hasMoved) {
            gameState.selectedUnit = clickedUnit;
            gameState.state = 'SELECTED';
        }
    }
    renderAll();
}

// Поиск юнита по координатам
function getUnitAt(x, y) {
    return gameState.units.find(u => u.x === x && u.y === y);
}

// Перемещение (Манхэттенское расстояние)
function moveUnit(unit, x, y) {
    const dist = Math.abs(unit.x - x) + Math.abs(unit.y - y);
    if (dist <= unit.type.moveRange) {
        unit.x = x;
        unit.y = y;
        unit.hasMoved = true;
        gameState.selectedUnit = null;
        gameState.state = 'IDLE';
    }
}

// Атака
function attackUnit(attacker, target) {
    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    if (dist <= attacker.type.attackRange) {
        target.hp -= attacker.type.attack;
        attacker.hasMoved = true;
        gameState.selectedUnit = null;
        gameState.state = 'IDLE';
        
        if (target.hp <= 0) {
            // Удаляем убитого из массива
            gameState.units = gameState.units.filter(u => u !== target);
        }
    }
}

// --- СМЕНА ХОДА И РЕСУРСЫ ---
function endTurn() {
    // 1. Проверяем захват точек пехотой
    capturePoints.forEach(pt => {
        const occupier = getUnitAt(pt.x, pt.y);
        if (occupier && occupier.type.canCapture) {
            pt.owner = occupier.owner;
        }
    });

    // 2. Начисляем базовый доход (20) + за каждую точку (15)
    let income = 20;
    capturePoints.forEach(pt => {
        if (pt.owner === gameState.turn) income += 15;
    });
    gameState.players[gameState.turn].points += income;

    // 3. Меняем ход
    gameState.turn = gameState.turn === 1 ? 2 : 1;
    gameState.selectedUnit = null;
    gameState.state = 'IDLE';
    gameState.unitToPlace = null;

    // 4. Восстанавливаем очки действия (hasMoved = false) для нового игрока
    gameState.units.forEach(u => {
        if (u.owner === gameState.turn) u.hasMoved = false;
    });

    updateUI();
    renderAll();
}

// --- ИНТЕРФЕЙС И ГРАФИКА ---
function updateUI() {
    document.getElementById('p1-points').innerText = gameState.players[1].points;
    document.getElementById('p2-points').innerText = gameState.players[2].points;
    
    const turnInd = document.getElementById('turn-indicator');
    turnInd.innerText = `Ход Игрока ${gameState.turn}`;
    turnInd.className = gameState.turn === 1 ? 'turn-p1' : 'turn-p2';
}

function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(); // Из map.js
    
    // Рисуем рамку вокруг выбранного юнита
    if (gameState.selectedUnit) {
        ctx.strokeStyle = '#ffff00'; // Желтый цвет выделения
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;
    }

    // Рисуем юнитов
    gameState.units.forEach(u => {
        let img = loadedImages[u.type.id]; // Берем картинку, которую загрузили в unit.js
        if (img) {
            ctx.drawImage(img, u.x * TILE_SIZE + 2, u.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        // Полоска здоровья
        ctx.fillStyle = '#0f0';
        let hpWidth = (u.hp / u.type.maxHp) * (TILE_SIZE - 4);
        ctx.fillRect(u.x * TILE_SIZE + 2, u.y * TILE_SIZE + TILE_SIZE - 6, hpWidth, 4);
        
        // Индикатор цвета игрока (чтобы не путать свои войска с вражескими)
        ctx.fillStyle = gameState.players[u.owner].color;
        ctx.fillRect(u.x * TILE_SIZE + 2, u.y * TILE_SIZE + TILE_SIZE - 10, 8, 4);

        // Если юнит уже походил — затемняем его
        if (u.hasMoved) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    });
}

// --- ЗАПУСК ---
// Ждем загрузки страницы, предзагружаем картинки и стартуем
window.onload = () => {
    preloadUnitImages(() => {
        initGame();
    });
};
      
