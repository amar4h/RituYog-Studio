/**
 * Lead Service
 * Dual-mode: localStorage (default) or API
 */

import { isApiMode, leadsApi } from '../api';
import type { Lead, Member, MedicalCondition, ConsentRecord } from '../../types';
import {
  STORAGE_KEYS,
  TRIAL_BOOKING_EXPIRY_DAYS,
  MAX_SUBSCRIPTION_SYNC_ATTEMPTS,
  BASE_RETRY_BACKOFF_MS,
} from '../../constants';
import { getAll, getById, create, update, remove, createDual, updateDual, removeDual } from './helpers';
import { memberService } from './memberService';

export const leadService = {
  // Synchronous methods - dual-mode (localStorage + API queue)
  getAll: () => getAll<Lead>(STORAGE_KEYS.LEADS),
  getById: (id: string) => getById<Lead>(STORAGE_KEYS.LEADS, id),
  create: (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Lead>(STORAGE_KEYS.LEADS, data),
  update: (id: string, data: Partial<Lead>) =>
    updateDual<Lead>(STORAGE_KEYS.LEADS, id, data),
  delete: (id: string) => removeDual<Lead>(STORAGE_KEYS.LEADS, id),

  getByEmail: (email: string): Lead | null => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.find(l => l.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getByPhone: (phone: string): Lead | null => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.find(l => l.phone === phone) || null;
  },

  getByStatus: (status: Lead['status']): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l => l.status === status);
  },

  getPending: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l =>
      ['new', 'contacted', 'trial-scheduled', 'follow-up', 'interested'].includes(l.status)
    );
  },

  // Get all unconverted leads (excludes leads with status 'converted')
  // Use this for the Leads list page to not show converted leads
  getUnconverted: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    return leads.filter(l => l.status !== 'converted');
  },

  getForFollowUp: (): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    const today = new Date().toISOString().split('T')[0];
    return leads.filter(l =>
      l.nextFollowUpDate && l.nextFollowUpDate <= today &&
      !['converted', 'not-interested', 'lost'].includes(l.status)
    );
  },

  convertToMember: (leadId: string): Member => {
    const lead = leadService.getById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Check if already converted
    if (lead.convertedToMemberId) {
      throw new Error('Lead already converted');
    }

    // Check if email already exists as member
    const existingMember = memberService.getByEmail(lead.email);
    if (existingMember) {
      throw new Error('A member with this email already exists');
    }

    // Create member from lead data
    // Convert lead's emergency contact strings to Member's EmergencyContact object
    const emergencyContact = lead.emergencyContact || lead.emergencyPhone
      ? {
          name: lead.emergencyContact || '',
          phone: lead.emergencyPhone || '',
        }
      : undefined;

    const member = memberService.create({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      whatsappNumber: lead.whatsappNumber,
      dateOfBirth: lead.dateOfBirth,
      age: lead.age,
      gender: lead.gender,
      address: lead.address,
      emergencyContact,
      medicalConditions: lead.medicalConditions,
      healthNotes: lead.healthNotes,
      consentRecords: lead.consentRecords,
      status: 'pending', // Will become active when subscription is added
      source: 'lead-conversion',
      convertedFromLeadId: leadId,
      assignedSlotId: lead.preferredSlotId,
      classesAttended: 0,
      notes: lead.notes,
    });

    // Update lead status
    leadService.update(leadId, {
      status: 'converted',
      convertedToMemberId: member.id,
      conversionDate: new Date().toISOString(),
    });

    return member;
  },

  search: (query: string): Lead[] => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    const lowerQuery = query.toLowerCase();
    return leads.filter(l =>
      l.firstName.toLowerCase().includes(lowerQuery) ||
      l.lastName.toLowerCase().includes(lowerQuery) ||
      l.email.toLowerCase().includes(lowerQuery) ||
      l.phone.includes(query)
    );
  },

  // ============================================
  // QUICK-ADD LEAD METHODS (for registration completion flow)
  // ============================================

  // Generate a cryptographically secure completion token
  generateCompletionToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  },

  // Create a quick-add lead with minimal info and completion token
  createQuick: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    age?: number;
    preferredSlotId?: string;
  }): Lead => {
    const token = leadService.generateCompletionToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + TRIAL_BOOKING_EXPIRY_DAYS);

    return leadService.create({
      ...data,
      email: '', // Will be filled on completion
      status: 'new',
      source: 'whatsapp',
      completionToken: token,
      completionTokenExpiry: expiryDate.toISOString(),
      isProfileComplete: false,
      medicalConditions: [],
      consentRecords: [],
    });
  },

  // Get lead by completion token (for public completion page)
  getByToken: (token: string): Lead | null => {
    const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
    const now = new Date().toISOString();
    return leads.find(l =>
      l.completionToken === token &&
      l.completionTokenExpiry &&
      l.completionTokenExpiry > now &&
      !l.isProfileComplete
    ) || null;
  },

  // Complete lead registration (public action via token)
  completeRegistration: (token: string, data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    preferredSlotId?: string;
    medicalConditions: MedicalCondition[];
    consentRecords: ConsentRecord[];
  }): Lead | null => {
    const lead = leadService.getByToken(token);
    if (!lead) return null;

    return leadService.update(lead.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      age: data.age,
      gender: data.gender,
      preferredSlotId: data.preferredSlotId,
      medicalConditions: data.medicalConditions,
      consentRecords: data.consentRecords,
      isProfileComplete: true,
      completionToken: undefined, // Clear token after use
      completionTokenExpiry: undefined,
    });
  },

  // Regenerate completion token for a lead (when previous token expired)
  regenerateToken: (leadId: string): Lead | null => {
    const lead = leadService.getById(leadId);
    if (!lead || lead.isProfileComplete) return null;

    const token = leadService.generateCompletionToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + TRIAL_BOOKING_EXPIRY_DAYS);

    return leadService.update(leadId, {
      completionToken: token,
      completionTokenExpiry: expiryDate.toISOString(),
    });
  },

  // Generate the registration completion URL for a lead
  getRegistrationUrl: (lead: Lead): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/complete-registration/${lead.completionToken}`;
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    getAll: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getAll() as Promise<Lead[]>;
      }
      return getAll<Lead>(STORAGE_KEYS.LEADS);
    },

    getById: async (id: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getById(id) as Promise<Lead | null>;
      }
      return getById<Lead>(STORAGE_KEYS.LEADS, id);
    },

    create: async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
      if (isApiMode()) {
        return leadsApi.create(data as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) as Promise<Lead>;
      }
      return create<Lead>(STORAGE_KEYS.LEADS, data);
    },

    update: async (id: string, data: Partial<Lead>): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.update(id, data as Partial<Lead>) as Promise<Lead | null>;
      }
      return update<Lead>(STORAGE_KEYS.LEADS, id, data);
    },

    delete: async (id: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await leadsApi.delete(id);
        return result.deleted;
      }
      return remove<Lead>(STORAGE_KEYS.LEADS, id);
    },

    getByEmail: async (email: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getByEmail(email) as Promise<Lead | null>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.find(l => l.email.toLowerCase() === email.toLowerCase()) || null;
    },

    getByPhone: async (phone: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getByPhone(phone) as Promise<Lead | null>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.find(l => l.phone === phone) || null;
    },

    getByStatus: async (status: Lead['status']): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getByStatus(status) as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l => l.status === status);
    },

    getPending: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getPending() as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l =>
        ['new', 'contacted', 'trial-scheduled', 'follow-up', 'interested'].includes(l.status)
      );
    },

    // Get all unconverted leads (excludes leads with status 'converted')
    getUnconverted: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        // In API mode, filter on server or get all and filter
        const leads = await leadsApi.getAll() as Lead[];
        return leads.filter(l => l.status !== 'converted');
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      return leads.filter(l => l.status !== 'converted');
    },

    getForFollowUp: async (): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.getForFollowUp() as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      const today = new Date().toISOString().split('T')[0];
      return leads.filter(l =>
        l.nextFollowUpDate && l.nextFollowUpDate <= today &&
        !['converted', 'not-interested', 'lost'].includes(l.status)
      );
    },

    // Note: convertToMember is complex business logic that stays in frontend
    // In API mode, it uses the async service methods internally
    convertToMember: async (leadId: string): Promise<Member> => {
      if (isApiMode()) {
        const lead = await leadService.async.getById(leadId);
        if (!lead) throw new Error('Lead not found');

        if (lead.convertedToMemberId) {
          throw new Error('Lead already converted');
        }

        const existingMember = await memberService.async.getByEmail(lead.email);
        if (existingMember) {
          throw new Error('A member with this email already exists');
        }

        const emergencyContact = lead.emergencyContact || lead.emergencyPhone
          ? { name: lead.emergencyContact || '', phone: lead.emergencyPhone || '' }
          : undefined;

        const member = await memberService.async.create({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          whatsappNumber: lead.whatsappNumber,
          dateOfBirth: lead.dateOfBirth,
          age: lead.age,
          gender: lead.gender,
          address: lead.address,
          emergencyContact,
          medicalConditions: lead.medicalConditions,
          healthNotes: lead.healthNotes,
          consentRecords: lead.consentRecords,
          status: 'pending',
          source: 'lead-conversion',
          convertedFromLeadId: leadId,
          assignedSlotId: lead.preferredSlotId,
          classesAttended: 0,
          notes: lead.notes,
        });

        // Wait for member to be confirmed in database before updating lead
        // This handles database replication lag on shared hosting (Hostinger)
        const maxWaitAttempts = MAX_SUBSCRIPTION_SYNC_ATTEMPTS;
        let memberConfirmed = false;
        for (let attempt = 1; attempt <= maxWaitAttempts; attempt++) {
          const fetchedMember = await memberService.async.getById(member.id);
          if (fetchedMember) {
            memberConfirmed = true;
            break;
          }
          // Wait before next check (200ms, 400ms, 600ms... up to 2 seconds)
          await new Promise(resolve => setTimeout(resolve, BASE_RETRY_BACKOFF_MS * attempt));
        }

        if (!memberConfirmed) {
          throw new Error('Member creation timed out. Please try again.');
        }

        // Now safe to update lead with FK reference to member
        await leadService.async.update(leadId, {
          status: 'converted',
          convertedToMemberId: member.id,
          conversionDate: new Date().toISOString(),
        });

        // Also notify API about conversion for any server-side tracking
        await leadsApi.markConverted(leadId, member.id);

        return member;
      }
      // localStorage mode - use synchronous version
      return leadService.convertToMember(leadId);
    },

    search: async (query: string): Promise<Lead[]> => {
      if (isApiMode()) {
        return leadsApi.search(query) as Promise<Lead[]>;
      }
      const leads = getAll<Lead>(STORAGE_KEYS.LEADS);
      const lowerQuery = query.toLowerCase();
      return leads.filter(l =>
        l.firstName.toLowerCase().includes(lowerQuery) ||
        l.lastName.toLowerCase().includes(lowerQuery) ||
        l.email.toLowerCase().includes(lowerQuery) ||
        l.phone.includes(query)
      );
    },

    // Quick-add lead with completion token
    createQuick: async (data: {
      firstName: string;
      lastName: string;
      phone: string;
      gender: 'male' | 'female' | 'other';
      age?: number;
      preferredSlotId?: string;
    }): Promise<Lead> => {
      const token = leadService.generateCompletionToken();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + TRIAL_BOOKING_EXPIRY_DAYS);

      const leadData = {
        ...data,
        email: '',
        status: 'new' as const,
        source: 'whatsapp' as const,
        completionToken: token,
        completionTokenExpiry: expiryDate.toISOString(),
        isProfileComplete: false,
        medicalConditions: [],
        consentRecords: [],
      };

      if (isApiMode()) {
        return leadsApi.create(leadData) as Promise<Lead>;
      }
      return create<Lead>(STORAGE_KEYS.LEADS, leadData);
    },

    // Get lead by completion token (public - no auth required)
    getByToken: async (token: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.getByToken(token) as Promise<Lead | null>;
      }
      return leadService.getByToken(token);
    },

    // Regenerate completion token for a lead
    regenerateToken: async (leadId: string): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.regenerateToken(leadId) as Promise<Lead | null>;
      }
      return leadService.regenerateToken(leadId);
    },

    // Complete lead registration (public - token auth)
    completeRegistration: async (token: string, data: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      age?: number;
      gender?: 'male' | 'female' | 'other';
      preferredSlotId?: string;
      medicalConditions: MedicalCondition[];
      consentRecords: ConsentRecord[];
    }): Promise<Lead | null> => {
      if (isApiMode()) {
        return leadsApi.completeRegistration(token, data) as Promise<Lead | null>;
      }
      return leadService.completeRegistration(token, data);
    },
  },
};
