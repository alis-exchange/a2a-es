/**
 * Proto ↔ wire conversion for A2A `Message` (role, parts, metadata).
 */

import { create } from "@bufbuild/protobuf";
import {
  MessageSchema,
  type Message as ProtoMessage,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { Message as WireMessage } from "../wire";
import { protoRoleToWire, wireRoleToProto } from "./enums";
import { protoPartToWire, wirePartToProto } from "./part";
import { asPbJsonObject } from "./wire-json";

/**
 * @param w - Wire message from JSON-RPC
 * @returns Protobuf `Message`
 */
export function wireMessageToProto(w: WireMessage): ProtoMessage {
  return create(MessageSchema, {
    messageId: w.messageId,
    contextId: w.contextId ?? "",
    taskId: w.taskId ?? "",
    role: wireRoleToProto(w.role),
    parts: w.parts.map(wirePartToProto),
    metadata: asPbJsonObject(w.metadata),
    extensions: w.extensions ?? [],
    referenceTaskIds: w.referenceTaskIds ?? [],
  });
}

/**
 * @param m - Protobuf message
 * @returns Wire message with optional fields omitted when empty
 */
export function protoMessageToWire(m: ProtoMessage): WireMessage {
  const msg: WireMessage = {
    messageId: m.messageId,
    role: protoRoleToWire(m.role),
    parts: m.parts.map(protoPartToWire),
  };
  if (m.contextId) msg.contextId = m.contextId;
  if (m.taskId) msg.taskId = m.taskId;
  if (m.metadata && Object.keys(m.metadata).length > 0)
    msg.metadata = m.metadata;
  if (m.extensions?.length) msg.extensions = [...m.extensions];
  if (m.referenceTaskIds?.length)
    msg.referenceTaskIds = [...m.referenceTaskIds];
  return msg;
}
