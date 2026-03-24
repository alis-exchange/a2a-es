/**
 * Proto ↔ wire conversion for `AgentCard` and nested card types (interfaces, skills, security).
 *
 * Security schemes are parsed with `fromJson` / `toJson` per entry; malformed scheme objects are skipped on ingest.
 */

import { create, fromJson, toJson } from "@bufbuild/protobuf";
import type { JsonValue } from "@bufbuild/protobuf";
import {
  AgentCardSchema,
  AgentCapabilitiesSchema,
  AgentCardSignatureSchema,
  AgentExtensionSchema,
  AgentInterfaceSchema,
  AgentProviderSchema,
  AgentSkillSchema,
  SecurityRequirementSchema,
  SecuritySchemeSchema,
  StringListSchema,
  type AgentCard as ProtoAgentCard,
  type AgentCardSignature as ProtoAgentCardSignature,
  type AgentExtension as ProtoAgentExtension,
  type AgentInterface as ProtoAgentInterface,
  type AgentProvider as ProtoAgentProvider,
  type AgentSkill as ProtoAgentSkill,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  AgentCard as WireAgentCard,
  AgentCapabilities as WireAgentCapabilities,
  AgentCardSignature as WireAgentCardSignature,
  AgentExtension as WireAgentExtension,
  AgentInterface as WireAgentInterface,
  AgentProvider as WireAgentProvider,
  AgentSkill as WireAgentSkill,
  NamedSecuritySchemes,
  SecurityRequirementsOptions,
} from "../wire";
import { asPbJsonObject } from "./wire-json";

/** Maps wire security requirement rows to protobuf `SecurityRequirement` list. */
function wireSecurityRequirementsToProto(w?: SecurityRequirementsOptions) {
  if (!w?.length) return [];
  return w.map((req) =>
    create(SecurityRequirementSchema, {
      schemes: Object.fromEntries(
        Object.entries(req.schemes).map(([k, scopes]) => [
          k,
          create(StringListSchema, { list: scopes }),
        ]),
      ),
    }),
  );
}

/** Inverse of {@link wireSecurityRequirementsToProto}. */
function protoSecurityRequirementsToWire(
  p: ProtoAgentCard["securityRequirements"],
): SecurityRequirementsOptions | undefined {
  if (!p?.length) return undefined;
  return p.map((req) => ({
    schemes: Object.fromEntries(
      Object.entries(req.schemes).map(([k, sl]) => [k, [...sl.list]]),
    ),
  }));
}

/**
 * Parses each wire scheme object through `SecuritySchemeSchema`; skips non-objects and decode failures.
 */
function wireSecuritySchemesToProto(
  w?: NamedSecuritySchemes,
): ProtoAgentCard["securitySchemes"] {
  if (!w) return {};
  const out: ProtoAgentCard["securitySchemes"] = {};
  for (const [k, v] of Object.entries(w)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      try {
        out[k] = fromJson(SecuritySchemeSchema, v as JsonValue);
      } catch {
        /* skip invalid entries */
      }
    }
  }
  return out;
}

/** Serializes protobuf security schemes to loose JSON records for the wire. */
function protoSecuritySchemesToWire(
  p: ProtoAgentCard["securitySchemes"],
): NamedSecuritySchemes | undefined {
  const keys = Object.keys(p);
  if (!keys.length) return undefined;
  const out: NamedSecuritySchemes = {};
  for (const k of keys) {
    out[k] = toJson(SecuritySchemeSchema, p[k]!) as unknown;
  }
  return out;
}

/** Wire agent capabilities block → protobuf. */
function wireCapabilitiesToProto(w: WireAgentCapabilities) {
  return create(AgentCapabilitiesSchema, {
    streaming: w.streaming,
    pushNotifications: w.pushNotifications,
    extendedAgentCard: w.extendedAgentCard,
    extensions: (w.extensions ?? []).map((e) => wireAgentExtensionToProto(e)),
  });
}

/** Protobuf capabilities → wire; omits unset booleans. */
function protoCapabilitiesToWire(
  c: ProtoAgentCard["capabilities"],
): WireAgentCapabilities {
  const out: WireAgentCapabilities = {};
  if (c?.streaming !== undefined) out.streaming = c.streaming;
  if (c?.pushNotifications !== undefined)
    out.pushNotifications = c.pushNotifications;
  if (c?.extendedAgentCard !== undefined)
    out.extendedAgentCard = c.extendedAgentCard;
  if (c?.extensions?.length)
    out.extensions = c.extensions.map(protoAgentExtensionToWire);
  return out;
}

/** Single wire extension declaration → protobuf. */
function wireAgentExtensionToProto(w: WireAgentExtension) {
  return create(AgentExtensionSchema, {
    uri: w.uri ?? "",
    description: w.description ?? "",
    required: w.required ?? false,
    params: asPbJsonObject(w.params),
  });
}

/** Protobuf extension → wire. */
function protoAgentExtensionToWire(e: ProtoAgentExtension): WireAgentExtension {
  const out: WireAgentExtension = {
    uri: e.uri,
    description: e.description,
    required: e.required,
  };
  if (e.params && Object.keys(e.params).length > 0) out.params = e.params;
  return out;
}

/** Supported interface URL + binding → protobuf. */
function wireAgentInterfaceToProto(w: WireAgentInterface) {
  return create(AgentInterfaceSchema, {
    url: w.url,
    protocolBinding: w.protocolBinding,
    tenant: w.tenant ?? "",
    protocolVersion: w.protocolVersion,
  });
}

/** Protobuf interface → wire. */
function protoAgentInterfaceToWire(i: ProtoAgentInterface): WireAgentInterface {
  const out: WireAgentInterface = {
    url: i.url,
    protocolBinding: i.protocolBinding,
    protocolVersion: i.protocolVersion,
  };
  if (i.tenant) out.tenant = i.tenant;
  return out;
}

/** Provider metadata → protobuf. */
function wireAgentProviderToProto(w: WireAgentProvider) {
  return create(AgentProviderSchema, {
    url: w.url,
    organization: w.organization,
  });
}

/** Protobuf provider → wire. */
function protoAgentProviderToWire(p: ProtoAgentProvider): WireAgentProvider {
  return { url: p.url, organization: p.organization };
}

/** Skill definition including nested security requirements → protobuf. */
function wireAgentSkillToProto(w: WireAgentSkill) {
  return create(AgentSkillSchema, {
    id: w.id,
    name: w.name,
    description: w.description,
    tags: w.tags,
    examples: w.examples ?? [],
    inputModes: w.inputModes ?? [],
    outputModes: w.outputModes ?? [],
    securityRequirements: wireSecurityRequirementsToProto(
      w.securityRequirements,
    ),
  });
}

/** Protobuf skill → wire. */
function protoAgentSkillToWire(s: ProtoAgentSkill): WireAgentSkill {
  const out: WireAgentSkill = {
    id: s.id,
    name: s.name,
    description: s.description,
    tags: [...s.tags],
  };
  if (s.examples?.length) out.examples = [...s.examples];
  if (s.inputModes?.length) out.inputModes = [...s.inputModes];
  if (s.outputModes?.length) out.outputModes = [...s.outputModes];
  const sr = protoSecurityRequirementsToWire(s.securityRequirements);
  if (sr?.length) out.securityRequirements = sr;
  return out;
}

/** JWS signature block → protobuf. */
function wireSignatureToProto(w: WireAgentCardSignature) {
  return create(AgentCardSignatureSchema, {
    protected: w.protected,
    signature: w.signature,
    header: asPbJsonObject(w.header),
  });
}

/** Protobuf signature → wire. */
function protoSignatureToWire(
  s: ProtoAgentCardSignature,
): WireAgentCardSignature {
  const out: WireAgentCardSignature = {
    protected: s.protected,
    signature: s.signature,
  };
  if (s.header && Object.keys(s.header).length > 0) out.header = s.header;
  return out;
}

/**
 * @param w - Wire extended agent card JSON
 * @returns Protobuf `AgentCard`
 */
export function wireAgentCardToProto(w: WireAgentCard): ProtoAgentCard {
  return create(AgentCardSchema, {
    name: w.name,
    description: w.description,
    supportedInterfaces: w.supportedInterfaces.map(wireAgentInterfaceToProto),
    provider: w.provider ? wireAgentProviderToProto(w.provider) : undefined,
    version: w.version,
    documentationUrl: w.documentationUrl,
    capabilities: wireCapabilitiesToProto(w.capabilities),
    securitySchemes: wireSecuritySchemesToProto(w.securitySchemes),
    securityRequirements: wireSecurityRequirementsToProto(
      w.securityRequirements,
    ),
    defaultInputModes: w.defaultInputModes,
    defaultOutputModes: w.defaultOutputModes,
    skills: w.skills.map(wireAgentSkillToProto),
    signatures: (w.signatures ?? []).map(wireSignatureToProto),
    iconUrl: w.iconUrl,
  });
}

/**
 * @param p - Protobuf agent card
 * @returns Wire card with optional sections omitted when empty
 */
export function protoAgentCardToWire(p: ProtoAgentCard): WireAgentCard {
  const out: WireAgentCard = {
    supportedInterfaces: p.supportedInterfaces.map(protoAgentInterfaceToWire),
    capabilities: protoCapabilitiesToWire(p.capabilities),
    defaultInputModes: [...p.defaultInputModes],
    defaultOutputModes: [...p.defaultOutputModes],
    description: p.description,
    name: p.name,
    skills: p.skills.map(protoAgentSkillToWire),
    version: p.version,
  };
  if (p.provider) out.provider = protoAgentProviderToWire(p.provider);
  if (p.documentationUrl) out.documentationUrl = p.documentationUrl;
  const ss = protoSecuritySchemesToWire(p.securitySchemes);
  if (ss && Object.keys(ss).length > 0) out.securitySchemes = ss;
  const sr = protoSecurityRequirementsToWire(p.securityRequirements);
  if (sr?.length) out.securityRequirements = sr;
  if (p.signatures?.length)
    out.signatures = p.signatures.map(protoSignatureToWire);
  if (p.iconUrl) out.iconUrl = p.iconUrl;
  return out;
}
