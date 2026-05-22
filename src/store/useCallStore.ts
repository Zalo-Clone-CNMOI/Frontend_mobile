import { create } from "zustand";
import { generateUUID } from "../utils/uuid";

/**
 * Call State Store
 * Manages the complete call lifecycle and state machine
 * States: idle → calling → incoming → connecting → active → ended → idle
 */

export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "active"
  | "ended";

export type ParticipantStatus = "invited" | "accepted" | "rejected" | "left";

export interface CallParticipant {
  userId: string;
  status: ParticipantStatus;
  isLocalUser: boolean;
  audioEnabled: boolean;
  videoEnabled?: boolean;
  remoteStream?: MediaStream;
  connectionState?: RTCPeerConnectionState;
}

export interface IncomingCallData {
  callId: string;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string;
  conversationId: string;
  conversationType: "direct" | "group";
  callType: "audio" | "video";
  startedAt: number;
}

export interface SignalingData {
  from: string;
  type: "offer" | "answer" | "ice-candidate";
  data: any;
}

export interface OutgoingSignal {
  callId: string;
  conversationId: string;
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  createdAt: number;
}

export interface CallSession {
  callId: string | null;
  conversationId: string | null;
  remoteUserId: string | null;
  callType: "audio" | "video";
  startedAt: number | null;
  duration: number;
}

export interface UseCallStoreState {
  callState: CallState;
  currentCall: CallSession | null;
  incomingCall: IncomingCallData | null;
  participants: Record<string, CallParticipant>;
  signalingQueue: SignalingData[];
  outgoingSignalQueue: OutgoingSignal[];
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;

  initiateCall: (
    conversationId: string,
    callType: "audio" | "video",
    callId?: string,
    startedAt?: number,
    remoteUserId?: string
  ) => boolean;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endCall: () => void;

  setCallState: (state: CallState) => void;

  addIncomingCall: (call: IncomingCallData) => void;
  clearIncomingCall: () => void;

  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => void;
  updateParticipantStream: (userId: string, stream: MediaStream | null) => void;

  setLocalStream: (stream: MediaStream | null) => void;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  updateConnectionState: (
    userId: string,
    state: RTCPeerConnectionState
  ) => void;

  addSignalingData: (data: SignalingData) => void;
  getNextSignalingData: () => SignalingData | undefined;
  clearSignalingQueue: () => void;

  queueOutgoingSignal: (signal: OutgoingSignal) => void;
  drainOutgoingSignals: () => OutgoingSignal[];
  clearOutgoingSignalQueue: () => void;

  resetCall: () => void;
  setError: (error: string | null) => void;

  getCallDuration: () => number;
  isCallActive: () => boolean;
  isBusy: () => boolean;
  getParticipantCount: () => number;
}

const initialCallSession: CallSession = {
  callId: null,
  conversationId: null,
  remoteUserId: null,
  callType: "audio",
  startedAt: null,
  duration: 0,
};

/**
 * Stop and release all tracks of a MediaStream.
 * Safe to call with null/undefined — never throws.
 */
function releaseMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    const tracks = (stream as any).getTracks?.() ?? [];
    tracks.forEach((track: any) => {
      try {
        track.stop?.();
      } catch (err) {
        // best-effort stop
      }
    });
  } catch (err) {
    // best-effort release
  }
}

export const useCallStore = create<UseCallStoreState>((set, get) => ({
  callState: "idle",
  currentCall: null,
  incomingCall: null,
  participants: {},
  signalingQueue: [],
  outgoingSignalQueue: [],
  localStream: null,
  isAudioEnabled: true,
  isVideoEnabled: false,
  error: null,

  initiateCall: (
    conversationId: string,
    callType: "audio" | "video",
    callId?: string,
    startedAt?: number,
    remoteUserId?: string
  ) => {
    const state = get();

    // Guard: don't start a new call if one is already in flight
    const busy =
      state.callState !== "idle" && state.callState !== "ended";
    if (busy) {
      console.warn(
        "[useCallStore] initiateCall rejected — already in call",
        state.callState
      );
      set({ error: "Already in a call" });
      return false;
    }

    const id = callId || generateUUID();
    set({
      callState: "calling",
      currentCall: {
        callId: id,
        conversationId,
        remoteUserId: remoteUserId || null,
        callType,
        startedAt: startedAt || Date.now(),
        duration: 0,
      },
      incomingCall: null,
      participants: {},
      signalingQueue: [],
      outgoingSignalQueue: [],
      error: null,
    });
    return true;
  },

  acceptIncomingCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) {
      set({ error: "No incoming call to accept" });
      return;
    }

    set({
      callState: "connecting",
      currentCall: {
        callId: incomingCall.callId,
        conversationId: incomingCall.conversationId,
        remoteUserId: incomingCall.initiatorId,
        callType: incomingCall.callType,
        startedAt: Date.now(),
        duration: 0,
      },
      incomingCall: null,
      error: null,
    });
  },

  rejectIncomingCall: () => {
    set({
      incomingCall: null,
      callState: "idle",
      participants: {},
      error: null,
    });
  },

  endCall: () => {
    const state = get();

    // Release local media tracks to free camera/mic
    releaseMediaStream(state.localStream);

    // Release remote streams
    Object.values(state.participants).forEach((p) => {
      releaseMediaStream(p.remoteStream || null);
    });

    set({
      callState: "idle",
      currentCall: { ...initialCallSession },
      participants: {},
      signalingQueue: [],
      outgoingSignalQueue: [],
      localStream: null,
      isAudioEnabled: true,
      isVideoEnabled: false,
      error: null,
    });
  },

  setCallState: (state: CallState) => {
    set({ callState: state });
  },

  addIncomingCall: (call: IncomingCallData) => {
    set((state) => ({
      incomingCall: call,
      callState: "incoming",
      error: null,
      participants: {
        ...state.participants,
        [call.initiatorId]: {
          userId: call.initiatorId,
          status: "invited",
          isLocalUser: false,
          audioEnabled: true,
        },
      },
    }));
  },

  clearIncomingCall: () => {
    set({ incomingCall: null });
  },

  addParticipant: (participant: CallParticipant) => {
    if (!participant.userId) {
      console.warn("[useCallStore] addParticipant: missing userId");
      return;
    }
    set((state) => ({
      participants: {
        ...state.participants,
        [participant.userId]: participant,
      },
    }));
  },

  removeParticipant: (userId: string) => {
    set((state) => {
      const participant = state.participants[userId];
      // Release remote stream when participant leaves
      if (participant?.remoteStream) {
        releaseMediaStream(participant.remoteStream);
      }
      const { [userId]: _, ...remaining } = state.participants;
      return { participants: remaining };
    });
  },

  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => {
    if (!userId) {
      console.warn("[useCallStore] updateParticipant: missing userId");
      return;
    }
    set((state) => {
      const existing = state.participants[userId];
      if (!existing) {
        // Don't auto-create from partial — caller must addParticipant first.
        // This prevents crashes from spreading undefined.
        console.warn(
          "[useCallStore] updateParticipant: unknown userId",
          userId
        );
        return state;
      }
      return {
        participants: {
          ...state.participants,
          [userId]: { ...existing, ...updates },
        },
      };
    });
  },

  updateParticipantStream: (userId: string, stream: MediaStream | null) => {
    if (!userId) {
      console.warn("[useCallStore] updateParticipantStream: missing userId");
      return;
    }
    set((state) => {
      const existing = state.participants[userId];
      if (!existing) {
        // Create a minimal participant if backend forgot to announce them
        return {
          participants: {
            ...state.participants,
            [userId]: {
              userId,
              status: "accepted",
              isLocalUser: false,
              audioEnabled: true,
              remoteStream: stream || undefined,
            },
          },
        };
      }

      // If replacing an existing stream, release the old one
      if (existing.remoteStream && existing.remoteStream !== stream) {
        releaseMediaStream(existing.remoteStream);
      }

      return {
        participants: {
          ...state.participants,
          [userId]: {
            ...existing,
            remoteStream: stream || undefined,
          },
        },
      };
    });
  },

  setLocalStream: (stream: MediaStream | null) => {
    const { localStream } = get();
    // Release old stream if replacing
    if (localStream && localStream !== stream) {
      releaseMediaStream(localStream);
    }
    set({ localStream: stream });
  },

  toggleAudio: (enabled: boolean) => {
    set({ isAudioEnabled: enabled });
    const { localStream } = get();
    if (localStream) {
      try {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
      } catch (err) {
        console.warn("[useCallStore] toggleAudio failed", err);
      }
    }
  },

  toggleVideo: (enabled: boolean) => {
    set({ isVideoEnabled: enabled });
    const { localStream } = get();
    if (localStream) {
      try {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = enabled;
        });
      } catch (err) {
        console.warn("[useCallStore] toggleVideo failed", err);
      }
    }
  },

  updateConnectionState: (userId: string, state: RTCPeerConnectionState) => {
    if (!userId) return;
    set((prevState) => {
      const existing = prevState.participants[userId];
      if (!existing) {
        console.warn(
          "[useCallStore] updateConnectionState: unknown userId",
          userId
        );
        return prevState;
      }
      return {
        participants: {
          ...prevState.participants,
          [userId]: { ...existing, connectionState: state },
        },
      };
    });
  },

  addSignalingData: (data: SignalingData) => {
    set((state) => ({
      signalingQueue: [...state.signalingQueue, data],
    }));
  },

  getNextSignalingData: () => {
    const state = get();
    return state.signalingQueue[0];
  },

  clearSignalingQueue: () => {
    set({ signalingQueue: [] });
  },

  queueOutgoingSignal: (signal: OutgoingSignal) => {
    set((state) => ({
      outgoingSignalQueue: [...state.outgoingSignalQueue, signal],
    }));
  },

  drainOutgoingSignals: () => {
    const queue = get().outgoingSignalQueue;
    set({ outgoingSignalQueue: [] });
    return queue;
  },

  clearOutgoingSignalQueue: () => {
    set({ outgoingSignalQueue: [] });
  },

  resetCall: () => {
    const state = get();
    releaseMediaStream(state.localStream);
    Object.values(state.participants).forEach((p) => {
      releaseMediaStream(p.remoteStream || null);
    });

    set({
      callState: "idle",
      currentCall: { ...initialCallSession },
      incomingCall: null,
      participants: {},
      signalingQueue: [],
      outgoingSignalQueue: [],
      localStream: null,
      isAudioEnabled: true,
      isVideoEnabled: false,
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  getCallDuration: () => {
    const { currentCall } = get();
    if (!currentCall || !currentCall.startedAt) return 0;
    return Date.now() - currentCall.startedAt;
  },

  isCallActive: () => {
    const { callState, currentCall } = get();
    return callState === "active" && currentCall !== null;
  },

  isBusy: () => {
    const { callState } = get();
    return callState !== "idle" && callState !== "ended";
  },

  getParticipantCount: () => {
    const { participants } = get();
    return Object.keys(participants).length;
  },
}));
