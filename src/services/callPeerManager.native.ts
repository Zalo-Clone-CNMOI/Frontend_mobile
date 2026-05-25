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

interface PeerEntry {
  pc: any;
  callId: string;
  conversationId: string;
  userId: string;
}

class CallPeerManager {
  private peerConnections: Map<string, PeerEntry> = new Map();
  private active = false;
  private pendingOffer: { callId: string; fromUserId: string; data: any } | null = null;
  private pendingAnswer: { callId: string; data: any } | null = null;
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

  getPeerConnection(userId: string): any | null {
    return this.peerConnections.get(userId)?.pc ?? null;
  }

  replaceAllVideoTracks(newTrack: any): void {
    for (const [, entry] of this.peerConnections) {
      const senders = entry.pc.getSenders();
      const videoSender = senders.find((s: any) => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(newTrack).catch((err: any) => {
          console.warn('[CallPeerManager] replaceTrack failed for', entry.userId, err);
        });
      }
    }
  }

  async startCall(
    callId: string,
    _isInitiator: boolean,
    remoteUserId: string,
    conversationId: string
  ): Promise<void> {
    try {
      this.active = true;
      const pc = await this.createPeerConnectionForUser(callId, conversationId, remoteUserId);

      const { localStream } = useCallStore.getState();
      if (localStream) {
        const tracks = (localStream as any).getTracks?.() ?? [];
        tracks.forEach((track: any) => {
          try { pc.addTrack(track, localStream as any); } catch {}
        });
      }

      const webrtc = await ensureWebRTC();

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(
        new webrtc.RTCSessionDescription({ type: "offer", sdp: offer.sdp })
      );

      // Process pending answer after local offer is set (PC must be in "have-local-offer" state)
      if (this.pendingAnswer) {
        console.log("[CallPeerManager] Processing pending answer after startCall");
        const ans = this.pendingAnswer;
        this.pendingAnswer = null;
        await this.processAnswer(callId, ans.data, webrtc);
      }

      await callService.sendSignalingData(callId, conversationId, "offer", {
        sdp: offer.sdp,
      });

      console.log("[CallPeerManager] Call started, offer sent to", remoteUserId);
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

      let pc = this.peerConnections.get(remoteUserId)?.pc ?? null;
      if (!pc) {
        pc = await this.createPeerConnectionForUser(callId, conversationId, remoteUserId);
      } else {
        console.log("[CallPeerManager] Reusing existing peer connection for", remoteUserId);
      }

      const { localStream } = useCallStore.getState();
      if (localStream && pc) {
        const senders = pc.getSenders?.() ?? [];
        const existingTrackIds = new Set(
          senders.map((s: any) => s.track?.id).filter(Boolean)
        );
        const tracks = (localStream as any).getTracks?.() ?? [];
        tracks.forEach((track: any) => {
          if (!existingTrackIds.has(track.id)) {
            try { pc.addTrack(track, localStream as any); } catch {}
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

  async addParticipant(
    callId: string,
    userId: string,
    conversationId: string,
    isInitiator: boolean
  ): Promise<void> {
    if (this.peerConnections.has(userId)) {
      console.log("[CallPeerManager] Participant already has a peer connection", userId);
      return;
    }

    const pc = await this.createPeerConnectionForUser(callId, conversationId, userId);

    const { localStream } = useCallStore.getState();
    if (localStream) {
      const tracks = (localStream as any).getTracks?.() ?? [];
      tracks.forEach((track: any) => {
        try { pc.addTrack(track, localStream as any); } catch {}
      });
    }

    if (isInitiator) {
      const webrtc = await ensureWebRTC();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(
        new webrtc.RTCSessionDescription({ type: "offer", sdp: offer.sdp })
      );
      await callService.sendSignalingData(callId, conversationId, "offer", {
        sdp: offer.sdp,
      }, userId);
      console.log("[CallPeerManager] Offer sent to new participant", userId);
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

    let entry = this.peerConnections.get(fromUserId);

    // Queue answer if no PC ready yet — prevents creating a premature PC
    if (type === "answer" && !entry) {
      console.log("[CallPeerManager] Queuing answer — no PC ready yet");
      this.pendingAnswer = { callId, data };
      return;
    }

    if (!entry) {
      // Only create PC for offer/ice-candidate when none exists
      if (type === "offer" || type === "ice-candidate") {
        console.warn("[CallPeerManager] No peer connection for", fromUserId, "creating one");
        const { currentCall } = useCallStore.getState();
        const pc = await this.createPeerConnectionForUser(
          callId,
          currentCall?.conversationId || "",
          fromUserId
        );

        const { localStream } = useCallStore.getState();
        if (localStream) {
          const tracks = (localStream as any).getTracks?.() ?? [];
          tracks.forEach((track: any) => {
            try { pc.addTrack(track, localStream as any); } catch {}
          });
        }

        entry = this.peerConnections.get(fromUserId);
        if (!entry) return;
      } else {
        console.warn("[CallPeerManager] Unknown signal type with no PC:", type);
        return;
      }
    }

    try {
      const webrtc = await ensureWebRTC();

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
          await entry.pc.addIceCandidate(
            new webrtc.RTCIceCandidate({
              candidate: candidateStr,
              sdpMid: sdpMid,
              sdpMLineIndex: sdpMLineIndex,
            })
          );
          console.log("[CallPeerManager] ICE candidate added for", fromUserId);
        }
      }
    } catch (error) {
      console.error("[CallPeerManager] Error handling signal", error);
    }
  }

  removeParticipant(userId: string): void {
    const entry = this.peerConnections.get(userId);
    if (entry) {
      try { entry.pc.close(); } catch {}
      this.peerConnections.delete(userId);
      console.log("[CallPeerManager] Removed participant", userId);
    }

    if (this.peerConnections.size === 0) {
      this.active = false;
    }
  }

  private async processOffer(
    callId: string,
    fromUserId: string,
    data: any
  ): Promise<void> {
    const entry = this.peerConnections.get(fromUserId);
    if (!entry) {
      console.warn("[CallPeerManager] processOffer: no PC for", fromUserId);
      return;
    }

    const webrtc = await ensureWebRTC();
    const { currentCall } = useCallStore.getState();
    const conversationId = currentCall?.conversationId || "";

    await entry.pc.setRemoteDescription(
      new webrtc.RTCSessionDescription({ type: "offer", sdp: data.sdp })
    );

    const answer = await entry.pc.createAnswer();

    await entry.pc.setLocalDescription(
      new webrtc.RTCSessionDescription({ type: "answer", sdp: answer.sdp })
    );

    await callService.sendSignalingData(callId, conversationId, "answer", {
      sdp: answer.sdp,
    });

    console.log("[CallPeerManager] Answer created and sent for", fromUserId);
  }

  private async processAnswer(
    callId: string,
    data: any,
    webrtc: WebRTCLib
  ): Promise<void> {
    let targetUserId: string | null = null;
    for (const [uid, entry] of this.peerConnections) {
      if (entry.callId === callId && !entry.pc.remoteDescription) {
        targetUserId = uid;
        break;
      }
    }

    if (!targetUserId) {
      const firstEntry = this.peerConnections.values().next().value;
      if (firstEntry) {
        targetUserId = firstEntry.userId;
      }
    }

    if (!targetUserId) {
      console.warn("[CallPeerManager] processAnswer: no matching PC found");
      return;
    }

    const entry = this.peerConnections.get(targetUserId);
    if (!entry) return;

    await entry.pc.setRemoteDescription(
      new webrtc.RTCSessionDescription({ type: "answer", sdp: data.sdp })
    );
    console.log("[CallPeerManager] Remote answer set for", targetUserId);
  }

  private async createPeerConnectionForUser(
    callId: string,
    conversationId: string,
    userId: string
  ): Promise<any> {
    const webrtc = await ensureWebRTC();
    const pc = new webrtc.RTCPeerConnection({ iceServers: this.iceServers });

    this.peerConnections.set(userId, { pc, callId, conversationId, userId });

    (pc as any).addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        callService.sendSignalingData(callId, conversationId, "ice-candidate", {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        }, userId);
      }
    });

    (pc as any).addEventListener("track", (event: any) => {
      console.log("[CallPeerManager] Remote track received from", userId, ":", event.track?.kind);
      if (event.streams?.[0]) {
        useCallStore.getState().updateParticipantStream(userId, event.streams[0] as any);
      }
    });

    (pc as any).addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      console.log("[CallPeerManager] Connection state for", userId, ":", state);

      useCallStore.getState().updateConnectionState(userId, state);

      if (state === "disconnected" || state === "failed" || state === "closed") {
        this.removeParticipant(userId);
      }

      if (state === "connected") {
        useCallStore.getState().setCallState("active");
      }
    });

    (pc as any).addEventListener("iceconnectionstatechange", () => {
      console.log("[CallPeerManager] ICE connection state for", userId, ":", pc.iceConnectionState);
    });

    return pc;
  }

  leaveCall(): void {
    this.cleanup();
  }

  cleanup(): void {
    this.active = false;
    this.pendingOffer = null;
    this.pendingAnswer = null;

    for (const [userId, entry] of this.peerConnections) {
      try { entry.pc.close(); } catch {}
    }
    this.peerConnections.clear();

    console.log("[CallPeerManager] Cleaned up all peer connections");
  }
}

export const callPeerManager = new CallPeerManager();
