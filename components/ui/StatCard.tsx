import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'default',
  className = '',
}: StatCardProps) {
  const colorStyles = {
    default: 'text-text-primary',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    accent: 'text-accent',
  }[color];

  const iconBgStyles = {
    default: 'bg-surface-secondary text-text-secondary border-border',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
  }[color];

  return (
    <div
      className={`glass-panel rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:border-text-secondary/20 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${iconBgStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${colorStyles}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-text-muted font-medium">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
