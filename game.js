let gameState = {}; // Будет заполняться при старте
let camera = { x: 0, y: 0, zoom: 1 };
let dragState = { isDragging: false, hasMoved: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };

// --- НОВАЯ СИСТЕМА СТАРТА ---
window.onload = () => {
    preloadUnitImages(() => {
        initControls(); // Назначаем кнопки (1 раз)
        
        // Кнопки главного меню
        document.getElementById('btn-main-map').onclick = () => startGame('main');
        document.getElementById('btn-test-map').onclick = () => startGame('test');
    });
};

function startGame(mapType) {
    // Прячем меню, показываем игру
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // Сбрасываем прогресс
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
    renderAll();
}

// --- ЛОГИКА СКРОЛЛА КАРТЫ ---
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

// --- ИГРОВАЯ ЛОГИКА ---
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
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const worldX = (clickX / camera.zoom) + camera.x;
    const worldY = (clickY / camera.zoom) + camera.y;

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

    if (gameState.selectedUnit) {
        if (clickedUnit && clickedUnit.owner !== gameState.turn) {
            attackUnit(gameState.selectedUnit, clickedUnit);
        } else if (!clickedUnit) {
            const dist = Math.abs(gameState.selectedUnit.x - x) + Math.abs(gameState.selectedUnit.y - y);
            if (dist <= gameState.selectedUnit.type.moveRange) moveUnit(gameState.selectedUnit, x, y);
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
    let radius = GRID_SIZE === 10 ? 1 : 2; // Уменьшаем зону высадки для тестовой карты
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
        
        // Считаем финальный урон
        let finalDamage = attacker.type.attack;
        
        // Проверяем: если у атакующего есть бонус по броне, а цель — бронированная
        if (attacker.type.bonusArmorDamage && target.type.isArmor) {
            finalDamage += attacker.type.bonusArmorDamage;
            console.log(`Пробитие брони! Урон: ${finalDamage}`);
        }

        target.hp -= finalDamage;
        attacker.hasMoved = true;
        gameState.selectedUnit = null; 
        gameState.state = 'IDLE';
        
        if (target.hp <= 0) {
            gameState.units = gameState.units.filter(u => u !== target);
        }
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

    const panel = document.getElementById('unit-info');
    if (panel) {
        if (gameState.selectedUnit) {
            const u = gameState.selectedUnit;
            document.getElementById('ui-name').innerText = u.type.name;
            document.getElementById('ui-name').style.color = gameState.players[u.owner].color;
            document.getElementById('ui-hp').innerText = `${u.hp}/${u.type.maxHp}`;
            
            // Если у юнита есть бонус по броне, показываем его в интерфейсе
            let attackText = u.type.attack;
            if (u.type.bonusArmorDamage) {
                attackText = `${u.type.attack} (Броня: ${u.type.attack + u.type.bonusArmorDamage})`;
            }
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawMap();
    
    if (gameState.selectedUnit && !gameState.selectedUnit.hasMoved) {
        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(gameState.selectedUnit.x - tx) + Math.abs(gameState.selectedUnit.y - ty);
                let unitOnTile = getUnitAt(tx, ty);
                
                if (dist <= gameState.selectedUnit.type.moveRange && !unitOnTile) {
                    ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
                
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && unitOnTile.owner !== gameState.turn) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
