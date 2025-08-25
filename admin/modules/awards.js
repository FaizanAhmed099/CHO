"use strict";

window.AwardsModule = (function () {
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
  let _awards = [],
    _q = "";

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Awards & Certificates</h2><p class="text-muted">Manage your company's recognitions.</p></div><div class="card shadow-sm"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div class="input-group" style="max-width: 300px;"><span class="input-group-text"><i class="fas fa-search"></i></span><input type="text" class="form-control" placeholder="Search by title..." id="awardSearchInput" value="${_q}"></div><button class="btn btn-primary" id="addAwardBtn"><i class="fas fa-plus me-2"></i>Add New Award</button></div><div class="card-body"><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Image</th><th>Title</th><th>Date</th><th class="text-center">Active</th><th class="text-end">Actions</th></tr></thead><tbody id="awardsTableBody"></tbody></table></div></div></div>`;
    loadData();
  }

  // Lightweight confirm modal (copied style from Clients module)
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
    const tableBody = $("#awardsTableBody");
    tableBody.innerHTML = `<tr><td colspan="5">${centeredSpinner()}</td></tr>`;
    try {
      _awards = await apiJson("/api/awards-certificates?includeInactive=true");
      renderList();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load awards.</td></tr>`;
    } finally {
      bindListEvents();
    }
  }

  function renderList() {
    const filtered = _awards.filter((a) =>
      a.title.toLowerCase().includes(_q.toLowerCase())
    );
    const tableBody = $("#awardsTableBody");
    if (filtered.length === 0) {
      const message = _q
        ? `No awards found matching "${_q}".`
        : "No awards have been added yet.";
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${message}</td></tr>`;
      return;
    }
    tableBody.innerHTML = filtered
      .map(
        (a) =>
          `<tr data-id="${a._id}"><td><img src="${imgUrl(
            a.image
          )}" class="thumb" alt="${a.title}"></td><td><strong>${
            a.title
          }</strong></td><td>${a.monthName} ${
            a.year
          }</td><td class="text-center"><div class="form-check form-switch d-inline-block"><input class="form-check-input toggle-active" type="checkbox" role="switch" style="cursor:pointer" ${
            a.isActive ? "checked" : ""
          }></div></td><td class="text-end"><button class="btn btn-sm btn-outline-secondary edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button><button class="btn btn-sm btn-outline-danger delete-btn ms-1" title="Delete"><i class="fas fa-trash"></i></button></td></tr>`
      )
      .join("");
  }

  function renderForm(data = {}) {
    const isEditing = !!data._id;
    const monthOptions = [
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
    ]
      .map(
        (m) =>
          `<option value="${m}" ${
            data.monthName === m ? "selected" : ""
          }>${m}</option>`
      )
      .join("");
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">${
      isEditing ? "Edit Award" : "Add New Award"
    }</h2></div><div class="card shadow-sm"><div class="card-body"><form id="awardForm" novalidate><div class="row"><div class="col-md-7"><div class="mb-3"><label for="title" class="form-label">Title <span class="text-danger">*</span></label><input type="text" class="form-control" id="title" name="title" value="${
      data.title || ""
    }" required minlength="3"></div><div class="row"><div class="col-md-6 mb-3"><label for="year" class="form-label">Year <span class="text-danger">*</span></label><input type="number" class="form-control" id="year" name="year" min="1900" max="3000" value="${
      data.year || new Date().getFullYear()
    }" required></div><div class="col-md-6 mb-3"><label for="monthName" class="form-label">Month <span class="text-danger">*</span></label><select class="form-select" id="monthName" name="monthName" required>${monthOptions}</select></div></div></div><div class="col-md-5"><label class="form-label">Image <span class="text-danger">*</span></label><div id="imageDropZone" class="drop-zone mb-3"><div class="drop-content"><i class="fas fa-cloud-upload-alt fa-3x text-muted mb-2"></i><p class="mb-0">Drop image or click</p></div></div><div id="imagePreviewContainer" class="text-center" style="display: none;"><img id="imagePreview" src="" alt="Image Preview" class="img-thumbnail mb-2" style="max-height: 150px;"><button type="button" id="removeImageBtn" class="btn btn-sm btn-outline-danger">Remove Image</button></div><input type="file" id="image" name="image" class="d-none" accept="image/*"><div class="form-check form-switch mt-4"><input class="form-check-input" type="checkbox" role="switch" id="isActive" name="isActive" ${
      data.isActive !== false ? "checked" : ""
    }><label class="form-check-label" for="isActive">Award is Active</label></div></div></div><hr class="my-4"><div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="backBtn">Cancel</button><button type="submit" class="btn btn-primary">${
      isEditing ? "Save Changes" : "Create Award"
    }</button></div></form></div></div>`;
    bindFormEvents(data);
  }

  function bindListEvents() {
    $("#addAwardBtn")?.addEventListener("click", () => renderForm());
    $("#awardSearchInput")?.addEventListener(
      "input",
      debounce((e) => {
        _q = e.target.value.trim();
        renderList();
      }, 300)
    );
    $("#awardsTableBody")?.addEventListener("click", (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.closest(".edit-btn")) {
        const award = _awards.find((a) => a._id === id);
        if (award) renderForm(award);
      } else if (e.target.closest(".delete-btn")) {
        handleDelete(id);
      }
    });

    // Handle Active/Inactive switch change
    $("#awardsTableBody")?.addEventListener("change", async (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("toggle-active")) {
        const checked = e.target.checked;
        const award = _awards.find((a) => a._id === id);
        if (!award) return;
        try {
          const res = await apiJson(`/api/awards-certificates/${id}`, {
            method: "PUT",
            body: JSON.stringify({ isActive: checked }),
          });
          const updated = res?.item || null;
          if (updated) {
            const idx = _awards.findIndex((a) => a._id === id);
            if (idx >= 0) _awards[idx] = updated;
          } else {
            award.isActive = checked;
          }
          toast(`Award marked ${checked ? 'Active' : 'Inactive'}.`, "success");
          renderList();
        } catch (err) {
          e.target.checked = !checked; // revert UI on error
          toast(err.message || "Failed to update status", "error");
        }
      }
    });
  }

  function bindFormEvents(data = {}) {
    const form = $("#awardForm"),
      dz = $("#imageDropZone"),
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
    const handleFile = (file) => {
      if (file && file.type.startsWith("image/")) {
        currentFile = file;
        previewImg.src = URL.createObjectURL(currentFile);
        dz.style.display = "none";
        previewContainer.style.display = "block";
      } else {
        toast("Please select a valid image file.", "error");
      }
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
        const titleInput = $("#title"),
          yearInput = $("#year");
        clearFieldError(titleInput);
        clearFieldError(yearInput);
        dz.classList.remove("is-invalid");
        let isValid = true;
        if (titleInput.value.trim().length < 3) {
          setFieldError(titleInput, "Title must be at least 3 characters.");
          isValid = false;
        }
        const yearVal = parseInt(yearInput.value, 10);
        if (!yearVal || yearVal < 1900 || yearVal > 3000) {
          setFieldError(
            yearInput,
            "Please enter a valid year between 1900 and 3000."
          );
          isValid = false;
        }
        if (!data._id && !currentFile) {
          dz.classList.add("is-invalid");
          toast("An image is required.", "error");
          isValid = false;
        }
        if (!isValid) return;
        const fd = new FormData(form);
        fd.set("isActive", $("#isActive").checked);
        if (currentFile) {
          fd.set("image", currentFile);
        } else {
          fd.delete("image");
        }
        try {
          const method = data._id ? "PUT" : "POST";
          const url = data._id
            ? `/api/awards-certificates/${data._id}`
            : "/api/awards-certificates";
          await apiForm(url, fd, { method });
          toast(
            `Award ${data._id ? "updated" : "created"} successfully!`,
            "success"
          );
          // Return to the Awards list (no page reload)
          render();
        } catch (err) {
          toast(err.message || "An unexpected error occurred.", "error");
        }
      })
    );
  }

  async function handleDelete(id) {
    const ok = await showConfirmModal('Are you sure you want to permanently delete this award?', { title: 'Delete Award', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    try {
      await apiJson(`/api/awards-certificates/${id}`, { method: "DELETE" });
      toast("Award deleted successfully!", "success");
      loadData();
    } catch (err) {
      toast(err.message || "Failed to delete award.", "error");
    }
  }

  return { render };
})();
