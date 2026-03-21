import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, SkeletonTable } from '../../components/common';
import { CreateInvoiceModal } from '../../components/invoices/CreateInvoiceModal';
import { invoiceService, memberService, subscriptionService, membershipPlanService, paymentService, settingsService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getCurrentMonthRange } from '../../utils/dateUtils';
import { generateInvoicePDF } from '../../utils/pdfUtils';
import { useFreshData, useDebounce } from '../../hooks';
import type { Invoice, Member } from '../../types';
import type { Column } from '../../components/common';

export function InvoiceListPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['invoices', 'members', 'subscriptions']);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sharingInvoiceId, setSharingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  // Get data (empty arrays when loading)
  const allMembers = isLoading ? [] : memberService.getAll();
  const allInvoices = isLoading ? [] : invoiceService.getAll();

  // Pre-build member lookup map to avoid per-row service calls
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of allMembers) map.set(m.id, m);
    return map;
  }, [allMembers]);

  // Show loading state while fetching data
  if (isLoading) {
    return <SkeletonTable rows={8} cols={6} />;
  }

  // Check if Web Share API with files is supported
  const canShareFiles = typeof navigator !== 'undefined' &&
    navigator.share !== undefined &&
    navigator.canShare !== undefined;

  // Filter and sort invoices (most recent first)
  const invoices = allInvoices
    .filter(invoice => {
      const member = memberMap.get(invoice.memberId);
      const matchesSearch = !debouncedSearch || (member &&
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        invoice.invoiceNumber.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = !statusFilter || invoice.status === statusFilter;

      const matchesType = !typeFilter || invoice.invoiceType === typeFilter;

      const matchesDateFrom = !dateFrom || invoice.invoiceDate >= dateFrom;
      const matchesDateTo = !dateTo || invoice.invoiceDate <= dateTo;

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      // Sort by createdAt timestamp (most recent first)
      const createdAtA = a.createdAt || a.invoiceDate;
      const createdAtB = b.createdAt || b.invoiceDate;
      return createdAtB.localeCompare(createdAtA);
    });

  // Share handler
  const handleShare = async (invoice: Invoice) => {
    if (!canShareFiles) {
      setError('Sharing is not supported on this device');
      return;
    }

    setSharingInvoiceId(invoice.id);
    setError('');
    try {
      const member = memberService.getById(invoice.memberId);
      const subscription = invoice.subscriptionId
        ? subscriptionService.getById(invoice.subscriptionId)
        : null;
      const plan = subscription
        ? membershipPlanService.getById(subscription.planId)
        : null;
      const payments = paymentService.getByInvoice(invoice.id);
      const settings = settingsService.getOrDefault();

      const blob = await generateInvoicePDF({
        invoice,
        member,
        subscription,
        plan,
        payments,
        settings,
      });

      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, {
        type: 'application/pdf',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoiceNumber}`,
          text: member
            ? `Invoice for ${member.firstName} ${member.lastName} - ${formatCurrency(invoice.totalAmount)}`
            : `Invoice ${invoice.invoiceNumber}`,
        });
      } else {
        setError('File sharing is not supported on this device');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to share PDF');
    } finally {
      setSharingInvoiceId(null);
    }
  };

  // Edit invoice handler
  const handleEditInvoice = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setShowCreateModal(true);
  };

  // Modal saved callback
  const handleModalSaved = () => {
    setShowCreateModal(false);
    setEditInvoice(null);
  };

  // Modal close callback
  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditInvoice(null);
  };

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
        const member = memberMap.get(invoice.memberId);
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
        <span className="text-gray-600 whitespace-nowrap">{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (invoice) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
          invoice.invoiceType === 'product-sale'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {invoice.invoiceType === 'product-sale' ? 'Product' : 'Membership'}
        </span>
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
        <div className="flex gap-1 justify-end">
          <Link to={`/admin/invoices/${invoice.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          {invoice.status === 'draft' && invoice.invoiceType === 'product-sale' && (
            <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
              Edit
            </Button>
          )}
          {invoice.status !== 'paid' && (
            <Link to={`/admin/payments/record`} state={{ invoiceId: invoice.id }}>
              <Button variant="outline" size="sm">Pay</Button>
            </Link>
          )}
          {canShareFiles && (
            <button
              onClick={() => handleShare(invoice)}
              disabled={sharingInvoiceId === invoice.id}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
              title="Share PDF"
            >
              {sharingInvoiceId === invoice.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
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
    .reduce((sum, i) => sum + (Number(i.totalAmount || 0) - Number(i.amountPaid || 0)), 0);
  const paidThisMonth = thisMonthInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">View and manage all invoices</p>
        </div>
        <Button onClick={() => { setEditInvoice(null); setShowCreateModal(true); }}>
          Create Invoice
        </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Search by member or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'membership', label: 'Membership' },
              { value: 'product-sale', label: 'Product Sale' },
            ]}
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
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To date"
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
          description={search || statusFilter || typeFilter
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

      {/* Create/Edit Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSaved={handleModalSaved}
        editInvoice={editInvoice}
        allMembers={allMembers}
      />

    </div>
  );
}
