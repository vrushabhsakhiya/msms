const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const withQuery = (path, params) => `${path}${toQueryString(params)}`;

export const API_ENDPOINTS = Object.freeze({
  auth: Object.freeze({
    branding: "auth/branding/",
    auditLogs: "auth/audit-logs/",
    login: "auth/login/",
    verifyLoginOtp: "auth/verify-login-otp/",
    forgotPassword: "auth/forgot-password/",
    resetPassword: "auth/reset-password/",
    tokenRefresh: "auth/token/refresh/",
    registerShop: "auth/register-shop/",
    register: "auth/register/",

    users: "auth/users/",
    userUpdate: (id) => `auth/users/${id}/update/`,
    userDelete: (id) => `auth/users/${id}/delete/`,

    roles: "auth/roles/",
    role: (id) => `auth/roles/${id}/`,
  }),

  medicines: Object.freeze({
    list: (params = {}) => withQuery("medicines/", params),
    add: "medicines/add/",
    update: (id) => `medicines/${id}/update/`,
    delete: (id) => `medicines/${id}/delete/`,
    search: (params = {}) => withQuery("medicines/search/", params),
    exportCsv: "medicines/export/",
    importCsv: "medicines/import/",
  }),

  suppliers: Object.freeze({
    list: "suppliers/",
    add: "suppliers/add/",
    update: (id) => `suppliers/update/${id}/`,
    delete: (id) => `suppliers/delete/${id}/`,
  }),

  customers: Object.freeze({
    list: "customers/",
    update: (id) => `customers/update/${id}/`,
    search: (params = {}) => withQuery("customers/search/", params),
  }),

  purchases: Object.freeze({
    list: "purchases/",
    nextCodes: "purchases/next-codes/",
    add: "purchases/add/",
    importCsv: "purchases/import-csv/",
    update: (id) => `purchases/update/${id}/`,
    delete: (id) => `purchases/delete/${id}/`,
    gstr2: (params = {}) => withQuery("purchases/gstr2/", params),
  }),

  sales: Object.freeze({
    list: (params = {}) => withQuery("sales/", params),
    add: "sales/add/",
    importCsv: "sales/import-csv/",
    delete: (id) => `sales/delete/${id}/`,
    sendEInvoice: (id) => `sales/send-e-invoice/${id}/`,
    performance: (params = {}) => withQuery("sales/performance/", params),
    profitLoss: (params = {}) => withQuery("sales/profit-loss/", params),
    gstr1: (params = {}) => withQuery("sales/gstr1/", params),
    report: (params = {}) => withQuery("sales/report/", params),
  }),

  inventory: Object.freeze({
    summary: "inventory/summary/",
    dashboard: (params = {}) => withQuery("inventory/dashboard/", params),
    notifications: "inventory/notifications/",
    movements: (params = {}) => withQuery("inventory/movements/", params),
    adjust: "inventory/adjust/",
    batches: (medicineId) => `inventory/batches/${medicineId}/`,
    expiryAlert: "inventory/expiry-alert/",
    ledger: "inventory/ledger/",

    alerts: Object.freeze({
      lowStock: "inventory/alerts/low-stock/",
      expiry: "inventory/alerts/expiry/",
    }),
  }),
});

