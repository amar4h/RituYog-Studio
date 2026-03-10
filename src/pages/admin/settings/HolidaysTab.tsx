import { useState } from 'react';
import { Card, Button, Input, Modal } from '../../../components/common';
import { settingsService } from '../../../services';
import { formatDate, getDayNameShort } from '../../../utils/dateUtils';
import type { Holiday } from '../../../types';
import type { SettingsTabProps } from './types';

export function HolidaysTab({ setError, setSuccess, loading, setLoading }: SettingsTabProps) {
  const settings = settingsService.getOrDefault();

  const [holidays, setHolidays] = useState<Holiday[]>(settings.holidays || []);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    isRecurringYearly: false,
  });

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({ date: '', name: '', isRecurringYearly: false });
    setShowHolidayModal(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      date: holiday.date,
      name: holiday.name,
      isRecurringYearly: holiday.isRecurringYearly || false,
    });
    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = async (holidayDate: string) => {
    const updatedHolidays = holidays.filter(h => h.date !== holidayDate);
    setLoading('holiday-delete');
    setHolidays(updatedHolidays);
    try {
      await settingsService.updatePartialAsync({ holidays: updatedHolidays });
      setSuccess('Holiday deleted and saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete holiday');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name.trim()) {
      setError('Please fill in both date and holiday name');
      return;
    }

    let updatedHolidays: Holiday[];

    if (editingHoliday) {
      updatedHolidays = holidays.map(h =>
        h.date === editingHoliday.date
          ? { date: holidayForm.date, name: holidayForm.name.trim(), isRecurringYearly: holidayForm.isRecurringYearly }
          : h
      );
    } else {
      if (holidays.some(h => h.date === holidayForm.date)) {
        setError('A holiday already exists for this date');
        return;
      }
      updatedHolidays = [
        ...holidays,
        { date: holidayForm.date, name: holidayForm.name.trim(), isRecurringYearly: holidayForm.isRecurringYearly },
      ].sort((a, b) => a.date.localeCompare(b.date));
    }

    setLoading('holiday');
    setHolidays(updatedHolidays);
    try {
      await settingsService.updatePartialAsync({ holidays: updatedHolidays });
      setShowHolidayModal(false);
      setSuccess(editingHoliday ? 'Holiday updated and saved to database' : 'Holiday added and saved to database');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holiday to database');
    } finally {
      setLoading(null);
    }
  };

  // Group holidays by year for display (excluding 2025)
  const holidaysByYear = holidays
    .filter(holiday => !holiday.date.startsWith('2025'))
    .reduce((acc, holiday) => {
      const year = holiday.date.substring(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(holiday);
      return acc;
    }, {} as Record<string, Holiday[]>);

  return (
    <>
      <Card
        title="Studio Holidays"
        actions={
          <Button size="sm" onClick={handleAddHoliday}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Holiday
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Configure public holidays and days when the studio is closed. Trial bookings will not be available on these days.
        </p>

        {Object.keys(holidaysByYear).length === 0 ? (
          <p className="text-gray-500 text-center py-4">No holidays configured</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(holidaysByYear).sort().map(year => (
              <div key={year}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{year} ({holidaysByYear[year].length} holidays)</h4>
                <div className="space-y-2">
                  {holidaysByYear[year].map((holiday, index) => (
                    <div
                      key={`${holiday.date}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{holiday.name}</span>
                        <span className="text-gray-500 ml-2 text-sm">
                          {formatDate(holiday.date)}
                          <span className="ml-1 text-xs text-gray-400">({getDayNameShort(holiday.date)})</span>
                        </span>
                        {holiday.isRecurringYearly && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditHoliday(holiday)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteHoliday(holiday.date)}
                          loading={loading === 'holiday-delete'}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Holiday Modal */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowHolidayModal(false)} disabled={loading === 'holiday'}>
              Cancel
            </Button>
            <Button onClick={handleSaveHoliday} loading={loading === 'holiday'}>
              {editingHoliday ? 'Update' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={holidayForm.date}
            onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
            required
          />
          <Input
            label="Holiday Name"
            value={holidayForm.name}
            onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Diwali, Independence Day"
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={holidayForm.isRecurringYearly}
              onChange={(e) => setHolidayForm(prev => ({ ...prev, isRecurringYearly: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Recurring yearly (for fixed-date holidays like Independence Day, Republic Day)
            </span>
          </label>
        </div>
      </Modal>
    </>
  );
}
