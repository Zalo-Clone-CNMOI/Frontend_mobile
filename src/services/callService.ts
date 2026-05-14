import { useCallStore } from "../store/useCallStore";
import { getSocket } from "./socket";
import { toast } from "./toastService";
import { getAuthData } from "./authService";
import { generateUUID } from "../utils/uuid";

/**
 * Call Service
 * High-level call coordination service
 * Orchestrates call lifecycle and socket event emission
 * Pattern: Service layer between UI and socket/state
 */

export interface InitiateCallParams {
  conversationId: string;
  callType: "audio" | "video";
  recipientIds?: string[]; // For group calls
}

export interface CallEventPayload {
  callId: string;
  conversationId: string;
  [key: string]: any;
}

class CallService {
  private callTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly CALL_TIMEOUT_MS = 60000; // 60 seconds

  /**
   * Initiate a new call
   * Sends call:start event to server via socket
   */
  async initiateCall(params: InitiateCallParams): Promise<void> {
    try {
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

      const callId = generateUUID();
      const startedAt = Date.now();
      const remoteUserId = params.recipientIds?.[0];

      // Initialize call state locally first
      useCallStore.getState().initiateCall(params.conversationId, params.callType, callId, startedAt, remoteUserId);

      // Emit socket event to start call
      socket.emit(
        "call:start",
        {
          call_id: callId,
          conversation_id: params.conversationId,
          conversation_type: params.recipientIds && params.recipientIds.length > 1 ? 'group' : 'direct',
          call_type: params.callType,
          participant_ids: params.recipientIds,
          started_at: startedAt,
        },
        (response: any) => {
          if (response?.error) {
            toast.error(`Failed to initiate call: ${response.error}`);
            useCallStore.getState().endCall();
          } else {
            console.log("[CallService] Call initiated successfully", response);
            // Set timeout for unanswered calls
            this.setCallTimeout();
          }
        }
      );
    } catch (error) {
      console.error("[CallService] Error initiating call", error);
      toast.error("Failed to initiate call");
      useCallStore.getState().resetCall();
      throw error;
    }
  }

  /**
   * Accept an incoming call
   * Sends call:accept event to server via socket
   */
  async acceptCall(): Promise<void> {
    try {
      const { acceptIncomingCall, incomingCall } =
        useCallStore.getState();
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

      // Accept call locally
      acceptIncomingCall();

      // Emit socket event
      socket.emit(
        "call:accept",
        {
          call_id: incomingCall.callId,
          conversation_id: incomingCall.conversationId,
          accepted_at: Date.now(),
        },
        (response: any) => {
          if (response?.error) {
            toast.error(`Failed to accept call: ${response.error}`);
            useCallStore.getState().endCall();
          } else {
            console.log("[CallService] Call accepted successfully");
          }
        }
      );
    } catch (error) {
      console.error("[CallService] Error accepting call", error);
      toast.error("Failed to accept call");
      useCallStore.getState().rejectIncomingCall();
      throw error;
    }
  }

  /**
   * Reject an incoming call
   * Sends call:reject event to server via socket
   */
  async rejectCall(reason?: string): Promise<void> {
    try {
      const { rejectIncomingCall, incomingCall } = useCallStore.getState();
      const socket = getSocket();
      const user = await getAuthData();

      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      if (!incomingCall) {
        throw new Error("No incoming call to reject");
      }

      // Reject locally
      rejectIncomingCall();

      // Emit socket event
      socket.emit("call:reject", {
        call_id: incomingCall.callId,
        conversation_id: incomingCall.conversationId,
        reason: reason || "rejected_by_user",
        rejected_at: Date.now(),
      });

      console.log("[CallService] Call rejected");
    } catch (error) {
      console.error("[CallService] Error rejecting call", error);
      throw error;
    }
  }

  /**
   * End the current call
   * Sends call:end event to server via socket
   */
  async endCall(): Promise<void> {
    try {
      let { currentCall } = useCallStore.getState();
      const socket = getSocket();

      if (!currentCall || !currentCall.callId) {
        // Try to get callId from incomingCall as fallback
        const { incomingCall } = useCallStore.getState();
        if (incomingCall?.callId) {
          currentCall = incomingCall as any;
        } else {
          console.log("[CallService] No active call to end, skipping");
          return;
        }
      }

      const callId = currentCall.callId;
      const conversationId = currentCall.conversationId;

      // Emit socket event BEFORE local cleanup
      if (socket && socket.connected) {
        socket.emit("call:end", {
          call_id: callId,
          conversation_id: conversationId,
          reason: "ended_by_participant",
          ended_at: Date.now(),
        }, (ack: any) => {
          if (ack?.error) {
            console.warn("[CallService] call:end rejected, retrying...", ack.error);
            socket.emit("call:end", {
              call_id: callId,
              conversation_id: conversationId,
              reason: "ended_by_participant",
              ended_at: Date.now(),
            });
          }
        });
      }

      // End call locally
      const { endCall: storeEndCall } = useCallStore.getState();
      storeEndCall();

      // Clear timeout
      this.clearCallTimeout();

      console.log("[CallService] Call ended");
    } catch (error) {
      console.error("[CallService] Error ending call", error);
    }
  }

  /**
   * Send WebRTC signaling data (SDP, ICE candidates)
   * Called from callPeerManager after local offer/answer creation
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
        console.warn("[CallService] Socket not connected, queuing signal");
        return;
      }

      const signalPayload: Record<string, any> = {
        call_id: callId,
        conversation_id: conversationId,
        signal_type: type,
        sent_at: Date.now(),
      };

      if (type === 'offer' || type === 'answer') {
        signalPayload.sdp = data.sdp;
      } else if (type === 'ice-candidate') {
        signalPayload.candidate = data.candidate;
        if (data.sdpMid) signalPayload.sdp_mid = data.sdpMid;
        if (data.sdpMLineIndex != null) signalPayload.sdp_mline_index = data.sdpMLineIndex;
      }

      socket.emit("call:signal", signalPayload);

      console.log(`[CallService] Sent ${type} signal`);
    } catch (error) {
      console.error("[CallService] Error sending signaling data", error);
    }
  }

  /**
   * Handle incoming signaling data from peer
   * Called by CallHandler when receiving signal events
   */
  handleIncomingSignal(
    callId: string,
    from: string,
    type: "offer" | "answer" | "ice-candidate",
    data: any
  ): void {
    console.log(
      `[CallService] Received ${type} signal from ${from}`,
      data.type || data.candidate
    );

    // Signal will be queued in store via CallHandler
    // callPeerManager will pull from queue
  }

  /**
   * Set timeout for unanswered calls
   * Auto-ends call after CALL_TIMEOUT_MS
   */
  private setCallTimeout(): void {
    this.clearCallTimeout();

    this.callTimeoutId = setTimeout(() => {
      const { callState, endCall } = useCallStore.getState();

      // Only timeout if still ringing/calling
      if (callState === "calling" || callState === "connecting") {
        console.log("[CallService] Call timeout - no response");
        toast.info("Call timed out - no response");
        endCall();
      }
    }, this.CALL_TIMEOUT_MS);
  }

  /**
   * Clear call timeout
   */
  private clearCallTimeout(): void {
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
  }

  /**
   * Mute/unmute audio in current call
   */
  toggleCallAudio(enabled: boolean): void {
    const { toggleAudio, localStream } = useCallStore.getState();
    toggleAudio(enabled);

    const socket = getSocket();
    const { currentCall } = useCallStore.getState();

    if (socket && currentCall && socket.connected) {
      socket.emit("call:media:toggled", {
        call_id: currentCall.callId,
        conversation_id: currentCall.conversationId,
        audio_enabled: enabled,
      });
    }
  }

  /**
   * Enable/disable video in current call
   */
  toggleCallVideo(enabled: boolean): void {
    const { toggleVideo } = useCallStore.getState();
    toggleVideo(enabled);

    const socket = getSocket();
    const { currentCall } = useCallStore.getState();

    if (socket && currentCall && socket.connected) {
      socket.emit("call:media:toggled", {
        call_id: currentCall.callId,
        conversation_id: currentCall.conversationId,
        video_enabled: enabled,
      });
    }
  }

  /**
   * Handle call recovery/reconnection
   * Called when socket reconnects and user is in active call
   */
  async handleReconnection(conversationId: string): Promise<void> {
    try {
      const socket = getSocket();
      const { currentCall } = useCallStore.getState();

      if (!socket || !currentCall) {
        return;
      }

      console.log("[CallService] Handling call reconnection");

      // Request current call state from server
      socket.emit(
        "call:state:request",
        {
          conversation_id: conversationId,
          call_id: currentCall.callId,
          requested_at: Date.now(),
        },
        (response: any) => {
          if (response?.callState) {
            console.log(
              "[CallService] Recovered call state:",
              response.callState
            );
            // Update store with recovered state
            if (response.callState.participants) {
              response.callState.participants.forEach((p: any) => {
                useCallStore.getState().addParticipant(p);
              });
            }
          }
        }
      );
    } catch (error) {
      console.error("[CallService] Error handling reconnection", error);
    }
  }
}

export const callService = new CallService();

// React hook for call service
export function useCallService() {
  return {
    initiateCall: callService.initiateCall.bind(callService),
    acceptCall: callService.acceptCall.bind(callService),
    rejectCall: callService.rejectCall.bind(callService),
    endCall: callService.endCall.bind(callService),
    sendSignalingData: callService.sendSignalingData.bind(callService),
    toggleCallAudio: callService.toggleCallAudio.bind(callService),
    toggleCallVideo: callService.toggleCallVideo.bind(callService),
    handleReconnection: callService.handleReconnection.bind(callService),
  };
}
