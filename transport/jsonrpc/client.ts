import { A2AClientConfig, JsonRpcRequest, JsonRpcResponse } from "./types";
import type {
  AgentCard,
  CancelTaskRequest,
  CreateTaskPushConfigRequest,
  DeleteTaskPushConfigRequest,
  GetExtendedAgentCardRequest,
  GetTaskPushConfigRequest,
  GetTaskRequest,
  ListTaskPushConfigRequest,
  ListTaskPushConfigResponse,
  ListTasksRequest,
  ListTasksResponse,
  SendMessageRequest,
  StreamResponse,
  SubscribeToTaskRequest,
  Task,
  TaskPushConfig,
} from "./wire";
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
 * ## Architecture
 *
 * The client uses two transport modes:
 *
 * 1. **Unary** (`request`): POST with JSON body, await single JSON response.
 *    Used for: `sendMessage`, `getTask`, `listTasks`, `cancelTask`, etc.
 *
 * 2. **Streaming** (`stream`): POST with JSON body, response is Server-Sent
 *    Events (SSE). Each SSE data frame is a JSON-RPC response. Used for:
 *    `sendStreamingMessage`, `subscribeToTask`.
 *
 * ## Error handling
 *
 * - **JsonRpcTransportError**: Network failures, non-2xx HTTP, stream read errors.
 * - **JsonRpcProtocolError** (and subclasses): Server returned a JSON-RPC
 *   error object (e.g. TaskNotFoundError, UnauthenticatedError).
 */
export class A2AClient {
  private readonly config: A2AClientConfig;
  /** Monotonically increasing request ID counter. */
  private requestId = 0;

  constructor(config: A2AClientConfig) {
    this.config = config;
  }

  /**
   * Sends a message and waits for a single complete response.
   * Use sendStreamingMessage() if the agent streams partial updates.
   */
  async sendMessage(params: SendMessageRequest): Promise<StreamResponse> {
    return this.request<StreamResponse>(Methods.sendMessage, params);
  }

  /**
   * Retrieves a task by ID.
   */
  async getTask(params: GetTaskRequest): Promise<Task> {
    return this.request<Task>(Methods.getTask, params);
  }

  /**
   * Cancels a task by ID.
   */
  async cancelTask(params: CancelTaskRequest): Promise<Task> {
    return this.request<Task>(Methods.cancelTask, params);
  }

  /** Lists tasks, with optional filtering and pagination. */
  async listTasks(
    params: Partial<ListTasksRequest> = {},
  ): Promise<ListTasksResponse> {
    return this.request<ListTasksResponse>(Methods.listTasks, params);
  }

  /** Retrieves a push notification config by task ID and config ID. */
  async getTaskPushNotificationConfig(
    params: GetTaskPushConfigRequest,
  ): Promise<TaskPushConfig> {
    return this.request<TaskPushConfig>(
      Methods.getTaskPushNotificationConfig,
      params,
    );
  }

  /**
   * Creates a push notification config for a task.
   * Request body: `taskId`, nested `config`, optional `tenant`.
   */
  async createTaskPushNotificationConfig(
    params: CreateTaskPushConfigRequest,
  ): Promise<TaskPushConfig> {
    return this.request<TaskPushConfig>(
      Methods.createTaskPushNotificationConfig,
      params,
    );
  }

  /** Lists push notification configs for a task. */
  async listTaskPushNotificationConfigs(
    params: ListTaskPushConfigRequest,
  ): Promise<ListTaskPushConfigResponse> {
    return this.request<ListTaskPushConfigResponse>(
      Methods.listTaskPushNotificationConfigs,
      params,
    );
  }

  /** Deletes a push notification config. Returns void — server sends an empty result. */
  async deleteTaskPushNotificationConfig(
    params: DeleteTaskPushConfigRequest,
  ): Promise<void> {
    await this.request<void>(Methods.deleteTaskPushNotificationConfig, params);
  }

  /** Retrieves the extended agent card. */
  async getExtendedAgentCard(
    params: Partial<GetExtendedAgentCardRequest> = {},
  ): Promise<AgentCard> {
    return this.request<AgentCard>(Methods.getExtendedAgentCard, params);
  }

  /**
   * Sends a message and streams back status/artifact update events.
   *
   * The caller controls the stream lifetime via an AbortSignal:
   * ```ts
   * const controller = new AbortController()
   * for await (const event of client.sendStreamingMessage(params, controller.signal)) {
   *   if (done) controller.abort() // exits the loop cleanly, no error thrown
   * }
   * ```
   *
   * @throws {JsonRpcTransportError} On fetch failure or stream read error.
   * @throws {JsonRpcProtocolError} On a JSON-RPC error frame (terminal).
   */
  async *sendStreamingMessage(
    params: SendMessageRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamResponse> {
    yield* this.stream<StreamResponse>(
      Methods.sendStreamingMessage,
      params,
      signal,
    );
  }

  /**
   * Resubscribes to an existing task's event stream.
   *
   * @throws {JsonRpcTransportError} On fetch failure or stream read error.
   * @throws {JsonRpcProtocolError} On a JSON-RPC error frame (terminal).
   */
  async *subscribeToTask(
    params: SubscribeToTaskRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamResponse> {
    yield* this.stream<StreamResponse>(
      Methods.subscribeToTask,
      params,
      signal,
    );
  }

  /**
   * Sends a JSON-RPC 2.0 POST request and returns the typed result.
   *
   * Flow: post() → parse JSON → check for error → return result
   *
   * @throws {JsonRpcTransportError} On fetch failure or non-2xx HTTP status.
   * @throws {JsonRpcProtocolError} On a JSON-RPC error object in the response.
   */
  private async request<R>(method: string, params?: unknown): Promise<R> {
    const response = await this.post(method, params);

    let data: JsonRpcResponse<R>;
    try {
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
   * Sends a JSON-RPC 2.0 POST request and streams back typed responses via SSE.
   *
   * Flow: post() → readSseStream() parses SSE frames → each frame yields result
   *
   * Delegates frame parsing, buffering, and error handling to readSseStream().
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
   * Performs the underlying POST request for both unary and streaming calls.
   *
   * Builds a JSON-RPC 2.0 request envelope, adds auth header if configured,
   * and validates the HTTP response. Does not parse the response body.
   *
   * @throws {JsonRpcTransportError} On fetch failure or non-2xx HTTP status.
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
      // AbortError is re-thrown here since it occurs before we even have a
      // Response — the generator in stream() won't get a chance to swallow it.
      // Let it propagate naturally so the caller sees a clean loop exit.
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

  /** Builds request headers including Content-Type and optional Authorization. */
  private async buildHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.getToken) {
      const token = await this.config.getToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (this.config.extensionUris?.length) {
      headers["A2A-Extensions"] = this.config.extensionUris.join(", ");
    }

    if (this.config.extraHeaders) {
      for (const [k, v] of Object.entries(this.config.extraHeaders)) {
        headers[k] = v;
      }
    }

    return headers;
  }
}