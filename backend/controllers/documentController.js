const Document = require('../models/Document');
const Comment = require('../models/Comment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractTextFromPDF } = require('../utils/fileProcessor');
const { sanitizeInput } = require('../utils/validators');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|docx|doc|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, DOC, and TXT files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10485760 }, // 10MB
  fileFilter: fileFilter
});

// @desc    Upload new document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { title, description, category, status, metadata, tags } = req.body;

    // Weak sanitization - vulnerable to XSS (Task 03)
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);

    // Extract text from PDF - currently stubbed (Task 04)
    let searchableText = '';
    if (req.file.mimetype === 'application/pdf') {
      searchableText = await extractTextFromPDF(req.file.path);
    }

    // Parse metadata and tags
    let parsedMetadata = {};
    let parsedTags = [];

    if (metadata) {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    }

    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    const document = await Document.create({
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: category || 'other',
      uploadedBy: req.user._id,
      assignedTo: [req.user._id],
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: status || 'draft',
      metadata: parsedMetadata,
      tags: parsedTags,
      searchableText,
      versions: [{
        versionNumber: 1,
        filePath: req.file.path,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }]
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};

    // Role-based filtering (Task 07) + Shared documents (Task 08)
    if (userRole === 'admin') {
      // Admin can see all documents
      query = {};
    } else if (userRole === 'lawyer') {
      // Lawyer can see own documents + assigned documents + shared documents
      query = {
        $or: [
          { uploadedBy: userId },
          { assignedTo: userId },
          { 'sharedWith.userId': userId }
        ]
      };
    } else if (userRole === 'client') {
      // Client can see assigned documents + shared documents
      query = {
        $or: [
          { assignedTo: userId },
          { 'sharedWith.userId': userId }
        ]
      };
    }

    // Basic query - no pagination, no filters (Task 02)
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get document by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Access check (Task 07 - fixes IDOR vulnerability from Task 03)
    // Enhanced with shared permissions (Task 08)
    const userId = req.user._id;
    const userRole = req.user.role;

    // Admin can access all documents
    if (userRole !== 'admin') {
      // Check if user is the uploader or assigned
      const isUploader = document.uploadedBy._id.toString() === userId.toString();
      const isAssigned = document.assignedTo.some(
        assignedUser => assignedUser._id.toString() === userId.toString()
      );

      // Check if document is shared with user and has canView permission
      const sharedPermission = document.sharedWith.find(
        share => share.userId.toString() === userId.toString()
      );
      const hasViewPermission = sharedPermission?.permissions?.canView;

      if (!isUploader && !isAssigned && !hasViewPermission) {
        return res.status(403).json({ message: 'Access denied to this document' });
      }
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check ownership
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this document' });
    }

    const { title, description, category, status, metadata, tags } = req.body;

    if (title) document.title = sanitizeInput(title);
    if (description) document.description = sanitizeInput(description);
    if (category) document.category = category;
    if (status) document.status = status;
    if (metadata) document.metadata = metadata;
    if (tags) document.tags = tags;

    await document.save();

    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check ownership or admin role
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete all versions
    if (document.versions && document.versions.length > 0) {
      document.versions.forEach(version => {
        if (fs.existsSync(version.filePath)) {
          fs.unlinkSync(version.filePath);
        }
      });
    }

    await document.deleteOne();

    // BUG: Doesn't delete associated comments (Task 06 - cascading deletes)

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search documents
// @route   GET /api/documents/search
// @access  Private
const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    // Basic search - no pagination, no filters, vulnerable to NoSQL injection (Task 02, Task 03)
    // Full collection scan - not optimized
    const documents = await Document.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { searchableText: { $regex: query, $options: 'i' } }
      ]
    }).populate('uploadedBy', 'name email');

    res.json(documents);
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload new version of document
// @route   POST /api/documents/:id/version
// @access  Private
const uploadNewVersion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check ownership
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this document' });
    }

    // BUG: Version control is broken (Task 01)
    // This overwrites the filePath instead of creating a new version
    document.filePath = req.file.path;
    document.fileSize = req.file.size;
    document.mimeType = req.file.mimetype;

    // Extract text from new version
    if (req.file.mimetype === 'application/pdf') {
      document.searchableText = await extractTextFromPDF(req.file.path);
    }

    // BUG: Doesn't properly add to versions array
    // Version number is wrong - should be length + 1
    const versionNumber = document.versions.length; // Off by one!

    document.versions.push({
      versionNumber,
      filePath: req.file.path,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    });

    await document.save();

    res.json(document);
  } catch (error) {
    console.error('Upload version error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download document
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate('assignedTo', '_id');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Access check (Task 07 - fixes security issue from Task 03)
    // Enhanced with download permission check (Task 08)
    const userId = req.user._id;
    const userRole = req.user.role;

    // Admin can download all documents
    if (userRole !== 'admin') {
      // Check if user is the uploader or assigned
      const isUploader = document.uploadedBy.toString() === userId.toString();
      const isAssigned = document.assignedTo.some(
        assignedUser => assignedUser._id.toString() === userId.toString()
      );

      // Check if document is shared with canDownload permission
      const sharedPermission = document.sharedWith.find(
        share => share.userId.toString() === userId.toString()
      );
      const hasDownloadPermission = sharedPermission?.permissions?.canDownload;

      if (!isUploader && !isAssigned && !hasDownloadPermission) {
        return res.status(403).json({ message: 'Access denied to download this document' });
      }
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(document.filePath);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get document comments
// @route   GET /api/documents/:id/comments
// @access  Private
const getDocumentComments = async (req, res) => {
  try {
    const comments = await Comment.find({ documentId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add comment to document
// @route   POST /api/documents/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Please provide comment text' });
    }

    const document = await Document.findById(req.params.id).populate('assignedTo', '_id');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check comment permission (Task 08)
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      const isUploader = document.uploadedBy.toString() === userId.toString();
      const isAssigned = document.assignedTo.some(
        assignedUser => assignedUser._id.toString() === userId.toString()
      );

      // Check if document is shared with canComment permission
      const sharedPermission = document.sharedWith.find(
        share => share.userId.toString() === userId.toString()
      );
      const hasCommentPermission = sharedPermission?.permissions?.canComment;

      if (!isUploader && !isAssigned && !hasCommentPermission) {
        return res.status(403).json({ message: 'Access denied to comment on this document' });
      }
    }

    const comment = await Comment.create({
      documentId: req.params.id,
      userId: req.user._id,
      text: sanitizeInput(text)
    });

    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name email');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Share document with user
// @route   POST /api/documents/:id/share
// @access  Private
const shareDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to share (owner or admin)
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to share this document' });
    }

    const { userId, permissions } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Please provide userId to share with' });
    }

    // Check if already shared with this user
    const existingShare = document.sharedWith.find(
      share => share.userId.toString() === userId
    );

    if (existingShare) {
      // Update permissions
      existingShare.permissions = {
        canView: permissions?.canView !== undefined ? permissions.canView : existingShare.permissions.canView,
        canDownload: permissions?.canDownload !== undefined ? permissions.canDownload : existingShare.permissions.canDownload,
        canComment: permissions?.canComment !== undefined ? permissions.canComment : existingShare.permissions.canComment
      };
    } else {
      // Add new share
      document.sharedWith.push({
        userId,
        permissions: {
          canView: permissions?.canView !== undefined ? permissions.canView : true,
          canDownload: permissions?.canDownload !== undefined ? permissions.canDownload : false,
          canComment: permissions?.canComment !== undefined ? permissions.canComment : false
        },
        sharedAt: new Date(),
        sharedBy: req.user._id
      });
    }

    await document.save();

    res.json({ message: 'Document shared successfully', document });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Revoke document access
// @route   DELETE /api/documents/:id/share/:userId
// @access  Private
const revokeAccess = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to revoke (owner or admin)
    if (document.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to revoke access to this document' });
    }

    const { userId } = req.params;

    // Remove user from sharedWith
    document.sharedWith = document.sharedWith.filter(
      share => share.userId.toString() !== userId
    );

    await document.save();

    res.json({ message: 'Access revoked successfully', document });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  upload,
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  searchDocuments,
  uploadNewVersion,
  downloadDocument,
  getDocumentComments,
  addComment,
  shareDocument,
  revokeAccess
};
