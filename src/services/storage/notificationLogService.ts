/**
 * Notification Log Service
 * Tracks WhatsApp notification attempts
 */

import { isApiMode } from '../api';
import type { NotificationLog, NotificationType } from '../../types';
import { STORAGE_KEYS } from '../../constants';

export const notificationLogService = {
  // Get all notification logs
  getAll: (): NotificationLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_LOGS);
    return data ? JSON.parse(data) : [];
  },

  // Save all notification logs
  saveAll: (logs: NotificationLog[]): void => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(logs));
  },

  // Get notification log by ID
  getById: (id: string): NotificationLog | undefined => {
    return notificationLogService.getAll().find(log => log.id === id);
  },

  // Get pending notifications
  getPending: (): NotificationLog[] => {
    return notificationLogService.getAll().filter(log => log.status === 'pending');
  },

  // Get notifications by type
  getByType: (type: NotificationType): NotificationLog[] => {
    return notificationLogService.getAll().filter(log => log.type === type);
  },

  // Get notifications by recipient
  getByRecipient: (recipientType: 'member' | 'lead', recipientId: string): NotificationLog[] => {
    return notificationLogService.getAll().filter(
      log => log.recipientType === recipientType && log.recipientId === recipientId
    );
  },

  // Create a new notification log
  create: (data: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>): NotificationLog => {
    const now = new Date().toISOString();
    const newLog: NotificationLog = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const logs = notificationLogService.getAll();
    logs.unshift(newLog); // Add to beginning (most recent first)
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(newLog),
      }).catch(error => {
        console.error('[API Write] notification-logs create error:', error);
      });
    }

    return newLog;
  },

  // Mark notification as sent
  markSent: (id: string): NotificationLog | undefined => {
    const logs = notificationLogService.getAll();
    const index = logs.findIndex(log => log.id === id);
    if (index === -1) return undefined;

    const now = new Date().toISOString();
    logs[index] = {
      ...logs[index],
      status: 'sent',
      sentAt: now,
      updatedAt: now,
    };
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=markSent&id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }).catch(error => {
        console.error('[API Write] notification-logs markSent error:', error);
      });
    }

    return logs[index];
  },

  // Cancel notification
  cancel: (id: string): NotificationLog | undefined => {
    const logs = notificationLogService.getAll();
    const index = logs.findIndex(log => log.id === id);
    if (index === -1) return undefined;

    const now = new Date().toISOString();
    logs[index] = {
      ...logs[index],
      status: 'cancelled',
      updatedAt: now,
    };
    notificationLogService.saveAll(logs);

    // Sync to API if in API mode
    if (isApiMode()) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const apiKey = import.meta.env.VITE_API_KEY || '';

      fetch(`${baseUrl}/notification-logs?action=cancel&id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }).catch(error => {
        console.error('[API Write] notification-logs cancel error:', error);
      });
    }

    return logs[index];
  },

  // Get counts by status
  getCounts: (): { pending: number; sent: number; cancelled: number } => {
    const logs = notificationLogService.getAll();
    return {
      pending: logs.filter(l => l.status === 'pending').length,
      sent: logs.filter(l => l.status === 'sent').length,
      cancelled: logs.filter(l => l.status === 'cancelled').length,
    };
  },
};
