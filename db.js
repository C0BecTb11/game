// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m'; 

// Глобальные переменные для онлайна
window.supabaseServer = null;
window.isOnlineGame = false;
window.currentLobbyId = null;
window.myPlayerId = 1; // 1 - Создатель (Красные), 2 - Гость (Синие)

if (window.supabase) {
    window.supabaseServer = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase успешно подключен!");
} else {
    alert("Внимание! Сервер базы данных недоступен. Проверьте интернет.");
}

const getInitialGameState = () => ({
    turn: 1, 
    state: 'IDLE',
    players: {
        1: { points: 100, color: '#ff5555' },
        2: { points: 100, color: '#5555ff' }
    },
    units: []
});

// === СОЗДАНИЕ ИГРЫ (ИГРОК 1) ===
async function createOnlineLobby(mapType) {
    if (!window.supabaseServer) return;

    try {
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .insert([{ map_type: mapType, status: 'waiting', game_state: getInitialGameState() }])
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            window.currentLobbyId = data[0].id;
            window.isOnlineGame = true;
            window.myPlayerId = 1; // Создатель играет за Красных
            
            alert(`🔥 Комната создана!\nКод: ${window.currentLobbyId}\nСкинь его другу. Поле боя загружается...`);
            
            // ЗАПУСКАЕМ КАРТУ! (Функция из game.js)
            startGame(mapType); 
        }
    } catch (error) {
        alert("Критическая ошибка: " + error.message);
    }
}

// === ПОДКЛЮЧЕНИЕ К ИГРЕ (ИГРОК 2) ===
async function joinOnlineLobby(lobbyId) {
    if (!window.supabaseServer) return;

    try {
        // 1. Ищем комнату в базе
        const { data, error } = await window.supabaseServer
            .from('lobbies')
            .select('*')
            .eq('id', lobbyId)
            .single();

        if (error || !data) {
            alert("❌ Комната не найдена! Проверь код.");
            return;
        }

        if (data.status !== 'waiting') {
            alert("⚠️ Игра уже началась или завершена!");
            return;
        }

        // 2. Меняем статус комнаты на 'playing', чтобы больше никто не зашел
        const { error: updateError } = await window.supabaseServer
            .from('lobbies')
            .update({ status: 'playing' })
            .eq('id', lobbyId);

        if (updateError) throw updateError;

        // 3. Сохраняем настройки для второго игрока
        window.currentLobbyId = lobbyId;
        window.isOnlineGame = true;
        window.myPlayerId = 2; // Гость играет за Синих
        
        alert("✅ Успешное подключение! Ты играешь за Синих (Игрок 2).");
        
        // ЗАПУСКАЕМ КАРТУ!
        startGame(data.map_type);

    } catch (error) {
        alert("Ошибка при подключении: " + error.message);
    }
}

// === ПРИВЯЗКА КНОПОК МЕНЮ ===
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
        if (!inputId) {
            alert("Введите код комнаты!");
            return;
        }
        btnJoin.innerText = "Вход...";
        btnJoin.disabled = true;
        
        // Подключаемся по введенному коду
        await joinOnlineLobby(inputId);
        
        btnJoin.innerText = "Войти";
        btnJoin.disabled = false;
    };
}
