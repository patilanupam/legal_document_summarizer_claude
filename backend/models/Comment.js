const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
commentSchema.index({ documentId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });

// FIXED: Task 06 - Validate document exists before creating comment (referential integrity)
commentSchema.pre('save', async function(next) {
  // Only validate on new comments (not on updates)
  if (this.isNew) {
    try {
      const Document = mongoose.model('Document');
      const document = await Document.findById(this.documentId);

      if (!document) {
        throw new Error('Cannot create comment: Document does not exist');
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Comment', commentSchema);
