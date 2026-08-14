/**
 * Sidebar — navegação principal (doc 07 §20). Ícones SEMPRE Lucide
 * (07 §53: zero emojis/símbolos textuais como ícones). Colapsável em desktop;
 * overlay em mobile (07 §52). Item Audit aparece apenas quando existe
 * capability audit.* no discovery (regra do prompt M3: checar discovery real).
 */

import { Link, useParams } from '@tanstack/react-router';
import {
  Component,
  FolderKanban,
  GitBranch,
  Image,
  LayoutDashboard,
  MonitorSmartphone,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  SquarePen,
} from 'lucide-react';
import type { ReactElement } from 'react';

import { hasDomainCapabilities } from '../../api/capabilities';
import { useCapabilities } from '../../api/hooks';
import { cx, focusRing } from '../../lib/cx';
import { useUiStore } from '../../stores/ui';
import { Tooltip } from '../ui/Tooltip';

type ProjectTo =
  | '/projects/$projectId'
  | '/projects/$projectId/editor'
  | '/projects/$projectId/components'
  | '/projects/$projectId/media'
  | '/projects/$projectId/design'
  | '/projects/$projectId/responsive'
  | '/projects/$projectId/git'
  | '/projects/$projectId/audit';

interface NavItem {
  to: ProjectTo;
  label: string;
  icon: typeof FolderKanban;
  /** Prefixo de capability exigido no discovery; omitido = sempre visível. */
  requiresDomain?: string;
  /** Active state exato (overview do projeto não deve marcar sub-rotas). */
  exact?: boolean;
}

const PROJECT_NAV: NavItem[] = [
  { to: '/projects/$projectId', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/projects/$projectId/editor', label: 'Editor', icon: SquarePen },
  { to: '/projects/$projectId/components', label: 'Components', icon: Component },
  { to: '/projects/$projectId/media', label: 'Media', icon: Image },
  { to: '/projects/$projectId/design', label: 'Design', icon: Palette },
  { to: '/projects/$projectId/responsive', label: 'Responsive', icon: MonitorSmartphone },
  { to: '/projects/$projectId/git', label: 'Git', icon: GitBranch },
  { to: '/projects/$projectId/audit', label: 'Audit', icon: ScrollText, requiresDomain: 'audit.' },
];

function NavLinkFrame({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactElement;
}) {
  return collapsed ? (
    <Tooltip content={label} className="whitespace-nowrap">
      {children}
    </Tooltip>
  ) : (
    children
  );
}

function navLinkClass(collapsed: boolean): string {
  return cx(
    'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground',
    'hover:bg-muted hover:text-foreground',
    focusRing,
    collapsed && 'justify-center px-2',
  );
}

function NavLink({
  item,
  projectId,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  projectId: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.to}
      params={{ projectId }}
      onClick={onNavigate}
      aria-label={item.label}
      className={navLinkClass(collapsed)}
      activeProps={{ className: 'bg-muted text-foreground font-medium' }}
      activeOptions={{ exact: item.exact === true }}
    >
      <Icon aria-hidden="true" size={16} className="shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </Link>
  );
  return (
    <NavLinkFrame label={item.label} collapsed={collapsed}>
      {link}
    </NavLinkFrame>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId;
  const capsQuery = useCapabilities();
  const capabilities = capsQuery.data?.capabilities ?? [];

  const closeMobile = () => setMobileOpen(false);

  const nav = (
    <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
      <NavLinkFrame label="Projetos" collapsed={collapsed}>
        <Link
          to="/"
          onClick={closeMobile}
          aria-label="Projetos"
          className={navLinkClass(collapsed)}
          activeProps={{ className: 'bg-muted text-foreground font-medium' }}
          activeOptions={{ exact: true }}
        >
          <FolderKanban aria-hidden="true" size={16} className="shrink-0" />
          {collapsed ? null : <span className="truncate">Projetos</span>}
        </Link>
      </NavLinkFrame>
      {projectId !== undefined ? (
        <>
          <p
            className={cx(
              'mt-3 mb-1 px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase',
              collapsed && 'sr-only',
            )}
          >
            Projeto
          </p>
          {PROJECT_NAV.filter(
            (item) =>
              item.requiresDomain === undefined || hasDomainCapabilities(capabilities, item.requiresDomain),
          ).map((item) => (
            <NavLink
              key={item.label}
              item={item}
              projectId={projectId}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </>
      ) : null}
    </nav>
  );

  const inner = (
    <div className="flex h-full flex-col">
      <div
        className={cx(
          'flex items-center gap-2 border-b border-border px-3 py-3.5',
          collapsed && 'justify-center px-2',
        )}
      >
        <LayoutDashboard aria-hidden="true" size={18} className="shrink-0 text-primary" />
        {collapsed ? null : <span className="truncate text-sm font-semibold text-foreground">Nexo CMS</span>}
      </div>
      {nav}
      <div className="hidden border-t border-border p-2 md:block">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}
          aria-pressed={collapsed}
          className={cx(
            'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
            focusRing,
            collapsed && 'justify-center px-2',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" size={16} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={16} />
          )}
          {collapsed ? null : <span>Recolher</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: coluna fixa, colapsável (56px em ícones / 240px completo). */}
      <aside
        className={cx(
          'hidden shrink-0 border-r border-border bg-background transition-[width] md:block',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        {inner}
      </aside>
      {/* Mobile: overlay com backdrop para fechar (07 §52: layout adaptado). */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={closeMobile}
            className="absolute inset-0 h-full w-full bg-foreground/40"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-background shadow-lg">
            {inner}
          </aside>
        </div>
      ) : null}
    </>
  );
}
