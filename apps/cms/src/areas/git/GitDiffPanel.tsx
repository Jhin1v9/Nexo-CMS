/**
 * DiffPanel — git.diff (doc 10 §11/§12). Modos reais do contrato; refs
 * (from/to) exigidas apenas nos modos COMMITS/BRANCHES; COMMIT_VS_PARENT usa
 * from = hash do commit. Query só dispara por ação explícita ("Gerar diff").
 */

import { FileDiff } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import type { GitDiffMode } from '../../api/client';
import { useGitDiff } from '../../api/hooks';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { DiffView } from './DiffView';

const MODES: { value: GitDiffMode; label: string }[] = [
  { value: 'WORKTREE_VS_HEAD', label: 'Worktree vs HEAD' },
  { value: 'STAGED_VS_HEAD', label: 'Staged vs HEAD' },
  { value: 'COMMIT_VS_PARENT', label: 'Commit vs parent' },
  { value: 'COMMITS', label: 'Entre commits' },
  { value: 'BRANCHES', label: 'Entre branches' },
];

export function DiffPanel({ projectId }: { projectId: string }) {
  const modeId = useId();
  const pathId = useId();
  const fromId = useId();
  const toId = useId();
  const [mode, setMode] = useState<GitDiffMode>('WORKTREE_VS_HEAD');
  const [path, setPath] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitted, setSubmitted] = useState<{
    mode: GitDiffMode;
    path?: string;
    from?: string;
    to?: string;
  }>({ mode: 'WORKTREE_VS_HEAD' });

  const needsRange = mode === 'COMMITS' || mode === 'BRANCHES';
  const needsFrom = needsRange || mode === 'COMMIT_VS_PARENT';
  const refsValid = !needsFrom || from.trim().length > 0;
  const rangeValid = !needsRange || to.trim().length > 0;

  const diff = useGitDiff(projectId, submitted);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!refsValid || !rangeValid) return;
    setSubmitted({
      mode,
      ...(path.trim().length > 0 ? { path: path.trim() } : {}),
      ...(from.trim().length > 0 ? { from: from.trim() } : {}),
      ...(needsRange && to.trim().length > 0 ? { to: to.trim() } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <FileDiff aria-hidden="true" size={16} className="text-primary" />
              Diff
            </span>
          }
          description="Diff real calculado pelo backend (patch + numstat). Nunca truncado."
        />
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Modo" htmlFor={modeId}>
              <Select id={modeId} value={mode} onChange={(e) => setMode(e.target.value as GitDiffMode)}>
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Arquivo (opcional)" htmlFor={pathId}>
              <Input
                id={pathId}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="src/index.ts"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            {needsFrom ? (
              <Field label={mode === 'COMMIT_VS_PARENT' ? 'Commit' : 'De (from)'} htmlFor={fromId} required>
                <Input
                  id={fromId}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder={mode === 'BRANCHES' ? 'main' : 'hash do commit'}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </Field>
            ) : null}
            {needsRange ? (
              <Field label="Para (to)" htmlFor={toId} required>
                <Input
                  id={toId}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={mode === 'BRANCHES' ? 'feature/x' : 'hash do commit'}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </Field>
            ) : null}
            <div className="flex items-end">
              <Button variant="primary" type="submit" disabled={!refsValid || !rangeValid} loading={diff.isFetching}>
                Gerar diff
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {diff.isError ? (
        <ErrorState error={diff.error} operation="git.diff" />
      ) : diff.isLoading || diff.isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Calculando diff" /> Calculando diff…
        </div>
      ) : diff.data === undefined ? null : diff.data.diff.length === 0 ? (
        <EmptyState
          icon={FileDiff}
          title="Sem diferenças"
          description={`Nenhuma diferença no modo ${diff.data.mode} para os parâmetros informados.`}
        />
      ) : (
        <Card>
          <CardHeader
            title={`Modo ${diff.data.mode}`}
            description={`${String(diff.data.files.length)} arquivo(s) alterado(s)`}
          />
          <CardBody className="flex flex-col gap-3">
            {diff.data.files.length > 0 ? (
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Resumo de alterações por arquivo</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-1 pr-4 font-medium">Arquivo</th>
                    <th scope="col" className="py-1 pr-4 font-medium">Adições</th>
                    <th scope="col" className="py-1 font-medium">Remoções</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.data.files.map((file) => (
                    <tr key={file.path} className="border-b border-border last:border-0">
                      <td className="py-1 pr-4 font-mono break-all text-foreground">{file.path}</td>
                      <td className="py-1 pr-4 text-foreground">+{file.additions}</td>
                      <td className="py-1 text-foreground">-{file.deletions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <DiffView diff={diff.data.diff} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
