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
    // Assigning the same hash does not fire hashchange. Resolve it ourselves so
    // actions can refresh the current screen as well as navigate to another one.
    const nextHash = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === nextHash) this.resolve();
    else window.location.hash = nextHash;
  }

  resolve() {
    // Convert a URL like #/profile into a route lookup. Check redirects before
    // rendering, and return after each one so two screens cannot render at once.
    let path = window.location.hash.slice(1) || "/";
    const route = this.routes[path];
    const currentUser = this.getUserById(this.getCurrentUser());
    if (path === "/" && currentUser) {
      this.navigateTo(currentUser.role === "ADMIN" ? "/admin" : "/dashboard");
      return;
    }
    // These are navigation guards, not a security boundary. A production server
    // must check the signed-in user's permissions on every protected operation.
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
