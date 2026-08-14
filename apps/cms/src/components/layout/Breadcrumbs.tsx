/**
 * Breadcrumbs — trilha derivada das rotas reais (TanStack useMatches),
 * com labels semânticos por segmento. Último item é aria-current="page".
 */

import { Link, useMatches } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

import { focusRing } from '../../lib/cx';

const SEGMENT_LABELS: Record<string, string> = {
  projects: 'Projetos',
  editor: 'Editor',
  components: 'Components',
  media: 'Media',
  design: 'Design',
  responsive: 'Responsive',
  git: 'Git',
  audit: 'Audit',
};

interface Crumb {
  path: string;
  label: string;
}

function crumbsFromPath(pathname: string, projectName: string | undefined): Crumb[] {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  const crumbs: Crumb[] = [{ path: '/', label: 'Projetos' }];
  let acc = '';
  for (const segment of segments) {
    acc += `/${segment}`;
    if (segment === 'projects') continue; // já coberto pelo primeiro crumb
    const known = SEGMENT_LABELS[segment];
    if (known !== undefined) {
      crumbs.push({ path: acc, label: known });
    } else if (crumbs.length === 1) {
      // $projectId — nome real do projeto quando carregado, senão o id.
      crumbs.push({ path: acc, label: projectName ?? segment });
    }
  }
  return crumbs;
}

export function Breadcrumbs({ projectName }: { projectName?: string }) {
  const matches = useMatches();
  const pathname = matches[matches.length - 1]?.pathname ?? '/';
  const crumbs = crumbsFromPath(pathname, projectName);
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumbs" className="hidden lg:block">
      <ol className="flex items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.path}>
              {index > 0 ? <ChevronRight aria-hidden="true" size={12} /> : null}
              <li>
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    // Breadcrumb aceita path dinâmico já resolvido (string runtime).
                    to={crumb.path as never}
                    className={`rounded-sm hover:text-foreground hover:underline ${focusRing}`}
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
