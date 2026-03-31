# @alis-build/a2a-es

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

TypeScript helpers for the **Agent-to-Agent (A2A)** API over **JSON-RPC 2.0**: a small **`A2AClient`** for unary POST/JSON calls and **Server-Sent Events (SSE)** streaming. This package does **not** ship generated protobuf or Connect stubs; request/response **types** come from **`@alis-build/common-es`** (`lf/a2a/v1/a2a_pb.js`), and this library converts between those protobuf-shaped values and the JSON-RPC wire format.

## Requirements

- **Runtime:** `fetch`, `TextDecoderStream`, and `AbortSignal` (e.g. **Node.js 18+** or modern browsers).
- **Types:** Install **`@alis-build/common-es`** and use **`@bufbuild/protobuf`** `create()` with the A2A schemas from `@alis-build/common-es/lf/a2a/v1/a2a_pb.js`. The client converts to the **JSON-RPC wire format** in `transport/jsonrpc/wire` before sending JSON (see `transport/jsonrpc/converters`). Wire shapes still differ from protobuf for: flattened `Part`, nested push `config` vs flat `TaskPushNotificationConfig`, string timestamps vs `google.protobuf.Timestamp`, string task-state labels vs enums. Send-message configuration uses **`returnImmediately`** as in current `@alis-build/common-es` stubs (older `.proto` shapes used `blocking`, inverted vs wire).

## Installation

```bash
npm install @alis-build/a2a-es @alis-build/common-es @bufbuild/protobuf
# or
pnpm add @alis-build/a2a-es @alis-build/common-es @bufbuild/protobuf
```

The package root re-exports the client (`package.json` `exports` → `transport/jsonrpc/index.ts`). From npm:

```typescript
import { A2AClient } from "@alis-build/a2a-es";
```

From a git checkout:

```typescript
import { A2AClient } from "./transport/jsonrpc";
```

## Quick start

```typescript
import { create } from "@bufbuild/protobuf";
import {
  MessageSchema,
  PartSchema,
  Role,
  SendMessageConfigurationSchema,
  SendMessageRequestSchema,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import { A2AClient } from "@alis-build/a2a-es";

const client = new A2AClient({
  baseUrl: "https://agent.example.com/jsonrpc",
  getToken: async () => "your-bearer-token", // optional
  callOptions: {
    extensionUris: ["https://agent.example.com/extensions"], // optional
    extraHeaders: { "X-Custom-Header": "value" }, // optional
  },
});

const response = await client.sendMessage(
  create(SendMessageRequestSchema, {
    tenant: "",
    message: create(MessageSchema, {
      messageId: "00000000-0000-7000-0000-000000000001",
      role: Role.USER,
      parts: [
        create(PartSchema, {
          content: { case: "text", value: "Hello" },
          filename: "",
          mediaType: "",
        }),
      ],
      contextId: "",
      taskId: "",
      extensions: [],
      referenceTaskIds: [],
    }),
    configuration: create(SendMessageConfigurationSchema, {
      acceptedOutputModes: ["text/plain"],
      returnImmediately: true,
    }),
  }),
);

const controller = new AbortController();
for await (const event of client.sendStreamingMessage(
  create(SendMessageRequestSchema, {
    tenant: "",
    message: create(MessageSchema, {
      messageId: "00000000-0000-7000-0000-000000000002",
      role: Role.USER,
      parts: [
        create(PartSchema, {
          content: { case: "text", value: "Hello" },
          filename: "",
          mediaType: "",
        }),
      ],
      contextId: "",
      taskId: "",
      extensions: [],
      referenceTaskIds: [],
    }),
    configuration: create(SendMessageConfigurationSchema, {
      acceptedOutputModes: ["text/plain"],
      returnImmediately: false,
    }),
  }),
  { signal: controller.signal },
)) {
  console.log(event);
}
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

The client calls the same JSON-RPC methods; **on the wire**, push create uses `{ taskId, config }`. The **TypeScript** API for `createTaskPushNotificationConfig` matches the protobuf RPC: a single `TaskPushNotificationConfig` message (flat `taskId`, `url`, `token`, …).

### Per-call options (`CallOptions`)

Every public method accepts an optional `CallOptions` argument that overrides the defaults set on `A2AClientConfig.callOptions` **for that request only**. For streaming methods (`sendStreamingMessage`, `subscribeToTask`) `callOptions` is part of the options bag alongside `signal`.

Each field uses **replace** semantics — if a per-call value is provided (including `null` or `[]`), it replaces the default entirely. Fields left `undefined` fall through to the default.

```typescript
import type { CallOptions } from "@alis-build/a2a-es";

// Use default extensions from config
await client.sendMessage(req);

// Override extensions for this call only
await client.sendMessage(req, {
  extensionUris: ["https://agent.example.com/extensions/other"],
});

// Suppress all extensions for this call
await client.sendMessage(req, { extensionUris: [] });

// Suppress all extra headers for this call
await client.sendMessage(req, { extraHeaders: null });

// Override extensions on a streaming call
for await (const event of client.sendStreamingMessage(req, {
  signal: controller.signal,
  callOptions: { extensionUris: [] },
})) {
  console.log(event);
}
```

## Documentation (API reference)

Public APIs under `transport/jsonrpc` are documented with **JSDoc** on `A2AClient`, configuration and JSON-RPC types (`types.ts`), errors, the SSE reader, **wire** interfaces (`wire/`), and **converters** (`converters/*.ts`). Method parameters use `@param`, return types `@returns`, and failure modes `@throws` where it helps.

If you generate HTML docs, point [TypeDoc](https://typedoc.org/) (or your toolchain) at the package entry that re-exports `./transport/jsonrpc` so `@packageDocumentation` in `index.ts` becomes the module overview.

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

The barrel re-exports **all wire types** (`export type * from "./wire"`) and **all converter functions** (`export * from "./converters"`) for building custom transports or tests.

```typescript
import {
  A2AClient,
  createProtocolError,
  protoSendMessageRequestToWire,
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
} from "@alis-build/a2a-es";

import type {
  A2AClientConfig,
  CallOptions,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@alis-build/a2a-es";
// Wire escape hatch (JSON shapes), e.g. PartText, StreamResponse as on the wire:
import type {
  PartText,
  StreamResponse as WireStreamResponse,
} from "@alis-build/a2a-es";
```

### Wire vs protobuf (cheat sheet)

Protobuf-shaped types here means the messages from **`@alis-build/common-es`** (`lf/a2a/v1`), not types defined only in this repo.

| Topic                         | Wire (`transport/jsonrpc/wire`)                  | Protobuf (`@alis-build/common-es` `lf/a2a/v1`)                                      |
| ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Send config                   | `returnImmediately`                              | `returnImmediately` (same in current stubs; legacy proto used `blocking`, inverted) |
| Push in send config           | `pushNotificationConfig`                         | `taskPushNotificationConfig`                                                        |
| Create push RPC body          | `{ taskId, config: PushConfig }`                 | `TaskPushNotificationConfig` (flat)                                                 |
| Part content                  | One of top-level `text` / `data` / `raw` / `url` | `content` oneof (`case` + `value`)                                                  |
| Task state / role             | Strings (`TASK_STATE_*`, `ROLE_*`)               | `TaskState` / `Role` enums                                                          |
| Timestamps (e.g. list filter) | RFC3339 string                                   | `google.protobuf.Timestamp`                                                         |

**Parts on the wire:** one flat object per part with exactly one of `text`, `data`, `raw` (base64), or `url`. In protobuf, use `create(PartSchema, { content: { case: "text", value: "…" }, … })`.

## Project layout

| Path                 | Purpose                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `transport/jsonrpc/` | JSON-RPC client, SSE parser, errors, **wire types** (`wire/`), **converters** (`converters/`) |

A2A **ES/protobuf stubs** (`a2a_pb`, services, etc.) live in the separate **`@alis-build/common-es`** package; install it next to this one.

## Development

Wire-type tests live under `transport/**/*.test.ts` and use [Vitest](https://vitest.dev/):

```bash
pnpm install
pnpm test
```

## Dependencies (this package)

- **`@alis-build/common-es`** — A2A protobuf modules (`lf/a2a/v1/a2a_pb.js`) used by `A2AClient` and converters; align its version with the proto revision you target.
- **`@bufbuild/protobuf`** — `create()` and message runtime used with those schemas.
- **`@connectrpc/connect`** / **`@connectrpc/connect-web`** — declared for compatibility with the same protobuf/Connect stack as `common-es` (this repo’s JSON-RPC client does not expose Connect transports).

The JSON-RPC client runtime uses standard Web APIs (`fetch`, streams). TypeScript types for requests/responses come from **`common-es`**, not from the wire interfaces alone.

## License

See [LICENSE](./LICENSE).
