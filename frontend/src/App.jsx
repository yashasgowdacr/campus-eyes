import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import { LogOut, UserCircle2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="container">
      <nav>
        <div className="flex items-center gap-4">
          {/* Logo Placeholder - The user will drop their T. JOHN logo here */}
          <img 
            src="/logo.png" 
            alt="T. John Logo" 
            style={{ height: '40px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none'; // hide if not found
            }}
          />
          <div className="text-2xl font-bold" style={{ lineHeight: '1.2' }}>
            <div>T John Institute of Technology</div>
            <div className="text-accent" style={{ fontSize: '1rem', fontWeight: 'normal' }}>Smart Complaint Prioritization System</div>
          </div>
        </div>
        
        {user && (
          <div className="nav-links flex items-center gap-6">
            <div 
              className="flex items-center gap-2 text-muted" 
              style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }}
              onClick={() => setShowProfile(true)}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {user.profile_pic ? (
                <img src={user.profile_pic} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
              ) : (
                <UserCircle2 size={32} color="var(--accent)" />
              )}
              <span style={{ fontSize: '1.1rem' }}><strong>{user.username}</strong></span>
              <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>{user.role}</span>
            </div>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </nav>

      <Routes>
        {/* If not logged in, redirect everything to Login */}
        {!user && (
          <Route path="*" element={<Login onLogin={setUser} />} />
        )}

        {/* If logged in, restrict routes based on role */}
        {user && user.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="*" element={<Navigate to="/admin" />} />
          </>
        )}

        {user && user.role === 'student' && (
          <>
            <Route path="/" element={<StudentDashboard user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>

      {showProfile && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onUpdate={(updatedUser) => setUser(updatedUser)} 
        />
      )}
    </div>
  );
}

export default App;
