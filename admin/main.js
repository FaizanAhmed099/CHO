"use strict";

(function () {
  const API_BASE = window.__API_BASE__ || "https://cho-tj61.onrender.com";
  const TOKEN_KEY = "choc_admin_token";

  // -------------- Utilities --------------
  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  // Reusable centered spinner for loading states
  function centeredSpinner(message = "Loading...") {
    return `
      <div class="d-flex flex-column justify-content-center align-items-center text-muted" style="min-height:50vh;">
        <div class="spinner-border text-primary mb-2" role="status" aria-hidden="true"></div>
        <div>${message}</div>
      </div>`;
  }

  // Ensure only one click listener is bound to #tabContent at a time
  let __removeHostClickListener = null;
  function setHostClickListener(host, handler) {
    if (__removeHostClickListener) {
      try {
        __removeHostClickListener();
      } catch (_) {}
      __removeHostClickListener = null;
    }
    host.addEventListener("click", handler);
    __removeHostClickListener = () =>
      host.removeEventListener("click", handler);
  }

  // -------------- Directors Module --------------
  async function fetchDirectors() {
    return await apiJson("/api/directors");
  }
  function directorsListHtml(items) {
    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Directors</h5>
        <button class="btn btn-primary" data-action="open-create">Add Director</button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th style=\"width:60px\">Image</th>
              <th>Name</th>
              <th>Role</th>
              <th>Slug</th>
              <th>Active</th>
              <th style=\"width:140px\"></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (d) => `
                <tr data-id="${d._id}">
                  <td>${
                    d.image
                      ? `<img src="${imgUrl(d.image)}" class="thumb">`
                      : ""
                  }</td>
                  <td>${d.name || ""}</td>
                  <td>${d.role || ""}</td>
                  <td class="small">${d.slug || ""}</td>
                  <td>${d.isActive !== false ? "Yes" : "No"}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                    <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                  </td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }
  function renderDirectorsTab() {
    const host = $("#tabContent");
    host.innerHTML = centeredSpinner("Loading directors...");
    fetchDirectors()
      .then((items) => {
        host.innerHTML = directorsListHtml(items);
        bindDirectorsEvents(host);
      })
      .catch((err) => {
        const msg = err?.body?.message || "Failed to load directors";
        host.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
      });
  }
  function bindDirectorsEvents(host) {
    const handler = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "open-create") return renderDirectorCreateForm();
      const tr = e.target.closest("tr[data-id]");
      const id = tr?.getAttribute("data-id");
      if (!id) return;
      if (action === "delete") return deleteDirector(id);
      if (action === "edit") return renderDirectorEditForm(id);
    };
    setHostClickListener(host, handler);
  }
  function renderDirectorCreateForm() {
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Add Director</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="dirForm" class="card p-3 shadow-sm" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Name</label>
            <input name="name" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Role</label>
            <input name="role" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Image</label>
            <div id="dirImageDropzone" class="text-center p-4" style="border: 2px dashed #0d6efd; border-radius: .5rem; background: #f8f9fa; cursor: pointer;">
              <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
              <p class="mt-2 mb-0">Drag & drop image here, or click to select</p>
              <small class="text-muted">PNG/JPG</small>
            </div>
            <input id="dirImageInput" name="image" type="file" accept="image/*" class="form-control d-none" />
            <div class="mt-2">
              <div id="dirImagePreviewWrap" class="border rounded overflow-hidden position-relative" style="width:120px; height:120px; max-width:100%; display:none;">
                <img id="dirImagePreview" alt="image-preview" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
              </div>
            </div>
            <div id="dirImageError" class="text-danger small mt-1 d-none"></div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Slug (optional)</label>
            <input name="slug" class="form-control" placeholder="auto-generated from name" />
          </div>
          <div class="col-12">
            <label class="form-label">Bio (optional)</label>
            <textarea name="bio" class="form-control" rows="4"></textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveDir" name="isActive" checked />
              <label class="form-check-label" for="isActiveDir">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Create</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderDirectorsTab);
    // Elements
    const form = $("#dirForm");
    const nameInput = form.querySelector('input[name="name"]');
    const roleInput = form.querySelector('input[name="role"]');
    const slugInput = form.querySelector('input[name="slug"]');
    const dz = $("#dirImageDropzone");
    const fileInput = $("#dirImageInput");
    const previewWrap = $("#dirImagePreviewWrap");
    const previewImg = $("#dirImagePreview");
    const imgErrorEl = $("#dirImageError");

    // Helpers for inline errors
    function setFieldError(el, msg) {
      if (!el) return;
      el.classList.add("is-invalid");
      let fb = el.nextElementSibling;
      if (!fb || !fb.classList.contains("invalid-feedback")) {
        fb = document.createElement("div");
        fb.className = "invalid-feedback";
        el.parentNode.insertBefore(fb, el.nextSibling);
      }
      fb.textContent = msg || "";
    }
    function clearFieldError(el) {
      if (!el) return;
      el.classList.remove("is-invalid");
      const fb = el.nextElementSibling;
      if (fb && fb.classList.contains("invalid-feedback")) fb.textContent = "";
    }
    function showImageError(msg) {
      if (!imgErrorEl) return;
      imgErrorEl.textContent = msg || "";
      imgErrorEl.classList.toggle("d-none", !msg);
      dz.classList.toggle("border-danger", !!msg);
    }
    function clearImageError() {
      showImageError("");
    }

    // Preview setter
    function setPreview(file) {
      if (!file) {
        previewWrap.style.display = "none";
        previewImg.removeAttribute("src");
        return;
      }
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewWrap.style.display = "block";
      clearImageError();
    }

    // Drag-and-drop wiring
    dz.addEventListener("click", () => fileInput.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("border-primary");
    });
    dz.addEventListener("dragleave", () =>
      dz.classList.remove("border-primary")
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("border-primary");
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (!f.type?.startsWith("image/"))
        return showImageError("Image must be an image file");
      fileInput.files = e.dataTransfer.files; // ensure FormData picks it up
      setPreview(f);
    });
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) {
        setPreview(null);
        showImageError("Image is required");
        return;
      }
      if (!f.type?.startsWith("image/")) {
        setPreview(null);
        showImageError("Image must be an image file");
        return;
      }
      setPreview(f);
    });

    // Slug auto-generate from name (unless user edits slug)
    let slugTouched = false;
    slugInput.addEventListener("input", () => {
      slugTouched = true;
      clearFieldError(slugInput);
    });
    function slugify(s) {
      return (s || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
    nameInput.addEventListener("input", () => {
      const val = nameInput.value.trim();
      if (val) clearFieldError(nameInput);
      else setFieldError(nameInput, "Name is required");
      if (!slugTouched) slugInput.value = slugify(val);
    });
    roleInput.addEventListener("input", () => {
      const val = roleInput.value.trim();
      if (val) clearFieldError(roleInput);
      else setFieldError(roleInput, "Role is required");
    });

    // Submit with custom validation
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldError(nameInput);
      clearFieldError(roleInput);
      clearImageError();

      const nameVal = (nameInput.value || "").trim();
      const roleVal = (roleInput.value || "").trim();
      const imgFile = fileInput.files?.[0];

      let hasError = false;
      if (!nameVal) {
        setFieldError(nameInput, "Name is required");
        hasError = true;
      }
      if (!roleVal) {
        setFieldError(roleInput, "Role is required");
        hasError = true;
      }
      if (!imgFile) {
        showImageError("Image is required");
        hasError = true;
      } else if (!imgFile.type?.startsWith("image/")) {
        showImageError("Image must be an image file");
        hasError = true;
      }

      if (hasError) {
        toast("Please correct the highlighted errors", "error");
        (
          document.querySelector(".is-invalid") || (!imgFile ? dz : null)
        )?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return;
      }

      const fd = new FormData(form);
      fd.set("isActive", fd.get("isActive") ? "true" : "false");
      fd.set("name", nameVal);
      fd.set("role", roleVal);
      // If slug empty, generate from name
      const givenSlug = (slugInput.value || "").trim();
      fd.set("slug", givenSlug || slugify(nameVal));

      try {
        await apiForm("/api/directors", fd, { method: "POST" });
        toast("Director created", "success");
        renderDirectorsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Create failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function renderDirectorEditForm(id) {
    let data;
    try {
      data = await apiJson(`/api/directors/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load director";
      toast(msg, "error");
      return renderDirectorsTab();
    }
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Edit Director</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="dirEditForm" class="card p-3 shadow-sm" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Name</label>
            <input name="name" class="form-control" value="${
              data.name || ""
            }" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Role</label>
            <input name="role" class="form-control" value="${
              data.role || ""
            }" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Replace Image (optional)</label>
            <div id="dirEditImageDropzone" class="text-center p-4" style="border: 2px dashed #0d6efd; border-radius: .5rem; background: #f8f9fa; cursor: pointer;">
              <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
              <p class="mt-2 mb-0">Drag & drop image here, or click to select</p>
              <small class="text-muted">PNG/JPG</small>
            </div>
            <input id="dirEditImageInput" name="image" type="file" accept="image/*" class="form-control d-none" />
            <div class="mt-2">
              <div id="dirEditImagePreviewWrap" class="border rounded overflow-hidden position-relative" style="width:120px; height:120px; max-width:100%; ${
                data.image ? "" : "display:none;"
              }">
                <img id="dirEditImagePreview" alt="image-preview" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" src="${
                  data.image ? imgUrl(data.image) : ""
                }">
              </div>
            </div>
            <div id="dirEditImageError" class="text-danger small mt-1 d-none"></div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Slug</label>
            <input name="slug" class="form-control" value="${
              data.slug || ""
            }" />
          </div>
          <div class="col-12">
            <label class="form-label">Bio</label>
            <textarea name="bio" class="form-control" rows="4">${
              data.bio || ""
            }</textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveDir" name="isActive" ${
                data.isActive !== false ? "checked" : ""
              } />
              <label class="form-check-label" for="isActiveDir">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderDirectorsTab);

    // Elements
    const form = $("#dirEditForm");
    const nameInput = form.querySelector('input[name="name"]');
    const roleInput = form.querySelector('input[name="role"]');
    const slugInput = form.querySelector('input[name="slug"]');
    const dz = $("#dirEditImageDropzone");
    const fileInput = $("#dirEditImageInput");
    const previewWrap = $("#dirEditImagePreviewWrap");
    const previewImg = $("#dirEditImagePreview");
    const imgErrorEl = $("#dirEditImageError");

    // Helpers
    function setFieldError(el, msg) {
      if (!el) return;
      el.classList.add("is-invalid");
      let fb = el.nextElementSibling;
      if (!fb || !fb.classList.contains("invalid-feedback")) {
        fb = document.createElement("div");
        fb.className = "invalid-feedback";
        el.parentNode.insertBefore(fb, el.nextSibling);
      }
      fb.textContent = msg || "";
    }
    function clearFieldError(el) {
      if (!el) return;
      el.classList.remove("is-invalid");
      const fb = el.nextElementSibling;
      if (fb && fb.classList.contains("invalid-feedback")) fb.textContent = "";
    }
    function showImageError(msg) {
      if (!imgErrorEl) return;
      imgErrorEl.textContent = msg || "";
      imgErrorEl.classList.toggle("d-none", !msg);
      dz.classList.toggle("border-danger", !!msg);
    }
    function clearImageError() {
      showImageError("");
    }

    const hasInitialImage = !!data.image;
    function setPreview(file) {
      if (!file) {
        // keep existing image visible if any
        if (!hasInitialImage) previewWrap.style.display = "none";
        return;
      }
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewWrap.style.display = "block";
      clearImageError();
    }

    // realtime basic validation
    nameInput.addEventListener("input", () => {
      const v = nameInput.value.trim();
      if (v) clearFieldError(nameInput);
      else setFieldError(nameInput, "Name is required");
    });
    roleInput.addEventListener("input", () => {
      const v = roleInput.value.trim();
      if (v) clearFieldError(roleInput);
      else setFieldError(roleInput, "Role is required");
    });

    // Drag-and-drop wiring
    dz.addEventListener("click", () => fileInput.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("border-primary");
    });
    dz.addEventListener("dragleave", () =>
      dz.classList.remove("border-primary")
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("border-primary");
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (!f.type?.startsWith("image/"))
        return showImageError("Image must be an image file");
      fileInput.files = e.dataTransfer.files;
      setPreview(f);
    });
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) {
        clearImageError();
        return;
      }
      if (!f.type?.startsWith("image/")) {
        showImageError("Image must be an image file");
        return;
      }
      setPreview(f);
    });

    // Submit
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldError(nameInput);
      clearFieldError(roleInput);
      clearImageError();

      const nameVal = (nameInput.value || "").trim();
      const roleVal = (roleInput.value || "").trim();
      const bioVal = (
        form.querySelector('textarea[name="bio"]').value || ""
      ).trim();
      const slugVal = (slugInput.value || "").trim();
      const imgFile = fileInput.files?.[0];
      const isActive = form.querySelector('input[name="isActive"]').checked;

      let hasError = false;
      if (!nameVal) {
        setFieldError(nameInput, "Name is required");
        hasError = true;
      }
      if (!roleVal) {
        setFieldError(roleInput, "Role is required");
        hasError = true;
      }
      if (imgFile && !imgFile.type?.startsWith("image/")) {
        showImageError("Image must be an image file");
        hasError = true;
      }
      if (hasError) {
        toast("Please correct the highlighted errors", "error");
        return;
      }

      try {
        if (imgFile) {
          const fd = new FormData(form);
          fd.set("name", nameVal);
          fd.set("role", roleVal);
          fd.set("bio", bioVal);
          fd.set("isActive", isActive ? "true" : "false");
          fd.set(
            "slug",
            slugVal ||
              nameVal
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
          );
          await apiForm(`/api/directors/${id}`, fd, { method: "PUT" });
        } else {
          const payload = {
            name: nameVal || undefined,
            role: roleVal || undefined,
            bio: bioVal || undefined,
            slug:
              slugVal ||
              nameVal
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, ""),
            isActive,
          };
          await apiJson(`/api/directors/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }
        toast("Director updated", "success");
        renderDirectorsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Update failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function deleteDirector(id) {
    if (!confirm("Delete this director?")) return;
    try {
      await apiJson(`/api/directors/${id}`, { method: "DELETE" });
      toast("Director deleted", "success");
      renderDirectorsTab();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }

  // -------------- Projects Module --------------
  async function fetchProjects() {
    return await apiJson("/api/projects");
  }
  function projectsListHtml(items) {
    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Projects</h5>
        <button class="btn btn-primary" data-action="open-create">Add Project</button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th style=\"width:60px\">Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Slug</th>
              <th>Active</th>
              <th style=\"width:140px\"></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (p) => `
                <tr data-id="${p._id}">
                  <td>${
                    p.image
                      ? `<img src="${imgUrl(p.image)}" class="thumb">`
                      : ""
                  }</td>
                  <td>${p.title || ""}</td>
                  <td>${p.category || ""}</td>
                  <td>${p.status || ""}</td>
                  <td class="small">${p.slug || ""}</td>
                  <td>${p.isActive !== false ? "Yes" : "No"}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                    <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                  </td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }
  function renderProjectsTab() {
    const host = $("#tabContent");
    host.innerHTML = centeredSpinner("Loading projects...");
    fetchProjects()
      .then((items) => {
        host.innerHTML = projectsListHtml(items);
        bindProjectsEvents(host);
      })
      .catch((err) => {
        const msg = err?.body?.message || "Failed to load projects";
        host.innerHTML = `<div class=\"alert alert-danger\">${msg}</div>`;
      });
  }
  function bindProjectsEvents(host) {
    const handler = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "open-create") return renderProjectCreateForm();
      const tr = e.target.closest("tr[data-id]");
      const id = tr?.getAttribute("data-id");
      if (!id) return;
      if (action === "delete") return deleteProject(id);
      if (action === "edit") return renderProjectEditForm(id);
    };
    setHostClickListener(host, handler);
  }
  function renderProjectCreateForm() {
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Add Project</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="projForm" class="card p-3 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title</label>
            <input name="title" class="form-control" required />
          </div>
          <div class="col-md-3">
            <label class="form-label">Category</label>
            <input name="category" class="form-control" required />
          </div>
          <div class="col-md-3">
            <label class="form-label">Status</label>
            <input name="status" class="form-control" placeholder="e.g., Completed" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Image</label>
            <input name="image" type="file" accept="image/*" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Slug (optional)</label>
            <input name="slug" class="form-control" placeholder="auto-generated from title" />
          </div>
          <div class="col-12">
            <label class="form-label">Description (optional)</label>
            <textarea name="description" class="form-control" rows="4"></textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveProj" name="isActive" checked />
              <label class="form-check-label" for="isActiveProj">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Create</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderProjectsTab);
    $("#projForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (!fd.get("image") || !(fd.get("image") instanceof File)) {
        return toast("Please choose an image", "error");
      }
      fd.set("isActive", fd.get("isActive") ? "true" : "false");
      try {
        await apiForm("/api/projects", fd, { method: "POST" });
        toast("Project created", "success");
        renderProjectsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Create failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function renderProjectEditForm(id) {
    let data;
    try {
      data = await apiJson(`/api/projects/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load project";
      toast(msg, "error");
      return renderProjectsTab();
    }
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Edit Project</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="projEditForm" class="card p-3 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title</label>
            <input name="title" class="form-control" value="${
              data.title || ""
            }" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Category</label>
            <input name="category" class="form-control" value="${
              data.category || ""
            }" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Status</label>
            <input name="status" class="form-control" value="${
              data.status || ""
            }" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Replace Image (optional)</label>
            <input name="image" type="file" accept="image/*" class="form-control" />
            ${
              data.image
                ? `<div class='mt-2'><img src='${imgUrl(
                    data.image
                  )}' class='thumb'></div>`
                : ""
            }
          </div>
          <div class="col-md-6">
            <label class="form-label">Slug</label>
            <input name="slug" class="form-control" value="${
              data.slug || ""
            }" />
          </div>
          <div class="col-12">
            <label class="form-label">Description</label>
            <textarea name="description" class="form-control" rows="4">${
              data.description || ""
            }</textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveProj" name="isActive" ${
                data.isActive !== false ? "checked" : ""
              } />
              <label class="form-check-label" for="isActiveProj">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderProjectsTab);
    $("#projEditForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const hasNewImage =
        fd.get("image") instanceof File && fd.get("image").name;
      const isActive = fd.get("isActive") ? true : false;
      try {
        if (hasNewImage) {
          fd.set("isActive", isActive ? "true" : "false");
          await apiForm(`/api/projects/${id}`, fd, { method: "PUT" });
        } else {
          const payload = {
            title: fd.get("title") || undefined,
            category: fd.get("category") || undefined,
            status: fd.get("status") || undefined,
            description: fd.get("description") || undefined,
            slug: fd.get("slug") || undefined,
            isActive,
          };
          await apiJson(`/api/projects/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }
        toast("Project updated", "success");
        renderProjectsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Update failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function deleteProject(id) {
    if (!confirm("Delete this project?")) return;
    try {
      await apiJson(`/api/projects/${id}`, { method: "DELETE" });
      toast("Project deleted", "success");
      renderProjectsTab();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }

  // -------------- Gallery Module --------------
  // Gallery now sources from bulk_images only
  async function fetchBulkAllImages() {
    const batches = await apiJson("/api/bulk-images");
    const items = [];
    (batches || []).forEach((b) => {
      if (Array.isArray(b.images)) {
        b.images.forEach((img) => {
          if (img && img.url) items.push(img);
        });
      }
    });
    return items;
  }

  function galleryListHtml(items) {
    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Gallery</h5>
        <div>
          <button class="btn btn-primary shadow-sm" data-action="bulk-upload">
            <i class="fas fa-images me-2"></i>
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>
      <div class="row g-3" id="galleryGrid">
        ${items
          .map(
            (it) => `
          <div class="col-6 col-md-4 col-lg-3" data-image-id="${it._id}">
            <div class="card h-100">
              <div class="position-relative">
                <img src="${imgUrl(
                  it.url
                )}" class="card-img-top" style="height: 200px; object-fit: cover; border-top-left-radius: .5rem; border-top-right-radius: .5rem;">
              </div>
              <div class="d-flex justify-content-center align-items-center gap-3 py-2 px-3 bg-light rounded-bottom">
                <div class="form-check form-switch m-0" title="Active">
                  <input class="form-check-input border-primary" style="transform: scale(1.2); cursor: pointer;" type="checkbox" data-action="bulk-toggle-active" ${
                    it.isActive !== false ? "checked" : ""
                  }>
                </div>
                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" data-action="bulk-delete-image" title="Delete image" aria-label="Delete image">
                  <i class="fas fa-trash me-1"></i> Delete
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>`;
  }

  async function fetchBulkSets() {
    return await apiJson("/api/bulk-images");
  }

  function bulkSetsHtml(batches) {
    if (!Array.isArray(batches) || batches.length === 0) return "";
    return `
      <hr class="my-4" />
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="m-0">Bulk Upload Batches</h6>
      </div>
      <div class="accordion" id="bulkBatches">
        ${batches
          .map((b, i) => {
            const created = b.createdAt
              ? new Date(b.createdAt).toLocaleString()
              : "";
            const count = Array.isArray(b.images) ? b.images.length : 0;
            const collapseId = `bulk-${b._id}`;
            return `
              <div class="accordion-item" data-bulk-id="${b._id}">
                <h2 class="accordion-header" id="heading-${collapseId}">
                  <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                    <div class="d-flex w-100 justify-content-between align-items-center">
                      <span class="me-3">Batch ${
                        i + 1
                      } • ${count} images • ${created}</span>
                      <button class="btn btn-sm btn-outline-danger" data-action="delete-bulk" type="button">Delete Batch</button>
                    </div>
                  </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="heading-${collapseId}" data-bs-parent="#bulkBatches">
                  <div class="accordion-body">
                    <div class="row g-2">
                      ${(b.images || [])
                        .map(
                          (p) => `
                          <div class="col-6 col-md-3 col-lg-2">
                            <img src="${imgUrl(
                              p
                            )}" class="img-fluid rounded" style="height: 100px; object-fit: cover; width: 100%;"/>
                          </div>
                        `
                        )
                        .join("")}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderGalleryTab() {
    const host = $("#tabContent");
    host.innerHTML = centeredSpinner("Loading gallery...");

    fetchBulkAllImages()
      .then((images) => {
        host.innerHTML = galleryListHtml(images);
        bindGalleryEvents(host);
      })
      .catch((err) => {
        const msg = err?.body?.message || "Failed to load gallery";
        host.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
      });
  }

  function bindGalleryEvents(host) {
    const handler = async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      if (action === "bulk-upload") return showBulkUploadForm();
      if (action === "bulk-delete-image") {
        const id = btn
          .closest("[data-image-id]")
          ?.getAttribute("data-image-id");
        if (id) return deleteBulkImage(id);
      }
      if (action === "bulk-toggle-active") {
        const wrap = btn.closest("[data-image-id]");
        const id = wrap?.getAttribute("data-image-id");
        const checked = btn.checked;
        if (id) return toggleBulkImageActive(id, checked);
      }
    };
    setHostClickListener(host, handler);
  }

  function showBulkUploadForm() {
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Bulk Upload Images</h5>
        <button class="btn btn-secondary" data-action="back">Back to Gallery</button>
      </div>
      <div class="card p-4">
        <form id="bulkUploadForm">
          <div class="mb-3">
            <label class="form-label">Images</label>
            <div id="dropzone" class="text-center p-4 mb-3" style="border: 2px dashed #0d6efd; border-radius: .5rem; background: #f8f9fa; cursor: pointer;">
              <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
              <p class="mt-2 mb-0">Drag & drop images here, or click to select</p>
              <small class="text-muted">Up to 50 files per upload</small>
            </div>
            <input id="fileInput" type="file" name="images[]" class="form-control d-none" accept="image/*" multiple>
          </div>
          <div class="mb-3">
            <div id="previewGrid" class="row g-2"></div>
          </div>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" name="isActive" id="bulkIsActive" checked>
            <label class="form-check-label" for="bulkIsActive">Mark uploaded images as Active</label>
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-images me-1"></i> Upload
          </button>
        </form>
      </div>`;

    $('[data-action="back"]').addEventListener("click", renderGalleryTab);

    const dz = $("#dropzone");
    const fileInput = $("#fileInput");
    const previewGrid = $("#previewGrid");
    const selectedFiles = [];

    function addFiles(files) {
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        // simple de-dupe by name+size
        const key = `${f.name}-${f.size}`;
        if (selectedFiles.find((x) => x.__k === key)) continue;
        f.__k = key;
        selectedFiles.push(f);
        if (selectedFiles.length >= 50) break;
      }
      renderPreviews();
    }

    function renderPreviews() {
      if (!selectedFiles.length) {
        previewGrid.innerHTML =
          '<div class="text-muted small">No images selected yet.</div>';
        return;
      }
      previewGrid.innerHTML = selectedFiles
        .map((f, i) => {
          const url = URL.createObjectURL(f);
          return `
          <div class="col-2 col-md-1">
            <div class="border rounded overflow-hidden position-relative" style="padding-top:100%;">
              <img src="${url}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" alt="preview-${i}">
            </div>
          </div>`;
        })
        .join("");
    }

    dz.addEventListener("click", () => fileInput.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("border-primary");
    });
    dz.addEventListener("dragleave", () =>
      dz.classList.remove("border-primary")
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("border-primary");
      const files = e.dataTransfer?.files || [];
      addFiles(files);
    });
    fileInput.addEventListener("change", (e) => addFiles(e.target.files || []));

    $("#bulkUploadForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData();
      // isActive flag
      const isActive = form.querySelector("#bulkIsActive").checked;
      fd.set("isActive", isActive ? "true" : "false");

      const files = selectedFiles;
      if (!files || files.length === 0) {
        toast("Please select at least one image", "error");
        return;
      }
      if (files.length > 50) {
        toast("You can upload up to 50 images at a time", "error");
        return;
      }
      for (const f of files) fd.append("images[]", f);

      try {
        const res = await apiForm("/api/bulk-images", fd, { method: "POST" });
        const created = Array.isArray(res?.items) ? res.items.length : 0;
        toast(`Uploaded ${created || files.length} images`, "success");
        renderGalleryTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Bulk upload failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }

  async function deleteBulkImage(imageId) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    try {
      await apiJson(`/api/bulk-images/image/${imageId}`, { method: "DELETE" });
      toast("Image deleted", "success");
      renderGalleryTab();
    } catch (err) {
      const msg = err?.body?.message || "Failed to delete image";
      toast(msg, "error");
    }
  }

  async function toggleBulkImageActive(imageId, isActive) {
    try {
      await apiJson(`/api/bulk-images/image/${imageId}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !!isActive }),
      });
      toast("Updated", "success");
    } catch (err) {
      const msg = err?.body?.message || "Failed to update image";
      toast(msg, "error");
      // Re-render to reflect true state from backend
      renderGalleryTab();
    }
  }

  // -------------- Awards/Certificates Module --------------
  async function fetchAwards() {
    return await apiJson("/api/awards-certificates");
  }
  function awardsListHtml(items) {
    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Awards / Certificates</h5>
        <button class="btn btn-primary" data-action="open-create">Add Award/Certificate</button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th style=\"width:60px\">Image</th>
              <th>Title</th>
              <th>Year</th>
              <th>Month</th>
              <th>Active</th>
              <th style=\"width:140px\"></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (a) => `
                <tr data-id="${a._id}">
                  <td>${
                    a.image
                      ? `<img src="${imgUrl(a.image)}" class="thumb">`
                      : ""
                  }</td>
                  <td>${a.title || ""}</td>
                  <td>${a.year || ""}</td>
                  <td>${a.monthName || ""}</td>
                  <td>${a.isActive !== false ? "Yes" : "No"}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                    <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                  </td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }
  function renderAwardsTab() {
    const host = $("#tabContent");
    host.innerHTML = centeredSpinner("Loading awards...");
    fetchAwards()
      .then((items) => {
        host.innerHTML = awardsListHtml(items);
        bindAwardsEvents(host);
      })
      .catch((err) => {
        const msg = err?.body?.message || "Failed to load awards";
        host.innerHTML = `<div class=\"alert alert-danger\">${msg}</div>`;
      });
  }
  function bindAwardsEvents(host) {
    host.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "open-create") return renderAwardCreateForm();
      const tr = e.target.closest("tr[data-id]");
      const id = tr?.getAttribute("data-id");
      if (!id) return;
      if (action === "delete") return deleteAward(id);
      if (action === "edit") return renderAwardEditForm(id);
    });
  }
  function monthOptions(selected) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months
      .map(
        (m) =>
          `<option value="${m}" ${
            selected === m ? "selected" : ""
          }>${m}</option>`
      )
      .join("");
  }
  function renderAwardCreateForm() {
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Add Award/Certificate</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="awardForm" class="card p-3 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title</label>
            <input name="title" class="form-control" required />
          </div>
          <div class="col-md-3">
            <label class="form-label">Year</label>
            <input name="year" type="number" min="1900" max="3000" class="form-control" required />
          </div>
          <div class="col-md-3">
            <label class="form-label">Month</label>
            <select name="monthName" class="form-select" required>
              ${monthOptions("January")}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Image</label>
            <input name="image" type="file" accept="image/*" class="form-control" required />
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveAward" name="isActive" checked />
              <label class="form-check-label" for="isActiveAward">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Create</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderAwardsTab);
    $("#awardForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (!fd.get("image") || !(fd.get("image") instanceof File)) {
        return toast("Please choose an image", "error");
      }
      fd.set("isActive", fd.get("isActive") ? "true" : "false");
      try {
        await apiForm("/api/awards-certificates", fd, { method: "POST" });
        toast("Award/Certificate created", "success");
        renderAwardsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Create failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function renderAwardEditForm(id) {
    let data;
    try {
      data = await apiJson(`/api/awards-certificates/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load item";
      toast(msg, "error");
      return renderAwardsTab();
    }
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Edit Award/Certificate</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="awardEditForm" class="card p-3 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title</label>
            <input name="title" class="form-control" value="${
              data.title || ""
            }" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Year</label>
            <input name="year" type="number" min="1900" max="3000" class="form-control" value="${
              data.year || ""
            }" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Month</label>
            <select name="monthName" class="form-select">
              ${monthOptions(data.monthName)}
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Replace Image (optional)</label>
            <input name="image" type="file" accept="image/*" class="form-control" />
            ${
              data.image
                ? `<div class='mt-2'><img src='${imgUrl(
                    data.image
                  )}' class='thumb'></div>`
                : ""
            }
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActiveAward" name="isActive" ${
                data.isActive !== false ? "checked" : ""
              } />
              <label class="form-check-label" for="isActiveAward">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderAwardsTab);
    $("#awardEditForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const hasNewImage =
        fd.get("image") instanceof File && fd.get("image").name;
      const isActive = fd.get("isActive") ? true : false;
      try {
        if (hasNewImage) {
          fd.set("isActive", isActive ? "true" : "false");
          await apiForm(`/api/awards-certificates/${id}`, fd, {
            method: "PUT",
          });
        } else {
          const payload = {
            title: fd.get("title") || undefined,
            year: fd.get("year") || undefined,
            monthName: fd.get("monthName") || undefined,
            isActive,
          };
          await apiJson(`/api/awards-certificates/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }
        toast("Item updated", "success");
        renderAwardsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Update failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }
  async function deleteAward(id) {
    if (!confirm("Delete this item?")) return;
    try {
      await apiJson(`/api/awards-certificates/${id}`, { method: "DELETE" });
      toast("Item deleted", "success");
      renderAwardsTab();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }
  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
  function imgUrl(p) {
    if (!p) return "";
    try {
      // If path starts with '/', prefix with API base to load from backend static server
      if (typeof p === "string" && p.startsWith("/")) return `${API_BASE}${p}`;
      return p;
    } catch (_) {
      return p;
    }
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
    renderLogin();
  }
  async function apiJson(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts.headers,
        ...authHeaders(),
      },
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json")
      ? await res.json()
      : await res.text();
    if (res.status === 401) {
      handleUnauthorized();
      throw { status: res.status, body };
    }
    if (!res.ok) throw { status: res.status, body };
    return body;
  }
  async function apiForm(path, formData, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method || "POST",
      body: formData,
      headers: {
        ...authHeaders(), // do not set Content-Type to let browser set boundary
        ...opts.headers,
      },
    });
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json")
      ? await res.json()
      : await res.text();
    if (res.status === 401) {
      handleUnauthorized();
      throw { status: res.status, body };
    }
    if (!res.ok) throw { status: res.status, body };
    return body;
  }

  function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast-msg toast-${type}`;
    el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg);
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // -------------- Views --------------
  function renderLogin() {
    $("#app").innerHTML = `
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-5">
            <div class="card shadow-sm">
              <div class="card-body p-4">
                <h4 class="mb-3">Admin Login</h4>
                <form id="loginForm">
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" name="email" required />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" name="password" required />
                  </div>
                  <button class="btn btn-primary w-100" type="submit">Login</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const payload = {
        email: fd.get("email"),
        password: fd.get("password"),
      };
      try {
        const res = await apiJson("/api/admin/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToken(res.token);
        toast("Login successful", "success");
        renderDashboard();
      } catch (err) {
        const msg = err?.body?.message || "Login failed";
        toast(msg, "error");
      }
    });
  }

  function renderDashboard() {
    $("#app").innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">CHOC Admin</a>
          <div>
            <button id="logoutBtn" class="btn btn-outline-light btn-sm">Logout</button>
          </div>
        </div>
      </nav>
      <div class="container-fluid">
        <div class="row">
          <div class="col-12 col-lg-2 border-end bg-white p-0">
            <div class="list-group list-group-flush" id="sideTabs">
              <button class="list-group-item list-group-item-action active" data-tab="clients">Clients</button>
              <button class="list-group-item list-group-item-action" data-tab="directors">Directors</button>
              <button class="list-group-item list-group-item-action" data-tab="projects">Projects</button>
              <button class="list-group-item list-group-item-action" data-tab="gallery">Gallery</button>
              <button class="list-group-item list-group-item-action" data-tab="awards">Awards/Certificates</button>
            </div>
          </div>
          <div class="col-12 col-lg-10 p-4" id="tabContent"></div>
        </div>
      </div>`;

    $("#logoutBtn").addEventListener("click", () => {
      clearToken();
      renderLogin();
    });

    // tab switching
    $("#sideTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn || btn.disabled) return;
      $all("#sideTabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      if (tab === "clients") return renderClientsTab();
      if (tab === "directors") return renderDirectorsTab();
      if (tab === "projects") return renderProjectsTab();
      if (tab === "gallery") return renderGalleryTab();
      if (tab === "awards") return renderAwardsTab();
    });

    renderClientsTab(); // default
  }

  // -------------- Clients Module --------------
  async function fetchClients() {
    return await apiJson("/api/clients");
  }

  function clientsListHtml(items) {
    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Clients</h5>
        <button class="btn btn-primary" data-action="open-create">Add Client</button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th style="width:60px">Logo</th>
              <th>Name</th>
              <th>Description</th>
              <th>Active</th>
              <th style="width:140px"></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (c) => `
                <tr data-id="${c._id}">
                  <td>${
                    c.logo ? `<img src="${imgUrl(c.logo)}" class="thumb">` : ""
                  }</td>
                  <td>${c.name || ""}</td>
                  <td class="small">${(c.description || "").slice(0, 120)}</td>
                  <td>${c.isActive !== false ? "Yes" : "No"}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                    <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                  </td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  function renderClientsTab() {
    const host = $("#tabContent");
    host.innerHTML = centeredSpinner("Loading clients...");
    fetchClients()
      .then((items) => {
        host.innerHTML = clientsListHtml(items);
        bindClientsEvents(host);
      })
      .catch((err) => {
        const msg = err?.body?.message || "Failed to load clients";
        host.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
      });
  }

  function bindClientsEvents(host) {
    const handler = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "open-create") return renderClientCreateForm();
      const tr = e.target.closest("tr[data-id]");
      const id = tr?.getAttribute("data-id");
      if (!id) return;
      if (action === "delete") return deleteClient(id);
      if (action === "edit") return renderClientEditForm(id);
    };
    setHostClickListener(host, handler);
  }

  function renderClientCreateForm() {
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Add Client</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="clientForm" class="card p-3 shadow-sm" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Name</label>
            <input name="name" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Logo (image)</label>
            <div id="logoDropzone" class="text-center p-4" style="border: 2px dashed #0d6efd; border-radius: .5rem; background: #f8f9fa; cursor: pointer;">
              <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
              <p class="mt-2 mb-0">Drag & drop logo here, or click to select</p>
              <small class="text-muted">PNG/JPG</small>
            </div>
            <input id="logoInput" name="logo" type="file" accept="image/*" class="form-control d-none" />
            <div class="mt-2">
              <div id="logoPreviewWrap" class="border rounded overflow-hidden position-relative" style="width:138px; height:137px; display:none;">
                <img id="logoPreview" alt="logo-preview" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
              </div>
            </div>
            <div id="logoError" class="text-danger small mt-1 d-none"></div>
          </div>
          <div class="col-12">
            <label class="form-label">Description</label>
            <textarea name="description" class="form-control" rows="4"></textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActive" name="isActive" checked />
              <label class="form-check-label" for="isActive">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Create</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderClientsTab);

    // Drag-and-drop for optional logo replace
    const dzE = $("#logoEditDropzone");
    const inputE = $("#logoEditInput");
    const wrapE = $("#logoEditPreviewWrap");
    const imgE = $("#logoEditPreview");
    const errE = $("#logoEditError");

    function showEditLogoError(msg) {
      if (!errE) return;
      errE.textContent = msg || "";
      errE.classList.toggle("d-none", !msg);
      if (dzE) dzE.classList.toggle("border-danger", !!msg);
    }
    function setEditPreview(file) {
      if (!file) return; // optional
      const url = URL.createObjectURL(file);
      imgE.src = url;
      wrapE.style.display = "block";
      showEditLogoError("");
    }
    if (dzE) {
      dzE.addEventListener("click", () => inputE.click());
      dzE.addEventListener("dragover", (e) => {
        e.preventDefault();
        dzE.classList.add("border-primary");
      });
      dzE.addEventListener("dragleave", () =>
        dzE.classList.remove("border-primary")
      );
      dzE.addEventListener("drop", (e) => {
        e.preventDefault();
        dzE.classList.remove("border-primary");
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!file.type?.startsWith("image/"))
          return showEditLogoError("Logo must be an image file");
        inputE.files = e.dataTransfer.files;
        setEditPreview(file);
      });
    }
    if (inputE) {
      inputE.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return; // optional
        if (!file.type?.startsWith("image/"))
          return showEditLogoError("Logo must be an image file");
        setEditPreview(file);
      });
    }

    // Logo drag-and-drop + preview
    const dz = $("#logoDropzone");
    const input = $("#logoInput");
    const previewWrap = $("#logoPreviewWrap");
    const previewImg = $("#logoPreview");
    const logoErrorEl = $("#logoError");
    const nameInput = $('input[name="name"]');
    const descInput = $('textarea[name="description"]');

    function setFieldError(el, msg) {
      if (!el) return;
      el.classList.add("is-invalid");
      let fb = el.nextElementSibling;
      if (!fb || !fb.classList.contains("invalid-feedback")) {
        fb = document.createElement("div");
        fb.className = "invalid-feedback";
        el.parentNode.insertBefore(fb, el.nextSibling);
      }
      fb.textContent = msg || "";
    }

    function clearFieldError(el) {
      if (!el) return;
      el.classList.remove("is-invalid");
      const fb = el.nextElementSibling;
      if (fb && fb.classList.contains("invalid-feedback")) fb.textContent = "";
    }

    function showLogoError(msg) {
      if (!logoErrorEl) return;
      logoErrorEl.textContent = msg || "";
      logoErrorEl.classList.remove("d-none");
      dz.classList.add("border-danger");
    }

    function clearLogoError() {
      if (!logoErrorEl) return;
      logoErrorEl.textContent = "";
      logoErrorEl.classList.add("d-none");
      dz.classList.remove("border-danger");
    }

    function setPreview(file) {
      if (!file) {
        previewWrap.style.display = "none";
        previewImg.removeAttribute("src");
        return;
      }
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      previewWrap.style.display = "block";
      clearLogoError();
    }

    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("border-primary");
    });
    dz.addEventListener("dragleave", () =>
      dz.classList.remove("border-primary")
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("border-primary");
      const file = e.dataTransfer.files?.[0];
      if (file) {
        // Assign dropped files to input so FormData picks it up
        input.files = e.dataTransfer.files;
        setPreview(file);
      }
    });
    input.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        previewWrap.style.display = "none";
        previewImg.removeAttribute("src");
        showLogoError("Logo image is required");
        return;
      }
      if (!file.type?.startsWith("image/")) {
        previewWrap.style.display = "none";
        previewImg.removeAttribute("src");
        showLogoError("Logo must be an image file");
        return;
      }
      setPreview(file);
    });

    // Validate on typing (trim spaces)
    if (nameInput)
      nameInput.addEventListener("input", () => {
        const val = nameInput.value.trim();
        if (val) clearFieldError(nameInput);
        else setFieldError(nameInput, "Name is required");
      });
    if (descInput)
      descInput.addEventListener("input", () => {
        const val = descInput.value.trim();
        if (val) clearFieldError(descInput);
        else setFieldError(descInput, "Description is required");
      });

    $("#clientForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      // Clear previous errors
      clearFieldError(nameInput);
      clearFieldError(descInput);
      clearLogoError();

      let hasError = false;
      const nameVal = (nameInput?.value || "").trim();
      const descVal = (descInput?.value || "").trim();
      const logoFile = input.files?.[0];

      if (!nameVal) {
        setFieldError(nameInput, "Name is required");
        hasError = true;
      }
      if (!descVal) {
        setFieldError(descInput, "Description is required");
        hasError = true;
      }
      if (!logoFile) {
        showLogoError("Logo image is required");
        hasError = true;
      } else if (!logoFile.type?.startsWith("image/")) {
        showLogoError("Logo must be an image file");
        hasError = true;
      }

      if (hasError) {
        toast("Please correct the highlighted errors", "error");
        const firstError =
          document.querySelector(".is-invalid") || (!logoFile ? dz : null);
        if (firstError && firstError.scrollIntoView)
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const fd = new FormData(e.currentTarget);
      // Normalize boolean and trim text values before submit
      fd.set("isActive", fd.get("isActive") ? "true" : "false");
      fd.set("name", nameVal);
      fd.set("description", descVal);
      try {
        await apiForm("/api/clients", fd, { method: "POST" });
        toast("Client created", "success");
        renderClientsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Create failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }

  async function deleteClient(id) {
    if (!confirm("Delete this client?")) return;
    try {
      await apiJson(`/api/clients/${id}`, { method: "DELETE" });
      toast("Client deleted", "success");
      renderClientsTab();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }

  async function renderClientEditForm(id) {
    // Simple edit: fetch existing and allow name/description toggle active and optional new logo
    let data;
    try {
      data = await apiJson(`/api/clients/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load client";
      toast(msg, "error");
      return renderClientsTab();
    }

    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Edit Client</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="clientEditForm" class="card p-3 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Name</label>
            <input name="name" class="form-control" value="${
              data.name || ""
            }" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Replace Logo (optional)</label>
            <div id="logoEditDropzone" class="text-center p-4" style="border: 2px dashed #0d6efd; border-radius: .5rem; background: #f8f9fa; cursor: pointer;">
              <i class="fas fa-cloud-upload-alt fa-2x text-primary"></i>
              <p class="mt-2 mb-0">Drag & drop new logo, or click to select</p>
              <small class="text-muted">PNG/JPG • Optional</small>
            </div>
            <input id="logoEditInput" name="logo" type="file" accept="image/*" class="form-control d-none" />
            <div class="mt-2">
              <div id="logoEditPreviewWrap" class="border rounded overflow-hidden position-relative" style="width:138px; height:137px; ${
                data.logo ? "" : "display:none;"
              }">
                <img id="logoEditPreview" alt="logo-preview" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" src="${
                  data.logo ? imgUrl(data.logo) : ""
                }">
              </div>
            </div>
            <div id="logoEditError" class="text-danger small mt-1 d-none"></div>
          </div>
          <div class="col-12">
            <label class="form-label">Description</label>
            <textarea name="description" class="form-control" rows="4">${
              data.description || ""
            }</textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActive" name="isActive" ${
                data.isActive !== false ? "checked" : ""
              } />
              <label class="form-check-label" for="isActive">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderClientsTab);

    // Drag-and-drop + preview for optional logo replace
    const dzE = $("#logoEditDropzone");
    const fileInputE = $("#logoEditInput");
    const previewWrapE = $("#logoEditPreviewWrap");
    const previewImgE = $("#logoEditPreview");
    const imgErrE = $("#logoEditError");

    function showLogoError(msg) {
      if (!imgErrE || !dzE) return;
      imgErrE.textContent = msg || "";
      imgErrE.classList.toggle("d-none", !msg);
      dzE.classList.toggle("border-danger", !!msg);
    }
    function clearLogoError() {
      showLogoError("");
    }
    function setLogoPreview(file) {
      if (!previewWrapE || !previewImgE) return;
      if (!file) {
        previewWrapE.style.display = "none";
        previewImgE.removeAttribute("src");
        return;
      }
      const url = URL.createObjectURL(file);
      previewImgE.src = url;
      previewWrapE.style.display = "block";
      clearLogoError();
    }

    if (dzE && fileInputE) {
      dzE.addEventListener("click", () => fileInputE.click());
      dzE.addEventListener("dragover", (e) => {
        e.preventDefault();
        dzE.classList.add("border-primary");
      });
      dzE.addEventListener("dragleave", () =>
        dzE.classList.remove("border-primary")
      );
      dzE.addEventListener("drop", (e) => {
        e.preventDefault();
        dzE.classList.remove("border-primary");
        const f = e.dataTransfer?.files?.[0];
        if (!f) return;
        if (!f.type?.startsWith("image/"))
          return showLogoError("Logo must be an image file");
        fileInputE.files = e.dataTransfer.files;
        setLogoPreview(f);
      });
      fileInputE.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (!f) {
          clearLogoError();
          return;
        }
        if (!f.type?.startsWith("image/")) {
          showLogoError("Logo must be an image file");
          return;
        }
        setLogoPreview(f);
      });
    }

    $("#clientEditForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);

      // If a new logo is provided, send multipart; else send JSON
      const hasNewLogo = fd.get("logo") instanceof File && fd.get("logo").name;
      const isActive = fd.get("isActive") ? true : false;

      try {
        if (hasNewLogo) {
          fd.set("isActive", isActive ? "true" : "false");
          await apiForm(`/api/clients/${id}`, fd, { method: "PUT" });
        } else {
          const payload = {
            name: fd.get("name") || undefined,
            description: fd.get("description") || undefined,
            isActive,
          };
          await apiJson(`/api/clients/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }
        toast("Client updated", "success");
        renderClientsTab();
      } catch (err) {
        const details =
          err?.body?.errors || err?.body?.message || "Update failed";
        toast(Array.isArray(details) ? details.join(", ") : details, "error");
      }
    });
  }

  // -------------- Bootstrap --------------
  function init() {
    const token = getToken();
    if (!token) return renderLogin();
    // Verify token quickly; if invalid, will redirect to login
    apiJson("/api/admin/users")
      .then(() => renderDashboard())
      .catch(() => {
        /* handleUnauthorized already redirected */
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
