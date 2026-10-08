import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Image as ImageIcon, X, AlertTriangle, Clock, MapPin, User, CheckCircle, BarChart2, MessageSquare, Mic, MicOff, Copy } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';

export default function StudentDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'submit', 'my_complaints'
  const [points, setPoints] = useState(0);
  
  // Location state
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');

  // AI Live Suggestion
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [timeline, setTimeline] = useState({ logs: [], comments: [] });
  const [newComment, setNewComment] = useState('');

  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Image state
  const [imageData, setImageData] = useState(null);
  const [imageName, setImageName] = useState('');
  const fileInputRef = useRef(null);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/complaints');
      // Filter only this student's complaints
      setComplaints(res.data.filter(c => c.registered_by === user.username));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPoints = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${user.username}/points`);
      setPoints(res.data.points);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchPoints();
    const interval = setInterval(() => {
      fetchComplaints();
      fetchPoints();
    }, 30000);
    
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           setDescription(prev => prev + (prev ? ' ' : '') + finalTranscript);
           // Trigger AI on full sentence
           handleDescriptionText(description + ' ' + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (e) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => clearInterval(interval);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleDescriptionText = (text) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(async () => {
      if (text.length > 10) {
        try {
          const res = await axios.post('http://localhost:5000/api/analyze-complaint', { description: text });
          setAiSuggestion(res.data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setAiSuggestion(null);
      }
    }, 500); // 500ms debounce
  };

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setDescription(text);
    handleDescriptionText(text);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageData(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/complaints', { 
        title, 
        description,
        image_data: imageData,
        registered_by: user.username,
        location_block: block,
        location_floor: floor,
        location_room: room
      });
      setTitle('');
      setDescription('');
      setBlock('');
      setFloor('');
      setRoom('');
      clearImage();
      setAiSuggestion(null);
      alert('Complaint submitted successfully!');
      fetchComplaints();
      setActiveTab('my_complaints');
    } catch (err) {
      console.error(err);
      alert('Error submitting complaint');
    }
    setLoading(false);
  };

  const openComplaintDetail = async (c) => {
    setSelectedComplaint(c);
    try {
      const res = await axios.get(`http://localhost:5000/api/complaints/${c._id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/complaints/${selectedComplaint._id}/comments`, {
        message: newComment,
        user_id: user.username
      });
      setNewComment('');
      // Refresh timeline
      const res = await axios.get(`http://localhost:5000/api/complaints/${selectedComplaint._id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Stats
  const total = complaints.length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const escalated = complaints.filter(c => c.status === 'escalated').length;

  return (
    <div>
      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ background: activeTab === 'dashboard' ? 'var(--accent)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--muted)', border: activeTab === 'dashboard' ? 'none' : '1px solid rgba(255,255,255,0.1)' }}
          >
            Overview Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('submit')}
            style={{ background: activeTab === 'submit' ? 'var(--accent)' : 'transparent', color: activeTab === 'submit' ? '#fff' : 'var(--muted)', border: activeTab === 'submit' ? 'none' : '1px solid rgba(255,255,255,0.1)' }}
          >
            Submit a Complaint
          </button>
          <button 
            onClick={() => setActiveTab('my_complaints')}
            style={{ background: activeTab === 'my_complaints' ? 'var(--accent)' : 'transparent', color: activeTab === 'my_complaints' ? '#fff' : 'var(--muted)', border: activeTab === 'my_complaints' ? 'none' : '1px solid rgba(255,255,255,0.1)' }}
          >
            My History
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 'bold' }}>
           🏆 {points} Reputation Points
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <h2 className="text-xl mb-4">My Complaint Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info"><p>Total Filed</p><h3>{total}</h3></div>
              <div className="stat-icon-wrapper time"><BarChart2 size={24} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info"><p>In Progress</p><h3 style={{ color: '#3b82f6' }}>{inProgress}</h3></div>
              <div className="stat-icon-wrapper time"><Clock size={24} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info"><p>Resolved</p><h3 style={{ color: '#10b981' }}>{resolved}</h3></div>
              <div className="stat-icon-wrapper resolved"><CheckCircle size={24} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-info"><p>Escalated</p><h3 style={{ color: '#ef4444' }}>{escalated}</h3></div>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><AlertTriangle size={24} /></div>
            </div>
          </div>

          <h3 className="text-xl mt-8 mb-4">Recent Updates</h3>
          <div className="glass-card">
             {complaints.slice(0, 3).map(c => (
               <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                 <div>
                   <strong>{c.title}</strong>
                   <div className="text-muted" style={{ fontSize: '0.875rem' }}>Status: {c.status.replace('_', ' ')} • {new Date(c.updated_at).toLocaleDateString()}</div>
                 </div>
                 <button onClick={() => openComplaintDetail(c)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>View</button>
               </div>
             ))}
             {complaints.length === 0 && <p className="text-muted">No recent complaints.</p>}
          </div>
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="glass-card mb-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="text-xl mb-4">Submit a New Complaint</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Issue Title</label>
              <input type="text" placeholder="e.g., Leaking pipe in Bathroom" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Block/Building</label>
                <select value={block} onChange={(e) => setBlock(e.target.value)} required>
                  <option value="">Select Block</option>
                  <option value="Hostel A">Hostel A</option>
                  <option value="Hostel B">Hostel B</option>
                  <option value="Academic Block 1">Academic Block 1</option>
                  <option value="Library">Library</option>
                  <option value="Cafeteria">Cafeteria</option>
                </select>
              </div>
              <div className="form-group">
                <label>Floor</label>
                <input type="text" placeholder="e.g., Ground, 1st" value={floor} onChange={(e) => setFloor(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Room/Area</label>
                <input type="text" placeholder="e.g., 102, Main Hall" value={room} onChange={(e) => setRoom(e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <label>Description</label>
                 {recognitionRef.current && (
                   <button 
                     type="button" 
                     onClick={toggleListening} 
                     style={{ background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: isListening ? '#ef4444' : 'var(--text-muted)', border: 'none', padding: '4px 8px', display: 'flex', gap: '4px', alignItems: 'center' }}
                   >
                     {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
                     {isListening ? 'Listening...' : 'Voice Input'}
                   </button>
                 )}
              </div>
              <textarea 
                rows="5"
                placeholder="Describe the issue in detail..." 
                value={description}
                onChange={handleDescriptionChange}
                required
              ></textarea>
              
              {/* AI Live Suggestion Box */}
              {aiSuggestion && (
                <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>👁️ Campus-Eye AI:</strong> This looks like a <span className={`badge ${(aiSuggestion.priority || 'Low').toLowerCase()}`} style={{ scale: '0.8', margin: '0 4px' }}>{aiSuggestion.priority}</span> priority issue in <strong>{aiSuggestion.category}</strong>.
                    </div>
                    {aiSuggestion.confidence > 0 && (
                      <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {aiSuggestion.confidence}% Match
                      </span>
                    )}
                  </div>
                  {aiSuggestion.sentiment && (
                    <div style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      <span className="text-muted">Tone/Sentiment: </span>
                      <span style={{ color: aiSuggestion.sentiment === 'Urgent/Angry' ? '#ef4444' : aiSuggestion.sentiment === 'Frustrated' ? '#f59e0b' : '#38bdf8', fontWeight: 500 }}>
                        {aiSuggestion.sentiment}
                      </span>
                    </div>
                  )}
                  {aiSuggestion.keywords && aiSuggestion.keywords.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginBottom: '0.4rem' }}>
                      🔑 Keywords: {aiSuggestion.keywords.join(', ')}
                    </div>
                  )}
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.8rem' }}>Reason: {aiSuggestion.reason}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} style={{ display: 'none' }} id="image-upload" />
              <label htmlFor="image-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.875rem' }}>
                <ImageIcon size={18} /> Attach Image
              </label>
              
              {imageName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
                  <img src={imageData} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span>{imageName}</span>
                  <button type="button" onClick={clearImage} style={{ background: 'transparent', padding: '2px', border: 'none', color: '#ff6b6b' }}><X size={16} /></button>
                </div>
              )}
            </div>

            <button type="submit" className="flex items-center justify-center gap-4 mt-4" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Complaint'} <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'my_complaints' && (
        <div>
          <h2 className="text-xl mb-4">My History</h2>
          <div className="glass-card" style={{ padding: '0' }}>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Title & Location</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>SLA / Time Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => {
                  const deadline = new Date(c.sla_deadline);
                  const breached = isPast(deadline) && c.status !== 'resolved' && c.status !== 'rejected';
                  const timeLeftStr = (c.status === 'resolved' || c.status === 'rejected') 
                      ? 'Completed'
                      : (breached ? 'Overdue' : formatDistanceToNow(deadline, { addSuffix: true }));

                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{c.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={12} /> {c.location_block}, Fl: {c.location_floor}, Rm: {c.location_room}
                          {c.is_duplicate_of && <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}><Copy size={12}/> Grouped</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }} className={`badge ${c.status === 'resolved' ? 'low' : c.status === 'escalated' ? 'critical' : 'medium'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.875rem' }}>{c.assigned_to || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={breached ? 'sla-breach' : (c.status === 'resolved' ? 'sla-safe' : '')}>
                          {breached && <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                          {timeLeftStr}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => openComplaintDetail(c)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Details</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {complaints.length === 0 && <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No complaints found.</p>}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setSelectedComplaint(null); }}>
          <div className="modal-content">
            <div className="flex justify-between items-center mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <h2 className="text-2xl" style={{ margin: 0 }}>{selectedComplaint.title}</h2>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem' }}>
              {/* Left Column: Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <span className={`badge ${(selectedComplaint.ai_priority || 'Low').toLowerCase()}`}>{selectedComplaint.ai_priority || 'Low'} Priority</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{selectedComplaint.status.replace('_', ' ')}</span>
                </div>
                
                <h4 className="text-muted" style={{ marginBottom: '0.5rem' }}>Description</h4>
                <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                  {selectedComplaint.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <h4 className="text-muted" style={{ marginBottom: '0.5rem' }}>Location</h4>
                    <p>{selectedComplaint.location_block}, Fl: {selectedComplaint.location_floor}, Rm: {selectedComplaint.location_room}</p>
                  </div>
                  <div>
                    <h4 className="text-muted" style={{ marginBottom: '0.5rem' }}>Assigned To</h4>
                    <p>{selectedComplaint.assigned_to || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedComplaint.image_data && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 className="text-muted" style={{ marginBottom: '0.5rem' }}>Attachment</h4>
                    <img src={selectedComplaint.image_data} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                )}
              </div>

              {/* Right Column: Timeline & Chat */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 className="text-xl mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20}/> Timeline & Activity</h3>
                
                <div className="timeline" style={{ marginBottom: '2rem' }}>
                  {timeline.logs.map(log => (
                    <div key={log.id} className="timeline-item text-muted" style={{ fontSize: '0.875rem' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{log.action}</strong>
                      <div>by {log.performed_by} at {new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20}/> Discussion</h3>
                <div className="chat-box mb-4">
                  {timeline.comments.map(c => (
                    <div key={c.id} className={`chat-bubble ${c.user_id === user.username ? 'student' : 'admin'}`}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px', color: c.user_id === user.username ? 'var(--accent)' : '#10b981' }}>{c.user_id}</div>
                      <div>{c.message}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>{new Date(c.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))}
                  {timeline.comments.length === 0 && <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>No comments yet.</p>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ margin: 0 }} onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
                  <button onClick={submitComment}><Send size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
