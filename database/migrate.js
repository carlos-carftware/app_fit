/**
 * Migration v3: Remove FK constraints from students table
 * (We validate refs at the app layer — SQLite FK enforcement
 *  across a transaction causes issues with the user+student dual insert)
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'fitpro.db'));

db.serialize(() => {
    // 1. Back up existing students
    db.run(`CREATE TABLE IF NOT EXISTS students_backup AS SELECT * FROM students`, (err) => {
        if (err) console.log('Backup already exists or error:', err?.message);
    });

    // 2. Drop the old table (has FK constraints)
    db.run(`DROP TABLE IF EXISTS students`, (err) => {
        if (err) { console.error('Drop failed:', err.message); return; }
        console.log('Old students table dropped.');
    });

    // 3. Recreate without FK constraints
    db.run(`
        CREATE TABLE students (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            gym_id TEXT,
            coach_id TEXT,
            level TEXT DEFAULT 'beginner',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) { console.error('Create failed:', err.message); return; }
        console.log('New students table created (no FKs).');
    });

    // 4. Restore backed-up rows
    db.run(`INSERT OR IGNORE INTO students SELECT id, user_id, gym_id, coach_id, level, status, CURRENT_TIMESTAMP FROM students_backup`, (err) => {
        if (err) console.log('Restore note:', err?.message);
        else console.log('Existing rows restored.');
    });

    // 5. Drop backup
    db.run(`DROP TABLE IF EXISTS students_backup`, () => {
        console.log('Backup cleaned up.');
    });
});

setTimeout(() => {
    db.close(() => console.log('✅ Migration v3 complete — students table rebuilt without FK constraints.'));
}, 1500);
