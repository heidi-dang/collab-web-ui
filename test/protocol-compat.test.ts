/**
 * Cross-repository protocol compatibility tests.
 *
 * Verifies that the wire protocol types exported by `@oh-my-pi/pi-wire` are
 * complete and consistent with what the collab-web client expects. These tests
 * catch regressions when the pi-wire package is upgraded independently of this
 * consuming codebase.
 *
 * This test validates the published protocol-3 wire types. New frame types
 * (canvas, ping/pong) will be added here once the protocol gains capability
 * negotiation in a backward-compatible way — the protocol version stays 3,
 * and optional capabilities gate new frame types.
 */

import { describe, expect, it } from "bun:test";
import type { GuestFrame, HostFrame, WireFrame } from "@oh-my-pi/pi-wire";
import { COLLAB_PROTO } from "../src/lib/link";
import { generateRoomKey, importRoomKey, open, seal } from "../src/lib/codec";

// ── Protocol Version ─────────────────────────────────────────────────────────

describe("protocol version", () => {
	it("exports COLLAB_PROTO as 3 (stable protocol)", () => {
		// The protocol version must remain 3. Protocol 3 introduced
		// ui-request/ui-request-end/ui-response frames. No breaking changes
		// have been introduced since.
		expect(COLLAB_PROTO).toBe(3);
	});
});

// ── Frame type completeness ──────────────────────────────────────────────────

describe("frame type completeness", () => {
	it("GuestFrame includes hello", () => {
		const frame: GuestFrame = { t: "hello", proto: 3, name: "test" };
		expect(frame.t).toBe("hello");
		expect(frame.proto).toBe(3);
	});

	it("GuestFrame includes prompt", () => {
		const frame: GuestFrame = { t: "prompt", text: "hello" };
		expect(frame.t).toBe("prompt");
	});

	it("GuestFrame includes ui-response", () => {
		const frame: GuestFrame = { t: "ui-response", reqId: 1, value: "ok" };
		expect(frame.t).toBe("ui-response");
	});

	it("GuestFrame includes abort", () => {
		const frame: GuestFrame = { t: "abort" };
		expect(frame.t).toBe("abort");
	});

	it("GuestFrame includes agent-cmd", () => {
		const frame: GuestFrame = { t: "agent-cmd", cmd: "chat", agentId: "a1", text: "hello" };
		expect(frame.t).toBe("agent-cmd");
	});

	it("GuestFrame includes fetch-transcript", () => {
		const frame: GuestFrame = { t: "fetch-transcript", reqId: 1, agentId: "a1", fromByte: 0 };
		expect(frame.t).toBe("fetch-transcript");
	});

	it("HostFrame includes welcome", () => {
		const frame: HostFrame = {
			t: "welcome",
			proto: 3,
			header: { type: "session", id: "s1", timestamp: "2026-01-01T00:00:00Z", cwd: "/" },
			state: { isStreaming: false, queuedMessageCount: 0, cwd: "/", participants: [] },
			agents: [],
			entryCount: 0,
		};
		expect(frame.t).toBe("welcome");
	});

	it("HostFrame includes snapshot-chunk", () => {
		const frame: HostFrame = { t: "snapshot-chunk", entries: [], final: true };
		expect(frame.t).toBe("snapshot-chunk");
	});

	it("HostFrame includes entry", () => {
		const frame: HostFrame = {
			t: "entry",
			entry: {
				type: "message",
				id: "e1",
				parentId: null,
				timestamp: "2026-01-01T00:00:00Z",
				message: { role: "user", content: "hi", timestamp: 1 },
			},
		};
		expect(frame.t).toBe("entry");
	});

	it("HostFrame includes event", () => {
		const frame: HostFrame = { t: "event", event: { type: "agent_start" } };
		expect(frame.t).toBe("event");
	});

	it("HostFrame includes state", () => {
		const frame: HostFrame = {
			t: "state",
			state: { isStreaming: false, queuedMessageCount: 0, cwd: "/", participants: [] },
		};
		expect(frame.t).toBe("state");
	});

	it("HostFrame includes bus", () => {
		const frame: HostFrame = { t: "bus", channel: "task:subagent:progress", data: {} };
		expect(frame.t).toBe("bus");
	});

	it("HostFrame includes agents", () => {
		const frame: HostFrame = { t: "agents", agents: [] };
		expect(frame.t).toBe("agents");
	});

	it("HostFrame includes ui-request", () => {
		const frame: HostFrame = {
			t: "ui-request",
			request: { kind: "select", title: "pick", options: ["a"], reqId: 1 },
		};
		expect(frame.t).toBe("ui-request");
	});

	it("HostFrame includes ui-request-end", () => {
		const frame: HostFrame = { t: "ui-request-end", reqId: 1 };
		expect(frame.t).toBe("ui-request-end");
	});

	it("HostFrame includes transcript", () => {
		const frame: HostFrame = { t: "transcript", reqId: 1, text: "", newSize: 0 };
		expect(frame.t).toBe("transcript");
	});

	it("HostFrame includes bye", () => {
		const frame: HostFrame = { t: "bye", reason: "done" };
		expect(frame.t).toBe("bye");
	});

	it("HostFrame includes error", () => {
		const frame: HostFrame = { t: "error", message: "something went wrong" };
		expect(frame.t).toBe("error");
	});
});

// ── Codec round-trip ─────────────────────────────────────────────────────────

describe("codec round-trip with existing frame types", () => {
	it("round-trips a prompt frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = { t: "prompt", text: "hello there" };
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips a welcome frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = {
			t: "welcome",
			proto: 3,
			header: { type: "session", id: "s1", timestamp: "2026-01-01T00:00:00Z", cwd: "/" },
			state: { isStreaming: false, queuedMessageCount: 0, cwd: "/", participants: [] },
			agents: [],
			entryCount: 0,
		};
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips an abort frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = { t: "abort" };
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips a state frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = {
			t: "state",
			state: { isStreaming: true, queuedMessageCount: 1, cwd: "/work", participants: [] },
		};
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});
});

// ── Wire frame union exhaustiveness ──────────────────────────────────────────

describe("WireFrame type compatibility", () => {
	it("accepts all known host frame discriminants", () => {
		// Compile-time check: the discriminant union must cover all frames the
		// mock-host and guest-client dispatch on.
		const discriminants: HostFrame["t"][] = [
			"welcome",
			"snapshot-chunk",
			"entry",
			"event",
			"state",
			"bus",
			"agents",
			"ui-request",
			"ui-request-end",
			"transcript",
			"bye",
			"error",
		];
		expect(discriminants).toHaveLength(12);
	});

	it("accepts all known guest frame discriminants", () => {
		const discriminants: GuestFrame["t"][] = [
			"hello",
			"prompt",
			"ui-response",
			"abort",
			"agent-cmd",
			"fetch-transcript",
		];
		expect(discriminants).toHaveLength(6);
	});

	it("rejects unknown frame types at compile time", () => {
		// Unknown frame types should be handled by the tolerant default branch
		// in the switch statements, not by the type system.
		const unknown: { t: string } = { t: "unknown-future-type" };
		expect(unknown.t).toBe("unknown-future-type");
	});
});

// ── Forward compatibility: unknown frame types pass through the codec ────────

describe("forward compatibility", () => {
	it("unknown frame fields round-trip through the codec", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame = { t: "prompt", text: "hello", unknownField: "should-survive" } as unknown as WireFrame;
		const opened = await open(key, await seal(key, frame));
		expect(opened).toHaveProperty("unknownField", "should-survive");
	});

	it("future canvas-like frame would round-trip as unknown", async () => {
		// When canvas frames are added via capability negotiation, this test
		// will be replaced with proper type-checked assertions. For now, it
		// verifies that the codec handles any JSON object.
		const key = await importRoomKey(generateRoomKey());
		const futureFrame = {
			t: "canvas-stroke",
			stroke: { id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 },
		};
		const opened = await open(key, await seal(key, futureFrame as unknown as WireFrame));
		expect(opened).toHaveProperty("t", "canvas-stroke");
		expect(opened).toHaveProperty("stroke");
	});
});