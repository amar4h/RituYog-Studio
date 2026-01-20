import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons } from '../../components/common';
import { subscriptionService, memberService, membershipPlanService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getDaysRemaining } from '../../utils/dateUtils';
import type { MembershipSubscription } from '../../types';
import type { Column } from '../../components/common';

export function SubscriptionListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');

  const allSubscriptions = subscriptionService.getAll();
  const plans = membershipPlanService.getAll();

  // Filter subscriptions
  const subscriptions = allSubscriptions.filter(sub => {
    const member = memberService.getById(sub.memberId);
    const matchesSearch = !search || (member &&
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !statusFilter || sub.status === statusFilter;
    const matchesPayment = !paymentFilter || sub.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const columns: Column<MembershipSubscription>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (sub) => {
        const member = memberService.getById(sub.memberId);
        if (!member) return <span className="text-gray-400">Unknown</span>;
        return (
          <Link
            to={`/admin/members/${member.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {member.firstName} {member.lastName}
          </Link>
        );
      },
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (sub) => {
        const plan = membershipPlanService.getById(sub.planId);
        return <span className="text-gray-600">{plan?.name || 'Unknown'}</span>;
      },
    },
    {
      key: 'period',
      header: 'Period',
      render: (sub) => (
        <div className="text-sm">
          <p className="text-gray-900">{formatDate(sub.startDate)}</p>
          <p className="text-gray-500">to {formatDate(sub.endDate)}</p>
        </div>
      ),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (sub) => {
        const days = getDaysRemaining(sub.endDate);
        if (days < 0) {
          return <span className="text-red-600 font-medium">Expired</span>;
        }
        if (days === 0) {
          return <span className="text-red-600 font-medium">Expires today</span>;
        }
        if (days <= 7) {
          return <span className="text-yellow-600 font-medium">{days} days</span>;
        }
        return <span className="text-gray-600">{days} days</span>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (sub) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{formatCurrency(sub.payableAmount)}</p>
          {sub.discountAmount > 0 && (
            <p className="text-green-600">-{formatCurrency(sub.discountAmount)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (sub) => (
        <div className="space-y-1">
          <StatusBadge status={sub.status} />
          <StatusBadge status={sub.paymentStatus} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (sub) => (
        <div className="flex gap-2 justify-end">
          {sub.invoiceId && (
            <Link to={`/admin/invoices/${sub.invoiceId}`}>
              <Button variant="ghost" size="sm">Invoice</Button>
            </Link>
          )}
          <Link to={`/admin/members/${sub.memberId}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
        </div>
      ),
    },
  ];

  // Stats
  const activeCount = allSubscriptions.filter(s => s.status === 'active').length;
  const expiringSoonCount = subscriptionService.getExpiringSoon(7).length;
  const pendingPayments = allSubscriptions.filter(s => s.paymentStatus === 'pending').length;
  const totalRevenue = allSubscriptions
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.payableAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600">Manage member subscriptions and renewals</p>
        </div>
        <Link to="/admin/subscriptions/new">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Subscription
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{expiringSoonCount}</p>
            <p className="text-sm text-gray-600">Expiring Soon</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{pendingPayments}</p>
            <p className="text-sm text-gray-600">Pending Payments</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Payments' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'partial', label: 'Partial' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {subscriptions.length} subscriptions found
            </span>
          </div>
        </div>
      </Card>

      {/* Subscriptions table */}
      {subscriptions.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No subscriptions found"
          description={search || statusFilter || paymentFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Create subscriptions for members to get started."
          }
          action={
            !search && !statusFilter && !paymentFilter && (
              <Link to="/admin/subscriptions/new">
                <Button>New Subscription</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={subscriptions}
            columns={columns}
            keyExtractor={(sub) => sub.id}
          />
        </Card>
      )}
    </div>
  );
}
