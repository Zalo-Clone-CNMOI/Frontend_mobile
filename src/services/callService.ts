import { useCallStore } from "../store/useCallStore";
import { getSocket } from "./socket";
import { toast } from "./toastService";
import { getAuthData } from "./authService";
import { generateUUID } from "../utils/uuid";
import { callMediaManager } from "./callMediaManager";
import { callPeerManager } from "./callPeerManager";

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

class CallService {
  private callTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly CALL_TIMEOUT_MS = 60000;

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

      useCallStore.getState().initiateCall(params.conversationId, params.callType, callId, startedAt, remoteUserId);

      const isVideo = params.callType === "video";

      await callMediaManager.createLocalMediaStream(isVideo);

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

  async acceptCall(): Promise<void> {
    try {
      const { acceptIncomingCall, incomingCall } = useCallStore.getState();
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

      acceptIncomingCall();

      const isVideo = incomingCall.callType === "video";
      await callMediaManager.createLocalMediaStream(isVideo);

      const { currentCall } = useCallStore.getState();
      if (currentCall && currentCall.remoteUserId) {
        await callPeerManager.acceptCall(
          currentCall.callId || incomingCall.callId,
          currentCall.conversationId || incomingCall.conversationId,
          currentCall.remoteUserId
        );
      }

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

  async rejectCall(reason?: string): Promise<void> {
    try {
      const { rejectIncomingCall, incomingCall } = useCallStore.getState();
      const socket = getSocket();

      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      if (!incomingCall) {
        throw new Error("No incoming call to reject");
      }

      rejectIncomingCall();

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

  async endCall(): Promise<void> {
    try {
      let { currentCall } = useCallStore.getState();
      const socket = getSocket();

      if (!currentCall?.callId) {
        const { incomingCall } = useCallStore.getState();
        if (incomingCall?.callId) {
          currentCall = incomingCall as any;
        } else {
          console.log("[CallService] No active call to end, skipping");
          return;
        }
      }

      if (!currentCall) {
        console.log("[CallService] No active call to end, returning");
        return;
      }
      const callId = currentCall.callId!;
      const conversationId = currentCall.conversationId;

      callPeerManager.cleanup();
      await callMediaManager.stopLocalMedia();

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

      const { endCall: storeEndCall } = useCallStore.getState();
      storeEndCall();
      this.clearCallTimeout();

      console.log("[CallService] Call ended");
    } catch (error) {
      console.error("[CallService] Error ending call", error);
    }
  }

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

    callPeerManager.handleSignal(callId, from, type, data);
  }

  private setCallTimeout(): void {
    this.clearCallTimeout();

    this.callTimeoutId = setTimeout(() => {
      const { callState, endCall } = useCallStore.getState();

      if (callState === "calling" || callState === "connecting") {
        console.log("[CallService] Call timeout - no response");
        toast.info("Call timed out - no response");
        endCall();
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
    const { toggleAudio } = useCallStore.getState();
    toggleAudio(enabled);

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
  }

  toggleCallVideo(enabled: boolean): void {
    const { toggleVideo } = useCallStore.getState();
    toggleVideo(enabled);

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
  }

  switchCamera(): void {
    callMediaManager.switchCamera();
  }

  async handleReconnection(conversationId: string): Promise<void> {
    try {
      const socket = getSocket();
      const { currentCall } = useCallStore.getState();

      if (!socket || !currentCall) {
        return;
      }

      console.log("[CallService] Handling call reconnection");

      socket.emit(
        "call:state:request",
        {
          conversation_id: conversationId,
          call_id: currentCall.callId,
          requested_at: Date.now(),
        },
        (response: any) => {
          if (response?.callState) {
            console.log("[CallService] Recovered call state:", response.callState);
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
    sendSignalingData: callService.sendSignalingData.bind(callService),
    toggleCallAudio: callService.toggleCallAudio.bind(callService),
    toggleCallVideo: callService.toggleCallVideo.bind(callService),
    switchCamera: callService.switchCamera.bind(callService),
    handleReconnection: callService.handleReconnection.bind(callService),
  };
}
