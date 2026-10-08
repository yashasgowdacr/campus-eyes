const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Hostel', 'Network', 'Electrical', 'Academic', 'Other'], default: 'Other' },
  ai_priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'escalated'], default: 'open' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Complaint', complaintSchema);
