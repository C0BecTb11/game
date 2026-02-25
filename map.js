const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GRID_SIZE = 60; // Карта увеличена в 2 раза! (60x60)
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

function generateMap(mapType) {
    gameMap = [];
    capturePoints = [];
    
    if (mapType === 'test') {
        GRID_SIZE = 10;
        TILE_SIZE = 60;
        generateTestMap();
    } else {
        GRID_SIZE = 60; // Устанавливаем размер 60x60
        TILE_SIZE = 40;
        generateOrganicMainMap(); 
    }
}

// === ГЕНЕРАТОР ГИГАНТСКОЙ СИММЕТРИЧНОЙ КАРТЫ ===
function generateOrganicMainMap() {
    // 1. Заливаем всё лесом/пустошью
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ type: TILES.PARK });
        }
        gameMap.push(row);
    }

    // 2. Река (Симметричная синусоида)
    for (let x = 0; x < GRID_SIZE; x++) {
        // Настраиваем фазу, чтобы изгибы реки были одинаковыми для обеих сторон
        let riverY = Math.floor(GRID_SIZE / 2 + Math.sin((x - GRID_SIZE/2) / 8) * 5); 
        if (riverY >= 0 && riverY < GRID_SIZE) gameMap[riverY][x].type = TILES.WATER;
        if (riverY + 1 >= 0 && riverY + 1 < GRID_SIZE) gameMap[riverY + 1][x].type = TILES.WATER;
        if (riverY + 2 >= 0 && riverY + 2 < GRID_SIZE) gameMap[riverY + 2][x].type = TILES.WATER;
    }

    // 3. Широкая центральная трасса (Мост)
    let mainRoadX = Math.floor(GRID_SIZE / 2) - 1;
    for (let y = 0; y < GRID_SIZE; y++) {
        gameMap[y][mainRoadX].type = TILES.ROAD;
        gameMap[y][mainRoadX + 1].type = TILES.ROAD;
        gameMap[y][mainRoadX + 2].type = TILES.ROAD;
    }

    // Вспомогательная функция: проверяет, свободна ли зона от важных объектов
    function isAreaFree(startX, startY, w, h) {
        // Защитная зона вокруг баз игроков (радиус 10 клеток)
        if (startX < 10 && startY < 10) return false;
        if (startX + w > GRID_SIZE - 10 && startY + h > GRID_SIZE - 10) return false;

        // Защитная зона вдоль главной дороги (чтобы не блокировать мост и проезд)
        if (startX + w >= mainRoadX - 2 && startX <= mainRoadX + 4) return false;

        // Проверка наложения на реку или другие здания
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

    // 4. Индустриальные зоны (Генерируем зеркально)
    let factoriesToPlace = 8; // 8 пар = 16 заводов на карте
    let attempts = 0;
    while (factoriesToPlace > 0 && attempts < 200) {
        attempts++;
        let w = 4 + Math.floor(Math.random() * 5); // Ширина от 4 до 8
        let h = 3 + Math.floor(Math.random() * 4); // Высота от 3 до 6
        
        // Генерируем координаты только для ВЕРХНЕЙ ЛЕВОЙ половины карты
        let startX = Math.floor(Math.random() * (GRID_SIZE / 2 - w));
        let startY = Math.floor(Math.random() * (GRID_SIZE - h));

        if (isAreaFree(startX, startY, w, h)) {
            // Строим завод для Игрока 1 (сверху-слева)
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[startY + dy][startX + dx].type = TILES.FACTORY;
                }
            }
            // Высчитываем координаты для зеркального завода Игрока 2 (снизу-справа)
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

    // 5. Разбросанные постройки (Также генерируем парами)
    let buildingsToPlace = 60; // 60 пар = 120 зданий
    attempts = 0;
    while (buildingsToPlace > 0 && attempts < 500) {
        attempts++;
        let rx = Math.floor(Math.random() * (GRID_SIZE / 2));
        let ry = Math.floor(Math.random() * GRID_SIZE);

        if (isAreaFree(rx, ry, 1, 1)) { 
            gameMap[ry][rx].type = TILES.BUILDING;
            
            let mirrorX = GRID_SIZE - rx - 1;
            let mirrorY = GRID_SIZE - ry - 1;
            gameMap[mirrorY][mirrorX].type = TILES.BUILDING;
            
            buildingsToPlace--;
        }
    }

    // 6. Расставляем стратегические точки (Абсолютно симметрично)
    addCapturePoint(mainRoadX + 1, Math.floor(GRID_SIZE/2)); // Центральная на мосту
    
    // Ближние точки
    addCapturePoint(10, 15);
    addCapturePoint(49, 44); // 59 - 10 = 49, 59 - 15 = 44
    
    // Фланговые точки у реки
    addCapturePoint(18, 5);
    addCapturePoint(41, 54);
    
    // Дальние обходные точки
    addCapturePoint(25, 38);
    addCapturePoint(34, 21);

    // 7. Базы игроков (Гарантированно расчищаем бетонные площадки 9x9)
    clearBaseArea(2, 2, 4);
    clearBaseArea(GRID_SIZE - 3, GRID_SIZE - 3, 4);
}

// Тестовая площадка остается 10x10
function generateTestMap() {
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            let type = (x % 2 === 0 && y % 2 === 0) ? TILES.BUILDING : TILES.ROAD;
            row.push({ type: type });
        }
        gameMap.push(row);
    }
    addCapturePoint(4, 4); addCapturePoint(2, 7); addCapturePoint(7, 2);
    clearBaseArea(0, 0, 1); clearBaseArea(GRID_SIZE - 1, GRID_SIZE - 1, 1);
}

function addCapturePoint(x, y) {
    if (gameMap[y] && gameMap[y][x]) {
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
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let tile = gameMap[y][x];
            ctx.fillStyle = tile.type.color;
            
            if (tile.type === TILES.POINT) {
                let point = capturePoints.find(p => p.x === x && p.y === y);
                if (point && point.owner === 1) ctx.fillStyle = '#8B0000';
                if (point && point.owner === 2) ctx.fillStyle = '#00008B';
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
    let zoneSize = GRID_SIZE === 10 ? 2 : 5; // На большой карте зона высадки 5x5
    let startX = x === 0 ? 0 : x - zoneSize + 1;
    let startY = y === 0 ? 0 : y - zoneSize + 1;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * zoneSize, TILE_SIZE * zoneSize);
}
