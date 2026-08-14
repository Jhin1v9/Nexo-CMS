/**
 * Dialog (Base UI) — modal acessível com focus trap, Esc e backdrop.
 * NUNCA alert()/confirm()/prompt() (M3 §8.5) — toda confirmação passa por aqui.
 */

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx, focusRing } from '../../lib/cx';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Rodapé (ações) do diálogo. */
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40" />
        <BaseDialog.Popup
          className={cx(
            'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-background p-5 shadow-lg',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <BaseDialog.Title className="text-base font-semibold text-foreground">{title}</BaseDialog.Title>
            <BaseDialog.Close
              aria-label="Fechar diálogo"
              className={cx(
                'rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground',
                focusRing,
              )}
            >
              <X aria-hidden="true" size={16} />
            </BaseDialog.Close>
          </div>
          {description !== undefined ? (
            <BaseDialog.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </BaseDialog.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          {footer !== undefined ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
