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
            
            const cargoContainer = document.getElementById('ui-cargo-container');
            const cargoList = document.getElementById('ui-cargo-list');
            if (cargoContainer && cargoList) {
                if (u.type.transportCapacity) {
                    cargoContainer.classList.remove('hidden');
                    cargoList.innerHTML = '';
                    let cargo = u.cargo || [];
                    
                    for (let i = 0; i < u.type.transportCapacity; i++) {
                        if (cargo[i]) {
                            let btnHtml = (u.owner === window.myPlayerId) ? 
                                `<button onclick="dropCargo(${i})" style="padding: 2px 5px; background: #ff4444; border: 1px solid #aa0000; border-radius: 3px; color: white; cursor: pointer;">Высадить</button>` : '';
                            
                            cargoList.innerHTML += `<div style="display: flex; justify-content: space-between; align-items: center; background: #222; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; font-size: 0.85rem;">
                                <span>${cargo[i].type.name} ❤️${cargo[i].hp}</span> ${btnHtml}
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
            
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    }
}

// ДОБАВЛЕН ФЛАГ isHeal ДЛЯ ЗЕЛЕНОГО ЦВЕТА УВЕДОМЛЕНИЙ
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
                
                if (dist <= gameState.selectedUnit.type.attackRange && unitOnTile && unitOnTile.owner !== gameState.turn && visibleMap[ty][tx]) {
                    if (checkLineOfSight(gameState.selectedUnit.x, gameState.selectedUnit.y, tx, ty, gameState.selectedUnit)) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }

        // --- НОВАЯ ПОДСВЕТКА: ЦЕЛИ ДЛЯ ЛЕЧЕНИЯ МЕДИКОМ ---
        if (gameState.selectedUnit.type.id === 'medic' && gameState.selectedUnit.medkits > 0) {
            gameState.units.forEach(u => {
                if (u.owner === gameState.turn && u.type.isInfantry && u.hp < u.type.maxHp && u !== gameState.selectedUnit) {
                    let dist = Math.max(Math.abs(gameState.selectedUnit.x - u.x), Math.abs(gameState.selectedUnit.y - u.y));
                    if (dist <= 1) {
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // Зеленая зона вокруг раненых
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
