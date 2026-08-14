/**
 * EmptyState — estado vazio honesto (doc 07 §6: indicar estado; nunca
 * fabricar conteúdo). Ícone Lucide + título + descrição + ação opcional.
 */

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <Icon aria-hidden="true" size={28} className="text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description !== undefined ? (
        <p className="max-w-prose text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action !== undefined ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
