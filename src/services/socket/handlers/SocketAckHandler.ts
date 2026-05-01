import { BaseHandler } from "./BaseHandler";
// Note: Import from chatService which is at ../../../services/chatService
// Path: src/services/socket/handlers -> src/services/chatService = ../../../chatService
import { pendingAcks } from "../../../services/chatService";

/**
 * SocketAckHandler - Handles socket acknowledgment events
 *
 * Events:
 * - chat:ack - Message acknowledgment from server
 */

export class SocketAckHandler extends BaseHandler {
  readonly name = "SocketAckHandler";
  readonly events = ["chat:ack"];

  protected createHandler(event: string): (...args: any[]) => void {
    return this.handleAck.bind(this);
  }

  private handleAck(payload: any): void {
    const clientId = payload?.message_id;
    if (clientId) {
      const p = pendingAcks.get(clientId);
      if (p) {
        if (payload?.status === "rejected") {
          p.reject(payload);
        } else {
          p.resolve(payload);
        }
        pendingAcks.delete(clientId);
      }
    }
  }
}
