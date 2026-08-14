/**
 * Layout de /projects/$projectId — valida o projeto via project.read e
 * fornece o registro via contexto para as sub-áreas (header já mostra nome/
 * status; aqui garantimos NOT_FOUND honesto em vez de área quebrada).
 */

import { createContext, useContext } from 'react';
import { Outlet, useParams, Link } from '@tanstack/react-router';

import { useProject } from '../../api/hooks';
import type { ProjectRegistration } from '../../api/client';
import { Button, ErrorState, Spinner } from '../../components/ui';

const ProjectContext = createContext<ProjectRegistration | null>(null);

/** Registro do projeto ativo (metadata persistida — project.read). */
export function useActiveProject(): ProjectRegistration {
  const project = useContext(ProjectContext);
  if (project === null) {
    throw new Error('useActiveProject deve ser usado dentro de ProjectLayout');
  }
  return project;
}

export function ProjectLayout() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const query = useProject(projectId);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner label="Abrindo projeto" /> Abrindo projeto…
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState
          error={query.error}
          operation="project.read"
          action={
            <Link to="/">
              <Button size="sm" variant="primary">
                Voltar para projetos
              </Button>
            </Link>
          }
        />
      </div>
    );
  }
  return (
    <ProjectContext.Provider value={query.data.project}>
      <Outlet />
    </ProjectContext.Provider>
  );
}
