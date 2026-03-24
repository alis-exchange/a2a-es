/**
 * Converts flattened wire `Part` objects (one of `text` | `data` | `raw` | `url`) to protobuf
 * `Part` messages with a `content` oneof, and the inverse.
 */

import { create, fromJson, toJson } from "@bufbuild/protobuf";
import { ValueSchema } from "@bufbuild/protobuf/wkt";
import type { JsonValue } from "@bufbuild/protobuf";
import {
  PartSchema,
  type Part as ProtoPart,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { Part as WirePart } from "../wire";
import { base64ToBytes, bytesToBase64 } from "./bytes";
import { asPbJsonObject } from "./wire-json";

/** Omits empty optional fields so wire JSON stays minimal. */
function omitEmptyMeta(
  metadata: Record<string, unknown> | undefined,
  filename: string | undefined,
  mediaType: string | undefined,
): Pick<WirePart, "metadata" | "filename" | "mediaType"> {
  const o: Pick<WirePart, "metadata" | "filename" | "mediaType"> = {};
  if (metadata && Object.keys(metadata).length > 0) o.metadata = metadata;
  if (filename) o.filename = filename;
  if (mediaType) o.mediaType = mediaType;
  return o;
}

/**
 * Maps a wire part to protobuf `Part`.
 *
 * @param w - Discriminated wire part
 * @returns Protobuf message with `content` oneof set from the wire variant
 */
export function wirePartToProto(w: WirePart): ProtoPart {
  const base = {
    metadata: asPbJsonObject(
      "metadata" in w && w.metadata ? w.metadata : undefined,
    ),
    filename: "filename" in w && w.filename ? w.filename : "",
    mediaType: "mediaType" in w && w.mediaType ? w.mediaType : "",
  };

  if ("text" in w && w.text !== undefined) {
    return create(PartSchema, {
      ...base,
      content: { case: "text", value: w.text },
    });
  }
  if ("raw" in w && w.raw !== undefined) {
    return create(PartSchema, {
      ...base,
      content: { case: "raw", value: base64ToBytes(w.raw) },
    });
  }
  if ("url" in w && w.url !== undefined) {
    return create(PartSchema, {
      ...base,
      content: { case: "url", value: w.url },
    });
  }
  if ("data" in w && w.data !== undefined) {
    return create(PartSchema, {
      ...base,
      content: {
        case: "data",
        value: fromJson(ValueSchema, w.data as JsonValue),
      },
    });
  }
  // No recognized content field — empty protobuf part (servers should not emit this shape).
  return create(PartSchema, {
    ...base,
    content: { case: undefined, value: undefined },
  });
}

/**
 * Maps protobuf `Part` to the flattened wire shape.
 *
 * @param p - Protobuf part with `content` oneof
 * @returns Wire discriminated part; unset content becomes `{ text: "" }` plus optional meta
 */
export function protoPartToWire(p: ProtoPart): WirePart {
  const meta = omitEmptyMeta(
    p.metadata,
    p.filename || undefined,
    p.mediaType || undefined,
  );
  const c = p.content;
  switch (c.case) {
    case "text":
      return { text: c.value, ...meta };
    case "raw":
      return { raw: bytesToBase64(c.value), ...meta };
    case "url":
      return { url: c.value, ...meta };
    case "data":
      return {
        data: toJson(ValueSchema, c.value) as unknown,
        ...meta,
      };
    default:
      return { text: "", ...meta };
  }
}
