/**
 * Controles de formulário acessíveis: label real (htmlFor), descrição/erro
 * ligados via aria-describedby, foco visível (token focus), tokens semânticos.
 * Select nativo estilizado (keyboard nav do browser; Base UI Select fica para
 * casos com opções customizadas — D15 não obriga primitivo para select simples).
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cx, focusRing } from '../../lib/cx';

const CONTROL_BASE =
  'w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Wrapper label+controle+ajuda/erro com aria correto (doc 07 §59). */
export function Field({ label, htmlFor, description, error, required, children, className }: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {required === true ? (
          <span aria-hidden="true" className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {description !== undefined ? (
        <p id={htmlFor !== undefined ? `${htmlFor}-desc` : undefined} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={htmlFor !== undefined ? `${htmlFor}-err` : undefined} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid === true || undefined}
      className={cx(CONTROL_BASE, 'h-9', invalid === true && 'border-danger', focusRing, className)}
      {...rest}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid === true || undefined}
      className={cx(CONTROL_BASE, 'min-h-20 py-2', invalid === true && 'border-danger', focusRing, className)}
      {...rest}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid === true || undefined}
      className={cx(CONTROL_BASE, 'h-9', invalid === true && 'border-danger', focusRing, className)}
      {...rest}
    >
      {children}
    </select>
  );
});
