const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GRID_SIZE = 80; 
let TILE_SIZE = 40; 

const TILES = {
    ROAD: { id: 0, color: '#4a4e4d' },
    BUILDING: { id: 1, color: '#7a7a7a' },
    FACTORY: { id: 2, color: '#525b56' },
    PARK: { id: 3, color: '#3d4c35' },
    WATER: { id: 4, color: '#2b3a42' },
    POINT: { id: 5, color: '#d9a05b' }
};

let gameMap = [];
let capturePoints = [];

function generateMap(size = 80) {
    gameMap = [];
    capturePoints = [];
    
    GRID_SIZE = parseInt(size);
    TILE_SIZE = GRID_SIZE <= 50 ? 45 : 40; 
    
    console.log(`Генерация карты: ${GRID_SIZE}x${GRID_SIZE}`);

    if (size === 'test') {
        generateTestArena();
    } else {
        generateOrganicMainMap();
    }
}

function generateTestArena() {
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ type: TILES.ROAD }); 
        }
        gameMap.push(row);
    }
    
    // Тестовые постройки в центре
    for (let y = 6; y <= 8; y++) {
        for (let x = 6; x <= 8; x++) {
            gameMap[y][x].type = TILES.BUILDING;
        }
    }
    gameMap[7][7].type = TILES.ROAD; 
    
    addCapturePoint(7, 3);
    addCapturePoint(7, 11);
    
    clearBaseArea(2, 2, 2); 
    clearBaseArea(GRID_SIZE - 3, GRID_SIZE - 3, 2);
}

// === АДАПТИВНЫЙ ГЕНЕРАТОР (50x50 / 80x80) ===
function generateOrganicMainMap() {
    // 1. Заливаем всё лесом
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ type: TILES.PARK });
        }
        gameMap.push(row);
    }

    // 2. Река (чуть шире для красоты)
    for (let x = 0; x < GRID_SIZE; x++) {
        let riverY = Math.floor(GRID_SIZE / 2 + Math.sin((x - GRID_SIZE/2) / 10) * 6); 
        if (riverY >= 0 && riverY < GRID_SIZE) gameMap[riverY][x].type = TILES.WATER;
        if (riverY + 1 >= 0 && riverY + 1 < GRID_SIZE) gameMap[riverY + 1][x].type = TILES.WATER;
        if (riverY + 2 >= 0 && riverY + 2 < GRID_SIZE) gameMap[riverY + 2][x].type = TILES.WATER;
    }

    // 3. ДОРОГИ И МОСТЫ (АДАПТИВНО)
    let roads = [];
    
    if (GRID_SIZE <= 50) {
        // Для маленькой карты - ВСЕГО 2 МОСТА (на 33% и 66% ширины)
        roads.push(Math.floor(GRID_SIZE / 3) - 1);
        roads.push(Math.floor(GRID_SIZE * 2 / 3) - 1);
    } else {
        // Для большой карты - 3 МОСТА (25%, 50%, 75%)
        roads.push(Math.floor(GRID_SIZE / 4) - 1);
        roads.push(Math.floor(GRID_SIZE / 2) - 1);
        roads.push(Math.floor(GRID_SIZE * 3 / 4) - 1);
    }

    // Строим трассы
    for (let y = 0; y < GRID_SIZE; y++) {
        roads.forEach(roadX => {
            // Сама дорога шириной 3 клетки
            if(roadX >= 0 && roadX < GRID_SIZE) gameMap[y][roadX].type = TILES.ROAD;
            if(roadX+1 >= 0 && roadX+1 < GRID_SIZE) gameMap[y][roadX + 1].type = TILES.ROAD;
            if(roadX+2 >= 0 && roadX+2 < GRID_SIZE) gameMap[y][roadX + 2].type = TILES.ROAD;
        });
    }

    // Вспомогательная функция защиты зон (чтобы здания не лезли на дороги и базы)
    function isAreaFree(startX, startY, w, h) {
        // Базы игроков
        if (startX < 10 && startY < 10) return false;
        if (startX + w > GRID_SIZE - 10 && startY + h > GRID_SIZE - 10) return false;

        // Дороги (проверяем все мосты)
        for (let r of roads) {
            // Оставляем зазор в 2 клетки от дороги
            if (startX + w >= r - 2 && startX <= r + 4) return false;
        }

        // Наложение на другие объекты
        for(let dy = 0; dy < h; dy++) {
            for(let dx = 0; dx < w; dx++) {
                let ny = startY + dy;
                let nx = startX + dx;
                if (ny < 0 || ny >= GRID_SIZE || nx < 0 || nx >= GRID_SIZE) return false;
                let t = gameMap[ny][nx].type;
                if (t === TILES.WATER || t === TILES.BUILDING || t === TILES.FACTORY) return false; 
            }
        }
        return true;
    }

    // 4. МАСШТАБИРОВАНИЕ ОБЪЕКТОВ
    // Считаем площадь: 50x50 = 2500, 80x80 = 6400.
    // Коэффициент для 50-ки = 0.39 (то есть объектов должно быть в ~2.5 раза меньше)
    
    let scaleFactor = (GRID_SIZE * GRID_SIZE) / (80 * 80);
    
    // Заводы (было 10 пар, станет ~4 пары для 50x50)
    let factoriesToPlace = Math.max(3, Math.floor(10 * scaleFactor)); 
    let attempts = 0;
    while (factoriesToPlace > 0 && attempts < 500) {
        attempts++;
        let w = 4 + Math.floor(Math.random() * 3); // Чуть компактнее заводы
        let h = 3 + Math.floor(Math.random() * 3); 
        
        let startX = Math.floor(Math.random() * (GRID_SIZE / 2 - w));
        let startY = Math.floor(Math.random() * (GRID_SIZE - h));

        if (isAreaFree(startX, startY, w, h)) {
            // Левый завод
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[startY + dy][startX + dx].type = TILES.FACTORY;
                }
            }
            // Правый (зеркальный) завод
            let mirrorX = GRID_SIZE - startX - w;
            let mirrorY = GRID_SIZE - startY - h;
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[mirrorY + dy][mirrorX + dx].type = TILES.FACTORY;
                }
            }
            factoriesToPlace--;
        }
    }

    // Дома (было 25 пар, станет ~10 пар для 50x50)
    let blocksToPlace = Math.max(8, Math.floor(25 * scaleFactor)); 
    attempts = 0;
    while (blocksToPlace > 0 && attempts < 600) {
        attempts++;
        let w = 2 + Math.floor(Math.random() * 2); 
        let h = 2 + Math.floor(Math.random() * 2); 
        
        let rx = Math.floor(Math.random() * (GRID_SIZE / 2 - w));
        let ry = Math.floor(Math.random() * (GRID_SIZE - h));

        if (isAreaFree(rx, ry, w, h)) { 
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[ry + dy][rx + dx].type = TILES.BUILDING;
                }
            }
            let mirrorX = GRID_SIZE - rx - w;
            let mirrorY = GRID_SIZE - ry - h;
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[mirrorY + dy][mirrorX + dx].type = TILES.BUILDING;
                }
            }
            blocksToPlace--;
        }
    }

    // 5. РАССТАНОВКА ТОЧЕК (Тоже адаптивно!)
    // Ставим точки на КАЖДОМ мосту
    roads.forEach(roadX => {
        addCapturePoint(roadX + 1, Math.floor(GRID_SIZE/2)); 
    });
    
    // Базовые точки (ближе к респавнам)
    addCapturePoint(Math.floor(GRID_SIZE * 0.15), Math.floor(GRID_SIZE * 0.25));
    addCapturePoint(GRID_SIZE - Math.floor(GRID_SIZE * 0.15), GRID_SIZE - Math.floor(GRID_SIZE * 0.25)); 
    
    // Если карта большая, добавляем фланговые точки
    if (GRID_SIZE > 60) {
        addCapturePoint(8, Math.floor(GRID_SIZE/2) - 15);
        addCapturePoint(GRID_SIZE - 9, Math.floor(GRID_SIZE/2) + 15);
    }

    // 6. Очистка баз
    clearBaseArea(2, 2, 4);
    clearBaseArea(GRID_SIZE - 3, GRID_SIZE - 3, 4);
}

function addCapturePoint(x, y) {
    // Проверка границ, чтобы не вылететь за массив
    if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
        gameMap[y][x].type = TILES.POINT;
        capturePoints.push({ x: x, y: y, owner: 0 });
    }
}

function clearBaseArea(baseX, baseY, radius) {
    for(let dy = -radius; dy <= radius; dy++) {
        for(let dx = -radius; dx <= radius; dx++) {
            let nx = baseX + dx;
            let ny = baseY + dy;
            if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                gameMap[ny][nx].type = TILES.ROAD;
            }
        }
    }
}

function drawMap() {
    // Отрисовка без изменений, но с правильным цветом флагов
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let tile = gameMap[y][x];
            ctx.fillStyle = tile.type.color;
            
            if (tile.type === TILES.POINT) {
                let point = capturePoints.find(p => p.x === x && p.y === y);
                if (point && point.owner && typeof gameState !== 'undefined' && gameState.players[point.owner]) {
                    let team = gameState.players[point.owner].team;
                    if (team === 1) ctx.fillStyle = '#8B0000'; 
                    else if (team === 2) ctx.fillStyle = '#00008B'; 
                } 
                else if (point && point.owner === 1) ctx.fillStyle = '#8B0000';
                else if (point && point.owner === 2) ctx.fillStyle = '#00008B';
            }
            
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            if (tile.type === TILES.BUILDING || tile.type === TILES.FACTORY) {
                ctx.fillStyle = tile.type === TILES.FACTORY ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
                ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                
                if (tile.type === TILES.FACTORY) {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 8, TILE_SIZE/3, TILE_SIZE/3);
                }
            }

            if (tile.type === TILES.WATER) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 15, TILE_SIZE - 10, 2);
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    
    drawSpawnZone(0, 0, 'rgba(255, 85, 85, 0.2)');
    drawSpawnZone(GRID_SIZE - 1, GRID_SIZE - 1, 'rgba(85, 85, 255, 0.2)');
}

function drawSpawnZone(x, y, color) {
    ctx.fillStyle = color;
    let zoneSize = GRID_SIZE <= 15 ? 2 : 5; 
    let startX = x === 0 ? 0 : x - zoneSize + 1;
    let startY = y === 0 ? 0 : y - zoneSize + 1;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * zoneSize, TILE_SIZE * zoneSize);
        }
            
