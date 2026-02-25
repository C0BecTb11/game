// auth.js

// Вспомогательная функция для превращения ника в "email"
const formatEmail = (username) => `${username.trim().toLowerCase()}@ut.game`;

window.currentUser = null; // Здесь будем хранить данные игрока

document.addEventListener('DOMContentLoaded', () => {
    const authScreen = document.getElementById('auth-screen');
    const mainMenu = document.getElementById('main-menu');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Переключение между Входом и Регистрацией
    document.getElementById('link-to-register').onclick = (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    };

    document.getElementById('link-to-login').onclick = (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    };

    // === РЕГИСТРАЦИЯ ===
    document.getElementById('btn-register').onclick = async () => {
        if (!window.supabaseServer) return alert("Нет связи с БД!");

        const username = document.getElementById('reg-username').value;
        const pass1 = document.getElementById('reg-password').value;
        const pass2 = document.getElementById('reg-password-confirm').value;

        if (!username || !pass1 || !pass2) return alert("Заполните все поля!");
        if (pass1.length < 6) return alert("Пароль должен быть минимум 6 символов!");
        if (pass1 !== pass2) return alert("Пароли не совпадают!");

        document.getElementById('btn-register').innerText = "Регистрация...";

        const { data, error } = await window.supabaseServer.auth.signUp({
            email: formatEmail(username),
            password: pass1,
            options: { data: { display_name: username } } // Сохраняем реальный ник
        });

        document.getElementById('btn-register').innerText = "Зарегистрироваться";

        if (error) {
            if (error.message.includes("already registered")) alert("Это имя уже занято!");
            else alert("Ошибка регистрации: " + error.message);
        } else {
            alert("Успешная регистрация! Добро пожаловать, " + username);
            startGameMenu(data.user);
        }
    };

    // === ВХОД ===
    document.getElementById('btn-login').onclick = async () => {
        if (!window.supabaseServer) return alert("Нет связи с БД!");

        const username = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;

        if (!username || !pass) return alert("Заполните все поля!");

        document.getElementById('btn-login').innerText = "Вход...";

        const { data, error } = await window.supabaseServer.auth.signInWithPassword({
            email: formatEmail(username),
            password: pass
        });

        document.getElementById('btn-login').innerText = "Войти";

        if (error) {
            alert("Неверное имя пользователя или пароль!");
        } else {
            startGameMenu(data.user);
        }
    };

    // Проверка: может мы уже авторизованы с прошлого раза?
    async function checkSession() {
        if (!window.supabaseServer) return;
        const { data } = await window.supabaseServer.auth.getSession();
        if (data.session) {
            startGameMenu(data.session.user);
        } else {
            // Если нет, показываем экран авторизации, прячем меню
            authScreen.classList.remove('hidden');
            mainMenu.classList.add('hidden');
        }
    }

    // Запускаем проверку при старте
    setTimeout(checkSession, 500); // Небольшая задержка, чтобы db.js успел загрузиться
});

// Функция для перехода в главное меню
function startGameMenu(user) {
    window.currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    
    // Выводим имя сверху
    const username = user.user_metadata.display_name || "Командир";
    document.getElementById('menu-player-name').innerText = `Приветствую, ${username}!`;
}

// === ВЫХОД ИЗ АККАУНТА ===
window.logout = async function() {
    await window.supabaseServer.auth.signOut();
    location.reload();
}
