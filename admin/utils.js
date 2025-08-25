"use strict";

window.AdminUtils = (function () {
  const API_BASE = window.__API_BASE__ || "https://cho-tj61.onrender.com";
  // Namespace token storage by API host to prevent cross-environment token reuse
  let TOKEN_KEY = "l9PpjeTCJjk1ovm/vbJYNko45DF1OjOa7sztxL/85n+17o0vnSZ9kMpIep8dc2k5";
  try {
    const host = new URL(API_BASE).host;
    TOKEN_KEY = `${TOKEN_KEY}@${host}`;
  } catch {}

  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToken(tok) {
    localStorage.setItem(TOKEN_KEY, tok);
  }
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleUnauthorized() {
    clearToken();
    toast("Session expired. Please log in again.", "error");
    window.App.renderLogin();
  }

  async function apiFetch(path, opts = {}) {
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);

      // Handle auth errors first, as they are a special case
      if (res.status === 401) {
        handleUnauthorized();
        throw { body: { message: "Unauthorized" } };
      }

      // Get the raw response body as text first
      const textResponse = await res.text();

      if (!res.ok) {
        // If the server returned an error, try to parse it as JSON.
        // If that fails, it's likely an HTML error page or plain text.
        try {
          const jsonError = JSON.parse(textResponse);
          throw { status: res.status, body: jsonError };
        } catch (e) {
          // Check for common text-based errors from the server
          if (textResponse.includes("limit")) {
            throw {
              status: res.status,
              body: {
                message:
                  "File is too large. Please upload a smaller image (max 10MB).",
              },
            };
          }
          if (
            textResponse.includes("Cannot POST") ||
            textResponse.includes("Cannot GET")
          ) {
            throw {
              status: res.status,
              body: {
                message:
                  "API endpoint not found on the server. Please check the backend code.",
              },
            };
          }
          // Fallback for any other non-JSON error
          throw {
            status: res.status,
            body: {
              message: textResponse || "An unknown server error occurred.",
            },
          };
        }
      }

      // If the response was successful but empty (e.g., a 204 No Content), return an empty object.
      // Otherwise, parse the successful JSON response.
      return textResponse ? JSON.parse(textResponse) : {};
    } catch (err) {
      console.error("API Error:", err);
      // Re-throw a clean error object for the calling function to handle
      throw err.body || { message: "Network error or server is unavailable." };
    }
  }

  function apiJson(path, opts = {}) {
    return apiFetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
        ...authHeaders(),
      },
    });
  }

  function apiForm(path, formData, opts = {}) {
    return apiFetch(path, {
      method: opts.method || "POST",
      body: formData,
      headers: { ...authHeaders(), ...opts.headers },
    });
  }

  function centeredSpinner(message = "Loading...") {
    return `<div class="d-flex flex-column justify-content-center align-items-center text-muted" style="min-height:40vh;"><div class="spinner-border text-primary mb-2" role="status"></div><span>${message}</span></div>`;
  }

  function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast-msg toast-${type}`;
    el.textContent = Array.isArray(msg)
      ? msg.join(", ")
      : typeof msg === "string"
      ? msg
      : "An unexpected error occurred.";
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function imgUrl(p) {
    if (!p) return "";
    return String(p).startsWith("/") ? `${API_BASE}${p}` : p;
  }

  function preventDuplicateSubmission(form, handler) {
    return async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn.disabled) return;

      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;

      try {
        await handler(e);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    };
  }

  function setFieldError(input, message) {
    input.classList.add("is-invalid");
    const parent = input.closest("div");
    let feedback = parent?.querySelector(".invalid-feedback");
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "invalid-feedback";
      input.insertAdjacentElement("afterend", feedback);
    }
    feedback.textContent = message;
  }

  function clearFieldError(input) {
    input.classList.remove("is-invalid");
  }

  function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  return {
    $,
    $all,
    setToken,
    getToken,
    clearToken,
    apiJson,
    apiForm,
    centeredSpinner,
    toast,
    imgUrl,
    preventDuplicateSubmission,
    setFieldError,
    clearFieldError,
    debounce,
  };
})();
