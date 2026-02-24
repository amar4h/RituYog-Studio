import { useState, useEffect, FormEvent } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { memberAuthService, slotService, subscriptionService } from '../../services';
import { Card } from '../../components/common/Card';
import { PageLoading } from '../../components/common/LoadingSpinner';

export function MemberSettingsPage() {
  const { member, memberId, logout, refreshMember, familyMembers, switchMember } = useMemberAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { isLoading } = useFreshData(['members', 'subscriptions']);

  // After API data loads, refresh member + check family members
  useEffect(() => {
    if (!isLoading && memberId) {
      refreshMember();
    }
  }, [isLoading, memberId, refreshMember]);

  // Get slot display name
  const activeSub = subscriptionService.getAll().find(
    s => s.memberId === memberId && s.status === 'active'
  );
  const slot = activeSub?.slotId ? slotService.getById(activeSub.slotId) : null;

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!memberId) return;

    setLoading(true);
    const result = await memberAuthService.changePassword(memberId, currentPassword, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Password change failed');
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
      </div>

      {/* Family member switcher */}
      {familyMembers.length > 1 && (
        <Card>
          <div className="p-4">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Switch Account</h2>
            <div className="space-y-2">
              {familyMembers.map(fm => (
                <button
                  key={fm.id}
                  onClick={() => switchMember(fm.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                    fm.id === memberId
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                      : 'bg-gray-50/80 border border-gray-200/80 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    fm.id === memberId
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {fm.firstName[0]}{fm.lastName[0]}
                  </div>
                  <span className={`text-sm font-medium ${fm.id === memberId ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {fm.firstName} {fm.lastName}
                  </span>
                  {fm.id === memberId && (
                    <span className="ml-auto text-xs text-indigo-500 font-medium">Current</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Profile info */}
      <Card>
        <div className="p-4">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Profile</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span className="text-gray-500 text-xs">Name</span>
              <span className="text-gray-900 font-medium">{member?.firstName} {member?.lastName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span className="text-gray-500 text-xs">Phone</span>
              <span className="text-gray-900">{member?.phone}</span>
            </div>
            {member?.email && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                <span className="text-gray-500 text-xs">Email</span>
                <span className="text-gray-900 break-all">{member.email}</span>
              </div>
            )}
            {slot && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                <span className="text-gray-500 text-xs">Batch</span>
                <span className="text-gray-900">{slot.displayName}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <div className="p-4">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Security</h2>

          {error && (
            <div className="mb-3 p-2 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-3 p-2 bg-green-50/80 border border-green-200 rounded-xl text-xs text-green-700">{success}</div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </Card>

      {/* Logout */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3 bg-red-50/80 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 border border-red-200 active:scale-[0.98] transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
