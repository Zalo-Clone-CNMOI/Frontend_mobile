import { BaseHandler } from "./BaseHandler";
import { useCallStore } from "../../../store/useCallStore";
import { toast } from "../../toastService";
import { router } from "expo-router";
import { callPeerManager } from "../../callPeerManager";

export class CallHandler extends BaseHandler {
  readonly name = "CallHandler";
  readonly events = [
    "call:started",
    "call:accepted",
    "call:rejected",
    "call:signal:received",
    "call:ended",
    "call:state:updated",
  ];

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
      case "call:state:updated":
        return this.handleStateUpdated.bind(this);
      default:
        return () => {};
    }
  }

  private async handleCallStarted(payload: any) {
    const callId = payload.call_id;
    const initiatorId = payload.initiator_id;
    const conversationId = payload.conversation_id;
    const conversationType = payload.conversation_type;
    const callType = payload.call_type;
    const startedAt = payload.started_at;

    const { callState: currentState, currentCall } = useCallStore.getState();
    if (currentState !== "idle" && currentState !== "ended") {
      this.log("Skipping call:started - already in call", { state: currentState, callId: currentCall?.callId });
      return;
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

    this.log("✅ Call accepted", {
      by: userId,
      callId,
    });

    try {
      const { setCallState, addParticipant } = useCallStore.getState();
      setCallState("connecting");

      addParticipant({
        userId,
        status: "accepted",
        isLocalUser: false,
        audioEnabled: true,
      });

      toast.success("Call accepted");
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
      const { endCall, setCallState } = useCallStore.getState();
      setCallState("ended");
      endCall();

      toast.info(reason ? `Call declined: ${reason}` : "Call declined");
    } catch (error) {
      this.error("Failed to handle call rejection", error);
    }
  }

  private async handleSignalReceived(payload: any) {
    const callId = payload.call_id;
    const fromUserId = payload.sender_id;
    const signalType = payload.signal_type;

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

      const reasonMessages: Record<string, string> = {
        ended_by_participant: "Call ended by participant",
        rejected: "Call was rejected",
        timeout: "Call timed out",
        network_error: "Network error - call disconnected",
      };

      toast.info(reasonMessages[reason] || "Call ended");

      setTimeout(() => {
        endCall();
      }, 1000);
    } catch (error) {
      this.error("Failed to handle call end", error);
    }
  }

  private async handleStateUpdated(payload: any) {
    const state = payload.state;

    this.log("🔄 Call state updated", {
      status: state?.status,
      callId: state?.call_id,
    });

    try {
      const { setCallState, callState: currentState } = useCallStore.getState();

      if (!state) {
        if (currentState === "active" || currentState === "connecting") {
          this.log("No active call state, ending call locally");
          const store = useCallStore.getState();
          store.endCall();
        }
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
          const store = useCallStore.getState();
          setTimeout(() => store.endCall(), 500);
        }
      }
    } catch (error) {
      this.error("Failed to handle state update", error);
    }
  }
}
