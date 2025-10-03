import React from "react";
import "./Sidebar.css";

function Sidebar({ title, items = [], footer = null }) {
  return (
    <aside className="gd-sidebar">
      {title ? <div className="gd-sidebar-title">{title}</div> : null}
      <nav className="gd-sidebar-items">
        {items.map((item) => {
          const isSubsection =
            item &&
            item.label &&
            typeof item.label === 'object' &&
            item.label.props &&
            typeof item.label.props.className === 'string' &&
            item.label.props.className.includes('gd-sidebar-subsection');

          if (isSubsection) {
            return (
              <div key={item.key}>
                {item.label}
              </div>
            );
          }

          return (
            <button
              key={item.key}
              className={`gd-sidebar-item ${item.active ? "active" : ""}`}
              onClick={item.onClick}
              type="button"
            >
              {item.icon ? <span className="gd-sidebar-icon">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {footer ? <div className="gd-sidebar-footer">{footer}</div> : null}
    </aside>
  );
}

export default Sidebar;


