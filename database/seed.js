// ============================================================
// seed.js — Reset DB and create only superadmin
// ============================================================
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'fitpro.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('Error al conectar:', err.message); return; }
    console.log('✅ Conectado a SQLite para reset.');
});

db.serialize(() => {
    // 1. Wipe all existing data
    db.run('DELETE FROM sessions');
    db.run('DELETE FROM students');
    db.run('DELETE FROM workouts');
    db.run('DELETE FROM gyms');
    db.run('DELETE FROM users');

    // 2. Insert ONLY the superadmin
    db.run(
        'INSERT OR IGNORE INTO users (string_id, name, email, password_hash, avatar, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['sa-001', 'Administrador', 'admin@fitpro.com', 'adm2022*', 'A', 'superadmin'],
        function (err) {
            if (err) console.error('Error al insertar superadmin:', err.message);
            else console.log('✅ Superadmin creado (admin@fitpro.com / adm2022*)');
        }
    );
});

db.close((err) => {
    if (err) console.error(err.message);
    console.log('🔌 Conexión cerrada. Base de datos reseteada correctamente.');
});
