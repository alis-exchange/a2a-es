/**
 * Proto ↔ JSON-RPC wire converters for A2A.
 *
 * Each function maps between `@alis-build/common-es/lf/a2a/v1` protobuf messages and the
 * flattened wire types under `../wire`, without relying on whole-payload `toJson`/`fromJson`
 * for RPC bodies.
 */

export * from "./agent-card";
export * from "./artifact";
export * from "./bytes";
export * from "./enums";
export * from "./message";
export * from "./part";
export * from "./push-config";
export * from "./requests";
export * from "./responses";
export * from "./send-message-config";
export * from "./stream-events";
export * from "./stream-response";
export * from "./task";
export * from "./task-status";
export * from "./timestamp";
export * from "./wire-json";