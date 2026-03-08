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
                        <li><b>Пополнение:</b> Подгоните грузовик снабжения или постройте <b>Склад</b> рядом.</li>
                        <li>Кнопка <b>"🔄 Пополнить"</b> появится, если рядом есть ресурсы.</li>
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

// 3. ГЕНЕРАЦИЯ ТАБЛИЦЫ (С РАЗДЕЛЕНИЕМ ПО ФРАКЦИЯМ)
function generateDynamicTable() {
    const tbody = document.getElementById('encyclopedia-table-body');
    if (!tbody || typeof UNIT_TYPES === 'undefined') return;

    let html = '';

    // Определяем две армии
    const factions = [
        {
            name: "🔴 АРМИЯ РФ (Красные)",
            color: "#8B0000",
            // Фильтр: у красных ID обычные ('soldier')
            check: (u) => !u.id.startsWith('u-') 
        },
        {
            name: "🔵 АРМИЯ США (Синие)",
            color: "#00008B",
            // Фильтр: у синих ID начинаются с 'u-' ('u-soldier')
            check: (u) => u.id.startsWith('u-') 
        }
    ];

    // Группировка внутри армии
    const subgroups = {
        'Пехота': u => u.isInfantry,
        'Техника': u => (u.isArmor || u.maxCargo) && !u.isAir,
        'Авиация': u => u.isAir
    };

    factions.forEach(faction => {
        // Заголовок Фракции
        html += `<tr class="row-header" style="background-color: ${faction.color}; border-top: 3px solid #000;">
                    <td colspan="7" style="text-align: center; font-size: 1.2rem; color: white;">${faction.name}</td>
                 </tr>`;

        for (let subName in subgroups) {
            // Находим подходящие юниты
            const units = Object.values(UNIT_TYPES).filter(u => faction.check(u) && subgroups[subName](u));
            
            if (units.length > 0) {
                // Подзаголовок (Тип войск)
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
