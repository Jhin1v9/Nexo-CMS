/**
 * UploadAssetDialog — media.upload (08§44-45): file input -> base64 ->
 * aprovação D17 -> resultado real (storedPath, verified, sha256). Erros de
 * validação (MIME por magic bytes, tamanho, SVG ativo) chegam do backend com
 * nextAction e são exibidos via ErrorState. Progresso NUNCA é simulado: os
 * únicos estados mostrados são "lendo arquivo" e "enviando" (reais).
 */

import { useId, useState } from 'react';

import { currentActorId } from '../../api/client';
import { useMediaUpload, type MediaUploadOutcome } from '../../api/hooks';
import { ApprovalDialog, Badge, Button, Dialog, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { fileToBase64, formatBytes } from './helpers';

/** Limite default do service (DEFAULT_MAX_UPLOAD_BYTES, 08§45 — declarado no contrato). */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface UploadAssetDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadAssetDialog({ projectId, open, onOpenChange }: UploadAssetDialogProps) {
  const upload = useMediaUpload();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [reading, setReading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [outcome, setOutcome] = useState<MediaUploadOutcome | null>(null);

  const reset = () => {
    setFile(null);
    setAltText('');
    setCaption('');
    setTargetPath('');
    setReading(false);
    setLocalError(null);
    setApproving(false);
    setOutcome(null);
    upload.reset();
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async (justification?: string) => {
    if (file === null) return;
    const prepared = fileToBase64(file, MAX_UPLOAD_BYTES);
    if ('error' in prepared) {
      setLocalError(prepared.error);
      setApproving(false);
      return;
    }
    setReading(true);
    setLocalError(null);
    try {
      const contentBase64 = await prepared.read();
      setReading(false);
      upload.mutate(
        {
          projectId,
          fileName: file.name,
          contentBase64,
          ...(targetPath.trim().length > 0 ? { targetPath: targetPath.trim() } : {}),
          ...(altText.trim().length > 0 ? { altText: altText.trim() } : {}),
          ...(caption.trim().length > 0 ? { caption: caption.trim() } : {}),
          approval: { approver: currentActorId(), ...(justification ? { justification } : {}) },
        },
        {
          onSuccess: (data) => {
            setApproving(false);
            setOutcome(data);
          },
          onError: () => setApproving(false),
        },
      );
    } catch (cause) {
      setReading(false);
      setApproving(false);
      setLocalError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <>
      <Dialog
        open={open && !approving}
        onOpenChange={close}
        title="Upload de asset"
        description={`media.upload — validação real no backend (MIME por magic bytes, tamanho ≤ ${formatBytes(MAX_UPLOAD_BYTES)}, SVG seguro; 08§45) + verificação pós-escrita (08§44).`}
        footer={
          outcome === null ? (
            <div className="flex items-center justify-between">
              <div aria-live="polite" className="text-xs text-muted-foreground">
                {reading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner label="Lendo arquivo local" /> Lendo arquivo…
                  </span>
                ) : upload.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner label="Enviando ao Control Plane" /> Enviando e validando no backend…
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
                <Button
                  variant="primary"
                  onClick={() => { upload.reset(); setLocalError(null); setApproving(true); }}
                  disabled={file === null}
                >
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => close(false)}>Fechar</Button>
            </div>
          )
        }
      >
        {outcome !== null ? (
          <div className="flex flex-col gap-2" role="status">
            <p className="text-sm text-foreground">
              <Badge tone={outcome.verified ? 'success' : 'warning'}>
                {outcome.verified ? 'Upload verificado' : 'Upload sem verificação'}
              </Badge>{' '}
              {outcome.asset.metadata.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Gravado em <span className="font-mono">{outcome.storedPath}</span> · MIME real:{' '}
              <span className="font-mono">{outcome.asset.metadata.mime}</span> · sha256{' '}
              <span className="font-mono">{outcome.sha256.slice(0, 12)}…</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Arquivo" htmlFor={fileInputId} required description={`Limite: ${formatBytes(MAX_UPLOAD_BYTES)} (validado por magic bytes no backend).`}>
              <input
                id={fileInputId}
                type="file"
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {file !== null ? (
              <p className="text-xs text-muted-foreground">
                {file.name} — {formatBytes(file.size)}
              </p>
            ) : null}
            <Field label="Texto alternativo (alt)" htmlFor="up-alt" description="Acessibilidade importa (08§83): descreva a imagem para leitores de tela.">
              <Input id="up-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
            </Field>
            <Field label="Legenda (caption)" htmlFor="up-caption">
              <Input id="up-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            <Field label="Destino (opcional)" htmlFor="up-target" description="Path relativo ao Project Root; ausente -> destino resolvido pela Project Intelligence (08§53).">
              <Input id="up-target" value={targetPath} onChange={(e) => setTargetPath(e.target.value)} placeholder="src/assets" />
            </Field>
            {localError !== null ? (
              <p role="alert" className="text-xs text-danger">{localError}</p>
            ) : null}
            {upload.isError ? <ErrorState error={upload.error} operation="media.upload" /> : null}
          </div>
        )}
      </Dialog>

      <ApprovalDialog
        open={approving}
        onOpenChange={(o) => setApproving(o)}
        title={`Upload de '${file?.name ?? ''}'`}
        capabilityId="media.upload"
        confirmLabel="Aprovar e enviar"
        loading={upload.isPending || reading}
        onConfirm={(j) => void submit(j)}
      >
        <p className="text-sm text-foreground">
          Envia <span className="font-medium">{file?.name}</span> ({file !== null ? formatBytes(file.size) : '—'}) para
          o Project Root. O backend valida MIME real, tamanho e SVG seguro antes de gravar (08§45).
        </p>
      </ApprovalDialog>
    </>
  );
}
