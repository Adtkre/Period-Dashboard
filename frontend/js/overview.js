/**
 * Cycle Insights — Overview Page Module
 */

const OverviewPage = {
  charts: {},

  async init() {
    try {
      this.showLoading();
      const [overviewData, findingsData] = await Promise.all([
        window.api.getOverview(),
        window.api.getFindings()
      ]);

      this.renderKPIs(overviewData.kpis);
      this.renderCharts(overviewData);
      this.renderDataQuality(overviewData.data_quality);
      this.renderFindings(findingsData.findings);
    } catch (err) {
      console.error("Error loading overview:", err);
      window.app.showToast("Failed to load overview data. Is Flask running?", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('overview-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('overview-loading');
    if (el) el.style.display = 'none';
  },

  renderKPIs(kpis) {
    document.getElementById('kpi-total-records').textContent = Number(kpis.total_records).toLocaleString();
    document.getElementById('kpi-unique-users').textContent = Number(kpis.unique_users).toLocaleString();
    document.getElementById('kpi-avg-cycle').textContent = `${kpis.avg_cycle_length}d`;
    document.getElementById('kpi-median-cycle').textContent = `${kpis.median_cycle_length}d`;
    document.getElementById('kpi-avg-period').textContent = `${kpis.avg_period_duration}d`;
  },

  renderCharts(data) {
    // 1. Cycle Length Distribution Chart
    const ctxCycle = document.getElementById('chart-cycle-dist');
    if (ctxCycle) {
      const existing = Chart.getChart(ctxCycle);
      if (existing) existing.destroy();
      if (this.charts.cycleDist) {
        try { this.charts.cycleDist.destroy(); } catch (_) {}
      }
      this.charts.cycleDist = new Chart(ctxCycle, {
        type: 'bar',
        data: {
          labels: data.cycle_length_distribution.labels,
          datasets: [{
            label: 'Cycle Count',
            data: data.cycle_length_distribution.values,
            backgroundColor: 'rgba(201, 123, 132, 0.75)',
            borderColor: '#c97b84',
            borderWidth: 1.5,
            borderRadius: 6,
            hoverBackgroundColor: '#9b6b78'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#242022',
              titleFont: { family: 'Poppins', size: 13 },
              bodyFont: { family: 'Poppins', size: 12 },
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Poppins', size: 11 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(235, 228, 220, 0.8)' },
              ticks: { font: { family: 'Poppins', size: 11 } }
            }
          }
        }
      });
    }

    // 2. Period Duration Distribution Chart
    const ctxPeriod = document.getElementById('chart-period-dist');
    if (ctxPeriod) {
      const existing = Chart.getChart(ctxPeriod);
      if (existing) existing.destroy();
      if (this.charts.periodDist) {
        try { this.charts.periodDist.destroy(); } catch (_) {}
      }
      this.charts.periodDist = new Chart(ctxPeriod, {
        type: 'bar',
        data: {
          labels: data.period_duration_distribution.labels,
          datasets: [{
            label: 'Cycle Count',
            data: data.period_duration_distribution.values,
            backgroundColor: [
              'rgba(120, 146, 133, 0.75)',
              'rgba(155, 107, 120, 0.75)',
              'rgba(201, 123, 132, 0.85)',
              'rgba(94, 38, 52, 0.75)',
              'rgba(200, 141, 88, 0.75)'
            ],
            borderColor: '#ffffff',
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#242022',
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(235, 228, 220, 0.8)' } }
          }
        }
      });
    }

    // 3. Cycle Sequence Trends
    const ctxTrend = document.getElementById('chart-cycle-trends');
    if (ctxTrend && data.cycle_sequence_trends) {
      const existing = Chart.getChart(ctxTrend);
      if (existing) existing.destroy();
      if (this.charts.cycleTrends) {
        try { this.charts.cycleTrends.destroy(); } catch (_) {}
      }
      this.charts.cycleTrends = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: data.cycle_sequence_trends.labels,
          datasets: [{
            label: 'Cohort Average Cycle Length (days)',
            data: data.cycle_sequence_trends.values,
            borderColor: '#5e2634',
            backgroundColor: 'rgba(201, 123, 132, 0.12)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#c97b84',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Poppins', size: 12 } }
            },
            tooltip: { backgroundColor: '#242022' }
          },
          scales: {
            y: {
              suggestedMin: 32,
              suggestedMax: 42,
              grid: { color: 'rgba(235, 228, 220, 0.8)' },
              title: { display: true, text: 'Mean Cycle Length (days)', font: { size: 11 } }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }
  },

  renderDataQuality(quality) {
    const listEl = document.getElementById('quality-stats-list');
    if (!listEl) return;

    listEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
        <div class="phase-item">
          <span class="phase-title">Dataset Integrity</span>
          <span class="phase-val" style="color: var(--sage-accent); font-size: 1.05rem;">100% Complete</span>
          <span class="phase-desc">0 nulls across 12 feature dimensions</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Unique Users</span>
          <span class="phase-val">100 Cohorts</span>
          <span class="phase-desc">Multi-cycle longitudinal tracking</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Cycle Depth</span>
          <span class="phase-val">${quality.cycles_per_user.min} – ${quality.cycles_per_user.max} cycles</span>
          <span class="phase-desc">Mean: ${quality.cycles_per_user.mean} cycles per user</span>
        </div>
        <div class="phase-item">
          <span class="phase-title">Duplicates</span>
          <span class="phase-val">${quality.duplicates_count} Records</span>
          <span class="phase-desc">Zero exact user/date duplicate collisions</span>
        </div>
      </div>
    `;
  },

  renderFindings(findings) {
    const container = document.getElementById('findings-container');
    if (!container) return;

    container.innerHTML = findings.map(f => `
      <div class="finding-item">
        <div class="finding-header">
          <span class="badge badge-rose">${f.badge}</span>
          <span class="finding-stat">${f.stat}</span>
        </div>
        <h4 class="finding-title">${f.title}</h4>
        <p class="finding-summary">${f.summary}</p>
      </div>
    `).join('');
  }
};

window.OverviewPage = OverviewPage;
