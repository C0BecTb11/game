let gameState = {
    turn: 1,
    state: 'IDLE',
    players: {
        1: { points: 100, color: '#ff5555' },
        2: { points: 100, color: '#5555ff' }
    },
    units: [],
    selectedUnit: null,
    unitToPlace: null
};

function initGame() {
    generateMap();
    setupControls();
    updateUI();
    renderAll();
}

function setupControls() {
    document.getElementById('buy-soldier').onclick = () => prepareBuy('SOLDIER');
    document.getElementById('buy-rpk').onclick = () => prepareBuy('RPK');
    document.getElementById('buy-rpg').onclick = () => prepareBuy('RPG');
    document.getElementById('buy-supply').onclick = () => prepareBuy('SUPPLY');
    document.getElementById('buy-btr').onclick = () => prepareBuy('BTR');
    document.getElementById('buy-tank').onclick = () => prepareBuy('TANK');

    document.getElementById('end-turn').onclick = endTurn;
    canvas.addEventListener('pointerdown', handleMapClick);
}

function prepareBuy(typeKey) {
    const type = UNIT_TYPES[typeKey];
    if (gameState.players[gameState.turn].points >= type.cost) {
        gameState.unitToPlace = type;
        gameState.state = 'PLACING_UNIT';
        gameState.selectedUnit = null;
        alert(`Куплен: ${type.name}. Кликни на свою базу (зону высадки)!`);
    } else {
        alert("Не хватает очков снабжения!");
    }
}

function handleMapClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor(clickX / TILE_SIZE);
    const y = Math.floor(clickY / TILE_SIZE);
    
    // 1. Логика размещения нового юнита
    if (gameState.state === 'PLACING_UNIT' && gameState.unitToPlace) {
        if (isValidSpawn(x, y, gameState.turn)) {
            gameState.players[gameState.turn].points -= gameState.unitToPlace.cost;
            gameState.units.push({
                type: gameState.unitToPlace, x: x, y: y,
                owner: gameState.turn, hp: gameState.unitToPlace.maxHp, hasMoved: true
            });
            gameState.unitToPlace = null;
            gameState.state = 'IDLE';
            updateUI();
        } else {
            alert("Ставить можно только на свободную клетку своей базы!");
        }
        renderAll();
        return;
    }

    const clickedUnit = getUnitAt(x, y);

    // 2. Логика управления (Ходьба / Атака)
    if (gameState.selectedUnit) {
        // Кликнули на врага
        if (clickedUnit && clickedUnit.owner !== gameState.turn) {
            attackUnit(gameState.selectedUnit, clickedUnit);
        } 
        // Кликнули на пустую клетку
        else if (!clickedUnit) {
            // Если попытались пойти в зону хода - идем
            const dist = Math.abs(gameState.selectedUnit.x - x) + Math.abs(gameState.selectedUnit.y - y);
            if (dist <= gameState.selectedUnit.type.moveRange) {
                moveUnit(gameState.selectedUnit, x, y);
            } else {
                // Если кликнули слишком далеко - просто снимаем выделение
                gameState.selectedUnit = null;
                gameState.state = 'IDLE';
            }
        } 
        // Кликнули на своего другого юнита (переключаем выбор)
        else if (clickedUnit.owner === gameState.turn) {
            gameState.selectedUnit = clickedUnit.hasMoved ? null : clickedUnit;
        }
    } else {
        // 3. Выбор юнита, если никто не был выбран
        if (clickedUnit && clickedUnit.owner === gameState.turn && !clickedUnit.hasMoved) {
            gameState.selectedUnit = clickedUnit;
            gameState.state = 'SELECTED';
        }
    }
    renderAll();
}

function isValidSpawn(x, y, playerID) {
    if (getUnitAt(x, y)) return false;
    if (playerID === 1) return x <= 1 && y <= 1;
    if (playerID === 2) return x >= GRID_SIZE - 2 && y >= GRID_SIZE - 2;
    return false;
}

function getUnitAt(x, y) { return gameState.units.find(u => u.x === x && u.y === y); }

function moveUnit(unit, x, y) {
    unit.x = x; unit.y = y; unit.hasMoved = true;
    gameState.selectedUnit = null; gameState.state = 'IDLE';
}

function attackUnit(attacker, target) {
    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    if (dist <= attacker.type.attackRange) {
        target.hp -= attacker.type.attack;
        attacker.hasMoved = true;
        gameState.selectedUnit = null; gameState.state = 'IDLE';
        if (target.hp <= 0) gameState.units = gameState.units.filter(u => u !== target);
    } else {
        alert("Враг слишком далеко для выстрела!");
    }
}

function endTurn() {
    capturePoints.forEach(pt => {
        const occupier = getUnitAt(pt.x, pt.y);
        if (occupier && occupier.type.canCapture) pt.owner = occupier.owner;
    });

    let income = 20;
    capturePoints.forEach(pt => { if (pt.owner === gameState.turn) income += 15; });
    gameState.players[gameState.turn].points += income;

    gameState.turn = gameState.turn === 1 ? 2 : 1;
    gameState.selectedUnit = null;
    gameState.state = 'IDLE';
    gameState.unitToPlace = null;

    gameState.units.forEach(u => { if (u.owner === gameState.turn) u.hasMoved = false; });

    updateUI();
    renderAll();
}

function updateUI() {
    document.getElementById('p1-points').innerText = gameState.players[1].points;
    document.getElementById('p2-points').innerText = gameState.players[2].points;
    const turnInd = document.getElementById('turn-indicator');
    turnInd.innerText = `Ход Игрока ${gameState.turn}`;
    turnInd.className = gameState.turn === 1 ? 'turn-p1' : 'turn-p2';
}

// === САМАЯ ВАЖНАЯ ЧАСТЬ: ОТРИСОВКА ===
function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    
    // 1. ПОДСВЕТКА ЗОНЫ ХОДА И АТАКИ
    if (gameState.selectedUnit && !gameState.selectedUnit.hasMoved) {
        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(gameState.selectedUnit.x - tx) + Math.abs(gameState.selectedUnit.y - ty);
                let unitOnTile = getUnitAt(tx, ty);
                
                // Зона ходьбы (синим), если клетка пустая
                if (dist <= gameState.selectedUnit.type.moveRange && !unitOnTile) {
                    ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
                
                // Цель для атаки (красным), если враг в радиусе стрельбы
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && unitOnTile.owner !== gameState.turn) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // 2. ВЫДЕЛЕНИЕ ВЫБРАННОГО ЮНИТА
    if (gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Желтый фон под юнитом
        ctx.fillRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#ffff00'; // Желтая рамка
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;
    }

    // 3. ОТРИСОВКА ВСЕХ ЮНИТОВ
    gameState.units.forEach(u => {
        let img = loadedImages[u.type.id];
        
        // Проверяем, существует ли картинка и загрузилась ли она успешно
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, u.x * TILE_SIZE + 4, u.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
            // ФОЛБЭК: Если картинки нет, рисуем цветной кружок
            ctx.fillStyle = '#444'; // Темно-серый фон
            ctx.beginPath();
            ctx.arc(u.x * TILE_SIZE + TILE_SIZE/2, u.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2.5, 0, Math.PI*2);
            ctx.fill();
            // Первая буква юнита
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(u.type.name.charAt(0), u.x * TILE_SIZE + TILE_SIZE/2, u.y * TILE_SIZE + TILE_SIZE/2);
        }

        // Полоска здоровья (красная подложка, зеленое хп)
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, TILE_SIZE - 8, 5);
        ctx.fillStyle = '#00cc00';
        let hpWidth = Math.max(0, (u.hp / u.type.maxHp) * (TILE_SIZE - 8));
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, hpWidth, 5);
        
        // Маленький маркер цвета игрока (чтобы точно отличать своих от чужих)
        ctx.fillStyle = gameState.players[u.owner].color;
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 16, 10, 5);

        // Если юнит уже походил — затемняем его
        if (u.hasMoved) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    });
}

window.onload = () => {
    preloadUnitImages(() => { initGame(); });
};
      
