// ============================================================
// mockData.js — Catalog data only (no users, no personal data)
// User data is empty at startup — created through the app UI.
// ============================================================

// --- EMPTY stubs so legacy code doesn't break ---
window.MOCK_USERS = {};
window.MOCK_GYMS = [];
window.MOCK_STUDENTS = [];
window.MOCK_COACHES = [];
window.MOCK_SESSIONS = [];

// ─── EXERCISES CATALOG ─────────────────────────────────────
// These are generic exercises available to all coaches
window.MOCK_EXERCISES = [
  { id: 'e1', name: 'Back Squat', category: 'Legs', icon: '🏋️', muscles: 'Cuádriceps, Glúteos, Core', equipment: 'Barra + discos' },
  { id: 'e2', name: 'Deadlift', category: 'Posterior', icon: '💪', muscles: 'Isquiotibiales, Glúteos, Erectors', equipment: 'Barra + discos' },
  { id: 'e3', name: 'Clean & Jerk', category: 'Olympic', icon: '⚡', muscles: 'Full body', equipment: 'Barra olímpica' },
  { id: 'e4', name: 'Snatch', category: 'Olympic', icon: '🎯', muscles: 'Full body explosivo', equipment: 'Barra olímpica' },
  { id: 'e5', name: 'Pull-up', category: 'Upper', icon: '🔝', muscles: 'Dorsal, Bíceps, Core', equipment: 'Barra dominadas' },
  { id: 'e6', name: 'Push-up', category: 'Upper', icon: '🤸', muscles: 'Pecho, Tríceps, Core', equipment: 'Ninguno' },
  { id: 'e7', name: 'Box Jump', category: 'Explosive', icon: '📦', muscles: 'Cuádriceps, Glúteos, Pantorrillas', equipment: 'Cajón plyo' },
  { id: 'e8', name: 'Kettlebell Swing', category: 'Posterior', icon: '🔔', muscles: 'Isquiotibiales, Glúteos, Hombros', equipment: 'Kettlebell' },
  { id: 'e9', name: 'Burpee', category: 'Cardio', icon: '🔥', muscles: 'Full body', equipment: 'Ninguno' },
  { id: 'e10', name: 'Rope Climb', category: 'Upper', icon: '🧗', muscles: 'Bíceps, Dorsal, Core', equipment: 'Cuerda' },
  { id: 'e11', name: 'Thruster', category: 'Olympic', icon: '🚀', muscles: 'Cuádriceps, Hombros, Tríceps', equipment: 'Barra' },
  { id: 'e12', name: 'Wall Ball', category: 'Cardio', icon: '🏀', muscles: 'Cuádriceps, Core, Hombros', equipment: 'Balón medicina' },
  { id: 'e13', name: 'Toes to Bar', category: 'Core', icon: '🎪', muscles: 'Abdominales, Flexores cadera', equipment: 'Barra dominadas' },
  { id: 'e14', name: 'Ring Muscle-Up', category: 'Upper', icon: '⭕', muscles: 'Dorsal, Pecho, Tríceps', equipment: 'Anillas' },
  { id: 'e15', name: 'Rowing', category: 'Cardio', icon: '🚣', muscles: 'Full body, cardio', equipment: 'Remo ergómetro' },
];

// ─── WORKOUT TEMPLATES ─────────────────────────────────────
// Base workout templates — coaches create real workouts through UI
window.MOCK_WORKOUTS = [
  {
    id: 'w1', name: 'Iniciación Fuerza', type: 'Strength', level: 'beginner', duration: 45,
    exercises: [
      { exerciseId: 'e1', sets: 3, reps: '10', rest: 90, notes: '60% 1RM' },
      { exerciseId: 'e6', sets: 3, reps: '12', rest: 60, notes: '' },
      { exerciseId: 'e8', sets: 3, reps: '15', rest: 60, notes: '24kg' },
    ]
  },
  {
    id: 'w2', name: 'WOD Competición', type: 'CrossFit', level: 'intermediate', duration: 60,
    exercises: [
      { exerciseId: 'e11', sets: 5, reps: '15', rest: 120, notes: '43kg' },
      { exerciseId: 'e5', sets: 5, reps: '10', rest: 120, notes: 'Kipping' },
      { exerciseId: 'e9', sets: 1, reps: '30', rest: 0, notes: 'For time' },
    ]
  },
  {
    id: 'w3', name: 'Olímpico Elite', type: 'Olympic', level: 'elite', duration: 90,
    exercises: [
      { exerciseId: 'e4', sets: 5, reps: '3', rest: 180, notes: '85% 1RM' },
      { exerciseId: 'e3', sets: 5, reps: '3', rest: 180, notes: '85% 1RM' },
      { exerciseId: 'e2', sets: 4, reps: '5', rest: 120, notes: '90% 1RM' },
    ]
  }
];

// ─── NUTRITION PLAN TEMPLATES ───────────────────────────────
window.MOCK_NUTRITION_PLANS = [
  {
    id: 'n1', name: 'Plan Pérdida Grasa', goal: 'Fat Loss', totalKcal: 1800,
    macros: { protein: 160, carbs: 160, fat: 55 },
    meals: [
      { name: 'Desayuno', icon: '🌅', kcal: 350, items: ['Avena 60g con leche desnatada', 'Huevo entero + 3 claras', 'Café sin azúcar'] },
      { name: 'Pre-entreno', icon: '⚡', kcal: 200, items: ['Plátano 1 unidad', 'Proteína whey 30g'] },
      { name: 'Comida', icon: '🍽️', kcal: 550, items: ['Pechuga de pollo 200g', 'Arroz basmati 80g', 'Brócoli 200g', 'AOVE 10ml'] },
      { name: 'Merienda', icon: '🍎', kcal: 200, items: ['Queso fresco 0% 150g', 'Almendras 20g'] },
      { name: 'Cena', icon: '🌙', kcal: 450, items: ['Salmón 180g', 'Espárragos 200g', 'Patata dulce 150g'] },
    ]
  },
  {
    id: 'n2', name: 'Plan Volumen Limpio', goal: 'Muscle Gain', totalKcal: 2800,
    macros: { protein: 200, carbs: 320, fat: 80 },
    meals: [
      { name: 'Desayuno', icon: '🌅', kcal: 650, items: ['Avena 100g', '4 huevos enteros', 'Mantequilla de cacahuete 30g', 'Plátano'] },
      { name: 'Media mañana', icon: '🥛', kcal: 400, items: ['Batido MR 80g', 'Leche entera 300ml'] },
      { name: 'Comida', icon: '🍽️', kcal: 800, items: ['Carne picada 200g', 'Pasta 100g', 'Tomate frito casero', 'Pan integral 60g'] },
      { name: 'Pre-entreno', icon: '⚡', kcal: 300, items: ['Whey 40g', 'Plátano', 'Dátiles 30g'] },
      { name: 'Post-entreno', icon: '💪', kcal: 350, items: ['Whey 50g', 'Arroz blanco 80g', 'Miel 20g'] },
      { name: 'Cena', icon: '🌙', kcal: 300, items: ['Salmón 200g', 'Verduras salteadas', 'AOVE 15ml'] },
    ]
  },
];
