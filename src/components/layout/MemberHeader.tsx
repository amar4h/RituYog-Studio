import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { settingsService, memberService, subscriptionService } from '../../services';

export function MemberHeader() {
  const { member, logout, isAdminViewing, selectMember } = useMemberAuth();
  const settings = settingsService.getOrDefault();
  const navigate = useNavigate();

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Get members with active/recent subscriptions for the selector
  const members = useMemo(() => {
    if (!isAdminViewing) return [];
    const subs = subscriptionService.getAll().filter(
      s => (s.status === 'active' || s.status === 'expired') && s.startDate <= today
    );
    const memberIds = [...new Set(subs.map(s => s.memberId))];
    return memberIds
      .map(id => memberService.getById(id))
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [isAdminViewing, today]);

  const handleBackToAdmin = () => {
    selectMember(null);
    navigate('/admin/dashboard');
  };

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="max-w-lg mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2 min-w-0">
          {settings.logoData && (
            <a href={settings.website || '/'}>
              <img src={settings.logoData} alt="" className="h-8 w-8 rounded flex-shrink-0" />
            </a>
          )}
          {isAdminViewing ? (
            <select
              value={member?.id || ''}
              onChange={(e) => selectMember(e.target.value || null)}
              className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-lg px-2 py-1.5 min-w-0 max-w-[180px] focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium text-gray-900 truncate">
              {member ? `${member.firstName} ${member.lastName}` : 'Member Portal'}
            </span>
          )}
        </div>

        {isAdminViewing ? (
          <button
            onClick={handleBackToAdmin}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Admin
          </button>
        ) : (
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
