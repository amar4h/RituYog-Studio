/**
 * Seed Data & Initialization
 * Demo data for development, storage initialization
 */

import { isApiMode } from '../api';
import { memberService } from './memberService';
import { leadService } from './leadService';
import { membershipPlanService } from './planService';
import { subscriptionService } from './subscriptionService';
import { slotService, slotSubscriptionService } from './slotService';
import { invoiceService } from './invoiceService';
import { trialBookingService } from './trialBookingService';
import { settingsService } from './settingsService';
import { backupService } from './backupService';
import { attendanceService } from './attendanceService';
import { asanaService, sessionPlanService } from './sessionPlanningServices';

export function initializeStorage(): void {
  // Skip initialization in API mode - database has default data in schema
  if (isApiMode()) {
    console.log('Storage initialization skipped in API mode - using database defaults');
    return;
  }

  // localStorage mode: Initialize default settings
  settingsService.getOrDefault();

  // Initialize default slots
  slotService.initializeDefaults();

  // Initialize default membership plans
  membershipPlanService.initializeDefaults();
}

// ============================================
// SEED DATA
// Automatically disabled in API mode (database has its own data)
// ============================================

const SEED_DATA_KEY = 'yoga_studio_seed_initialized';

export function seedDemoData(): void {
  // IMPORTANT: Disable seeding in API mode - database manages its own data
  if (isApiMode()) {
    console.log('Seed data disabled in API mode - using database');
    return;
  }

  // Check if seed data was already added
  if (localStorage.getItem(SEED_DATA_KEY)) {
    console.log('Seed data already exists');
    return;
  }

  // Make sure defaults are initialized first
  initializeStorage();

  // Get the slots and plans
  const slots = slotService.getAll();
  const plans = membershipPlanService.getAll();

  if (slots.length === 0 || plans.length === 0) {
    console.error('Cannot seed data: slots or plans not initialized');
    return;
  }

  const monthlyPlan = plans.find(p => p.type === 'monthly');
  const quarterlyPlan = plans.find(p => p.type === 'quarterly');

  if (!monthlyPlan || !quarterlyPlan) {
    console.error('Cannot seed data: required plans not found');
    return;
  }

  // Sample member data
  const sampleMembers = [
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com', phone: '9876543210', gender: 'female' as const },
    { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@email.com', phone: '9876543211', gender: 'male' as const },
    { firstName: 'Anita', lastName: 'Patel', email: 'anita.patel@email.com', phone: '9876543212', gender: 'female' as const },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@email.com', phone: '9876543213', gender: 'male' as const },
    { firstName: 'Meera', lastName: 'Reddy', email: 'meera.reddy@email.com', phone: '9876543214', gender: 'female' as const },
    { firstName: 'Arjun', lastName: 'Kumar', email: 'arjun.kumar@email.com', phone: '9876543215', gender: 'male' as const },
    { firstName: 'Kavita', lastName: 'Nair', email: 'kavita.nair@email.com', phone: '9876543216', gender: 'female' as const },
    { firstName: 'Suresh', lastName: 'Gupta', email: 'suresh.gupta@email.com', phone: '9876543217', gender: 'male' as const },
    { firstName: 'Deepa', lastName: 'Menon', email: 'deepa.menon@email.com', phone: '9876543218', gender: 'female' as const },
    { firstName: 'Amit', lastName: 'Joshi', email: 'amit.joshi@email.com', phone: '9876543219', gender: 'male' as const },
    { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@email.com', phone: '9876543220', gender: 'female' as const },
    { firstName: 'Rajesh', lastName: 'Iyer', email: 'rajesh.iyer@email.com', phone: '9876543221', gender: 'male' as const },
  ];

  // Distribute members across slots (3 per slot for 4 slots)
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Calculate subscription dates - start from 15 days ago to have some attendance history
  const subscriptionStart = new Date(now);
  subscriptionStart.setDate(subscriptionStart.getDate() - 15);
  const startDate = subscriptionStart.toISOString().split('T')[0];

  // End date based on monthly plan (30 days from start)
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
  const endDate = subscriptionEnd.toISOString().split('T')[0];

  // Quarterly end date (90 days from start)
  const quarterlyEnd = new Date(subscriptionStart);
  quarterlyEnd.setDate(quarterlyEnd.getDate() + 90);
  const quarterlyEndDate = quarterlyEnd.toISOString().split('T')[0];

  sampleMembers.forEach((memberData, index) => {
    // Assign to slots in round-robin (3 members per slot)
    const slotIndex = Math.floor(index / 3);
    const slot = slots[slotIndex % slots.length];

    // Alternate between monthly and quarterly plans
    const plan = index % 3 === 0 ? quarterlyPlan : monthlyPlan;
    const subEndDate = plan.type === 'quarterly' ? quarterlyEndDate : endDate;

    // Create member
    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: slot.id,
      classesAttended: 0,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with invoice
    try {
      subscriptionService.createWithInvoice(
        member.id,
        plan.id,
        slot.id,
        startDate,
        0, // no discount
        undefined
      );
    } catch (err) {
      console.warn(`Could not create subscription for ${member.firstName}: ${err}`);
    }

    // Mark some attendance for the past days (random pattern)
    const pastDays = 15;
    for (let d = pastDays; d >= 1; d--) {
      const attendanceDate = new Date(now);
      attendanceDate.setDate(attendanceDate.getDate() - d);

      // Skip weekends
      const dayOfWeek = attendanceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = attendanceDate.toISOString().split('T')[0];

      // Random attendance: ~70-90% present rate
      const isPresent = Math.random() < (0.7 + (index % 3) * 0.1);

      if (isPresent) {
        try {
          attendanceService.markAttendance(member.id, slot.id, dateStr, 'present');
        } catch (err) {
          // Ignore errors for past attendance
        }
      }
    }
  });

  // ============================================
  // CREATE MEMBERS WITH EXPIRING SUBSCRIPTIONS (for testing renewal)
  // ============================================
  const expiringMembers = [
    { firstName: 'Sanjay', lastName: 'Chopra', email: 'sanjay.chopra@email.com', phone: '9876543240', gender: 'male' as const, daysToExpiry: 1 },
    { firstName: 'Lakshmi', lastName: 'Pillai', email: 'lakshmi.pillai@email.com', phone: '9876543241', gender: 'female' as const, daysToExpiry: 2 },
    { firstName: 'Manoj', lastName: 'Tiwari', email: 'manoj.tiwari@email.com', phone: '9876543242', gender: 'male' as const, daysToExpiry: 3 },
    { firstName: 'Rekha', lastName: 'Desai', email: 'rekha.desai@email.com', phone: '9876543243', gender: 'female' as const, daysToExpiry: 4 },
    { firstName: 'Vinod', lastName: 'Saxena', email: 'vinod.saxena@email.com', phone: '9876543244', gender: 'male' as const, daysToExpiry: 5 },
    { firstName: 'Geeta', lastName: 'Malhotra', email: 'geeta.malhotra@email.com', phone: '9876543245', gender: 'female' as const, daysToExpiry: 6 },
    { firstName: 'Rakesh', lastName: 'Agarwal', email: 'rakesh.agarwal@email.com', phone: '9876543246', gender: 'male' as const, daysToExpiry: 7 },
    { firstName: 'Nisha', lastName: 'Kapoor', email: 'nisha.kapoor@email.com', phone: '9876543247', gender: 'female' as const, daysToExpiry: 7 },
  ];

  expiringMembers.forEach((memberData, index) => {
    const slot = slots[index % slots.length];

    // Calculate dates so subscription expires in X days
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + memberData.daysToExpiry);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    // Start date was 30 days before expiry (monthly plan)
    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'walk-in',
      assignedSlotId: slot.id,
      classesAttended: Math.floor(Math.random() * 15) + 10,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription directly
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: true,
      isException: false,
    });
  });

  // ============================================
  // CREATE MEMBER WITH % DISCOUNT (for testing renewal discount preservation)
  // ============================================
  const discountTestMember = {
    firstName: 'Pooja',
    lastName: 'Discount',
    email: 'pooja.discount@email.com',
    phone: '9876543299',
    gender: 'female' as const,
    daysToExpiry: 3,
    discountPercent: 20, // 20% discount
  };

  {
    const slot = slots[0];
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + discountTestMember.daysToExpiry);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const discountAmount = Math.round(monthlyPlan.price * discountTestMember.discountPercent / 100);
    const payableAmount = monthlyPlan.price - discountAmount;

    const member = memberService.create({
      firstName: discountTestMember.firstName,
      lastName: discountTestMember.lastName,
      email: discountTestMember.email,
      phone: discountTestMember.phone,
      gender: discountTestMember.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: slot.id,
      classesAttended: 20,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with percentage discount
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: discountAmount,
      discountType: 'percentage',
      discountPercentage: discountTestMember.discountPercent,
      discountReason: 'Referral discount',
      payableAmount: payableAmount,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: discountAmount,
      discountReason: 'Referral discount',
      totalAmount: payableAmount,
      amountPaid: payableAmount,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: true,
      isException: false,
    });

    console.log('Created test member "Pooja Discount" with 20% discount expiring in 3 days');
  }

  // ============================================
  // CREATE MEMBERS WITH EXPIRED SUBSCRIPTIONS (for testing expired notifications)
  // ============================================
  const expiredMembers = [
    { firstName: 'Ajay', lastName: 'Verma', email: 'ajay.verma@email.com', phone: '9876543250', gender: 'male' as const, daysAgoExpired: 1 },
    { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@email.com', phone: '9876543251', gender: 'female' as const, daysAgoExpired: 2 },
    { firstName: 'Deepak', lastName: 'Joshi', email: 'deepak.joshi@email.com', phone: '9876543252', gender: 'male' as const, daysAgoExpired: 4 },
    { firstName: 'Kavita', lastName: 'Nair', email: 'kavita.nair@email.com', phone: '9876543253', gender: 'female' as const, daysAgoExpired: 5 },
    { firstName: 'Rahul', lastName: 'Pandey', email: 'rahul.pandey@email.com', phone: '9876543254', gender: 'male' as const, daysAgoExpired: 7 },
  ];

  expiredMembers.forEach((memberData, index) => {
    const slot = slots[index % slots.length];

    // Calculate dates so subscription expired X days ago
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() - memberData.daysAgoExpired);
    const expEndDate = expiryDate.toISOString().split('T')[0];

    // Start date was 30 days before expiry (monthly plan)
    const expStartDate = new Date(expiryDate);
    expStartDate.setDate(expStartDate.getDate() - 30);
    const expStart = expStartDate.toISOString().split('T')[0];

    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'walk-in',
      assignedSlotId: slot.id,
      classesAttended: Math.floor(Math.random() * 20) + 15,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription with expired status
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: slot.id,
      startDate: expStart,
      endDate: expEndDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'expired',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create paid invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: expStart,
      dueDate: expStart,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${slot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });

    // Create slot subscription (inactive since expired)
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: slot.id,
      startDate: expStart,
      isActive: false,
      isException: false,
    });
  });

  // ============================================
  // FILL FIRST SLOT TO CAPACITY FOR TRANSFER TESTING
  // ============================================
  // First slot (Morning 7:30 AM) already has ~3 members from round-robin + 1 expiring = 4
  // Add 6 more members to fill normal capacity (10). Exception capacity (1) will still be available.
  const fullSlot = slots[0]; // Morning 7:30 AM slot
  const fillSlotMembers = [
    { firstName: 'Ashwin', lastName: 'Menon', email: 'ashwin.menon@email.com', phone: '9876543260', gender: 'male' as const },
    { firstName: 'Divya', lastName: 'Krishnan', email: 'divya.k@email.com', phone: '9876543261', gender: 'female' as const },
    { firstName: 'Karthik', lastName: 'Subramanian', email: 'karthik.s@email.com', phone: '9876543262', gender: 'male' as const },
    { firstName: 'Revathi', lastName: 'Balan', email: 'revathi.b@email.com', phone: '9876543263', gender: 'female' as const },
    { firstName: 'Ganesh', lastName: 'Narayanan', email: 'ganesh.n@email.com', phone: '9876543264', gender: 'male' as const },
    { firstName: 'Shalini', lastName: 'Rajan', email: 'shalini.r@email.com', phone: '9876543265', gender: 'female' as const },
  ];

  fillSlotMembers.forEach((memberData) => {
    const member = memberService.create({
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      phone: memberData.phone,
      gender: memberData.gender,
      status: 'active',
      source: 'referral',
      assignedSlotId: fullSlot.id,
      classesAttended: Math.floor(Math.random() * 10) + 5,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create subscription
    const subscription = subscriptionService.create({
      memberId: member.id,
      planId: monthlyPlan.id,
      slotId: fullSlot.id,
      startDate: startDate,
      endDate: endDate,
      originalAmount: monthlyPlan.price,
      discountAmount: 0,
      payableAmount: monthlyPlan.price,
      status: 'active',
      isExtension: false,
      paymentStatus: 'paid',
    });

    // Create slot subscription
    slotSubscriptionService.create({
      memberId: member.id,
      slotId: fullSlot.id,
      startDate: startDate,
      isActive: true,
      isException: false,
    });

    // Create invoice
    invoiceService.create({
      invoiceNumber: invoiceService.generateInvoiceNumber(),
      invoiceType: 'membership',
      memberId: member.id,
      amount: monthlyPlan.price,
      discount: 0,
      totalAmount: monthlyPlan.price,
      amountPaid: monthlyPlan.price,
      invoiceDate: startDate,
      dueDate: startDate,
      status: 'paid',
      items: [{
        description: `${monthlyPlan.name} Membership - ${fullSlot.displayName}`,
        quantity: 1,
        unitPrice: monthlyPlan.price,
        total: monthlyPlan.price,
      }],
      subscriptionId: subscription.id,
    });
  });

  // ============================================
  // CREATE MEMBER FOR TRANSFER TESTING
  // ============================================
  // Member in slot 2 who can be used to test transfer to full slot
  const transferTestMember = memberService.create({
    firstName: 'Sunil',
    lastName: 'Mehta',
    email: 'sunil.mehta@email.com',
    phone: '9876543290',
    gender: 'male',
    status: 'active',
    source: 'referral',
    assignedSlotId: slots[1]?.id, // In Morning 8:45 AM slot
    classesAttended: 8,
    medicalConditions: [],
    consentRecords: [],
  });

  const transferTestSub = subscriptionService.create({
    memberId: transferTestMember.id,
    planId: quarterlyPlan.id,
    slotId: slots[1]?.id!,
    startDate: startDate,
    endDate: quarterlyEndDate,
    originalAmount: quarterlyPlan.price,
    discountAmount: 0,
    payableAmount: quarterlyPlan.price,
    status: 'active',
    isExtension: false,
    paymentStatus: 'paid',
  });

  slotSubscriptionService.create({
    memberId: transferTestMember.id,
    slotId: slots[1]?.id!,
    startDate: startDate,
    isActive: true,
    isException: false,
  });

  invoiceService.create({
    invoiceNumber: invoiceService.generateInvoiceNumber(),
    invoiceType: 'membership',
    memberId: transferTestMember.id,
    amount: quarterlyPlan.price,
    discount: 0,
    totalAmount: quarterlyPlan.price,
    amountPaid: quarterlyPlan.price,
    invoiceDate: startDate,
    dueDate: startDate,
    status: 'paid',
    items: [{
      description: `${quarterlyPlan.name} Membership - ${slots[1]?.displayName}`,
      quantity: 1,
      unitPrice: quarterlyPlan.price,
      total: quarterlyPlan.price,
    }],
    subscriptionId: transferTestSub.id,
  });

  // ============================================
  // CREATE LEADS FOR CONVERSION TESTING
  // ============================================
  const sampleLeads = [
    // New lead - ready for direct conversion
    { firstName: 'Neha', lastName: 'Kapoor', email: 'neha.kapoor@email.com', phone: '9876543230', preferredSlot: slots[1]?.id, status: 'new' as const },
    // Contacted lead - ready for conversion
    { firstName: 'Rohit', lastName: 'Malhotra', email: 'rohit.m@email.com', phone: '9876543231', preferredSlot: slots[2]?.id, status: 'contacted' as const },
    // Negotiating lead - almost ready
    { firstName: 'Shreya', lastName: 'Agarwal', email: 'shreya.a@email.com', phone: '9876543232', preferredSlot: slots[1]?.id, status: 'negotiating' as const },
    // Lead interested in full slot - to test capacity check during conversion
    { firstName: 'Vivek', lastName: 'Srinivasan', email: 'vivek.s@email.com', phone: '9876543233', preferredSlot: fullSlot.id, status: 'new' as const },
  ];

  sampleLeads.forEach(leadData => {
    leadService.create({
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.status,
      source: 'online',
      preferredSlotId: leadData.preferredSlot,
      medicalConditions: [],
      consentRecords: [],
    });
  });

  // ============================================
  // CREATE LEADS WITH TRIAL BOOKINGS
  // ============================================
  // Tomorrow's date for trial
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Skip weekends
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Day after tomorrow
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  while (dayAfter.getDay() === 0 || dayAfter.getDay() === 6) {
    dayAfter.setDate(dayAfter.getDate() + 1);
  }
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const trialLeads = [
    { firstName: 'Poornima', lastName: 'Das', email: 'poornima.d@email.com', phone: '9876543280', trialSlot: slots[1]?.id, trialDate: tomorrowStr, trialCompleted: false },
    { firstName: 'Venkat', lastName: 'Raman', email: 'venkat.r@email.com', phone: '9876543281', trialSlot: slots[2]?.id, trialDate: dayAfterStr, trialCompleted: false },
    { firstName: 'Smita', lastName: 'Banerjee', email: 'smita.b@email.com', phone: '9876543282', trialSlot: slots[1]?.id, trialDate: today, trialCompleted: true },
  ];

  trialLeads.forEach(leadData => {
    const lead = leadService.create({
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone,
      status: leadData.trialCompleted ? 'trial-completed' : 'trial-scheduled',
      source: 'online',
      preferredSlotId: leadData.trialSlot,
      trialDate: leadData.trialDate,
      trialSlotId: leadData.trialSlot,
      medicalConditions: [],
      consentRecords: [],
    });

    // Create trial booking
    trialBookingService.create({
      leadId: lead.id,
      slotId: leadData.trialSlot!,
      date: leadData.trialDate,
      status: leadData.trialCompleted ? 'attended' : 'confirmed',
      isException: false,
      confirmationSent: true,
      reminderSent: leadData.trialCompleted,
    });
  });

  // ============================================
  // CREATE SESSION PLANNING SEED DATA
  // ============================================
  const seedAsanas = [
    // Warm Up / Standing Poses
    { name: 'Tadasana', sanskritName: 'Mountain Pose', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const, 'core' as const], secondaryBodyAreas: ['ankles' as const],
      benefits: ['Improves posture', 'Strengthens thighs', 'Increases awareness'], breathingCue: 'inhale' as const, isActive: true },
    { name: 'Uttanasana', sanskritName: 'Standing Forward Bend', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['hamstrings' as const, 'spine' as const], secondaryBodyAreas: ['calves' as const, 'hips' as const],
      benefits: ['Stretches hamstrings', 'Calms the mind', 'Relieves stress'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Adho Mukha Svanasana', sanskritName: 'Downward Facing Dog', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['shoulders' as const, 'hamstrings' as const], secondaryBodyAreas: ['spine' as const, 'calves' as const],
      benefits: ['Full body stretch', 'Builds strength', 'Energizes the body'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Virabhadrasana I', sanskritName: 'Warrior I', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['hips' as const, 'core' as const], secondaryBodyAreas: ['shoulders' as const, 'spine' as const],
      benefits: ['Strengthens legs', 'Opens chest', 'Improves balance'], breathingCue: 'inhale' as const, isActive: true },
    { name: 'Virabhadrasana II', sanskritName: 'Warrior II', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['hips' as const, 'shoulders' as const], secondaryBodyAreas: ['core' as const, 'knees' as const],
      benefits: ['Builds stamina', 'Strengthens legs', 'Opens hips'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Trikonasana', sanskritName: 'Triangle Pose', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['hips' as const, 'hamstrings' as const], secondaryBodyAreas: ['spine' as const, 'shoulders' as const],
      benefits: ['Stretches sides', 'Strengthens legs', 'Improves digestion'], breathingCue: 'exhale' as const, isActive: true },
    // Surya Namaskara (no specific cue - it's a flow with alternating breaths)
    { name: 'Surya Namaskar A', sanskritName: 'Sun Salutation A', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const, 'shoulders' as const, 'core' as const], secondaryBodyAreas: ['hamstrings' as const, 'hips' as const],
      benefits: ['Full body warm-up', 'Increases flexibility', 'Builds strength'], isActive: true },
    { name: 'Surya Namaskar B', sanskritName: 'Sun Salutation B', type: 'asana' as const, difficulty: 'intermediate' as const,
      primaryBodyAreas: ['spine' as const, 'core' as const, 'hips' as const], secondaryBodyAreas: ['shoulders' as const, 'hamstrings' as const],
      benefits: ['Builds heat', 'Strengthens legs', 'Improves stamina'], isActive: true },
    // Main Asana Sequence
    { name: 'Bhujangasana', sanskritName: 'Cobra Pose', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const], secondaryBodyAreas: ['shoulders' as const, 'core' as const],
      benefits: ['Strengthens spine', 'Opens chest', 'Stimulates organs'], breathingCue: 'inhale' as const, isActive: true },
    { name: 'Setu Bandhasana', sanskritName: 'Bridge Pose', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const, 'hips' as const], secondaryBodyAreas: ['core' as const, 'hamstrings' as const],
      benefits: ['Strengthens back', 'Opens chest', 'Calms brain'], breathingCue: 'inhale' as const, isActive: true },
    { name: 'Paschimottanasana', sanskritName: 'Seated Forward Bend', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['hamstrings' as const, 'spine' as const], secondaryBodyAreas: ['calves' as const],
      benefits: ['Stretches spine', 'Calms mind', 'Aids digestion'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Ardha Matsyendrasana', sanskritName: 'Half Lord of the Fishes', type: 'asana' as const, difficulty: 'intermediate' as const,
      primaryBodyAreas: ['spine' as const, 'hips' as const], secondaryBodyAreas: ['shoulders' as const],
      benefits: ['Spinal twist', 'Stimulates digestion', 'Increases flexibility'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Balasana', sanskritName: 'Child\'s Pose', type: 'relaxation' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const, 'hips' as const], secondaryBodyAreas: ['shoulders' as const],
      benefits: ['Rest pose', 'Releases tension', 'Calms mind'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Marjaryasana-Bitilasana', sanskritName: 'Cat-Cow Pose', type: 'asana' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['spine' as const], secondaryBodyAreas: ['core' as const, 'neck' as const],
      benefits: ['Warms spine', 'Improves flexibility', 'Relieves stress'], isActive: true },
    // Pranayama
    { name: 'Anulom Vilom', sanskritName: 'Alternate Nostril Breathing', type: 'pranayama' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['respiratory' as const, 'nervous_system' as const], secondaryBodyAreas: [],
      benefits: ['Balances nervous system', 'Reduces stress', 'Improves focus'], isActive: true },
    { name: 'Kapalbhati', sanskritName: 'Skull Shining Breath', type: 'pranayama' as const, difficulty: 'intermediate' as const,
      primaryBodyAreas: ['core' as const, 'respiratory' as const], secondaryBodyAreas: ['nervous_system' as const],
      benefits: ['Cleanses respiratory system', 'Energizes body', 'Strengthens abdominals'],
      contraindications: ['High blood pressure', 'Heart disease', 'Pregnancy'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Bhramari', sanskritName: 'Humming Bee Breath', type: 'pranayama' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['respiratory' as const, 'nervous_system' as const], secondaryBodyAreas: ['neck' as const],
      benefits: ['Calms the mind', 'Reduces anxiety', 'Improves sleep'], breathingCue: 'exhale' as const, isActive: true },
    { name: 'Ujjayi', sanskritName: 'Ocean Breath', type: 'pranayama' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['respiratory' as const], secondaryBodyAreas: ['nervous_system' as const],
      benefits: ['Builds heat', 'Calms nervous system', 'Improves focus'], isActive: true },
    // Relaxation
    { name: 'Shavasana', sanskritName: 'Corpse Pose', type: 'relaxation' as const, difficulty: 'beginner' as const,
      primaryBodyAreas: ['nervous_system' as const], secondaryBodyAreas: ['spine' as const],
      benefits: ['Deep relaxation', 'Reduces stress', 'Integrates practice'], isActive: true },
  ];

  // Create seed asanas
  const createdAsanas: Record<string, string> = {}; // name -> id mapping
  seedAsanas.forEach(asanaData => {
    const asana = asanaService.create(asanaData);
    createdAsanas[asanaData.name] = asana.id;
  });

  // Create sample session plans
  const beginnerPlan = sessionPlanService.create({
    name: 'Beginner Morning Flow',
    description: 'Gentle morning sequence suitable for beginners. Focus on awakening the body and building foundation.',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', order: 1, items: [
        { asanaId: createdAsanas['Marjaryasana-Bitilasana'], order: 1, durationMinutes: 3, intensity: 'low' },
        { asanaId: createdAsanas['Tadasana'], order: 2, durationMinutes: 2, intensity: 'low' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', order: 2, items: [
        { asanaId: createdAsanas['Surya Namaskar A'], order: 1, reps: 3, intensity: 'medium' },
      ]},
      { sectionType: 'ASANA_SEQUENCE', order: 3, items: [
        { asanaId: createdAsanas['Virabhadrasana I'], order: 1, durationMinutes: 2, intensity: 'medium' },
        { asanaId: createdAsanas['Virabhadrasana II'], order: 2, durationMinutes: 2, intensity: 'medium' },
        { asanaId: createdAsanas['Trikonasana'], order: 3, durationMinutes: 2, intensity: 'medium' },
        { asanaId: createdAsanas['Bhujangasana'], order: 4, durationMinutes: 2, intensity: 'low' },
        { asanaId: createdAsanas['Setu Bandhasana'], order: 5, durationMinutes: 3, intensity: 'medium' },
        { asanaId: createdAsanas['Paschimottanasana'], order: 6, durationMinutes: 3, intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', order: 4, items: [
        { asanaId: createdAsanas['Anulom Vilom'], order: 1, durationMinutes: 5, intensity: 'low' },
      ]},
      { sectionType: 'SHAVASANA', order: 5, items: [
        { asanaId: createdAsanas['Shavasana'], order: 1, durationMinutes: 5, intensity: 'low' },
      ]},
    ],
    isActive: true,
  });

  const intermediatePlan = sessionPlanService.create({
    name: 'Intermediate Power Flow',
    description: 'Dynamic sequence for intermediate practitioners. Builds strength and stamina.',
    level: 'intermediate',
    sections: [
      { sectionType: 'WARM_UP', order: 1, items: [
        { asanaId: createdAsanas['Marjaryasana-Bitilasana'], order: 1, durationMinutes: 2, intensity: 'medium' },
        { asanaId: createdAsanas['Adho Mukha Svanasana'], order: 2, durationMinutes: 2, intensity: 'medium' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', order: 2, items: [
        { asanaId: createdAsanas['Surya Namaskar A'], order: 1, reps: 3, intensity: 'medium' },
        { asanaId: createdAsanas['Surya Namaskar B'], order: 2, reps: 3, intensity: 'high' },
      ]},
      { sectionType: 'ASANA_SEQUENCE', order: 3, items: [
        { asanaId: createdAsanas['Virabhadrasana I'], order: 1, durationMinutes: 2, intensity: 'high' },
        { asanaId: createdAsanas['Virabhadrasana II'], order: 2, durationMinutes: 2, intensity: 'high' },
        { asanaId: createdAsanas['Trikonasana'], order: 3, durationMinutes: 2, intensity: 'medium' },
        { asanaId: createdAsanas['Ardha Matsyendrasana'], order: 4, durationMinutes: 3, intensity: 'medium' },
        { asanaId: createdAsanas['Setu Bandhasana'], order: 5, durationMinutes: 3, intensity: 'medium' },
      ]},
      { sectionType: 'PRANAYAMA', order: 4, items: [
        { asanaId: createdAsanas['Kapalbhati'], order: 1, durationMinutes: 3, reps: 3, intensity: 'high' },
        { asanaId: createdAsanas['Anulom Vilom'], order: 2, durationMinutes: 5, intensity: 'low' },
      ]},
      { sectionType: 'SHAVASANA', order: 5, items: [
        { asanaId: createdAsanas['Shavasana'], order: 1, durationMinutes: 5, intensity: 'low' },
      ]},
    ],
    isActive: true,
  });

  const relaxationPlan = sessionPlanService.create({
    name: 'Evening Relaxation',
    description: 'Calming sequence for stress relief and better sleep. Gentle stretches and deep breathing.',
    level: 'beginner',
    sections: [
      { sectionType: 'WARM_UP', order: 1, items: [
        { asanaId: createdAsanas['Marjaryasana-Bitilasana'], order: 1, durationMinutes: 3, intensity: 'low' },
        { asanaId: createdAsanas['Balasana'], order: 2, durationMinutes: 2, intensity: 'low' },
      ]},
      { sectionType: 'SURYA_NAMASKARA', order: 2, items: []},
      { sectionType: 'ASANA_SEQUENCE', order: 3, items: [
        { asanaId: createdAsanas['Uttanasana'], order: 1, durationMinutes: 3, intensity: 'low' },
        { asanaId: createdAsanas['Paschimottanasana'], order: 2, durationMinutes: 4, intensity: 'low' },
        { asanaId: createdAsanas['Setu Bandhasana'], order: 3, durationMinutes: 3, intensity: 'low' },
        { asanaId: createdAsanas['Ardha Matsyendrasana'], order: 4, durationMinutes: 3, intensity: 'low' },
      ]},
      { sectionType: 'PRANAYAMA', order: 4, items: [
        { asanaId: createdAsanas['Bhramari'], order: 1, durationMinutes: 5, intensity: 'low' },
        { asanaId: createdAsanas['Anulom Vilom'], order: 2, durationMinutes: 5, intensity: 'low' },
      ]},
      { sectionType: 'SHAVASANA', order: 5, items: [
        { asanaId: createdAsanas['Shavasana'], order: 1, durationMinutes: 10, intensity: 'low' },
      ]},
    ],
    isActive: true,
  });

  console.log(`Created ${seedAsanas.length} seed asanas and 3 session plans`);

  // Mark seed data as initialized
  localStorage.setItem(SEED_DATA_KEY, 'true');
  console.log('Seed data created successfully: 12 regular members, 3 expiring members, 6 fill members, 1 transfer test member, 4 leads, 3 leads with trials');
}

// Function to reset all data and re-seed
export function resetAndSeedData(): void {
  // Clear the seed flag
  localStorage.removeItem(SEED_DATA_KEY);

  // Clear all data
  backupService.clearAll();

  // Re-seed
  seedDemoData();
}
