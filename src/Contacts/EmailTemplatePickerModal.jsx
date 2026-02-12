import React, { useEffect, useState } from "react";
import "./EmailTemplatesPage.css";
import { subscribeToEmailTemplates } from "../lib/emailTemplatesApi";

function EmailTemplatePickerModal({ isOpen, recipient, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToEmailTemplates(setTemplates);
    return () => unsubscribe && unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  if (!isOpen || !recipient?.email) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  const handleOpenInMail = () => {
    const subject = selectedTemplate?.subject || "";
    const body = selectedTemplate?.body || "";

    const parts = [];
    if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
    if (body) parts.push(`body=${encodeURIComponent(body)}`);
    const query = parts.length ? `?${parts.join("&")}` : "";

    window.location.href = `mailto:${encodeURIComponent(
      recipient.email.trim()
    )}${query}`;
    onClose && onClose();
  };

  const displayName = recipient.name || recipient.email;

  return (
    <div
      className="email-templates-send-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="email-templates-send-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: "0.25rem" }}>
          Email {displayName}
        </h3>
        <p
          style={{
            margin: 0,
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            color: "#6b7280",
          }}
        >
          Choose a template or open a blank email draft.
        </p>
        {templates.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: "1rem" }}>
            No email templates yet. You can still open a blank email draft.
          </div>
        ) : (
          <ul className="templates-list" style={{ marginBottom: "0.75rem" }}>
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className={
                  tpl.id === selectedId
                    ? "templates-list-item active"
                    : "templates-list-item"
                }
                onClick={() => setSelectedId(tpl.id)}
              >
                <div className="templates-list-name">
                  {tpl.name || "Untitled"}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            type="button"
            className="btn-secondary small"
            style={{ marginRight: "0.5rem" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenInMail}
          >
            Open in Mail
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplatePickerModal;

