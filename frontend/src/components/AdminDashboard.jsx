import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDistanceToNow, isPast } from 'date-fns';
import { 
  AlertTriangle, BarChart2, AlertCircle, CheckCircle, Clock, MapPin, Search, Filter, 
  MessageSquare, X, User, Send, Radio, ShieldAlert, Zap, Flame, Activity, ChevronRight, Layers, RefreshCw 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ProfileModal from './ProfileModal';

export default function AdminDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all'); // '7', '30', '90', 'all'
  
  // Advanced Filters
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal & Override
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [timeline, setTimeline] = useState({ logs: [], comments: [] });
  const [newComment, setNewComment] = useState('');
  const [overridePriority, setOverridePriority] = useState('');

  const [studentProfileUser, setStudentProfileUser] = useState(null);

  // Heatmap & Radar State
  const [heatmapMode, setHeatmapMode] = useState('matrix'); // 'matrix' or 'chart'
  const [selectedBlockFilter, setSelectedBlockFilter] = useState('all');

  // SLA Urgency & Telemetry Calculator
  const getSlaUrgency = (deadline) => {
    const d = new Date(deadline);
    const now = new Date();
    const diffMs = d - now;
    const isExpired = diffMs <= 0;
    
    if (isExpired) {
      return {
        status: 'BREACHED',
        tag: 'CRITICAL ESCALATED',
        timeText: `Breached ${formatDistanceToNow(d, { addSuffix: true })}`,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        pulse: true
      };
    } else if (diffMs < 3 * 60 * 60 * 1000) {
      const mins = Math.max(1, Math.round(diffMs / 60000));
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      const text = hours > 0 ? `${hours}h ${remMins}m remaining` : `${mins}m remaining`;
      return {
        status: 'IMMINENT',
        tag: 'IMMINENT RISK',
        timeText: text,
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.15)',
        border: 'rgba(249, 115, 22, 0.4)',
        pulse: true
      };
    } else {
      return {
        status: 'ON_TRACK',
        tag: 'ON TRACK',
        timeText: `${formatDistanceToNow(d, { addSuffix: true })} remaining`,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.12)',
        border: 'rgba(56, 189, 248, 0.3)',
        pulse: false
      };
    }
  };

  // NLP Model Management State
  const [showNlpModal, setShowNlpModal] = useState(false);
  const [nlpStats, setNlpStats] = useState(null);
  const [customTrainText, setCustomTrainText] = useState('');
  const [customTrainCategory, setCustomTrainCategory] = useState('Network');
  const [customTrainPriority, setCustomTrainPriority] = useState('High');
  const [trainStatusMsg, setTrainStatusMsg] = useState('');

  const fetchNlpStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/nlp/stats');
      setNlpStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrainSubmit = async (e) => {
    e.preventDefault();
    if (!customTrainText.trim()) return;
    try {
      const res = await axios.post('http://localhost:5000/api/nlp/train', {
        text: customTrainText.trim(),
        category: customTrainCategory,
        priority: customTrainPriority
      });
      setTrainStatusMsg(`✅ Success! Trained on sample #${res.data.stats.totalTrainingSamples}`);
      setCustomTrainText('');
      setNlpStats(res.data.stats);
      setTimeout(() => setTrainStatusMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setTrainStatusMsg('❌ Failed to train sample');
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchStaff();
    const interval = setInterval(fetchComplaints, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/complaints/${id}`, { status: newStatus, user_id: 'admin' });
      fetchComplaints();
      if (selectedComplaint && selectedComplaint._id === id) {
        setSelectedComplaint({...selectedComplaint, status: newStatus});
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleAssign = async (id, staffName) => {
    try {
      await axios.patch(`http://localhost:5000/api/complaints/${id}`, { assigned_to: staffName, user_id: 'admin' });
      fetchComplaints();
      if (selectedComplaint && selectedComplaint._id === id) {
        setSelectedComplaint({...selectedComplaint, assigned_to: staffName});
      }
    } catch (err) {
      console.error(err);
      alert('Failed to assign staff');
    }
  };

  const openComplaintDetail = async (c) => {
    setSelectedComplaint(c);
    setOverridePriority(''); // reset
    try {
      const res = await axios.get(`http://localhost:5000/api/complaints/${c._id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverride = async () => {
    if (!overridePriority || overridePriority === selectedComplaint.ai_priority) return;
    try {
      await axios.post(`http://localhost:5000/api/complaints/${selectedComplaint._id}/override`, {
        new_priority: overridePriority,
        admin_user: user?.username || 'Admin'
      });
      fetchComplaints();
      setSelectedComplaint({...selectedComplaint, admin_priority: overridePriority, ai_priority: overridePriority});
      
      const res = await axios.get(`http://localhost:5000/api/complaints/${selectedComplaint._id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to override priority');
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Block', 'Assigned To', 'SLA Deadline'];
    const rows = filtered.map(c => [
      c._id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      c.admin_priority || c.ai_priority,
      c.status,
      c.location_block || 'N/A',
      c.assigned_to || 'Unassigned',
      new Date(c.sla_deadline).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/complaints/${selectedComplaint._id}/comments`, {
        message: newComment,
        user_id: 'Admin'
      });
      setNewComment('');
      const res = await axios.get(`http://localhost:5000/api/complaints/${selectedComplaint._id}/timeline`);
      setTimeline(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter complaints based on criteria
  let filtered = complaints;
  if (filterPriority !== 'all') filtered = filtered.filter(c => c.ai_priority === filterPriority);
  if (filterStatus !== 'all') filtered = filtered.filter(c => c.status === filterStatus);
  if (filterCategory !== 'all') filtered = filtered.filter(c => c.category === filterCategory);
  if (selectedBlockFilter !== 'all') filtered = filtered.filter(c => c.location_block === selectedBlockFilter);

  // Statistics
  const totalComplaints = filtered.length;
  const activeComplaints = filtered.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length;
  const resolvedCount = filtered.filter(c => c.status === 'resolved').length;
  const escalatedCount = filtered.filter(c => c.status === 'escalated').length;

  // Chart Data
  const categoryData = {};
  const blockData = {};
  filtered.forEach(c => {
    categoryData[c.category] = (categoryData[c.category] || 0) + 1;
    if (c.location_block) {
      blockData[c.location_block] = (blockData[c.location_block] || 0) + 1;
    }
  });
  const pieData = Object.keys(categoryData).map(k => ({ name: k, value: categoryData[k] }));
  const barData = Object.keys(blockData).map(k => ({ name: k, complaints: blockData[k] })).sort((a,b) => b.complaints - a.complaints);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Smart Recommendations (Top 3 open complaints by urgency)
  const recommendations = [...complaints]
    .filter(c => c.status === 'open' || c.status === 'in_progress')
    .sort((a, b) => new Date(a.sla_deadline) - new Date(b.sla_deadline))
    .slice(0, 3);

  return (
    <div>
      <div className="dashboard-header-container">
        <div>
          <h2 className="text-2xl" style={{ margin: 0 }}>Command Center</h2>
          <div className="text-muted" style={{ fontSize: '1rem', marginTop: '4px' }}>Campus Operations & Maintenance</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => { setShowNlpModal(true); fetchNlpStats(); }} 
            style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🧠 NLP Dataset & AI Stats
          </button>
          <button onClick={exportCSV} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info"><p>Total Complaints</p><h3>{totalComplaints}</h3></div>
          <div className="stat-icon-wrapper total"><BarChart2 size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>Active</p><h3 style={{ color: '#f59e0b' }}>{activeComplaints}</h3></div>
          <div className="stat-icon-wrapper active"><AlertCircle size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>Resolved</p><h3 style={{ color: '#10b981' }}>{resolvedCount}</h3></div>
          <div className="stat-icon-wrapper resolved"><CheckCircle size={24} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p>SLA Breached / Escalated</p><h3 style={{ color: '#ef4444' }}>{escalatedCount}</h3></div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><AlertTriangle size={24} /></div>
        </div>
      </div>

      {/* Analytical Visualizers & Radar Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1.35fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Card 1: Complaints by Category */}
        <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-xl" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#3b82f6" /> Category Spread
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {pieData.length} Active Domains
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem', maxHeight: '55px', overflowY: 'auto' }} className="custom-scrollbar">
            {pieData.map((p, i) => (
              <span key={p.name} style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length] }}></span>
                {p.name}: <strong style={{ color: '#fff' }}>{p.value}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Problem Heatmap (Non-overlapping & Dual View) */}
        <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 className="text-xl" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} color="#ef4444" /> Zone Heatmap
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {barData.length} Campus Zones Monitored
              </div>
            </div>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setHeatmapMode('matrix')}
                style={{
                  padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px', border: 'none',
                  background: heatmapMode === 'matrix' ? 'var(--accent)' : 'transparent',
                  color: heatmapMode === 'matrix' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                🔥 Density Grid
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('chart')}
                style={{
                  padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px', border: 'none',
                  background: heatmapMode === 'chart' ? 'var(--accent)' : 'transparent',
                  color: heatmapMode === 'chart' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                📊 Top Hotspots
              </button>
            </div>
          </div>

          {/* Mode 1: Cybernetic Density Matrix (Zero Label Overlap, 100% Readable) */}
          {heatmapMode === 'matrix' ? (
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
              {barData.map(b => {
                const maxCount = Math.max(...barData.map(x => x.complaints), 1);
                const pct = Math.round((b.complaints / maxCount) * 100);
                const isSelected = selectedBlockFilter === b.name;

                return (
                  <div 
                    key={b.name}
                    onClick={() => setSelectedBlockFilter(isSelected ? 'all' : b.name)}
                    style={{
                      background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to filter complaints by this zone"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                        {b.name}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                        background: b.complaints >= 3 ? 'rgba(239, 68, 68, 0.2)' : b.complaints >= 2 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                        color: b.complaints >= 3 ? '#ef4444' : b.complaints >= 2 ? '#f97316' : '#38bdf8',
                        border: `1px solid ${b.complaints >= 3 ? 'rgba(239, 68, 68, 0.4)' : b.complaints >= 2 ? 'rgba(249, 115, 22, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                      }}>
                        {b.complaints} {b.complaints === 1 ? 'ticket' : 'tickets'} {b.complaints >= 3 ? '• HIGH' : b.complaints >= 2 ? '• MED' : '• LOW'}
                      </span>
                    </div>
                    {/* Glowing Progress Track */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.07)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: b.complaints >= 3 
                          ? 'linear-gradient(90deg, #f97316, #ef4444)' 
                          : b.complaints >= 2 
                          ? 'linear-gradient(90deg, #eab308, #f97316)' 
                          : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                        boxShadow: b.complaints >= 3 ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
              {barData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No zone data recorded yet.
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Clean Top 5 Hotspots Bar Chart with Zero Clipping */
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="heatGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="60%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" allowDecimals={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="var(--text-muted)" 
                    width={115}
                    tickLine={false}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const text = payload.value.length > 14 ? payload.value.slice(0, 13) + '…' : payload.value;
                      return (
                        <text x={x} y={y} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={11} fontWeight={500}>
                          {text}
                        </text>
                      );
                    }}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem' }}
                    formatter={(val) => [`${val} complaints`, 'Total Issues']}
                  />
                  <Bar dataKey="complaints" fill="url(#heatGradient)" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Card 3: AI Urgent Dispatch Radar (Professional High-Tech HUD) */}
        <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          
          {/* Header with Live Telemetry Beacon */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="radar-beacon"></span>
                <h3 className="text-xl" style={{ margin: 0, fontWeight: 700 }}>Urgent Dispatch Radar</h3>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.5px' }}>
                AI TRIAGE & REAL-TIME SLA TELEMETRY
              </div>
            </div>
            <span style={{
              background: recommendations.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: recommendations.length > 0 ? '#f87171' : '#34d399',
              border: `1px solid ${recommendations.length > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              {recommendations.length} CRITICAL SIGNALS
            </span>
          </div>

          {/* Telemetry Status Ribbon */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="green-beacon"></span>
              <span style={{ color: '#94a3b8' }}>AUTOPILOT:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>MONITORING</span>
            </div>
            <div style={{ color: '#cbd5e1', fontWeight: 500 }}>
              SLA RISK: <span style={{ color: recommendations.length > 0 ? '#f97316' : '#10b981' }}>{recommendations.length > 0 ? 'ELEVATED' : 'NOMINAL'}</span>
            </div>
          </div>

          {/* Recommendation Ticket Cards */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '4px' }} className="custom-scrollbar">
            {recommendations.map(r => {
              const sla = getSlaUrgency(r.sla_deadline);

              return (
                <div 
                  key={r._id} 
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderLeft: `3px solid ${sla.color}`,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Metadata Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        [{r.category?.toUpperCase() || 'GENERAL'}]
                      </span>
                      <span style={{
                        background: sla.bg,
                        color: sla.color,
                        border: `1px solid ${sla.border}`,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        {r.admin_priority || r.ai_priority || 'HIGH'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: sla.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {sla.timeText}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', margin: '4px 0 6px 0', lineHeight: 1.3 }}>
                    {r.title}
                  </div>

                  {/* Location & Reporter Telemetry */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} color="#38bdf8" /> {r.location_block || 'Campus Zone'} {r.location_room ? `• ${r.location_room}` : ''}
                    </span>
                    <span>
                      Rep: <strong style={{ color: '#e2e8f0' }}>{r.registered_by || 'Anonymous'}</strong>
                    </span>
                  </div>

                  {/* Triage & Dispatch Action Button */}
                  <button 
                    onClick={() => openComplaintDetail(r)} 
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Zap size={13} color="#60a5fa" /> Triage & Dispatch Incident <ChevronRight size={13} />
                  </button>
                </div>
              );
            })}

            {recommendations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#10b981' }}>
                <CheckCircle size={36} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>All Clear • Nominal State</div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Zero imminent SLA breaches detected.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><Filter size={18}/> Filters:</div>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ margin: 0, padding: '0.5rem', width: 'auto' }}>
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ margin: 0, padding: '0.5rem', width: 'auto' }}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ margin: 0, padding: '0.5rem', width: 'auto' }}>
            <option value="all">All Categories</option>
            <option value="Emergency">Emergency</option>
            <option value="Electrical">Electrical</option>
            <option value="Network">Network</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Academic">Academic</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="Hostel">Hostel & Mess</option>
            <option value="Security">Security & Infra</option>
            <option value="Other">Other</option>
          </select>

          {/* Selected Zone Filter Indicator */}
          {selectedBlockFilter !== 'all' && (
            <button
              onClick={() => setSelectedBlockFilter('all')}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid #3b82f6',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapPin size={13} /> Zone: {selectedBlockFilter} <X size={13} />
            </button>
          )}
        </div>

        <table style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Issue & Location</th>
              <th>AI Priority & Risk</th>
              <th>Status</th>
              <th>Assign To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const deadline = new Date(c.sla_deadline);
              const breached = isPast(deadline) && c.status !== 'resolved' && c.status !== 'rejected';
              // 2 hours before breach is warning
              const warning = !breached && (deadline.getTime() - Date.now() < 2 * 60 * 60 * 1000) && c.status !== 'resolved';
              
              const timeLeftStr = (c.status === 'resolved' || c.status === 'rejected') 
                  ? 'Resolved' : (breached ? 'Overdue' : formatDistanceToNow(deadline, { addSuffix: true }));

              return (
                <tr key={c._id}>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{c.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {c.location_block || 'N/A'}, Fl: {c.location_floor || 'N/A'}, Rm: {c.location_room || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className={`badge ${(c.ai_priority || 'Low').toLowerCase()}`} style={{ alignSelf: 'flex-start' }}>{c.ai_priority || 'Low'}</span>
                      <span className={breached ? 'sla-breach' : (warning ? 'sla-warning' : 'sla-safe')} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {timeLeftStr}
                      </span>
                    </div>
                  </td>
                  <td>
                    <select 
                      value={c.status} 
                      onChange={(e) => handleStatusChange(c._id, e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '6px', fontSize: '0.875rem', width: '130px', margin: 0 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="escalated">Escalated</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      value={c.assigned_to || ''} 
                      onChange={(e) => handleAssign(c._id, e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '6px', fontSize: '0.875rem', width: '130px', margin: 0, border: c.assigned_to ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)' }}
                    >
                      <option value="">Unassigned</option>
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.username}>{staff.username}</option>
                      ))}
                      <option value="Maintenance Team A">Team A</option>
                      <option value="IT Support">IT Support</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => openComplaintDetail(c)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>Details</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-muted mt-4 text-center">No complaints match your filters.</p>}
      </div>

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
                
                {/* AI Insight Box */}
                <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    🤖 AI Assessment & Overrides
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className={`badge ${(selectedComplaint.ai_priority || 'Low').toLowerCase()}`} style={{ scale: '0.8', margin: 0 }}>{selectedComplaint.ai_priority || 'Low'} Priority</span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', scale: '0.8', margin: 0 }}>{selectedComplaint.category}</span>
                    {selectedComplaint.sentiment === 'Urgent/Angry' && <span className="badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', scale: '0.8', margin: 0 }}>High Urgency</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Reason: {selectedComplaint.ai_reason || 'Manual entry or legacy data.'}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.875rem' }}>Override Priority:</span>
                    <select value={overridePriority} onChange={(e) => setOverridePriority(e.target.value)} style={{ padding: '0.3rem', width: 'auto', margin: 0, fontSize: '0.875rem' }}>
                      <option value="">Select...</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <button onClick={handleOverride} style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }}>Apply Override</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Overrides train the AI for future predictions.</p>
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
                    <h4 className="text-muted" style={{ marginBottom: '0.5rem' }}>Reporter</h4>
                    <p 
                      style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline' }} 
                      onClick={() => setStudentProfileUser({ username: selectedComplaint.registered_by })}
                    >
                      {selectedComplaint.registered_by}
                    </p>
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

                <h3 className="text-xl mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={20}/> Communication</h3>
                <div className="chat-box mb-4">
                  {timeline.comments.map(c => (
                    <div key={c.id} className={`chat-bubble ${c.user_id !== 'Admin' ? 'student' : 'admin'}`}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px', color: c.user_id !== 'Admin' ? 'var(--accent)' : '#10b981' }}>{c.user_id}</div>
                      <div>{c.message}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.7 }}>{new Date(c.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))}
                  {timeline.comments.length === 0 && <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>No communication yet.</p>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Message reporter..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ margin: 0 }} onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
                  <button onClick={submitComment}><Send size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {studentProfileUser && (
        <ProfileModal 
          user={studentProfileUser} 
          onClose={() => setStudentProfileUser(null)} 
        />
      )}

      {/* NLP Dataset & Model Training Modal */}
      {showNlpModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card" style={{ maxWidth: '650px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                <div>
                  <h3 className="text-xl" style={{ margin: 0 }}>Natural Language Processing (NLP) Engine</h3>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>100% Free, Offline, Zero-Cost Cloud Ready</div>
                </div>
              </div>
              <button onClick={() => setShowNlpModal(false)} style={{ background: 'transparent', padding: '4px', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {nlpStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Training Samples</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{nlpStats.totalTrainingSamples}+</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Domain Categories</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>{nlpStats.supportedCategories?.length || 8}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Model Status</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>Active / Ready</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>Loading NLP stats...</div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#93c5fd' }}>🔬 Architecture & Classification Stack:</div>
              <div className="text-muted">
                • <strong>Algorithm:</strong> Multinomial Naive Bayes + Porter Stemmer Tokenization.<br />
                • <strong>Sentiment & Urgency:</strong> Heuristic Lexicon intensity scoring (detects anger, exams, and threats).<br />
                • <strong>Impact & Explainability:</strong> Dynamic keyword attribution and SLA auto-escalation.
              </div>
            </div>

            {/* Feed New Training Sample */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📥</span> Feed Training Sample into NLP Model
              </h4>
              <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                Teach the AI new campus complaint phrasing to continuously improve its accuracy.
              </p>

              <form onSubmit={handleTrainSubmit}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Sample Complaint Text:</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Tube light in physics lab 2 is blinking loudly and giving headache" 
                    value={customTrainText} 
                    onChange={(e) => setCustomTrainText(e.target.value)} 
                    style={{ margin: 0, width: '100%' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Target Category:</label>
                    <select 
                      value={customTrainCategory} 
                      onChange={(e) => setCustomTrainCategory(e.target.value)}
                      style={{ margin: 0, width: '100%' }}
                    >
                      <option value="Emergency">Emergency</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Network">Network</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Academic">Academic</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Hostel">Hostel & Mess</option>
                      <option value="Security">Security & Infra</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Target Priority:</label>
                    <select 
                      value={customTrainPriority} 
                      onChange={(e) => setCustomTrainPriority(e.target.value)}
                      style={{ margin: 0, width: '100%' }}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="submit" style={{ background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>
                    ⚡ Train Model Now
                  </button>
                  {trainStatusMsg && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: trainStatusMsg.startsWith('✅') ? '#34d399' : '#ef4444' }}>
                      {trainStatusMsg}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
