/**
 * A2A JSON-RPC wire types.
 *
 * Request `params` include: `SendMessageRequest`, `GetTaskRequest`, `ListTasksRequest`,
 * `CancelTaskRequest`, `SubscribeToTaskRequest`, push config requests, `GetExtendedAgentCardRequest`.
 *
 * Response `result` shapes include: `StreamResponse`, `Task`, `ListTasksResponse`,
 * `ListTaskPushConfigResponse`, `TaskPushConfig`, `AgentCard`, etc.
 *
 * **Parts:** `Part` is a discriminated union (`PartText`, `PartData`, `PartRaw`, `PartUrl`) for the
 * flattened wire shape (one of `text` \| `data` \| `raw` \| `url` per object).
 */

export type { JsonObject } from "./json";
export type {
  Artifact,
  CancelTaskRequest,
  CreateTaskPushConfigRequest,
  DeleteTaskPushConfigRequest,
  GetTaskPushConfigRequest,
  GetTaskRequest,
  ListTaskPushConfigRequest,
  ListTaskPushConfigResponse,
  ListTasksRequest,
  ListTasksResponse,
  Message,
  MessageRole,
  Part,
  PartBase,
  PartData,
  PartRaw,
  PartText,
  PartUrl,
  PushAuthInfo,
  PushConfig,
  SendMessageConfig,
  SendMessageRequest,
  StreamResponse,
  SubscribeToTaskRequest,
  Task,
  TaskArtifactUpdateEvent,
  TaskPushConfig,
  TaskState,
  TaskStatus,
  TaskStatusUpdateEvent,
} from "./common";
export type {
  AgentCapabilities,
  AgentCard,
  AgentCardSignature,
  AgentExtension,
  AgentInterface,
  AgentProvider,
  AgentSkill,
  GetExtendedAgentCardRequest,
  NamedSecuritySchemes,
  ProtocolVersion,
  SecurityRequirementsOptions,
  TransportProtocol,
} from "./agent-card";