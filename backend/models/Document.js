const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a document title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['contract', 'pleading', 'memo', 'correspondence', 'other'],
    default: 'other'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  // Version control - intentionally buggy in controller (Task 01)
  versions: [{
    versionNumber: {
      type: Number,
      default: 1
    },
    filePath: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'archived'],
    default: 'draft'
  },
  metadata: {
    caseNumber: String,
    clientName: String,
    court: String,
    filingDate: Date
  },
  // Extracted text for search - will be empty until Task 04
  searchableText: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Basic index - intentionally missing text index with weights (Task 02)
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ status: 1, category: 1 });

module.exports = mongoose.model('Document', documentSchema);
