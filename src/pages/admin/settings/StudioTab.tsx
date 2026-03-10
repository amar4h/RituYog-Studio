import { useState, useRef, FormEvent } from 'react';
import { Card, Button, Input } from '../../../components/common';
import { settingsService } from '../../../services';
import type { SettingsTabProps } from './types';

export function StudioTab({ setError, setSuccess, success, loading, setLoading }: SettingsTabProps) {
  const settings = settingsService.getOrDefault();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [studioData, setStudioData] = useState({
    studioName: settings.studioName,
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    website: settings.website || '',
    googleReviewUrl: settings.googleReviewUrl || '',
  });

  const [dashboardPrefs, setDashboardPrefs] = useState({
    showRevenue: settings.dashboardShowRevenue ?? false,
    showChart: settings.dashboardShowChart ?? true,
  });

  const [logoData, setLogoData] = useState<string | undefined>(settings.logoData);

  const handleSaveStudio = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('studio');

    try {
      await settingsService.updatePartialAsync({
        studioName: studioData.studioName.trim(),
        address: studioData.address.trim() || undefined,
        phone: studioData.phone.trim() || undefined,
        email: studioData.email.trim() || undefined,
        website: studioData.website.trim() || undefined,
        googleReviewUrl: studioData.googleReviewUrl.trim() || undefined,
      });
      setSuccess('Studio information saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings to database');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveDashboardPrefs = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('dashboard-prefs');

    try {
      await settingsService.updatePartialAsync({
        dashboardShowRevenue: dashboardPrefs.showRevenue,
        dashboardShowChart: dashboardPrefs.showChart,
      });
      setSuccess('Dashboard preferences saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dashboard preferences to database');
    } finally {
      setLoading(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      setError('Logo file size must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setLogoData(base64Data);
      try {
        await settingsService.updatePartialAsync({ logoData: base64Data });
        setSuccess('Logo uploaded and saved to database');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save logo to database');
      }
    };
    reader.onerror = () => {
      setError('Failed to read logo file');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    setLogoData(undefined);
    try {
      await settingsService.updatePartialAsync({ logoData: undefined });
      setSuccess('Logo removed and saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Studio Information */}
      <Card title="Studio Information">
        <form onSubmit={handleSaveStudio} className="space-y-4">
          <Input
            label="Studio Name"
            value={studioData.studioName}
            onChange={(e) => setStudioData(prev => ({ ...prev, studioName: e.target.value }))}
            required
          />
          <Input
            label="Address"
            value={studioData.address}
            onChange={(e) => setStudioData(prev => ({ ...prev, address: e.target.value }))}
          />
          <Input
            label="Phone"
            value={studioData.phone}
            onChange={(e) => setStudioData(prev => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={studioData.email}
            onChange={(e) => setStudioData(prev => ({ ...prev, email: e.target.value }))}
          />
          <Input
            label="Website URL"
            type="url"
            value={studioData.website}
            onChange={(e) => setStudioData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://www.example.com"
          />
          <p className="text-xs text-gray-500 -mt-2">
            Clicking the logo in the sidebar will open this website in a new tab.
          </p>
          <Input
            label="Google Review URL"
            type="url"
            value={studioData.googleReviewUrl}
            onChange={(e) => setStudioData(prev => ({ ...prev, googleReviewUrl: e.target.value }))}
            placeholder="https://g.page/r/..."
          />
          <p className="text-xs text-gray-500 -mt-2">
            Used in Google Review Request notification template.
          </p>
          <div className="flex gap-3 items-center">
            <Button type="submit" loading={loading === 'studio'}>
              Save Changes
            </Button>
            {success === 'Studio information updated successfully' && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Studio Logo */}
      <Card title="Studio Logo">
        <p className="text-sm text-gray-600 mb-4">
          Upload your studio logo to brand the application. Logo will appear in the header and public pages.
        </p>

        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            {logoData ? (
              <div className="relative">
                <img
                  src={logoData}
                  alt="Studio Logo"
                  className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Remove logo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {logoData ? 'Change Logo' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-gray-500">
              Recommended: Square image (e.g., 200x200px). Max size: 500KB.
              Supported formats: PNG, JPG, SVG.
            </p>
          </div>
        </div>
      </Card>
    </div>

    {/* Dashboard Preferences */}
    <Card title="Dashboard Preferences">
      <p className="text-sm text-gray-600 mb-4">
        Configure default visibility settings for dashboard tiles. These control whether certain tiles are expanded or collapsed when loading the dashboard.
      </p>
      <form onSubmit={handleSaveDashboardPrefs} className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={dashboardPrefs.showRevenue}
              onChange={(e) => setDashboardPrefs(prev => ({ ...prev, showRevenue: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Show Revenue on Load</span>
              <p className="text-xs text-gray-500">Display "This Month" revenue tile expanded by default</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={dashboardPrefs.showChart}
              onChange={(e) => setDashboardPrefs(prev => ({ ...prev, showChart: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Show Chart on Load</span>
              <p className="text-xs text-gray-500">Display "Invoice & Payments" chart expanded by default</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 items-center">
          <Button type="submit" loading={loading === 'dashboard-prefs'}>
            Save Preferences
          </Button>
          {success === 'Dashboard preferences saved to database' && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
        </div>
      </form>
    </Card>
    </>
  );
}
