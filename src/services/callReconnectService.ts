import { CallState, useCallStore } from "../store/useCallStore";
import { getSocket } from "./socket";
import { callService } from "./callService";

/**
 * Call Reconnect Service
 * Handles network disconnections and recovery during active calls
 * Pattern: Follows backend call-recovery.service.ts pattern
 */

interface CallRecoveryState {
  callId: string;
  conversationId: string;
  participants: Record<string, any>;
  state: CallState;
}

class CallReconnectService {
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 2000;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Handle socket disconnection during active call
   * Called from socket connection listener
   */
  async handleDisconnection(): Promise<void> {
    const { callState, currentCall } = useCallStore.getState();

    // Only handle if there's an active call
    if (callState !== "active" && callState !== "connecting") {
      console.log("[CallReconnectService] No active call, skipping recovery");
      return;
    }

    console.log(
      "[CallReconnectService] Network disconnection detected during call"
    );

    // Start recovery attempts
    await this.attemptRecovery();
  }

  /**
   * Handle successful reconnection
   * Called from socket connection listener after reconnection
   */
  async handleReconnection(): Promise<void> {
    const { callState, currentCall } = useCallStore.getState();

    if (!currentCall || !currentCall.callId) {
      console.log("[CallReconnectService] No active call to recover");
      return;
    }

    console.log("[CallReconnectService] Socket reconnected, attempting recovery");

    try {
      const recovered = await this.requestCallState(
        currentCall.callId,
        currentCall.conversationId || ""
      );

      if (recovered) {
        console.log("[CallReconnectService] Call state recovered successfully");
        this.resetReconnectAttempts();
      } else {
        console.log(
          "[CallReconnectService] Call state not available, ending call"
        );
        useCallStore.getState().endCall();
      }
    } catch (error) {
      console.error(
        "[CallReconnectService] Error handling reconnection",
        error
      );
      // Attempt recovery retry
      await this.scheduleRecoveryRetry();
    }
  }

  /**
   * Request current call state from server
   * Used to recover state after reconnection
   */
  private async requestCallState(
    callId: string,
    conversationId: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = getSocket();

      if (!socket || !socket.connected) {
        console.log("[CallReconnectService] Socket not connected");
        resolve(false);
        return;
      }

      // Set timeout for state request
      const timeoutId = setTimeout(() => {
        console.warn("[CallReconnectService] Call state request timeout");
        resolve(false);
      }, 5000);

      socket.emit(
        "call:state:request",
        { call_id: callId, conversation_id: conversationId, requested_at: Date.now() },
        (response: any) => {
          clearTimeout(timeoutId);

          if (response?.error) {
            console.log(
              "[CallReconnectService] Server error:",
              response.error
            );
            resolve(false);
            return;
          }

          if (response?.callState) {
            this.applyRecoveredState(response.callState);
            resolve(true);
          } else {
            // Call state not found on server, likely ended
            resolve(false);
          }
        }
      );
    });
  }

  /**
   * Apply recovered call state to local store
   * Synchronizes frontend state with backend after reconnection
   */
  private applyRecoveredState(recoveredState: CallRecoveryState): void {
    try {
      const {
        setCallState,
        addParticipant,
        participants: currentParticipants,
      } = useCallStore.getState();

      // Update call state
      if (recoveredState.state) {
        setCallState(recoveredState.state);
      }

      // Sync participants
      if (recoveredState.participants) {
        Object.entries(recoveredState.participants).forEach(
          ([userId, participantData]) => {
            if (!currentParticipants[userId]) {
              addParticipant({
                userId,
                ...participantData,
              });
            }
          }
        );
      }

      console.log(
        "[CallReconnectService] Applied recovered state",
        recoveredState
      );
    } catch (error) {
      console.error(
        "[CallReconnectService] Error applying recovered state",
        error
      );
    }
  }

  /**
   * Attempt to recover the call connection
   */
  private async attemptRecovery(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log("[CallReconnectService] Max recovery attempts reached");
      useCallStore.getState().endCall();
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[CallReconnectService] Recovery attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`
    );

    await this.scheduleRecoveryRetry();
  }

  /**
   * Schedule recovery retry after delay
   */
  private scheduleRecoveryRetry(): Promise<void> {
    return new Promise((resolve) => {
      this.reconnectTimeoutId = setTimeout(() => {
        const socket = getSocket();

        if (socket && socket.connected) {
          console.log("[CallReconnectService] Socket reconnected, recovering state");
          this.handleReconnection();
        } else {
          console.log("[CallReconnectService] Still disconnected, will retry");
          this.attemptRecovery();
        }

        resolve();
      }, this.RECONNECT_DELAY_MS);
    });
  }

  /**
   * Reset reconnection state on successful recovery
   */
  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectTimeout();
  }

  /**
   * Clear any pending reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Force recovery attempt
   * Can be called manually if needed
   */
  async forceRecovery(): Promise<void> {
    console.log("[CallReconnectService] Force recovery triggered");
    this.reconnectAttempts = 0;
    const { currentCall } = useCallStore.getState();

    if (currentCall && currentCall.callId) {
      await this.requestCallState(
        currentCall.callId,
        currentCall.conversationId || ""
      );
    }
  }

  /**
   * Abort all recovery operations
   * Called when ending call or switching away
   */
  abort(): void {
    console.log("[CallReconnectService] Aborting recovery operations");
    this.clearReconnectTimeout();
    this.reconnectAttempts = 0;
  }
}

export const callReconnectService = new CallReconnectService();

// React hook
export function useCallReconnectService() {
  return {
    handleDisconnection: callReconnectService.handleDisconnection.bind(
      callReconnectService
    ),
    handleReconnection: callReconnectService.handleReconnection.bind(
      callReconnectService
    ),
    forceRecovery: callReconnectService.forceRecovery.bind(
      callReconnectService
    ),
    abort: callReconnectService.abort.bind(callReconnectService),
  };
}
