/**
 * AppShell — estrutura raiz: Sidebar + Header + conteúdo. Providers de
 * tooltip/toast ficam aqui (uma vez por app). Estado visual ≠ estado de
 * domínio (07 §13).
 */

import { Outlet } from '@tanstack/react-router';

import { Toaster, ToastProvider, TooltipProvider } from '../ui';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <div className="flex h-dvh bg-muted/30 text-foreground">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </ToastProvider>
  );
}
