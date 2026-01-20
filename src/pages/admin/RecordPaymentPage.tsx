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
    paymentMethod: 'cash' as Payment['paymentMethod'],
    paymentDate: getToday(),
    transactionReference: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingInvoices = invoiceService.getPending();
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

      navigate(`/admin/invoices/${formData.invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin/payments" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Payments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Record Payment
        </h1>
        <p className="text-gray-600">Record a payment against an invoice</p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Selection */}
            <Card title="Select Invoice">
              <Select
                label="Invoice"
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
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Member</p>
                      <p className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Invoice Total</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Already Paid</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedInvoice.amountPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance Due</p>
                      <p className="font-bold text-red-600">
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment Details */}
            <Card title="Payment Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Amount (₹)"
                  type="number"
                  min={1}
                  max={balance}
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    amount: parseInt(e.target.value) || 0,
                  }))}
                  required
                />

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
                  label="Payment Date"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  required
                />

                <Input
                  label="Transaction Reference (optional)"
                  value={formData.transactionReference}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionReference: e.target.value }))}
                  placeholder="e.g., UPI ID, Cheque #"
                />
              </div>

              <div className="mt-4">
                <Textarea
                  label="Notes (optional)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes about this payment"
                />
              </div>
            </Card>

            {/* Quick Amount Buttons */}
            {selectedInvoice && balance > 0 && (
              <Card title="Quick Amount">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, amount: balance }))}
                  >
                    Full Balance ({formatCurrency(balance)})
                  </Button>
                  {balance >= 1000 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: 1000 }))}
                    >
                      ₹1,000
                    </Button>
                  )}
                  {balance >= 2000 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: 2000 }))}
                    >
                      ₹2,000
                    </Button>
                  )}
                  {balance >= 500 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: Math.round(balance / 2) }))}
                    >
                      50% ({formatCurrency(Math.round(balance / 2))})
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card title="Payment Summary">
              <div className="space-y-4">
                {selectedInvoice ? (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Payment Amount</p>
                      <p className="text-3xl font-bold text-indigo-600">
                        {formatCurrency(formData.amount)}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Invoice</span>
                        <span className="font-mono text-gray-900">
                          {selectedInvoice.invoiceNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Method</span>
                        <span className="text-gray-900 capitalize">
                          {formData.paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-900">{formData.paymentDate}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Balance</span>
                        <span className="text-gray-900">{formatCurrency(balance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">This Payment</span>
                        <span className="text-green-600">-{formatCurrency(formData.amount)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span className="text-gray-900">New Balance</span>
                        <span className={balance - formData.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(Math.max(0, balance - formData.amount))}
                        </span>
                      </div>
                    </div>

                    {formData.amount >= balance && (
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-green-700 font-medium">
                          This will fully pay the invoice
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Select an invoice to see summary
                  </p>
                )}
              </div>
            </Card>

            <div className="space-y-3">
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={!formData.invoiceId || formData.amount <= 0}
              >
                Record Payment
              </Button>
              <Link to="/admin/payments">
                <Button type="button" variant="outline" fullWidth>
                  Cancel
                </Button>
              </Link>
            </div>

            <p className="text-xs text-gray-500 text-center">
              A receipt number will be automatically generated.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
