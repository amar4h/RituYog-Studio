import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea, Alert } from '../../components/common';
import { invoiceService, memberService, paymentService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { getToday } from '../../utils/dateUtils';
import type { Payment } from '../../types';

export function RecordPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedInvoiceId = (location.state as { invoiceId?: string })?.invoiceId;

  const [formData, setFormData] = useState({
    invoiceId: preselectedInvoiceId || '',
    amount: 0,
    paymentMethod: 'upi' as Payment['paymentMethod'],
    paymentDate: getToday(),
    transactionReference: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allInvoices = invoiceService.getAll().filter(i => i.status !== 'paid' && i.status !== 'cancelled');

  const selectedInvoice = formData.invoiceId
    ? invoiceService.getById(formData.invoiceId)
    : null;
  const member = selectedInvoice
    ? memberService.getById(selectedInvoice.memberId)
    : null;

  const balance = selectedInvoice
    ? selectedInvoice.totalAmount - selectedInvoice.amountPaid
    : 0;

  // Auto-fill amount when invoice changes
  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoiceService.getById(invoiceId);
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        invoiceId,
        amount: invoice.totalAmount - invoice.amountPaid,
      }));
    } else {
      setFormData(prev => ({ ...prev, invoiceId, amount: 0 }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.invoiceId) {
      setError('Please select an invoice');
      return;
    }

    if (formData.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (formData.amount > balance) {
      setError(`Payment amount cannot exceed the balance of ${formatCurrency(balance)}`);
      return;
    }

    if (!selectedInvoice) {
      setError('Selected invoice not found');
      return;
    }

    setLoading(true);

    try {
      paymentService.recordPayment(
        formData.invoiceId,
        formData.amount,
        formData.paymentMethod,
        formData.paymentDate,
        formData.transactionReference.trim() || undefined,
        formData.notes.trim() || undefined
      );

      // Pass fromPayment flag to skip API sync on InvoiceDetailPage
      navigate(`/admin/invoices/${formData.invoiceId}`, { state: { fromPayment: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link to="/admin/payments" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Payments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Record Payment</h1>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Selection */}
        <Card>
          <Select
            label="Select Invoice"
            value={formData.invoiceId}
            onChange={(e) => handleInvoiceChange(e.target.value)}
            options={[
              { value: '', label: 'Choose an invoice...' },
              ...allInvoices.map(invoice => {
                const m = memberService.getById(invoice.memberId);
                const bal = invoice.totalAmount - invoice.amountPaid;
                return {
                  value: invoice.id,
                  label: `${invoice.invoiceNumber} - ${m?.firstName} ${m?.lastName} (${formatCurrency(bal)} due)`,
                };
              }),
            ]}
            required
          />

          {selectedInvoice && member && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Balance Due</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(balance)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Payment Amount - Combined with Quick Select */}
        {selectedInvoice && (
          <Card>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount
            </label>

            {/* Quick Select Buttons - Prominent at top */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, amount: balance }))}
                className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  formData.amount === balance
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                Full Amount
                <span className="block text-xs opacity-80">{formatCurrency(balance)}</span>
              </button>

              {balance >= 500 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: Math.round(balance / 2) }))}
                  className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.amount === Math.round(balance / 2)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  Half
                  <span className="block text-xs opacity-80">{formatCurrency(Math.round(balance / 2))}</span>
                </button>
              )}

              {balance >= 1000 && balance > 1000 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: 1000 }))}
                  className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.amount === 1000
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  ₹1,000
                </button>
              )}

              {balance >= 2000 && balance > 2000 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: 2000 }))}
                  className={`flex-1 min-w-[80px] px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.amount === 2000
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  ₹2,000
                </button>
              )}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
              <input
                type="number"
                min={1}
                max={balance}
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  amount: parseInt(e.target.value) || 0,
                }))}
                className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0"
                required
              />
            </div>

            {/* Balance Info */}
            {formData.amount > 0 && (
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-gray-500">Remaining after payment</span>
                <span className={`font-medium ${balance - formData.amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {balance - formData.amount > 0
                    ? formatCurrency(balance - formData.amount) + ' due'
                    : 'Fully Paid ✓'
                  }
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Payment Method & Details */}
        {selectedInvoice && (
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentMethod: e.target.value as Payment['paymentMethod'],
                }))}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank-transfer', label: 'Bank Transfer' },
                  { value: 'cheque', label: 'Cheque' },
                ]}
                required
              />

              <Input
                label="Date"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                required
              />
            </div>

            <div className="mt-3">
              <Input
                label="Transaction Reference (optional)"
                value={formData.transactionReference}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionReference: e.target.value }))}
                placeholder="UPI ID, Cheque #, etc."
              />
            </div>

            <div className="mt-3">
              <Textarea
                label="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional notes"
              />
            </div>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-2">
          <Link to="/admin/payments" className="flex-1">
            <Button type="button" variant="outline" fullWidth>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!formData.invoiceId || formData.amount <= 0}
            className="flex-1"
          >
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
}
