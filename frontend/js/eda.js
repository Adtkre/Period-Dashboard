/**
 * Cycle Insights — Exploratory Data Analysis Page Module
 */

const EdaPage = {
  charts: {},
  currentFilters: {},

  async init() {
    this.bindFilterEvents();
    await this.loadData();
  },

  bindFilterEvents() {
    const filterIds = ['eda-filter-age', 'eda-filter-bmi', 'eda-filter-stress', 'eda-filter-exercise', 'eda-filter-diet'];
    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.dataset.bound = 'true';
        el.addEventListener('change', () => this.handleFilterChange());
      }
    });

    const resetBtn = document.getElementById('eda-filter-reset');
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        filterIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        this.handleFilterChange();
      });
    }
  },

  handleFilterChange() {
    this.currentFilters = {
      age_group: document.getElementById('eda-filter-age')?.value || '',
      bmi_category: document.getElementById('eda-filter-bmi')?.value || '',
      stress_level: document.getElementById('eda-filter-stress')?.value || '',
      exercise_frequency: document.getElementById('eda-filter-exercise')?.value || '',
      diet: document.getElementById('eda-filter-diet')?.value || ''
    };
    this.loadData();
  },

  async loadData() {
    try {
      this.showLoading();
      const data = await window.api.getEdaDistributions(this.currentFilters);
      if (data.error) {
        window.app.showToast(data.error, "info");
        return;
      }
      this.renderSummary(data);
      this.renderCharts(data);
      this.renderInterpretations(data.interpretations);
      console.error("Error loading EDA data:", err);
      window.app.showToast(err.message || "Failed to fetch EDA data", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('eda-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('eda-loading');
    if (el) el.style.display = 'none';
  },

  renderSummary(data) {
    const b = data.cycle_box;
    document.getElementById('eda-record-count-badge').textContent = `${data.record_count} cycles analyzed`;
    
    const boxContainer = document.getElementById('eda-box-stats');
    if (boxContainer && b) {
      boxContainer.innerHTML = `
        <div class="phase-item">
          <span class="phase-title">Minimum</span>
          <span class="phase-val">${b.min}d</span>
          <span class="phase-desc">Shortest recorded</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">1st Quartile (Q1)</span>
          <span class="phase-val">${b.q1}d</span>
          <span class="phase-desc">25th percentile</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Median</span>
          <span class="phase-val" style="color: var(--burgundy-deep); font-weight: 700;">${b.median}d</span>
          <span class="phase-desc">50th percentile (IQR: ${Math.round((b.q3 - b.q1)*10)/10}d)</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">3rd Quartile (Q3)</span>
          <span class="phase-val">${b.q3}d</span>
          <span class="phase-desc">75th percentile</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Maximum</span>
          <span class="phase-val">${b.max}d</span>
          <span class="phase-desc">Longest recorded</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Mean ± SD</span>
          <span class="phase-val">${b.mean} ± ${b.std}d</span>
          <span class="phase-desc">Dispersion indicator</span>
        </div>
      `;
    }
  },

  renderCharts(data) {
    const createBarChart = (canvasId, chartKey, labels, values, color, labelText = 'Mean Cycle Length (days)') => {
      const ctx = document.getElementById(canvasId);
      if (!ctx) return;
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
      if (this.charts[chartKey]) {
        try { this.charts[chartKey].destroy(); } catch (_) {}
      }

      const safeLabels = (labels && labels.length > 0) ? labels : ['No Data'];
      const safeValues = (values && values.length > 0) ? values : [0];

      this.charts[chartKey] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: safeLabels,
          datasets: [{
            label: labelText,
            data: safeValues,
            backgroundColor: color,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#242022' }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 11 } } },
            y: {
              beginAtZero: false,
              suggestedMin: 25,
              suggestedMax: 45,
              grid: { color: 'rgba(235, 228, 220, 0.8)' },
              ticks: { font: { family: 'Poppins', size: 11 } }
            }
          }
        }
      });
    };

    // 1. Age Distribution
    const ctxAge = document.getElementById('chart-eda-age');
    if (ctxAge && data.age_distribution) {
      const existing = Chart.getChart(ctxAge);
      if (existing) existing.destroy();
      if (this.charts.age) {
        try { this.charts.age.destroy(); } catch (_) {}
      }
      this.charts.age = new Chart(ctxAge, {
        type: 'bar',
        data: {
          labels: data.age_distribution.labels || [],
          datasets: [{
            label: 'Cycles',
            data: data.age_distribution.values || [],
            backgroundColor: 'rgba(155, 107, 120, 0.75)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
        }
      });
    }

    // 2. BMI Distribution
    const ctxBmi = document.getElementById('chart-eda-bmi');
    if (ctxBmi && data.bmi_distribution) {
      const existing = Chart.getChart(ctxBmi);
      if (existing) existing.destroy();
      if (this.charts.bmi) {
        try { this.charts.bmi.destroy(); } catch (_) {}
      }
      const bmiLabels = (data.bmi_distribution.labels && data.bmi_distribution.labels.length > 0)
        ? data.bmi_distribution.labels : ['No Data'];
      const bmiValues = (data.bmi_distribution.values && data.bmi_distribution.values.length > 0)
        ? data.bmi_distribution.values : [0];

      this.charts.bmi = new Chart(ctxBmi, {
        type: 'doughnut',
        data: {
          labels: bmiLabels,
          datasets: [{
            data: bmiValues,
            backgroundColor: ['#8ea89d', '#c97b84', '#9b6b78', '#5e2634'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 11 } } }
          }
        }
      });
    }

    // Categorical Mean Cycle Comparisons
    if (data.by_age_group) {
      createBarChart('chart-eda-by-age', 'byAge', data.by_age_group.categories, data.by_age_group.means, 'rgba(201, 123, 132, 0.8)');
    }
    if (data.by_bmi_group) {
      createBarChart('chart-eda-by-bmi', 'byBmi', data.by_bmi_group.categories, data.by_bmi_group.means, 'rgba(120, 146, 133, 0.8)');
    }
    if (data.by_exercise) {
      createBarChart('chart-eda-by-exercise', 'byExercise', data.by_exercise.categories, data.by_exercise.means, 'rgba(155, 107, 120, 0.8)');
    }
    if (data.by_diet) {
      createBarChart('chart-eda-by-diet', 'byDiet', data.by_diet.categories, data.by_diet.means, 'rgba(200, 141, 88, 0.8)');
    }
    if (data.by_stress) {
      createBarChart('chart-eda-by-stress', 'byStress', (data.by_stress.categories || []).map(c => `Stress ${c}`), data.by_stress.means, 'rgba(94, 38, 52, 0.8)');
    }
    if (data.by_sleep) {
      createBarChart('chart-eda-by-sleep', 'bySleep', data.by_sleep.categories, data.by_sleep.means, 'rgba(110, 125, 140, 0.8)');
    }
  },

  renderInterpretations(interpretations) {
    const list = document.getElementById('eda-interpretations-list');
    if (!list) return;

    list.innerHTML = interpretations.map(text => `
      <li style="margin-bottom: 8px; font-size: 0.88rem; color: var(--text-muted); line-height: 1.5;">
        ${text}
      </li>
    `).join('');
  }
};

window.EdaPage = EdaPage;
