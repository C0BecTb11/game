let gameState = {}; 
let camera = { x: 0, y: 0, zoom: 1 };
let dragState = { isDragging: false, hasMoved: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
let combatNotifTimeout = null; 

window.onload = () => {
    preloadUnitImages(() => {
        initControls(); 
    });
};

function startGame(mapType, networkData = null) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    camera = { x: 0, y: 0, zoom: 1 };
    if (window.isOnlineGame && window.myPlayerId === 2) {
        camera.x = (GRID_SIZE * TILE_SIZE) - 600; 
        camera.y = (GRID_SIZE * TILE_SIZE) - 600;
    }

    // Получаем никнейм из системы авторизации
    let myName = window.currentUser ? window.currentUser.user_metadata.display_name : `Командир ${window.myPlayerId}`;

    if (networkData) {
        window.applyNetworkState(networkData.gameState, networkData.gameMap, networkData.capturePoints);
        
        // Если зашел Игрок 2, обновляем его имя в базе
        if (window.myPlayerId === 2 && gameState.players[2].name === 'Ожидание...') {
            gameState.players[2].name = myName;
            if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
            updateUI();
        }
    } 
    else {
        // Создание новой игры Игроком 1
        gameState = {
            turn: 1, state: 'IDLE',
            players: {
                1: { points: 100, color: '#ff5555', name: myName },
                2: { points: 100, color: '#5555ff', name: 'Ожидание...' }
            },
            units: [], selectedUnit: null, unitToPlace: null
        };
        generateMap(mapType);
        
        if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
        updateUI();
        renderAll();
    }
}

// === СЕТЕВАЯ СИНХРОНИЗАЦИЯ ===
window.applyNetworkState = function(newState, newMap, newPoints) {
    // Восстановление ссылок на объекты после JSON
    newMap.forEach(row => {
        row.forEach(cell => {
            cell.type = Object.values(TILES).find(t => t.id === cell.type.id);
        });
    });

    if (newState.units) {
        newState.units.forEach(u => {
            u.type = Object.values(UNIT_TYPES).find(t => t.id === u.type.id);
        });
    }

    gameState = newState;
    gameMap = newMap;
    capturePoints = newPoints;
    
    if (gameState.turn !== window.myPlayerId) {
        gameState.selectedUnit = null;
        gameState.state = 'IDLE';
        gameState.unitToPlace = null;
    }
    
    updateUI();
    renderAll();
};

function initControls() {
    document.getElementById('buy-soldier').onclick = () => prepareBuy('SOLDIER');
    document.getElementById('buy-rpk').onclick = () => prepareBuy('RPK');
    document.getElementById('buy-rpg').onclick = () => prepareBuy('RPG');
    document.getElementById('buy-supply').onclick = () => prepareBuy('SUPPLY');
    document.getElementById('buy-btr').onclick = () => prepareBuy('BTR');
    document.getElementById('buy-tank').onclick = () => prepareBuy('TANK');
    
    document.getElementById('end-turn').onclick = endTurn;

    document.getElementById('zoom-in').onclick = () => setZoom(1.2);
    document.getElementById('zoom-out').onclick = () => setZoom(1 / 1.2);

    const helpModal = document.getElementById('encyclopedia-modal');
    document.getElementById('btn-menu-help').onclick = () => helpModal.classList.remove('hidden');
    document.getElementById('btn-game-help').onclick = () => helpModal.classList.remove('hidden');
    document.getElementById('btn-close-help').onclick = () => helpModal.classList.add('hidden');

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        setZoom(e.deltaY > 0 ? (1/1.1) : 1.1);
    }, { passive: false });
}

function setZoom(factor) {
    camera.zoom *= factor;
    camera.zoom = Math.max(0.4, Math.min(camera.zoom, 2.5));
    renderAll();
}

function onPointerDown(e) {
    dragState.isDragging = true;
    dragState.hasMoved = false;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.camStartX = camera.x;
    dragState.camStartY = camera.y;
    canvas.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
    if (!dragState.isDragging) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragState.hasMoved = true;

    if (dragState.hasMoved) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        camera.x = dragState.camStartX - (dx * scaleX) / camera.zoom;
        camera.y = dragState.camStartY - (dy * scaleY) / camera.zoom;
        renderAll();
    }
}

function onPointerUp(e) {
    if (!dragState.isDragging) return;
    dragState.isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
    if (!dragState.hasMoved) handleMapClick(e);
}

function isOpaque(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    let type = gameMap[y][x].type;
    return type === TILES.BUILDING || type === TILES.FACTORY;
}

function checkLineOfSight(x0, y0, x1, y1, unit = null) {
    if (x0 === x1 && y0 === y1) return true;

    let isInsideBuilding = isOpaque(x0, y0);
    let leftBuilding = false;
    let adjacentWallPassed = false; 
    
    // Проверяем, техника ли это (если юнит передан)
    let isVehicle = unit ? (unit.type.isArmor || unit.type.id === 'supply') : false;

    // Используем плотный алгоритм DDA, чтобы луч не проскальзывал сквозь углы
    let steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    let checkedTiles = new Set();
    checkedTiles.add(`${x0},${y0}`);

    for (let i = 1; i <= steps; i++) {
        let t = i / steps;
        let cx = Math.round(x0 + (x1 - x0) * t);
        let cy = Math.round(y0 + (y1 - y0) * t);

        let key = `${cx},${cy}`;
        if (checkedTiles.has(key)) continue;
        checkedTiles.add(key);

        // Если это сама цель (например, край здания) - мы её видим!
        if (cx === x1 && cy === y1) return true; 

        let currentOpaque = isOpaque(cx, cy);

        if (isInsideBuilding) {
            // Если мы УЖЕ внутри здания и смотрим наружу
            if (!currentOpaque) leftBuilding = true;
            else if (leftBuilding) return false; // Вышли из здания и уперлись в новое
        } else {
            // Если смотрим СНАРУЖИ на здание
            if (currentOpaque) {
                // Если стена находится на соседней от нас клетке (вплотную)
                let isAdjacent = Math.abs(cx - x0) <= 1 && Math.abs(cy - y0) <= 1;
                
                // Пехота может "заглянуть в окно" (пропустить 1 тайл стены), техника — нет
                if (isAdjacent && !adjacentWallPassed && !isVehicle) {
                    adjacentWallPassed = true; 
                } else {
                    return false; // Взгляд/выстрел заблокирован!
                }
            }
        }
    }
    return true;
}

function getVisibleMap() {
    let vis = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
    let spawnZone = GRID_SIZE === 10 ? 1 : 4;
    let viewPlayer = window.myPlayerId;
    
    // 1. Зона видимости вокруг спавна
    for(let y=0; y<GRID_SIZE; y++){
        for(let x=0; x<GRID_SIZE; x++){
            if (viewPlayer === 1 && x <= spawnZone+2 && y <= spawnZone+2) vis[y][x] = true;
            if (viewPlayer === 2 && x >= GRID_SIZE - (spawnZone+3) && y >= GRID_SIZE - (spawnZone+3)) vis[y][x] = true;
        }
    }
    
    // 2. Видимость от каждого юнита
    gameState.units.forEach(u => {
        if (u.owner === viewPlayer) {
            let v = u.type.visionRange;
            
            for(let dy = -v; dy <= v; dy++){
                for(let dx = -v; dx <= v; dx++){
                    let nx = u.x + dx, ny = u.y + dy;
                    if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                        if(Math.abs(dx) + Math.abs(dy) <= v) {
                            
                            // Вот здесь вся магия 3 шага!
                            // Мы убрали лишние проверки и просто передаем сам юнит (u) пятым параметром
                            if (checkLineOfSight(u.x, u.y, nx, ny, u)) {
                                vis[ny][nx] = true;
                            }
                            
                        }
                    }
                }
            }
        }
    });
    
    // 3. Видимость вокруг захваченных точек
    capturePoints.forEach(pt => {
        if (pt.owner === viewPlayer) {
            for(let dy = -1; dy <= 1; dy++){
                for(let dx = -1; dx <= 1; dx++){
                    let nx = pt.x + dx, ny = pt.y + dy;
                    if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) vis[ny][nx] = true;
                }
            }
        }
    });
    return vis;
}

function isPassable(x, y, unit) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    let tileType = gameMap[y][x].type;
    if (tileType === TILES.WATER) return false;

    let isVehicle = unit.type.isArmor || unit.type.id === 'supply';
    if (isVehicle && (tileType === TILES.BUILDING || tileType === TILES.FACTORY)) return false;

    let occupier = getUnitAt(x, y);
    if (occupier && occupier.owner !== unit.owner) return false;
    return true;
}

function getReachableCells(unit) {
    let reachable = [];
    let visited = new Set();
    let queue = [{ x: unit.x, y: unit.y, dist: 0 }];
    visited.add(`${unit.x},${unit.y}`);

    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr.x !== unit.x || curr.y !== unit.y) {
            if (!getUnitAt(curr.x, curr.y)) reachable.push({ x: curr.x, y: curr.y });
        }
        if (curr.dist < unit.type.moveRange) {
            let neighbors = [
                {x: curr.x + 1, y: curr.y}, {x: curr.x - 1, y: curr.y},
                {x: curr.x, y: curr.y + 1}, {x: curr.x, y: curr.y - 1}
            ];
            for (let n of neighbors) {
                let key = `${n.x},${n.y}`;
                if (!visited.has(key) && isPassable(n.x, n.y, unit)) {
                    visited.add(key);
                    queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
                }
            }
        }
    }
    return reachable;
}

function prepareBuy(typeKey) {
    if (gameState.turn !== window.myPlayerId) {
        alert("Ожидайте хода противника!");
        return;
    }

    const type = UNIT_TYPES[typeKey];
    if (gameState.players[gameState.turn].points >= type.cost) {
        gameState.unitToPlace = type;
        gameState.state = 'PLACING_UNIT';
        gameState.selectedUnit = null;
        alert(`Куплен: ${type.name}. Кликни на зону высадки!`);
        updateUI();
    } else alert("Не хватает очков!");
}

function handleMapClick(e) {
    if (gameState.turn !== window.myPlayerId) return; 

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const worldX = ((e.clientX - rect.left) * scaleX / camera.zoom) + camera.x;
    const worldY = ((e.clientY - rect.top) * scaleY / camera.zoom) + camera.y;

    const x = Math.floor(worldX / TILE_SIZE);
    const y = Math.floor(worldY / TILE_SIZE);

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return; 
    
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
        } else alert("Недопустимая зона!");
        renderAll();
        return;
    }

    const clickedUnit = getUnitAt(x, y);
    let visibleMap = getVisibleMap();

    if (gameState.selectedUnit) {
        if (clickedUnit && clickedUnit.owner !== gameState.turn && visibleMap[y][x]) {
            attackUnit(gameState.selectedUnit, clickedUnit);
        } else if (!clickedUnit || (clickedUnit && !visibleMap[y][x])) {
            let reachable = getReachableCells(gameState.selectedUnit);
            let canMove = reachable.some(c => c.x === x && c.y === y);
            if (canMove) moveUnit(gameState.selectedUnit, x, y);
            else { gameState.selectedUnit = null; gameState.state = 'IDLE'; }
        } else if (clickedUnit.owner === gameState.turn) {
            gameState.selectedUnit = clickedUnit.hasMoved ? null : clickedUnit;
        }
    } else {
        if (clickedUnit && clickedUnit.owner === gameState.turn && !clickedUnit.hasMoved) {
            gameState.selectedUnit = clickedUnit;
            gameState.state = 'SELECTED';
        }
    }
    
    updateUI(); 
    renderAll();
}

function isValidSpawn(x, y, playerID) {
    if (getUnitAt(x, y)) return false;
    let radius = GRID_SIZE === 10 ? 1 : 4; 
    if (playerID === 1) return x <= radius && y <= radius; 
    if (playerID === 2) return x >= GRID_SIZE - (radius + 1) && y >= GRID_SIZE - (radius + 1);
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
        // Передаем attacker, чтобы система знала, кто именно пытается выстрелить
        if (!checkLineOfSight(attacker.x, attacker.y, target.x, target.y, attacker)) {
            alert("Нет линии видимости!");
            return;
        }
        let finalDamage = attacker.type.attack;
        if (attacker.type.bonusArmorDamage && target.type.isArmor) finalDamage += attacker.type.bonusArmorDamage;
        target.hp -= finalDamage;
        
        // Эта функция теперь лежит в render.js
        if(typeof showCombatNotification === 'function') {
            showCombatNotification(finalDamage, target.hp, target.type.name, false);
        }
        
        attacker.hasMoved = true;
        gameState.selectedUnit = null; 
        gameState.state = 'IDLE';
        if (target.hp <= 0) gameState.units = gameState.units.filter(u => u !== target);
    } else alert("Цель вне зоны досягаемости!");
}

function endTurn() {
    if (gameState.turn !== window.myPlayerId) return;
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
    gameState.units.forEach(u => { if (u.owner === window.myPlayerId) u.hasMoved = false; });
    
    const notif = document.getElementById('combat-notification');
    if(notif) notif.classList.add('hidden');
    
    updateUI();
    renderAll();
    if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
      }
          
