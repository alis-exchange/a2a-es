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
   * Optional A2A extension activation (comma-separated URIs per A2A spec).
   * Sent as the `A2A-Extensions` HTTP header on every JSON-RPC request.
   */
  extensionUris?: string[];
  /** Optional extra headers merged after Content-Type / Authorization. */
  extraHeaders?: Record<string, string>;
}