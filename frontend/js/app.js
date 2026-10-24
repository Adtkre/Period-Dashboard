/**
 * Cycle Insights — Main Application Orchestrator & Router
 */

class App {
  constructor() {
    this.currentPage = 'overview';
    this.pageModules = {
      'overview': window.OverviewPage,
      'eda': window.EdaPage,
      'patterns': window.PatternsPage,
      'correlations': window.CorrelationsPage,
      'prediction': window.PredictionPage,
      'evaluation': window.EvaluationPage,
      'dataset': window.DatasetPage
    };
  }

  init() {
    if (window.Chart) {
      Chart.defaults.font.family = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
    }
    this.bindNavigation();
    this.bindSidebarToggle();
    this.checkBackendHealth();
    this.navigateTo('overview');
  }

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        if (page) {
          this.navigateTo(page);
          // Close mobile sidebar if open
          document.querySelector('.sidebar')?.classList.remove('mobile-open');
        }
      });
    });
  }

  bindSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.toggle('mobile-open');
      });
    }
  }

  async checkBackendHealth() {
    const statusDot = document.getElementById('status-dot');
    const healthPill = document.getElementById('health-pill-text');

    try {
      const res = await window.api.getHealth();
      if (res && res.status === 'healthy') {
        if (statusDot) {
          statusDot.className = 'status-dot';
          statusDot.title = 'Backend API connected';
        }
        if (healthPill) healthPill.textContent = 'API Connected';
      }
    } catch (err) {
      if (statusDot) {
        statusDot.className = 'status-dot error';
        statusDot.title = 'Backend offline or unreachable';
      }
      if (healthPill) healthPill.textContent = 'API Offline';
      this.showToast("Cannot reach Flask backend on http://127.0.0.1:5000. Please launch backend/app.py", "error");
    }
  }

  navigateTo(pageId) {
    this.currentPage = pageId;

    // Update Nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-page') === pageId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Views visibility
    document.querySelectorAll('.page-view').forEach(view => {
      if (view.id === `view-${pageId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Update Breadcrumb
    const breadcrumb = document.getElementById('topbar-page-name');
    if (breadcrumb) {
      const titles = {
        'overview': 'Overview & Executive KPI',
        'eda': 'Exploratory Data Analysis',
        'patterns': 'Cycle Patterns & Individual Trajectory',
        'correlations': 'Lifestyle & Clinical Correlations',
        'prediction': 'Next Period Prediction',
        'evaluation': 'Random Forest Model Evaluation',
        'dataset': 'Dataset Explorer'
      };
      breadcrumb.textContent = titles[pageId] || pageId;
    }

    // Initialize or refresh target page module
    const module = this.pageModules[pageId];
    if (module && typeof module.init === 'function') {
      module.init();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let iconSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    let iconClass = 'badge badge-muted';
    if (type === 'success') {
      iconSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      iconClass = 'badge badge-sage';
    } else if (type === 'error') {
      iconSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      iconClass = 'badge badge-rose';
    }

    toast.innerHTML = `
      <span class="${iconClass}" style="width: 22px; height: 22px; justify-content: center; border-radius: 50%; padding: 0; display: inline-flex; align-items: center;">${iconSvg}</span>
      <div style="flex: 1; font-size: 0.86rem; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

// Global App instance
window.app = new App();

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
