import { useState, useCallback, useMemo } from 'react';
import { Card, Button, Alert, SlotSelector, PageLoading } from '../../components/common';
import { MemberAttendanceTile } from '../../components/attendance';
import { slotService, attendanceService, attendanceLockService } from '../../services';
import { getToday, getMonthStart, getMonthEnd, formatDate } from '../../utils/dateUtils';
import { parseISO, isWeekend, addDays, subDays, format, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import { useFreshData } from '../../hooks';

// ============================================
// PERIOD PRESETS CONFIGURATION
// ============================================

// Type for period preset
interface PeriodPreset {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Basant Ritu Campaign period configuration.
 * This campaign runs from 23 Jan 2026 to 28 Feb 2026.
 * After 28 Feb 2026, this option automatically disappears from the UI.
 * No manual code change is required - removal is date-driven.
 */
const BASANT_RITU_CAMPAIGN: PeriodPreset = {
  id: 'basant-ritu',
  label: 'Basant Ritu Campaign',
  startDate: '2026-01-23',
  endDate: '2026-02-28',
};

/**
 * Determines which period presets are available based on current date.
 * - "Current Month" is always available
 * - "Basant Ritu Campaign" is only available until 28 Feb 2026 (inclusive)
 *   After that date, it automatically disappears from the UI.
 */
function getAvailablePeriodPresets(today: string): PeriodPreset[] {
  const presets: PeriodPreset[] = [];
  const todayDate = parseISO(today);
  const campaignEndDate = parseISO(BASANT_RITU_CAMPAIGN.endDate);

  // "Current Month" is always available
  const currentMonthStart = format(startOfMonth(todayDate), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(todayDate), 'yyyy-MM-dd');
  presets.push({
    id: 'current-month',
    label: 'Current Month',
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
  });

  // "Basant Ritu Campaign" is only available until 28 Feb 2026 (inclusive)
  // isAfter returns true if todayDate > campaignEndDate, so we include it when NOT after
  if (!isAfter(todayDate, campaignEndDate)) {
    presets.push(BASANT_RITU_CAMPAIGN);
  }

  return presets;
}

/**
 * Determines the default period preset based on current date.
 * - Until 28 Feb 2026 (inclusive): "Basant Ritu Campaign" is the default
 * - From 1 Mar 2026 onwards: "Current Month" is the default
 * This logic ensures automatic transition without code changes.
 */
function getDefaultPeriodPresetId(today: string): string {
  const todayDate = parseISO(today);
  const campaignEndDate = parseISO(BASANT_RITU_CAMPAIGN.endDate);

  // Until 28 Feb 2026 (inclusive), Basant Ritu is the default
  if (!isAfter(todayDate, campaignEndDate)) {
    return 'basant-ritu';
  }

  // After 28 Feb 2026, Current Month is the default
  return 'current-month';
}

/**
 * Selects the most relevant slot based on current time.
 * Each slot runs for 1 hour. A slot stays selected until 10 minutes
 * after it ends (i.e., 70 min after start), then switches to the next slot.
 * Example with 7:30 AM slot: stays default until 8:40 AM, then 8:45 AM takes over.
 */
function getDefaultSlotId(slots: { id: string; startTime: string }[]): string {
  if (slots.length === 0) return '';

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Sort slots by start time
  const sorted = [...slots].sort((a, b) => {
    const [ah, am] = a.startTime.split(':').map(Number);
    const [bh, bm] = b.startTime.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  // Each slot becomes default 10 min before its start,
  // and stays default until 10 min before the next slot starts
  let defaultSlot = sorted[0];
  for (const slot of sorted) {
    const [h, m] = slot.startTime.split(':').map(Number);
    if (nowMinutes >= h * 60 + m - 10) {
      defaultSlot = slot;
    }
  }

  return defaultSlot.id;
}

export function AttendancePage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'attendance-locks']);

  // Get today's date for determining available presets
  const today = getToday();

  // Compute available period presets based on current date (memoized)
  const availablePresets = useMemo(() => getAvailablePeriodPresets(today), [today]);

  // Determine default preset ID based on current date
  const defaultPresetId = useMemo(() => getDefaultPeriodPresetId(today), [today]);

  // Find the default preset object
  const defaultPreset = availablePresets.find(p => p.id === defaultPresetId) || availablePresets[0];

  // Current date for marking attendance
  const [selectedDate, setSelectedDate] = useState(today);

  // Get slots and default to the slot closest to current time
  const slots = slotService.getActive();

  // Selected slot - default based on current time
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => getDefaultSlotId(slots));

  // Period selection state - initialized with default preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPresetId);
  const [periodStart, setPeriodStart] = useState(defaultPreset.startDate);
  const [periodEnd, setPeriodEnd] = useState(defaultPreset.endDate);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render after attendance change

  // Check if selected date is a weekend
  const isWeekendDay = isWeekend(parseISO(selectedDate));

  // Check attendance lock/marking rules for selected date+slot
  const attendanceCheck = useMemo(() => {
    if (!selectedSlotId) return { allowed: false, reason: 'No slot selected' };
    return attendanceLockService.canMarkAttendance(selectedDate, selectedSlotId);
  }, [selectedDate, selectedSlotId, refreshKey]);

  // Check if date is within the editable range (today or up to 3 days ago)
  const isEditableDate = useMemo(() => {
    const todayDate = parseISO(today);
    const selectedDateObj = parseISO(selectedDate);
    const daysDiff = Math.floor((todayDate.getTime() - selectedDateObj.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 3;
  }, [selectedDate, today]);

  // Handle lock toggle for current slot
  const handleToggleLock = useCallback(() => {
    if (!selectedSlotId) return;
    const newLockState = attendanceLockService.toggleLock(selectedDate, selectedSlotId);
    setSuccess(newLockState ? 'Session locked' : 'Session unlocked');
    setRefreshKey(k => k + 1);
    setTimeout(() => setSuccess(''), 2000);
  }, [selectedDate, selectedSlotId]);

  // Handle marking attendance
  const handleToggleAttendance = useCallback((memberId: string, currentlyPresent: boolean) => {
    // Pre-check if marking is allowed
    if (!attendanceCheck.allowed) {
      setError(attendanceCheck.reason || 'Cannot mark attendance');
      return;
    }

    try {
      setError('');
      const newStatus = currentlyPresent ? 'absent' : 'present';
      attendanceService.markAttendance(memberId, selectedSlotId, selectedDate, newStatus);
      setSuccess(`Attendance ${newStatus === 'present' ? 'marked' : 'updated'} successfully`);
      setRefreshKey(k => k + 1); // Force refresh
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark attendance');
    }
  }, [selectedSlotId, selectedDate, attendanceCheck]);

  // Show loading state while fetching data (MUST be after all hooks)
  if (isLoading) {
    return <PageLoading />;
  }

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const isLocked = !attendanceCheck.allowed && attendanceCheck.reason === 'Attendance for this session is locked';
  const isFutureDate = !attendanceCheck.allowed && attendanceCheck.reason === 'Cannot mark attendance for future dates';
  const isTooOld = !attendanceCheck.allowed && attendanceCheck.reason === 'Cannot mark attendance for more than 3 days in the past';

  // Get attendance data for the selected slot and date, sorted alphabetically by member name
  const attendanceData = (selectedSlotId && !isWeekendDay
    ? attendanceService.getSlotAttendanceWithMembers(selectedSlotId, selectedDate, periodStart, periodEnd)
    : []
  ).sort((a, b) => `${a.member.firstName} ${a.member.lastName}`.localeCompare(`${b.member.firstName} ${b.member.lastName}`));

  // Find max attendance for crown indicator
  const maxPresentDays = attendanceData.length > 0
    ? Math.max(...attendanceData.map(a => a.presentDays))
    : 0;

  // Count present/total for today's summary
  const presentToday = attendanceData.filter(a => a.isPresent).length;
  const totalMembers = attendanceData.length;

  // Handle period preset selection
  const handlePresetSelect = (presetId: string) => {
    const preset = availablePresets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setPeriodStart(preset.startDate);
      setPeriodEnd(preset.endDate);
    }
  };

  // Handle manual period change (clears preset selection)
  const handleManualPeriodChange = (type: 'start' | 'end', value: string) => {
    setSelectedPresetId('custom'); // Clear preset selection when manually editing
    if (type === 'start') {
      setPeriodStart(value);
    } else {
      setPeriodEnd(value);
    }
  };

  // Navigate date
  const handlePreviousDay = () => {
    const date = parseISO(selectedDate);
    const newDate = subDays(date, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    // Prevent navigating to future dates
    if (selectedDate >= today) return;
    const date = parseISO(selectedDate);
    const newDate = addDays(date, 1);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    // Only allow if not in future
    if (newDateStr <= today) {
      setSelectedDate(newDateStr);
    }
  };

  const handleToday = () => {
    setSelectedDate(getToday());
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedSlotId) return;

    const records = attendanceService.getBySlotAndDate(selectedSlotId, selectedDate);
    const csv = attendanceService.exportToCSV(records);

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedSlot?.displayName.replace(/\s+/g, '_')}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3" key={refreshKey}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
        <div className="flex gap-2">
          {error && (
            <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
              {error}
            </span>
          )}
          {success && (
            <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
              {success}
            </span>
          )}
        </div>
      </div>

      {/* Combined Controls - Responsive */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
          {/* Date Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">Date:</span>
            <button
              onClick={handlePreviousDay}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-sm"
            >
              ◀
            </button>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="px-2 py-1 border border-gray-300 rounded text-sm bg-white whitespace-nowrap pointer-events-none">
                {formatDate(selectedDate)}
              </span>
            </div>
            <button
              onClick={handleNextDay}
              disabled={selectedDate >= today}
              className={`p-1.5 rounded border border-gray-300 text-sm ${
                selectedDate >= today ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              ▶
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              Today
            </button>
            {/* Lock/Unlock Button - only shown for editable dates */}
            {isEditableDate && !isWeekendDay && (
              <button
                onClick={handleToggleLock}
                className={`p-1.5 rounded border text-sm transition-colors ${
                  isLocked
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 border-green-300 text-green-600 hover:bg-green-100'
                }`}
                title={isLocked ? 'Click to unlock attendance for this day' : 'Click to lock attendance for this day'}
              >
                {isLocked ? '🔒' : '🔓'}
              </button>
            )}
            {/* Status indicators for non-editable dates */}
            {isFutureDate && (
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded" title="Cannot mark attendance for future dates">
                Future
              </span>
            )}
            {isTooOld && (
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded" title="Cannot mark attendance for dates older than 3 days">
                Too old
              </span>
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Session Selection - Compact Tiles */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">Session:</span>
            <SlotSelector
              selectedSlotId={selectedSlotId}
              onSelect={setSelectedSlotId}
              variant="pills"
            />
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Period Selection - Preset buttons + date inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">Period:</span>
            {/* Period Preset Buttons */}
            <div className="flex gap-1">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    selectedPresetId === preset.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title={`${formatDate(preset.startDate)} - ${formatDate(preset.endDate)}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {/* Date inputs for custom range */}
            <div className="relative">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => handleManualPeriodChange('start', e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs bg-white whitespace-nowrap pointer-events-none">
                {formatDate(periodStart)}
              </span>
            </div>
            <span className="text-gray-400">-</span>
            <div className="relative">
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => handleManualPeriodChange('end', e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs bg-white whitespace-nowrap pointer-events-none">
                {formatDate(periodEnd)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Member Tiles - Full width, compact */}
      {selectedSlotId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-gray-900">{selectedSlot?.displayName}</h2>
              {!isWeekendDay && attendanceData.length > 0 && (
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-green-600">{presentToday}</span>/{totalMembers} present
                </span>
              )}
            </div>
            {attendanceData.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Export CSV
              </button>
            )}
          </div>

          {isWeekendDay ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No sessions on weekends</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No members scheduled for this slot</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
              {attendanceData.map(({ member, isPresent, presentDays, totalWorkingDays }) => (
                <MemberAttendanceTile
                  key={member.id}
                  member={member}
                  isPresent={isPresent}
                  presentDays={presentDays}
                  totalWorkingDays={totalWorkingDays}
                  onToggle={() => handleToggleAttendance(member.id, isPresent)}
                  disabled={!attendanceCheck.allowed}
                  isTopAttender={maxPresentDays > 0 && presentDays === maxPresentDays}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-gray-500 text-sm">Select a session above to mark attendance</p>
        </div>
      )}
    </div>
  );
}
