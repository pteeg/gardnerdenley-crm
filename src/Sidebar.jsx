import React from "react";
import "./Sidebar.css";

function Sidebar({ title, items = [], footer = null }) {
  return (
    <aside className="gd-sidebar">
      {title ? <div className="gd-sidebar-title">{title.toUpperCase()}</div> : null}
      <nav className="gd-sidebar-items">
        {items.map((item) => (
          <button
            key={item.key}
            className={`gd-sidebar-item ${item.active ? "active" : ""}`}
            onClick={item.onClick}
            type="button"
          >
            {item.icon ? <span className="gd-sidebar-icon">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {footer ? <div className="gd-sidebar-footer">{footer}</div> : null}
    </aside>
  );
}

export default Sidebar;


