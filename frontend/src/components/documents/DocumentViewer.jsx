import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocumentById, deleteDocument, downloadDocument } from '../../services/documentService';

function DocumentViewer() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const data = await getDocumentById(id);
      setDocument(data);
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(id);
        navigate('/documents');
      } catch (err) {
        alert('Failed to delete document');
      }
    }
  };

  const handleDownload = () => {
    window.open(downloadDocument(id), '_blank');
  };

  if (loading) return <div>Loading document...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!document) return <div>Document not found</div>;

  return (
    <div className="document-viewer">
      <button onClick={() => navigate('/documents')} style={{ marginBottom: '1rem' }}>
        ← Back to Documents
      </button>

      <div className="document-meta">
        <h2>{document.title}</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>{document.description}</p>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <p><strong>Category:</strong> {document.category}</p>
          <p><strong>Status:</strong> {document.status}</p>
          <p><strong>File Size:</strong> {(document.fileSize / 1024).toFixed(2)} KB</p>
          <p><strong>Uploaded By:</strong> {document.uploadedBy?.name || 'Unknown'}</p>
          <p><strong>Uploaded:</strong> {new Date(document.createdAt).toLocaleString()}</p>

          {document.metadata && Object.keys(document.metadata).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Metadata:</strong>
              {document.metadata.caseNumber && <p>Case Number: {document.metadata.caseNumber}</p>}
              {document.metadata.clientName && <p>Client: {document.metadata.clientName}</p>}
              {document.metadata.court && <p>Court: {document.metadata.court}</p>}
            </div>
          )}

          {document.tags && document.tags.length > 0 && (
            <p><strong>Tags:</strong> {document.tags.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="document-actions">
        <button onClick={handleDownload}>Download</button>
        <button onClick={handleDelete} style={{ backgroundColor: '#e74c3c' }}>
          Delete
        </button>
      </div>

      {document.versions && document.versions.length > 1 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Version History</h3>
          <p>This document has {document.versions.length} version(s)</p>
        </div>
      )}
    </div>
  );
}

export default DocumentViewer;
