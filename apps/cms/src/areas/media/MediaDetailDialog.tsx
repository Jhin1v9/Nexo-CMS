/**
 * MediaDetailDialog — media.read (08§82): metadata completa (dimensions,
 * altText, caption, references), preview de imagem via includeContent
 * (data URL — base64 NUNCA despejado como texto), update de metadata
 * (a11y, 08§83), replace (referências reescritas, 08§48) e delete com
 * inspeção de referências (08§51 — Unknown bloqueia com explicação).
 */

import { useState } from 'react';
import { FileText, Pencil, Replace, Trash2 } from 'lucide-react';

import { currentActorId } from '../../api/client';
import {
  useMediaAsset,
  useMediaDelete,
  useMediaReplace,
  useMediaUpdate,
  type AssetIdentity,
  type MediaDeleteOutcome,
  type MediaReplaceOutcome,
} from '../../api/hooks';
import {
  ApprovalDialog,
  Badge,
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  Spinner,
  Tabs,
} from '../../components/ui';
import { formatBytes, isPreviewable, originLabel, previewDataUrl, referenceConfidenceTone, sourceLocationLabel } from './helpers';
import { UsageBadge } from './MediaGrid';
import { fileToBase64 } from './helpers';

function ReferencesList({ asset }: { asset: AssetIdentity }) {
  if (asset.references.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma referência conhecida.</p>;
  }
  return (
    <ul className="flex max-h-48 flex-col gap-1 overflow-auto">
      {asset.references.map((r, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <Badge tone={referenceConfidenceTone(r.confidence)} title="Confidence do match de referência (08§49)">
            {r.confidence}
          </Badge>
          <span className="font-mono text-muted-foreground">
            {r.filePath}:{r.line} <Badge tone="neutral">{r.kind}</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}

function MetadataTab({ projectId, asset }: { projectId: string; asset: AssetIdentity }) {
  const preview = useMediaAsset(projectId, isPreviewable(asset) ? asset.id : null, true);
  const dataUrl = previewDataUrl(asset.metadata.mime, preview.data?.contentBase64);
  const m = asset.metadata;
  return (
    <div className="flex flex-col gap-3">
      {isPreviewable(asset) ? (
        preview.isLoading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner label="Carregando preview" /> Carregando preview…
          </p>
        ) : preview.isError ? (
          <ErrorState error={preview.error} operation="media.read (includeContent)" />
        ) : dataUrl !== undefined ? (
          <img
            src={dataUrl}
            alt={m.altText ?? `Preview de ${m.name}`}
            className="max-h-56 w-auto self-start rounded-md border border-border object-contain"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Preview indisponível (conteúdo binário não retornado para este asset — somente assets locais, 08§57).
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">Preview visual não aplicável ao tipo {asset.type}.</p>
      )}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        <div><dt className="font-medium text-foreground">Nome</dt><dd className="text-muted-foreground">{m.name}</dd></div>
        <div><dt className="font-medium text-foreground">Tipo / MIME real</dt><dd className="font-mono text-muted-foreground">{m.type} · {m.mime}</dd></div>
        <div><dt className="font-medium text-foreground">Tamanho</dt><dd className="text-muted-foreground">{formatBytes(m.size)}</dd></div>
        <div>
          <dt className="font-medium text-foreground">Dimensões</dt>
          <dd className="text-muted-foreground">
            {asset.dimensions !== undefined ? `${asset.dimensions.width}×${asset.dimensions.height} px` : '—'}
          </dd>
        </div>
        <div><dt className="font-medium text-foreground">Origem</dt><dd className="text-muted-foreground">{originLabel(asset.source.origin)}</dd></div>
        <div><dt className="font-medium text-foreground">Localização</dt><dd className="font-mono text-muted-foreground">{sourceLocationLabel(asset.source)}</dd></div>
        <div>
          <dt className="font-medium text-foreground">Alt text</dt>
          <dd className="text-muted-foreground">{m.altText ?? '— (ausente: prejudica a11y, 08§83)'}</dd>
        </div>
        <div><dt className="font-medium text-foreground">Caption</dt><dd className="text-muted-foreground">{m.caption ?? '—'}</dd></div>
        <div><dt className="font-medium text-foreground">Escopo</dt><dd><Badge tone="neutral">{asset.scope}</Badge></dd></div>
        <div><dt className="font-medium text-foreground">Uso</dt><dd><UsageBadge asset={asset} /></dd></div>
        <div><dt className="font-medium text-foreground">Criado em</dt><dd className="text-muted-foreground">{m.createdAt}</dd></div>
        <div><dt className="font-medium text-foreground">Atualizado em</dt><dd className="text-muted-foreground">{m.updatedAt}</dd></div>
      </dl>
      <section aria-label="Referências">
        <h4 className="mb-1 text-xs font-medium text-foreground">Referências ({asset.references.length})</h4>
        <ReferencesList asset={asset} />
      </section>
    </div>
  );
}

function EditMetadataTab({ projectId, asset }: { projectId: string; asset: AssetIdentity }) {
  const update = useMediaUpdate();
  const [name, setName] = useState(asset.metadata.name);
  const [altText, setAltText] = useState(asset.metadata.altText ?? '');
  const [caption, setCaption] = useState(asset.metadata.caption ?? '');
  const [approving, setApproving] = useState(false);
  const [done, setDone] = useState<AssetIdentity | null>(null);

  const submit = (justification?: string) => {
    update.mutate(
      {
        projectId,
        assetId: asset.id,
        patch: {
          ...(name.trim().length > 0 && name !== asset.metadata.name ? { name: name.trim() } : {}),
          altText: altText.trim(),
          caption: caption.trim(),
        },
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setDone(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  if (done !== null) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="text-sm text-foreground">
          <Badge tone="success">Metadata atualizada</Badge> {done.metadata.name}
        </p>
        <p className="text-xs text-muted-foreground">Alt text: {done.metadata.altText ?? '—'} · Caption: {done.metadata.caption ?? '—'}</p>
        <div>
          <Button variant="secondary" onClick={() => setDone(null)}>Editar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        name é o nome de EXIBIÇÃO (renomear o arquivo em disco é operação de replace, não de metadata — 08§82).
      </p>
      <Field label="Nome de exibição" htmlFor="md-name">
        <Input id="md-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Texto alternativo (alt)" htmlFor="md-alt" description="Importante para acessibilidade (08§83).">
        <Input id="md-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
      </Field>
      <Field label="Legenda (caption)" htmlFor="md-caption">
        <Input id="md-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </Field>
      {update.isError ? <ErrorState error={update.error} operation="media.update" /> : null}
      <div>
        <Button variant="primary" onClick={() => { update.reset(); setApproving(true); }}>
          <Pencil aria-hidden="true" size={14} /> Salvar metadata
        </Button>
      </div>
      <ApprovalDialog
        open={approving}
        onOpenChange={setApproving}
        title={`Atualizar metadata de '${asset.metadata.name}'`}
        capabilityId="media.update"
        confirmLabel="Aprovar e salvar"
        loading={update.isPending}
        onConfirm={(j) => submit(j)}
      >
        <p className="text-sm text-foreground">Atualiza name/altText/caption com verificação do registry (08§82).</p>
      </ApprovalDialog>
    </div>
  );
}

function ReplaceTab({ projectId, asset }: { projectId: string; asset: AssetIdentity }) {
  const replace = useMediaReplace();
  const [file, setFile] = useState<File | null>(null);
  const [approving, setApproving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState<MediaReplaceOutcome | null>(null);

  const submit = async (justification?: string) => {
    if (file === null) return;
    const prepared = fileToBase64(file, 25 * 1024 * 1024);
    if ('error' in prepared) {
      setLocalError(prepared.error);
      setApproving(false);
      return;
    }
    try {
      const contentBase64 = await prepared.read();
      replace.mutate(
        {
          projectId,
          assetId: asset.id,
          fileName: file.name,
          contentBase64,
          approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
        },
        {
          onSuccess: (data) => {
            setApproving(false);
            setDone(data);
          },
          onError: () => setApproving(false),
        },
      );
    } catch (cause) {
      setApproving(false);
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  if (done !== null) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="text-sm text-foreground">
          <Badge tone={done.verified ? 'success' : 'warning'}>{done.verified ? 'Replace verificado' : 'Replace sem verificação'}</Badge>{' '}
          <span className="font-mono">{done.previousPath}</span> → <span className="font-mono">{done.newPath}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Referências reescritas em {done.filesChanged.length} arquivo(s):{' '}
          {done.filesChanged.map((f) => `${f.filePath} (${f.replacements})`).join(', ') || 'nenhuma'}.
        </p>
        {done.ambiguousReferences.length > 0 ? (
          <div role="alert" className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {done.ambiguousReferences.length} referência(s) PARTIAL (basename) reportadas — NUNCA reescritas
              automaticamente:
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {done.ambiguousReferences.map((r, i) => (
                <li key={i} className="font-mono text-xs text-muted-foreground">{r.filePath}:{r.line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <Button variant="secondary" onClick={() => setDone(null)}>Substituir outro arquivo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        media.replace (08§48): resolve → encontra referências → valida → reescreve referências HIGH_CONFIDENCE →
        persiste → re-analisa → verifica. Referências PARTIAL são reportadas, nunca reescritas.
      </p>
      <Field label="Novo arquivo" htmlFor="rp-file" required>
        <input
          id="rp-file"
          type="file"
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      {localError !== null ? <p role="alert" className="text-xs text-danger">{localError}</p> : null}
      {replace.isError ? <ErrorState error={replace.error} operation="media.replace" /> : null}
      <div>
        <Button variant="primary" onClick={() => { replace.reset(); setLocalError(null); setApproving(true); }} disabled={file === null}>
          <Replace aria-hidden="true" size={14} /> Substituir conteúdo
        </Button>
      </div>
      <ApprovalDialog
        open={approving}
        onOpenChange={setApproving}
        title={`Replace de '${asset.metadata.name}'`}
        capabilityId="media.replace"
        confirmLabel="Aprovar e substituir"
        loading={replace.isPending}
        onConfirm={(j) => void submit(j)}
      >
        <p className="text-sm text-foreground">
          Substitui o conteúdo de <span className="font-medium">{asset.metadata.name}</span> e reescreve as
          referências conhecidas ({asset.references.length}) nos arquivos do projeto.
        </p>
      </ApprovalDialog>
    </div>
  );
}

function DeleteTab({ projectId, asset, onDeleted }: { projectId: string; asset: AssetIdentity; onDeleted: () => void }) {
  const del = useMediaDelete();
  const [approving, setApproving] = useState(false);
  const [confirmingRefs, setConfirmingRefs] = useState(false);
  const [done, setDone] = useState<MediaDeleteOutcome | null>(null);

  const run = (confirm: boolean, justification?: string) => {
    del.mutate(
      {
        projectId,
        assetId: asset.id,
        ...(confirm ? { confirm: true } : {}),
        approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
      },
      {
        onSuccess: (data) => {
          setApproving(false);
          setConfirmingRefs(false);
          setDone(data);
        },
        onError: () => setApproving(false),
      },
    );
  };

  if (done !== null) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="text-sm text-foreground">
          <Badge tone={done.verified ? 'success' : 'warning'}>{done.verified ? 'Deletado e verificado' : 'Deletado (verificação pendente)'}</Badge>
        </p>
        <p className="text-xs text-muted-foreground">
          Arquivo local removido: {done.deletedLocalFile ? 'sim' : 'não (asset remoto — 08§55)'} · Registry:{' '}
          {done.removedFromRegistry ? 'removido' : 'inalterado'}.
        </p>
        {done.brokenReferences.length > 0 ? (
          <div role="alert">
            <p className="text-xs font-medium text-danger">Referências quebradas ({done.brokenReferences.length})</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {done.brokenReferences.map((r, i) => (
                <li key={i} className="font-mono text-xs text-danger">{r.filePath}:{r.line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <Button variant="primary" onClick={onDeleted}>Fechar</Button>
        </div>
      </div>
    );
  }

  const usageBlocked = asset.usage.state === 'Unknown';
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        media.delete (08§51): com referências conhecidas o backend bloqueia e exige confirmação explícita; uso
        desconhecido nunca é tratado como "não usado".
      </p>
      {usageBlocked ? (
        <div role="alert" className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Uso desconhecido (08§50)</p>
          <p className="text-xs text-muted-foreground">
            O scan de referências é incompleto para este asset. O backend pode bloquear o delete; referências
            conhecidas ({asset.references.length}) estão listadas na aba Detalhes.
          </p>
        </div>
      ) : null}
      <section aria-label="Referências conhecidas">
        <h4 className="mb-1 text-xs font-medium text-foreground">Referências conhecidas ({asset.references.length})</h4>
        <ReferencesList asset={asset} />
      </section>
      {del.isError ? <ErrorState error={del.error} operation="media.delete" /> : null}
      <div>
        <Button variant="danger" onClick={() => { del.reset(); setApproving(true); }}>
          <Trash2 aria-hidden="true" size={14} /> Deletar asset
        </Button>
      </div>
      <ApprovalDialog
        open={approving}
        onOpenChange={setApproving}
        title={`Delete de '${asset.metadata.name}'`}
        capabilityId="media.delete"
        confirmLabel="Aprovar e deletar"
        loading={del.isPending}
        onConfirm={(j) => run(false, j)}
      >
        <p className="text-sm text-foreground">
          Solicita o delete. Com referências ativas o backend bloqueia e pede confirmação explícita (08§51); assets
          remotos nunca são deletados como arquivo local (08§55).
        </p>
      </ApprovalDialog>
      <ApprovalDialog
        open={confirmingRefs}
        onOpenChange={setConfirmingRefs}
        title="Confirmar delete com referências conhecidas"
        capabilityId="media.delete"
        confirmLabel="Confirmar delete (referências quebrarão)"
        loading={del.isPending}
        onConfirm={(j) => run(true, j)}
      >
        <p className="text-sm text-foreground">
          Há {asset.references.length} referência(s) conhecida(s) a este asset. Confirmar quebrará essas referências
          (reportadas no resultado).
        </p>
        <ReferencesList asset={asset} />
      </ApprovalDialog>
    </div>
  );
}

export interface MediaDetailDialogProps {
  projectId: string;
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaDetailDialog({ projectId, assetId, open, onOpenChange }: MediaDetailDialogProps) {
  const detail = useMediaAsset(projectId, open ? assetId : null);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={detail.data !== undefined ? detail.data.asset.metadata.name : 'Asset'}
      description="media.read — metadata completa (08§82, sem secrets)."
      className="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      }
    >
      {detail.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner label="Lendo asset" /> Lendo asset…
        </p>
      ) : detail.isError ? (
        <ErrorState error={detail.error} operation="media.read" />
      ) : detail.data !== undefined ? (
        <Tabs
          ariaLabel="Detalhe do asset"
          items={[
            {
              value: 'details',
              label: 'Detalhes',
              icon: FileText,
              panel: <MetadataTab projectId={projectId} asset={detail.data.asset} />,
            },
            {
              value: 'metadata',
              label: 'Metadata',
              icon: Pencil,
              panel: <EditMetadataTab projectId={projectId} asset={detail.data.asset} />,
            },
            {
              value: 'replace',
              label: 'Replace',
              icon: Replace,
              panel: <ReplaceTab projectId={projectId} asset={detail.data.asset} />,
            },
            {
              value: 'delete',
              label: 'Delete',
              icon: Trash2,
              panel: <DeleteTab projectId={projectId} asset={detail.data.asset} onDeleted={() => onOpenChange(false)} />,
            },
          ]}
        />
      ) : null}
    </Dialog>
  );
}
