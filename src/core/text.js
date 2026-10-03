// Template strings are eventually assigned to innerHTML. Escape untrusted text
// so names/messages remain text instead of becoming tags or HTML attributes.
// This is for HTML text and quoted attributes only; URLs need separate validation.
export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
