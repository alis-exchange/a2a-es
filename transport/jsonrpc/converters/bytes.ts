/**
 * Base64 helpers shared by wire `Part.raw` conversion.
 *
 * Prefers Node `Buffer` when available; otherwise uses `atob`/`btoa` so the same code runs in browsers.
 */

/**
 * Node's `Buffer` when present (no `@types/node` required). Browser builds omit this.
 */
type GlobalBuffer = {
  from(data: string, encoding: "base64"): Uint8Array;
  from(data: Uint8Array): { toString(encoding: "base64"): string };
};

const bufferCtor = (globalThis as typeof globalThis & { Buffer?: GlobalBuffer }).Buffer;

/**
 * Decodes a standard base64 string to bytes.
 *
 * @param b64 - Base64 payload (no data-URL prefix)
 * @returns Decoded bytes
 */
export function base64ToBytes(b64: string): Uint8Array {
  if (bufferCtor) {
    return new Uint8Array(bufferCtor.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Encodes bytes as a standard base64 string.
 *
 * @param bytes - Raw bytes (e.g. protobuf `bytes` field)
 * @returns Base64 string suitable for wire `Part.raw`
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
