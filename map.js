const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ТЕПЕРЬ ЭТО ПЕРЕМЕННЫЕ (let)
let GRID_SIZE = 30; 
let TILE_SIZE = 40; 

const TILES = {
    ROAD: { color: '#444' },
    BUILDING: { color: '#666' },
    PARK: { color: '#2d5a27' },
    POINT: { color: '#e6c200' }
};

let gameMap = [];
let capturePoints = [];

function generateMap(mapType) {
    gameMap = [];
    capturePoints = [];
    
    // НАСТРОЙКА РАЗМЕРОВ
    if (mapType === 'test') {
        GRID_SIZE = 10;
        TILE_SIZE = 60; // На маленькой карте клетки будут крупнее
    } else {
        GRID_SIZE = 30;
        TILE_SIZE = 40;
    }

    // Генерация ландшафта
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            let type = TILES.ROAD;
            if (x % 3 !== 0 && y % 3 !== 0) {
                type = Math.random() > 0.3 ? TILES.BUILDING : TILES.PARK;
            }
            row.push({ type: type });
        }
        gameMap.push(row);
    }

    // Расстановка контрольных точек и баз в зависимости от карты
    if (mapType === 'test') {
        addCapturePoint(4, 4);
        addCapturePoint(2, 7);
        addCapturePoint(7, 2);
        clearBaseArea(0, 0, 1); // База 2x2
        clearBaseArea(GRID_SIZE - 1, GRID_SIZE - 1, 1);
    } else {
        addCapturePoint(15, 15);
        addCapturePoint(7, 22);
        addCapturePoint(22, 7);
        addCapturePoint(7, 7);
        addCapturePoint(22, 22);
        clearBaseArea(0, 0, 2); // База 3x3
        clearBaseArea(GRID_SIZE - 1, GRID_SIZE - 1, 2);
    }
}

function addCapturePoint(x, y) {
    gameMap[y][x].type = TILES.POINT;
    capturePoints.push({ x: x, y: y, owner: 0 });
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

            if (tile.type === TILES.BUILDING) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    drawSpawnZone(0, 0, 'rgba(255, 85, 85, 0.3)');
    drawSpawnZone(GRID_SIZE - 1, GRID_SIZE - 1, 'rgba(85, 85, 255, 0.3)');
}

function drawSpawnZone(x, y, color) {
    ctx.fillStyle = color;
    let radius = GRID_SIZE === 10 ? 1 : 2;
    let size = GRID_SIZE === 10 ? 2 : 3;
    let startX = x === 0 ? 0 : x - radius;
    let startY = y === 0 ? 0 : y - radius;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * size, TILE_SIZE * size);
}
