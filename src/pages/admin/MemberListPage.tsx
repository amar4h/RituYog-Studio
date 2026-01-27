import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Modal, Alert, SlotSelector, PageLoading } from '../../components/common';
import { memberService, slotService, subscriptionService } from '../../services';
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

  // Get data after loading is complete
  const allMembers = memberService.getAll();
  const slots = slotService.getActive();

  // Filter members
  const members = allMembers.filter(member => {
    const matchesSearch = !search ||
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.phone.includes(search);

    const matchesStatus = !statusFilter || member.status === statusFilter;
    const matchesSlot = !slotFilter || member.assignedSlotId === slotFilter;

    return matchesSearch && matchesStatus && matchesSlot;
  });

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
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
      render: (member) => (
        <span className="text-gray-600">{formatPhone(member.phone)}</span>
      ),
    },
    {
      key: 'slot',
      header: 'Session Slot',
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
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (member) => {
        // Check for active or scheduled subscription
        const hasActiveSubscription = subscriptionService.hasActiveSubscription(member.id);
        const allSubs = subscriptionService.getByMember(member.id);
        const hasScheduledSubscription = allSubs.some(s => s.status === 'scheduled');
        const canEditDays = hasActiveSubscription || hasScheduledSubscription;

        return (
          <div className="flex gap-2 justify-end">
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
