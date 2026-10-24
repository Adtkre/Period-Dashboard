/**
 * Cycle Insights — Lifestyle Correlations Page Module
 */

const CorrelationsPage = {
  charts: {},

  async init() {
    await this.loadData();
  },

  async loadData() {
    try {
      this.showLoading();
      const data = await window.api.getCorrelations();
      this.renderCorrelationMatrix(data.correlation_matrix);
      this.renderLifestyleCharts(data);
      this.renderSymptomsAnalysis(data.symptoms_analysis);
      this.renderCausalityNote(data.causality_note);
    } catch (err) {
      console.error("Error loading correlations:", err);
      window.app.showToast("Failed to load lifestyle correlations", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('correlations-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('correlations-loading');
    if (el) el.style.display = 'none';
  },

  renderCorrelationMatrix(corr) {
    const container = document.getElementById('correlation-matrix-grid');
    if (!container) return;

    const cols = corr.columns;
    const matrix = corr.matrix;

    let html = '<table class="data-table" style="text-align: center;"><thead><tr><th style="text-align: left;">Feature</th>';
    cols.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    matrix.forEach((row, rIdx) => {
      html += `<tr><td style="text-align: left; font-weight: 600;">${cols[rIdx]}</td>`;
      row.forEach((val, cIdx) => {
        // Color intensity based on correlation
        let bgColor = '#ffffff';
        let textColor = '#242022';
        if (rIdx === cIdx) {
          bgColor = 'rgba(94, 38, 52, 0.12)';
          textColor = '#5e2634';
        } else if (val > 0) {
          const alpha = Math.min(Math.abs(val) * 2.5, 0.7);
          bgColor = `rgba(201, 123, 132, ${alpha})`;
          if (alpha > 0.45) textColor = '#5e2634';
        } else if (val < 0) {
          const alpha = Math.min(Math.abs(val) * 2.5, 0.7);
          bgColor = `rgba(120, 146, 133, ${alpha})`;
          if (alpha > 0.45) textColor = '#203d30';
        }

        html += `
          <td style="background-color: ${bgColor}; color: ${textColor}; font-weight: 600; padding: 12px 8px;">
            ${val > 0 ? '+' : ''}${val.toFixed(3)}
          </td>
        `;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    container.innerHTML = html;
  },

  renderLifestyleCharts(data) {
    // 1. Stress vs Cycle Length
    const ctxStress = document.getElementById('chart-stress-vs-cycle');
    if (ctxStress && data.stress_comparison) {
      const existing = Chart.getChart(ctxStress);
      if (existing) existing.destroy();
      if (this.charts.stress) {
        try { this.charts.stress.destroy(); } catch (_) {}
      }
      this.charts.stress = new Chart(ctxStress, {
        type: 'line',
        data: {
          labels: data.stress_comparison.map(s => `Stress ${s['Stress Level']}`),
          datasets: [{
            label: 'Mean Cycle Length (days)',
            data: data.stress_comparison.map(s => s.mean),
            borderColor: '#5e2634',
            backgroundColor: 'rgba(201, 123, 132, 0.2)',
            fill: true,
            pointBackgroundColor: '#c97b84',
            pointRadius: 6,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { suggestedMin: 32, suggestedMax: 42, title: { display: true, text: 'Mean Cycle Length (days)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Sleep vs Cycle Length
    const ctxSleep = document.getElementById('chart-sleep-vs-cycle');
    if (ctxSleep && data.sleep_comparison) {
      const existing = Chart.getChart(ctxSleep);
      if (existing) existing.destroy();
      if (this.charts.sleep) {
        try { this.charts.sleep.destroy(); } catch (_) {}
      }
      this.charts.sleep = new Chart(ctxSleep, {
        type: 'bar',
        data: {
          labels: data.sleep_comparison.map(s => s.sleep_bin),
          datasets: [{
            label: 'Mean Cycle Length (days)',
            data: data.sleep_comparison.map(s => s.mean),
            backgroundColor: 'rgba(120, 146, 133, 0.85)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { suggestedMin: 30, suggestedMax: 42 },
            x: { grid: { display: false } }
          }
        }
      });
    }
  },

  renderSymptomsAnalysis(symptoms) {
    const ctx = document.getElementById('chart-symptoms-freq');
    if (ctx && symptoms.frequency) {
      const existing = Chart.getChart(ctx);
      if (existing) existing.destroy();
      if (this.charts.symptoms) {
        try { this.charts.symptoms.destroy(); } catch (_) {}
      }

      const labels = Object.keys(symptoms.frequency);
      const counts = Object.values(symptoms.frequency);

      this.charts.symptoms = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Reported Episodes',
            data: counts,
            backgroundColor: ['#c97b84', '#9b6b78', '#5e2634', '#8ea89d', '#c88d58'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true }
          }
        }
      });
    }
  },

  renderCausalityNote(note) {
    const el = document.getElementById('causality-disclaimer-text');
    if (el) el.textContent = note;
  }
};

window.CorrelationsPage = CorrelationsPage;
