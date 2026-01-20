import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons } from '../../components/common';
import { paymentService, memberService, invoiceService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getCurrentMonthRange } from '../../utils/dateUtils';
import type { Payment } from '../../types';
import type { Column } from '../../components/common';

export function PaymentListPage() {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const allPayments = paymentService.getAll();

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
  ];

  // Stats
  const { start, end } = getCurrentMonthRange();
  const thisMonthPayments = allPayments.filter(p =>
    p.paymentDate >= start && p.paymentDate <= end && p.status === 'completed'
  );
  const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalAllTime = allPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  // Payment method breakdown
  const methodBreakdown = thisMonthPayments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
