// ============================================================
// lib/supabase.js — Supabase client + realtime channels
// Requires: Supabase JS CDN in index.html
// Configure SUPABASE_URL and SUPABASE_ANON_KEY below
// ============================================================

// ─── CONFIGURATION ─────────────────────────────────────────
// Replace with your Supabase project credentials:
// Dashboard → Settings → API
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// ─── CLIENT ────────────────────────────────────────────────
const _supabaseEnabled = SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co';

window.SupabaseClient = _supabaseEnabled
    ? window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (_supabaseEnabled) {
    console.log('%c[FitPro] Supabase conectado ✅', 'color:#10b981;font-weight:bold');
} else {
    console.warn('[FitPro] Supabase no configurado — usando datos mock. Edita lib/supabase.js con tus credenciales.');
}

// ─── AUTH HELPERS ──────────────────────────────────────────
window.SupabaseAuth = {
    async login(email, password) {
        if (!SupabaseClient) return Auth.login(email, password, 'coach'); // fallback
        const { data, error } = await SupabaseClient.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        // Fetch profile
        const { data: profile } = await SupabaseClient
            .from('profiles').select('*').eq('id', data.user.id).single();

        if (profile) {
            localStorage.setItem('fitpro_user', JSON.stringify({ ...profile, supabaseId: data.user.id }));
        }
        return { success: true, user: profile };
    },

    async logout() {
        if (SupabaseClient) await SupabaseClient.auth.signOut();
        localStorage.removeItem('fitpro_user');
    },

    getUser() {
        try { return JSON.parse(localStorage.getItem('fitpro_user')); }
        catch { return null; }
    }
};

// ─── REALTIME — TIMER (Coach → Students) ──────────────────
window.SupabaseTimerSync = {
    _channel: null,
    _listeners: [],

    subscribe(gymId, onUpdate) {
        if (!SupabaseClient) {
            // Fallback to BroadcastChannel
            return TimerSync.onUpdate(onUpdate);
        }
        this._channel = SupabaseClient
            .channel(`timer-${gymId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'timer_states',
                filter: `gym_id=eq.${gymId}`
            }, payload => onUpdate(payload.new))
            .subscribe();

        return () => {
            if (this._channel) SupabaseClient.removeChannel(this._channel);
        };
    },

    async broadcast(gymId, coachId, state) {
        if (!SupabaseClient) {
            TimerSync.broadcast(state);
            return;
        }
        await SupabaseClient.from('timer_states').upsert({
            gym_id: gymId,
            coach_id: coachId,
            ...state,
            updated_at: new Date().toISOString()
        }, { onConflict: 'gym_id' });
    }
};

// ─── REALTIME — STUDENT MONITOR (Students → Coach) ────────
window.SupabaseStudentSync = {
    _channel: null,

    subscribe(gymId, onUpdate) {
        if (!SupabaseClient) {
            return StudentSync.onStudentUpdate(onUpdate);
        }
        this._channel = SupabaseClient
            .channel(`student-monitor-${gymId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'student_workout_states',
                filter: `gym_id=eq.${gymId}`
            }, payload => onUpdate(payload.new))
            .subscribe();

        return () => {
            if (this._channel) SupabaseClient.removeChannel(this._channel);
        };
    },

    async publish(studentId, gymId, workoutId, state) {
        if (!SupabaseClient) {
            StudentSync.publish({ type: 'student-workout', studentId, ...state });
            return;
        }
        await SupabaseClient.from('student_workout_states').upsert({
            student_id: studentId,
            gym_id: gymId,
            workout_id: workoutId,
            ...state,
            updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });
    }
};
