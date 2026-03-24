/**
 * A2A JSON-RPC transport: unary POST/JSON and SSE streaming for the Agent-to-Agent (A2A) API.
 *
 * - **Client**: {@link A2AClient} — protobuf-shaped `params` / results from `lf/a2a/v1/a2a_pb`; converts to wire JSON internally.
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
