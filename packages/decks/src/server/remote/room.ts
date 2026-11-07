import { parseRemoteMessage } from "../../shared/remote-protocol";

interface SocketAttachment {
  role: "presenter" | "follower";
  slideCount: number;
  windowStart: number;
  messages: number;
}

interface StoredPosition {
  index: number;
  stepIndex: number;
  updatedAt: number;
}

/** A room must only be reached through an application Worker that authenticates its requests. */
export class DeckRemoteRoom {
  constructor(private readonly ctx: DurableObjectState) {}

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
    let position = await this.ctx.storage.get<StoredPosition>("position");
    if (!position || position.index >= slideCount) {
      position = { index: 0, stepIndex: 0, updatedAt: Date.now() };
      await this.ctx.storage.put("position", position);
    }
    await this.ctx.storage.put("slideCount", slideCount);
    server.send(JSON.stringify({ type: "state", ...position }));
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

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    if (code !== 1006) socket.close(code, reason);
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1000, "WebSocket error");
  }
}
