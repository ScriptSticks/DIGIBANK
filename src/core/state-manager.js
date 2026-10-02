export class StateManager {
  constructor() {
    // Only the active identity is transient; credentials are never written to browser storage.
    this.currentUserId = null;
    this.listeners = new Set();
  }

  setCurrentUser(user) {
    this.currentUserId = user?.id ?? null;
    this.notify();
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }
}