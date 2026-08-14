/**
 * editorStore — estado LOCAL de edição (zustand; doc 07§28-29).
 *
 * Fronteira dura: aqui só vive estado temporário de UI — arquivos abertos,
 * buffer não salvo, SaveState, view ativa, viewport/rota de preview, conflito
 * pendente. Estado de servidor (pending changes, discovery, preview info)
 * fica no react-query (ver api/hooks.ts). O buffer local NUNCA é apresentado
 * como persistido: SaveState só vira 'Saved' após editor.source.save retornar
 * `saved:true` (07§79 — zero fake success, M3 §8.4).
 */

import { createStore, useStore } from 'zustand';

import type { ControlPlaneErrorShape } from '../../api/client';
import type { EditorSaveState, EditorViewport } from '../../api/hooks';
import { deriveSaveState } from './editorLib';

/** Views do centro (07§6 — representações da MESMA verdade do projeto). */
export type EditorView = 'visual' | 'code' | 'split' | 'preview' | 'inspector' | 'diff';

/** Arquivo aberto no editor (buffer local + baseline real do disco). */
export interface EditorOpenFile {
  filePath: string;
  /** Buffer editável local — pode divergir do disco (07§28). */
  buffer: string;
  /** Último conteúdo confirmado no disco (open/save). */
  savedContent: string;
  /** Hash sha256 do savedContent — baseline do expectedHash (07§38). */
  hash: string;
  language: string;
  readOnly: boolean;
  saveState: EditorSaveState;
  /** Erro estruturado do último save falho (Save Failed — 07§37). */
  saveError: ControlPlaneErrorShape | null;
}

/** Conflito pendente de resolução (07§38-40) — ambos os lados preservados. */
export interface EditorConflict {
  filePath: string;
  /** Buffer local não salvo (lado "local" do conflito). */
  localContent: string;
  /** Conteúdo que estava no disco quando o arquivo foi aberto (baseline). */
  baselineContent: string;
  /** Conteúdo externo atual do disco (lado "external"), lido via re-open. */
  externalContent: string | null;
  /** Erro CONFLICT original do save (evidência). */
  cause: ControlPlaneErrorShape | null;
}

export interface EditorState {
  projectId: string;
  /** Ordem de abertura (estável) dos arquivos. */
  openPaths: string[];
  files: Record<string, EditorOpenFile>;
  activePath: string | null;
  view: EditorView;
  /** Caminho digitado na FileTree (entrada manual — ver desvio no header da página). */
  pathDraft: string;
  /** Viewports criados nesta sessão (não há capability de listagem — M3 §3.5). */
  sessionViewports: EditorViewport[];
  activeViewportId: string | null;
  /** Rota alvo do preview/seleção (ex.: '/'). */
  previewRoute: string;
  conflict: EditorConflict | null;
}

export interface EditorActions {
  /** Troca de projeto: reseta todo estado local (temporário por projeto). */
  resetForProject: (projectId: string) => void;
  setView: (view: EditorView) => void;
  setPathDraft: (path: string) => void;
  setActivePath: (path: string | null) => void;
  setPreviewRoute: (route: string) => void;
  addSessionViewport: (viewport: EditorViewport) => void;
  setActiveViewportId: (id: string | null) => void;
  /** Registra o resultado real de editor.source.open. */
  openLoaded: (file: {
    filePath: string;
    content: string;
    hash: string;
    language: string;
    readOnly: boolean;
  }) => void;
  /** Edição local do buffer — marca Unsaved de verdade (07§29). */
  editBuffer: (filePath: string, content: string) => void;
  markSaving: (filePath: string) => void;
  /** Sucesso real do pipeline: Saved SOMENTE aqui (07§79). */
  saveSucceeded: (filePath: string, hash: string) => void;
  /** Falha real: SaveFailed + pending preservado (07§37), NUNCA Saved. */
  saveFailed: (filePath: string, error: ControlPlaneErrorShape) => void;
  /** CONFLICT (07§38): abre o conflito preservando ambos os lados. */
  conflictDetected: (filePath: string, cause: ControlPlaneErrorShape | null) => void;
  /** Atualiza o lado externo do conflito (re-open durante Compare/Reload). */
  conflictExternalLoaded: (content: string) => void;
  closeConflict: () => void;
  /** Keep External / Reload: descarta buffer local, adota conteúdo do disco. */
  adoptExternal: (filePath: string, content: string, hash: string) => void;
  /** Keep Local: nova baseline (re-open) mantendo o buffer local Unsaved. */
  rebaseKeepingLocal: (filePath: string, externalContent: string, hash: string) => void;
  closeFile: (filePath: string) => void;
}

export type EditorStore = EditorState & EditorActions;

function initialState(projectId: string): EditorState {
  return {
    projectId,
    openPaths: [],
    files: {},
    activePath: null,
    view: 'code',
    pathDraft: '',
    sessionViewports: [],
    activeViewportId: null,
    previewRoute: '/',
    conflict: null,
  };
}

export function createEditorStore(projectId = '') {
  return createStore<EditorStore>()((set, get) => ({
    ...initialState(projectId),

    resetForProject: (nextProjectId) => set(initialState(nextProjectId)),
    setView: (view) => set({ view }),
    setPathDraft: (pathDraft) => set({ pathDraft }),
    setActivePath: (activePath) => set({ activePath }),
    setPreviewRoute: (previewRoute) => set({ previewRoute }),
    addSessionViewport: (viewport) =>
      set((s) => ({
        sessionViewports: [...s.sessionViewports.filter((v) => v.id !== viewport.id), viewport],
        activeViewportId: viewport.id,
      })),
    setActiveViewportId: (activeViewportId) => set({ activeViewportId }),

    openLoaded: ({ filePath, content, hash, language, readOnly }) =>
      set((s) => {
        const existing = s.files[filePath];
        return {
          openPaths: s.openPaths.includes(filePath) ? s.openPaths : [...s.openPaths, filePath],
          files: {
            ...s.files,
            [filePath]: {
              filePath,
              // Re-open sem edições locais pendentes -> adota o disco (07§40).
              // Com buffer Unsaved, preserva o buffer e só atualiza a baseline.
              buffer:
                existing !== undefined && existing.saveState !== 'Saved' ? existing.buffer : content,
              savedContent: content,
              hash,
              language,
              readOnly,
              saveState:
                existing !== undefined && existing.saveState !== 'Saved'
                  ? deriveSaveState(existing.buffer, content) === 'Saved'
                    ? 'Saved'
                    : 'Unsaved'
                  : 'Saved',
              saveError: null,
            },
          },
          activePath: filePath,
        };
      }),

    editBuffer: (filePath, content) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return {
          files: {
            ...s.files,
            [filePath]: {
              ...file,
              buffer: content,
              saveState: deriveSaveState(content, file.savedContent),
              saveError: null,
            },
          },
        };
      }),

    markSaving: (filePath) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return { files: { ...s.files, [filePath]: { ...file, saveState: 'Saving', saveError: null } } };
      }),

    saveSucceeded: (filePath, hash) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return {
          files: {
            ...s.files,
            [filePath]: {
              ...file,
              savedContent: file.buffer,
              hash,
              saveState: 'Saved',
              saveError: null,
            },
          },
        };
      }),

    saveFailed: (filePath, error) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        // Buffer NÃO é tocado: pending recuperável (07§37).
        return { files: { ...s.files, [filePath]: { ...file, saveState: 'SaveFailed', saveError: error } } };
      }),

    conflictDetected: (filePath, cause) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return {
          files: { ...s.files, [filePath]: { ...file, saveState: 'Conflict' } },
          conflict: {
            filePath,
            localContent: file.buffer,
            baselineContent: file.savedContent,
            externalContent: null,
            cause,
          },
        };
      }),

    conflictExternalLoaded: (content) =>
      set((s) => (s.conflict === null ? s : { conflict: { ...s.conflict, externalContent: content } })),

    closeConflict: () => set({ conflict: null }),

    adoptExternal: (filePath, content, hash) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return {
          files: {
            ...s.files,
            [filePath]: { ...file, buffer: content, savedContent: content, hash, saveState: 'Saved', saveError: null },
          },
          conflict: null,
        };
      }),

    rebaseKeepingLocal: (filePath, externalContent, hash) =>
      set((s) => {
        const file = s.files[filePath];
        if (file === undefined) return s;
        return {
          files: {
            ...s.files,
            [filePath]: {
              ...file,
              savedContent: externalContent,
              hash,
              saveState: deriveSaveState(file.buffer, externalContent),
              saveError: null,
            },
          },
          conflict: null,
        };
      }),

    closeFile: (filePath) => {
      const s = get();
      const openPaths = s.openPaths.filter((p) => p !== filePath);
      const files = { ...s.files };
      delete files[filePath];
      set({
        openPaths,
        files,
        activePath:
          s.activePath === filePath ? (openPaths[openPaths.length - 1] ?? null) : s.activePath,
        conflict: s.conflict?.filePath === filePath ? null : s.conflict,
      });
    },
  }));
}

/** Store singleton da app (um projeto ativo por vez — a página reseta). */
export const editorStore = createEditorStore();

export function useEditorStore<T>(selector: (s: EditorStore) => T): T {
  return useStore(editorStore, selector);
}

export function useActiveFile(): EditorOpenFile | null {
  return useEditorStore((s) => (s.activePath === null ? null : (s.files[s.activePath] ?? null)));
}
