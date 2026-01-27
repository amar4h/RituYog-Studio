import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Modal, Alert } from '../../components/common';
import { paymentService, memberService, invoiceService, subscriptionService, membershipPlanService, whatsappService, isApiMode } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getCurrentMonthRange, getToday } from '../../utils/dateUtils';
import type { Payment } from '../../types';
import type { Column } from '../../components/common';

export function PaymentListPage() {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Edit/Delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    paymentMethod: 'cash' as Payment['paymentMethod'],
    paymentDate: '',
    transactionReference: '',
    notes: '',
    status: 'completed' as Payment['status'],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Store data in state for proper reactivity
  const [allPayments, setAllPayments] = useState<Payment[]>(() => paymentService.getAll());

  // Refresh data from API when component mounts (for API mode)
  useEffect(() => {
    if (isApiMode()) {
      paymentService.async.getAll().then(payments => {
        setAllPayments(payments);
      }).catch(console.error);
    }
  }, []);

  // Filter payments
  const payments = allPayments.filter(payment => {
    const member = memberService.getById(payment.memberId);
    const invoice = invoiceService.getById(payment.invoiceId);

    const matchesSearch = !search || (member &&
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
      (invoice && invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesMethod = !methodFilter || payment.paymentMethod === methodFilter;
    const matchesStatus = !statusFilter || payment.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const columns: Column<Payment>[] = [
    {
      key: 'receipt',
      header: 'Receipt #',
      render: (payment) => (
        <span className="font-mono text-gray-900">
          {payment.receiptNumber || '-'}
        </span>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      render: (payment) => {
        const member = memberService.getById(payment.memberId);
        if (!member) return <span className="text-gray-400">Unknown</span>;
        return (
          <Link
            to={`/admin/members/${member.id}`}
            className="text-gray-900 hover:text-indigo-600"
          >
            {member.firstName} {member.lastName}
          </Link>
        );
      },
    },
    {
      key: 'invoice',
      header: 'Invoice',
      render: (payment) => {
        const invoice = invoiceService.getById(payment.invoiceId);
        if (!invoice) return <span className="text-gray-400">-</span>;
        return (
          <Link
            to={`/admin/invoices/${invoice.id}`}
            className="font-mono text-indigo-600 hover:text-indigo-700"
          >
            {invoice.invoiceNumber}
          </Link>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment) => (
        <span className="text-gray-600">{formatDate(payment.paymentDate)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (payment) => (
        <span className="text-gray-600 capitalize">{payment.paymentMethod}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (payment) => {
        const member = memberService.getById(payment.memberId);
        const invoice = invoiceService.getById(payment.invoiceId);
        const subscription = invoice?.subscriptionId
          ? subscriptionService.getById(invoice.subscriptionId)
          : null;
        const plan = subscription
          ? membershipPlanService.getById(subscription.planId)
          : null;

        const whatsappLink = member && invoice
          ? whatsappService.generatePaymentConfirmation({
              member,
              payment,
              invoice,
              plan: plan || { name: 'Membership' } as any,
            }).link
          : null;

        return (
          <div className="flex gap-1 items-center">
            {whatsappLink && payment.status === 'completed' && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                title="Send receipt via WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            )}
            <button
              onClick={() => handleEditClick(payment)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteClick(payment)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  // Stats
  const { start, end } = getCurrentMonthRange();
  const thisMonthPayments = allPayments.filter(p =>
    p.paymentDate >= start && p.paymentDate <= end && p.status === 'completed'
  );
  const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAllTime = allPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Payment method breakdown
  const methodBreakdown = thisMonthPayments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + Number(p.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Edit/Delete handlers
  const handleEditClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditFormData({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      transactionReference: payment.transactionReference || '',
      notes: payment.notes || '',
      status: payment.status,
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedPayment) return;

    if (editFormData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      // Get old payment amount to calculate difference
      const oldAmount = selectedPayment.amount;
      const newAmount = editFormData.amount;
      const amountDiff = newAmount - oldAmount;

      // Update payment
      paymentService.update(selectedPayment.id, {
        amount: editFormData.amount,
        paymentMethod: editFormData.paymentMethod,
        paymentDate: editFormData.paymentDate,
        transactionReference: editFormData.transactionReference || undefined,
        notes: editFormData.notes || undefined,
        status: editFormData.status,
      });

      // Update invoice if amount changed
      if (amountDiff !== 0) {
        const invoice = invoiceService.getById(selectedPayment.invoiceId);
        if (invoice) {
          const newAmountPaid = Math.max(0, (invoice.amountPaid || 0) + amountDiff);
          const newStatus = newAmountPaid >= invoice.totalAmount ? 'paid' : newAmountPaid > 0 ? 'partially-paid' : 'sent';
          invoiceService.update(invoice.id, {
            amountPaid: newAmountPaid,
            status: newStatus,
          });
        }
      }

      setSuccess('Payment updated successfully');
      setShowEditModal(false);
      setSelectedPayment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    }
  };

  const handleDelete = () => {
    if (!selectedPayment) return;

    try {
      // Update invoice to subtract this payment amount
      const invoice = invoiceService.getById(selectedPayment.invoiceId);
      if (invoice) {
        const newAmountPaid = Math.max(0, (invoice.amountPaid || 0) - selectedPayment.amount);
        const newStatus = newAmountPaid >= invoice.totalAmount ? 'paid' : newAmountPaid > 0 ? 'partially-paid' : 'sent';
        invoiceService.update(invoice.id, {
          amountPaid: newAmountPaid,
          status: newStatus,
        });
      }

      // Delete the payment
      paymentService.delete(selectedPayment.id);

      setSuccess('Payment deleted successfully');
      setShowDeleteModal(false);
      setSelectedPayment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
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

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">View payment history and record new payments</p>
        </div>
        <Link to="/admin/payments/record">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Payment
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalThisMonth)}</p>
            <p className="text-sm text-gray-600">This Month</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{thisMonthPayments.length}</p>
            <p className="text-sm text-gray-600">Transactions (Month)</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalAllTime)}</p>
            <p className="text-sm text-gray-600">All Time</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{allPayments.length}</p>
            <p className="text-sm text-gray-600">Total Transactions</p>
          </div>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(methodBreakdown).length > 0 && (
        <Card title="This Month by Payment Method">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(methodBreakdown).map(([method, amount]) => (
              <div key={method} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 capitalize">{method}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by member, invoice, or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[
              { value: '', label: 'All Methods' },
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' },
              { value: 'bank-transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {payments.length} payments found
            </span>
          </div>
        </div>
      </Card>

      {/* Payments table */}
      {payments.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No payments found"
          description={search || methodFilter || statusFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Record your first payment to get started."
          }
          action={
            !search && !methodFilter && !statusFilter && (
              <Link to="/admin/payments/record">
                <Button>Record Payment</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={payments}
            columns={columns}
            keyExtractor={(payment) => payment.id}
          />
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Payment"
      >
        <div className="space-y-4">
          <Input
            label="Amount (₹)"
            type="number"
            min={0}
            value={editFormData.amount}
            onChange={(e) => setEditFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={editFormData.paymentMethod}
              onChange={(e) => setEditFormData(prev => ({ ...prev, paymentMethod: e.target.value as Payment['paymentMethod'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <Input
            label="Payment Date"
            type="date"
            value={editFormData.paymentDate}
            max={getToday()}
            onChange={(e) => setEditFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
            required
          />

          <Input
            label="Transaction Reference"
            value={editFormData.transactionReference}
            onChange={(e) => setEditFormData(prev => ({ ...prev, transactionReference: e.target.value }))}
            placeholder="e.g., UPI transaction ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as Payment['status'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <Input
            label="Notes"
            value={editFormData.notes}
            onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Payment"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this payment of{' '}
            <span className="font-semibold text-gray-900">
              {selectedPayment && formatCurrency(selectedPayment.amount)}
            </span>
            ? This will also update the associated invoice balance.
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
