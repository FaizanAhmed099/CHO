"use strict";

window.ContactModule = (function () {
  const { $, centeredSpinner, apiJson, toast } = window.AdminUtils;
  // Email configuration
  const COMPANY_GMAIL = "info@choc.sa"; // set your company Gmail address here
  const EMAIL_SUBJECT = "Re: Your inquiry"; // fixed subject
  const EMAIL_BODY = "Hello,\n\nThank you for contacting us.\n\nBest regards,\nCompany Team"; // fixed message
  let _messages = [];

  function render() {
    $(
      "#content-area"
    ).innerHTML = `<div class="content-header"><h2 class="mb-0">Contact Messages</h2><p class="text-muted">View messages submitted through the contact form.</p></div><div class="card shadow-sm"><div class="card-body"><div class="d-flex justify-content-end gap-2 mb-3"><button class="btn btn-outline-primary btn-sm" id="emailSelectedBtn"><i class="fas fa-paper-plane me-1"></i> Email Selected</button><button class="btn btn-primary btn-sm" id="emailAllBtn"><i class="fas fa-paper-plane me-1"></i> Email All</button></div><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th style="width:36px"><input type="checkbox" id="selectAllMsg"/></th><th>From</th><th>Email</th><th>Received</th><th class="text-end">Actions</th></tr></thead><tbody id="messagesTableBody"></tbody></table></div></div></div><div class="modal fade" id="messageModal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Message Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body" id="messageModalBody"></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button></div></div></div></div>`;

    // Ensure compose modal exists once globally
    ensureComposeModal();
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

  function openGmailCompose(toEmails = [], { bulk = false } = {}) {
    const recipients = (Array.isArray(toEmails) ? toEmails : [toEmails])
      .map((e) => String(e || "").trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast("No recipients selected.", "error");
      return;
    }

    const openFor = (to) => {
      const params = new URLSearchParams({
        view: "cm",
        fs: "1",
        to,
        su: EMAIL_SUBJECT,
        body: EMAIL_BODY,
      });
      // Ensure Gmail uses the company account if available
      if (COMPANY_GMAIL) params.set("authuser", COMPANY_GMAIL);
      const url = `https://mail.google.com/mail/?${params.toString()}`;
      window.open(url, "_blank");
    };

    if (bulk && recipients.length > 1) {
      // Open one compose per recipient so no one sees others' emails
      recipients.forEach((r) => openFor(r));
    } else {
      // Single compose
      openFor(recipients[0]);
    }
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

  // Compose modal helpers
  let _composeRecipients = [];
  // Open Gmail compose helper
  function openGmailCompose(toEmails = [], { bulk = false } = {}) {
    const recipients = (Array.isArray(toEmails) ? toEmails : [toEmails])
      .map((e) => String(e || "").trim())
      .filter(Boolean);
    if (!recipients.length) return toast("No recipients selected.", "error");

    const openFor = (to) => {
      const params = new URLSearchParams({
        view: "cm",
        fs: "1",
        to,
        su: EMAIL_SUBJECT,
        body: EMAIL_BODY,
      });
      if (COMPANY_GMAIL) params.set("authuser", COMPANY_GMAIL);
      const url = `https://mail.google.com/mail/?${params.toString()}`;
      window.open(url, "_blank");
    };

    if (bulk && recipients.length > 1) {
      recipients.forEach((r) => openFor(r));
    } else {
      openFor(recipients[0]);
    }
  }
  function ensureComposeModal() {
    if (document.getElementById("composeModal")) return;
    const modalHtml = `
      <div class="modal fade" id="composeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fas fa-paper-plane me-2"></i>Compose Email</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">To</label>
                <div id="composeToList" class="small"></div>
              </div>
              <div class="mb-3">
                <label class="form-label">Subject</label>
                <input type="text" id="composeSubject" class="form-control" value="${EMAIL_SUBJECT}" readonly>
              </div>
              <div class="mb-3">
                <label class="form-label">Message</label>
                <textarea id="composeBody" class="form-control" rows="6" readonly>${EMAIL_BODY}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" id="composeSendBtn" class="btn btn-primary">
                <span class="btn-text">Send</span>
                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    bindComposeEvents();
  }

  function openCompose(recipients) {
    _composeRecipients = (Array.isArray(recipients) ? recipients : [recipients])
      .map((e) => String(e || "").trim())
      .filter(Boolean);
    if (_composeRecipients.length === 0) return toast("No recipients selected.", "error");
    $("#composeToList").innerHTML = _composeRecipients.map((e) => `<span class="badge bg-secondary me-1">${e}</span>`).join(" ");
    $("#composeSubject").value = EMAIL_SUBJECT;
    $("#composeBody").value = EMAIL_BODY;
    new bootstrap.Modal($("#composeModal")).show();
  }

  function bindComposeEvents() {
    $("#composeSendBtn")?.addEventListener("click", async () => {
      const btn = $("#composeSendBtn");
      // No backend call; open Gmail compose per recipient
      openGmailCompose(_composeRecipients, { bulk: true });
      bootstrap.Modal.getInstance($("#composeModal"))?.hide();
      toast("Opened Gmail compose.", "success");
    });
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
        if (message?.email) openCompose([message.email]);
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
      openCompose(selected);
    });

    // Email All
    $("#emailAllBtn")?.addEventListener("click", () => {
      const all = _messages.map((m) => m.email).filter(Boolean);
      openCompose(all);
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
