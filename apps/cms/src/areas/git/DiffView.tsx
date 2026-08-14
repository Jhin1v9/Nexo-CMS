/**
 * DiffView — diff textual com highlight simples por linha (tokens semânticos:
 * additions=success, deletions=danger, hunks=primary). O diff NUNCA é
 * truncado (convenção do formatGitDiff da CLI). CodeMirror readOnly é opção
 * futura quando a área de código (wave 5b) consolidar o editor.
 */

import { cx } from '../../lib/cx';

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'font-semibold text-foreground';
  if (line.startsWith('+')) return 'bg-success/10 text-foreground';
  if (line.startsWith('-')) return 'bg-danger/10 text-foreground';
  if (line.startsWith('@@')) return 'bg-primary/10 text-foreground';
  return 'text-muted-foreground';
}

export function DiffView({ diff }: { diff: string }) {
  const lines = diff.replace(/\n$/, '').split('\n');
  return (
    <pre
      aria-label="Diff"
      className="max-h-[32rem] overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-5"
    >
      {lines.map((line, index) => (
        <div key={index} className={cx('px-1 whitespace-pre-wrap break-all', lineClass(line))}>
          {line.length > 0 ? line : ' '}
        </div>
      ))}
    </pre>
  );
}
