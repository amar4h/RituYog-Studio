import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Modal, ConfirmDialog, Alert } from '../../components/common';
import { subscriptionService, memberService, membershipPlanService, invoiceService, slotService, isApiMode } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getDaysRemaining, calculateSubscriptionEndDate } from '../../utils/dateUtils';
import type { MembershipSubscription } from '../../types';
import type { Column } from '../../components/common';

export function SubscriptionListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');

  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<MembershipSubscription | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editDiscountReason, setEditDiscountReason] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation state
  const [deletingSubscription, setDeletingSubscription] = useState<MembershipSubscription | null>(null);

  // Loading state for invoice creation
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState<string | null>(null);

  // Force re-render after updates
  const [refreshKey, setRefreshKey] = useState(0);

  // Store data in state for proper reactivity
  const [allSubscriptions, setAllSubscriptions] = useState<MembershipSubscription[]>(() => subscriptionService.getAll());
  const plans = membershipPlanService.getAll(); // Plans are loaded on app startup, no need for async

  // Refresh data from API when component mounts (for API mode)
  useEffect(() => {
    if (isApiMode()) {
      subscriptionService.async.getAll().then(subs => {
        setAllSubscriptions(subs);
      }).catch(console.error);
    }
  }, [refreshKey]);

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
      render: (sub) => {
        // Check if invoice exists - first by invoiceId, then by subscriptionId
        let invoice = sub.invoiceId ? invoiceService.getById(sub.invoiceId) : null;
        if (!invoice) {
          // Check if an invoice exists with this subscriptionId (wasn't linked properly)
          invoice = invoiceService.getBySubscriptionId(sub.id);
        }
        return (
          <div className="flex gap-2 justify-end">
            {invoice ? (
              <Link to={`/admin/invoices/${invoice.id}`}>
                <Button variant="ghost" size="sm">Invoice</Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateInvoice(sub)}
                disabled={creatingInvoiceFor === sub.id}
              >
                {creatingInvoiceFor === sub.id ? 'Creating...' : 'Create Invoice'}
              </Button>
            )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSubscription(sub);
              setEditStartDate(sub.startDate);
              setEditPlanId(sub.planId);
              // Determine if discount was percentage or fixed based on stored values
              setEditDiscountType('fixed');
              setEditDiscountValue(sub.discountAmount);
              setEditDiscountReason(sub.discountReason || '');
              setEditError('');
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletingSubscription(sub)}
          >
            Delete
          </Button>
        </div>
        );
      },
    },
  ];

  // Calculate end date and amounts for edit form
  const editSelectedPlan = plans.find(p => p.id === editPlanId);
  const editEndDate = useMemo(() => {
    if (editStartDate && editSelectedPlan) {
      return calculateSubscriptionEndDate(editStartDate, editSelectedPlan.durationMonths);
    }
    return editingSubscription?.endDate || '';
  }, [editStartDate, editSelectedPlan, editingSubscription]);

  const editOriginalAmount = editSelectedPlan?.price || 0;
  const editDiscountAmount = editDiscountType === 'percentage'
    ? Math.round((editOriginalAmount * editDiscountValue) / 100)
    : editDiscountValue;
  const editPayableAmount = Math.max(0, editOriginalAmount - editDiscountAmount);

  // Handle edit subscription
  const handleEditSave = async () => {
    if (!editingSubscription) return;

    if (!editStartDate) {
      setEditError('Start date is required');
      return;
    }

    if (!editPlanId) {
      setEditError('Please select a plan');
      return;
    }

    if (editDiscountAmount > editOriginalAmount) {
      setEditError('Discount cannot exceed the plan price');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      const slot = slotService.getById(editingSubscription.slotId);

      // Update subscription
      await subscriptionService.async.update(editingSubscription.id, {
        startDate: editStartDate,
        endDate: editEndDate,
        planId: editPlanId,
        originalAmount: editOriginalAmount,
        discountAmount: editDiscountAmount,
        discountReason: editDiscountReason.trim() || undefined,
        payableAmount: editPayableAmount,
      });

      // Update the associated invoice if it exists
      if (editingSubscription.invoiceId) {
        const invoice = invoiceService.getById(editingSubscription.invoiceId);
        if (invoice) {
          await invoiceService.async.update(editingSubscription.invoiceId, {
            amount: editOriginalAmount,
            discount: editDiscountAmount,
            discountReason: editDiscountReason.trim() || undefined,
            totalAmount: editPayableAmount,
            dueDate: editStartDate,
            items: [
              {
                description: `${editSelectedPlan?.name} Membership (${editSelectedPlan?.durationMonths} ${editSelectedPlan?.durationMonths === 1 ? 'month' : 'months'})${slot ? ` - ${slot.displayName}` : ''}`,
                quantity: 1,
                unitPrice: editOriginalAmount,
                total: editOriginalAmount,
              },
            ],
          });
        }
      }

      setEditingSubscription(null);
      setEditSuccess('Subscription and invoice updated successfully');
      setRefreshKey(k => k + 1);
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setEditSaving(false);
    }
  };

  // Handle delete subscription
  const handleDelete = () => {
    if (!deletingSubscription) return;

    try {
      subscriptionService.delete(deletingSubscription.id);
      setDeletingSubscription(null);
      setEditSuccess('Subscription deleted successfully');
      setRefreshKey(k => k + 1);
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to delete subscription');
    }
  };

  // Handle create invoice for subscription without one
  const handleCreateInvoice = async (sub: MembershipSubscription) => {
    setCreatingInvoiceFor(sub.id);
    document.body.style.cursor = 'wait';

    try {
      // First check if an invoice already exists for this subscription
      const existingInvoice = invoiceService.getBySubscriptionId(sub.id);
      if (existingInvoice) {
        // Invoice exists but subscription wasn't linked - just link them
        await subscriptionService.async.update(sub.id, { invoiceId: existingInvoice.id });
        setEditSuccess('Found existing invoice and linked to subscription');
        setRefreshKey(k => k + 1);
        setTimeout(() => setEditSuccess(''), 3000);
        return;
      }

      const plan = membershipPlanService.getById(sub.planId);
      const slot = slotService.getById(sub.slotId);

      if (!plan) {
        setEditError('Plan not found for this subscription');
        return;
      }

      // Use async method to wait for API response and catch errors
      // Generate invoice number from database to avoid duplicates
      const invoiceNumber = await invoiceService.async.generateInvoiceNumber();
      const invoice = await invoiceService.async.create({
        invoiceNumber,
        invoiceType: 'membership',
        memberId: sub.memberId,
        amount: sub.originalAmount,
        discount: sub.discountAmount,
        discountReason: sub.discountReason,
        totalAmount: sub.payableAmount,
        amountPaid: 0,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: sub.startDate,
        status: 'sent',
        items: [
          {
            description: `${plan.name} Membership (${plan.durationMonths} ${plan.durationMonths === 1 ? 'month' : 'months'})${slot ? ` - ${slot.displayName}` : ''}`,
            quantity: 1,
            unitPrice: sub.originalAmount,
            total: sub.originalAmount,
          },
        ],
        subscriptionId: sub.id,
      });

      // Update subscription with invoice ID (also use async to ensure it persists)
      await subscriptionService.async.update(sub.id, { invoiceId: invoice.id });

      setEditSuccess('Invoice created successfully');
      setRefreshKey(k => k + 1);
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setCreatingInvoiceFor(null);
      document.body.style.cursor = '';
    }
  };

  // Stats
  const activeCount = allSubscriptions.filter(s => s.status === 'active').length;
  const expiringSoonCount = subscriptionService.getExpiringSoon(7).length;
  const pendingPayments = allSubscriptions.filter(s => s.paymentStatus === 'pending').length;
  const totalRevenue = allSubscriptions
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + Number(s.payableAmount || 0), 0);

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Success message */}
      {editSuccess && (
        <Alert variant="success" dismissible onDismiss={() => setEditSuccess('')}>
          {editSuccess}
        </Alert>
      )}

      {/* Error message */}
      {editError && (
        <Alert variant="error" dismissible onDismiss={() => setEditError('')}>
          {editError}
        </Alert>
      )}

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

      {/* Edit Subscription Modal */}
      <Modal
        isOpen={!!editingSubscription}
        onClose={() => setEditingSubscription(null)}
        title="Edit Subscription"
        size="lg"
      >
        {editingSubscription && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Editing subscription for{' '}
              <span className="font-semibold">
                {(() => {
                  const member = memberService.getById(editingSubscription.memberId);
                  return member ? `${member.firstName} ${member.lastName}` : 'Unknown';
                })()}
              </span>
            </p>

            {/* Plan Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membership Plan
              </label>
              <div className="grid grid-cols-2 gap-2">
                {plans.filter(p => p.isActive).map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setEditPlanId(plan.id)}
                    className={`p-2 border-2 rounded-lg text-left transition-colors ${
                      editPlanId === plan.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                      <p className="font-bold text-indigo-600 text-sm whitespace-nowrap">
                        {formatCurrency(plan.price)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Calculated from plan duration</p>
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount (Optional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={editDiscountType}
                  onChange={(e) => {
                    setEditDiscountType(e.target.value as 'fixed' | 'percentage');
                    setEditDiscountValue(0);
                  }}
                  options={[
                    { value: 'percentage', label: '%' },
                    { value: 'fixed', label: '₹' },
                  ]}
                />
                <Input
                  type="number"
                  min={0}
                  max={editDiscountType === 'percentage' ? 100 : editOriginalAmount}
                  value={editDiscountValue}
                  onChange={(e) => setEditDiscountValue(parseInt(e.target.value) || 0)}
                  placeholder={editDiscountType === 'percentage' ? '%' : '₹'}
                />
                <Input
                  value={editDiscountReason}
                  onChange={(e) => setEditDiscountReason(e.target.value)}
                  placeholder="Reason"
                />
              </div>
              {editDiscountType === 'percentage' && editDiscountValue > 0 && editSelectedPlan && (
                <p className="text-xs text-gray-600 mt-1">
                  {editDiscountValue}% = {formatCurrency(editDiscountAmount)} off
                </p>
              )}
            </div>

            {/* Summary */}
            {editSelectedPlan && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plan Price</span>
                  <span className="text-gray-900">{formatCurrency(editOriginalAmount)}</span>
                </div>
                {editDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Discount
                      {editDiscountType === 'percentage' && ` (${editDiscountValue}%)`}
                    </span>
                    <span>-{formatCurrency(editDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-indigo-600">{formatCurrency(editPayableAmount)}</span>
                </div>
              </div>
            )}

            {editError && (
              <Alert variant="error" dismissible onDismiss={() => setEditError('')}>
                {editError}
              </Alert>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingSubscription(null)}
                fullWidth
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleEditSave} fullWidth loading={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingSubscription}
        onClose={() => setDeletingSubscription(null)}
        onConfirm={handleDelete}
        title="Delete Subscription"
        message={`Are you sure you want to delete this subscription? This action cannot be undone.${
          deletingSubscription?.invoiceId ? ' The associated invoice will NOT be deleted.' : ''
        }`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
