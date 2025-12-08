const Document = require('../models/Document');

/**
 * Middleware to check if user has access to a specific document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkDocumentAccess = async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Admin can access all documents
    if (userRole === 'admin') {
      return next();
    }

    // Find the document
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the uploader
    if (document.uploadedBy.toString() === userId.toString()) {
      return next();
    }

    // Check if user is assigned to the document
    const isAssigned = document.assignedTo.some(
      assignedUserId => assignedUserId.toString() === userId.toString()
    );

    if (isAssigned) {
      return next();
    }

    // User doesn't have access
    return res.status(403).json({ message: 'Access denied to this document' });

  } catch (error) {
    console.error('Check access error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { checkDocumentAccess };
