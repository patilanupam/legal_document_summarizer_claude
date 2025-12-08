const Document = require('../models/Document');
const Comment = require('../models/Comment');
const fs = require('fs');

/**
 * Service layer for document business logic
 * Separates business logic from HTTP layer for better testability
 */

/**
 * Create a new document
 * @param {Object} documentData - Document data
 * @returns {Promise<Document>} Created document
 */
const createDocument = async (documentData) => {
  try {
    const document = await Document.create(documentData);
    return document;
  } catch (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }
};

/**
 * Get documents with role-based filtering
 * @param {Object} filters - Query filters
 * @param {String} filters.userId - User ID
 * @param {String} filters.userRole - User role (admin, lawyer, client)
 * @returns {Promise<Array>} Array of documents
 */
const getDocuments = async (filters = {}) => {
  try {
    const { userId, userRole } = filters;
    let query = {};

    // Role-based filtering
    if (userRole === 'admin') {
      query = {};
    } else if (userRole === 'lawyer') {
      query = {
        $or: [
          { uploadedBy: userId },
          { assignedTo: userId },
          { 'sharedWith.userId': userId }
        ]
      };
    } else if (userRole === 'client') {
      query = {
        $or: [
          { assignedTo: userId },
          { 'sharedWith.userId': userId }
        ]
      };
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    return documents;
  } catch (error) {
    throw new Error(`Failed to get documents: ${error.message}`);
  }
};

/**
 * Get document by ID
 * @param {String} documentId - Document ID
 * @returns {Promise<Document>} Document
 */
const getDocumentById = async (documentId) => {
  try {
    const document = await Document.findById(documentId)
      .populate('uploadedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  } catch (error) {
    throw new Error(`Failed to get document: ${error.message}`);
  }
};

/**
 * Check if user has access to document
 * @param {Document} document - Document object
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @param {String} permission - Permission type ('view', 'download', 'comment')
 * @returns {Boolean} Has access
 */
const checkDocumentAccess = (document, userId, userRole, permission = 'view') => {
  // Admin has all access
  if (userRole === 'admin') {
    return true;
  }

  // Check if user is uploader
  const isUploader = document.uploadedBy._id
    ? document.uploadedBy._id.toString() === userId.toString()
    : document.uploadedBy.toString() === userId.toString();

  // Check if user is assigned
  const isAssigned = document.assignedTo.some(
    assignedUser => {
      const assignedId = assignedUser._id ? assignedUser._id : assignedUser;
      return assignedId.toString() === userId.toString();
    }
  );

  // If uploader or assigned, they have all permissions
  if (isUploader || isAssigned) {
    return true;
  }

  // Check shared permissions
  const sharedPermission = document.sharedWith.find(
    share => share.userId.toString() === userId.toString()
  );

  if (!sharedPermission) {
    return false;
  }

  // Check specific permission
  switch (permission) {
    case 'view':
      return sharedPermission.permissions.canView;
    case 'download':
      return sharedPermission.permissions.canDownload;
    case 'comment':
      return sharedPermission.permissions.canComment;
    default:
      return false;
  }
};

/**
 * Update document
 * @param {String} documentId - Document ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID making the update
 * @param {String} userRole - User role
 * @returns {Promise<Document>} Updated document
 */
const updateDocument = async (documentId, updateData, userId, userRole) => {
  try {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Check ownership
    if (document.uploadedBy.toString() !== userId.toString() && userRole !== 'admin') {
      throw new Error('Not authorized to update this document');
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        document[key] = updateData[key];
      }
    });

    await document.save();
    return document;
  } catch (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }
};

/**
 * Delete document
 * @param {String} documentId - Document ID
 * @param {String} userId - User ID making the deletion
 * @param {String} userRole - User role
 * @returns {Promise<void>}
 */
const deleteDocument = async (documentId, userId, userRole) => {
  try {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Check ownership or admin role
    if (document.uploadedBy.toString() !== userId.toString() && userRole !== 'admin') {
      throw new Error('Not authorized to delete this document');
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
  } catch (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

/**
 * Share document with user
 * @param {String} documentId - Document ID
 * @param {String} userId - User ID making the share
 * @param {String} userRole - User role
 * @param {String} shareWithUserId - User ID to share with
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Document>} Updated document
 */
const shareDocument = async (documentId, userId, userRole, shareWithUserId, permissions) => {
  try {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has permission to share
    if (document.uploadedBy.toString() !== userId.toString() && userRole !== 'admin') {
      throw new Error('Not authorized to share this document');
    }

    // Check if already shared
    const existingShare = document.sharedWith.find(
      share => share.userId.toString() === shareWithUserId
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
        userId: shareWithUserId,
        permissions: {
          canView: permissions?.canView !== undefined ? permissions.canView : true,
          canDownload: permissions?.canDownload !== undefined ? permissions.canDownload : false,
          canComment: permissions?.canComment !== undefined ? permissions.canComment : false
        },
        sharedAt: new Date(),
        sharedBy: userId
      });
    }

    await document.save();
    return document;
  } catch (error) {
    throw new Error(`Failed to share document: ${error.message}`);
  }
};

/**
 * Revoke document access
 * @param {String} documentId - Document ID
 * @param {String} userId - User ID making the revocation
 * @param {String} userRole - User role
 * @param {String} revokeUserId - User ID to revoke access from
 * @returns {Promise<Document>} Updated document
 */
const revokeAccess = async (documentId, userId, userRole, revokeUserId) => {
  try {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has permission to revoke
    if (document.uploadedBy.toString() !== userId.toString() && userRole !== 'admin') {
      throw new Error('Not authorized to revoke access to this document');
    }

    // Remove user from sharedWith
    document.sharedWith = document.sharedWith.filter(
      share => share.userId.toString() !== revokeUserId
    );

    await document.save();
    return document;
  } catch (error) {
    throw new Error(`Failed to revoke access: ${error.message}`);
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  checkDocumentAccess,
  updateDocument,
  deleteDocument,
  shareDocument,
  revokeAccess
};
