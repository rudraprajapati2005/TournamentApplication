import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Logout = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        const response = await fetch('http://localhost:8080/auth/logout', {
          method: 'GET',
          credentials: 'include',
        });

        // Consider any 2xx as success; otherwise parse and show a single console error
        if (response.ok) {
          try {
            const data = await response.json();
            if (!data?.success) {
              console.warn('Logout response without success flag. Proceeding.');
            }
          } catch(_) {
            // ignore JSON errors; proceed with logout
          }
          setUser(null);
          navigate('/login');
        } else {
          let message = 'Logout failed. Please try again.';
          try {
            const data = await response.json();
            message = data?.message || message;
          } catch(_) {}
          console.error('Logout failed:', message);
          alert(message);
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Network error during logout. Please try again.');
      }
    };

    handleLogout();
  }, [navigate, setUser]);

  return <div style={{textAlign:'center',marginTop:'40px'}}>Logging out...</div>;
};

export default Logout;
