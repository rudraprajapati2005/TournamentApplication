import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/auth/login/success', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkRoleSwitchEligibility = async () => {
    try {
      const response = await fetch('http://localhost:8080/role/can-switch-role', {
        method: 'GET',
        credentials: 'include',
      });
      return await response.json();
    } catch (error) {
      console.error('Role check failed:', error);
      return { success: false, message: 'Failed to check role eligibility' };
    }
  };

  const switchUserRole = async () => {
    try {
      const response = await fetch('http://localhost:8080/role/switch-role', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        await checkAuthStatus(); // Refresh user data after role switch
      }
      return data;
    } catch (error) {
      console.error('Role switch failed:', error);
      return { success: false, message: 'Failed to switch role' };
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const value = {
    user,
    setUser,
    loading,
    checkAuthStatus,
    checkRoleSwitchEligibility,
    switchUserRole,
    refreshTrigger,
    triggerRefresh
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
