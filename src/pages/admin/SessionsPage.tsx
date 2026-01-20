import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Modal, Alert } from '../../components/common';
import { slotService, slotSubscriptionService, memberService, trialBookingService, subscriptionService } from '../../services';
import { getToday } from '../../utils/dateUtils';
import type { SessionSlot, Member, SlotSubscription } from '../../types';

export function SessionsPage() {
  const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacity, setCapacity] = useState(10);
  const [exceptionCapacity, setExceptionCapacity] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const slots = slotService.getActive();
  const today = getToday();

  const getSlotData = (slot: SessionSlot) => {
    const allSlotSubscriptions = slotSubscriptionService.getActiveForSlot(slot.id);
    const trials = trialBookingService.getBySlotAndDate(slot.id, today);

    // Booked count = ALL active slot subscriptions (this is the true capacity usage)
    const totalBooked = allSlotSubscriptions.length;

    // Get subscribers with their member data (for display purposes only)
    const subscribersWithMembers: { subscription: SlotSubscription; member: Member; hasActiveMembership: boolean }[] = [];

    for (const subscription of allSlotSubscriptions) {
      const member = memberService.getById(subscription.memberId);
      if (!member) continue; // Skip orphaned subscriptions for display

      const hasActiveMembership = subscriptionService.hasActiveSubscription(subscription.memberId);
      subscribersWithMembers.push({ subscription, member, hasActiveMembership });
    }

    // For display, filter to only show members with active memberships
    const activeSubscribersWithMembers = subscribersWithMembers.filter(s => s.hasActiveMembership);

    const regularSubscribers = allSlotSubscriptions.filter(s => !s.isException);
    const exceptionSubscribers = allSlotSubscriptions.filter(s => s.isException);

    // Available is based on regular capacity only
    const available = Math.max(0, slot.capacity - totalBooked);
    // Overbooked when total booked exceed regular capacity
    const isOverbooked = totalBooked > slot.capacity;
    const overbookedBy = isOverbooked ? totalBooked - slot.capacity : 0;

    return {
      totalBooked,
      totalActiveMembers: activeSubscribersWithMembers.length,
      regularCount: regularSubscribers.length,
      exceptionCount: exceptionSubscribers.length,
      trialCount: trials.length,
      available,
      isOverbooked,
      overbookedBy,
      utilization: Math.round((totalBooked / slot.capacity) * 100),
      subscribersWithMembers: activeSubscribersWithMembers,
    };
  };

  const handleEditCapacity = (slot: SessionSlot) => {
    setSelectedSlot(slot);
    setCapacity(slot.capacity);
    setExceptionCapacity(slot.exceptionCapacity);
    setShowCapacityModal(true);
  };

  const handleSaveCapacity = () => {
    if (!selectedSlot) return;

    try {
      slotService.updateCapacity(selectedSlot.id, capacity, exceptionCapacity);
      setSuccess(`Capacity updated for ${selectedSlot.displayName}`);
      setShowCapacityModal(false);
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update capacity');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Session Slots</h1>
        <p className="text-gray-600">Manage session schedules and capacity. Sessions run Monday to Friday.</p>
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

      {/* Today's Overview */}
      <Card title="Today's Schedule" subtitle={today}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map(slot => {
            const data = getSlotData(slot);
            return (
              <div
                key={slot.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{slot.displayName}</h3>
                    <p className="text-sm text-gray-500">{slot.startTime} - {slot.endTime}</p>
                  </div>
                  <span className={`text-lg font-bold ${
                    data.utilization >= 90 ? 'text-red-600' :
                    data.utilization >= 70 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {data.utilization}%
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booked:</span>
                    <span className="font-medium">{data.totalBooked}/{slot.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available:</span>
                    <span className={`font-medium ${data.isOverbooked ? 'text-red-600' : 'text-green-600'}`}>
                      {data.available}
                    </span>
                  </div>
                  {data.isOverbooked && (
                    <div className="flex justify-between text-red-600">
                      <span>Overbooked:</span>
                      <span className="font-medium">+{data.overbookedBy}</span>
                    </div>
                  )}
                  {data.trialCount > 0 && (
                    <div className="flex justify-between text-indigo-600">
                      <span>Trials today:</span>
                      <span className="font-medium">{data.trialCount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Slot Details */}
      {slots.map(slot => {
        const data = getSlotData(slot);
        return (
          <Card
            key={slot.id}
            title={slot.displayName}
            subtitle={`${slot.startTime} - ${slot.endTime}`}
          >
            <div className="space-y-4">
              {/* Capacity Info */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-sm text-gray-500">Booked / Capacity</p>
                    <p className={`text-2xl font-bold ${data.isOverbooked ? 'text-red-600' : 'text-gray-900'}`}>
                      {data.totalBooked}/{slot.capacity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className={`text-2xl font-bold ${data.isOverbooked ? 'text-red-600' : 'text-green-600'}`}>
                      {data.available}
                    </p>
                  </div>
                  {data.isOverbooked ? (
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="text-lg font-bold text-red-600">
                        Overbooked +{data.overbookedBy}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500">Exception Slots</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.exceptionCount}/{slot.exceptionCapacity}
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={() => handleEditCapacity(slot)}>
                  Edit Capacity
                </Button>
              </div>

              {/* Members List - Compact View */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Active Members ({data.totalActiveMembers})
                </h4>
                {data.totalActiveMembers === 0 ? (
                  <p className="text-gray-500 text-sm">No active members in this slot</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.subscribersWithMembers.map(({ subscription, member }) => (
                      <Link
                        key={subscription.id}
                        to={`/admin/members/${member.id}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-colors ${
                          subscription.isException
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        }`}
                        title={subscription.isException ? 'Exception slot' : ''}
                      >
                        <span className="w-5 h-5 bg-white/50 rounded-full flex items-center justify-center text-xs font-medium">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </span>
                        <span className="font-medium">{member.firstName} {member.lastName}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Capacity Edit Modal */}
      <Modal
        isOpen={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        title={`Edit Capacity - ${selectedSlot?.displayName}`}
      >
        <div className="space-y-4">
          <Input
            label="Regular Capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
            helperText="Maximum number of regular members for this slot"
          />
          <Input
            label="Exception Capacity"
            type="number"
            min={0}
            value={exceptionCapacity}
            onChange={(e) => setExceptionCapacity(parseInt(e.target.value) || 0)}
            helperText="Additional slots for exceptions (overflow capacity)"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCapacityModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCapacity}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
