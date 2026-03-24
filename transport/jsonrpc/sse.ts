import type { JsonRpcResponse } from "./types";
import { createProtocolError, JsonRpcTransportError } from "./errors";

/**
 * Parsed SSE frame structure.
 *
 * An SSE frame is a block of lines terminated by a blank line (\n\n).
 * Supported fields:
 *   - data: JSON payload (multiple data lines are concatenated)
 *   - event: optional event type
 *   - id: optional event ID
 *   - : comment (ignored)
 */
interface SseFrame {
  /** Accumulated data payload. */
  data: string;
  /** Optional event type. */
  event?: string;
  /** Optional event ID. */
  id?: string;
}

/**
 * Parses a raw SSE fetch Response into an async generator of typed JSON-RPC
 * response objects.
 *
 * ## Flow
 *
 * 1. Read response body through TextDecoderStream
 * 2. Accumulate chunks, split on frame boundaries (\n\n or \r\n\r\n)
 * 3. For each complete frame: parse SSE fields → parse JSON → yield or throw
 * 4. Swallow AbortError so callers can cancel cleanly without a catch block
 *
 * ## Behavior
 *
 * - Handles partial chunks by accumulating lines across chunk boundaries
 * - Ignores comment lines (:) and empty frames
 * - Malformed JSON frames are skipped (e.g. keep-alive payloads)
 * - Error frames are terminal: throws typed JsonRpcProtocolError subclass
 *
 * @param response - A successful fetch Response with a readable body
 * @throws {JsonRpcTransportError} On null body or stream read failures
 * @throws {JsonRpcProtocolError} On JSON-RPC error frames (terminal)
 */
export async function* readSseStream<T>(
  response: Response,
): AsyncGenerator<JsonRpcResponse<T>> {
  if (!response.body) {
    throw new JsonRpcTransportError(
      "Response body is null — cannot read SSE stream",
    );
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

  // Accumulates characters between \n\n frame boundaries.
  let buffer = "";

  try {
    while (true) {
      let done: boolean;
      let value: string | undefined;

      try {
        ({ done, value } = await reader.read());
      } catch (cause) {
        // Swallow AbortError — caller intentionally cancelled the stream.
        if (isAbortError(cause)) return;
        throw new JsonRpcTransportError(
          `SSE stream read error: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }

      if (done) break;

      buffer += value;

      // Frames are delimited by a blank line (\n\n or \r\n\r\n).
      // We split on double-newline and process all complete frames,
      // keeping any trailing incomplete frame in the buffer.
      const frames = buffer.split(/\n\n|\r\n\r\n/);
      // Last element is the incomplete tail (may be empty string)
      buffer = frames.pop() ?? "";

      for (const rawFrame of frames) {
        const frame = parseFrame(rawFrame);
        if (!frame) continue; // empty or comment-only frame

        yield* processFrame<T>(frame);
      }
    }

    // Process any remaining buffered content after stream closes.
    if (buffer.trim()) {
      const frame = parseFrame(buffer);
      if (frame) yield* processFrame<T>(frame);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parses raw SSE frame text into a structured SseFrame.
 *
 * Per SSE spec: field names are case-sensitive; value has leading space stripped.
 * Multiple `data:` lines are concatenated with newlines.
 *
 * @param raw - Raw frame text (lines before the blank delimiter)
 * @returns Parsed frame or null for empty/comment-only frames
 */
function parseFrame(raw: string): SseFrame | null {
  const frame: SseFrame = { data: "" };
  let hasData = false;

  for (const line of raw.split(/\n|\r\n/)) {
    if (!line || line.startsWith(":")) continue; // empty line or comment

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue; // malformed line, skip

    const field = line.slice(0, colonIdx).trim();
    // Per SSE spec, strip exactly one leading space after the colon if present.
    const val = line.slice(colonIdx + 1).replace(/^ /, "");

    switch (field) {
      case "data":
        // Multiple data lines are concatenated with newlines (SSE: multi-line `data` fields).
        frame.data = frame.data ? `${frame.data}\n${val}` : val;
        hasData = true;
        break;
      case "event":
        frame.event = val;
        break;
      case "id":
        frame.id = val;
        break;
    }
  }

  return hasData ? frame : null;
}

/**
 * Parses an SSE frame's data as a JSON-RPC response and yields it.
 *
 * - Successful responses are yielded to the caller
 * - Error responses throw a typed protocol error (via createProtocolError)
 * - Malformed JSON is skipped (no yield, no throw)
 *
 * @throws {JsonRpcProtocolError} When frame contains a JSON-RPC error object
 */
function* processFrame<T>(frame: SseFrame): Generator<JsonRpcResponse<T>> {
  let parsed: JsonRpcResponse<T>;

  try {
    parsed = JSON.parse(frame.data);
  } catch {
    // Malformed JSON — skip non-JSON frames (e.g. keep-alive data payloads).
    return;
  }

  if (parsed.error) {
    // An error frame is terminal — throw so the caller's for-await catches it.
    throw createProtocolError(parsed.error);
  }

  yield parsed;
}

/**
 * @param err - Caught exception from `reader.read()` or similar
 * @returns Whether `err` is a user abort (stream should end quietly)
 */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}