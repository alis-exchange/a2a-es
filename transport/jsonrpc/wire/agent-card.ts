import type { JsonObject } from "./json";

/** Parameters for the `GetExtendedAgentCard` JSON-RPC method. */
export interface GetExtendedAgentCardRequest {
  tenant?: string;
}

/** Declared optional capabilities of an agent. */
export interface AgentCapabilities {
  extensions?: AgentExtension[];
  pushNotifications?: boolean;
  streaming?: boolean;
  extendedAgentCard?: boolean;
}

/** Declaration of a protocol extension. */
export interface AgentExtension {
  description?: string;
  params?: JsonObject;
  required?: boolean;
  uri?: string;
}

/** Transport protocol binding at an interface URL (open string; e.g. `JSONRPC`, `GRPC`). */
export type TransportProtocol = string;

/** Protocol version string (e.g. `1.0`). */
export type ProtocolVersion = string;

/** A supported URL and protocol binding for the agent. */
export interface AgentInterface {
  url: string;
  protocolBinding: TransportProtocol;
  tenant?: string;
  protocolVersion: ProtocolVersion;
}

/** Service provider metadata (`organization` in JSON). */
export interface AgentProvider {
  organization: string;
  url: string;
}

/** A skill exposed by the agent. */
export interface AgentSkill {
  description: string;
  examples?: string[];
  id: string;
  inputModes?: string[];
  name: string;
  outputModes?: string[];
  securityRequirements?: SecurityRequirementsOptions;
  tags: string[];
}

/** JWS signature block for an agent card. */
export interface AgentCardSignature {
  header?: JsonObject;
  protected: string;
  signature: string;
}

/**
 * Security requirements list: each item has a `schemes` map from scheme name to required scopes.
 */
export type SecurityRequirementsOptions = Array<{
  schemes: Record<string, string[]>;
}>;

/**
 * Named security scheme definitions (OpenAPI-style); keys are scheme names.
 */
export type NamedSecuritySchemes = Record<string, unknown>;

/** Self-describing agent manifest. */
export interface AgentCard {
  supportedInterfaces: AgentInterface[];
  capabilities: AgentCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  description: string;
  documentationUrl?: string;
  iconUrl?: string;
  name: string;
  provider?: AgentProvider;
  securityRequirements?: SecurityRequirementsOptions;
  securitySchemes?: NamedSecuritySchemes;
  signatures?: AgentCardSignature[];
  skills: AgentSkill[];
  version: string;
}