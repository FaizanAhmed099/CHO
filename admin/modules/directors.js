"use strict";

window.DirectorsModule = (function () {
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

  let _directors = [];
  let _q = "";
  // Lightweight client-side rate limiter for translate calls
  let _lastTranslateAt = 0;
  const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function _rateLimitTranslate(gap = 950) {
    const now = Date.now();
    const elapsed = now - _lastTranslateAt;
    if (elapsed < gap) {
      await _sleep(gap - elapsed);
    }
    _lastTranslateAt = Date.now();
  }
  // Use shared Arabic utils
  const { hasArabic: _hasArabic, transliterateToArabic: _transliterateToArabic } = window.ArabicUtils || { hasArabic: () => false, transliterateToArabic: (s) => s };

  // Debounce helper for slug-like live autofill
  const _debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Directors</h2><p class="text-muted">Manage the board of directors and key personnel.</p></div><div class="card shadow-sm"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div class="input-group" style="max-width: 300px;"><span class="input-group-text"><i class="fas fa-search"></i></span><input type="text" class="form-control" placeholder="Search by name..." id="directorSearchInput" value="${_q}"></div><button class="btn btn-primary" id="addDirectorBtn"><i class="fas fa-plus me-2"></i>Add New Director</button></div><div class="card-body"><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Image</th><th>Name</th><th>Role</th><th class="text-center">Active</th><th class="text-end">Actions</th></tr></thead><tbody id="directorsTableBody"></tbody></table></div></div></div>`;
    loadData();
  }

  // Lightweight confirm modal (shared across modules via #confirmModal)
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
    const tableBody = $("#directorsTableBody");
    tableBody.innerHTML = `<tr><td colspan="5">${centeredSpinner()}</td></tr>`;
    try {
      _directors = await apiJson("/api/directors?includeInactive=true");
      renderList();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load directors.</td></tr>`;
    } finally {
      bindListEvents();
    }
  }

  function renderList() {
    const filtered = _directors.filter((d) =>
      d.name.toLowerCase().includes(_q.toLowerCase())
    );
    const tableBody = $("#directorsTableBody");
    if (filtered.length === 0) {
      const message = _q
        ? `No directors found matching "${_q}".`
        : "No directors have been added yet.";
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${message}</td></tr>`;
      return;
    }
    tableBody.innerHTML = filtered
      .map(
        (d) =>
          `<tr data-id="${d._id}"><td><img src="${imgUrl(
            d.image
          )}" class="thumb" alt="${d.name}"></td><td><strong>${
            d.name
          }</strong><br><small class="text-muted">${
            d.nameAr || ""
          }</small></td><td>${d.role}<br><small class="text-muted">${
            d.roleAr || ""
          }</small></td><td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input toggle-active" type="checkbox" role="switch" style="cursor:pointer" ${
            d.isActive ? "checked" : ""
          }></div></td><td class="text-end"><button class="btn btn-sm btn-outline-secondary edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button><button class="btn btn-sm btn-outline-danger delete-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`
      )
      .join("");
  }

  function renderForm(data = {}) {
    const isEditing = !!data._id;
    $("#content-area").innerHTML = `
        <div class="content-header"><h2 class="mb-0">${
          isEditing ? "Edit Director" : "Add New Director"
        }</h2></div>
        <div class="card shadow-sm"><div class="card-body">
            <form id="directorForm" novalidate>
                <div class="row">
                    <div class="col-md-4">
                        <div class="mb-3"><label for="name" class="form-label">Name (English) <span class="text-danger">*</span></label><input type="text" class="form-control" id="name" name="name" value="${
                          data.name || ""
                        }" required></div>
                        <div class="mb-3"><label for="role" class="form-label">Role (English) <span class="text-danger">*</span></label><input type="text" class="form-control" id="role" name="role" value="${
                          data.role || ""
                        }" required></div>
                        <div class="mb-3"><label for="bio" class="form-label">Biography (English)</label><textarea class="form-control" id="bio" name="bio" rows="6">${
                          data.bio || ""
                        }</textarea></div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3"><label for="nameAr" class="form-label">Name (Arabic)</label><input type="text" class="form-control" id="nameAr" name="nameAr" value="${
                          data.nameAr || ""
                        }" placeholder="Auto-translates on blur"></div>
                        <div class="mb-3"><label for="roleAr" class="form-label">Role (Arabic)</label><input type="text" class="form-control" id="roleAr" name="roleAr" value="${
                          data.roleAr || ""
                        }" placeholder="Auto-translates on blur"></div>
                        <div class="mb-3"><label for="bioAr" class="form-label">Biography (Arabic)</label><textarea class="form-control" id="bioAr" name="bioAr" rows="6" placeholder="Auto-translates on blur">${
                          data.bioAr || ""
                        }</textarea></div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3"><label for="slug" class="form-label">Slug (URL)</label><input type="text" class="form-control" id="slug" name="slug" value="${
                          data.slug || ""
                        }" placeholder="auto-generated from name"></div>
                        <div class="mb-3"><label class="form-label">Image <span class="text-danger">*</span></label><div id="imageDropZone" class="drop-zone"><div class="drop-content"><i class="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i><p class="mb-0">Drop image or click</p></div></div><div id="imagePreviewContainer" class="text-center mt-2" style="display: none;"><img id="imagePreview" src="" class="img-thumbnail" style="max-height: 150px;"><button type="button" id="removeImageBtn" class="btn btn-sm btn-outline-danger mt-2">Remove Image</button></div><input type="file" id="image" name="image" class="d-none" accept="image/*"></div>
                        <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="isActive" name="isActive" ${
                          data.isActive !== false ? "checked" : ""
                        }><label class="form-check-label" for="isActive">Director is Active</label></div>
                    </div>
                </div>
                <hr class="my-4"><div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="backBtn">Cancel</button><button type="submit" class="btn btn-primary">${
                  isEditing ? "Save Changes" : "Create Director"
                }</button></div>
            </form>
        </div></div>`;
    bindFormEvents(data);
  }

  function bindListEvents() {
    $("#addDirectorBtn")?.addEventListener("click", () => renderForm());
    $("#directorSearchInput")?.addEventListener(
      "input",
      debounce((e) => {
        _q = e.target.value.trim();
        renderList();
      }, 300)
    );
    $("#directorsTableBody")?.addEventListener("click", async (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.closest(".edit-btn")) {
        const director = _directors.find((d) => d._id === id);
        if (director) renderForm(director);
      } else if (e.target.closest(".delete-btn")) {
        handleDelete(id);
      }
    });

    // Handle switch change for active/inactive
    $("#directorsTableBody")?.addEventListener("change", async (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("toggle-active")) {
        const checked = e.target.checked;
        const director = _directors.find((d) => d._id === id);
        if (!director) return;
        try {
          const res = await apiJson(`/api/directors/${id}`, {
            method: "PUT",
            body: JSON.stringify({ isActive: checked }),
          });
          const updated = res?.item || null;
          if (updated) {
            const idx = _directors.findIndex((d) => d._id === id);
            if (idx >= 0) _directors[idx] = updated;
          } else {
            director.isActive = checked;
          }
          toast(`Director marked ${checked ? 'Active' : 'Inactive'}.`, "success");
          renderList();
        } catch (err) {
          // revert UI on error
          e.target.checked = !checked;
          toast(err.message || "Failed to update status", "error");
        }
      }
    });
  }

  function bindFormEvents(data = {}) {
    const form = $("#directorForm");
    const nameInput = $("#name"),
      roleInput = $("#role"),
      bioInput = $("#bio");
    const nameArInput = $("#nameAr"),
      roleArInput = $("#roleAr"),
      bioArInput = $("#bioAr");
    const slugInput = $("#slug");
    const dz = $("#imageDropZone"),
      input = $("#image"),
      previewContainer = $("#imagePreviewContainer"),
      previewImg = $("#imagePreview"),
      removeBtn = $("#removeImageBtn");
    let currentFile = null;

    if (data.image) {
      previewImg.src = imgUrl(data.image);
      previewContainer.style.display = "block";
      dz.style.display = "none";
    }
    $("#backBtn").addEventListener("click", render);

    // --- Live Translation ---
    const translateField = async (sourceElement, targetElement) => {
      const textToTranslate = sourceElement.value.trim();
      const allowUpgrade = targetElement.dataset.autofill === "1"; // upgrade transliteration
      if (textToTranslate && (!targetElement.value.trim() || allowUpgrade) && targetElement.dataset.manual !== "1") {
        if (targetElement.dataset.translating === "1") return; // prevent concurrent calls on same target
        targetElement.dataset.translating = "1";
        targetElement.classList.add("is-translating");
        try {
          await _rateLimitTranslate();
          const res = await apiJson("/api/translate", {
            method: "POST",
            body: JSON.stringify({ text: textToTranslate }),
          });
          if (res && res.error) {
            // Soft failure: backend returned 200 with error flag
            // Local fallback: transliterate
            const local = _transliterateToArabic(textToTranslate);
            if (local && _hasArabic(local)) {
              targetElement.value = local;
              targetElement.dataset.autofill = "1";
            } else {
              toast(res.message || "Auto-translation failed.", "warning");
            }
            return;
          }
          if (res && res.translatedText) {
            targetElement.value = res.translatedText;
            targetElement.dataset.autofill = "1";
          }
        } catch (err) {
          console.error("Translation failed:", err);
          // Normalize possible error shapes -> string message
          let message = "Auto-translation failed.";
          if (typeof err === "string") {
            try {
              const parsed = JSON.parse(err);
              message = parsed?.message || err;
            } catch {
              message = err;
            }
          } else if (err && typeof err === "object") {
            if (typeof err.message === "string") {
              // Some backends send a JSON string inside message
              try {
                const inner = JSON.parse(err.message);
                message = inner?.message || err.message;
              } catch {
                message = err.message;
              }
            } else if (err?.body?.message) {
              message = err.body.message;
            }
          }
          // Local fallback on exception: transliterate
          const local = _transliterateToArabic(textToTranslate);
          if (local && _hasArabic(local)) {
            targetElement.value = local;
            targetElement.dataset.autofill = "1";
          } else {
            toast(message, "warning");
          }
        } finally {
          targetElement.dataset.translating = "0";
          targetElement.classList.remove("is-translating");
        }
      }
    };

    // Bind slug-like auto arabic generation on input with debounce
    function bindAutoArabic(sourceEl, targetEl) {
      // If user edits Arabic field, mark as manual to stop auto-updates
      const markManual = () => {
        targetEl.dataset.manual = "1";
        targetEl.dataset.autofill = "0";
      };
      targetEl.addEventListener("input", markManual);
      // Debounced transliteration while typing
      const updateAuto = _debounce(() => {
        if (targetEl.dataset.manual === "1") return;
        const txt = sourceEl.value.trim();
        if (!txt) return;
        const local = _transliterateToArabic(txt);
        if (local && _hasArabic(local)) {
          targetEl.value = local;
          targetEl.dataset.autofill = "1";
        }
      }, 300);
      sourceEl.addEventListener("input", updateAuto);
      // On blur, try to upgrade via backend translation
      sourceEl.addEventListener("blur", () => translateField(sourceEl, targetEl));
    }
    // Enable live transliteration + upgrade on blur via backend
    bindAutoArabic(nameInput, nameArInput);
    bindAutoArabic(roleInput, roleArInput);
    bindAutoArabic(bioInput, bioArInput);

    // --- Live Slug Generation ---
    let isSlugManuallyEdited = !!data.slug;
    const slugify = (text) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");
    nameInput.addEventListener("input", () => {
      if (!isSlugManuallyEdited) slugInput.value = slugify(nameInput.value);
    });
    slugInput.addEventListener("input", () => {
      isSlugManuallyEdited = slugInput.value.trim() !== "";
    });

    // --- File Handling (FIXED) ---
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
    // FIX: Added preventDefault() to dragover to allow drop event to fire
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

    // --- Form Submission ---
    form.addEventListener(
      "submit",
      preventDuplicateSubmission(form, async () => {
        clearFieldError(nameInput);
        clearFieldError(roleInput);
        dz.classList.remove("is-invalid");
        let isValid = true;
        if (nameInput.value.trim().length < 2) {
          setFieldError(nameInput, "Name must be at least 2 characters.");
          isValid = false;
        }
        if (!roleInput.value.trim()) {
          setFieldError(roleInput, "Role is required.");
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
        if (!fd.get("slug").trim()) {
          fd.set("slug", slugify(fd.get("name")));
        }
        if (currentFile) {
          fd.set("image", currentFile);
        } else {
          fd.delete("image");
        }

        try {
          const method = data._id ? "PUT" : "POST";
          const url = data._id
            ? `/api/directors/${data._id}`
            : "/api/directors";
          await apiForm(url, fd, { method });
          toast(`Director ${data._id ? "updated" : "created"}!`, "success");
          render();
        } catch (err) {
          toast(err.message, "error");
        }
      })
    );
  }

  async function handleDelete(id) {
    const ok = await showConfirmModal('Are you sure you want to delete this director?', { title: 'Delete Director', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    try {
      await apiJson(`/api/directors/${id}`, { method: "DELETE" });
      toast("Director deleted!", "success");
      loadData();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return { render };
})();
