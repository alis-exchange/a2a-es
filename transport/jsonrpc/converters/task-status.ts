/**
 * Proto ↔ wire `TaskStatus` (enum string, optional message, RFC3339 timestamp).
 */

import { create } from "@bufbuild/protobuf";
import {
  TaskStatusSchema,
  type TaskStatus as ProtoTaskStatus,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { TaskStatus as WireTaskStatus } from "../wire";
import { protoTaskStateToWire, wireTaskStateToProto } from "./enums";
import { protoMessageToWire, wireMessageToProto } from "./message";
import { protoTimestampToWire, wireTimestampToProto } from "./timestamp";

/**
 * @param w - Wire task status
 * @returns Protobuf `TaskStatus`
 */
export function wireTaskStatusToProto(w: WireTaskStatus): ProtoTaskStatus {
  return create(TaskStatusSchema, {
    state: wireTaskStateToProto(w.state),
    message: w.message ? wireMessageToProto(w.message) : undefined,
    timestamp: w.timestamp ? wireTimestampToProto(w.timestamp) : undefined,
  });
}

/**
 * @param s - Protobuf task status
 * @returns Wire shape with optional `message` / `timestamp` omitted when unset
 */
export function protoTaskStatusToWire(s: ProtoTaskStatus): WireTaskStatus {
  const out: WireTaskStatus = {
    state: protoTaskStateToWire(s.state),
  };
  if (s.message) out.message = protoMessageToWire(s.message);
  const ts = protoTimestampToWire(s.timestamp);
  if (ts) out.timestamp = ts;
  return out;
}