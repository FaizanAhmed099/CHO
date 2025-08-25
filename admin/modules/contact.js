"use strict";

window.ContactModule = (function () {
  const { $, centeredSpinner, apiJson, toast } = window.AdminUtils;
  let _messages = [];

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Contact Messages</h2><p class="text-muted">View messages submitted through the contact form.</p></div><div class="card shadow-sm"><div class="card-body"><div class="d-flex justify-content-end gap-2 mb-3"><button class="btn btn-outline-primary btn-sm" id="emailSelectedBtn"><i class="fas fa-paper-plane me-1"></i> Email Selected</button><button class="btn btn-primary btn-sm" id="emailAllBtn"><i class="fas fa-paper-plane me-1"></i> Email All</button></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th style="width:36px"><input type="checkbox" id="selectAllMsg"/></th><th>From</th><th>Email</th><th>Received</th><th class="text-end">Actions</th></tr></thead><tbody id="messagesTableBody"></tbody></table></div></div></div><div class="modal fade" id="messageModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Message Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="messageModalBody"></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button></div></div></div></div>`;
    loadData();
  }

  async function loadData() {
    const tableBody = $("#messagesTableBody");
    tableBody.innerHTML = `<tr><td colspan="5">${centeredSpinner()}</td></tr>`;
    try {
      _messages = await apiJson("/api/contact");
      renderList();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load messages.</td></tr>`;
    } finally {
      bindListEvents();
    }
  }

  function renderList() {
    const tableBody = "#messagesTableBody";
    const tbl = $(tableBody);
    if (_messages.length === 0) {
      tbl.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No messages received.</td></tr>`;
      return;
    }
    tbl.innerHTML = _messages
      .map(
        (msg) =>
          `<tr data-id="${msg._id}"><td><input type="checkbox" class="row-select" data-email="${msg.email}"/></td><td><strong>${msg.firstName} ${
            msg.lastName
          }</strong></td><td><a href="mailto:${msg.email}">${
            msg.email
          }</a></td><td>${new Date(
            msg.createdAt
          ).toLocaleString()}</td><td class="text-end"><div class="btn-group"><button class="btn btn-sm btn-outline-primary view-btn" title="View Message"><i class="fas fa-eye"></i></button><button class="btn btn-sm btn-outline-success email-btn" title="Send Email"><i class="fas fa-paper-plane"></i></button><button class="btn btn-sm btn-outline-danger delete-btn" title="Delete"><i class="fas fa-trash"></i></button></div></td></tr>`
      )
      .join("");
  }

  function openGmailCompose(toEmails = []) {
    const recipients = (Array.isArray(toEmails) ? toEmails : [toEmails])
      .map((e) => String(e || "").trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast("No recipients selected.", "error");
      return;
    }
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: recipients.join(","),
      su: "Re: Your inquiry",
      body: "Hello,\n\n",
    });
    const url = `https://mail.google.com/mail/?${params.toString()}`;
    window.open(url, "_blank");
  }

  function renderDetailModal(message) {
    $(
      "#messageModalBody"
    ).innerHTML = `<dl class="row"><dt class="col-sm-3">From</dt><dd class="col-sm-9">${
      message.firstName
    } ${
      message.lastName
    }</dd><dt class="col-sm-3">Email</dt><dd class="col-sm-9">${
      message.email
    }</dd><dt class="col-sm-3">Telephone</dt><dd class="col-sm-9">${
      message.telephone
    }</dd><dt class="col-sm-3">Received</dt><dd class="col-sm-9">${new Date(
      message.createdAt
    ).toLocaleString()}</dd></dl><hr><h6>Message:</h6><p style="white-space: pre-wrap;">${
      message.message
    }</p>`;
    new bootstrap.Modal($("#messageModal")).show();
  }

  function bindListEvents() {
    $("#messagesTableBody")?.addEventListener("click", (e) => {
      const id = e.target.closest("tr[data-id]")?.dataset.id;
      if (!id) return;
      if (e.target.closest(".view-btn")) {
        const message = _messages.find((m) => m._id === id);
        if (message) renderDetailModal(message);
      } else if (e.target.closest(".email-btn")) {
        const message = _messages.find((m) => m._id === id);
        if (message?.email) openGmailCompose([message.email]);
      } else if (e.target.closest(".delete-btn")) {
        handleDelete(id);
      }
    });

    // Select all toggle
    $("#selectAllMsg")?.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document
        .querySelectorAll("#messagesTableBody .row-select")
        .forEach((cb) => (cb.checked = checked));
    });

    // Email Selected
    $("#emailSelectedBtn")?.addEventListener("click", () => {
      const selected = Array.from(
        document.querySelectorAll("#messagesTableBody .row-select:checked")
      ).map((el) => el.getAttribute("data-email"));
      openGmailCompose(selected);
    });

    // Email All
    $("#emailAllBtn")?.addEventListener("click", () => {
      const all = _messages.map((m) => m.email).filter(Boolean);
      openGmailCompose(all);
    });
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await apiJson(`/api/contact/${id}`, { method: "DELETE" });
      toast("Message deleted!", "success");
      loadData();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return { render };
})();
