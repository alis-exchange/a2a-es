import type { JsonObject as PbJsonObject } from "@bufbuild/protobuf";
import type { JsonObject as WireJsonObject } from "../wire/json";

/**
 * Casts wire `JsonObject` metadata to protobuf `JsonObject` at RPC boundaries.
 *
 * Wire `JsonObject` is `Record<string, unknown>`; protobuf structs expect stricter `JsonValue`
 * values. Call sites assume server JSON is compatible with protobuf JSON decoding rules.
 *
 * @param o - Optional wire metadata object
 * @returns Same reference typed as protobuf `JsonObject`, or `undefined`
 */
export function asPbJsonObject(o: WireJsonObject | undefined): PbJsonObject | undefined {
  return o as PbJsonObject | undefined;
}
