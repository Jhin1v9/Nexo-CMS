/**
 * GitPage (/projects/$projectId/git) — doc 07 §31 + doc 10. TUDO via
 * capabilities git.* reais do backend M2; mutações DESTRUCTIVE passam por
 * ApprovalDialog (M3 §8.5). Área inteira gated por discovery: sem git.* no
 * Control Plane -> EmptyState "Backend capability pendente".
 */

import { GitBranch, History, Rows3, SquareDashedBottomCode } from 'lucide-react';

import { Tabs } from '../../components/ui';
import { CapabilityArea } from '../stubs/CapabilityArea';
import { CommitForm } from './CommitForm';
import { StatusPanel } from './GitStatusPanel';
import { DiffPanel } from './GitDiffPanel';
import { HistoryPanel } from './GitHistoryPanel';
import { BranchesPanel } from './GitBranchesPanel';
import { RemoteOps } from './RemoteOps';

export function GitPage({ projectId }: { projectId: string }) {
  return (
    <CapabilityArea title="Git" icon={GitBranch} requires={['git.status']}>
      <div className="flex flex-col gap-4">
        <RemoteOps projectId={projectId} />
        <Tabs
          ariaLabel="Seções do Git"
          items={[
            {
              value: 'changes',
              label: 'Alterações',
              icon: Rows3,
              panel: (
                <div className="flex flex-col gap-4">
                  <StatusPanel projectId={projectId} />
                  <CommitForm projectId={projectId} />
                </div>
              ),
            },
            { value: 'diff', label: 'Diff', icon: SquareDashedBottomCode, panel: <DiffPanel projectId={projectId} /> },
            { value: 'history', label: 'Histórico', icon: History, panel: <HistoryPanel projectId={projectId} /> },
            { value: 'branches', label: 'Branches', icon: GitBranch, panel: <BranchesPanel projectId={projectId} /> },
          ]}
        />
      </div>
    </CapabilityArea>
  );
}
