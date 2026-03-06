// render.js
// Этот файл отвечает ТОЛЬКО за отрисовку графики и обновление интерфейса (UI)

function updateUI() {
    // 1. ТУМАН ВОЙНЫ ДЛЯ ЭКОНОМИКИ
    // Показываем очки игрока 1 и 2 (лидеров команд)
    // Если мы в команде 1, видим очки P1. Если в команде 2 - P2.
    
    const p1NameElem = document.getElementById('p1-name');
    const p2NameElem = document.getElementById('p2-name');
    
    // Проверяем, есть ли игроки (на случай ошибок инициализации)
    if (gameState.players && gameState.players[1]) {
        if (p1NameElem) p1NameElem.innerText = gameState.players[1].name;
        
        let myTeam = gameState.players[window.myPlayerId]?.team;
        let p1Team = gameState.players[1].team;
        
        // Видим очки P1, только если мы в одной команде или это офлайн-тест
        if (myTeam === p1Team || gameState.isOffline) {
            document.getElementById('p1-points').innerText = gameState.players[1].points;
        } else {
            document.getElementById('p1-points').innerText = "???";
        }
    }

    if (gameState.players && gameState.players[2]) {
        if (p2NameElem) p2NameElem.innerText = gameState.players[2].name;
        
        let myTeam = gameState.players[window.myPlayerId]?.team;
        let p2Team = gameState.players[2].team;
        
        if (myTeam === p2Team || gameState.isOffline) {
            document.getElementById('p2-points').innerText = gameState.players[2].points;
        } else {
            document.getElementById('p2-points').innerText = "???";
        }
    }

    // 2. ИНДИКАТОР ХОДА
    const turnInd = document.getElementById('turn-indicator');
    if (turnInd && gameState.players[gameState.turn]) {
        let turnPlayer = gameState.players[gameState.turn];
        
        if (gameState.turn === window.myPlayerId) {
            turnInd.innerText = "ВАШ ХОД";
            // Цвет рамки зависит от команды текущего игрока
            let colorClass = turnPlayer.team === 1 ? 'turn-p1' : 'turn-p2';
            turnInd.className = colorClass;
            turnInd.style.border = '';
            turnInd.style.color = '';
        } else {
            turnInd.innerText = `ХОД: ${turnPlayer.name}`;
            turnInd.className = '';
            // Красим текст в цвет того, кто сейчас ходит (чтобы видеть, чей ход в режиме 2v2)
            turnInd.style.border = `1px solid ${turnPlayer.color}`;
            turnInd.style.color = turnPlayer.color;
        }
    }

    // 3. ПАНЕЛЬ ИНФОРМАЦИИ О ЮНИТЕ
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

            // --- КНОПКА ПОПОЛНЕНИЯ ЗАПАСОВ ---
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
            
            // --- СЧЕТЧИК УГРОЗ (КТО ЦЕЛИТСЯ В МЕНЯ) ---
            let threats = 0;
            if (u.owner === window.myPlayerId) {
                let visibleMap = getVisibleMap();
                let myTeam = gameState.players[window.myPlayerId].team;

                gameState.units.forEach(enemy => {
                    let enemyTeam = gameState.players[enemy.owner].team;
                    // Считаем угрозой только ВРАГОВ, которые нас видят
                    if (enemyTeam !== myTeam && visibleMap[enemy.y][enemy.x]) {
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

            // --- ДЕСАНТ ---
            const cargoContainer = document.getElementById('ui-cargo-container');
            const cargoList = document.getElementById('ui-cargo-list');
            if (cargoContainer && cargoList) {
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
                    cargoContainer.classList.add('hidden');
                }
            }

            // --- СНАБЖЕНИЕ ---
            const supplyContainer = document.getElementById('ui-supply-container');
            if (supplyContainer) {
                if (u.type.id === 'supply' && u.owner === window.myPlayerId) {
                    supplyContainer.classList.remove('hidden');
                    
                    if (!u.cargoRes) u.cargoRes = { medkits: 0, mines: 0, materials: 0 };
                    let total = u.cargoRes.medkits + u.cargoRes.mines + u.cargoRes.materials;
                    
                    document.getElementById('sup-total').innerText = total;
                    document.getElementById('sup-med').innerText = u.cargoRes.medkits;
                    document.getElementById('sup-mine').innerText = u.cargoRes.mines;
                    document.getElementById('sup-mat').innerText = u.cargoRes.materials;
                    
                    const baseControls = document.getElementById('sup-base-controls');
                    // База зависит от команды!
                    let radius = GRID_SIZE <= 15 ? 1 : 4; 
                    let team = gameState.players[window.myPlayerId].team;
                    let isAtBase = false;
                    
                    // Команда 1 - верхний левый, Команда 2 - нижний правый
                    if (team === 1 && u.x <= radius && u.y <= radius) isAtBase = true;
                    if (team === 2 && u.x >= GRID_SIZE - (radius + 1) && u.y >= GRID_SIZE - (radius + 1)) isAtBase = true;
                    
                    if (isAtBase) {
                        baseControls.classList.remove('hidden');
                    } else {
                        baseControls.classList.add('hidden');
                    }
                    
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
                    supplyContainer.classList.add('hidden');
                }
            }
            
            // --- АВТОПИЛОТ ---
            const autoControls = document.getElementById('sup-auto-controls');
            const btnSetRoute = document.getElementById('btn-set-route');
            const btnCancelRoute = document.getElementById('btn-cancel-route');

            if (autoControls && btnSetRoute && btnCancelRoute) {
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

            // --- АРТИЛЛЕРИЯ ---
            const artControls = document.getElementById('artillery-controls');
            const btnArtFire = document.getElementById('btn-artillery-fire');
            const artCdText = document.getElementById('art-cooldown-text');
            const artCdVal = document.getElementById('art-cd-val');

            if (artControls && btnArtFire && artCdText && artCdVal) {
                if (u.type.isArtillery && u.owner === window.myPlayerId) {
                    artControls.classList.remove('hidden');
                    let cd = u.cooldown || 0;
                    
                    if (cd > 0) {
                        btnArtFire.classList.add('hidden');
                        artCdText.classList.remove('hidden');
                        artCdVal.innerText = cd;
                    } else if (u.hasMoved) {
                        btnArtFire.classList.add('hidden');
                        artCdText.classList.add('hidden');
                    } else {
                        btnArtFire.classList.remove('hidden');
                        artCdText.classList.add('hidden');
                        
                        if (gameState.state === 'ARTILLERY_AIMING') {
                            if (gameState.artTarget) {
                                btnArtFire.innerText = "🔥 ОТКРЫТЬ ОГОНЬ!";
                                btnArtFire.style.background = "#d32f2f";
                                btnArtFire.onclick = confirmArtilleryFire;
                            } else {
                                btnArtFire.innerText = "ОТМЕНА ПРИЦЕЛИВАНИЯ";
                                btnArtFire.style.background = "#aaa";
                                btnArtFire.onclick = startArtilleryTargeting;
                            }
                        } else {
                            btnArtFire.innerText = "🎯 Навести удар";
                            btnArtFire.style.background = "#e64a19";
                            btnArtFire.onclick = startArtilleryTargeting;
                        }
                    }
                } else {
                    artControls.classList.add('hidden');
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

    // Отрисовка тумана войны
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (!visibleMap[y][x]) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; 
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Мины
    if (gameState.mines) {
        gameState.mines.forEach(m => {
            // Видим только СВОИ мины
            if (m.owner === viewPlayer) {
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(m.x * TILE_SIZE + TILE_SIZE / 2, m.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(m.x * TILE_SIZE + TILE_SIZE / 2, m.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(m.x * TILE_SIZE + TILE_SIZE / 2, m.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Подсветка установки мины
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

    // Склады
    if (gameState.stashes) {
        gameState.stashes.forEach(s => {
            if (visibleMap[s.y][s.x]) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(s.x * TILE_SIZE + 6, s.y * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.fillStyle = '#D2B48C';
                ctx.fillRect(s.x * TILE_SIZE + 10, s.y * TILE_SIZE + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📦', s.x * TILE_SIZE + TILE_SIZE/2, s.y * TILE_SIZE + TILE_SIZE/2);
            }
        });
    }

    // Подсветка установки склада
    if (gameState.state === 'PLACING_STASH' && gameState.selectedUnit) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let nx = gameState.selectedUnit.x + dx;
                let ny = gameState.selectedUnit.y + dy;
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && isPassable(nx, ny, gameState.selectedUnit) && !getUnitAt(nx, ny)) {
                    ctx.fillStyle = 'rgba(46, 125, 50, 0.5)'; 
                    ctx.fillRect(nx * TILE_SIZE, ny * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // Подсветка высадки
    if (gameState.state === 'DROPPING_CARGO' && gameState.selectedUnit) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = gameState.selectedUnit.x + dx;
                let ny = gameState.selectedUnit.y + dy;
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !getUnitAt(nx, ny)) {
                    ctx.fillStyle = 'rgba(46, 125, 50, 0.5)'; 
                    ctx.fillRect(nx * TILE_SIZE, ny * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // Маршрут
    if (gameState.state === 'SETTING_ROUTE' && gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(25, 118, 210, 0.2)'; 
        ctx.fillRect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE); 
    }

    // Артиллерия
    if (gameState.state === 'ARTILLERY_AIMING' && gameState.selectedUnit) {
        let u = gameState.selectedUnit;
        let area = u.type.artArea;
        
        ctx.fillStyle = 'rgba(255, 87, 34, 0.15)'; 
        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(u.x - tx) + Math.abs(u.y - ty);
                if (dist <= u.type.attackRange) {
                    ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
        
        // Красный квадрат прицела
        if (gameState.artTarget) {
            let startX = gameState.artTarget.x - Math.floor(area / 2);
            let startY = gameState.artTarget.y - Math.floor(area / 2);
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            
            for(let dy = 0; dy < area; dy++) {
                for(let dx = 0; dx < area; dx++) {
                    let hx = startX + dx;
                    let hy = startY + dy;
                    if (hx >= 0 && hx < GRID_SIZE && hy >= 0 && hy < GRID_SIZE) {
                        ctx.fillRect(hx * TILE_SIZE, hy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        ctx.strokeRect(hx * TILE_SIZE, hy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
            ctx.lineWidth = 1;
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`Наведи на цель! Разброс: ${area}x${area}`, camera.x + canvas.width/2 - 150, camera.y + 50);
    }

    // Линия автопилота
    if (gameState.selectedUnit && gameState.selectedUnit.autopilotTarget && gameState.selectedUnit.owner === viewPlayer) {
        ctx.beginPath();
        ctx.moveTo(gameState.selectedUnit.x * TILE_SIZE + TILE_SIZE / 2, gameState.selectedUnit.y * TILE_SIZE + TILE_SIZE / 2);
        ctx.lineTo(gameState.selectedUnit.autopilotTarget.x * TILE_SIZE + TILE_SIZE / 2, gameState.selectedUnit.autopilotTarget.y * TILE_SIZE + TILE_SIZE / 2);
        ctx.strokeStyle = '#64b5f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(gameState.selectedUnit.autopilotTarget.x * TILE_SIZE + TILE_SIZE/2 - 6, gameState.selectedUnit.autopilotTarget.y * TILE_SIZE + TILE_SIZE/2 - 6, 12, 12);
    }
    
    // Подсветка зон при выделении
    if (gameState.selectedUnit && !gameState.selectedUnit.hasMoved && gameState.state !== 'PLACING_MINE' && gameState.state !== 'SETTING_ROUTE') {
        let reachable = getReachableCells(gameState.selectedUnit);
        
        // Зона хода (синяя)
        ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
        reachable.forEach(cell => {
            ctx.fillRect(cell.x * TILE_SIZE, cell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        // Красные клетки (Враги в радиусе атаки)
        let myTeam = gameState.players[gameState.selectedUnit.owner].team;

        for (let ty = 0; ty < GRID_SIZE; ty++) {
            for (let tx = 0; tx < GRID_SIZE; tx++) {
                let dist = Math.abs(gameState.selectedUnit.x - tx) + Math.abs(gameState.selectedUnit.y - ty);
                let unitOnTile = getUnitAt(tx, ty);
                
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && visibleMap[ty][tx]) {
                    // Подсвечиваем красным только если это ВРАЖЕСКАЯ команда
                    let unitTeam = gameState.players[unitOnTile.owner].team;
                    if (unitTeam !== myTeam) {
                        if (checkLineOfSight(gameState.selectedUnit.x, gameState.selectedUnit.y, tx, ty, gameState.selectedUnit)) {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                            ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                        }
                    }
                }
            }
        }

        // Подсветка лечения
        if (gameState.selectedUnit.type.id === 'medic' && gameState.selectedUnit.medkits > 0 && gameState.selectedUnit.owner === viewPlayer) {
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

    // ВЫДЕЛЕНИЕ ЮНИТА
    if (gameState.selectedUnit) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.selectedUnit.x * TILE_SIZE, gameState.selectedUnit.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.lineWidth = 1;

        // --- ЛАЗЕРНЫЕ ПРИЦЕЛЫ (УМНЫЕ) ---
        // Показываем линию, только если ВРАГ целится в НАС (или союзника)
        // Если мы выделили союзника, красная линия на нас рисоваться не должна!
        
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); 
        
        let myTeam = gameState.players[window.myPlayerId] ? gameState.players[window.myPlayerId].team : 0;

        gameState.units.forEach(targetUnit => {
            if (visibleMap[targetUnit.y][targetUnit.x]) {
                let attacker = gameState.selectedUnit; // Тот, кто сейчас выделен (и теоретически стреляет)
                let attackerTeam = gameState.players[attacker.owner].team;
                let targetTeam = gameState.players[targetUnit.owner].team;

                // Рисуем линию ТОЛЬКО если Атакующий - ВРАГ для меня, а Цель - это Я или мой СОЮЗНИК
                if (attackerTeam !== myTeam && targetTeam === myTeam) {
                    
                    let dist = Math.abs(targetUnit.x - attacker.x) + Math.abs(targetUnit.y - attacker.y);
                    
                    if (dist <= attacker.type.attackRange && checkLineOfSight(targetUnit.x, targetUnit.y, attacker.x, attacker.y, attacker)) {
                        ctx.beginPath();
                        ctx.moveTo(targetUnit.x * TILE_SIZE + TILE_SIZE / 2, targetUnit.y * TILE_SIZE + TILE_SIZE / 2);
                        ctx.lineTo(attacker.x * TILE_SIZE + TILE_SIZE / 2, attacker.y * TILE_SIZE + TILE_SIZE / 2);
                        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'; // Зловещий красный цвет
                        ctx.stroke();
                    }
                }
            }
        });
        ctx.setLineDash([]); 
        ctx.lineWidth = 1;
    }

    // ОТРИСОВКА ЮНИТОВ
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

        // Полоска ХП
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, TILE_SIZE - 8, 5);
        ctx.fillStyle = '#00cc00';
        let hpWidth = Math.max(0, (u.hp / u.type.maxHp) * (TILE_SIZE - 8));
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 10, hpWidth, 5);
        
        // Индикатор владельца (цвет игрока)
        ctx.fillStyle = gameState.players[u.owner].color;
        ctx.fillRect(u.x * TILE_SIZE + 4, u.y * TILE_SIZE + TILE_SIZE - 16, 10, 5);

        // Затемнение, если походил
        if (u.hasMoved) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(u.x * TILE_SIZE, u.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    });

    ctx.restore(); 
                   }
