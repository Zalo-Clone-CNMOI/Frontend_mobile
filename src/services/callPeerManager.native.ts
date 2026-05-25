import { isWebRTCAvailable, loadWebRTC } from "../utils/webrtcLoader";

type WebRTCLib = {
  RTCPeerConnection: any;
  RTCSessionDescription: any;
  RTCIceCandidate: any;
};

async function ensureWebRTC(): Promise<WebRTCLib> {
  if (!isWebRTCAvailable()) {
    throw new Error("WebRTC is not available in this build");
  }
  const mod = await loadWebRTC();
  if (!mod?.RTCPeerConnection) {
    throw new Error("WebRTC native module is not initialized");
  }
  return mod as unknown as WebRTCLib;
}

import { useCallStore } from "../store/useCallStore";
import { callService } from "./callService";

class CallPeerManager {
  private peerConnection: any = null;
  private active = false;
  private pendingOffer: { callId: string; fromUserId: string; data: any } | null = null;
  private iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  async setIceServers(servers: Array<{ urls: string | string[]; username?: string; credential?: string }>): Promise<void> {
    this.iceServers = servers.length > 0 ? servers : this.iceServers;
  }

  isActive(): boolean {
    return this.active;
  }

  async startCall(
    callId: string,
    _isInitiator: boolean,
    remoteUserId: string,
    conversationId: string
  ): Promise<void> {
    try {
      this.active = true;
      this.peerConnection = await this.createPeerConnection(callId, conversationId);

      const { localStream } = useCallStore.getState();
      if (localStream) {
        const tracks = (localStream as any).getTracks?.() ?? [];
        tracks.forEach((track: any) => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, localStream as any);
          }
        });
      }

      const webrtc = await ensureWebRTC()
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(
        new webrtc.RTCSessionDescription({ type: "offer", sdp: offer.sdp })
      );

      await callService.sendSignalingData(callId, conversationId, "offer", {
        sdp: offer.sdp,
      });

      console.log("[CallPeerManager] Call started, offer sent");
    } catch (error) {
      console.error("[CallPeerManager] Error starting call", error);
      this.active = false;
      throw error;
    }
  }

  async acceptCall(
    callId: string,
    conversationId: string,
    remoteUserId: string
  ): Promise<void> {
    try {
      this.active = true;

      if (!this.peerConnection) {
        this.peerConnection = await this.createPeerConnection(callId, conversationId);
      } else {
        console.log("[CallPeerManager] Reusing existing peer connection for accept");
      }

      const { localStream } = useCallStore.getState();
      if (localStream && this.peerConnection) {
        const senders = this.peerConnection.getSenders?.() ?? [];
        const existingTrackIds = new Set(
          senders.map((s: any) => s.track?.id).filter(Boolean)
        );
        const tracks = (localStream as any).getTracks?.() ?? [];
        tracks.forEach((track: any) => {
          if (!existingTrackIds.has(track.id)) {
            this.peerConnection.addTrack(track, localStream as any);
          }
        });
      }

      if (this.pendingOffer) {
        console.log("[CallPeerManager] Processing pending offer after accept");
        const offer = this.pendingOffer;
        this.pendingOffer = null;
        await this.processOffer(offer.callId, offer.fromUserId, offer.data);
      } else {
        console.log("[CallPeerManager] Ready to accept call, awaiting offer");
      }
    } catch (error) {
      console.error("[CallPeerManager] Error accepting call", error);
      this.active = false;
      throw error;
    }
  }

  async handleSignal(
    callId: string,
    fromUserId: string,
    type: string,
    data: any
  ): Promise<void> {
    if (type === "offer" && !this.active) {
      console.log("[CallPeerManager] Queuing offer — not yet active");
      this.pendingOffer = { callId, fromUserId, data };
      return;
    }

    if (!this.peerConnection) {
      console.warn("[CallPeerManager] No peer connection, creating one");
      const { currentCall } = useCallStore.getState();
      this.peerConnection = await this.createPeerConnection(
        callId,
        currentCall?.conversationId || ""
      );

      const { localStream } = useCallStore.getState();
      if (localStream) {
        const tracks = (localStream as any).getTracks?.() ?? [];
        tracks.forEach((track: any) => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, localStream as any);
          }
        });
      }
    }

    try {
      const webrtc = await ensureWebRTC()

      if (type === "offer") {
        await this.processOffer(callId, fromUserId, data);
      } else if (type === "answer") {
        await this.processAnswer(callId, data, webrtc);
      } else if (type === "ice-candidate") {
        if (data.candidate) {
          let candidateStr = data.candidate;
          let sdpMid = data.sdpMid;
          let sdpMLineIndex = data.sdpMLineIndex;
          if (typeof candidateStr === "string" && candidateStr.trim().startsWith("{")) {
            try {
              const parsed = JSON.parse(candidateStr);
              candidateStr = parsed.candidate || candidateStr;
              if (sdpMid == null && parsed.sdpMid != null) sdpMid = parsed.sdpMid;
              if (sdpMLineIndex == null && parsed.sdpMLineIndex != null) sdpMLineIndex = parsed.sdpMLineIndex;
            } catch {}
          }
          await this.peerConnection.addIceCandidate(
            new webrtc.RTCIceCandidate({
              candidate: candidateStr,
              sdpMid: sdpMid,
              sdpMLineIndex: sdpMLineIndex,
            })
          );

          console.log("[CallPeerManager] ICE candidate added");
        }
      }
    } catch (error) {
      console.error("[CallPeerManager] Error handling signal", error);
    }
  }

  private async processOffer(
    callId: string,
    fromUserId: string,
    data: any
  ): Promise<void> {
    const webrtc = await ensureWebRTC();
    const { currentCall } = useCallStore.getState();
    const conversationId = currentCall?.conversationId || "";
    await this.peerConnection.setRemoteDescription(
      new webrtc.RTCSessionDescription({ type: "offer", sdp: data.sdp })
    );

    const answer = await this.peerConnection.createAnswer();

    await this.peerConnection.setLocalDescription(
      new webrtc.RTCSessionDescription({ type: "answer", sdp: answer.sdp })
    );

    await callService.sendSignalingData(callId, conversationId, "answer", {
      sdp: answer.sdp,
    });

    console.log("[CallPeerManager] Answer created and sent");
  }

  private async processAnswer(
    callId: string,
    data: any,
    webrtc: WebRTCLib
  ): Promise<void> {
    await this.peerConnection.setRemoteDescription(
      new webrtc.RTCSessionDescription({ type: "answer", sdp: data.sdp })
    );
    console.log("[CallPeerManager] Remote answer set");
  }

  private async createPeerConnection(
    callId: string,
    conversationId: string
  ): Promise<any> {
    const webrtc = await ensureWebRTC()
    const pc = new webrtc.RTCPeerConnection({ iceServers: this.iceServers });

    (pc as any).addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        callService.sendSignalingData(callId, conversationId, "ice-candidate", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    });

    (pc as any).addEventListener("track", (event: any) => {
      console.log("[CallPeerManager] Remote track received:", event.track?.kind);

      const { remoteUserId } = useCallStore.getState().currentCall || {};
      if (remoteUserId && event.streams?.[0]) {
        useCallStore
          .getState()
          .updateParticipantStream(remoteUserId, event.streams[0] as any);
      }
    });

    (pc as any).addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      console.log("[CallPeerManager] Connection state:", state);

      const { remoteUserId } = useCallStore.getState().currentCall || {};
      if (remoteUserId) {
        useCallStore.getState().updateConnectionState(remoteUserId, state);
      }

      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        this.active = false;
      }

      if (state === "connected") {
        useCallStore.getState().setCallState("active");
      }
    });

    (pc as any).addEventListener("iceconnectionstatechange", () => {
      console.log("[CallPeerManager] ICE connection state:", pc.iceConnectionState);
    });

    return pc;
  }

  leaveCall(): void {
    this.cleanup();
  }

  cleanup(): void {
    this.active = false;
    this.pendingOffer = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    console.log("[CallPeerManager] Cleaned up");
  }
}

export const callPeerManager = new CallPeerManager();
