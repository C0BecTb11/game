// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m'; 

let supabase;

// Безопасная инициализация
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase успешно загружен!");
} else {
    console.error("ОШИБКА: Библиотека Supabase не загрузилась. Возможно, блокирует провайдер или нет интернета.");
    alert("Критическая ошибка: Supabase не загрузился. Нажми F12 и проверь консоль.");
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
    if (!supabase) {
        alert("Нет подключения к серверу Supabase!");
        return;
    }

    try {
        console.log("Отправляем запрос на создание комнаты...");
        
        const { data, error } = await supabase
            .from('lobbies')
            .insert([{ map_type: mapType, status: 'waiting', game_state: getInitialGameState() }])
            .select();

        // Если база выдала ошибку (например, из-за RLS)
        if (error) {
            console.error("Ошибка базы данных:", error);
            throw error;
        }

        // Если база ничего не вернула (скрытая блокировка RLS)
        if (!data || data.length === 0) {
            console.error("Данные не вернулись. Точно отключен RLS?");
            alert("Ошибка: База заблокировала запись. Проверь настройки RLS в Supabase!");
            return;
        }

        let lobbyId = data[0].id;
        console.log("Успех! ID комнаты:", lobbyId);
        alert(`Игра создана!\nТвой код комнаты: ${lobbyId}\nОтправь его второму игроку.`);
        
        return lobbyId;
    } catch (error) {
        console.error("Ошибка при создании лобби:", error.message);
        alert("Не удалось создать игру. Нажми F12 и посмотри красные ошибки в консоли.");
    }
}

// Привязываем функцию напрямую к кнопке
const btnCreate = document.getElementById('btn-create-online');
if (btnCreate) {
    btnCreate.onclick = async () => {
        btnCreate.innerText = "Создание...";
        btnCreate.disabled = true;
        
        await createOnlineLobby('main');
        
        btnCreate.innerText = "Создать онлайн игру";
        btnCreate.disabled = false;
    };
} else {
    console.error("ОШИБКА: Кнопка 'Создать онлайн игру' не найдена в HTML!");
}
