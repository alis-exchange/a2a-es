import type { JsonObject } from "./json";

/**
 * JSON string values for a message `role` in the A2A wire format (matches protobuf enum names).
 */
export type MessageRole = "ROLE_UNSPECIFIED" | "ROLE_AGENT" | "ROLE_USER" | "";

/**
 * JSON string values for task `state` in the A2A wire format (matches protobuf enum names).
 */
export type TaskState =
  | "TASK_STATE_UNSPECIFIED"
  | "TASK_STATE_SUBMITTED"
  | "TASK_STATE_WORKING"
  | "TASK_STATE_COMPLETED"
  | "TASK_STATE_FAILED"
  | "TASK_STATE_CANCELED"
  | "TASK_STATE_INPUT_REQUIRED"
  | "TASK_STATE_REJECTED"
  | "TASK_STATE_AUTH_REQUIRED"
  | "";

/**
 * Optional fields shared by all part variants. Omitted in JSON when empty on the wire.
 */
export interface PartBase {
  metadata?: JsonObject;
  filename?: string;
  mediaType?: string;
}

/** Plain text body for a wire `Part`. */
export interface PartText extends PartBase {
  text: string;
  data?: never;
  raw?: never;
  url?: never;
}

/** Arbitrary JSON value (structured data). */
export interface PartData extends PartBase {
  text?: never;
  data: unknown;
  raw?: never;
  url?: never;
}

/** Raw bytes as a base64-encoded string. */
export interface PartRaw extends PartBase {
  text?: never;
  data?: never;
  raw: string;
  url?: never;
}

/** File or media URL reference. */
export interface PartUrl extends PartBase {
  text?: never;
  data?: never;
  raw?: never;
  url: string;
}

/**
 * Discriminated union: exactly one of `text`, `data`, `raw` (base64), or `url` is present,
 * plus optional `metadata`, `filename`, and `mediaType` from {@link PartBase}.
 */
export type Part = PartText | PartData | PartRaw | PartUrl;

/** User or agent message as serialized in JSON-RPC `params` / stream payloads. */
export interface Message {
  /** Stable message identifier. */
  messageId: string;
  /** Conversation or session identifier. */
  contextId?: string;
  /** Extension URIs activated for this message. */
  extensions?: string[];
  /** Arbitrary key/value metadata. */
  metadata?: JsonObject;
  /** Content parts (flattened wire shape). */
  parts: Part[];
  /** Related task IDs referenced by this message. */
  referenceTaskIds?: string[];
  /** Sender role. */
  role: MessageRole;
  /** Associated task when applicable. */
  taskId?: string;
}

/** Current lifecycle state of a task, optionally with a status message and timestamp. */
export interface TaskStatus {
  /** Optional human-readable or structured status message. */
  message?: Message;
  state: TaskState;
  /** RFC3339 timestamp string. */
  timestamp?: string;
}

/** Named output (e.g. file or generated content) attached to a task. */
export interface Artifact {
  artifactId: string;
  description?: string;
  extensions?: string[];
  metadata?: JsonObject;
  name?: string;
  parts: Part[];
}

/** Task aggregate: identity, status, optional history and artifacts. */
export interface Task {
  id: string;
  artifacts?: Artifact[];
  contextId: string;
  history?: Message[];
  metadata?: JsonObject;
  status: TaskStatus;
}

/** Streaming event: task status changed. */
export interface TaskStatusUpdateEvent {
  contextId: string;
  status: TaskStatus;
  taskId: string;
  metadata?: JsonObject;
}

/** Streaming event: artifact created or updated (possibly chunked). */
export interface TaskArtifactUpdateEvent {
  append?: boolean;
  artifact: Artifact;
  contextId: string;
  lastChunk?: boolean;
  taskId: string;
  metadata?: JsonObject;
}

/**
 * Unary `SendMessage` and streaming frames use the same result wrapper.
 * At most one payload field should be set.
 */
export interface StreamResponse {
  message?: Message;
  task?: Task;
  statusUpdate?: TaskStatusUpdateEvent;
  artifactUpdate?: TaskArtifactUpdateEvent;
}

/** Authentication details for a push notification endpoint. */
export interface PushAuthInfo {
  credentials?: string;
  scheme: string;
}

/** Push notification callback configuration. */
export interface PushConfig {
  id?: string;
  authentication?: PushAuthInfo;
  token?: string;
  url: string;
}

/** Options for `SendMessage` / `SendStreamingMessage` (`configuration` in JSON). */
export interface SendMessageConfig {
  acceptedOutputModes?: string[];
  returnImmediately?: boolean;
  historyLength?: number;
  pushNotificationConfig?: PushConfig;
}

/** JSON-RPC `params` for `SendMessage` / `SendStreamingMessage`. */
export interface SendMessageRequest {
  tenant?: string;
  configuration?: SendMessageConfig;
  message: Message;
  metadata?: JsonObject;
}

/** JSON-RPC `params` for `GetTask`. */
export interface GetTaskRequest {
  tenant?: string;
  /** Task ID to load. */
  id: string;
  /** Max history messages to include when supported by the server. */
  historyLength?: number;
}

/** JSON-RPC `params` for `ListTasks`. */
export interface ListTasksRequest {
  tenant?: string;
  contextId?: string;
  status?: TaskState;
  pageSize?: number;
  pageToken?: string;
  historyLength?: number;
  /** RFC3339 timestamp string — filter tasks with status updated after this instant. */
  statusTimestampAfter?: string;
  includeArtifacts?: boolean;
}

/** JSON-RPC `result` for `ListTasks`. */
export interface ListTasksResponse {
  tasks: Task[];
  totalSize: number;
  pageSize: number;
  nextPageToken: string;
}

/** JSON-RPC `params` for `CancelTask`. */
export interface CancelTaskRequest {
  tenant?: string;
  id: string;
  metadata?: JsonObject;
}

/** JSON-RPC `params` for `SubscribeToTask`. */
export interface SubscribeToTaskRequest {
  tenant?: string;
  id: string;
}

/** Push configuration associated with a task. */
export interface TaskPushConfig {
  tenant?: string;
  config: PushConfig;
  taskId: string;
}

/** Parameters for `GetTaskPushNotificationConfig`. */
export interface GetTaskPushConfigRequest {
  tenant?: string;
  taskId: string;
  id: string;
}

/** Parameters for `ListTaskPushNotificationConfigs`. */
export interface ListTaskPushConfigRequest {
  tenant?: string;
  taskId: string;
  pageSize?: number;
  pageToken?: string;
}

/** Result of `ListTaskPushNotificationConfigs`. */
export interface ListTaskPushConfigResponse {
  configs: TaskPushConfig[];
  nextPageToken?: string;
}

/** Parameters for `CreateTaskPushNotificationConfig`. */
export interface CreateTaskPushConfigRequest {
  tenant?: string;
  config: PushConfig;
  taskId: string;
}

/** Parameters for `DeleteTaskPushNotificationConfig`. */
export interface DeleteTaskPushConfigRequest {
  tenant?: string;
  taskId: string;
  id: string;
}