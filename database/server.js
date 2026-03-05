const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper: convert raw SQLite errors to friendly messages
function dbErr(err, res) {
    if (!err) return false;
    if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
        res.status(400).json({ error: 'Este email ya está registrado. Usa un email diferente.' });
    } else if (err.message && err.message.includes('UNIQUE constraint failed: gyms.slug')) {
        res.status(400).json({ error: 'Ya existe un gimnasio con ese nombre. Prueba con otro nombre.' });
    } else {
        res.status(500).json({ error: err.message });
    }
    return true;
}

// Initialize SQLite database
const dbPath = path.resolve(__dirname, 'fitpro.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a SQLite:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite.');
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Create tables if they don't exist
const schemaPath = path.resolve(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) console.error('Error al ejecutar schema.sql:', err.message);
        else {
            console.log('✅ Estructura de la base de datos verificada.');
            // Migration: add 'active' column to users if it doesn't exist
            db.run(`ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1`, (e) => {
                if (e && !e.message.includes('duplicate column')) {
                    console.error('Migration error (users.active):', e.message);
                } else {
                    console.log('✅ Migración: columna users.active verificada.');
                }
            });
            // Migration: add 'photo_url' column to users
            db.run(`ALTER TABLE users ADD COLUMN photo_url TEXT`, (e) => {
                if (e && !e.message.includes('duplicate column')) {
                    console.error('Migration error (users.photo_url):', e.message);
                } else {
                    console.log('✅ Migración: columna users.photo_url verificada.');
                }
            });
        }
    });
} else {
    console.warn('⚠️ No se encontró schema.sql. Se recomienda crearlo para definir las tablas.');
}

// ============== API ROUTES ============== 

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'FitPro API en línea.' });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT id, string_id, name, email, role, avatar, avatar_color, photo_url FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    const { string_id, name, email, avatar, role } = req.body;
    db.run(
        'INSERT INTO users (string_id, name, email, avatar, role) VALUES (?, ?, ?, ?, ?)',
        [string_id, name, email, avatar, role || 'student'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, string_id, name, success: true });
        }
    );
});

// Upload or update a profile photo (accepts base64 data URI)
app.patch('/api/users/:id/photo', (req, res) => {
    const { photoDataUrl } = req.body;
    if (!photoDataUrl) return res.status(400).json({ error: 'No se recibió imagen' });
    // Limit to ~5MB base64
    if (photoDataUrl.length > 50 * 1024 * 1024) return res.status(400).json({ error: 'La imagen es demasiado grande (máx 5MB)' });
    db.run('UPDATE users SET photo_url = ? WHERE string_id = ?', [photoDataUrl, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, photo_url: photoDataUrl });
    });
});


app.get('/api/workouts', (req, res) => {
    db.all('SELECT * FROM workouts', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ── AUTH ─────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, usernameOrEmail, password, gymSlug } = req.body;
    const identifier = usernameOrEmail || email;
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Usuario/Email y contraseña requeridos' });
    }
    let query = 'SELECT id, string_id, name, email, avatar, avatar_color, role, gym_id, active, photo_url FROM users WHERE (email = LOWER(?) OR LOWER(name) = LOWER(?)) AND password_hash = ?';
    const params = [identifier.trim(), identifier.trim(), password];
    // If a gymSlug is provided, restrict login to users of that gym
    if (gymSlug) {
        query = `SELECT u.id, u.string_id, u.name, u.email, u.avatar, u.avatar_color, u.role, u.gym_id, u.active, u.photo_url,
                        g.name as gym_name, g.slug as gym_slug
                 FROM users u JOIN gyms g ON u.gym_id = g.id
                 WHERE (u.email = LOWER(?) OR LOWER(u.name) = LOWER(?)) AND u.password_hash = ? AND g.slug = ?`;
        params.push(gymSlug);
    }
    db.get(query, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Credenciales incorrectas' });

        // Block inactive user accounts
        if (row.active === 0) {
            return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        // If user is a student, also check the students table status
        if (row.role === 'student') {
            db.get('SELECT status FROM students WHERE user_id = ?', [row.string_id || String(row.id)], (sErr, stu) => {
                if (stu && stu.status === 'inactive') {
                    return res.status(403).json({ error: 'Tu cuenta de estudiante está desactivada. Contacta a tu coach.' });
                }
                res.json({
                    success: true,
                    user: {
                        id: row.string_id || String(row.id),
                        name: row.name,
                        email: row.email,
                        avatar: row.avatar || row.name.slice(0, 2).toUpperCase(),
                        avatarColor: row.avatar_color || 'av-purple',
                        role: row.role,
                        gymId: row.gym_id || null,
                        gymName: row.gym_name || null,
                        gymSlug: row.gym_slug || null,
                        photoUrl: row.photo_url || null,
                    }
                });
            });
        } else {
            res.json({
                success: true,
                user: {
                    id: row.string_id || String(row.id),
                    name: row.name,
                    email: row.email,
                    avatar: row.avatar || row.name.slice(0, 2).toUpperCase(),
                    avatarColor: row.avatar_color || 'av-purple',
                    role: row.role,
                    gymId: row.gym_id || null,
                    gymName: row.gym_name || null,
                    gymSlug: row.gym_slug || null,
                    photoUrl: row.photo_url || null,
                }
            });
        }
    });
});

// ── SESSION CHECK (for polling if user get deactivated mid-session) ───────
app.get('/api/check-session', (req, res) => {
    const { userId, role } = req.query;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });

    if (role === 'student') {
        // Check student status
        db.get(`SELECT s.status, u.active FROM students s 
                JOIN users u ON s.user_id = u.string_id 
                WHERE s.user_id = ?`, [userId], (err, row) => {
            if (err || !row) return res.json({ active: false });
            res.json({ active: row.active !== 0 && row.status !== 'inactive' });
        });
    } else {
        db.get('SELECT active FROM users WHERE string_id = ?', [userId], (err, row) => {
            if (err || !row) return res.json({ active: false });
            res.json({ active: row.active !== 0 });
        });
    }
});

// ── DASHBOARD STATS (Role-based Analytics) ───────────────
app.get('/api/dashboard-stats', (req, res) => {
    const { role, id, gymId } = req.query;

    if (role === 'superadmin') {
        db.all(`
            SELECT 
                g.*, 
                (SELECT COUNT(*) FROM users WHERE gym_id = g.id AND role = 'coach') as coaches,
                (SELECT COUNT(*) FROM students WHERE gym_id = g.id) as students
            FROM gyms g
        `, (err, gyms) => {
            if (err) return res.status(500).json({ error: err.message });

            const totalGyms = gyms.length;
            const totalCoaches = gyms.reduce((acc, g) => acc + g.coaches, 0);
            const totalStudents = gyms.reduce((acc, g) => acc + g.students, 0);

            // Mock revenue estimation (can be replaced by a real subscriptions table later)
            const totalRevenue = gyms.reduce((acc, g) => acc + (g.plan === 'Enterprise' ? 149 : g.plan === 'Pro' ? 99 : 49), 0);

            res.json({ gyms, totalGyms, totalCoaches, totalStudents, totalRevenue });
        });
    }
    else if (role === 'gym') {
        if (!gymId) return res.status(400).json({ error: 'Falta gymId' });

        db.get('SELECT COUNT(*) as count FROM users WHERE gym_id = ? AND role = "coach"', [gymId], (err, rowC) => {
            db.get('SELECT COUNT(*) as count FROM students WHERE gym_id = ?', [gymId], (err, rowS) => {
                db.all(`
                    SELECT u.name, u.avatar_color as avatarColor,
                           (SELECT COUNT(*) FROM students WHERE coach_id = u.string_id) as student_count
                    FROM users u 
                    WHERE u.gym_id = ? AND u.role = 'coach'
                    ORDER BY student_count DESC LIMIT 4
                `, [gymId], (err, topCoaches) => {
                    res.json({
                        totalCoaches: rowC ? rowC.count : 0,
                        totalStudents: rowS ? rowS.count : 0,
                        topCoaches: topCoaches || []
                    });
                });
            });
        });
    }
    else if (role === 'coach') {
        if (!id) return res.status(400).json({ error: 'Falta id del coach' });

        db.all(`
            SELECT s.id, s.level, u.name, u.avatar, u.avatar_color 
            FROM students s
            JOIN users u ON s.user_id = u.string_id
            WHERE s.coach_id = ?
        `, [id], (err, students) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                totalStudents: students.length,
                myStudents: students.slice(0, 4) // Top 4 for widget
            });
        });
    }
    else if (role === 'student') {
        if (!id) return res.status(400).json({ error: 'Falta id de estudiante' });

        // id may be users.string_id (stu-xxx) OR students.id (st-xxx) — resolve both
        db.get('SELECT id FROM students WHERE id = ? OR user_id = ?', [id, id], (lookupErr, stuRow) => {
            const studentId = stuRow ? stuRow.id : id;

            db.get(`
                SELECT COUNT(*) as completed_count 
                FROM student_routine_exercises sre
                JOIN student_routines sr ON sre.student_routine_id = sr.id
                WHERE sr.student_id = ? AND sre.completed = 1
            `, [studentId], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    completedSessions: row ? row.completed_count : 0
                });
            });
        });
    }
    else {
        res.status(400).json({ error: 'Rol no válido para estadísticas' });
    }
});

// ── GYMS CRUD ─────────────────────────────────────────────
// GET all gyms
app.get('/api/gyms', (req, res) => {
    db.all('SELECT *, (SELECT COUNT(*) FROM users WHERE gym_id = gyms.id AND role = "coach") as coach_count, (SELECT COUNT(*) FROM students WHERE gym_id = gyms.id) as student_count FROM gyms', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET single gym
app.get('/api/gyms/:id', (req, res) => {
    db.get('SELECT * FROM gyms WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Gym no encontrado' });
        res.json(row);
    });
});

// POST create gym
app.post('/api/gyms', (req, res) => {
    const { name, address, phone, email, plan } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const id = 'gym-' + Date.now();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    db.run(
        'INSERT INTO gyms (id, name, slug, address, phone, email, plan, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [id, name, slug, address || '', phone || '', email || '', plan || 'basic'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id, slug, loginUrl: `#login?gym=${slug}` });
        }
    );
});

// PUT update gym
app.put('/api/gyms/:id', (req, res) => {
    const { name, address, phone, email, plan, active } = req.body;
    const id = req.params.id;
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : undefined;
    const fields = [];
    const vals = [];
    if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
    if (slug) { fields.push('slug = ?'); vals.push(slug); }
    if (address !== undefined) { fields.push('address = ?'); vals.push(address); }
    if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone); }
    if (email !== undefined) { fields.push('email = ?'); vals.push(email); }
    if (plan !== undefined) { fields.push('plan = ?'); vals.push(plan); }
    if (active !== undefined) { fields.push('active = ?'); vals.push(active ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' });
    vals.push(id);
    db.run(`UPDATE gyms SET ${fields.join(', ')} WHERE id = ?`, vals, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, slug: slug || undefined });
    });
});

// DELETE gym
app.delete('/api/gyms/:id', (req, res) => {
    db.run('DELETE FROM gyms WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ── COACHES CRUD ─────────────────────────────────────────
// GET coaches (optional ?gymId=xxx filter)
app.get('/api/coaches', (req, res) => {
    const { gymId } = req.query;
    let query = 'SELECT u.string_id as id, u.name, u.email, u.avatar, u.avatar_color, u.gym_id, u.active, g.name as gym_name FROM users u LEFT JOIN gyms g ON u.gym_id = g.id WHERE u.role = "coach"';
    const params = [];
    if (gymId) { query += ' AND u.gym_id = ?'; params.push(gymId); }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create coach
app.post('/api/coaches', (req, res) => {
    const { name, email, password, gymId, specialty, avatarColor } = req.body;
    if (!name || !email || !password || !gymId) {
        return res.status(400).json({ error: 'Nombre, email, contraseña y gimnasio son obligatorios' });
    }
    const stringId = 'coach-' + Date.now();
    const avatar = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    db.run(
        'INSERT INTO users (string_id, name, email, password_hash, avatar, avatar_color, role, gym_id) VALUES (?, ?, ?, ?, ?, ?, "coach", ?)',
        [stringId, name, email.toLowerCase().trim(), password, avatar, avatarColor || 'av-green', gymId],
        function (err) {
            if (dbErr(err, res)) return;
            res.json({ success: true, id: stringId });
        }
    );
});

// PUT update coach
app.put('/api/coaches/:id', (req, res) => {
    const { name, email, password, gymId, avatarColor } = req.body;
    const fields = []; const vals = [];
    if (name) { fields.push('name = ?'); vals.push(name); }
    if (email) { fields.push('email = ?'); vals.push(email.toLowerCase().trim()); }
    if (password) { fields.push('password_hash = ?'); vals.push(password); }
    if (gymId) { fields.push('gym_id = ?'); vals.push(gymId); }
    if (avatarColor) { fields.push('avatar_color = ?'); vals.push(avatarColor); }
    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' });
    vals.push(req.params.id);
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE string_id = ? AND role = "coach"`, vals, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE coach
app.delete('/api/coaches/:id', (req, res) => {
    db.run('DELETE FROM users WHERE string_id = ? AND role = "coach"', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ── TOGGLE ACTIVE / STATUS ───────────────────────────────────
// Toggle a user account (coaches, gym admins, etc.) active/inactive
app.patch('/api/users/:id/toggle-active', (req, res) => {
    db.get('SELECT active FROM users WHERE string_id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
        const newActive = row.active === 0 ? 1 : 0;
        db.run('UPDATE users SET active = ? WHERE string_id = ?', [newActive, req.params.id], function (e2) {
            if (e2) return res.status(500).json({ error: e2.message });
            res.json({ success: true, active: newActive });
        });
    });
});

// Toggle a student's status (active / inactive) via the students table
app.patch('/api/students/:id/toggle-active', (req, res) => {
    db.get('SELECT status FROM students WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Estudiante no encontrado' });
        const newStatus = row.status === 'inactive' ? 'active' : 'inactive';
        db.run('UPDATE students SET status = ? WHERE id = ?', [newStatus, req.params.id], function (e2) {
            if (e2) return res.status(500).json({ error: e2.message });
            res.json({ success: true, status: newStatus });
        });
    });
});

// ── GYM ADMIN ────────────────────────────────────────────
// GET gym admins
app.get('/api/gym-admins', (req, res) => {
    const { gymId } = req.query;
    let query = 'SELECT u.string_id as id, u.name, u.email, u.avatar, u.avatar_color, u.gym_id, g.name as gym_name FROM users u LEFT JOIN gyms g ON u.gym_id = g.id WHERE u.role = "gym"';
    const params = [];
    if (gymId) { query += ' AND u.gym_id = ?'; params.push(gymId); }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create gym admin
app.post('/api/gym-admins', (req, res) => {
    const { name, email, password, gymId, avatarColor } = req.body;
    if (!name || !email || !password || !gymId) {
        return res.status(400).json({ error: 'Nombre, email, contraseña y gimnasio son obligatorios' });
    }
    const stringId = 'gymadm-' + Date.now();
    const avatar = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    db.run(
        'INSERT INTO users (string_id, name, email, password_hash, avatar, avatar_color, role, gym_id) VALUES (?, ?, ?, ?, ?, ?, "gym", ?)',
        [stringId, name, email.toLowerCase().trim(), password, avatar, avatarColor || 'av-blue', gymId],
        function (err) {
            if (dbErr(err, res)) return;
            res.json({ success: true, id: stringId });
        }
    );
});

// PUT update gym admin
app.put('/api/gym-admins/:id', (req, res) => {
    const { name, email, password, gymId, avatarColor } = req.body;
    const fields = []; const vals = [];
    if (name) { fields.push('name = ?'); vals.push(name); }
    if (email) { fields.push('email = ?'); vals.push(email.toLowerCase().trim()); }
    if (password) { fields.push('password_hash = ?'); vals.push(password); }
    if (gymId) { fields.push('gym_id = ?'); vals.push(gymId); }
    if (avatarColor) { fields.push('avatar_color = ?'); vals.push(avatarColor); }
    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' });
    vals.push(req.params.id);
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE string_id = ? AND role = "gym"`, vals, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE gym admin
app.delete('/api/gym-admins/:id', (req, res) => {
    db.run('DELETE FROM users WHERE string_id = ? AND role = "gym"', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ── STUDENTS CRUD ────────────────────────────────────────
// GET students (filter by gymId and/or coachId)
app.get('/api/students', (req, res) => {
    const { gymId, coachId } = req.query;
    let query = `SELECT s.*,
                        u.name, u.email, u.avatar, u.avatar_color, u.photo_url,
                        c.name as coach_name,
                        g.name as gym_name
                 FROM students s
                 LEFT JOIN users u ON s.user_id = u.string_id
                 LEFT JOIN users c ON s.coach_id = c.string_id
                 LEFT JOIN gyms  g ON s.gym_id  = g.id
                 WHERE 1=1`;
    const params = [];
    if (gymId) { query += ' AND s.gym_id = ?'; params.push(gymId); }
    if (coachId) { query += ' AND s.coach_id = ?'; params.push(coachId); }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET single student
app.get('/api/students/:id', (req, res) => {
    const query = `SELECT s.*, u.name, u.email, u.avatar, u.avatar_color, u.photo_url,
                          c.name as coach_name, g.name as gym_name
                   FROM students s
                   LEFT JOIN users u ON s.user_id = u.string_id
                   LEFT JOIN users c ON s.coach_id = c.string_id
                   LEFT JOIN gyms  g ON s.gym_id  = g.id
                   WHERE s.id = ? OR s.user_id = ?`;
    db.get(query, [req.params.id, req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(row);
    });
});

// POST create student (also creates user account — wrapped in a transaction)
app.post('/api/students', (req, res) => {
    const { name, email, password, gymId, coachId, level } = req.body;
    if (!name || !email || !password || !gymId) {
        return res.status(400).json({ error: 'Nombre, email, contraseña y gimnasio son obligatorios' });
    }

    // Validate that the gym actually exists first
    db.get('SELECT id FROM gyms WHERE id = ?', [gymId], (gErr, gym) => {
        if (gErr) return res.status(500).json({ error: gErr.message });
        if (!gym) return res.status(400).json({ error: 'El gimnasio seleccionado no existe. Selecciona un gimnasio válido.' });

        const userId = 'stu-' + Date.now();
        const studentId = 'st-' + Date.now();
        const avatar = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

        // Use a transaction so both inserts are atomic
        db.run('BEGIN TRANSACTION', () => {
            db.run(
                'INSERT INTO users (string_id, name, email, password_hash, avatar, avatar_color, role, gym_id) VALUES (?, ?, ?, ?, ?, "av-green", "student", ?)',
                [userId, name, email.toLowerCase().trim(), password, avatar, gymId],
                function (uErr) {
                    if (uErr) {
                        return db.run('ROLLBACK', () => {
                            if (uErr.message.includes('UNIQUE constraint failed: users.email')) {
                                res.status(400).json({ error: 'Este email ya está registrado. Usa un email diferente.' });
                            } else {
                                res.status(500).json({ error: uErr.message });
                            }
                        });
                    }
                    db.run(
                        'INSERT INTO students (id, user_id, gym_id, coach_id, level, status) VALUES (?, ?, ?, ?, ?, "active")',
                        [studentId, userId, gymId, coachId || null, level || 'beginner'],
                        function (sErr) {
                            if (sErr) {
                                return db.run('ROLLBACK', () => {
                                    res.status(500).json({ error: 'Error al registrar al estudiante: ' + sErr.message });
                                });
                            }
                            db.run('COMMIT', () => {
                                res.json({ success: true, id: studentId, userId });
                            });
                        }
                    );
                }
            );
        });
    });
});

// PUT update student (Personal info, Status, Level, Coach) with Audit Logs
app.put('/api/students/:id', (req, res) => {
    const {
        name, email, password, coachId, level, status,
        phone, dob, height, weight, occupation, address,
        injuries, surgeries, allergies, medications, limitations,
        experience, sports, session_duration, weekly_frequency,
        days, schedule, location,
        sleep_hours, diet, alcohol, tobacco, daily_activity,
        fav_exercises, disliked_exercises, music, coach_notes,
        changedBy
    } = req.body;

    const auditorId = changedBy || 'system';

    db.get(`
        SELECT s.*, u.name, u.email, u.phone, u.dob, u.height, u.weight, u.occupation, u.address 
        FROM students s 
        LEFT JOIN users u ON s.user_id = u.string_id 
        WHERE s.id = ?
    `, [req.params.id], (err, current) => {
        if (err || !current) return res.status(404).json({ error: 'Estudiante no encontrado' });

        db.run('BEGIN TRANSACTION', () => {
            const logs = [];
            const logChange = (field, oldVal, newVal) => {
                const o = oldVal === null ? undefined : oldVal;
                if (o != newVal && newVal !== undefined) {
                    logs.push({ field, old: o, new: newVal });
                }
            };

            const uFields = []; const uVals = [];

            if (name !== undefined) { logChange('name', current.name, name); uFields.push('name = ?'); uVals.push(name); }
            if (email !== undefined) { const mail = email.toLowerCase().trim(); logChange('email', current.email, mail); uFields.push('email = ?'); uVals.push(mail); }
            if (password) { logChange('password_hash', '***', '***'); uFields.push('password_hash = ?'); uVals.push(password); }
            if (phone !== undefined) { logChange('phone', current.phone, phone); uFields.push('phone = ?'); uVals.push(phone); }
            if (dob !== undefined) { logChange('dob', current.dob, dob); uFields.push('dob = ?'); uVals.push(dob); }
            if (height !== undefined) { logChange('height', current.height, height); uFields.push('height = ?'); uVals.push(height); }
            if (weight !== undefined) { logChange('weight', current.weight, weight); uFields.push('weight = ?'); uVals.push(weight); }
            if (occupation !== undefined) { logChange('occupation', current.occupation, occupation); uFields.push('occupation = ?'); uVals.push(occupation); }
            if (address !== undefined) { logChange('address', current.address, address); uFields.push('address = ?'); uVals.push(address); }

            const commitAndLog = () => {
                if (logs.length === 0) return db.run('COMMIT', () => res.json({ success: true, logs: 0 }));

                const stmt = db.prepare('INSERT INTO audit_logs (entity_type, entity_id, changed_by, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
                logs.forEach(l => stmt.run('student', req.params.id, auditorId, l.field, l.old === null ? '' : l.old, l.new === null ? '' : l.new));
                stmt.finalize();

                db.run('COMMIT', () => res.json({ success: true, loggedChanges: logs.length }));
            };

            const runStudentUpdate = () => {
                const sFields = []; const sVals = [];
                const addSField = (fld, cur, val) => {
                    if (val !== undefined) {
                        logChange(fld, cur, val);
                        sFields.push(`${fld} = ?`);
                        sVals.push(val);
                    }
                };

                addSField('coach_id', current.coach_id, coachId === '' ? null : coachId);
                addSField('level', current.level, level);
                addSField('status', current.status, status);
                addSField('injuries', current.injuries, injuries);
                addSField('surgeries', current.surgeries, surgeries);
                addSField('allergies', current.allergies, allergies);
                addSField('medications', current.medications, medications);
                addSField('limitations', current.limitations, limitations);
                addSField('experience', current.experience, experience);
                addSField('sports', current.sports, sports);
                addSField('session_duration', current.session_duration, session_duration);
                addSField('weekly_frequency', current.weekly_frequency, weekly_frequency);
                addSField('days', current.days, days);
                addSField('schedule', current.schedule, schedule);
                addSField('location', current.location, location);
                addSField('sleep_hours', current.sleep_hours, sleep_hours);
                addSField('diet', current.diet, diet);
                addSField('alcohol', current.alcohol, alcohol);
                addSField('tobacco', current.tobacco, tobacco);
                addSField('daily_activity', current.daily_activity, daily_activity);
                addSField('fav_exercises', current.fav_exercises, fav_exercises);
                addSField('disliked_exercises', current.disliked_exercises, disliked_exercises);
                addSField('music', current.music, music);
                addSField('coach_notes', current.coach_notes, coach_notes);

                if (sFields.length === 0) return commitAndLog();

                sVals.push(req.params.id);
                db.run(`UPDATE students SET ${sFields.join(', ')} WHERE id = ?`, sVals, (sErr) => {
                    if (sErr) return db.run('ROLLBACK', () => res.status(500).json({ error: dbErr(sErr) }));
                    commitAndLog();
                });
            };

            if (uFields.length > 0) {
                uVals.push(current.user_id);
                db.run(`UPDATE users SET ${uFields.join(', ')} WHERE string_id = ?`, uVals, (uErr) => {
                    if (uErr) return db.run('ROLLBACK', () => res.status(400).json({ error: dbErr(uErr) }));
                    runStudentUpdate();
                });
            } else {
                runStudentUpdate();
            }
        });
    });
});

// DELETE student (also removes user account)
app.delete('/api/students/:id', (req, res) => {
    db.get('SELECT user_id FROM students WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM students WHERE id = ?', [req.params.id], () => {
            if (row?.user_id) {
                db.run('DELETE FROM users WHERE string_id = ?', [row.user_id], () => { });
            }
        });
        res.json({ success: true });
    });
});

// ── AUDIT LOGS ───────────────────────────────────────────
app.get('/api/audit-logs', (req, res) => {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) return res.status(400).json({ error: 'Faltan parámetros' });

    const query = `
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.changed_by = u.string_id OR a.changed_by = u.id
        WHERE a.entity_type = ? AND a.entity_id = ?
        ORDER BY a.created_at DESC
    `;
    db.all(query, [entityType, entityId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ── PLANNING CRUD ────────────────────────────────────────
// GET plannings (by studentId or gymId)
app.get('/api/plannings', (req, res) => {
    const { studentId, gymId, coachId } = req.query;
    let query = `SELECT p.*, u.name as student_name
                 FROM plannings p
                 LEFT JOIN students s ON p.student_id = s.id
                 LEFT JOIN users u ON s.user_id = u.string_id
                 WHERE 1=1`;
    const params = [];
    if (studentId) { query += ' AND p.student_id = ?'; params.push(studentId); }
    if (gymId) { query += ' AND s.gym_id = ?'; params.push(gymId); }
    if (coachId) { query += ' AND p.coach_id = ?'; params.push(coachId); }
    query += ' ORDER BY p.date ASC';
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST create planning
app.post('/api/plannings', (req, res) => {
    const { studentId, coachId, workoutId, date, notes, title } = req.body;
    if (!studentId || !date) return res.status(400).json({ error: 'Estudiante y fecha son obligatorios' });
    const id = 'plan-' + Date.now();
    db.run(
        'INSERT INTO plannings (id, student_id, coach_id, workout_id, date, notes, title, status) VALUES (?, ?, ?, ?, ?, ?, ?, "pending")',
        [id, studentId, coachId || null, workoutId || null, date, notes || '', title || 'Sesión de entrenamiento'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id });
        }
    );
});

// PUT update planning
app.put('/api/plannings/:id', (req, res) => {
    const { status, notes, workoutId, date, title } = req.body;
    const fields = []; const vals = [];
    if (status) { fields.push('status = ?'); vals.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); vals.push(notes); }
    if (workoutId) { fields.push('workout_id = ?'); vals.push(workoutId); }
    if (date) { fields.push('date = ?'); vals.push(date); }
    if (title) { fields.push('title = ?'); vals.push(title); }
    if (!fields.length) return res.status(400).json({ error: 'Nada para actualizar' });
    vals.push(req.params.id);
    db.run(`UPDATE plannings SET ${fields.join(', ')} WHERE id = ?`, vals, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// DELETE planning
app.delete('/api/plannings/:id', (req, res) => {
    db.run('DELETE FROM plannings WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ── EXERCISES CRUD ───────────────────────────────────────
app.get('/api/exercises', (req, res) => {
    db.all('SELECT * FROM exercises ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/exercises', (req, res) => {
    const { id, name, category, equipment, description, video_url } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const exId = id || 'ex-' + Date.now();

    db.run(
        'INSERT INTO exercises (id, name, category, equipment, description, video_url) VALUES (?, ?, ?, ?, ?, ?)',
        [exId, name, category, equipment, description, video_url],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: exId });
        }
    );
});

// ── ROUTINES (TEMPLATES) CRUD ────────────────────────────
app.get('/api/routines', (req, res) => {
    db.all('SELECT * FROM routines ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/routines/:id', (req, res) => {
    db.get('SELECT * FROM routines WHERE id = ?', [req.params.id], (err, routine) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

        db.all(`
            SELECT re.*, e.name as exercise_name, e.category, e.equipment 
            FROM routine_exercises re 
            LEFT JOIN exercises e ON re.exercise_id = e.id 
            WHERE re.routine_id = ?
            ORDER BY re.day_name, re.id ASC
        `, [routine.id], (err2, exercises) => {
            if (err2) return res.status(500).json({ error: err2.message });
            routine.exercises = exercises;
            res.json(routine);
        });
    });
});

app.post('/api/routines', (req, res) => {
    const { name, goal, discipline, level, authorId, exercises } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const id = 'rtn-' + Date.now();

    db.run('BEGIN TRANSACTION', () => {
        db.run(
            'INSERT INTO routines (id, name, goal, discipline, level, author_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, goal, discipline, level, authorId],
            (err) => {
                if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                if (!exercises || exercises.length === 0) {
                    return db.run('COMMIT', () => res.json({ success: true, id }));
                }

                const stmt = db.prepare('INSERT INTO routine_exercises (routine_id, day_name, group_name, exercise_id, sets, reps, rest, notes, timer_type, timer_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                exercises.forEach(ex => {
                    stmt.run(id, ex.day_name || 'Día 1', ex.group_name || '', ex.exercise_id, ex.sets || '', ex.reps || '', ex.rest || '', ex.notes || '', ex.timer_type || '', typeof ex.timer_config === 'object' ? JSON.stringify(ex.timer_config) : (ex.timer_config || '{}'), err => {
                        if (err) console.error('Routine EX err:', err.message);
                    });
                });
                stmt.finalize();

                db.run('COMMIT', () => res.json({ success: true, id }));
            }
        );
    });
});

// ── STUDENT ROUTINES (ASSIGNMENT & INSTANCING) ─────────
app.get('/api/student-routines/:studentId', (req, res) => {
    const rawId = req.params.studentId;

    // Resolve: studentId may be students.id ('st-xxx') OR users.string_id ('stu-xxx')
    db.get('SELECT id FROM students WHERE id = ? OR user_id = ?', [rawId, rawId], (lookupErr, stuRow) => {
        if (lookupErr) return res.status(500).json({ error: lookupErr.message });
        const studentId = stuRow ? stuRow.id : rawId; // Use the canonical students.id

        db.all('SELECT * FROM student_routines WHERE student_id = ? ORDER BY created_at DESC', [studentId], (err, sRoutines) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!sRoutines || sRoutines.length === 0) return res.json([]);

            const routineIds = sRoutines.map(r => r.id);
            const placeholders = routineIds.map(() => '?').join(',');

            db.all(`
                SELECT sre.*, e.name as exercise_name, e.category, e.equipment 
                FROM student_routine_exercises sre 
                LEFT JOIN exercises e ON sre.exercise_id = e.id 
                WHERE sre.student_routine_id IN (${placeholders})
                ORDER BY sre.day_name, sre.id ASC
            `, routineIds, (err2, exercises) => {
                if (err2) return res.status(500).json({ error: err2.message });

                const routinesWithEx = sRoutines.map(routine => {
                    const myExercises = exercises.filter(e => e.student_routine_id === routine.id);
                    return { ...routine, exercises: myExercises };
                });

                res.json(routinesWithEx);
            });
        });
    });
});

app.post('/api/student-routines', (req, res) => {
    const { studentId, coachId, routineId, startDate, customName } = req.body;
    if (!studentId || !routineId) return res.status(400).json({ error: 'Faltan parámetros' });

    db.get('SELECT * FROM routines WHERE id = ?', [routineId], (err, masterRoutine) => {
        if (err || !masterRoutine) return res.status(404).json({ error: 'Rutina master no encontrada' });

        const sRoutineId = 'sr-' + Date.now();
        const routineName = customName || masterRoutine.name;

        db.run('BEGIN TRANSACTION', () => {
            db.run(
                'INSERT INTO student_routines (id, student_id, coach_id, original_routine_id, name, start_date) VALUES (?, ?, ?, ?, ?, ?)',
                [sRoutineId, studentId, coachId, routineId, routineName, startDate || new Date().toISOString().split('T')[0]],
                (err) => {
                    if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                    db.all('SELECT * FROM routine_exercises WHERE routine_id = ?', [routineId], (err, masterExercises) => {
                        if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                        if (masterExercises.length === 0) {
                            return db.run('COMMIT', () => res.json({ success: true, id: sRoutineId }));
                        }

                        const stmt = db.prepare('INSERT INTO student_routine_exercises (student_routine_id, day_name, group_name, exercise_id, sets, reps, rest, notes, timer_type, timer_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                        masterExercises.forEach(ex => {
                            stmt.run(sRoutineId, ex.day_name, ex.group_name || '', ex.exercise_id, ex.sets, ex.reps, ex.rest, ex.notes, ex.timer_type || '', ex.timer_config || '{}', err => {
                                if (err) console.error('Student EX err:', err.message);
                            });
                        });
                        stmt.finalize();

                        db.run('COMMIT', () => res.json({ success: true, id: sRoutineId }));
                    });
                }
            );
        });
    });
});

// Update Student Routine Name
app.put('/api/student-routines/:id', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    db.run('UPDATE student_routines SET name = ? WHERE id = ?', [name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete Student Routine
app.delete('/api/student-routines/:id', (req, res) => {
    const routineId = req.params.id;
    db.run('BEGIN TRANSACTION', () => {
        db.run('DELETE FROM student_routine_exercises WHERE student_routine_id = ?', [routineId], function (err) {
            if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));
            db.run('DELETE FROM student_routines WHERE id = ?', [routineId], function (err2) {
                if (err2) return db.run('ROLLBACK', () => res.status(500).json({ error: err2.message }));
                db.run('COMMIT', () => res.json({ success: true }));
            });
        });
    });
});

// Rename a Student Routine Day
app.put('/api/student-routines/:id/days/:dayName', (req, res) => {
    const { newName } = req.body;
    const { id, dayName } = req.params;
    if (!newName) return res.status(400).json({ error: 'El nuevo nombre es obligatorio' });

    db.run('UPDATE student_routine_exercises SET day_name = ? WHERE student_routine_id = ? AND day_name = ?', [newName, id, decodeURIComponent(dayName)], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Delete a Student Routine Day
app.delete('/api/student-routines/:id/days/:dayName', (req, res) => {
    const { id, dayName } = req.params;
    db.run('DELETE FROM student_routine_exercises WHERE student_routine_id = ? AND day_name = ?', [id, decodeURIComponent(dayName)], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.put('/api/student-routine-exercises/:id', (req, res) => {
    const { sets, reps, rest, notes, timer_type, timer_config, group_name, changedBy } = req.body;
    const exId = req.params.id;

    db.get('SELECT * FROM student_routine_exercises WHERE id = ?', [exId], (err, oldRecord) => {
        if (err || !oldRecord) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        const logs = [];
        if (sets !== undefined && sets !== oldRecord.sets) logs.push({ field: 'Sets', old: oldRecord.sets, new: sets });
        if (reps !== undefined && reps !== oldRecord.reps) logs.push({ field: 'Reps/Tiempo', old: oldRecord.reps, new: reps });
        if (rest !== undefined && rest !== oldRecord.rest) logs.push({ field: 'Descanso', old: oldRecord.rest, new: rest });
        if (notes !== undefined && notes !== oldRecord.notes) logs.push({ field: 'Notas (Coach)', old: oldRecord.notes, new: notes });
        if (timer_type !== undefined && timer_type !== oldRecord.timer_type) logs.push({ field: 'SmartWOD Tipo', old: oldRecord.timer_type || '', new: timer_type });
        if (group_name !== undefined && group_name !== oldRecord.group_name) logs.push({ field: 'Grupo', old: oldRecord.group_name || '', new: group_name });

        const fields = []; const vals = [];
        if (sets !== undefined) { fields.push('sets = ?'); vals.push(sets); }
        if (reps !== undefined) { fields.push('reps = ?'); vals.push(reps); }
        if (rest !== undefined) { fields.push('rest = ?'); vals.push(rest); }
        if (notes !== undefined) { fields.push('notes = ?'); vals.push(notes); }
        if (timer_type !== undefined) { fields.push('timer_type = ?'); vals.push(timer_type); }
        if (timer_config !== undefined) { fields.push('timer_config = ?'); vals.push(typeof timer_config === 'string' ? timer_config : JSON.stringify(timer_config)); }
        if (group_name !== undefined) { fields.push('group_name = ?'); vals.push(group_name); }

        if (!fields.length) return res.json({ success: true });
        vals.push(exId);

        db.run('BEGIN TRANSACTION', () => {
            db.run(`UPDATE student_routine_exercises SET ${fields.join(', ')} WHERE id = ?`, vals, function (err) {
                if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                if (logs.length > 0 && changedBy) {
                    const stmt = db.prepare('INSERT INTO audit_logs (entity_type, entity_id, changed_by, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)');
                    logs.forEach(l => {
                        stmt.run('routine_exercise', exId, changedBy, l.field, l.old || '', l.new || '', err => {
                            if (err) console.error('Audit log err:', err.message);
                        });
                    });
                    stmt.finalize();
                }

                db.run('COMMIT', () => res.json({ success: true }));
            });
        });
    });
});

app.put('/api/student-routine-exercises/:id/complete', (req, res) => {
    const { completed } = req.body;
    const exId = req.params.id;

    db.run('UPDATE student_routine_exercises SET completed = ? WHERE id = ?', [completed === true ? 1 : 0, exId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, completed: completed === true });
    });
});

// Not Found Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`🚀 FitPro Backend Server`);
    console.log(`======================================`);
    console.log(`📡 Escuchando peticiones en: http://localhost:${PORT}`);
    console.log(`🔌 Status API: http://localhost:${PORT}/api/status`);
    console.log(`======================================\n`);
});
