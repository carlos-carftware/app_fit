const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'fitpro.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error abriendo DB:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la BD para agregar campos de estudiante.');
});

db.serialize(() => {
    const addColumn = (table, column, definition) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error(`Error agregando ${column} a ${table}:`, err.message);
            } else {
                console.log(`✅ ${column} en ${table} verificado.`);
            }
        });
    };

    // 🏥 Salud
    addColumn('students', 'injuries', 'TEXT');
    addColumn('students', 'surgeries', 'TEXT');
    addColumn('students', 'allergies', 'TEXT');
    addColumn('students', 'medications', 'TEXT');
    addColumn('students', 'limitations', 'TEXT');

    // 🏆 Deportivo
    addColumn('students', 'experience', 'TEXT');
    addColumn('students', 'sports', 'TEXT');
    addColumn('students', 'session_duration', 'TEXT');
    addColumn('students', 'weekly_frequency', 'TEXT');

    // 📅 Disponib.
    addColumn('students', 'days', 'TEXT'); // Can store JSON string
    addColumn('students', 'schedule', 'TEXT');
    addColumn('students', 'location', 'TEXT');

    // 🌙 Estilo
    addColumn('students', 'sleep_hours', 'REAL');
    addColumn('students', 'diet', 'TEXT');
    addColumn('students', 'alcohol', 'TEXT');
    addColumn('students', 'tobacco', 'TEXT');
    addColumn('students', 'daily_activity', 'TEXT');

    // ❤️ Pref.
    addColumn('students', 'fav_exercises', 'TEXT');
    addColumn('students', 'disliked_exercises', 'TEXT');
    addColumn('students', 'music', 'TEXT');
    addColumn('students', 'coach_notes', 'TEXT');

});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Migración completada.');
        process.exit(0);
    });
}, 1000);
