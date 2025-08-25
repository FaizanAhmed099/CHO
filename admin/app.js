"use strict";

// Suppress noisy third-party injected errors (e.g., extensions/recorders)
(() => {
  const shouldIgnore = (msg) => {
    if (!msg) return false;
    const s = String(msg).toLowerCase();
    return s.includes("tx_attempts_exceeded") || s.includes("tx_init_failure");
  };
  window.addEventListener(
    "error",
    (e) => {
      try {
        const m = e?.message || e?.error?.message;
        if (shouldIgnore(m)) {
          e.preventDefault?.();
          return false;
        }
      } catch {}
    },
    true
  );
  window.addEventListener("unhandledrejection", (e) => {
    try {
      const r = e?.reason;
      const m =
        typeof r === "string"
          ? r
          : r?.message || r?.toString?.();
      if (shouldIgnore(m)) {
        e.preventDefault?.();
        return false;
      }
    } catch {}
  });
})();

window.App = (function () {
  const {
    $,
    $all,
    getToken,
    clearToken,
    apiJson,
    toast,
    preventDuplicateSubmission,
  } = window.AdminUtils;

  const routes = {
    clients: {
      name: "Clients",
      module: window.ClientsModule,
      icon: "fa-handshake",
    },
    awards: { name: "Awards", module: window.AwardsModule, icon: "fa-award" },
    directors: {
      name: "Directors",
      module: window.DirectorsModule,
      icon: "fa-user-tie",
    },
    projects: {
      name: "Projects",
      module: window.ProjectsModule,
      icon: "fa-briefcase",
    },
    gallery: {
      name: "Gallery",
      module: window.GalleryModule,
      icon: "fa-images",
    },
    contact: {
      name: "Messages",
      module: window.ContactModule,
      icon: "fa-envelope",
    },
  };

  function renderLogin() {
    $("#app").innerHTML = `
      <div class="container login-container position-relative overflow-hidden">
        <div class="auth-decor-blob one"></div>
        <div class="auth-decor-blob two"></div>

        <div class="auth-card mx-auto">
          <div class="card shadow-lg border-0 rounded-4">
            <div class="card-body p-4 p-md-5">
              <div class="brand text-center mb-4">
                <div class="brand-mark mx-auto mb-2"><i class="fa-solid fa-lock"></i></div>
                <h3 class="mb-0">Admin Panel</h3>
                <p class="text-muted mb-0">Sign in to manage your content</p>
              </div>
              <form id="loginForm" autocomplete="on">
                <div class="form-floating mb-3">
                  <input type="email" value="admin@example.com" class="form-control" name="email" id="email" placeholder="name@example.com" required />
                  <label for="email">Email address</label>
                </div>
                <div class="mb-4 position-relative">
                  <div class="form-floating">
                    <input type="password" value="password123" class="form-control pe-5" name="password" id="password" placeholder="Password" required />
                    <label for="password">Password</label>
                  </div>
                  <button type="button" id="togglePwd" class="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted" tabindex="-1" aria-label="Show password"><i class="fa-regular fa-eye"></i></button>
                </div>
                <button class="btn btn-primary w-100 btn-lg shadow-sm auth-submit" type="submit">
                  <i class="fa-solid fa-right-to-bracket me-2"></i> Sign In
                </button>
              </form>
              <div class="text-center mt-4 text-muted small">&copy; <span id="year"></span> Admin</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // year
    const yEl = document.getElementById("year");
    if (yEl) yEl.textContent = new Date().getFullYear();

    // password toggle
    document.getElementById("togglePwd")?.addEventListener("click", () => {
      const inp = document.getElementById("password");
      if (!inp) return;
      const isText = inp.getAttribute("type") === "text";
      inp.setAttribute("type", isText ? "password" : "text");
      const icon = document.querySelector("#togglePwd i");
      if (icon) icon.className = isText ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
    });

    $("#loginForm").addEventListener(
      "submit",
      preventDuplicateSubmission($("#loginForm"), async (e) => {
        const payload = {
          email: e.target.email.value,
          password: e.target.password.value,
        };
        try {
          const res = await apiJson("/api/admin/login", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          window.AdminUtils.setToken(res.token);
          toast("Login successful", "success");
          init();
        } catch (err) {
          toast(err.message || "Login failed", "error");
        }
      })
    );
  }

  function renderDashboardLayout() {
    const navLinks = Object.entries(routes)
      .map(
        ([key, { name, icon }]) =>
          `<li class="nav-item">
            <a class="nav-link" href="#" data-tab="${key}">
              <i class="nav-icon fas ${icon}"></i>${name}
            </a>
          </li>`
      )
      .join("");

    $("#app").innerHTML = `
      <div class="sidebar-overlay d-lg-none"></div>
      <aside class="sidebar d-flex flex-column min-vh-100">
        <div class="sidebar-header">Admin</div>
        <ul class="nav flex-column sidebar-nav">${navLinks}</ul>
        <div class="sidebar-footer mt-auto p-3">
          <button id="logoutBtn" class="btn btn-outline-danger w-100">
            <i class="fas fa-sign-out-alt me-1"></i> Logout
          </button>
        </div>
      </aside>
      <div class="main-content">
        <nav class="topbar d-flex justify-content-between align-items-center d-lg-none">
          <button class="btn btn-light" id="sidebar-toggle"><i class="fas fa-bars"></i></button>
        </nav>
        <main id="content-area"></main>
      </div>
    `;
    bindLayoutEvents();
    // Restore last active tab (default to first route)
    const saved = localStorage.getItem("admin_active_tab");
    const first = Object.keys(routes)[0];
    const target = saved && routes[saved] ? saved : first;
    navigateTo(target);
  }

  function bindLayoutEvents() {
    $("#logoutBtn").addEventListener("click", () => {
      clearToken();
      renderLogin();
    });
    $("#sidebar-toggle").addEventListener("click", () =>
      document.body.classList.toggle("sidebar-visible")
    );
    $(".sidebar-overlay").addEventListener("click", () =>
      document.body.classList.remove("sidebar-visible")
    );
    $(".sidebar-nav").addEventListener("click", (e) => {
      const link = e.target.closest("a[data-tab]");
      if (!link) return;
      e.preventDefault();
      navigateTo(link.dataset.tab);
      document.body.classList.remove("sidebar-visible");
    });
  }

  function navigateTo(tabKey) {
    $all(".sidebar-nav .nav-link").forEach((l) =>
      l.classList.remove("active")
    );
    $(`.sidebar-nav .nav-link[data-tab="${tabKey}"]`)?.classList.add("active");
    const route = routes[tabKey];
    if (route?.module?.render) {
      try {
        localStorage.setItem("admin_active_tab", tabKey);
      } catch {}
      route.module.render();
    } else {
      $("#content-area").innerHTML = `
        <div class="alert alert-danger">Module for "${tabKey}" not found.</div>
      `;
    }
  }

  async function init() {
    if (!getToken()) return renderLogin();
    try {
      await apiJson("/api/admin/users");
      renderDashboardLayout();
    } catch (e) {
      console.log("Token verification failed, redirecting to login.");
      renderLogin();
    }
  }

  return { init, renderLogin };
})();

document.addEventListener("DOMContentLoaded", window.App.init);
