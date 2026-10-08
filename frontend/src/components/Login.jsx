import React, { useState } from 'react';
import api from '../api';
import { User, Lock, LogIn, UserPlus } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/users/register' : '/api/users/login';
      const res = await api.post(endpoint, { username, password });
      
      const loggedUser = res.data;
      
      // Enforce strict separation
      if (isAdminMode && loggedUser.role !== 'admin') {
        setError('Access denied: Administrator privileges required.');
        setLoading(false);
        return;
      }
      
      if (!isAdminMode && loggedUser.role === 'admin') {
        setError('Please use the Administrator Login portal.');
        setLoading(false);
        return;
      }

      // on success, we get back the user object
      onLogin(loggedUser);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-2xl mb-6 text-center">
          {isRegistering ? 'Create Student Account' : (isAdminMode ? 'Administrator Sign In' : 'Student Sign In')}
        </h2>
        
        {error && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required 
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--muted)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required 
            />
          </div>

          <button type="submit" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {isRegistering ? <><UserPlus size={18} /> Create Account</> : <><LogIn size={18} /> Login</>}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          {!isAdminMode && (
            <>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                {isRegistering ? "Already have an account?" : "New student?"}
              </p>
              <button 
                type="button" 
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', marginBottom: '1rem' }}
              >
                {isRegistering ? "Back to Login" : "Create New Student"}
              </button>
            </>
          )}
          
          {!isRegistering && (
            <div style={{ marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setIsAdminMode(!isAdminMode); setError(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', textDecoration: 'underline', fontSize: '0.875rem' }}
              >
                {isAdminMode ? "Go to Student Login" : "Administrator Login"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
