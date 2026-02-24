// Настройка холста
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 15; // Карта будет 15x15 клеток
const TILE_SIZE = canvas.width / GRID_SIZE; // Высчитываем размер одной клетки в пикселях

// Типы местности
const TILE_TYPES = {
    ROAD: { id: 0, color: '#444', name: 'Дорога' },
    BUILDING: { id: 1, color: '#777', name: 'Здание' },
    PARK: { id: 2, color: '#2d5a27', name: 'Парк' },
    POINT: { id: 3, color: '#e6c200', name: 'Контрольная точка' } // Желтые точки ресурсов
};

let gameMap = [];
let capturePoints = []; // Массив для хранения данных о точках захвата

// Функция генерации карты города
function generateMap() {
    gameMap = [];
    capturePoints = [];
    
    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            let type = TILE_TYPES.ROAD;

            // Логика постройки "кварталов": каждая 3-я линия — это дорога
            if (x % 3 !== 0 && y % 3 !== 0) {
                // Внутри кварталов случайным образом ставим Здания или Парки
                type = Math.random() > 0.3 ? TILE_TYPES.BUILDING : TILE_TYPES.PARK;
            }
            row.push({ type: type });
        }
        gameMap.push(row);
    }

    // Расставляем контрольные точки на карте (например, 3 штуки)
    addCapturePoint(7, 7);   // Центр
    addCapturePoint(3, 11);  // Ближе к нижнему левому углу
    addCapturePoint(11, 3);  // Ближе к верхнему правому углу
    
    // Расчищаем зоны баз игроков (левый верхний и правый нижний углы)
    clearBaseArea(0, 0);
    clearBaseArea(GRID_SIZE - 1, GRID_SIZE - 1);
}

// Добавление точки захвата
function addCapturePoint(x, y) {
    gameMap[y][x].type = TILE_TYPES.POINT;
    capturePoints.push({ x: x, y: y, owner: 0 }); // owner 0 = ничья, 1 = Игрок 1, 2 = Игрок 2
}

// Очистка зоны вокруг базы, чтобы там точно была дорога для появления юнитов
function clearBaseArea(baseX, baseY) {
    for(let dy = -1; dy <= 1; dy++) {
        for(let dx = -1; dx <= 1; dx++) {
            let nx = baseX + dx;
            let ny = baseY + dy;
            if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                gameMap[ny][nx].type = TILE_TYPES.ROAD;
            }
        }
    }
}

// Главная функция отрисовки карты
function drawMap() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let tile = gameMap[y][x];
            
            // Базовый цвет клетки
            ctx.fillStyle = tile.type.color;
            
            // Если это точка захвата, красим её в цвет владельца
            if (tile.type.id === TILE_TYPES.POINT.id) {
                let point = capturePoints.find(p => p.x === x && p.y === y);
                if (point && point.owner === 1) ctx.fillStyle = '#8B0000'; // Темно-красный (Игрок 1)
                if (point && point.owner === 2) ctx.fillStyle = '#00008B'; // Темно-синий (Игрок 2)
            }
            
            // Рисуем квадрат клетки
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Добавляем "крышу" для зданий для объёма
            if (tile.type.id === TILE_TYPES.BUILDING.id) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }

            // Рисуем тонкую сетку поверх
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    
    // Подсветка зон высадки (баз) игроков
    drawSpawnZone(0, 0, 'rgba(255, 85, 85, 0.3)'); // База 1 (Красные)
    drawSpawnZone(GRID_SIZE - 1, GRID_SIZE - 1, 'rgba(85, 85, 255, 0.3)'); // База 2 (Синие)
}

function drawSpawnZone(x, y, color) {
    // Зона 2x2 клетки
    ctx.fillStyle = color;
    let startX = x === 0 ? 0 : x - 1;
    let startY = y === 0 ? 0 : y - 1;
    ctx.fillRect(startX * TILE_SIZE, startY * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2);
}

// Глобальная функция рендера (позже добавим сюда отрисовку юнитов)
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаем экран
    drawMap(); // Рисуем карту
    // drawUnits(); <-- это мы добавим в game.js
        }

