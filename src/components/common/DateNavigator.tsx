import { format, addDays, subDays, isToday, parseISO } from 'date-fns';

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  maxDate?: string; // Optional max date (e.g., today)
  className?: string;
}

export function DateNavigator({ selectedDate, onDateChange, maxDate, className = '' }: DateNavigatorProps) {
  const currentDate = parseISO(selectedDate);
  const maxDateParsed = maxDate ? parseISO(maxDate) : null;

  const canGoNext = !maxDateParsed || addDays(currentDate, 1) <= maxDateParsed;

  const handlePrev = () => {
    const newDate = subDays(currentDate, 1);
    onDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    if (canGoNext) {
      const newDate = addDays(currentDate, 1);
      onDateChange(format(newDate, 'yyyy-MM-dd'));
    }
  };

  const handleToday = () => {
    onDateChange(format(new Date(), 'yyyy-MM-dd'));
  };

  const isCurrentToday = isToday(currentDate);

  // Format: "Today, Mon 3 Feb 2026" or "Mon 3 Feb 2026"
  const dateDisplay = isCurrentToday
    ? `Today, ${format(currentDate, 'EEE d MMM yyyy')}`
    : format(currentDate, 'EEE d MMM yyyy');

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      {/* Previous button */}
      <button
        onClick={handlePrev}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Previous day"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Date display + Today button */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="font-semibold text-gray-900 text-center">{dateDisplay}</span>
        {!isCurrentToday && (
          <button
            onClick={handleToday}
            className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors whitespace-nowrap"
          >
            Today
          </button>
        )}
      </div>

      {/* Next button */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={`p-2 rounded-lg transition-colors ${
          canGoNext
            ? 'hover:bg-gray-100 text-gray-600'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        aria-label="Next day"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
