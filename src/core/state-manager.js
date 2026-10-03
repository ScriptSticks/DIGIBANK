export class StateManager {
  constructor() {
    // Only the active identity is transient; credentials are never written to browser storage.
    this.currentUserId = null;
    this.listeners = new Set();
  }

  setCurrentUser(user) {
    // Store only the ID: callers can look up fresh profile data from a repository
    // instead of keeping a stale copy here after a photo or account update.
    this.currentUserId = user?.id ?? null;
    this.notify();
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  subscribe(listener) {
    // This is a small observer pattern: main.js registers a function to rerender
    // after identity changes. The returned function allows future callers to unsubscribe.
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }
}
