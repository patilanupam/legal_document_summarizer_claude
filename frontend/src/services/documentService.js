import api from './api';

// Upload document
export const uploadDocument = async (formData) => {
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Get all documents
export const getDocuments = async () => {
  const response = await api.get('/documents');
  return response.data;
};

// Get document by ID
export const getDocumentById = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

// Update document
export const updateDocument = async (id, data) => {
  const response = await api.put(`/documents/${id}`, data);
  return response.data;
};

// Delete document
export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};

// Search documents
export const searchDocuments = async (query) => {
  const response = await api.get(`/documents/search?query=${query}`);
  return response.data;
};

// Download document
export const downloadDocument = (id) => {
  return `${api.defaults.baseURL}/documents/${id}/download`;
};

// Upload new version
export const uploadNewVersion = async (id, formData) => {
  const response = await api.post(`/documents/${id}/version`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Get document comments
export const getDocumentComments = async (id) => {
  const response = await api.get(`/documents/${id}/comments`);
  return response.data;
};

// Add comment
export const addComment = async (id, text) => {
  const response = await api.post(`/documents/${id}/comments`, { text });
  return response.data;
};
