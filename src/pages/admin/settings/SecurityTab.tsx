import { useState, FormEvent } from 'react';
import { Card, Button, Input, Alert } from '../../../components/common';
import { settingsService, authService, backupService } from '../../../services';
import type { SettingsTabProps } from './types';

export function SecurityTab({ error, setError, setSuccess, success, loading, setLoading }: SettingsTabProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading('password');

    try {
      const currentSettings = settingsService.getOrDefault();
      const adminPassword = currentSettings.adminPassword || 'admin123';

      if (passwordData.currentPassword !== adminPassword) {
        setError('Current password is incorrect');
        setLoading(null);
        return;
      }

      authService.changePassword(passwordData.newPassword);
      setSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(null);
    }
  };

  const handleExportData = () => {
    try {
      const backup = backupService.exportAll();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yoga-studio-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Data exported successfully');
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        backupService.importAll(content);
        setSuccess('Data imported successfully. Please refresh the page.');
      } catch (err) {
        setError('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Suppress unused variable warning - error is used by parent for display
  void error;

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Change Password */}
      <Card title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            helperText="Minimum 6 characters"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />
          <div className="flex gap-3 items-center">
            <Button type="submit" loading={loading === 'password'}>
              Change Password
            </Button>
            {success === 'Password changed successfully' && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Changed!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>

    {/* Data Management */}
    <Card title="Data Management">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Export all your data as a backup or import data from a previous backup.
          All data is stored locally in your browser.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={handleExportData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data
          </Button>

          <label className="cursor-pointer">
            <span className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Data
            </span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportData}
            />
          </label>
        </div>

        <Alert variant="warning">
          <strong>Warning:</strong> Importing data will replace all existing data.
          Make sure to export a backup first.
        </Alert>
      </div>
    </Card>

    {/* Application Info */}
    <Card title="About">
      <div className="space-y-2 text-sm text-gray-600">
        <p><strong>Application:</strong> Yoga Studio Management</p>
        <p><strong>Version:</strong> {__APP_VERSION__}</p>
        <p><strong>Storage:</strong> Local Browser Storage / API</p>
        <p className="text-xs mt-4">
          Data is stored locally in your browser and synced to the database when using API mode.
          Regular backups are recommended.
        </p>
      </div>
    </Card>
    </>
  );
}
