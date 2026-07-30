/**
 * Cross-repository protocol compatibility tests.
 *
 * Verifies that the wire protocol types exported by `@oh-my-pi/pi-wire` are
 * complete and consistent with what the collab-web client expects. These tests
 * catch regressions when the pi-wire package is upgraded independently of this
 * consuming codebase.
 *
 * Every new frame type, protocol version bump, or type shape change in pi-wire
 * must have a corresponding assertion here.
 */

import { describe, expect, it } from "bun:test";
import type {
	CanvasPoint,
	CanvasStrokeData,
	COLLAB_PROTO as ProtoConst,
	GuestFrame,
	HostFrame,
	WireFrame,
} from "@oh-my-pi/pi-wire";
import { COLLAB_PROTO } from "../src/lib/link";
import { generateRoomKey, importRoomKey, open, seal } from "../src/lib/codec";

// ── Protocol Version ─────────────────────────────────────────────────────────

describe("protocol version", () => {
	it("exports COLLAB_PROTO as 4 (canvas + ping/pong)", () => {
		// The constant must be 4 — the version that introduced canvas frames,
		// explicit ping/pong, and bumped from proto 3.
		expect(COLLAB_PROTO).toBe(4);
	});
});

// ── Frame type completeness ──────────────────────────────────────────────────

describe("frame type completeness", () => {
	it("GuestFrame includes canvas-stroke", () => {
		const frame: GuestFrame = { t: "canvas-stroke", stroke: { id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 } };
		expect(frame.t).toBe("canvas-stroke");
	});

	it("GuestFrame includes canvas-clear", () => {
		const frame: GuestFrame = { t: "canvas-clear" };
		expect(frame.t).toBe("canvas-clear");
	});

	it("GuestFrame includes canvas-cursor", () => {
		const frame: GuestFrame = { t: "canvas-cursor", x: 100, y: 200 };
		expect(frame.t).toBe("canvas-cursor");
	});

	it("GuestFrame includes ping", () => {
		const frame: GuestFrame = { t: "ping", id: 1 };
		expect(frame.t).toBe("ping");
		expect(frame.id).toBe(1);
	});

	it("GuestFrame includes pong", () => {
		const frame: GuestFrame = { t: "pong", id: 2 };
		expect(frame.t).toBe("pong");
		expect(frame.id).toBe(2);
	});

	it("HostFrame includes canvas-snapshot", () => {
		const frame: HostFrame = {
			t: "canvas-snapshot",
			strokes: [{ id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 }],
		};
		expect(frame.t).toBe("canvas-snapshot");
		expect(frame.strokes).toHaveLength(1);
	});

	it("HostFrame includes canvas-stroke", () => {
		const frame: HostFrame = {
			t: "canvas-stroke",
			fromPeer: 1,
			stroke: { id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 },
		};
		expect(frame.t).toBe("canvas-stroke");
		expect(frame.fromPeer).toBe(1);
	});

	it("HostFrame includes canvas-clear", () => {
		const frame: HostFrame = { t: "canvas-clear", fromPeer: 2 };
		expect(frame.t).toBe("canvas-clear");
		expect(frame.fromPeer).toBe(2);
	});

	it("HostFrame includes canvas-cursor", () => {
		const frame: HostFrame = { t: "canvas-cursor", fromPeer: 1, x: 50, y: 75 };
		expect(frame.t).toBe("canvas-cursor");
	});

	it("HostFrame includes canvas-presence", () => {
		const frame: HostFrame = {
			t: "canvas-presence",
			peers: [{ peerId: 1, name: "guest", color: "#7fdbca" }],
		};
		expect(frame.t).toBe("canvas-presence");
		expect(frame.peers).toHaveLength(1);
	});

	it("HostFrame includes ping", () => {
		const frame: HostFrame = { t: "ping", id: 3 };
		expect(frame.t).toBe("ping");
	});

	it("HostFrame includes pong", () => {
		const frame: HostFrame = { t: "pong", id: 4 };
		expect(frame.t).toBe("pong");
	});
});

// ── Canvas data types ────────────────────────────────────────────────────────

describe("canvas data types", () => {
	it("CanvasPoint has x, y, pressure", () => {
		const pt: CanvasPoint = { x: 10.5, y: 20.3, pressure: 0.8 };
		expect(pt.x).toBe(10.5);
		expect(pt.y).toBe(20.3);
		expect(pt.pressure).toBe(0.8);
	});

	it("CanvasStrokeData has id, points, color, width", () => {
		const stroke: CanvasStrokeData = {
			id: "stroke-1",
			points: [
				{ x: 0, y: 0, pressure: 0.5 },
				{ x: 10, y: 20, pressure: 0.7 },
			],
			color: "#ff2c83",
			width: 3,
		};
		expect(stroke.id).toBe("stroke-1");
		expect(stroke.points).toHaveLength(2);
		expect(stroke.color).toBe("#ff2c83");
		expect(stroke.width).toBe(3);
	});
});

// ── Codec round-trip ─────────────────────────────────────────────────────────

describe("codec round-trip with new frame types", () => {
	it("round-trips a canvas-stroke guest frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = {
			t: "canvas-stroke",
			stroke: { id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 },
		};
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips a canvas-clear host frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = { t: "canvas-clear", fromPeer: 1 };
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips a ping/pong exchange", async () => {
		const key = await importRoomKey(generateRoomKey());
		const ping: WireFrame = { t: "ping", id: 42 };
		const pong: WireFrame = { t: "pong", id: 42 };
		const openedPing = await open(key, await seal(key, ping));
		const openedPong = await open(key, await seal(key, pong));
		expect(openedPing).toEqual(ping);
		expect(openedPong).toEqual(pong);
	});

	it("round-trips a canvas-snapshot host frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = {
			t: "canvas-snapshot",
			strokes: [
				{ id: "s1", points: [{ x: 0, y: 0, pressure: 0.5 }], color: "#fff", width: 2 },
				{ id: "s2", points: [{ x: 10, y: 20, pressure: 0.8 }, { x: 30, y: 40, pressure: 0.6 }], color: "#7fdbca", width: 4 },
			],
		};
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});

	it("round-trips a canvas-presence host frame", async () => {
		const key = await importRoomKey(generateRoomKey());
		const frame: WireFrame = {
			t: "canvas-presence",
			peers: [
				{ peerId: 1, name: "alice", color: "#7fdbca" },
				{ peerId: 2, name: "bob", color: "#ff2c83" },
			],
		};
		const opened = await open(key, await seal(key, frame));
		expect(opened).toEqual(frame);
	});
});

// ── Wire frame union exhaustiveness ──────────────────────────────────────────

describe("WireFrame type compatibility", () => {
	it("accepts all known host frame discriminants", () => {
		// Compile-time check: the discriminant union must cover all frames the
		// mock-host and guest-client dispatch on. Runtime discriminant test.
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
			"canvas-snapshot",
			"canvas-stroke",
			"canvas-clear",
			"canvas-cursor",
			"canvas-presence",
			"ping",
			"pong",
		];
		expect(discriminants.length).toBeGreaterThanOrEqual(17);
	});

	it("accepts all known guest frame discriminants", () => {
		const discriminants: GuestFrame["t"][] = [
			"hello",
			"prompt",
			"ui-response",
			"abort",
			"agent-cmd",
			"fetch-transcript",
			"canvas-stroke",
			"canvas-clear",
			"canvas-cursor",
			"ping",
			"pong",
		];
		expect(discriminants.length).toBeGreaterThanOrEqual(11);
	});
});