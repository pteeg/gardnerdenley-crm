import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import "./StatusToggle.css";

const StatusToggle = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toggleRef = useRef(null);

  const options = ["Done", "Pending", "Not Done"];

  const handleOptionClick = (option, event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("StatusToggle: Changing from", value, "to", option);
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && toggleRef.current) {
      const updatePosition = () => {
        const rect = toggleRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popupHeight = 120; // Approximate height of popup
        const popupWidth = 120; // Popup width
        
        // Calculate absolute position accounting for scroll
        const absoluteTop = rect.top + window.scrollY;
        const absoluteLeft = rect.left + window.scrollX;
        
        // Check if popup would go off screen vertically
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        let top, left;
        
        if (spaceBelow >= popupHeight || spaceBelow > spaceAbove) {
          // Position below the button
          top = absoluteTop + rect.height + 4;
        } else {
          // Position above the button
          top = absoluteTop - popupHeight - 4;
        }
        
        // Center horizontally relative to the button
        left = absoluteLeft + (rect.width / 2) - (popupWidth / 2);
        
        // Ensure it stays within viewport bounds
        left = Math.max(10, Math.min(left, viewportWidth - popupWidth - 10));
        
        setPosition({ top, left });
      };

      // Update position immediately
      updatePosition();

      // Update position on scroll
      const handleScroll = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && toggleRef.current && !toggleRef.current.contains(event.target)) {
        // Check if the click is on a status popup option
        const isPopupClick = event.target.closest('.status-popup-portal');
        if (!isPopupClick) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      // Use a small delay to prevent immediate closing when clicking options
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
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
        {value || "Not Done"}
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
                onClick={(event) => {
                  console.log("StatusToggle: Clicked", option);
                  handleOptionClick(option, event);
                }}
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