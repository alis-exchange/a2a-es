import type { JsonRpcError } from "./types";

/**
 * Base error for JSON-RPC protocol-level failures.
 *
 * Thrown when the server returns a JSON-RPC error object (`error` field)
 * instead of a successful result. Use `instanceof` checks or the
 * `code` property to distinguish specific error types.
 */
export class JsonRpcProtocolError extends Error {
  /** The JSON-RPC error code (e.g. -32001, -31401). */
  public readonly code: number;
  /** Optional additional data from the server. */
  public readonly data: unknown;

  /**
   * @param error - JSON-RPC error object from the server response
   */
  constructor(error: JsonRpcError) {
    super(error.message);
    this.name = "JsonRpcProtocolError";
    this.code = error.code;
    this.data = error.data;
  }
}

/**
 * Error for network or HTTP transport failures.
 *
 * Thrown when:
 * - The fetch fails (network unreachable, DNS, etc.)
 * - The HTTP response is not 2xx
 * - The response body cannot be read (e.g. stream error)
 */
export class JsonRpcTransportError extends Error {
  /** HTTP status code, if the failure was due to a non-2xx response. */
  public readonly status?: number;

  /**
   * @param message - Human-readable failure reason
   * @param status - HTTP status when failure was a non-2xx response
   */
  constructor(message: string, status?: number) {
    super(message);
    this.name = "JsonRpcTransportError";
    this.status = status;
  }
}

/** Task not found (code -32001). */
export class TaskNotFoundError extends JsonRpcProtocolError {}

/** Task is not in a cancelable state (code -32002). */
export class TaskNotCancelableError extends JsonRpcProtocolError {}

/** Server does not support push notifications (code -32003). */
export class PushNotificationNotSupportedError extends JsonRpcProtocolError {}

/** Operation is not supported (code -32004). */
export class UnsupportedOperationError extends JsonRpcProtocolError {}

/** Content type not supported (code -32005). */
export class ContentTypeNotSupportedError extends JsonRpcProtocolError {}

/** Invalid agent response (code -32006). */
export class InvalidAgentResponseError extends JsonRpcProtocolError {}

/** Extended card not configured (code -32007). */
export class ExtendedCardNotConfiguredError extends JsonRpcProtocolError {}

/** Unauthenticated (code -31401). */
export class UnauthenticatedError extends JsonRpcProtocolError {}

/** Unauthorized (code -31403). */
export class UnauthorizedError extends JsonRpcProtocolError {}

/**
 * Maps A2A-specific error codes to typed error classes.
 * Unknown codes fall back to JsonRpcProtocolError.
 */
const errorClassMap: Record<
  number,
  new (e: JsonRpcError) => JsonRpcProtocolError
> = {
  [-32001]: TaskNotFoundError,
  [-32002]: TaskNotCancelableError,
  [-32003]: PushNotificationNotSupportedError,
  [-32004]: UnsupportedOperationError,
  [-32005]: ContentTypeNotSupportedError,
  [-32006]: InvalidAgentResponseError,
  [-32007]: ExtendedCardNotConfiguredError,
  [-31401]: UnauthenticatedError,
  [-31403]: UnauthorizedError,
};

/**
 * Creates a protocol error instance from a JSON-RPC error object.
 *
 * Returns a typed subclass (e.g. TaskNotFoundError) when the error code
 * is known; otherwise returns a generic JsonRpcProtocolError.
 *
 * @param error - The JSON-RPC error object from the server
 * @returns A JsonRpcProtocolError or one of its subclasses
 */
export function createProtocolError(error: JsonRpcError): JsonRpcProtocolError {
  const cls = errorClassMap[error.code];
  return cls ? new cls(error) : new JsonRpcProtocolError(error);
}