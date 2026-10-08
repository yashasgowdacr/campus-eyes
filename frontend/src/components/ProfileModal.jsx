import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { X, Image as ImageIcon, UserCircle2 } from 'lucide-react';

export default function ProfileModal({ user, onClose, onUpdate }) {
  const [profileData, setProfileData] = useState({
    profile_pic: null,
    usn: '',
    semester: '',
    email: '',
    role: '',
    username: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/api/users/${user.username}/profile`);
        setProfileData({
          profile_pic: res.data.profile_pic || null,
          usn: res.data.usn || '',
          semester: res.data.semester || '',
          email: res.data.email || '',
          role: res.data.role,
          username: res.data.username
        });
      } catch (err) {
        console.error(err);
        setError('Failed to fetch profile details.');
      }
      setFetching(false);
    };
    fetchProfile();
  }, [user.username]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profile_pic: reader.result }));
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/users/${user.username}/profile`, {
        profile_pic: profileData.profile_pic,
        usn: profileData.usn,
        semester: profileData.semester,
        email: profileData.email
      });
      
      setSuccess('Profile updated successfully!');
      if (onUpdate) {
        onUpdate({ ...user, profile_pic: profileData.profile_pic });
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <h2 className="text-2xl" style={{ margin: 0 }}>Professional Dashboard</h2>
          <button onClick={onClose} style={{ background: 'transparent', padding: '4px', color: 'var(--text-muted)' }}><X size={24} /></button>
        </div>
        
        {fetching ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading profile...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileData.profile_pic ? (
                  <img src={profileData.profile_pic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserCircle2 size={64} color="var(--text-muted)" />
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} id="profile-upload" />
              <label htmlFor="profile-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.875rem' }}>
                <ImageIcon size={18} /> Update Logo / Picture
              </label>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input type="text" value={profileData.username} disabled style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label>Email ID</label>
              <input type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} placeholder="student@tjohncollege.com" />
            </div>

            {profileData.role === 'student' && (
              <div className="form-row">
                <div className="form-group">
                  <label>USN (Roll No)</label>
                  <input type="text" value={profileData.usn} onChange={(e) => setProfileData({...profileData, usn: e.target.value.toUpperCase()})} placeholder="1TJ23CS120" />
                  <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Format: 1TJ + Year + Branch + Roll</small>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input type="text" value={profileData.semester} onChange={(e) => setProfileData({...profileData, semester: e.target.value})} placeholder="e.g. 5th Sem" />
                </div>
              </div>
            )}

            {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
            {success && <div style={{ color: '#10b981', fontSize: '0.875rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{success}</div>}

            <button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
