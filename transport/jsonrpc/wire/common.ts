import type { JsonObject } from "./json";

/** JSON string values for a message `role` in the A2A wire format. */
export type MessageRole = "ROLE_UNSPECIFIED" | "ROLE_AGENT" | "ROLE_USER" | "";

/** JSON string values for task `state` in the A2A wire format. */
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

/**
 * A message or artifact content part in the JSON-RPC wire format: a flattened object with
 * exactly one of `text`, `data`, `raw` (base64 string), or `url`, plus optional `metadata`,
 * `filename`, and `mediaType`.
 */
/** Text body. */
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

/** Discriminated union: exactly one content field is present. */
export type Part = PartText | PartData | PartRaw | PartUrl;

export interface Message {
  messageId: string;
  contextId?: string;
  extensions?: string[];
  metadata?: JsonObject;
  parts: Part[];
  referenceTaskIds?: string[];
  role: MessageRole;
  taskId?: string;
}

export interface TaskStatus {
  message?: Message;
  state: TaskState;
  /** RFC3339 timestamp string. */
  timestamp?: string;
}

export interface Artifact {
  artifactId: string;
  description?: string;
  extensions?: string[];
  metadata?: JsonObject;
  name?: string;
  parts: Part[];
}

export interface Task {
  id: string;
  artifacts?: Artifact[];
  contextId: string;
  history?: Message[];
  metadata?: JsonObject;
  status: TaskStatus;
}

export interface TaskStatusUpdateEvent {
  contextId: string;
  status: TaskStatus;
  taskId: string;
  metadata?: JsonObject;
}

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

/** Parameters for the `SendMessage` JSON-RPC method. */
export interface SendMessageRequest {
  tenant?: string;
  configuration?: SendMessageConfig;
  message: Message;
  metadata?: JsonObject;
}

/** Parameters for the `GetTask` JSON-RPC method. */
export interface GetTaskRequest {
  tenant?: string;
  id: string;
  historyLength?: number;
}

/** Parameters for the `ListTasks` JSON-RPC method. */
export interface ListTasksRequest {
  tenant?: string;
  contextId?: string;
  status?: TaskState;
  pageSize?: number;
  pageToken?: string;
  historyLength?: number;
  /** RFC3339 timestamp string */
  statusTimestampAfter?: string;
  includeArtifacts?: boolean;
}

/** Result of the `ListTasks` JSON-RPC method. */
export interface ListTasksResponse {
  tasks: Task[];
  totalSize: number;
  pageSize: number;
  nextPageToken: string;
}

/** Parameters for the `CancelTask` JSON-RPC method. */
export interface CancelTaskRequest {
  tenant?: string;
  id: string;
  metadata?: JsonObject;
}

/** Parameters for the `SubscribeToTask` JSON-RPC method. */
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