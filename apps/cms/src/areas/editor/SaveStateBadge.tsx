/**
 * SaveStateBadge — SaveState REAL (07§29): Saved | Unsaved | Saving |
 * Save Failed | Conflict. Cor é reforço; o rótulo textual carrega o estado.
 * 'Saved' só é exibido quando o store marcou persistência confirmada (07§79).
 */

import { CheckCircle2, CircleDot, LoaderCircle, SaveOff, TriangleAlert } from 'lucide-react';

import type { EditorSaveState } from '../../api/hooks';
import { Badge, type BadgeTone } from '../../components/ui';
import { SAVE_STATE_LABEL } from './editorLib';

const STATE: Record<EditorSaveState, { tone: BadgeTone; icon: typeof CheckCircle2 }> = {
  Saved: { tone: 'success', icon: CheckCircle2 },
  Unsaved: { tone: 'warning', icon: CircleDot },
  Saving: { tone: 'primary', icon: LoaderCircle },
  SaveFailed: { tone: 'danger', icon: SaveOff },
  Conflict: { tone: 'danger', icon: TriangleAlert },
};

export function SaveStateBadge({ state }: { state: EditorSaveState }) {
  const s = STATE[state];
  return (
    <Badge tone={s.tone} icon={s.icon} title={`Estado de save (07§29): ${SAVE_STATE_LABEL[state]}`}>
      {SAVE_STATE_LABEL[state]}
    </Badge>
  );
}
