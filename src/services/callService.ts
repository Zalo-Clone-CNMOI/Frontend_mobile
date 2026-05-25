import { useCallStore, OutgoingSignal } from "../store/useCallStore";
import { getSocket } from "./socket";
import { toast } from "./toastService";
import { getAuthData } from "./authService";
import { generateUUID } from "../utils/uuid";
import { callMediaManager } from "./callMediaManager";
import { callPeerManager } from "./callPeerManager";
import { isWebRTCAvailable } from "../utils/webrtcLoader";
import { joinConversationRoom } from "./socket/joinConversationRoom";
import { resolveCallRecipientIds } from "./callParticipants";
import { apiJsonRequest } from "./apiRequest";

export interface InitiateCallParams {
  conversationId: string;
  callType: "audio" | "video";
  recipientIds?: string[];
}

export interface CallEventPayload {
  callId: string;
  conversationId: string;
  [key: string]: any;
}

const EMIT_ACK_TIMEOUT_MS = 2_000;
const CALL_END_ACK_TIMEOUT_MS = 1_500;
const RECONNECTION_REQUEST_TIMEOUT_MS = 5_000;
const PUBLIC_TURN_SERVERS: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
];

/**
 * Emit a socket event with an ack callback and a timeout.
 * Resolves with the ack payload, or `null` on timeout / socket-missing.
 * Never throws — best-effort delivery.
 */
function emitWithAck(
  event: string,
  payload: any,
  timeoutMs: number
): Promise<any | null> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      resolve(null);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);

    try {
      socket.emit(event, payload, (ack: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ack ?? null);
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(null);
    }
  });
}

class CallService {
  private callTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly CALL_TIMEOUT_MS = 60_000;

  private reconnectHandler: (() => void) | null = null;
  private reconnectSocket: any = null;

  private _isCleaningUp = false;
  private _cleanupPromise: Promise<void> | null = null;

  constructor() {
    this.attachSocketReconnectHandler();
  }

  private async safeCleanup(): Promise<void> {
    if (this._isCleaningUp) {
      return this._cleanupPromise || Promise.resolve();
    }
    this._isCleaningUp = true;
    this._cleanupPromise = (async () => {
      try { callPeerManager.cleanup(); } catch {}
      try { await callMediaManager.stopLocalMedia(); } catch {}
      useCallStore.getState().resetCall();
      this.clearCallTimeout();
    })();
    await this._cleanupPromise;
    this._isCleaningUp = false;
    this._cleanupPromise = null;
  }

  /**
   * Listen for socket reconnects so we can flush queued outgoing signals
   * and sync call state.
   */
  private attachSocketReconnectHandler(): void {
    const socket = getSocket();
    if (!socket || socket === this.reconnectSocket) {
      return;
    }

    if (this.reconnectSocket && this.reconnectHandler) {
      try {
        this.reconnectSocket.off("connect", this.reconnectHandler);
      } catch {
        // ignore
      }
    }

    this.reconnectSocket = socket;
    this.reconnectHandler = () => {
      this.flushOutgoingSignalQueue().catch((err) => {
        console.warn("[CallService] Failed to flush signal queue", err);
      });
      this.syncCallStateAfterReconnect().catch((err) => {
        console.warn("[CallService] Failed to sync call state after reconnect", err);
      });
    };

    try {
      socket.on("connect", this.reconnectHandler);
    } catch (err) {
      console.warn("[CallService] Failed to attach reconnect handler", err);
    }
  }

  private async syncCallStateAfterReconnect(): Promise<void> {
    const { currentCall } = useCallStore.getState();
    if (!currentCall?.conversationId) return;
    await this.handleReconnection(currentCall.conversationId);
  }

  private async flushOutgoingSignalQueue(): Promise<void> {
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    const queued = useCallStore.getState().drainOutgoingSignals();
    if (!queued.length) return;

    console.log(
      `[CallService] Flushing ${queued.length} queued signal(s) after reconnect`
    );

    for (const signal of queued) {
      try {
        await this.emitSignalPayload(
          signal.callId,
          signal.conversationId,
          signal.type,
          signal.data
        );
      } catch (err) {
        console.warn("[CallService] Failed to flush queued signal", err);
      }
    }
  }

  async initiateCall(params: InitiateCallParams): Promise<void> {
    let storeReserved = false;

    try {
      if (!isWebRTCAvailable()) {
        toast.error(
          "Calls need a dev/production build with WebRTC (not Expo Go)"
        );
        throw new Error("WebRTC unavailable");
      }

      this.attachSocketReconnectHandler();

      const socket = getSocket();
      const user = await getAuthData();

      if (!socket || !socket.connected) {
        toast.error("Not connected to server");
        throw new Error("Socket not connected");
      }
      if (!user) {
        toast.error("User not authenticated");
        throw new Error("User not authenticated");
      }

      // Guard: prevent overlapping calls. isBusy reads current state.
      if (useCallStore.getState().isBusy()) {
        toast.info("You are already in a call");
        throw new Error("Already in a call");
      }

      const callId = generateUUID();
      const startedAt = Date.now();

      await joinConversationRoom(params.conversationId);

      let recipientIds = params.recipientIds?.filter(Boolean) as
        | string[]
        | undefined;
      if (!recipientIds?.length) {
        recipientIds = await resolveCallRecipientIds(
          params.conversationId,
          null,
          String(user.id || user.phone || "")
        );
      }
      const remoteUserId = recipientIds?.[0];

      // Reserve store slot. Returns false if another call already in flight.
      const reserved = useCallStore
        .getState()
        .initiateCall(
          params.conversationId,
          params.callType,
          callId,
          startedAt,
          remoteUserId
        );
      if (!reserved) {
        throw new Error("Already in a call");
      }
      storeReserved = true;

      const isVideo = params.callType === "video";

      // If media acquisition fails we must roll the store back.
      try {
        await callMediaManager.createLocalMediaStream(isVideo);
      } catch (mediaError) {
        console.error("[CallService] Failed to acquire media", mediaError);
        throw mediaError;
      }

      const conversationType =
        recipientIds && recipientIds.length > 1 ? "group" : "direct";

      // Send call:start — server uses fire-and-forget via Kafka, no ack sent back
      socket.emit("call:start", {
        call_id: callId,
        conversation_id: params.conversationId,
        conversation_type: conversationType,
        call_type: params.callType,
        participant_ids: recipientIds,
        started_at: startedAt,
      });

      console.log("[CallService] Call initiated, call:start sent");

      // WebRTC setup runs async — doesn't block navigation to calling screen
      this.setupCallAsync(callId, remoteUserId, params.conversationId);

      this.setCallTimeout();
    } catch (error) {
      console.error("[CallService] Error initiating call", error);
      toast.error("Failed to initiate call");

      // Best-effort rollback
      try {
        callPeerManager.cleanup();
      } catch {
        // ignore
      }
      try {
        await callMediaManager.stopLocalMedia();
      } catch {
        // ignore
      }
      if (storeReserved) {
        useCallStore.getState().resetCall();
      }
      throw error;
    }
  }

  private async setupCallAsync(
    callId: string,
    remoteUserId: string | undefined,
    conversationId: string
  ): Promise<void> {
    try {
      const servers = await this.fetchIceServers();
      callPeerManager.setIceServers(servers);

      if (remoteUserId) {
        await callPeerManager.startCall(callId, true, remoteUserId, conversationId);
      }
    } catch (err) {
      console.error("[CallService] Async WebRTC setup failed", err);
      const { callState } = useCallStore.getState();
      if (callState === "calling" || callState === "connecting") {
        toast.error("Failed to establish call connection");
        await this.safeCleanup();
      }
    }
  }

  async acceptCall(): Promise<void> {
    let acceptedInStore = false;

    try {
      if (!isWebRTCAvailable()) {
        toast.error(
          "Calls need a dev/production build with WebRTC (not Expo Go)"
        );
        throw new Error("WebRTC unavailable");
      }

      this.attachSocketReconnectHandler();

      const { incomingCall } = useCallStore.getState();
      const socket = getSocket();
      const user = await getAuthData();

      if (!socket || !socket.connected) {
        toast.error("Not connected to server");
        throw new Error("Socket not connected");
      }
      if (!incomingCall) {
        throw new Error("No incoming call to accept");
      }
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Transition store first so UI shows "connecting"
      useCallStore.getState().acceptIncomingCall();
      acceptedInStore = true;

      const isVideo = incomingCall.callType === "video";

      // Fetch ICE servers before setting up WebRTC
      try {
        const servers = await this.fetchIceServers();
        callPeerManager.setIceServers(servers);
      } catch {
        // use fallback
      }

      // If media fails, we MUST roll back the store — otherwise we are stuck
      // in "connecting" with no media and no peer connection.
      try {
        await callMediaManager.createLocalMediaStream(isVideo);
      } catch (mediaError) {
        console.error(
          "[CallService] Failed to acquire media on accept",
          mediaError
        );
        throw mediaError;
      }

      const { currentCall } = useCallStore.getState();
      if (currentCall && currentCall.remoteUserId) {
        try {
          await callPeerManager.acceptCall(
            currentCall.callId || incomingCall.callId,
            currentCall.conversationId || incomingCall.conversationId,
            currentCall.remoteUserId
          );
        } catch (peerError) {
          console.error(
            "[CallService] Failed to set up peer on accept",
            peerError
          );
          throw peerError;
        }
      }

      // Tell the server we accepted — best-effort with ack timeout
      const ack = await emitWithAck(
        "call:accept",
        {
          call_id: incomingCall.callId,
          conversation_id: incomingCall.conversationId,
          accepted_at: Date.now(),
        },
        EMIT_ACK_TIMEOUT_MS
      );

      if (ack?.error) {
        throw new Error(`call:accept rejected: ${ack.error}`);
      }

      console.log("[CallService] Call accepted successfully");
    } catch (error) {
      console.error("[CallService] Error accepting call", error);
      toast.error("Failed to accept call");

      // Roll back any partial progress
      try {
        callPeerManager.cleanup();
      } catch {
        // ignore
      }
      try {
        await callMediaManager.stopLocalMedia();
      } catch {
        // ignore
      }
      if (acceptedInStore) {
        useCallStore.getState().endCall();
      } else {
        useCallStore.getState().rejectIncomingCall();
      }
      throw error;
    }
  }

  async rejectCall(reason?: string): Promise<void> {
    try {
      const { incomingCall } = useCallStore.getState();
      const socket = getSocket();

      if (!incomingCall) {
        throw new Error("No incoming call to reject");
      }

      // Always clear local state — even if socket emit fails the user
      // intends to reject.
      useCallStore.getState().rejectIncomingCall();

      if (!socket || !socket.connected) {
        console.warn(
          "[CallService] Socket not connected — reject cleared locally only"
        );
        return;
      }

      try {
        socket.emit("call:reject", {
          call_id: incomingCall.callId,
          conversation_id: incomingCall.conversationId,
          reason: reason || "rejected_by_user",
          rejected_at: Date.now(),
        });
      } catch (err) {
        console.warn("[CallService] Failed to emit call:reject", err);
      }

      console.log("[CallService] Call rejected");
    } catch (error) {
      console.error("[CallService] Error rejecting call", error);
      throw error;
    }
  }

  /**
   * End the active call.
   * Order matters: notify server FIRST (while socket is alive), THEN
   * tear down local resources. If server emit is skipped (socket dead),
   * the server-side timeout will reap the call eventually.
   */
  async endCall(): Promise<void> {
    try {
      let { currentCall } = useCallStore.getState();
      const { incomingCall } = useCallStore.getState();

      // Allow endCall during "incoming" state too (user dismissed)
      let callId = currentCall?.callId || null;
      let conversationId = currentCall?.conversationId || null;
      if (!callId && incomingCall?.callId) {
        callId = incomingCall.callId;
        conversationId = incomingCall.conversationId;
      }

      if (!callId) {
        console.log("[CallService] No active call to end, skipping");
        return;
      }

      // 1) Notify server FIRST while socket is still alive
      const socket = getSocket();
      if (socket && socket.connected) {
        const ack = await emitWithAck(
          "call:end",
          {
            call_id: callId,
            conversation_id: conversationId,
            reason: "ended_by_participant",
            ended_at: Date.now(),
          },
          CALL_END_ACK_TIMEOUT_MS
        );

        if (ack?.error) {
          console.warn(
            "[CallService] call:end rejected by server, retrying once",
            ack.error
          );
          await emitWithAck(
            "call:end",
            {
              call_id: callId,
              conversation_id: conversationId,
              reason: "ended_by_participant",
              ended_at: Date.now(),
            },
            CALL_END_ACK_TIMEOUT_MS
          );
        }
      } else {
        console.warn(
          "[CallService] Socket not connected on endCall — server will reap via timeout"
        );
      }

      await this.safeCleanup();
      console.log("[CallService] Call ended");
    } catch (error) {
      console.error("[CallService] Error ending call", error);
      try { callPeerManager.cleanup(); } catch {}
      try { await callMediaManager.stopLocalMedia(); } catch {}
      useCallStore.getState().endCall();
      this.clearCallTimeout();
    }
  }

  /**
   * Leave a group call (without ending it for others).
   */
  async leaveCall(): Promise<void> {
    try {
      const { currentCall } = useCallStore.getState();
      const socket = getSocket();

      if (!currentCall || !currentCall.callId) {
        console.log("[CallService] No active call to leave");
        return;
      }

      if (!socket || !socket.connected) {
        console.warn("[CallService] Socket not connected on leaveCall");
      } else {
        const ack = await emitWithAck(
          "call:leave",
          {
            call_id: currentCall.callId,
            conversation_id: currentCall.conversationId,
            reason: "left_by_participant",
            left_at: Date.now(),
          },
          CALL_END_ACK_TIMEOUT_MS
        );

        if (ack?.error) {
          console.warn("[CallService] call:leave rejected", ack.error);
        }
      }

      await this.safeCleanup();
      console.log("[CallService] Left call");
    } catch (error) {
      console.error("[CallService] Error leaving call", error);
      await this.safeCleanup();
    }
  }

  /**
   * Fetch TURN/STUN ICE servers from the BFF endpoint.
   * Returns configured ICE servers or falls back to Google STUN.
   */
  async fetchIceServers(): Promise<Array<{ urls: string | string[]; username?: string; credential?: string }>> {
    try {
      const res = await apiJsonRequest<{
        username?: string;
        credential?: string;
        ttl?: number;
        ice_servers?: Array<{
          urls: string | string[];
          username?: string;
          credential?: string;
        }>;
      }>("GET", "/api/conversations/ice-servers");

      const data = res.data;
      if (data?.ice_servers && data.ice_servers.length > 0) {
        return data.ice_servers.map((s) => ({
          urls: s.urls,
          username: s.username || data.username,
          credential: s.credential || data.credential,
        }));
      }

      return [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...PUBLIC_TURN_SERVERS,
      ];
    } catch (error) {
      console.warn("[CallService] Failed to fetch ICE servers, using fallback", error);
      return [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...PUBLIC_TURN_SERVERS,
      ];
    }
  }

  /**
   * Send a signaling message (offer / answer / ice-candidate).
   * If the socket is currently disconnected, queue the message and
   * flush on reconnect. Never throws.
   */
  async sendSignalingData(
    callId: string,
    conversationId: string,
    type: "offer" | "answer" | "ice-candidate",
    data: any
  ): Promise<void> {
    try {
      const socket = getSocket();

      if (!socket || !socket.connected) {
        console.warn(
          `[CallService] Socket not connected — queuing ${type} signal`
        );
        const queued: OutgoingSignal = {
          callId,
          conversationId,
          type,
          data,
          createdAt: Date.now(),
        };
        useCallStore.getState().queueOutgoingSignal(queued);
        // Make sure reconnect handler is attached so the queue flushes later
        this.attachSocketReconnectHandler();
        return;
      }

      await this.emitSignalPayload(callId, conversationId, type, data);
    } catch (error) {
      console.error("[CallService] Error sending signaling data", error);
    }
  }

  private async emitSignalPayload(
    callId: string,
    conversationId: string,
    type: "offer" | "answer" | "ice-candidate",
    data: any
  ): Promise<void> {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      // Re-queue if we lost the socket between the check and now
      useCallStore.getState().queueOutgoingSignal({
        callId,
        conversationId,
        type,
        data,
        createdAt: Date.now(),
      });
      return;
    }

    const signalPayload: Record<string, any> = {
      call_id: callId,
      conversation_id: conversationId,
      signal_type: type,
      sent_at: Date.now(),
    };

    if (type === "offer" || type === "answer") {
      signalPayload.sdp = data?.sdp;
    } else if (type === "ice-candidate") {
      signalPayload.candidate = data?.candidate;
      if (data?.sdpMid != null) signalPayload.sdp_mid = data.sdpMid;
      if (data?.sdpMLineIndex != null)
        signalPayload.sdp_mline_index = data.sdpMLineIndex;
    }

    try {
      socket.emit("call:signal", signalPayload);
      console.log(`[CallService] Sent ${type} signal`);
    } catch (err) {
      console.warn("[CallService] socket.emit failed, re-queueing", err);
      useCallStore.getState().queueOutgoingSignal({
        callId,
        conversationId,
        type,
        data,
        createdAt: Date.now(),
      });
    }
  }

  handleIncomingSignal(
    callId: string,
    from: string,
    type: "offer" | "answer" | "ice-candidate",
    data: any
  ): void {
    console.log(
      `[CallService] Received ${type} signal from ${from}`,
      data?.type || data?.candidate
    );

    callPeerManager
      .handleSignal(callId, from, type, data)
      .catch((err: any) => {
        console.error("[CallService] handleSignal failed", err);
      });
  }

  private setCallTimeout(): void {
    this.clearCallTimeout();

    this.callTimeoutId = setTimeout(() => {
      const { callState } = useCallStore.getState();
      if (callState === "calling" || callState === "connecting") {
        console.log("[CallService] Call timeout - no response");
        toast.info("Call timed out - no response");
        this.endCall().catch((err) => {
          console.error("[CallService] endCall after timeout failed", err);
        });
      }
    }, this.CALL_TIMEOUT_MS);
  }

  private clearCallTimeout(): void {
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
  }

  toggleCallAudio(enabled: boolean): void {
    try {
      useCallStore.getState().toggleAudio(enabled);

      if (enabled) {
        callMediaManager.unmuteAudio();
      } else {
        callMediaManager.muteAudio();
      }

      const socket = getSocket();
      const { currentCall } = useCallStore.getState();

      if (socket && currentCall && socket.connected) {
        socket.emit("call:media:toggled", {
          call_id: currentCall.callId,
          conversation_id: currentCall.conversationId,
          audio_enabled: enabled,
        });
      }
    } catch (err) {
      console.warn("[CallService] toggleCallAudio failed", err);
    }
  }

  toggleCallVideo(enabled: boolean): void {
    try {
      useCallStore.getState().toggleVideo(enabled);

      if (enabled) {
        callMediaManager.enableVideo();
      } else {
        callMediaManager.disableVideo();
      }

      const socket = getSocket();
      const { currentCall } = useCallStore.getState();

      if (socket && currentCall && socket.connected) {
        socket.emit("call:media:toggled", {
          call_id: currentCall.callId,
          conversation_id: currentCall.conversationId,
          video_enabled: enabled,
        });
      }
    } catch (err) {
      console.warn("[CallService] toggleCallVideo failed", err);
    }
  }

  switchCamera(): void {
    callMediaManager.switchCamera().catch((err: any) => {
      console.warn("[CallService] switchCamera failed", err);
    });
  }

  /**
   * After a socket reconnection, request the current server-side call state.
   * Properly awaits the ack (or times out) — does not hang forever.
   */
  async handleReconnection(conversationId: string): Promise<void> {
    try {
      const socket = getSocket();
      const { currentCall } = useCallStore.getState();

      if (!socket || !currentCall) return;

      console.log("[CallService] Handling call reconnection");

      // Flush any signals that piled up while disconnected
      await this.flushOutgoingSignalQueue();

      const response = await emitWithAck(
        "call:state:request",
        {
          conversation_id: conversationId,
          call_id: currentCall.callId,
          requested_at: Date.now(),
        },
        RECONNECTION_REQUEST_TIMEOUT_MS
      );

      if (response?.callState) {
        console.log(
          "[CallService] Recovered call state:",
          response.callState
        );
        const participants = response.callState.participants;
        if (Array.isArray(participants)) {
          participants.forEach((p: any) => {
            if (!p?.userId) return;
            const existing = useCallStore.getState().participants[p.userId];
            if (existing) {
              useCallStore.getState().updateParticipant(p.userId, p);
            } else {
              useCallStore.getState().addParticipant(p);
            }
          });
        }
      }
    } catch (error) {
      console.error("[CallService] Error handling reconnection", error);
    }
  }

  getPeerManager() {
    return callPeerManager;
  }
}

export const callService = new CallService();

export function useCallService() {
  return {
    initiateCall: callService.initiateCall.bind(callService),
    acceptCall: callService.acceptCall.bind(callService),
    rejectCall: callService.rejectCall.bind(callService),
    endCall: callService.endCall.bind(callService),
    leaveCall: callService.leaveCall.bind(callService),
    sendSignalingData: callService.sendSignalingData.bind(callService),
    toggleCallAudio: callService.toggleCallAudio.bind(callService),
    toggleCallVideo: callService.toggleCallVideo.bind(callService),
    switchCamera: callService.switchCamera.bind(callService),
    handleReconnection: callService.handleReconnection.bind(callService),
    fetchIceServers: callService.fetchIceServers.bind(callService),
  };
}
