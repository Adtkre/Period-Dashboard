/**
 * Cycle Insights — Period Prediction Page Module
 */

const PredictionPage = {
  async init() {
    this.setDefaultDates();
    this.bindEvents();
  },

  setDefaultDates() {
    const dateInput = document.getElementById('pred-last-date');
    if (dateInput && !dateInput.value) {
      // Default to 14 days ago so prediction lands in the near future
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14);
      dateInput.value = pastDate.toISOString().split('T')[0];
    }
  },

  bindEvents() {
    const form = document.getElementById('prediction-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePredict();
      });
    }

    const resetBtn = document.getElementById('pred-reset-btn');
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        form.reset();
        this.setDefaultDates();
        document.getElementById('prediction-results-container').style.display = 'none';
      });
    }
  },

  validateForm() {
    const lastDate = document.getElementById('pred-last-date')?.value;
    const age = parseFloat(document.getElementById('pred-age')?.value);
    const bmi = parseFloat(document.getElementById('pred-bmi')?.value);
    const stress = parseInt(document.getElementById('pred-stress')?.value, 10);
    const sleep = parseFloat(document.getElementById('pred-sleep')?.value);
    const exercise = document.getElementById('pred-exercise')?.value;
    const diet = document.getElementById('pred-diet')?.value;
    const periodLength = parseInt(document.getElementById('pred-period-length')?.value, 10);
    const symptoms = document.getElementById('pred-symptoms')?.value;

    if (!lastDate) {
      window.app.showToast("Please select your most recent cycle start date.", "error");
      return null;
    }
    if (isNaN(age) || age < 12 || age > 65) {
      window.app.showToast("Age must be between 12 and 65.", "error");
      return null;
    }
    if (isNaN(bmi) || bmi < 12 || bmi > 55) {
      window.app.showToast("Please enter a valid BMI between 12 and 55.", "error");
      return null;
    }
    if (isNaN(stress) || stress < 1 || stress > 5) {
      window.app.showToast("Stress level must be between 1 and 5.", "error");
      return null;
    }
    if (isNaN(sleep) || sleep < 3 || sleep > 14) {
      window.app.showToast("Sleep hours must be between 3 and 14.", "error");
      return null;
    }
    if (!exercise || !diet || !symptoms) {
      window.app.showToast("Please select lifestyle and symptom options.", "error");
      return null;
    }

    const prevLength = parseFloat(document.getElementById('pred-prev-length')?.value) || 37;
    const histMean = parseFloat(document.getElementById('pred-hist-mean')?.value) || prevLength;
    const histStd = parseFloat(document.getElementById('pred-hist-std')?.value) || 3.0;
    const priorCount = parseInt(document.getElementById('pred-prior-count')?.value, 10) || 3;

    return {
      last_start_date: lastDate,
      age: age,
      bmi: bmi,
      stress_level: stress,
      sleep_hours: sleep,
      exercise_frequency: exercise,
      diet: diet,
      period_length: periodLength || 5,
      symptoms: symptoms,
      prev_cycle_length: prevLength,
      hist_mean_cycle_length: histMean,
      hist_std_cycle_length: histStd,
      prior_cycle_count: priorCount
    };
  },

  async handlePredict() {
    const payload = this.validateForm();
    if (!payload) return;

    const submitBtn = document.getElementById('pred-submit-btn');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Predict';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Analyzing...';
      }

      const result = await window.api.predictPeriod(payload);
      if (result.status === 'success') {
        this.renderResults(result);
        window.app.showToast("Prediction generated successfully", "success");
      } else {
        window.app.showToast(result.error || "Prediction failed", "error");
      }
    } catch (err) {
      console.error("Prediction error:", err);
      window.app.showToast(err.message || "Failed to call prediction API", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  },

  renderResults(res) {
    const container = document.getElementById('prediction-results-container');
    if (!container) return;

    container.style.display = 'block';

    // Format dates nicely
    const nextDateObj = new Date(res.predicted_next_date + 'T00:00:00');
    const formattedDate = nextDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Populate Highlight Box
    document.getElementById('res-predicted-date').textContent = formattedDate;
    document.getElementById('res-category-badge').textContent = res.predicted_category;
    document.getElementById('res-window-range').textContent = 
      `Estimated window: ${res.uncertainty_window.start} to ${res.uncertainty_window.end} (${res.uncertainty_window.days_range})`;
    
    // Countdown
    const days = res.days_remaining;
    const countdownEl = document.getElementById('res-countdown-value');
    const countdownLabel = document.getElementById('res-countdown-label');
    if (days >= 0) {
      countdownEl.textContent = `${days}d`;
      countdownLabel.textContent = days === 1 ? 'Day Remaining' : 'Days Remaining';
    } else {
      countdownEl.textContent = `+${Math.abs(days)}d`;
      countdownLabel.textContent = 'Days Past Due';
    }

    // Cycle duration estimates
    document.getElementById('res-predicted-length').textContent = `${res.predicted_cycle_length_days} days`;
    document.getElementById('res-weighted-length').textContent = `${res.weighted_cycle_length_days} days`;
    const regEl = document.getElementById('res-regressor-length');
    if (regEl) {
      regEl.textContent = res.regressor_cycle_length_days ? `${res.regressor_cycle_length_days} days` : 'N/A';
    }

    // Probability Bars
    this.renderProbabilities(res.class_probabilities, res.predicted_category);

    // Render Calendar
    this.renderCalendar(res);

    // Biological Phases
    const phases = res.biological_phases;
    document.getElementById('phase-menstrual').textContent = `${phases.period_length} days`;
    document.getElementById('phase-follicular').textContent = `~${phases.follicular_phase_est_days} days`;
    document.getElementById('phase-ovulation').textContent = phases.estimated_ovulation_date;
    document.getElementById('phase-fertile').textContent = `${phases.fertile_window.start} to ${phases.fertile_window.end}`;
    document.getElementById('phase-luteal').textContent = `~${phases.luteal_phase_est_days} days`;

    // Factor Explanations
    const expList = document.getElementById('res-explanations-list');
    if (expList) {
      expList.innerHTML = res.explanations.map(exp => `<li>${exp}</li>`).join('');
    }

    // Scroll smoothly to results
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  renderProbabilities(probs, winningClass) {
    const list = document.getElementById('res-probability-list');
    if (!list) return;

    list.innerHTML = Object.entries(probs).map(([cat, prob]) => {
      const pct = (prob * 100).toFixed(1);
      const isWinner = cat === winningClass;
      return `
        <div class="prob-row">
          <div class="prob-meta">
            <span>${cat} ${isWinner ? '(Predicted)' : ''}</span>
            <span>${pct}%</span>
          </div>
          <div class="prob-bar-track">
            <div class="prob-bar-fill" style="width: ${pct}%; ${isWinner ? 'background: linear-gradient(90deg, #c97b84, #5e2634);' : 'background: #9b6b78; opacity: 0.55;'}"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCalendar(res) {
    const calendarContainer = document.getElementById('res-calendar-grid');
    const monthTitle = document.getElementById('res-calendar-month-title');
    if (!calendarContainer) return;

    // We render the month containing the predicted period date
    const targetDate = new Date(res.predicted_next_date + 'T00:00:00');
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    if (monthTitle) {
      monthTitle.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Prepare highlight sets
    const lastStartDate = res.last_start_date;
    const periodDays = res.biological_phases.period_length;
    const predictedNextDate = res.predicted_next_date;
    const windowStart = res.uncertainty_window.start;
    const windowEnd = res.uncertainty_window.end;
    const ovDate = res.biological_phases.estimated_ovulation_date;
    const fertStart = res.biological_phases.fertile_window.start;
    const fertEnd = res.biological_phases.fertile_window.end;
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to format date string YYYY-MM-DD
    const formatDate = (y, m, d) => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    let cellsHtml = '';

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cellsHtml += '<div class="cal-day empty"></div>';
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      let classes = ['cal-day'];

      if (dateStr === todayStr) classes.push('today');

      // Check period past
      if (dateStr >= lastStartDate) {
        const lastStartObj = new Date(lastStartDate + 'T00:00:00');
        const currObj = new Date(dateStr + 'T00:00:00');
        const diffDays = Math.round((currObj - lastStartObj) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < periodDays) {
          classes.push('period-past');
        }
      }

      // Fertile window & Ovulation
      if (dateStr >= fertStart && dateStr <= fertEnd) {
        if (dateStr === ovDate) {
          classes.push('ovulation-day');
        } else {
          classes.push('fertile-window');
        }
      }

      // Predicted period & window
      if (dateStr >= windowStart && dateStr <= windowEnd) {
        if (dateStr === predictedNextDate) {
          classes.push('predicted-period');
        } else {
          classes.push('predicted-window');
        }
      }

      cellsHtml += `<div class="${classes.join(' ')}" title="${dateStr}">${d}</div>`;
    }

    calendarContainer.innerHTML = cellsHtml;
  }
};

window.PredictionPage = PredictionPage;
