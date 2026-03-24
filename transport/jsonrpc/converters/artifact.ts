/**
 * Proto ↔ wire conversion for task `Artifact` (parts, metadata).
 */

import { create } from "@bufbuild/protobuf";
import {
  ArtifactSchema,
  type Artifact as ProtoArtifact,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type { Artifact as WireArtifact } from "../wire";
import { protoPartToWire, wirePartToProto } from "./part";
import { asPbJsonObject } from "./wire-json";

/**
 * @param w - Wire artifact
 * @returns Protobuf `Artifact`
 */
export function wireArtifactToProto(w: WireArtifact): ProtoArtifact {
  return create(ArtifactSchema, {
    artifactId: w.artifactId,
    name: w.name ?? "",
    description: w.description ?? "",
    parts: w.parts.map(wirePartToProto),
    metadata: asPbJsonObject(w.metadata),
    extensions: w.extensions ?? [],
  });
}

/**
 * @param a - Protobuf artifact
 * @returns Wire artifact with optional fields omitted when empty
 */
export function protoArtifactToWire(a: ProtoArtifact): WireArtifact {
  const out: WireArtifact = {
    artifactId: a.artifactId,
    parts: a.parts.map(protoPartToWire),
  };
  if (a.name) out.name = a.name;
  if (a.description) out.description = a.description;
  if (a.metadata && Object.keys(a.metadata).length > 0)
    out.metadata = a.metadata;
  if (a.extensions?.length) out.extensions = [...a.extensions];
  return out;
}