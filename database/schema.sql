-- FitPro Local Database Schema (v2)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    string_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar TEXT,
    avatar_color TEXT DEFAULT 'av-purple',
    role TEXT CHECK( role IN ('superadmin','gym','coach','student') ) NOT NULL DEFAULT 'student',
    gym_id TEXT,
    active INTEGER DEFAULT 1,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gyms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    plan TEXT DEFAULT 'basic',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    gym_id TEXT,
    coach_id TEXT,
    level TEXT DEFAULT 'beginner',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    coach_id TEXT,
    workout_id TEXT,
    date TEXT NOT NULL,
    duration_min INTEGER,
    rating INTEGER,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    author_id TEXT
);

CREATE TABLE IF NOT EXISTS plannings (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    coach_id TEXT,
    workout_id TEXT,
    date TEXT NOT NULL,
    title TEXT DEFAULT 'Sesión de entrenamiento',
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);
