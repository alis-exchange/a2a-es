/**
 * Nested wire `PushConfig` / `TaskPushConfig` ↔ flat protobuf `TaskPushNotificationConfig`.
 *
 * JSON-RPC create-push uses `{ taskId, config }` on the wire; the public client API passes a flat
 * protobuf message — see {@link protoTaskPushNotificationConfigToCreateWire}.
 */

import { create } from "@bufbuild/protobuf";
import {
  AuthenticationInfoSchema,
  TaskPushNotificationConfigSchema,
  type AuthenticationInfo as ProtoAuth,
  type TaskPushNotificationConfig as ProtoTaskPushNotificationConfig,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  PushAuthInfo,
  PushConfig,
  TaskPushConfig as WireTaskPushConfig,
} from "../wire";

/** Maps wire push auth block to protobuf `AuthenticationInfo`. */
function wireAuthToProto(a: PushAuthInfo): ProtoAuth {
  return create(AuthenticationInfoSchema, {
    scheme: a.scheme,
    credentials: a.credentials ?? "",
  });
}

/** Maps protobuf auth to wire `PushAuthInfo`, omitting empty credentials. */
function protoAuthToWire(a: ProtoAuth | undefined): PushAuthInfo | undefined {
  if (!a) return undefined;
  const out: PushAuthInfo = { scheme: a.scheme };
  if (a.credentials) out.credentials = a.credentials;
  return out;
}

/**
 * Nested wire `PushConfig` (URL, token, etc.) → flat protobuf `TaskPushNotificationConfig`.
 * Use for `SendMessageConfiguration.task_push_notification_config` where `task_id` may be empty.
 *
 * @param w - Nested wire push URL/token/auth
 * @param opts - Optional `taskId`, `tenant`, `id` merged into the flat protobuf message
 * @returns Flat `TaskPushNotificationConfig`
 */
export function wirePushConfigToProtoTaskPush(
  w: PushConfig,
  opts: { taskId?: string; tenant?: string; id?: string } = {},
): ProtoTaskPushNotificationConfig {
  return create(TaskPushNotificationConfigSchema, {
    tenant: opts.tenant ?? "",
    id: opts.id ?? w.id ?? "",
    taskId: opts.taskId ?? "",
    url: w.url,
    token: w.token ?? "",
    authentication: w.authentication
      ? wireAuthToProto(w.authentication)
      : undefined,
  });
}

/**
 * @param p - Flat protobuf push config
 * @returns Nested wire `PushConfig` for JSON-RPC bodies
 */
export function protoTaskPushToWirePush(
  p: ProtoTaskPushNotificationConfig,
): PushConfig {
  const out: PushConfig = {
    url: p.url,
  };
  if (p.id) out.id = p.id;
  if (p.token) out.token = p.token;
  const auth = protoAuthToWire(p.authentication);
  if (auth) out.authentication = auth;
  return out;
}

/**
 * @param w - Wire `{ taskId, config, tenant? }` from get/list responses
 * @returns Flat protobuf `TaskPushNotificationConfig`
 */
export function wireTaskPushConfigToProto(
  w: WireTaskPushConfig,
): ProtoTaskPushNotificationConfig {
  return wirePushConfigToProtoTaskPush(w.config, {
    taskId: w.taskId,
    tenant: w.tenant,
    id: w.config.id,
  });
}

/**
 * @param p - Flat protobuf push config (includes `taskId`)
 * @returns Wire `TaskPushConfig` for list/get result shapes
 */
export function protoTaskPushToWireTaskPushConfig(
  p: ProtoTaskPushNotificationConfig,
): WireTaskPushConfig {
  const out: WireTaskPushConfig = {
    taskId: p.taskId,
    config: protoTaskPushToWirePush(p),
  };
  if (p.tenant) out.tenant = p.tenant;
  return out;
}