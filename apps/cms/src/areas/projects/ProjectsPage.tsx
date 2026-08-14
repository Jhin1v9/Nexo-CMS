/**
 * Dashboard de Projetos (rota /) — lista via capability project.list,
 * importação via project.import (doc 07 §46: Select Folder -> Scan ->
 * Analysis -> Review -> Confirm; a análise acontece no backend e o resultado
 * é exibido honestamente, sem saída técnica incompreensível).
 */

import { useNavigate } from '@tanstack/react-router';
import { FolderInput, FolderKanban, FolderOpen, RefreshCw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { useCapabilities, useImportProject, useProjects, useRefreshProject } from '../../api/hooks';
import { hasDomainCapabilities } from '../../api/capabilities';
import { formatDateTime } from '../../lib/cx';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  GuardedButton,
  Input,
  Spinner,
  useToast,
} from '../../components/ui';

function ImportProjectForm() {
  const inputId = useId();
  const navigate = useNavigate();
  const toast = useToast();
  const importProject = useImportProject();
  const [rootPath, setRootPath] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = rootPath.trim();
    if (trimmed.length === 0) return;
    importProject.mutate(
      { rootPath: trimmed },
      {
        onSuccess: (data) => {
          toast.success(
            data.alreadyRegistered ? 'Projeto já registrado — re-analisado' : 'Projeto importado',
            data.project.rootPath,
          );
          void navigate({ to: '/projects/$projectId', params: { projectId: data.project.id } });
        },
        onError: (error) => toast.error('Falha ao importar projeto', error.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <FolderInput aria-hidden="true" size={16} className="text-primary" />
            Importar projeto
          </span>
        }
        description="Informe o caminho absoluto da raiz do projeto. O Nexo faz o scan read-only e registra o resultado da análise."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Caminho da raiz do projeto" htmlFor={inputId} required className="flex-1">
            <Input
              id={inputId}
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/caminho/absoluto/do/projeto"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>
          <GuardedButton
            capabilityId="project.import"
            variant="primary"
            type="submit"
            loading={importProject.isPending}
          >
            Importar
          </GuardedButton>
        </form>
        {importProject.isError ? (
          <div className="mt-3">
            <ErrorState error={importProject.error} operation="project.import" />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function ProjectRow({ project }: { project: { id: string; name: string; rootPath: string; status: string; updatedAt: string } }) {
  const navigate = useNavigate();
  const refresh = useRefreshProject(project.id);
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={project.rootPath}>
          {project.rootPath}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Atualizado em {formatDateTime(project.updatedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={project.status === 'ACTIVE' ? 'success' : 'neutral'}>{project.status}</Badge>
        <GuardedButton
          capabilityId="project.refresh"
          size="sm"
          loading={refresh.isPending}
          onClick={() => refresh.mutate()}
          title="Re-scan do projeto (project.refresh)"
        >
          <RefreshCw aria-hidden="true" size={14} />
          Re-scan
        </GuardedButton>
        <GuardedButton
          capabilityId="project.open"
          size="sm"
          variant="primary"
          onClick={() => void navigate({ to: '/projects/$projectId', params: { projectId: project.id } })}
        >
          <FolderOpen aria-hidden="true" size={14} />
          Abrir
        </GuardedButton>
      </div>
    </li>
  );
}

export function ProjectsPage() {
  const projects = useProjects();
  const caps = useCapabilities();
  const projectDomainMissing =
    caps.data !== undefined && !hasDomainCapabilities(caps.data.capabilities, 'project.');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Projetos registrados no Nexo. Importe uma pasta para análise ou abra um projeto existente.
        </p>
      </div>

      <ImportProjectForm />

      <Card>
        <CardHeader title="Projetos registrados" description="Fonte: capability project.list do Control Plane." />
        {projectDomainMissing ? (
          <CardBody>
            <EmptyState
              icon={FolderKanban}
              title="Backend capability pendente"
              description="Nenhuma capability project.* foi encontrada no discovery do Control Plane. Verifique se o runtime está no ar e atualizado."
            />
          </CardBody>
        ) : projects.isLoading ? (
          <CardBody className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner label="Carregando projetos" /> Carregando projetos…
          </CardBody>
        ) : projects.isError ? (
          <CardBody>
            <ErrorState
              error={projects.error}
              operation="project.list"
              action={
                <Button size="sm" onClick={() => void projects.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          </CardBody>
        ) : (projects.data?.projects.length ?? 0) === 0 ? (
          <CardBody>
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto registrado"
              description="Importe a pasta de um projeto acima para que o Nexo faça o scan e registre a stack detectada."
            />
          </CardBody>
        ) : (
          <ul className="divide-y divide-border">
            {(projects.data?.projects ?? []).map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
