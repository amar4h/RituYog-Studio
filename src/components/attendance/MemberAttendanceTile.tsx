import type { Member } from '../../types';

interface MemberAttendanceTileProps {
  member: Member;
  isPresent: boolean;
  presentDays: number;
  totalWorkingDays: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function MemberAttendanceTile({
  member,
  isPresent,
  presentDays,
  totalWorkingDays,
  onToggle,
  disabled = false,
}: MemberAttendanceTileProps) {
  // Get initials for avatar
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={`${member.firstName} ${member.lastName} - ${presentDays}/${totalWorkingDays} days present`}
      className={`
        p-2 rounded-lg border-2 transition-all duration-150 text-center
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md active:scale-95'}
        ${isPresent
          ? 'bg-green-100 border-green-400 hover:bg-green-200'
          : 'bg-red-100 border-red-400 hover:bg-red-200'
        }
      `}
    >
      {/* Compact layout: Avatar + Name inline */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`
            w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
            ${isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
          `}
        >
          {initials}
        </div>
        <p className={`font-medium text-xs truncate ${isPresent ? 'text-green-800' : 'text-red-800'}`}>
          {member.firstName}
        </p>
      </div>

      {/* Attendance Count - Compact */}
      <p className={`text-lg font-bold leading-none ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
        {presentDays}/{totalWorkingDays}
      </p>
    </button>
  );
}
