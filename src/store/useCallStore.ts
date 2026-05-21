import { create } from "zustand";
import { generateUUID } from "../utils/uuid";

/**
 * Call State Store
 * Manages the complete call lifecycle and state machine
 * Pattern: Zustand (v5.0.9) - Same as usePresenceStore
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

export interface CallSession {
  callId: string | null;
  conversationId: string | null;
  remoteUserId: string | null;
  callType: "audio" | "video";
  startedAt: number | null;
  duration: number; // in milliseconds
}

export interface UseCallStoreState {
  // State
  callState: CallState;
  currentCall: CallSession | null;
  incomingCall: IncomingCallData | null;
  participants: Record<string, CallParticipant>;
  signalingQueue: SignalingData[];
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  error: string | null;

  // Call Management Actions
  initiateCall: (conversationId: string, callType: "audio" | "video", callId?: string, startedAt?: number, remoteUserId?: string) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endCall: () => void;

  // State Transitions
  setCallState: (state: CallState) => void;

  // Incoming Call Management
  addIncomingCall: (call: IncomingCallData) => void;
  clearIncomingCall: () => void;

  // Participant Management
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => void;
  updateParticipantStream: (
    userId: string,
    stream: MediaStream | null
  ) => void;

  // Media Control
  setLocalStream: (stream: MediaStream | null) => void;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  updateConnectionState: (
    userId: string,
    state: RTCPeerConnectionState
  ) => void;

  // Signaling
  addSignalingData: (data: SignalingData) => void;
  getNextSignalingData: () => SignalingData | undefined;
  clearSignalingQueue: () => void;

  // Recovery & Reset
  resetCall: () => void;
  setError: (error: string | null) => void;

  // Utilities
  getCallDuration: () => number;
  isCallActive: () => boolean;
  getParticipantCount: () => number;
}

const initialCallSession: CallSession = {
  callId: null,
  conversationId: null,
  callType: "audio",
  startedAt: null,
  duration: 0,
};

export const useCallStore = create<UseCallStoreState>((set, get) => ({
  // Initial State
  callState: "idle",
  currentCall: null,
  incomingCall: null,
  participants: {},
  signalingQueue: [],
  localStream: null,
  isAudioEnabled: true,
  isVideoEnabled: false,
  error: null,

  // Call Management Actions
  initiateCall: (conversationId: string, callType: "audio" | "video", callId?: string, startedAt?: number, remoteUserId?: string) => {
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
      error: null,
    });
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
      error: null,
    });
  },

  endCall: () => {
    set({
      callState: "idle",
      currentCall: { ...initialCallSession },
      participants: {},
      signalingQueue: [],
      isAudioEnabled: true,
      isVideoEnabled: false,
      error: null,
    });
  },

  // State Transitions
  setCallState: (state: CallState) => {
    set({ callState: state });
  },

  // Incoming Call Management
  addIncomingCall: (call: IncomingCallData) => {
    set({
      incomingCall: call,
      callState: "incoming",
      error: null,
    });

    // Add initiator as participant
    set((state) => ({
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

  // Participant Management
  addParticipant: (participant: CallParticipant) => {
    set((state) => ({
      participants: {
        ...state.participants,
        [participant.userId]: participant,
      },
    }));
  },

  removeParticipant: (userId: string) => {
    set((state) => {
      const { [userId]: _, ...remaining } = state.participants;
      return { participants: remaining };
    });
  },

  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => {
    set((state) => ({
      participants: {
        ...state.participants,
        [userId]: {
          ...state.participants[userId],
          ...updates,
        },
      },
    }));
  },

  updateParticipantStream: (userId: string, stream: MediaStream | null) => {
    set((state) => ({
      participants: {
        ...state.participants,
        [userId]: {
          ...state.participants[userId],
          remoteStream: stream || undefined,
        },
      },
    }));
  },

  // Media Control
  setLocalStream: (stream: MediaStream | null) => {
    set({ localStream: stream });
  },

  toggleAudio: (enabled: boolean) => {
    set({ isAudioEnabled: enabled });

    // Mute/unmute all audio tracks in local stream
    const { localStream } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  },

  toggleVideo: (enabled: boolean) => {
    set({ isVideoEnabled: enabled });

    // Enable/disable all video tracks in local stream
    const { localStream } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  },

  updateConnectionState: (
    userId: string,
    state: RTCPeerConnectionState
  ) => {
    set((prevState) => ({
      participants: {
        ...prevState.participants,
        [userId]: {
          ...prevState.participants[userId],
          connectionState: state,
        },
      },
    }));
  },

  // Signaling
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

  // Recovery & Reset
  resetCall: () => {
    set({
      callState: "idle",
      currentCall: { ...initialCallSession },
      incomingCall: null,
      participants: {},
      signalingQueue: [],
      localStream: null,
      isAudioEnabled: true,
      isVideoEnabled: false,
      error: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  // Utilities
  getCallDuration: () => {
    const { currentCall } = get();
    if (!currentCall || !currentCall.startedAt) return 0;
    return Date.now() - currentCall.startedAt;
  },

  isCallActive: () => {
    const { callState, currentCall } = get();
    return callState === "active" && currentCall !== null;
  },

  getParticipantCount: () => {
    const { participants } = get();
    return Object.keys(participants).length;
  },
}));
