# @alis-build/a2a-es

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TypeScript types and a **JSON-RPC 2.0** client for the **Agent-to-Agent (A2A)** API: unary requests (single JSON response) and **Server-Sent Events (SSE)** streaming for live updates.

## Requirements

- **Runtime**: `fetch`, `TextDecoderStream`, and `AbortSignal` (e.g. **Node.js 18+** or modern browsers).
- **Types**: `A2AClient` methods use **protobuf message types** from `lf/a2a/v1/a2a_pb` (`@bufbuild/protobuf` `create()` / message instances). The client converts to the **JSON-RPC wire format** in `transport/jsonrpc/wire` before sending JSON (see `transport/jsonrpc/converters`). Wire types still differ for: flattened `Part`, nested push `config` vs flat `TaskPushNotificationConfig`, string timestamps vs `google.protobuf.Timestamp`, string task-state labels vs enums. Send-message configuration uses the same **`returnImmediately`** field name as in current `@alis-build/common-es` stubs (older `.proto` shapes used `blocking`, inverted vs wire).

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
import { create } from "@bufbuild/protobuf";
import {
  MessageSchema,
  PartSchema,
  Role,
  SendMessageConfigurationSchema,
  SendMessageRequestSchema,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js"; // or a local `lf/` re-export in your repo
import { A2AClient } from "./transport/jsonrpc";

const client = new A2AClient({
  baseUrl: "https://agent.example.com/jsonrpc",
  getToken: async () => "your-bearer-token", // optional
  extensionUris: ["https://agent.example.com/extensions"], // optional
  extraHeaders: { "X-Custom-Header": "value" }, // optional
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
  controller.signal,
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

The client still calls the same JSON-RPC methods; **on the wire**, push create uses `{ taskId, config }`. The **TypeScript** API for `createTaskPushNotificationConfig` matches the protobuf RPC: a single `TaskPushNotificationConfig` message (flat `taskId`, `url`, `token`, …).

## Documentation (API reference)

Public APIs under `transport/jsonrpc` are documented with **JSDoc** on the `A2AClient`, configuration and JSON-RPC types (`types.ts`), errors, SSE reader, **wire** interfaces (`wire/`), and every **converter** (`converters/*.ts`). Method parameters use `@param`, return types `@returns`, and failure modes `@throws` where it helps.

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
} from "./transport/jsonrpc";

import type {
  A2AClientConfig,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./transport/jsonrpc";
// Wire escape hatch (JSON shapes), e.g. PartText, StreamResponse as on the wire:
import type { PartText, StreamResponse as WireStreamResponse } from "./transport/jsonrpc";
```

### Wire vs protobuf (cheat sheet)

| Topic | Wire (`transport/jsonrpc/wire`) | Protobuf (`lf/a2a/v1`) |
| ----- | ------------------------------- | ------------------------ |
| Send config | `returnImmediately` | `returnImmediately` (same in current stubs; legacy proto used `blocking`, inverted) |
| Push in send config | `pushNotificationConfig` | `taskPushNotificationConfig` |
| Create push RPC body | `{ taskId, config: PushConfig }` | `TaskPushNotificationConfig` (flat) |
| Part content | One of top-level `text` / `data` / `raw` / `url` | `content` oneof (`case` + `value`) |
| Task state / role | Strings (`TASK_STATE_*`, `ROLE_*`) | `TaskState` / `Role` enums |
| Timestamps (e.g. list filter) | RFC3339 string | `google.protobuf.Timestamp` |

**Parts on the wire:** one flat object per part with exactly one of `text`, `data`, `raw` (base64), or `url`. In protobuf, use `create(PartSchema, { content: { case: "text", value: "…" }, … })`.

## Project layout

| Path                 | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `lf/a2a/v1/`         | Generated **protoc-gen-es** + **Connect** stubs (A2A API) for web/Connect |
| `transport/jsonrpc/` | JSON-RPC client, SSE parser, errors, **wire types** (`wire/`), **converters** (`converters/`) |

## Development

Wire-type tests live under `transport/**/*.test.ts` and use [Vitest](https://vitest.dev/):

```bash
pnpm install
pnpm test
```

## Dependencies (package)

- `@bufbuild/protobuf` — generated message types and codegen support
- `@connectrpc/connect` / `@connectrpc/connect-web` — Connect-RPC client stubs in `lf/a2a/v1/` (when using that transport)
- `@alis-build/common-es` — A2A protobuf modules (`lf/a2a/v1/a2a_pb.js`) consumed by `A2AClient` and converters; keep this aligned with the proto revision you target (e.g. **^1.0.4** where dependency wiring was fixed)

The JSON-RPC client runtime uses standard Web APIs (`fetch`, streams). TypeScript types for requests/responses come from **protobuf** messages in `common-es`, not from the wire interfaces alone.

## License

See [LICENSE](./LICENSE).
