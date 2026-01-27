import { useState, FormEvent, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, SlotSelector } from '../../components/common';
import { memberService, membershipPlanService, subscriptionService, slotService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { getToday, addDays, calculateSubscriptionEndDate } from '../../utils/dateUtils';

export function SubscriptionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { memberId?: string; slotId?: string; planId?: string; isRenewal?: boolean } | null;
  const preselectedMemberId = locationState?.memberId;
  const preselectedSlotId = locationState?.slotId;
  const preselectedPlanId = locationState?.planId;
  const isRenewalFromNavigation = locationState?.isRenewal || false;

  // Get preselected member's slot if available
  const preselectedMember = preselectedMemberId ? memberService.getById(preselectedMemberId) : null;

  // Check if this is a renewal (member has existing, scheduled, or recently expired subscription)
  const existingOrExpiredSubscription = useMemo(() => {
    if (!preselectedMemberId) return null;
    const allSubs = subscriptionService.getByMember(preselectedMemberId);
    const today = getToday();

    // Sort by end date descending to get the latest subscription
    const sortedSubs = [...allSubs].sort((a, b) =>
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );

    // Find the most relevant subscription for renewal purposes
    // Priority: active > scheduled > recently expired
    const active = sortedSubs.find(s =>
      s.status === 'active' && s.startDate <= today && s.endDate >= today
    );
    if (active) return active;

    const scheduled = sortedSubs.find(s =>
      s.status === 'scheduled' || (s.status === 'active' && s.startDate > today)
    );
    if (scheduled) return scheduled;

    // Check for recently expired (within last 30 days)
    const recentlyExpired = sortedSubs.find(s => {
      if (s.status !== 'expired' && s.status !== 'active') return false;
      const expiredDate = new Date(s.endDate);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return expiredDate >= thirtyDaysAgo && expiredDate < new Date(today);
    });
    return recentlyExpired || null;
  }, [preselectedMemberId]);

  const isRenewal = isRenewalFromNavigation || !!existingOrExpiredSubscription;

  // For renewals, calculate start date based on existing subscription
  // Always set to day after the latest subscription ends
  const getInitialStartDate = () => {
    if (existingOrExpiredSubscription) {
      // Always start day after existing subscription ends
      // This ensures no overlap and proper continuity
      return addDays(existingOrExpiredSubscription.endDate, 1);
    }
    return getToday();
  };

  // Determine which slot to pre-select: from navigation state, or member's existing slot
  const initialSlotId = preselectedSlotId || preselectedMember?.assignedSlotId || '';

  // Get plans and slots first for default selection
  const plans = membershipPlanService.getActive();
  const slots = slotService.getActive();

  // Get the Monthly plan as default when no plan is preselected
  const monthlyPlan = plans.find(p => p.type === 'monthly');
  const initialPlanId = preselectedPlanId || monthlyPlan?.id || '';

  // For renewals, auto-apply discount from previous subscription
  const getInitialDiscount = () => {
    if (existingOrExpiredSubscription && existingOrExpiredSubscription.discountAmount > 0) {
      const prevSub = existingOrExpiredSubscription;

      // Use stored discount type if available (percentage preserves the %)
      if (prevSub.discountType === 'percentage' && prevSub.discountPercentage) {
        return {
          discountType: 'percentage' as const,
          discountValue: prevSub.discountPercentage,
          discountReason: prevSub.discountReason || '',
        };
      }

      // Default to fixed amount (backward compatibility)
      return {
        discountType: 'fixed' as const,
        discountValue: prevSub.discountAmount,
        discountReason: prevSub.discountReason || '',
      };
    }
    return {
      discountType: 'percentage' as 'fixed' | 'percentage',
      discountValue: 0,
      discountReason: '',
    };
  };

  const initialDiscount = getInitialDiscount();

  const [formData, setFormData] = useState({
    memberId: preselectedMemberId || '',
    planId: initialPlanId,
    slotId: initialSlotId,
    startDate: getInitialStartDate(),
    discountType: initialDiscount.discountType,
    discountValue: initialDiscount.discountValue,
    discountReason: initialDiscount.discountReason,
    allowSlotChange: false, // For renewals - whether to allow changing slot
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState('');

  // Get all members that are eligible for subscription
  // Always include preselected member regardless of status (for renewals/expired members)
  const allMembers = memberService.getAll().filter(m =>
    m.id === preselectedMemberId || ['active', 'pending', 'trial'].includes(m.status)
  );

  // Filter out members who already have active subscriptions (unless they are the preselected member)
  const members = allMembers.filter(m => {
    // Always include the preselected member (for renewals or expired member subscriptions)
    if (m.id === preselectedMemberId) return true;
    // Exclude members with active subscriptions
    const activeSubscription = subscriptionService.getActiveMemberSubscription(m.id);
    return !activeSubscription;
  });

  const selectedPlan = plans.find(p => p.id === formData.planId);
  const selectedMember = members.find(m => m.id === formData.memberId);
  const selectedSlot = slots.find(s => s.id === formData.slotId);

  // Determine if slot selection should be shown
  // Show it when member doesn't have an assigned slot OR when allowSlotChange is enabled for renewals
  const memberHasAssignedSlot = selectedMember?.assignedSlotId;
  const shouldShowSlotSelection = !memberHasAssignedSlot || formData.allowSlotChange;

  // Calculate amounts with discount type support
  const originalAmount = selectedPlan?.price || 0;
  const discountAmount = formData.discountType === 'percentage'
    ? Math.round((originalAmount * formData.discountValue) / 100)
    : formData.discountValue;
  const payableAmount = Math.max(0, originalAmount - discountAmount);
  const endDate = selectedPlan
    ? calculateSubscriptionEndDate(formData.startDate, selectedPlan.durationMonths)
    : '';

  // Check if member already has active subscription
  const existingSubscription = formData.memberId
    ? subscriptionService.getActiveMemberSubscription(formData.memberId)
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.memberId) {
      setError('Please select a member');
      return;
    }

    if (!formData.planId) {
      setError('Please select a plan');
      return;
    }

    if (!formData.slotId) {
      setError('Please select a session slot');
      return;
    }

    if (discountAmount > originalAmount) {
      setError('Discount cannot exceed the plan price');
      return;
    }

    setLoading(true);

    try {
      const result = subscriptionService.createWithInvoice(
        formData.memberId,
        formData.planId,
        formData.slotId,
        formData.startDate,
        discountAmount > 0 ? discountAmount : 0,
        formData.discountReason.trim() || undefined,
        undefined, // notes
        formData.discountType,
        formData.discountType === 'percentage' ? formData.discountValue : undefined
      );

      // If there's a warning (e.g., using exception capacity), show it before navigating
      if (result.warning) {
        // Use browser alert for immediate feedback, then navigate
        alert(result.warning);
      }

      navigate(`/admin/invoices/${result.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link to="/admin/subscriptions" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Subscriptions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isRenewal ? 'Renew Subscription' : 'New Subscription'}
        </h1>
        <p className="text-gray-600">
          {isRenewal
            ? `Renew membership for ${preselectedMember?.firstName} ${preselectedMember?.lastName}`
            : 'Create a new membership subscription'
          }
        </p>
        {isRenewal && existingOrExpiredSubscription && (
          <p className="text-sm text-indigo-600 mt-1">
            Previous subscription: {existingOrExpiredSubscription.startDate} to {existingOrExpiredSubscription.endDate}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {capacityWarning && (
        <Alert variant="warning" dismissible onDismiss={() => setCapacityWarning('')}>
          {capacityWarning}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Member & Dates */}
            <Card title="Member & Dates">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="Member"
                  value={formData.memberId}
                  onChange={(e) => {
                    const memberId = e.target.value;
                    const member = members.find(m => m.id === memberId);
                    // Auto-set slot if member has an assigned slot
                    const slotId = member?.assignedSlotId || formData.slotId;

                    // Auto-set start date if member has existing subscription
                    let startDate = formData.startDate;
                    if (memberId) {
                      const allSubs = subscriptionService.getByMember(memberId);
                      // Find the latest active or scheduled subscription
                      const latestSub = allSubs
                        .filter(s => ['active', 'scheduled', 'pending'].includes(s.status))
                        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
                      if (latestSub) {
                        // Start day after the latest subscription ends
                        startDate = addDays(latestSub.endDate, 1);
                      }
                    }

                    setFormData(prev => ({ ...prev, memberId, slotId, startDate }));
                  }}
                  options={[
                    { value: '', label: 'Select...' },
                    ...members.map(m => ({
                      value: m.id,
                      label: `${m.firstName} ${m.lastName}`,
                    })),
                  ]}
                  required
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  disabled
                />
              </div>

              {members.length === 0 && !preselectedMemberId && (
                <Alert variant="info" className="mt-3">
                  No members available. All existing members already have active subscriptions.
                </Alert>
              )}

              {existingSubscription && (
                <Alert variant="info" className="mt-3">
                  Active subscription until <strong>{existingSubscription.endDate}</strong>. Start date set to <strong>{addDays(existingSubscription.endDate, 1)}</strong>.
                </Alert>
              )}
            </Card>

            {/* Plan Selection */}
            <Card title="Membership Plan">
              <div className="grid grid-cols-2 gap-3">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, planId: plan.id }))}
                    className={`p-2 border-2 rounded-lg text-left transition-colors ${
                      formData.planId === plan.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="font-bold text-indigo-600 whitespace-nowrap">
                        {formatCurrency(plan.price)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</p>
                    {plan.description && (
                      <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                    )}
                  </button>
                ))}
              </div>

              {plans.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">No active plans available</p>
                  <Link to="/admin/memberships" className="text-indigo-600 hover:text-indigo-700 text-sm">
                    Manage Plans →
                  </Link>
                </div>
              )}
            </Card>

            {/* Session Slot Selection - Only show when member doesn't have an assigned slot */}
            {shouldShowSlotSelection ? (
              <Card title="Session Slot">
                <SlotSelector
                  selectedSlotId={formData.slotId}
                  onSelect={(slotId) => {
                    setFormData(prev => ({ ...prev, slotId }));
                    // Check if slot uses exception capacity and show warning
                    // But skip warning if this is a renewal and member is staying in their current slot
                    const isMemberCurrentSlot = selectedMember?.assignedSlotId === slotId;
                    if (selectedPlan && endDate && !isMemberCurrentSlot) {
                      const capacityCheck = subscriptionService.checkSlotCapacity(slotId, formData.startDate, endDate);
                      if (capacityCheck.isExceptionOnly) {
                        const slot = slots.find(s => s.id === slotId);
                        setCapacityWarning(`Warning: Normal capacity for "${slot?.displayName}" is full. Adding a member will use exception capacity.`);
                      } else {
                        setCapacityWarning('');
                      }
                    } else {
                      setCapacityWarning('');
                    }
                  }}
                  variant="tiles"
                  columns={4}
                  showCapacity
                  subscriptionStartDate={formData.startDate}
                  subscriptionEndDate={endDate}
                  currentSlotId={selectedMember?.assignedSlotId}
                />

                {slots.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No active slots available</p>
                    <Link to="/admin/sessions" className="text-indigo-600 hover:text-indigo-700 text-sm">
                      Manage Sessions →
                    </Link>
                  </div>
                )}
              </Card>
            ) : (
              /* For renewals/extensions, show the assigned slot with option to change */
              selectedSlot && (
                <Card title="Session Slot">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="font-semibold text-indigo-900">{selectedSlot.displayName}</p>
                    <p className="text-sm text-indigo-700">{selectedSlot.startTime} - {selectedSlot.endTime}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {formData.allowSlotChange
                        ? 'Select a new slot from the options above'
                        : "The member's existing slot will be retained for this renewal."
                      }
                    </p>
                    {isRenewal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          allowSlotChange: !prev.allowSlotChange,
                          slotId: prev.allowSlotChange ? (selectedMember?.assignedSlotId || '') : prev.slotId,
                        }))}
                      >
                        {formData.allowSlotChange ? 'Keep Current Slot' : 'Change Slot'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            )}

            {/* Discount */}
            <Card title="Discount (Optional)">
              <div className="grid grid-cols-3 gap-2">
                <Select
                  label="Type"
                  value={formData.discountType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discountType: e.target.value as 'fixed' | 'percentage',
                    discountValue: 0, // Reset value when type changes
                  }))}
                  options={[
                    { value: 'percentage', label: '%' },
                    { value: 'fixed', label: '₹' },
                  ]}
                />
                <Input
                  label={formData.discountType === 'percentage' ? '%' : '₹'}
                  type="number"
                  min={0}
                  max={formData.discountType === 'percentage' ? 100 : originalAmount}
                  value={formData.discountValue}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discountValue: parseInt(e.target.value) || 0,
                  }))}
                />
                <Input
                  label="Reason"
                  value={formData.discountReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountReason: e.target.value }))}
                  placeholder="e.g., Referral"
                />
              </div>
              {formData.discountType === 'percentage' && formData.discountValue > 0 && selectedPlan && (
                <p className="text-xs text-gray-600 mt-2">
                  {formData.discountValue}% = {formatCurrency(discountAmount)} off
                </p>
              )}
              {isRenewal && existingOrExpiredSubscription && existingOrExpiredSubscription.discountAmount > 0 && (
                <p className="text-xs text-indigo-600 mt-2">
                  Discount of {formatCurrency(existingOrExpiredSubscription.discountAmount)} auto-applied from previous subscription.
                </p>
              )}
            </Card>
          </div>

          {/* Right Column - Sticky on desktop */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Summary */}
            <Card title="Summary">
              <div className="space-y-4">
                {selectedMember && (
                  <div>
                    <p className="text-sm text-gray-500">Member</p>
                    <p className="font-medium text-gray-900">
                      {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <p className="text-sm text-gray-500">Session Slot</p>
                    <p className="font-medium text-gray-900">{selectedSlot.displayName}</p>
                    <p className="text-xs text-gray-500">{selectedSlot.startTime} - {selectedSlot.endTime}</p>
                  </div>
                )}

                {selectedPlan && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Plan</p>
                      <p className="font-medium text-gray-900">{selectedPlan.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Period</p>
                      <p className="font-medium text-gray-900">
                        {formData.startDate} to {endDate}
                      </p>
                      <p className="text-xs text-gray-500">{selectedPlan.durationMonths} {selectedPlan.durationMonths === 1 ? 'month' : 'months'}</p>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan Price</span>
                        <span className="text-gray-900">{formatCurrency(originalAmount)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>
                            Discount
                            {formData.discountType === 'percentage' && ` (${formData.discountValue}%)`}
                          </span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total</span>
                        <span className="text-indigo-600">{formatCurrency(payableAmount)}</span>
                      </div>
                    </div>
                  </>
                )}

                {!selectedPlan && (
                  <p className="text-gray-500 text-center py-4">
                    Select a plan to see summary
                  </p>
                )}
              </div>
            </Card>

            <div className="space-y-2">
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={!formData.memberId || !formData.planId || !formData.slotId}
              >
                Create Subscription
              </Button>
              <Link to="/admin/subscriptions">
                <Button type="button" variant="outline" fullWidth>
                  Cancel
                </Button>
              </Link>
              <p className="text-xs text-gray-500 text-center pt-1">
                Creating a subscription will automatically generate an invoice.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
