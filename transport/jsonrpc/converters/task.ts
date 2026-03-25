/**
 * Proto ↔ wire `Task` (status, artifacts, history, metadata).
 */

import { create } from "@bufbuild/protobuf";
import {
  TaskSchema,
  type Task as ProtoTask,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { Task as WireTask } from "../wire";
import { protoArtifactToWire, wireArtifactToProto } from "./artifact";
import { protoMessageToWire, wireMessageToProto } from "./message";
import { protoTaskStatusToWire, wireTaskStatusToProto } from "./task-status";
import { asPbJsonObject } from "./wire-json";

/**
 * @param w - Wire task from JSON-RPC
 * @returns Protobuf `Task`
 */
export function wireTaskToProto(w: WireTask): ProtoTask {
  return create(TaskSchema, {
    id: w.id,
    contextId: w.contextId,
    status: w.status ? wireTaskStatusToProto(w.status) : undefined,
    artifacts: (w.artifacts ?? []).map(wireArtifactToProto),
    history: (w.history ?? []).map(wireMessageToProto),
    metadata: asPbJsonObject(w.metadata),
  });
}

/**
 * @param t - Protobuf task
 * @returns Wire task; missing protobuf `status` becomes `TASK_STATE_UNSPECIFIED` on the wire
 */
export function protoTaskToWire(t: ProtoTask): WireTask {
  const out: WireTask = {
    id: t.id,
    contextId: t.contextId,
    status: t.status
      ? protoTaskStatusToWire(t.status)
      : { state: "TASK_STATE_UNSPECIFIED" },
  };
  if (t.metadata && Object.keys(t.metadata).length > 0)
    out.metadata = t.metadata;
  if (t.artifacts?.length) out.artifacts = t.artifacts.map(protoArtifactToWire);
  if (t.history?.length) out.history = t.history.map(protoMessageToWire);
  return out;
}