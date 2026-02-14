import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Modal, Alert, SlotSelector, PageLoading } from '../../components/common';
import { memberService, slotService, subscriptionService, whatsappService } from '../../services';
import { formatPhone } from '../../utils/formatUtils';
import { formatDate, formatDateCompact, getToday, getDaysRemaining } from '../../utils/dateUtils';
import { useFreshData } from '../../hooks';
import type { Member, MembershipSubscription } from '../../types';
import type { Column } from '../../components/common';

// Helper to get the relevant subscription (active, scheduled, or most recent expired)
function getRelevantSubscription(memberId: string): MembershipSubscription | null {
  const allSubs = subscriptionService.getByMember(memberId);
  if (allSubs.length === 0) return null;

  const today = getToday();

  // First check for active subscription (currently within date range)
  const active = allSubs.find(s =>
    s.status === 'active' && s.startDate <= today && s.endDate >= today
  );
  if (active) return active;

  // Then check for scheduled (future) subscription
  const scheduled = allSubs.find(s => s.status === 'scheduled' || (s.status === 'active' && s.startDate > today));
  if (scheduled) return scheduled;

  // Then check for recently expired (within last 30 days)
  const recentlyExpired = allSubs.find(s => {
    const daysAgo = getDaysRemaining(s.endDate);
    return daysAgo < 0 && daysAgo >= -30;
  });
  if (recentlyExpired) return recentlyExpired;

  // Return the most recent subscription
  return allSubs[0];
}

// Helper to get date badge styling and text
function getMembershipDateBadge(subscription: MembershipSubscription): {
  bgColor: string;
  textColor: string;
  text: string;
} {
  const today = getToday();
  const daysToStart = getDaysRemaining(subscription.startDate);
  const daysToEnd = getDaysRemaining(subscription.endDate);

  // Future scheduled membership (starts in future)
  if (subscription.startDate > today) {
    return {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      text: `Starts in ${daysToStart}d`,
    };
  }

  // Expired membership
  if (daysToEnd < 0) {
    const daysAgo = Math.abs(daysToEnd);
    return {
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      text: `Expired ${daysAgo}d ago`,
    };
  }

  // Expiring soon (7 days or less)
  if (daysToEnd <= 7) {
    return {
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      text: `${daysToEnd}d left`,
    };
  }

  // Healthy active membership
  return {
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    text: `${daysToEnd}d left`,
  };
}

export function MemberListPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['members', 'subscriptions']);

  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [slotFilter, setSlotFilter] = useState<string>('');
  const [hideExpired, setHideExpired] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Batch transfer state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSlotId, setTransferSlotId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extra days modal state
  const [showExtraDaysModal, setShowExtraDaysModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<MembershipSubscription | null>(null);
  const [extraDays, setExtraDays] = useState('');
  const [extraDaysReason, setExtraDaysReason] = useState('');
  const [extraDaysError, setExtraDaysError] = useState('');

  // Individual transfer modal state
  const [showIndividualTransferModal, setShowIndividualTransferModal] = useState(false);
  const [transferMember, setTransferMember] = useState<Member | null>(null);
  const [transferSubscription, setTransferSubscription] = useState<MembershipSubscription | null>(null);
  const [individualTransferSlotId, setIndividualTransferSlotId] = useState('');
  const [individualTransferEffectiveDate, setIndividualTransferEffectiveDate] = useState(getToday());
  const [individualTransferReason, setIndividualTransferReason] = useState('');
  const [individualTransferError, setIndividualTransferError] = useState('');

  // Show loading state while fetching data
  if (isLoading) {
    return <PageLoading />;
  }

  // Reconcile stale member/subscription statuses based on actual dates
  memberService.reconcileStatuses();

  // Get data after loading is complete
  const allMembers = memberService.getAll();
  const slots = slotService.getActive();

  // Filter members
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _refresh = refreshKey; // trigger re-render on member updates
  const members = allMembers.filter(member => {
    const matchesSearch = !search ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.phone.includes(search);

    const matchesStatus = !statusFilter || member.status === statusFilter;
    const matchesSlot = !slotFilter || member.assignedSlotId === slotFilter;

    // Hide expired members (no currently active or future scheduled subscription)
    const matchesExpiredFilter = !hideExpired || (() => {
      const today = getToday();
      const subs = subscriptionService.getByMember(member.id);
      // Check if any subscription is currently active (within date range) or scheduled for future
      return subs.some(s =>
        (s.status === 'active' && s.startDate <= today && s.endDate >= today) ||
        (s.status === 'scheduled') ||
        (s.status === 'active' && s.startDate > today)
      );
    })();

    return matchesSearch && matchesStatus && matchesSlot && matchesExpiredFilter;
  });

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      sortValue: (member) => `${member.firstName} ${member.lastName}`.toLowerCase(),
      render: (member) => (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedMembers.has(member.id)}
            onChange={() => toggleMemberSelection(member.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <div>
            <Link
              to={`/admin/members/${member.id}`}
              className="font-medium text-gray-900 hover:text-indigo-600"
            >
              {member.firstName} {member.lastName}
            </Link>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortValue: (member) => member.phone,
      render: (member) => (
        <span className="text-gray-600">{formatPhone(member.phone)}</span>
      ),
    },
    {
      key: 'slot',
      header: 'Session Slot',
      sortValue: (member) => {
        if (!member.assignedSlotId) return null;
        const slot = slots.find(s => s.id === member.assignedSlotId);
        return slot?.displayName || '';
      },
      render: (member) => {
        if (!member.assignedSlotId) {
          return <span className="text-gray-400">Not assigned</span>;
        }
        const slot = slots.find(s => s.id === member.assignedSlotId);
        return <span className="text-gray-600">{slot?.displayName || 'Unknown'}</span>;
      },
    },
    {
      key: 'subscription',
      header: 'Membership',
      sortValue: (member) => {
        const subscription = getRelevantSubscription(member.id);
        if (!subscription) return null;
        return subscription.endDate;
      },
      render: (member) => {
        const subscription = getRelevantSubscription(member.id);
        if (!subscription) {
          return <StatusBadge status="inactive" />;
        }
        // Check if member has a pending renewal (active subscription + future scheduled one)
        const hasPendingRenewal = subscriptionService.hasPendingRenewal(member.id);
        const extraDaysCount = subscription.extraDays || 0;
        const dateBadge = getMembershipDateBadge(subscription);
        const today = getToday();
        const isScheduled = subscription.startDate > today;

        return (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge status={isScheduled ? 'scheduled' : subscription.status} />
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${dateBadge.bgColor} ${dateBadge.textColor}`}>
              {dateBadge.text}
            </span>
            <span className="text-xs text-gray-500">
              {formatDateCompact(subscription.startDate)}→{formatDateCompact(subscription.endDate)}
            </span>
            {hasPendingRenewal && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium" title="Renewal scheduled">
                Renewed
              </span>
            )}
            {extraDaysCount > 0 && (
              <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded" title={subscription.extraDaysReason || 'Extra days'}>
                +{extraDaysCount}d
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (member) => member.status,
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (member) => {
        // Check for active or scheduled subscription
        const hasActiveSubscription = subscriptionService.hasActiveSubscription(member.id);
        const allSubs = subscriptionService.getByMember(member.id);
        const hasScheduledSubscription = allSubs.some(s => s.status === 'scheduled');
        const canEditDays = hasActiveSubscription || hasScheduledSubscription;

        return (
          <div className="flex gap-1.5 justify-end items-center">
            {/* Google Review toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                memberService.update(member.id, { googleReviewGiven: !member.googleReviewGiven });
                setRefreshKey(k => k + 1);
              }}
              title={member.googleReviewGiven ? 'Review given - click to unmark' : 'Mark as review given'}
              className={`p-1 rounded text-lg leading-none ${
                member.googleReviewGiven
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              {member.googleReviewGiven ? '★' : '☆'}
            </button>
            {/* Send Google Review WhatsApp request - only when not given */}
            {!member.googleReviewGiven && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const result = whatsappService.generateGeneralNotification({
                    member,
                    templateIndex: 1,
                  });
                  if (result.link) window.open(result.link, '_blank');
                }}
                title="Send Google Review request via WhatsApp"
                className="p-1 rounded text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            )}
            {canEditDays && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openIndividualTransferModal(member)}
                  title="Transfer to another slot"
                >
                  Transfer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExtraDaysModal(member)}
                  title="Edit extra days on subscription"
                >
                  +Days
                </Button>
              </>
            )}
            <Link to={`/admin/members/${member.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
          </div>
        );
      },
    },
  ];

  // Handle batch transfer
  const handleBatchTransfer = () => {
    if (selectedMembers.size === 0 || !transferSlotId) return;

    setError('');
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    selectedMembers.forEach(memberId => {
      const subscription = subscriptionService.getActiveMemberSubscription(memberId);
      if (!subscription) {
        failCount++;
        const member = memberService.getById(memberId);
        errors.push(`${member?.firstName} ${member?.lastName}: No active subscription`);
        return;
      }

      try {
        subscriptionService.transferSlot(
          subscription.id,
          transferSlotId,
          getToday(),
          transferReason || 'Batch transfer'
        );
        successCount++;
      } catch (err) {
        failCount++;
        const member = memberService.getById(memberId);
        errors.push(`${member?.firstName} ${member?.lastName}: ${err instanceof Error ? err.message : 'Failed'}`);
      }
    });

    if (successCount > 0) {
      setSuccess(`Successfully transferred ${successCount} member(s)`);
    }
    if (failCount > 0) {
      setError(`Failed to transfer ${failCount} member(s): ${errors.join('; ')}`);
    }

    setShowTransferModal(false);
    setSelectedMembers(new Set());
    setTransferSlotId('');
    setTransferReason('');
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  // Select all visible members
  const selectAllMembers = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  };

  // Open extra days modal for a member
  const openExtraDaysModal = (member: Member) => {
    // Try to get active subscription first, then scheduled
    let subscription = subscriptionService.getActiveMemberSubscription(member.id);
    if (!subscription) {
      const allSubs = subscriptionService.getByMember(member.id);
      subscription = allSubs.find(s => s.status === 'scheduled') || null;
    }
    if (!subscription) {
      setExtraDaysError('No active or scheduled subscription found for this member');
      return;
    }
    setSelectedMember(member);
    setSelectedSubscription(subscription);
    // Pre-fill with current extra days value for editing
    setExtraDays(String(subscription.extraDays || 0));
    setExtraDaysReason(subscription.extraDaysReason || '');
    setExtraDaysError('');
    setShowExtraDaysModal(true);
  };

  // Handle setting extra days (can increase or decrease)
  const handleSetExtraDays = () => {
    if (!selectedSubscription) return;

    const days = parseInt(extraDays, 10);
    if (isNaN(days) || days < 0) {
      setExtraDaysError('Please enter a valid number of days (0 or more)');
      return;
    }

    const currentDays = selectedSubscription.extraDays || 0;
    if (days === currentDays && extraDaysReason === (selectedSubscription.extraDaysReason || '')) {
      // No change
      closeExtraDaysModal();
      return;
    }

    try {
      subscriptionService.setExtraDays(selectedSubscription.id, days, extraDaysReason);
      const action = days > currentDays ? 'increased to' : days < currentDays ? 'reduced to' : 'set to';
      setSuccess(`Extra days ${action} ${days} for ${selectedMember?.firstName}'s subscription`);
      setShowExtraDaysModal(false);
      // Reset form
      setSelectedMember(null);
      setSelectedSubscription(null);
      setExtraDays('');
      setExtraDaysReason('');
    } catch (err) {
      setExtraDaysError(err instanceof Error ? err.message : 'Failed to update extra days');
    }
  };

  // Close modal and reset
  const closeExtraDaysModal = () => {
    setShowExtraDaysModal(false);
    setSelectedMember(null);
    setSelectedSubscription(null);
    setExtraDays('');
    setExtraDaysReason('');
    setExtraDaysError('');
  };

  // Open individual transfer modal for a member
  const openIndividualTransferModal = (member: Member) => {
    // Try to get active subscription first, then scheduled
    let subscription = subscriptionService.getActiveMemberSubscription(member.id);
    if (!subscription) {
      const allSubs = subscriptionService.getByMember(member.id);
      subscription = allSubs.find(s => s.status === 'scheduled') || null;
    }
    if (!subscription) {
      setError('No active or scheduled subscription found for this member');
      return;
    }
    setTransferMember(member);
    setTransferSubscription(subscription);
    setIndividualTransferSlotId('');
    setIndividualTransferEffectiveDate(getToday());
    setIndividualTransferReason('');
    setIndividualTransferError('');
    setShowIndividualTransferModal(true);
  };

  // Handle individual transfer
  const handleIndividualTransfer = () => {
    if (!transferSubscription || !individualTransferSlotId) return;

    // Validate effective date is not after subscription end date
    if (individualTransferEffectiveDate > transferSubscription.endDate) {
      setIndividualTransferError('Effective date cannot be after subscription end date');
      return;
    }

    try {
      subscriptionService.transferSlot(
        transferSubscription.id,
        individualTransferSlotId,
        individualTransferEffectiveDate,
        individualTransferReason || 'Slot transfer'
      );
      setSuccess(`Successfully transferred ${transferMember?.firstName} to new slot`);
      closeIndividualTransferModal();
    } catch (err) {
      setIndividualTransferError(err instanceof Error ? err.message : 'Failed to transfer');
    }
  };

  // Close individual transfer modal
  const closeIndividualTransferModal = () => {
    setShowIndividualTransferModal(false);
    setTransferMember(null);
    setTransferSubscription(null);
    setIndividualTransferSlotId('');
    setIndividualTransferEffectiveDate(getToday());
    setIndividualTransferReason('');
    setIndividualTransferError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600">Manage your yoga studio members</p>
        </div>
        <div className="flex gap-2">
          {selectedMembers.size > 0 && (
            <Button variant="outline" onClick={() => setShowTransferModal(true)}>
              Transfer {selectedMembers.size} Selected
            </Button>
          )}
          <Button onClick={() => navigate('/admin/members/new')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </Button>
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

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
          <Select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            options={[
              { value: '', label: 'All Slots' },
              ...slots.map(slot => ({ value: slot.id, label: slot.displayName })),
            ]}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {members.length} {members.length === 1 ? 'member' : 'members'} found
              </span>
              {members.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {selectedMembers.size === members.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!hideExpired}
                onChange={(e) => setHideExpired(!e.target.checked)}
                className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Show expired members
            </label>
          </div>
        </div>
      </Card>

      {/* Members table */}
      {members.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.users}
          title="No members found"
          description={search || statusFilter || slotFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by adding your first member."
          }
          action={
            !search && !statusFilter && !slotFilter && (
              <Link to="/admin/members/new">
                <Button>Add Member</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={members}
            columns={columns}
            keyExtractor={(member) => member.id}
          />
        </Card>
      )}

      {/* Batch Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferSlotId('');
          setTransferReason('');
        }}
        title="Batch Transfer Members"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Transfer {selectedMembers.size} selected member(s) to a different session slot.
          </p>
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-700">Selected members:</p>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {Array.from(selectedMembers).map(memberId => {
                const member = memberService.getById(memberId);
                return member ? (
                  <span key={memberId} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-gray-200 rounded text-xs">
                    {member.firstName} {member.lastName}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Session Slot</label>
            <SlotSelector
              selectedSlotId={transferSlotId}
              onSelect={setTransferSlotId}
              variant="tiles"
              columns={4}
            />
          </div>
          <Input
            label="Reason (Optional)"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            placeholder="e.g., Slot timing change"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchTransfer} disabled={!transferSlotId}>
              Transfer {selectedMembers.size} Member(s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extra Days Error Alert (when no subscription found) */}
      {extraDaysError && !showExtraDaysModal && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant="error" dismissible onDismiss={() => setExtraDaysError('')}>
            {extraDaysError}
          </Alert>
        </div>
      )}

      {/* Edit Extra Days Modal */}
      <Modal
        isOpen={showExtraDaysModal}
        onClose={closeExtraDaysModal}
        title="Edit Extra Days"
      >
        <div className="space-y-4">
          {selectedMember && selectedSubscription && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">
                  {selectedMember.firstName} {selectedMember.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Current subscription ends: {formatDate(selectedSubscription.endDate)}
                </p>
                {selectedSubscription.extraDays && selectedSubscription.extraDays > 0 && (
                  <p className="text-sm text-indigo-600">
                    Current extra days: {selectedSubscription.extraDays}
                    {selectedSubscription.extraDaysReason && ` (${selectedSubscription.extraDaysReason})`}
                  </p>
                )}
              </div>

              {extraDaysError && (
                <Alert variant="error" dismissible onDismiss={() => setExtraDaysError('')}>
                  {extraDaysError}
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra Days
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter number of extra days"
                  value={extraDays}
                  onChange={(e) => setExtraDays(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the total extra days. The end date will be adjusted accordingly.
                </p>
                {(() => {
                  const newDays = parseInt(extraDays, 10) || 0;
                  const currentDays = selectedSubscription.extraDays || 0;
                  const daysDiff = newDays - currentDays;
                  if (daysDiff !== 0) {
                    const currentEnd = new Date(selectedSubscription.endDate);
                    currentEnd.setDate(currentEnd.getDate() + daysDiff);
                    const newEndDate = currentEnd.toISOString().split('T')[0];
                    return (
                      <p className={`text-sm mt-2 ${daysDiff > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {daysDiff > 0 ? '+' : ''}{daysDiff} days → New end date: {formatDate(newEndDate)}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <Input
                  placeholder="e.g., Holiday compensation, Medical leave, Correction"
                  value={extraDaysReason}
                  onChange={(e) => setExtraDaysReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={closeExtraDaysModal} fullWidth>
                  Cancel
                </Button>
                <Button onClick={handleSetExtraDays} fullWidth>
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Individual Transfer Modal */}
      <Modal
        isOpen={showIndividualTransferModal}
        onClose={closeIndividualTransferModal}
        title="Transfer Member"
      >
        <div className="space-y-4">
          {transferMember && transferSubscription && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">
                  {transferMember.firstName} {transferMember.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Current slot: {slots.find(s => s.id === transferSubscription.slotId)?.displayName || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">
                  Subscription: {formatDateCompact(transferSubscription.startDate)} → {formatDateCompact(transferSubscription.endDate)}
                </p>
              </div>

              {individualTransferError && (
                <Alert variant="error" dismissible onDismiss={() => setIndividualTransferError('')}>
                  {individualTransferError}
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Session Slot</label>
                <SlotSelector
                  selectedSlotId={individualTransferSlotId}
                  onSelect={setIndividualTransferSlotId}
                  variant="tiles"
                  columns={4}
                  excludeSlotId={transferSubscription.slotId}
                  currentSlotId={transferSubscription.slotId}
                />
              </div>

              <Input
                label="Effective Date"
                type="date"
                value={individualTransferEffectiveDate}
                onChange={(e) => setIndividualTransferEffectiveDate(e.target.value)}
                helperText="The date from which the new slot becomes effective. Cannot be after subscription end date."
              />

              <Input
                label="Reason (Optional)"
                value={individualTransferReason}
                onChange={(e) => setIndividualTransferReason(e.target.value)}
                placeholder="e.g., Timing preference, Schedule conflict"
              />

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={closeIndividualTransferModal} fullWidth>
                  Cancel
                </Button>
                <Button onClick={handleIndividualTransfer} disabled={!individualTransferSlotId} fullWidth>
                  Transfer
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
