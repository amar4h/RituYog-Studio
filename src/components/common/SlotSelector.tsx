import { slotService, subscriptionService } from '../../services';
import { getToday, addMonths } from '../../utils/dateUtils';
import type { SessionSlot } from '../../types';

interface SlotSelectorProps {
  selectedSlotId: string;
  onSelect: (slotId: string) => void;
  disabled?: boolean;
  showCapacity?: boolean;
  // For capacity calculation
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  // Styling variants
  variant?: 'tiles' | 'pills' | 'cards';
  // Layout
  columns?: 2 | 4;
  // Exclude specific slots
  excludeSlotId?: string;
  // Current slot indicator
  currentSlotId?: string;
}

export function SlotSelector({
  selectedSlotId,
  onSelect,
  disabled = false,
  showCapacity = false,
  subscriptionStartDate,
  subscriptionEndDate,
  variant = 'tiles',
  columns = 4,
  excludeSlotId,
  currentSlotId,
}: SlotSelectorProps) {
  const slots = slotService.getActive();
  const filteredSlots = excludeSlotId
    ? slots.filter(s => s.id !== excludeSlotId)
    : slots;

  // Get capacity information for a slot
  const getSlotCapacityInfo = (slot: SessionSlot) => {
    if (!showCapacity) return null;

    const today = getToday();
    const startDate = subscriptionStartDate || today;
    // If no end date provided, default to 1 month from start (most common plan duration)
    // This ensures we check capacity for a reasonable period, not just a single day
    const endDate = subscriptionEndDate || addMonths(startDate, 1);

    const capacityCheck = subscriptionService.checkSlotCapacity(slot.id, startDate, endDate);
    return {
      isCompletelyFull: !capacityCheck.available,
      isExceptionOnly: capacityCheck.isExceptionOnly,
      currentBookings: capacityCheck.currentBookings,
      totalCapacity: capacityCheck.totalCapacity,
      normalCapacity: capacityCheck.normalCapacity,
    };
  };

  // Render pills variant (compact, for inline use like attendance page)
  if (variant === 'pills') {
    return (
      <div className="flex gap-1 flex-wrap">
        {filteredSlots.map(slot => (
          <button
            key={slot.id}
            type="button"
            onClick={() => !disabled && onSelect(slot.id)}
            disabled={disabled}
            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedSlotId === slot.id
                ? 'bg-indigo-600 text-white'
                : disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={slot.displayName}
          >
            {slot.startTime}
          </button>
        ))}
      </div>
    );
  }

  // Render cards variant (for subscription form with capacity info)
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 ${columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
        {filteredSlots.map(slot => {
          const capacity = getSlotCapacityInfo(slot);
          const isCurrent = currentSlotId === slot.id;
          const isSelected = selectedSlotId === slot.id;
          const isDisabled = disabled || (capacity?.isCompletelyFull ?? false);

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => !isDisabled && onSelect(slot.id)}
              disabled={isDisabled}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                isDisabled
                  ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-70'
                  : isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`font-semibold ${isDisabled ? 'text-red-700' : 'text-gray-900'}`}>
                    {slot.displayName}
                  </p>
                  <p className="text-sm text-gray-500">{slot.startTime} - {slot.endTime}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Current
                    </span>
                  )}
                  {capacity?.isCompletelyFull && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                      Full
                    </span>
                  )}
                  {!capacity?.isCompletelyFull && capacity?.isExceptionOnly && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      Exception Only
                    </span>
                  )}
                </div>
              </div>
              {showCapacity && capacity && (
                <div className="mt-2 text-sm">
                  <span className={capacity.isExceptionOnly ? 'text-amber-600' : 'text-gray-600'}>
                    {capacity.currentBookings}/{capacity.totalCapacity} booked
                  </span>
                  <span className="text-gray-400 ml-2 text-xs">
                    ({capacity.normalCapacity} regular + {capacity.totalCapacity - capacity.normalCapacity} exc.)
                  </span>
                </div>
              )}
              {capacity?.isCompletelyFull && (
                <p className="mt-2 text-xs text-red-600">
                  This slot is completely full for the selected period.
                </p>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: tiles variant (4-column grid with nice tiles)
  return (
    <div className={`grid ${columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-3`}>
      {filteredSlots.map(slot => {
        const capacity = showCapacity ? getSlotCapacityInfo(slot) : null;
        const isCurrent = currentSlotId === slot.id;
        const isSelected = selectedSlotId === slot.id;
        const isDisabled = disabled || (capacity?.isCompletelyFull ?? false);

        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => !isDisabled && onSelect(slot.id)}
            disabled={isDisabled}
            className={`p-3 rounded-lg text-center transition-all ${
              isDisabled
                ? 'bg-red-50 text-red-400 cursor-not-allowed border-2 border-red-200'
                : isSelected
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-2 border-transparent hover:border-indigo-200'
            }`}
          >
            <p className="font-semibold text-sm">{slot.displayName}</p>
            <p className={`text-xs mt-1 ${isSelected ? 'text-indigo-200' : 'text-gray-500'}`}>
              {slot.startTime} - {slot.endTime}
            </p>
            {isCurrent && (
              <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded ${
                isSelected ? 'bg-indigo-500 text-white' : 'bg-green-100 text-green-700'
              }`}>
                Current
              </span>
            )}
            {showCapacity && capacity && !capacity.isCompletelyFull && (
              <p className={`text-xs mt-1 ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                {capacity.currentBookings}/{capacity.totalCapacity}
              </p>
            )}
            {capacity?.isCompletelyFull && (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                Full
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
