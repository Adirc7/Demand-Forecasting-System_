import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthToken = () => {
    return new Promise((resolve, reject) => {
        // If a user is already loaded, get the token immediately (force refresh if needed)
        if (auth.currentUser) {
            auth.currentUser.getIdToken().then(resolve).catch(reject);
            return;
        }

        // Otherwise, wait for the auth state to settle
        const unsubscribe = auth.onIdTokenChanged(user => {
            unsubscribe();
            if (user) {
                user.getIdToken().then(resolve).catch(reject);
            } else {
                resolve(null);
            }
        });
    });
};

async function apiFetch(path, options = {}) {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");

    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    // If body is plain JSON, set Content-Type. If FormData, let browser set it with boundary.
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// M1 - Products
export const getCategories = () => apiFetch('/api/v1/categories/');
export const createCategory = (d) => apiFetch('/api/v1/categories/', { method: 'POST', body: JSON.stringify(d) });
export const getProducts = (query = '') => apiFetch(`/api/v1/products/${query}`);
export const createProduct = (d) => apiFetch('/api/v1/products/', { method: 'POST', body: JSON.stringify(d) });
export const updateProduct = (sku, d) => apiFetch(`/api/v1/products/${sku}`, { method: 'PUT', body: JSON.stringify(d) });
export const deleteProduct = (sku) => apiFetch(`/api/v1/products/${sku}`, { method: 'DELETE' });
export const migrateSKU = (oldSku, newSku) => apiFetch(`/api/v1/products/${oldSku}/migrate`, { method: 'PUT', body: JSON.stringify({ new_sku: newSku }) });
export const getStockAdvice = (c, lt, p) => apiFetch(`/api/v1/products/stock-advice?category=${c}&lead_time_days=${lt}&unit_price=${p || 0}`);
export const getStockAdviceSku = (sku, c, lt) => apiFetch(`/api/v1/products/stock-advice-sku?sku=${sku}&category=${c}&lead_time_days=${lt}`);

// M2 - Sales
export const getSales = () => apiFetch('/api/v1/sales');
export const recordSale = (saleData) => apiFetch('/api/v1/sales', { method: 'POST', body: JSON.stringify(saleData) });
export const updateSale = (saleId, saleData) => apiFetch(`/api/v1/sales/${saleId}`, { method: 'PUT', body: JSON.stringify(saleData) });
export const deleteSale = (saleId) => apiFetch(`/api/v1/sales/${saleId}`, { method: 'DELETE' });
export const uploadSalesCSV = (formData) => apiFetch('/api/v1/sales/upload', { method: 'POST', body: formData });
export const triggerAdminEmail = (payload) => apiFetch('/api/v1/sales/trigger-admin-email', { method: 'POST', body: JSON.stringify(payload) });

// M3 - Inventory
export const getAlerts = () => apiFetch(`/api/v1/inventory/alerts?t=${Date.now()}`);
export const getInventory = () => apiFetch('/api/v1/inventory/');
export const getInventoryHistory = () => apiFetch('/api/v1/inventory/history');
export const updateInventory = (id, data) => apiFetch(`/api/v1/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adjustInventory = (id, new_stock, reason) => apiFetch(`/api/v1/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify({ new_stock, reason }) });
export const acknowledge_alert = (id) => apiFetch(`/api/v1/inventory/alerts/${id}/acknowledge`, { method: 'POST' });
export const setOverrideThreshold = (id, reorder_point) => apiFetch(`/api/v1/inventory/alerts/${id}/override`, { method: 'POST', body: JSON.stringify({ reorder_point }) });

// M4 - Forecasts
export const getForecasts = () => apiFetch('/api/v1/forecast/categories/');
export const getAiState = () => apiFetch('/api/v1/forecast/ai-state');
export const triggerRetrain = (payload = null) => {
    const config = { method: 'POST' };
    if (payload) config.body = JSON.stringify(payload);
    return apiFetch('/api/v1/forecast/retrain', config);
};

// M5 - Reports
export const getReports = () => apiFetch('/api/v1/reports/');
export const generateReport = (p) => apiFetch('/api/v1/reports/generate', { method: 'POST', body: JSON.stringify(p) });
export const deleteReport = (id) => apiFetch(`/api/v1/reports/${id}`, { method: 'DELETE' });
export const getAccuracy = (granularity = 'monthly', offset = 0) => apiFetch(`/api/v1/reports/accuracy/metrics?granularity=${granularity}&offset=${offset}`);
export const getBusinessMetrics = () => apiFetch('/api/v1/reports/business-metrics');
export const getHistoricalMetrics = (granularity = 'monthly', offset = 0) => apiFetch(`/api/v1/reports/historical?granularity=${granularity}&offset=${offset}`);
export const getHistoricalDetailed = (month) => apiFetch(`/api/v1/reports/historical/detailed?month=${month}`);
export const fetchCustomReport = (payload) => apiFetch('/api/v1/reports/custom-query', { method: 'POST', body: JSON.stringify(payload) });
export const saveCustomChart = (payload) => apiFetch('/api/v1/reports/custom-charts', { method: 'POST', body: JSON.stringify(payload) });
export const getCustomCharts = () => apiFetch('/api/v1/reports/custom-charts');
export const deleteCustomChart = (id) => apiFetch(`/api/v1/reports/custom-charts/${id}`, { method: 'DELETE' });

// Admin - Users
export const getUsers = () => apiFetch('/api/v1/admin/users');
export const createUser = (d) => apiFetch('/api/v1/admin/users', { method: 'POST', body: JSON.stringify(d) });
export const updateUser = (uid, d) => apiFetch(`/api/v1/admin/users/${uid}`, { method: 'PUT', body: JSON.stringify(d) });
export const deactivateUser = (uid) => apiFetch(`/api/v1/admin/users/${uid}`, { method: 'DELETE' });

// Admin - Settings
export const getAdminSettings = () => apiFetch('/api/v1/admin/settings');
export const updateSafetyFactor = (category, safety_factor) => apiFetch('/api/v1/admin/settings/safety-factor', { method: 'PUT', body: JSON.stringify({ category, safety_factor }) });
export const updateSessionTimeout = (minutes) => apiFetch('/api/v1/admin/settings/session-timeout', { method: 'PUT', body: JSON.stringify({ minutes }) });

// Special Data Dumps
export const downloadCSVFile = async ({ date_range = 'current', target_month = '' } = {}) => {
    const token = await getAuthToken();
    let url = `${BASE}/api/v1/reports/export-csv?range=${date_range}`;
    if (target_month) url += `&month=${target_month}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Extract logical filename
    const disposition = response.headers.get('content-disposition');
    let filename = "smart_inventory.csv";
    if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    a.remove();
};
