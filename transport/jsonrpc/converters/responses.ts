/**
 * Proto ↔ wire for list-style RPC results (`ListTasks`, `ListTaskPushNotificationConfigs`).
 */

import { create } from "@bufbuild/protobuf";
import {
  ListTaskPushNotificationConfigsResponseSchema,
  ListTasksResponseSchema,
  type ListTaskPushNotificationConfigsResponse as ProtoListTaskPushNotificationConfigsResponse,
  type ListTasksResponse as ProtoListTasksResponse,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  ListTaskPushConfigResponse as WireListTaskPushConfigResponse,
  ListTasksResponse as WireListTasksResponse,
} from "../wire";
import {
  protoTaskPushToWireTaskPushConfig,
  wireTaskPushConfigToProto,
} from "./push-config";
import { protoTaskToWire, wireTaskToProto } from "./task";

/**
 * @param p - Protobuf list-tasks response
 * @returns Wire `ListTasksResponse`
 */
export function protoListTasksResponseToWire(
  p: ProtoListTasksResponse,
): WireListTasksResponse {
  return {
    tasks: p.tasks.map(protoTaskToWire),
    totalSize: p.totalSize,
    pageSize: p.pageSize,
    nextPageToken: p.nextPageToken,
  };
}

/**
 * @param w - Wire list-tasks response
 * @returns Protobuf `ListTasksResponse`
 */
export function wireListTasksResponseToProto(
  w: WireListTasksResponse,
): ProtoListTasksResponse {
  return create(ListTasksResponseSchema, {
    tasks: w.tasks.map(wireTaskToProto),
    totalSize: w.totalSize,
    pageSize: w.pageSize,
    nextPageToken: w.nextPageToken,
  });
}

/**
 * @param p - Protobuf list-push-configs response
 * @returns Wire `ListTaskPushConfigResponse`
 */
export function protoListTaskPushNotificationConfigsResponseToWire(
  p: ProtoListTaskPushNotificationConfigsResponse,
): WireListTaskPushConfigResponse {
  const out: WireListTaskPushConfigResponse = {
    configs: p.configs.map(protoTaskPushToWireTaskPushConfig),
  };
  if (p.nextPageToken) out.nextPageToken = p.nextPageToken;
  return out;
}

/**
 * @param w - Wire list-push-configs response
 * @returns Protobuf `ListTaskPushNotificationConfigsResponse`
 */
export function wireListTaskPushNotificationConfigsResponseToProto(
  w: WireListTaskPushConfigResponse,
): ProtoListTaskPushNotificationConfigsResponse {
  return create(ListTaskPushNotificationConfigsResponseSchema, {
    configs: w.configs.map(wireTaskPushConfigToProto),
    nextPageToken: w.nextPageToken ?? "",
  });
}
