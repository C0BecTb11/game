const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GRID_SIZE = 30; 
let TILE_SIZE = 40; 

// Обновленная мрачная палитра (в стиле сталкера/постапокалипсиса)
const TILES = {
    ROAD: { id: 0, color: '#4a4e4d' },       // Старый асфальт
    BUILDING: { id: 1, color: '#7a7a7a' },   // Бетонные коробки
    FACTORY: { id: 2, color: '#525b56' },    // Темные индустриальные цеха
    PARK: { id: 3, color: '#3d4c35' },       // Густой лес / Заросшая местность
    WATER: { id: 4, color: '#2b3a42' },      // Грязная река
    POINT: { id: 5, color: '#d9a05b' }       // Точки интереса (ржаво-желтые)
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
        GRID_SIZE = 30;
        TILE_SIZE = 40;
        generateOrganicMainMap(); // Запускаем новый умный генератор
    }
}

// === НОВЫЙ ГЕНЕРАТОР ОСНОВНОЙ КАРТЫ ===
function generateOrganicMainMap() {
    // 1. Заливаем всё густым лесом/пустошью
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            row.push({ type: TILES.PARK });
        }
        gameMap.push(row);
    }

    // 2. Рисуем извилистую реку по диагонали/центру
    for (let x = 0; x < GRID_SIZE; x++) {
        let riverY = Math.floor(GRID_SIZE / 2 + Math.sin(x / 4) * 4); // Волна
        if (riverY >= 0 && riverY < GRID_SIZE) gameMap[riverY][x].type = TILES.WATER;
        if (riverY + 1 >= 0 && riverY + 1 < GRID_SIZE) gameMap[riverY + 1][x].type = TILES.WATER; // Ширина реки 2 клетки
    }

    // 3. Рисуем главную трассу (вертикальную)
    let mainRoadX = Math.floor(GRID_SIZE / 2) - 2;
    for (let y = 0; y < GRID_SIZE; y++) {
        gameMap[y][mainRoadX].type = TILES.ROAD;
        gameMap[y][mainRoadX + 1].type = TILES.ROAD;
        
        // Делаем мост через реку
        if (gameMap[y][mainRoadX].type === TILES.WATER) {
            gameMap[y][mainRoadX].type = TILES.ROAD; // Асфальт поверх воды
            gameMap[y][mainRoadX+1].type = TILES.ROAD;
        }
    }

    // 4. Индустриальная зона (Большие ангары и цеха, как на скрине 2)
    // Размещаем 5-6 крупных комплексов
    for(let i = 0; i < 6; i++) {
        let w = 3 + Math.floor(Math.random() * 4); // Ширина от 3 до 6
        let h = 2 + Math.floor(Math.random() * 3); // Высота от 2 до 4
        let startX = Math.floor(Math.random() * (GRID_SIZE - w));
        let startY = Math.floor(Math.random() * (GRID_SIZE - h));

        // Проверяем, чтобы не строить завод прямо в реке
        if (gameMap[startY][startX].type !== TILES.WATER) {
            for(let dy = 0; dy < h; dy++) {
                for(let dx = 0; dx < w; dx++) {
                    gameMap[startY + dy][startX + dx].type = TILES.FACTORY;
                }
            }
            // Подводим дорожку к заводу
            if (startY > 0) gameMap[startY - 1][startX + Math.floor(w/2)].type = TILES.ROAD;
        }
    }

    // 5. Разбросанные постройки и руины (как на скрине 1)
    for(let i = 0; i < 40; i++) {
        let rx = Math.floor(Math.random() * GRID_SIZE);
        let ry = Math.floor(Math.random() * GRID_SIZE);
        
        if (gameMap[ry][rx].type === TILES.PARK) {
            gameMap[ry][rx].type = TILES.BUILDING;
            // Делаем случайные тропинки рядом со зданиями
            if (Math.random() > 0.5 && rx > 0 && gameMap[ry][rx-1].type === TILES.PARK) {
                gameMap[ry][rx-1].type = TILES.ROAD;
            }
        }
    }

    // 6. Расставляем стратегические точки
    addCapturePoint(mainRoadX, Math.floor(GRID_SIZE/2)); // Контроль моста! Очень важная точка
    addCapturePoint(5, 5); 
    addCapturePoint(GRID_SIZE - 6, GRID_SIZE - 6);
    addCapturePoint(mainRoadX + 8, 8);
    addCapturePoint(mainRoadX - 8, GRID_SIZE - 8);

    // 7. Базы игроков (расчищаем углы)
    clearBaseArea(1, 1, 2);
    clearBaseArea(GRID_SIZE - 2, GRID_SIZE - 2, 2);
}

// Старый генератор для тестовой карты (простая шахматка)
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
            
            // Отрисовка базового квадрата
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Отрисовка Зданий (светлые) и Заводов (темные, с трубами/крышами)
            if (tile.type === TILES.BUILDING || tile.type === TILES.FACTORY) {
                // Имитация объема/крыши
                ctx.fillStyle = tile.type === TILES.FACTORY ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
                ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                
                // Для заводов добавим "вентиляцию" на крышу для красоты
                if (tile.type === TILES.FACTORY) {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 8, TILE_SIZE/3, TILE_SIZE/3);
                }
            }

            // Добавляем текстуру "волн" для реки
            if (tile.type === TILES.WATER) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x * TILE_SIZE + 5, y * TILE_SIZE + 15, TILE_SIZE - 10, 2);
            }

            // Сетка
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    
    // Рисуем зоны баз
    drawSpawnZone(0, 0, 'rgba(255, 85, 85, 0.2)');
    drawSpawnZone(GRID_SIZE - 1, GRID_SIZE - 1, 'rgba(85, 85, 255, 0.2)');
}

function drawSpawnZone(x, y, color) {
    ctx.fillStyle = color;
    let radius = GRID_SIZE === 10 ? 1 : 2;
    let size = GRID_SIZE === 10 ? 2 : 4; // Базы на большой карте 4x4
    let startX = x === 0 ? 0 : x - radius - 1;
    let startY = y === 0 ? 0 : y - radius - 1;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * size, TILE_SIZE * size);
}
