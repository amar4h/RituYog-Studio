import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, Button, Input, Select, Alert } from '../../components/common';
import { memberService, membershipPlanService, subscriptionService, slotService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { getToday, addMonths } from '../../utils/dateUtils';

export function SubscriptionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { memberId?: string; slotId?: string; planId?: string } | null;
  const preselectedMemberId = locationState?.memberId;
  const preselectedSlotId = locationState?.slotId;
  const preselectedPlanId = locationState?.planId;

  // Get preselected member's slot if available
  const preselectedMember = preselectedMemberId ? memberService.getById(preselectedMemberId) : null;

  // Determine which slot to pre-select: from navigation state, or member's existing slot
  const initialSlotId = preselectedSlotId || preselectedMember?.assignedSlotId || '';

  const [formData, setFormData] = useState({
    memberId: preselectedMemberId || '',
    planId: preselectedPlanId || '',
    slotId: initialSlotId,
    startDate: getToday(),
    discountAmount: 0,
    discountReason: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState('');

  // Get all members that are eligible for subscription
  const allMembers = memberService.getAll().filter(m => ['active', 'pending', 'trial'].includes(m.status));

  // Filter out members who already have active subscriptions (unless they are the preselected member)
  const members = allMembers.filter(m => {
    // Always include the preselected member (they are being converted from lead)
    if (m.id === preselectedMemberId) return true;
    // Exclude members with active subscriptions
    const activeSubscription = subscriptionService.getActiveMemberSubscription(m.id);
    return !activeSubscription;
  });

  const plans = membershipPlanService.getActive();
  const slots = slotService.getActive();

  const selectedPlan = plans.find(p => p.id === formData.planId);
  const selectedMember = members.find(m => m.id === formData.memberId);
  const selectedSlot = slots.find(s => s.id === formData.slotId);

  // Determine if slot selection should be shown
  // Hide it when member already has an assigned slot (renewal/extension scenario)
  const memberHasAssignedSlot = selectedMember?.assignedSlotId;
  const shouldShowSlotSelection = !memberHasAssignedSlot;

  // Calculate amounts
  const originalAmount = selectedPlan?.price || 0;
  const payableAmount = Math.max(0, originalAmount - formData.discountAmount);
  const endDate = selectedPlan
    ? addMonths(formData.startDate, selectedPlan.durationMonths)
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

    if (formData.discountAmount > originalAmount) {
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
        formData.discountAmount > 0 ? formData.discountAmount : 0,
        formData.discountReason.trim() || undefined
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/admin/subscriptions" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Subscriptions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          New Subscription
        </h1>
        <p className="text-gray-600">Create a new membership subscription</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Member Selection */}
            <Card title="Member">
              <Select
                label="Select Member"
                value={formData.memberId}
                onChange={(e) => {
                  const memberId = e.target.value;
                  const member = members.find(m => m.id === memberId);
                  // Auto-set slot if member has an assigned slot
                  const slotId = member?.assignedSlotId || formData.slotId;
                  setFormData(prev => ({ ...prev, memberId, slotId }));
                }}
                options={[
                  { value: '', label: 'Choose a member...' },
                  ...members.map(m => ({
                    value: m.id,
                    label: `${m.firstName} ${m.lastName} (${m.email})`,
                  })),
                ]}
                required
              />

              {preselectedMemberId && selectedMember && (
                <p className="text-xs text-gray-500 mt-2">
                  Member pre-selected from lead conversion.
                </p>
              )}

              {members.length === 0 && !preselectedMemberId && (
                <Alert variant="info" className="mt-4">
                  No members available for new subscription. All existing members already have active subscriptions.
                </Alert>
              )}

              {existingSubscription && (
                <Alert variant="warning" className="mt-4">
                  This member already has an active subscription that expires on {existingSubscription.endDate}.
                  Creating a new subscription will replace the existing one.
                </Alert>
              )}
            </Card>

            {/* Plan Selection */}
            <Card title="Membership Plan">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, planId: plan.id }))}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      formData.planId === plan.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-500">{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</p>
                      </div>
                      <p className="text-lg font-bold text-indigo-600">
                        {formatCurrency(plan.price)}
                      </p>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
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
                <p className="text-sm text-gray-600 mb-4">
                  Select the session slot the member will attend. This slot will be assigned to the member for the duration of their subscription.
                </p>
                {preselectedSlotId && formData.slotId === preselectedSlotId && (
                  <p className="text-xs text-indigo-600 mb-4">
                    Slot pre-selected from trial booking.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slots.map(slot => {
                    const isCurrentSlot = selectedMember?.assignedSlotId === slot.id;

                    // Use checkSlotCapacity for accurate capacity check based on subscription period
                    // This matches the backend validation logic
                    const capacityCheck = selectedPlan && endDate
                      ? subscriptionService.checkSlotCapacity(slot.id, formData.startDate, endDate)
                      : null;

                    // Fallback to simple availability check if no plan selected yet
                    const availability = slotService.getSlotAvailability(slot.id, getToday());

                    const isCompletelyFull = capacityCheck
                      ? !capacityCheck.available
                      : (availability.regularBookings + availability.exceptionBookings) >= (slot.capacity + slot.exceptionCapacity);
                    const isNormalCapacityFull = capacityCheck
                      ? capacityCheck.isExceptionOnly
                      : availability.regularBookings >= slot.capacity;

                    // Display values from capacity check or availability
                    const currentBookings = capacityCheck?.currentBookings ?? (availability.regularBookings + availability.exceptionBookings);
                    const totalCapacity = capacityCheck?.totalCapacity ?? (slot.capacity + slot.exceptionCapacity);

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          if (!isCompletelyFull) {
                            setFormData(prev => ({ ...prev, slotId: slot.id }));
                            // Show warning if selecting a slot that's using exception capacity
                            if (isNormalCapacityFull) {
                              setCapacityWarning(`Warning: Normal capacity for "${slot.displayName}" is full. Adding a member will use exception capacity.`);
                            } else {
                              setCapacityWarning('');
                            }
                          }
                        }}
                        disabled={isCompletelyFull}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          isCompletelyFull
                            ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-70'
                            : formData.slotId === slot.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold ${isCompletelyFull ? 'text-red-700' : 'text-gray-900'}`}>{slot.displayName}</p>
                            <p className="text-sm text-gray-500">{slot.startTime} - {slot.endTime}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isCurrentSlot && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Current
                              </span>
                            )}
                            {isCompletelyFull && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                Full
                              </span>
                            )}
                            {!isCompletelyFull && isNormalCapacityFull && (
                              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                Exception Only
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className={isNormalCapacityFull ? 'text-amber-600' : 'text-gray-600'}>
                            {currentBookings}/{totalCapacity} booked
                          </span>
                          {capacityCheck && (
                            <span className="text-gray-400 ml-2 text-xs">
                              ({capacityCheck.normalCapacity} regular + {totalCapacity - capacityCheck.normalCapacity} exc.)
                            </span>
                          )}
                        </div>
                        {isCompletelyFull && (
                          <p className="mt-2 text-xs text-red-600">
                            This slot is completely full for the selected period.
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

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
              /* For renewals/extensions, show the assigned slot as read-only info */
              selectedSlot && (
                <Card title="Session Slot">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="font-semibold text-indigo-900">{selectedSlot.displayName}</p>
                    <p className="text-sm text-indigo-700">{selectedSlot.startTime} - {selectedSlot.endTime}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    The member's existing slot will be retained for this renewal.
                  </p>
                </Card>
              )
            )}

            {/* Subscription Details */}
            <Card title="Subscription Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  helperText="Calculated based on plan duration"
                />
              </div>
            </Card>

            {/* Discount */}
            <Card title="Discount (Optional)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Discount Amount (₹)"
                  type="number"
                  min={0}
                  max={originalAmount}
                  value={formData.discountAmount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discountAmount: parseInt(e.target.value) || 0,
                  }))}
                />
                <Input
                  label="Discount Reason"
                  value={formData.discountReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountReason: e.target.value }))}
                  placeholder="e.g., Early bird, Referral"
                />
              </div>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
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
                      {formData.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(formData.discountAmount)}</span>
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

            <div className="space-y-3">
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
            </div>

            <p className="text-xs text-gray-500 text-center">
              Creating a subscription will automatically generate an invoice.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
