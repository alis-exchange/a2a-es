import { create, type MessageInitShape } from "@bufbuild/protobuf";
import {
  GetExtendedAgentCardRequestSchema,
  ListTasksRequestSchema,
  type AgentCard,
  type CancelTaskRequest,
  type DeleteTaskPushNotificationConfigRequest,
  type GetTaskPushNotificationConfigRequest,
  type GetTaskRequest,
  type ListTaskPushNotificationConfigsRequest,
  type ListTaskPushNotificationConfigsResponse,
  type ListTasksResponse,
  type SendMessageRequest,
  type SendMessageResponse,
  type StreamResponse,
  type SubscribeToTaskRequest,
  type Task,
  type TaskPushNotificationConfig,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import {
  type A2AClientConfig,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./types";
import type {
  AgentCard as WireAgentCard,
  ListTaskPushConfigResponse,
  ListTasksResponse as WireListTasksResponse,
  StreamResponse as WireStreamResponse,
  Task as WireTask,
  TaskPushConfig as WireTaskPushConfig,
} from "./wire";
import { wireAgentCardToProto } from "./converters/agent-card";
import {
  protoCancelTaskRequestToWire,
  protoDeleteTaskPushNotificationConfigRequestToWire,
  protoGetExtendedAgentCardRequestToWire,
  protoGetTaskPushNotificationConfigRequestToWire,
  protoGetTaskRequestToWire,
  protoListTaskPushNotificationConfigsRequestToWire,
  protoListTasksRequestToWire,
  protoSendMessageRequestToWire,
  protoSubscribeToTaskRequestToWire,
  protoTaskPushNotificationConfigToCreateWire,
} from "./converters/requests";
import {
  wireListTaskPushNotificationConfigsResponseToProto,
  wireListTasksResponseToProto,
} from "./converters/responses";
import {
  wireSendMessageResponseToProto,
  wireStreamResponseToProto,
} from "./converters/stream-response";
import { wireTaskPushConfigToProto } from "./converters/push-config";
import { wireTaskToProto } from "./converters/task";
import { createProtocolError, JsonRpcTransportError } from "./errors";
import { readSseStream } from "./sse";

/**
 * JSON-RPC method identifiers.
 * Must match the server-side method names exactly.
 */
const Methods = {
  sendMessage: "SendMessage",
  sendStreamingMessage: "SendStreamingMessage",
  getTask: "GetTask",
  listTasks: "ListTasks",
  cancelTask: "CancelTask",
  subscribeToTask: "SubscribeToTask",
  getTaskPushNotificationConfig: "GetTaskPushNotificationConfig",
  createTaskPushNotificationConfig: "CreateTaskPushNotificationConfig",
  listTaskPushNotificationConfigs: "ListTaskPushNotificationConfigs",
  deleteTaskPushNotificationConfig: "DeleteTaskPushNotificationConfig",
  getExtendedAgentCard: "GetExtendedAgentCard",
} as const;

const JSONRPC_VERSION = "2.0";

/**
 * Client for the A2A (Agent-to-Agent) API over JSON-RPC 2.0.
 *
 * Public method parameters and results use **protobuf message types** from
 * `lf/a2a/v1/a2a_pb`. The client converts to/from the JSON-RPC **wire** shapes
 * in `transport/jsonrpc/wire` before `JSON.stringify` / after `response.json()`.
 *
 * ## Architecture
 *
 * 1. **Unary** (`request`): POST with JSON body, await single JSON response.
 * 2. **Streaming** (`stream`): POST with JSON body, SSE frames; each frame is a JSON-RPC response.
 *
 * ## Error handling
 *
 * - **JsonRpcTransportError**: Network failures, non-2xx HTTP, stream read errors.
 * - **JsonRpcProtocolError** (and subclasses): Server returned a JSON-RPC error object.
 */
export class A2AClient {
  private readonly config: A2AClientConfig;
  /** Monotonically increasing JSON-RPC request `id` for each POST. */
  private requestId = 0;

  /**
   * @param config - Base URL, optional auth token provider, extension URIs, and extra headers
   */
  constructor(config: A2AClientConfig) {
    this.config = config;
  }

  /**
   * Unary `SendMessage`: waits until the server returns one JSON-RPC result.
   *
   * @param params - Protobuf `SendMessageRequest`
   * @returns Protobuf `SendMessageResponse` (`task` or `message` payload)
   * @throws `JsonRpcTransportError` — network failure or non-2xx HTTP
   * @throws `JsonRpcProtocolError` (or subclass) — JSON-RPC `error` in the body
   */
  async sendMessage(params: SendMessageRequest): Promise<SendMessageResponse> {
    const wire = await this.request<WireStreamResponse>(
      Methods.sendMessage,
      protoSendMessageRequestToWire(params),
    );
    return wireSendMessageResponseToProto(wire);
  }

  /**
   * @param params - Protobuf `GetTaskRequest`
   * @returns Protobuf `Task`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async getTask(params: GetTaskRequest): Promise<Task> {
    const wire = await this.request<WireTask>(
      Methods.getTask,
      protoGetTaskRequestToWire(params),
    );
    return wireTaskToProto(wire);
  }

  /**
   * @param params - Protobuf `CancelTaskRequest`
   * @returns Updated protobuf `Task`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async cancelTask(params: CancelTaskRequest): Promise<Task> {
    const wire = await this.request<WireTask>(
      Methods.cancelTask,
      protoCancelTaskRequestToWire(params),
    );
    return wireTaskToProto(wire);
  }

  /**
   * Merges `params` with schema defaults via `create(ListTasksRequestSchema, params)` before converting to wire.
   *
   * @param params - Partial protobuf init for `ListTasksRequest` (default `{}`)
   * @returns Protobuf `ListTasksResponse`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async listTasks(
    params: MessageInitShape<typeof ListTasksRequestSchema> = {},
  ): Promise<ListTasksResponse> {
    const merged = create(ListTasksRequestSchema, params);
    const wire = await this.request<WireListTasksResponse>(
      Methods.listTasks,
      protoListTasksRequestToWire(merged),
    );
    return wireListTasksResponseToProto(wire);
  }

  /**
   * @param params - Protobuf `GetTaskPushNotificationConfigRequest`
   * @returns Protobuf `TaskPushNotificationConfig`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async getTaskPushNotificationConfig(
    params: GetTaskPushNotificationConfigRequest,
  ): Promise<TaskPushNotificationConfig> {
    const wire = await this.request<WireTaskPushConfig>(
      Methods.getTaskPushNotificationConfig,
      protoGetTaskPushNotificationConfigRequestToWire(params),
    );
    return wireTaskPushConfigToProto(wire);
  }

  /**
   * On the wire, params are sent as `{ taskId, config }`; this method accepts the flat protobuf RPC shape.
   *
   * @param params - Protobuf `TaskPushNotificationConfig`
   * @returns Created config as protobuf message
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async createTaskPushNotificationConfig(
    params: TaskPushNotificationConfig,
  ): Promise<TaskPushNotificationConfig> {
    const wire = await this.request<WireTaskPushConfig>(
      Methods.createTaskPushNotificationConfig,
      protoTaskPushNotificationConfigToCreateWire(params),
    );
    return wireTaskPushConfigToProto(wire);
  }

  /**
   * @param params - Protobuf `ListTaskPushNotificationConfigsRequest`
   * @returns Protobuf `ListTaskPushNotificationConfigsResponse`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async listTaskPushNotificationConfigs(
    params: ListTaskPushNotificationConfigsRequest,
  ): Promise<ListTaskPushNotificationConfigsResponse> {
    const wire = await this.request<ListTaskPushConfigResponse>(
      Methods.listTaskPushNotificationConfigs,
      protoListTaskPushNotificationConfigsRequestToWire(params),
    );
    return wireListTaskPushNotificationConfigsResponseToProto(wire);
  }

  /**
   * @param params - Protobuf `DeleteTaskPushNotificationConfigRequest`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async deleteTaskPushNotificationConfig(
    params: DeleteTaskPushNotificationConfigRequest,
  ): Promise<void> {
    await this.request<void>(
      Methods.deleteTaskPushNotificationConfig,
      protoDeleteTaskPushNotificationConfigRequestToWire(params),
    );
  }

  /**
   * @param params - Partial protobuf init for `GetExtendedAgentCardRequest` (default `{}`)
   * @returns Protobuf `AgentCard`
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async getExtendedAgentCard(
    params: MessageInitShape<typeof GetExtendedAgentCardRequestSchema> = {},
  ): Promise<AgentCard> {
    const merged = create(GetExtendedAgentCardRequestSchema, params);
    const wire = await this.request<WireAgentCard>(
      Methods.getExtendedAgentCard,
      protoGetExtendedAgentCardRequestToWire(merged),
    );
    return wireAgentCardToProto(wire);
  }

  /**
   * POSTs `SendStreamingMessage` and parses SSE frames; each successful frame becomes one yielded `StreamResponse`.
   *
   * @param params - Protobuf `SendMessageRequest`
   * @param signal - Optional `AbortSignal` to cancel `fetch` / stream read
   * @yields Protobuf `StreamResponse` per SSE JSON-RPC result
   * @throws `JsonRpcTransportError` — connection or stream errors (abort ends iteration without throw)
   * @throws `JsonRpcProtocolError` — JSON-RPC error frame (terminal)
   */
  async *sendStreamingMessage(
    params: SendMessageRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamResponse> {
    for await (const wire of this.stream<WireStreamResponse>(
      Methods.sendStreamingMessage,
      protoSendMessageRequestToWire(params),
      signal,
    )) {
      yield wireStreamResponseToProto(wire);
    }
  }

  /**
   * Same SSE mechanics as {@link A2AClient.sendStreamingMessage} for `SubscribeToTask`.
   *
   * @param params - Protobuf `SubscribeToTaskRequest`
   * @param signal - Optional cancellation
   * @yields Protobuf `StreamResponse` events for the task
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  async *subscribeToTask(
    params: SubscribeToTaskRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamResponse> {
    for await (const wire of this.stream<WireStreamResponse>(
      Methods.subscribeToTask,
      protoSubscribeToTaskRequestToWire(params),
      signal,
    )) {
      yield wireStreamResponseToProto(wire);
    }
  }

  /**
   * Unary path: POST → parse single JSON body → return `result` or throw on `error`.
   *
   * @param method - JSON-RPC method name (see `Methods`)
   * @param params - Wire object passed as JSON-RPC `params` (already proto→wire converted)
   * @typeParam R - Wire shape of `result` before further conversion by the caller
   * @throws `JsonRpcTransportError` | `JsonRpcProtocolError`
   */
  private async request<R>(method: string, params?: unknown): Promise<R> {
    const response = await this.post(method, params);

    let data: JsonRpcResponse<R>;
    try {
      // Single JSON object expected; malformed body is a transport-level failure.
      data = await response.json();
    } catch {
      throw new JsonRpcTransportError(
        `Invalid JSON in response from ${method}`,
      );
    }

    if (data.error) {
      throw createProtocolError(data.error);
    }

    return data.result as R;
  }

  /**
   * Streaming path: same POST as unary, but response body is SSE; each `data:` line is a `JsonRpcResponse`.
   *
   * `readSseStream` throws on protocol errors; successful frames expose `result` here (error objects never reach this loop).
   *
   * @typeParam T - Wire payload type inside each frame's `result`
   */
  private async *stream<T>(
    method: string,
    params?: unknown,
    signal?: AbortSignal,
  ): AsyncGenerator<T> {
    const response = await this.post(method, params, signal);

    for await (const frame of readSseStream<T>(response)) {
      yield frame.result as T;
    }
  }

  /**
   * Builds the JSON-RPC envelope (`jsonrpc`, `method`, `params`, monotonic `id`) and POSTs to `config.baseUrl`.
   *
   * @param signal - Passed to `fetch` for streaming methods when provided
   * @throws `JsonRpcTransportError` — fetch failure or non-2xx status
   */
  private async post(
    method: string,
    params?: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    const payload: JsonRpcRequest = {
      jsonrpc: JSONRPC_VERSION,
      method,
      params,
      id: ++this.requestId,
    };

    let response: Response;
    try {
      response = await fetch(this.config.baseUrl, {
        method: "POST",
        headers: await this.buildHeaders(),
        body: JSON.stringify(payload),
        signal,
      });
    } catch (cause) {
      throw new JsonRpcTransportError(
        `Network error calling ${method}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }

    if (!response.ok) {
      throw new JsonRpcTransportError(
        `HTTP ${response.status} ${response.statusText} calling ${method}`,
        response.status,
      );
    }

    return response;
  }

  /**
   * @returns Headers with `Content-Type: application/json`, optional `Authorization`, `A2A-Extensions`, and `extraHeaders`
   */
  private async buildHeaders(): Promise<HeadersInit> {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    if (this.config.getToken) {
      const token = await this.config.getToken();
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (this.config.extensionUris?.length) {
      for (const uri of this.config.extensionUris) {
        headers.append("A2A-Extensions", uri);
      }
    }

    if (this.config.extraHeaders) {
      for (const [k, v] of Object.entries(this.config.extraHeaders)) {
        headers.set(k, v);
      }
    }

    return headers;
  }
}
