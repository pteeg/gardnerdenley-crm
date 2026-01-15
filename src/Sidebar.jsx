import React from "react";
import "./Sidebar.css";

function Sidebar({ title, items = [], footer = null, collapsed = false, onToggleCollapse }) {
  return (
    <aside className={`gd-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button 
        className="gd-sidebar-toggle"
        onClick={onToggleCollapse}
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style={{ width: '1.6em', height: '1.6em', fill: 'currentColor' }}>
          <path d="M64 192C64 156.7 92.7 128 128 128L512 128C547.3 128 576 156.7 576 192L576 448C576 483.3 547.3 512 512 512L128 512C92.7 512 64 483.3 64 448L64 192zM240 304C240 290.7 229.3 280 216 280L136 280C122.7 280 112 290.7 112 304C112 317.3 122.7 328 136 328L216 328C229.3 328 240 317.3 240 304zM240 392C240 378.7 229.3 368 216 368L136 368C122.7 368 112 378.7 112 392C112 405.3 122.7 416 136 416L216 416C229.3 416 240 405.3 240 392zM288 464L512 464C520.8 464 528 456.8 528 448L528 192C528 183.2 520.8 176 512 176L288 176L288 464zM240 216C240 202.7 229.3 192 216 192L136 192C122.7 192 112 202.7 112 216C112 229.3 122.7 240 136 240L216 240C229.3 240 240 229.3 240 216z"/>
        </svg>
      </button>
      {!collapsed && (
        <>
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
        </>
      )}
    </aside>
  );
}

export default Sidebar;


