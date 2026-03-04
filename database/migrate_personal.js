const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'fitpro.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error abriendo DB:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite.');
});

db.serialize(() => {
    // 1. Agregar campos a la tabla users para información personal extendida
    const addColumn = (table, column, definition) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error(`Error agregando ${column} a ${table}:`, err.message);
            } else {
                console.log(`✅ ${column} en ${table} verificado.`);
            }
        });
    };

    addColumn('users', 'phone', 'TEXT');
    addColumn('users', 'dob', 'TEXT');          // Date of birth
    addColumn('users', 'height', 'INTEGER');    // cm
    addColumn('users', 'weight', 'REAL');       // kg
    addColumn('users', 'occupation', 'TEXT');
    addColumn('users', 'address', 'TEXT');

    // 2. Crear tabla de auditoría (logs como en Odoo)
    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,      -- e.g., 'student', 'user'
            entity_id TEXT NOT NULL,        -- ID of the modified entity
            changed_by TEXT,                -- ID of the user who made the change
            field TEXT NOT NULL,            -- Name of the field changed
            old_value TEXT,                 -- Previous value
            new_value TEXT,                 -- New value
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creando audit_logs:', err.message);
        else console.log('✅ Tabla audit_logs verificada/creada.');
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Migración de campos y auditoría completada.');
        process.exit(0);
    });
}, 1000);
