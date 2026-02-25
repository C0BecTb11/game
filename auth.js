// auth.js

// Бронебойная функция: кодирует ЛЮБЫЕ символы (русские, пробелы) в безопасный hex-формат для email
const formatEmail = (username) => {
    let cleanName = username.trim().toLowerCase();
    // Превращаем текст в набор безопасных символов (hex)
    let safeString = Array.from(new TextEncoder().encode(cleanName))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return `${safeString}@ut.game`;
};

window.currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const authScreen = document.getElementById('auth-screen');
    const mainMenu = document.getElementById('main-menu');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Переключение между Входом и Регистрацией
    const linkToReg = document.getElementById('link-to-register');
    if (linkToReg) {
        linkToReg.onclick = (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        };
    }

    const linkToLogin = document.getElementById('link-to-login');
    if (linkToLogin) {
        linkToLogin.onclick = (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        };
    }

    // === РЕГИСТРАЦИЯ ===
    const btnReg = document.getElementById('btn-register');
    if (btnReg) {
        btnReg.onclick = async () => {
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
                options: { data: { display_name: username } } // Сохраняем красивый ник
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
    }

    // === ВХОД ===
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
        btnLogin.onclick = async () => {
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
    }

    // Проверка сессии при старте
    async function checkSession() {
        if (!window.supabaseServer) return;
        const { data } = await window.supabaseServer.auth.getSession();
        if (data.session) {
            startGameMenu(data.session.user);
        } else {
            if(authScreen) authScreen.classList.remove('hidden');
            if(mainMenu) mainMenu.classList.add('hidden');
        }
    }

    setTimeout(checkSession, 500); 
});

// Переход в главное меню
window.startGameMenu = function(user) {
    window.currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    
    // Достаем красивый ник из памяти
    const username = user.user_metadata.display_name || "Командир";
    const nameLabel = document.getElementById('menu-player-name');
    if(nameLabel) nameLabel.innerText = `Приветствую, ${username}!`;
}

// === ВЫХОД ИЗ АККАУНТА ===
window.logout = async function() {
    if(window.supabaseServer) await window.supabaseServer.auth.signOut();
    location.reload();
}
