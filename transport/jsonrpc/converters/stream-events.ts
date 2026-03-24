/**
 * Proto ↔ wire for streaming SSE payloads: `TaskStatusUpdateEvent` and `TaskArtifactUpdateEvent`.
 */

import { create } from "@bufbuild/protobuf";
import {
  TaskArtifactUpdateEventSchema,
  TaskStatusUpdateEventSchema,
  type TaskArtifactUpdateEvent as ProtoTaskArtifactUpdateEvent,
  type TaskStatusUpdateEvent as ProtoTaskStatusUpdateEvent,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  TaskArtifactUpdateEvent as WireTaskArtifactUpdateEvent,
  TaskStatusUpdateEvent as WireTaskStatusUpdateEvent,
} from "../wire";
import { protoArtifactToWire, wireArtifactToProto } from "./artifact";
import { protoTaskStatusToWire, wireTaskStatusToProto } from "./task-status";
import { asPbJsonObject } from "./wire-json";

/**
 * @param w - Wire status update from an SSE frame
 * @returns Protobuf `TaskStatusUpdateEvent`
 */
export function wireTaskStatusUpdateEventToProto(
  w: WireTaskStatusUpdateEvent,
): ProtoTaskStatusUpdateEvent {
  return create(TaskStatusUpdateEventSchema, {
    taskId: w.taskId,
    contextId: w.contextId,
    status: w.status ? wireTaskStatusToProto(w.status) : undefined,
    metadata: asPbJsonObject(w.metadata),
  });
}

/**
 * @param p - Protobuf status update event
 * @returns Wire event; missing `status` becomes `TASK_STATE_UNSPECIFIED`
 */
export function protoTaskStatusUpdateEventToWire(
  p: ProtoTaskStatusUpdateEvent,
): WireTaskStatusUpdateEvent {
  const out: WireTaskStatusUpdateEvent = {
    taskId: p.taskId,
    contextId: p.contextId,
    status: p.status
      ? protoTaskStatusToWire(p.status)
      : { state: "TASK_STATE_UNSPECIFIED" },
  };
  if (p.metadata && Object.keys(p.metadata).length > 0)
    out.metadata = p.metadata;
  return out;
}

/**
 * @param w - Wire artifact update from an SSE frame
 * @returns Protobuf `TaskArtifactUpdateEvent`
 */
export function wireTaskArtifactUpdateEventToProto(
  w: WireTaskArtifactUpdateEvent,
): ProtoTaskArtifactUpdateEvent {
  return create(TaskArtifactUpdateEventSchema, {
    taskId: w.taskId,
    contextId: w.contextId,
    artifact: w.artifact ? wireArtifactToProto(w.artifact) : undefined,
    append: w.append ?? false,
    lastChunk: w.lastChunk ?? false,
    metadata: asPbJsonObject(w.metadata),
  });
}

/**
 * @param p - Protobuf artifact update event
 * @returns Wire event; missing artifact becomes a minimal placeholder (empty id/parts)
 */
export function protoTaskArtifactUpdateEventToWire(
  p: ProtoTaskArtifactUpdateEvent,
): WireTaskArtifactUpdateEvent {
  const out: WireTaskArtifactUpdateEvent = {
    taskId: p.taskId,
    contextId: p.contextId,
    append: p.append,
    lastChunk: p.lastChunk,
    artifact: p.artifact
      ? protoArtifactToWire(p.artifact)
      : { artifactId: "", parts: [] },
  };
  if (p.metadata && Object.keys(p.metadata).length > 0)
    out.metadata = p.metadata;
  return out;
}
