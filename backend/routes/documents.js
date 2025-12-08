const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All routes are protected
router.use(protect);

// Document routes
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/search', searchDocuments);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', authorize('admin', 'lawyer'), deleteDocument);

// Version control
router.post('/:id/version', upload.single('file'), uploadNewVersion);

// Download
router.get('/:id/download', downloadDocument);

// Comments
router.get('/:id/comments', getDocumentComments);
router.post('/:id/comments', addComment);

// Sharing (Task 08)
router.post('/:id/share', shareDocument);
router.delete('/:id/share/:userId', revokeAccess);

module.exports = router;
