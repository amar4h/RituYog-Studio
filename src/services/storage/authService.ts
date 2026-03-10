/**
 * Auth Service + Member Auth Service
 * Dual-mode: localStorage (default) or API
 */

import {
  isApiMode,
  authApi,
  memberAuthApi,
  getMemberSession,
  saveMemberSession,
  clearMemberSession,
} from '../api';
import type { Member } from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll } from './helpers';
import { settingsService } from './settingsService';
import { memberService } from './memberService';

// ============================================
// AUTH SERVICE
// ============================================

interface AuthState {
  isAuthenticated: boolean;
  loginTime: string;
}

export const authService = {
  login: (password: string): boolean => {
    const settings = settingsService.getOrDefault();
    const adminPassword = settings.adminPassword || 'admin123';

    if (password === adminPassword) {
      const authState: AuthState = {
        isAuthenticated: true,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authState));
      return true;
    }
    return false;
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },

  isAuthenticated: (): boolean => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!data) return false;
      const auth: AuthState = JSON.parse(data);
      return auth.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  changePassword: (newPassword: string): void => {
    settingsService.updatePartial({ adminPassword: newPassword });
  },

  // ============================================
  // ASYNC METHODS - Dual-mode support
  // ============================================
  async: {
    login: async (password: string): Promise<boolean> => {
      if (isApiMode()) {
        return authApi.login(password);
      }
      return authService.login(password);
    },

    logout: async (): Promise<void> => {
      if (isApiMode()) {
        await authApi.logout();
        return;
      }
      authService.logout();
    },

    isAuthenticated: async (): Promise<boolean> => {
      if (isApiMode()) {
        return authApi.check();
      }
      return authService.isAuthenticated();
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (isApiMode()) {
        const result = await authApi.changePassword(currentPassword, newPassword);
        return result.success;
      }
      // localStorage mode - verify current password first
      const settings = settingsService.getOrDefault();
      if (settings.adminPassword !== currentPassword && currentPassword !== 'admin123') {
        return false;
      }
      authService.changePassword(newPassword);
      return true;
    },
  },
};

// ============================================
// MEMBER AUTH SERVICE
// ============================================

interface MemberAuthState {
  isAuthenticated: boolean;
  memberId: string;
  loginTime: string;
}

export const memberAuthService = {
  hashPassword: async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Record login audit: update lastLogin timestamp and increment loginCount
  // In API mode, this is handled server-side in member-auth.php login()
  _recordLoginAudit: (memberId: string): void => {
    if (!isApiMode()) {
      const now = new Date().toISOString();
      const member = memberService.getById(memberId);
      if (member) {
        memberService.update(memberId, {
          lastLogin: now,
          loginCount: (member.loginCount || 0) + 1,
        });
      }
    }
  },

  login: async (phone: string, password: string): Promise<{ success: boolean; memberId?: string; error?: string; candidates?: Array<{ id: string; firstName: string; lastName: string }> }> => {
    if (isApiMode()) {
      try {
        // Send SHA-256 hash to match what setPassword stores (bcrypt of SHA-256)
        const hash = await memberAuthService.hashPassword(password);
        const result = await memberAuthApi.login(phone, hash);
        if (result.authenticated && result.memberId) {
          const authState: MemberAuthState = {
            isAuthenticated: true,
            memberId: result.memberId,
            loginTime: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEYS.MEMBER_AUTH, JSON.stringify(authState));
          saveMemberSession({
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt,
          });
          memberAuthService._recordLoginAudit(result.memberId);
          return { success: true, memberId: result.memberId };
        }
        return { success: false, error: 'Invalid phone number or password' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
      }
    }

    // localStorage mode — find ALL members matching this phone with a password set
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    const matchingMembers = members.filter(m => m.phone === phone && m.passwordHash);
    if (matchingMembers.length === 0) {
      return { success: false, error: 'Invalid phone number or password' };
    }

    const hash = await memberAuthService.hashPassword(password);
    // Verify password against first member (family members share the same password)
    if (hash !== matchingMembers[0].passwordHash) {
      return { success: false, error: 'Invalid phone number or password' };
    }

    // Filter to only members whose password matches (in case of mixed passwords)
    const validMembers = matchingMembers.filter(m => m.passwordHash === hash);

    // Multiple members with same phone + password → return candidates for picker
    if (validMembers.length > 1) {
      return {
        success: false,
        candidates: validMembers.map(m => ({ id: m.id, firstName: m.firstName, lastName: m.lastName })),
      };
    }

    // Single member — login directly
    const authState: MemberAuthState = {
      isAuthenticated: true,
      memberId: validMembers[0].id,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.MEMBER_AUTH, JSON.stringify(authState));
    memberAuthService._recordLoginAudit(validMembers[0].id);
    return { success: true, memberId: validMembers[0].id };
  },

  // Complete login for a specific member (used after candidate picker)
  loginAsMember: (memberId: string): void => {
    const authState: MemberAuthState = {
      isAuthenticated: true,
      memberId,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.MEMBER_AUTH, JSON.stringify(authState));
    memberAuthService._recordLoginAudit(memberId);
  },

  logout: (): void => {
    if (isApiMode()) {
      const session = getMemberSession();
      if (session) {
        memberAuthApi.logout(session.sessionToken).catch(() => {});
      }
      clearMemberSession();
    }
    localStorage.removeItem(STORAGE_KEYS.MEMBER_AUTH);
  },

  isAuthenticated: (): boolean => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBER_AUTH);
      if (!data) return false;
      const auth: MemberAuthState = JSON.parse(data);
      return auth.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  getAuthenticatedMemberId: (): string | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBER_AUTH);
      if (!data) return null;
      const auth: MemberAuthState = JSON.parse(data);
      return auth.isAuthenticated ? auth.memberId : null;
    } catch {
      return null;
    }
  },

  activateAccount: async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (isApiMode()) {
      try {
        const hash = await memberAuthService.hashPassword(password);
        await memberAuthApi.activate(phone, hash);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Activation failed' };
      }
    }

    // localStorage mode — find ALL members matching this phone
    const members = getAll<Member>(STORAGE_KEYS.MEMBERS);
    const matchingMembers = members.filter(m => m.phone === phone);
    if (matchingMembers.length === 0) {
      return { success: false, error: 'No member found with this phone number. Please contact your studio.' };
    }
    // Check if ANY already activated
    if (matchingMembers.every(m => m.passwordHash)) {
      return { success: false, error: 'Account already activated. Please use Login.' };
    }
    // Set password for ALL members with this phone (family members share password)
    const hash = await memberAuthService.hashPassword(password);
    for (const m of matchingMembers) {
      if (!m.passwordHash) {
        memberService.update(m.id, { passwordHash: hash });
      }
    }
    return { success: true };
  },

  setPassword: async (memberId: string, password: string): Promise<void> => {
    if (isApiMode()) {
      const hash = await memberAuthService.hashPassword(password);
      await memberAuthApi.setPassword(memberId, hash);
      return;
    }
    const hash = await memberAuthService.hashPassword(password);
    memberService.update(memberId, { passwordHash: hash });
  },

  adminResetPassword: async (memberId: string, newPassword: string): Promise<void> => {
    await memberAuthService.setPassword(memberId, newPassword);
  },

  clearPassword: async (memberId: string): Promise<void> => {
    if (isApiMode()) {
      await memberAuthApi.clearPassword(memberId);
      return;
    }
    memberService.update(memberId, { passwordHash: undefined });
  },

  changePassword: async (memberId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (isApiMode()) {
      try {
        // Send SHA-256 hashes to match what's stored (bcrypt of SHA-256)
        const currentHash = await memberAuthService.hashPassword(currentPassword);
        const newHash = await memberAuthService.hashPassword(newPassword);
        await memberAuthApi.changePassword(memberId, currentHash, newHash);
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Password change failed' };
      }
    }

    // localStorage mode - verify current password
    const member = memberService.getById(memberId);
    if (!member?.passwordHash) {
      return { success: false, error: 'No password set' };
    }
    const currentHash = await memberAuthService.hashPassword(currentPassword);
    if (currentHash !== member.passwordHash) {
      return { success: false, error: 'Current password is incorrect' };
    }
    const newHash = await memberAuthService.hashPassword(newPassword);
    memberService.update(memberId, { passwordHash: newHash });
    return { success: true };
  },
};
