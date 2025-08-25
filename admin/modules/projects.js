"use strict";

window.ProjectsModule = (function () {
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
  let _projects = [],
    _q = "";

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Projects</h2><p class="text-muted">Manage company projects.</p></div><div class="card shadow-sm"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div class="input-group" style="max-width: 300px;"><span class="input-group-text"><i class="fas fa-search"></i></span><input type="text" class="form-control" placeholder="Search by title..." id="projectSearchInput" value="${_q}"></div><button class="btn btn-primary" id="addProjectBtn"><i class="fas fa-plus me-2"></i>Add New Project</button></div><div class="card-body"><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Image</th><th>Title</th><th>Category</th><th>Status</th><th class="text-center">Active</th><th class="text-end">Actions</th></tr></thead><tbody id="projectsTableBody"></tbody></table></div></div></div>`;
    loadData();
  }

  // Lightweight confirm modal (shared via #confirmModal)
  function ensureConfirmModal() {
    if (document.querySelector('#confirmModal')) return document.querySelector('#confirmModal');
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
    return modal;
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

      wrap.style.display = 'block';
      backdrop.style.display = 'block';
      requestAnimationFrame(() => {
        wrap.classList.add('show');
        backdrop.classList.add('show');
      });
    });
  }

  async function loadData() {
    const tableBody = $("#projectsTableBody");
    tableBody.innerHTML = `<tr><td colspan="6">${centeredSpinner()}</td></tr>`;
    try {
      _projects = await apiJson("/api/projects?includeInactive=true");
      renderList();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load projects.</td></tr>`;
    } finally {
      bindListEvents();
    }
  }

  function renderList() {
    const filtered = _projects.filter((p) =>
      p.title.toLowerCase().includes(_q.toLowerCase())
    );
    const tableBody = $("#projectsTableBody");
    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No projects found.</td></tr>`;
      return;
    }
    tableBody.innerHTML = filtered
      .map(
        (p) =>
          `<tr data-id="${p._id}"><td><img src="${imgUrl(
            p.image
          )}" class="thumb" alt="${p.title}"></td><td><strong>${
            p.title
          }</strong></td><td>${p.category}</td><td>${
            p.status
          }</td><td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input toggle-active" type="checkbox" role="switch" style="cursor:pointer" ${
            p.isActive ? "checked" : ""
          }></div></td><td class="text-end"><button class="btn btn-sm btn-outline-secondary edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button><button class="btn btn-sm btn-outline-danger delete-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`
      )
      .join("");
  }

  function renderForm(data = {}) {
    const isEditing = !!data._id;
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">${
      isEditing ? "Edit Project" : "Add New Project"
    }</h2></div><div class="card shadow-sm"><div class="card-body"><form id="projectForm" novalidate><div class="row"><div class="col-md-7"><div class="mb-3"><label for="title" class="form-label">Title <span class="text-danger">*</span></label><input type="text" class="form-control" id="title" name="title" value="${
      data.title || ""
    }" required></div><div class="row"><div class="col-md-6 mb-3"><label for="category" class="form-label">Category <span class="text-danger">*</span></label><input type="text" class="form-control" id="category" name="category" value="${
      data.category || ""
    }" required></div><div class="col-md-6 mb-3"><label for="status" class="form-label">Status <span class="text-danger">*</span></label><input type="text" class="form-control" id="status" name="status" value="${
      data.status || "Ongoing Projects"
    }" required></div></div><div class="mb-3"><label for="slug" class="form-label">Slug (URL)</label><input type="text" class="form-control" id="slug" name="slug" value="${
      data.slug || ""
    }" placeholder="auto-generated from title"></div><div class="mb-3"><label for="description" class="form-label">Description</label><textarea class="form-control" id="description" name="description" rows="4">${
      data.description || ""
    }</textarea></div></div><div class="col-md-5"><label class="form-label">Image <span class="text-danger">*</span></label><div id="imageDropZone" class="drop-zone mb-3"><div class="drop-content"><i class="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i><p class="mb-0">Drop image or click</p></div></div><div id="imagePreviewContainer" class="text-center" style="display: none;"><img id="imagePreview" src="" class="img-thumbnail mb-2" style="max-height: 150px;"><button type="button" id="removeImageBtn" class="btn btn-sm btn-outline-danger">Remove Image</button></div><input type="file" id="image" name="image" class="d-none" accept="image/*"><div class="form-check form-switch mt-4"><input class="form-check-input" type="checkbox" role="switch" id="isActive" name="isActive" style="cursor:pointer"  ${
      data.isActive !== false ? "checked" : ""
    }><label class="form-check-label" for="isActive">Project is Active</label></div></div></div><hr class="my-4"><div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="backBtn">Cancel</button><button type="submit" class="btn btn-primary">${
      isEditing ? "Save Changes" : "Create Project"
    }</button></div></form></div></div>`;
    bindFormEvents(data);
  }

  function bindListEvents() {
    $("#addProjectBtn")?.addEventListener("click", () => renderForm());
    $("#projectSearchInput")?.addEventListener(
      "input",
      debounce((e) => {
        _q = e.target.value.trim();
        renderList();
      }, 300)
    );
    $("#projectsTableBody")?.addEventListener("click", (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.closest(".edit-btn")) {
        const project = _projects.find((p) => p._id === id);
        if (project) renderForm(project);
      } else if (e.target.closest(".delete-btn")) {
        handleDelete(id);
      }
    });

    // Handle Active/Inactive switch change
    $("#projectsTableBody")?.addEventListener("change", async (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("toggle-active")) {
        const checked = e.target.checked;
        const project = _projects.find((p) => p._id === id);
        if (!project) return;
        try {
          const res = await apiJson(`/api/projects/${id}`, {
            method: "PUT",
            body: JSON.stringify({ isActive: checked }),
          });
          const updated = res?.item || null;
          if (updated) {
            const idx = _projects.findIndex((p) => p._id === id);
            if (idx >= 0) _projects[idx] = updated;
          } else {
            project.isActive = checked;
          }
          toast(`Project marked ${checked ? 'Active' : 'Inactive'}.`, "success");
          renderList();
        } catch (err) {
          e.target.checked = !checked; // revert UI on error
          toast(err.message || "Failed to update status", "error");
        }
      }
    });
  }

  function bindFormEvents(data = {}) {
    const form = $("#projectForm"),
      dz = $("#imageDropZone"),
      input = $("#image"),
      previewContainer = $("#imagePreviewContainer"),
      previewImg = $("#imagePreview"),
      removeBtn = $("#removeImageBtn");
    const slugInput = $("#slug");
    let currentFile = null;
    if (data.image) {
      previewImg.src = imgUrl(data.image);
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
    // --- Slug auto-generation ---
    // Treat slug as auto-managed until the user types in the slug field
    let isSlugManuallyEdited = false;
    const slugify = (text) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");
    // Initialize/normalize slug on load when not manually edited (edit mode too)
    if (!isSlugManuallyEdited && $("#title").value.trim()) {
      slugInput.value = slugify($("#title").value);
    }
    $("#title").addEventListener("input", () => {
      if (!isSlugManuallyEdited) slugInput.value = slugify($("#title").value);
    });
    // On title blur, if slug still empty and not manual, generate it
    $("#title").addEventListener("blur", () => {
      if (!isSlugManuallyEdited && !slugInput.value.trim()) {
        slugInput.value = slugify($("#title").value);
      }
    });
    slugInput.addEventListener("input", () => {
      isSlugManuallyEdited = slugInput.value.trim() !== "";
    });
    // Also mark manual on change (covers autofill/paste cases)
    slugInput.addEventListener("change", () => {
      isSlugManuallyEdited = slugInput.value.trim() !== "";
    });
    // If user leaves slug empty and blurs the field, auto-fill from title
    slugInput.addEventListener("blur", () => {
      if (!slugInput.value.trim()) {
        slugInput.value = slugify($("#title").value);
        // keep isSlugManuallyEdited as false so future title edits continue to update
      }
    });
    form.addEventListener(
      "submit",
      preventDuplicateSubmission(form, async () => {
        const titleInput = $("#title"),
          categoryInput = $("#category"),
          statusInput = $("#status");
        clearFieldError(titleInput);
        clearFieldError(categoryInput);
        clearFieldError(statusInput);
        dz.classList.remove("is-invalid");
        let isValid = true;
        if (!titleInput.value.trim()) {
          setFieldError(titleInput, "Title is required.");
          isValid = false;
        }
        if (!categoryInput.value.trim()) {
          setFieldError(categoryInput, "Category is required.");
          isValid = false;
        }
        if (!statusInput.value.trim()) {
          setFieldError(statusInput, "Status is required.");
          isValid = false;
        }
        if (!data._id && !currentFile) {
          dz.classList.add("is-invalid");
          toast("Image is required.", "error");
          isValid = false;
        }
        if (!isValid) return;
        const fd = new FormData(form);
        fd.set("isActive", $("#isActive").checked);
        // Ensure slug exists
        if (!fd.get("slug").trim()) {
          fd.set("slug", slugify($("#title").value));
        }
        if (currentFile) {
          fd.set("image", currentFile);
        } else {
          fd.delete("image");
        }
        try {
          const method = data._id ? "PUT" : "POST";
          const url = data._id ? `/api/projects/${data._id}` : "/api/projects";
          await apiForm(url, fd, { method });
          toast(`Project ${data._id ? "updated" : "created"}!`, "success");
          render();
        } catch (err) {
          toast(err.message, "error");
        }
      })
    );
  }

  async function handleDelete(id) {
    const ok = await showConfirmModal('Are you sure you want to delete this project?', { title: 'Delete Project', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    try {
      await apiJson(`/api/projects/${id}`, { method: "DELETE" });
      toast("Project deleted!", "success");
      loadData();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return { render };
})();
