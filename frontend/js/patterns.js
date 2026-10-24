/**
 * Cycle Insights — Cycle Patterns Page Module
 */

const PatternsPage = {
  charts: {},
  selectedUserId: 1,

  async init() {
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    const userSelect = document.getElementById('pattern-user-select');
    if (userSelect && !userSelect.dataset.bound) {
      userSelect.dataset.bound = 'true';
      userSelect.addEventListener('change', (e) => {
        this.selectedUserId = e.target.value;
        this.loadData();
      });
    }
  },

  async loadData() {
    try {
      this.showLoading();
      const data = await window.api.getCyclePatterns(this.selectedUserId);
      this.renderVariability(data.user_variability_summary);
      this.renderTierComparison(data.cycle_tier_comparison);
      this.populateUserSelect(data.available_users, data.selected_user.user_id);
      this.renderUserHistory(data.selected_user);
    } catch (err) {
      console.error("Error loading patterns:", err);
      window.app.showToast("Failed to load cycle patterns data", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('patterns-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('patterns-loading');
    if (el) el.style.display = 'none';
  },

  populateUserSelect(users, activeId) {
    const select = document.getElementById('pattern-user-select');
    if (!select || select.children.length > 1) return;

    users.forEach(uid => {
      const opt = document.createElement('option');
      opt.value = uid;
      opt.textContent = `User #${uid}`;
      if (uid == activeId) opt.selected = true;
      select.appendChild(opt);
    });
  },

  renderVariability(summary) {
    // 1. Variability KPI cards
    document.getElementById('pattern-avg-std').textContent = `±${summary.avg_user_std}d`;
    document.getElementById('pattern-median-std').textContent = `±${summary.median_user_std}d`;
    document.getElementById('pattern-range-std').textContent = `${summary.min_user_std}d – ${summary.max_user_std}d`;

    // 2. Variability Distribution Chart
    const ctx = document.getElementById('chart-user-variability');
    if (ctx && summary.variability_distribution) {
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
      if (this.charts.variability) {
        try { this.charts.variability.destroy(); } catch (_) {}
      }
      this.charts.variability = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: summary.variability_distribution.labels,
          datasets: [{
            label: 'Users Count',
            data: summary.variability_distribution.values,
            backgroundColor: 'rgba(201, 123, 132, 0.8)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, title: { display: true, text: 'Number of Cohorts' } }
          }
        }
      });
    }
  },

  renderTierComparison(tiers) {
    const container = document.getElementById('pattern-tiers-table');
    if (!container) return;

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Cycle Tier</th>
            <th>Cycles Count</th>
            <th>Mean Cycle (days)</th>
            <th>Mean Period (days)</th>
            <th>Mean Stress (1-5)</th>
            <th>Mean Sleep (hrs)</th>
            <th>Mean BMI</th>
          </tr>
        </thead>
        <tbody>
          ${tiers.map(t => `
            <tr>
              <td><strong>${t['Cycle Category']}</strong></td>
              <td><span class="badge badge-muted">${t.count} cycles</span></td>
              <td><strong style="color: var(--burgundy-deep);">${t.mean_cycle}d</strong></td>
              <td>${t.mean_period}d</td>
              <td>${t.mean_stress} / 5</td>
              <td>${t.mean_sleep} hrs</td>
              <td>${t.mean_bmi}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  renderUserHistory(user) {
    document.getElementById('selected-user-headline').textContent = `Longitudinal History for User #${user.user_id}`;
    document.getElementById('selected-user-meta').textContent = 
      `${user.total_cycles} recorded cycles • Personal Average: ${user.personal_mean} days • Personal SD: ±${user.personal_std} days`;

    // User Timeline Chart
    const ctx = document.getElementById('chart-user-timeline');
    if (ctx) {
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
      if (this.charts.userTimeline) {
        try { this.charts.userTimeline.destroy(); } catch (_) {}
      }

      const labels = user.history.map(h => `Cycle #${h.cycle_number}`);
      const lengths = user.history.map(h => h.cycle_length);
      const personalMeans = user.history.map(() => user.personal_mean);

      this.charts.userTimeline = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              type: 'line',
              label: 'Personal Average',
              data: personalMeans,
              borderColor: '#c97b84',
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false
            },
            {
              type: 'bar',
              label: 'Cycle Length (days)',
              data: lengths,
              backgroundColor: lengths.map(l => l >= user.personal_mean ? 'rgba(94, 38, 52, 0.85)' : 'rgba(120, 146, 133, 0.85)'),
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                afterBody: (context) => {
                  const idx = context[0].dataIndex;
                  const item = user.history[idx];
                  return [
                    `Start Date: ${item.start_date}`,
                    `Deviation: ${item.diff_from_personal_mean > 0 ? '+' : ''}${item.diff_from_personal_mean}d`,
                    `Stress: ${item.stress_level} / 5`,
                    `Sleep: ${item.sleep_hours} hrs`,
                    `Symptom: ${item.symptom}`
                  ];
                }
              }
            }
          },
          scales: {
            y: {
              suggestedMin: 20,
              suggestedMax: 50,
              title: { display: true, text: 'Cycle Length (days)' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Render User History Table
    const tableBody = document.getElementById('user-history-table-body');
    if (tableBody) {
      tableBody.innerHTML = user.history.map(h => `
        <tr>
          <td><strong>Cycle #${h.cycle_number}</strong></td>
          <td>${h.start_date}</td>
          <td><strong style="color: var(--burgundy-deep);">${h.cycle_length} days</strong></td>
          <td>${h.period_length} days</td>
          <td>
            <span class="badge ${h.diff_from_personal_mean > 0 ? 'badge-amber' : 'badge-sage'}">
              ${h.diff_from_personal_mean > 0 ? '+' : ''}${h.diff_from_personal_mean}d
            </span>
          </td>
          <td>${h.stress_level} / 5</td>
          <td>${h.sleep_hours} hrs</td>
          <td><span class="badge badge-rose">${h.symptom}</span></td>
        </tr>
      `).join('');
    }
  }
};

window.PatternsPage = PatternsPage;
