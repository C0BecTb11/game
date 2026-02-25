// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m'; // Только публичный ключ!

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Базовое стартовое состояние игры для онлайна
const getInitialGameState = () => ({
    turn: 1, 
    state: 'IDLE',
    players: {
        1: { points: 100, color: '#ff5555' },
        2: { points: 100, color: '#5555ff' }
    },
    units: []
});

// Функция создания нового лобби
async function createOnlineLobby(mapType) {
    try {
        console.log("Создаем комнату на сервере...");
        
        // Отправляем данные в таблицу 'lobbies'
        const { data, error } = await supabase
            .from('lobbies')
            .insert([
                { 
                    map_type: mapType, 
                    status: 'waiting', 
                    game_state: getInitialGameState() 
                }
            ])
            .select();

        if (error) throw error;

        let lobbyId = data[0].id;
        console.log("Успех! ID комнаты:", lobbyId);
        
        // Показываем код игроку
        alert(`Игра создана!\nТвой код комнаты: ${lobbyId}\nОтправь его второму игроку.`);
        
        return lobbyId;
    } catch (error) {
        console.error("Ошибка при создании лобби:", error.message);
        alert("Не удалось создать игру. Подробности в консоли.");
    }
}

// Привязываем функцию к кнопке в меню (пока всегда создаем основную карту)
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-create-online').onclick = async () => {
        // Меняем текст кнопки, чтобы было понятно, что идет загрузка
        const btn = document.getElementById('btn-create-online');
        btn.innerText = "Создание...";
        btn.disabled = true;
        
        await createOnlineLobby('main');
        
        btn.innerText = "Создать онлайн игру";
        btn.disabled = false;
    };
});
