import { useState, useRef, FormEvent } from 'react';
import { Card, Button, Input, Textarea } from '../../../components/common';
import { settingsService } from '../../../services';
import { DEFAULT_INVOICE_TEMPLATE, CURRENCY_SYMBOLS } from '../../../constants';
import type { InvoiceTemplate } from '../../../types';
import type { SettingsTabProps } from './types';

// Extend default template with new QR fields for migration
const getDefaultTemplate = (): InvoiceTemplate => ({
  ...DEFAULT_INVOICE_TEMPLATE,
  showPaymentQR: false,
  paymentQRLabel: 'Scan to Pay',
});

export function InvoicesTab({ setError, setSuccess, success, loading, setLoading }: SettingsTabProps) {
  const settings = settingsService.getOrDefault();
  const qrCodeInputRef = useRef<HTMLInputElement>(null);

  const [invoiceNumbering, setInvoiceNumbering] = useState({
    invoicePrefix: settings.invoicePrefix || 'INV',
    receiptPrefix: settings.receiptPrefix || 'RCP',
    invoiceStartNumber: settings.invoiceStartNumber || 1,
    receiptStartNumber: settings.receiptStartNumber || 1,
  });

  // Invoice template state - merge with defaults to handle new fields
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>({
    ...getDefaultTemplate(),
    ...settings.invoiceTemplate,
  });

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

  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

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

  return (
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
  );
}
