/**
 * A2A JSON-RPC transport: unary POST/JSON and SSE streaming for the Agent-to-Agent (A2A) API.
 *
 * - **Client**: {@link A2AClient} — all RPC methods, shared `post()` + error handling.
 * - **Wire types**: Re-exported from `./wire` — use these for `params` / `result` shapes (not Connect/protobuf messages).
 * - **Errors**: {@link JsonRpcTransportError} (HTTP/network/stream) vs {@link JsonRpcProtocolError} (JSON-RPC `error` field).
 *
 * @packageDocumentation
 */

export { A2AClient } from "./client";
export {
  createProtocolError,
  JsonRpcProtocolError,
  JsonRpcTransportError,
  TaskNotFoundError,
  TaskNotCancelableError,
  PushNotificationNotSupportedError,
  UnsupportedOperationError,
  ContentTypeNotSupportedError,
  InvalidAgentResponseError,
  ExtendedCardNotConfiguredError,
  UnauthenticatedError,
  UnauthorizedError,
} from "./errors";
export type {
  A2AClientConfig,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types";
export type * from "./wire";