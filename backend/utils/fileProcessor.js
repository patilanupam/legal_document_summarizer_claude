const fs = require('fs');
const path = require('path');

// TODO: Implement actual PDF text extraction
// This is intentionally stubbed for Task 04
const extractTextFromPDF = async (filePath) => {
  // Stubbed implementation - returns empty string
  // Task 04 will implement actual text extraction using pdf-parse
  console.log('Warning: PDF text extraction not implemented yet');
  return '';
};

// Helper function to check if file exists
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  extractTextFromPDF,
  fileExists,
  deleteFile
};
