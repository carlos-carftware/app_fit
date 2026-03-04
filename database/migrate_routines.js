const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'fitpro.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error abriendo DB:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la BD para agregar tablas de rutinas.');
});

db.serialize(() => {
    // 1. exercises
    db.run(`CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        equipment TEXT,
        description TEXT,
        video_url TEXT
    )`, (err) => {
        if (err) console.error('Error exercises:', err.message);
        else console.log('✅ exercises verificado.');
    });

    // 2. routines
    db.run(`CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        goal TEXT,
        discipline TEXT,
        level TEXT,
        author_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error routines:', err.message);
        else console.log('✅ routines verificado.');
    });

    // 3. routine_exercises
    db.run(`CREATE TABLE IF NOT EXISTS routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id TEXT,
        day_name TEXT,
        exercise_id TEXT,
        sets TEXT,
        reps TEXT,
        rest TEXT,
        notes TEXT,
        FOREIGN KEY (routine_id) REFERENCES routines(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )`, (err) => {
        if (err) console.error('Error routine_exercises:', err.message);
        else console.log('✅ routine_exercises verificado.');
    });

    // 4. student_routines
    db.run(`CREATE TABLE IF NOT EXISTS student_routines (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        coach_id TEXT,
        original_routine_id TEXT,
        name TEXT,
        start_date TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )`, (err) => {
        if (err) console.error('Error student_routines:', err.message);
        else console.log('✅ student_routines verificado.');
    });

    // 5. student_routine_exercises
    db.run(`CREATE TABLE IF NOT EXISTS student_routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_routine_id TEXT NOT NULL,
        day_name TEXT,
        exercise_id TEXT,
        sets TEXT,
        reps TEXT,
        rest TEXT,
        notes TEXT,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (student_routine_id) REFERENCES student_routines(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )`, (err) => {
        if (err) console.error('Error student_routine_exercises:', err.message);
        else console.log('✅ student_routine_exercises verificado.');
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Migración de rutinas completada.');
        process.exit(0);
    });
}, 1000);
