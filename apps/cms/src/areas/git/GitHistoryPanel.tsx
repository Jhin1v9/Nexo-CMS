/**
 * HistoryPanel — git.history (doc 10 §41/§43): hash(12), data, autor,
 * mensagem. Tabela real; limite 1..100 conforme contrato.
 */

import { History } from 'lucide-react';
import { useId, useState } from 'react';

import { useGitHistory } from '../../api/hooks';
import { formatDateTime, shortHash } from '../../lib/cx';
import { Button, EmptyState, ErrorState, Field, Select, Spinner } from '../../components/ui';

const LIMITS = [10, 30, 50, 100] as const;

export function HistoryPanel({ projectId }: { projectId: string }) {
  const limitId = useId();
  const [limit, setLimit] = useState<number>(30);
  const history = useGitHistory(projectId, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Field label="Limite de commits" htmlFor={limitId} className="w-40">
          <Select
            id={limitId}
            value={String(limit)}
            onChange={(e) => setLimit(Number.parseInt(e.target.value, 10))}
          >
            {LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Button size="sm" loading={history.isRefetching} onClick={() => void history.refetch()}>
          Atualizar
        </Button>
      </div>

      {history.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Buscando histórico" /> Buscando histórico Git…
        </div>
      ) : history.isError ? (
        <ErrorState error={history.error} operation="git.history" />
      ) : (history.data?.length ?? 0) === 0 ? (
        <EmptyState icon={History} title="Sem commits" description="O repositório ainda não possui commits." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Histórico de commits</caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">Commit</th>
                <th scope="col" className="px-3 py-2 font-medium">Data</th>
                <th scope="col" className="px-3 py-2 font-medium">Autor</th>
                <th scope="col" className="px-3 py-2 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((entry) => (
                <tr key={entry.hash} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">{shortHash(entry.hash)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.dateISO)}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {entry.authorName} <span className="text-muted-foreground">&lt;{entry.authorEmail}&gt;</span>
                  </td>
                  <td className="px-3 py-2 break-words text-foreground">{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
