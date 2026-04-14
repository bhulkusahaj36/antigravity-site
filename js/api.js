// ============================================================
// API — Centralized fetch client (window.API)
//
// Features:
//   - In-memory response cache with configurable TTL
//   - 8s timeout with AbortController
//   - Automatic retry (1 retry on network error)
//   - Auto-injects X-Admin-Token header from sessionStorage
//   - Emits Bus events on success/error (if Bus is loaded)
//
// Usage:
//   const articles = await API.get('/api/articles', { type: 'prasang', limit: 20 }, 60000);
//   const result   = await API.post('/api/articles', { title: '...', content: '...' });
//   await API.delete('/api/articles', { id: '123' });
//   API.clearCache('/api/articles');
// ============================================================

(function () {
    'use strict';

    // ── Cache ──────────────────────────────────────────────────────────
    const _cache = new Map(); // key → { data, expiresAt }

    function _cacheKey(url, params) {
        if (!params) return url;
        const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        return url + '?' + sorted;
    }

    function _getCached(key) {
        const entry = _cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            _cache.delete(key);
            return null;
        }
        return entry.data;
    }

    function _setCache(key, data, ttlMs) {
        _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    // ── Fetch with timeout + retry ──────────────────────────────────────
    async function _fetchWithTimeout(url, options, timeoutMs = 8000, retries = 1) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timer);
                return response;
            } catch (err) {
                clearTimeout(timer);
                if (attempt === retries) throw err;
                // Brief back-off before retry
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            }
        }
    }

    // ── Build URL with query params ─────────────────────────────────────
    function _buildUrl(endpoint, params) {
        if (!params || Object.keys(params).length === 0) return endpoint;
        const qs = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        return qs ? `${endpoint}?${qs}` : endpoint;
    }

    // ── Auth headers ────────────────────────────────────────────────────
    async function _authHeaders() {
        // 1. Try modern Firebase helper first (defined in admin.js)
        if (typeof window.adminHeaders === 'function') {
            return await window.adminHeaders();
        }
        
        // 2. Fallback to legacy sessionStorage token
        const token = sessionStorage.getItem('hk_admin_token');
        return token ? { 'X-Admin-Token': token } : {};
    }

    // ── Emit Bus event safely ────────────────────────────────────────────
    function _emit(event, data) {
        if (window.Bus) window.Bus.emit(event, data);
    }

    // ── Public API ──────────────────────────────────────────────────────
    const API = {

        /**
         * GET request with optional in-memory cache.
         * @param {string} endpoint  - e.g. '/api/articles'
         * @param {Object} [params]  - Query params as key/value object
         * @param {number} [cacheMs] - Cache TTL in ms. 0 = no cache (default)
         * @returns {Promise<any>}
         */
        async get(endpoint, params = {}, cacheMs = 0) {
            const key = _cacheKey(endpoint, params);

            // Return cached response if still fresh
            if (cacheMs > 0) {
                const cached = _getCached(key);
                if (cached !== null) return cached;
            }

            const url = _buildUrl(endpoint, params);
            const response = await _fetchWithTimeout(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                const msg = `API.get ${url} → ${response.status} ${response.statusText}`;
                _emit('api:error', { endpoint, status: response.status });
                throw new Error(msg);
            }

            const data = await response.json();

            if (cacheMs > 0) _setCache(key, data, cacheMs);
            _emit('api:get', { endpoint, params });
            return data;
        },

        /**
         * POST request (authenticated).
         * @param {string} endpoint
         * @param {Object} body
         * @returns {Promise<any>}
         */
        async post(endpoint, body) {
            const response = await _fetchWithTimeout(endpoint, {
                method: 'POST',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(await _authHeaders())
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const msg = `API.post ${endpoint} → ${response.status} ${response.statusText}`;
                _emit('api:error', { endpoint, status: response.status, method: 'POST' });
                throw new Error(msg);
            }

            // Invalidate any GET caches for this endpoint
            API.clearCache(endpoint);

            const data = response.status === 204 ? null : await response.json();
            _emit('api:saved', { endpoint, data });
            return data;
        },

        /**
         * DELETE request (authenticated).
         * @param {string} endpoint
         * @param {Object} [params] - Query params (e.g. { id: '123' })
         * @returns {Promise<void>}
         */
        async delete(endpoint, params = {}) {
            const url = _buildUrl(endpoint, params);
            const response = await _fetchWithTimeout(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    ...(await _authHeaders())
                }
            });

            if (!response.ok && response.status !== 204) {
                const msg = `API.delete ${url} → ${response.status} ${response.statusText}`;
                _emit('api:error', { endpoint, status: response.status, method: 'DELETE' });
                throw new Error(msg);
            }

            API.clearCache(endpoint);
            _emit('api:deleted', { endpoint, params });
        },

        /**
         * PATCH request (authenticated).
         * @param {string} endpoint
         * @param {Object} body - e.g. { ids: [...], updates: { status: 'published' } }
         * @returns {Promise<any>}
         */
        async patch(endpoint, body) {
            const response = await _fetchWithTimeout(endpoint, {
                method: 'PATCH',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(await _authHeaders())
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const msg = `API.patch ${endpoint} → ${response.status} ${response.statusText}`;
                _emit('api:error', { endpoint, status: response.status, method: 'PATCH' });
                throw new Error(msg);
            }

            API.clearCache(endpoint);
            const data = await response.json();
            _emit('api:updated', { endpoint, data });
            return data;
        },

        /**
         * Invalidate cache entries for a given endpoint prefix.
         * @param {string} endpointPrefix
         */
        clearCache(endpointPrefix) {
            for (const key of _cache.keys()) {
                if (key.startsWith(endpointPrefix)) _cache.delete(key);
            }
        },

        /**
         * Clear the entire cache.
         */
        clearAllCache() {
            _cache.clear();
        },

        /**
         * Return current cache size (for debugging).
         */
        get cacheSize() {
            return _cache.size;
        }
    };

    // Expose globally
    window.API = API;

})();
