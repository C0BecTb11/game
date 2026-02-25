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

// === ГЕНЕРАТОР ГИГАНТСКОЙ ОСНОВНОЙ КАРТЫ ===
function generateOrganicMainMap() {
    // 1. Заливаем всё лесом/пустошью
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ type: TILES.PARK });
        }
        gameMap.push(row);
    }

    // 2. Река стала шире и длиннее
    for (let x = 0; x < GRID_SIZE; x++) {
        let riverY = Math.floor(GRID_SIZE / 2 + Math.sin(x / 6) * 6); 
        if (riverY >= 0 && riverY < GRID_SIZE) gameMap[riverY][x].type = TILES.WATER;
        if (riverY + 1 >= 0 && riverY + 1 < GRID_SIZE) gameMap[riverY + 1][x].type = TILES.WATER;
        if (riverY + 2 >= 0 && riverY + 2 < GRID_SIZE) gameMap[riverY + 2][x].type = TILES.WATER; // 3 клетки в ширину
    }

    // 3. Широкая центральная трасса
    let mainRoadX = Math.floor(GRID_SIZE / 2) - 3;
    for (let y = 0; y < GRID_SIZE; y++) {
        gameMap[y][mainRoadX].type = TILES.ROAD;
        gameMap[y][mainRoadX + 1].type = TILES.ROAD;
        gameMap[y][mainRoadX + 2].type = TILES.ROAD;
        
        // Большой мост через реку
        if (gameMap[y][mainRoadX].type === TILES.WATER || gameMap[y][mainRoadX+1].type === TILES.WATER) {
            gameMap[y][mainRoadX].type = TILES.ROAD; 
            gameMap[y][mainRoadX+1].type = TILES.ROAD;
            gameMap[y][mainRoadX+2].type = TILES.ROAD;
        }
    }

    // 4. Огромная индустриальная зона (18 комплексов вместо 6)
    for(let i = 0; i < 18; i++) {
        let w = 4 + Math.floor(Math.random() * 6); // Ширина цеха от 4 до 9
        let h = 3 + Math.floor(Math.random() * 5); // Высота от 3 до 7
        let startX = Math.floor(Math.random() * (GRID_SIZE - w));
        let startY = Math.floor(Math.random() * (GRID_SIZE - h));

        if (gameMap[startY][startX].type !== TILES.WATER) {
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[startY + dy][startX + dx].type = TILES.FACTORY;
                }
            }
            if (startY > 0) gameMap[startY - 1][startX + Math.floor(w/2)].type = TILES.ROAD;
        }
    }

    // 5. Разбросанные постройки (150 мелких зданий)
    for(let i = 0; i < 150; i++) {
        let rx = Math.floor(Math.random() * GRID_SIZE);
        let ry = Math.floor(Math.random() * GRID_SIZE);
        
        if (gameMap[ry][rx].type === TILES.PARK) {
            gameMap[ry][rx].type = TILES.BUILDING;
            if (Math.random() > 0.5 && rx > 0 && gameMap[ry][rx-1].type === TILES.PARK) {
                gameMap[ry][rx-1].type = TILES.ROAD;
            }
        }
    }

    // 6. Расставляем 7 стратегических точек
    addCapturePoint(mainRoadX + 1, Math.floor(GRID_SIZE/2)); // Точка на мосту!
    addCapturePoint(10, 10); 
    addCapturePoint(GRID_SIZE - 10, GRID_SIZE - 10);
    addCapturePoint(mainRoadX + 15, 15);
    addCapturePoint(mainRoadX - 15, GRID_SIZE - 15);
    addCapturePoint(15, GRID_SIZE - 15);
    addCapturePoint(GRID_SIZE - 15, 15);

    // 7. Базы игроков (расчищаем площадки 5x5)
    clearBaseArea(2, 2, 3);
    clearBaseArea(GRID_SIZE - 3, GRID_SIZE - 3, 3);
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
