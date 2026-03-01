let gameState = {}; 
let camera = { x: 0, y: 0, zoom: 1 };
let dragState = { isDragging: false, hasMoved: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
let combatNotifTimeout = null; 

window.onload = () => {
    preloadUnitImages(() => {
        initControls(); 
    });
};

// === ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАПУСКА ===
function startGame(mapType, networkData = null) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // Получаем никнейм из системы авторизации
    let myName = window.currentUser ? window.currentUser.user_metadata.display_name : `Командир ${window.myPlayerId}`;

    if (networkData) {
        // СНАЧАЛА применяем данные из сети (это автоматически обновит GRID_SIZE под размер карты)
        window.applyNetworkState(networkData.gameState, networkData.gameMap, networkData.capturePoints);
        
        // ТЕПЕРЬ выставляем камеру, зная правильные размеры карты
        camera = { x: 0, y: 0, zoom: 1 };
        if (window.isOnlineGame && window.myPlayerId === 2) {
            camera.x = (GRID_SIZE * TILE_SIZE) - 600; 
            camera.y = (GRID_SIZE * TILE_SIZE) - 600;
        }

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
            units: [], selectedUnit: null, unitToPlace: null, mines: [], stashes: [] // <--
        };
        
        generateMap(mapType);
        
        camera = { x: 0, y: 0, zoom: 1 };
        if (window.isOnlineGame && window.myPlayerId === 2) {
            camera.x = (GRID_SIZE * TILE_SIZE) - 600; 
            camera.y = (GRID_SIZE * TILE_SIZE) - 600;
        }
        
        if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);
        updateUI();
        renderAll();
    }
}

// === ОБНОВЛЕННАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ ===
window.applyNetworkState = function(newState, newMap, newPoints) {
    // 1. ИСПРАВЛЕНИЕ: Автоматически подстраиваем размер игры под загруженную карту
    if (newMap && newMap.length > 0) {
        GRID_SIZE = newMap.length; 
        TILE_SIZE = GRID_SIZE <= 15 ? 45 : 40; 
    }

    // 2. БЕЗОПАСНОЕ Восстановление ссылок на объекты после JSON
    if (newMap) {
        newMap.forEach(row => {
            if (row) {
                row.forEach(cell => {
                    if (cell && cell.type) {
                        cell.type = Object.values(TILES).find(t => t.id === cell.type.id) || TILES.ROAD;
                    }
                });
            }
        });
    }

    if (newState && newState.units) {
        newState.units.forEach(u => {
            u.type = Object.values(UNIT_TYPES).find(t => t.id === u.type.id);
            // Восстанавливаем пассажиров
            if (u.cargo) {
                u.cargo.forEach(passenger => {
                    passenger.type = Object.values(UNIT_TYPES).find(t => t.id === passenger.type.id);
                });
            }
            // Гарантируем, что у снабжения не пропадет объект груза при передаче по сети
            if (u.type.id === 'supply' && !u.cargoRes) {
                u.cargoRes = { medkits: 0, mines: 0, materials: 0 };
            }
        });
    }

    if (newState) gameState = newState;
    if (!gameState.mines) gameState.mines = [];
    if (!gameState.stashes) gameState.stashes = [];
    if (newMap) gameMap = newMap;
    if (newPoints) capturePoints = newPoints;
    
    // Сбрасываем выделение, если сейчас не наш ход
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
    
    // --- НОВЫЕ КНОПКИ ---
    document.getElementById('buy-medic').onclick = () => prepareBuy('MEDIC');
    document.getElementById('buy-miner').onclick = () => prepareBuy('MINER');
    document.getElementById('buy-sniper').onclick = () => prepareBuy('SNIPER');
    document.getElementById('buy-specnaz').onclick = () => prepareBuy('SPECNAZ');
    document.getElementById('buy-transport').onclick = () => prepareBuy('TRANSPORT');
    
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
    
    document.getElementById('btn-place-mine').onclick = () => {
        if (gameState.selectedUnit && gameState.selectedUnit.type.id === 'miner' && gameState.selectedUnit.mines > 0) {
            gameState.state = gameState.state === 'PLACING_MINE' ? 'IDLE' : 'PLACING_MINE';
            updateUI();
            renderAll();
        }
    };
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

        if (gameState.state === 'PLACING_MINE' && gameState.selectedUnit) {
        let dist = Math.max(Math.abs(gameState.selectedUnit.x - x), Math.abs(gameState.selectedUnit.y - y));
        if (dist <= 1 && dist > 0 && isPassable(x, y, gameState.selectedUnit) && !getUnitAt(x, y)) {
            if (gameState.mines.find(m => m.x === x && m.y === y)) {
                alert("Здесь уже есть мина!");
                return;
            }
            gameState.mines.push({ x: x, y: y, owner: window.myPlayerId, damage: gameState.selectedUnit.type.mineDamage });
            gameState.selectedUnit.mines--;
            gameState.selectedUnit.hasMoved = true;
            gameState.state = 'IDLE';
            gameState.selectedUnit = null;
        } else {
            alert("Недопустимая клетка для установки мины!");
            gameState.state = 'IDLE';
        }
        updateUI();
        renderAll();
        return;
        }

        // === ЛОГИКА УСТАНОВКИ СКЛАДА ===
    if (gameState.state === 'PLACING_STASH' && gameState.selectedUnit) {
        let dist = Math.max(Math.abs(gameState.selectedUnit.x - x), Math.abs(gameState.selectedUnit.y - y));
        // Можно ставить на свободную клетку или прямо под себя
        if (dist <= 1 && isPassable(x, y, gameState.selectedUnit) && !getUnitAt(x, y)) {
            if (gameState.stashes.find(s => s.x === x && s.y === y)) {
                alert("Здесь уже есть склад!");
                return;
            }
            gameState.stashes.push({
                x: x, y: y,
                res: { medkits: 0, mines: 0, materials: 0 }
            });
            gameState.state = 'IDLE';
            updateUI();
            renderAll();
        } else {
            alert("Недопустимая клетка для зоны выгрузки!");
            gameState.state = 'IDLE';
        }
        return;
    }

        // === ЛОГИКА АВТОПИЛОТА (ЗАДАЕМ ЦЕЛЬ) ===
    if (gameState.state === 'SETTING_ROUTE' && gameState.selectedUnit) {
        if (isPassable(x, y, gameState.selectedUnit) || getUnitAt(x, y)) {
            gameState.selectedUnit.autopilotTarget = { x: x, y: y };
            gameState.state = 'IDLE';
            updateUI();
            renderAll();
        } else {
            alert("Недопустимая точка для автопилота!");
            gameState.state = 'IDLE';
        }
        return;
    }
    
    if (gameState.state === 'PLACING_UNIT' && gameState.unitToPlace) {
        if (isValidSpawn(x, y, gameState.turn)) {
            gameState.players[gameState.turn].points -= gameState.unitToPlace.cost;
            
            let newUnit = {
                type: gameState.unitToPlace, x: x, y: y,
                owner: gameState.turn, hp: gameState.unitToPlace.maxHp, hasMoved: true
            };
            
            // Если покупаем медика - выдаем ему полный запас аптечек
            if (gameState.unitToPlace.id === 'medic') newUnit.medkits = gameState.unitToPlace.maxMedkits;
                        // Если покупаем минёра - выдаем мины
            if (gameState.unitToPlace.id === 'miner') newUnit.mines = gameState.unitToPlace.maxMines;
            
            gameState.units.push(newUnit);
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
        // === РЕЖИМ ОСМОТРА (Выделен враг или свой походивший юнит) ===
        if (gameState.selectedUnit.owner !== gameState.turn || gameState.selectedUnit.hasMoved) {
            if (clickedUnit && clickedUnit.owner === gameState.turn && !clickedUnit.hasMoved) {
                gameState.selectedUnit = clickedUnit; // Берем под контроль нового бойца
                gameState.state = 'SELECTED';
            } else if (clickedUnit && visibleMap[y][x]) {
                gameState.selectedUnit = clickedUnit; // Осматриваем другого юнита
                gameState.state = 'VIEWING';
            } else {
                gameState.selectedUnit = null; // Клик в пустоту сбрасывает выделение
                gameState.state = 'IDLE';
            }
        } 
        // === РЕЖИМ ДЕЙСТВИЯ (Выделен наш активный боец) ===
        else {
            if (clickedUnit && clickedUnit.owner !== gameState.turn && visibleMap[y][x]) {
                attackUnit(gameState.selectedUnit, clickedUnit); // Атакуем врага
            } else if (!clickedUnit || (clickedUnit && !visibleMap[y][x])) {
                // Движение
                let reachable = getReachableCells(gameState.selectedUnit);
                let canMove = reachable.some(c => c.x === x && c.y === y);
                if (canMove) moveUnit(gameState.selectedUnit, x, y);
                else { gameState.selectedUnit = null; gameState.state = 'IDLE'; }
            } else if (clickedUnit.owner === gameState.turn) {
                
                let dist = Math.max(Math.abs(gameState.selectedUnit.x - clickedUnit.x), Math.abs(gameState.selectedUnit.y - clickedUnit.y));
                
                // === МЕХАНИКА: ЛЕЧЕНИЕ ===
                if (gameState.selectedUnit.type.id === 'medic' && clickedUnit.type.isInfantry && dist <= 1 && gameState.selectedUnit !== clickedUnit) {
                    if (clickedUnit.hp < clickedUnit.type.maxHp) {
                        if (gameState.selectedUnit.medkits > 0) {
                            if (confirm(`Вылечить ${clickedUnit.type.name}?`)) {
                                let heal = Math.min(gameState.selectedUnit.type.healAmount, clickedUnit.type.maxHp - clickedUnit.hp);
                                clickedUnit.hp += heal;
                                gameState.selectedUnit.medkits--; 
                                gameState.selectedUnit.hasMoved = true; 
                                
                                if(typeof showCombatNotification === 'function') {
                                    showCombatNotification(heal, clickedUnit.hp, clickedUnit.type.name, false, true);
                                }
                                
                                gameState.selectedUnit = null;
                                gameState.state = 'IDLE';
                                updateUI();
                                renderAll();
                            }
                        } else alert("У медика закончились аптечки!");
                    } else alert("Этот боец полностью здоров!");
                }
                // === МЕХАНИКА ТРАНСПОРТА ===
                else if (gameState.selectedUnit.type.isInfantry && clickedUnit.type.transportCapacity && dist <= 1 && gameState.selectedUnit !== clickedUnit) {
                    if (!clickedUnit.cargo) clickedUnit.cargo = [];
                    
                    if (clickedUnit.cargo.length < clickedUnit.type.transportCapacity) {
                        if (confirm(`Посадить ${gameState.selectedUnit.type.name} в ${clickedUnit.type.name}?`)) {
                            clickedUnit.cargo.push(gameState.selectedUnit);
                            gameState.units = gameState.units.filter(u => u !== gameState.selectedUnit); 
                            gameState.selectedUnit = null; 
                            gameState.state = 'IDLE';
                            updateUI();
                            renderAll();
                        }
                    } else alert("В машине нет свободных мест!");
                } else {
                    // Клик по другому своему юниту -> берем под контроль или просто осматриваем (если ходил)
                    gameState.selectedUnit = clickedUnit;
                    gameState.state = clickedUnit.hasMoved ? 'VIEWING' : 'SELECTED';
                }
            }
        }
    } else {
        // === НИКТО НЕ ВЫБРАН ===
        if (clickedUnit && visibleMap[y][x]) {
            gameState.selectedUnit = clickedUnit;
            // Если это наш боец и он не ходил - выделяем для действий. Иначе - просто смотрим.
            gameState.state = (clickedUnit.owner === gameState.turn && !clickedUnit.hasMoved) ? 'SELECTED' : 'VIEWING';
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

// Функция строит маршрут по шагам, чтобы юнит не мог "перепрыгнуть" мину
function findPath(unit, startX, startY, endX, endY) {
    let queue = [[{x: startX, y: startY}]];
    let visited = new Set();
    visited.add(`${startX},${startY}`);

    while(queue.length > 0) {
        let path = queue.shift();
        let curr = path[path.length - 1];

        if (curr.x === endX && curr.y === endY) return path;

        if (path.length - 1 < unit.type.moveRange) {
            let neighbors = [
                {x: curr.x + 1, y: curr.y}, {x: curr.x - 1, y: curr.y},
                {x: curr.x, y: curr.y + 1}, {x: curr.x, y: curr.y - 1}
            ];
            for (let n of neighbors) {
                if (!visited.has(`${n.x},${n.y}`) && isPassable(n.x, n.y, unit)) {
                    visited.add(`${n.x},${n.y}`);
                    queue.push([...path, n]);
                }
            }
        }
    }
    return [{x: startX, y: startY}, {x: endX, y: endY}]; 
}

function moveUnit(unit, x, y) {
    let path = findPath(unit, unit.x, unit.y, x, y);
    let finalX = unit.x;
    let finalY = unit.y;
    let mineHit = null;

    // Идем по каждой клетке маршрута и проверяем наличие мин
    for (let i = 1; i < path.length; i++) {
        finalX = path[i].x;
        finalY = path[i].y;
        let mineIdx = gameState.mines.findIndex(m => m.x === finalX && m.y === finalY);
        
        if (mineIdx !== -1) {
            mineHit = gameState.mines[mineIdx]; // Наступили на мину!
            gameState.mines.splice(mineIdx, 1); // Мина взрывается и исчезает
            break; // Дальше не идем
        }
    }

    unit.x = finalX;
    unit.y = finalY;
    unit.hasMoved = true;
    gameState.selectedUnit = null; 
    gameState.state = 'IDLE';

    if (mineHit) {
        unit.hp -= mineHit.damage;
        if(typeof showCombatNotification === 'function') {
            showCombatNotification(mineHit.damage, unit.hp, unit.type.name, false);
        }
        if (unit.hp <= 0) {
            gameState.units = gameState.units.filter(u => u !== unit);
        }
        alert("💥 БАБАХ! Юнит подорвался на мине!");
    }
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
    
    // ПРОЦЕССИНГ АВТОПИЛОТА (Едем перед завершением хода)
    gameState.units.forEach(u => {
        if (u.owner === gameState.turn && u.autopilotTarget && !u.hasMoved) {
            let movesLeft = u.type.moveRange;
            while(movesLeft > 0) {
                let dx = Math.sign(u.autopilotTarget.x - u.x);
                let dy = Math.sign(u.autopilotTarget.y - u.y);
                
                if (dx === 0 && dy === 0) {
                    u.autopilotTarget = null; // Приехали!
                    break; 
                }
                
                let nx = u.x;
                let ny = u.y;
                
                // Шагаем по координатам
                if (dx !== 0 && isPassable(u.x + dx, u.y, u) && !getUnitAt(u.x + dx, u.y)) nx = u.x + dx;
                else if (dy !== 0 && isPassable(u.x, u.y + dy, u) && !getUnitAt(u.x, u.y + dy)) ny = u.y + dy;
                else break; // Уперлись в препятствие (танк или здание)
                
                u.x = nx;
                u.y = ny;
                movesLeft--;
                
                // Проверка на мины по пути автопилота!
                let mineIdx = gameState.mines.findIndex(m => m.x === nx && m.y === ny);
                if (mineIdx !== -1) {
                    let m = gameState.mines[mineIdx];
                    gameState.mines.splice(mineIdx, 1);
                    u.hp -= m.damage;
                    if(typeof showCombatNotification === 'function') showCombatNotification(m.damage, u.hp, u.type.name, false);
                    if (u.hp <= 0) { gameState.units = gameState.units.filter(unit => unit !== u); break; }
                }
            }
        }
    });

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

// === УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ МАГАЗИНА ===
window.toggleCategory = function(categoryId) {
    const categoryDiv = document.getElementById(categoryId);
    if (categoryDiv) {
        // Переключаем класс hidden (если он есть - убираем, если нет - добавляем)
        categoryDiv.classList.toggle('hidden');
    }
};

// === ЛОГИКА ВЫСАДКИ ДЕСАНТА ===
window.dropCargo = function(index) {
    let transport = gameState.selectedUnit;
    if (!transport || !transport.cargo || !transport.cargo[index]) return;

    let unitToDrop = transport.cargo[index];
    let freeTiles = [];
    
    // Ищем свободные клетки вокруг транспорта (по диагонали и прямым)
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = transport.x + dx;
            let ny = transport.y + dy;
            
            // Если клетка проходима и на ней НИКТО не стоит
            if (isPassable(nx, ny, unitToDrop) && !getUnitAt(nx, ny)) {
                freeTiles.push({x: nx, y: ny});
            }
        }
    }

    if (freeTiles.length === 0) {
        alert("Вокруг нет места для высадки!");
        return;
    }

    // Высаживаем на первую попавшуюся свободную клетку
    let dropTile = freeTiles[0]; 
    unitToDrop.x = dropTile.x;
    unitToDrop.y = dropTile.y;
    unitToDrop.hasMoved = true; // Высаженный боец сразу теряет ход, это баланс
    
    transport.cargo.splice(index, 1);
    gameState.units.push(unitToDrop);
    
    updateUI();
    renderAll();
};

// === ЛОГИКА МАШИНЫ СНАБЖЕНИЯ ===
window.changeSupply = function(resourceType) {
    let u = gameState.selectedUnit;
    if (!u || u.type.id !== 'supply') return;
    
    // Если у машины еще нет инвентаря, создаем его
    if (!u.cargoRes) u.cargoRes = { medkits: 0, mines: 0, materials: 0 };
    
    let total = u.cargoRes.medkits + u.cargoRes.mines + u.cargoRes.materials;
    
    if (total < u.type.maxCargo) {
        u.cargoRes[resourceType]++;
        updateUI();
        renderAll();
    } else {
        alert("Кузов заполнен! Максимум 10 ящиков.");
    }
};

window.clearSupply = function() {
    let u = gameState.selectedUnit;
    if (!u || u.type.id !== 'supply') return;
    
    u.cargoRes = { medkits: 0, mines: 0, materials: 0 };
    updateUI();
    renderAll();
};

window.toggleStashPlacement = function() {
    if (gameState.state === 'PLACING_STASH') {
        gameState.state = 'IDLE';
    } else {
        gameState.state = 'PLACING_STASH';
    }
    updateUI();
    renderAll();
};

window.transferRes = function(resType, direction) {
    let u = gameState.selectedUnit;
    if (!u || u.type.id !== 'supply') return;
    
    // Ищем склад в радиусе 1 клетки
    let stash = gameState.stashes.find(s => Math.max(Math.abs(s.x - u.x), Math.abs(s.y - u.y)) <= 1);
    if (!stash) return;

    if (direction === 'to_stash') {
        if (u.cargoRes[resType] > 0) {
            u.cargoRes[resType]--;
            stash.res[resType]++;
        }
    } else if (direction === 'to_truck') {
        let total = u.cargoRes.medkits + u.cargoRes.mines + u.cargoRes.materials;
        if (stash.res[resType] > 0 && total < u.type.maxCargo) {
            stash.res[resType]--;
            u.cargoRes[resType]++;
        } else if (total >= u.type.maxCargo) {
            alert("Кузов заполнен!");
        }
    }

    // Если склад полностью опустел - удаляем его с карты
    let stashTotal = stash.res.medkits + stash.res.mines + stash.res.materials;
    if (stashTotal === 0) {
        gameState.stashes = gameState.stashes.filter(s => s !== stash);
    }
    
    updateUI();
    renderAll();
};

window.toggleRouteMode = function() {
    if (gameState.state === 'SETTING_ROUTE') gameState.state = 'IDLE';
    else gameState.state = 'SETTING_ROUTE';
    updateUI();
    renderAll();
};

window.cancelRoute = function() {
    if (gameState.selectedUnit) gameState.selectedUnit.autopilotTarget = null;
    updateUI();
    renderAll();
};

// === ЛОГИКА ПОПОЛНЕНИЯ ЗАПАСОВ (ФАЗА 2.5) ===
window.resupplyUnit = function() {
    let u = gameState.selectedUnit;
    if (!u || u.hasMoved) return;

    let resType = null;
    let current = 0;
    let max = 0;

    // Определяем, что нужно выбранному юниту
    if (u.type.id === 'medic') {
        resType = 'medkits';
        current = u.medkits !== undefined ? u.medkits : u.type.maxMedkits;
        max = u.type.maxMedkits;
    } else if (u.type.id === 'miner') {
        resType = 'mines';
        current = u.mines !== undefined ? u.mines : u.type.maxMines;
        max = u.type.maxMines;
    } else {
        return;
    }

    let needed = max - current;
    if (needed <= 0) return;

    let source = null;
    
    // Сначала ищем Склад в радиусе 1 клетки
    if (gameState.stashes) {
        let adjStash = gameState.stashes.find(s => Math.max(Math.abs(s.x - u.x), Math.abs(s.y - u.y)) <= 1 && s.res[resType] > 0);
        if (adjStash) source = { type: 'stash', obj: adjStash };
    }

    // Если склада нет, ищем свой Грузовик снабжения
    if (!source) {
        let adjTruck = gameState.units.find(truck => 
            truck.owner === window.myPlayerId && 
            truck.type.id === 'supply' && 
            Math.max(Math.abs(truck.x - u.x), Math.abs(truck.y - u.y)) <= 1 &&
            truck.cargoRes && truck.cargoRes[resType] > 0
        );
        if (adjTruck) source = { type: 'truck', obj: adjTruck };
    }

    if (!source) return;

    // Считаем, сколько можем взять
    let available = source.type === 'stash' ? source.obj.res[resType] : source.obj.cargoRes[resType];
    let taken = Math.min(needed, available);

    // Добавляем юниту
    if (resType === 'medkits') u.medkits = current + taken;
    if (resType === 'mines') u.mines = current + taken;

    // Забираем со склада/грузовика
    if (source.type === 'stash') {
        source.obj.res[resType] -= taken;
        // Если склад опустел - удаляем его с карты
        let stashTotal = source.obj.res.medkits + source.obj.res.mines + source.obj.res.materials;
        if (stashTotal === 0) {
            gameState.stashes = gameState.stashes.filter(s => s !== source.obj);
        }
    } else {
        source.obj.cargoRes[resType] -= taken;
    }

    // Тратим ход бойца на пополнение
    u.hasMoved = true;
    gameState.state = 'IDLE';
    gameState.selectedUnit = null; 
    
    alert(`Запасы успешно пополнены: +${taken} шт.`);
    
    updateUI();
    renderAll();
};
