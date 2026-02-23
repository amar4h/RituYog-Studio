import { useContext } from 'react';
import { MemberAuthContext } from '../contexts/MemberAuthContext';

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);

  if (!context) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }

  return context;
}
