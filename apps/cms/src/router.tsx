/**
 * Router TanStack (code-based — sem plugin de file-based routing, D15).
 * Rotas reais do prompt M3 Wave 5a: / (projetos), /projects/$projectId/*
 * (overview/editor/components/media/design/responsive/git/audit).
 */

import {
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from '@tanstack/react-router';
import { ScrollText } from 'lucide-react';

import { ComponentsPage } from './areas/components/ComponentsPage';
import { DesignPage } from './areas/design/DesignPage';
import { EditorPage } from './areas/editor/EditorPage';
import { GitPage } from './areas/git/GitPage';
import { MediaPage } from './areas/media/MediaPage';
import { ProjectLayout } from './areas/projects/ProjectLayout';
import { ProjectOverviewPage } from './areas/projects/ProjectOverviewPage';
import { ProjectsPage } from './areas/projects/ProjectsPage';
import { ResponsivePage } from './areas/responsive/ResponsivePage';
import { CapabilityArea } from './areas/stubs/CapabilityArea';
import { AppShell } from './components/layout/AppShell';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProjectsPage,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectLayout,
});

const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  component: ProjectOverviewPage,
});

function useProjectIdParam(): string {
  const { projectId } = useParams({ from: projectRoute.id });
  return projectId;
}

function GitRoute() {
  return <GitPage projectId={useProjectIdParam()} />;
}

function EditorRoute() {
  return <EditorPage projectId={useProjectIdParam()} />;
}

function ComponentsRoute() {
  return <ComponentsPage projectId={useProjectIdParam()} />;
}

function MediaRoute() {
  return <MediaPage projectId={useProjectIdParam()} />;
}

function DesignRoute() {
  return <DesignPage projectId={useProjectIdParam()} />;
}

function ResponsiveRoute() {
  return <ResponsivePage projectId={useProjectIdParam()} />;
}

function AuditRoute() {
  return <CapabilityArea title="Audit" icon={ScrollText} requires={['audit.list']} />;
}

const gitRoute = createRoute({ getParentRoute: () => projectRoute, path: '/git', component: GitRoute });
const editorRoute = createRoute({ getParentRoute: () => projectRoute, path: '/editor', component: EditorRoute });
const componentsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/components',
  component: ComponentsRoute,
});
const mediaRoute = createRoute({ getParentRoute: () => projectRoute, path: '/media', component: MediaRoute });
const designRoute = createRoute({ getParentRoute: () => projectRoute, path: '/design', component: DesignRoute });
const responsiveRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/responsive',
  component: ResponsiveRoute,
});
const auditRoute = createRoute({ getParentRoute: () => projectRoute, path: '/audit', component: AuditRoute });

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute.addChildren([
    projectIndexRoute,
    editorRoute,
    componentsRoute,
    mediaRoute,
    designRoute,
    responsiveRoute,
    gitRoute,
    auditRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
