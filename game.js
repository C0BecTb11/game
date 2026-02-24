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
    canvas.addEventListener('pointerdown', handleMapClick); // pointerdown для телефонов и ПК
}

function prepareBuy(typeKey) {
    const type = UNIT_TYPES[typeKey];
    if (gameState.players[gameState.turn].points >= type.cost) {
        gameState.unitToPlace = type;
        gameState.state = 'PLACING_UNIT';
        gameState.selectedUnit = null;
        alert(`Куплен: ${type.name}. Кликни на свою базу!`);
    } else {
        alert("Не хватает очков!");
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

    if (gameState.selectedUnit) {
        if (clickedUnit && clickedUnit.owner !== gameState.turn) {
            attackUnit(gameState.selectedUnit, clickedUnit);
        } else if (!clickedUnit) {
            moveUnit(gameState.selectedUnit, x, y);
        } else if (clickedUnit.owner === gameState.turn) {
            gameState.selectedUnit = clickedUnit;
        }
    } else {
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
    const dist = Math.abs(unit.x - x) + Math.abs(unit.y - y);
    if (dist <= unit.type.moveRange) {
        unit.x = x; unit.y = y; unit.hasMoved = true;
        gameState.selectedUnit = null; gameState.state = 'IDLE';
    }
}

function attackUnit(attacker, target) {
    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    if (dist <= attacker.type.attackRange) {
        target.hp -= attacker.type.attack;
        attacker.hasMoved = true;
        gameState.selectedUnit = null; gameState.state = 'IDLE';
        if (target.hp <= 0) gameState.units = gameState.units.filter(u => u !== target);
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

function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    
    if (gameState.selectedUnit) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;
    }

    gameState.units.forEach(u => {
        let img = loadedImages[u.type.id];
        if (img) ctx.drawImage(img, u.x * TILE_SIZE + 2, u.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = '#0f0';
        let hpWidth = (u.hp / u.type.maxHp) * (TILE_SIZE - 4);
        ctx.fillRect(u.x * TILE_SIZE + 2, u.y * TILE_SIZE + TILE_SIZE - 6, hpWidth, 4);
        
        ctx.fillStyle = gameState.players[u.owner].color;
        ctx.fillRect(u.x * TILE_SIZE + 2, u.y * TILE_SIZE + TILE_SIZE - 10, 8, 4);

        if (u.hasMoved) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    });
}

window.onload = () => {
    preloadUnitImages(() => { initGame(); });
};
  
