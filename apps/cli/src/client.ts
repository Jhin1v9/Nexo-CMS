/**
 * HTTP client do Agent API (SPEC.md §10): fetch nativo (Node >=20), sem deps.
 * NEXO_URL default http://127.0.0.1:47820. Erros estruturados do runtime são
 * propagados como estão; falha de transporte vira erro estruturado local
 * (retryable: true — o runtime pode simplesmente não estar no ar).
 */

export const DEFAULT_NEXO_URL = 'http://127.0.0.1:47820';

/**
 * Ator M1 enviado SEMPRE explicitamente no header `x-nexo-actor` (Wave 5
 * FIX 2): o runtime NÃO assume mais `cli:local` quando o header está ausente
 * (fail-closed -> anonymous:unknown, DEFAULT DENY). Override via env
 * NEXO_ACTOR (ex.: para testar DEFAULT DENY com outro ator).
 */
export const DEFAULT_NEXO_ACTOR = 'cli:local';

function actorHeader(): string {
  const fromEnv = process.env['NEXO_ACTOR'];
  return fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_NEXO_ACTOR;
}

export interface ApiError {
  code: string;
  message: string;
  retryable?: boolean;
  requiresApproval?: boolean;
  /** Ação seguinte sugerida pelo Control Plane (NexoError estável, M3-CONTRACTS §3). */
  nextAction?: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

export interface NexoClient {
  capabilities(): Promise<ApiResult<{ capabilities: unknown[] }>>;
  invoke<T = unknown>(id: string, input: unknown): Promise<ApiResult<T>>;
}

export function createNexoClient(baseUrl: string = process.env['NEXO_URL'] ?? DEFAULT_NEXO_URL): NexoClient {
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-nexo-actor': actorHeader() },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: `não foi possível conectar ao runtime em ${base} (ele está no ar? \`nexo-runtime\`)`,
          retryable: true,
          details: { cause: cause instanceof Error ? cause.message : String(cause) },
        },
      };
    }
    try {
      return (await res.json()) as ApiResult<T>;
    } catch {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: `resposta não-JSON do runtime (HTTP ${res.status})`,
          retryable: true,
        },
      };
    }
  }

  return {
    capabilities: () => request('GET', '/v1/capabilities'),
    invoke: <T>(id: string, input: unknown) => request<T>('POST', `/v1/capabilities/${id}/invoke`, input),
  };
}
