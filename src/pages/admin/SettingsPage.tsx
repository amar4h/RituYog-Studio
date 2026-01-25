import { useState, FormEvent, useRef } from 'react';
import { Card, Button, Input, Textarea, Alert, Modal, StatusBadge } from '../../components/common';
import { settingsService, authService, backupService, membershipPlanService } from '../../services';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';
import type { Holiday, InvoiceTemplate, WhatsAppTemplates, MembershipPlan } from '../../types';
import { DEFAULT_INVOICE_TEMPLATE, CURRENCY_SYMBOLS, DEFAULT_WHATSAPP_TEMPLATES, WHATSAPP_PLACEHOLDERS } from '../../constants';

// Tab definitions
type SettingsTab = 'studio' | 'memberships' | 'invoices' | 'whatsapp' | 'holidays' | 'legal' | 'security';

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'studio',
    label: 'Studio',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'memberships',
    label: 'Our Plans',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: 'holidays',
    label: 'Holidays',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

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

  // Active tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('studio');

  const [studioData, setStudioData] = useState({
    studioName: settings.studioName,
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    website: settings.website || '',
  });

  // Invoice numbering state
  const [invoiceNumbering, setInvoiceNumbering] = useState({
    invoicePrefix: settings.invoicePrefix || 'INV',
    receiptPrefix: settings.receiptPrefix || 'RCP',
    invoiceStartNumber: settings.invoiceStartNumber || 1,
    receiptStartNumber: settings.receiptStartNumber || 1,
  });

  // Dashboard preferences state
  const [dashboardPrefs, setDashboardPrefs] = useState({
    showRevenue: settings.dashboardShowRevenue ?? false,
    showChart: settings.dashboardShowChart ?? true,
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

  // WhatsApp templates state - with migration from old structure
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplates>(() => {
    const saved = settings.whatsappTemplates;
    if (!saved) return DEFAULT_WHATSAPP_TEMPLATES;

    // Migrate old structure (single objects) to new structure (arrays)
    // Old: renewalReminder (object), leadFollowUp (object)
    // New: renewalReminders (array), leadFollowUps (array)
    const oldSaved = saved as any;

    return {
      renewalReminders: Array.isArray(saved.renewalReminders)
        ? saved.renewalReminders
        : oldSaved.renewalReminder
          ? [oldSaved.renewalReminder]
          : DEFAULT_WHATSAPP_TEMPLATES.renewalReminders,
      classReminder: saved.classReminder || DEFAULT_WHATSAPP_TEMPLATES.classReminder,
      paymentConfirmation: saved.paymentConfirmation || DEFAULT_WHATSAPP_TEMPLATES.paymentConfirmation,
      leadFollowUps: Array.isArray(saved.leadFollowUps)
        ? saved.leadFollowUps
        : oldSaved.leadFollowUp
          ? [oldSaved.leadFollowUp]
          : DEFAULT_WHATSAPP_TEMPLATES.leadFollowUps,
    };
  });

  // Membership plans state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    type: 'monthly' as MembershipPlan['type'],
    price: 0,
    durationMonths: 1,
    description: '',
    isActive: true,
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
      // Use async version that waits for database save
      await settingsService.updatePartialAsync({
        studioName: studioData.studioName.trim(),
        address: studioData.address.trim() || undefined,
        phone: studioData.phone.trim() || undefined,
        email: studioData.email.trim() || undefined,
        website: studioData.website.trim() || undefined,
      });
      setSuccess('Studio information saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings to database');
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
      await settingsService.updatePartialAsync({
        termsAndConditions: termsData.termsAndConditions.trim(),
        healthDisclaimer: termsData.healthDisclaimer.trim(),
      });
      setSuccess('Terms and disclaimers saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings to database');
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
      await settingsService.updatePartialAsync({
        invoiceTemplate,
      });
      setSuccess('Invoice template saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice template to database');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveWhatsAppTemplates = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('whatsapp-templates');

    try {
      await settingsService.updatePartialAsync({
        whatsappTemplates,
      });
      setSuccess('WhatsApp templates saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save WhatsApp templates to database');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveInvoiceNumbering = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading('invoice-numbering');

    try {
      await settingsService.updatePartialAsync({
        invoicePrefix: invoiceNumbering.invoicePrefix.trim().toUpperCase() || 'INV',
        receiptPrefix: invoiceNumbering.receiptPrefix.trim().toUpperCase() || 'RCP',
        invoiceStartNumber: invoiceNumbering.invoiceStartNumber || 1,
        receiptStartNumber: invoiceNumbering.receiptStartNumber || 1,
      });
      setSuccess('Invoice numbering settings saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice numbering to database');
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

  const handleDeleteHoliday = async (holidayDate: string) => {
    const updatedHolidays = holidays.filter(h => h.date !== holidayDate);
    setHolidays(updatedHolidays);
    try {
      await settingsService.updatePartialAsync({ holidays: updatedHolidays });
      setSuccess('Holiday deleted and saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete holiday');
    }
  };

  const handleSaveHoliday = async () => {
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
    try {
      await settingsService.updatePartialAsync({ holidays: updatedHolidays });
      setShowHolidayModal(false);
      setSuccess(editingHoliday ? 'Holiday updated and saved to database' : 'Holiday added and saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holiday to database');
    }
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

  // Membership plan handlers
  const plans = membershipPlanService.getAll();

  const handleOpenPlanModal = (plan?: MembershipPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationMonths: plan.durationMonths,
        description: plan.description || '',
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setPlanFormData({
        name: '',
        type: 'monthly',
        price: 0,
        durationMonths: 1,
        description: '',
        isActive: true,
      });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = () => {
    if (!planFormData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (planFormData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      if (editingPlan) {
        membershipPlanService.update(editingPlan.id, {
          name: planFormData.name.trim(),
          type: planFormData.type,
          price: planFormData.price,
          durationMonths: planFormData.durationMonths,
          description: planFormData.description.trim() || undefined,
          isActive: planFormData.isActive,
        });
        setSuccess('Plan updated successfully');
      } else {
        membershipPlanService.create({
          name: planFormData.name.trim(),
          type: planFormData.type,
          price: planFormData.price,
          durationMonths: planFormData.durationMonths,
          description: planFormData.description.trim() || undefined,
          isActive: planFormData.isActive,
          allowedSessionTypes: ['offline'],
        });
        setSuccess('Plan created successfully');
      }
      setShowPlanModal(false);
      setEditingPlan(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleTogglePlanActive = (plan: MembershipPlan) => {
    try {
      membershipPlanService.update(plan.id, { isActive: !plan.isActive });
      setSuccess(`Plan ${plan.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    }
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
      {/* Header with Tab Navigation */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mb-4">Manage your studio settings and preferences</p>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 overflow-x-auto pb-px" aria-label="Settings tabs">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
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

      {/* Studio Tab */}
      {activeTab === 'studio' && (
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
      )}

      {/* Memberships Tab */}
      {activeTab === 'memberships' && (
        <Card
          title="Membership Plans"
          subtitle="Manage available membership options"
          actions={
            <Button size="sm" onClick={() => handleOpenPlanModal()}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Plan
            </Button>
          }
        >
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No membership plans yet</p>
              <Button className="mt-4" onClick={() => handleOpenPlanModal()}>
                Create First Plan
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{plan.type}</p>
                    </div>
                    <StatusBadge status={plan.isActive ? 'active' : 'inactive'} />
                  </div>

                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-indigo-600">
                      {formatCurrency(plan.price)}
                    </p>
                    <p className="text-sm text-gray-500">
                      for {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
                    </p>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  )}

                  <div className="text-sm text-gray-600">
                    <p>Per month: {formatCurrency(Math.round(plan.price / plan.durationMonths))}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => handleOpenPlanModal(plan)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={plan.isActive ? 'ghost' : 'outline'}
                      size="sm"
                      fullWidth
                      onClick={() => handleTogglePlanActive(plan)}
                    >
                      {plan.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
      <>
      {/* Invoice Numbering */}
      <Card title="Invoice & Receipt Numbering">
        <p className="text-sm text-gray-600 mb-4">
          Configure the prefix and starting number for invoice and receipt numbers. For example, with prefix "INV" and starting number 1, invoices will be numbered as INV-00001, INV-00002, etc.
        </p>
        <form onSubmit={handleSaveInvoiceNumbering} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Invoice Prefix"
              value={invoiceNumbering.invoicePrefix}
              onChange={(e) => setInvoiceNumbering(prev => ({ ...prev, invoicePrefix: e.target.value }))}
              placeholder="INV"
              helperText="Prefix for invoice numbers"
            />
            <Input
              label="Invoice Starting No."
              type="number"
              min={1}
              value={invoiceNumbering.invoiceStartNumber}
              onChange={(e) => setInvoiceNumbering(prev => ({ ...prev, invoiceStartNumber: parseInt(e.target.value) || 1 }))}
              placeholder="1"
              helperText="Starting number for sequence"
            />
            <Input
              label="Receipt Prefix"
              value={invoiceNumbering.receiptPrefix}
              onChange={(e) => setInvoiceNumbering(prev => ({ ...prev, receiptPrefix: e.target.value }))}
              placeholder="RCP"
              helperText="Prefix for receipt numbers"
            />
            <Input
              label="Receipt Starting No."
              type="number"
              min={1}
              value={invoiceNumbering.receiptStartNumber}
              onChange={(e) => setInvoiceNumbering(prev => ({ ...prev, receiptStartNumber: parseInt(e.target.value) || 1 }))}
              placeholder="1"
              helperText="Starting number for sequence"
            />
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Preview:</span> Invoice: <span className="font-mono text-indigo-600">{invoiceNumbering.invoicePrefix || 'INV'}-{String(invoiceNumbering.invoiceStartNumber || 1).padStart(5, '0')}</span>,
              Receipt: <span className="font-mono text-indigo-600">{invoiceNumbering.receiptPrefix || 'RCP'}-{String(invoiceNumbering.receiptStartNumber || 1).padStart(5, '0')}</span>
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Button type="submit" loading={loading === 'invoice-numbering'}>
              Save Numbering Settings
            </Button>
            {success === 'Invoice numbering settings updated successfully' && (
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

          <div className="flex gap-3 items-center">
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
            {success === 'Invoice template updated successfully' && (
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
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
      <Card title="WhatsApp Message Templates">
        <p className="text-sm text-gray-600 mb-4">
          Customize message templates for WhatsApp notifications. Use placeholders like <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{'{memberName}'}</code> that will be replaced with actual values when sending.
        </p>

        <form onSubmit={handleSaveWhatsAppTemplates} className="space-y-6">
          {/* Renewal Reminders (Multiple) */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Renewal Reminders <span className="text-gray-500 font-normal">({whatsappTemplates.renewalReminders.length} templates)</span>
            </label>
            <div className="space-y-4">
              {whatsappTemplates.renewalReminders.map((template, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {index + 1}
                    </span>
                    <Input
                      value={template.name}
                      onChange={(e) => setWhatsappTemplates(prev => {
                        const newTemplates = [...prev.renewalReminders];
                        newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                        return { ...prev, renewalReminders: newTemplates };
                      })}
                      placeholder="Template name"
                      className="flex-1"
                    />
                  </div>
                  <Textarea
                    value={template.template}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.renewalReminders];
                      newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                      return { ...prev, renewalReminders: newTemplates };
                    })}
                    rows={8}
                    placeholder="Hi {memberName}, your {planName} membership expires on {expiryDate}..."
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.subscription.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
            </p>
          </div>

          {/* Class Reminder (Single) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Reminder
            </label>
            <Textarea
              value={whatsappTemplates.classReminder.template}
              onChange={(e) => setWhatsappTemplates(prev => ({
                ...prev,
                classReminder: { ...prev.classReminder, template: e.target.value }
              }))}
              rows={5}
              placeholder="Hi {memberName}, reminder: Your yoga class is {classDate} at {classTime}..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.class.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
            </p>
          </div>

          {/* Payment Confirmation (Single) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Confirmation
            </label>
            <Textarea
              value={whatsappTemplates.paymentConfirmation.template}
              onChange={(e) => setWhatsappTemplates(prev => ({
                ...prev,
                paymentConfirmation: { ...prev.paymentConfirmation, template: e.target.value }
              }))}
              rows={5}
              placeholder="Hi {memberName}, we received your payment of {amount}..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Available: {WHATSAPP_PLACEHOLDERS.member.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.payment.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
            </p>
          </div>

          {/* Lead Follow-ups (Multiple) */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Lead Follow-ups <span className="text-gray-500 font-normal">({whatsappTemplates.leadFollowUps.length} templates)</span>
            </label>
            <div className="space-y-4">
              {whatsappTemplates.leadFollowUps.map((template, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {index + 1}
                    </span>
                    <Input
                      value={template.name}
                      onChange={(e) => setWhatsappTemplates(prev => {
                        const newTemplates = [...prev.leadFollowUps];
                        newTemplates[index] = { ...newTemplates[index], name: e.target.value };
                        return { ...prev, leadFollowUps: newTemplates };
                      })}
                      placeholder="Template name"
                      className="flex-1"
                    />
                  </div>
                  <Textarea
                    value={template.template}
                    onChange={(e) => setWhatsappTemplates(prev => {
                      const newTemplates = [...prev.leadFollowUps];
                      newTemplates[index] = { ...newTemplates[index], template: e.target.value };
                      return { ...prev, leadFollowUps: newTemplates };
                    })}
                    rows={6}
                    placeholder="Hi {leadName}, thank you for your interest in {studioName}..."
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Available: {WHATSAPP_PLACEHOLDERS.lead.map(p => p.key).join(', ')}, {WHATSAPP_PLACEHOLDERS.studio.map(p => p.key).join(', ')}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <Button type="submit" loading={loading === 'whatsapp-templates'}>
              Save Templates
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWhatsappTemplates(DEFAULT_WHATSAPP_TEMPLATES)}
            >
              Reset to Default
            </Button>
            {success === 'WhatsApp templates saved to database' && (
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
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
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
          The list includes default Indian public holidays for 2025 and 2026.
        </p>

        {Object.keys(holidaysByYear).length === 0 ? (
          <p className="text-gray-500 text-center py-4">No holidays configured</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(holidaysByYear).sort().map(year => (
              <div key={year}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{year} ({holidaysByYear[year].length} holidays)</h4>
                <div className="space-y-2">
                  {holidaysByYear[year].map((holiday, index) => (
                    <div
                      key={`${holiday.date}-${index}`}
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
      )}

      {/* Legal Tab */}
      {activeTab === 'legal' && (
      <Card title="Terms & Disclaimers">
        <form onSubmit={handleSaveTerms} className="space-y-4">
          <Textarea
            label="Terms and Conditions"
            value={termsData.termsAndConditions}
            onChange={(e) => setTermsData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
            rows={8}
            helperText="These terms will be shown to members during registration (supports Markdown)"
          />
          <Textarea
            label="Health Disclaimer"
            value={termsData.healthDisclaimer}
            onChange={(e) => setTermsData(prev => ({ ...prev, healthDisclaimer: e.target.value }))}
            rows={6}
            helperText="Health-related disclaimer for yoga practice (supports Markdown)"
          />
          <div className="flex gap-3 items-center">
            <Button type="submit" loading={loading === 'terms'}>
              Save Terms
            </Button>
            {success === 'Terms and disclaimers saved to database' && (
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
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
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
          <p><strong>Version:</strong> 1.0.4</p>
          <p><strong>Storage:</strong> Local Browser Storage / API</p>
          <p className="text-xs mt-4">
            Data is stored locally in your browser and synced to the database when using API mode.
            Regular backups are recommended.
          </p>
        </div>
      </Card>
      </>
      )}

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

      {/* Plan Modal */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={editingPlan ? 'Edit Plan' : 'Add New Plan'}
      >
        <div className="space-y-4">
          <Input
            label="Plan Name"
            value={planFormData.name}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Monthly Standard"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={planFormData.type}
                onChange={(e) => setPlanFormData(prev => ({
                  ...prev,
                  type: e.target.value as MembershipPlan['type'],
                  durationMonths: e.target.value === 'monthly' ? 1 : e.target.value === 'quarterly' ? 3 : e.target.value === 'semi-annual' ? 6 : 12,
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly (1 month)</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="semi-annual">Semi-Annual (6 months)</option>
                <option value="yearly">Yearly (12 months)</option>
              </select>
            </div>

            <Input
              label="Duration (months)"
              type="number"
              min={1}
              value={planFormData.durationMonths}
              onChange={(e) => setPlanFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <Input
            label="Price (₹)"
            type="number"
            min={0}
            value={planFormData.price}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            required
          />

          <Input
            label="Description (optional)"
            value={planFormData.description}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the plan"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="planIsActive"
              checked={planFormData.isActive}
              onChange={(e) => setPlanFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="planIsActive" className="text-sm text-gray-700">
              Active (available for new subscriptions)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan}>
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
