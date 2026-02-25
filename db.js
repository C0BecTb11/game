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
        // Создаем пустую комнату (без game_state пока что)
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
            
            // Запускаем карту. Игрок 1 сам сгенерирует карту и (в будущем) отправит её в БД
            startGame(mapType); 
            subscribeToRealtime(); // Включаем "уши"
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
        if (data.status !== 'waiting') { alert("⚠️ Игра уже началась!"); return; }

        await window.supabaseServer
            .from('lobbies')
            .update({ status: 'playing' })
            .eq('id', lobbyId);

        window.currentLobbyId = lobbyId;
        window.isOnlineGame = true;
        window.myPlayerId = 2; 
        
        alert("✅ Успешное подключение! Загружаем данные сервера...");
        
        // ВАЖНО: Передаем скачанный game_state (включая карту) в игру
        startGame(data.map_type, data.game_state);
        subscribeToRealtime(); // Включаем "уши"

    } catch (error) { alert("Ошибка при подключении: " + error.message); }
}

// === НОВОЕ: ОТПРАВКА ДАННЫХ НА СЕРВЕР ===
window.sendTurnToDatabase = async function(state, mapData, pointsData) {
    if (!window.isOnlineGame || !window.supabaseServer) return;
    
    // Упаковываем всё состояние игры и саму карту в один пакет
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

// === НОВОЕ: ПРОСЛУШКА ИЗМЕНЕНИЙ (ВЕБ-СОКЕТЫ) ===
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
            
            // Если пришли новые данные, передаем их в саму игру!
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
