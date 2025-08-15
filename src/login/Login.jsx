import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Local login handler
  const handleLocalLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8080/auth/login', {
        email,
        password,
      });
      console.log('Local login successful:', response.data);
      // You can store token or redirect here
    } catch (error) {
      console.error('Local login failed:', error.response?.data || error.message);
    }
  };

  // Google login handler
  const handleGoogleLogin = () => {
    const url = 'http://localhost:8080/auth/google';
    console.log('Redirecting to Google OAuth →', url);
    window.open(url, '_self');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
      <h2>Login</h2>

      {/* Local Login Form */}
      <form onSubmit={handleLocalLogin} style={{ marginBottom: '20px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Login with Email
        </button>
      </form>

      {/* Google Login Button */}
      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '16px',
          backgroundColor: '#4285F4',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;