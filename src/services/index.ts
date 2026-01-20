/**
 * Unified Storage Service
 *
 * Currently uses localStorage for all operations.
 * Supabase integration is available in supabaseStorage.ts but requires
 * async/await refactoring of the entire app to use properly.
 *
 * TODO: Refactor app components to use async/await, then switch to Supabase
 */

// Re-export all services from localStorage storage
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
} from './storage';

// Export Supabase services separately for future use or manual migration
export * as supabase from './supabaseStorage';
