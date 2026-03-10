/**
 * Storage Services - Barrel Export
 * Re-exports all services from individual module files.
 */

// Helpers (exported for internal use by other modules)
export { waitForPendingWrites } from './helpers';

// Core services
export { memberService } from './memberService';
export { leadService } from './leadService';
export { membershipPlanService } from './planService';
export { subscriptionService } from './subscriptionService';
export { slotService, slotSubscriptionService } from './slotService';
export { invoiceService } from './invoiceService';
export { paymentService } from './paymentService';
export { trialBookingService } from './trialBookingService';
export { settingsService } from './settingsService';
export { authService, memberAuthService } from './authService';
export { backupService } from './backupService';

// Attendance
export { attendanceService, attendanceLockService } from './attendanceService';

// Notification logs
export { notificationLogService } from './notificationLogService';

// Inventory & Expenses
export { productService, inventoryService, expenseService } from './inventoryServices';

// Session Planning
export {
  asanaService,
  sessionPlanService,
  sessionPlanAllocationService,
  sessionExecutionService,
  sessionAnalyticsService,
} from './sessionPlanningServices';

// Legacy services (backward compatibility)
export {
  instructorService,
  classService,
  scheduleService,
  bookingService,
  trialRequestService,
  notificationService,
} from './legacyServices';

// Seed & initialization
export { initializeStorage, seedDemoData, resetAndSeedData } from './seed';

// Sync functions
export { syncFromApi, isApiSynced, clearApiSync, syncEssentialData, syncFeatureData } from './sync';
