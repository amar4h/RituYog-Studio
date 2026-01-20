import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons } from '../../components/common';
import { invoiceService, memberService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getCurrentMonthRange } from '../../utils/dateUtils';
import type { Invoice } from '../../types';
import type { Column } from '../../components/common';

export function InvoiceListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const allInvoices = invoiceService.getAll();

  // Filter invoices
  const invoices = allInvoices.filter(invoice => {
    const member = memberService.getById(invoice.memberId);
    const matchesSearch = !search || (member &&
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (invoice) => (
        <Link
          to={`/admin/invoices/${invoice.id}`}
          className="font-mono font-medium text-indigo-600 hover:text-indigo-700"
        >
          {invoice.invoiceNumber}
        </Link>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      render: (invoice) => {
        const member = memberService.getById(invoice.memberId);
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
      key: 'date',
      header: 'Date',
      render: (invoice) => (
        <span className="text-gray-600">{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (invoice) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
          {(invoice.discount ?? 0) > 0 && (
            <p className="text-green-600 text-xs">
              Discount: {formatCurrency(invoice.discount ?? 0)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (invoice) => (
        <span className={invoice.amountPaid >= invoice.totalAmount ? 'text-green-600' : 'text-gray-600'}>
          {formatCurrency(invoice.amountPaid)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (invoice) => {
        const balance = invoice.totalAmount - invoice.amountPaid;
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (invoice) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/admin/invoices/${invoice.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          {invoice.status !== 'paid' && (
            <Link to={`/admin/payments/record`} state={{ invoiceId: invoice.id }}>
              <Button variant="outline" size="sm">Pay</Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  // Stats
  const { start, end } = getCurrentMonthRange();
  const thisMonthInvoices = allInvoices.filter(i =>
    i.invoiceDate >= start && i.invoiceDate <= end
  );
  const pendingAmount = allInvoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);
  const paidThisMonth = thisMonthInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amountPaid, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600">View and manage all invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{allInvoices.length}</p>
            <p className="text-sm text-gray-600">Total Invoices</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {allInvoices.filter(i => i.status === 'sent' || i.status === 'draft').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(pendingAmount)}</p>
            <p className="text-sm text-gray-600">Outstanding</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidThisMonth)}</p>
            <p className="text-sm text-gray-600">Collected (This Month)</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by member or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'partially-paid', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {invoices.length} invoices found
            </span>
          </div>
        </div>
      </Card>

      {/* Invoices table */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No invoices found"
          description={search || statusFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Invoices are automatically created when subscriptions are added."
          }
        />
      ) : (
        <Card>
          <DataTable
            data={invoices}
            columns={columns}
            keyExtractor={(invoice) => invoice.id}
          />
        </Card>
      )}
    </div>
  );
}
