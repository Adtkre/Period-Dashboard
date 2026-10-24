/**
 * Cycle Insights — Central API Client
 * Manages all backend communication, error handling, and serialization
 */

const API_CONFIG = {
  // If running locally -> http://127.0.0.1:5000/api
  
  BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5000/api'
    : (window.__API_URL__ || 'https://period-dashboard.onrender.com'),
  
  TIMEOUT_MS: 30000
};

class ApiService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /**
   * Generic fetch wrapper with timeout and standard JSON serialization
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const defaultHeaders = {
        'Accept': 'application/json'
      };

      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = `HTTP error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && (errData.error || errData.message)) {
            errMessage = errData.error || errData.message;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('API request timed out. Please check if the Flask backend is running.');
      }
      throw err;
    }
  }

  // API Endpoints
  async getHealth() {
    return this.request('/health');
  }

  async getOverview() {
    return this.request('/overview');
  }

  async getEdaDistributions(filters = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qStr = query.toString();
    return this.request(`/eda/distributions${qStr ? '?' + qStr : ''}`);
  }

  async getCyclePatterns(userId = 1) {
    return this.request(`/eda/cycle-patterns?user_id=${encodeURIComponent(userId)}`);
  }

  async getCorrelations() {
    return this.request('/eda/correlations');
  }

  async getLifestyle() {
    return this.request('/eda/lifestyle');
  }

  async getModelEvaluation() {
    return this.request('/model/evaluation');
  }

  async getFindings() {
    return this.request('/findings');
  }

  async getDataset(params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    return this.request(`/dataset?${query.toString()}`);
  }

  async predictPeriod(payload) {
    return this.request('/predict', {
      method: 'POST',
      body: payload
    });
  }

  getExportUrl() {
    return `${this.baseUrl}/dataset/export`;
  }
}

// Global API instance
window.api = new ApiService();
