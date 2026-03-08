// encyclopedia.js

// 1. HTML ШАБЛОН МОДАЛЬНОГО ОКНА
const ENCYCLOPEDIA_TEMPLATE = `
    <div id="encyclopedia-modal" class="hidden">
        <div class="modal-content help-modal-size">
            <button id="btn-close-help" class="close-btn">❌</button>
            
            <h2 style="margin-bottom: 15px; color: #ffaa00; text-align: center;">📖 ПОЛЕВОЙ УСТАВ</h2>

            <div class="tabs">
                <button class="tab-link active" onclick="switchHelpTab('tab-stats')">📊 ТТХ Юнитов</button>
                <button class="tab-link" onclick="switchHelpTab('tab-rules')">🎓 Механика</button>
            </div>

            <div id="tab-stats" class="tab-content active">
                <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 10px; text-align: center;">
                    <span style="color: #ff5555">АТК</span> - Атака, <span style="color: #4caf50">ХП</span> - Здоровье, <span style="color: #64b5f6">ДАЛ</span> - Дальность огня, <span style="color: #ffd700">ХОД</span> - Движение.
                </p>
                <div class="table-scroll">
                    <table class="unit-table">
                        <thead>
                            <tr>
                                <th>Юнит</th>
                                <th>$$$</th>
                                <th>ХП</th>
                                <th>АТК</th>
                                <th>ДАЛ</th>
                                <th>ХОД</th>
                                <th>Инфо</th>
                            </tr>
                        </thead>
                        <tbody id="encyclopedia-table-body">
                            </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-rules" class="tab-content hidden">
                <div class="help-section">
                    <h3>🏃 Основы боя</h3>
                    <ul>
                        <li><b>Перемещение:</b> Клик по юниту -> Клик по синей клетке.</li>
                        <li><b>Атака:</b> Если враг в зоне поражения (красная клетка), кликните по нему.</li>
                        <li><b>Укрытия:</b> В зданиях и лесу урон по пехоте снижен!</li>
                    </ul>

                    <h3>🚩 Захват территорий</h3>
                    <ul>
                        <li>Захватывать флаги может <b>ТОЛЬКО ПЕХОТА</b>. Техника не может.</li>
                        <li>Встаньте на флаг и завершите ход. Флаг станет вашим.</li>
                        <li>Каждая точка дает <b>+15 монет</b> всей команде каждый ход.</li>
                    </ul>

                    <h3>🛡️ Броня и Калибры</h3>
                    <ul>
                        <li><b>Тяжелая броня (Танки):</b> Получают всего 1 урона от автоматов.</li>
                        <li><b>Пробитие:</b> Используйте РПГ, Танки, ПТУР или Авиацию для борьбы с броней.</li>
                        <li><b>ПВО:</b> Самолеты сбиваются только бойцами ПЗРК или другой авиацией.</li>
                    </ul>

                    <h3>📦 Логистика</h3>
                    <ul>
                        <li><b>Медик / Минёр:</b> Имеют ограниченный запас (аптечки/мины).</li>
                        <li><b>Пополнение:</b> Подгоните грузовик снабжения или постройте склад рядом.</li>
                        <li>Кнопка <b>"🔄 Пополнить"</b> появится, если рядом есть ресурсы.</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
`;

// 2. ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ (Запускается при старте игры)
document.addEventListener('DOMContentLoaded', () => {
    // Вставляем HTML в конец body
    document.body.insertAdjacentHTML('beforeend', ENCYCLOPEDIA_TEMPLATE);
    
    // Генерируем таблицу на основе unit.js
    generateDynamicTable();

    // Вешаем обработчики событий
    setupHelpButtons();
});

// 3. ГЕНЕРАЦИЯ ТАБЛИЦЫ ИЗ unit.js
function generateDynamicTable() {
    const tbody = document.getElementById('encyclopedia-table-body');
    if (!tbody || typeof UNIT_TYPES === 'undefined') return;

    let html = '';

    // Группировка для красоты
    const groups = {
        'Пехота': u => u.isInfantry,
        'Техника': u => u.isArmor || u.type === 'supply',
        'Авиация': u => u.isAir
    };

    // Проходим по группам
    for (let groupName in groups) {
        html += `<tr class="row-header"><td colspan="7">${groupName}</td></tr>`;
        
        for (let key in UNIT_TYPES) {
            const u = UNIT_TYPES[key];
            if (groups[groupName](u)) {
                
                // Формируем описание особенностей
                let desc = [];
                if (u.canCapture) desc.push("Захват");
                if (u.bonusArmorDamage) desc.push(`Бронебой: +${u.bonusArmorDamage}`);
                if (u.isAntiAir) desc.push("ПВО");
                if (u.healAmount) desc.push(`Лечит (${u.healAmount})`);
                if (u.mineDamage) desc.push(`Мины (${u.mineDamage})`);
                if (u.transportCapacity) desc.push(`Мест: ${u.transportCapacity}`);
                if (u.isArtillery) desc.push(`Арта (S:${u.artArea})`);
                
                html += `
                    <tr>
                        <td style="text-align: left; display: flex; align-items: center; gap: 5px;">
                            <img src="${u.imgSrc}" width="20" height="20" style="object-fit: contain;"> ${u.name}
                        </td>
                        <td>${u.cost}</td>
                        <td>${u.maxHp}</td>
                        <td>${u.attack}</td>
                        <td>${u.attackRange}</td>
                        <td>${u.moveRange}</td>
                        <td style="font-size: 0.8rem; color: #ccc;">${desc.join(', ') || '-'}</td>
                    </tr>
                `;
            }
        }
    }

    tbody.innerHTML = html;
}

// 4. УПРАВЛЕНИЕ КНОПКАМИ
function setupHelpButtons() {
    const modal = document.getElementById('encyclopedia-modal');
    
    // Кнопка закрытия (крестик)
    document.getElementById('btn-close-help').onclick = () => {
        modal.classList.add('hidden');
    };

    // Кнопка в Главном Меню
    const menuBtn = document.getElementById('btn-menu-help');
    if (menuBtn) menuBtn.onclick = () => modal.classList.remove('hidden');

    // Кнопка внутри Игры (на верхней панели)
    const gameBtn = document.getElementById('btn-game-help');
    if (gameBtn) gameBtn.onclick = () => modal.classList.remove('hidden');
}

// 5. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
window.switchHelpTab = function(tabId) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    // Убираем подсветку кнопок
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));

    // Показываем нужную
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(tabId).classList.add('active');

    // Подсвечиваем кнопку (ищем по onclick, простой хак)
    const activeBtn = document.querySelector(`button[onclick="switchHelpTab('${tabId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
};
  
