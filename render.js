// render.js
// Этот файл отвечает ТОЛЬКО за отрисовку графики и обновление интерфейса (UI)

function updateUI() {
    document.getElementById('p1-points').innerText = gameState.players[1].points;
    document.getElementById('p2-points').innerText = gameState.players[2].points;
    
    const p1NameElem = document.getElementById('p1-name');
    const p2NameElem = document.getElementById('p2-name');
    if (p1NameElem && gameState.players[1].name) p1NameElem.innerText = gameState.players[1].name;
    if (p2NameElem && gameState.players[2].name) p2NameElem.innerText = gameState.players[2].name;

    const turnInd = document.getElementById('turn-indicator');
    
    if (gameState.turn === window.myPlayerId) {
        turnInd.innerText = "ВАШ ХОД";
        turnInd.className = window.myPlayerId === 1 ? 'turn-p1' : 'turn-p2';
        turnInd.style.border = '';
        turnInd.style.color = '';
    } else {
        turnInd.innerText = "ХОД ПРОТИВНИКА...";
        turnInd.className = '';
        turnInd.style.border = '1px solid #777';
        turnInd.style.color = '#777';
    }

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

            // --- ОБНОВЛЕНИЕ АПТЕЧЕК ---
            const medkitContainer = document.getElementById('ui-medkits-container');
            if (medkitContainer) {
                if (u.type.id === 'medic') {
                    medkitContainer.classList.remove('hidden');
                    let currentMedkits = u.medkits !== undefined ? u.medkits : u.type.maxMedkits;
                    document.getElementById('ui-medkits').innerText = `${currentMedkits}/${u.type.maxMedkits}`;
                } else {
                    medkitContainer.classList.add('hidden');
                }
            }

            // --- ОБНОВЛЕНИЕ МИН ---
            const minesContainer = document.getElementById('ui-mines-container');
            const btnPlaceMine = document.getElementById('btn-place-mine');
            if (minesContainer && btnPlaceMine) {
                if (u.type.id === 'miner') {
                    minesContainer.classList.remove('hidden');
                    let currentMines = u.mines !== undefined ? u.mines : u.type.maxMines;
                    document.getElementById('ui-mines').innerText = `${currentMines}/${u.type.maxMines}`;
                    
                    if (currentMines > 0 && u.owner === window.myPlayerId && !u.hasMoved) {
                        btnPlaceMine.classList.remove('hidden');
                        if (gameState.state === 'PLACING_MINE') {
                            btnPlaceMine.innerText = "ОТМЕНА";
                            btnPlaceMine.style.background = "#aaa";
                        } else {
                            btnPlaceMine.innerText = "Установить мину";
                            btnPlaceMine.style.background = "#ffaa00";
                        }
                    } else {
                        btnPlaceMine.classList.add('hidden');
                    }
                } else {
                    minesContainer.classList.add('hidden');
                    btnPlaceMine.classList.add('hidden');
                }
            }

            // --- ПРОВЕРКА ВОЗМОЖНОСТИ ПОПОЛНЕНИЯ ЗАПАСОВ ---
            const btnResupply = document.getElementById('btn-resupply');
            if (btnResupply) {
                let canResupply = false;
                if (u.owner === window.myPlayerId && !u.hasMoved) {
                    let resType = null;
                    let needsRes = false;
                    
                    if (u.type.id === 'medic') {
                        resType = 'medkits';
                        let cur = u.medkits !== undefined ? u.medkits : u.type.maxMedkits;
                        if (cur < u.type.maxMedkits) needsRes = true;
                    } else if (u.type.id === 'miner') {
                        resType = 'mines';
                        let cur = u.mines !== undefined ? u.mines : u.type.maxMines;
                        if (cur < u.type.maxMines) needsRes = true;
                    }

                    if (needsRes) {
                        let hasSource = false;
                        if (gameState.stashes) {
                            hasSource = gameState.stashes.some(s => Math.max(Math.abs(s.x - u.x), Math.abs(s.y - u.y)) <= 1 && s.res[resType] > 0);
                        }
                        if (!hasSource) {
                            hasSource = gameState.units.some(truck => 
                                truck.owner === window.myPlayerId && 
                                truck.type.id === 'supply' && 
                                Math.max(Math.abs(truck.x - u.x), Math.abs(truck.y - u.y)) <= 1 &&
                                truck.cargoRes && truck.cargoRes[resType] > 0
                            );
                        }
                        canResupply = hasSource;
                    }
                }
                
                if (canResupply) {
                    btnResupply.classList.remove('hidden');
                } else {
                    btnResupply.classList.add('hidden');
                }
            }
            
            let threats = 0;
            if (u.owner === window.myPlayerId) {
                let visibleMap = getVisibleMap();
                gameState.units.forEach(enemy => {
                    if (enemy.owner !== window.myPlayerId && visibleMap[enemy.y][enemy.x]) {
                        let dist = Math.abs(enemy.x - u.x) + Math.abs(enemy.y - u.y);
                        if (dist <= enemy.type.attackRange && checkLineOfSight(enemy.x, enemy.y, u.x, u.y, enemy)) {
                            threats++;
                        }
                    }
                });
            }
            
            const threatElem = document.getElementById('ui-threat');
            if (threatElem) { 
                if (threats > 0) {
                    threatElem.classList.remove('hidden');
                    document.getElementById('ui-threat-count').innerText = threats;
                } else {
                    threatElem.classList.add('hidden');
                }
            }

                        // --- ЛОГИКА ОТОБРАЖЕНИЯ ДЕСАНТА (Только для своих!) ---
            const cargoContainer = document.getElementById('ui-cargo-container');
            const cargoList = document.getElementById('ui-cargo-list');
            if (cargoContainer && cargoList) {
                // Добавлена проверка: u.owner === window.myPlayerId
                if (u.type.transportCapacity && u.owner === window.myPlayerId) {
                    cargoContainer.classList.remove('hidden');
                    cargoList.innerHTML = '';
                    let cargo = u.cargo || [];
                    
                    for (let i = 0; i < u.type.transportCapacity; i++) {
                        if (cargo[i]) {
                            cargoList.innerHTML += `<div style="display: flex; justify-content: space-between; align-items: center; background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; font-size: 0.85rem;">
                                <span>${cargo[i].type.name} ❤️${cargo[i].hp}</span>
                                <button onclick="dropCargo(${i})" style="padding: 2px 5px; background: #ff4444; border: 1px solid #aa0000; border-radius: 3px; color: white; cursor: pointer;">Высадить</button>
                            </div>`;
                        } else {
                            cargoList.innerHTML += `<div style="display: flex; justify-content: center; align-items: center; background: #1a1a1a; padding: 4px 8px; border-radius: 4px; border: 1px dashed #555; color: #777; font-size: 0.85rem;">
                                [ Свободное место ]
                            </div>`;
                        }
                    }
                } else {
                    // Если это вражеский транспорт - скрываем блок полностью
                    cargoContainer.classList.add('hidden');
                }
            }

            // --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА СНАБЖЕНИЯ (Только для своих!) ---
            const supplyContainer = document.getElementById('ui-supply-container');
            if (supplyContainer) {
                // Добавлена проверка: u.owner === window.myPlayerId
                if (u.type.id === 'supply' && u.owner === window.myPlayerId) {
                    supplyContainer.classList.remove('hidden');
                    
                    if (!u.cargoRes) u.cargoRes = { medkits: 0, mines: 0, materials: 0 };
                    let total = u.cargoRes.medkits + u.cargoRes.mines + u.cargoRes.materials;
                    
                    document.getElementById('sup-total').innerText = total;
                    document.getElementById('sup-med').innerText = u.cargoRes.medkits;
                    document.getElementById('sup-mine').innerText = u.cargoRes.mines;
                    document.getElementById('sup-mat').innerText = u.cargoRes.materials;
                    
                    const baseControls = document.getElementById('sup-base-controls');
                    let radius = GRID_SIZE <= 15 ? 1 : 4; 
                    let isAtBase = false;
                    if (window.myPlayerId === 1 && u.x <= radius && u.y <= radius) isAtBase = true;
                    if (window.myPlayerId === 2 && u.x >= GRID_SIZE - (radius + 1) && u.y >= GRID_SIZE - (radius + 1)) isAtBase = true;
                    
                    if (isAtBase) {
                        baseControls.classList.remove('hidden');
                    } else {
                        baseControls.classList.add('hidden');
                    }
                    
                    // Управление Складом
                    const btnCreateStash = document.getElementById('btn-create-stash');
                    const stashControls = document.getElementById('sup-stash-controls');
                    
                    let adjStash = null;
                    if (gameState.stashes) {
                        adjStash = gameState.stashes.find(s => Math.max(Math.abs(s.x - u.x), Math.abs(s.y - u.y)) <= 1);
                    }

                    if (adjStash) {
                        btnCreateStash.classList.add('hidden');
                        stashControls.classList.remove('hidden');
                        document.getElementById('stash-med').innerText = adjStash.res.medkits;
                        document.getElementById('stash-mine').innerText = adjStash.res.mines;
                        document.getElementById('stash-mat').innerText = adjStash.res.materials;
                    } else {
                        stashControls.classList.add('hidden');
                        if (!isAtBase) { 
                            btnCreateStash.classList.remove('hidden');
                            if (gameState.state === 'PLACING_STASH') {
                                btnCreateStash.innerText = "ОТМЕНА";
                                btnCreateStash.style.background = "#aaa";
                            } else {
                                btnCreateStash.innerText = "📦 Развернуть зону выгрузки";
                                btnCreateStash.style.background = "#2e7d32";
                            }
                        } else {
                            btnCreateStash.classList.add('hidden');
                        }
                    }
                } else {
                    // Если это вражеский грузовик - скрываем его инвентарь
                    supplyContainer.classList.add('hidden');
                }
            }
            
            // --- УНИВЕРСАЛЬНЫЙ АВТОПИЛОТ ДЛЯ ВСЕХ ЮНИТОВ ---
            const autoControls = document.getElementById('sup-auto-controls');
            const btnSetRoute = document.getElementById('btn-set-route');
            const btnCancelRoute = document.getElementById('btn-cancel-route');

            if (autoControls && btnSetRoute && btnCancelRoute) {
                // Показываем кнопку автопилота только для СВОИХ юнитов
                if (u.owner === window.myPlayerId) {
                    autoControls.classList.remove('hidden');
                    if (u.autopilotTarget) {
                        btnSetRoute.classList.add('hidden');
                        btnCancelRoute.classList.remove('hidden');
                    } else {
                        btnCancelRoute.classList.add('hidden');
                        btnSetRoute.classList.remove('hidden');
                        if (gameState.state === 'SETTING_ROUTE') {
                            btnSetRoute.innerText = "ОТМЕНА";
                            btnSetRoute.style.background = "#aaa";
                        } else {
                            btnSetRoute.innerText = "📍 Указать цель маршрута";
                            btnSetRoute.style.background = "#1976d2";
                        }
                    }
                } else {
                    autoControls.classList.add('hidden');
                }
            }

            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }
}

function showCombatNotification(dmg, remainingHp, targetName, inCover, isHeal = false) {
    const notif = document.getElementById('combat-notification');
    let dmgElem = document.getElementById('notif-dmg');
    
    if (isHeal) {
        dmgElem.innerText = `+${dmg} (Лечение 💊)`;
        dmgElem.style.color = '#00ff00';
        document.getElementById('notif-hp').innerText = `Стало ХП: ${remainingHp}`;
        notif.style.borderColor = '#00ff00';
    } else {
        if (inCover) {
            dmgElem.innerText = `${dmg} (Снижен укрытием 🛡️)`;
            dmgElem.style.color = '#4caf50'; 
        } else {
            dmgElem.innerText = dmg;
            dmgElem.style.color = '#fff';
        }
        
        if (remainingHp <= 0) {
            document.getElementById('notif-hp').innerText = `Уничтожен (${targetName})`;
            notif.style.borderColor = '#ff4444'; 
        } else {
            document.getElementById('notif-hp').innerText = `Осталось ХП: ${remainingHp}`;
            notif.style.borderColor = '#ffaa00'; 
        }
    }

    notif.classList.remove('hidden');
    clearTimeout(combatNotifTimeout);
    combatNotifTimeout = setTimeout(() => {
        notif.classList.add('hidden');
    }, 2500); 
}

function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); 
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawMap();
    
    let visibleMap = getVisibleMap();
    let viewPlayer = window.myPlayerId;

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (!visibleMap[y][x]) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; 
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    if (gameState.mines) {
        gameState.mines.forEach(m => {
            if (m.owner === viewPlayer) {
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(m.x * TILE_SIZE + TILE_SIZE / 2, m.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(m.x * TILE_SIZE + TILE_SIZE / 2, m.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    if (gameState.state === 'PLACING_MINE' && gameState.selectedUnit) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = gameState.selectedUnit.x + dx;
                let ny = gameState.selectedUnit.y + dy;
                if (isPassable(nx, ny, gameState.selectedUnit) && !getUnitAt(nx, ny)) {
                    ctx.fillStyle = 'rgba(255, 170, 0, 0.4)';
                    ctx.fillRect(nx * TILE_SIZE, ny * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // --- ОТРИСОВКА СКЛАДОВ ---
    if (gameState.stashes) {
        gameState.stashes.forEach(s => {
            if (visibleMap[s.y][s.x]) {
                ctx.fillStyle = '#8B4513'; // Коричневый ящик
                ctx.fillRect(s.x * TILE_SIZE + 6, s.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.fillStyle = '#D2B48C'; // Светлые полоски
                ctx.fillRect(s.x * TILE_SIZE + 10, s.y * TILE_SIZE + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                // Иконка
                ctx.fillStyle = '#000';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📦', s.x * TILE_SIZE + TILE_SIZE/2, s.y * TILE_SIZE + TILE_SIZE/2);
            }
        });
    }

    // --- ПОДСВЕТКА ЗОНЫ СОЗДАНИЯ СКЛАДА ---
    if (gameState.state === 'PLACING_STASH' && gameState.selectedUnit) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let nx = gameState.selectedUnit.x + dx;
                let ny = gameState.selectedUnit.y + dy;
                // Зона выгрузки - зеленая
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && isPassable(nx, ny, gameState.selectedUnit) && !getUnitAt(nx, ny)) {
                    ctx.fillStyle = 'rgba(46, 125, 50, 0.5)'; 
                    ctx.fillRect(nx * TILE_SIZE, ny * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // --- ПОДСВЕТКА ВЫБОРА МАРШРУТА ---
    if (gameState.state === 'SETTING_ROUTE' && gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(25, 118, 210, 0.2)'; 
        ctx.fillRect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE); // Слегка синим всю карту
    }

    // --- ОТРИСОВКА ЛИНИИ АВТОПИЛОТА ---
    if (gameState.selectedUnit && gameState.selectedUnit.autopilotTarget) {
        ctx.beginPath();
        ctx.moveTo(gameState.selectedUnit.x * TILE_SIZE + TILE_SIZE / 2, gameState.selectedUnit.y * TILE_SIZE + TILE_SIZE / 2);
        ctx.lineTo(gameState.selectedUnit.autopilotTarget.x * TILE_SIZE + TILE_SIZE / 2, gameState.selectedUnit.autopilotTarget.y * TILE_SIZE + TILE_SIZE / 2);
        ctx.strokeStyle = '#64b5f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Рисуем крестик в точке назначения
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(gameState.selectedUnit.autopilotTarget.x * TILE_SIZE + TILE_SIZE/2 - 6, gameState.selectedUnit.autopilotTarget.y * TILE_SIZE + TILE_SIZE/2 - 6, 12, 12);
    }
    
    if (gameState.selectedUnit && !gameState.selectedUnit.hasMoved && gameState.state !== 'PLACING_MINE' && gameState.state !== 'SETTING_ROUTE') {
        let reachable = getReachableCells(gameState.selectedUnit);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
        reachable.forEach(cell => {
            ctx.fillRect(cell.x * TILE_SIZE, cell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(gameState.selectedUnit.x - tx) + Math.abs(gameState.selectedUnit.y - ty);
                let unitOnTile = getUnitAt(tx, ty);
                
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && unitOnTile.owner !== gameState.turn && visibleMap[ty][tx]) {
                    if (checkLineOfSight(gameState.selectedUnit.x, gameState.selectedUnit.y, tx, ty, gameState.selectedUnit)) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }

        if (gameState.selectedUnit.type.id === 'medic' && gameState.selectedUnit.medkits > 0) {
            gameState.units.forEach(u => {
                if (u.owner === gameState.turn && u.type.isInfantry && u.hp < u.type.maxHp && u !== gameState.selectedUnit) {
                    let dist = Math.max(Math.abs(gameState.selectedUnit.x - u.x), Math.abs(gameState.selectedUnit.y - u.y));
                    if (dist <= 1) {
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; 
                        ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            });
        }
    }

    if (gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;

        if (gameState.selectedUnit.owner === viewPlayer) {
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); 
            
            gameState.units.forEach(enemy => {
                if (enemy.owner !== viewPlayer && visibleMap[enemy.y][enemy.x]) {
                    let dist = Math.abs(enemy.x - gameState.selectedUnit.x) + Math.abs(enemy.y - gameState.selectedUnit.y);
                    if (dist <= enemy.type.attackRange && checkLineOfSight(enemy.x, enemy.y, gameState.selectedUnit.x, gameState.selectedUnit.y, enemy)) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                        ctx.fillRect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                        ctx.beginPath();
                        ctx.moveTo(enemy.x * TILE_SIZE + TILE_SIZE / 2, enemy.y * TILE_SIZE + TILE_SIZE / 2);
                        ctx.lineTo(gameState.selectedUnit.x * TILE_SIZE + TILE_SIZE / 2, gameState.selectedUnit.y * TILE_SIZE + TILE_SIZE / 2);
                        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
                        ctx.stroke();
                    }
                }
            });
            ctx.setLineDash([]); 
            ctx.lineWidth = 1;
        }
    }

    gameState.units.forEach(u => {
        if (u.owner !== viewPlayer && !visibleMap[u.y][u.x]) return;

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
