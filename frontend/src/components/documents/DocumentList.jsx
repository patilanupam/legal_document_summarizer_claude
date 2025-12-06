import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments } from '../../services/documentService';

function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading documents...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="document-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>Documents</h2>
        <button onClick={() => navigate('/upload')}>Upload New Document</button>
      </div>

      {documents.length === 0 ? (
        <p>No documents found. Upload your first document!</p>
      ) : (
        documents.map((doc) => (
          <div
            key={doc._id}
            className="document-item"
            onClick={() => navigate(`/documents/${doc._id}`)}
          >
            <h3>{doc.title}</h3>
            <p>{doc.description}</p>
            <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
              <span>Category: {doc.category}</span> |
              <span> Status: {doc.status}</span> |
              <span> Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DocumentList;
