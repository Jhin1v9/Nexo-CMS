/**
 * Badge — rótulo semântico com tom (cor = intenção, doc 07 §54). Texto e
 * ícone Lucide carregam o significado; a cor é reforço (nunca o único canal).
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, { badge: string; icon: string }> = {
  neutral: { badge: 'bg-muted border-border text-foreground', icon: 'text-muted-foreground' },
  primary: { badge: 'bg-primary/10 border-primary/30 text-foreground', icon: 'text-primary' },
  success: { badge: 'bg-success/10 border-success/30 text-foreground', icon: 'text-success' },
  warning: { badge: 'bg-warning/15 border-warning/40 text-foreground', icon: 'text-warning' },
  danger: { badge: 'bg-danger/10 border-danger/30 text-foreground', icon: 'text-danger' },
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ tone = 'neutral', icon: Icon, children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone].badge,
        className,
      )}
    >
      {Icon !== undefined ? <Icon aria-hidden="true" size={12} className={TONES[tone].icon} /> : null}
      {children}
    </span>
  );
}
