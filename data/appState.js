// ============================================================
// appState.js — Centralized in-memory state
// Starts empty. Data is populated through the UI.
// ============================================================

window.AppState = (() => {
    // Private state
    let state = {
        gyms: [],
        coaches: [],
        students: [],
        sessions: [],
        plannings: [],
    };

    // ── Gyms ───────────────────────────────────────────────
    function getGyms() { return [...state.gyms]; }
    function addGym(gym) {
        const g = { ...gym, id: gym.id || ('gym-' + Date.now()), coaches: 0, studentCount: 0, active: true };
        state.gyms.push(g);
        return g;
    }
    function updateGym(id, data) {
        const idx = state.gyms.findIndex(g => g.id === id);
        if (idx >= 0) state.gyms[idx] = { ...state.gyms[idx], ...data };
    }
    function deleteGym(id) { state.gyms = state.gyms.filter(g => g.id !== id); }

    // ── Coaches ────────────────────────────────────────────
    function getCoaches(gymId = null) {
        return gymId ? state.coaches.filter(c => c.gymId === gymId) : [...state.coaches];
    }
    function addCoach(coach) {
        const c = { ...coach, id: coach.id || ('coach-' + Date.now()), studentCount: 0, sessionsMonth: 0 };
        state.coaches.push(c);
        return c;
    }
    function updateCoach(id, data) {
        const idx = state.coaches.findIndex(c => c.id === id);
        if (idx >= 0) state.coaches[idx] = { ...state.coaches[idx], ...data };
    }

    // ── Students ───────────────────────────────────────────
    function getStudents(coachId = null, gymId = null) {
        return state.students.filter(s =>
            (!coachId || s.coachId === coachId) &&
            (!gymId || s.gymId === gymId)
        );
    }
    function getStudent(id) { return state.students.find(s => s.id === id); }
    function addStudent(student) {
        const s = {
            ...student,
            id: student.id || ('s-' + Date.now()),
            stats: { sessionsTotal: 0, thisMonth: 0, streak: 0, lastSession: null },
            plan: { workoutId: null, nutritionId: null, currentStep: 0 }
        };
        state.students.push(s);
        return s;
    }
    function updateStudent(id, data) {
        const idx = state.students.findIndex(s => s.id === id);
        if (idx >= 0) state.students[idx] = { ...state.students[idx], ...data };
    }

    // ── Sessions ───────────────────────────────────────────
    function getSessions(studentId = null) {
        return studentId ? state.sessions.filter(s => s.studentId === studentId) : [...state.sessions];
    }
    function addSession(session) {
        const s = { ...session, id: 'sess-' + Date.now(), date: new Date().toISOString().split('T')[0] };
        state.sessions.push(s);
        // Update student stats
        const student = getStudent(session.studentId);
        if (student) {
            student.stats.sessionsTotal = (student.stats.sessionsTotal || 0) + 1;
            student.stats.thisMonth = (student.stats.thisMonth || 0) + 1;
            student.stats.lastSession = s.date;
        }
        return s;
    }

    // ── Planning ────────────────────────────────────────────
    function getPlannings(studentId = null) {
        return studentId ? state.plannings.filter(p => p.studentId === studentId) : [...state.plannings];
    }
    function addPlanning(plan) {
        const p = { ...plan, id: 'plan-' + Date.now(), createdAt: new Date().toISOString() };
        state.plannings.push(p);
        return p;
    }
    function updatePlanning(id, data) {
        const idx = state.plannings.findIndex(p => p.id === id);
        if (idx >= 0) state.plannings[idx] = { ...state.plannings[idx], ...data };
    }

    // ── Student next sequential session ────────────────────
    function getStudentNextSession(studentId) {
        const student = getStudent(studentId);
        if (!student) return null;
        const plans = getPlannings(studentId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const completedSessions = getSessions(studentId).map(s => s.planningId);
        const next = plans.find(p => !completedSessions.includes(p.id));
        return next || null;
    }

    return {
        getGyms, addGym, updateGym, deleteGym,
        getCoaches, addCoach, updateCoach,
        getStudents, getStudent, addStudent, updateStudent,
        getSessions, addSession,
        getPlannings, addPlanning, updatePlanning,
        getStudentNextSession,
    };
})();
