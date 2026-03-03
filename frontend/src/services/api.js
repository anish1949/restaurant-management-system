import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      toast.error("Request timeout. Please try again.");
    } else if (error.response) {
      switch (error.response.status) {
        case 401:
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          toast.error("Session expired. Please login again.");
          break;
        case 403:
          toast.error("You do not have permission");
          break;
        case 404:
          console.error("API endpoint not found:", error.config.url);
          toast.error("API endpoint not found");
          break;
        case 500:
          toast.error("Server error. Please try again.");
          break;
        default:
          toast.error(error.response.data?.message || "An error occurred");
      }
    } else if (error.request) {
      toast.error("Cannot connect to server. Check your connection.");
    }
    return Promise.reject(error);
  },
);

// ==================== AUTH APIs ====================
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  register: (userData) => api.post("/auth/register", userData),
};

// ==================== MENU APIs ====================
export const menuAPI = {
  getItems: (params) => api.get("/menu/items", { params }),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data) => api.post("/menu/items", data),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  toggleAvailability: (id) => api.patch(`/menu/items/${id}/toggle`),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  bulkUpdate: (data) => api.post("/menu/items/bulk", data),
};

// ==================== ORDER APIs ====================
export const orderAPI = {
  getOrders: (params) => api.get("/orders", { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post("/orders", data),
  updateOrderStatus: (id, status) =>
    api.patch(`/orders/${id}/status`, { status }),
  getOrderHistory: (id) => api.get(`/orders/${id}/history`),
};

// ==================== TABLE APIs ====================
export const tableAPI = {
  getTables: (params) => api.get("/tables", { params }),
  getTable: (id) => api.get(`/tables/${id}`),
  createTable: (data) => api.post("/tables", data),
  updateTable: (id, data) => api.put(`/tables/${id}`, data),
  deleteTable: (id) => api.delete(`/tables/${id}`),
  updateTableStatus: (id, status) =>
    api.patch(`/tables/${id}/status`, { status }),
  assignWaiter: (id, waiter_id) =>
    api.patch(`/tables/${id}/assign-waiter`, { waiter_id }),
  getSections: () => api.get("/tables/meta/sections"),
};

// ==================== INVENTORY APIs ====================
export const inventoryAPI = {
  getInventory: (params) => api.get("/inventory", { params }),
  getItem: (id) => api.get(`/inventory/${id}`),
  createItem: (data) => api.post("/inventory", data),
  updateItem: (id, data) => api.put(`/inventory/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/${id}`),
  updateQuantity: (id, data) => api.patch(`/inventory/${id}/quantity`, data),
  getTransactions: (params) =>
    api.get("/inventory/transactions/history", { params }),
  getCategories: () => api.get("/inventory/categories"),
  getCategoriesList: () => api.get("/inventory/categories/list"),
};

// ==================== STAFF APIs ====================
export const staffAPI = {
  // Staff CRUD
  getStaff: () => api.get("/staff"),
  getStaffMember: (id) => api.get(`/staff/${id}`),
  createStaff: (data) => api.post("/staff", data),
  updateStaff: (id, data) => api.put(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),

  // Departments & Roles
  getDepartments: () => api.get("/staff/departments/list"),
  getRoles: () => api.get("/staff/roles/list"),

  // Schedule Management
  getSchedules: () => api.get("/staff/schedules/all"),
  getStaffSchedules: (userId) => api.get(`/staff/schedules/user/${userId}`),
  createSchedule: (data) => api.post("/staff/schedules", data),
  updateSchedule: (id, data) => api.put(`/staff/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/staff/schedules/${id}`),

  // Performance Management
  getPerformanceReviews: () => api.get("/staff/performance/all"),
  getStaffPerformance: (userId) => api.get(`/staff/performance/user/${userId}`),
  createPerformanceReview: (data) => api.post("/staff/performance", data),
  updatePerformanceReview: (id, data) =>
    api.put(`/staff/performance/${id}`, data),
  deletePerformanceReview: (id) => api.delete(`/staff/performance/${id}`),
  getPerformanceSummary: () => api.get("/staff/performance/summary"),

  // Time Tracking
  clockIn: (userId) => api.post("/staff/clock-in", { user_id: userId }),
  clockOut: (trackingId) => api.post("/staff/clock-out", { id: trackingId }),
  getClockedIn: () => api.get("/staff/clocked-in/list"),
};

// ==================== CUSTOMER APIs ====================
export const customerAPI = {
  // Customer CRUD
  getCustomers: (params) => api.get("/customers", { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post("/customers", data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),

  // Loyalty Points
  addLoyaltyPoints: (id, data) =>
    api.post(`/customers/${id}/loyalty/add`, data),
  redeemLoyaltyPoints: (id, data) =>
    api.post(`/customers/${id}/loyalty/redeem`, data),

  // Reservations
  getReservations: (params) =>
    api.get("/customers/reservations/list", { params }),
  createReservation: (data) => api.post("/customers/reservations", data),
  updateReservationStatus: (id, status) =>
    api.patch(`/customers/reservations/${id}/status`, { status }),
};

// ==================== FINANCE APIs ====================
export const financeAPI = {
  getDailySales: (params) => api.get("/finance/daily-sales", { params }),
  getExpenseCategories: () => api.get("/finance/expense-categories"),
  getExpenses: (params) => api.get("/finance/expenses", { params }),
  createExpense: (data) => api.post("/finance/expenses", data),
  updateExpense: (id, data) => api.put(`/finance/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}`),
  approveExpense: (id) => api.patch(`/finance/expenses/${id}/approve`),
  getPaymentMethods: () => api.get("/finance/payment-methods"),
  getProfitLoss: (params) => api.get("/finance/profit-loss", { params }),
  generateDailySummary: (data) =>
    api.post("/finance/generate-daily-summary", data),
};

// ==================== REPORT APIs ====================
export const reportAPI = {
  getDailySales: (params) => api.get("/reports/daily-sales", { params }),
  getMonthlySales: (params) => api.get("/reports/monthly-sales", { params }),
  getInventoryReport: () => api.get("/reports/inventory"),
  getStaffPerformance: (params) =>
    api.get("/reports/staff-performance", { params }),
  getCustomerReport: (params) => api.get("/reports/customers", { params }),
  getFinancialReport: (params) => api.get("/reports/financial", { params }),
};

// ==================== USER APIs ====================
export const userAPI = {
  getUsers: () => api.get("/users"),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  toggleUserStatus: (id) => api.patch(`/users/${id}/toggle-status`),
};

export default api;
