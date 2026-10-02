import { icon, brand } from "./icons.js";

const customerLinks = [
  ["/dashboard", "Dashboard", "dashboard"],
  ["/transfer", "Transfer", "transfer"],
  ["/transactions", "Transactions", "transactions"],
  ["/loan", "Loans", "loan"],
  ["/profile", "Profile", "profile"],
];
const adminLinks = [["/admin", "Overview", "dashboard"]];

function linkMarkup([path, label, iconName], activePath) {
  const active = path === activePath ? " active" : "";
  return `<a class="side-link${active}" href="#${path}" data-route${active ? ' aria-current="page"' : ""}>${icon(iconName)}<span>${label}</span></a>`;
}

export function renderShell(content, { currentUser, activePath, logoutPath = "/" }) {
  const isAdmin = currentUser.role === "ADMIN";
  const links = isAdmin ? adminLinks : customerLinks;
  const navLinks = links.map((item) => linkMarkup(item, activePath)).join("");
  return `<div class="app-shell">
    <header class="topbar"><div class="topbar-inner">${brand()}<div class="d-flex align-items-center gap-3"><div class="secure-label"><span class="secure-dot"></span><span>Online banking</span></div><button class="icon-button mobile-logout" type="button" data-action="logout" data-logout-path="${logoutPath}" aria-label="Log out">${icon("logout")}</button></div></div></header>
    <div class="workspace">
      <aside class="sidebar" aria-label="Main navigation">
        <div><p class="nav-caption">${isAdmin ? "Administration" : "Your banking"}</p>${navLinks}</div>
        <div class="side-bottom">
          ${isAdmin ? `<a class="side-link" href="#/admin" data-route>${icon("transactions")}<span>Transactions overview</span></a>` : `<a class="side-link" href="#/dashboard">${icon("bell")}<span>Notifications <span class="visually-hidden">are on your dashboard</span></span></a>`}
          <button class="side-link" type="button" data-action="logout" data-logout-path="${logoutPath}">${icon("logout")}<span>Log out</span></button>
        </div>
      </aside>
      <main id="app-main" class="main-content" tabindex="-1">${isAdmin ? '<div class="admin-banner mb-4">Staff workspace · Customer accounts and application reviews</div>' : ""}${content}</main>
    </div>
    <nav class="mobile-nav${isAdmin ? " mobile-nav-admin" : ""}" aria-label="Mobile navigation">${navLinks}</nav>
  </div>`;
}