/**
 * ThemesPanel — temas detectados (theme.read, 09§52) com mecanismo de
 * ativação + variáveis declaradas. theme.update faz patch SOMENTE de variáveis
 * já declaradas (update-only; 09§53 proíbe tema paralelo). Projeto sem tema ->
 * EmptyState com a explicação 09§53.
 */

import { useState } from 'react';
import { MoonStar } from 'lucide-react';

import { currentActorId } from '../../api/client';
import { useThemeUpdate, type ThemeInfo, type ThemeReadResult, type ThemeUpdateResult } from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, EmptyState, ErrorState, Field, Textarea } from '../../components/ui';
import { parseThemePatch, themeMechanismLabel } from './helpers';

function ThemeUpdateDialog({
  projectId,
  theme,
  open,
  onOpenChange,
}: {
  projectId: string;
  theme: ThemeInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useThemeUpdate();
  const [patchText, setPatchText] = useState('');
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState<ThemeUpdateResult | null>(null);

  const parsed = parseThemePatch(patchText);

  const close = (next: boolean) => {
    if (!next) {
      setPatchText('');
      setApproving(false);
      setResult(null);
      update.reset();
    }
    onOpenChange(next);
  };

  const submit = (justification?: string) => {
    update.mutate(
      {
        projectId,
        theme: theme.name,
        mechanism: theme.mechanism,
        patch: parsed.patch,
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setResult(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  const declaredOnly = Object.keys(parsed.patch).filter((v) => !theme.variables.includes(v));

  return (
    <>
      <Dialog
        open={open && !approving}
        onOpenChange={close}
        title={`Editar tema '${theme.name}'`}
        description="theme.update — patch de variáveis JÁ declaradas no tema (update-only; proibido introduzir tema paralelo, 09§53). Valores verbatim (09§10)."
        footer={
          result === null ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={() => { update.reset(); setApproving(true); }}
                disabled={Object.keys(parsed.patch).length === 0 || parsed.invalidLines.length > 0 || declaredOnly.length > 0}
              >
                Aplicar patch
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => close(false)}>Fechar</Button>
            </div>
          )
        }
      >
        {result !== null ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-sm text-foreground">
              <Badge tone="success">Verificado</Badge> {result.updatedVariables.length} variável(is) atualizada(s) no
              tema {result.theme.name}.
            </p>
            <ul className="flex flex-col gap-1.5">
              {result.updatedVariables.map((v) => (
                <li key={v.variable} className="rounded-md border border-border px-3 py-2 text-xs">
                  <p className="font-mono text-foreground">
                    {v.variable}: {v.previousValue} → {v.value}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {v.file}:{v.line} · impacto: {v.impact.usagesCount} uso(s) em {v.impact.affectedFiles.length} arquivo(s)
                  </p>
                </li>
              ))}
            </ul>
            {result.filesChanged.length > 0 ? (
              <p className="text-xs text-muted-foreground">Arquivos: {result.filesChanged.join(', ')}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-muted-foreground">
              <p>
                Variáveis declaradas ({theme.variables.length}):{' '}
                {theme.variables.length > 0 ? (
                  <span className="font-mono">{theme.variables.join(', ')}</span>
                ) : (
                  'nenhuma listada'
                )}
              </p>
            </div>
            <Field
              label="Patch (uma variável por linha: --nome: valor)"
              htmlFor="th-patch"
              description="Somente variáveis já declaradas no tema; adicionar variável nova é rejeitado (update-only)."
            >
              <Textarea
                id="th-patch"
                rows={4}
                value={patchText}
                onChange={(e) => setPatchText(e.target.value)}
                placeholder="--color-bg: #0b0f19"
                className="font-mono"
              />
            </Field>
            {parsed.invalidLines.length > 0 ? (
              <p role="alert" className="text-xs text-danger">
                Linhas inválidas: {parsed.invalidLines.join(' | ')}
              </p>
            ) : null}
            {declaredOnly.length > 0 ? (
              <p role="alert" className="text-xs text-danger">
                Variáveis não declaradas no tema (update-only): {declaredOnly.join(', ')}
              </p>
            ) : null}
            {update.isError ? <ErrorState error={update.error} operation="theme.update" /> : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Editar tema '${theme.name}'`}
        capabilityId="theme.update"
        confirmLabel="Aprovar e aplicar"
        loading={update.isPending}
        onConfirm={(j) => submit(j)}
      >
        <p className="text-sm text-foreground">
          Aplica patch em {Object.keys(parsed.patch).length} variável(is) do tema{' '}
          <span className="font-medium">{theme.name}</span> ({themeMechanismLabel(theme.mechanism)}). Cada variável é
          verificada após a escrita e o impacto real é reportado.
        </p>
      </ApprovalDialog>
    </>
  );
}

export function ThemesPanel({ projectId, themes }: { projectId: string; themes: ThemeReadResult }) {
  const [editing, setEditing] = useState<ThemeInfo | null>(null);

  if (themes.themes.length === 0) {
    return (
      <EmptyState
        icon={MoonStar}
        title="Nenhum theme system detectado"
        description="O projeto não tem tema Light/Dark/Brand/Custom detectado (confidence UNKNOWN). O Nexo NÃO introduz um tema paralelo (09§53) — peça explicitamente uma arquitetura de tema nova se for o caso."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {themes.themes.length} tema(s) detectado(s) (confidence: {themes.confidence}).
      </p>
      <ul className="flex flex-col gap-2">
        {themes.themes.map((t) => (
          <li key={`${t.name}-${t.mechanism}`} className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{t.name}</span>
              <Badge tone="primary">{t.kind}</Badge>
              <Badge tone="neutral" title="Mecanismo de ativação detectado (09§52)">
                {themeMechanismLabel(t.mechanism)}
              </Badge>
              <span className="ml-auto">
                <Button size="sm" variant="secondary" onClick={() => setEditing(t)} aria-label={`Editar tema ${t.name}`}>
                  Editar tema
                </Button>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ativação: <span className="font-mono">{t.activation}</span> · origem:{' '}
              <span className="font-mono">{t.source.file}:{t.source.line}</span> · {t.variables.length} variável(is)
            </p>
            {t.selectors.length > 0 ? (
              <p className="font-mono text-xs text-muted-foreground">Seletores: {t.selectors.join(', ')}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {editing !== null ? (
        <ThemeUpdateDialog
          projectId={projectId}
          theme={editing}
          open={editing !== null}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
