const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const crypto = require('crypto');
const { initDB, getPool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Helper: Get SLA limit in ms
function getSLA(priority) {
  switch(priority) {
    case "Critical": return 2 * 60 * 60 * 1000; // 2 hours
    case "High": return 6 * 60 * 60 * 1000; // 6 hours
    case "Medium": return 24 * 60 * 60 * 1000; // 24 hours
    case "Low": return 48 * 60 * 60 * 1000; // 48 hours
    default: return 48 * 60 * 60 * 1000;
  }
}

const nlpEngine = require('./nlp/nlpEngine');

// NLP Engine status & stats endpoint
app.get('/api/nlp/stats', (req, res) => {
  res.json(nlpEngine.getStats());
});

// Admin training endpoint to feed custom complaints to NLP model
app.post('/api/nlp/train', (req, res) => {
  try {
    const { text, category, priority } = req.body;
    if (!text || !category) {
      return res.status(400).json({ error: 'Text and category are required to train the NLP model' });
    }
    nlpEngine.learnFromFeedback(text, category, priority);
    res.json({
      success: true,
      message: 'Model trained successfully on new sample',
      stats: nlpEngine.getStats()
    });
  } catch (err) {
    console.error('NLP Training error:', err);
    res.status(500).json({ error: 'Failed to train NLP model' });
  }
});

// User API Routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });

    const id = crypto.randomUUID();
    await pool.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', [id, username, password, 'student']);
    
    res.status(201).json({ id, username, role: 'student' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    res.status(200).json({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      profile_pic: user.profile_pic,
      usn: user.usn,
      semester: user.semester,
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/users/:username/points', async (req, res) => {
  try {
    const { username } = req.params;
    const pool = getPool();
    const [users] = await pool.query('SELECT points FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ points: users[0].points || 0 });
  } catch (error) {
    console.error('Points fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

app.get('/api/users/:username/profile', async (req, res) => {
  try {
    const { username } = req.params;
    const pool = getPool();
    const [users] = await pool.query('SELECT username, role, profile_pic, usn, semester, email, points FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(users[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/users/:username/profile', async (req, res) => {
  try {
    const { username } = req.params;
    const { profile_pic, usn, semester, email } = req.body;
    
    // USN Validation: 1TJ23CS120 format (1 digit, TJ, 2 digits, 2 letters, 3 digits)
    if (usn) {
      const usnRegex = /^[1-9]TJ\d{2}[A-Z]{2}\d{3}$/i;
      if (!usnRegex.test(usn)) {
        return res.status(400).json({ error: 'Invalid USN format. Example: 1TJ23CS120' });
      }
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      'UPDATE users SET profile_pic = ?, usn = ?, semester = ?, email = ? WHERE username = ?',
      [profile_pic || existing[0].profile_pic, usn || existing[0].usn, semester || existing[0].semester, email || existing[0].email, username]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Live AI Analysis Endpoint
app.post('/api/analyze-complaint', (req, res) => {
  const { description } = req.body;
  if (!description) return res.json({ priority: 'Low', category: 'Other', reason: 'No description provided.', confidence: 0 });
  const result = nlpEngine.classifyComplaint(description);
  res.json(result);
});

// Helper: Cosine Similarity Mock (Jaccard on words)
function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(/\W+/));
  const set2 = new Set(str2.toLowerCase().split(/\W+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Complaint API Routes
app.post('/api/complaints', async (req, res) => {
  try {
    const { title, description, image_data, registered_by, location_block, location_floor, location_room } = req.body;
    
    if (image_data) {
      const isSafe = image_data.startsWith('data:image/jpeg') || 
                     image_data.startsWith('data:image/png') || 
                     image_data.startsWith('data:image/gif') || 
                     image_data.startsWith('data:image/webp');
      if (!isSafe) {
        return res.status(400).json({ error: 'Invalid image format. Only safe image types (jpeg, png, gif, webp) are allowed.' });
      }
    }

    let aiResult = nlpEngine.classifyComplaint(description, image_data);

    const pool = getPool();
    
    // Duplicate Detection (Cosine Similarity Mock)
    let duplicateOf = null;
    if (location_block) {
      const [recent] = await pool.query('SELECT id, description FROM complaints WHERE location_block = ? AND created_at > NOW() - INTERVAL 1 DAY', [location_block]);
      for (let r of recent) {
        if (calculateSimilarity(description, r.description) > 0.4) {
           duplicateOf = r.id;
           break;
        }
      }
    }

    const id = crypto.randomUUID();
    const slaMs = getSLA(aiResult.priority);
    const sla_deadline = new Date(Date.now() + slaMs).toISOString().slice(0, 19).replace('T', ' ');

    const query = `
      INSERT INTO complaints (id, title, description, category, ai_priority, sentiment, is_duplicate_of, status, image_data, registered_by, location_block, location_floor, location_room, sla_deadline, ai_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [
      id, title, description, aiResult.category, aiResult.priority, aiResult.sentiment, duplicateOf, 'open', 
      image_data || null, registered_by || 'Anonymous', 
      location_block || null, location_floor || null, location_room || null, 
      sla_deadline, aiResult.reason
    ]);
    
    await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
      crypto.randomUUID(), id, 'Complaint submitted and AI categorized', registered_by || 'Anonymous'
    ]);
    if (duplicateOf) {
      await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
        crypto.randomUUID(), id, 'Flagged as potential duplicate of ' + duplicateOf, 'System'
      ]);
    }

    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    const saved = rows[0];
    saved._id = saved.id;

    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    
    const mapped = rows.map(r => ({...r, _id: r.id}));
    res.status(200).json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

app.patch('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, user_id } = req.body; // user_id is the person making the change
    
    const pool = getPool();
    const [existingRows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const existing = existingRows[0];

    const updates = [];
    const values = [];

    if (status) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'escalated', 'later', 'rejected'];
      if (!validStatuses.includes(status)) {
         return res.status(400).json({ error: 'Invalid status' });
      }
      if (status !== existing.status) {
        updates.push('status = ?');
        values.push(status);
        await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
          crypto.randomUUID(), id, `Status changed from ${existing.status} to ${status}`, user_id || 'System'
        ]);

        // Gamification: Award points when resolved
        if (status === 'resolved' && !existing.points_awarded && existing.registered_by !== 'Anonymous') {
          updates.push('points_awarded = ?');
          values.push(true);
          await pool.query('UPDATE users SET points = points + 10 WHERE username = ?', [existing.registered_by]);
          await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
            crypto.randomUUID(), id, `Awarded 10 points to ${existing.registered_by} for a valid report.`, 'System'
          ]);
        }
      }
    }

    if (assigned_to !== undefined && assigned_to !== existing.assigned_to) {
      updates.push('assigned_to = ?');
      values.push(assigned_to);
      await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
        crypto.randomUUID(), id, `Assigned to ${assigned_to || 'Unassigned'}`, user_id || 'System'
      ]);
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    const [rows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    const updated = rows[0];
    updated._id = updated.id;

    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// Smart Priority Override API
app.post('/api/complaints/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_priority, admin_user } = req.body;
    
    const pool = getPool();
    const [existingRows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = existingRows[0];

    // Save to ai_feedback
    await pool.query('INSERT INTO ai_feedback (id, complaint_id, original_priority, corrected_priority, description) VALUES (?, ?, ?, ?, ?)', [
      crypto.randomUUID(), id, complaint.ai_priority, new_priority, complaint.description
    ]);

    // Update complaint
    await pool.query('UPDATE complaints SET admin_priority = ? WHERE id = ?', [new_priority, id]);
    await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
      crypto.randomUUID(), id, `Admin overridden AI priority from ${complaint.ai_priority} to ${new_priority}`, admin_user || 'Admin'
    ]);

    // Continual learning: teach the NLP engine the admin's correction
    nlpEngine.learnFromFeedback(complaint.description, complaint.category, new_priority);

    res.status(200).json({ success: true, new_priority });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to override priority' });
  }
});

// Timeline and Comments API
app.get('/api/complaints/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [logs] = await pool.query('SELECT * FROM activity_logs WHERE complaint_id = ? ORDER BY created_at ASC', [id]);
    const [comments] = await pool.query('SELECT * FROM comments WHERE complaint_id = ? ORDER BY created_at ASC', [id]);
    
    res.status(200).json({ logs, comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

app.post('/api/complaints/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, user_id } = req.body;
    if (!message || !user_id) return res.status(400).json({ error: 'Message and user_id required' });

    const pool = getPool();
    const commentId = crypto.randomUUID();
    await pool.query('INSERT INTO comments (id, complaint_id, user_id, message) VALUES (?, ?, ?, ?)', [
      commentId, id, user_id, message
    ]);

    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.get('/api/users/staff', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT id, username, role FROM users WHERE role = 'admin'");
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Cron Job for SLA Escalation & Auto-Reassignment (Runs every minute)
cron.schedule('* * * * *', async () => {
  try {
    const pool = getPool();
    
    // 1. SLA Escalation
    const [slaRows] = await pool.query("SELECT * FROM complaints WHERE status IN ('open', 'in_progress') AND sla_deadline < NOW() AND escalation_level = 0");
    for (let complaint of slaRows) {
      await pool.query("UPDATE complaints SET status = 'escalated', escalation_level = 1 WHERE id = ?", [complaint.id]);
      await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
        crypto.randomUUID(), complaint.id, `SLA Breached! Status escalated.`, 'System'
      ]);
      console.log(`Complaint ${complaint.id} escalated due to SLA breach.`);
    }

    // 2. Auto-Reassignment Logic (If assigned but open for > 2 hours)
    const [reassignRows] = await pool.query("SELECT * FROM complaints WHERE status = 'open' AND assigned_to IS NOT NULL AND updated_at < NOW() - INTERVAL 2 HOUR");
    for (let complaint of reassignRows) {
      await pool.query("UPDATE complaints SET assigned_to = ?, status = 'in_progress' WHERE id = ?", ['System Auto-Escalation Team', complaint.id]);
      await pool.query('INSERT INTO activity_logs (id, complaint_id, action, performed_by) VALUES (?, ?, ?, ?)', [
        crypto.randomUUID(), complaint.id, `Auto-reassigned due to staff inactivity`, 'System'
      ]);
      console.log(`Complaint ${complaint.id} auto-reassigned.`);
    }

  } catch (error) {
    console.error("Cron Job Error:", error);
  }
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  const dbType = process.env.DATABASE_URL ? 'Neon PostgreSQL' : 'Local MySQL';
  app.listen(PORT, () => console.log(`Campus-Eye Server running on port ${PORT} (${dbType})`));
});
