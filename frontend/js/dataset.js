/**
 * Cycle Insights — Dataset Explorer Page Module
 */

const DatasetPage = {
  state: {
    page: 1,
    per_page: 15,
    sort_by: 'Cycle Start Date',
    sort_dir: 'desc',
    search: '',
    diet: '',
    exercise: '',
    symptoms: '',
    stress: ''
  },

  async init() {
    this.bindEvents();
    await this.loadData();
  },

  bindEvents() {
    // Search with debounce
    const searchInput = document.getElementById('ds-search-input');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.state.search = e.target.value.trim();
          this.state.page = 1;
          this.loadData();
        }, 350);
      });
    }

    // Filter selectors
    const bindFilter = (id, stateKey) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.dataset.bound = 'true';
        el.addEventListener('change', (e) => {
          this.state[stateKey] = e.target.value;
          this.state.page = 1;
          this.loadData();
        });
      }
    };

    bindFilter('ds-filter-diet', 'diet');
    bindFilter('ds-filter-exercise', 'exercise');
    bindFilter('ds-filter-symptoms', 'symptoms');
    bindFilter('ds-filter-stress', 'stress');

    // Per-page select
    const perPageSelect = document.getElementById('ds-per-page-select');
    if (perPageSelect && !perPageSelect.dataset.bound) {
      perPageSelect.dataset.bound = 'true';
      perPageSelect.addEventListener('change', (e) => {
        this.state.per_page = parseInt(e.target.value, 10);
        this.state.page = 1;
        this.loadData();
      });
    }

    // Export CSV button
    const exportBtn = document.getElementById('ds-export-btn');
    if (exportBtn && !exportBtn.dataset.bound) {
      exportBtn.dataset.bound = 'true';
      exportBtn.addEventListener('click', () => {
        window.location.href = window.api.getExportUrl();
      });
    }

    // Sortable headers
    document.querySelectorAll('#ds-table th.sortable').forEach(th => {
      if (!th.dataset.bound) {
        th.dataset.bound = 'true';
        th.addEventListener('click', () => {
          const col = th.dataset.col;
          if (this.state.sort_by === col) {
            this.state.sort_dir = this.state.sort_dir === 'asc' ? 'desc' : 'asc';
          } else {
            this.state.sort_by = col;
            this.state.sort_dir = 'asc';
          }
          this.updateSortHeaders();
          this.loadData();
        });
      }
    });
  },

  updateSortHeaders() {
    document.querySelectorAll('#ds-table th.sortable').forEach(th => {
      const col = th.dataset.col;
      const icon = th.querySelector('.sort-icon');
      if (col === this.state.sort_by) {
        th.style.color = 'var(--burgundy-deep)';
        if (icon) icon.textContent = this.state.sort_dir === 'asc' ? '▲' : '▼';
      } else {
        th.style.color = '';
        if (icon) icon.textContent = '↕';
      }
    });
  },

  async loadData() {
    try {
      this.showLoading();
      const res = await window.api.getDataset(this.state);
      this.renderTable(res.records);
      this.renderPagination(res.pagination);
    } catch (err) {
      console.error("Error loading dataset:", err);
      window.app.showToast("Failed to fetch dataset records", "error");
    } finally {
      this.hideLoading();
    }
  },

  showLoading() {
    const el = document.getElementById('ds-loading');
    if (el) el.style.display = 'flex';
  },

  hideLoading() {
    const el = document.getElementById('ds-loading');
    if (el) el.style.display = 'none';
  },

  renderTable(records) {
    const tbody = document.getElementById('ds-table-body');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; padding: 40px; color: var(--text-light);">
            No cycle records found matching your filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr>
        <td><strong>#${r['User ID']}</strong></td>
        <td>${r['Age']}</td>
        <td>${r['BMI']}</td>
        <td>${r['Stress Level']} / 5</td>
        <td><span class="badge badge-muted">${r['Exercise Frequency']}</span></td>
        <td>${r['Sleep Hours']} hrs</td>
        <td>${r['Diet']}</td>
        <td>${r['Cycle Start Date']}</td>
        <td><strong style="color: var(--burgundy-deep);">${r['Cycle Length']}d</strong></td>
        <td>${r['Period Length']}d</td>
        <td>${r['Next Cycle Start Date']}</td>
        <td><span class="badge badge-rose">${r['Symptoms']}</span></td>
      </tr>
    `).join('');
  },

  renderPagination(p) {
    // Info text
    const infoEl = document.getElementById('ds-pagination-info');
    if (infoEl) {
      const start = (p.page - 1) * p.per_page + 1;
      const end = Math.min(p.page * p.per_page, p.total_records);
      infoEl.textContent = `Showing ${p.total_records > 0 ? start : 0} to ${end} of ${p.total_records.toLocaleString()} records`;
    }

    // Controls
    const controls = document.getElementById('ds-pagination-controls');
    if (!controls) return;

    let html = '';

    // Prev Button
    html += `
      <button class="page-btn" ${!p.has_prev ? 'disabled' : ''} onclick="DatasetPage.goToPage(${p.page - 1})">
        ◀
      </button>
    `;

    // Page Numbers (sliding window)
    const total = p.total_pages;
    const current = p.page;
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="page-btn ${i === current ? 'active' : ''}" onclick="DatasetPage.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    // Next Button
    html += `
      <button class="page-btn" ${!p.has_next ? 'disabled' : ''} onclick="DatasetPage.goToPage(${p.page + 1})">
        ▶
      </button>
    `;

    controls.innerHTML = html;
  },

  goToPage(page) {
    this.state.page = page;
    this.loadData();
  }
};

window.DatasetPage = DatasetPage;
