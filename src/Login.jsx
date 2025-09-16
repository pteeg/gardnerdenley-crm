import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile } from "@fortawesome/free-regular-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import glassesSmiley from "./assets/glasses-smiley.jpg";
import "./Login.css";
import gdLogo from "./assets/new-gd-logo.jpg";

function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simple password check - in production, this would be more secure
    const correctPassword = "Rubycocobabu2025";
    
    if (password === correctPassword) {
      // Store authentication in sessionStorage
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("loginTime", Date.now().toString());
      onLogin();
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={gdLogo} alt="Gardner Denley" className="login-logo" />
          <h1 className="login-title">CRM</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input password-input"
                placeholder="Enter password"
                required
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                title={showPassword ? "Hide" : "View"}
              >
                {showPassword ? (
                  <img src={glassesSmiley} alt="Hide" className="password-toggle-img" />
                ) : (
                  <FontAwesomeIcon icon={faFaceSmile} style={{ color: "#555555", fontSize: "18px" }} />
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        
        <div className="login-footer">
          <p className="footer-text">
            For access issues, contact The Tobe Meister
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
