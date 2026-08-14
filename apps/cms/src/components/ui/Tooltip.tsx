/**
 * Tooltip (Base UI) — usada também para explicar controles desabilitados
 * (07§56: capability ausente -> explicação visível). Trigger desabilitado é
 * envolvido em <span> para continuar focável/hoverável.
 */

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactElement, ReactNode } from 'react';

import { cx } from '../../lib/cx';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider delay={200}>{children}</BaseTooltip.Provider>;
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  /** Envolve o trigger em <span tabIndex=0> (botões disabled não emitem eventos). */
  wrapForDisabled?: boolean;
  className?: string;
}

export function Tooltip({ content, children, wrapForDisabled = false, className }: TooltipProps) {
  if (content === undefined || content === null || content === '') return children;
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger
        render={
          wrapForDisabled ? (
            <span tabIndex={0} className="inline-flex cursor-not-allowed" />
          ) : undefined
        }
      >
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={6} className="z-50">
          <BaseTooltip.Popup
            className={cx(
              'max-w-xs rounded-md border border-border bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md',
              className,
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
