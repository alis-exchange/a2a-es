/**
 * Protobuf A2A request messages ↔ wire JSON-RPC `params`.
 *
 * - `proto*ToWire` — build the object that becomes `JSON.stringify` `params` after the client wraps it.
 * - `wire*ToProto` — parse wire params back to protobuf (tests, gateways, custom transports).
 */

import { create } from "@bufbuild/protobuf";
import {
  AuthenticationInfoSchema,
  CancelTaskRequestSchema,
  DeleteTaskPushNotificationConfigRequestSchema,
  GetExtendedAgentCardRequestSchema,
  GetTaskPushNotificationConfigRequestSchema,
  GetTaskRequestSchema,
  ListTaskPushNotificationConfigsRequestSchema,
  ListTasksRequestSchema,
  SendMessageRequestSchema,
  SubscribeToTaskRequestSchema,
  TaskPushNotificationConfigSchema,
  TaskState,
  type CancelTaskRequest as ProtoCancelTaskRequest,
  type DeleteTaskPushNotificationConfigRequest as ProtoDeleteTaskPushNotificationConfigRequest,
  type GetExtendedAgentCardRequest as ProtoGetExtendedAgentCardRequest,
  type GetTaskPushNotificationConfigRequest as ProtoGetTaskPushNotificationConfigRequest,
  type GetTaskRequest as ProtoGetTaskRequest,
  type ListTaskPushNotificationConfigsRequest as ProtoListTaskPushNotificationConfigsRequest,
  type ListTasksRequest as ProtoListTasksRequest,
  type SendMessageRequest as ProtoSendMessageRequest,
  type SubscribeToTaskRequest as ProtoSubscribeToTaskRequest,
  type TaskPushNotificationConfig as ProtoTaskPushNotificationConfig,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  CancelTaskRequest as WireCancelTaskRequest,
  CreateTaskPushConfigRequest as WireCreateTaskPushConfigRequest,
  DeleteTaskPushConfigRequest as WireDeleteTaskPushConfigRequest,
  GetExtendedAgentCardRequest as WireGetExtendedAgentCardRequest,
  GetTaskPushConfigRequest as WireGetTaskPushConfigRequest,
  GetTaskRequest as WireGetTaskRequest,
  ListTaskPushConfigRequest as WireListTaskPushConfigRequest,
  ListTasksRequest as WireListTasksRequest,
  SendMessageRequest as WireSendMessageRequest,
  SubscribeToTaskRequest as WireSubscribeToTaskRequest,
} from "../wire";
import {
  protoRoleToWire,
  protoTaskStateToWire,
  wireTaskStateToProto,
} from "./enums";
import { wireMessageToProto } from "./message";
import { protoPartToWire } from "./part";
import {
  protoSendMessageConfigToWire,
  wireSendMessageConfigToProto,
} from "./send-message-config";
import { protoTaskPushToWirePush } from "./push-config";
import { protoTimestampToWire, wireTimestampToProto } from "./timestamp";
import { asPbJsonObject } from "./wire-json";

/**
 * @param p - Protobuf send-message request (must include `message`)
 * @returns Wire `SendMessageRequest` for JSON-RPC
 * @throws If `p.message` is missing
 */
export function protoSendMessageRequestToWire(
  p: ProtoSendMessageRequest,
): WireSendMessageRequest {
  if (!p.message) {
    throw new Error("SendMessageRequest.message is required for JSON-RPC");
  }
  const msg = p.message;
  const wireMsg: WireSendMessageRequest["message"] = {
    messageId: msg.messageId,
    role: protoRoleToWire(msg.role),
    parts: msg.parts.map(protoPartToWire),
  };
  if (msg.contextId) wireMsg.contextId = msg.contextId;
  if (msg.taskId) wireMsg.taskId = msg.taskId;
  if (msg.metadata && Object.keys(msg.metadata).length > 0)
    wireMsg.metadata = msg.metadata;
  if (msg.extensions?.length) wireMsg.extensions = [...msg.extensions];
  if (msg.referenceTaskIds?.length)
    wireMsg.referenceTaskIds = [...msg.referenceTaskIds];

  const out: WireSendMessageRequest = { message: wireMsg };
  if (p.tenant) out.tenant = p.tenant;
  if (p.configuration)
    out.configuration = protoSendMessageConfigToWire(p.configuration);
  if (p.metadata && Object.keys(p.metadata).length > 0)
    out.metadata = p.metadata;
  return out;
}

/**
 * @param w - Wire send-message params
 * @returns Protobuf `SendMessageRequest`
 */
export function wireSendMessageRequestToProto(
  w: WireSendMessageRequest,
): ProtoSendMessageRequest {
  return create(SendMessageRequestSchema, {
    tenant: w.tenant ?? "",
    message: wireMessageToProto(w.message),
    configuration: w.configuration
      ? wireSendMessageConfigToProto(w.configuration)
      : undefined,
    metadata: asPbJsonObject(w.metadata),
  });
}

/**
 * @param p - Protobuf get-task request
 * @returns Wire `GetTaskRequest`
 */
export function protoGetTaskRequestToWire(
  p: ProtoGetTaskRequest,
): WireGetTaskRequest {
  const out: WireGetTaskRequest = { id: p.id };
  if (p.tenant) out.tenant = p.tenant;
  if (p.historyLength !== undefined) out.historyLength = p.historyLength;
  return out;
}

/**
 * @param w - Wire get-task params
 * @returns Protobuf `GetTaskRequest`
 */
export function wireGetTaskRequestToProto(
  w: WireGetTaskRequest,
): ProtoGetTaskRequest {
  return create(GetTaskRequestSchema, {
    tenant: w.tenant ?? "",
    id: w.id,
    historyLength: w.historyLength,
  });
}

/**
 * @param p - Protobuf list-tasks request
 * @returns Wire `ListTasksRequest` with `status` omitted when `UNSPECIFIED`
 */
export function protoListTasksRequestToWire(
  p: ProtoListTasksRequest,
): WireListTasksRequest {
  const out: WireListTasksRequest = {};
  if (p.tenant) out.tenant = p.tenant;
  if (p.contextId) out.contextId = p.contextId;
  const st = protoTaskStateToWire(p.status);
  if (st !== "TASK_STATE_UNSPECIFIED" && st !== "") out.status = st;
  if (p.pageSize !== undefined) out.pageSize = p.pageSize;
  if (p.pageToken) out.pageToken = p.pageToken;
  if (p.historyLength !== undefined) out.historyLength = p.historyLength;
  const ts = protoTimestampToWire(p.statusTimestampAfter);
  if (ts) out.statusTimestampAfter = ts;
  if (p.includeArtifacts !== undefined)
    out.includeArtifacts = p.includeArtifacts;
  return out;
}

/**
 * @param w - Wire list-tasks params
 * @returns Protobuf `ListTasksRequest`
 */
export function wireListTasksRequestToProto(
  w: WireListTasksRequest,
): ProtoListTasksRequest {
  return create(ListTasksRequestSchema, {
    tenant: w.tenant ?? "",
    contextId: w.contextId ?? "",
    status:
      w.status !== undefined
        ? wireTaskStateToProto(w.status)
        : TaskState.UNSPECIFIED,
    pageSize: w.pageSize,
    pageToken: w.pageToken ?? "",
    historyLength: w.historyLength,
    statusTimestampAfter: w.statusTimestampAfter
      ? wireTimestampToProto(w.statusTimestampAfter)
      : undefined,
    includeArtifacts: w.includeArtifacts,
  });
}

/**
 * @param p - Protobuf cancel-task request
 * @returns Wire `CancelTaskRequest`
 */
export function protoCancelTaskRequestToWire(
  p: ProtoCancelTaskRequest,
): WireCancelTaskRequest {
  const out: WireCancelTaskRequest = { id: p.id };
  if (p.tenant) out.tenant = p.tenant;
  if (p.metadata && Object.keys(p.metadata).length > 0)
    out.metadata = p.metadata;
  return out;
}

/**
 * @param w - Wire cancel-task params
 * @returns Protobuf `CancelTaskRequest`
 */
export function wireCancelTaskRequestToProto(
  w: WireCancelTaskRequest,
): ProtoCancelTaskRequest {
  return create(CancelTaskRequestSchema, {
    tenant: w.tenant ?? "",
    id: w.id,
    metadata: asPbJsonObject(w.metadata),
  });
}

/**
 * @param p - Protobuf subscribe request
 * @returns Wire `SubscribeToTaskRequest`
 */
export function protoSubscribeToTaskRequestToWire(
  p: ProtoSubscribeToTaskRequest,
): WireSubscribeToTaskRequest {
  const out: WireSubscribeToTaskRequest = { id: p.id };
  if (p.tenant) out.tenant = p.tenant;
  return out;
}

/**
 * @param w - Wire subscribe params
 * @returns Protobuf `SubscribeToTaskRequest`
 */
export function wireSubscribeToTaskRequestToProto(
  w: WireSubscribeToTaskRequest,
): ProtoSubscribeToTaskRequest {
  return create(SubscribeToTaskRequestSchema, {
    tenant: w.tenant ?? "",
    id: w.id,
  });
}

/**
 * @param p - Protobuf get-push-config request
 * @returns Wire params (`id` is the push config id)
 */
export function protoGetTaskPushNotificationConfigRequestToWire(
  p: ProtoGetTaskPushNotificationConfigRequest,
): WireGetTaskPushConfigRequest {
  const out: WireGetTaskPushConfigRequest = { taskId: p.taskId, id: p.id };
  if (p.tenant) out.tenant = p.tenant;
  return out;
}

/**
 * @param w - Wire get-push-config params
 * @returns Protobuf `GetTaskPushNotificationConfigRequest`
 */
export function wireGetTaskPushNotificationConfigRequestToProto(
  w: WireGetTaskPushConfigRequest,
): ProtoGetTaskPushNotificationConfigRequest {
  return create(GetTaskPushNotificationConfigRequestSchema, {
    tenant: w.tenant ?? "",
    taskId: w.taskId,
    id: w.id,
  });
}

/**
 * @param p - Protobuf delete-push-config request
 * @returns Wire delete params
 */
export function protoDeleteTaskPushNotificationConfigRequestToWire(
  p: ProtoDeleteTaskPushNotificationConfigRequest,
): WireDeleteTaskPushConfigRequest {
  const out: WireDeleteTaskPushConfigRequest = { taskId: p.taskId, id: p.id };
  if (p.tenant) out.tenant = p.tenant;
  return out;
}

/**
 * @param w - Wire delete-push-config params
 * @returns Protobuf `DeleteTaskPushNotificationConfigRequest`
 */
export function wireDeleteTaskPushNotificationConfigRequestToProto(
  w: WireDeleteTaskPushConfigRequest,
): ProtoDeleteTaskPushNotificationConfigRequest {
  return create(DeleteTaskPushNotificationConfigRequestSchema, {
    tenant: w.tenant ?? "",
    taskId: w.taskId,
    id: w.id,
  });
}

/**
 * @param p - Protobuf list-push-configs request
 * @returns Wire list params for a task
 */
export function protoListTaskPushNotificationConfigsRequestToWire(
  p: ProtoListTaskPushNotificationConfigsRequest,
): WireListTaskPushConfigRequest {
  const out: WireListTaskPushConfigRequest = { taskId: p.taskId };
  if (p.tenant) out.tenant = p.tenant;
  if (p.pageSize !== undefined) out.pageSize = p.pageSize;
  if (p.pageToken) out.pageToken = p.pageToken;
  return out;
}

/**
 * @param w - Wire list-push-configs params
 * @returns Protobuf `ListTaskPushNotificationConfigsRequest`
 */
export function wireListTaskPushNotificationConfigsRequestToProto(
  w: WireListTaskPushConfigRequest,
): ProtoListTaskPushNotificationConfigsRequest {
  return create(ListTaskPushNotificationConfigsRequestSchema, {
    tenant: w.tenant ?? "",
    taskId: w.taskId,
    pageSize: w.pageSize ?? 0,
    pageToken: w.pageToken ?? "",
  });
}

/**
 * @param p - Protobuf extended card request
 * @returns Wire `GetExtendedAgentCardRequest`
 */
export function protoGetExtendedAgentCardRequestToWire(
  p: ProtoGetExtendedAgentCardRequest,
): WireGetExtendedAgentCardRequest {
  const out: WireGetExtendedAgentCardRequest = {};
  if (p.tenant) out.tenant = p.tenant;
  return out;
}

/**
 * @param w - Wire extended card params
 * @returns Protobuf `GetExtendedAgentCardRequest`
 */
export function wireGetExtendedAgentCardRequestToProto(
  w: WireGetExtendedAgentCardRequest,
): ProtoGetExtendedAgentCardRequest {
  return create(GetExtendedAgentCardRequestSchema, {
    tenant: w.tenant ?? "",
  });
}

/**
 * Flattens protobuf create-push input to the nested wire body the JSON-RPC method expects.
 *
 * @param p - Flat `TaskPushNotificationConfig` (same as gRPC/Connect RPC input)
 * @returns Wire `{ taskId, config: PushConfig, tenant? }`
 */
export function protoTaskPushNotificationConfigToCreateWire(
  p: ProtoTaskPushNotificationConfig,
): WireCreateTaskPushConfigRequest {
  return {
    taskId: p.taskId,
    tenant: p.tenant || undefined,
    config: protoTaskPushToWirePush(p),
  };
}

/**
 * @param w - Wire create-push params
 * @returns Flat protobuf `TaskPushNotificationConfig` for application code
 */
export function wireCreateTaskPushNotificationConfigToProto(
  w: WireCreateTaskPushConfigRequest,
): ProtoTaskPushNotificationConfig {
  return create(TaskPushNotificationConfigSchema, {
    tenant: w.tenant ?? "",
    taskId: w.taskId,
    id: w.config.id ?? "",
    url: w.config.url,
    token: w.config.token ?? "",
    authentication: w.config.authentication
      ? create(AuthenticationInfoSchema, {
          scheme: w.config.authentication.scheme,
          credentials: w.config.authentication.credentials ?? "",
        })
      : undefined,
  });
}