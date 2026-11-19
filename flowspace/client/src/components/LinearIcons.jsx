import React from 'react';

/**
 * Crisp geometric brand mark using Linear lavender-blue (#5e6ad2).
 */
export function FlowSpaceLogo({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="24" height="24" rx="6" fill="#5e6ad2" />
      <path
        d="M6.5 8.25H17.5M6.5 12H14.5M6.5 15.75H11"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="15.75" r="1.75" fill="#ffffff" />
    </svg>
  );
}

/**
 * Linear-inspired precision geometric task status icons.
 * - BACKLOG     : dashed neutral circle (#62666d)
 * - IN_PROGRESS : half-filled amber progress ring (#f2c94c)
 * - IN_REVIEW   : lavender-blue active ring (#5e6ad2)
 * - DONE        : semantic success green check circle (#27a644)
 */
export function StatusIcon({ status, size = 14, className = '' }) {
  switch (status) {
    case 'DONE':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="8" r="6.5" fill="#27a644" />
          <path
            d="M5.2 8.2L7.1 10.1L10.9 6.1"
            stroke="#010102"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'IN_REVIEW':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="8" r="6" stroke="#5e6ad2" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.75" fill="#5e6ad2" />
        </svg>
      );
    case 'IN_PROGRESS':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="8" r="6" stroke="#d9a536" strokeWidth="1.5" />
          <path d="M8 4.2A3.8 3.8 0 0 1 8 11.8Z" fill="#d9a536" />
        </svg>
      );
    case 'BACKLOG':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="#62666d"
            strokeWidth="1.5"
            strokeDasharray="2.5 2.5"
          />
        </svg>
      );
  }
}

/**
 * Linear-style signal-bar / alert priority glyphs (restrained, never noisy).
 */
export function PriorityIcon({ priority, size = 14, className = '' }) {
  if (priority === 'URGENT') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
        <rect x="2" y="2" width="12" height="12" rx="3" fill="#e5484d" />
        <path d="M8 5V8.6" stroke="#010102" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="11.1" r="0.95" fill="#010102" />
      </svg>
    );
  }

  const levels = priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1;
  const activeColor = priority === 'HIGH' ? '#d9a536' : priority === 'MEDIUM' ? '#d0d6e0' : '#8a8f98';
  const inactiveColor = '#2e3036';

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2.2" y="9.5" width="2.4" height="4" rx="0.8" fill={levels >= 1 ? activeColor : inactiveColor} />
      <rect x="6.8" y="6.2" width="2.4" height="7.3" rx="0.8" fill={levels >= 2 ? activeColor : inactiveColor} />
      <rect x="11.4" y="2.8" width="2.4" height="10.7" rx="0.8" fill={levels >= 3 ? activeColor : inactiveColor} />
    </svg>
  );
}

export const STATUS_LABELS = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const PRIORITY_LABELS = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};
