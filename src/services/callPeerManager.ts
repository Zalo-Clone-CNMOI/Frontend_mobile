class CallPeerManager {
  private active = false;

  isActive(): boolean {
    return this.active;
  }

  async startCall(
    _callId: string,
    _isInitiator: boolean,
    _remoteUserId: string,
    _conversationId: string
  ): Promise<void> {
    console.warn("[CallPeerManager] WebRTC not available on this platform");
  }

  async acceptCall(
    _callId: string,
    _conversationId: string,
    _remoteUserId: string
  ): Promise<void> {
    console.warn("[CallPeerManager] WebRTC not available on this platform");
  }

  async handleSignal(
    _callId: string,
    _fromUserId: string,
    _type: string,
    _data: any
  ): Promise<void> {
    console.warn("[CallPeerManager] WebRTC not available on this platform");
  }

  cleanup(): void {
    this.active = false;
  }
}

export const callPeerManager = new CallPeerManager();
