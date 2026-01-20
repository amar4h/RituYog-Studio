import { useState, useCallback } from 'react';
import { Card, Button, Alert } from '../../components/common';
import { MemberAttendanceTile } from '../../components/attendance';
import { slotService, attendanceService } from '../../services';
import { getToday, getMonthStart, getMonthEnd, formatDate } from '../../utils/dateUtils';
import { parseISO, isWeekend } from 'date-fns';

export function AttendancePage() {
  // Current date for marking attendance
  const [selectedDate, setSelectedDate] = useState(getToday());

  // Selected slot
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Period for counting (defaults to current month)
  const [periodStart, setPeriodStart] = useState(getMonthStart());
  const [periodEnd, setPeriodEnd] = useState(getMonthEnd());

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render after attendance change

  const slots = slotService.getActive();
  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  // Check if selected date is a weekend
  const isWeekendDay = isWeekend(parseISO(selectedDate));

  // Get attendance data for the selected slot and date
  const attendanceData = selectedSlotId && !isWeekendDay
    ? attendanceService.getSlotAttendanceWithMembers(selectedSlotId, selectedDate, periodStart, periodEnd)
    : [];

  // Count present/total for today's summary
  const presentToday = attendanceData.filter(a => a.isPresent).length;
  const totalMembers = attendanceData.length;

  // Handle marking attendance
  const handleToggleAttendance = useCallback((memberId: string, currentlyPresent: boolean) => {
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
  }, [selectedSlotId, selectedDate]);

  // Reset period to current month
  const handleResetPeriod = () => {
    setPeriodStart(getMonthStart());
    setPeriodEnd(getMonthEnd());
  };

  // Navigate date
  const handlePreviousDay = () => {
    const date = parseISO(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = parseISO(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
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
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 w-32 sm:w-auto"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-sm"
            >
              ▶
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              Today
            </button>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Session Selection - Compact Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">Session:</span>
            <div className="flex gap-1 flex-wrap">
              {slots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedSlotId === slot.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={slot.displayName}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Period Selection - Inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">Period:</span>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 w-28 sm:w-auto"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 w-28 sm:w-auto"
            />
            <button
              onClick={handleResetPeriod}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Reset
            </button>
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
