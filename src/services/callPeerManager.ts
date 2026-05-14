import { useCallStore } from '../store/useCallStore';

class CallPeerManager {
  isActive(): boolean {
    return false;
  }

  async startCall(_callId: string, _isInitiator: boolean, _remoteUserId: string, _conversationId: string) {}

  async acceptCall(_callId: string, _conversationId: string, _remoteUserId: string) {}

  async handleSignal(_callId: string, _fromUserId: string, _type: string, _data: any) {}

  cleanup() {}
}

export const callPeerManager = new CallPeerManager();
