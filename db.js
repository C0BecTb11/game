// db.js

const SUPABASE_URL = 'https://kgwqtxnewgdqyxtfteqi.supabase.co';
// Используем ТОЛЬКО ключ для публикации (публичный)
const SUPABASE_KEY = 'sb_publishable_7DWrUXJqKs858mAZ46VWFQ_PAEcWc5m';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log("Подключение к базе данных инициализировано...");
}

testConnection();
