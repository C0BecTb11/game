const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GRID_SIZE = 80; // Карта 80x80
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
    
    // 🔥 РУБИЛЬНИК ДЛЯ ТЕСТОВ ОТКЛЮЧЕН
     mapType = 'test'; 

    if (mapType === 'test') {
        GRID_SIZE = 15; 
        TILE_SIZE = 45; 
        generateTestArena(); 
    } else {
        GRID_SIZE = 80; 
        TILE_SIZE = 40;
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

// === ГЕНЕРАТОР КАРТЫ С 3 МОСТАМИ (80x80) ===
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
        let riverY = Math.floor(GRID_SIZE / 2 + Math.sin((x - GRID_SIZE/2) / 10) * 6); 
        if (riverY >= 0 && riverY < GRID_SIZE) gameMap[riverY][x].type = TILES.WATER;
        if (riverY + 1 >= 0 && riverY + 1 < GRID_SIZE) gameMap[riverY + 1][x].type = TILES.WATER;
        if (riverY + 2 >= 0 && riverY + 2 < GRID_SIZE) gameMap[riverY + 2][x].type = TILES.WATER;
    }

    // 3. ТРИ трассы (Левый, Центральный и Правый мосты)
    let leftRoadX = Math.floor(GRID_SIZE / 4) - 1;       // На отметке 25% (x=19)
    let centerRoadX = Math.floor(GRID_SIZE / 2) - 1;     // На отметке 50% (x=39)
    let rightRoadX = Math.floor(GRID_SIZE * 3 / 4) - 1;  // На отметке 75% (x=59)

    for (let y = 0; y < GRID_SIZE; y++) {
        // Левая
        gameMap[y][leftRoadX].type = TILES.ROAD;
        gameMap[y][leftRoadX + 1].type = TILES.ROAD;
        gameMap[y][leftRoadX + 2].type = TILES.ROAD;
        
        // Центральная
        gameMap[y][centerRoadX].type = TILES.ROAD;
        gameMap[y][centerRoadX + 1].type = TILES.ROAD;
        gameMap[y][centerRoadX + 2].type = TILES.ROAD;

        // Правая
        gameMap[y][rightRoadX].type = TILES.ROAD;
        gameMap[y][rightRoadX + 1].type = TILES.ROAD;
        gameMap[y][rightRoadX + 2].type = TILES.ROAD;
    }

    // Вспомогательная функция защиты зон
    function isAreaFree(startX, startY, w, h) {
        // Защитная зона вокруг баз игроков
        if (startX < 12 && startY < 12) return false;
        if (startX + w > GRID_SIZE - 12 && startY + h > GRID_SIZE - 12) return false;

        // Защитная зона вдоль ТРЕХ дорог, чтобы здания их не перекрыли
        if (startX + w >= leftRoadX - 2 && startX <= leftRoadX + 4) return false;
        if (startX + w >= centerRoadX - 2 && startX <= centerRoadX + 4) return false;
        if (startX + w >= rightRoadX - 2 && startX <= rightRoadX + 4) return false;

        // Проверка наложения
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

    // 4. Индустриальные зоны (Заводы)
    let factoriesToPlace = 10; // 10 пар = 20 заводов
    let attempts = 0;
    while (factoriesToPlace > 0 && attempts < 300) {
        attempts++;
        let w = 4 + Math.floor(Math.random() * 5); 
        let h = 3 + Math.floor(Math.random() * 4); 
        
        let startX = Math.floor(Math.random() * (GRID_SIZE / 2 - w));
        let startY = Math.floor(Math.random() * (GRID_SIZE - h));

        if (isAreaFree(startX, startY, w, h)) {
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[startY + dy][startX + dx].type = TILES.FACTORY;
                }
            }
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

    // 5. Жилые кварталы (Заменяем хаотичные блоки 1x1 на аккуратные здания 2x2 и 3x2)
    let blocksToPlace = 25; // 25 пар = 50 городских кварталов
    attempts = 0;
    while (blocksToPlace > 0 && attempts < 400) {
        attempts++;
        let w = 2 + Math.floor(Math.random() * 2); // Ширина 2 или 3
        let h = 2 + Math.floor(Math.random() * 2); // Высота 2 или 3
        
        let rx = Math.floor(Math.random() * (GRID_SIZE / 2 - w));
        let ry = Math.floor(Math.random() * (GRID_SIZE - h));

        if (isAreaFree(rx, ry, w, h)) { 
            // Рисуем левый квартал
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[ry + dy][rx + dx].type = TILES.BUILDING;
                }
            }
            
            // Рисуем симметричный правый квартал
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

    // 6. Расставляем стратегические точки
    // Три точки прямо на мостах (самые горячие зоны)
    addCapturePoint(leftRoadX + 1, Math.floor(GRID_SIZE/2)); 
    addCapturePoint(centerRoadX + 1, Math.floor(GRID_SIZE/2)); 
    addCapturePoint(rightRoadX + 1, Math.floor(GRID_SIZE/2)); 
    
    // Ближние к базам точки (для стартового дохода)
    addCapturePoint(12, 18);
    addCapturePoint(GRID_SIZE - 13, GRID_SIZE - 19); 
    
    // Глубокие фланговые точки
    addCapturePoint(8, Math.floor(GRID_SIZE/2) - 15);
    addCapturePoint(GRID_SIZE - 9, Math.floor(GRID_SIZE/2) + 15);

    // 7. Базы игроков
    clearBaseArea(2, 2, 4);
    clearBaseArea(GRID_SIZE - 3, GRID_SIZE - 3, 4);
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
    let zoneSize = GRID_SIZE <= 15 ? 2 : 5; // Зона высадки на мелкой карте 2x2, на большой - 5x5
    let startX = x === 0 ? 0 : x - zoneSize + 1;
    let startY = y === 0 ? 0 : y - zoneSize + 1;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * zoneSize, TILE_SIZE * zoneSize);
}
