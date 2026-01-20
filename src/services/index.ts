/**
 * Unified Storage Service
 *
 * DUAL-MODE STORAGE:
 * - localStorage (default): Uses browser localStorage for development
 * - api: Uses PHP/MySQL backend via API calls for production
 *
 * Mode is controlled by VITE_STORAGE_MODE environment variable.
 * Set to 'api' for production deployment with MySQL backend.
 *
 * All services provide both synchronous methods (localStorage only) and
 * async methods (dual-mode) via service.async.* for API compatibility.
 */

// Re-export all services from storage
export {
  memberService,
  leadService,
  membershipPlanService,
  subscriptionService,
  slotService,
  slotSubscriptionService,
  invoiceService,
  paymentService,
  trialBookingService,
  settingsService,
  authService,
  backupService,
  attendanceService,
  initializeStorage,
  seedDemoData,
  resetAndSeedData,
  syncFromApi,
  isApiSynced,
  clearApiSync,
} from './storage';

// Re-export storage mode utilities for consumers
export { isApiMode, getStorageMode, setStorageMode } from './api';

// Export Supabase services separately for future use or manual migration
export * as supabase from './supabaseStorage';
