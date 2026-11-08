import { parseRemoteMessage } from "../../shared/remote-protocol";

interface SocketAttachment {
  role: "presenter" | "follower";
  slideCount: number;
  windowStart: number;
  messages: number;
}

interface StoredTimer {
  elapsed: number;
  running: boolean;
  at: number;
}

interface StoredPosition {
  index: number;
  stepIndex: number;
  updatedAt: number;
}

/**
 * A room must only be reached through an application Worker that authenticates its requests.
 *
 * Rooms hibernate between messages, so an idle room costs nothing but its stored position.
 * When the last socket disconnects, an alarm deletes all storage after `idleTimeoutMs`
 * unless someone reconnects first; a room with no storage leaves nothing behind.
 */
export class DeckRemoteRoom {
  /** How long a room with no connections keeps its position. Override in a subclass. */
  protected idleTimeoutMs = 60 * 60 * 1000;

  constructor(protected readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("Upgrade required", { status: 426 });
    const role = request.headers.get("X-Hono-Decks-Role");
    const slideCount = Number(request.headers.get("X-Hono-Decks-Slide-Count"));
    if ((role !== "presenter" && role !== "follower") || !Number.isSafeInteger(slideCount) || slideCount < 1) {
      return new Response("Invalid room request", { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ role, slideCount, windowStart: 0, messages: 0 } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server, [role]);
    await this.ctx.storage.deleteAlarm();
    let position = await this.ctx.storage.get<StoredPosition>("position");
    if (position && position.index >= slideCount) {
      position = { index: 0, stepIndex: 0, updatedAt: Date.now() };
      await this.ctx.storage.put("position", position);
    }
    await this.ctx.storage.put("slideCount", slideCount);
    // An empty room adopts the first presenter's position instead of resetting it to slide 1.
    server.send(JSON.stringify(position ? { type: "state", ...position } : { type: "empty" }));
    const timer = role === "presenter" ? await this.ctx.storage.get<StoredTimer>("timer") : undefined;
    if (timer) server.send(timerMessage(timer, Date.now()));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, input: string | ArrayBuffer): Promise<void> {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment || attachment.role !== "presenter") return;
    const now = Date.now();
    if (now - attachment.windowStart >= 1000) {
      attachment.windowStart = now;
      attachment.messages = 0;
    }
    attachment.messages++;
    socket.serializeAttachment(attachment);
    if (attachment.messages > 20) return;
    const slideCount = await this.ctx.storage.get<number>("slideCount");
    const message = parseRemoteMessage(input, slideCount ?? 0);
    if (!message) return;
    if (message.type === "timer") {
      // Followers never see the timer; it is shared between presenter and remote pages.
      const timer = { elapsed: message.elapsed, running: message.running, at: now };
      await this.ctx.storage.put("timer", timer);
      for (const peer of this.ctx.getWebSockets("presenter")) {
        if (peer !== socket) {
          try {
            peer.send(timerMessage(timer, now));
          } catch {
            /* A disconnected peer must not block the room. */
          }
        }
      }
      return;
    }
    if (message.type === "command" && message.command !== "goTo") {
      for (const peer of this.ctx.getWebSockets("presenter")) {
        if (peer !== socket) {
          try {
            peer.send(JSON.stringify(message));
          } catch {
            /* A disconnected peer must not block the room. */
          }
        }
      }
      return;
    }
    const position = { index: message.index, stepIndex: message.stepIndex, updatedAt: now };
    await this.ctx.storage.put("position", position);
    for (const peer of this.ctx.getWebSockets()) {
      try {
        peer.send(JSON.stringify({ type: "state", ...position }));
      } catch {
        /* A disconnected peer must not block the room. */
      }
    }
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    // 1005 and 1006 are reserved and cannot be sent back in a close frame.
    try {
      socket.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    } catch {
      /* The socket is already closed. */
    }
    await this.scheduleCleanup(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    try {
      socket.close(1000, "WebSocket error");
    } catch {
      /* The socket is already closed. */
    }
    await this.scheduleCleanup(socket);
  }

  /** Deletes the room's storage once nobody has been connected for `idleTimeoutMs`. */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length > 0) return;
    await this.ctx.storage.deleteAll();
  }

  private async scheduleCleanup(closed: WebSocket): Promise<void> {
    if (this.ctx.getWebSockets().some((peer) => peer !== closed)) return;
    await this.ctx.storage.setAlarm(Date.now() + this.idleTimeoutMs);
  }
}

/** Serializes the timer with its elapsed time advanced to `now`, so clients need no shared clock. */
function timerMessage(timer: StoredTimer, now: number): string {
  const elapsed = timer.elapsed + (timer.running ? Math.max(0, now - timer.at) : 0);
  return JSON.stringify({ type: "timer", elapsed, running: timer.running });
}
