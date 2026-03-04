// ============================================================
// useTimerSync — BroadcastChannel timer sync hook
// Simulates Supabase Realtime across browser tabs
// ============================================================

window.TimerSync = (() => {
    const CHANNEL_NAME = 'fitpro-timer';
    let channel = null;
    let listeners = [];

    function getChannel() {
        if (!channel && typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = (ev) => {
                listeners.forEach(fn => fn(ev.data));
            };
        }
        return channel;
    }

    function broadcast(state) {
        const ch = getChannel();
        if (ch) {
            ch.postMessage({ ...state, ts: Date.now() });
        }
    }

    function onUpdate(fn) {
        listeners.push(fn);
        getChannel(); // ensure channel is open
        return () => {
            listeners = listeners.filter(l => l !== fn);
        };
    }

    function close() {
        if (channel) { channel.close(); channel = null; }
        listeners = [];
    }

    return { broadcast, onUpdate, close };
})();

// ============================================================
// Web Audio API — beep helper
// ============================================================
window.AudioHelper = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function beep(freq = 880, duration = 0.15, vol = 0.4) {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
            osc.start(ac.currentTime);
            osc.stop(ac.currentTime + duration);
        } catch (e) { /* ignore */ }
    }

    function workBeep() { beep(880, 0.1); setTimeout(() => beep(880, 0.1), 120); }
    function restBeep() { beep(440, 0.2); }
    function finishBeep() { beep(660, 0.1); setTimeout(() => beep(880, 0.15), 150); setTimeout(() => beep(1100, 0.3), 350); }
    function countBeep() { beep(660, 0.08, 0.2); }

    return { beep, workBeep, restBeep, finishBeep, countBeep };
})();

// ============================================================
// StudentSync — Students broadcast workout state to coach monitor
// Channel: 'fitpro-student-monitor'
// ============================================================
window.StudentSync = (() => {
    const CHANNEL_NAME = 'fitpro-student-monitor';
    let channel = null;
    let listeners = [];

    function getChannel() {
        if (!channel && typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = (ev) => {
                listeners.forEach(fn => fn(ev.data));
            };
        }
        return channel;
    }

    function publish(state) {
        const ch = getChannel();
        if (ch) ch.postMessage({ ...state, ts: Date.now() });
    }

    function onStudentUpdate(fn) {
        listeners.push(fn);
        getChannel();
        return () => { listeners = listeners.filter(l => l !== fn); };
    }

    function close() {
        if (channel) { channel.close(); channel = null; }
        listeners = [];
    }

    return { publish, onStudentUpdate, close };
})();
