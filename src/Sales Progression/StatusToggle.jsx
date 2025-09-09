import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import "./StatusToggle.css";

const StatusToggle = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toggleRef = useRef(null);

  const options = ["Done", "Pending", "Not Done"];

  const handleOptionClick = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4, // just below toggle
        left: rect.left + rect.width / 2, // horizontally centred
      });
    }
  }, [isOpen]);

  return (
    <>
      <div
        ref={toggleRef}
        className={`status-toggle ${
          value === "Done"
            ? "done"
            : value === "Pending"
            ? "pending"
            : "not-done"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {value || "Pending"}
      </div>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            className="status-popup-portal"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: "translateX(-50%)",
              position: "absolute",
              zIndex: 9999,
            }}
          >
            {options.map((option) => (
              <div
                key={option}
                className="status-popup-option"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default StatusToggle;