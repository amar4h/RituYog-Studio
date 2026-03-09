import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, Modal, Alert } from '../../components/common';
import { slotService, memberService, trialBookingService, subscriptionService, leadService, sessionExecutionService, sessionPlanAllocationService } from '../../services';
import { useFreshData } from '../../hooks/useFreshData';
import { getToday, formatDateCompact } from '../../utils/dateUtils';
import type { SessionSlot, Member, MembershipSubscription } from '../../types';

export function SessionsPage() {
  // Load session planning data so auto-complete can find allocations
  const { isLoading: planDataLoading } = useFreshData([
    'session-plan-allocations', 'session-plans', 'session-executions', 'slots', 'attendance',
  ]);

  // Auto-complete session executions for completed slots after data loads
  const autoCompleteRan = useRef(false);
  useEffect(() => {
    if (!planDataLoading && !autoCompleteRan.current) {
      autoCompleteRan.current = true;
      const count = sessionExecutionService.autoCompleteExecutions(getToday());
      if (count > 0) {
        console.log(`Auto-completed ${count} session execution(s) for today`);
      }
    }
  }, [planDataLoading]);
  const [selectedSlot, setSelectedSlot] = useState<SessionSlot | null>(null);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacity, setCapacity] = useState(10);
  const [exceptionCapacity, setExceptionCapacity] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState({
    displayName: '',
    startTime: '07:00',
    endTime: '08:00',
    capacity: 10,
    exceptionCapacity: 1,
    sessionType: 'offline' as 'online' | 'offline' | 'hybrid',
  });

  const slots = slotService.getActive();
  const today = getToday();

  // Determine session status based on current time
  const getSessionStatus = (slot: SessionSlot): 'upcoming' | 'in-progress' | 'completed' => {
    if (slot.sessionType === 'online') return 'in-progress'; // Online is always available
    const now = new Date();
    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (nowMinutes < startMinutes) return 'upcoming';
    if (nowMinutes >= endMinutes) return 'completed';
    return 'in-progress';
  };

  const getSlotData = (slot: SessionSlot) => {
    const trials = trialBookingService.getBySlotAndDate(slot.id, today);

    // Use MembershipSubscription for consistent counting (same as Dashboard)
    const allMembershipSubscriptions = subscriptionService.getAll();
    const slotMembershipSubs = allMembershipSubscriptions.filter(s => s.slotId === slot.id);

    // Filter for currently active subscriptions (status active AND within date range)
    // Deduplicate by memberId - if a member has overlapping subscriptions, count them once
    const activeSubsAll = slotMembershipSubs.filter(s =>
      s.status === 'active' && s.startDate <= today && s.endDate >= today
    );
    const seenMemberIds = new Set<string>();
    const currentlyActiveSubscriptions = activeSubsAll.filter(s => {
      if (seenMemberIds.has(s.memberId)) return false;
      seenMemberIds.add(s.memberId);
      return true;
    });

    // Filter for scheduled subscriptions (future members)
    const scheduledSubscriptions = slotMembershipSubs.filter(s =>
      s.status === 'scheduled' || (s.status === 'active' && s.startDate > today)
    );

    // Get member IDs who have active subscriptions (to avoid double-counting renewals)
    const activeMemberIds = new Set(currentlyActiveSubscriptions.map(s => s.memberId));

    // Filter scheduled subscriptions to only include NEW members (not renewals)
    const newScheduledSubscriptions = scheduledSubscriptions.filter(s => !activeMemberIds.has(s.memberId));

    // Total booked = currently active + NEW scheduled only (consistent with Dashboard)
    const totalBooked = currentlyActiveSubscriptions.length + newScheduledSubscriptions.length;

    // Sort active subscriptions by creation date to determine who is using exception slots
    // Members who joined after normal capacity was reached are in exception slots
    const sortedActiveSubscriptions = [...currentlyActiveSubscriptions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Members beyond normal capacity are in exception slots
    const exceptionMemberIds = new Set(
      sortedActiveSubscriptions.slice(slot.capacity).map(s => s.memberId)
    );
    const exceptionCount = exceptionMemberIds.size;

    // Build active member list for display with computed exception status
    const activeMembers: { subscription: MembershipSubscription; member: Member; hasPendingRenewal: boolean; isException: boolean }[] = [];
    for (const membershipSub of currentlyActiveSubscriptions) {
      const member = memberService.getById(membershipSub.memberId);
      if (!member) continue;

      const hasPendingRenewal = subscriptionService.hasPendingRenewal(membershipSub.memberId);
      const isException = exceptionMemberIds.has(membershipSub.memberId);
      activeMembers.push({ subscription: membershipSub, member, hasPendingRenewal, isException });
    }

    // Build scheduled member list (NEW members only, not renewals)
    const scheduledMembers: { member: Member; startDate: string }[] = [];
    for (const membershipSub of newScheduledSubscriptions) {
      const member = memberService.getById(membershipSub.memberId);
      if (!member) continue;
      scheduledMembers.push({ member, startDate: membershipSub.startDate });
    }

    // Available is based on regular capacity only
    const available = Math.max(0, slot.capacity - totalBooked);
    // Overbooked when total booked exceed regular capacity
    const isOverbooked = totalBooked > slot.capacity;
    const overbookedBy = isOverbooked ? totalBooked - slot.capacity : 0;

    return {
      totalBooked,
      totalActiveMembers: currentlyActiveSubscriptions.length,
      totalScheduledMembers: newScheduledSubscriptions.length,
      regularCount: totalBooked - exceptionCount,
      exceptionCount,
      trialCount: trials.length,
      trials,
      available,
      isOverbooked,
      overbookedBy,
      utilization: Math.round((totalBooked / slot.capacity) * 100),
      activeMembers,
      scheduledMembers,
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

  const handleCreateSlot = () => {
    try {
      if (!newSlot.displayName.trim()) {
        setError('Slot name is required');
        return;
      }
      slotService.create({
        displayName: newSlot.displayName.trim(),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        capacity: newSlot.capacity,
        exceptionCapacity: newSlot.exceptionCapacity,
        sessionType: newSlot.sessionType,
        isActive: true,
      });
      setSuccess(`Slot "${newSlot.displayName}" created`);
      setShowAddSlotModal(false);
      setNewSlot({ displayName: '', startTime: '07:00', endTime: '08:00', capacity: 10, exceptionCapacity: 1, sessionType: 'offline' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create slot');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Slots</h1>
          <p className="text-gray-600">Manage session schedules and capacity. Sessions run Monday to Friday.</p>
        </div>
        <Button onClick={() => setShowAddSlotModal(true)} className="w-full sm:w-auto">
          + Add Slot
        </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(slot => {
            const data = getSlotData(slot);
            const status = getSessionStatus(slot);
            const execution = sessionExecutionService.getBySlotAndDate(slot.id, today);
            const allocation = sessionPlanAllocationService.getBySlotAndDate(slot.id, today);
            const statusStyles = {
              completed: 'bg-green-50 border-green-200',
              'in-progress': 'bg-blue-50 border-blue-200',
              upcoming: 'bg-gray-50 border-gray-200',
            };
            const statusLabel = {
              completed: 'Completed',
              'in-progress': 'In Progress',
              upcoming: 'Upcoming',
            };
            const statusColors = {
              completed: 'text-green-700 bg-green-100',
              'in-progress': 'text-blue-700 bg-blue-100',
              upcoming: 'text-gray-600 bg-gray-100',
            };
            return (
              <div
                key={slot.id}
                className={`p-4 rounded-lg border ${statusStyles[status]}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{slot.displayName}</h3>
                    <p className="text-sm text-gray-500">{slot.sessionType === 'online' ? 'Flexible timing' : `${slot.startTime} - ${slot.endTime}`}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>
                      {statusLabel[status]}
                    </span>
                    <span className={`text-lg font-bold ${
                      data.utilization >= 90 ? 'text-red-600' :
                      data.utilization >= 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {data.utilization}%
                    </span>
                  </div>
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
                {/* Session execution status */}
                {execution ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-100 rounded-md px-2 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Session Recorded</span>
                    <span className="text-green-600">· {execution.sessionPlanName}</span>
                  </div>
                ) : status === 'completed' && allocation ? (
                  <Link
                    to={`/admin/session-executions/record?slotId=${slot.id}&date=${today}`}
                    className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md px-2 py-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending Recording
                  </Link>
                ) : null}
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
            subtitle={slot.sessionType === 'online' ? 'Flexible timing · Can join any running slot' : `${slot.startTime} - ${slot.endTime}`}
          >
            <div className="space-y-4">
              {/* Capacity Info */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-3 sm:gap-8">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Booked / Capacity</p>
                    <p className={`text-xl sm:text-2xl font-bold ${data.isOverbooked ? 'text-red-600' : 'text-gray-900'}`}>
                      {data.totalBooked}/{slot.capacity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Available</p>
                    <p className={`text-xl sm:text-2xl font-bold ${data.isOverbooked ? 'text-red-600' : 'text-green-600'}`}>
                      {data.available}
                    </p>
                  </div>
                  {data.isOverbooked ? (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Status</p>
                      <p className="text-base sm:text-lg font-bold text-red-600">
                        Overbooked +{data.overbookedBy}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">Exception Slots</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        {data.exceptionCount}/{slot.exceptionCapacity}
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleEditCapacity(slot)}>
                  Edit Capacity
                </Button>
              </div>

              {/* Active Members List */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Active Members ({data.totalActiveMembers})
                </h4>
                {data.totalActiveMembers === 0 ? (
                  <p className="text-gray-500 text-sm">No active members in this slot</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.activeMembers.map(({ subscription, member, hasPendingRenewal, isException }) => (
                      <Link
                        key={subscription.id}
                        to={`/admin/members/${member.id}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-colors ${
                          isException
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                        }`}
                        title={isException ? 'Exception slot' : ''}
                      >
                        <span className="w-5 h-5 bg-white/50 rounded-full flex items-center justify-center text-xs font-medium">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </span>
                        <span className="font-medium">{member.firstName} {member.lastName}</span>
                        {hasPendingRenewal && (
                          <span className="px-1 py-0.5 bg-green-200 text-green-800 text-xs rounded" title="Renewal scheduled">
                            Renewed
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduled Members (New members starting soon) */}
              {data.totalScheduledMembers > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Scheduled Members ({data.totalScheduledMembers})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.scheduledMembers.map(({ member, startDate }) => (
                      <Link
                        key={member.id}
                        to={`/admin/members/${member.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        <span className="w-5 h-5 bg-white/50 rounded-full flex items-center justify-center text-xs font-medium">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </span>
                        <span className="font-medium">{member.firstName} {member.lastName}</span>
                        <span className="px-1 py-0.5 bg-blue-200 text-blue-800 text-xs rounded" title={`Starts ${startDate}`}>
                          {formatDateCompact(startDate)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Trials for Today */}
              {data.trialCount > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Scheduled Trials Today ({data.trialCount})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.trials.map((trial) => {
                      const lead = leadService.getById(trial.leadId);
                      if (!lead) return null;
                      return (
                        <Link
                          key={trial.id}
                          to={`/admin/leads/${lead.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                        >
                          <span className="w-5 h-5 bg-white/50 rounded-full flex items-center justify-center text-xs font-medium">
                            {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                          </span>
                          <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                          <span className="px-1 py-0.5 bg-purple-200 text-purple-800 text-xs rounded">
                            Trial
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
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

      {/* Add Slot Modal */}
      <Modal
        isOpen={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        title="Add New Slot"
      >
        <div className="space-y-4">
          <Input
            label="Slot Name"
            value={newSlot.displayName}
            onChange={(e) => setNewSlot(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="e.g., Online, Afternoon 3:00 PM"
            required
          />
          <Select
            label="Session Type"
            value={newSlot.sessionType}
            onChange={(e) => setNewSlot(prev => ({ ...prev, sessionType: e.target.value as 'online' | 'offline' | 'hybrid' }))}
            options={[
              { value: 'offline', label: 'Offline (In-Studio)' },
              { value: 'online', label: 'Online' },
              { value: 'hybrid', label: 'Hybrid' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={newSlot.startTime}
              onChange={(e) => setNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
            />
            <Input
              label="End Time"
              type="time"
              value={newSlot.endTime}
              onChange={(e) => setNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity"
              type="number"
              min={1}
              value={newSlot.capacity}
              onChange={(e) => setNewSlot(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
            />
            <Input
              label="Exception Capacity"
              type="number"
              min={0}
              value={newSlot.exceptionCapacity}
              onChange={(e) => setNewSlot(prev => ({ ...prev, exceptionCapacity: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddSlotModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSlot}>
              Create Slot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
