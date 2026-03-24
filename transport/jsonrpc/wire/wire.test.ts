import { describe, expect, it } from "vitest";
import type {
  CreateTaskPushConfigRequest,
  Part,
  PartData,
  PartRaw,
  PartText,
  PartUrl,
  SendMessageRequest,
} from "./index";

/** Golden part payloads for the JSON-RPC wire format (flattened `text` / `raw` / `data` / `url`). */
const PARTS_JSON = [
  `{"text":"hello, world"}`,
  `{"data":{"foo":"bar"}}`,
  `{"filename":"foo","url":"https://cats.com/1.png"}`,
  `{"filename":"foo","mediaType":"image/png","raw":"//4="}`,
  `{"metadata":{"foo":"bar"},"text":"42"}`,
];

describe("JSON-RPC wire types", () => {
  it("round-trips Part JSON (flattened content fields)", () => {
    const parsed: Part[] = PARTS_JSON.map((s) => JSON.parse(s) as Part);
    expect(parsed).toHaveLength(5);
    expect(parsed[0].text).toBe("hello, world");
    expect(parsed[1].data).toEqual({ foo: "bar" });
    expect(parsed[2].url).toBe("https://cats.com/1.png");
    expect(parsed[3].raw).toBe("//4=");
    for (let i = 0; i < PARTS_JSON.length; i++) {
      expect(JSON.stringify(parsed[i])).toBe(PARTS_JSON[i]);
    }
  });

  it("Part union is discriminated (exactly one of text | data | raw | url)", () => {
    const text: PartText = { text: "x" };
    const data: PartData = { data: { n: 1 } };
    const raw: PartRaw = { raw: "YQo=" };
    const url: PartUrl = { url: "https://example.com/a.png", mediaType: "image/png" };
    const parts: Part[] = [text, data, raw, url];
    expect(parts.every((p) => "text" in p || "data" in p || "raw" in p || "url" in p)).toBe(
      true,
    );
    const onlyTextKeys = Object.keys(text);
    expect(onlyTextKeys).toEqual(["text"]);
  });

  it("SendMessageRequest uses wire field names (not protobuf AsObject)", () => {
    const req: SendMessageRequest = {
      tenant: "",
      configuration: {
        acceptedOutputModes: ["text/plain"],
        returnImmediately: true,
        historyLength: 3,
      },
      message: {
        messageId: "m1",
        role: "ROLE_USER",
        parts: [{ text: "hi" } satisfies PartText],
      },
    };
    const json = JSON.stringify(req);
    const o = JSON.parse(json) as Record<string, unknown>;
    expect(o.configuration).toBeDefined();
    const cfg = o.configuration as Record<string, unknown>;
    expect(cfg.acceptedOutputModes).toEqual(["text/plain"]);
    expect(cfg.returnImmediately).toBe(true);
    expect(cfg.historyLength).toBe(3);
    expect("acceptedOutputModesList" in cfg).toBe(false);
    expect("blocking" in cfg).toBe(false);
    const msg = o.message as Record<string, unknown>;
    expect(msg.parts).toEqual([{ text: "hi" }]);
    expect("partsList" in msg).toBe(false);
  });

  it("CreateTaskPushConfigRequest uses nested config (not flat TaskPushNotificationConfig)", () => {
    const req: CreateTaskPushConfigRequest = {
      tenant: "t1",
      taskId: "task-1",
      config: {
        id: "cfg-1",
        url: "https://example.com/push",
        token: "tok",
        authentication: { scheme: "Bearer", credentials: "x" },
      },
    };
    const o = JSON.parse(JSON.stringify(req)) as Record<string, unknown>;
    expect(o.taskId).toBe("task-1");
    expect(o.config).toBeDefined();
    expect((o.config as { url: string }).url).toBe("https://example.com/push");
  });
});
