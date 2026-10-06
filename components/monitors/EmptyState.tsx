import React from 'react';
import Link from 'next/link';
import { Plus, Server, ShieldCheck, Activity } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: any;
}

export function EmptyState({
  title = 'No monitors yet.',
  description = 'Add your first website and Pulse will start monitoring it while this dashboard is open.',
  actionHref,
  actionLabel = 'Add Monitor',
  onAction,
  icon: Icon = Activity,
}: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-accent mb-4 shadow-inner">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-sm mb-6">
        {description}
      </p>

      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all duration-150 shadow-lg shadow-accent/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{actionLabel}</span>
        </button>
      ) : actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all duration-150 shadow-lg shadow-accent/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{actionLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}
