/**
 * Converts between RFC3339 strings on the JSON-RPC wire and `google.protobuf.Timestamp`.
 */

import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

/**
 * Parses an RFC3339/ISO-8601 wire string into a protobuf timestamp.
 *
 * @param iso - Date string from the wire (e.g. `ListTasksRequest.statusTimestampAfter`)
 * @returns Protobuf timestamp; invalid dates map to epoch
 */
export function wireTimestampToProto(iso: string): Timestamp {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return timestampFromDate(new Date(0));
  }
  return timestampFromDate(d);
}

/**
 * Serializes a protobuf timestamp to an RFC3339 string for the wire.
 *
 * @param ts - Protobuf timestamp, or `undefined`
 * @returns ISO string, or `undefined` if `ts` is absent
 */
export function protoTimestampToWire(ts: Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  return timestampDate(ts).toISOString();
}
