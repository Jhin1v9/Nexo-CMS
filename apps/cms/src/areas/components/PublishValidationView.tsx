/**
 * PublishValidationView — as 6 verificações 08§74 exibidas UMA A UMA com o
 * status REAL (pass/fail + detail do backend). Bloqueios mostram o
 * diagnóstico; nenhuma verificação é omitida ou marcada sem evidência.
 */

import { CheckCircle2, XCircle } from 'lucide-react';

import type { PublishValidation } from '../../api/hooks';
import { publishCheckEntries } from './helpers';

export function PublishValidationView({ validation }: { validation: PublishValidation }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Validação de publish (08§74)">
      {publishCheckEntries(validation).map(({ key, label, check }) => (
        <li key={key} className="flex items-start gap-2 text-sm">
          {check.pass ? (
            <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-success" />
          ) : (
            <XCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-danger" />
          )}
          <div>
            <span className="font-medium text-foreground">{label}</span>
            <span className="sr-only">{check.pass ? ': passou' : ': falhou'}</span>
            <p className="text-xs text-muted-foreground">{check.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
