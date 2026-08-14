/** Card — superfície semântica (bg-background/border-border), sem decoração. */

import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from '../../lib/cx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cx('rounded-lg border border-border bg-background shadow-sm', className)}
      {...rest}
    />
  );
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description !== undefined ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions !== undefined ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-4 py-3', className)} {...rest} />;
}
