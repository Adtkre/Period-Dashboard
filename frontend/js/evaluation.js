/**
 * Cycle Insights — Model Evaluation Page Module
 */

const EvaluationPage = {
  charts: {},

  async init() {
    await this.loadData();
  },

  async loadData() {
    try {
      this.showLoading();
      const data = await window.api.getModelEvaluation();
      this.renderSummaryMetrics(data);
      this.renderConfusionMatrix(data);
      this.renderClassificationReport(data.classification_report);
      this.renderFeatureImportance(data.feature_importances);
    } catch (err) {
      console.error("Error loading model evaluation:", err);
      window.app.showToast("Failed to fetch model evaluation metrics", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('eval-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('eval-loading');
    if (el) el.style.display = 'none';
  },

  renderSummaryMetrics(data) {
    const m = data.metrics;
    document.getElementById('eval-acc').textContent = `${(m.accuracy * 100).toFixed(1)}%`;
    document.getElementById('eval-baseline-acc').textContent = `Baseline: ${(m.baseline_accuracy * 100).toFixed(1)}%`;

    document.getElementById('eval-f1').textContent = `${(m.f1_macro * 100).toFixed(1)}%`;
    document.getElementById('eval-f1-weighted').textContent = `Weighted F1: ${(m.f1_weighted * 100).toFixed(1)}%`;

    document.getElementById('eval-prec').textContent = `${(m.precision_macro * 100).toFixed(1)}%`;
    document.getElementById('eval-rec').textContent = `${(m.recall_macro * 100).toFixed(1)}%`;

    if (m.reg_mae) {
      document.getElementById('eval-reg-mae').textContent = `±${m.reg_mae.toFixed(2)}d`;
      document.getElementById('eval-reg-rmse').textContent = `RMSE: ${m.reg_rmse.toFixed(2)}d`;
    }

    document.getElementById('eval-split-info').textContent = 
      `User-Grouped Split: ${data.train_users} Train Users (${data.train_samples} cycles) / ${data.test_users} Test Users (${data.test_samples} cycles)`;
  },

  renderConfusionMatrix(data) {
    const container = document.getElementById('eval-confusion-matrix');
    if (!container) return;

    const labels = data.class_labels;
    const matrix = data.confusion_matrix;

    let html = `
      <div style="overflow-x: auto;">
        <table class="confusion-matrix-table">
          <thead>
            <tr>
              <th style="font-size: 0.78rem; text-align: left; color: var(--text-light); padding: 8px;">True \\ Pred</th>
              ${labels.map(l => `<th style="font-size: 0.78rem; font-weight: 700; color: var(--burgundy-deep); padding: 8px;">${l}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    matrix.forEach((row, rIdx) => {
      html += `<tr><td style="font-size: 0.82rem; font-weight: 700; color: var(--burgundy-deep); padding: 8px;">${labels[rIdx]}</td>`;
      row.forEach((val, cIdx) => {
        const isDiagonal = rIdx === cIdx;
        html += `
          <td class="cm-cell ${isDiagonal ? 'diagonal' : ''}">
            <div class="cm-num">${val}</div>
            <div class="cm-label">${isDiagonal ? 'Correct' : 'Misclassified'}</div>
          </td>
        `;
      });
      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  },

  renderClassificationReport(report) {
    const tbody = document.getElementById('eval-report-tbody');
    if (!tbody || !report) return;

    const rows = [];
    for (const [key, val] of Object.entries(report)) {
      if (typeof val === 'object' && val !== null && 'precision' in val) {
        const isSummary = key.includes('avg');
        rows.push(`
          <tr style="${isSummary ? 'font-weight: 700; background-color: var(--bg-card-subtle);' : ''}">
            <td>${key}</td>
            <td>${(val.precision * 100).toFixed(1)}%</td>
            <td>${(val.recall * 100).toFixed(1)}%</td>
            <td>${(val['f1-score'] * 100).toFixed(1)}%</td>
            <td>${val.support}</td>
          </tr>
        `);
      }
    }

    tbody.innerHTML = rows.join('');
  },

  renderFeatureImportance(importances) {
    const ctx = document.getElementById('chart-feature-importance');
    if (!ctx || !importances) return;

    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();
    if (this.charts.features) {
      try { this.charts.features.destroy(); } catch (_) {}
    }

    // Show top 10 features
    const top = importances.slice(0, 10);
    const labels = top.map(item => item.feature);
    const values = top.map(item => (item.importance * 100).toFixed(1));

    this.charts.features = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Feature Importance (%)',
          data: values,
          backgroundColor: 'rgba(201, 123, 132, 0.85)',
          borderRadius: 6,
          borderColor: '#5e2634',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.x}% Relative Importance`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Gini Importance (%)' }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  }
};

window.EvaluationPage = EvaluationPage;
