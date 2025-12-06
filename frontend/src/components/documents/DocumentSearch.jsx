import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDocuments } from '../../services/documentService';

function DocumentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const data = await searchDocuments(query);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-form">
      <h2>Search Documents</h2>

      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label>Search Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter keywords to search..."
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searched && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Search Results ({results.length})</h3>
          {results.length === 0 ? (
            <p>No documents found matching your query.</p>
          ) : (
            <div className="document-list">
              {results.map((doc) => (
                <div
                  key={doc._id}
                  className="document-item"
                  onClick={() => navigate(`/documents/${doc._id}`)}
                >
                  <h3>{doc.title}</h3>
                  <p>{doc.description}</p>
                  <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                    <span>Category: {doc.category}</span> |
                    <span> Status: {doc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentSearch;
