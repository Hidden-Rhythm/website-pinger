import React from 'react';
import { MonitorStatus } from '@/lib/types';
import { CheckCircle2, AlertTriangle, XCircle, PauseCircle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'md', className = '', showIcon = true }: StatusBadgeProps) {
  let bg = '';
  let text = '';
  let border = '';
  let label: string = status;
  let Icon = HelpCircle;

  switch (status) {
    case 'ONLINE':
      bg = 'bg-emerald-500/10';
      text = 'text-emerald-400';
      border = 'border-emerald-500/20';
      label = 'Online';
      Icon = CheckCircle2;
      break;
    case 'DEGRADED':
      bg = 'bg-amber-500/10';
      text = 'text-amber-400';
      border = 'border-amber-500/20';
      label = 'Degraded';
      Icon = AlertTriangle;
      break;
    case 'DOWN':
      bg = 'bg-rose-500/10';
      text = 'text-rose-400';
      border = 'border-rose-500/20';
      label = 'Down';
      Icon = XCircle;
      break;
    case 'PAUSED':
      bg = 'bg-zinc-500/10';
      text = 'text-zinc-400';
      border = 'border-zinc-500/20';
      label = 'Paused';
      Icon = PauseCircle;
      break;
    case 'UNMONITORED':
    default:
      bg = 'bg-blue-500/10';
      text = 'text-blue-400';
      border = 'border-blue-500/20';
      label = 'Unmonitored';
      Icon = HelpCircle;
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {showIcon && <Icon className={`${iconSizes} flex-shrink-0 animate-in`} />}
      <span>{label}</span>
    </span>
  );
}
