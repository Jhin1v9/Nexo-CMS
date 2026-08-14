/**
 * Spinner — indicador de carregamento indeterminado HONESTO (doc 07 §62/§33:
 * nunca fabricar progresso). Lucide Loader2; respeita prefers-reduced-motion.
 */

import { Loader2 } from 'lucide-react';

import { cx } from '../../lib/cx';

export function Spinner({ label = 'Carregando', className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cx('inline-flex items-center', className)}>
      <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} />
      <span className="sr-only">{label}…</span>
    </span>
  );
}
