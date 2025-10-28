import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import gdLogo from "./assets/new-gd-logo.jpg";
import "./Login.css";
import { useAuth } from "./AuthContext";

function ResetPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);

    const result = await resetPassword(email);
    
    if (result.success) {
      setIsSuccess(true);
      setMessage("Password reset email sent! Check your inbox and follow the instructions to reset your password.");
    } else {
      setMessage(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={gdLogo} alt="Gardner Denley" className="login-logo" />
          <h1 className="login-title">Reset Password</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email address"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
          
          {message && (
            <div className={`message ${isSuccess ? 'success-message' : 'error-message'}`}>
              {message}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? "Sending..." : "Send Reset Email"}
          </button>
        </form>
        
        <div className="login-footer">
          <button 
            type="button" 
            className="back-to-login-button"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '8px' }} />
            Back to Login
          </button>
          <p className="footer-text">
            For access issues, contact The Tobe Meister
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
