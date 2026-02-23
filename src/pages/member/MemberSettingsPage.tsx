import { useState, useEffect, FormEvent } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { memberAuthService, slotService, subscriptionService } from '../../services';
import { Card } from '../../components/common/Card';
import { PageLoading } from '../../components/common/LoadingSpinner';

export function MemberSettingsPage() {
  const { member, memberId, logout, refreshMember } = useMemberAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { isLoading } = useFreshData(['members', 'subscriptions']);

  // After API data loads, refresh member from localStorage (fixes race condition)
  useEffect(() => {
    if (!isLoading && !member && memberId) {
      refreshMember();
    }
  }, [isLoading, member, memberId, refreshMember]);

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
      <h1 className="text-lg font-bold text-gray-900">Settings</h1>

      {/* Profile info */}
      <Card>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Profile</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-900">{member?.firstName} {member?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="text-gray-900">{member?.phone}</span>
            </div>
            {member?.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 break-all text-right ml-4">{member.email}</span>
              </div>
            )}
            {slot && (
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="text-gray-900">{slot.displayName}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Change Password</h2>

          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">{success}</div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </Card>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200"
      >
        Logout
      </button>
    </div>
  );
}
