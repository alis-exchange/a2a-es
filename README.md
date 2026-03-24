# @alis-build/a2a-es

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TypeScript types and a **JSON-RPC 2.0** client for the **Agent-to-Agent (A2A)** API: unary requests (single JSON response) and **Server-Sent Events (SSE)** streaming for live updates.

## Requirements

- **Runtime**: `fetch`, `TextDecoderStream`, and `AbortSignal` (e.g. **Node.js 18+** or modern browsers).
- **Types**: Request/response payloads for the client are defined in `transport/jsonrpc/wire` as the **A2A JSON-RPC wire format** (what a conforming server expects on the wire). They differ from the **Connect / `@bufbuild/protobuf`** message shapes under `lf/a2a/v1/` (field names, nesting, and optional `SendMessageConfiguration` fields such as `blocking` vs wire `returnImmediately`).

## Installation

```bash
npm install @alis-build/a2a-es
# or
pnpm add @alis-build/a2a-es
```

Use the published package entry points from `package.json` (or your bundler’s resolution). When working from a checkout, import the client relative to `transport/jsonrpc`:

```typescript
import { A2AClient } from "./transport/jsonrpc";
```

## Quick start

```typescript
import { A2AClient } from "./transport/jsonrpc";

const client = new A2AClient({
  baseUrl: "https://agent.example.com/jsonrpc",
  getToken: async () => "your-bearer-token", // optional
  extensionUris: ["https://agent.example.com/extensions"], // optional
  extraHeaders: { "X-Custom-Header": "value" }, // optional
});

// Unary — one JSON-RPC response (wire-format fields: `parts`, `acceptedOutputModes`, `returnImmediately`, …)
const response = await client.sendMessage({
  tenant: "",
  message: {
    messageId: "00000000-0000-7000-0000-000000000001",
    role: "ROLE_USER",
    parts: [{ text: "Hello" }],
  },
  configuration: {
    acceptedOutputModes: ["text/plain"],
    returnImmediately: true,
  },
});

// Streaming — SSE `data:` lines parsed as JSON-RPC; iterator yields each **result** payload
const controller = new AbortController();
for await (const event of client.sendStreamingMessage(
  {
    tenant: "",
    message: {
      messageId: "00000000-0000-7000-0000-000000000002",
      role: "ROLE_USER",
      parts: [{ text: "Hello" }],
    },
    configuration: {
      acceptedOutputModes: ["text/plain"],
      returnImmediately: false,
    },
  },
  controller.signal,
)) {
  console.log(event);
}
// controller.abort() ends the stream without treating it as a hard failure
```

## `A2AClient` methods

| Method                             | JSON-RPC method                    | Mode                       |
| ---------------------------------- | ---------------------------------- | -------------------------- |
| `sendMessage`                      | `SendMessage`                      | Unary                      |
| `getTask`                          | `GetTask`                          | Unary                      |
| `listTasks`                        | `ListTasks`                        | Unary                      |
| `cancelTask`                       | `CancelTask`                       | Unary                      |
| `getTaskPushNotificationConfig`    | `GetTaskPushNotificationConfig`    | Unary                      |
| `createTaskPushNotificationConfig` | `CreateTaskPushNotificationConfig` | Unary                      |
| `listTaskPushNotificationConfigs`  | `ListTaskPushNotificationConfigs`  | Unary                      |
| `deleteTaskPushNotificationConfig` | `DeleteTaskPushNotificationConfig` | Unary                      |
| `getExtendedAgentCard`             | `GetExtendedAgentCard`             | Unary                      |
| `sendStreamingMessage`             | `SendStreamingMessage`             | Streaming (async iterator) |
| `subscribeToTask`                  | `SubscribeToTask`                  | Streaming (async iterator) |

Push-notification methods use the same JSON-RPC names as the protobuf RPCs, but **request bodies** follow the JSON-RPC wire shape (e.g. `createTaskPushNotificationConfig` expects `{ taskId, config }`, not a flat protobuf `AsObject`).

## Transport (`transport/jsonrpc`)

### Architecture

```
A2AClient
├── request()  → POST JSON body → parse JSON → return `result` (or throw on `error`)
└── stream()   → POST JSON body → readSseStream() → each SSE `data:` JSON-RPC success → yield `result`
```

Non-JSON or keep-alive `data:` chunks are ignored. A JSON-RPC `error` object in a frame throws a `JsonRpcProtocolError` subclass and ends the stream.

### Errors

| Class                   | When                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `JsonRpcTransportError` | Network failure, non-2xx HTTP, invalid JSON body, SSE read errors. Optional `status`. |
| `JsonRpcProtocolError`  | JSON-RPC `error` in the response. Subclasses by `code`:                               |

| Subclass                            | Code   |
| ----------------------------------- | ------ |
| `TaskNotFoundError`                 | -32001 |
| `TaskNotCancelableError`            | -32002 |
| `PushNotificationNotSupportedError` | -32003 |
| `UnsupportedOperationError`         | -32004 |
| `ContentTypeNotSupportedError`      | -32005 |
| `InvalidAgentResponseError`         | -32006 |
| `ExtendedCardNotConfiguredError`    | -32007 |
| `UnauthenticatedError`              | -31401 |
| `UnauthorizedError`                 | -31403 |

Use `createProtocolError(raw)` if you need the same mapping from a raw `JsonRpcError`.

### Exports

The barrel re-exports **all wire types** (`export type * from "./wire"`), so you can import request/result shapes, `Part` variants, push config types, and agent card types from the same entry as the client.

```typescript
import {
  A2AClient,
  createProtocolError,
  JsonRpcProtocolError,
  JsonRpcTransportError,
  TaskNotFoundError,
  TaskNotCancelableError,
  PushNotificationNotSupportedError,
  UnsupportedOperationError,
  ContentTypeNotSupportedError,
  InvalidAgentResponseError,
  ExtendedCardNotConfiguredError,
  UnauthenticatedError,
  UnauthorizedError,
} from "./transport/jsonrpc";

import type {
  A2AClientConfig,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  SendMessageRequest,
  StreamResponse,
  Task,
  Part,
  PartText,
} from "./transport/jsonrpc";
```

### Connect / Protobuf vs JSON-RPC types

| Use case                               | Types                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JSON-RPC client** (`A2AClient`)      | Wire types from `./transport/jsonrpc` (e.g. `SendMessageRequest`, `Task`, `StreamResponse`). These match the **A2A JSON-RPC** payloads your server accepts.                                 |
| **Connect-Web / `@bufbuild/protobuf`** | Generated stubs under `lf/a2a/v1/` (`a2a_pb.js` / `a2a_pb.d.ts`, `a2a_connect.js`) — `Message` types from `@bufbuild/protobuf`, camelCase fields, different nesting than the JSON-RPC wire. |

Do not pass Connect/protobuf message trees directly to `A2AClient` methods: field names and shapes differ (e.g. wire `parts` and `configuration.returnImmediately` vs generated `blocking`, wire `pushNotificationConfig` vs protobuf `taskPushNotificationConfig`, nested `config` on create-push requests).

**Parts:** JSON-RPC uses one flat object per part with exactly one of `text`, `data`, `raw` (base64 string), or `url`, plus optional `metadata`, `filename`, and `mediaType`. TypeScript models this as `Part` (`PartText` \| `PartData` \| `PartRaw` \| `PartUrl`), not the protobuf oneof layout.

## Project layout

| Path                 | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `lf/a2a/v1/`         | Generated **protoc-gen-es** + **Connect** stubs (A2A API) for web/Connect |
| `transport/jsonrpc/` | JSON-RPC client, SSE parser, errors, **wire types** (`wire/`)             |

## Development

Wire-type tests live under `transport/**/*.test.ts` and use [Vitest](https://vitest.dev/):

```bash
pnpm install
pnpm test
```

## Dependencies (package)

- `@bufbuild/protobuf` — generated message types and codegen support
- `@connectrpc/connect` / `@connectrpc/connect-web` — Connect-RPC client stubs in `lf/a2a/v1/`
- `@alis-build/common-es` — shared Alis Build ECMAScript utilities

The JSON-RPC client itself only uses standard Web APIs (`fetch`, streams).

## License

See [LICENSE](./LICENSE).
