import { create, equals, fromJson } from "@bufbuild/protobuf";
import { protoInt64 } from "@bufbuild/protobuf";
import {
  timestampFromDate,
  TimestampSchema,
  ValueSchema,
} from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import {
  ArtifactSchema,
  ListTasksRequestSchema,
  MessageSchema,
  PartSchema,
  Role,
  SendMessageConfigurationSchema,
  SendMessageRequestSchema,
  StreamResponseSchema,
  TaskArtifactUpdateEventSchema,
  TaskPushNotificationConfigSchema,
  TaskSchema,
  TaskState,
  TaskStatusSchema,
  TaskStatusUpdateEventSchema,
} from "@alis-build/common-es/lf/a2a/v1/a2a_pb.js";
import type {
  Part as WirePart,
  SendMessageRequest as WireSendMessageRequest,
} from "../wire";
import {
  protoRoleToWire,
  protoTaskStateToWire,
  wireRoleToProto,
  wireTaskStateToProto,
} from "./enums";
import { protoPartToWire, wirePartToProto } from "./part";
import {
  protoSendMessageConfigToWire,
  wireSendMessageConfigToProto,
} from "./send-message-config";
import {
  protoListTasksRequestToWire,
  protoSendMessageRequestToWire,
  protoTaskPushNotificationConfigToCreateWire,
  wireCreateTaskPushNotificationConfigToProto,
  wireListTasksRequestToProto,
  wireSendMessageRequestToProto,
} from "./requests";
import {
  protoStreamResponseToWire,
  wireStreamResponseToProto,
} from "./stream-response";
import { protoTaskToWire, wireTaskToProto } from "./task";
import { protoTimestampToWire, wireTimestampToProto } from "./timestamp";

const PARTS_WIRE_JSON = [
  `{"text":"hello, world"}`,
  `{"data":{"foo":"bar"}}`,
  `{"filename":"foo","url":"https://cats.com/1.png"}`,
  `{"filename":"foo","mediaType":"image/png","raw":"//4="}`,
  `{"metadata":{"foo":"bar"},"text":"42"}`,
];

describe("proto ↔ wire converters", () => {
  it("round-trips Part wire JSON through proto", () => {
    for (const s of PARTS_WIRE_JSON) {
      const wire = JSON.parse(s) as WirePart;
      const proto = wirePartToProto(wire);
      const back = protoPartToWire(proto);
      expect(back).toEqual(JSON.parse(s));
    }
  });

  it("Part proto round-trip preserves text", () => {
    const p = create(PartSchema, {
      content: { case: "text", value: "x" },
      filename: "",
      mediaType: "",
    });
    const w = protoPartToWire(p);
    const p2 = wirePartToProto(w);
    expect(equals(PartSchema, p, p2)).toBe(true);
  });

  it("Role and TaskState string ↔ enum", () => {
    expect(wireRoleToProto("ROLE_USER")).toBe(Role.USER);
    expect(protoRoleToWire(Role.AGENT)).toBe("ROLE_AGENT");
    expect(wireTaskStateToProto("TASK_STATE_COMPLETED")).toBe(
      TaskState.COMPLETED,
    );
    expect(protoTaskStateToWire(TaskState.WORKING)).toBe("TASK_STATE_WORKING");
  });

  it("round-trips SendMessageConfiguration returnImmediately", () => {
    const p = wireSendMessageConfigToProto({
      acceptedOutputModes: ["text/plain"],
      returnImmediately: true,
      historyLength: 2,
    });
    expect(p.returnImmediately).toBe(true);
    const out = protoSendMessageConfigToWire(p);
    expect(out.returnImmediately).toBe(true);
    expect(out.acceptedOutputModes).toEqual(["text/plain"]);
    expect(out.historyLength).toBe(2);
  });

  it("returnImmediately false is preserved on proto", () => {
    const p = wireSendMessageConfigToProto({
      returnImmediately: false,
    });
    expect(p.returnImmediately).toBe(false);
    expect(protoSendMessageConfigToWire(p).returnImmediately).toBe(false);
  });

  it("SendMessageRequest wire field names (no blocking, no *List keys)", () => {
    const proto = create(SendMessageRequestSchema, {
      tenant: "",
      message: create(MessageSchema, {
        messageId: "m1",
        role: Role.USER,
        parts: [
          create(PartSchema, {
            content: { case: "text", value: "hi" },
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
        historyLength: 3,
      }),
    });
    const wire = protoSendMessageRequestToWire(proto);
    const json = JSON.stringify(wire);
    const o = JSON.parse(json) as Record<string, unknown>;
    const cfg = o.configuration as Record<string, unknown>;
    expect(cfg.returnImmediately).toBe(true);
    expect(cfg.historyLength).toBe(3);
    expect("blocking" in cfg).toBe(false);
    expect("acceptedOutputModesList" in cfg).toBe(false);
    const msg = o.message as Record<string, unknown>;
    expect(msg.parts).toEqual([{ text: "hi" }]);
    expect("partsList" in msg).toBe(false);
  });

  it("round-trips SendMessageRequest proto → wire → proto (data part)", () => {
    const protoIn = create(SendMessageRequestSchema, {
      tenant: "t1",
      message: create(MessageSchema, {
        messageId: "mid",
        role: Role.USER,
        parts: [
          create(PartSchema, {
            content: { case: "data", value: fromJson(ValueSchema, { n: 1 }) },
            filename: "",
            mediaType: "",
          }),
        ],
        contextId: "",
        taskId: "",
        extensions: [],
        referenceTaskIds: [],
      }),
    });
    const wire = protoSendMessageRequestToWire(protoIn);
    const protoOut = wireSendMessageRequestToProto(
      wire as WireSendMessageRequest,
    );
    expect(protoOut.tenant).toBe("t1");
    expect(protoOut.message?.messageId).toBe("mid");
    expect(protoOut.message?.parts.length).toBe(1);
    expect(protoOut.message?.parts[0]?.content.case).toBe("data");
  });

  it("CreateTaskPushNotificationConfig: flat proto ↔ nested wire", () => {
    const protoIn = create(TaskPushNotificationConfigSchema, {
      tenant: "ten",
      taskId: "task-1",
      id: "cfg-1",
      url: "https://example.com/push",
      token: "tok",
    });
    const wire = protoTaskPushNotificationConfigToCreateWire(protoIn);
    expect(wire.taskId).toBe("task-1");
    expect(wire.config.url).toBe("https://example.com/push");
    expect(wire.config.token).toBe("tok");
    const protoOut = wireCreateTaskPushNotificationConfigToProto(wire);
    expect(protoOut.taskId).toBe("task-1");
    expect(protoOut.url).toBe("https://example.com/push");
  });

  it("Timestamp ↔ RFC3339", () => {
    const ts = timestampFromDate(new Date("2023-10-27T10:00:00.000Z"));
    const s = protoTimestampToWire(ts);
    expect(s).toBe("2023-10-27T10:00:00.000Z");
    const ts2 = wireTimestampToProto(s!);
    expect(ts2.seconds).toEqual(ts.seconds);
  });

  it("ListTasksRequest statusTimestampAfter", () => {
    const protoIn = create(ListTasksRequestSchema, {
      tenant: "",
      contextId: "",
      status: TaskState.SUBMITTED,
      pageToken: "",
      statusTimestampAfter: create(TimestampSchema, {
        seconds: protoInt64.parse(1698400800),
        nanos: 0,
      }),
    });
    const wire = protoListTasksRequestToWire(protoIn);
    expect(wire.status).toBe("TASK_STATE_SUBMITTED");
    expect(wire.statusTimestampAfter).toBe("2023-10-27T10:00:00.000Z");
    const back = wireListTasksRequestToProto(wire);
    expect(back.status).toBe(TaskState.SUBMITTED);
  });

  it("StreamResponse branches: task and message", () => {
    const taskWire = protoStreamResponseToWire(
      create(StreamResponseSchema, {
        payload: {
          case: "task",
          value: create(TaskSchema, {
            id: "t1",
            contextId: "c1",
            status: create(TaskStatusSchema, {
              state: TaskState.WORKING,
            }),
            artifacts: [],
            history: [],
          }),
        },
      }),
    );
    expect(taskWire.task?.id).toBe("t1");
    const protoBack = wireStreamResponseToProto(taskWire);
    expect(protoBack.payload.case).toBe("task");

    const msgWire = protoStreamResponseToWire(
      create(StreamResponseSchema, {
        payload: {
          case: "message",
          value: create(MessageSchema, {
            messageId: "m1",
            role: Role.AGENT,
            parts: [],
            contextId: "",
            taskId: "",
            extensions: [],
            referenceTaskIds: [],
          }),
        },
      }),
    );
    expect(msgWire.message?.messageId).toBe("m1");
    expect(wireStreamResponseToProto(msgWire).payload.case).toBe("message");

    const statusWire = protoStreamResponseToWire(
      create(StreamResponseSchema, {
        payload: {
          case: "statusUpdate",
          value: create(TaskStatusUpdateEventSchema, {
            taskId: "t1",
            contextId: "c1",
            status: create(TaskStatusSchema, { state: TaskState.WORKING }),
          }),
        },
      }),
    );
    expect(statusWire.statusUpdate?.taskId).toBe("t1");
    expect(wireStreamResponseToProto(statusWire).payload.case).toBe(
      "statusUpdate",
    );

    const artWire = protoStreamResponseToWire(
      create(StreamResponseSchema, {
        payload: {
          case: "artifactUpdate",
          value: create(TaskArtifactUpdateEventSchema, {
            taskId: "t1",
            contextId: "c1",
            artifact: create(ArtifactSchema, {
              artifactId: "a1",
              name: "",
              description: "",
              parts: [],
              extensions: [],
            }),
            append: true,
            lastChunk: false,
          }),
        },
      }),
    );
    expect(artWire.artifactUpdate?.artifact?.artifactId).toBe("a1");
    expect(wireStreamResponseToProto(artWire).payload.case).toBe(
      "artifactUpdate",
    );
  });

  it("Task round-trip with history", () => {
    const protoIn = create(TaskSchema, {
      id: "tid",
      contextId: "cid",
      status: create(TaskStatusSchema, { state: TaskState.COMPLETED }),
      artifacts: [],
      history: [
        create(MessageSchema, {
          messageId: "h1",
          role: Role.USER,
          parts: [
            create(PartSchema, {
              content: { case: "text", value: "h" },
              filename: "",
              mediaType: "",
            }),
          ],
          contextId: "",
          taskId: "",
          extensions: [],
          referenceTaskIds: [],
        }),
      ],
    });
    const wire = protoTaskToWire(protoIn);
    const protoOut = wireTaskToProto(wire);
    expect(protoOut.id).toBe("tid");
    expect(protoOut.history.length).toBe(1);
  });
});