"use strict";

window.ClientsModule = (function () {
  const {
    $,
    centeredSpinner,
    apiJson,
    apiForm,
    toast,
    imgUrl,
    setFieldError,
    clearFieldError,
    debounce,
    preventDuplicateSubmission,
  } = window.AdminUtils;
  let _clients = [],
    _q = "";

  // Basic HTML escape to prevent raw HTML in descriptions from breaking the table
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Remove any HTML tags first, then escape for safe display
  function sanitizeText(str) {
    const noTags = String(str).replace(/<[^>]*>/g, "");
    return escapeHtml(noTags);
  }

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Clients</h2><p class="text-muted">Manage your client logos and descriptions.</p></div><div class="card shadow-sm"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div class="input-group" style="max-width: 300px;"><span class="input-group-text"><i class="fas fa-search"></i></span><input type="text" class="form-control" placeholder="Search by name..." id="clientSearchInput" value="${_q}"></div><button class="btn btn-primary" id="addClientBtn"><i class="fas fa-plus me-2"></i>Add New Client</button></div><div class="card-body"><div class="table-responsive"><table class="table table-hover align-middle table-borderless"><thead><tr><th>Logo</th><th>Name</th><th>Description</th><th class="text-center">Active</th><th class="text-end">Actions</th></tr></thead><tbody id="clientsTableBody"></tbody></table></div></div></div>`;
    loadData();
  }

  // Lightweight confirm modal (no external JS dependency)
  function ensureConfirmModal() {
    if ($('#confirmModal')) return $('#confirmModal');
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.innerHTML = `
      <div class="modal fade" style="display:none" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm</h5>
              <button type="button" class="btn-close" data-dismiss></button>
            </div>
            <div class="modal-body"><p id="confirmModalMessage" class="mb-0">Are you sure?</p></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
              <button type="button" class="btn btn-danger" data-confirm>Delete</button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade" style="display:none"></div>
    `;
    document.body.appendChild(modal);
    return $('#confirmModal');
  }

  function showConfirmModal(message, { title = 'Confirm', confirmText = 'Confirm', confirmClass = 'btn-danger' } = {}) {
    return new Promise((resolve) => {
      const root = ensureConfirmModal();
      const wrap = root.querySelector('.modal');
      const backdrop = root.querySelector('.modal-backdrop');
      root.querySelector('.modal-title').textContent = title;
      root.querySelector('#confirmModalMessage').textContent = message;
      const btnConfirm = root.querySelector('[data-confirm]');
      const btnCancel = root.querySelector('[data-cancel]');
      const btnClose = root.querySelector('[data-dismiss]');
      // reset classes/text
      btnConfirm.className = 'btn ' + confirmClass;
      btnConfirm.textContent = confirmText;

      const close = (val) => {
        wrap.classList.remove('show');
        backdrop.classList.remove('show');
        setTimeout(() => {
          wrap.style.display = 'none';
          backdrop.style.display = 'none';
          cleanup();
          resolve(val);
        }, 150);
      };
      const onConfirm = () => close(true);
      const onCancel = () => close(false);
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      const cleanup = () => {
        btnConfirm.removeEventListener('click', onConfirm);
        btnCancel.removeEventListener('click', onCancel);
        btnClose.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
      };

      btnConfirm.addEventListener('click', onConfirm);
      btnCancel.addEventListener('click', onCancel);
      btnClose.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey);

      // show
      wrap.style.display = 'block';
      backdrop.style.display = 'block';
      requestAnimationFrame(() => {
        wrap.classList.add('show');
        backdrop.classList.add('show');
      });
    });
  }

  async function loadData() {
    const tableBody = $("#clientsTableBody");
    tableBody.innerHTML = `<tr><td colspan="5">${centeredSpinner()}</td></tr>`;
    try {
      _clients = await apiJson("/api/clients?includeInactive=true");
      renderList();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load clients.</td></tr>`;
    } finally {
      bindListEvents();
    }
  }

  function renderList() {
    const filtered = _clients.filter((c) =>
      c.name.toLowerCase().includes(_q.toLowerCase())
    );
    const tableBody = $("#clientsTableBody");
    if (filtered.length === 0) {
      const message = _q
        ? `No clients found matching "${_q}".`
        : "No clients have been added yet.";
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${message}</td></tr>`;
      return;
    }
    tableBody.innerHTML = filtered
      .map((c) => {
        const name = sanitizeText(c.name || "");
        const descFull = sanitizeText(c.description || "");
        const truncated = descFull.length > 120 ? descFull.substring(0, 120) + "..." : descFull;
        return `<tr data-id="${c._id}"><td><img src="${imgUrl(
          c.logo
        )}" class="thumb" alt="${name}"></td><td><strong>${
          name
        }</strong></td><td title="${descFull}">${truncated}</td><td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input toggle-active" type="checkbox" role="switch" style="cursor:pointer" ${
          c.isActive ? "checked" : ""
        }></div></td><td class="text-end"><button class="btn btn-sm btn-outline-secondary edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button><button class="btn btn-sm btn-outline-danger delete-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`;
      })
      .join("");
  }

  function renderForm(data = {}) {
    const isEditing = !!data._id;
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">${
      isEditing ? "Edit Client" : "Add New Client"
    }</h2></div><div class="card shadow-sm"><div class="card-body"><form id="clientForm" novalidate><div class="row"><div class="col-md-7"><div class="mb-3"><label for="name" class="form-label">Client Name <span class="text-danger">*</span></label><input type="text" class="form-control" id="name" name="name" value="${
      data.name || ""
    }" required></div><div class="mb-3"><label for="description" class="form-label">Description <span class="text-danger">*</span></label><textarea class="form-control" id="description" name="description" rows="8" required>${
      data.description || ""
    }</textarea></div></div><div class="col-md-5"><label class="form-label">Logo <span class="text-danger">*</span></label><div id="logoDropZone" class="drop-zone mb-3"><div class="drop-content"><i class="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i><p class="mb-0">Drop image here or click</p><small class="text-muted">PNG, JPG, GIF</small></div></div><div id="logoPreviewContainer" class="text-center" style="display: none;"><img id="logoPreview" src="" alt="Logo Preview" class="img-thumbnail mb-2" style="max-height: 150px;"><button type="button" id="removeLogoBtn" class="btn btn-sm btn-outline-danger">Remove Image</button></div><input type="file" id="logo" name="logo" class="d-none" accept="image/*"><div class="form-check form-switch mt-4"><input class="form-check-input" type="checkbox" role="switch" id="isActive" name="isActive" ${
      data.isActive !== false ? "checked" : ""
    }><label class="form-check-label" for="isActive">Client is Active</label></div></div></div><hr class="my-4"><div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="backBtn">Cancel</button><button type="submit" class="btn btn-primary">${
      isEditing ? "Save Changes" : "Create Client"
    }</button></div></form></div></div>`;
    bindFormEvents(data);
  }

  function bindListEvents() {
    $("#addClientBtn")?.addEventListener("click", () => renderForm());
    $("#clientSearchInput")?.addEventListener(
      "input",
      debounce((e) => {
        _q = e.target.value.trim();
        renderList();
      }, 300)
    );
    $("#clientsTableBody")?.addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-id]");
      if (!row) return;
      const id = row.dataset.id;
      if (e.target.closest(".edit-btn")) {
        const client = _clients.find((c) => c._id === id);
        if (client) renderForm(client);
      } else if (e.target.closest(".delete-btn")) {
        handleDelete(id);
      }
    });
    $("#clientsTableBody")?.addEventListener("change", (e) => {
      const toggle = e.target.closest(".toggle-active");
      if (toggle) {
        const id = e.target.closest("tr[data-id]")?.dataset.id;
        handleToggleActive(id, toggle.checked, toggle);
      }
    });
  }

  function bindFormEvents(data = {}) {
    const form = $("#clientForm"),
      dz = $("#logoDropZone"),
      input = $("#logo"),
      previewContainer = $("#logoPreviewContainer"),
      previewImg = $("#logoPreview"),
      removeBtn = $("#removeLogoBtn");
    let currentFile = null;
    if (data.logo) {
      previewImg.src = imgUrl(data.logo);
      previewContainer.style.display = "block";
      dz.style.display = "none";
    }
    $("#backBtn").addEventListener("click", render);
    const handleFile = (file) => {
      if (!file || !file.type.startsWith("image/")) {
        toast("Please select a valid image file.", "error");
        return;
      }
      currentFile = file;
      previewImg.src = URL.createObjectURL(currentFile);
      dz.style.display = "none";
      previewContainer.style.display = "block";
    };
    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", () => {
      if (input.files.length) handleFile(input.files[0]);
    });
    removeBtn.addEventListener("click", () => {
      input.value = "";
      currentFile = null;
      previewContainer.style.display = "none";
      dz.style.display = "flex";
    });
    form.addEventListener(
      "submit",
      preventDuplicateSubmission(form, async () => {
        const nameInput = $("#name"),
          descInput = $("#description");
        clearFieldError(nameInput);
        clearFieldError(descInput);
        dz.classList.remove("is-invalid");
        let isValid = true;
        if (!nameInput.value.trim()) {
          setFieldError(nameInput, "Client name is required.");
          isValid = false;
        }
        if (!descInput.value.trim()) {
          setFieldError(descInput, "A description is required.");
          isValid = false;
        }
        if (!data._id && !currentFile) {
          dz.classList.add("is-invalid");
          toast("A logo image is required.", "error");
          isValid = false;
        }
        if (!isValid) return;
        const fd = new FormData(form);
        fd.set("isActive", $("#isActive").checked);
        if (currentFile) {
          fd.set("logo", currentFile);
        } else {
          fd.delete("logo");
        }
        try {
          const method = data._id ? "PUT" : "POST";
          const url = data._id ? `/api/clients/${data._id}` : "/api/clients";
          await apiForm(url, fd, { method });
          toast(
            `Client ${data._id ? "updated" : "created"} successfully!`,
            "success"
          );
          render();
        } catch (err) {
          toast(err.message || "An unexpected error occurred.", "error");
        }
      })
    );
  }

  async function handleToggleActive(id, isActive, toggleElement) {
    toggleElement.disabled = true;
    try {
      await apiJson(`/api/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
      const client = _clients.find((c) => c._id === id);
      if (client) client.isActive = isActive;
      toast("Client status updated.", "success");
    } catch (err) {
      toast(err.message, "error");
      toggleElement.checked = !isActive;
    } finally {
      toggleElement.disabled = false;
    }
  }

  async function handleDelete(id) {
    const ok = await showConfirmModal('Are you sure you want to permanently delete this client?', { title: 'Delete Client', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    try {
      await apiJson(`/api/clients/${id}`, { method: "DELETE" });
      toast("Client deleted successfully!", "success");
      loadData();
    } catch (err) {
      toast(err.message || "Failed to delete client.", "error");
    }
  }

  return { render };
})();
