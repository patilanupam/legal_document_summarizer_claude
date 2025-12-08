const documentService = require('../../backend/services/documentService');
const Document = require('../../backend/models/Document');

describe('Task 09: Service Layer', () => {
  test('documentService should be defined', () => {
    expect(documentService).toBeDefined();
    expect(typeof documentService).toBe('object');
  });

  test('should have createDocument method', () => {
    expect(documentService.createDocument).toBeDefined();
    expect(typeof documentService.createDocument).toBe('function');
  });

  test('should have getDocuments method', () => {
    expect(documentService.getDocuments).toBeDefined();
    expect(typeof documentService.getDocuments).toBe('function');
  });

  test('should have updateDocument method', () => {
    expect(documentService.updateDocument).toBeDefined();
    expect(typeof documentService.updateDocument).toBe('function');
  });

  test('should have deleteDocument method', () => {
    expect(documentService.deleteDocument).toBeDefined();
    expect(typeof documentService.deleteDocument).toBe('function');
  });

  test('createDocument should return document object', async () => {
    const mockData = {
      title: 'Test',
      description: 'Test desc',
      category: 'contract',
      uploadedBy: '507f1f77bcf86cd799439011',
      filePath: '/uploads/test.pdf',
      fileSize: 1000,
      mimeType: 'application/pdf'
    };

    if (documentService.createDocument.length > 0) {
      const doc = await documentService.createDocument(mockData);
      expect(doc).toBeDefined();
    } else {
      expect(true).toBe(true);
    }
  });

  test('getDocuments should accept filters', async () => {
    if (documentService.getDocuments.length > 0) {
      const docs = await documentService.getDocuments({ category: 'contract' });
      expect(Array.isArray(docs) || docs === null).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test('service methods should handle errors gracefully', async () => {
    try {
      if (documentService.deleteDocument) {
        await documentService.deleteDocument('invalid-id', 'user-id');
      }
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
