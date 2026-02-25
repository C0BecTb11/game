// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m'; 

let supabaseServer;

// Проверяем, загрузилась ли библиотека вообще
if (window.supabase) {
    supabaseServer = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase успешно подключен!");
} else {
    alert("Внимание! Сервер базы данных недоступен. Проверьте интернет или отключите блокировщик рекламы.");
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

async function createOnlineLobby(mapType) {
    if (!supabaseServer) {
        alert("Нет связи с сервером. Невозможно создать игру.");
        return;
    }

    try {
        const { data, error } = await supabaseServer
            .from('lobbies')
            .insert([{ map_type: mapType, status: 'waiting', game_state: getInitialGameState() }])
            .select();

        if (error) {
            alert(`Ошибка Базы: ${error.message}`);
            return;
        }

        if (data && data.length > 0) {
            let lobbyId = data[0].id;
            alert(`🔥 Игра успешно создана!\nТвой код комнаты: ${lobbyId}\nОтправь его второму игроку.`);
        } else {
            alert("Данные не записались. Проверьте отключен ли RLS в Supabase.");
        }

    } catch (error) {
        alert("Критическая ошибка: " + error.message);
    }
}

// Привязываем напрямую без DOMContentLoaded, чтобы работало сразу
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
