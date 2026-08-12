/**
 * operationId correla Audits/erros (SPEC.md §0). UUID v4 via Web Crypto (Node >= 19).
 */

export function newOperationId(): string {
  return globalThis.crypto.randomUUID();
}
