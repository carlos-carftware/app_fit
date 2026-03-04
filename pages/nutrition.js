// ============================================================
// Nutrition Page — Macro Calculator + Meal Plan Builder
// ============================================================

window.NutritionPage = {};

NutritionPage.render = (user) => {
    const content = NutritionPage.mainContent(user);
    Layout.render({
        page: 'nutrition',
        title: 'Planes Nutricionales',
        role: user.role, user,
        content,
        topbarActions: `<button class="btn btn-primary btn-sm" onclick="UI.toast('Nuevo plan nutricional — próximamente','info')">+ Nuevo Plan</button>`
    });
    NutritionPage.bindEvents(user);
};

NutritionPage.mainContent = (user) => `
  ${UI.pageHeader('Nutrición', 'Diseña y asigna planes nutricionales completos')}
  ${UI.tabs(['📊 Resumen', '🍽️ Plan Alimentario', '🔢 Calculadora'], 0, 'nutr-tabs')}
  <div class="mt-4" id="nutr-tab-content">${NutritionPage.summaryContent()}</div>
`;

NutritionPage.summaryContent = () => {
    const planCards = MOCK_NUTRITION_PLANS.map(plan => {
        const totalG = plan.macros.protein + plan.macros.carbs + plan.macros.fat;
        return `
      <div class="card clickable" onclick="UI.toast('Viendo plan: ${plan.name}','info')">
        <div class="card-header">
          <div>
            <div class="card-title">${plan.name}</div>
            <div class="text-sm text-muted mt-1">Objetivo: ${plan.goal}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-accent" style="font-size:22px;font-family:'Rajdhani',sans-serif">${plan.totalKcal}</div>
            <div class="text-xs text-muted">kcal/día</div>
          </div>
        </div>
        <div class="mt-3">
          ${UI.macroBar('Proteína', plan.macros.protein, totalG, 'protein')}
          ${UI.macroBar('Carbohidratos', plan.macros.carbs, totalG, 'carbs')}
          ${UI.macroBar('Grasas', plan.macros.fat, totalG, 'fat')}
        </div>
        <div class="flex gap-2 mt-4">
          <button class="btn btn-primary btn-sm flex-1" onclick="event.stopPropagation();NutritionPage.showPlan('${plan.id}')">🍽️ Ver plan</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();UI.toast('Plan asignado','success')">📤 Asignar</button>
        </div>
      </div>
    `;
    }).join('');

    return `<div class="grid-auto">${planCards}</div>`;
};

NutritionPage.showPlan = (planId) => {
    const plan = MOCK_NUTRITION_PLANS.find(p => p.id === planId);
    if (!plan) return;

    const mealHtml = plan.meals.map((meal, i) => `
    <div class="meal-section">
      <div class="meal-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:22px">${meal.icon}</span>
        <div class="meal-title">${meal.name}</div>
        <div class="meal-kcal">${meal.kcal} kcal</div>
        <span>▼</span>
      </div>
      <div class="meal-body" ${i > 0 ? 'style="display:none"' : ''}>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:6px">
          ${meal.items.map(item => `<li class="flex items-center gap-2"><span>🔹</span><span class="text-secondary">${item}</span></li>`).join('')}
        </ul>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-secondary btn-sm" onclick="UI.toast('Editando comida: ${meal.name}','info')">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="UI.toast('Alimento añadido','success')">+ Añadir alimento</button>
        </div>
      </div>
    </div>
  `).join('');

    const totalG = plan.macros.protein + plan.macros.carbs + plan.macros.fat;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:#0009;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
    <div class="card" style="max-width:600px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
      <div class="card-header">
        <div>
          <div class="card-title">${plan.name}</div>
          <div class="text-sm text-muted">${plan.goal} · ${plan.totalKcal} kcal/día</div>
        </div>
        <button class="btn btn-ghost btn-icon" onclick="this.closest('[style]').remove()">✕</button>
      </div>
      <div class="mb-4">
        ${UI.macroBar('Proteína', plan.macros.protein, totalG, 'protein')}
        ${UI.macroBar('Carbohidratos', plan.macros.carbs, totalG, 'carbs')}
        ${UI.macroBar('Grasas', plan.macros.fat, totalG, 'fat')}
      </div>
      ${mealHtml}
    </div>
  `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
};

NutritionPage.mealPlanContent = () => {
    const plan = MOCK_NUTRITION_PLANS[0];
    const mealHtml = plan.meals.map(meal => `
    <div class="meal-section">
      <div class="meal-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:22px">${meal.icon}</span>
        <div class="meal-title">${meal.name}</div>
        <div class="meal-kcal">${meal.kcal} kcal</div>
        <span>▼</span>
      </div>
      <div class="meal-body">
        <ul style="list-style:none;display:flex;flex-direction:column;gap:6px">
          ${meal.items.map(item => `<li class="flex items-center gap-2"><span>🔹</span><span class="text-secondary">${item}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');

    return `
    <div class="card mb-4">
      <div class="card-header">
        <div><div class="card-title">${plan.name}</div><div class="text-sm text-muted">${plan.totalKcal} kcal/día</div></div>
        <div class="flex gap-2">
          <select class="form-select" style="width:auto" onchange="UI.toast('Plan cambiado','info')">
            ${MOCK_NUTRITION_PLANS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="UI.toast('Plan asignado al estudiante','success')">📤 Asignar</button>
        </div>
      </div>
    </div>
    ${mealHtml}
  `;
};

NutritionPage.calculatorContent = () => `
  <div class="grid-2 gap-4">
    <div class="card">
      <div class="card-header"><div class="card-title">🔢 Calculadora de Macros</div></div>
      <div class="flex flex-col gap-3">
        ${UI.formGroup('Peso (kg)', UI.input({ type: 'number', id: 'calc-weight', value: '70', placeholder: '70' }))}
        ${UI.formGroup('Altura (cm)', UI.input({ type: 'number', id: 'calc-height', value: '175', placeholder: '175' }))}
        ${UI.formGroup('Edad', UI.input({ type: 'number', id: 'calc-age', value: '28' }))}
        ${UI.formGroup('Sexo', UI.select('calc-sex', ['M - Masculino', 'F - Femenino']))}
        ${UI.formGroup('Nivel de actividad', UI.select('calc-activity', [
    { value: '1.2', label: 'Sedentario (oficina/poco ejercicio)' },
    { value: '1.375', label: 'Ligero (1-3 días/semana)' },
    { value: '1.55', label: 'Moderado (3-5 días/semana)' },
    { value: '1.725', label: 'Activo (6-7 días/semana)' },
    { value: '1.9', label: 'Muy activo (dobles sesiones)' },
]))}
        ${UI.formGroup('Objetivo', UI.select('calc-goal', ['Definición (déficit -300kcal)', 'Mantenimiento', 'Volumen (+300kcal)', 'Volumen agresivo (+500kcal)']))}
        <button class="btn btn-primary" id="calc-btn">⚡ Calcular</button>
      </div>
    </div>
    <div class="card" id="calc-result">
      <div class="card-header"><div class="card-title">📊 Resultado</div></div>
      ${UI.emptyState('🔢', 'Introduce tus datos', 'Los macros calculados aparecerán aquí')}
    </div>
  </div>
`;

NutritionPage.bindEvents = (user) => {
    const tabContents = [
        NutritionPage.summaryContent,
        NutritionPage.mealPlanContent,
        NutritionPage.calculatorContent,
    ];

    document.addEventListener('tab-change', function handler(e) {
        if (e.detail.id === 'nutr-tabs') {
            document.getElementById('nutr-tab-content').innerHTML = tabContents[e.detail.idx]();
            if (e.detail.idx === 2) NutritionPage.bindCalc();
        }
    });

    document.getElementById('calc-btn')?.addEventListener('click', NutritionPage.bindCalc.bind(null, 'click'));
};

NutritionPage.bindCalc = (trigger) => {
    const calcBtn = document.getElementById('calc-btn');
    if (calcBtn && trigger !== 'click') {
        calcBtn.addEventListener('click', () => NutritionPage.runCalc());
        return;
    }
    NutritionPage.runCalc();
};

NutritionPage.runCalc = () => {
    const weight = parseFloat(document.getElementById('calc-weight')?.value || 70);
    const height = parseFloat(document.getElementById('calc-height')?.value || 175);
    const age = parseFloat(document.getElementById('calc-age')?.value || 28);

    // Mifflin-St Jeor
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5; // male default
    const tdee = Math.round(bmr * 1.55);
    const goalOffset = [-300, 0, 300, 500];
    const goalIdx = 1; // default maintenance
    const target = tdee + goalOffset[goalIdx];
    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 1);
    const carbs = Math.round((target - protein * 4 - fat * 9) / 4);
    const totalG = protein + carbs + fat;

    const result = document.getElementById('calc-result');
    if (!result) return;

    result.innerHTML = `
    <div class="card-header"><div class="card-title">📊 Resultado</div></div>
    <div class="flex justify-between mb-4">
      <div>
        <div class="text-muted text-xs">TMB (Basal)</div>
        <div class="font-bold text-accent" style="font-size:20px;font-family:'Rajdhani',sans-serif">${Math.round(bmr)} kcal</div>
      </div>
      <div>
        <div class="text-muted text-xs">TDEE (Actividad)</div>
        <div class="font-bold text-accent" style="font-size:20px;font-family:'Rajdhani',sans-serif">${tdee} kcal</div>
      </div>
      <div>
        <div class="text-muted text-xs">Objetivo</div>
        <div class="font-bold" style="font-size:20px;font-family:'Rajdhani',sans-serif;color:var(--neon-green)">${target} kcal</div>
      </div>
    </div>
    ${UI.macroBar('Proteína', protein, totalG, 'protein')}
    ${UI.macroBar('Carbohidratos', carbs, totalG, 'carbs')}
    ${UI.macroBar('Grasas', fat, totalG, 'fat')}
    <button class="btn btn-primary w-full mt-4" onclick="UI.toast('✅ Plan creado con estos macros','success')">Crear plan con estos macros</button>
  `;
};
