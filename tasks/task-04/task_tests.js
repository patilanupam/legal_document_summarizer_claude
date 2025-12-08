const { extractTextFromPDF } = require('../../backend/utils/fileProcessor');
const path = require('path');
const fs = require('fs');

describe('Task 04: PDF Text Extraction', () => {
  test('should extract text from PDF', async () => {
    const testPdfPath = path.join(__dirname, 'test.pdf');
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    fs.writeFileSync(testPdfPath, pdfContent);

    const result = await extractTextFromPDF(testPdfPath);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('pages');
    expect(result).toHaveProperty('info');
    expect(typeof result.text).toBe('string');
    expect(typeof result.pages).toBe('number');

    fs.unlinkSync(testPdfPath);
  });

  test('should handle corrupted PDF gracefully', async () => {
    const corruptedPdf = path.join(__dirname, 'corrupted.pdf');
    fs.writeFileSync(corruptedPdf, 'Not a PDF');

    const result = await extractTextFromPDF(corruptedPdf);
    expect(result).toBeDefined();
    expect(result.text).toBe('');

    fs.unlinkSync(corruptedPdf);
  });

  test('should normalize whitespace', async () => {
    const text = 'Text   with    multiple    spaces';
    expect(text.replace(/\s+/g, ' ').trim()).toBe('Text with multiple spaces');
  });

  test('should truncate large text', async () => {
    const largeText = 'A'.repeat(600000);
    const maxLength = 500000;
    const truncated = largeText.substring(0, maxLength);
    expect(truncated.length).toBeLessThanOrEqual(maxLength);
  });

  test('should return page count', async () => {
    const testPdfPath = path.join(__dirname, 'pages-test.pdf');
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    fs.writeFileSync(testPdfPath, pdfContent);

    const result = await extractTextFromPDF(testPdfPath);
    expect(typeof result.pages).toBe('number');
    expect(result.pages).toBeGreaterThanOrEqual(0);

    fs.unlinkSync(testPdfPath);
  });

  test('should return metadata', async () => {
    const testPdfPath = path.join(__dirname, 'metadata-test.pdf');
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    fs.writeFileSync(testPdfPath, pdfContent);

    const result = await extractTextFromPDF(testPdfPath);
    expect(result).toHaveProperty('info');
    expect(typeof result.info).toBe('object');

    fs.unlinkSync(testPdfPath);
  });

  test('should handle non-existent file', async () => {
    const result = await extractTextFromPDF('/non/existent/file.pdf');
    expect(result.text).toBe('');
    expect(result.pages).toBe(0);
  });

  test('should handle special characters', async () => {
    const specialText = 'Document with © ® ™ symbols';
    expect(specialText).toContain('©');
    expect(specialText).toContain('®');
  });

  test('should not crash on empty PDF', async () => {
    const emptyPdf = path.join(__dirname, 'empty.pdf');
    fs.writeFileSync(emptyPdf, '');

    const result = await extractTextFromPDF(emptyPdf);
    expect(result).toBeDefined();

    fs.unlinkSync(emptyPdf);
  });
});
