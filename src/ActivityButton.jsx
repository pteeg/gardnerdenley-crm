import React, { useState, useRef, useEffect } from "react";

function ActivityButton({ onNoteClick, onLogOfferClick, onPhoneCallNoteClick }) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsRef = useRef(null);

  // Close Actions dropdown on outside click / Escape
  useEffect(() => {
    if (!showActionsMenu) return;
    const handleClickOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowActionsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showActionsMenu]);

  return (
    <div className="actions-area" ref={actionsRef}>
      <button
        type="button"
        className="actions-button"
        onClick={() => setShowActionsMenu((v) => !v)}
      >
        <span>+ Action</span>
      </button>
      {showActionsMenu && (
        <div className="actions-menu">
          <button 
            type="button" 
            onClick={() => {
              if (onNoteClick) onNoteClick();
              setShowActionsMenu(false);
            }}
          >
            Note
          </button>
          {onPhoneCallNoteClick && (
            <button
              type="button"
              onClick={() => {
                onPhoneCallNoteClick();
                setShowActionsMenu(false);
              }}
            >
              Phone Call
            </button>
          )}
          {onLogOfferClick && (
            <button 
              type="button" 
              onClick={() => {
                onLogOfferClick();
                setShowActionsMenu(false);
              }}
            >
              Log Offer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityButton;

