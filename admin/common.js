/* =====================================================================
   common.js
   Shared utilities used across admin pages:
   - toast()          simple notification
   - logAudit()        writes a row to admin_audit_log
   - fmtDate()          human-readable date
   - CrudManager        generic table + add/edit modal + delete,
                        configured per-page (each page's own .js file
                        supplies its column/field definitions and calls
                        this — keeping page JS files thin and self-
                        contained per the required file layout).
===================================================================== */

function toast(message, type = "info") {
  let host = document.getElementById("mh-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "mh-toast-host";
    host.style.cssText = "position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const bg = type === "error" ? "var(--red)" : type === "success" ? "var(--brand)" : "var(--ink)";
  el.style.cssText = `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(16,24,40,.18);max-width:320px;`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function logAudit(action, tableName, recordId) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await supabaseClient.from("admin_audit_log").insert({
      action,
      table_name: tableName,
      record_id: recordId || null,
      performed_by: session ? session.user.id : null
    });
  } catch (e) {
    // Audit logging must never block the primary action
    console.warn("Audit log failed:", e);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generic CRUD manager. Each entity page passes a config describing
 * its table and fields, and gets a working list + create/edit/delete
 * UI without duplicating the same logic on every page.
 *
 * config = {
 *   tableName: "hospitals",
 *   idField: "id",
 *   orderBy: "created_at",
 *   columns: [{ key, label, render? }],
 *   fields: [{ key, label, type: "text"|"number"|"select"|"textarea"|"checkbox", options?, required? }],
 *   tableEl: <tbody> element,
 *   emptyMessage: string
 * }
 */
class CrudManager {
  constructor(config) {
    this.config = config;
    this.rows = [];
  }

  async load() {
    const { tableName, orderBy } = this.config;
    const { data, error } = await supabaseClient
      .from(tableName)
      .select("*")
      .order(orderBy || "created_at", { ascending: false });

    if (error) {
      toast(`Couldn't load ${tableName}: ${error.message}`, "error");
      return;
    }
    this.rows = data || [];
    this.render();
  }

  render() {
    const { columns, tableEl, emptyMessage } = this.config;
    tableEl.innerHTML = "";

    if (this.rows.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${columns.length + 1}" class="mh-empty">${escapeHtml(emptyMessage || "Nothing here yet.")}</td>`;
      tableEl.appendChild(tr);
      return;
    }

    this.rows.forEach((row) => {
      const tr = document.createElement("tr");
      const cells = columns.map((c) => {
        const raw = row[c.key];
        const val = c.render ? c.render(raw, row) : escapeHtml(raw ?? "—");
        return `<td>${val}</td>`;
      }).join("");
      tr.innerHTML = `${cells}<td class="mh-row-actions">
        <button class="mh-btn-icon" data-action="edit" data-id="${row[this.config.idField]}">Edit</button>
        <button class="mh-btn-icon mh-danger" data-action="delete" data-id="${row[this.config.idField]}">Delete</button>
      </td>`;
      tableEl.appendChild(tr);
    });

    tableEl.querySelectorAll("[data-action='edit']").forEach((btn) => {
      btn.addEventListener("click", () => this.openModal(btn.dataset.id));
    });
    tableEl.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteRow(btn.dataset.id));
    });
  }

  openModal(id) {
    const { fields, tableName, idField } = this.config;
    const row = id ? this.rows.find((r) => String(r[idField]) === String(id)) : null;

    const overlay = document.createElement("div");
    overlay.className = "mh-modal-overlay";
    const fieldsHtml = fields.map((f) => {
      let val = row ? row[f.key] : "";
      if (f.format) val = f.format(val);
      if (f.type === "select") {
        const optList = f.options || [];
        const opts = optList.map((o) => {
          const optVal = (typeof o === "object") ? o.value : o;
          const optLabel = (typeof o === "object") ? o.label : o;
          const sel = String(val) === String(optVal) ? "selected" : "";
          return `<option value="${escapeHtml(optVal)}" ${sel}>${escapeHtml(optLabel)}</option>`;
        }).join("");
        const blank = f.required ? "" : `<option value="">—</option>`;
        return `<label class="mh-field"><span>${f.label}</span><select name="${f.key}" ${f.required ? "required" : ""}>${blank}${opts}</select></label>`;
      }
      if (f.type === "textarea") {
        return `<label class="mh-field"><span>${f.label}</span><textarea name="${f.key}" ${f.required ? "required" : ""}>${escapeHtml(val)}</textarea></label>`;
      }
      if (f.type === "checkbox") {
        return `<label class="mh-field mh-checkbox"><input type="checkbox" name="${f.key}" ${val ? "checked" : ""}/><span>${f.label}</span></label>`;
      }
      return `<label class="mh-field"><span>${f.label}</span><input type="${f.type || "text"}" name="${f.key}" value="${escapeHtml(val)}" ${f.required ? "required" : ""}/></label>`;
    }).join("");

    overlay.innerHTML = `
      <div class="mh-modal">
        <div class="mh-modal-head">
          <h3>${row ? "Edit" : "Add"} ${tableName.replace(/_/g, " ")}</h3>
          <button class="mh-modal-close" type="button" aria-label="Close">&times;</button>
        </div>
        <form class="mh-modal-form">
          ${fieldsHtml}
          <div class="mh-modal-actions">
            <button type="button" class="mh-btn mh-btn-ghost mh-modal-cancel">Cancel</button>
            <button type="submit" class="mh-btn mh-btn-primary">${row ? "Save changes" : "Add"}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".mh-modal-close").addEventListener("click", close);
    overlay.querySelector(".mh-modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    overlay.querySelector(".mh-modal-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const payload = {};
      fields.forEach((f) => {
        if (f.parse) {
          payload[f.key] = f.parse(form.get(f.key));
        } else if (f.type === "checkbox") {
          payload[f.key] = form.get(f.key) === "on";
        } else if (f.type === "number") {
          const v = form.get(f.key);
          payload[f.key] = v === "" ? null : Number(v);
        } else {
          payload[f.key] = form.get(f.key) || null;
        }
      });
      await this.save(row ? row[idField] : null, payload);
      close();
    });
  }

  async save(id, payload) {
    const { tableName, idField } = this.config;
    if (id) {
      const { error } = await supabaseClient.from(tableName).update(payload).eq(idField, id);
      if (error) { toast(`Update failed: ${error.message}`, "error"); return; }
      await logAudit("update", tableName, id);
      toast("Saved changes.", "success");
    } else {
      const { data, error } = await supabaseClient.from(tableName).insert(payload).select().maybeSingle();
      if (error) { toast(`Add failed: ${error.message}`, "error"); return; }
      await logAudit("insert", tableName, data ? data[idField] : null);
      toast("Added.", "success");
    }
    await this.load();
  }

  async deleteRow(id) {
    if (!confirm("Delete this record? This can't be undone.")) return;
    const { tableName, idField } = this.config;
    const { error } = await supabaseClient.from(tableName).delete().eq(idField, id);
    if (error) { toast(`Delete failed: ${error.message}`, "error"); return; }
    await logAudit("delete", tableName, id);
    toast("Deleted.", "success");
    await this.load();
  }
}
/* =====================================================================
   common.js
   Shared utilities used across admin pages:
   - toast()          simple notification
   - logAudit()        writes a row to admin_audit_log
   - fmtDate()          human-readable date
   - CrudManager        generic table + add/edit modal + delete,
                        configured per-page (each page's own .js file
                        supplies its column/field definitions and calls
                        this — keeping page JS files thin and self-
                        contained per the required file layout).
===================================================================== */

function toast(message, type = "info") {
  let host = document.getElementById("mh-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "mh-toast-host";
    host.style.cssText = "position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const bg = type === "error" ? "var(--red)" : type === "success" ? "var(--brand)" : "var(--ink)";
  el.style.cssText = `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;font-family:'Inter',sans-serif;font-size:13.5px;font-weight:600;box-shadow:0 8px 24px rgba(16,24,40,.18);max-width:320px;`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function logAudit(action, tableName, recordId) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await supabaseClient.from("admin_audit_log").insert({
      action,
      table_name: tableName,
      record_id: recordId || null,
      performed_by: session ? session.user.id : null
    });
  } catch (e) {
    // Audit logging must never block the primary action
    console.warn("Audit log failed:", e);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generic CRUD manager. Each entity page passes a config describing
 * its table and fields, and gets a working list + create/edit/delete
 * UI without duplicating the same logic on every page.
 *
 * config = {
 *   tableName: "hospitals",
 *   idField: "id",
 *   orderBy: "created_at",
 *   columns: [{ key, label, render? }],
 *   fields: [{ key, label, type: "text"|"number"|"select"|"textarea"|"checkbox", options?, required? }],
 *   tableEl: <tbody> element,
 *   emptyMessage: string
 * }
 */
class CrudManager {
  constructor(config) {
    this.config = config;
    this.rows = [];
  }

  async load() {
    const { tableName, orderBy } = this.config;
    const { data, error } = await supabaseClient
      .from(tableName)
      .select("*")
      .order(orderBy || "created_at", { ascending: false });

    if (error) {
      toast(`Couldn't load ${tableName}: ${error.message}`, "error");
      return;
    }
    this.rows = data || [];
    this.render();
  }

  render() {
    const { columns, tableEl, emptyMessage } = this.config;
    tableEl.innerHTML = "";

    if (this.rows.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${columns.length + 1}" class="mh-empty">${escapeHtml(emptyMessage || "Nothing here yet.")}</td>`;
      tableEl.appendChild(tr);
      return;
    }

    this.rows.forEach((row) => {
      const tr = document.createElement("tr");
      const cells = columns.map((c) => {
        const raw = row[c.key];
        const val = c.render ? c.render(raw, row) : escapeHtml(raw ?? "—");
        return `<td>${val}</td>`;
      }).join("");
      tr.innerHTML = `${cells}<td class="mh-row-actions">
        <button class="mh-btn-icon" data-action="edit" data-id="${row[this.config.idField]}">Edit</button>
        <button class="mh-btn-icon mh-danger" data-action="delete" data-id="${row[this.config.idField]}">Delete</button>
      </td>`;
      tableEl.appendChild(tr);
    });

    tableEl.querySelectorAll("[data-action='edit']").forEach((btn) => {
      btn.addEventListener("click", () => this.openModal(btn.dataset.id));
    });
    tableEl.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", () => this.deleteRow(btn.dataset.id));
    });
  }

  openModal(id) {
    const { fields, tableName, idField } = this.config;
    const row = id ? this.rows.find((r) => String(r[idField]) === String(id)) : null;

    const overlay = document.createElement("div");
    overlay.className = "mh-modal-overlay";
    const fieldsHtml = fields.map((f) => {
      let val = row ? row[f.key] : "";
      if (f.format) val = f.format(val);
      if (f.type === "select") {
        const optList = f.options || [];
        const opts = optList.map((o) => {
          const optVal = (typeof o === "object") ? o.value : o;
          const optLabel = (typeof o === "object") ? o.label : o;
          const sel = String(val) === String(optVal) ? "selected" : "";
          return `<option value="${escapeHtml(optVal)}" ${sel}>${escapeHtml(optLabel)}</option>`;
        }).join("");
        const blank = f.required ? "" : `<option value="">—</option>`;
        return `<label class="mh-field"><span>${f.label}</span><select name="${f.key}" ${f.required ? "required" : ""}>${blank}${opts}</select></label>`;
      }
      if (f.type === "textarea") {
        return `<label class="mh-field"><span>${f.label}</span><textarea name="${f.key}" ${f.required ? "required" : ""}>${escapeHtml(val)}</textarea></label>`;
      }
      if (f.type === "checkbox") {
        return `<label class="mh-field mh-checkbox"><input type="checkbox" name="${f.key}" ${val ? "checked" : ""}/><span>${f.label}</span></label>`;
      }
      return `<label class="mh-field"><span>${f.label}</span><input type="${f.type || "text"}" name="${f.key}" value="${escapeHtml(val)}" ${f.required ? "required" : ""}/></label>`;
    }).join("");

    overlay.innerHTML = `
      <div class="mh-modal">
        <div class="mh-modal-head">
          <h3>${row ? "Edit" : "Add"} ${tableName.replace(/_/g, " ")}</h3>
          <button class="mh-modal-close" type="button" aria-label="Close">&times;</button>
        </div>
        <form class="mh-modal-form">
          ${fieldsHtml}
          <div class="mh-modal-actions">
            <button type="button" class="mh-btn mh-btn-ghost mh-modal-cancel">Cancel</button>
            <button type="submit" class="mh-btn mh-btn-primary">${row ? "Save changes" : "Add"}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector(".mh-modal-close").addEventListener("click", close);
    overlay.querySelector(".mh-modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    overlay.querySelector(".mh-modal-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const payload = {};
      fields.forEach((f) => {
        if (f.parse) {
          payload[f.key] = f.parse(form.get(f.key));
        } else if (f.type === "checkbox") {
          payload[f.key] = form.get(f.key) === "on";
        } else if (f.type === "number") {
          const v = form.get(f.key);
          payload[f.key] = v === "" ? null : Number(v);
        } else {
          payload[f.key] = form.get(f.key) || null;
        }
      });
      await this.save(row ? row[idField] : null, payload);
      close();
    });
  }

  async save(id, payload) {
    const { tableName, idField } = this.config;
    if (id) {
      const { error } = await supabaseClient.from(tableName).update(payload).eq(idField, id);
      if (error) { toast(`Update failed: ${error.message}`, "error"); return; }
      await logAudit("update", tableName, id);
      toast("Saved changes.", "success");
    } else {
      const { data, error } = await supabaseClient.from(tableName).insert(payload).select().maybeSingle();
      if (error) { toast(`Add failed: ${error.message}`, "error"); return; }
      await logAudit("insert", tableName, data ? data[idField] : null);
      toast("Added.", "success");
    }
    await this.load();
  }

  async deleteRow(id) {
    if (!confirm("Delete this record? This can't be undone.")) return;
    const { tableName, idField } = this.config;
    const { error } = await supabaseClient.from(tableName).delete().eq(idField, id);
    if (error) { toast(`Delete failed: ${error.message}`, "error"); return; }
    await logAudit("delete", tableName, id);
    toast("Deleted.", "success");
    await this.load();
  }
}
