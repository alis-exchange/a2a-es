/**
 * Maps the wire `StreamResponse` wrapper (optional `task` | `message` | `statusUpdate` | `artifactUpdate`)
 * to protobuf `StreamResponse` / `SendMessageResponse` oneof payloads.
 */

import { create } from "@bufbuild/protobuf";
import {
  SendMessageResponseSchema,
  StreamResponseSchema,
  type SendMessageResponse as ProtoSendMessageResponse,
  type StreamResponse as ProtoStreamResponse,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { StreamResponse as WireStreamResponse } from "../wire";
import { protoMessageToWire, wireMessageToProto } from "./message";
import { protoTaskToWire, wireTaskToProto } from "./task";
import {
  protoTaskArtifactUpdateEventToWire,
  protoTaskStatusUpdateEventToWire,
  wireTaskArtifactUpdateEventToProto,
  wireTaskStatusUpdateEventToProto,
} from "./stream-events";

/**
 * Converts a wire stream/unary result to protobuf `StreamResponse`.
 *
 * Branch order matches typical server priority: `task` and `message` before streaming events.
 *
 * @param w - Wire wrapper from JSON-RPC or SSE
 * @returns Protobuf message with `payload` oneof; empty object → unset payload
 */
export function wireStreamResponseToProto(
  w: WireStreamResponse,
): ProtoStreamResponse {
  if (w.task) {
    return create(StreamResponseSchema, {
      payload: { case: "task", value: wireTaskToProto(w.task) },
    });
  }
  if (w.message) {
    return create(StreamResponseSchema, {
      payload: { case: "message", value: wireMessageToProto(w.message) },
    });
  }
  if (w.statusUpdate) {
    return create(StreamResponseSchema, {
      payload: {
        case: "statusUpdate",
        value: wireTaskStatusUpdateEventToProto(w.statusUpdate),
      },
    });
  }
  if (w.artifactUpdate) {
    return create(StreamResponseSchema, {
      payload: {
        case: "artifactUpdate",
        value: wireTaskArtifactUpdateEventToProto(w.artifactUpdate),
      },
    });
  }
  return create(StreamResponseSchema, {
    payload: { case: undefined, value: undefined },
  });
}

/**
 * @param p - Protobuf stream response
 * @returns Wire object with a single optional payload field
 */
export function protoStreamResponseToWire(
  p: ProtoStreamResponse,
): WireStreamResponse {
  const pl = p.payload;
  switch (pl.case) {
    case "task":
      return { task: protoTaskToWire(pl.value) };
    case "message":
      return { message: protoMessageToWire(pl.value) };
    case "statusUpdate":
      return { statusUpdate: protoTaskStatusUpdateEventToWire(pl.value) };
    case "artifactUpdate":
      return { artifactUpdate: protoTaskArtifactUpdateEventToWire(pl.value) };
    default:
      return {};
  }
}

/**
 * Unary `SendMessage` returns the same JSON shape as streaming but only `task` or `message` apply.
 *
 * @param w - Wire result from `SendMessage`
 * @returns Protobuf `SendMessageResponse`
 */
export function wireSendMessageResponseToProto(
  w: WireStreamResponse,
): ProtoSendMessageResponse {
  if (w.task) {
    return create(SendMessageResponseSchema, {
      payload: { case: "task", value: wireTaskToProto(w.task) },
    });
  }
  if (w.message) {
    return create(SendMessageResponseSchema, {
      payload: { case: "message", value: wireMessageToProto(w.message) },
    });
  }
  return create(SendMessageResponseSchema, {
    payload: { case: undefined, value: undefined },
  });
}

/**
 * @param p - Protobuf send-message response
 * @returns Wire subset (no status/artifact streaming fields)
 */
export function protoSendMessageResponseToWire(
  p: ProtoSendMessageResponse,
): WireStreamResponse {
  const pl = p.payload;
  switch (pl.case) {
    case "task":
      return { task: protoTaskToWire(pl.value) };
    case "message":
      return { message: protoMessageToWire(pl.value) };
    default:
      return {};
  }
}