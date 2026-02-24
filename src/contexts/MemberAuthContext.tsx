import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { memberAuthService, memberService } from '../services';
import { useAuth } from '../hooks/useAuth';
import type { Member } from '../types';

interface MemberCandidate {
  id: string;
  firstName: string;
  lastName: string;
}

interface MemberAuthContextType {
  isAuthenticated: boolean;
  memberId: string | null;
  member: Member | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string; candidates?: MemberCandidate[] }>;
  loginAsCandidate: (memberId: string) => void;
  logout: () => void;
  refreshMember: () => void;
  // Admin viewing support
  isAdminViewing: boolean;
  selectMember: (memberId: string | null) => void;
  // Multi-member (family) support
  familyMembers: MemberCandidate[];
  switchMember: (memberId: string) => void;
}

export const MemberAuthContext = createContext<MemberAuthContextType | null>(null);

interface MemberAuthProviderProps {
  children: ReactNode;
}

export function MemberAuthProvider({ children }: MemberAuthProviderProps) {
  const [memberAuthenticated, setMemberAuthenticated] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminViewing, setIsAdminViewing] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<MemberCandidate[]>([]);

  // Reactively read admin auth state via context (re-renders when admin logs in/out)
  const { isAuthenticated: adminAuthenticated } = useAuth();

  useEffect(() => {
    const authenticated = memberAuthService.isAuthenticated();
    const id = memberAuthService.getAuthenticatedMemberId();
    setMemberAuthenticated(authenticated);
    setMemberId(id);
    if (authenticated && id) {
      const m = memberService.getById(id);
      setMember(m);
      // Check if there are family members (same phone)
      if (m?.phone) {
        const allMembers = memberService.getAll();
        const family = allMembers.filter(
          fm => fm.phone === m.phone && fm.id !== m.id
        );
        if (family.length > 0) {
          setFamilyMembers([
            { id: m.id, firstName: m.firstName, lastName: m.lastName },
            ...family.map(fm => ({ id: fm.id, firstName: fm.firstName, lastName: fm.lastName })),
          ]);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    const result = await memberAuthService.login(phone, password);
    if (result.success && result.memberId) {
      setMemberAuthenticated(true);
      setMemberId(result.memberId);
      const m = memberService.getById(result.memberId);
      setMember(m);
      // Check for family members after single-member login
      if (m?.phone) {
        const allMembers = memberService.getAll();
        const family = allMembers.filter(
          fm => fm.phone === m.phone && fm.id !== m.id
        );
        if (family.length > 0) {
          setFamilyMembers([
            { id: m.id, firstName: m.firstName, lastName: m.lastName },
            ...family.map(fm => ({ id: fm.id, firstName: fm.firstName, lastName: fm.lastName })),
          ]);
        }
      }
    }
    return result;
  };

  // Complete login after picking from candidate list
  const loginAsCandidate = useCallback((selectedMemberId: string) => {
    memberAuthService.loginAsMember(selectedMemberId);
    setMemberAuthenticated(true);
    setMemberId(selectedMemberId);
    const m = memberService.getById(selectedMemberId);
    setMember(m);
    // Restore family members list for switching later
    if (m?.phone) {
      const allMembers = memberService.getAll();
      const family = allMembers.filter(
        fm => fm.phone === m.phone
      );
      if (family.length > 1) {
        setFamilyMembers(family.map(fm => ({ id: fm.id, firstName: fm.firstName, lastName: fm.lastName })));
      }
    }
  }, []);

  // Switch between family members without re-login
  const switchMember = useCallback((newMemberId: string) => {
    memberAuthService.loginAsMember(newMemberId);
    setMemberId(newMemberId);
    const m = memberService.getById(newMemberId);
    setMember(m);
  }, []);

  const logout = () => {
    memberAuthService.logout();
    setMemberAuthenticated(false);
    setMemberId(null);
    setMember(null);
    setIsAdminViewing(false);
    setFamilyMembers([]);
  };

  // Re-read member from localStorage (called after useFreshData syncs members)
  const refreshMember = useCallback(() => {
    const id = memberId || memberAuthService.getAuthenticatedMemberId();
    if (id) {
      const m = memberService.getById(id);
      if (m) {
        setMember(m);
        setMemberId(id);
        // Re-check for family members now that data is synced
        if (m.phone) {
          const allMembers = memberService.getAll();
          const family = allMembers.filter(
            fm => fm.phone === m.phone && fm.id !== m.id
          );
          if (family.length > 0) {
            setFamilyMembers([
              { id: m.id, firstName: m.firstName, lastName: m.lastName },
              ...family.map(fm => ({ id: fm.id, firstName: fm.firstName, lastName: fm.lastName })),
            ]);
          }
        }
      }
    }
  }, [memberId]);

  // Allow admin to enter viewing mode and select a member
  const selectMember = useCallback((id: string | null) => {
    if (id) {
      const m = memberService.getById(id);
      setMember(m);
      setMemberId(id);
      setIsAdminViewing(true);
      setMemberAuthenticated(true);
    } else {
      setMember(null);
      setMemberId(null);
    }
  }, []);

  const isAdmin = adminAuthenticated && !memberAuthenticated;

  return (
    <MemberAuthContext.Provider value={{
      isAuthenticated: memberAuthenticated || adminAuthenticated,
      memberId,
      member,
      isLoading,
      login,
      loginAsCandidate,
      logout,
      refreshMember,
      isAdminViewing: isAdminViewing || isAdmin,
      selectMember,
      familyMembers,
      switchMember,
    }}>
      {children}
    </MemberAuthContext.Provider>
  );
}
