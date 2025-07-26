// src/Header.jsx
import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="crm-header">
      <nav className="crm-nav">
        <div className="tab active">Contacts</div>
        <div className="tab">Properties</div>
        <div className="tab">Sales Progression</div>
        <div className="tab">Wonga Report</div>
      </nav>
    </header>
  );
};

export default Header;