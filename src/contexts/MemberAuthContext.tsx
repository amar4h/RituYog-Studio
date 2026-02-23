import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { memberAuthService, memberService } from '../services';
import { useAuth } from '../hooks/useAuth';
import type { Member } from '../types';

interface MemberAuthContextType {
  isAuthenticated: boolean;
  memberId: string | null;
  member: Member | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshMember: () => void;
  // Admin viewing support
  isAdminViewing: boolean;
  selectMember: (memberId: string | null) => void;
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
    }
    return result;
  };

  const logout = () => {
    memberAuthService.logout();
    setMemberAuthenticated(false);
    setMemberId(null);
    setMember(null);
    setIsAdminViewing(false);
  };

  // Re-read member from localStorage (called after useFreshData syncs members)
  const refreshMember = useCallback(() => {
    const id = memberId || memberAuthService.getAuthenticatedMemberId();
    if (id) {
      const m = memberService.getById(id);
      if (m) {
        setMember(m);
        setMemberId(id);
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
      logout,
      refreshMember,
      isAdminViewing: isAdminViewing || isAdmin,
      selectMember,
    }}>
      {children}
    </MemberAuthContext.Provider>
  );
}
