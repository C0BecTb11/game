window.gameStarted = false; // Флаг, что оба игрока подключились
window.presenceChannel = null;

window.initPresence = function(lobbyId, myId) {
    if (!window.supabaseServer) return;

    console.log("Включаем радары: отслеживание онлайна...");
    
    // Создаем отдельный канал для статусов
    window.presenceChannel = window.supabaseServer.channel('tracking_' + lobbyId);

    window.presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = window.presenceChannel.presenceState();
            
            // Собираем всех, кто сейчас онлайн в этой комнате
            let onlinePlayers = [];
            for (const key in state) {
                state[key].forEach(p => onlinePlayers.push(p.player));
            }

            const opponentId = myId === 1 ? 2 : 1;
            const isOpponentOnline = onlinePlayers.includes(opponentId);

            // Если противник появился впервые — игра официально началась
            if (isOpponentOnline && !window.gameStarted) {
                window.gameStarted = true;
                console.log("Противник на связи! Игра началась.");
            }

            // Управление экраном отключения
            const discScreen = document.getElementById('disconnect-screen');
            if (discScreen) {
                // Если игра уже идет, а противник пропал — показываем тревогу
                if (window.gameStarted && !isOpponentOnline) {
                    discScreen.classList.remove('hidden');
                } else {
                    discScreen.classList.add('hidden');
                }
            }
        })
        .subscribe(async (status) => {
            // Как только подключились к каналу — кричим "Я онлайн!"
            if (status === 'SUBSCRIBED') {
                await window.presenceChannel.track({
                    player: myId,
                    online_at: new Date().toISOString(),
                });
            }
        });

    // Кнопка капитуляции, если противник так и не вернулся
    const btnSurrender = document.getElementById('btn-surrender-disconnect');
    if (btnSurrender) {
        btnSurrender.onclick = () => {
            location.reload(); // Перезагружаем страницу, чтобы вернуться в меню
        };
    }
};
