/**
 * Toast/Toaster (Base UI) — feedback de operações (doc 07 §61/§64).
 * Feedback reflete estado REAL: sucesso só após resposta ok do Control Plane.
 * Prioridade 'high' para erros (anúncio urgente a screen readers).
 */

import { Toast as BaseToast } from '@base-ui/react/toast';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx, focusRing } from '../../lib/cx';

type ToastType = 'success' | 'error' | 'info';

const ICONS: Record<ToastType, typeof Info> = { success: CheckCircle2, error: AlertCircle, info: Info };
const ICON_TONE: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  return <BaseToast.Provider timeout={6_000}>{children}</BaseToast.Provider>;
}

/** Hook de disparo de toasts (deve ser usado dentro de <ToastProvider>). */
export function useToast() {
  const manager = BaseToast.useToastManager();
  return {
    success: (title: string, description?: string) =>
      manager.add({ title, description, type: 'success' }),
    error: (title: string, description?: string) =>
      manager.add({ title, description, type: 'error', priority: 'high', timeout: 10_000 }),
    info: (title: string, description?: string) => manager.add({ title, description, type: 'info' }),
  };
}

function ToastItem({ toast }: { toast: BaseToast.Root.ToastObject }) {
  const type = (toast.type ?? 'info') as ToastType;
  const Icon = ICONS[type] ?? Info;
  return (
    <BaseToast.Root
      toast={toast}
      className="w-80 rounded-lg border border-border bg-background p-3 shadow-lg data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
    >
      <BaseToast.Content className="flex items-start gap-2">
        <Icon aria-hidden="true" size={16} className={cx('mt-0.5 shrink-0', ICON_TONE[type] ?? ICON_TONE.info)} />
        <div className="min-w-0 flex-1">
          {toast.title !== undefined ? (
            <BaseToast.Title className="text-sm font-medium text-foreground">{toast.title}</BaseToast.Title>
          ) : null}
          {toast.description !== undefined ? (
            <BaseToast.Description className="mt-0.5 text-xs break-words text-muted-foreground">
              {toast.description}
            </BaseToast.Description>
          ) : null}
        </div>
        <BaseToast.Close
          aria-label="Dispensar notificação"
          className={cx('rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground', focusRing)}
        >
          <X aria-hidden="true" size={14} />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  );
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return (
    <>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </>
  );
}

/** Viewport de toasts — montar uma vez, dentro do ToastProvider. */
export function Toaster() {
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed right-4 bottom-4 z-[60] flex w-80 flex-col gap-2 outline-none">
        <ToastList />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
