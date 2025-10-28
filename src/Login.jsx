import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile } from "@fortawesome/free-regular-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import glassesSmiley from "./assets/glasses-smiley.jpg";
import "./Login.css";
import gdLogo from "./assets/new-gd-logo.jpg";
import { useAuth } from "./AuthContext";
import ResetPassword from "./ResetPassword";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
      setPassword("");
    }
    
    setIsLoading(false);
  };

  if (showResetPassword) {
    return <ResetPassword onBackToLogin={() => setShowResetPassword(false)} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={gdLogo} alt="Gardner Denley" className="login-logo" />
          <h1 className="login-title">CRM</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter email"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
          
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
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
          
          <div className="forgot-password-link">
            <button 
              type="button"
              className="forgot-password-button"
              onClick={() => setShowResetPassword(true)}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>
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
