import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/auth/logout', {
      method: 'GET',
      credentials: 'include',
    })
      .then(() => {
        // Optionally clear localStorage/sessionStorage here
        navigate('/');
      })
      .catch(() => {
        navigate('/');
      });
  }, [navigate]);

  return <div style={{textAlign:'center',marginTop:'40px'}}>Logging out...</div>;
};

export default Logout;
