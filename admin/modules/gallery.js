"use strict";

window.GalleryModule = (function () {
  const {
    $,
    centeredSpinner,
    apiJson,
    apiForm,
    toast,
    imgUrl,
    preventDuplicateSubmission,
  } = window.AdminUtils;

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

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Gallery</h2><p class="text-muted">Manage all gallery images.</p></div><div class="card shadow-sm"><div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div class="btn-group" role="group"><button class="btn btn-primary" id="bulkUploadBtn"><i class="fas fa-upload me-2"></i>Bulk Upload</button></div><div class="d-flex gap-2"><button class="btn btn-outline-secondary" id="selectAllBtn"><i class="fas fa-check-square me-2"></i>Select All</button><button class="btn btn-outline-danger" id="deleteSelectedBtn" disabled><i class="fas fa-trash me-2"></i>Delete Selected</button></div></div><div class="card-body"><div id="galleryGrid" class="row g-3"></div></div></div>`;
    loadData();
  }

  async function loadData() {
    const grid = $("#galleryGrid");
    grid.innerHTML = centeredSpinner();
    try {
      const data = await apiJson("/api/bulk-images");
      const allImages = data.flatMap((batch) => batch.images || []);
      renderGrid(allImages);
    } catch (error) {
      grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load gallery.</div>`;
    } finally {
      bindListEvents();
    }
  }

  function renderGrid(images) {
    const grid = $("#galleryGrid");
    if (images.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center text-muted py-5"><h4>No images in the gallery yet.</h4><p>Click "Bulk Upload Images" to get started.</p></div>`;
      return;
    }
    grid.innerHTML = images
      .map(
        (img) =>
          `<div class="col-6 col-md-4 col-lg-3"><div class="card h-100 shadow-sm" data-id="${
            img._id
          }"><img src="${imgUrl(
            img.url
          )}" style="height: 200px; object-fit: cover;" class="card-img-top"><div class="card-footer d-flex justify-content-between align-items-center"><div class="d-flex align-items-center gap-2"><input type="checkbox" class="form-check-input select-checkbox" style="display:none; cursor:pointer"><div class="form-check form-switch"><input class="form-check-input toggle-active" type="checkbox" role="switch" style="cursor:pointer" ${
            img.isActive ? "checked" : ""
          }></div></div><button class="btn btn-sm btn-outline-danger delete-btn"><i class="fas fa-trash"></i></button></div></div></div>`
      )
      .join("");
  }

  function renderUploadForm() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Bulk Upload</h2><p class="text-muted">Upload multiple images to the gallery at once.</p></div><div class="card shadow-sm"><div class="card-body"><form id="uploadForm"><div id="uploadDropZone" class="drop-zone mb-3"><div class="text-center"><i class="fas fa-images fa-4x text-muted mb-3"></i><h4>Drag and drop images here</h4><p class="text-muted">or click to select files (up to 50 at a time)</p></div></div><input type="file" id="fileInput" class="d-none" multiple accept="image/*"><div id="previewArea" class="mb-3"></div><hr class="my-4"><div class="d-flex justify-content-end gap-2"><button type="button" class="btn btn-secondary" id="backBtn">Cancel</button><button type="submit" class="btn btn-primary" disabled><i class="fas fa-upload me-2"></i>Upload Files</button></div></form></div></div>`;
    bindUploadFormEvents();
  }

  function bindListEvents() {
    $("#bulkUploadBtn")?.addEventListener("click", renderUploadForm);
    $("#galleryGrid")?.addEventListener("click", (e) => {
      const id = e.target.closest(".card[data-id]")?.dataset.id;
      if (e.target.matches(".delete-btn, .delete-btn *")) {
        handleDelete(id);
      } else if (e.target.matches('.select-checkbox')) {
        toggleSelect(id, e.target.checked);
      }
    });
    $("#galleryGrid")?.addEventListener("change", (e) => {
      const id = e.target.closest(".card[data-id]")?.dataset.id;
      if (e.target.matches(".toggle-active")) {
        handleToggleActive(id, e.target.checked, e.target);
      }
    });

    // Selection controls
    $("#selectAllBtn")?.addEventListener("click", onSelectAllToggle);
    $("#deleteSelectedBtn")?.addEventListener("click", onDeleteSelected);
  }

  function bindUploadFormEvents() {
    const dz = $("#uploadDropZone"),
      input = $("#fileInput"),
      previewArea = $("#previewArea"),
      form = $("#uploadForm"),
      submitBtn = form.querySelector('[type="submit"]');
    let files = [];
    $("#backBtn").addEventListener("click", render);
    const handleFiles = (newFiles) => {
      files.push(
        ...Array.from(newFiles).filter((f) => f.type.startsWith("image/"))
      );
      if (files.length > 50) {
        toast("You can upload up to 50 images at a time. Extra files were ignored.", "warning");
        files = files.slice(0, 50);
      }
      renderPreviews();
      submitBtn.disabled = files.length === 0;
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
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => handleFiles(input.files));
    function renderPreviews() {
      previewArea.innerHTML =
        files.length > 0
          ? `<p><strong>${
              files.length
            }</strong> files selected:</p><div class="d-flex flex-wrap gap-2">${files
              .map(
                (f) =>
                  `<img src="${URL.createObjectURL(
                    f
                  )}" style="width: 80px; height: 80px; object-fit: cover; border-radius: .25rem;">`
              )
              .join("")}</div>`
          : "";
    }
    form.addEventListener(
      "submit",
      preventDuplicateSubmission(form, async () => {
        if (files.length === 0) {
          toast("Please select files to upload.", "error");
          return;
        }
        const fd = new FormData();
        // Use field name 'images' which backend accepts (also supports 'images[]').
        files.forEach((file) => fd.append("images", file));
        try {
          await apiForm("/api/bulk-images", fd, { method: "POST" });
          toast(`${files.length} images uploaded!`, "success");
          render();
        } catch (err) {
          toast(err.message, "error");
        }
      })
    );
  }

  async function handleToggleActive(id, isActive, toggleElement) {
    toggleElement.disabled = true;
    try {
      await apiJson(`/api/bulk-images/image/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
      toast("Image status updated.", "success");
    } catch (err) {
      toast(err.message, "error");
      toggleElement.checked = !isActive;
    } finally {
      toggleElement.disabled = false;
    }
  }

  // ----- Selection state -----
  let _selectionMode = false;
  let _selected = new Set();

  function setSelectionMode(on) {
    _selectionMode = on;
    const checkboxes = document.querySelectorAll('#galleryGrid .select-checkbox');
    checkboxes.forEach((cb) => {
      cb.style.display = on ? '' : 'none';
    });
    updateSelectionControls();
  }

  function toggleSelect(id, checked) {
    if (checked) _selected.add(id);
    else _selected.delete(id);
    updateSelectionControls();
  }

  function updateSelectionControls() {
    const delBtn = $("#deleteSelectedBtn");
    delBtn.disabled = _selected.size === 0;
  }

  function onSelectAllToggle() {
    // Enter selection mode if not active
    if (!_selectionMode) setSelectionMode(true);
    const cards = Array.from(document.querySelectorAll('#galleryGrid .card[data-id]'));
    const allSelected = _selected.size === cards.length && cards.length > 0;
    _selected = new Set();
    cards.forEach((card) => {
      const cb = card.querySelector('.select-checkbox');
      if (!allSelected) {
        cb.checked = true;
        _selected.add(card.dataset.id);
      } else {
        cb.checked = false;
      }
    });
    updateSelectionControls();
  }

  // Helper: small delay
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Helper: delete with limited concurrency, returns { successIds, failedIds }
  async function deleteWithConcurrency(ids, concurrency = 8) {
    const queue = [...ids];
    const successIds = [];
    const failedIds = [];
    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        try {
          await apiJson(`/api/bulk-images/image/${id}`, { method: 'DELETE' });
          successIds.push(id);
          $(`.card[data-id="${id}"]`)?.closest('.col-6')?.remove();
        } catch (_) {
          failedIds.push(id);
        }
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker());
    await Promise.all(workers);
    return { successIds, failedIds };
  }

  async function onDeleteSelected() {
    if (_selected.size === 0) return;
    const ok = await showConfirmModal(`Delete ${_selected.size} selected image(s)?`, { title: 'Delete Selected Images', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    const ids = Array.from(_selected);

    // Disable controls during processing
    const delBtn = document.querySelector('#deleteSelectedBtn');
    const selAllBtn = document.querySelector('#selectAllBtn');
    const uploadBtn = document.querySelector('#bulkUploadBtn');
    const delBtnHtml = delBtn.innerHTML;
    delBtn.disabled = true;
    selAllBtn?.setAttribute('disabled', 'true');
    uploadBtn?.setAttribute('disabled', 'true');
    delBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

    // First pass
    let { successIds, failedIds } = await deleteWithConcurrency(ids, 8);
    // Retry once after a short delay
    if (failedIds.length) {
      await sleep(400);
      const retry = await deleteWithConcurrency(failedIds, 4);
      successIds = successIds.concat(retry.successIds);
      failedIds = retry.failedIds;
    }

    // Clear selection and refresh list from server to ensure accurate state
    _selected.clear();
    updateSelectionControls();
    await loadData();

    // Restore controls
    delBtn.innerHTML = delBtnHtml;
    delBtn.disabled = true;
    selAllBtn?.removeAttribute('disabled');
    uploadBtn?.removeAttribute('disabled');

    // Feedback
    if (successIds.length) toast(`${successIds.length} image(s) deleted.`, 'success');
    if (failedIds.length) toast(`${failedIds.length} image(s) failed to delete. Please try again.`, 'error');
  }

  async function handleDelete(id) {
    const ok = await showConfirmModal('Are you sure you want to permanently delete this image?', { title: 'Delete Image', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    try {
      await apiJson(`/api/bulk-images/image/${id}`, { method: "DELETE" });
      toast("Image deleted!", "success");
      $(`.card[data-id="${id}"]`)?.closest(".col-6")?.remove();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return { render };
})();
