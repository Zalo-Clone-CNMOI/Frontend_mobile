import { BaseHandler } from "./BaseHandler";
import { useCallStore } from "../../../store/useCallStore";
import { toast } from "../../toastService";
import { router } from "expo-router";
import { callPeerManager } from "../../callPeerManager";
import { getAuthData } from "../../authService";
import { joinConversationRoom } from "../joinConversationRoom";
import type { CallMediaToggledPayload, CallLeftPayload } from "../../../realtime/events";

const normalizeConversationType = (value: unknown): "direct" | "group" =>
  value === "group" ? "group" : "direct";

export class CallHandler extends BaseHandler {
  readonly name = "CallHandler";
  readonly events = [
    "call:started",
    "call:accepted",
    "call:rejected",
    "call:signal:received",
    "call:ended",
    "call:left",
    "call:media:toggled",
    "call:state:updated",
    "ws:error",
  ];

  private processedCallIds = new Set<string>();

  protected createHandler(event: string) {
    switch (event) {
      case "call:started":
        return this.handleCallStarted.bind(this);
      case "call:accepted":
        return this.handleCallAccepted.bind(this);
      case "call:rejected":
        return this.handleCallRejected.bind(this);
      case "call:signal:received":
        return this.handleSignalReceived.bind(this);
      case "call:ended":
        return this.handleCallEnded.bind(this);
      case "call:left":
        return this.handleCallLeft.bind(this);
      case "call:media:toggled":
        return this.handleMediaToggled.bind(this);
      case "call:state:updated":
        return this.handleStateUpdated.bind(this);
      case "ws:error":
        return this.handleWsError.bind(this);
      default:
        return () => {};
    }
  }

  private async handleCallStarted(payload: any) {
    const callId = payload.call_id;
    const initiatorId = payload.initiator_id;
    const conversationId = payload.conversation_id;
    const conversationType = normalizeConversationType(payload.conversation_type);
    const callType = payload.call_type;
    const startedAt = payload.started_at;

    if (this.processedCallIds.has(callId)) {
      this.log("Dedup: already processed call:started", { callId });
      return;
    }
    this.processedCallIds.add(callId);
    setTimeout(() => this.processedCallIds.delete(callId), 60000);

    const authUser = await getAuthData();
    const currentUserId = authUser?.id;

    if (currentUserId && initiatorId === currentUserId) {
      this.log("Ignoring call:started — we are the initiator", { callId });
      return;
    }

    const { callState: currentState, currentCall } = useCallStore.getState();
    if (currentState !== "idle" && currentState !== "ended") {
      this.log("Skipping call:started - already in call", { state: currentState, callId: currentCall?.callId });
      return;
    }

    if (currentState === "ended") {
      this.log("Reset stale ended state before processing new call", { callId });
      useCallStore.getState().resetCall();
    }

    if (conversationId) {
      await joinConversationRoom(conversationId);
    }

    this.log("📞 Incoming call", {
      from: initiatorId,
      callType,
      callId,
    });

    try {
      const { addIncomingCall, setCallState } = useCallStore.getState();
      addIncomingCall({
        callId,
        initiatorId,
        initiatorName: "Đang tải...",
        conversationId,
        conversationType,
        callType,
        startedAt,
      });

      setCallState("incoming");

      toast.info("Incoming call...");
      router.push("/call/incoming" as any);
    } catch (error) {
      this.error("Failed to handle incoming call", error);
    }
  }

  private async handleCallAccepted(payload: any) {
    const callId = payload.call_id;
    const userId = payload.user_id;
    const status = payload.status;
    const participants = payload.participants;

    this.log("✅ Call accepted", {
      by: userId,
      callId,
      status,
    });

    try {
      const store = useCallStore.getState();
      const { setCallState, participants: currentParticipants } = store;

      if (participants) {
        Object.entries(participants as Record<string, string>).forEach(([uid, s]) => {
          if (!currentParticipants[uid]) {
            store.addParticipant({
              userId: uid,
              status: s as any,
              isLocalUser: false,
              audioEnabled: true,
            });
          } else if (currentParticipants[uid].status !== s) {
            store.updateParticipant(uid, { status: s as any });
          }
        });

        // Create WebRTC peers for new group participants
        const { currentCall } = useCallStore.getState();
        if (currentCall?.conversationType === "group" && currentCall?.callId) {
          getAuthData().then((authUser) => {
            const currentUserId = authUser?.id;
            Object.keys(participants).forEach((uid) => {
              if (uid !== currentUserId && !currentParticipants[uid]) {
                callPeerManager.addParticipant(
                  currentCall!.callId!,
                  uid,
                  currentCall!.conversationId || callId,
                  true
                ).catch((err: any) => {
                  console.error("[CallHandler] Failed to create peer for new participant", uid, err);
                });
              }
            });
          });
        }
      }

      if (status === "ongoing") {
        setCallState("active");
      } else {
        setCallState("connecting");
      }

      toast.success("Call accepted");

      const currentState = useCallStore.getState().callState;
      if (currentState === "active" || currentState === "connecting") {
        try {
          const ct = useCallStore.getState().currentCall?.callType || 'audio';
          router.replace(`/call/active?callType=${ct}` as any);
        } catch (e) {
          this.error("navigation failed", e);
        }
      }
    } catch (error) {
      this.error("Failed to handle call acceptance", error);
    }
  }

  private async handleCallRejected(payload: any) {
    const callId = payload.call_id;
    const userId = payload.user_id;
    const reason = payload.reason;

    this.log("❌ Call rejected", {
      by: userId,
      reason,
      callId,
    });

    try {
      const { setCallState } = useCallStore.getState();
      setCallState("ended");

      toast.info(reason ? `Call declined: ${reason}` : "Call declined");

      setTimeout(() => {
        useCallStore.getState().endCall();
      }, 1500);
    } catch (error) {
      this.error("Failed to handle call rejection", error);
    }
  }

  private async handleSignalReceived(payload: any) {
    const callId = payload.call_id;
    const fromUserId = payload.sender_id;
    const signalType = payload.signal_type;

    const { callState, currentCall } = useCallStore.getState();
    if (callState !== "connecting" && callState !== "active" && callState !== "calling") {
      if (signalType === "offer") {
        this.log("Buffering offer — will process after accept", { callId });
      } else {
        this.log("Ignoring signal — not in call", { signalType, callId });
        return;
      }
    }

    this.log(`📡 Signal received: ${signalType}`, {
      from: fromUserId,
      callId,
    });

    try {
      const { addSignalingData } = useCallStore.getState();

      let data: any = {};
      if (payload.sdp) data.sdp = payload.sdp;
      if (payload.candidate) {
        data.candidate = payload.candidate;
        data.sdpMid = payload.sdp_mid;
        data.sdpMLineIndex = payload.sdp_mline_index;
      }

      addSignalingData({
        from: fromUserId,
        type: signalType as "offer" | "answer" | "ice-candidate",
        data,
      });

      await callPeerManager.handleSignal(
        callId,
        fromUserId,
        signalType as "offer" | "answer" | "ice-candidate",
        data
      );
    } catch (error) {
      this.error("Failed to handle signaling data", error);
    }
  }

  private async handleCallEnded(payload: any) {
    const callId = payload.call_id;
    const reason = payload.reason;

    this.log("📵 Call ended", {
      reason,
      callId,
    });

    try {
      const { endCall, setCallState } = useCallStore.getState();
      setCallState("ended");

      // Stop ringtone if playing
      try {
        const { stopRingtone } = require("../../callRingtone");
        stopRingtone();
      } catch {}

      const reasonMessages: Record<string, string> = {
        ended_by_participant: "Cuộc gọi đã kết thúc",
        rejected: "Cuộc gọi bị từ chối",
        timeout: "Cuộc gọi không được trả lời",
        network_error: "Mất kết nối - cuộc gọi đã kết thúc",
      };

      toast.info(reasonMessages[reason] || "Cuộc gọi đã kết thúc");

      setTimeout(() => {
        endCall();
      }, 1000);
    } catch (error) {
      this.error("Failed to handle call end", error);
    }
  }

  private async handleCallLeft(payload: CallLeftPayload) {
    const userId = payload.user_id;
    const callId = payload.call_id;

    this.log("🚪 Call participant left", { userId, callId });

    try {
      const { removeParticipant, participants, currentCall } = useCallStore.getState();

      if (currentCall?.remoteUserId === userId) {
        // The remote user left the group call — end locally
        toast.info("The other participant left the call");
        const { endCall } = useCallStore.getState();
        setTimeout(() => endCall(), 1000);
        return;
      }

      removeParticipant(userId);
    } catch (error) {
      this.error("Failed to handle call left", error);
    }
  }

  private async handleMediaToggled(payload: CallMediaToggledPayload) {
    const userId = payload.user_id;
    if (!userId) return;

    this.log("🔊 Media toggled", { userId, audio: payload.audio_enabled, video: payload.video_enabled });

    try {
      const { updateParticipant } = useCallStore.getState();

      const updates: any = {};
      if (payload.audio_enabled !== undefined) updates.audioEnabled = payload.audio_enabled;
      if (payload.video_enabled !== undefined) updates.videoEnabled = payload.video_enabled;

      if (Object.keys(updates).length > 0) {
        updateParticipant(userId, updates);
      }
    } catch (error) {
      this.error("Failed to handle media toggle", error);
    }
  }

  private async handleWsError(payload: any) {
    const code = payload?.code;
    if (code === "RATE_LIMITED") {
      const retryAfter = payload?.details?.retry_after ?? 30;
      toast.info(`Thử lại sau ${retryAfter} giây`);
    } else if (code === "FORBIDDEN") {
      toast.error("Bạn không có quyền thực hiện cuộc gọi này");
      useCallStore.getState().resetCall();
    } else {
      this.log("WS error received", payload);
    }
  }

  private async handleStateUpdated(payload: any) {
    const state = payload.state;

    this.log("🔄 Call state updated", {
      status: state?.status,
      callId: state?.call_id,
    });

    try {
      const store = useCallStore.getState();
      const { setCallState, callState: currentState, participants: currentParticipants } = store;

      if (!state) {
        if (currentState === "active" || currentState === "connecting" || currentState === "incoming") {
          this.log("No active call state, ending call locally");
          store.endCall();
        }
        return;
      }

      // Sync participants from server state
      if (state.participants) {
        Object.entries(state.participants as Record<string, string>).forEach(([userId, status]) => {
          if (!currentParticipants[userId]) {
            store.addParticipant({
              userId,
              status: status as any,
              isLocalUser: false,
              audioEnabled: true,
            });
          } else if (currentParticipants[userId].status !== status) {
            store.updateParticipant(userId, { status: status as any });
          }
        });
      }

      if (state.status === "ringing" && currentState === "idle") {
        this.log("📞 Restored incoming call from state poll", { callId: state.call_id });
        const id = state.call_id;
        if (id) {
          if (this.processedCallIds.has(id)) {
            this.log("Dedup: already handled call from state poll", { callId: id });
            return;
          }
          this.processedCallIds.add(id);
          setTimeout(() => this.processedCallIds.delete(id), 60000);

          const { addIncomingCall } = useCallStore.getState();
          addIncomingCall({
            callId: id,
            initiatorId: state.initiator_id || "",
            initiatorName: "Đang tải...",
            conversationId: state.conversation_id || payload.conversation_id || "",
            conversationType: normalizeConversationType(state.conversation_type),
            callType: state.call_type || "audio",
            startedAt: state.started_at || Date.now(),
          });
          setCallState("incoming");
          toast.info("Incoming call...");
          try { router.push("/call/incoming" as any); } catch {}
          if (state.conversation_id) {
            await joinConversationRoom(state.conversation_id);
          }
        }
        return;
      }

      // Don't downgrade from calling to connecting if server still reports ringing
      if (state.status === "ringing" && (currentState === "calling" || currentState === "active" || currentState === "connecting")) {
        return;
      }

      const stateMap: Record<string, any> = {
        ringing: "connecting",
        ongoing: "active",
        ended: "ended",
      };

      if (state?.status) {
        if (state.status === "ringing" && currentState === "incoming") {
          return;
        }
        const localState = stateMap[state.status];
        if (localState) {
          setCallState(localState);
        }
        if (state.status === "ended") {
          setTimeout(() => {
            const s = useCallStore.getState();
            if (s.callState !== "idle") {
              s.endCall();
            }
          }, 500);
        }
      }
    } catch (error) {
      this.error("Failed to handle state update", error);
    }
  }
}
