const THEME_KEY = "digibank.theme";
let preferredTheme = "light";

try {
  if (localStorage.getItem(THEME_KEY) === "dark") preferredTheme = "dark";
} catch {
  // Theme switching still works when browser storage is unavailable.
}

export function applyTheme(signedIn) {
  const theme = signedIn ? preferredTheme : "light";
  document.documentElement.dataset.bsTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111a17" : "#f7faf8");
  document.querySelectorAll('[data-action="set-theme"]').forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
  });
}

export function setTheme(theme) {
  if (theme !== "light" && theme !== "dark") return;
  preferredTheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Retain the preference in memory for this page session.
  }
  applyTheme(true);
}
