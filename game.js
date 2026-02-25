let gameState = {}; 
let camera = { x: 0, y: 0, zoom: 1 };
let dragState = { isDragging: false, hasMoved: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
let combatNotifTimeout = null; 

window.onload = () => {
    preloadUnitImages(() => {
        initControls(); 
        document.getElementById('btn-main-map').onclick = () => startGame('main');
        document.getElementById('btn-test-map').onclick = () => startGame('test');
    });
};

function startGame(mapType) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    gameState = {
        turn: 1, state: 'IDLE',
        players: {
            1: { points: 100, color: '#ff5555' },
            2: { points: 100, color: '#5555ff' }
        },
        units: [], selectedUnit: null, unitToPlace: null
    };
    camera = { x: 0, y: 0, zoom: 1 };

    generateMap(mapType);
    updateUI();
    renderAll();
}

function initControls() {
    document.getElementById('buy-soldier').onclick = () => prepareBuy('SOLDIER');
    document.getElementById('buy-rpk').onclick = () => prepareBuy('RPK');
    document.getElementById('buy-rpg').onclick = () => prepareBuy('RPG');
    document.getElementById('buy-supply').onclick = () => prepareBuy('SUPPLY');
    document.getElementById('buy-btr').onclick = () => prepareBuy('BTR');
    document.getElementById('buy-tank').onclick = () => prepareBuy('TANK');
    
    document.getElementById('end-turn').onclick = endTurn;
    document.getElementById('btn-start-turn').onclick = startTurn;

    document.getElementById('zoom-in').onclick = () => setZoom(1.2);
    document.getElementById('zoom-out').onclick = () => setZoom(1 / 1.2);

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
    if (gameState.state !== 'BUFFER') renderAll();
}

function onPointerDown(e) {
    if (gameState.state === 'BUFFER') return;
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

// === ЛИНИЯ ВИДИМОСТИ (RAYCASTING) ===

// Проверка: является ли клетка непрозрачной стеной
function isOpaque(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return true;
    let type = gameMap[y][x].type;
    return type === TILES.BUILDING || type === TILES.FACTORY;
}

// Алгоритм Брезенхема для луча зрения
function checkLineOfSight(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    let isInsideBuilding = isOpaque(x0, y0); // Стоит ли юнит ВНУТРИ здания
    let leftBuilding = false; // Маркер: вышли ли мы из здания на улицу

    while (true) {
        // Если луч дошел до цели - значит препятствий не было, цель видно!
        if (cx === x1 && cy === y1) return true; 

        // Проверяем все клетки на пути луча (кроме той, где стоит сам юнит)
        if (cx !== x0 || cy !== y0) {
            let currentOpaque = isOpaque(cx, cy);
            
            if (isInsideBuilding) {
                if (!currentOpaque) {
                    leftBuilding = true; // Луч вылетел из окна на улицу
                } else if (leftBuilding) {
                    return false; // Луч перелетел улицу и уперся в ДРУГОЕ здание. Не видим!
                }
            } else {
                if (currentOpaque) {
                    return false; // Юнит на улице, луч уперся в стену. Дальше ничего не видим!
                }
            }
        }

        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
}

// === ТУМАН ВОЙНЫ И ПОИСК ПУТИ ===
function getVisibleMap() {
    let vis = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
    let spawnZone = GRID_SIZE === 10 ? 1 : 4;
    
    for(let y=0; y<GRID_SIZE; y++){
        for(let x=0; x<GRID_SIZE; x++){
            if (gameState.turn === 1 && x <= spawnZone+2 && y <= spawnZone+2) vis[y][x] = true;
            if (gameState.turn === 2 && x >= GRID_SIZE - (spawnZone+3) && y >= GRID_SIZE - (spawnZone+3)) vis[y][x] = true;
        }
    }
    
    gameState.units.forEach(u => {
        if (u.owner === gameState.turn) {
            let v = u.type.visionRange;
            for(let dy = -v; dy <= v; dy++){
                for(let dx = -v; dx <= v; dx++){
                    let nx = u.x + dx, ny = u.y + dy;
                    if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                        if(Math.abs(dx) + Math.abs(dy) <= v) {
                            // НОВОЕ: Проверяем линию видимости до клетки!
                            if (checkLineOfSight(u.x, u.y, nx, ny)) {
                                vis[ny][nx] = true;
                            }
                        }
                    }
                }
            }
        }
    });
    
    capturePoints.forEach(pt => {
        if (pt.owner === gameState.turn) {
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

// === УВЕДОМЛЕНИЕ О БОЕ ===
function showCombatNotification(dmg, remainingHp, targetName) {
    const notif = document.getElementById('combat-notification');
    document.getElementById('notif-dmg').innerText = dmg;
    
    if (remainingHp <= 0) {
        document.getElementById('notif-hp').innerText = `Уничтожен (${targetName})`;
        notif.style.borderColor = '#ff4444'; 
    } else {
        document.getElementById('notif-hp').innerText = `Осталось ХП: ${remainingHp}`;
        notif.style.borderColor = '#ffaa00'; 
    }

    notif.classList.remove('hidden');
    clearTimeout(combatNotifTimeout);
    combatNotifTimeout = setTimeout(() => {
        notif.classList.add('hidden');
    }, 2500); 
}

// === ИГРОВАЯ ЛОГИКА ===
function prepareBuy(typeKey) {
    const type = UNIT_TYPES[typeKey];
    if (gameState.players[gameState.turn].points >= type.cost) {
        gameState.unitToPlace = type;
        gameState.state = 'PLACING_UNIT';
        gameState.selectedUnit = null;
        alert(`Куплен: ${type.name}. Кликни на свою базу (зону высадки)!`);
        updateUI();
    } else alert("Не хватает очков снабжения!");
}

function handleMapClick(e) {
    if (gameState.state === 'BUFFER') return;

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
        } else alert("Ставить можно только на свободную клетку своей базы!");
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
        
        // НОВОЕ: Проверка видимости перед выстрелом!
        if (!checkLineOfSight(attacker.x, attacker.y, target.x, target.y)) {
            alert("Цель вне зоны видимости (за препятствием)!");
            return;
        }

        let finalDamage = attacker.type.attack;
        if (attacker.type.bonusArmorDamage && target.type.isArmor) finalDamage += attacker.type.bonusArmorDamage;

        target.hp -= finalDamage;
        showCombatNotification(finalDamage, target.hp, target.type.name);

        attacker.hasMoved = true;
        gameState.selectedUnit = null; 
        gameState.state = 'IDLE';
        
        if (target.hp <= 0) gameState.units = gameState.units.filter(u => u !== target);
    } else alert("Враг слишком далеко для выстрела!");
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
    
    gameState.state = 'BUFFER';
    document.getElementById('buffer-title').innerText = `Командир ${gameState.turn}, ваш ход!`;
    document.getElementById('buffer-title').style.color = gameState.players[gameState.turn].color;
    document.getElementById('turn-buffer').classList.remove('hidden');
    
    document.getElementById('combat-notification').classList.add('hidden');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateUI();
}

function startTurn() {
    gameState.state = 'IDLE';
    document.getElementById('turn-buffer').classList.add('hidden');
    renderAll();
}

function updateUI() {
    document.getElementById('p1-points').innerText = gameState.players[1].points;
    document.getElementById('p2-points').innerText = gameState.players[2].points;
    const turnInd = document.getElementById('turn-indicator');
    turnInd.innerText = `Ход Игрока ${gameState.turn}`;
    turnInd.className = gameState.turn === 1 ? 'turn-p1' : 'turn-p2';

    const panel = document.getElementById('unit-info');
    if (panel) {
        if (gameState.selectedUnit) {
            const u = gameState.selectedUnit;
            document.getElementById('ui-name').innerText = u.type.name;
            document.getElementById('ui-name').style.color = gameState.players[u.owner].color;
            document.getElementById('ui-hp').innerText = `${Math.max(0, u.hp)}/${u.type.maxHp}`;
            
            let attackText = u.type.attack;
            if (u.type.bonusArmorDamage) attackText = `${u.type.attack} (Броня: ${u.type.attack + u.type.bonusArmorDamage})`;
            document.getElementById('ui-atk').innerText = attackText;
            
            document.getElementById('ui-move').innerText = u.type.moveRange;
            document.getElementById('ui-range').innerText = u.type.attackRange;
            
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }
}

function renderAll() {
    if (gameState.state === 'BUFFER') return; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); 
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawMap();
    
    let visibleMap = getVisibleMap();

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (!visibleMap[y][x]) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; 
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    if (gameState.selectedUnit && !gameState.selectedUnit.hasMoved) {
        let reachable = getReachableCells(gameState.selectedUnit);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
        reachable.forEach(cell => {
            ctx.fillRect(cell.x * TILE_SIZE, cell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(gameState.selectedUnit.x - tx) + Math.abs(gameState.selectedUnit.y - ty);
                let unitOnTile = getUnitAt(tx, ty);
                
                // Цель атаки должна быть видима физически!
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && unitOnTile.owner !== gameState.turn && visibleMap[ty][tx]) {
                    
                    // НОВОЕ: Подсвечиваем красным только если нет преград для выстрела
                    if (checkLineOfSight(gameState.selectedUnit.x, gameState.selectedUnit.y, tx, ty)) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    if (gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;
    }

    gameState.units.forEach(u => {
        if (u.owner !== gameState.turn && !visibleMap[u.y][u.x]) return;

        let img = loadedImages[u.type.id];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, u.x * TILE_SIZE + 4, u.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(u.x * TILE_SIZE + TILE_SIZE/2, u.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2.5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(u.type.name.charAt(0), u.x * TILE_SIZE + TILE_SIZE/2, u.y * TILE_SIZE + TILE_SIZE/2);
        }

        ctx.fillStyle = '#cc0000';
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, TILE_SIZE - 8, 5);
        ctx.fillStyle = '#00cc00';
        let hpWidth = Math.max(0, (u.hp / u.type.maxHp) * (TILE_SIZE - 8));
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, hpWidth, 5);
        
        ctx.fillStyle = gameState.players[u.owner].color;
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 16, 10, 5);

        if (u.hasMoved) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    });

    ctx.restore(); 
}
