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
}

/**
 * Make an API request
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

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
    'X-API-Key': API_KEY,
  };

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
