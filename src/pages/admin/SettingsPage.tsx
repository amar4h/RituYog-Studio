import { useState, FormEvent, useRef } from 'react';
import { Card, Button, Input, Textarea, Alert, Modal } from '../../components/common';
import { settingsService, authService, backupService } from '../../services';
import { formatDate } from '../../utils/dateUtils';
import type { Holiday, InvoiceTemplate } from '../../types';
import { DEFAULT_INVOICE_TEMPLATE, CURRENCY_SYMBOLS } from '../../constants';

// Extend default template with new QR fields for migration
const getDefaultTemplate = (): InvoiceTemplate => ({
  ...DEFAULT_INVOICE_TEMPLATE,
  showPaymentQR: false,
  paymentQRLabel: 'Scan to Pay',
});

export function SettingsPage() {
  const settings = settingsService.getOrDefault();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);

  const [studioData, setStudioData] = useState({
    studioName: settings.studioName,
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
  });

  // Logo state
  const [logoData, setLogoData] = useState<string | undefined>(settings.logoData);

  const [termsData, setTermsData] = useState({
    termsAndConditions: settings.termsAndConditions || '',
    healthDisclaimer: settings.healthDisclaimer || '',
  });

  // Invoice template state - merge with defaults to handle new fields
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>({
    ...getDefaultTemplate(),
    ...settings.invoiceTemplate,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Holiday management state
  const [holidays, setHolidays] = useState<Holiday[]>(settings.holidays || []);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    isRecurringYearly: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSaveStudio = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('studio');

    try {
      settingsService.updatePartial({
        studioName: studioData.studioName.trim(),
        address: studioData.address.trim() || undefined,
        phone: studioData.phone.trim() || undefined,
        email: studioData.email.trim() || undefined,
      });
      setSuccess('Studio information updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveTerms = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('terms');

    try {
      settingsService.updatePartial({
        termsAndConditions: termsData.termsAndConditions.trim(),
        healthDisclaimer: termsData.healthDisclaimer.trim(),
      });
      setSuccess('Terms and disclaimers updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveInvoiceTemplate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('invoice-template');

    try {
      settingsService.updatePartial({
        invoiceTemplate,
      });
      setSuccess('Invoice template updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice template');
    } finally {
      setLoading(null);
    }
  };

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
      // Verify current password
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

  // Holiday management functions
  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({ date: '', name: '', isRecurringYearly: false });
    setShowHolidayModal(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      date: holiday.date,
      name: holiday.name,
      isRecurringYearly: holiday.isRecurringYearly || false,
    });
    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = (holidayDate: string) => {
    const updatedHolidays = holidays.filter(h => h.date !== holidayDate);
    setHolidays(updatedHolidays);
    settingsService.updatePartial({ holidays: updatedHolidays });
    setSuccess('Holiday deleted successfully');
  };

  const handleSaveHoliday = () => {
    if (!holidayForm.date || !holidayForm.name.trim()) {
      setError('Please fill in both date and holiday name');
      return;
    }

    let updatedHolidays: Holiday[];

    if (editingHoliday) {
      // Update existing holiday
      updatedHolidays = holidays.map(h =>
        h.date === editingHoliday.date
          ? { date: holidayForm.date, name: holidayForm.name.trim(), isRecurringYearly: holidayForm.isRecurringYearly }
          : h
      );
    } else {
      // Check if holiday already exists for this date
      if (holidays.some(h => h.date === holidayForm.date)) {
        setError('A holiday already exists for this date');
        return;
      }
      // Add new holiday
      updatedHolidays = [
        ...holidays,
        { date: holidayForm.date, name: holidayForm.name.trim(), isRecurringYearly: holidayForm.isRecurringYearly },
      ].sort((a, b) => a.date.localeCompare(b.date));
    }

    setHolidays(updatedHolidays);
    settingsService.updatePartial({ holidays: updatedHolidays });
    setShowHolidayModal(false);
    setSuccess(editingHoliday ? 'Holiday updated successfully' : 'Holiday added successfully');
  };

  // Logo upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 500KB to keep localStorage reasonable)
    if (file.size > 500 * 1024) {
      setError('Logo file size must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setLogoData(base64Data);
      settingsService.updatePartial({ logoData: base64Data });
      setSuccess('Logo uploaded successfully');
    };
    reader.onerror = () => {
      setError('Failed to read logo file');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoData(undefined);
    settingsService.updatePartial({ logoData: undefined });
    setSuccess('Logo removed successfully');
  };

  // Payment QR code upload handler
  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      setError('QR code file size must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setInvoiceTemplate(prev => ({ ...prev, paymentQRData: base64Data }));
      setSuccess('Payment QR code uploaded successfully');
    };
    reader.onerror = () => {
      setError('Failed to read QR code file');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveQRCode = () => {
    setInvoiceTemplate(prev => ({ ...prev, paymentQRData: undefined }));
    setSuccess('Payment QR code removed');
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

  // Group holidays by year for display
  const holidaysByYear = holidays.reduce((acc, holiday) => {
    const year = holiday.date.substring(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your studio settings and preferences</p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}

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
            <Button type="submit" loading={loading === 'studio'}>
              Save Changes
            </Button>
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

      {/* Invoice Template Configuration */}
      <Card title="Invoice Template">
        <p className="text-sm text-gray-600 mb-4">
          Customize how your PDF invoices look. These settings control the layout and content of generated invoice PDFs.
        </p>
        <form onSubmit={handleSaveInvoiceTemplate} className="space-y-6">
          {/* Display Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Display Options</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={invoiceTemplate.showLogo}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, showLogo: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Show Logo</span>
                  <p className="text-xs text-gray-500">Display studio logo on invoice</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={invoiceTemplate.showStudioAddress}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, showStudioAddress: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Show Address</span>
                  <p className="text-xs text-gray-500">Include studio address</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={invoiceTemplate.showStudioPhone}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, showStudioPhone: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Show Phone</span>
                  <p className="text-xs text-gray-500">Include studio phone number</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={invoiceTemplate.showStudioEmail}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, showStudioEmail: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Show Email</span>
                  <p className="text-xs text-gray-500">Include studio email</p>
                </div>
              </label>
            </div>
          </div>

          {/* Payment QR Code */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Payment QR Code</h4>
            <p className="text-sm text-gray-500 mb-4">
              Upload a payment QR code (UPI, bank transfer, etc.) to display on invoices with unpaid balance.
            </p>

            <div className="flex items-start gap-6">
              {/* QR Preview */}
              <div className="flex-shrink-0">
                {invoiceTemplate.paymentQRData ? (
                  <div className="relative">
                    <img
                      src={invoiceTemplate.paymentQRData}
                      alt="Payment QR Code"
                      className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveQRCode}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Remove QR code"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* QR Upload Controls */}
              <div className="flex-1 space-y-3">
                <input
                  ref={qrCodeInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRCodeUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => qrCodeInputRef.current?.click()}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {invoiceTemplate.paymentQRData ? 'Change QR Code' : 'Upload QR Code'}
                </Button>
                <p className="text-xs text-gray-500">
                  Supported formats: PNG, JPG. Max size: 500KB. Use a clear, high-contrast QR code.
                </p>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 mt-2">
                  <input
                    type="checkbox"
                    checked={invoiceTemplate.showPaymentQR || false}
                    onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, showPaymentQR: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Show QR on Invoice</span>
                    <p className="text-xs text-gray-500">Display QR code on invoices with balance due</p>
                  </div>
                </label>

                <Input
                  label="QR Code Label"
                  value={invoiceTemplate.paymentQRLabel || ''}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, paymentQRLabel: e.target.value }))}
                  placeholder="e.g., Scan to Pay"
                  helperText="Text displayed below the QR code"
                />
              </div>
            </div>
          </div>

          {/* Text Customization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Input
              label="Header Text"
              value={invoiceTemplate.headerText || ''}
              onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, headerText: e.target.value }))}
              placeholder="e.g., INVOICE, TAX INVOICE"
              helperText="Main header displayed on invoice"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency Symbol
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={invoiceTemplate.currencySymbol || '₹'}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, currencySymbol: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {CURRENCY_SYMBOLS.map((currency) => (
                    <option key={currency.code} value={currency.symbol}>
                      {currency.symbol} - {currency.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={invoiceTemplate.currencySymbol || '₹'}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, currencySymbol: e.target.value }))}
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
                  placeholder="₹"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Select or enter custom currency symbol</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={invoiceTemplate.accentColor}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={invoiceTemplate.accentColor}
                  onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="#4F46E5"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Color used for highlights and accents</p>
            </div>
          </div>

          <Textarea
            label="Footer Text"
            value={invoiceTemplate.footerText || ''}
            onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, footerText: e.target.value }))}
            rows={2}
            placeholder="e.g., Thank you for your business!"
            helperText="Message displayed at the bottom of the invoice"
          />

          <Textarea
            label="Terms & Conditions (Invoice)"
            value={invoiceTemplate.termsText || ''}
            onChange={(e) => setInvoiceTemplate(prev => ({ ...prev, termsText: e.target.value }))}
            rows={3}
            placeholder="e.g., Payment is due within 7 days of invoice date."
            helperText="Terms shown on the invoice (separate from membership terms)"
          />

          <div className="flex gap-3">
            <Button type="submit" loading={loading === 'invoice-template'}>
              Save Invoice Template
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvoiceTemplate(getDefaultTemplate())}
            >
              Reset to Default
            </Button>
          </div>
        </form>
      </Card>

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
            <Button type="submit" loading={loading === 'password'}>
              Change Password
            </Button>
          </form>
        </Card>
      </div>

      {/* Holiday Management */}
      <Card
        title="Studio Holidays"
        actions={
          <Button size="sm" onClick={handleAddHoliday}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Holiday
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Configure public holidays and days when the studio is closed. Trial bookings will not be available on these days.
        </p>

        {Object.keys(holidaysByYear).length === 0 ? (
          <p className="text-gray-500 text-center py-4">No holidays configured</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(holidaysByYear).sort().map(year => (
              <div key={year}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{year}</h4>
                <div className="space-y-2">
                  {holidaysByYear[year].map(holiday => (
                    <div
                      key={holiday.date}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{holiday.name}</span>
                        <span className="text-gray-500 ml-2 text-sm">
                          {formatDate(holiday.date)}
                        </span>
                        {holiday.isRecurringYearly && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditHoliday(holiday)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteHoliday(holiday.date)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Terms & Conditions */}
      <Card title="Terms & Disclaimers">
        <form onSubmit={handleSaveTerms} className="space-y-4">
          <Textarea
            label="Terms and Conditions"
            value={termsData.termsAndConditions}
            onChange={(e) => setTermsData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
            rows={6}
            helperText="These terms will be shown to members during registration (supports Markdown)"
          />
          <Textarea
            label="Health Disclaimer"
            value={termsData.healthDisclaimer}
            onChange={(e) => setTermsData(prev => ({ ...prev, healthDisclaimer: e.target.value }))}
            rows={4}
            helperText="Health-related disclaimer for yoga practice (supports Markdown)"
          />
          <Button type="submit" loading={loading === 'terms'}>
            Save Terms
          </Button>
        </form>
      </Card>

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
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Storage:</strong> Local Browser Storage</p>
          <p className="text-xs mt-4">
            All data is stored locally in your browser. Data will persist as long as
            you don't clear your browser data. Regular backups are recommended.
          </p>
        </div>
      </Card>

      {/* Holiday Modal */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowHolidayModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveHoliday}>
              {editingHoliday ? 'Update' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={holidayForm.date}
            onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
            required
          />
          <Input
            label="Holiday Name"
            value={holidayForm.name}
            onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Diwali, Independence Day"
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={holidayForm.isRecurringYearly}
              onChange={(e) => setHolidayForm(prev => ({ ...prev, isRecurringYearly: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Recurring yearly (for fixed-date holidays like Independence Day, Republic Day)
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
