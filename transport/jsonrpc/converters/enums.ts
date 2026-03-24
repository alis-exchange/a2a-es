/**
 * Maps A2A `Role` and `TaskState` enums to/from JSON-RPC string labels on the wire.
 */

import { Role, TaskState } from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { MessageRole, TaskState as WireTaskState } from "../wire";

const TASK_STATE_TO_WIRE: Record<TaskState, WireTaskState> = {
  [TaskState.UNSPECIFIED]: "TASK_STATE_UNSPECIFIED",
  [TaskState.SUBMITTED]: "TASK_STATE_SUBMITTED",
  [TaskState.WORKING]: "TASK_STATE_WORKING",
  [TaskState.COMPLETED]: "TASK_STATE_COMPLETED",
  [TaskState.FAILED]: "TASK_STATE_FAILED",
  [TaskState.CANCELED]: "TASK_STATE_CANCELED",
  [TaskState.INPUT_REQUIRED]: "TASK_STATE_INPUT_REQUIRED",
  [TaskState.REJECTED]: "TASK_STATE_REJECTED",
  [TaskState.AUTH_REQUIRED]: "TASK_STATE_AUTH_REQUIRED",
};

const WIRE_TO_TASK_STATE: Record<string, TaskState> = {
  "": TaskState.UNSPECIFIED,
  TASK_STATE_UNSPECIFIED: TaskState.UNSPECIFIED,
  TASK_STATE_SUBMITTED: TaskState.SUBMITTED,
  TASK_STATE_WORKING: TaskState.WORKING,
  TASK_STATE_COMPLETED: TaskState.COMPLETED,
  TASK_STATE_FAILED: TaskState.FAILED,
  TASK_STATE_CANCELED: TaskState.CANCELED,
  TASK_STATE_INPUT_REQUIRED: TaskState.INPUT_REQUIRED,
  TASK_STATE_REJECTED: TaskState.REJECTED,
  TASK_STATE_AUTH_REQUIRED: TaskState.AUTH_REQUIRED,
};

/**
 * Converts a wire message role string to protobuf {@link Role}.
 *
 * @param role - Wire `MessageRole` (e.g. `ROLE_USER`)
 * @returns Matching protobuf enum value; unknown strings map to `UNSPECIFIED`
 */
export function wireRoleToProto(role: MessageRole): Role {
  switch (role) {
    case "ROLE_USER":
      return Role.USER;
    case "ROLE_AGENT":
      return Role.AGENT;
    case "ROLE_UNSPECIFIED":
    case "":
    default:
      return Role.UNSPECIFIED;
  }
}

/**
 * Converts protobuf {@link Role} to the wire string form.
 *
 * @param role - Protobuf role enum
 * @returns Wire `MessageRole` string
 */
export function protoRoleToWire(role: Role): MessageRole {
  switch (role) {
    case Role.USER:
      return "ROLE_USER";
    case Role.AGENT:
      return "ROLE_AGENT";
    case Role.UNSPECIFIED:
    default:
      return "ROLE_UNSPECIFIED";
  }
}

/**
 * Converts a wire task state string to protobuf {@link TaskState}.
 *
 * @param state - Wire `TaskState` label
 * @returns Matching enum value, or `UNSPECIFIED` if unknown
 */
export function wireTaskStateToProto(state: WireTaskState): TaskState {
  return WIRE_TO_TASK_STATE[state] ?? TaskState.UNSPECIFIED;
}

/**
 * Converts protobuf {@link TaskState} to the wire string form.
 *
 * @param state - Protobuf task state enum
 * @returns Wire task state label
 */
export function protoTaskStateToWire(state: TaskState): WireTaskState {
  return TASK_STATE_TO_WIRE[state] ?? "TASK_STATE_UNSPECIFIED";
}
