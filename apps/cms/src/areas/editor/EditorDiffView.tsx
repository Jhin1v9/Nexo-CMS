/**
 * EditorDiffView — representação de diff (07§42): Added/Removed/Modified com
 * before/after. Dois usos honestos:
 *  - `EditorLineDiffView`: diff LOCAL (buffer vs disco — editorLib.diffLines),
 *    usado nas views Diff e Compare (3-way do ConflictDialog).
 *  - `EditorChangeDiffView`: diff REAL do backend (editor.change.preview,
 *    packages/editor Diff) — nunca recomputado na UI.
 * Sem jsdom: componentes puros, SSR-testáveis.
 */

import type { EditorDiff, EditorFileDiff, EditorFileDiffStatus } from '../../api/hooks';
import { Badge, type BadgeTone } from '../../components/ui';
import { cx } from '../../lib/cx';
import type { LocalLineDiff } from './editorLib';

const STATUS_TONE: Record<EditorFileDiffStatus, BadgeTone> = {
  Added: 'success',
  Removed: 'danger',
  Modified: 'warning',
};

export function FileStatusBadge({ status }: { status: EditorFileDiffStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

const LINE_CLASS = {
  added: 'bg-success/10 text-foreground',
  removed: 'bg-danger/10 text-foreground',
  modifiedBefore: 'bg-warning/15 text-foreground',
  modifiedAfter: 'bg-warning/10 text-foreground',
} as const;

function DiffLine({ tone, prefix, text }: { tone: keyof typeof LINE_CLASS; prefix: string; text: string }) {
  return (
    <div className={cx('flex gap-2 px-3 py-0.5 font-mono text-xs', LINE_CLASS[tone])}>
      <span aria-hidden="true" className="w-3 shrink-0 text-muted-foreground select-none">
        {prefix}
      </span>
      <span className="break-all whitespace-pre-wrap">{text === '' ? ' ' : text}</span>
    </div>
  );
}

/** Diff de linhas (apresentação 07§42: linhas adicionadas/removidas/modificadas). */
export function EditorLineDiffView({
  diff,
  beforeLabel = 'Antes',
  afterLabel = 'Depois',
}: {
  diff: LocalLineDiff;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const empty =
    diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileStatusBadge status={diff.status} />
        <span>
          {beforeLabel} → {afterLabel}
        </span>
      </div>
      {empty ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Sem diferenças entre as versões comparadas.
        </p>
      ) : (
        <div
          role="group"
          aria-label={`Diff ${beforeLabel} vs ${afterLabel}`}
          className="divide-y divide-border/50 overflow-hidden rounded-md border border-border"
        >
          {diff.modified.map((pair, i) => (
            <div key={`m-${String(i)}`}>
              <DiffLine tone="modifiedBefore" prefix="-" text={pair.before} />
              <DiffLine tone="modifiedAfter" prefix="+" text={pair.after} />
            </div>
          ))}
          {diff.removed.map((line, i) => (
            <DiffLine key={`r-${String(i)}`} tone="removed" prefix="-" text={line} />
          ))}
          {diff.added.map((line, i) => (
            <DiffLine key={`a-${String(i)}`} tone="added" prefix="+" text={line} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Um arquivo do Diff do backend (editor.change.preview — 07§42). */
export function EditorFileDiffView({ file }: { file: EditorFileDiff }) {
  return (
    <section aria-label={`Diff de ${file.file}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FileStatusBadge status={file.status} />
        <span className="font-mono text-xs text-foreground">{file.file}</span>
        {file.movedTo !== undefined ? (
          <span className="text-xs text-muted-foreground">→ {file.movedTo}</span>
        ) : null}
      </div>
      <EditorLineDiffView
        diff={{ status: file.status, added: file.added, removed: file.removed, modified: file.modified }}
        beforeLabel="Source atual"
        afterLabel="Após o change"
      />
    </section>
  );
}

/** Diff completo de um change (lista de arquivos + origem quando conhecida). */
export function EditorChangeDiffView({ diff }: { diff: EditorDiff }) {
  return (
    <div className="flex flex-col gap-4">
      {diff.origin !== undefined ? (
        <p className="text-xs text-muted-foreground">
          Origem da mudança (07§42): <span className="font-medium text-foreground">{diff.origin}</span>
        </p>
      ) : null}
      {diff.files.length === 0 ? (
        <p className="text-xs text-muted-foreground">O change não produz diferenças no source.</p>
      ) : (
        diff.files.map((file) => <EditorFileDiffView key={file.file} file={file} />)
      )}
    </div>
  );
}
