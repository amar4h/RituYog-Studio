/**
 * Yoga Studio Management - API Client
 *
 * HTTP client for communicating with the PHP backend API.
 * Replaces localStorage operations for database persistence.
 */

// ============================================
// CONFIGURATION
// ============================================

// API base URL - configured via environment variable or defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'yoga_studio_api_key_change_me_in_production';

// Storage mode - 'api' for MySQL backend, 'localStorage' for offline/development
export type StorageMode = 'api' | 'localStorage';

// Default to localStorage for backward compatibility; switch to 'api' for production
let currentStorageMode: StorageMode = (import.meta.env.VITE_STORAGE_MODE as StorageMode) || 'localStorage';

/**
 * Get current storage mode
 */
export function getStorageMode(): StorageMode {
  return currentStorageMode;
}

/**
 * Set storage mode
 */
export function setStorageMode(mode: StorageMode): void {
  currentStorageMode = mode;
}

/**
 * Check if using API mode
 */
export function isApiMode(): boolean {
  return currentStorageMode === 'api';
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_KEY = 'yoga_studio_api_session';

interface ApiSession {
  sessionToken: string;
  expiresAt: string;
}

function getSession(): ApiSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;

    const session: ApiSession = JSON.parse(data);

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function saveSession(session: ApiSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// Member session management (separate from admin)
const MEMBER_SESSION_KEY = 'yoga_studio_member_session';

export function getMemberSession(): ApiSession | null {
  try {
    const data = localStorage.getItem(MEMBER_SESSION_KEY);
    if (!data) return null;
    const session: ApiSession = JSON.parse(data);
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(MEMBER_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveMemberSession(session: ApiSession): void {
  localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session));
}

export function clearMemberSession(): void {
  localStorage.removeItem(MEMBER_SESSION_KEY);
}

// ============================================
// HTTP CLIENT
// ============================================

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean; // For public endpoints that don't require API key
}

/**
 * Make an API request
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, skipAuth = false } = options;

  // Build URL with query parameters
  const url = new URL(`${API_BASE_URL}/${endpoint}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key unless this is a public endpoint
  if (!skipAuth) {
    headers['X-API-Key'] = API_KEY;
  }

  // Add session token if authenticated
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.sessionToken}`;
  }

  // Make request
  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse response
  const data: ApiResponse<T> = await response.json();

  // Handle errors
  if (!response.ok) {
    throw new Error(data?.error || `API error: ${response.status}`);
  }

  // Return data or full response (handle null responses)
  if (data === null || data === undefined) {
    return null as T;
  }
  return (data.data ?? data) as T;
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

/**
 * Create a CRUD client for an endpoint
 */
export function createCrudClient<T extends { id: string }>(endpoint: string) {
  return {
    getAll: () => apiRequest<T[]>(`${endpoint}`, { method: 'GET' }),

    getById: (id: string) => apiRequest<T | null>(`${endpoint}`, {
      method: 'GET',
      params: { action: 'getById', id }
    }),

    create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => apiRequest<T>(`${endpoint}`, {
      method: 'POST',
      params: { action: 'create' },
      body: data
    }),

    update: (id: string, data: Partial<T>) => apiRequest<T | null>(`${endpoint}`, {
      method: 'PUT',
      params: { action: 'update', id },
      body: { ...data, id }
    }),

    delete: (id: string) => apiRequest<{ deleted: boolean }>(`${endpoint}`, {
      method: 'DELETE',
      params: { action: 'delete', id }
    }),
  };
}

// ============================================
// SPECIALIZED API CLIENTS
// ============================================

export const membersApi = {
  ...createCrudClient('members'),

  getByEmail: (email: string) => apiRequest<unknown | null>('members', {
    params: { action: 'getByEmail', email }
  }),

  getByPhone: (phone: string) => apiRequest<unknown | null>('members', {
    params: { action: 'getByPhone', phone }
  }),

  getByStatus: (status: string) => apiRequest<unknown[]>('members', {
    params: { action: 'getByStatus', status }
  }),

  getBySlot: (slotId: string) => apiRequest<unknown[]>('members', {
    params: { action: 'getBySlot', slotId }
  }),

  getActive: () => apiRequest<unknown[]>('members', {
    params: { action: 'getActive' }
  }),

  search: (query: string) => apiRequest<unknown[]>('members', {
    params: { action: 'search', query }
  }),

  incrementClasses: (id: string) => apiRequest<unknown>('members', {
    method: 'POST',
    params: { action: 'incrementClasses', id }
  }),

  decrementClasses: (id: string) => apiRequest<unknown>('members', {
    method: 'POST',
    params: { action: 'decrementClasses', id }
  }),
};

export const leadsApi = {
  ...createCrudClient('leads'),

  getByEmail: (email: string) => apiRequest<unknown | null>('leads', {
    params: { action: 'getByEmail', email }
  }),

  getByPhone: (phone: string) => apiRequest<unknown | null>('leads', {
    params: { action: 'getByPhone', phone }
  }),

  getByStatus: (status: string) => apiRequest<unknown[]>('leads', {
    params: { action: 'getByStatus', status }
  }),

  getPending: () => apiRequest<unknown[]>('leads', {
    params: { action: 'getPending' }
  }),

  getForFollowUp: () => apiRequest<unknown[]>('leads', {
    params: { action: 'getForFollowUp' }
  }),

  search: (query: string) => apiRequest<unknown[]>('leads', {
    params: { action: 'search', query }
  }),

  markConverted: (id: string, memberId: string) => apiRequest<unknown>('leads', {
    method: 'POST',
    params: { action: 'markConverted', id },
    body: { memberId }
  }),

  // Public endpoints (no auth required - token-based)
  getByToken: (token: string) => apiRequest<unknown | null>('leads', {
    params: { action: 'getByToken', token },
    skipAuth: true, // Public endpoint
  }),

  completeRegistration: (token: string, data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    preferredSlotId?: string;
    medicalConditions: unknown[];
    consentRecords: unknown[];
  }) => apiRequest<unknown | null>('leads', {
    method: 'POST',
    params: { action: 'completeRegistration' },
    body: { token, ...data },
    skipAuth: true, // Public endpoint
  }),
};

export const subscriptionsApi = {
  ...createCrudClient('subscriptions'),

  getByMember: (memberId: string) => apiRequest<unknown[]>('subscriptions', {
    params: { action: 'getByMember', memberId }
  }),

  getActiveMember: (memberId: string) => apiRequest<unknown | null>('subscriptions', {
    params: { action: 'getActiveMember', memberId }
  }),

  getExpiringSoon: (days = 7) => apiRequest<unknown[]>('subscriptions', {
    params: { action: 'getExpiringSoon', days }
  }),

  getActiveForSlotOnDate: (slotId: string, date: string) => apiRequest<unknown[]>('subscriptions', {
    params: { action: 'getActiveForSlotOnDate', slotId, date }
  }),

  checkSlotCapacity: (slotId: string, startDate: string, endDate: string) => apiRequest<{
    available: boolean;
    isExceptionOnly: boolean;
    currentBookings: number;
    normalCapacity: number;
    totalCapacity: number;
    message: string;
  }>('subscriptions', {
    params: { action: 'checkSlotCapacity', slotId, startDate, endDate }
  }),

  hasActiveSubscription: (memberId: string) => apiRequest<{ hasActive: boolean }>('subscriptions', {
    params: { action: 'hasActiveSubscription', memberId }
  }),

  hasPendingRenewal: (memberId: string) => apiRequest<{ hasPendingRenewal: boolean }>('subscriptions', {
    params: { action: 'hasPendingRenewal', memberId }
  }),
};

export const slotsApi = {
  ...createCrudClient('slots'),

  getActive: () => apiRequest<unknown[]>('slots', {
    params: { action: 'getActive' }
  }),

  getAvailability: (slotId: string, date: string) => apiRequest<unknown>('slots', {
    params: { action: 'getAvailability', slotId, date }
  }),

  getAllAvailability: (date: string) => apiRequest<unknown[]>('slots', {
    params: { action: 'getAllAvailability', date }
  }),

  hasCapacity: (slotId: string, date: string, useException = false) => apiRequest<{ hasCapacity: boolean }>('slots', {
    params: { action: 'hasCapacity', slotId, date, useException }
  }),

  updateCapacity: (id: string, capacity: number, exceptionCapacity: number) => apiRequest<unknown>('slots', {
    method: 'POST',
    params: { action: 'updateCapacity', id },
    body: { capacity, exceptionCapacity }
  }),
};

export const plansApi = {
  ...createCrudClient('plans'),

  getActive: () => apiRequest<unknown[]>('plans', {
    params: { action: 'getActive' }
  }),

  getByType: (type: string) => apiRequest<unknown[]>('plans', {
    params: { action: 'getByType', type }
  }),
};

export const invoicesApi = {
  ...createCrudClient('invoices'),

  getByMember: (memberId: string) => apiRequest<unknown[]>('invoices', {
    params: { action: 'getByMember', memberId }
  }),

  getPending: () => apiRequest<unknown[]>('invoices', {
    params: { action: 'getPending' }
  }),

  getOverdue: () => apiRequest<unknown[]>('invoices', {
    params: { action: 'getOverdue' }
  }),

  getBySubscription: (subscriptionId: string) => apiRequest<unknown | null>('invoices', {
    params: { action: 'getBySubscription', subscriptionId }
  }),

  generateNumber: () => apiRequest<{ invoiceNumber: string }>('invoices', {
    params: { action: 'generateNumber' }
  }),

  updatePaymentStatus: (id: string, data: {
    amountPaid: number;
    status: string;
    paymentMethod?: string;
    paymentReference?: string;
    paidDate?: string;
  }) => apiRequest<unknown>('invoices', {
    method: 'POST',
    params: { action: 'updatePaymentStatus', id },
    body: data
  }),
};

export const paymentsApi = {
  ...createCrudClient('payments'),

  getByInvoice: (invoiceId: string) => apiRequest<unknown[]>('payments', {
    params: { action: 'getByInvoice', invoiceId }
  }),

  getByMember: (memberId: string) => apiRequest<unknown[]>('payments', {
    params: { action: 'getByMember', memberId }
  }),

  generateReceiptNumber: () => apiRequest<{ receiptNumber: string }>('payments', {
    params: { action: 'generateReceiptNumber' }
  }),

  getRevenue: (startDate: string, endDate: string) => apiRequest<{ revenue: number }>('payments', {
    params: { action: 'getRevenue', startDate, endDate }
  }),

  getStats: (startDate?: string, endDate?: string) => apiRequest<unknown>('payments', {
    params: { action: 'getStats', startDate, endDate }
  }),
};

export const attendanceApi = {
  ...createCrudClient('attendance'),

  getBySlotAndDate: (slotId: string, date: string) => apiRequest<unknown[]>('attendance', {
    params: { action: 'getBySlotAndDate', slotId, date }
  }),

  getByMember: (memberId: string) => apiRequest<unknown[]>('attendance', {
    params: { action: 'getByMember', memberId }
  }),

  getByMemberAndSlot: (memberId: string, slotId: string) => apiRequest<unknown[]>('attendance', {
    params: { action: 'getByMemberAndSlot', memberId, slotId }
  }),

  getExisting: (memberId: string, slotId: string, date: string) => apiRequest<unknown | null>('attendance', {
    params: { action: 'getExisting', memberId, slotId, date }
  }),

  markAttendance: (data: {
    memberId: string;
    slotId: string;
    date: string;
    status: 'present' | 'absent';
    notes?: string;
  }) => apiRequest<unknown>('attendance', {
    method: 'POST',
    params: { action: 'markAttendance' },
    body: data
  }),

  isMarkedPresent: (memberId: string, slotId: string, date: string) => apiRequest<{ isPresent: boolean }>('attendance', {
    params: { action: 'isMarkedPresent', memberId, slotId, date }
  }),

  getMemberSummary: (memberId: string, slotId: string, periodStart: string, periodEnd: string) => apiRequest<{
    presentDays: number;
    totalWorkingDays: number;
  }>('attendance', {
    params: { action: 'getMemberSummary', memberId, slotId, periodStart, periodEnd }
  }),

  getSlotAttendanceWithMembers: (slotId: string, date: string, periodStart: string, periodEnd: string) => apiRequest<unknown[]>('attendance', {
    params: { action: 'getSlotAttendanceWithMembers', slotId, date, periodStart, periodEnd }
  }),

  exportCSV: (slotId: string, date?: string) => apiRequest<unknown[]>('attendance', {
    params: { action: 'exportCSV', slotId, date }
  }),
};

export const trialsApi = {
  ...createCrudClient('trials'),

  getByLead: (leadId: string) => apiRequest<unknown[]>('trials', {
    params: { action: 'getByLead', leadId }
  }),

  getBySlotAndDate: (slotId: string, date: string) => apiRequest<unknown[]>('trials', {
    params: { action: 'getBySlotAndDate', slotId, date }
  }),

  getUpcoming: () => apiRequest<unknown[]>('trials', {
    params: { action: 'getUpcoming' }
  }),

  getToday: () => apiRequest<unknown[]>('trials', {
    params: { action: 'getToday' }
  }),

  book: (data: {
    leadId: string;
    slotId: string;
    date: string;
    isException?: boolean;
  }) => apiRequest<unknown>('trials', {
    method: 'POST',
    params: { action: 'book' },
    body: data
  }),

  markAttended: (id: string) => apiRequest<unknown>('trials', {
    method: 'POST',
    params: { action: 'markAttended', id }
  }),

  markNoShow: (id: string) => apiRequest<unknown>('trials', {
    method: 'POST',
    params: { action: 'markNoShow', id }
  }),

  cancel: (id: string) => apiRequest<unknown>('trials', {
    method: 'POST',
    params: { action: 'cancel', id }
  }),
};

export const settingsApi = {
  get: () => apiRequest<unknown | null>('settings', {
    params: { action: 'get' }
  }),

  save: (data: unknown) => apiRequest<unknown>('settings', {
    method: 'POST',
    params: { action: 'save' },
    body: data
  }),

  updatePartial: (data: Partial<unknown>) => apiRequest<unknown>('settings', {
    method: 'POST',
    params: { action: 'updatePartial' },
    body: data
  }),

  getInvoiceTemplate: () => apiRequest<unknown | null>('settings', {
    params: { action: 'getInvoiceTemplate' }
  }),

  updateInvoiceTemplate: (template: unknown) => apiRequest<unknown>('settings', {
    method: 'POST',
    params: { action: 'updateInvoiceTemplate' },
    body: template
  }),

  getHolidays: () => apiRequest<unknown[]>('settings', {
    params: { action: 'getHolidays' }
  }),

  updateHolidays: (holidays: unknown[]) => apiRequest<unknown[]>('settings', {
    method: 'POST',
    params: { action: 'updateHolidays' },
    body: holidays
  }),
};

export const authApi = {
  login: async (password: string) => {
    const result = await apiRequest<{
      authenticated: boolean;
      sessionToken: string;
      expiresAt: string;
    }>('auth', {
      method: 'POST',
      params: { action: 'login' },
      body: { password }
    });

    if (result.authenticated) {
      saveSession({
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt
      });
    }

    return result.authenticated;
  },

  logout: async () => {
    const session = getSession();
    if (session) {
      await apiRequest('auth', {
        method: 'POST',
        params: { action: 'logout' },
        body: { sessionToken: session.sessionToken }
      });
    }
    clearSession();
  },

  check: async () => {
    const session = getSession();
    if (!session) return false;

    const result = await apiRequest<{ authenticated: boolean }>('auth', {
      params: { action: 'check', sessionToken: session.sessionToken }
    });

    if (!result.authenticated) {
      clearSession();
    }

    return result.authenticated;
  },

  isAuthenticated: () => {
    return getSession() !== null;
  },

  changePassword: (currentPassword: string, newPassword: string) => apiRequest<{ success: boolean }>('auth', {
    method: 'POST',
    params: { action: 'changePassword' },
    body: { currentPassword, newPassword }
  }),
};

export const healthApi = {
  check: () => apiRequest<{
    status: string;
    timestamp: string;
    version: string;
  }>('health', {
    params: { action: 'check' }
  }),

  detailed: () => apiRequest<unknown>('health', {
    params: { action: 'detailed' }
  }),

  info: () => apiRequest<unknown>('health', {
    params: { action: 'info' }
  }),

  stats: () => apiRequest<unknown>('health', {
    params: { action: 'stats' }
  }),
};

// ============================================
// INVENTORY & EXPENSE API CLIENTS
// ============================================

export const productsApi = {
  ...createCrudClient('products'),

  getBySku: (sku: string) => apiRequest<unknown | null>('products', {
    params: { action: 'getBySku', sku }
  }),

  getByCategory: (category: string) => apiRequest<unknown[]>('products', {
    params: { action: 'getByCategory', category }
  }),

  getActive: () => apiRequest<unknown[]>('products', {
    params: { action: 'getActive' }
  }),

  getLowStock: () => apiRequest<unknown[]>('products', {
    params: { action: 'getLowStock' }
  }),

  search: (query: string) => apiRequest<unknown[]>('products', {
    params: { action: 'search', query }
  }),

  getStockValue: () => apiRequest<{ totalValue: number; totalCost: number; totalItems: number }>('products', {
    params: { action: 'getStockValue' }
  }),

  updateStock: (id: string, quantity: number, notes?: string) => apiRequest<unknown>('products', {
    method: 'POST',
    params: { action: 'updateStock', id },
    body: { quantity, notes }
  }),
};

export const inventoryApi = {
  ...createCrudClient('inventory'),

  getByProduct: (productId: string) => apiRequest<unknown[]>('inventory', {
    params: { action: 'getByProduct', productId }
  }),

  getByType: (type: string) => apiRequest<unknown[]>('inventory', {
    params: { action: 'getByType', type }
  }),

  getByDateRange: (startDate: string, endDate: string) => apiRequest<unknown[]>('inventory', {
    params: { action: 'getByDateRange', startDate, endDate }
  }),

  getCostOfGoodsSold: (startDate: string, endDate: string) => apiRequest<{ cogs: number; count: number }>('inventory', {
    params: { action: 'getCostOfGoodsSold', startDate, endDate }
  }),

  getByExpense: (expenseId: string) => apiRequest<unknown[]>('inventory', {
    params: { action: 'getByExpense', expenseId }
  }),

  getByInvoice: (invoiceId: string) => apiRequest<unknown[]>('inventory', {
    params: { action: 'getByInvoice', invoiceId }
  }),

  getProductSummary: (productId: string) => apiRequest<unknown>('inventory', {
    params: { action: 'getProductSummary', productId }
  }),
};

export const expensesApi = {
  ...createCrudClient('expenses'),

  getByCategory: (category: string) => apiRequest<unknown[]>('expenses', {
    params: { action: 'getByCategory', category }
  }),

  getByVendor: (vendorName: string) => apiRequest<unknown[]>('expenses', {
    params: { action: 'getByVendor', vendorName }
  }),

  getByDateRange: (startDate: string, endDate: string) => apiRequest<unknown[]>('expenses', {
    params: { action: 'getByDateRange', startDate, endDate }
  }),

  getPending: () => apiRequest<unknown[]>('expenses', {
    params: { action: 'getPending' }
  }),

  getRecurring: () => apiRequest<unknown[]>('expenses', {
    params: { action: 'getRecurring' }
  }),

  generateNumber: () => apiRequest<{ expenseNumber: string }>('expenses', {
    params: { action: 'generateNumber' }
  }),

  getTotalByCategory: (startDate: string, endDate: string) => apiRequest<Record<string, number>>('expenses', {
    params: { action: 'getTotalByCategory', startDate, endDate }
  }),

  getMonthlyTotals: (months?: number) => apiRequest<{ month: string; total: number }[]>('expenses', {
    params: { action: 'getMonthlyTotals', months }
  }),

  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod?: string;
    paymentReference?: string;
  }) => apiRequest<unknown>('expenses', {
    method: 'POST',
    params: { action: 'recordPayment', id },
    body: data
  }),

  getTotal: (startDate: string, endDate: string) => apiRequest<{ total: number }>('expenses', {
    params: { action: 'getTotal', startDate, endDate }
  }),
};

// ============================================
// SESSION PLANNING API CLIENTS
// ============================================

export const asanasApi = {
  ...createCrudClient('asanas'),

  getActive: () => apiRequest<unknown[]>('asanas', {
    params: { action: 'getActive' }
  }),

  getByType: (type: string) => apiRequest<unknown[]>('asanas', {
    params: { action: 'getByType', type }
  }),

  getByDifficulty: (difficulty: string) => apiRequest<unknown[]>('asanas', {
    params: { action: 'getByDifficulty', difficulty }
  }),

  getByBodyArea: (bodyArea: string) => apiRequest<unknown[]>('asanas', {
    params: { action: 'getByBodyArea', bodyArea }
  }),

  search: (query: string) => apiRequest<unknown[]>('asanas', {
    params: { action: 'search', query }
  }),
};

export const sessionPlansApi = {
  ...createCrudClient('session-plans'),

  getActive: () => apiRequest<unknown[]>('session-plans', {
    params: { action: 'getActive' }
  }),

  getByLevel: (level: string) => apiRequest<unknown[]>('session-plans', {
    params: { action: 'getByLevel', level }
  }),

  search: (query: string) => apiRequest<unknown[]>('session-plans', {
    params: { action: 'search', query }
  }),

  clone: (id: string, newName?: string) => apiRequest<unknown>('session-plans', {
    method: 'POST',
    params: { action: 'clone', id },
    body: { newName }
  }),

  updateUsageStats: (id: string) => apiRequest<unknown>('session-plans', {
    method: 'POST',
    params: { action: 'updateUsageStats', id }
  }),
};

export const sessionPlanAllocationsApi = {
  ...createCrudClient('session-plan-allocations'),

  getBySlotAndDate: (slotId: string, date: string) => apiRequest<unknown | null>('session-plan-allocations', {
    params: { action: 'getBySlotAndDate', slotId, date }
  }),

  getByDate: (date: string) => apiRequest<unknown[]>('session-plan-allocations', {
    params: { action: 'getByDate', date }
  }),

  getByDateRange: (startDate: string, endDate: string) => apiRequest<unknown[]>('session-plan-allocations', {
    params: { action: 'getByDateRange', startDate, endDate }
  }),

  allocate: (planId: string, slotId: string, date: string, allocatedBy?: string) => apiRequest<unknown>('session-plan-allocations', {
    method: 'POST',
    params: { action: 'allocate' },
    body: { planId, slotId, date, allocatedBy }
  }),

  allocateToAllSlots: (planId: string, date: string, allocatedBy?: string) => apiRequest<unknown[]>('session-plan-allocations', {
    method: 'POST',
    params: { action: 'allocateToAllSlots' },
    body: { planId, date, allocatedBy }
  }),

  cancel: (id: string) => apiRequest<unknown>('session-plan-allocations', {
    method: 'POST',
    params: { action: 'cancel', id }
  }),

  markExecuted: (id: string, executionId: string) => apiRequest<unknown>('session-plan-allocations', {
    method: 'POST',
    params: { action: 'markExecuted', id },
    body: { executionId }
  }),
};

export const sessionExecutionsApi = {
  ...createCrudClient('session-executions'),

  getBySlotAndDate: (slotId: string, date: string) => apiRequest<unknown | null>('session-executions', {
    params: { action: 'getBySlotAndDate', slotId, date }
  }),

  getByDateRange: (startDate: string, endDate: string) => apiRequest<unknown[]>('session-executions', {
    params: { action: 'getByDateRange', startDate, endDate }
  }),

  getBySlot: (slotId: string) => apiRequest<unknown[]>('session-executions', {
    params: { action: 'getBySlot', slotId }
  }),

  getByPlan: (planId: string) => apiRequest<unknown[]>('session-executions', {
    params: { action: 'getByPlan', planId }
  }),

  getByMember: (memberId: string) => apiRequest<unknown[]>('session-executions', {
    params: { action: 'getByMember', memberId }
  }),

  record: (data: {
    planId: string;
    slotId: string;
    date: string;
    instructor?: string;
    notes?: string;
  }) => apiRequest<unknown>('session-executions', {
    method: 'POST',
    params: { action: 'record' },
    body: data
  }),

  getRecent: (limit?: number) => apiRequest<unknown[]>('session-executions', {
    params: { action: 'getRecent', limit }
  }),
};

// ============================================
// MEMBER AUTH API
// ============================================

export const memberAuthApi = {
  login: async (phone: string, password: string) => apiRequest<{
    authenticated: boolean;
    memberId: string;
    sessionToken: string;
    expiresAt: string;
  }>('member-auth', {
    method: 'POST',
    params: { action: 'login' },
    body: { phone, password },
    skipAuth: true,
  }),

  setPassword: async (memberId: string, passwordHash: string) => apiRequest<{ success: boolean }>('member-auth', {
    method: 'POST',
    params: { action: 'setPassword' },
    body: { memberId, passwordHash },
  }),

  clearPassword: async (memberId: string) => apiRequest<{ success: boolean }>('member-auth', {
    method: 'POST',
    params: { action: 'clearPassword' },
    body: { memberId },
  }),

  activate: async (phone: string, password: string) => apiRequest<{ success: boolean; message: string }>('member-auth', {
    method: 'POST',
    params: { action: 'activate' },
    body: { phone, password },
    skipAuth: true,
  }),

  changePassword: async (memberId: string, currentPassword: string, newPassword: string) => apiRequest<{ success: boolean }>('member-auth', {
    method: 'POST',
    params: { action: 'changePassword' },
    body: { memberId, currentPassword, newPassword },
    skipAuth: true,
  }),

  logout: async (sessionToken: string) => apiRequest<{ success: boolean }>('member-auth', {
    method: 'POST',
    params: { action: 'logout' },
    body: { sessionToken },
    skipAuth: true,
  }),
};
