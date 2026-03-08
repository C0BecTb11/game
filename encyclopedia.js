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
                    <h3>⏳ Порядок хода</h3>
                    <ul>
                        <li><b>Полный контроль:</b> За один ход вы можете отдать приказы <b>ВСЕМ</b> своим доступным юнитам.</li>
                        <li><b>Одно действие:</b> У каждого юнита есть лишь <b>одно действие</b> на ход: либо <b>Сдвинуться</b>, либо <b>Атаковать</b>.</li>
                        <li>После выполнения действия юнит становится серым (неактивным) до следующего хода.</li>
                    </ul>

                    <h3>🏃 Основы боя</h3>
                    <ul>
                        <li><b>Перемещение:</b> Клик по юниту -> Клик по синей клетке.</li>
                        <li><b>Атака:</b> Если враг в зоне поражения (красная клетка), кликните по нему.</li>
                        <li><b>Укрытия:</b> В зданиях (🏢) и лесу (🌲) пехота получает меньше урона.</li>
                    </ul>

                    <h3>🚩 Захват территорий</h3>
                    <ul>
                        <li>Захватывать флаги может <b>ТОЛЬКО ПЕХОТА</b>.</li>
                        <li><b>Как захватить:</b> Встаньте пехотинцем на клетку с флагом. В конце хода она станет вашей.</li>
                        <li><b>Удержание:</b> Не обязательно стоять на точке вечно. После захвата вы можете уйти — точка останется вашей, пока враг её не перезахватит.</li>
                        <li>Каждая точка дает <b>+15 монет</b> всей команде каждый ход.</li>
                    </ul>

                    <h3>📦 Логистика и Десант</h3>
                    <ul>
                        <li><b>Высадка (Важно!):</b> Вся пехота <b>теряет ход</b> сразу после высадки из транспорта/вертолета. Атаковать можно только на следующий ход.</li>
                        <li><b>Снабжение:</b> Медик и Минёр имеют ограниченный боезапас. Пополняйте их у Грузовиков или Складов.</li>
                        <li><b>Пополнение:</b> Кнопка "🔄 Пополнить" появится, если рядом есть ресурсы.</li>
                    </ul>

                    <h3>🛡️ Броня и Авиация</h3>
                    <ul>
                        <li><b>Танковая броня:</b> Автоматы наносят танкам всего 1 ед. урона. Используйте РПГ, ПТУР или Авиацию.</li>
                        <li><b>Воздух:</b> Вертолеты летают над препятствиями. Сбить их могут только ПЗРК, спец-техника или другие вертолеты.</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
`;

// 2. ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', ENCYCLOPEDIA_TEMPLATE);
    generateDynamicTable();
    setupHelpButtons();
});

// 3. ГЕНЕРАЦИЯ ТАБЛИЦЫ
function generateDynamicTable() {
    const tbody = document.getElementById('encyclopedia-table-body');
    if (!tbody || typeof UNIT_TYPES === 'undefined') return;

    let html = '';

    const factions = [
        {
            name: "🔴 АРМИЯ РФ (Красные)",
            color: "#8B0000",
            check: (u) => !u.id.startsWith('u-') 
        },
        {
            name: "🔵 АРМИЯ США (Синие)",
            color: "#00008B",
            check: (u) => u.id.startsWith('u-') 
        }
    ];

    const subgroups = {
        'Пехота': u => u.isInfantry,
        'Техника': u => (u.isArmor || u.maxCargo) && !u.isAir,
        'Авиация': u => u.isAir
    };

    factions.forEach(faction => {
        html += `<tr class="row-header" style="background-color: ${faction.color}; border-top: 3px solid #000;">
                    <td colspan="7" style="text-align: center; font-size: 1.2rem; color: white;">${faction.name}</td>
                 </tr>`;

        for (let subName in subgroups) {
            const units = Object.values(UNIT_TYPES).filter(u => faction.check(u) && subgroups[subName](u));
            
            if (units.length > 0) {
                html += `<tr class="row-subheader"><td colspan="7" style="background-color: #222; color: #777; padding-left: 10px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${subName}</td></tr>`;
                
                units.forEach(u => {
                    let desc = [];
                    if (u.canCapture) desc.push("Захват");
                    if (u.bonusArmorDamage) desc.push(`Бронебой: +${u.bonusArmorDamage}`);
                    if (u.isAntiAir) desc.push("ПВО");
                    if (u.healAmount) desc.push(`Лечит (${u.healAmount})`);
                    if (u.mineDamage) desc.push(`Мины (${u.mineDamage})`);
                    if (u.transportCapacity) desc.push(`Мест: ${u.transportCapacity}`);
                    if (u.isArtillery) desc.push(`Арта (S:${u.artArea})`);
                    if (u.maxCargo) desc.push(`Груз: ${u.maxCargo}`);
                    
                    html += `
                        <tr>
                            <td style="text-align: left; display: flex; align-items: center; gap: 8px;">
                                <img src="${u.imgSrc}" width="24" height="24" style="object-fit: contain; background: rgba(0,0,0,0.3); border-radius: 3px;"> 
                                ${u.name}
                            </td>
                            <td style="color: #ffd700;">${u.cost}</td>
                            <td style="color: #4caf50;">${u.maxHp}</td>
                            <td style="color: #ff5555;">${u.attack}</td>
                            <td style="color: #64b5f6;">${u.attackRange}</td>
                            <td>${u.moveRange}</td>
                            <td style="font-size: 0.75rem; color: #ccc;">${desc.join(', ') || '-'}</td>
                        </tr>
                    `;
                });
            }
        }
    });

    tbody.innerHTML = html;
}

// 4. УПРАВЛЕНИЕ КНОПКАМИ
function setupHelpButtons() {
    const modal = document.getElementById('encyclopedia-modal');
    
    document.getElementById('btn-close-help').onclick = () => {
        modal.classList.add('hidden');
    };

    const menuBtn = document.getElementById('btn-menu-help');
    if (menuBtn) menuBtn.onclick = () => modal.classList.remove('hidden');

    const gameBtn = document.getElementById('btn-game-help');
    if (gameBtn) gameBtn.onclick = () => modal.classList.remove('hidden');
}

// 5. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
window.switchHelpTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(tabId).classList.add('active');

    const activeBtn = document.querySelector(`button[onclick="switchHelpTab('${tabId}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
};
