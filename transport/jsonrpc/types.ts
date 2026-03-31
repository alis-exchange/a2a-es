/**
 * JSON-RPC 2.0 type definitions and client configuration.
 *
 * This module defines the core types used by the A2A JSON-RPC client for:
 * - Request/response serialization over HTTP
 * - Error handling (protocol vs transport errors)
 * - Client configuration (base URL, auth)
 */

/**
 * Standard JSON-RPC 2.0 error object (spec-compliant).
 *
 * Server errors include both standard JSON-RPC codes and A2A-specific
 * application codes (e.g. -32001 for TaskNotFound).
 */
export interface JsonRpcError {
  /**
   * Integer error code.
   *
   * Standard JSON-RPC 2.0 codes:
   *  - -32700: Parse error
   *  - -32600: Invalid request
   *  - -32601: Method not found
   *  - -32602: Invalid params
   *  - -32603: Internal error
   *
   * A2A-specific application codes:
   *  - -32001: Task not found
   *  - -32002: Task not cancelable
   *  - -32003: Push notification not supported
   *  - -32004: Unsupported operation
   *  - -32005: Content type not supported
   *  - -32006: Invalid agent response
   *  - -32007: Extended card not configured
   *  - -31401: Unauthenticated
   *  - -31403: Unauthorized
   */
  code: number;
  /** Human-readable error message. */
  message: string;
  /** Optional additional error data. */
  data?: unknown;
}

/**
 * Outbound JSON-RPC 2.0 request envelope.
 *
 * Sent as the body of each POST request to the A2A server.
 */
export interface JsonRpcRequest<P = unknown> {
  /** Must be "2.0" per JSON-RPC specification. */
  jsonrpc: "2.0";
  /** The RPC method name (e.g. "SendMessage", "GetTask"). */
  method: string;
  /** Optional parameters object. */
  params?: P;
  /** Request ID for correlating responses. */
  id: string | number;
}

/**
 * Inbound JSON-RPC 2.0 response envelope.
 *
 * Exactly one of `result` or `error` is set.
 * Used for both unary responses (single JSON body) and streaming responses
 * (each SSE data frame is a JsonRpcResponse).
 */
export type JsonRpcResponse<R = unknown> =
  | { jsonrpc: "2.0"; id: string | number; result: R; error?: never }
  | {
      jsonrpc: "2.0";
      id: string | number;
      error: JsonRpcError;
      result?: never;
    };

/**
 * Configuration for the A2A JSON-RPC client.
 */
export interface A2AClientConfig {
  /** Base URL of the A2A agent server, e.g. `https://a2a-agent.example.com/jsonrpc`. */
  baseUrl: string;
  /**
   * Optional bearer token provider.
   * Only needed when not going through an auth gateway.
   * May be async to support token refresh.
   */
  getToken?: () => string | Promise<string>;
  /**
   * Optional call options.
   * These are applied to every call to the A2A agent server.
   * They can be overridden on a per-call basis by passing the options to the client method.
   */
  callOptions?: CallOptions;
}

/**
 * Per-call options that control HTTP headers sent with each JSON-RPC request.
 *
 * When set on {@link A2AClientConfig.callOptions}, these apply to **every** request
 * as defaults. Each public client method also accepts `CallOptions`; when provided,
 * the per-call value for each field **replaces** the default for that request:
 *
 * - **`extensionUris`**: if provided on the call, the default list is ignored and
 *   only the per-call list is sent. Pass `[]` to suppress extensions for one request.
 * - **`extraHeaders`**: if provided on the call, the default map is ignored and
 *   only the per-call map is applied. Pass `null` to suppress all extra headers;
 *   pass `{}` to send no extra headers.
 *
 * Fields left `undefined` on the per-call options fall through to the default.
 */
export interface CallOptions {
  /**
   * A2A extension URIs sent as `A2A-Extensions` HTTP headers.
   * Each URI is appended as a separate header value.
   */
  extensionUris?: string[];
  /**
   * Extra headers merged after `Content-Type` and `Authorization`.
   * Set to `null` to explicitly suppress all extra headers for one request.
   */
  extraHeaders?: Record<string, string> | null;
}
