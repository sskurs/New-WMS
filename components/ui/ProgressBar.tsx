'use client';

import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '' }) => {
  const normalizedValue = Math.min(100, Math.max(0, value));

  const getColor = () => {
    if (normalizedValue > 90) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
    if (normalizedValue > 70) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  };

  return (
    <div className={`h-2.5 w-full rounded-full bg-emerald-100/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${getColor()} transition-all duration-700 ease-out`}
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
};

export default ProgressBar;