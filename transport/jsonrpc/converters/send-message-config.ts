/**
 * Maps `SendMessageConfiguration` protobuf fields to wire `SendMessageConfig`, including
 * `returnImmediately` and nested push notification shape renames.
 */

import { create } from "@bufbuild/protobuf";
import {
  SendMessageConfigurationSchema,
  type SendMessageConfiguration as ProtoSendMessageConfiguration,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { SendMessageConfig as WireSendMessageConfig } from "../wire";
import {
  protoTaskPushToWirePush,
  wirePushConfigToProtoTaskPush,
} from "./push-config";

/**
 * Wire `SendMessageConfig` → protobuf `SendMessageConfiguration`.
 *
 * Omitted wire `returnImmediately` defaults to `true` (return as soon as the task
 * is accepted), matching prior `blocking: false` semantics when the proto used
 * `blocking` instead of `return_immediately`.
 *
 * @param w - Wire send-message options from JSON-RPC
 * @returns Protobuf `SendMessageConfiguration`
 */
export function wireSendMessageConfigToProto(
  w: WireSendMessageConfig,
): ProtoSendMessageConfiguration {
  return create(SendMessageConfigurationSchema, {
    acceptedOutputModes: w.acceptedOutputModes ?? [],
    historyLength: w.historyLength,
    returnImmediately:
      w.returnImmediately === undefined ? true : w.returnImmediately,
    taskPushNotificationConfig: w.pushNotificationConfig
      ? wirePushConfigToProtoTaskPush(w.pushNotificationConfig)
      : undefined,
  });
}

/**
 * @param p - Protobuf send-message configuration
 * @returns Wire `SendMessageConfig` with `pushNotificationConfig` when set
 */
export function protoSendMessageConfigToWire(
  p: ProtoSendMessageConfiguration,
): WireSendMessageConfig {
  const out: WireSendMessageConfig = {
    returnImmediately: p.returnImmediately,
  };
  if (p.acceptedOutputModes?.length)
    out.acceptedOutputModes = [...p.acceptedOutputModes];
  if (p.historyLength !== undefined) out.historyLength = p.historyLength;
  if (p.taskPushNotificationConfig) {
    out.pushNotificationConfig = protoTaskPushToWirePush(
      p.taskPushNotificationConfig,
    );
  }
  return out;
}