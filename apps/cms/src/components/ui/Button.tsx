/**
 * Button — variantes semânticas sobre tokens (bg-primary, bg-danger...).
 * Foco visível WCAG 2.2 (focus-ring), disabled real, estado loading com
 * aria-busy e Spinner (feedback reflete estado real, doc 07 §61).
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cx, focusRing } from '../../lib/cx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border border-primary',
  secondary: 'bg-background text-foreground hover:bg-muted border border-border',
  danger: 'bg-danger text-danger-foreground hover:bg-danger/90 border border-danger',
  ghost: 'bg-transparent text-foreground hover:bg-muted border border-transparent',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Estado de operação em andamento (desabilita e mostra Spinner real). */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner label="Operação em andamento" /> : null}
      {children}
    </button>
  );
});
