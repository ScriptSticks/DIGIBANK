export class Router {
  constructor({ routes, render, getCurrentUser, getUserById }) {
    // Hash routes work on a static file server and do not require server-side rewrites.
    this.routes = routes;
    this.render = render;
    this.getCurrentUser = getCurrentUser;
    this.getUserById = getUserById;
    window.addEventListener("hashchange", () => this.resolve());
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-route]");
      if (!link) return;
      event.preventDefault();
      this.navigateTo(link.getAttribute("href").slice(1));
    });
  }

  navigateTo(path) {
    const nextHash = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === nextHash) this.resolve();
    else window.location.hash = nextHash;
  }

  resolve() {
    let path = window.location.hash.slice(1) || "/";
    const route = this.routes[path];
    const currentUser = this.getUserById(this.getCurrentUser());
    if (path === "/" && currentUser) {
      this.navigateTo(currentUser.role === "ADMIN" ? "/admin" : "/dashboard");
      return;
    }
    if (route?.admin && route.auth && currentUser?.role !== "ADMIN") {
      this.navigateTo("/admin/login");
      return;
    }
    if (route?.auth && !currentUser) {
      this.navigateTo(route.admin ? "/admin/login" : "/login");
      return;
    }
    if (currentUser?.role === "ADMIN" && route?.customer) {
      this.navigateTo("/admin");
      return;
    }
    if (path === "/admin/login" && currentUser?.role === "ADMIN") {
      this.navigateTo("/admin");
      return;
    }
    if (path === "/login" && currentUser?.role === "CUSTOMER") {
      this.navigateTo("/dashboard");
      return;
    }
    this.render(route?.page ?? "notFound", { path, currentUser });
  }
}