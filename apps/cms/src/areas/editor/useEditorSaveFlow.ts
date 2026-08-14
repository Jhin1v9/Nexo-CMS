/**
 * useEditorSaveFlow — fluxo de save REAL do Editor (07§36-41) + resolução de
 * conflito (07§38-40, D12).
 *
 * Save (DESTRUCTIVE -> REQUIRE_APPROVAL por policy):
 *   clique/Ctrl+S -> ApprovalDialog (impacto visível, 07§43) -> re-invoca
 *   editor.source.save com `approval` (D17) e expectedHash = hash do último
 *   open/save (concorrência otimista, 07§38).
 * Resultados honestos (07§29):
 *   - saved:true + verificado -> Saved + toast (NUNCA antes disso, 07§79);
 *   - erro != CONFLICT -> Save Failed + pending preservado + retry (07§37);
 *   - CONFLICT -> ConflictDialog com as 5 resoluções suportadas (D12: Merge
 *     NUNCA oferecido — o backend a rejeita UNSUPPORTED).
 *
 * Resoluções implementadas sobre os primitivos reais (não há capability de
 * resolve-conflict — M3-CONTRACTS §3.1):
 *   - Keep Local: re-open (nova baseline) -> save do buffer local com
 *     aprovação (sobrescreve a mudança externa por escolha explícita);
 *   - Keep External: re-open -> adota o conteúdo do disco, descarta o buffer;
 *   - Compare: re-open -> diff local 3-way (baseline/local/externo);
 *   - Reload: re-open -> nova baseline, buffer local preservado como Unsaved;
 *   - Cancel: fecha o diálogo; o arquivo permanece em Conflict até nova ação.
 */

import { useState } from 'react';

import { currentActorId, toControlPlaneError, type Approval } from '../../api/client';
import { useEditorOpenSource, useEditorSaveSource } from '../../api/hooks';
import { useToast } from '../../components/ui';
import { shortHash } from '../../lib/cx';
import { buildSaveInput } from './editorLib';
import { editorStore, useEditorStore, type EditorConflict } from './editorStore';

interface PendingSaveApproval {
  filePath: string;
  /** 'save' = save normal; 'keepLocal' = resolução de conflito (07§39). */
  mode: 'save' | 'keepLocal';
}

export interface EditorSaveFlow {
  /** Arquivo aguardando aprovação (null = ApprovalDialog fechado). */
  pendingApproval: PendingSaveApproval | null;
  saving: boolean;
  conflict: EditorConflict | null;
  loadingExternal: boolean;
  /** Pede save (abre ApprovalDialog; readOnly/Unsaved checados pelo chamador). */
  requestSave: (filePath: string) => void;
  cancelApproval: () => void;
  confirmApproval: (justification?: string) => void;
  /** Retry de Save Failed (07§37) — mesmo fluxo com aprovação. */
  retrySave: (filePath: string) => void;
  resolveConflict: (resolution: 'KeepLocal' | 'KeepExternal' | 'Compare' | 'Reload' | 'Cancel') => void;
}

export function useEditorSaveFlow(projectId: string): EditorSaveFlow {
  const save = useEditorSaveSource();
  const open = useEditorOpenSource();
  const toast = useToast();
  const [pendingApproval, setPendingApproval] = useState<PendingSaveApproval | null>(null);
  const conflict = useEditorStore((s) => s.conflict);

  const doSave = (filePath: string, approval?: Approval) => {
    const store = editorStore.getState();
    const file = store.files[filePath];
    if (file === undefined) return;
    store.markSaving(filePath);
    save.mutate(
      { ...buildSaveInput(projectId, filePath, file.buffer, file.hash), ...(approval !== undefined ? { approval } : {}) },
      {
        onSuccess: (out) => {
          const st = editorStore.getState();
          st.saveSucceeded(filePath, out.hash);
          st.closeConflict();
          const diagnosticsNote =
            out.diagnostics.length > 0 ? ` Diagnósticos do pipeline: ${out.diagnostics.join('; ')}` : '';
          toast.success(
            'Saved',
            `${filePath} persistido e verificado (hash ${shortHash(out.hash)}${out.verified ? '' : ' — verificação pós-escrita NÃO confirmada'}).${diagnosticsNote}`,
          );
        },
        onError: (cause) => {
          const error = toControlPlaneError(cause);
          const st = editorStore.getState();
          if (error.code === 'CONFLICT') {
            // 07§38: ambos os lados preservados; resolução via ConflictDialog.
            st.conflictDetected(filePath, error.shape);
            return;
          }
          // 07§37: pending preservado, NUNCA vira Saved.
          st.saveFailed(filePath, error.shape);
          toast.error('Save Failed', error.nextAction ?? error.message);
        },
      },
    );
  };

  const reloadFromDisk = (
    filePath: string,
    onLoaded: (content: string, hash: string) => void,
    errorTitle: string,
  ) => {
    open.mutate(
      { projectId, filePath },
      {
        onSuccess: (data) => onLoaded(data.content, data.hash),
        onError: (cause) => {
          const error = toControlPlaneError(cause);
          toast.error(errorTitle, error.nextAction ?? error.message);
        },
      },
    );
  };

  return {
    pendingApproval,
    saving: save.isPending,
    conflict,
    loadingExternal: open.isPending,

    requestSave: (filePath) => {
      const file = editorStore.getState().files[filePath];
      if (file === undefined || file.readOnly) return;
      save.reset();
      setPendingApproval({ filePath, mode: 'save' });
    },

    retrySave: (filePath) => {
      // Retry honesto: passa pelo ApprovalDialog de novo (mutação DESTRUCTIVE).
      save.reset();
      setPendingApproval({ filePath, mode: 'save' });
    },

    cancelApproval: () => setPendingApproval(null),

    confirmApproval: (justification) => {
      if (pendingApproval === null) return;
      const approval: Approval = {
        approver: currentActorId(),
        ...(justification !== undefined ? { justification } : {}),
      };
      const { filePath, mode } = pendingApproval;
      setPendingApproval(null);
      if (mode === 'save') {
        doSave(filePath, approval);
        return;
      }
      // Keep Local: nova baseline real (re-open) antes de sobrescrever.
      reloadFromDisk(
        filePath,
        (content, hash) => {
          editorStore.getState().rebaseKeepingLocal(filePath, content, hash);
          doSave(filePath, approval);
        },
        'Falha ao reler o arquivo para Keep Local',
      );
    },

    resolveConflict: (resolution) => {
      const current = editorStore.getState().conflict;
      if (current === null) return;
      const filePath = current.filePath;
      switch (resolution) {
        case 'Cancel':
          // Estado permanece Conflict (evidência visível na barra de estado).
          editorStore.getState().closeConflict();
          return;
        case 'Compare':
          reloadFromDisk(
            filePath,
            (content) => editorStore.getState().conflictExternalLoaded(content),
            'Falha ao carregar a versão externa para comparação',
          );
          return;
        case 'Reload':
          // 07§40: refresh real; buffer local preservado como Unsaved.
          reloadFromDisk(
            filePath,
            (content, hash) => {
              editorStore.getState().rebaseKeepingLocal(filePath, content, hash);
              toast.info('Arquivo recarregado', 'Baseline atualizada do disco; edições locais preservadas como Unsaved.');
            },
            'Falha ao recarregar o arquivo',
          );
          return;
        case 'KeepExternal':
          reloadFromDisk(
            filePath,
            (content, hash) => {
              editorStore.getState().adoptExternal(filePath, content, hash);
              toast.info('Versão externa adotada', 'Edições locais descartadas por escolha explícita (07§39).');
            },
            'Falha ao carregar a versão externa',
          );
          return;
        case 'KeepLocal':
          // Sobrescrita de mudança externa = DESTRUCTIVE -> aprovação D17.
          save.reset();
          setPendingApproval({ filePath, mode: 'keepLocal' });
          return;
      }
    },
  };
}
