"use strict";

// Awards/Certific// Awards module
window.AwardsModule = (function () {
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

  let __awards = [];
  let __q = "";

  async function fetchAwards() {
    return await apiJson("/api/awards-certificates");
  }

  function awardsListHtml(items) {
    return `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h5 class="m-0">Awards / Certificates</h5>
          <div class="text-muted small">Record your recognitions</div>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <div class="input-group input-group-sm" style="width:260px;">
            <span class="input-group-text bg-white"><i class="fas fa-search"></i></span>
            <input class="form-control" placeholder="Search awards..." value="${__q}" data-action="search-box" />
          </div>
          <button class="btn btn-primary" data-action="open-create"><i class="fas fa-plus me-1"></i>Add Award/Certificate</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th style="width:60px">Image</th>
              <th>Title</th>
              <th>Year</th>
              <th>Month</th>
              <th>Active</th>
              <th style="width:140px"></th>
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

  function renderAwards() {
    $("#tabContent").innerHTML = `
      <div class="content-header">
        <h5><i class="fas fa-award me-2"></i>Awards & Certificates</h5>
        <div class="text-muted small">Manage your awards and certificates</div>
      </div>
      
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div class="input-group input-group-sm" style="max-width: 300px;">
          <span class="input-group-text bg-white">
            <i class="fas fa-search"></i>
          </span>
          <input type="text" class="form-control" placeholder="Search awards..." id="searchInput">
        </div>
        <button class="btn btn-primary" data-action="open-create">
          <i class="fas fa-plus me-2"></i>Add Award
        </button>
      </div>
      
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>IMAGE</th>
              <th>TITLE</th>
              <th>DESCRIPTION</th>
              <th>ACTIVE</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="awardsTableBody">
            ${centeredSpinner("Loading awards...")}
          </tbody>
        </table>
      </div>`;

    // Load awards data
    loadAwardsData();
    bindAwardsEvents();
  }

  async function loadAwardsData() {
    try {
      const bodyEl = $("#awardsTableBody");
      bodyEl.innerHTML = centeredSpinner("Loading awards...");
      const items = await fetchAwards();
      __awards = Array.isArray(items) ? items : [];
      __q = "";
      renderList();
    } catch (err) {
      const msg = err?.body?.message || "Failed to load awards";
      $(
        "#awardsTableBody"
      ).innerHTML = `<tr><td colspan="5" class="text-center text-danger">${msg}</td></tr>`;
    }
  }

  function renderList() {
    const filtered = __awards.filter(
      (a) =>
        a.title?.toLowerCase().includes(__q.toLowerCase()) ||
        a.description?.toLowerCase().includes(__q.toLowerCase())
    );

    $("#awardsTableBody").innerHTML = filtered.length
      ? filtered
          .map(
            (a) => `
              <tr data-id="${a._id}">
                <td>${
                  a.image ? `<img src="${imgUrl(a.image)}" class="thumb">` : ""
                }</td>
                <td>${a.title || ""}</td>
                <td>${a.description || ""}</td>
                <td>${a.isActive !== false ? "Yes" : "No"}</td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" data-action="edit">Edit</button>
                  <button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="text-center text-muted">No awards found</td></tr>`;
  }

  function onSearch(ev) {
    __q = ev.target.value;
    renderList();
  }

  function bindAwardsEvents() {
    // Search functionality
    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", debounce(onSearch, 300));
    }

    // Event delegation for table actions
    const tableBody = $("#awardsTableBody");
    if (tableBody) {
      tableBody.addEventListener("click", (e) => {
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
      <form id="awardForm" class="card p-4 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title <span class="text-danger">*</span></label>
            <input name="title" class="form-control" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Year <span class="text-danger">*</span></label>
            <input name="year" type="number" class="form-control" min="1900" max="2100" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Month Name <span class="text-danger">*</span></label>
            <input name="monthName" class="form-control" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-12">
            <label class="form-label">Award/Certificate Image <span class="text-danger">*</span></label>
            <div id="imageDropZone" class="border border-2 border-dashed rounded p-4 text-center mb-2" style="min-height: 200px; cursor: pointer; transition: all 0.3s;">
              <div id="dropContent">
                <i class="fas fa-award fa-3x text-muted mb-3"></i>
                <p class="mb-2">Drag & drop an image here, or <span class="text-primary">click to browse</span></p>
                <small class="text-muted">Supports: JPG, PNG, GIF (Max: 10MB)</small>
              </div>
              <div id="imagePreview" class="d-none">
                <img id="previewImg" src="" alt="Preview" class="img-fluid rounded mb-2" style="max-height: 150px;" />
                <div>
                  <button type="button" class="btn btn-sm btn-outline-danger" id="removeImage">
                    <i class="fas fa-trash"></i> Remove
                  </button>
                </div>
              </div>
            </div>
            <input type="file" id="imageInput" name="image" accept="image/*" class="d-none" required />
            <div class="invalid-feedback" id="imageError"></div>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" name="isActive" id="isActiveAward" checked />
              <label class="form-check-label" for="isActiveAward">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary" type="submit">
            <i class="fas fa-plus"></i> Create Award/Certificate
          </button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderAwards);

    // Setup drag and drop functionality
    setupImageUpload();

    // Setup form validation
    setupFormValidation();

    $("#awardForm").addEventListener(
      "submit",
      preventDuplicateSubmission($("#awardForm"), async (e) => {
        if (!validateForm()) return;

        const fd = new FormData(e.currentTarget);
        fd.set("isActive", fd.get("isActive") ? "true" : "false");
        try {
          await apiForm("/api/awards-certificates", fd, { method: "POST" });
          toast("Award/Certificate created", "success");
          renderAwards();
        } catch (err) {
          const details =
            err?.body?.errors || err?.body?.message || "Create failed";
          toast(Array.isArray(details) ? details.join(", ") : details, "error");
        }
      })
    );

    function setupImageUpload() {
      const dropZone = $("#imageDropZone");
      const fileInput = $("#imageInput");
      const dropContent = $("#dropContent");
      const imagePreview = $("#imagePreview");
      const previewImg = $("#previewImg");
      const removeBtn = $("#removeImage");
      const imageError = $("#imageError");

      // Click to browse
      dropZone.addEventListener("click", () => fileInput.click());

      // Drag and drop events
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("border-primary", "bg-light");
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("border-primary", "bg-light");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary", "bg-light");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleImageFile(files[0]);
        }
      });

      // File input change
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          handleImageFile(e.target.files[0]);
        }
      });

      // Remove image
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearImage();
      });

      function handleImageFile(file) {
        clearImageError();

        // Validate file type
        if (!file.type.startsWith("image/")) {
          showImageError("Please select a valid image file");
          return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          showImageError("Image size must be less than 10MB");
          return;
        }

        // Set file to input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          dropContent.classList.add("d-none");
          imagePreview.classList.remove("d-none");
        };
        reader.readAsDataURL(file);
      }

      function clearImage() {
        fileInput.value = "";
        previewImg.src = "";
        dropContent.classList.remove("d-none");
        imagePreview.classList.add("d-none");
        clearImageError();
      }

      function showImageError(message) {
        imageError.textContent = message;
        imageError.style.display = "block";
        dropZone.classList.add("border-danger");
      }

      function clearImageError() {
        imageError.textContent = "";
        imageError.style.display = "none";
        dropZone.classList.remove("border-danger");
      }
    }

    function setupFormValidation() {
      const titleInput = $('input[name="title"]');
      const yearInput = $('input[name="year"]');
      const monthInput = $('input[name="monthName"]');

      // Real-time validation
      titleInput.addEventListener("input", () =>
        validateField(titleInput, "Title is required")
      );
      yearInput.addEventListener("input", () => validateYearField(yearInput));
      monthInput.addEventListener("input", () =>
        validateField(monthInput, "Month name is required")
      );
    }

    function validateField(input, message) {
      const value = input.value.trim();
      if (!value) {
        setFieldError(input, message);
        return false;
      } else {
        clearFieldError(input);
        return true;
      }
    }

    function validateYearField(input) {
      const value = input.value.trim();
      const year = parseInt(value);

      if (!value) {
        setFieldError(input, "Year is required");
        return false;
      } else if (isNaN(year) || year < 1900 || year > 2100) {
        setFieldError(input, "Please enter a valid year between 1900 and 2100");
        return false;
      } else {
        clearFieldError(input);
        return true;
      }
    }

    function validateForm() {
      const titleInput = $('input[name="title"]');
      const yearInput = $('input[name="year"]');
      const monthInput = $('input[name="monthName"]');
      const imageInput = $("#imageInput");

      let isValid = true;

      if (!validateField(titleInput, "Title is required")) isValid = false;
      if (!validateYearField(yearInput)) isValid = false;
      if (!validateField(monthInput, "Month name is required")) isValid = false;

      if (!imageInput.files || imageInput.files.length === 0) {
        const imageError = $("#imageError");
        imageError.textContent = "Award/Certificate image is required";
        imageError.style.display = "block";
        $("#imageDropZone").classList.add("border-danger");
        isValid = false;
      }

      if (!isValid) {
        toast("Please correct the highlighted errors", "error");
        // Scroll to first error
        const firstError =
          document.querySelector(".is-invalid") ||
          $("#imageDropZone.border-danger");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      return isValid;
    }
  }

  async function renderAwardEditForm(id) {
    let data;
    try {
      data = await apiJson(`/api/awards-certificates/${id}`);
    } catch (err) {
      const msg = err?.body?.message || "Failed to load item";
      toast(msg, "error");
      return renderAwards();
    }
    $("#tabContent").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="m-0">Edit Award/Certificate</h5>
        <button class="btn btn-secondary" data-action="back">Back</button>
      </div>
      <form id="awardEditForm" class="card p-4 shadow-sm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Title <span class="text-danger">*</span></label>
            <input name="title" class="form-control" value="${
              data.title || ""
            }" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Year <span class="text-danger">*</span></label>
            <input name="year" type="number" class="form-control" min="1900" max="2100" value="${
              data.year || ""
            }" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Month Name <span class="text-danger">*</span></label>
            <input name="monthName" class="form-control" value="${
              data.monthName || ""
            }" required />
            <div class="invalid-feedback"></div>
          </div>
          <div class="col-12">
            <label class="form-label">Award/Certificate Image</label>
            <div id="imageDropZone" class="border border-2 border-dashed rounded p-4 text-center mb-2" style="min-height: 200px; cursor: pointer; transition: all 0.3s;">
              <div id="dropContent" ${data.image ? 'class="d-none"' : ""}>
                <i class="fas fa-award fa-3x text-muted mb-3"></i>
                <p class="mb-2">Drag & drop a new image here, or <span class="text-primary">click to browse</span></p>
                <small class="text-muted">Supports: JPG, PNG, GIF (Max: 10MB) - Leave empty to keep current image</small>
              </div>
              <div id="imagePreview" ${data.image ? "" : 'class="d-none"'}>
                <img id="previewImg" src="${
                  data.image ? imgUrl(data.image) : ""
                }" alt="Preview" class="img-fluid rounded mb-2" style="max-height: 150px;" />
                <div>
                  <button type="button" class="btn btn-sm btn-outline-danger" id="removeImage">
                    <i class="fas fa-trash"></i> Remove
                  </button>
                  <small class="d-block text-muted mt-1">${
                    data.image ? "Current image - upload new to replace" : ""
                  }</small>
                </div>
              </div>
            </div>
            <input type="file" id="imageInput" name="image" accept="image/*" class="d-none" />
            <div class="invalid-feedback" id="imageError"></div>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" name="isActive" id="isActiveAward" ${
                data.isActive ? "checked" : ""
              } />
              <label class="form-check-label" for="isActiveAward">Active</label>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary" type="submit">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </form>`;

    $('[data-action="back"]').addEventListener("click", renderAwards);

    // Setup drag and drop functionality for edit form
    setupEditImageUpload();

    // Setup form validation for edit form
    setupEditFormValidation();

    $("#awardEditForm").addEventListener(
      "submit",
      preventDuplicateSubmission($("#awardEditForm"), async (e) => {
        if (!validateEditForm()) return;

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
          toast("Award updated", "success");
          renderAwards();
        } catch (err) {
          const details =
            err?.body?.errors || err?.body?.message || "Update failed";
          toast(Array.isArray(details) ? details.join(", ") : details, "error");
        }
      })
    );

    function setupEditImageUpload() {
      const dropZone = $("#imageDropZone");
      const fileInput = $("#imageInput");
      const dropContent = $("#dropContent");
      const imagePreview = $("#imagePreview");
      const previewImg = $("#previewImg");
      const removeBtn = $("#removeImage");
      const imageError = $("#imageError");

      // Click to browse
      dropZone.addEventListener("click", () => fileInput.click());

      // Drag and drop events
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("border-primary", "bg-light");
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("border-primary", "bg-light");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary", "bg-light");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleImageFile(files[0]);
        }
      });

      // File input change
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          handleImageFile(e.target.files[0]);
        }
      });

      // Remove image
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearImage();
      });

      function handleImageFile(file) {
        clearImageError();

        // Validate file type
        if (!file.type.startsWith("image/")) {
          showImageError("Please select a valid image file");
          return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          showImageError("Image size must be less than 10MB");
          return;
        }

        // Set file to input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          dropContent.classList.add("d-none");
          imagePreview.classList.remove("d-none");
        };
        reader.readAsDataURL(file);
      }

      function clearImage() {
        fileInput.value = "";
        previewImg.src = "";
        dropContent.classList.remove("d-none");
        imagePreview.classList.add("d-none");
        clearImageError();
      }

      function showImageError(message) {
        imageError.textContent = message;
        imageError.style.display = "block";
        dropZone.classList.add("border-danger");
      }

      function clearImageError() {
        imageError.textContent = "";
        imageError.style.display = "none";
        dropZone.classList.remove("border-danger");
      }
    }

    function setupEditFormValidation() {
      const titleInput = $('input[name="title"]');
      const yearInput = $('input[name="year"]');
      const monthInput = $('input[name="monthName"]');

      // Real-time validation
      titleInput.addEventListener("input", () =>
        validateField(titleInput, "Title is required")
      );
      yearInput.addEventListener("input", () => validateYearField(yearInput));
      monthInput.addEventListener("input", () =>
        validateField(monthInput, "Month name is required")
      );
    }

    function validateEditForm() {
      const titleInput = $('input[name="title"]');
      const yearInput = $('input[name="year"]');
      const monthInput = $('input[name="monthName"]');

      let isValid = true;

      if (!validateField(titleInput, "Title is required")) isValid = false;
      if (!validateYearField(yearInput)) isValid = false;
      if (!validateField(monthInput, "Month name is required")) isValid = false;

      if (!isValid) {
        toast("Please correct the highlighted errors", "error");
        // Scroll to first error
        const firstError = document.querySelector(".is-invalid");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      return isValid;
    }
  }

  async function deleteAward(id) {
    if (!confirm("Delete this item?")) return;
    try {
      await apiJson(`/api/awards-certificates/${id}`, { method: "DELETE" });
      toast("Item deleted", "success");
      renderAwards();
    } catch (err) {
      const msg = err?.body?.message || "Delete failed";
      toast(msg, "error");
    }
  }

  return {
    renderAwards,
  };
})();
