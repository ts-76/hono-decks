import { describe, expect, it, vi } from "vite-plus/test";
import { DeckRemoteRoom } from "../src/remote";

class FakeSocket {
  attachment: unknown;
  sent: string[] = [];
  serializeAttachment(value: unknown) {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return structuredClone(this.attachment);
  }
  send(value: string) {
    this.sent.push(value);
  }
  close() {}
}

function room() {
  const data = new Map<string, unknown>([["slideCount", 3]]);
  const sockets: FakeSocket[] = [];
  const alarm: { at: number | null } = { at: null };
  const ctx = {
    storage: {
      get: async (key: string) => data.get(key),
      put: async (key: string, value: unknown) => {
        data.set(key, value);
      },
      setAlarm: async (at: number) => {
        alarm.at = at;
      },
      deleteAlarm: async () => {
        alarm.at = null;
      },
      deleteAll: async () => {
        data.clear();
      },
    },
    acceptWebSocket: (socket: FakeSocket) => {
      sockets.push(socket);
    },
    getWebSockets: (tag?: string) => sockets.filter((s) => !tag || (s.attachment as { role: string }).role === tag),
  } as unknown as DurableObjectState;
  const connect = (role: "presenter" | "follower") => {
    const socket = new FakeSocket();
    socket.serializeAttachment({ role, slideCount: 3, windowStart: 0, messages: 0 });
    sockets.push(socket);
    return socket;
  };
  const disconnect = (socket: FakeSocket) => sockets.splice(sockets.indexOf(socket), 1);
  return { data, alarm, sockets, connect, disconnect, instance: new DeckRemoteRoom(ctx) };
}

describe("remote room", () => {
  it("persists and broadcasts valid presenter state and ignores followers and invalid messages", async () => {
    const { instance, connect, data } = room();
    const presenter = connect("presenter");
    const follower = connect("follower");
    const send = (socket: FakeSocket, message: string) =>
      instance.webSocketMessage(socket as unknown as WebSocket, message);
    await send(follower, '{"type":"state","index":2,"stepIndex":0}');
    await send(presenter, '{"type":"state","index":3,"stepIndex":0}');
    expect(data.has("position")).toBe(false);
    await send(presenter, '{"type":"state","index":1,"stepIndex":2,"notes":"secret"}');
    expect(data.get("position")).toMatchObject({ index: 1, stepIndex: 2 });
    expect(JSON.parse(follower.sent[0]!)).toEqual({ type: "state", ...(data.get("position") as object) });
    expect(follower.sent[0]).not.toContain("secret");
  });

  it("replays persisted position to a newly accepted socket", async () => {
    const { instance, connect } = room();
    const presenter = connect("presenter");
    await instance.webSocketMessage(presenter as unknown as WebSocket, '{"type":"state","index":2,"stepIndex":1}');
    const server = new FakeSocket();
    vi.stubGlobal(
      "WebSocketPair",
      class {
        0 = new FakeSocket();
        1 = server;
      },
    );
    vi.stubGlobal(
      "Response",
      class {
        constructor(
          _body: unknown,
          public options: unknown,
        ) {}
      },
    );
    try {
      await instance.fetch(
        new Request("https://example.test/", {
          headers: { Upgrade: "websocket", "X-Hono-Decks-Role": "follower", "X-Hono-Decks-Slide-Count": "3" },
        }),
      );
      expect(JSON.parse(server.sent[0]!)).toMatchObject({ type: "state", index: 2, stepIndex: 1 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("limits each socket to 20 messages per second and relays commands only to other presenters", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(10_000);
      const { instance, connect } = room();
      const remote = connect("presenter");
      const presenter = connect("presenter");
      const follower = connect("follower");
      for (let i = 0; i < 21; i++)
        await instance.webSocketMessage(remote as unknown as WebSocket, '{"type":"command","command":"next"}');
      expect(presenter.sent).toHaveLength(20);
      expect(follower.sent).toHaveLength(0);
      vi.advanceTimersByTime(1000);
      await instance.webSocketMessage(remote as unknown as WebSocket, '{"type":"command","command":"previous"}');
      expect(presenter.sent).toHaveLength(21);
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers reserved close codes with a normal closure", () => {
    const { connect, instance } = room();
    const socket = connect("follower");
    const close = vi.spyOn(socket, "close");
    instance.webSocketClose(socket as unknown as WebSocket, 1005, "");
    instance.webSocketClose(socket as unknown as WebSocket, 4001, "bye");
    expect(close.mock.calls).toEqual([
      [1000, ""],
      [4001, "bye"],
    ]);
  });

  it("tells the first socket of an empty room to supply the position", async () => {
    const { instance, data, alarm } = room();
    alarm.at = 123;
    const server = new FakeSocket();
    vi.stubGlobal(
      "WebSocketPair",
      class {
        0 = new FakeSocket();
        1 = server;
      },
    );
    vi.stubGlobal(
      "Response",
      class {
        constructor(
          _body: unknown,
          public options: unknown,
        ) {}
      },
    );
    try {
      await instance.fetch(
        new Request("https://example.test/", {
          headers: { Upgrade: "websocket", "X-Hono-Decks-Role": "presenter", "X-Hono-Decks-Slide-Count": "3" },
        }),
      );
      expect(JSON.parse(server.sent[0]!)).toEqual({ type: "empty" });
      expect(data.has("position")).toBe(false);
      expect(alarm.at).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("deletes storage after the last socket has been gone for the idle timeout", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(50_000);
      const { instance, data, alarm, connect, disconnect } = room();
      const presenter = connect("presenter");
      const follower = connect("follower");
      await instance.webSocketMessage(presenter as unknown as WebSocket, '{"type":"state","index":1,"stepIndex":0}');
      await instance.webSocketClose(follower as unknown as WebSocket, 1000, "");
      expect(alarm.at).toBeNull();
      disconnect(follower);
      await instance.webSocketClose(presenter as unknown as WebSocket, 1001, "");
      expect(alarm.at).toBe(50_000 + 60 * 60 * 1000);
      await instance.alarm();
      expect(data.has("position")).toBe(true);
      disconnect(presenter);
      await instance.alarm();
      expect(data.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("relays the presenter timer to other presenter sockets with elapsed time advanced", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(100_000);
      const { instance, data, connect } = room();
      const presenter = connect("presenter");
      const remote = connect("presenter");
      const follower = connect("follower");
      await instance.webSocketMessage(
        presenter as unknown as WebSocket,
        '{"type":"timer","elapsed":5000,"running":true}',
      );
      expect(data.get("timer")).toEqual({ elapsed: 5000, running: true, at: 100_000 });
      expect(presenter.sent).toHaveLength(0);
      expect(follower.sent).toHaveLength(0);
      expect(JSON.parse(remote.sent[0]!)).toEqual({ type: "timer", elapsed: 5000, running: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
