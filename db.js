// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m'; 

window.supabaseServer = null;
window.isOnlineGame = false;
window.currentLobbyId = null;
window.myPlayerId = 1; 

if (window.supabase) {
    window.supabaseServer = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase успешно подключен!");
} else {
    alert("Внимание! Сервер базы данных недоступен.");
}

// === СОЗДАНИЕ ИГРЫ (ОНЛАЙН) ===
async function createOnlineLobby(config) {
    if (!window.supabaseServer) return;

    try {
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .insert([{ map_type: 'custom', status: 'waiting' }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            window.currentLobbyId = data[0].id;
            window.isOnlineGame = true;
            window.myPlayerId = 1; 
            
            // Сохраняем, что мы создатель (Игрок 1)
            localStorage.setItem('urban_room', window.currentLobbyId);
            localStorage.setItem('urban_role', 1);
            
            // Запускаем игру с выбранными настройками (размер, режим)
            startGame(config); 
            
            // Сразу отправляем данные в базу, чтобы зафиксировать количество игроков
            if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);

            alert(`🔥 Операция началась!\nКод доступа: ${window.currentLobbyId}\nСкинь код друзьям!`);
            subscribeToRealtime(); 
            if (window.initPresence) window.initPresence(window.currentLobbyId, 1);
        }
    } catch (error) { alert("Ошибка при создании: " + error.message); }
}

// === ПОДКЛЮЧЕНИЕ К ИГРЕ (УМНЫЙ ПОИСК СЛОТА) ===
async function joinOnlineLobby(lobbyId) {
    if (!window.supabaseServer) return;

    try {
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .select('*')
            .eq('id', lobbyId)
            .single();

        if (error || !data) { alert("❌ Комната не найдена! Проверь код."); return; }
        
        // Проверяем, есть ли данные игры (чтобы знать, какие слоты свободны)
        if (!data.game_state || !data.game_state.gameState || !data.game_state.gameState.players) {
            alert("⚠️ Ошибка данных лобби. Попробуйте позже.");
            return;
        }

        if (data.status !== 'waiting' && data.status !== 'playing') { 
            alert("⚠️ Игра уже завершена!"); return; 
        }

        if (data.status === 'waiting') {
            await window.supabaseServer
                .from('lobbies')
                .update({ status: 'playing' })
                .eq('id', lobbyId);
        }

        window.currentLobbyId = lobbyId;
        window.isOnlineGame = true;
        
        // --- ЛОГИКА РАСПРЕДЕЛЕНИЯ МЕСТ ---
        let savedRoom = localStorage.getItem('urban_room');
        let savedRole = localStorage.getItem('urban_role');
        let myName = window.currentUser ? window.currentUser.user_metadata.display_name : null;
        let players = data.game_state.gameState.players;
        let assignedId = null;

        // 1. Попытка восстановить сессию (если перезагрузил страницу)
        if (savedRoom == lobbyId && savedRole) {
            assignedId = parseInt(savedRole);
        }
        
        // 2. Если не вышло, ищем по никнейму (если зашел с другого устройства)
        if (!assignedId && myName) {
            for (let pid in players) {
                if (players[pid].name === myName) {
                    assignedId = parseInt(pid);
                    break;
                }
            }
        }

        // 3. Если мы новый игрок - ищем ПЕРВЫЙ СВОБОДНЫЙ слот ("Ожидание...")
        if (!assignedId) {
            for (let pid in players) {
                if (players[pid].name === 'Ожидание...') {
                    assignedId = parseInt(pid);
                    break;
                }
            }
        }

        // Если мест нет
        if (!assignedId) {
            alert("⚠️ В лобби нет свободных мест!");
            return;
        }

        // Фиксируем роль
        window.myPlayerId = assignedId;
        localStorage.setItem('urban_room', lobbyId);
        localStorage.setItem('urban_role', assignedId);
        
        let team = players[assignedId].team;
        alert(`✅ Вы вступили в бой!\nВаш позывной: Игрок ${window.myPlayerId}\nКоманда: ${team}`);
        
        startGame(data.map_type, data.game_state); // Загружаем настройки хоста
        subscribeToRealtime(); 
        
        if (window.initPresence) window.initPresence(lobbyId, window.myPlayerId);

    } catch (error) { alert("Ошибка при подключении: " + error.message); }
}

// === ЗАПУСК ОФЛАЙН ТЕСТА (HOTSEAT) ===
window.startOfflineTest = function() {
    const size = document.getElementById('setting-map-size').value;
    const mode = document.getElementById('setting-game-mode').value;
    
    // Прячем меню
    document.getElementById('create-game-modal').classList.add('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    
    const config = { size: parseInt(size), mode: mode };
    
    // Ставим флаг, что мы не онлайн
    window.isOnlineGame = false;
    window.myPlayerId = 1; // Начинаем за первого
    
    // Запускаем игру
    startGame(config);
    
    // ВРУБАЕМ РЕЖИМ ТЕСТА (включается управление за всех)
    gameState.isOffline = true;
    
    // Даем понятные имена ботам для теста
    if (mode === '2v2') {
        gameState.players[1].name = "Вы (Красный)";
        gameState.players[2].name = "Враг (Синий)";
        gameState.players[3].name = "Союзник (Розовый)";
        gameState.players[4].name = "Враг (Голубой)";
    }
    
    updateUI();
    renderAll();
    
    alert("🔧 ЗАПУЩЕН ТЕСТОВЫЙ РЕЖИМ (HOTSEAT)\nВы управляете ВСЕМИ игроками по очереди.\nНажмите 'Завершить ход', чтобы переключиться.");
};

// === ОТПРАВКА ХОДА ===
window.sendTurnToDatabase = async function(state, mapData, pointsData) {
    // В офлайн-тесте ничего никуда не отправляем
    if (!window.isOnlineGame || !window.supabaseServer) return;
    
    const fullPayload = {
        gameState: state,
        gameMap: mapData,
        capturePoints: pointsData
    };

    await window.supabaseServer
        .from('lobbies')
        .update({ game_state: fullPayload })
        .eq('id', window.currentLobbyId);
};

// === WEB-SOCKETS ===
function subscribeToRealtime() {
    window.supabaseServer
        .channel('room_' + window.currentLobbyId)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'lobbies', 
            filter: `id=eq.${window.currentLobbyId}` 
        }, (payload) => {
            const newData = payload.new.game_state;
            if (newData && typeof window.applyNetworkState === 'function') {
                window.applyNetworkState(newData.gameState, newData.gameMap, newData.capturePoints);
            }
        })
        .subscribe();
}

// === КНОПКИ В ИНТЕРФЕЙСЕ ===

// 1. Кнопка "Создать игру" (открывает модалку)
const btnCreate = document.getElementById('btn-create-online');
if (btnCreate) {
    btnCreate.onclick = () => {
        document.getElementById('create-game-modal').classList.remove('hidden');
    };
}

// 2. Кнопка "Войти" (по коду)
const btnJoin = document.getElementById('btn-join-online');
if (btnJoin) {
    btnJoin.onclick = async () => {
        const inputId = document.getElementById('join-lobby-id').value;
        if (!inputId) { alert("Введите код комнаты!"); return; }
        btnJoin.innerText = "Вход...";
        btnJoin.disabled = true;
        await joinOnlineLobby(inputId);
        btnJoin.innerText = "Войти";
        btnJoin.disabled = false;
    };
}

// 3. Кнопка "НАЧАТЬ" внутри модалки
window.confirmCreateGame = async function() {
    const size = document.getElementById('setting-map-size').value;
    const mode = document.getElementById('setting-game-mode').value;
    
    const btn = document.querySelector('#create-game-modal .btn-primary');
    btn.innerText = "Создание...";
    btn.disabled = true;

    await createOnlineLobby({ size: parseInt(size), mode: mode });

    btn.innerText = "НАЧАТЬ";
    btn.disabled = false;
};
