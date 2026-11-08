/**
 * RFC 4122 v4 UUID generator (using crypto.randomUUID if available, with robust fallback)
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * IdempotencyManager ensures that:
 * 1. A fresh UUID is generated for new financial operations.
 * 2. If a request fails (e.g. network/server 5xx/409) and the user retries with the exact same payload,
 *    the SAME idempotency UUID is preserved.
 * 3. If the payload changes, a NEW UUID is generated.
 * 4. After success, the key is renewed for future actions.
 */
export class IdempotencyTracker {
  private currentKey: string = generateUUID();
  private lastPayloadString: string | null = null;

  public getKey(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    if (this.lastPayloadString !== null && this.lastPayloadString === serialized) {
      return this.currentKey;
    }
    // Payload changed or first submission
    this.currentKey = generateUUID();
    this.lastPayloadString = serialized;
    return this.currentKey;
  }

  public reset(): void {
    this.currentKey = generateUUID();
    this.lastPayloadString = null;
  }
}
