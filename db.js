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

// === СОЗДАНИЕ ИГРЫ (ИГРОК 1) ===
async function createOnlineLobby(mapType) {
    if (!window.supabaseServer) return;

    try {
        // Создаем пустую комнату
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .insert([{ map_type: mapType, status: 'waiting' }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            window.currentLobbyId = data[0].id;
            window.isOnlineGame = true;
            window.myPlayerId = 1; 
            
            alert(`🔥 Комната создана!\nКод: ${window.currentLobbyId}\nСкинь его другу.`);
            
            startGame(mapType); 
            subscribeToRealtime(); // Включаем "уши"
            
            // НОВОЕ: ЗАПУСКАЕМ СЛЕЖКУ ЗА ИНТЕРНЕТОМ (Мы - Игрок 1)
            if (window.initPresence) window.initPresence(window.currentLobbyId, 1);
        }
    } catch (error) { alert("Критическая ошибка: " + error.message); }
}

// === ПОДКЛЮЧЕНИЕ К ИГРЕ (ИГРОК 2) ===
async function joinOnlineLobby(lobbyId) {
    if (!window.supabaseServer) return;

    try {
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .select('*')
            .eq('id', lobbyId)
            .single();

        if (error || !data) { alert("❌ Комната не найдена! Проверь код."); return; }
        
        // НОВОЕ: РАЗРЕШАЕМ ПЕРЕПОДКЛЮЧЕНИЕ! 
        // Пускаем в игру, даже если она уже 'playing' (если игрок вылетел и заходит обратно)
        if (data.status !== 'waiting' && data.status !== 'playing') { 
            alert("⚠️ Игра уже завершена!"); return; 
        }

        // Если это первый вход — меняем статус комнаты
        if (data.status === 'waiting') {
            await window.supabaseServer
                .from('lobbies')
                .update({ status: 'playing' })
                .eq('id', lobbyId);
        }

        window.currentLobbyId = lobbyId;
        window.isOnlineGame = true;
        window.myPlayerId = 2; 
        
        alert("✅ Успешное подключение! Загружаем данные сервера...");
        
        startGame(data.map_type, data.game_state);
        subscribeToRealtime(); 
        
        // НОВОЕ: ЗАПУСКАЕМ СЛЕЖКУ ЗА ИНТЕРНЕТОМ (Мы - Игрок 2)
        if (window.initPresence) window.initPresence(lobbyId, 2);

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

// === ПРИВЯЗКА КНОПОК ===
const btnCreate = document.getElementById('btn-create-online');
if (btnCreate) {
    btnCreate.onclick = async () => {
        btnCreate.innerText = "Создание...";
        btnCreate.disabled = true;
        await createOnlineLobby('main');
        btnCreate.innerText = "Создать онлайн игру";
        btnCreate.disabled = false;
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
