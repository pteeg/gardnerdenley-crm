import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import {
  subscribeToEmailTemplates,
  createEmailTemplate,
  updateEmailTemplateById,
  deleteEmailTemplateById,
} from "../lib/emailTemplatesApi";
import "./EmailTemplatesPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

function EmailTemplatesPage({ clients = [], professionals = [] }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [initialForm, setInitialForm] = useState({ name: "", subject: "", body: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState(null);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToEmailTemplates(setTemplates);
    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      // When nothing is selected, keep form blank; whether we show it is
      // controlled by isCreatingNew.
      if (!isCreatingNew) {
        const empty = { name: "", subject: "", body: "" };
        setForm(empty);
        setInitialForm(empty);
      }
      return;
    }
    const tpl = templates.find((t) => t.id === selectedId);
    if (tpl) {
      setIsCreatingNew(false);
      const loaded = {
        name: tpl.name || "",
        subject: tpl.subject,
        body: tpl.body,
      };
      setForm(loaded);
      setInitialForm(loaded);
    }
  }, [selectedId, templates, isCreatingNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (selectedId) {
        await updateEmailTemplateById(selectedId, {
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
        });
      } else {
        const id = await createEmailTemplate({
          name: form.name.trim(),
          subject: form.subject,
          body: form.body,
          createdByEmail: user?.email || "",
        });
        setSelectedId(id);
        setIsCreatingNew(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    const empty = { name: "", subject: "", body: "" };
    setForm(empty);
    setInitialForm(empty);
    setIsCreatingNew(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    await deleteEmailTemplateById(selectedId);
    setSelectedId(null);
    const empty = { name: "", subject: "", body: "" };
    setForm(empty);
    setInitialForm(empty);
    setIsCreatingNew(false);
  };

  const isEditingExisting = !!selectedId;
  const isDirty =
    isEditingExisting &&
    (form.name !== initialForm.name ||
      form.subject !== initialForm.subject ||
      form.body !== initialForm.body);

  return (
    <div className="email-templates-page">
      <div className="email-templates-layout">
        <div className="email-templates-list">
          <div className="email-templates-list-header">
            <h2>Email Templates</h2>
            <button type="button" className="btn-primary" onClick={handleNew}>
              + New Template
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="empty-state">
              No templates yet. Create your first template on the right.
            </div>
          ) : (
            <ul className="templates-list">
              {templates.map((tpl) => (
                <li
                  key={tpl.id}
                  className={
                    tpl.id === selectedId
                      ? "templates-list-item active"
                      : "templates-list-item"
                  }
                  onClick={() => {
                    setSelectedId(tpl.id);
                    setIsCreatingNew(false);
                  }}
                >
                  <div className="templates-list-name">{tpl.name || "Untitled"}</div>
                  <button
                    type="button"
                    className="templates-send-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSendTemplateId(tpl.id);
                      setSelectedId(tpl.id);
                      setIsCreatingNew(false);
                      setSendError("");
                    }}
                  >
                    Send
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="email-templates-editor">
          {!selectedId && !isCreatingNew ? (
            <div className="email-templates-placeholder">
              Select a template from the left, or click + New Template to create one.
            </div>
          ) : (
          <form onSubmit={handleSave} className="template-form">
            <div className="form-row">
              <label>
                Template name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Offer Accepted – Next Steps"
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Subject
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Email subject line"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Body
                <textarea
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  placeholder="Write the email body here..."
                  rows={10}
                />
              </label>
            </div>

            <div className="form-actions">
              {selectedId && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                  aria-label="Delete template"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
              {!selectedId && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving || !form.name.trim()}
                >
                  Create template
                </button>
              )}
              {selectedId && isDirty && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving || !form.name.trim()}
                >
                  Save changes
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      </div>

      {sendTemplateId && (
        <div
          className="email-templates-send-modal-backdrop"
          onClick={() => {
            setSendTemplateId(null);
            setSelectedRecipientKey("");
            setSendError("");
          }}
        >
          <div
            className="email-templates-send-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="email-templates-send-panel">
              <div className="send-row">
                <label>
                  Recipient
                  <select
                    value={selectedRecipientKey}
                    onChange={(e) => {
                      setSelectedRecipientKey(e.target.value);
                      setSendError("");
                    }}
                  >
                    <option value="">Select a contact…</option>
                    {clients.length > 0 && (
                      <optgroup label="Clients">
                        {clients.map((client) => (
                          <option
                            key={`client:${client.id || client.name}`}
                            value={`client:${client.id || client.name}`}
                          >
                            {client.name || "Unnamed client"}
                            {client.email ? ` (${client.email})` : " (no email)"}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {professionals.length > 0 && (
                      <optgroup label="Professionals">
                        {professionals.map((pro) => (
                          <option
                            key={`professional:${pro.id || pro.name}`}
                            value={`professional:${pro.id || pro.name}`}
                          >
                            {pro.name || "Unnamed professional"}
                            {pro.email ? ` (${pro.email})` : " (no email)"}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary small"
                  onClick={() => {
                    if (!sendTemplateId) return;
                    if (!selectedRecipientKey) {
                      setSendError("Please choose a contact before sending.");
                      return;
                    }
                    const [kind, key] = selectedRecipientKey.split(":");
                    let recipient = null;
                    if (kind === "client") {
                      recipient =
                        clients.find((c) => String(c.id || c.name) === key) || null;
                    } else if (kind === "professional") {
                      recipient =
                        professionals.find((p) => String(p.id || p.name) === key) ||
                        null;
                    }
                    if (!recipient) {
                      setSendError("Could not find the selected contact.");
                      return;
                    }
                    if (!recipient.email) {
                      setSendError(
                        "Selected contact does not have an email address saved."
                      );
                      return;
                    }
                    const tpl = templates.find((t) => t.id === sendTemplateId);
                    if (!tpl) {
                      setSendError("Could not find the selected template.");
                      return;
                    }
                    const subject = tpl.subject || "";
                    const body = tpl.body || "";
                    if (!subject && !body) {
                      setSendError(
                        "This template has no subject or body to send yet."
                      );
                      return;
                    }
                    const parts = [];
                    if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
                    if (body) parts.push(`body=${encodeURIComponent(body)}`);
                    const query = parts.length ? `?${parts.join("&")}` : "";
                    window.location.href = `mailto:${encodeURIComponent(
                      recipient.email.trim()
                    )}${query}`;
                    // Close popup after opening mail client
                    setSendTemplateId(null);
                    setSelectedRecipientKey("");
                    setSendError("");
                  }}
                >
                  Open in Mail
                </button>
              </div>
              {sendError && <div className="send-error">{sendError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailTemplatesPage;

