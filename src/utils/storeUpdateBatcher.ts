/**
 * Store Update Batcher - Utility to batch store updates and reduce re-renders
 * 
 * This utility helps reduce UI re-rendering by batching multiple store updates
 * into a single update cycle using requestAnimationFrame.
 */

type StoreUpdate = {
  store: any;
  action: string;
  payload?: any;
};

class StoreUpdateBatcher {
  private pendingUpdates: StoreUpdate[] = [];
  private isScheduled = false;
  private batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Add a store update to the batch queue
   */
  addUpdate(update: StoreUpdate) {
    this.pendingUpdates.push(update);
    this.scheduleBatch();
  }

  /**
   * Schedule batch execution using requestAnimationFrame
   */
  private scheduleBatch() {
    if (this.isScheduled) return;

    this.isScheduled = true;
    
    // Use requestAnimationFrame to batch updates in the next frame
    requestAnimationFrame(() => {
      this.flushUpdates();
    });
  }

  /**
   * Execute all pending store updates
   */
  private flushUpdates() {
    if (this.pendingUpdates.length === 0) {
      this.isScheduled = false;
      return;
    }

    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];
    this.isScheduled = false;

    // Group updates by store to reduce redundant calls
    const updatesByStore = new Map<any, StoreUpdate[]>();
    updates.forEach(update => {
      if (!updatesByStore.has(update.store)) {
        updatesByStore.set(update.store, []);
      }
      updatesByStore.get(update.store)!.push(update);
    });

    // Execute updates for each store
    updatesByStore.forEach((storeUpdates, store) => {
      storeUpdates.forEach(update => {
        try {
          // Call the store action with the payload
          if (typeof store[update.action] === 'function') {
            store[update.action](update.payload);
          }
        } catch (error) {
          console.error('[StoreUpdateBatcher] Error executing update:', error);
        }
      });
    });
  }

  /**
   * Clear all pending updates immediately
   */
  flush() {
    this.flushUpdates();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * Get the number of pending updates
   */
  getPendingCount(): number {
    return this.pendingUpdates.length;
  }
}

// Create a singleton instance
const storeUpdateBatcher = new StoreUpdateBatcher();

export default storeUpdateBatcher;
export { StoreUpdateBatcher, type StoreUpdate };
