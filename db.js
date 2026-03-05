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

// === СОЗДАНИЕ ИГРЫ (ОБНОВЛЕНО) ===
async function createOnlineLobby(config) {
    if (!window.supabaseServer) return;

    try {
        // Мы сохраняем конфиг прямо в структуру лобби, чтобы при подключении знать, что запускать
        // Но так как у нас нет отдельной колонки config в базе, запихнем это в стартовый game_state
        // Или просто передадим в startGame, а оно само сохранит в game_state
        
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .insert([{ map_type: 'custom', status: 'waiting' }]) // map_type формальный
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            window.currentLobbyId = data[0].id;
            window.isOnlineGame = true;
            window.myPlayerId = 1; 
            
            localStorage.setItem('urban_room', window.currentLobbyId);
            localStorage.setItem('urban_role', 1);
            
            // Запускаем игру с выбранными настройками!
            startGame(config); 
            
            // Сразу отправляем этот начальный стейт (с 4 игроками и картой) в базу
            if (window.sendTurnToDatabase) window.sendTurnToDatabase(gameState, gameMap, capturePoints);

            alert(`🔥 Операция началась!\nКод доступа: ${window.currentLobbyId}`);
            subscribeToRealtime(); 
            if (window.initPresence) window.initPresence(window.currentLobbyId, 1);
        }
    } catch (error) { alert("Ошибка: " + error.message); }
}

// === ПОДКЛЮЧЕНИЕ К ИГРЕ (ИГРОК 2 ИЛИ ПЕРЕПОДКЛЮЧЕНИЕ) ===
async function joinOnlineLobby(lobbyId) {
    if (!window.supabaseServer) return;

    try {
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .select('*')
            .eq('id', lobbyId)
            .single();

        if (error || !data) { alert("❌ Комната не найдена! Проверь код."); return; }
        
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
        
        let savedRoom = localStorage.getItem('urban_room');
        let savedRole = localStorage.getItem('urban_role');
        let myName = window.currentUser ? window.currentUser.user_metadata.display_name : null;

        // ИСПРАВЛЕННАЯ СТРОЧКА: Безопасный поиск внутри gameState
        let isPlayer1ByAccount = false;
        if (data.game_state && data.game_state.gameState && data.game_state.gameState.players) {
            if (data.game_state.gameState.players[1].name === myName) {
                isPlayer1ByAccount = true;
            }
        }

        if (savedRoom == lobbyId && savedRole) {
            // Восстанавливаем из памяти телефона
            window.myPlayerId = parseInt(savedRole); 
        } else if (isPlayer1ByAccount) {
            // Восстанавливаем по никнейму аккаунта
            window.myPlayerId = 1;
            localStorage.setItem('urban_room', lobbyId);
            localStorage.setItem('urban_role', 1);
        } else {
            // Иначе мы точно Игрок 2
            window.myPlayerId = 2; 
            localStorage.setItem('urban_room', lobbyId);
            localStorage.setItem('urban_role', 2);
        }
        
        alert(`✅ Вы подключились как Игрок ${window.myPlayerId}!`);
        
        startGame(data.map_type, data.game_state);
        subscribeToRealtime(); 
        
        if (window.initPresence) window.initPresence(lobbyId, window.myPlayerId);

    } catch (error) { alert("Ошибка при подключении: " + error.message); }
}

// === ОТПРАВКА ДАННЫХ НА СЕРВЕР ===
window.sendTurnToDatabase = async function(state, mapData, pointsData) {
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

// === ПРОСЛУШКА ИЗМЕНЕНИЙ (ВЕБ-СОКЕТЫ) ===
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

const btnCreate = document.getElementById('btn-create-online');
if (btnCreate) {
    btnCreate.onclick = () => {
        // Теперь просто открываем модальное окно
        document.getElementById('create-game-modal').classList.remove('hidden');
    };
}

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
