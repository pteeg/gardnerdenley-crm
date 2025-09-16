import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      const authStatus = sessionStorage.getItem('isAuthenticated');
      const loginTime = sessionStorage.getItem('loginTime');
      
      if (authStatus === 'true' && loginTime) {
        // Check if session is still valid (24 hours)
        const now = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - parseInt(loginTime) < sessionDuration) {
          setIsAuthenticated(true);
        } else {
          // Session expired, clear storage
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('loginTime');
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('loginTime');
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
