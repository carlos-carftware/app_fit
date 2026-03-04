const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'fitpro.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error abriendo DB:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la BD para migrar columnas de timer.');
});

db.serialize(() => {
    // routine_exercises
    db.run(`ALTER TABLE routine_exercises ADD COLUMN timer_type TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err.message);
        else console.log('routine_exercises.timer_type ✅');
    });
    db.run(`ALTER TABLE routine_exercises ADD COLUMN timer_config TEXT DEFAULT '{}'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err.message);
        else console.log('routine_exercises.timer_config ✅');
    });

    // student_routine_exercises
    db.run(`ALTER TABLE student_routine_exercises ADD COLUMN timer_type TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err.message);
        else console.log('student_routine_exercises.timer_type ✅');
    });
    db.run(`ALTER TABLE student_routine_exercises ADD COLUMN timer_config TEXT DEFAULT '{}'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) console.error(err.message);
        else console.log('student_routine_exercises.timer_config ✅');
    });
});

setTimeout(() => {
    db.close();
    console.log('Migración de timers completada.');
    process.exit(0);
}, 1000);
