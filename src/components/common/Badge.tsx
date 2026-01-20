import { ReactNode } from 'react';

export type BadgeVariant = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink' | 'cyan' | 'teal' | 'orange' | 'emerald' | 'outline' | 'success' | 'error' | 'warning' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  purple: 'bg-purple-100 text-purple-800',
  pink: 'bg-pink-100 text-pink-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  outline: 'bg-transparent border border-gray-300 text-gray-600',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
};

const dotStyles: Record<BadgeVariant, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  teal: 'bg-teal-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  outline: 'bg-gray-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

export function Badge({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotStyles[variant]}`}
        />
      )}
      {children}
    </span>
  );
}

// Status badge component with predefined mappings
type StatusType = 'active' | 'inactive' | 'pending' | 'expired' | 'trial' | 'paid' | 'overdue' | 'cancelled' | 'completed' | 'scheduled' | 'new' | 'converted' | 'draft' | 'sent' | 'partial';

const statusVariants: Record<StatusType, BadgeVariant> = {
  active: 'green',
  inactive: 'gray',
  pending: 'yellow',
  expired: 'red',
  trial: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
  completed: 'emerald',
  scheduled: 'cyan',
  new: 'blue',
  converted: 'emerald',
  draft: 'gray',
  sent: 'blue',
  partial: 'yellow',
};

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/-/g, '') as StatusType;
  const variant = statusVariants[normalizedStatus] || 'gray';

  // Format the display text
  const displayText = status
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Badge variant={variant} size={size} dot>
      {displayText}
    </Badge>
  );
}
