"use strict";

// Clients module
window.ClientsModule = (function () {
  const {
    $,
    centeredSpinner,
    setHostClickListener,
    preventDuplicateSubmission,
    imgUrl,
    apiJson,
    apiForm,
    toast,
    setFieldError,
    clearFieldError,
    debounce,
  } = window.AdminUtils;

  let __clients = [];
  let __q = "";

  async function fetchClients() {
    return await apiJson("/api/clients");
  }

  function clientsListHtml(items) {
    return `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 class="m-0">Clients</h5>
          <div class="text-muted small">Manage your client logos and descriptions</div>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <div class="input-group input-group-sm" style="width:260px;">
            <span class="input-group-text bg-white"><i class="fas fa-search"></i></span>
            <input class="form-control" placeholder="Search clients..." value="${__q}" data-action="search-box" />
          </div>
          <button class="btn btn-primary" data-action="open-create"><i class="fas fa-plus me-1"></i>Add Client</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
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

  function renderClients() {
    $("#tabContent").innerHTML = `
      <div class="content-header">
        <h5><i class="fas fa-handshake me-2"></i>Clients</h5>
        <div class="text-muted small">Manage your client logos and descriptions</div>
      </div>
      
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="input-group input-group-sm" style="max-width: 300px;">
          <span class="input-group-text bg-white">
            <i class="fas fa-search"></i>
          </span>
          <input type="text" class="form-control" placeholder="Search clients..." id="searchInput">
        </div>
        <button class="btn btn-primary" data-action="open-create">
          <i class="fas fa-plus me-2"></i>Add Client
        </button>
      </div>
      
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>LOGO</th>
              <th>NAME</th>
              <th>DESCRIPTION</th>
              <th>ACTIVE</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="clientsTableBody">
            ${centeredSpinner("Loading clients...")}
          </tbody>
        </table>
      </div>`;

    // Load clients data
    loadClientsData();
    bindClientsEvents();
  }

  async function loadClientsData() {
    try {
      const bodyEl = $("#clientsTableBody");
      bodyEl.innerHTML = centeredSpinner("Loading clients...");
      const items = await fetchClients();
      __clients = Array.isArray(items) ? items : [];
      __q = "";
      renderList();
    } catch (err) {
      const msg = err?.body?.message || "Failed to load clients";
      $(
        "#clientsTableBody"
      ).innerHTML = `<tr><td colspan="5" class="text-center text-danger">${msg}</td></tr>`;
    }
  }

  function renderList() {
    const filtered = __clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(__q.toLowerCase()) ||
        c.description?.toLowerCase().includes(__q.toLowerCase())
    );

    $("#clientsTableBody").innerHTML = filtered.length
      ? filtered
          .map(
            (c) => `
              <tr data-id="${c._id}">
                <td>${
                  c.logo ? `<img src="${imgUrl(c.logo)}" class="thumb">` : ""
                }</td>
                <td>${c.name || ""}</td>
                <td>${c.description || ""}</td>
                <td>${c.isActive !== false ? "Yes" : "No"}</td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                  <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="text-center text-muted">No clients found</td></tr>`;
  }

  function onSearch(ev) {
    __q = ev.target.value;
    renderList();
  }

  function bindClientsEvents() {
    // Search functionality
    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", debounce(onSearch, 300));
    }

    // Event delegation for table actions
    const tableBody = $("#clientsTableBody");
    if (tableBody) {
      tableBody.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        if (action === "open-create") return renderClientCreateForm();
        const tr = e.target.closest("tr[data-id]");
        const id = tr?.getAttribute("data-id");
        if (!id) return;
        if (action === "delete") return deleteClient(id);
        if (action === "edit") return renderClientEditForm(id);
      });
    }
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

    $('[data-action="back"]').addEventListener("click", renderClients);

    // Logo drag-and-drop + preview
    const dz = $("#logoDropzone");
    const input = $("#logoInput");
    const previewWrap = $("#logoPreviewWrap");
    const previewImg = $("#logoPreview");
    const logoErrorEl = $("#logoError");
    const nameInput = $('input[name="name"]');
    const descInput = $('textarea[name="description"]');

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

    // Validate on typing
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

    $("#clientForm").addEventListener(
      "submit",
      preventDuplicateSubmission($("#clientForm"), async (e) => {
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
        fd.set("isActive", fd.get("isActive") ? "true" : "false");
        fd.set("name", nameVal);
        fd.set("description", descVal);
        try {
          await apiForm("/api/clients", fd, { method: "POST" });
          toast("Client created", "success");
          renderClients();
        } catch (err) {
          const details =
            err?.body?.errors || err?.body?.message || "Create failed";
          toast(Array.isArray(details) ? details.join(", ") : details, "error");
        }
      })
    );
  }

  async function deleteClient(id) {
    if (!confirm("Delete this client?")) return;
    try {
      await apiJson(`/api/clients/${id}`, { method: "DELETE" });
      toast("Client deleted", "success");
      renderClients();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }

  async function renderClientEditForm(id) {
    let data;
    try {
      data = await apiJson(`/api/clients/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load client";
      toast(msg, "error");
      return renderClients();
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

    $('[data-action="back"]').addEventListener("click", renderClients);

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

    $("#clientEditForm").addEventListener(
      "submit",
      preventDuplicateSubmission($("#clientEditForm"), async (e) => {
        const fd = new FormData(e.currentTarget);

        // If a new logo is provided, send multipart; else send JSON
        const hasNewLogo =
          fd.get("logo") instanceof File && fd.get("logo").name;
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
          renderClients();
        } catch (err) {
          const details =
            err?.body?.errors || err?.body?.message || "Update failed";
          toast(Array.isArray(details) ? details.join(", ") : details, "error");
        }
      })
    );
  }

  return {
    renderClients,
  };
})();
