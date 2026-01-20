import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, Button, StatusBadge, Badge, Select, ConfirmDialog, Alert, Modal } from '../../components/common';
import { leadService, slotService, trialBookingService, membershipPlanService, subscriptionService } from '../../services';
import { formatPhone, formatName, formatCurrency } from '../../utils/formatUtils';
import { formatDate, getToday, calculateSubscriptionEndDate } from '../../utils/dateUtils';
import type { Lead } from '../../types';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { openConvertModal?: boolean } | null;
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [converting, setConverting] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState('');

  const lead = id ? leadService.getById(id) : null;
  const slots = slotService.getActive();
  const membershipPlans = membershipPlanService.getActive();

  // Get the Monthly plan as default
  const monthlyPlan = membershipPlans.find(p => p.type === 'monthly');

  // Subscription selection state for conversion
  const [selectedPlanId, setSelectedPlanId] = useState(monthlyPlan?.id || '');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [startDate, setStartDate] = useState(getToday());
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  // Auto-open convert modal if navigated from list page with openConvertModal state
  useEffect(() => {
    if (locationState?.openConvertModal && lead && lead.status !== 'converted' && lead.status !== 'lost') {
      // Pre-select the lead's preferred slot if available
      if (lead.preferredSlotId) {
        setSelectedSlotId(lead.preferredSlotId);
      }
      setShowConvertModal(true);
      // Clear the state to prevent re-opening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [locationState, lead, navigate, location.pathname]);

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Lead not found</h2>
        <p className="text-gray-600 mt-2">The lead you're looking for doesn't exist.</p>
        <Link to="/admin/leads" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
          ← Back to Leads
        </Link>
      </div>
    );
  }

  const preferredSlot = lead.preferredSlotId ? slotService.getById(lead.preferredSlotId) : null;
  const trialSlot = lead.trialSlotId ? slotService.getById(lead.trialSlotId) : null;
  const trialBookings = trialBookingService.getAll().filter(t => t.leadId === lead.id);

  const handleStatusChange = (newStatus: string) => {
    try {
      leadService.update(lead.id, { status: newStatus as Lead['status'] });
      setSuccess('Status updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleConvert = () => {
    if (!selectedPlanId || !selectedSlotId) {
      setError('Please select a membership plan and slot');
      return;
    }

    setConverting(true);
    setError('');

    try {
      // Convert lead to member
      const member = leadService.convertToMember(lead.id);

      // Calculate discount amount
      const originalAmount = selectedPlan?.price || 0;
      const calculatedDiscount = discountType === 'percentage'
        ? Math.round((originalAmount * discountValue) / 100)
        : discountValue;

      // Create subscription directly - this also sets member status to 'active'
      const result = subscriptionService.createWithInvoice(
        member.id,
        selectedPlanId,
        selectedSlotId,
        startDate,
        calculatedDiscount,
        discountReason || undefined
      );

      // If there's a warning (e.g., using exception capacity), show it before navigating
      if (result.warning) {
        alert(result.warning);
      }

      // Only navigate if everything succeeded
      setShowConvertModal(false);
      navigate('/admin/members');
    } catch (err) {
      // Show any error (from conversion or subscription creation)
      setError(err instanceof Error ? err.message : 'Failed to convert lead or create subscription');
    } finally {
      setConverting(false);
    }
  };

  const openConvertModal = () => {
    // Pre-select the lead's preferred slot if available
    if (lead?.preferredSlotId) {
      setSelectedSlotId(lead.preferredSlotId);
    }
    setShowConvertModal(true);
  };

  const selectedPlan = membershipPlans.find(p => p.id === selectedPlanId);
  const endDate = selectedPlan ? calculateSubscriptionEndDate(startDate, selectedPlan.durationMonths) : '';

  const handleDelete = () => {
    try {
      leadService.delete(lead.id);
      navigate('/admin/leads');
    } catch (err) {
      setError('Failed to delete lead');
    }
  };

  const handleBookTrial = (slotId: string, date: string) => {
    try {
      trialBookingService.bookTrial(lead.id, slotId, date);
      leadService.update(lead.id, {
        status: 'trial-scheduled',
        trialSlotId: slotId,
        trialDate: date,
      });
      setSuccess('Trial booked successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book trial');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/admin/leads" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {formatName(lead.firstName, lead.lastName)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={lead.status} />
            <Badge variant="outline">{lead.source}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <Button onClick={openConvertModal}>
              Convert to Member
            </Button>
          )}
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card title="Contact Information">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-gray-900">
                <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {lead.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-gray-900">{formatPhone(lead.phone)}</dd>
            </div>
            {lead.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-gray-900">{lead.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-gray-600">{formatDate(lead.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        {/* Status Management */}
        <Card title="Status">
          {lead.status === 'converted' ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-900">Converted to Member</p>
                {lead.convertedToMemberId && (
                  <Link
                    to={`/admin/members/${lead.convertedToMemberId}`}
                    className="text-sm text-green-700 hover:text-green-800"
                  >
                    View Member Profile →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                label="Current Status"
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'contacted', label: 'Contacted' },
                  { value: 'trial-scheduled', label: 'Trial Scheduled' },
                  { value: 'trial-completed', label: 'Trial Completed' },
                  { value: 'negotiating', label: 'Negotiating' },
                  { value: 'lost', label: 'Lost' },
                ]}
              />
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Status Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lead Created</span>
                    <span className="text-gray-900">{formatDate(lead.createdAt)}</span>
                  </div>
                  {lead.updatedAt !== lead.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="text-gray-900">{formatDate(lead.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Preferences */}
        <Card title="Preferences">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Preferred Slot</dt>
              <dd className="mt-1 text-gray-900">
                {preferredSlot ? (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="font-medium text-indigo-900">{preferredSlot.displayName}</p>
                    <p className="text-sm text-indigo-700">
                      {preferredSlot.startTime} - {preferredSlot.endTime}
                    </p>
                  </div>
                ) : (
                  <span className="text-gray-400">Not specified</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Trial Information */}
      <Card title="Trial Session">
        {lead.trialDate && trialSlot ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-blue-900">Trial Scheduled</p>
                  <p className="text-sm text-blue-700">
                    {formatDate(lead.trialDate)} at {trialSlot.displayName}
                  </p>
                  <p className="text-sm text-blue-600">
                    {trialSlot.startTime} - {trialSlot.endTime}
                  </p>
                </div>
                {lead.status === 'trial-scheduled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('trial-completed')}
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>

            {trialBookings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Trial History</h4>
                <div className="space-y-2">
                  {trialBookings.map(booking => {
                    const slot = slotService.getById(booking.slotId);
                    return (
                      <div
                        key={booking.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(booking.date)}
                          </p>
                          <p className="text-xs text-gray-500">{slot?.displayName}</p>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500">No trial scheduled yet.</p>
            {lead.status !== 'converted' && lead.status !== 'lost' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map(slot => {
                  const availability = slotService.getSlotAvailability(slot.id, getToday());
                  const hasSpace = availability.availableRegular > 0 || availability.availableException > 0;
                  return (
                    <button
                      key={slot.id}
                      disabled={!hasSpace}
                      onClick={() => handleBookTrial(slot.id, getToday())}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        hasSpace
                          ? 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                          : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{slot.displayName}</p>
                      <p className="text-sm text-gray-500">
                        {slot.startTime} - {slot.endTime}
                      </p>
                      <p className={`text-xs mt-1 ${hasSpace ? 'text-green-600' : 'text-red-600'}`}>
                        {hasSpace
                          ? `${availability.availableRegular + availability.availableException} spots available`
                          : 'Full'
                        }
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Medical Conditions */}
      {lead.medicalConditions && lead.medicalConditions.length > 0 && (
        <Card title="Medical Conditions">
          <div className="space-y-2">
            {lead.medicalConditions.map((condition, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-900">{condition.condition}</p>
                {condition.details && (
                  <p className="text-sm text-red-700 mt-1">{condition.details}</p>
                )}
                <p className="text-xs text-red-600 mt-1">
                  Reported: {formatDate(condition.reportedDate)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Consent Records */}
      {lead.consentRecords && lead.consentRecords.length > 0 && (
        <Card title="Consent Records">
          <div className="space-y-2">
            {lead.consentRecords.map((consent, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  consent.consentGiven ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 capitalize">
                    {consent.type.replace(/-/g, ' ')}
                  </span>
                  <Badge variant={consent.consentGiven ? 'success' : 'error'}>
                    {consent.consentGiven ? 'Given' : 'Not Given'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {formatDate(consent.consentDate)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Convert to Member Modal with Subscription Selection */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Convert Lead to Member"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600">
            Converting <span className="font-semibold">{formatName(lead.firstName, lead.lastName)}</span> to a member.
            Select a membership plan and slot to activate their subscription immediately.
          </p>

          <>
              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Membership Plan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {membershipPlans.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        selectedPlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{plan.name}</p>
                          <p className="text-sm text-gray-500">
                            {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-indigo-600">
                          {formatCurrency(plan.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {membershipPlans.length === 0 && (
                  <p className="text-sm text-gray-500">No active membership plans available.</p>
                )}
              </div>

              {/* Slot Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Slot <span className="text-red-500">*</span>
                </label>
                {capacityWarning && (
                  <Alert variant="warning" className="mb-3" dismissible onDismiss={() => setCapacityWarning('')}>
                    {capacityWarning}
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {slots.map(slot => {
                    const isPreferred = slot.id === lead.preferredSlotId;

                    // Use checkSlotCapacity for accurate capacity check based on subscription period
                    const capacityCheck = selectedPlan && endDate
                      ? subscriptionService.checkSlotCapacity(slot.id, startDate, endDate)
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
                            setSelectedSlotId(slot.id);
                            if (isNormalCapacityFull) {
                              setCapacityWarning(`Normal capacity for "${slot.displayName}" is full. Adding will use exception capacity.`);
                            } else {
                              setCapacityWarning('');
                            }
                          }
                        }}
                        disabled={isCompletelyFull}
                        className={`p-3 border-2 rounded-lg text-left transition-colors ${
                          isCompletelyFull
                            ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-70'
                            : selectedSlotId === slot.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-semibold text-sm ${isCompletelyFull ? 'text-red-700' : 'text-gray-900'}`}>
                              {slot.displayName}
                            </p>
                            <p className="text-xs text-gray-500">{slot.startTime} - {slot.endTime}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isPreferred && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                Preferred
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
                        <div className="mt-1 text-xs">
                          <span className={isNormalCapacityFull ? 'text-amber-600' : 'text-gray-600'}>
                            {currentBookings}/{totalCapacity} booked
                          </span>
                          {capacityCheck && (
                            <span className="text-gray-400 ml-1">
                              ({capacityCheck.normalCapacity}+{totalCapacity - capacityCheck.normalCapacity})
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {lead.preferredSlotId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Lead's preferred slot is marked.
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Discount Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount (Optional)
                </label>
                <div className="flex gap-3">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Rs)</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={discountType === 'percentage' ? 100 : selectedPlan?.price || 99999}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                    placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {discountValue > 0 && (
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Discount reason (optional)"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Summary */}
              {selectedPlan && (() => {
                const originalAmount = selectedPlan.price;
                const calculatedDiscount = discountType === 'percentage'
                  ? Math.round((originalAmount * discountValue) / 100)
                  : discountValue;
                const payableAmount = Math.max(0, originalAmount - calculatedDiscount);

                return (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan</span>
                        <span className="text-gray-900">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period</span>
                        <span className="text-gray-900">{startDate} to {endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Amount</span>
                        <span className="text-gray-900">{formatCurrency(originalAmount)}</span>
                      </div>
                      {calculatedDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount{discountType === 'percentage' ? ` (${discountValue}%)` : ''}</span>
                          <span>-{formatCurrency(calculatedDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-2 mt-2">
                        <span className="text-gray-900">Payable Amount</span>
                        <span className="text-indigo-600">{formatCurrency(payableAmount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              disabled={converting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              loading={converting}
              disabled={!selectedPlanId || !selectedSlotId}
              fullWidth
            >
              Convert & Activate Subscription
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete ${formatName(lead.firstName, lead.lastName)}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
