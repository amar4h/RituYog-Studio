/**
 * Legacy Services (kept for backward compatibility)
 */

import type {
  Instructor,
  YogaClass,
  ClassSchedule,
  Booking,
  TrialRequest,
  NotificationLog,
} from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, create, update, remove } from './helpers';

export const instructorService = {
  getAll: () => getAll<Instructor>(STORAGE_KEYS.INSTRUCTORS),
  getById: (id: string) => getById<Instructor>(STORAGE_KEYS.INSTRUCTORS, id),
  create: (data: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Instructor>(STORAGE_KEYS.INSTRUCTORS, data),
  update: (id: string, data: Partial<Instructor>) =>
    update<Instructor>(STORAGE_KEYS.INSTRUCTORS, id, data),
  delete: (id: string) => remove<Instructor>(STORAGE_KEYS.INSTRUCTORS, id),
  getActive: (): Instructor[] => {
    const instructors = getAll<Instructor>(STORAGE_KEYS.INSTRUCTORS);
    return instructors.filter(i => i.status === 'active');
  },
};

export const classService = {
  getAll: () => getAll<YogaClass>(STORAGE_KEYS.CLASSES),
  getById: (id: string) => getById<YogaClass>(STORAGE_KEYS.CLASSES, id),
  create: (data: Omit<YogaClass, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<YogaClass>(STORAGE_KEYS.CLASSES, data),
  update: (id: string, data: Partial<YogaClass>) =>
    update<YogaClass>(STORAGE_KEYS.CLASSES, id, data),
  delete: (id: string) => remove<YogaClass>(STORAGE_KEYS.CLASSES, id),
};

export const scheduleService = {
  getAll: () => getAll<ClassSchedule>(STORAGE_KEYS.SCHEDULES),
  getById: (id: string) => getById<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id),
  create: (data: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<ClassSchedule>(STORAGE_KEYS.SCHEDULES, data),
  update: (id: string, data: Partial<ClassSchedule>) =>
    update<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id, data),
  delete: (id: string) => remove<ClassSchedule>(STORAGE_KEYS.SCHEDULES, id),
};

export const bookingService = {
  getAll: () => getAll<Booking>(STORAGE_KEYS.BOOKINGS),
  getById: (id: string) => getById<Booking>(STORAGE_KEYS.BOOKINGS, id),
  create: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<Booking>(STORAGE_KEYS.BOOKINGS, data),
  update: (id: string, data: Partial<Booking>) =>
    update<Booking>(STORAGE_KEYS.BOOKINGS, id, data),
  delete: (id: string) => remove<Booking>(STORAGE_KEYS.BOOKINGS, id),
};

export const trialRequestService = {
  getAll: () => getAll<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS),
  getById: (id: string) => getById<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id),
  create: (data: Omit<TrialRequest, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, data),
  update: (id: string, data: Partial<TrialRequest>) =>
    update<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id, data),
  delete: (id: string) => remove<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS, id),
  getPending: (): TrialRequest[] => {
    const requests = getAll<TrialRequest>(STORAGE_KEYS.TRIAL_REQUESTS);
    return requests.filter(r => r.status === 'pending');
  },
};

export const notificationService = {
  getAll: () => getAll<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS),
  getById: (id: string) => getById<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id),
  create: (data: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>) =>
    create<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, data),
  update: (id: string, data: Partial<NotificationLog>) =>
    update<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id, data),
  delete: (id: string) => remove<NotificationLog>(STORAGE_KEYS.NOTIFICATIONS, id),
};
