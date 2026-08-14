/**
 * Smoke render SSR (react-dom/server renderToString, ambiente node — sem
 * jsdom instalado; ver RELATORIO). Cobre os componentes-chave do design
 * system que não dependem de providers/DOM: valida marcação semântica,
 * tokens semânticos (classes bg-/text- dos @theme), aria e estados
 * (loading/error/empty).
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardBody, CardHeader } from './Card';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DetectionConfidenceBadge, SupportBadge } from './DetectionBadges';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Field, Input } from './Field';
import { RiskBadge } from './RiskBadge';
import { Spinner } from './Spinner';

describe('smoke render SSR', () => {
  it('Button: renderiza com tokens e estado loading com aria-busy', () => {
    const html = renderToString(<Button variant="primary">Salvar</Button>);
    expect(html).toContain('<button');
    expect(html).toContain('bg-primary');
    expect(html).toContain('Salvar');

    const loading = renderToString(
      <Button loading variant="danger">
        Remover
      </Button>,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('disabled');
    expect(loading).toContain('role="status"');
  });

  it('Spinner: role=status com label acessível', () => {
    const html = renderToString(<Spinner label="Buscando histórico" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Buscando histórico');
  });

  it('Badge/RiskBadge/ConfidenceBadge: rótulos textuais sempre presentes', () => {
    expect(renderToString(<Badge tone="success">ok</Badge>)).toContain('ok');
    expect(renderToString(<RiskBadge risk="DESTRUCTIVE" />)).toContain('DESTRUCTIVE');
    expect(renderToString(<RiskBadge risk="SAFE" />)).toContain('SAFE');
    expect(renderToString(<ConfidenceBadge confidence="PARTIAL" />)).toContain('PARTIAL');
    expect(renderToString(<ConfidenceBadge confidence="UNKNOWN" />)).toContain('UNKNOWN');
  });

  it('DetectionBadges: suporte parcial/desconhecido visível (Inv. 27)', () => {
    expect(renderToString(<SupportBadge support="PARTIALLY_SUPPORTED" />)).toContain('Parcial');
    expect(renderToString(<SupportBadge support={undefined} />)).toContain('Suporte desconhecido');
    expect(renderToString(<DetectionConfidenceBadge confidence="LOW" />)).toContain('Confiança baixa');
  });

  it('Card/EmptyState: estrutura e texto honesto', () => {
    const html = renderToString(
      <Card>
        <CardHeader title="Título" description="desc" />
        <CardBody>
          <EmptyState title="Backend capability pendente" description="editor.source.open ausente" />
        </CardBody>
      </Card>,
    );
    expect(html).toContain('Backend capability pendente');
    expect(html).toContain('editor.source.open ausente');
  });

  it('ErrorState: role=alert com code, mensagem e nextAction (nunca genérico)', () => {
    const html = renderToString(
      <ErrorState
        operation="git.push"
        error={{
          code: 'REQUIRE_APPROVAL',
          message: 'Permission requires explicit approval',
          retryable: false,
          requiresApproval: true,
          operationId: 'op-1',
          details: { nextAction: 'aprovar no Control Plane' },
        }}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('REQUIRE_APPROVAL');
    expect(html).toContain('requer aprovação');
    expect(html).toContain('Próxima ação sugerida');
    expect(html).toContain('aprovar no Control Plane');
    expect(html).toContain('op-1');
  });

  it('Field+Input: label ligado por htmlFor, aria-invalid no erro', () => {
    const html = renderToString(
      <Field label="Mensagem" htmlFor="msg" required error="obrigatória">
        <Input id="msg" invalid />
      </Field>,
    );
    expect(html).toContain('for="msg"');
    expect(html).toContain('id="msg"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });
});
